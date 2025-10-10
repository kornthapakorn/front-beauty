import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EventpService {
  private readonly apiUrl = 'https://localhost:7091/api/Eventp';

  constructor(private http: HttpClient) {}

  createFull(form: FormData): Observable<{ eventId: number }> {
    return this.http.post<{ eventId: number }>(`${this.apiUrl}/create-full`, form);
    // form ต้องมี field: eventDto (JSON string) + รูปไฟล์ตาม key
  }
}
