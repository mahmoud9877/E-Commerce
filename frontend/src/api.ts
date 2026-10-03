// Every request goes to the same origin under /api; the dev server (vite.config.ts) or nginx
// (production image) forwards it to the backend. Override VITE_API_BASE_URL at build time only
// if the API is deployed on a different, browser-reachable origin.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
// Must equal the backend's BEARER_KEY: the backend expects "Authorization: <BEARER_KEY><token>"
const BEARER_KEY = import.meta.env.VITE_BEARER_KEY || "Bearer__";

const SESSION_KEY = "ecommerce.session";

export interface SessionUser {
  id: string;
  userName: string;
  email: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  // The login response carries no role; learned by probing an admin-only endpoint
  isAdmin?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: { field: string; message: string }[] = []
  ) {
    super(message);
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable (private mode): the session just lasts until reload
  }
  window.dispatchEvent(new Event("session-change"));
}

export interface RequestOptions {
  method?: string;
  // Plain objects are sent as JSON; FormData as multipart (for image uploads)
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

async function send<T>(path: string, { method = "GET", body, headers = {}, auth = false }: RequestOptions): Promise<T> {
  const init: RequestInit = { method, headers: { ...headers } };
  const allHeaders = init.headers as Record<string, string>;
  if (body instanceof FormData) {
    init.body = body; // the browser sets the multipart boundary
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    allHeaders["Content-Type"] = "application/json";
  }
  const session = auth ? loadSession() : null;
  if (session) allHeaders.Authorization = `${BEARER_KEY}${session.accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, init);
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const obj = typeof data === "object" && data ? (data as { message?: string; errors?: ApiError["fieldErrors"] }) : {};
    const message = obj.message || (typeof data === "string" && data) || res.statusText;
    throw new ApiError(message, res.status, obj.errors);
  }
  return data as T;
}

// Exchanges the refresh token for a new pair; clears the session if it was revoked or expired
let refreshing: Promise<boolean> | null = null;
function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const session = loadSession();
    if (!session) return false;
    try {
      const tokens = await send<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: session.refreshToken },
      });
      saveSession({ ...session, ...tokens });
      return true;
    } catch {
      saveSession(null);
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (err) {
    // Access tokens are short-lived: refresh once (shared by parallel requests) and retry
    if (options.auth && err instanceof ApiError && err.status === 401 && (await refresh())) {
      return send<T>(path, options);
    }
    throw err;
  }
}

// Builds a query string, skipping empty values and repeating array values (?size=s&size=m)
export function qs(params: Record<string, string | number | boolean | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v));
    else search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ---- Session lifecycle ----------------------------------------------------------------------

// GET /auth is admin-only: 200 means admin, 403 means a regular user
async function probeAdmin(): Promise<boolean> {
  try {
    await api("/auth?size=1", { auth: true });
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return false;
    throw err;
  }
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await api<Session>("/auth/login", { method: "POST", body: { email, password } });
  const session: Session = { accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user };
  saveSession(session);
  const isAdmin = await probeAdmin().catch(() => false);
  const current = loadSession();
  if (current) saveSession({ ...current, isAdmin });
  return { ...session, isAdmin };
}

// For sessions saved before the role was known
export async function ensureRole(): Promise<void> {
  const session = loadSession();
  if (!session || session.isAdmin !== undefined) return;
  const isAdmin = await probeAdmin();
  const current = loadSession();
  if (current) saveSession({ ...current, isAdmin });
}

export async function logout(): Promise<void> {
  const session = loadSession();
  saveSession(null);
  if (session) {
    await api("/auth/logout", { method: "POST", body: { refreshToken: session.refreshToken } }).catch(() => undefined);
  }
}
