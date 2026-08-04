export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const ACCESS = "aa_access";
const REFRESH = "aa_refresh";

export function getTokens() {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(ACCESS),
    refreshToken: localStorage.getItem(REFRESH),
  };
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS, accessToken);
  localStorage.setItem(REFRESH, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (options.auth !== false) {
    const { accessToken } = getTokens();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && options.auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefresh() {
  const { refreshToken } = getTokens();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}
