export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'nexo://app');
    if (url.hostname === 'expo-sharing') return '/inbox';
    return path;
  } catch {
    return '/';
  }
}
