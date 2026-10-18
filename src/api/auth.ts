import { api } from './client';
import type { LoginDto, RegisterDto, UserTokenDto } from '../types/api';

// AuthController – /api/auth
export const authApi = {
  login: (dto: LoginDto) => api.post<UserTokenDto>('/auth/login', dto).then((r) => r.data),
  register: (dto: RegisterDto) => api.post<UserTokenDto>('/auth/register', dto).then((r) => r.data),
};
