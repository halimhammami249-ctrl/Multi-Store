/**
 * Shared key-normalizer. MUST be used on both sides of any imageMap
 * lookup (where the map is built AND where it's read) or matching breaks.
 */
export function normalizeKey(v: string) {
  return (v || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '');
}
