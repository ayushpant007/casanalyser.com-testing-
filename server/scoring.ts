import fs from "fs";
import path from "path";

interface ScoringRecord {
  fundName: string;
  plan: string;
  category: string;
  isin: string;
  schemeCode: number;
  fundType: "equity" | "hybrid" | "debt" | "solution" | "commodity";
  totalScore: number;
  riskCategory: string;
  fundRating: string;
  metrics: Record<string, number | string | null>;
  scores: Record<string, number | null>;
}

const STOP_WORDS = new Set([
  "fund", "funds", "plan", "plans", "growth", "growth plan", "direct", "regular",
  "option", "scheme", "india", "the", "a", "an", "of", "and", "or", "for", "in",
  "on", "at", "to", "by", "with", "from", "is", "are", "was", "be", "been",
  "erstwhile", "previously", "known", "as", "formerly", "new", "standard",
  "institutional", "retail", "super", "ultra", "bonus", "dividend", "payout",
  "reinvest", "reinvestment", "idcw", "growth plan growth option",
]);

const ABBREV_MAP: Record<string, string> = {
  "pru": "prudential",
  "hdfc": "hdfc",
  "sbi": "sbi",
  "icici": "icici",
  "axis": "axis",
  "kotak": "kotak",
  "nippon": "nippon",
  "dsp": "dsp",
  "absl": "aditya birla sun life",
  "aditya birla": "aditya birla sun life",
  "mirae": "mirae",
  "tata": "tata",
  "uti": "uti",
  "franklin": "franklin",
  "invesco": "invesco",
  "bandhan": "bandhan",
  "pgim": "pgim",
  "hsbc": "hsbc",
  "canara": "canara",
  "l&t": "l t",
  "l & t": "l t",
};

