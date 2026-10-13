export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponseData {
  token: string;
  user: User;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}
