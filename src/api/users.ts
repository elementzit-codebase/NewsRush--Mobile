import { get, patch, del, putForm, getToken } from './client';
import { ENDPOINTS, API_BASE_URL } from '../constants/api';
import { User, ChangePasswordRequest } from '../types';
import * as FileSystem from 'expo-file-system/legacy';

const MAX_PAGE_SIZE = 100;

export const getUsers = async (approvalStatus: string = 'all'): Promise<User[]> => {
  const base = approvalStatus
    ? `${ENDPOINTS.users.list}?approval_status=${encodeURIComponent(approvalStatus)}`
    : ENDPOINTS.users.list;
  const sep = base.includes('?') ? '&' : '?';
  const res = await get<any>(`${base}${sep}page=1&page_size=${MAX_PAGE_SIZE}`);
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) {
    const items = [...res.items];
    const totalPages = res.total_pages || 1;
    for (let p = 2; p <= totalPages; p++) {
      const next = await get<any>(`${base}${sep}page=${p}&page_size=${MAX_PAGE_SIZE}`);
      if (next && Array.isArray(next.items)) {
        items.push(...next.items);
      }
    }
    return items;
  }
  if (res && Array.isArray(res.data)) return res.data;
  return [];
};

export const approveUser = (id: string | number): Promise<User> =>
  patch<User>(ENDPOINTS.users.approve(id));

export const rejectUser = (id: string | number): Promise<any> =>
  patch<any>(ENDPOINTS.users.reject(id));

export const changePassword = (data: ChangePasswordRequest): Promise<any> =>
  patch<any>(ENDPOINTS.users.changePassword, data);
export const uploadProfilePicture = async (formDataOrUri: FormData | string): Promise<User> => {
  if (typeof formDataOrUri === 'string') {
    const token = await getToken();
    const result = await FileSystem.uploadAsync(`${API_BASE_URL}${ENDPOINTS.users.profilePic}`, formDataOrUri, {
      fieldName: 'file',
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (result.status >= 200 && result.status < 300) {
      return JSON.parse(result.body);
    }
    let errMsg = `Upload failed (${result.status})`;
    try {
      const errObj = JSON.parse(result.body);
      errMsg = errObj.detail || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return putForm<User>(ENDPOINTS.users.profilePic, formDataOrUri);
};

export const removeProfilePicture = (): Promise<any> =>
  del<any>(ENDPOINTS.users.profilePic);

// Backward-compatible aliases
export const uploadProfilePhoto = uploadProfilePicture;
export const updateProfile = async (data: any): Promise<User> => {
  if (data.currentPassword && data.newPassword) {
    await changePassword({ current_password: data.currentPassword, new_password: data.newPassword });
  }
  return get<User>(ENDPOINTS.users.me);
};
