export type Role = 'CITIZEN' | 'ADMIN' | 'AGENT' | 'TECHNICIAN';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface User extends UserSummary {
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserSummary;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}
