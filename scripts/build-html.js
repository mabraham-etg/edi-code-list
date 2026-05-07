#!/usr/bin/env node
/**
 * Build a standalone HTML version of the EDI Code List app.
 * Run: node scripts/build-html.js
 * Output: dist/index.html (single file, no dependencies)
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "data");
const OUT_DIR = path.join(__dirname, "..", "docs");

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
}

function buildElementNameMap(data) {
  const map = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "metadata") continue;
    if (value && typeof value === "object" && value.elements) {
      for (const [elemId, elemName] of Object.entries(value.elements)) {
        if (!map[elemId]) map[elemId] = elemName;
      }
    }
  }
  return map;
}

function buildVersionMap(data) {
  const map = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "metadata") continue;
    if (value && typeof value === "object" && value.elements) {
      map[key] = Object.keys(value.elements);
    }
  }
  return map;
}

// Load and pre-process data
console.log("Loading data files...");
const x12Codes = loadJson("x12_code_descriptions.json").codes;
const edifactCodes = loadJson("edifact_code_descriptions.json").codes;
const x12DescData = loadJson("x12_descriptions.json");
const edifactDescData = loadJson("edifact_descriptions.json");
const x12ElementNames = buildElementNameMap(x12DescData);
const edifactElementNames = buildElementNameMap(edifactDescData);
const x12VersionMap = buildVersionMap(x12DescData);
const edifactVersionMap = buildVersionMap(edifactDescData);
const x12SegmentMap = loadJson("x12_segment_map.json");
const edifactSegmentMap = loadJson("edifact_segment_map.json");

console.log(`X12: ${Object.keys(x12Codes).length} elements, ${Object.keys(x12ElementNames).length} names`);
console.log(`EDIFACT: ${Object.keys(edifactCodes).length} elements, ${Object.keys(edifactElementNames).length} names`);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EDI Code List</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; }
main { max-width: 64rem; margin: 0 auto; padding: 2rem 1rem; }
.header { text-align: center; margin-bottom: 2rem; }
.header h1 { font-size: 2.25rem; font-weight: 700; letter-spacing: -0.025em; color: #0f172a; }
.header p { margin-top: 0.5rem; font-size: 0.95rem; color: #475569; }
.card { background: #fff; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid rgba(226,232,240,0.6); }
.toggle-row { display: flex; justify-content: center; gap: 0.75rem; margin-bottom: 1.25rem; }
.toggle-btn { border: none; border-radius: 0.75rem; padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.toggle-btn.active-x12 { background: #2563eb; color: #fff; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.25); }
.toggle-btn.active-edifact { background: #059669; color: #fff; box-shadow: 0 4px 6px -1px rgba(5,150,105,0.25); }
.toggle-btn.inactive { background: #f1f5f9; color: #475569; }
.toggle-btn.inactive:hover { background: #e2e8f0; }
.inputs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
@media (max-width: 640px) { .inputs { grid-template-columns: 1fr; } }
.input-group label { display: block; margin-bottom: 0.25rem; font-size: 0.75rem; font-weight: 500; color: #334155; }
.input-group input { width: 100%; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0.5rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; color: #0f172a; transition: border-color 0.15s, box-shadow 0.15s; outline: none; }
.input-group input::placeholder { color: #94a3b8; }
.input-group input:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(191,219,254,0.5); }
.results { margin-top: 1.5rem; }
.summary { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.75rem; color: #334155; margin-bottom: 1rem; }
.badge { display: inline-flex; align-items: center; border-radius: 9999px; padding: 0.125rem 0.625rem; font-size: 0.75rem; font-weight: 500; }
.badge-x12 { background: #eff6ff; color: #1d4ed8; }
.badge-edifact { background: #ecfdf5; color: #047857; }
.result-card { background: #fff; border-radius: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid rgba(226,232,240,0.6); overflow: hidden; margin-bottom: 1rem; }
.result-header { border-bottom: 1px solid #f1f5f9; background: rgba(248,250,252,0.5); padding: 0.75rem 1.25rem; display: flex; align-items: baseline; gap: 0.5rem; }
.elem-badge { display: inline-flex; align-items: center; border-radius: 0.375rem; padding: 0.125rem 0.5rem; font-size: 0.75rem; font-weight: 700; }
.elem-badge-x12 { background: #dbeafe; color: #1d4ed8; }
.elem-badge-edifact { background: #d1fae5; color: #047857; }
.elem-name { font-size: 0.875rem; font-weight: 500; color: #0f172a; }
.elem-count { margin-left: auto; font-size: 0.75rem; color: #475569; }
.table-wrap { overflow-y: auto; }
table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
thead { position: sticky; top: 0; background: #fff; }
thead th { padding: 0.5rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; }
tbody tr { border-bottom: 1px solid #f8fafc; }
tbody tr:hover { background: rgba(248,250,252,0.7); }
td { padding: 0.5rem 1.25rem; }
td:first-child { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.75rem; font-weight: 500; width: 7rem; color: #0f172a; }
td:last-child { color: #1e293b; }
.empty-state { text-align: center; padding: 2rem; }
.empty-state .icon-circle { width: 3rem; height: 3rem; border-radius: 50%; margin: 0 auto 0.75rem; display: flex; align-items: center; justify-content: center; }
.empty-state .icon-circle.blue { background: #eff6ff; }
.empty-state .icon-circle.gray { background: #f1f5f9; }
.empty-state .title { font-size: 0.875rem; font-weight: 500; color: #334155; }
.empty-state .sub { font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; }
.spinner { display: flex; align-items: center; justify-content: center; padding: 3rem; }
.spinner .dot { width: 1.5rem; height: 1.5rem; border: 2px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.spinner span { margin-left: 0.75rem; font-size: 0.875rem; color: #334155; }
.no-codes { padding: 1rem 1.25rem; text-align: center; font-size: 0.75rem; color: #94a3b8; }
.version-row { margin-top: 1rem; }
.version-select-wrap { max-width: 20rem; }
.optional-label { font-weight: 400; color: #94a3b8; margin-left: 0.25rem; font-size: 0.7rem; }
.input-group select { width: 100%; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0.5rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; color: #0f172a; transition: border-color 0.15s, box-shadow 0.15s; outline: none; cursor: pointer; appearance: auto; }
.input-group select:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(191,219,254,0.5); }
</style>
</head>
<body>
<main>
  <div class="header">
    <h1>Code List</h1>
    <p>EDI Code List Lookup &mdash; X12 &amp; EDIFACT</p>
  </div>
  <div class="card">
    <div class="toggle-row">
      <button id="btn-x12" class="toggle-btn active-x12" onclick="setStandard('X12')">X12</button>
      <button id="btn-edifact" class="toggle-btn inactive" onclick="setStandard('EDIFACT')">EDIFACT</button>
    </div>
    <div class="inputs">
      <div class="input-group">
        <label>Element ID</label>
        <input id="inp-elemId" type="text" placeholder="e.g. 98, 66" oninput="onInput()">
      </div>
      <div class="input-group">
        <label>Element Name</label>
        <input id="inp-elemName" type="text" placeholder="e.g. N101, Entity Identifier" oninput="onInput()">
      </div>
      <div class="input-group">
        <label>Search in Results</label>
        <input id="inp-search" type="text" placeholder="Filter code or description..." oninput="onInput()">
      </div>
    </div>
    <div class="version-row">
      <div class="input-group version-select-wrap">
        <label>EDI Version <span class="optional-label">optional</span></label>
        <select id="inp-version" onchange="onInput()">
          <option value="">All versions</option>
        </select>
      </div>
    </div>
  </div>
  <div id="results" class="results"></div>
</main>

<script>
// ---- Embedded Data ----
const DATA = {
  X12: {
    codes: ${JSON.stringify(x12Codes)},
    names: ${JSON.stringify(x12ElementNames)},
    segMap: ${JSON.stringify(x12SegmentMap)},
    versions: ${JSON.stringify(x12VersionMap)}
  },
  EDIFACT: {
    codes: ${JSON.stringify(edifactCodes)},
    names: ${JSON.stringify(edifactElementNames)},
    segMap: ${JSON.stringify(edifactSegmentMap)},
    versions: ${JSON.stringify(edifactVersionMap)}
  }
};

// ---- State ----
let currentStandard = "X12";
let debounceTimer = null;

// ---- UI Helpers ----
function setStandard(std) {
  currentStandard = std;
  const btnX12 = document.getElementById("btn-x12");
  const btnEdifact = document.getElementById("btn-edifact");
  const inpElemId = document.getElementById("inp-elemId");
  const inpElemName = document.getElementById("inp-elemName");
  const inpSearch = document.getElementById("inp-search");

  inpElemId.value = "";
  inpElemName.value = "";
  inpSearch.value = "";

  // Populate version dropdown for the selected standard
  const selVersion = document.getElementById("inp-version");
  selVersion.value = "";
  const versions = Object.keys(DATA[std].versions);
  selVersion.innerHTML = '<option value="">All versions</option>' +
    versions.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');

    btnX12.className = "toggle-btn active-x12";
    btnEdifact.className = "toggle-btn inactive";
    inpElemId.placeholder = "e.g. 98, 66";
    inpElemName.placeholder = "e.g. N101, Entity Identifier";
  } else {
    btnX12.className = "toggle-btn inactive";
    btnEdifact.className = "toggle-btn active-edifact";
    inpElemId.placeholder = "e.g. 0065, 1001";
    inpElemName.placeholder = "e.g. UNH0201, Message Type";
  }
  doSearch();
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 200);
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ---- Search Logic (mirrors codelist-adapter.ts) ----
function doSearch() {
  const elemIdVal = document.getElementById("inp-elemId").value.trim();
  const elemNameVal = document.getElementById("inp-elemName").value.trim();
  const searchVal = document.getElementById("inp-search").value.trim().toLowerCase();
  const container = document.getElementById("results");

  if (!elemIdVal && !elemNameVal && !searchVal) {
    container.innerHTML = initialState();
    return;
  }

  const d = DATA[currentStandard];
  const codeMap = d.codes;
  const elementNames = d.names;
  const segmentMap = d.segMap;
  const versionVal = document.getElementById("inp-version").value;
  const versionIds = versionVal ? new Set(d.versions[versionVal] || []) : null;
  const allIds = versionIds
    ? Object.keys(codeMap).filter(function(id) { return versionIds.has(id); })
    : Object.keys(codeMap);

  // Resolve segment reference
  let resolvedFromName = null;
  if (elemNameVal) {
    const upper = elemNameVal.toUpperCase();
    const resolved = segmentMap[upper];
    if (resolved && !resolved.startsWith("S") && !resolved.startsWith("C")) {
      resolvedFromName = resolved;
    }
  }

  // Get candidate element IDs
  let candidateIds;
  if (elemIdVal && elemNameVal) {
    candidateIds = allIds.filter(function(id) {
      if (id.includes(elemIdVal)) return true;
      if (resolvedFromName && id === resolvedFromName) return true;
      const name = elementNames[id] || "";
      if (name.toLowerCase().includes(elemNameVal.toLowerCase())) return true;
      return false;
    });
  } else if (elemIdVal) {
    candidateIds = allIds.filter(function(id) { return id.includes(elemIdVal); });
  } else if (elemNameVal) {
    if (resolvedFromName) {
      candidateIds = allIds.filter(function(id) { return id === resolvedFromName; });
    } else {
      candidateIds = allIds.filter(function(id) {
        const name = elementNames[id] || "";
        return name.toLowerCase().includes(elemNameVal.toLowerCase());
      });
    }
  } else {
    candidateIds = allIds;
  }

  // Build results
  const results = [];
  for (const elemId of candidateIds) {
    const codesObj = codeMap[elemId];
    if (!codesObj) continue;
    let entries = Object.entries(codesObj).map(function(e) { return { code: e[0], description: e[1] }; });
    if (searchVal) {
      entries = entries.filter(function(e) {
        return e.code.toLowerCase().includes(searchVal) || e.description.toLowerCase().includes(searchVal);
      });
    }
    if (entries.length > 0 || !searchVal) {
      results.push({ elementId: elemId, elementName: elementNames[elemId] || "Unknown Element", entries: entries });
    }
  }

  // Sort: exact ID match first, then numeric
  results.sort(function(a, b) {
    if (elemIdVal) {
      const aExact = a.elementId === elemIdVal;
      const bExact = b.elementId === elemIdVal;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
    }
    return a.elementId.localeCompare(b.elementId, undefined, { numeric: true });
  });

  // Limit to 50
  const totalMatches = results.length;
  const limited = results.slice(0, 50);
  const totalEntries = limited.reduce(function(s, r) { return s + r.entries.length; }, 0);

  if (limited.length === 0) {
    container.innerHTML = noResultsState();
    return;
  }

  const badgeClass = currentStandard === "X12" ? "badge-x12" : "badge-edifact";
  const elemBadgeClass = currentStandard === "X12" ? "elem-badge-x12" : "elem-badge-edifact";

  let html = '<div class="summary">';
  html += '<span class="badge ' + badgeClass + '">' + escapeHtml(currentStandard) + '</span>';
  html += '<span>' + totalMatches + ' element' + (totalMatches !== 1 ? 's' : '') + ' matched';
  if (totalMatches > 50) html += ' (showing first 50)';
  html += '</span><span>&middot;</span>';
  html += '<span>' + totalEntries + ' code' + (totalEntries !== 1 ? 's' : '') + ' displayed</span>';
  html += '</div>';

  for (const r of limited) {
    html += '<div class="result-card">';
    html += '<div class="result-header">';
    html += '<span class="elem-badge ' + elemBadgeClass + '">' + escapeHtml(r.elementId) + '</span>';
    html += '<span class="elem-name">' + escapeHtml(r.elementName) + '</span>';
    html += '<span class="elem-count">' + r.entries.length + ' code' + (r.entries.length !== 1 ? 's' : '') + '</span>';
    html += '</div>';

    if (r.entries.length > 0) {
      html += '<div class="table-wrap"><table><thead><tr><th>Code</th><th>Description</th></tr></thead><tbody>';
      for (const e of r.entries) {
        html += '<tr><td>' + escapeHtml(e.code) + '</td><td>' + escapeHtml(e.description) + '</td></tr>';
      }
      html += '</tbody></table></div>';
    } else {
      html += '<div class="no-codes">No code list for this element</div>';
    }
    html += '</div>';
  }

  container.innerHTML = html;
}

function initialState() {
  return '<div class="card empty-state">' +
    '<div class="icon-circle blue"><svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#60a5fa"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"/></svg></div>' +
    '<div class="title">Search EDI Code Lists</div>' +
    '<div class="sub">Enter an Element ID, Element Name, or search term to get started</div>' +
    '</div>';
}

function noResultsState() {
  return '<div class="card empty-state">' +
    '<div class="icon-circle gray"><svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#94a3b8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg></div>' +
    '<div class="title">No elements matched your query</div>' +
    '<div class="sub">Try a partial ID or a broader name search</div>' +
    '</div>';
}

// Show initial state on load and populate version dropdown
document.getElementById("results").innerHTML = initialState();
(function() {
  const sel = document.getElementById("inp-version");
  const versions = Object.keys(DATA["X12"].versions);
  sel.innerHTML = '<option value="">All versions</option>' +
    versions.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
})();
</script>
</body>
</html>`;

// Write output
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, "index.html");
fs.writeFileSync(outPath, html, "utf-8");
const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
console.log(`\nGenerated: docs/index.html (${sizeKB} KB)`);
console.log("Open this file in any browser — no server or dependencies needed.");
