/**
 * Builds version-specific code lists from XPATHForge STD files.
 * Outputs:
 *   src/data/x12_version_codes.json
 *   src/data/edifact_version_codes.json
 *   docs/x12-version-codes.json   (copy for GitHub Pages)
 *   docs/edifact-version-codes.json
 *
 * Format: { "4010": { "355": "01,02,03,..." }, ... }
 * Codes stored as comma-separated strings for compact size.
 */

const fs = require("fs");
const path = require("path");

const XPATHFORGE_STATIC = path.join(__dirname, "..", "..", "XPATHForge", "Static");
const DATA_DIR = path.join(__dirname, "..", "src", "data");
const DOCS_DIR = path.join(__dirname, "..", "docs");

function parseCodesSection(content) {
  const lines = content.split(/\r?\n/);
  let inSection = false;
  const codes = {};
  for (const line of lines) {
    if (line.trim() === ".CODES") { inSection = true; continue; }
    if (inSection && /^\.[A-Z]/.test(line.trim())) break;
    if (!inSection) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    // Store as comma-separated string (compact)
    codes[line.substring(0, eq)] = line.substring(eq + 1).trim();
  }
  return codes;
}

function processX12() {
  const x12Dir = path.join(XPATHFORGE_STATIC, "X12");
  if (!fs.existsSync(x12Dir)) {
    console.error("X12 directory not found:", x12Dir);
    return;
  }

  // Only use major (X0) releases
  const allFiles = fs.readdirSync(x12Dir).filter(f => /^X12-\d+\.std$/i.test(f));
  const majorFiles = allFiles
    .filter(f => { const m = f.match(/X12-(\d+)\.std/i); return m && m[1].endsWith("0"); })
    .sort();

  const result = {};
  for (const f of majorFiles) {
    const ver = f.match(/X12-(\d+)\.std/i)[1];
    const content = fs.readFileSync(path.join(x12Dir, f), "utf-8");
    result[ver] = parseCodesSection(content);
    console.log(`  X12 ${ver}: ${Object.keys(result[ver]).length} elements with codes`);
  }

  const json = JSON.stringify(result);
  fs.writeFileSync(path.join(DATA_DIR, "x12_version_codes.json"), json);
  fs.writeFileSync(path.join(DOCS_DIR, "x12-version-codes.json"), json);
  console.log(`X12 version codes: ${Object.keys(result).length} versions, ${Math.round(json.length / 1024)} KB`);
}

function processEDIFACT() {
  const edifactDir = path.join(XPATHFORGE_STATIC, "EDIFACT");
  if (!fs.existsSync(edifactDir)) {
    console.error("EDIFACT directory not found:", edifactDir);
    return;
  }

  const files = fs.readdirSync(edifactDir)
    .filter(f => f.toLowerCase().endsWith(".std") && !f.includes("V4"))
    .sort();

  const result = {};
  for (const f of files) {
    const ver = f.replace(/\.std$/i, "").toUpperCase();
    const content = fs.readFileSync(path.join(edifactDir, f), "utf-8");
    result[ver] = parseCodesSection(content);
  }

  const json = JSON.stringify(result);
  fs.writeFileSync(path.join(DATA_DIR, "edifact_version_codes.json"), json);
  fs.writeFileSync(path.join(DOCS_DIR, "edifact-version-codes.json"), json);
  console.log(`EDIFACT version codes: ${Object.keys(result).length} versions, ${Math.round(json.length / 1024)} KB`);
}

processX12();
processEDIFACT();
console.log("Done!");
