/*
 * Builds a compact JSON lookup from the Stock_Rating_Engine CSV.
 * Keyed by ISIN (primary) and NSE_Symbol (secondary) for flexible matching.
 *
 * Usage:
 *   node scripts/build-stock-rating-v3-lookup.cjs <path-to-csv>
 *
 * Re-run this whenever a new/updated CSV is provided — it will overwrite
 * server/data/stock-rating-v3-lookup.json.
 */
const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/build-stock-rating-v3-lookup.cjs <path-to-csv>");
  process.exit(1);
}

const outputPath = path.join(process.cwd(), "server", "data", "stock-rating-v3-lookup.json");

function parseCsvRow(row) {
  const cols = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  cols.push(cur.trim());
  return cols;
}

function toNum(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(/[,%]/g, ""));
  return isNaN(n) ? null : n;
}

const content = fs.readFileSync(inputPath, "utf-8");
const lines = content.split("\n").filter(l => l.trim().length > 0);
const headers = parseCsvRow(lines[0]);

// Column indices
const C = {};
headers.forEach((h, i) => { C[h.trim()] = i; });

// Support both old (NSE_Symbol / v3_Final_Score / v3_Final_Rating) and
// new (Symbol / Final_Stock_Score / Final_Rating) column naming conventions.
const symbolCol      = C["Symbol"]          ?? C["NSE_Symbol"];
const scoreCol       = C["Final_Stock_Score"] ?? C["v3_Final_Score"];
const ratingCol      = C["Final_Rating"]    ?? C["v3_Final_Rating"];

const required = [
  ["ISIN",  C["ISIN"]],
  ["Symbol/NSE_Symbol", symbolCol],
  ["Final_Stock_Score/v3_Final_Score", scoreCol],
  ["Final_Rating/v3_Final_Rating", ratingCol],
];
for (const [label, idx] of required) {
  if (idx === undefined) {
    console.error(`Column "${label}" not found in CSV. Available: ${headers.join(", ")}`);
    process.exit(1);
  }
}

const byIsin = {};
const bySymbol = {};
let total = 0;
let withRating = 0;

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvRow(lines[i]);
  if (row.length < 5) continue;

  const isin      = (row[C["ISIN"]] || "").trim();
  const nseSymbol = (row[symbolCol] || "").trim();
  const bseCode   = (row[C["BSE_Code"]] || "").trim();
  const stockName = (row[C["Stock_Name"]] || "").trim();

  const v3Score  = toNum(row[scoreCol]);
  const v3Rating = (row[ratingCol] || "").trim();

  if (!isin && !nseSymbol) continue;
  total++;

  const entry = {
    name: stockName,
    isin: isin || null,
    nseSymbol: nseSymbol || null,
    bseCode: bseCode || null,
    v3Score,
    v3Rating: v3Rating || null,
    fundamentals: {
      marketCapCr:     toNum(row[C["Market_Cap(crores)"]]),
      roce:            toNum(row[C["ROCE"]]),
      roe:             toNum(row[C["ROE"]]),
      debtToEquity:    toNum(row[C["Debt_Equity"]]),
      pe:              toNum(row[C["PE"]]),
      industryPe:      toNum(row[C["Industry_PE"]]),
      pb:              toNum(row[C["PB"]]),
      evEbitda:        toNum(row[C["EV_EBITDA"]] !== undefined ? row[C["EV_EBITDA"]] : null),
      opMarginTtm:     toNum(row[C["Operating_Margin"]]),
      divYield:        toNum(row[C["Dividend_Yield"]]),
      revenueGrowth5y: toNum(row[C["Revenue_Growth_5Y"]]),
      profitGrowth5y:  toNum(row[C["Profit_Growth_5Y"]]),
      epsGrowth:       toNum(row[C["EPS_Growth"]]),
      return1y:        toNum(row[C["Return_1Y"]]),
      return3y:        toNum(row[C["Return_3Y"]]),
      promoterHolding: toNum(row[C["Promoter_Holding"]]),
    },
  };

  if (v3Rating) withRating++;

  if (isin) byIsin[isin] = entry;
  if (nseSymbol) bySymbol[nseSymbol.toUpperCase()] = entry;
}

const output = { byIsin, bySymbol };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output));

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`Done: ${total} stocks, ${withRating} with v3 rating → ${outputPath} (${sizeKb} KB)`);
console.log(`ISIN keys: ${Object.keys(byIsin).length}, NSE_Symbol keys: ${Object.keys(bySymbol).length}`);
