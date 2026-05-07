# Code List — EDI Code List Lookup (X12 & EDIFACT)

A responsive web app for looking up EDI code list values and descriptions. Supports both **X12** and **EDIFACT** standards.

## How to Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Standard Selector**: Toggle between X12 and EDIFACT
- **Element ID Search**: Partial/exact match on element identifiers
- **Element Name Search**: Case-insensitive partial match on element names
- **Code/Description Filter**: Search within code list results
- **Fast**: Data loaded at build-time; debounced inputs (300ms)
- **Responsive**: Works on mobile and desktop
- **Clean UI**: Soft professional theme, pastel accents, rounded cards

## Where Code List Data Comes From

The code list data is sourced from the **XPATHForge** project:

```
XPATHForge/backend/app/data/
├── x12_code_descriptions.json       # X12 codes: { elementId: { code: description } }
├── edifact_code_descriptions.json   # EDIFACT codes: same structure
├── x12_descriptions.json            # X12 element names (by version)
└── edifact_descriptions.json        # EDIFACT element names (by version)
```

These files are copied into `src/data/` at project setup time.

- **x12_code_descriptions.json**: 777 elements, ~38,639 code values
- **edifact_code_descriptions.json**: 287 elements, ~12,001 code values

## Architecture

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4
- **API Route**: `GET /api/codelist?standard=X12&elementId=98&elementName=&search=ship`
- **Adapter Module**: `src/lib/codelist-adapter.ts` — loads JSON once, provides indexed lookup
- **Client Page**: `src/app/page.tsx` — debounced search UI with live results

## How to Extend

### Add More Standards or Versions

1. Add a new JSON file to `src/data/` following the same schema:
   - Code file: `{ "metadata": {...}, "codes": { "elementId": { "codeValue": "description" } } }`
   - Description file: `{ "versionKey": { "elements": { "id": "name" }, "segments": {...} } }`

2. Update `src/lib/codelist-adapter.ts`:
   - Import the new JSON files
   - Add to the `Standard` type union
   - Add corresponding entries in `getCodeMap()` and `getElementNames()`

### Add Version Selection

The descriptions JSON already contains per-version element names. You could add a version dropdown and filter element names by version rather than merging all versions.
