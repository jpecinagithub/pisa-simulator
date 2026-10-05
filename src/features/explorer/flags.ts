/** ISO 3166-1 alpha-2 → regional-indicator flag emoji. Returns '' when not applicable. */
export function flagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return '';
  const up = alpha2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return '';
  return String.fromCodePoint(...[...up].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
