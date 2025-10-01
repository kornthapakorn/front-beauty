export interface RefreshToken {
  id: number;
  userId: number;
  token: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
  refreshToken?: RefreshToken;
}

export interface UserDto {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: string; 
}
