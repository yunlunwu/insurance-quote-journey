import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApplicationResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ApplicationApiService {
  private readonly http = inject(HttpClient);

  getApplication(): Observable<ApplicationResponse> {
    return this.http.get<ApplicationResponse>('/api/application');
  }
}
