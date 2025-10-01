import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventDto, EventCreateDto } from '../models/event.model';

@Injectable({
    providedIn: 'root'
})
export class EventService {
    private apiUrl = 'https://localhost:7091/api/Event';

    constructor(private http: HttpClient) { }

    // GET /api/Event/GetAll
    getAll(): Observable<EventDto[]> {
        return this.http.get<EventDto[]>(`${this.apiUrl}/GetAll`);
    }

    // GET /api/Event/{id}
    getById(id: number): Observable<EventDto> {
        return this.http.get<EventDto>(`${this.apiUrl}/${id}`);
    }

    // POST /api/Event/Create
    create(dto: EventCreateDto): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.apiUrl}/Create`, dto);
    }

    // POST /api/Event/Duplicate/{id}
    duplicate(id: number): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.apiUrl}/Duplicate/${id}`, {});
    }

    // PUT /api/Event/{id}
    update(id: number, dto: EventCreateDto): Observable<EventDto> {
        return this.http.put<EventDto>(`${this.apiUrl}/${id}`, dto);
    }

    // DELETE /api/Event/{id}
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
