import fs from "fs";
import path from "path";

// ── Types ───────────────────────────────────────────────────────────────────
export interface StockHolding {
  company: string;
  weight: number; // % Assets as parsed from CSV
}

export interface FundHoldings {
  fundName: string;
  isin: string;
  stocks: StockHolding[];
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
  highConcentrationStocks: number;
  similarPairs: FundPairOverlap[];
  stockConcentration: StockConcentration[];
  redFlags: RedFlag[];
  analyzedFunds: string[];
  unmatchedFunds: string[];
}

// ── Global in-memory cache ──────────────────────────────────────────────────
let holdingsMap: Map<string, FundHoldings> | null = null;

// ── CSV file paths ─────────────────────────────────────────────────────────
const CSV_FILES = [
  { path: "attached_assets/Solution_Oriented_Holdings_-_main_1781164821039.csv", holdingTypeCol: "Holding Type", companyCol: "Company", weightCol: "% Assets" },
  { path: "attached_assets/Hybrid_Holding_-_main_1781164821040.csv", holdingTypeCol: "Holding Type", companyCol: "Company", weightCol: "% Assets" },
  { path: "attached_assets/Equity_holdings_-_Main_1781164821041.csv", holdingTypeCol: null, companyCol: "Company Name", weightCol: "% Assets" },
  { path: "attached_assets/Commodities_Holding_-_vr_commodity_holdings_REGULAR.csv_1781164821045.csv", holdingTypeCol: null, companyCol: "Company Name", weightCol: "% Assets" },
  { path: "attached_assets/Debt_holding_-_main_1781164821043.csv", holdingTypeCol: null, companyCol: "Company", weightCol: "% Assets" },
];

// ── Fund name normalization helpers ────────────────────────────────────────
function normalizeFundName(name: string): string {
  return name
    .toLowerCase()
    // Remove parenthetical content entirely (e.g., "(Erstwhile ...)", "(Regular Plan)")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(regular|reg|direct|dir|growth|dividend|plan|g|option|of|the|and|for|in)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    // Remove trailing dashes left after removing parenthetical content
    .replace(/\s+-+$/g, "")
    .trim();
}

function getFundWords(name: string): string[] {
  const raw = normalizeFundName(name)
    .split(/\s+/)
    .filter(w => w.length > 1);
  // Expand compound words: midcap → mid, cap, midcap; largecap → large, cap, largecap
  const expanded: string[] = [];
  for (const w of raw) {
    expanded.push(w);
    if (w.includes("midcap")) { expanded.push("mid", "cap"); }
    if (w.includes("smallcap")) { expanded.push("small", "cap"); }
    if (w.includes("largecap")) { expanded.push("large", "cap"); }
    if (w.includes("flexicap")) { expanded.push("flexi", "cap"); }
    if (w.includes("mid-cap")) { expanded.push("mid", "cap"); }
    if (w.includes("small-cap")) { expanded.push("small", "cap"); }
    if (w.includes("large-cap")) { expanded.push("large", "cap"); }
    if (w.includes("flexi-cap")) { expanded.push("flexi", "cap"); }
    if (w.includes("large&midcap")) { expanded.push("large", "mid", "cap"); }
    if (w.includes("large&midcap")) { expanded.push("large", "mid", "cap"); }
    if (w.includes("large & midcap")) { expanded.push("large", "mid", "cap"); }
    if (w.includes("largecap")) { expanded.push("large", "cap"); }
    if (w.includes("multicap")) { expanded.push("multi", "cap"); }
  }
  return [...new Set(expanded)];
}

