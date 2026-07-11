const UOM_SYNONYMS: Record<string, string[]> = {
  unit: ["unit", "sachet", "satchet", "piece", "pc"],
  tablet: ["tablet", "tab", "tabs"],
  ampoule: ["ampoule", "amp"],
};

export function normalizeUom(requested: string): string[] {
  const lower = requested.toLowerCase();
  for (const [, synonyms] of Object.entries(UOM_SYNONYMS)) {
    if (synonyms.includes(lower)) return synonyms;
  }
  return [lower];
}
