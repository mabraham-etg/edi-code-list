import { NextRequest, NextResponse } from "next/server";
import { lookupCodeList } from "@/lib/codelist-adapter";
import type { Standard } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const standard = (searchParams.get("standard") || "X12").toUpperCase() as Standard;
  if (standard !== "X12" && standard !== "EDIFACT") {
    return NextResponse.json(
      { error: "Invalid standard. Use X12 or EDIFACT." },
      { status: 400 }
    );
  }

  const elementId = searchParams.get("elementId") || undefined;
  const elementName = searchParams.get("elementName") || undefined;
  const search = searchParams.get("search") || undefined;

  // Require at least one filter to avoid returning the entire dataset
  if (!elementId && !elementName && !search) {
    return NextResponse.json(
      { error: "Provide at least one of: elementId, elementName, or search." },
      { status: 400 }
    );
  }

  const results = lookupCodeList({ standard, elementId, elementName, search });

  // Limit results to prevent huge payloads
  const limited = results.slice(0, 50);

  return NextResponse.json({
    standard,
    totalMatches: results.length,
    results: limited,
  });
}
