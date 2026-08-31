import { get, post, putForm } from './client';
import { ENDPOINTS } from '../constants/api';
import { User, ProfileUpdateRequest } from '../types';

export const getUsers = (): Promise<User[]> =>
  get<User[]>(ENDPOINTS.users.list);

export const approveUser = (id: number): Promise<User> =>
  post<User>(ENDPOINTS.users.approve(id));

export const rejectUser = (id: number): Promise<User> =>
  post<User>(ENDPOINTS.users.reject(id));

export const updateProfile = (data: ProfileUpdateRequest): Promise<User> =>
  post<User>(ENDPOINTS.users.updateProfile, data);

export const uploadProfilePhoto = (formData: FormData): Promise<{ photoUrl: string }> =>
  putForm<{ photoUrl: string }>(ENDPOINTS.users.uploadPhoto, formData);
