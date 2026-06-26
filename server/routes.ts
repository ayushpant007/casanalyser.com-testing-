import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { promisify } from "util";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { insertUserSchema, insertContactMessageSchema } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { registerImageRoutes } from "./replit_integrations/image/routes";
import { fetchNavForScheme, fetchNavByISIN, findSchemeCode, findSchemeCodeByISIN, searchSchemeCodes, resolveIsinByName } from "./mfapi";
import { extractMetricsFromFactsheet } from "./factsheet";
import { getMetricsFromJson } from "./json_factsheet";
import { getBenchmarkReturns } from "./benchmarks";
import { lookupByIsinOrName } from "./scoring";
import { detectCasSource, calculateFundVsBenchmark } from "./fund-benchmark";
import { uploadCasToDrive } from "./gdrive";
import { pool } from "./db";
import { analyzeOverlap } from "./overlap";

const execAsync = promisify(exec);
const upload = multer({ storage: multer.memoryStorage() });

// ── Async job store ───────────────────────────────────────────────────────────
interface AnalysisJob {
  status: "processing" | "done" | "error";
  report?: any;
  message?: string;
  createdAt: number;
}
const analysisJobs = new Map<string, AnalysisJob>();

// Clean up jobs older than 30 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of analysisJobs.entries()) {
    if (job.createdAt < cutoff) analysisJobs.delete(id);
  }
}, 5 * 60 * 1000);

function generateJobId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4
].filter(Boolean) as string[];

const GEMINI_TIMEOUT_MS = 180_000; // 3 minutes per key attempt

// Fallback model chain — tried in order when a model returns 503 (high demand)
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
];

// Closes any open JSON brackets/braces in a truncated string
function closeOpenJSON(partial: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of partial) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  return partial + stack.reverse().join('');
}

// Smart JSON repair for truncated AI responses
function smartRepairJSON(raw: string): any {
  if (!raw || raw.trim() === '') return {};

  // Strategy 1: direct parse
  try { return JSON.parse(raw); } catch {}

  // Strategy 2: close open brackets on the full string
  try { return JSON.parse(closeOpenJSON(raw)); } catch {}

  // Strategy 3: cut at the last complete array item (},  or }, pattern) then close
  const lastCompleteItem = raw.lastIndexOf('},');
  if (lastCompleteItem !== -1) {
    const candidate = raw.slice(0, lastCompleteItem + 1);
    try { return JSON.parse(closeOpenJSON(candidate)); } catch {}
  }

  // Strategy 4: scan backwards for the deepest valid JSON sub-string
  for (let end = raw.length; end > 10; end = Math.floor(end * 0.9)) {
    const candidate = raw.slice(0, end);
    const lastBrace = candidate.lastIndexOf('}');
    if (lastBrace === -1) break;
    try { return JSON.parse(candidate.slice(0, lastBrace + 1)); } catch {}
    try { return JSON.parse(closeOpenJSON(candidate.slice(0, lastBrace + 1))); } catch {}
  }

  return {};
}

function is503Error(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("503") || msg.includes("service unavailable") || msg.includes("high demand");
}

function is429Error(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("429") || msg.includes("quota") || msg.includes("too many requests") || msg.includes("resource_exhausted");
}

// Actual Groq free-tier TPM limits (verified from live errors):
//   llama-3.3-70b-versatile  → 12,000 TPM  (better quality, higher limit → try first)
//   llama-3.1-8b-instant     →  6,000 TPM  (last resort, very small window)
// Observed ratio: ~3 chars per token for CAS statement text.
// Budget formula: maxPromptChars/3 + maxTokens < TPM limit × 0.85 (safety buffer)
const GROQ_LIMITS = [
  { model: "llama-3.3-70b-versatile", maxPromptChars: 21_000, maxTokens: 2_000 }, // ~7k+2k=9k < 12k ✅
  { model: "llama-3.1-8b-instant",    maxPromptChars:  9_000, maxTokens: 1_000 }, // ~3k+1k=4k <  6k ✅
];

