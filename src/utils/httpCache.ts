/**
 * Shared HTTP client for all sources: guarantees a URL is fetched at most
 * once per process run (an in-flight/completed request is memoized), and
 * enforces a maximum of 1 request per second per hostname so we never
 * hammer a vendor's official feed.
 */

const cache = new Map<string, Promise<string>>();
const lastRequestAtByHost = new Map<string, number>();

const MIN_INTERVAL_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRateLimit(hostname: string): Promise<void> {
  const last = lastRequestAtByHost.get(hostname);
  const now = Date.now();
  if (last !== undefined) {
    const elapsed = now - last;
    if (elapsed < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - elapsed);
    }
  }
  lastRequestAtByHost.set(hostname, Date.now());
}

/**
 * Fetches the text body of `url`, memoized for the lifetime of the
 * current process so the same URL is never downloaded twice in one
 * build/update run, and rate-limited to 1 request/second per hostname.
 */
export function fetchText(url: string): Promise<string> {
  const existing = cache.get(url);
  if (existing) return existing;

  const hostname = new URL(url).hostname;

  const promise = (async () => {
    await waitForRateLimit(hostname);
    const response = await fetch(url, {
      headers: { "User-Agent": "TechCalendar/1.0 (+https://github.com/)" },
    });
    if (!response.ok) {
      throw new Error(`Request to ${url} failed with status ${response.status}`);
    }
    return response.text();
  })();

  cache.set(url, promise);
  return promise;
}

/** Test-only helper to reset memoization/rate-limit state between test cases. */
export function __resetHttpCacheForTests(): void {
  cache.clear();
  lastRequestAtByHost.clear();
}
