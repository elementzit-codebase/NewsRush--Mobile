import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';

const TOKEN_KEY = 'newsrush_token';

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const setToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

interface RequestOptions {
  method?: string;
  body?: object | FormData;
  isFormData?: boolean;
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = 'GET', body, isFormData = false } = options;
  const token = await getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {}
    throw { message: errorMessage, status: response.status };
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
};

export const get = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'GET' });

export const post = <T>(endpoint: string, body?: object) =>
  apiRequest<T>(endpoint, { method: 'POST', body });

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
