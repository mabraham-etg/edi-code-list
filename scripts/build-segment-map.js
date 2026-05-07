/**
 * Parses STD files from XPATHForge to build a segment-position-to-element-ID mapping.
 * Outputs JSON files: x12_segment_map.json and edifact_segment_map.json
 * 
 * Format: { "N101": "98", "UNH0201": "0065", ... }
 */

const fs = require("fs");
const path = require("path");

const XPATHFORGE_STATIC = path.join(
  __dirname,
  "..",
  "..",
  "XPATHForge",
  "Static"
);
const OUTPUT_DIR = path.join(__dirname, "..", "src", "data");

function parseSections(content, sectionName) {
  const defs = {};
  const lines = content.split(/\r?\n/);
  let inSection = false;

  for (const line of lines) {
    if (line.trim() === sectionName) {
      inSection = true;
      continue;
    }
    if (inSection && /^\.[A-Z]/.test(line)) {
      inSection = false;
      continue;
    }
    if (!inSection) continue;

    const match = line.match(/^([A-Z0-9]+)=(.+)$/);
    if (!match) continue;
    const [, name, body] = match;
    const elements = [];
    const re = /\[([A-Z0-9]+)(?:,[MC])?(?:,,\d+)?\]/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      elements.push(m[1]);
    }
    defs[name] = elements;
  }
  return defs;
}

function parseSegSection(content) {
  return parseSections(content, ".SEGS");
}

function parseComsSection(content) {
  return parseSections(content, ".COMS");
}

function isComposite(id) {
  // EDIFACT composites start with C or S followed by digits
  return /^[CS]\d+$/.test(id);
}

function buildSegmentMap(segDefs, comsDefs, isX12) {
  const map = {};

  for (const [segName, elements] of Object.entries(segDefs)) {
    for (let i = 0; i < elements.length; i++) {
      const elemOrComp = elements[i];
      const posStr = String(i + 1).padStart(2, "0");

      if (!isX12 && isComposite(elemOrComp)) {
        // It's a composite - resolve its children
        const compDef = comsDefs[elemOrComp];
        if (compDef) {
          for (let j = 0; j < compDef.length; j++) {
            const childElem = compDef[j];
            const childPos = String(j + 1).padStart(2, "0");
            const key = `${segName}${posStr}${childPos}`;
            map[key] = childElem;
          }
        }
        // Also map the composite position itself to its first element (common usage)
        const compKey = `${segName}${posStr}`;
        if (compDef && compDef.length > 0) {
          map[compKey] = elemOrComp; // maps to composite ID
        }
      } else {
        // Direct element reference
        const key = `${segName}${posStr}`;
        map[key] = elemOrComp;
      }
    }
  }

  return map;
}

function processEdifact() {
  const edifactDir = path.join(XPATHFORGE_STATIC, "EDIFACT");
  if (!fs.existsSync(edifactDir)) {
    console.error("EDIFACT directory not found:", edifactDir);
    return;
  }

  const combinedMap = {};
  const files = fs.readdirSync(edifactDir).filter(f => f.endsWith(".std") && !f.includes("V4"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(edifactDir, file), "utf-8");
    const segDefs = parseSegSection(content);
    const comsDefs = parseComsSection(content);
    const map = buildSegmentMap(segDefs, comsDefs, false);

    // Merge - first version wins (they should be consistent)
    for (const [key, value] of Object.entries(map)) {
      if (!combinedMap[key]) {
        combinedMap[key] = value;
      }
    }
  }

  const outputPath = path.join(OUTPUT_DIR, "edifact_segment_map.json");
  fs.writeFileSync(outputPath, JSON.stringify(combinedMap, null, 2));
  console.log(`EDIFACT: ${Object.keys(combinedMap).length} mappings written to ${outputPath}`);
}

function processX12() {
  const x12Dir = path.join(XPATHFORGE_STATIC, "X12");
  if (!fs.existsSync(x12Dir)) {
    console.error("X12 directory not found:", x12Dir);
    return;
  }

  const combinedMap = {};
  const files = fs.readdirSync(x12Dir).filter(f => f.toLowerCase().endsWith(".std"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(x12Dir, file), "utf-8");
    const segDefs = parseSegSection(content);
    const comsDefs = parseComsSection(content);
    const map = buildSegmentMap(segDefs, comsDefs, true);

    for (const [key, value] of Object.entries(map)) {
      if (!combinedMap[key]) {
        combinedMap[key] = value;
      }
    }
  }

  const outputPath = path.join(OUTPUT_DIR, "x12_segment_map.json");
  fs.writeFileSync(outputPath, JSON.stringify(combinedMap, null, 2));
  console.log(`X12: ${Object.keys(combinedMap).length} mappings written to ${outputPath}`);
}

processEdifact();
processX12();
console.log("Done!");
