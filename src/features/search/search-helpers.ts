export function createLikeSearchPattern(query: string): string {
  const escapedQuery = query.trim().replace(/[\\%_]/g, '\\$&');
  return `%${escapedQuery}%`;
}

export function dedupeSearchMatches<T extends { id: string; type: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify([item.type, item.id]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
