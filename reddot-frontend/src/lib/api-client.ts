const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const TOKEN_KEY = 'admin_jwt';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

interface FetchOptions extends RequestInit {
  auth?: boolean;
  apiSecret?: boolean;
}

export async function apiClient<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = false, apiSecret = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (apiSecret) {
    headers['X-Api-Secret'] = process.env.NEXT_PUBLIC_API_SECRET_KEY ?? '';
  }

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

// Server-side client for Next.js API routes (uses API_SECRET_KEY)
export function serverApiClient<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Secret': process.env.API_SECRET_KEY ?? '',
    ...(options.headers as Record<string, string>),
  };

  return fetch(`${process.env.API_URL ?? API_URL}${path}`, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? `Request failed: ${res.status}`);
    }
    return res.json();
  });
}
