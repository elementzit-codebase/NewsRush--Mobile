import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/api';

const ACCESS_KEY = 'newsrush_token';
const REFRESH_KEY = 'newsrush_refresh_token';

// In-memory token cache for synchronous, atomic, race-free reads
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let initPromise: Promise<void> | null = null;

export const initTokens = async (): Promise<void> => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);
      cachedAccessToken = access;
      cachedRefreshToken = refresh;
    } catch {
      cachedAccessToken = null;
      cachedRefreshToken = null;
    }
  })();
  return initPromise;
};

// Start token initialization immediately on module load
initTokens();

export const getToken = async (): Promise<string | null> => {
  await initTokens();
  return cachedAccessToken;
};

export const getRefreshToken = async (): Promise<string | null> => {
  await initTokens();
  return cachedRefreshToken;
};

export const setTokens = async (tokens: { access_token?: string; refresh_token?: string; token?: string }): Promise<void> => {
  const access = tokens.access_token || tokens.token;
  if (access && typeof access === 'string') {
    cachedAccessToken = access;
  }
  if (tokens.refresh_token && typeof tokens.refresh_token === 'string') {
    cachedRefreshToken = tokens.refresh_token;
  }

  const writes: Promise<void>[] = [];
  if (access && typeof access === 'string') {
    writes.push(SecureStore.setItemAsync(ACCESS_KEY, access));
  }
  if (tokens.refresh_token && typeof tokens.refresh_token === 'string') {
    writes.push(SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token));
  }
  await Promise.all(writes);
};

export const setToken = async (token: string): Promise<void> => {
  if (token && typeof token === 'string') {
    cachedAccessToken = token;
    await SecureStore.setItemAsync(ACCESS_KEY, token);
  }
};

export const removeToken = async (): Promise<void> => {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  } catch {}
};

/** Notified when the session genuinely expires so the UI can redirect cleanly */
let onSessionExpired: () => void = () => {};
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

interface RequestOptions {
  method?: string;
  body?: object | FormData;
  isFormData?: boolean;
  auth?: boolean;
}

// Single in-flight refresh promise mutex
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // If another request is currently refreshing tokens, reuse that exact promise
  if (refreshInFlight) {
    return refreshInFlight;
  }

  await initTokens();
  const currentRefresh = cachedRefreshToken;
  if (!currentRefresh) {
    return false;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentRefresh }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (!data.access_token) {
        return false;
      }

      await setTokens(data);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function send(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, isFormData = false, auth = true } = options;
  const token = await getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token && auth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    config.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  return {
    response: await fetch(`${API_BASE_URL}${endpoint}`, config),
    usedToken: token,
  };
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { auth = true } = options;
  let resObj: { response: Response; usedToken: string | null };

  const maxAttempts = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      resObj = await send(endpoint, options);
    } catch {
      throw { message: 'Cannot reach the server. Please check your connection.', status: 0 };
    }

    let { response, usedToken } = resObj;

    // If 401 on an authenticated endpoint (and not the login route itself)
    if (response.status === 401 && auth && !endpoint.includes('/auth/login')) {
      // Check if another concurrent request already refreshed the token while we were in flight
      const currentToken = cachedAccessToken;
      if (currentToken && usedToken && currentToken !== usedToken) {
        // Try immediately with the freshly updated token
        try {
          const retried = await send(endpoint, options);
          response = retried.response;
        } catch {
          throw { message: 'Cannot reach the server. Please check your connection.', status: 0 };
        }
      }

      // If still 401, perform token refresh
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          try {
            const retried = await send(endpoint, options);
            response = retried.response;
          } catch {
            throw { message: 'Cannot reach the server. Please check your connection.', status: 0 };
          }
        } else {
          await removeToken();
          onSessionExpired();
          throw { message: 'Your session has expired. Please sign in again.', status: 401 };
        }
      }
    }

    // If 500, 502, 503 or 504 and it's our first attempt, wait briefly and retry once
    if ((response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 1200));
      continue;
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((item: any) => {
              const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
              return field && field !== 'body' ? `${field}: ${item.msg}` : item.msg;
            })
            .join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {}
      throw { message: errorMessage, status: response.status };
    }

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {} as T;
  }
  throw lastError || { message: 'Request failed. Please try again.', status: 500 };
};

export const get = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'GET' });

export const post = <T>(endpoint: string, body?: object, auth = true) =>
  apiRequest<T>(endpoint, { method: 'POST', body, auth });

export const put = <T>(endpoint: string, body?: object) =>
  apiRequest<T>(endpoint, { method: 'PUT', body });

export const patch = <T>(endpoint: string, body?: object) =>
  apiRequest<T>(endpoint, { method: 'PATCH', body });

export const del = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'DELETE' });

export const postForm = <T>(endpoint: string, body: FormData) =>
  apiRequest<T>(endpoint, { method: 'POST', body, isFormData: true });

export const putForm = <T>(endpoint: string, body: FormData) =>
  apiRequest<T>(endpoint, { method: 'PUT', body, isFormData: true });