function wordOverlapScore(wordsA: string[], wordsB: string[]): number {
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let common = 0;
  for (const w of Array.from(setA)) {
    if (setB.has(w)) common++;
  }
  return common / Math.max(setA.size, setB.size);
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bltd\.?\b/gi, "")
    .replace(/\blimited\b/gi, "")
    .replace(/\bcorporation\b/gi, "")
    .replace(/\bcompany\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Simple CSV line parser (handles quoted fields) ─────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Load holdings from CSV files ───────────────────────────────────────────
export function loadHoldings(): Map<string, FundHoldings> {
  if (holdingsMap) return holdingsMap;

  const map = new Map<string, FundHoldings>();
  const seenFundNames = new Set<string>();

  for (const cfg of CSV_FILES) {
    const fullPath = path.join(process.cwd(), cfg.path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[Overlap] CSV not found: ${fullPath}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) continue;

    const header = parseCSVLine(lines[0]);
    const fundNameIdx = header.indexOf("Fund Name");
    const isinIdx = header.indexOf("ISIN");
    const companyIdx = header.indexOf(cfg.companyCol);
    const weightIdx = header.indexOf(cfg.weightCol);
    const typeIdx = cfg.holdingTypeCol ? header.indexOf(cfg.holdingTypeCol) : -1;

    if (fundNameIdx === -1 || companyIdx === -1 || weightIdx === -1) {
      console.warn(`[Overlap] Missing required columns in ${cfg.path}: header=${header.join(",")}`);
      continue;
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);
      if (cols.length < Math.max(fundNameIdx, companyIdx, weightIdx) + 1) continue;

      // Skip non-equity rows if holding type column exists
      if (typeIdx >= 0) {
        const holdingType = (cols[typeIdx] || "").toLowerCase().trim();
        if (holdingType !== "equity") continue;
      }

      const fundName = cols[fundNameIdx].trim();
      const isin = isinIdx >= 0 ? cols[isinIdx].trim() : "";
      const company = cols[companyIdx].trim();
      const weightStr = cols[weightIdx].trim();
      const weight = parseFloat(weightStr);

      if (!fundName || !company || isNaN(weight) || weight <= 0) continue;
      if (company === "--" || company === "N/A") continue;

      // Normalize fund name for key
      const normKey = normalizeFundName(fundName);
      const normCompany = normalizeCompanyName(company);

      if (!map.has(normKey)) {
        map.set(normKey, { fundName, isin, stocks: [] });
      }

      const entry = map.get(normKey)!;
      // Avoid duplicate companies within same fund
      if (!entry.stocks.some(s => s.company === normCompany)) {
        entry.stocks.push({ company: normCompany, weight });
      }
    }
  }

  console.log(`[Overlap] Loaded ${map.size} funds with equity holdings from ${CSV_FILES.length} CSV files`);
  holdingsMap = map;
  return map;
}

