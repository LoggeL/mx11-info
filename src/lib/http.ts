export class UpstreamError extends Error {
  constructor(message = "Upstream service unavailable") { super(message); }
}
export async function fetchJson<T>(url: string | URL, init: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      ...init, cache: "no-store",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(8_000)])
        : AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new UpstreamError(`Upstream returned HTTP ${response.status}`);
    return await response.json() as T;
  } catch (error) {
    // Never include URLs, response bodies or credentials in public errors.
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError();
  }
}
export function serviceUrl(envName: string, fallback: string) {
  const url = new URL(process.env[envName] || fallback);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(`Invalid ${envName}`);
  }
  return url.toString().replace(/\/$/, "");
}
export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
