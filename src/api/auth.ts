import { get, post, getRefreshToken, removeToken } from './client';
import { ENDPOINTS } from '../constants/api';
import {
  LoginRequest, LoginResponse, User, RegisterRequest,
  ForgotPasswordRequest, ResetPasswordRequest
} from '../types';

export const login = (data: LoginRequest): Promise<LoginResponse> =>
  post<LoginResponse>(ENDPOINTS.auth.login, data, false);

export const register = (data: RegisterRequest): Promise<User> =>
  post<User>(ENDPOINTS.auth.register, data, false);

export const logout = async (): Promise<void> => {
  const refresh_token = await getRefreshToken();
  try {
    if (refresh_token) {
      await post<void>(ENDPOINTS.auth.logout, { refresh_token }, false);
    }
  } finally {
    await removeToken();
  }
};

export const forgotPassword = (email: string): Promise<any> =>
  post<any>(ENDPOINTS.auth.forgotPassword, { email }, false);

export const resetPassword = (data: ResetPasswordRequest): Promise<any> =>
  post<any>(ENDPOINTS.auth.resetPassword, data, false);

export const getMe = (): Promise<User> =>
  get<User>(ENDPOINTS.users.me);