function normalizeName(name: string): Set<string> {
  let n = name.toLowerCase();
  for (const [abbr, full] of Object.entries(ABBREV_MAP)) {
    n = n.replace(new RegExp(`\\b${abbr}\\b`, "g"), full);
  }
  n = n.replace(/[-&().,\/\\*]/g, " ");
  const tokens = n.split(/\s+/).filter(t => t.length > 1 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

const SCORE_KEYWORDS = [
  "score", "quality", "risk & return", "risk&return", "risk-adj",
  "diversification", "valuation", "portbreadth", "portfolio breadth",
  "vol &", "volatility &", "debt quality",
];

function isScoreColumn(header: string): boolean {
  const lower = header.toLowerCase();
  return SCORE_KEYWORDS.some(kw => lower.includes(kw));
}

const SKIP_COLS = new Set([
  "isin", "isin (growth / div payout)", "isin (div reinvestment)",
  "scheme code", "scheme_code", "plan", "fund name", "category", "subcategory",
  "risk category", "fund rating", "fund_rating", "fund url",
]);

function addRowsFromCSV(
  filePath: string,
  fundType: ScoringRecord["fundType"],
  db: Map<string, ScoringRecord>,
  nameIdx: Array<{ tokens: Set<string>; record: ScoringRecord }>
) {
  try {
    const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
    if (lines.length < 2) return;

    const header = parseCSVLine(lines[0]);

    const findCol = (...names: string[]) => {
      for (const name of names) {
        const idx = header.findIndex(h => h.toLowerCase() === name.toLowerCase());
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const isinIdx        = findCol("ISIN", "isin", "ISIN (Growth / Div Payout)");
    const schemeCodeIdx  = findCol("Scheme Code", "scheme_code");
    const fundNameIdx    = findCol("Fund Name");
    const planIdx        = findCol("Plan");
    const categoryIdx    = findCol("Category");
    const riskCatIdx     = findCol("Risk Category");
    const fundRatingIdx  = findCol("Fund Rating", "fund_rating");
    const totalScoreIdx  = findCol("Total Score (40)", "total_score", "Total Score (Available)");

    if (isinIdx === -1 || fundNameIdx === -1) {
      console.warn(`[Scoring] Missing key columns in ${path.basename(filePath)}`);
      return;
    }

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);

      const isin = (isinIdx < cols.length ? cols[isinIdx] : "").trim();
      if (!isin || !isin.startsWith("INF")) continue;

      const metrics: Record<string, number | string | null> = {};
      const scores: Record<string, number | null> = {};

      for (let j = 0; j < header.length; j++) {
        const key = header[j];
        if (!key || SKIP_COLS.has(key.toLowerCase())) continue;

        const val = j < cols.length ? cols[j].trim() : "";

        if (isScoreColumn(key)) {
          scores[key] = val !== "" && !isNaN(Number(val)) ? Number(val) : null;
        } else {
          if (val === "") {
            metrics[key] = null;
          } else if (!isNaN(Number(val))) {
            metrics[key] = Number(val);
          } else {
            metrics[key] = val;
          }
        }
      }

      const record: ScoringRecord = {
        fundName:     fundNameIdx < cols.length ? cols[fundNameIdx].trim() : "",
        plan:         planIdx >= 0 && planIdx < cols.length ? cols[planIdx].trim() : "",
        category:     categoryIdx >= 0 && categoryIdx < cols.length ? cols[categoryIdx].trim() : "",
        isin,
        schemeCode:   schemeCodeIdx >= 0 && schemeCodeIdx < cols.length ? Number(cols[schemeCodeIdx]) || 0 : 0,
        fundType,
        totalScore:   totalScoreIdx >= 0 && totalScoreIdx < cols.length ? Number(cols[totalScoreIdx]) || 0 : 0,
        riskCategory: riskCatIdx >= 0 && riskCatIdx < cols.length ? cols[riskCatIdx].trim() : "",
        fundRating:   fundRatingIdx >= 0 && fundRatingIdx < cols.length ? cols[fundRatingIdx].trim() : "",
        metrics,
        scores,
      };

      db.set(isin, record);
      nameIdx.push({ tokens: normalizeName(record.fundName), record });
      count++;
    }
    console.log(`[Scoring] Loaded ${count} records from ${path.basename(filePath)} (${fundType})`);
  } catch (e: any) {
    console.error(`[Scoring] Failed to load ${filePath}:`, e.message);
  }
}

let scoringDb: Map<string, ScoringRecord> | null = null;
let nameIndex: Array<{ tokens: Set<string>; record: ScoringRecord }> | null = null;

function loadScoring(): { db: Map<string, ScoringRecord>; nameIdx: Array<{ tokens: Set<string>; record: ScoringRecord }> } {
  const db = new Map<string, ScoringRecord>();
  const nameIdx: Array<{ tokens: Set<string>; record: ScoringRecord }> = [];
  const base = path.join(process.cwd(), "Scoring");

  addRowsFromCSV(path.join(base, "Equity_Funds.csv"),            "equity",    db, nameIdx);
  addRowsFromCSV(path.join(base, "Hybrid_Funds.csv"),            "hybrid",    db, nameIdx);
  addRowsFromCSV(path.join(base, "Debt_Funds.csv"),              "debt",      db, nameIdx);
  addRowsFromCSV(path.join(base, "Solution_Oriented_Funds.csv"), "solution",  db, nameIdx);
  addRowsFromCSV(path.join(base, "Commodities_Funds.csv"),       "commodity", db, nameIdx);

  return { db, nameIdx };
}

function ensureLoaded() {
  if (!scoringDb || !nameIndex) {
    const { db, nameIdx } = loadScoring();
    scoringDb = db;
    nameIndex = nameIdx;
  }
}

export function lookupByIsin(isin: string): ScoringRecord | null {
  ensureLoaded();
  return scoringDb!.get(isin.trim()) ?? null;
}

export function lookupByName(schemeName: string, preferPlan?: string): ScoringRecord | null {
  ensureLoaded();
  const queryTokens = normalizeName(schemeName);
  if (queryTokens.size === 0) return null;

  let bestScore = 0;
  let bestRecord: ScoringRecord | null = null;
  let bestPlanBonus = 0;

  for (const { tokens, record } of nameIndex!) {
    const sim = jaccardSimilarity(queryTokens, tokens);
    const planBonus = preferPlan && record.plan.toLowerCase() === preferPlan.toLowerCase() ? 0.05 : 0;
    const total = sim + planBonus;

    if (total > bestScore + bestPlanBonus) {
      bestScore = sim;
      bestPlanBonus = planBonus;
      bestRecord = record;
    }
  }

  return bestScore >= 0.35 ? bestRecord : null;
}

export function lookupByIsinOrName(isin: string, schemeName?: string, preferPlan?: string): ScoringRecord | null {
  const byIsin = lookupByIsin(isin);
  if (byIsin) return byIsin;
  if (schemeName) return lookupByName(schemeName, preferPlan);
  return null;
}
