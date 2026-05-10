/**
 * Fetch a remote image URL and convert the response body into a
 * `data:<mime>;base64,...` string. Used by the Wizard auto-fetch pipeline
 * to embed Commons thumbnails into the Project JSON.
 *
 * Implementation note: arrayBuffer + btoa instead of FileReader so the
 * function runs unmodified in node-based test environments (no polyfill).
 * Errors propagate: HTTP non-ok throws, AbortSignal throws DOMException.
 * Caller decides retry / skip / swallow.
 */
export async function fetchAsBase64(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const mime = res.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Chunk the charCode accumulation to avoid "Maximum call stack size exceeded"
  // on 200KB+ JPEGs when spreading into String.fromCharCode.
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
