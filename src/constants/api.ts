export const API_BASE_URL = 'https://newsrush.elementzit.com/api';

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  editions: {
    list: '/editions',
    create: '/editions',
    get: (id: number) => `/editions/${id}`,
    update: (id: number) => `/editions/${id}`,
    delete: (id: number) => `/editions/${id}`,
    updateStatus: (id: number) => `/editions/${id}/status`,
    checkReadiness: (id: number) => `/editions/${id}/readiness`,
    export: (id: number) => `/editions/${id}/export`,
  },
  sections: {
    update: (editionId: number, pageId: number, sectionId: number) =>
      `/editions/${editionId}/pages/${pageId}/sections/${sectionId}`,
    aiHeadline: (editionId: number, pageId: number, sectionId: number) =>
      `/editions/${editionId}/pages/${pageId}/sections/${sectionId}/ai-headline`,
    aiExpand: (editionId: number, pageId: number, sectionId: number) =>
      `/editions/${editionId}/pages/${pageId}/sections/${sectionId}/ai-expand`,
    uploadImage: (editionId: number, pageId: number, sectionId: number) =>
      `/editions/${editionId}/pages/${pageId}/sections/${sectionId}/image`,
    uploadVoice: (editionId: number, pageId: number, sectionId: number) =>
      `/editions/${editionId}/pages/${pageId}/sections/${sectionId}/voice`,
  },
  users: {
    list: '/users',
    get: (id: number) => `/users/${id}`,
    approve: (id: number) => `/users/${id}/approve`,
    reject: (id: number) => `/users/${id}/reject`,
    updateProfile: '/users/profile',
    uploadPhoto: '/users/profile/photo',
  },
  notifications: {
    list: '/notifications',
    markRead: (id: number) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },
};
