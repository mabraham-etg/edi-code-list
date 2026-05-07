export type Standard = "X12" | "EDIFACT";

export type CodeListEntry = { code: string; description: string };

export type CodeListQuery = {
  standard: Standard;
  elementId?: string;
  elementName?: string;
  search?: string;
};

export type CodeListResult = {
  standard: Standard;
  elementId: string;
  elementName: string;
  entries: CodeListEntry[];
};
