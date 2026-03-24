/**
 * Mines Game — Browser Console Logger
 *
 * All game events and API traffic are routed through this module so that
 * Yannek can open DevTools → Console and see a clear, colour-coded log of
 * exactly what is happening at every step.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.stateTransition('idle', 'active', { bet: 10, mineCount: 3 });
 *   log.apiRequest('POST', '/api/game/start', body);
 *   log.apiResponse('POST', '/api/game/start', 200, data, elapsed);
 *   log.apiError('POST', '/api/game/reveal', err, body);
 */

const PREFIX = '[Mines]';

// Colour palette — only applies in browsers that support %c styling.
const C = {
  reset:      'color: inherit; font-weight: normal',
  label:      'color: #a78bfa; font-weight: bold',          // violet — section labels
  method:     'color: #60a5fa; font-weight: bold',          // blue   — HTTP method
  url:        'color: #94a3b8; font-weight: normal',        // slate  — URL
  ok:         'color: #34d399; font-weight: bold',          // green  — 2xx
  err:        'color: #f87171; font-weight: bold',          // red    — errors
  warn:       'color: #fbbf24; font-weight: bold',          // amber  — warnings
  dim:        'color: #64748b; font-weight: normal',        // muted
  phase:      'color: #f9a8d4; font-weight: bold',          // pink   — game phase
  tile:       'color: #fdba74; font-weight: bold',          // orange — tile type
  elapsed:    'color: #67e8f9; font-weight: normal',        // cyan   — timing
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ─── Public API ────────────────────────────────────────────────────────────

export const log = {
  /**
   * Log a game-phase state transition.
   * e.g. idle → active, active → lost, active → won
   */
  stateTransition(
    from: string,
    to: string,
    context?: Record<string, unknown>
  ): void {
    if (!isBrowser()) return;
    console.groupCollapsed(
      `%c${PREFIX}%c state  %c${from}%c → %c${to}`,
      C.label, C.dim, C.phase, C.dim, C.phase
    );
    if (context && Object.keys(context).length > 0) {
      console.log('%ccontext', C.dim, context);
    }
    console.trace('%cstack', C.dim);
    console.groupEnd();
  },

  /**
   * Log an outbound API request before fetch() is called.
   */
  apiRequest(
    method: string,
    url: string,
    body: unknown
  ): void {
    if (!isBrowser()) return;
    console.groupCollapsed(
      `%c${PREFIX}%c ↑ %c${method}%c ${url}`,
      C.label, C.dim, C.method, C.url
    );
    console.log('%crequest body', C.dim, body);
    console.groupEnd();
  },

  /**
   * Log a completed API response.
   */
  apiResponse(
    method: string,
    url: string,
    status: number,
    data: unknown,
    elapsedMs: number
  ): void {
    if (!isBrowser()) return;
    const ok = status >= 200 && status < 300;
    console.groupCollapsed(
      `%c${PREFIX}%c ↓ %c${method}%c ${url}  %c${status}%c  %c${elapsedMs}ms`,
      C.label, C.dim, C.method, C.url,
      ok ? C.ok : C.err, C.dim, C.elapsed
    );
    console.log('%cresponse body', C.dim, data);
    console.groupEnd();
  },

  /**
   * Log a network/parsing error (fetch threw or JSON.parse failed).
   */
  apiError(
    method: string,
    url: string,
    error: unknown,
    requestBody?: unknown
  ): void {
    if (!isBrowser()) return;
    console.group(
      `%c${PREFIX}%c ✖ %c${method}%c ${url}  %cNETWORK ERROR`,
      C.label, C.dim, C.method, C.url, C.err
    );
    if (requestBody !== undefined) console.log('%crequest body', C.dim, requestBody);
    console.error(error);
    console.groupEnd();
  },

  /**
   * Log a tile reveal event with its outcome.
   */
  tileReveal(
    index: number,
    tileState: string,
    multiplier?: number,
    message?: string
  ): void {
    if (!isBrowser()) return;
    console.log(
      `%c${PREFIX}%c tile[%c${index}%c] → %c${tileState}%c  ×${multiplier?.toFixed(3) ?? '—'}  ${message ?? ''}`,
      C.label, C.dim, C.tile, C.dim, C.tile, C.reset
    );
  },

  /**
   * Log a general warning that doesn't rise to an error.
   */
  warn(msg: string, detail?: unknown): void {
    if (!isBrowser()) return;
    if (detail !== undefined) {
      console.warn(`%c${PREFIX}%c ${msg}`, C.label, C.warn, detail);
    } else {
      console.warn(`%c${PREFIX}%c ${msg}`, C.label, C.warn);
    }
  },

  /**
   * Log a non-fatal application error.
   */
  error(msg: string, detail?: unknown): void {
    if (!isBrowser()) return;
    if (detail !== undefined) {
      console.error(`%c${PREFIX}%c ${msg}`, C.label, C.err, detail);
    } else {
      console.error(`%c${PREFIX}%c ${msg}`, C.label, C.err);
    }
  },

  /**
   * Log an informational message (config, seed reveal, etc.)
   */
  info(msg: string, detail?: unknown): void {
    if (!isBrowser()) return;
    if (detail !== undefined) {
      console.log(`%c${PREFIX}%c ${msg}`, C.label, C.dim, detail);
    } else {
      console.log(`%c${PREFIX}%c ${msg}`, C.label, C.dim);
    }
  },
};

/**
 * Thin fetch wrapper that automatically logs request, response, and errors.
 * Drop-in replacement for fetch() for the three game API routes.
 *
 * Returns { ok, status, data } — callers never need to call .json() themselves.
 */
export async function apiFetch<T = unknown>(
  url: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: T }> {
  const method = 'POST';
  log.apiRequest(method, url, body);
  const t0 = performance.now();

  let res: Response;
  let data: T;

  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    log.apiError(method, url, err, body);
    throw err;
  }

  const elapsed = Math.round(performance.now() - t0);

  try {
    data = (await res.json()) as T;
  } catch (err) {
    log.apiError(method, url, new Error(`JSON parse failed (${res.status})`), body);
    throw err;
  }

  log.apiResponse(method, url, res.status, data, elapsed);

  if (!res.ok) {
    // Log server-side error detail but don't throw — callers check .ok
    log.error(`Server error ${res.status} from ${url}`, data);
  }

  return { ok: res.ok, status: res.status, data };
}
