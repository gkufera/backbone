import { request } from './client';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    emailNotificationsEnabled: boolean;
    createdAt: string;
  };
}

export const authApi = {
  signup(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login(data: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  me(): Promise<{ user: AuthResponse['user'] }> {
    return request<{ user: AuthResponse['user'] }>('/api/auth/me');
  },

  forgotPassword(email: string): Promise<{ message: string; emailSent: boolean }> {
    return request<{ message: string; emailSent: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  verifyEmail(token: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  resendVerification(email: string): Promise<{ message: string; emailSent: boolean }> {
    return request<{ message: string; emailSent: boolean }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  updateMe(data: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
    emailNotificationsEnabled?: boolean;
  }): Promise<{ user: AuthResponse['user'] }> {
    return request<{ user: AuthResponse['user'] }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  logout(): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  },
};
