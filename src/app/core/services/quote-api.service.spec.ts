import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QuoteApiService } from './quote-api.service';

describe('QuoteApiService', () => {
  let service: QuoteApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuoteApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(QuoteApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs to /api/quote with the answers wrapped in an "answers" property', () => {
    service.submitQuote({ email: 'a@b.com', smokedLast12Months: 'No' }).subscribe();

    const req = httpMock.expectOne('/api/quote');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      answers: { email: 'a@b.com', smokedLast12Months: 'No' },
    });

    req.flush({ status: 'quoted', quote: { product: 'x', coverAmount: 1, premium: 1 } });
  });
});
