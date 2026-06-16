import fs from "fs";
import path from "path";

// ── Types ───────────────────────────────────────────────────────────────────
export interface StockHolding {
  company: string;
  weight: number;
}

export interface FundHoldings {
  fundName: string;
  isin: string;
  stocks: StockHolding[];
  totalVisibleWeight: number;
}

export interface FundPairOverlap {
  fundA: string;
  fundB: string;
  overlapScore: number;
  commonHoldings: number;
  highConcentration: { company: string; weightA: number; weightB: number }[];
  moderateConcentration: { company: string; weightA: number; weightB: number }[];
}

export interface StockConcentration {
  company: string;
  totalExposure: number;
  fundCount: number;
  fundWeights: { fund: string; weight: number }[];
}

export interface RedFlag {
  type: "pair_overlap" | "stock_concentration" | "general";
  message: string;
  severity: "high" | "moderate";
}

export interface OverlapAnalysisResult {
  diversificationScore: "Good" | "Moderate" | "Poor";
  averageOverlap: number;
  equityAverageOverlap: number | null;
  equityFundCount: number;
  debtAverageOverlap: number | null;
  debtFundCount: number;
  highConcentrationStocks: number;
  similarPairs: FundPairOverlap[];
  stockConcentration: StockConcentration[];
  redFlags: RedFlag[];
  analyzedFunds: string[];
  unmatchedFunds: string[];
}

// ── CSV file configs ────────────────────────────────────────────────────────
const CSV_FILES = [
  { path: "attached_assets/Equity_holdings_-_Main_1781164821041.csv", holdingTypeCol: null, companyCol: "Company Name", weightCol: "% Assets" },
  { path: "attached_assets/Hybrid_Holding_-_main_1781164821040.csv", holdingTypeCol: "Holding Type", companyCol: "Company", weightCol: "% Assets" },
  { path: "attached_assets/Solution_Oriented_Holdings_-_main_1781164821039.csv", holdingTypeCol: "Holding Type", companyCol: "Company", weightCol: "% Assets" },
  { path: "attached_assets/Debt_holding_-_main_1781164821043.csv", holdingTypeCol: null, companyCol: "Company", weightCol: "% Assets" },
  { path: "attached_assets/Commodities_Holding_-_vr_commodity_holdings_REGULAR.csv_1781164821045.csv", holdingTypeCol: null, companyCol: "Company Name", weightCol: "% Assets" },
];

// ── In-memory cache ─────────────────────────────────────────────────────────
let nameMap: Map<string, FundHoldings> | null = null; // normalizedName → holdings
let isinMap: Map<string, string> | null = null;        // ISIN → normalizedName key

// ── Helpers ─────────────────────────────────────────────────────────────────
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

function normalizeFundName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(regular|reg|direct|dir|growth|dividend|plan|option|of|the|and|for|in)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFundWords(name: string): Set<string> {
  const raw = normalizeFundName(name).split(/\s+/).filter(w => w.length > 1);
  const expanded: string[] = [];
  for (const w of raw) {
    expanded.push(w);
    if (w.includes("midcap"))    { expanded.push("mid", "cap"); }
    if (w.includes("smallcap"))  { expanded.push("small", "cap"); }
    if (w.includes("largecap"))  { expanded.push("large", "cap"); }
    if (w.includes("flexicap"))  { expanded.push("flexi", "cap"); }
    if (w.includes("multicap"))  { expanded.push("multi", "cap"); }
  }
  return new Set(expanded);
}

function wordOverlapScore(wordsA: Set<string>, wordsB: Set<string>): number {
  let common = 0;
  for (const w of Array.from(wordsA)) { if (wordsB.has(w)) common++; }
  return common / Math.max(wordsA.size, wordsB.size);
}

