// Compress workspace config into a shareable URL parameter
// Uses TextEncoder to safely handle Unicode characters

export function encodeWorkspaceToUrl(config: object): string {
  try {
    const json = JSON.stringify(config);
    const bytes = new TextEncoder().encode(json);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const encoded = btoa(binary);
    return `${window.location.origin}${window.location.pathname}?ws=${encodeURIComponent(encoded)}`;
  } catch {
    return '';
  }
}

export function decodeWorkspaceFromUrl(): object | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ws = params.get('ws');
    if (!ws) return null;
    const binary = atob(ws);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
