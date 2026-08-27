import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApplicationApiService } from './application-api.service';

describe('ApplicationApiService', () => {
  let service: ApplicationApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApplicationApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApplicationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/application', () => {
    service.getApplication().subscribe();

    const req = httpMock.expectOne('/api/application');
    expect(req.request.method).toBe('GET');

    req.flush({ id: '1', title: 'Life Insurance Application', pages: [] });
  });
});
