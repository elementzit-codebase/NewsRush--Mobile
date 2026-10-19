//Live server
// export const SERVER_ORIGIN = 'https://www.newsrush.elementzit.com';

//Local server
export const SERVER_ORIGIN = 'http://192.168.1.49:8000';

export const API_BASE_URL = `${SERVER_ORIGIN}/api`;

export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${SERVER_ORIGIN}${trimmed}`;
  }
  return trimmed;
}

export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  users: {
    me: '/users/me',
    list: '/users',
    approve: (id: string | number) => `/users/${id}/approve`,
    reject: (id: string | number) => `/users/${id}/reject`,
    changePassword: '/users/me/password',
    profilePic: '/users/me/profile-pic',
  },
  editions: {
    list: '/editions',
    create: '/editions',
    get: (id: string | number) => `/editions/${id}`,
    update: (id: string | number) => `/editions/${id}`,
    delete: (id: string | number) => `/editions/${id}`,
    validate: (id: string | number) => `/editions/${id}/validate`,
  },
  sections: {
    list: (editionId: string | number) => `/editions/${editionId}/sections`,
    save: (editionId: string | number, sectionKey: string) =>
      `/editions/${editionId}/sections/${sectionKey}`,
  },
  ai: {
    headline: '/ai/headline',
    expand: '/ai/expand',
    transcribe: '/ai/transcribe',
  },
};

