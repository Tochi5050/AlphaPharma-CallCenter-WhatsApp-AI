const OPENER_PATTERNS = [
  /^(good\s+(morning|afternoon|evening)[,!.]?\s*)/i,
  /^(hello|hi there|hi|hey|welcome( to alpha pharmacy)?)[,!.]?\s*/i,
];

export function stripGreetingOpeners(text: string): string {
  let result = text.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of OPENER_PATTERNS) {
      const stripped = result.replace(pattern, "");
      if (stripped !== result) {
        result = stripped.trim();
        changed = true;
      }
    }
  }
  return result;
}
