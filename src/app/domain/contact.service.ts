// domain/contact.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContactDto, ContactUserView, ContactId } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  public apiUrl = 'https://localhost:7091/api/Contact';

  constructor(private http: HttpClient) { }

  getAll(): Observable<ContactUserView> {
    return this.http.get<ContactUserView>(`${this.apiUrl}/GetAll`);
  }

  getById(id: ContactId): Observable<ContactDto> {
    return this.http.get<ContactDto>(`${this.apiUrl}/${String(id)}`);
  }

  create(dto: ContactDto) {
    return this.http.post(`${this.apiUrl}/Create`, dto);
  }

  update(id: ContactId, dto: ContactDto) {
    return this.http.put(`${this.apiUrl}/Update/${String(id)}`, dto);
  }

  delete(id: ContactId) {
    return this.http.delete(`${this.apiUrl}/${String(id)}`);
  }
  uploadPicture(url: string, formData: FormData) {
    return this.http.post(url, formData);
  }
}
