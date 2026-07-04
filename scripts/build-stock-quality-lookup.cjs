/*
 * Preprocesses the Stock Rating Engine master workbook (Sheet1) into a compact
 * JSON lookup keyed by normalized stock name, used by /api/stock-quality-lookup.
 *
 * Usage:
 *   node scripts/build-stock-quality-lookup.cjs <path-to-xlsx>
 *
 * Re-run this whenever a new/updated master sheet is provided — it will
 * overwrite server/data/stock-quality-lookup.json.
 */
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/build-stock-quality-lookup.cjs <path-to-xlsx>");
  process.exit(1);
}

const outputPath = path.join(process.cwd(), "server", "data", "stock-quality-lookup.json");

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\bltd\b/g, "limited")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(/[,%]/g, ""));
  return isNaN(n) ? null : n;
}

function toCr(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(/[,]/g, "").replace(/cr/i, "").trim());
  return isNaN(n) ? null : n;
}

const wb = xlsx.readFile(inputPath);
const sheet = wb.Sheets["Sheet1"];
if (!sheet) {
  console.error('Sheet named "Sheet1" not found in workbook.');
  process.exit(1);
}
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
const headers = rows[0];
const col = (letter) => xlsx.utils.decode_col(letter);

const IDX = {
  name: col("D"),
  nseSymbol: col("B"),
  marketCap: col("W"),
  roce: col("AA"),
  roe: col("Z"),
  debtToEquity: col("AG"),
  pe: col("AB"),
  pb: col("AC"),
  evEbitda: col("AE"),
  divYield: col("AF"),
  industryPe: col("AD"),
  opMarginTtm: col("BH"),
  revenueGrowth5y: col("BO"),
  profitGrowth5y: col("BR"),
  epsGrowth5y: col("BU"),
  bookValueGrowth5y: col("BX"),
  return1y: col("AR"),
  return3y: col("AS"),
  promoterCurrent: col("CC"),
  promoterForeign: col("CD"),
  finalScore: col("FV"),
  grade: col("FW"),
  remark: col("GB"),
};

const lookup = {};
let matched = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const name = row[IDX.name];
  if (!name) continue;
  const key = normalizeName(name);
  if (!key) continue;

  const finalScore = toNum(row[IDX.finalScore]);
  const grade = String(row[IDX.grade] || "").split("(")[0].trim() || null;
  const remark = String(row[IDX.remark] || "").trim() || null;

  // Skip rows with no scoring data at all
  if (finalScore === null && !grade && !remark) continue;

  const promoterCurrent = toNum(row[IDX.promoterCurrent]);
  const promoterForeign = toNum(row[IDX.promoterForeign]);
  const promoterHolding =
    promoterCurrent !== null || promoterForeign !== null
      ? (promoterCurrent || 0) + (promoterForeign || 0)
      : null;

  const entry = {
    name: String(name).trim(),
    nseSymbol: String(row[IDX.nseSymbol] || "").trim() || null,
    finalScore,
    grade,
    remark,
    fundamentals: {
      roce: toNum(row[IDX.roce]),
      roe: toNum(row[IDX.roe]),
      debtToEquity: toNum(row[IDX.debtToEquity]),
      pe: toNum(row[IDX.pe]),
      industryPe: toNum(row[IDX.industryPe]),
      revenueGrowth5y: toNum(row[IDX.revenueGrowth5y]),
      promoterHolding,
      marketCapCr: toCr(row[IDX.marketCap]),
      pb: toNum(row[IDX.pb]),
      evEbitda: toNum(row[IDX.evEbitda]),
      divYield: toNum(row[IDX.divYield]),
      opMarginTtm: toNum(row[IDX.opMarginTtm]),
      profitGrowth5y: toNum(row[IDX.profitGrowth5y]),
      epsGrowth5y: toNum(row[IDX.epsGrowth5y]),
      bookValueGrowth5y: toNum(row[IDX.bookValueGrowth5y]),
      return1y: toNum(row[IDX.return1y]),
      return3y: toNum(row[IDX.return3y]),
    },
  };

  // Keep the entry with the most complete data if there are duplicates
  const existing = lookup[key];
  if (!existing || (finalScore !== null && existing.finalScore === null)) {
    lookup[key] = entry;
    matched++;
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(lookup));

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`Wrote ${Object.keys(lookup).length} stock entries (${matched} scored) to ${outputPath} (${sizeKb} KB)`);
