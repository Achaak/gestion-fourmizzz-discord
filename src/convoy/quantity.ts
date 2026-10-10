const MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, g: 1e9 };

/**
 * Reads a resource quantity typed like in the game's convoy form: "1 240 000", "272k", "1,5m", "2g".
 * Returns null when the text is not a non-negative quantity.
 */
export function parseQuantity(text: string): number | null {
  // \s also covers the non-breaking spaces the game and Discord may paste.
  const compact = text.toLowerCase().replace(/\s/g, "");
  const match = /^(\d+(?:[.,]\d+)?)([kmg])?$/.exec(compact);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(",", ".")) * (match[2] ? (MULTIPLIERS[match[2]] ?? 1) : 1);
  return Number.isFinite(value) ? Math.round(value) : null;
}

/** Formats a whole number like the game: "1 240 000". A plain space keeps code-block columns aligned. */
export function formatNumber(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
