import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { QuoteResponse } from '../models/api.model';
import { AnswersMap } from '../models/wizard.model';

@Injectable({ providedIn: 'root' })
export class QuoteApiService {
  private readonly http = inject(HttpClient);

  submitQuote(answers: AnswersMap): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>('/api/quote', { answers });
  }
}
