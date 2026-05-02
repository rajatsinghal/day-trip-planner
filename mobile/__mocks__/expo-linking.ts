// Manual mock for expo-linking in Jest.
// getInitialURL resolves to null by default (no deep link).

export async function getInitialURL(): Promise<string | null> {
  return null;
}

export function createURL(path: string): string {
  return `dtp://${path}`;
}

export function parse(url: string): { scheme: string | null; path: string | null; queryParams: Record<string, string> } {
  try {
    const parsed = new URL(url);
    const queryParams: Record<string, string> = {};
    parsed.searchParams.forEach((v, k) => {
      queryParams[k] = v;
    });
    return {
      scheme: parsed.protocol.replace(':', ''),
      path: parsed.pathname.replace(/^\//, ''),
      queryParams,
    };
  } catch {
    return { scheme: null, path: null, queryParams: {} };
  }
}
