import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/api';

const ACCESS_KEY = 'newsrush_token';
const REFRESH_KEY = 'newsrush_refresh_token';

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
};

export const setTokens = async (tokens: { access_token?: string; refresh_token?: string; token?: string }): Promise<void> => {
  const access = tokens.access_token || tokens.token;
  if (access && typeof access === 'string') {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
  }
  if (tokens.refresh_token && typeof tokens.refresh_token === 'string') {
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
  }
};

export const setToken = async (token: string): Promise<void> => {
  if (token && typeof token === 'string') {
    await SecureStore.setItemAsync(ACCESS_KEY, token);
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {}
};

interface RequestOptions {
  method?: string;
  body?: object | FormData;
  isFormData?: boolean;
  auth?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh_token = await getRefreshToken();
  if (!refresh_token) return false;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!response.ok) return false;
      const data = await response.json();
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

  return fetch(`${API_BASE_URL}${endpoint}`, config);
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { auth = true } = options;
  let response: Response;

  const maxAttempts = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await send(endpoint, options);
    } catch {
      throw { message: 'Cannot reach the server. Please check your connection.', status: 0 };
    }

    // If 401, attempt refresh token replay once
    if (response.status === 401 && auth && !endpoint.includes('/auth/login')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await send(endpoint, options);
      } else {
        await removeToken();
        throw { message: 'Your session has expired. Please sign in again.', status: 401 };
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
