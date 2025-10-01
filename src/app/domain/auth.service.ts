import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, RefreshToken } from '../models/auth.model';

const API_URL = 'https://localhost:7091/api/Auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/login`, data);
  }

  checkToken(): Observable<boolean> {
    return this.http.get<boolean>(`${API_URL}/check-token`);
  }

  loginRefresh(data: { refreshToken: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/login-refresh`, data);
  }

  refresh(data: { refreshToken: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/refresh`, data);
  }
}
