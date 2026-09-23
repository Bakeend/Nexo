export function isSingleTypedCharacter(previous: string, next: string) {
  const before = Array.from(previous);
  const after = Array.from(next);
  if (after.length !== before.length + 1) return false;
  let prefix = 0;
  while (prefix < before.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < before.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  return prefix + suffix === before.length;
}