function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bltd\.?\b|\blimited\b|\bcorporation\b|\bcompany\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Load all holdings from CSV files ────────────────────────────────────────
export function loadHoldings(): { nameMap: Map<string, FundHoldings>; isinMap: Map<string, string> } {
  if (nameMap && isinMap) return { nameMap, isinMap };

  nameMap = new Map();
  isinMap = new Map();

  for (const cfg of CSV_FILES) {
    const fullPath = path.join(process.cwd(), cfg.path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[Overlap] CSV not found: ${fullPath}`);
      continue;
    }

    const lines = fs.readFileSync(fullPath, "utf-8").split(/\r?\n/);
    if (lines.length < 2) continue;

    const header = parseCSVLine(lines[0]);
    const fundNameIdx  = header.indexOf("Fund Name");
    const isinIdx      = header.indexOf("ISIN");
    const companyIdx   = header.indexOf(cfg.companyCol);
    const weightIdx    = header.indexOf(cfg.weightCol);
    const typeIdx      = cfg.holdingTypeCol ? header.indexOf(cfg.holdingTypeCol) : -1;

    if (fundNameIdx === -1 || companyIdx === -1 || weightIdx === -1) {
      console.warn(`[Overlap] Missing columns in ${cfg.path}`);
      continue;
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);
      if (cols.length < Math.max(fundNameIdx, companyIdx, weightIdx) + 1) continue;

      // Skip non-equity rows when holding type column is present
      if (typeIdx >= 0) {
        const holdingType = (cols[typeIdx] || "").toLowerCase().trim();
        if (holdingType !== "equity") continue;
      }

      const fundName  = cols[fundNameIdx].trim();
      const isin      = isinIdx >= 0 ? cols[isinIdx].trim() : "";
      const company   = cols[companyIdx].trim();
      const weight    = parseFloat(cols[weightIdx].trim());

      if (!fundName || !company || isNaN(weight) || weight <= 0) continue;
      if (company === "--" || company === "N/A") continue;

      const normKey     = normalizeFundName(fundName);
      const normCompany = normalizeCompany(company);

      if (!nameMap.has(normKey)) {
        nameMap.set(normKey, { fundName, isin, stocks: [], totalVisibleWeight: 0 });
      }

      const entry = nameMap.get(normKey)!;
      if (!entry.stocks.some(s => s.company === normCompany)) {
        entry.stocks.push({ company: normCompany, weight });
        entry.totalVisibleWeight += weight;
      }

      // Register ISIN → normKey mapping (use fund-level ISIN from first row encountered)
      if (isin && isin.startsWith("INF") && !isinMap.has(isin)) {
        isinMap.set(isin, normKey);
      }
    }
  }

  console.log(`[Overlap] Loaded ${nameMap.size} funds, ${isinMap.size} ISIN mappings`);
  return { nameMap, isinMap };
}

// ── Match a CAS fund to CSV holdings ────────────────────────────────────────
// Step 1: Try ISIN exact match
// Step 2: Try fuzzy word-overlap on fund name
function matchFund(
  schemeName: string,
  schemeISIN: string,
  nameMap: Map<string, FundHoldings>,
  isinMap: Map<string, string>
): FundHoldings | null {

  // ── Step 1: ISIN match ──────────────────────────────────────────────────
  if (schemeISIN && isinMap.has(schemeISIN)) {
    const key = isinMap.get(schemeISIN)!;
    const fund = nameMap.get(key);
    if (fund) {
      console.log(`[Overlap] ISIN match: "${schemeName}" → "${fund.fundName}" (${schemeISIN})`);
      return fund;
    }
  }

  // ── Step 2: Fuzzy word-overlap on name ─────────────────────────────────
  const schemeWords = getFundWords(schemeName);
  if (schemeWords.size === 0) return null;

  let bestKey: string | null = null;
  let bestScore = 0;

  for (const [key, fund] of Array.from(nameMap.entries())) {
    const keyWords  = getFundWords(key);
    const nameWords = getFundWords(fund.fundName);
    const score = Math.max(wordOverlapScore(schemeWords, keyWords), wordOverlapScore(schemeWords, nameWords));
    if (score > bestScore) { bestScore = score; bestKey = key; }
  }

  // Require at least 50% word overlap to accept a fuzzy match
  if (bestScore < 0.5 || !bestKey) return null;

  const fund = nameMap.get(bestKey)!;
  console.log(`[Overlap] Fuzzy match (${(bestScore * 100).toFixed(0)}%): "${schemeName}" → "${fund.fundName}"`);
  return fund;
}

// ── Compute normalized overlap between two funds ────────────────────────────
//
// Overlap Score = (sum of min(weightInA, weightInB) for each common stock)
//                 ──────────────────────────────────────────────────────────
//                 totalVisibleWeight of the SMALLER fund
//                 × 100
//
// This tells us: "What % of the smaller fund's visible holdings are already
// present inside the larger fund?" — like the pizza analogy.
//
function computePairOverlap(fundA: FundHoldings, fundB: FundHoldings): FundPairOverlap {
  // Build a quick lookup for Fund B stocks
  const bLookup = new Map<string, number>();
  for (const stock of fundB.stocks) { bLookup.set(stock.company, stock.weight); }

  let commonOverlapSum = 0;
  const highConc: { company: string; weightA: number; weightB: number }[] = [];
  const modConc:  { company: string; weightA: number; weightB: number }[] = [];
  let commonCount = 0;

  for (const stockA of fundA.stocks) {
    const weightB = bLookup.get(stockA.company);
    if (weightB === undefined) continue;

    commonCount++;
    // Use the minimum weight as the overlapping contribution
    commonOverlapSum += Math.min(stockA.weight, weightB);

    // Flag individually concentrated common stocks
    const combined = stockA.weight + weightB;
    if (combined >= 10) {
      highConc.push({ company: stockA.company, weightA: stockA.weight, weightB });
    } else if (combined >= 5) {
      modConc.push({ company: stockA.company, weightA: stockA.weight, weightB });
    }
  }

  highConc.sort((a, b) => (b.weightA + b.weightB) - (a.weightA + a.weightB));
  modConc.sort((a, b)  => (b.weightA + b.weightB) - (a.weightA + a.weightB));

  // Denominator = total visible holdings of the SMALLER fund
  const smallerTotal = Math.min(fundA.totalVisibleWeight, fundB.totalVisibleWeight);
  const overlapScore = smallerTotal > 0 ? (commonOverlapSum / smallerTotal) * 100 : 0;

  return {
    fundA: fundA.fundName,
    fundB: fundB.fundName,
    overlapScore: Math.round(overlapScore * 100) / 100,
    commonHoldings: commonCount,
    highConcentration: highConc,
    moderateConcentration: modConc,
  };
}

// ── Main analysis entry point ──────────────────────────────────────────────
export function analyzeOverlap(mfSnapshot: any[]): OverlapAnalysisResult {
  const { nameMap, isinMap } = loadHoldings();

  const matched: { schemeName: string; fund: FundHoldings; fundCategory: string }[] = [];
  const unmatched: string[] = [];

  for (const mf of mfSnapshot) {
    const schemeName = (mf.scheme_name || "").trim();
    const schemeISIN = (mf.isin || "").trim();
    const fundCategory = (mf.fund_category || "").toLowerCase().trim();
    if (!schemeName) continue;

    const fund = matchFund(schemeName, schemeISIN, nameMap, isinMap);
    if (fund) {
      matched.push({ schemeName, fund, fundCategory });
    } else {
      unmatched.push(schemeName);
    }
  }

  // Deduplicate: same CSV fund matched by multiple CAS schemes
  const uniqueMap = new Map<string, { schemeName: string; fund: FundHoldings; fundCategory: string }>();
  for (const m of matched) {
    const key = normalizeFundName(m.fund.fundName);
    if (!uniqueMap.has(key)) uniqueMap.set(key, m);
  }
  const funds = Array.from(uniqueMap.values());

  // Build a lookup: CSV fund name → user's actual CAS scheme name
  const csvNameToScheme = new Map<string, string>();
  for (const m of funds) {
    csvNameToScheme.set(m.fund.fundName, m.schemeName);
  }

  const analyzedFunds = funds.map(m => m.schemeName);

  if (funds.length < 2) {
    return {
      diversificationScore: "Good",
      averageOverlap: 0,
      equityAverageOverlap: null,
      equityFundCount: 0,
      debtAverageOverlap: null,
      debtFundCount: 0,
      highConcentrationStocks: 0,
      similarPairs: [],
      stockConcentration: [],
      redFlags: [
        {
          type: "general",
          message: funds.length === 0
            ? "No fund holdings data could be matched for overlap analysis."
            : "Only one fund was matched. Need at least 2 funds for overlap analysis.",
          severity: "moderate",
        },
      ],
      analyzedFunds,
      unmatchedFunds: unmatched,
    };
  }

  // Helper: replace CSV fund name with user's actual CAS scheme name
  const toSchemeName = (csvName: string) => csvNameToScheme.get(csvName) ?? csvName;

  // ── Pair-wise overlap ────────────────────────────────────────────────────
  const pairs: FundPairOverlap[] = [];
  for (let i = 0; i < funds.length; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      const p = computePairOverlap(funds[i].fund, funds[j].fund);
      // Replace CSV names with user's actual scheme names
      pairs.push({ ...p, fundA: toSchemeName(p.fundA), fundB: toSchemeName(p.fundB) });
    }
  }
  pairs.sort((a, b) => b.overlapScore - a.overlapScore);

  const avgOverlap = pairs.length > 0
    ? pairs.reduce((sum, p) => sum + p.overlapScore, 0) / pairs.length
    : 0;

  // ── Equity-only average overlap ──────────────────────────────────────────
  // Use CAS fund_category to classify; fall back to stock count for untagged funds
  const isDebtByCategory = (m: { fundCategory: string; fund: FundHoldings }) =>
    m.fundCategory === "debt" || m.fundCategory === "liquid";
  const isEquityByCategory = (m: { fundCategory: string; fund: FundHoldings }) =>
    !isDebtByCategory(m);

  const equityFunds = funds.filter(m => isEquityByCategory(m));
  const equityPairs: FundPairOverlap[] = [];
  for (let i = 0; i < equityFunds.length; i++) {
    for (let j = i + 1; j < equityFunds.length; j++) {
      equityPairs.push(computePairOverlap(equityFunds[i].fund, equityFunds[j].fund));
    }
  }
  // Only average pairs that actually share stocks (overlap > 0)
  // This gives "when equity funds DO overlap, how much?" — a meaningful signal
  const overlappingEquityPairs = equityPairs.filter(p => p.overlapScore > 0);
  const equityAvgOverlap = overlappingEquityPairs.length > 0
    ? overlappingEquityPairs.reduce((sum, p) => sum + p.overlapScore, 0) / overlappingEquityPairs.length
    : null;

  // ── Debt-only average overlap ─────────────────────────────────────────────
  // Use CAS fund_category to identify debt funds
  const debtFunds = funds.filter(m => isDebtByCategory(m));
  const debtPairs: FundPairOverlap[] = [];
  for (let i = 0; i < debtFunds.length; i++) {
    for (let j = i + 1; j < debtFunds.length; j++) {
      debtPairs.push(computePairOverlap(debtFunds[i].fund, debtFunds[j].fund));
    }
  }
  const overlappingDebtPairs = debtPairs.filter(p => p.overlapScore > 0);
  // If ≥2 debt funds exist but none overlap, return 0 (not null) — 0% is meaningful info
  const debtAvgOverlap = debtFunds.length < 2
    ? null
    : overlappingDebtPairs.length > 0
      ? overlappingDebtPairs.reduce((sum, p) => sum + p.overlapScore, 0) / overlappingDebtPairs.length
      : 0;

  // ── Stock concentration across portfolio ─────────────────────────────────
  const stockTotals = new Map<string, { total: number; funds: { fund: string; weight: number }[] }>();
  for (const m of funds) {
    for (const stock of m.fund.stocks) {
      if (!stockTotals.has(stock.company)) {
        stockTotals.set(stock.company, { total: 0, funds: [] });
      }
      const entry = stockTotals.get(stock.company)!;
      entry.total += stock.weight;
      entry.funds.push({ fund: toSchemeName(m.fund.fundName), weight: stock.weight });
    }
  }

  const stockConcentration: StockConcentration[] = Array.from(stockTotals.entries())
    .map(([company, data]) => ({
      company,
      totalExposure: Math.round(data.total * 100) / 100,
      fundCount: data.funds.length,
      fundWeights: data.funds,
    }))
    .sort((a, b) => b.totalExposure - a.totalExposure);

  const highConcStocks = stockConcentration.filter(s => s.totalExposure > 10);

  // ── Red flags ────────────────────────────────────────────────────────────
  const redFlags: RedFlag[] = [];

  for (const p of pairs.slice(0, 3).filter(p => p.overlapScore > 15)) {
    redFlags.push({
      type: "pair_overlap",
      message: `${p.fundA} and ${p.fundB} have ${p.overlapScore.toFixed(0)}% normalized overlap (${p.commonHoldings} common stocks).`,
      severity: p.overlapScore >= 30 ? "high" : "moderate",
    });
  }

  for (const stock of highConcStocks.slice(0, 3)) {
    redFlags.push({
      type: "stock_concentration",
      message: `${stock.company} appears across ${stock.fundCount} fund(s) with ${stock.totalExposure.toFixed(1)}% combined exposure.`,
      severity: stock.totalExposure > 15 ? "high" : "moderate",
    });
  }

  if (pairs[0]?.overlapScore > 30) {
    redFlags.push({
      type: "general",
      message: "Consider replacing one of the highly overlapping funds to improve diversification.",
      severity: "high",
    });
  }

  // ── Diversification score ────────────────────────────────────────────────
  const overlapLabel: "Good" | "Moderate" | "Poor" =
    avgOverlap < 15 ? "Good" : avgOverlap <= 30 ? "Moderate" : "Poor";

  const concLabel: "Good" | "Moderate" | "Poor" =
    highConcStocks.length === 0 ? "Good" : highConcStocks.length <= 3 ? "Moderate" : "Poor";

  const scoreOrder = { Good: 1, Moderate: 2, Poor: 3 };
  const diversificationScore = scoreOrder[overlapLabel] >= scoreOrder[concLabel]
    ? overlapLabel
    : concLabel;

  return {
    diversificationScore,
    averageOverlap: Math.round(avgOverlap * 100) / 100,
    equityAverageOverlap: equityAvgOverlap !== null ? Math.round(equityAvgOverlap * 100) / 100 : null,
    equityFundCount: equityFunds.length,
    debtAverageOverlap: debtAvgOverlap !== null ? Math.round(debtAvgOverlap * 100) / 100 : null,
    debtFundCount: debtFunds.length,
    highConcentrationStocks: highConcStocks.length,
    similarPairs: pairs.slice(0, 10),
    stockConcentration: stockConcentration.slice(0, 15),
    redFlags,
    analyzedFunds,
    unmatchedFunds: unmatched,
  };
}
