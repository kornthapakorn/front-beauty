import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormSubmitDto, FormSubmitCreateDto, FormComponentTemplateDto } from '../models/form.model';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private apiUrl = 'https://localhost:7091/api/Form';

  constructor(private http: HttpClient) {}

  create(formTemplateId: number, dto: FormSubmitCreateDto): Observable<FormSubmitDto> {
    return this.http.post<FormSubmitDto>(`${this.apiUrl}/create/${formTemplateId}`, dto);
  }

  submit(dto: FormSubmitDto): Observable<FormSubmitDto> {
    return this.http.post<FormSubmitDto>(`${this.apiUrl}/submit`, dto);
  }

  getById(formId: number): Observable<FormSubmitDto> {
    return this.http.get<FormSubmitDto>(`${this.apiUrl}/${formId}`);
  }

  getTemplate(formTemplateId: number): Observable<FormComponentTemplateDto[]> {
    return this.http.get<FormComponentTemplateDto[]>(`${this.apiUrl}/template/${formTemplateId}`);
  }
}
