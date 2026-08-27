import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of } from 'rxjs';
import { AnswersMap } from '../models/wizard.model';
import { evaluateQuote, MOCK_APPLICATION_RESPONSE } from './mock-application-data';

const SIMULATED_LATENCY_MS = 400;

/**
 * There is no real backend for this assessment. This interceptor stands in
 * for the two endpoints in the brief (GET /application, POST /quote) so the
 * app is fully self-contained and runnable with `npm start`. Swapping it out
 * for a real API later only means removing this provider — every consumer
 * talks to ApplicationApiService / QuoteApiService, never to this file.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'GET' && req.url.endsWith('/api/application')) {
    return of(new HttpResponse({ status: 200, body: MOCK_APPLICATION_RESPONSE })).pipe(
      delay(SIMULATED_LATENCY_MS),
    );
  }

  if (req.method === 'POST' && req.url.endsWith('/api/quote')) {
    const answers = req.body as AnswersMap;
    return of(new HttpResponse({ status: 200, body: evaluateQuote(answers) })).pipe(
      delay(SIMULATED_LATENCY_MS),
    );
  }

  return next(req);
};
