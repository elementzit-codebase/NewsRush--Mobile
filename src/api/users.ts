import { get, patch, del, putForm } from './client';
import { ENDPOINTS } from '../constants/api';
import { User, ChangePasswordRequest } from '../types';

export const getUsers = async (approvalStatus: string = 'all'): Promise<User[]> => {
  const url = approvalStatus && approvalStatus !== 'all'
    ? `${ENDPOINTS.users.list}?approval_status=${encodeURIComponent(approvalStatus)}`
    : ENDPOINTS.users.list;
  const res = await get<any>(url);
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
};

export const approveUser = (id: string | number): Promise<User> =>
  patch<User>(ENDPOINTS.users.approve(id));

export const changePassword = (data: ChangePasswordRequest): Promise<any> =>
  patch<any>(ENDPOINTS.users.changePassword, data);

export const uploadProfilePicture = (formData: FormData): Promise<User> =>
  putForm<User>(ENDPOINTS.users.profilePic, formData);

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