// ── Match a CAS scheme name to a CSV fund name ───────────────────────────────
function findBestMatch(schemeName: string, holdings: Map<string, FundHoldings>): { key: string; score: number } | null {
  const normScheme = normalizeFundName(schemeName);

  // Direct match
  if (holdings.has(normScheme)) {
    return { key: normScheme, score: 1 };
  }

  const schemeWords = getFundWords(schemeName);
  if (schemeWords.length === 0) return null;

  let bestKey: string | null = null;
  let bestScore = 0;

  for (const [key, data] of Array.from(holdings.entries())) {
    // Word overlap scoring
    const keyWords = key.split(/\s+/).filter(w => w.length > 1);
    const origWords = getFundWords(data.fundName);

    const keyScore = wordOverlapScore(schemeWords, keyWords);
    const origScore = wordOverlapScore(schemeWords, origWords);
    const score = Math.max(keyScore, origScore);

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  // Threshold: need at least 50% word overlap
  if (bestScore < 0.5) return null;
  return bestKey ? { key: bestKey, score: bestScore } : null;
}

// ── Compute overlap between two funds ───────────────────────────────────────
function computePairOverlap(fundA: FundHoldings, fundB: FundHoldings): FundPairOverlap {
  const common: Map<string, { weightA: number; weightB: number }> = new Map();

  for (const stockA of fundA.stocks) {
    const matchB = fundB.stocks.find(s => s.company === stockA.company);
    if (matchB) {
      common.set(stockA.company, { weightA: stockA.weight, weightB: matchB.weight });
    }
  }

  // Overlap score: sum of min(weights) / min(total equity weight of each fund) * 100
  const totalA = fundA.stocks.reduce((sum, s) => sum + s.weight, 0);
  const totalB = fundB.stocks.reduce((sum, s) => sum + s.weight, 0);
  let overlapSum = 0;
  const highConc: { company: string; weightA: number; weightB: number }[] = [];
  const modConc: { company: string; weightA: number; weightB: number }[] = [];

  for (const [company, weights] of Array.from(common.entries())) {
    const minW = Math.min(weights.weightA, weights.weightB);
    overlapSum += minW;

    // Concentration within the pair: sum of weights in both funds
    const pairSum = weights.weightA + weights.weightB;
    if (pairSum >= 10) {
      highConc.push({ company, weightA: weights.weightA, weightB: weights.weightB });
    } else if (pairSum >= 5) {
      modConc.push({ company, weightA: weights.weightA, weightB: weights.weightB });
    }
  }

  // Sort by total pair weight descending
  highConc.sort((a, b) => (b.weightA + b.weightB) - (a.weightA + a.weightB));
  modConc.sort((a, b) => (b.weightA + b.weightB) - (a.weightA + a.weightB));

  const minTotal = Math.min(totalA, totalB);
  const overlapScore = minTotal > 0 ? (overlapSum / minTotal) * 100 : 0;

  return {
    fundA: fundA.fundName,
    fundB: fundB.fundName,
    overlapScore: Math.round(overlapScore * 100) / 100,
    commonHoldings: common.size,
    highConcentration: highConc,
    moderateConcentration: modConc,
  };
}

// ── Main analysis function ─────────────────────────────────────────────────
export function analyzeOverlap(mfSnapshot: any[]): OverlapAnalysisResult {
  const holdings = loadHoldings();

  const matchedFunds: { schemeName: string; holdings: FundHoldings }[] = [];
  const unmatched: string[] = [];

  for (const mf of mfSnapshot) {
    const schemeName = (mf.scheme_name || "").trim();
    if (!schemeName) continue;

    const match = findBestMatch(schemeName, holdings);
    if (match) {
      const data = holdings.get(match.key)!;
      matchedFunds.push({ schemeName, holdings: data });
    } else {
      unmatched.push(schemeName);
    }
  }

  // Deduplicate matched funds by holdings key (same CSV fund might match multiple CAS schemes)
  const uniqueMatches = new Map<string, { schemeName: string; holdings: FundHoldings }>();
  for (const m of matchedFunds) {
    const key = normalizeFundName(m.holdings.fundName);
    if (!uniqueMatches.has(key)) {
      uniqueMatches.set(key, m);
    }
  }
  const uniqueMatched = Array.from(uniqueMatches.values());

  const analyzedFundNames = uniqueMatched.map(m => m.holdings.fundName);

  if (uniqueMatched.length < 2) {
    return {
      diversificationScore: "Good",
      averageOverlap: 0,
      highConcentrationStocks: 0,
      similarPairs: [],
      stockConcentration: [],
      redFlags: uniqueMatched.length === 0
        ? [{ type: "general", message: "No fund holdings data available for overlap analysis.", severity: "moderate" }]
        : [{ type: "general", message: "Only one fund matched for overlap analysis. Need at least 2 funds.", severity: "moderate" }],
      analyzedFunds: analyzedFundNames,
      unmatchedFunds: unmatched,
    };
  }

  // Generate all pairs
  const pairs: FundPairOverlap[] = [];
  for (let i = 0; i < uniqueMatched.length; i++) {
    for (let j = i + 1; j < uniqueMatched.length; j++) {
      const overlap = computePairOverlap(uniqueMatched[i].holdings, uniqueMatched[j].holdings);
      pairs.push(overlap);
    }
  }

  // Sort by overlap score descending
  pairs.sort((a, b) => b.overlapScore - a.overlapScore);

  // Calculate average overlap
  const avgOverlap = pairs.length > 0
    ? pairs.reduce((sum, p) => sum + p.overlapScore, 0) / pairs.length
    : 0;

  // Calculate stock concentration across all funds
  const stockTotals: Map<string, { total: number; funds: { fund: string; weight: number }[] }> = new Map();
  for (const m of uniqueMatched) {
    for (const stock of m.holdings.stocks) {
      if (!stockTotals.has(stock.company)) {
        stockTotals.set(stock.company, { total: 0, funds: [] });
      }
      const entry = stockTotals.get(stock.company)!;
      entry.total += stock.weight;
      entry.funds.push({ fund: m.holdings.fundName, weight: stock.weight });
    }
  }

  const stockConcentration: StockConcentration[] = [];
  for (const [company, data] of Array.from(stockTotals.entries())) {
    stockConcentration.push({
      company,
      totalExposure: Math.round(data.total * 100) / 100,
      fundCount: data.funds.length,
      fundWeights: data.funds,
    });
  }

  // Sort by total exposure descending
  stockConcentration.sort((a, b) => b.totalExposure - a.totalExposure);

  const highConcStocks = stockConcentration.filter(s => s.totalExposure > 10);

  // Build red flags
  const redFlags: RedFlag[] = [];

  // Top 3 overlapping pairs
  const topPairs = pairs.slice(0, 3).filter(p => p.overlapScore > 15);
  for (const p of topPairs) {
    redFlags.push({
      type: "pair_overlap",
      message: `${p.fundA} and ${p.fundB} are ${p.overlapScore >= 30 ? "highly" : "moderately"} overlapping (${p.overlapScore.toFixed(0)}% overlap, ${p.commonHoldings} common stocks).`,
      severity: p.overlapScore >= 30 ? "high" : "moderate",
    });
  }

  // Stock concentration red flags
  for (const stock of highConcStocks.slice(0, 3)) {
    redFlags.push({
      type: "stock_concentration",
      message: `${stock.company} exposure across ${stock.fundCount} selected funds is ${stock.totalExposure.toFixed(1)}%.`,
      severity: stock.totalExposure > 15 ? "high" : "moderate",
    });
  }

  // General recommendation if any high overlap
  if (pairs.length > 0 && pairs[0].overlapScore > 30) {
    redFlags.push({
      type: "general",
      message: "Consider replacing one of the highly overlapping funds to improve diversification.",
      severity: "high",
    });
  }

  // Diversification score
  let overlapScoreLabel: "Good" | "Moderate" | "Poor";
  if (avgOverlap < 15) overlapScoreLabel = "Good";
  else if (avgOverlap <= 30) overlapScoreLabel = "Moderate";
  else overlapScoreLabel = "Poor";

  let concentrationScoreLabel: "Good" | "Moderate" | "Poor";
  if (highConcStocks.length === 0) concentrationScoreLabel = "Good";
  else if (highConcStocks.length <= 3) concentrationScoreLabel = "Moderate";
  else concentrationScoreLabel = "Poor";

  // Overall score = worse of the two
  const scoreOrder = { Good: 1, Moderate: 2, Poor: 3 };
  const diversificationScore = scoreOrder[overlapScoreLabel] >= scoreOrder[concentrationScoreLabel]
    ? overlapScoreLabel
    : concentrationScoreLabel;

  return {
    diversificationScore,
    averageOverlap: Math.round(avgOverlap * 100) / 100,
    highConcentrationStocks: highConcStocks.length,
    similarPairs: pairs.slice(0, 10), // Top 10
    stockConcentration: stockConcentration.slice(0, 15), // Top 15
    redFlags,
    analyzedFunds: analyzedFundNames,
    unmatchedFunds: unmatched,
  };
}
