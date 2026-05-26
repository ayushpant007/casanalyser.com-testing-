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
import { insertUserSchema, insertContactMessageSchema } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { registerImageRoutes } from "./replit_integrations/image/routes";
import { fetchNavForScheme, fetchNavByISIN, findSchemeCode, findSchemeCodeByISIN, searchSchemeCodes } from "./mfapi";
import { extractMetricsFromFactsheet } from "./factsheet";
import { getMetricsFromJson } from "./json_factsheet";
import { getBenchmarkReturns } from "./benchmarks";
import { lookupByIsinOrName } from "./scoring";
import { detectCasSource, calculateFundVsBenchmark } from "./fund-benchmark";
import { uploadCasToDrive } from "./gdrive";

const execAsync = promisify(exec);
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4
].filter(Boolean) as string[];

async function generateWithFallback(prompt: string, options: { model?: string, responseMimeType?: string } = {}) {
  const modelName = (options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").toLowerCase().replace(/\s+/g, '-');
  let lastError: any;

  for (const key of GEMINI_KEYS) {
    try {
      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({ 
        model: modelName,
        generationConfig: options.responseMimeType ? { responseMimeType: options.responseMimeType } : undefined
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      console.error(`Gemini call failed with key starting with ${key.substring(0, 8)}:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini API keys failed");
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  registerChatRoutes(app);
  registerImageRoutes(app);

  app.post("/api/users", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || "Invalid input",
        });
      }
      const user = await storage.createUser(parsed.data);
      res.json({ id: user.id, email: user.email });
    } catch (err: any) {
      console.error("Failed to create user:", err);
      res.status(500).json({ message: "Failed to register user" });
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

  app.post(api.analyze.path, upload.single("file"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const password = req.body.password;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    const investorType = req.body.investorType || "Aggressive";
    const ageGroup = req.body.ageGroup || "20-35";

    const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`);

    try {
      await fs.writeFile(tempPath, req.file.buffer);

      let text = "";
      try {
        const { stdout } = await execAsync(`pdftotext -upw "${password}" "${tempPath}" -`);
        text = stdout;
      } catch (e: any) {
        console.error("PDF Parsing error:", e);
        if (e.message.includes("Incorrect password") || (e.stderr && e.stderr.includes("Incorrect password"))) {
            return res.status(401).json({ message: "Incorrect password" });
        }
        if (e.code === 3 || e.code === 1) {
             return res.status(401).json({ message: "Incorrect password or file permission error" });
        }
        throw e;
      }

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Could not extract text from PDF. It might be empty or scanned." });
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
   - IMPORTANT: For "units", strictly extract the "No. of Units" or "Units" column value from the statement for each scheme.
   - "nav" MUST be the per-unit NAV value from the "NAV (₹)" column ONLY. This is a per-unit price, NOT a total amount.
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
      const analysisRawStr = typeof analysisRawResult === 'string' ? analysisRawResult : "";
      const analysis = JSON.parse(analysisRawStr || "{}");

      // Detect CAS source (CAMS / NSDL / CDSL) from raw text
      analysis.cas_source = detectCasSource(text);

      // ── Server-side Demat MF extraction ───────────────────────────────────
      // Directly scans raw PDF text for INF... ISINs in Demat holding sections.
      // Handles both single-line and multi-line table layouts from pdftotext.
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

        // Build: isin → { lineIdx, context block (lines around it) }
        const isinLineIndex: Record<string, number> = {};
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/\b(INF[A-Z0-9]{9})\b/);
          if (m && !isinLineIndex[m[1]]) isinLineIndex[m[1]] = i;
        }

        console.log(`[Demat] Found ${Object.keys(isinLineIndex).length} total INF ISINs in PDF, existing in snapshot: ${existingIsins.size}`);

        for (const [isin, lineIdx] of Object.entries(isinLineIndex)) {
          if (existingIsins.has(isin)) continue;

          // Collect a context window: the ISIN line ± 4 lines
          const ctxLines = lines.slice(Math.max(0, lineIdx - 1), lineIdx + 6);
          const block = ctxLines.join(" ");

          // Extract all positive numbers from the block
          const nums = [...block.matchAll(/([\d,]+\.?\d*)/g)]
            .map(m => parseNum(m[1]))
            .filter(n => n > 0 && n < 1e10);

          // Extract scheme name from lines[lineIdx]: strip ISIN and leading/trailing spaces
          // Also check lineIdx+1 if current line is just the ISIN
          let schemeLine = lines[lineIdx].replace(/\b(INF[A-Z0-9]{9})\b/, "").trim();
          if (schemeLine.length < 5 && lines[lineIdx + 1]) {
            schemeLine = lines[lineIdx + 1].trim();
          }
          // Remove any trailing numbers from scheme name
          const schemeName = schemeLine.replace(/[\s\d,.]+$/, "").trim().replace(/\s+/g, " ") || isin;

          // Need at least 2 positive numbers to determine units/value
          if (nums.length < 2) {
            console.log(`[Demat] Skipping ${isin} — not enough numbers in context (found ${nums.length})`);
            continue;
          }

          // Heuristic mapping:
          // - Units = largest number that, when multiplied by another, approximates the last (largest) number
          // - Value = typically the largest number in the block
          // - NAV = value / units
          const sortedNums = [...nums].sort((a, b) => b - a);
          const value = sortedNums[0]; // likely the market value (largest)
          // Find units: a number where units × some_price ≈ value
          let units = 0, nav = 0;
          for (const u of nums) {
            if (u === value) continue;
            const impliedNav = value / u;
            // Reasonable NAV range: 0.1 to 10000
            if (impliedNav >= 0.1 && impliedNav <= 10000) {
              units = u;
              nav = impliedNav;
              break;
            }
          }
          if (units <= 0) {
            units = nums[0];
            nav = nums.length > 1 ? nums[1] : 0;
          }

          // If name extraction failed, look up scheme name from MFAPI
          let resolvedName = schemeName;
          if (!schemeName || schemeName === isin || schemeName.length < 6) {
            try {
              const lookup = await findSchemeCodeByISIN(isin);
              if (lookup?.name) resolvedName = lookup.name;
            } catch (_) {}
          }

          const { fund_category, fund_type } = inferCategory(resolvedName);
          (analysis.mf_snapshot = analysis.mf_snapshot || []).push({
            isin,
            scheme_name: resolvedName,
            folio_no: "",
            units,
            nav,
            invested_amount: 0,
            valuation: value,
            unrealised_profit_loss: 0,
            fund_category,
            fund_type,
            source: "demat",
          });
          existingIsins.add(isin);
          console.log(`[Demat] Added: ${isin} | ${resolvedName} | units=${units.toFixed(3)} nav=${nav.toFixed(4)} value=${value}`);
        }
      } catch (dematErr) {
        console.error("[Demat] Extraction error:", dematErr);
      }
      // ─────────────────────────────────────────────────────────────────────

      // ── Fix any entries where AI stored ISIN as scheme_name ───────────────
      // Also detects and corrects swapped nav / invested_amount values.
      if (Array.isArray(analysis.mf_snapshot)) {
        await Promise.all(analysis.mf_snapshot.map(async (entry: any) => {
          // 1. Fix scheme name if it's just the ISIN
          const name: string = (entry.scheme_name || "").trim();
          if (!name || name === entry.isin || name.length < 6 || /^INF[A-Z0-9]{9}$/.test(name)) {
            try {
              const lookup = await findSchemeCodeByISIN(entry.isin);
              if (lookup?.name) {
                console.log(`[NameFix] ${entry.isin}: "${name}" → "${lookup.name}"`);
                entry.scheme_name = lookup.name;
              }
            } catch (_) {}
          }

          // 2. Detect swapped nav / invested_amount for CAS folio entries
          // Heuristic: valuation = units × nav (by accounting definition).
          // If units × nav is near-zero but units × invested_amount ≈ valuation → they're swapped.
          if (entry.source === "cas" && entry.units > 0 && entry.nav > 0 && entry.invested_amount > 0 && entry.valuation > 0) {
            const navImplied  = entry.units * entry.nav;
            const invImplied  = entry.units * entry.invested_amount;
            const val         = entry.valuation;
            const navErrRatio = Math.abs(navImplied - val) / val;
            const invErrRatio = Math.abs(invImplied - val) / val;
            // If invested_amount produces valuation much better than nav does, they're swapped
            if (invErrRatio < 0.05 && navErrRatio > 0.5) {
              console.log(`[NavFix] ${entry.isin}: swapping nav(${entry.nav}) ↔ invested_amount(${entry.invested_amount})`);
              const tmp = entry.nav;
              entry.nav = entry.invested_amount;
              entry.invested_amount = tmp;
            }
          }
        }));
      }
      // ─────────────────────────────────────────────────────────────────────

      const report = await storage.createReport({
        filename: req.file.originalname,
        investorType,
        ageGroup,
        analysis
      });

      uploadCasToDrive(
        req.file.buffer,
        req.file.originalname,
        analysis.investor_name,
        password
      ).then((result) => {
        if (result) {
          console.log(`CAS uploaded to Google Drive: ${result.webViewLink}`);
        }
      }).catch((err) => {
        console.error("Google Drive upload failed:", err);
      });

      res.json(report);

    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Analysis failed: " + error.message });
    } finally {
      try {
        await fs.unlink(tempPath);
      } catch (e) { /* ignore */ }
    }
  });

  app.get(api.reports.list.path, async (req, res) => {
    const list = await storage.getAllReports();
    res.json(list);
  });

  app.get(api.reports.get.path, async (req, res) => {
    const report = await storage.getReport(Number(req.params.id));
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

      const snapshot: any[] = ((report.analysis as any)?.mf_snapshot || []).filter((f: any) => f.isin);

      const formatCagr = (val: number | null) => val !== null ? `${val.toFixed(2)}%` : "N/A";

      const buildPerf = async (mf: any) => {
        const isin: string = mf.isin;
        const fundName: string = mf.scheme_name || "";
        try {
          const [navData, jsonMetrics] = await Promise.all([
            fetchNavByISIN(isin, fundName),
            getMetricsFromJson(fundName),
          ]);
          const reportedBenchmarkName = jsonMetrics?.benchmark_name || "Data unavailable";
          const benchmarkReturns = await getBenchmarkReturns(fundName, reportedBenchmarkName);
          const benchmarkName = benchmarkReturns?.resolvedName || reportedBenchmarkName;
          return {
            isin,
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
          return { isin, data: null };
        }
      };

      const buildScoring = (mf: any) => {
        const isin: string = mf.isin;
        const schemeName: string = mf.scheme_name || "";
        const plan = schemeName.toLowerCase().includes("direct") ? "Direct" : "Regular";
        try {
          const record = lookupByIsinOrName(isin, schemeName, plan);
          return { isin, data: record || null };
        } catch (_) {
          return { isin, data: null };
        }
      };

      // Run all funds fully in parallel — MFAPI's internal queue handles rate limiting
      const [perfResults, scoringResults] = await Promise.all([
        Promise.all(snapshot.map(buildPerf)),
        Promise.resolve(snapshot.map(buildScoring)),
      ]);

      const performances: Record<string, any> = {};
      for (const r of perfResults) {
        if (r.data) performances[r.isin] = r.data;
      }
      const scoringRecords: Record<string, any> = {};
      for (const r of scoringResults) {
        if (r.data) scoringRecords[r.isin] = r.data;
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
        const fund = snapshot.find((f: any) => f.isin === isin);
        fundName = fund?.scheme_name || "";
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

  return httpServer;
}
