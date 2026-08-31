import { get, post } from './client';
import { ENDPOINTS } from '../constants/api';
import { LoginRequest, LoginResponse, User } from '../types';

export const login = (data: LoginRequest): Promise<LoginResponse> =>
  post<LoginResponse>(ENDPOINTS.auth.login, data);

export const logout = (): Promise<void> =>
  post<void>(ENDPOINTS.auth.logout);

export const getMe = (): Promise<User> =>
  get<User>(ENDPOINTS.auth.me);