async function generateWithGroqFallback(prompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("No GROQ_API_KEY configured");

  const groq = new Groq({ apiKey: groqKey });

  let lastGroqError: any;
  for (const { model, maxPromptChars, maxTokens } of GROQ_LIMITS) {
    const truncatedPrompt = prompt.length > maxPromptChars
      ? prompt.slice(0, maxPromptChars) + "\n\n[Note: Input truncated to fit model limits. Analyse the above data and produce the full JSON output.]"
      : prompt;

    try {
      console.log(`[Groq] Trying ${model} (prompt: ${truncatedPrompt.length} chars, max_tokens: ${maxTokens})`);
      const completion = await groq.chat.completions.create({
        model,
        messages: [{ role: "user", content: truncatedPrompt }],
        temperature: 0,
        max_tokens: maxTokens,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.error(`[Groq] Model ${model} failed:`, err.message);
      lastGroqError = err;
    }
  }
  throw lastGroqError || new Error("All Groq models failed");
}

async function generateWithFallback(prompt: string, options: { model?: string, responseMimeType?: string } = {}) {
  const primaryModel = (options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").toLowerCase().replace(/\s+/g, '-');

  // Build model list: primary first, then the rest of the chain (skip duplicates)
  const modelsToTry = [primaryModel, ...GEMINI_FALLBACK_MODELS.filter(m => m !== primaryModel)];

  let lastError: any;
  let allQuotaExhausted = true;

  for (const modelName of modelsToTry) {
    let overloaded = false;

    for (const key of GEMINI_KEYS) {
      try {
        const client = new GoogleGenerativeAI(key);
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0,
            ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
          }
        });

        // Race the Gemini call against a timeout so it never hangs indefinitely
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini timeout after ${GEMINI_TIMEOUT_MS / 1000}s`)), GEMINI_TIMEOUT_MS)
        );
        const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
        if (modelName !== primaryModel) {
          console.log(`[Gemini] Primary model overloaded — succeeded with fallback model: ${modelName}`);
        }
        return result.response.text();
      } catch (err: any) {
        console.error(`Gemini call failed [model=${modelName}, key=${key.substring(0, 8)}]:`, err.message);
        lastError = err;
        if (is503Error(err)) {
          overloaded = true;
          allQuotaExhausted = false; // 503 is not a quota error
          break;
        }
        if (!is429Error(err)) {
          allQuotaExhausted = false; // Some other error, not quota
        }
      }
    }

    if (overloaded) {
      console.warn(`[Gemini] Model "${modelName}" is overloaded (503). Trying next model in chain...`);
    } else {
      console.warn(`[Gemini] Model "${modelName}" failed on all keys. Trying next model in chain...`);
    }
  }

  // If all Gemini keys hit 429 quota limits, try Groq as last resort
  if (process.env.GROQ_API_KEY) {
    try {
      return await generateWithGroqFallback(prompt);
    } catch (groqErr: any) {
      console.error("[Groq] Fallback also failed:", groqErr.message);
      throw groqErr;
    }
  }

  throw lastError || new Error("All Gemini models and API keys failed");
}

// ── Create nifty500_benchmark table and seed initial data on startup ──────────
async function initNiftyBenchmarkTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nifty500_benchmark (
        id SERIAL PRIMARY KEY,
        as_of_date DATE NOT NULL UNIQUE,
        return_1y NUMERIC(8,4) NOT NULL,
        return_3y NUMERIC(8,4) NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Seed with calculated values from CSV (June 2025→Jun 2026 for 1Y, Jun 2023→Jun 2026 for 3Y)
    await pool.query(`
      INSERT INTO nifty500_benchmark (as_of_date, return_1y, return_3y)
      VALUES ('2026-06-01', -1.7366, 12.3758)
      ON CONFLICT (as_of_date) DO NOTHING
    `);
    console.log("✅ nifty500_benchmark table ready");
  } catch (err: any) {
    console.error("⚠️  nifty500_benchmark init error:", err.message);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  registerChatRoutes(app);
  registerImageRoutes(app);

  // Initialize benchmark table in background (non-blocking)
  initNiftyBenchmarkTable();

  app.post("/api/users", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || "Invalid input",
        });
      }
      const { user, sessionToken } = await storage.createUser(parsed.data);
      // Return the session token so the frontend can persist it in localStorage
      res.json({ email: user.email, sessionToken });
    } catch (err: any) {
      console.error("Failed to create user:", err);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Verify a session token sent from localStorage on every page load
  app.post("/api/session/verify", async (req, res) => {
    try {
      const token = String(req.body?.sessionToken || "").trim();
      if (!token) return res.json({ valid: false });

      const user = await storage.getUserBySessionToken(token);
      if (!user) return res.json({ valid: false });

      // Update last_seen in background — don't await to keep response fast
      storage.touchUserLastSeen(user.id).catch(() => {});

      res.json({ valid: true, name: user.name, email: user.email });
    } catch (err: any) {
      console.error("Session verify error:", err);
      res.json({ valid: false });
    }
  });

  app.get("/api/users/check", async (req, res) => {
    const email = String(req.query.email || "").trim();
    if (!email) return res.json({ exists: false });
    const user = await storage.getUserByEmail(email);
    res.json({ exists: !!user });
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const parsed = insertContactMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || "Invalid input",
        });
      }
      const message = await storage.createContactMessage(parsed.data);
      res.json({ id: message.id });
    } catch (err: any) {
      console.error("Failed to save contact message:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ── Background analysis worker ────────────────────────────────────────────
  async function runAnalysisJob(jobId: string, fileBuffer: Buffer, originalName: string, password: string, investorType: string, ageGroup: string, userId?: number) {
    const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`);
    try {
      await fs.writeFile(tempPath, fileBuffer);

      let text = "";
      try {
        const { stdout } = await execAsync(`pdftotext -upw "${password}" "${tempPath}" -`, { maxBuffer: 50 * 1024 * 1024 });
        text = stdout;
      } catch (e: any) {
        console.error("PDF Parsing error:", e);
        const msg = (e.message || "") + (e.stderr || "");
        if (msg.includes("Incorrect password") || e.code === 3 || e.code === 1) {
          analysisJobs.set(jobId, { status: "error", message: "Incorrect password", createdAt: analysisJobs.get(jobId)!.createdAt });
          return;
        }
        throw e;
      }

      if (!text || text.trim().length === 0) {
        analysisJobs.set(jobId, { status: "error", message: "Could not extract text from PDF. It might be empty or scanned.", createdAt: analysisJobs.get(jobId)!.createdAt });
        return;
      }

      // Truncate very large PDFs to avoid Gemini output token limits causing truncated JSON
      const MAX_TEXT_CHARS = 120_000;
      if (text.length > MAX_TEXT_CHARS) {
        console.warn(`[PDF] Text too long (${text.length} chars) — truncating to ${MAX_TEXT_CHARS} chars`);
        text = text.slice(0, MAX_TEXT_CHARS);
      }

      let csvContent = "";
      try {
        csvContent = await fs.readFile(path.join(process.cwd(), "server/assets/category_ratios.csv"), "utf-8");
      } catch (e) {
        console.error("Error reading ratios CSV:", e);
      }

      const analysisPrompt = `You are a financial analyst. Analyze the following Consolidated Account Statement (CAS) text. 
Investor Profile: Age Group: ${ageGroup}, Risk Profile: ${investorType}.

Reference Ratios CSV:
${csvContent}

Extract:
0. Investor name: Extract the full name of the investor/account holder from the CAS report header or personal details section. Return as "investor_name": string.
1. Portfolio summary: {"net_asset_value": number, "total_cost": number}
   - "total_cost" MUST equal the GRAND TOTAL of the "Cost Value" / "Invested Amount" / "Cost" column in the Mutual Fund Portfolio Snapshot / Holdings table (the last row labelled Grand Total / Total). Do NOT use Current Value or Market Value here.
   - "net_asset_value" MUST equal the GRAND TOTAL of the "Market Value" / "Current Value" / "Valuation" column.
2. Account-wise summary table: [{"type": string, "details": string, "count": number, "value": number}]
3. Asset Class Allocation for the month: [{"asset_class": string, "value": number, "percentage": number}]
4. Mutual Fund Portfolio Snapshot: [{"scheme_name": string, "folio_no": string, "units": number, "nav": number, "invested_amount": number, "valuation": number, "unrealised_profit_loss": number, "fund_category": string, "fund_type": string, "isin": string, "source": string}]
   - IMPORTANT: For "units", strictly extract the "Closing Bal (Units)" / "No. of Units" / "Units" / "Balance Units" column value ONLY. This is typically a small number (e.g. 150.105). Do NOT put the NAV value here.
   - "nav" MUST be the per-unit NAV value from the "NAV (₹)" column ONLY. For Liquid / Overnight / Money Market / Gilt funds this can be a large number (e.g. 6789.4997). Do NOT put the units value here.
   - CRITICAL for high-NAV funds: Liquid Fund, Overnight Fund, Money Market Fund, Gilt Fund NAVs are commonly in the range ₹1000–₹10000. Their unit counts are small (e.g. 100–500 units). Never swap these. If one number is large (>500) and the other is small (<500), the LARGE number is the NAV and the SMALL number is the units — unless the column header says otherwise.
   - Double-check by verifying: units × nav ≈ valuation. Example: 150.105 units × 6789.4997 NAV ≈ ₹10,19,138 valuation.
   - "invested_amount" MUST be the TOTAL INVESTED amount from the cost column for that scheme — NOT the NAV, NOT the current/market value, NOT the P/L. Use the column whose header is one of:
       • "Cumulative Amount Invested (in INR)"   ← CDSL CAS (Mutual Fund Units Held / Consolidated Account Statement)
       • "Invested (₹)" / "Invested Amount"      ← CAMS / KFinTech CAS
       • "Cost Value" / "Cost"                   ← NSDL CAS
     CRITICAL: NAV and invested_amount are DIFFERENT columns. NAV (₹) is the price per unit (e.g. 410.36). Cumulative Amount Invested is the total cost paid (e.g. 0.59). Do NOT swap them.
     Example: If NAV column shows 410.3636 and Cumulative Amount Invested shows 0.59, then nav=410.3636 and invested_amount=0.59. NEVER put the NAV value in invested_amount.
     Do NOT confuse this with "Valuation (₹)", "Value (₹)", "Market Value", "Current Value", or any P/L column. In CDSL statements the Cumulative Amount Invested column appears BEFORE the Valuation column — pick the correct one strictly by header text, not by column position.
   - Extract EVERY row of that table without omission so the sum of invested_amount across all rows EXACTLY equals the GRAND TOTAL shown in that table's last row (e.g. CDSL "Grand Total" row).
   - "valuation" MUST be the "Valuation (₹)" / "Value (₹)" / "Market Value" / "Current Value" column for that scheme. This equals units × NAV (e.g. 0.002 × 410.3636 = 0.82).
   - For regular CAS folio entries, set "source": "cas".
   - ALSO scan any CDSL / NSDL Demat Holding Statement sections (tables with columns like ISIN, Security, Current Bal, Frozen Bal, Pledge Bal, Market Price / Face Value, Value ₹). For each row where the ISIN starts with "INF" (these are mutual funds held in Demat form), add an entry to mf_snapshot with:
       • "scheme_name": value from the Security column
       • "units": value from the Current Bal column (free balance, not frozen)
       • "nav": value from the "Market Price / Face Value" column
       • "invested_amount": 0 (cost basis is not available in Demat holdings)
       • "valuation": value from the "Value (₹)" column (or units × nav if not available)
       • "unrealised_profit_loss": 0
       • "isin": the INF... ISIN
       • "source": "demat"
       • "fund_category": infer from scheme name (e.g. Equity, Debt, Hybrid)
       • "fund_type": infer from scheme name
       • "folio_no": ""
     IGNORE rows where ISIN starts with "INE" (these are equity stocks, not mutual funds).
5. Comparison Tables (using the CSV ratios for the given Age Group and Risk Profile):
   - Current Category Allocation (Equity, Debt, Hybrid, Others)
   - Comparison with Category Ratio (Current % vs Target % from CSV)
   - Category-Fund Type Comparison (Large Cap, Mid Cap, Small Cap, etc. for Equity portion)
   - Comparison with Type Ratio (Current % vs Target % from CSV)
6. Transactions (SIP detection only): [{"date": string, "scheme_name": string, "type": string, "amount": number}]
   - Identify type as "SIP" for transactions explicitly tagged as SIP, "Purchase – SIP", "Purchase – Systematic", or "Systematic Investment".
   - Identify type as "PURCHASE" for one-time purchases (Lumpsum, Online, Initial, NFO).
   - For amount, use the numerical value (e.g., if it says ₹1,000, extract 1000).

Return ONLY valid JSON with this exact structure: {
  "investor_name": string,
  "summary": {"net_asset_value": number, "total_cost": number}, 
  "account_summaries": [...], 
  "asset_allocation": [...], 
  "mf_snapshot": [...],
  "category_comparison": [{"category": string, "current_pct": number, "target_pct": number}],
  "type_comparison": [{"type": string, "current_pct": number, "target_pct": number}],
  "transactions": [{"date": string, "scheme_name": string, "type": string, "amount": number}]
}. 

For mf_snapshot, ensure you accurately identify:
- fund_category: e.g. Equity, Debt, Hybrid, Gold/Commodity, etc. Gold ETF Fund of Fund should be categorized as "Gold/Commodity".
- fund_type: e.g. Flexi Cap, Bluechip, Large Cap, Mid Cap, Small Cap, Sectoral, Gold ETF FoF, etc.
- isin: The 12-character International Securities Identification Number for the fund.

Ensure ALL funds and folios are extracted comprehensively without omission, including Gold ETF Fund of Fund, Silver ETF, and any commodity/alternative fund schemes. Ensure all numerical values are numbers.

Text content:
${text}`;

      const analysisRawResult = await generateWithFallback(analysisPrompt, { responseMimeType: "application/json" });
      // Strip markdown code fences that some models (e.g. Groq) wrap around JSON
      const analysisRawStr = (typeof analysisRawResult === 'string' ? analysisRawResult : "")
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

      let analysis: any = {};
      try {
        analysis = JSON.parse(analysisRawStr || "{}");
      } catch (jsonErr: any) {
        console.warn(`[JSON] Parse failed (${jsonErr.message}) — attempting smart repair on ${analysisRawStr.length} char response`);
        analysis = smartRepairJSON(analysisRawStr);
        if (Object.keys(analysis).length === 0) {
          throw new Error(`AI response was truncated and could not be repaired. PDF may be too large — try a shorter statement.`);
        }
        console.warn(`[JSON] Smart repair succeeded — recovered ${Object.keys(analysis).length} top-level keys`);
      }

      analysis.cas_source = detectCasSource(text);

      // ── Strip equity stocks (INE ISINs) from mf_snapshot ──────────────────
      if (Array.isArray(analysis.mf_snapshot)) {
        const before = analysis.mf_snapshot.length;
        analysis.mf_snapshot = analysis.mf_snapshot.filter((m: any) => {
          const isin: string = (m.isin || "").trim().toUpperCase();
          return !isin.startsWith("INE");
        });
        const removed = before - analysis.mf_snapshot.length;
        if (removed > 0) console.log(`[Filter] Removed ${removed} equity stock(s) (INE ISINs) from mf_snapshot`);
      }

      // ── Server-side Demat MF extraction ───────────────────────────────────
      try {
        const existingIsins = new Set<string>(
          (analysis.mf_snapshot || []).map((m: any) => m.isin).filter(Boolean)
        );

        const inferCategory = (name: string): { fund_category: string; fund_type: string } => {
          const n = name.toLowerCase();
          if (/liquid|overnight|money market|ultra short|low dur|short dur|medium dur|long dur|gilt|bond|income|debt|dynamic bond|banking and psu|credit risk|corporate bond|floater/.test(n))
            return { fund_category: "Debt", fund_type: "Debt" };
          if (/hybrid|balanced|aggressive|conservative|multi asset|equity savings|arbitrage/.test(n))
            return { fund_category: "Hybrid", fund_type: "Hybrid" };
          if (/gold|silver|commodity/.test(n))
            return { fund_category: "Gold/Silver", fund_type: "Gold/Commodity" };
          if (/large cap|bluechip|top 100|nifty 50|sensex/.test(n))
            return { fund_category: "Equity", fund_type: "Large Cap" };
          if (/mid cap|midcap/.test(n))
            return { fund_category: "Equity", fund_type: "Mid Cap" };
          if (/small cap|smallcap/.test(n))
            return { fund_category: "Equity", fund_type: "Small Cap" };
          if (/flexi|multi cap|diversified/.test(n))
            return { fund_category: "Equity", fund_type: "Flexi Cap" };
          if (/elss|tax saver|tax saving/.test(n))
            return { fund_category: "Equity", fund_type: "ELSS" };
          if (/index|etf|nifty|bse|sensex/.test(n))
            return { fund_category: "Equity", fund_type: "Index/ETF" };
          if (/sectoral|thematic|pharma|bank|infra|defence|it fund|technology/.test(n))
            return { fund_category: "Equity", fund_type: "Sectoral/Thematic" };
          return { fund_category: "Equity", fund_type: "Equity" };
        };

        const parseNum = (s: string) => parseFloat(s.replace(/,/g, "")) || 0;
        const lines = text.split(/\r?\n/);
        const isinLineIndex: Record<string, number> = {};
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/\b(INF[A-Z0-9]{9})\b/);
          if (m && !isinLineIndex[m[1]]) isinLineIndex[m[1]] = i;
        }

        console.log(`[Demat] Found ${Object.keys(isinLineIndex).length} total INF ISINs in PDF, existing in snapshot: ${existingIsins.size}`);

        for (const [isin, lineIdx] of Object.entries(isinLineIndex)) {
          if (existingIsins.has(isin)) continue;
          const ctxLines = lines.slice(Math.max(0, lineIdx - 1), lineIdx + 6);
          const block = ctxLines.join(" ");
          const nums = [...block.matchAll(/([\d,]+\.?\d*)/g)]
            .map(m => parseNum(m[1]))
            .filter(n => n > 0 && n < 1e10);
          let schemeLine = lines[lineIdx].replace(/\b(INF[A-Z0-9]{9})\b/, "").trim();
          if (schemeLine.length < 5 && lines[lineIdx + 1]) schemeLine = lines[lineIdx + 1].trim();
          const schemeName = schemeLine.replace(/[\s\d,.]+$/, "").trim().replace(/\s+/g, " ") || isin;
          if (nums.length < 2) {
            console.log(`[Demat] Skipping ${isin} — not enough numbers in context (found ${nums.length})`);
            continue;
          }
          const sortedNums = [...nums].sort((a, b) => b - a);
          const value = sortedNums[0];
          let units = 0, nav = 0;
          for (const u of nums) {
            if (u === value) continue;
            const impliedNav = value / u;
            if (impliedNav >= 0.1 && impliedNav <= 10000) { units = u; nav = impliedNav; break; }
          }
          if (units <= 0) { units = nums[0]; nav = nums.length > 1 ? nums[1] : 0; }
          let resolvedName = schemeName;
          if (!schemeName || schemeName === isin || schemeName.length < 6) {
            try {
              const lookup = await findSchemeCodeByISIN(isin);
              if (lookup?.name) resolvedName = lookup.name;
            } catch (_) {}
          }
          const { fund_category, fund_type } = inferCategory(resolvedName);
          (analysis.mf_snapshot = analysis.mf_snapshot || []).push({
            isin, scheme_name: resolvedName, folio_no: "", units, nav,
            invested_amount: 0, valuation: value, unrealised_profit_loss: 0,
            fund_category, fund_type, source: "demat",
          });
          existingIsins.add(isin);
          console.log(`[Demat] Added: ${isin} | ${resolvedName} | units=${units.toFixed(3)} nav=${nav.toFixed(4)} value=${value}`);
        }
      } catch (dematErr) {
        console.error("[Demat] Extraction error:", dematErr);
      }

      // ── Fix swapped nav / invested_amount ─────────────────────────────────
      if (Array.isArray(analysis.mf_snapshot)) {
        await Promise.all(analysis.mf_snapshot.map(async (entry: any) => {
          const name: string = (entry.scheme_name || "").trim();
          const isinPattern = /^INF[A-Z0-9]{9}$/;
          if (!name || name === entry.isin || name.length < 6 || isinPattern.test(name)) {
            try {
              let resolvedName = "";
              const lookup = await findSchemeCodeByISIN(entry.isin);
              if (lookup?.name && lookup.name.length > 5) {
                resolvedName = lookup.name;
              } else {
                const navData = await fetchNavByISIN(entry.isin, entry.isin);
                if (navData?.scheme_name && navData.scheme_name.length > 5 && !isinPattern.test(navData.scheme_name)) {
                  resolvedName = navData.scheme_name;
                }
              }
              if (resolvedName) { console.log(`[NameFix] ${entry.isin}: "${name}" → "${resolvedName}"`); entry.scheme_name = resolvedName; }
            } catch (_) {}
          }
          if (entry.source === "cas" && entry.units > 0) {
            if (entry.nav > 0 && entry.invested_amount > 0) {
              const navProduct = entry.units * entry.nav;
              if (navProduct < 1.0 && entry.nav < 10 && entry.invested_amount > 50) {
                console.log(`[NavFix-A] ${entry.isin}: swapping nav(${entry.nav}) ↔ invested_amount(${entry.invested_amount})`);
                const tmp = entry.nav; entry.nav = entry.invested_amount; entry.invested_amount = tmp;
                entry.valuation = entry.units * entry.nav;
              }
            }
            if (entry.nav > 0 && (entry.invested_amount === 0 || entry.invested_amount == null) && (entry.valuation === 0 || entry.valuation == null)) {
              console.log(`[NavFix-B] ${entry.isin}: moving nav(${entry.nav}) → invested_amount, setting nav=0`);
              entry.invested_amount = entry.nav; entry.nav = 0;
            }
          }
        }));
      }

      // ── Detect swapped units ↔ nav using live NAV (handles high-NAV funds) ──
      // Multiplication is commutative so product checks can't catch this swap.
      // We compare both fields against the live API NAV: whichever field is
      // within 15% of live NAV is the real per-unit price (i.e. nav), not units.
      if (Array.isArray(analysis.mf_snapshot)) {
        await Promise.all(analysis.mf_snapshot.map(async (entry: any) => {
          if (!entry.isin || entry.units <= 0 || entry.nav <= 0) return;
          try {
            const liveData = await fetchNavByISIN(entry.isin, entry.scheme_name);
            const liveNav = liveData?.current_nav;
            if (!liveNav || liveNav <= 0) return;

            const distUnits = Math.abs(entry.units - liveNav) / liveNav; // how close is "units" to live NAV
            const distNav   = Math.abs(entry.nav   - liveNav) / liveNav; // how close is "nav"   to live NAV

            // If "units" is within 15% of live NAV AND "nav" is off by >40%
            // → the AI put the NAV value in the units field → swap them
            if (distUnits < 0.15 && distNav > 0.40) {
              console.log(`[UnitsNavSwap] ${entry.isin}: units(${entry.units}) ≈ liveNav(${liveNav}), nav(${entry.nav}) is wrong — swapping`);
              const tmp = entry.units;
              entry.units = entry.nav;
              entry.nav = tmp;
              // Recompute valuation from corrected units × corrected (CAS) nav
              if (entry.valuation <= 0 && entry.units > 0) {
                entry.valuation = entry.units * entry.nav;
              }
            }
          } catch (_) { /* non-fatal: leave entry unchanged */ }
        }));
      }

      // ── Fuzzy ISIN resolution for funds without ISINs ─────────────────────
      // For statements that don't include ISINs, match fund names against the
      // scheme_codes.csv using the existing fuzzy scorer.  High-confidence
      // matches get the real ISIN written back so every downstream endpoint
      // (NAV fetch, performance, scoring) works identically to CAS documents.
      if (Array.isArray(analysis.mf_snapshot)) {
        await Promise.all(analysis.mf_snapshot.map(async (entry: any) => {
          const existingIsin = (entry.isin || "").trim();
          if (existingIsin.length >= 10) return; // already has a real ISIN
          const name = (entry.scheme_name || "").trim();
          if (!name || name.length < 5) return;
          try {
            const resolved = await resolveIsinByName(name);
            if (resolved?.isin) {
              console.log(`[FuzzyISIN] "${name}" → ${resolved.isin} (code ${resolved.code}, matched "${resolved.name}")`);
              entry.isin = resolved.isin;
              entry.isin_source = "fuzzy";
            }
          } catch (_) {}
        }));
        const fuzzyCount = analysis.mf_snapshot.filter((e: any) => e.isin_source === "fuzzy").length;
        if (fuzzyCount > 0) console.log(`[FuzzyISIN] Resolved ${fuzzyCount} fund(s) via name matching`);
      }

      const report = await storage.createReport({ filename: originalName, investorType, ageGroup, analysis });

      // Track the analysis against the user if we have a userId
      if (userId) {
        storage.createAnalysis({
          userId,
          fileName: originalName,
          reportUrl: `/reports/${report.slug}/concise`,
        }).catch((err) => console.error("[analysis-track] failed:", err));
      }

      uploadCasToDrive(fileBuffer, originalName, analysis.investor_name, password)
        .then((result) => { if (result) console.log(`CAS uploaded to Google Drive: ${result.webViewLink}`); })
        .catch((err) => { console.error("Google Drive upload failed:", err); });

      analysisJobs.set(jobId, { status: "done", report, createdAt: analysisJobs.get(jobId)!.createdAt });
    } catch (error: any) {
      console.error("Analysis job error:", error);
      analysisJobs.set(jobId, { status: "error", message: "Analysis failed: " + error.message, createdAt: analysisJobs.get(jobId)!.createdAt });
    } finally {
      try { await fs.unlink(tempPath); } catch (e) { /* ignore */ }
    }
  }

  app.post(api.analyze.path, upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const password = req.body.password;
    if (!password) return res.status(400).json({ message: "Password is required" });

    const investorType = req.body.investorType || "Aggressive";
    const ageGroup = req.body.ageGroup || "20-35";
    const jobId = generateJobId();

    // Resolve user from session token (sent by the frontend)
    let userId: number | undefined;
    const sessionToken = String(req.body.sessionToken || "").trim();
    if (sessionToken) {
      try {
        const user = await storage.getUserBySessionToken(sessionToken);
        if (user) userId = user.id;
      } catch (_) {}
    }

    // Store job as processing immediately
    analysisJobs.set(jobId, { status: "processing", createdAt: Date.now() });

    // Start heavy work in background — do NOT await
    runAnalysisJob(jobId, req.file.buffer, req.file.originalname, password, investorType, ageGroup, userId);

    // Respond immediately so the proxy never times out
    res.status(202).json({ jobId });
  });

  // ── Job status polling endpoint ────────────────────────────────────────────
  app.get("/api/analyze/status/:jobId", (req, res) => {
    const job = analysisJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ status: job.status, report: job.report, message: job.message });
  });

  app.get(api.reports.list.path, async (req, res) => {
    const list = await storage.getAllReports();
    res.json(list);
  });

  app.get(api.reports.get.path, async (req, res) => {
    const report = await storage.getReportBySlug(req.params.slug);
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  });

  // Fund vs Benchmark (since inception) — CAMS reports only
  app.get("/api/fund-vs-benchmark/:id", async (req, res) => {
    try {
      const report = await storage.getReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });

      const analysis    = (report.analysis as any) || {};
      const snapshot    = (analysis.mf_snapshot    || []) as any[];
      const transactions = (analysis.transactions  || []) as any[];

      if (snapshot.length === 0) {
        return res.json({ results: [], cas_source: analysis.cas_source || "UNKNOWN" });
      }

      const results = await calculateFundVsBenchmark(snapshot, transactions);
      res.json({ results, cas_source: analysis.cas_source || "UNKNOWN" });
    } catch (err: any) {
      console.error("fund-vs-benchmark error:", err);
      res.status(500).json({ message: "Failed to calculate benchmark: " + err.message });
    }
  });

  app.get("/api/nav/:schemeName", async (req, res) => {
    const schemeName = decodeURIComponent(req.params.schemeName);
    const isin = (req.query.isin as string | undefined)?.trim();
    try {
      const navData = isin
        ? await fetchNavByISIN(isin, schemeName)
        : await fetchNavForScheme(schemeName);
      if (!navData) {
        return res.status(404).json({ message: "NAV data not found for this scheme" });
      }
      res.json(navData);
    } catch (error: any) {
      console.error("NAV fetch error:", error);
      res.status(500).json({ message: "Failed to fetch NAV data" });
    }
  });

  app.get("/api/scheme-codes/search", async (req, res) => {
    const query = (req.query.q as string) || "";
    if (!query || query.length < 3) {
      return res.json([]);
    }
    try {
      const results = await searchSchemeCodes(query);
      res.json(results);
    } catch (error: any) {
      console.error("Scheme code search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // ── Bulk performance endpoint: one request for all funds in a report ──
  app.get("/api/bulk-performance", async (req, res) => {
    const reportId = req.query.reportId;
    if (!reportId) {
      return res.status(400).json({ message: "reportId is required" });
    }

    try {
      const report = await storage.getReport(Number(reportId));
      if (!report) return res.status(404).json({ message: "Report not found" });

      // Include all funds that have an ISIN (real or fuzzy-resolved) or at least
      // a scheme name we can look up by name-matching at query time.
      const snapshot: any[] = ((report.analysis as any)?.mf_snapshot || []).filter(
        (f: any) => (f.isin && f.isin.trim()) || (f.scheme_name && f.scheme_name.trim())
      );

      const formatCagr = (val: number | null) => val !== null ? `${val.toFixed(2)}%` : "N/A";

      const buildPerf = async (mf: any) => {
        const isin: string = (mf.isin || "").trim();
        const fundName: string = mf.scheme_name || "";
        // Stable key: real/fuzzy ISIN when available, scheme name as fallback
        const perfKey: string = isin || fundName;
        try {
          const [navData, jsonMetrics] = await Promise.all([
            isin ? fetchNavByISIN(isin, fundName) : fetchNavForScheme(fundName),
            getMetricsFromJson(fundName),
          ]);
          const reportedBenchmarkName = jsonMetrics?.benchmark_name || "Data unavailable";
          const benchmarkReturns = await getBenchmarkReturns(fundName, reportedBenchmarkName);
          const benchmarkName = benchmarkReturns?.resolvedName || reportedBenchmarkName;
          return {
            key: perfKey,
            data: {
              nav: { value: navData?.current_nav ?? 0, date: navData?.nav_date || "Data unavailable" },
              cagr: {
                "1y": formatCagr(navData?.cagr_1y ?? null),
                "3y": formatCagr(navData?.cagr_3y ?? null),
                "5y": formatCagr(navData?.cagr_5y ?? null),
              },
              benchmark_name: benchmarkName,
              benchmark_returns: benchmarkReturns || { "1y": "N/A", "3y": "N/A", "5y": "N/A" },
              portfolio: { sectors: [], holdings: [] },
              stats: {
                aum_crores: jsonMetrics?.aum_crores || "Data unavailable",
                expense_ratio: jsonMetrics?.expense_ratio || "Data unavailable",
                turnover: (jsonMetrics as any)?.portfolio_turnover || "Data unavailable",
                factsheet_month: (jsonMetrics as any)?.factsheet_month || "Data unavailable",
                last_updated: (jsonMetrics as any)?.last_updated || "Data unavailable",
                scheme_category: (jsonMetrics as any)?.scheme_category || "Data unavailable",
              },
              risk_ratios: {
                std_dev: { fund: jsonMetrics?.std_deviation || "Data unavailable", category_avg: "Data unavailable" },
                sharpe: { fund: jsonMetrics?.sharpe_ratio || "Data unavailable", category_avg: "Data unavailable" },
                beta: { fund: jsonMetrics?.beta || "Data unavailable", category_avg: "Data unavailable" },
                alpha: { fund: jsonMetrics?.alpha || "Data unavailable", category_avg: "Data unavailable" },
              },
              data_sources: {
                nav: navData ? "MFAPI (api.mfapi.in)" : "Data unavailable",
                returns: navData ? "Calculated from MFAPI NAV history" : "Data unavailable",
                risk_metrics: jsonMetrics ? jsonMetrics.source : "Data unavailable",
              },
            },
          };
        } catch (_) {
          return { key: perfKey, data: null };
        }
      };

      const buildScoring = (mf: any) => {
        const isin: string = (mf.isin || "").trim();
        const schemeName: string = mf.scheme_name || "";
        const perfKey: string = isin || schemeName;
        const plan = schemeName.toLowerCase().includes("direct") ? "Direct" : "Regular";
        try {
          const record = lookupByIsinOrName(isin, schemeName, plan);
          return { key: perfKey, data: record || null };
        } catch (_) {
          return { key: perfKey, data: null };
        }
      };

      // Run all funds fully in parallel — MFAPI's internal queue handles rate limiting
      const [perfResults, scoringResults] = await Promise.all([
        Promise.all(snapshot.map(buildPerf)),
        Promise.resolve(snapshot.map(buildScoring)),
      ]);

      const performances: Record<string, any> = {};
      for (const r of perfResults) {
        if (r.data) performances[r.key] = r.data;
      }
      const scoringRecords: Record<string, any> = {};
      for (const r of scoringResults) {
        if (r.data) scoringRecords[r.key] = r.data;
      }

      console.log(`[bulk-performance] report ${reportId}: ${snapshot.length} funds processed`);
      res.json({ performances, scoringRecords });
    } catch (err: any) {
      console.error("[bulk-performance] error:", err.message);
      res.status(500).json({ message: "Bulk performance fetch failed: " + err.message });
    }
  });

  app.get("/api/scrape-performance/:isin", async (req, res) => {
    const isin = req.params.isin;
    const reportId = req.query.reportId;
    res.setHeader("Cache-Control", "no-store");

    try {
      let fundName = "";
      if (reportId) {
        const report = await storage.getReport(Number(reportId));
        const snapshot = (report?.analysis as any)?.mf_snapshot || [];
        const fund = snapshot.find((f: any) => f.isin === isin)
          || snapshot.find((f: any) => f.scheme_name === isin);
        fundName = fund?.scheme_name || isin;
      } else {
        fundName = isin;
      }

      console.log(`Fetching real data for: ${fundName} (${isin})`);

      const [navData, jsonMetrics] = await Promise.all([
        fetchNavByISIN(isin, fundName),
        getMetricsFromJson(fundName)
      ]);

      const mergedMetrics = jsonMetrics;
      const reportedBenchmarkName = mergedMetrics?.benchmark_name || "Data unavailable";
      const benchmarkReturns = await getBenchmarkReturns(fundName, reportedBenchmarkName);
      const benchmarkName = benchmarkReturns?.resolvedName || reportedBenchmarkName;

      const formatCagr = (val: number | null) => val !== null ? `${val.toFixed(2)}%` : "N/A";

      // Sectors/holdings are not fetched from AI to keep analysis fast.
      // They are available from the fund factsheet if needed in future.
      const aiInsight = null;

      const performance = {
        nav: {
          value: navData?.current_nav ?? 0,
          date: navData?.nav_date || "Data unavailable",
        },
        cagr: {
          "1y": formatCagr(navData?.cagr_1y ?? null),
          "3y": formatCagr(navData?.cagr_3y ?? null),
          "5y": formatCagr(navData?.cagr_5y ?? null),
        },
        benchmark_name: benchmarkName,
        benchmark_returns: benchmarkReturns || {
          "1y": "N/A",
          "3y": "N/A",
          "5y": "N/A",
        },
        portfolio: {
          sectors: aiInsight?.sectors || [],
          holdings: aiInsight?.holdings || [],
        },
        stats: {
          aum_crores: mergedMetrics?.aum_crores || "Data unavailable",
          expense_ratio: mergedMetrics?.expense_ratio || "Data unavailable",
          turnover: mergedMetrics?.portfolio_turnover || "Data unavailable",
          factsheet_month: (mergedMetrics as any)?.factsheet_month || "Data unavailable",
          last_updated: (mergedMetrics as any)?.last_updated || "Data unavailable",
          scheme_category: (mergedMetrics as any)?.scheme_category || "Data unavailable",
        },
        risk_ratios: {
          std_dev: { fund: mergedMetrics?.std_deviation || "Data unavailable", category_avg: "Data unavailable" },
          sharpe: { fund: mergedMetrics?.sharpe_ratio || "Data unavailable", category_avg: "Data unavailable" },
          beta: { fund: mergedMetrics?.beta || "Data unavailable", category_avg: "Data unavailable" },
          alpha: { fund: mergedMetrics?.alpha || "Data unavailable", category_avg: "Data unavailable" },
        },
        data_sources: {
          nav: navData ? "MFAPI (api.mfapi.in)" : "Data unavailable",
          returns: navData ? "Calculated from MFAPI NAV history" : "Data unavailable",
          risk_metrics: mergedMetrics ? mergedMetrics.source : "Data unavailable",
        },
      };

      res.json(performance);
    } catch (error: any) {
      console.error("Performance fetch error:", error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.get("/api/scheme-performance/:isin", async (req, res) => {
    const isin = req.params.isin;
    const reportId = req.query.reportId;
    
    try {
      let fundName = "";
      if (reportId) {
        const report = await storage.getReport(Number(reportId));
        const snapshot = (report?.analysis as any)?.mf_snapshot || [];
        const fund = snapshot.find((f: any) => f.isin === isin);
        fundName = fund?.scheme_name || "";
      }

      console.log(`Fetching scheme performance from MFAPI for: ${fundName} (${isin})`);

      const [navData, factsheetMetrics] = await Promise.all([
        fetchNavByISIN(isin, fundName),
        extractMetricsFromFactsheet(fundName),
      ]);

      const reportedBenchmarkName2 = factsheetMetrics?.benchmark_name || "Data unavailable";
      const benchmarkReturns2 = await getBenchmarkReturns(fundName, reportedBenchmarkName2);
      const benchmarkName2 = benchmarkReturns2?.resolvedName || reportedBenchmarkName2;

      const formatCagr = (val: number | null) => val !== null ? `${val.toFixed(2)}%` : "N/A";

      const result = {
        scheme_returns: {
          "1y": formatCagr(navData?.cagr_1y ?? null),
          "3y": formatCagr(navData?.cagr_3y ?? null),
          "5y": formatCagr(navData?.cagr_5y ?? null),
        },
        benchmark_name: benchmarkName2,
        benchmark_returns: benchmarkReturns2 || {
          "1y": "N/A",
          "3y": "N/A",
          "5y": "N/A",
        },
        nav: {
          value: navData?.current_nav ?? 0,
          date: navData?.nav_date || "Data unavailable",
        },
        data_sources: {
          returns: navData ? "Calculated from MFAPI NAV history" : "Data unavailable",
          benchmark: factsheetMetrics ? factsheetMetrics.source : "Data unavailable",
        },
      };

      return res.json(result);
    } catch (err: any) {
      console.error(`Scheme performance error:`, err.message);
      res.status(500).json({ message: "Failed to fetch scheme performance" });
    }
  });

  app.get("/api/scoring/:isin", async (req, res) => {
    const isin = req.params.isin.trim();
    const schemeName = (req.query.schemeName as string | undefined) || undefined;
    const plan = (req.query.plan as string | undefined) || undefined;
    try {
      const record = lookupByIsinOrName(isin, schemeName, plan);
      if (!record) {
        return res.status(404).json({ message: "No scoring data found for ISIN: " + isin });
      }
      res.json(record);
    } catch (err: any) {
      console.error("Scoring lookup error:", err.message);
      res.status(500).json({ message: "Scoring lookup failed" });
    }
  });

  app.get("/api/bulk-nav", async (req, res) => {
    const schemeNames = (req.query.schemes as string || "").split("|").filter(Boolean);
    if (schemeNames.length === 0) {
      return res.json({});
    }

    const results: Record<string, any> = {};

    const batchSize = 5;
    for (let i = 0; i < schemeNames.length; i += batchSize) {
      const batch = schemeNames.slice(i, i + batchSize);
      const promises = batch.map(async (name) => {
        try {
          const navData = await fetchNavForScheme(name);
          if (navData) {
            results[name] = {
              current_nav: navData.current_nav,
              nav_date: navData.nav_date,
              cagr_1y: navData.cagr_1y,
              cagr_3y: navData.cagr_3y,
              cagr_5y: navData.cagr_5y,
            };
          }
        } catch (e) {
          console.error(`Bulk NAV error for ${name}:`, e);
        }
      });
      await Promise.all(promises);
    }

    res.json(results);
  });

  // ── Nifty 500 benchmark from Supabase ──────────────────────────────────────
  app.get("/api/nifty-benchmark", async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT return_1y, return_3y, as_of_date
         FROM nifty500_benchmark
         ORDER BY as_of_date DESC
         LIMIT 1`
      );
      if (result.rows.length === 0) {
        return res.json({ return_1y: 7.98, return_3y: 14.66, as_of_date: null, source: "fallback" });
      }
      const row = result.rows[0];
      return res.json({
        return_1y: parseFloat(row.return_1y),
        return_3y: parseFloat(row.return_3y),
        as_of_date: row.as_of_date,
        source: "supabase",
      });
    } catch (err: any) {
      console.error("nifty-benchmark fetch error:", err.message);
      return res.json({ return_1y: 7.98, return_3y: 14.66, as_of_date: null, source: "fallback" });
    }
  });

  // ── Overlap Analysis endpoint ───────────────────────────────────────────
  app.get("/api/overlap/:id", async (req, res) => {
    try {
      const report = await storage.getReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });

      const analysis = (report.analysis as any) || {};
      const snapshot = (analysis.mf_snapshot || []) as any[];

      if (snapshot.length === 0) {
        return res.json({
          diversificationScore: "Good",
          averageOverlap: 0,
          highConcentrationStocks: 0,
          similarPairs: [],
          stockConcentration: [],
          redFlags: [{ type: "general", message: "No funds found in portfolio for overlap analysis.", severity: "moderate" }],
          analyzedFunds: [],
          unmatchedFunds: [],
        });
      }

      const result = analyzeOverlap(snapshot);
      res.json(result);
    } catch (err: any) {
      console.error("Overlap analysis error:", err);
      res.status(500).json({ message: "Failed to compute overlap analysis" });
    }
  });

  return httpServer;
}
