import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryCreateDto } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'https://localhost:7091/api/Category';

  constructor(private http: HttpClient) {}

  // GET /api/Category/GetAll
  getAll(): Observable<CategoryCreateDto[]> {
    return this.http.get<CategoryCreateDto[]>(`${this.apiUrl}/GetAll`);
  }

  // GET /api/Category/{id}
  getById(id: number): Observable<CategoryCreateDto> {
    return this.http.get<CategoryCreateDto>(`${this.apiUrl}/${id}`);
  }

  // POST /api/Category/Create
  create(dto: CategoryCreateDto): Observable<CategoryCreateDto> {
    return this.http.post<CategoryCreateDto>(`${this.apiUrl}/Create`, dto);
  }

  // PUT /api/Category/Update
  update(dto: CategoryCreateDto): Observable<CategoryCreateDto> {
    return this.http.put<CategoryCreateDto>(`${this.apiUrl}/Update`, dto);
  }

  // DELETE /api/Category/{id}
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
