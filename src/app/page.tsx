"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Standard, CodeListResult } from "@/lib/types";
import { getVersionKeys } from "@/lib/codelist-adapter";

export default function Home() {
  const [standard, setStandardState] = useState<Standard>("X12");
  const setStandard = (std: Standard) => {
    setStandardState(std);
    setElementId("");
    setElementName("");
    setSearch("");
    setVersion("");
  };
  const [version, setVersion] = useState("");
  const [elementId, setElementId] = useState("");
  const [elementName, setElementName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CodeListResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = useCallback(
    async (std: Standard, elemId: string, elemName: string, srch: string, ver: string) => {
      if (!elemId.trim() && !elemName.trim() && !srch.trim()) {
        setResults([]);
        setTotalMatches(0);
        setHasSearched(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      setHasSearched(true);

      const params = new URLSearchParams();
      params.set("standard", std);
      if (elemId.trim()) params.set("elementId", elemId.trim());
      if (elemName.trim()) params.set("elementName", elemName.trim());
      if (srch.trim()) params.set("search", srch.trim());
      if (ver.trim()) params.set("version", ver.trim());

      try {
        const res = await fetch(`/api/codelist?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Request failed");
          setResults([]);
          setTotalMatches(0);
          return;
        }
        const data = await res.json();
        setResults(data.results);
        setTotalMatches(data.totalMatches);
      } catch {
        setError("Failed to fetch results. Please try again.");
        setResults([]);
        setTotalMatches(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(standard, elementId, elementName, search, version);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [standard, elementId, elementName, search, version, fetchResults]);

  const totalEntries = results.reduce((sum, r) => sum + r.entries.length, 0);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Code List
          </h1>
          <p className="mt-2 text-base text-slate-600">
            EDI Code List Lookup &mdash; X12 &amp; EDIFACT
          </p>
        </div>

        {/* Search Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          {/* Standard Toggle */}
          <div className="mb-5 flex justify-center gap-3">
            <button
              onClick={() => setStandard("X12")}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                standard === "X12"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              X12
            </button>
            <button
              onClick={() => setStandard("EDIFACT")}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                standard === "EDIFACT"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              EDIFACT
            </button>
          </div>

          {/* Input Fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Element ID
              </label>
              <input
                type="text"
                value={elementId}
                onChange={(e) => setElementId(e.target.value)}
                placeholder={standard === "X12" ? 'e.g. 98, 66' : 'e.g. 0065, 1001'}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Element Name
              </label>
              <input
                type="text"
                value={elementName}
                onChange={(e) => setElementName(e.target.value)}
                placeholder={
                  standard === "X12"
                    ? "e.g. N101, Entity Identifier"
                    : "e.g. UNH0201, Message Type"
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Search in Results
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter code or description..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
          </div>

          {/* Version Filter */}
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              EDI Version{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              <option value="">All versions</option>
              {getVersionKeys(standard).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Section */}
        <div className="mt-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              <span className="ml-3 text-sm text-slate-700">Searching...</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-red-50 p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && hasSearched && results.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/60">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-800">
                No elements matched your query
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try a partial ID or a broader name search
              </p>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    standard === "X12"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {standard}
                </span>
                <span>
                  {totalMatches} element{totalMatches !== 1 ? "s" : ""} matched
                  {totalMatches > 50 && " (showing first 50)"}
                </span>
                <span>&middot;</span>
                <span>{totalEntries} code{totalEntries !== 1 ? "s" : ""} displayed</span>
              </div>

              {/* Results */}
              {results.map((result) => (
                <div
                  key={result.elementId}
                  className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 overflow-hidden"
                >
                  {/* Element Header */}
                  <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                          standard === "X12"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {result.elementId}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {result.elementName}
                      </span>
                      <span className="ml-auto text-xs text-slate-600">
                        {result.entries.length} code{result.entries.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Code Table */}
                  {result.entries.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-slate-100">
                            <th className="px-5 py-2 text-left text-xs font-semibold text-slate-700 w-28">
                              Code
                            </th>
                            <th className="px-5 py-2 text-left text-xs font-semibold text-slate-700">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {result.entries.map((entry) => (
                            <tr
                              key={entry.code}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="px-5 py-2 font-mono text-xs font-medium text-slate-900">
                                {entry.code}
                              </td>
                              <td className="px-5 py-2 text-slate-800">
                                {entry.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-4 text-center text-xs text-slate-400">
                      No code list for this element
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && !error && !hasSearched && (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/60">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">
                Search EDI Code Lists
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Enter an Element ID, Element Name, or search term to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
