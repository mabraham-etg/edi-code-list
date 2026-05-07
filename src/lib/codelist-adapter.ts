import type { Standard, CodeListEntry, CodeListQuery, CodeListResult } from "./types";
import fs from "fs";
import path from "path";

type CodeMap = Record<string, Record<string, string>>;
type ElementNameMap = Record<string, string>;
type SegmentMap = Record<string, string>;

// Lazy-loaded caches
let x12CodeMap: CodeMap | null = null;
let edifactCodeMap: CodeMap | null = null;
let x12ElementNames: ElementNameMap | null = null;
let edifactElementNames: ElementNameMap | null = null;
let x12SegmentMap: SegmentMap | null = null;
let edifactSegmentMap: SegmentMap | null = null;

const DATA_DIR = path.join(process.cwd(), "src", "data");

function loadJson(filename: string): unknown {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function buildElementNameMap(data: Record<string, unknown>): ElementNameMap {
  const map: ElementNameMap = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "metadata") continue;
    const versionData = value as Record<string, unknown>;
    if (versionData && typeof versionData === "object" && "elements" in versionData) {
      const elements = versionData.elements as Record<string, string>;
      for (const [elemId, elemName] of Object.entries(elements)) {
        if (!map[elemId]) {
          map[elemId] = elemName;
        }
      }
    }
  }
  return map;
}

function getX12CodeMap(): CodeMap {
  if (!x12CodeMap) {
    const data = loadJson("x12_code_descriptions.json") as { codes: CodeMap };
    x12CodeMap = data.codes;
  }
  return x12CodeMap;
}

function getEdifactCodeMap(): CodeMap {
  if (!edifactCodeMap) {
    const data = loadJson("edifact_code_descriptions.json") as { codes: CodeMap };
    edifactCodeMap = data.codes;
  }
  return edifactCodeMap;
}

function getX12ElementNames(): ElementNameMap {
  if (!x12ElementNames) {
    const data = loadJson("x12_descriptions.json") as Record<string, unknown>;
    x12ElementNames = buildElementNameMap(data);
  }
  return x12ElementNames;
}

function getEdifactElementNames(): ElementNameMap {
  if (!edifactElementNames) {
    const data = loadJson("edifact_descriptions.json") as Record<string, unknown>;
    edifactElementNames = buildElementNameMap(data);
  }
  return edifactElementNames;
}

function getCodeMap(standard: Standard): CodeMap {
  return standard === "X12" ? getX12CodeMap() : getEdifactCodeMap();
}

function getElementNames(standard: Standard): ElementNameMap {
  return standard === "X12" ? getX12ElementNames() : getEdifactElementNames();
}

function getX12SegmentMap(): SegmentMap {
  if (!x12SegmentMap) {
    x12SegmentMap = loadJson("x12_segment_map.json") as SegmentMap;
  }
  return x12SegmentMap;
}

function getEdifactSegmentMap(): SegmentMap {
  if (!edifactSegmentMap) {
    edifactSegmentMap = loadJson("edifact_segment_map.json") as SegmentMap;
  }
  return edifactSegmentMap;
}

function getSegmentMap(standard: Standard): SegmentMap {
  return standard === "X12" ? getX12SegmentMap() : getEdifactSegmentMap();
}

/** Resolve a segment-position reference (e.g. "UNH0201", "N101") to an element ID */
function resolveSegmentRef(ref: string, segmentMap: SegmentMap): string | null {
  // Try exact match first (case-insensitive key lookup)
  const upperRef = ref.toUpperCase();
  const direct = segmentMap[upperRef];
  if (direct) return direct;
  return null;
}

export function lookupCodeList(q: CodeListQuery): CodeListResult[] {
  const codeMap = getCodeMap(q.standard);
  const elementNames = getElementNames(q.standard);
  const segmentMap = getSegmentMap(q.standard);
  const results: CodeListResult[] = [];

  const elementIdFilter = q.elementId?.trim() || "";
  const elementNameFilter = q.elementName?.trim() || "";
  const searchFilter = q.search?.trim().toLowerCase() || "";

  // Resolve segment reference in Element Name field (e.g. "UNH0201" → "0065", "N101" → "98")
  let resolvedFromName: string | null = null;
  if (elementNameFilter) {
    const resolved = resolveSegmentRef(elementNameFilter, segmentMap);
    if (resolved && !resolved.startsWith("S") && !resolved.startsWith("C")) {
      resolvedFromName = resolved;
    }
  }

  // Helper: match element by ID (partial contains)
  const matchesId = (id: string, filter: string) => id.includes(filter);

  // Helper: match element by description name (case-insensitive contains)
  const matchesDescName = (id: string, filter: string) => {
    const name = elementNames[id] || "";
    return name.toLowerCase().includes(filter.toLowerCase());
  };

  // Get candidate element IDs (OR logic when both fields provided)
  let candidateIds: string[];
  const allIds = Object.keys(codeMap);

  if (elementIdFilter && elementNameFilter) {
    // OR: include elements matching ID or resolved from segment name or description name
    candidateIds = allIds.filter((id) => {
      if (matchesId(id, elementIdFilter)) return true;
      if (resolvedFromName && id === resolvedFromName) return true;
      if (matchesDescName(id, elementNameFilter)) return true;
      return false;
    });
  } else if (elementIdFilter) {
    candidateIds = allIds.filter((id) => matchesId(id, elementIdFilter));
  } else if (elementNameFilter) {
    if (resolvedFromName) {
      // Segment reference resolved to an element ID
      candidateIds = allIds.filter((id) => id === resolvedFromName);
    } else {
      // Search by description name
      candidateIds = allIds.filter((id) => matchesDescName(id, elementNameFilter));
    }
  } else {
    candidateIds = allIds;
  }

  // Build results
  for (const elemId of candidateIds) {
    const codesObj = codeMap[elemId];
    if (!codesObj) continue;

    let entries: CodeListEntry[] = Object.entries(codesObj).map(
      ([code, description]) => ({ code, description })
    );

    // Apply search filter on code/description
    if (searchFilter) {
      entries = entries.filter(
        (e) =>
          e.code.toLowerCase().includes(searchFilter) ||
          e.description.toLowerCase().includes(searchFilter)
      );
    }

    // Only include if there are entries (or no search filter was applied)
    if (entries.length > 0 || !searchFilter) {
      results.push({
        standard: q.standard,
        elementId: elemId,
        elementName: elementNames[elemId] || "Unknown Element",
        entries,
      });
    }
  }

  // Sort results: exact ID match first, then by element ID
  results.sort((a, b) => {
    if (elementIdFilter) {
      const aExact = a.elementId === elementIdFilter;
      const bExact = b.elementId === elementIdFilter;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
    }
    return a.elementId.localeCompare(b.elementId, undefined, { numeric: true });
  });

  return results;
}
