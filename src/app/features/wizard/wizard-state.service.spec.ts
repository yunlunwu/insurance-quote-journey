import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { of, throwError } from 'rxjs';
import { WizardStateService } from './wizard-state.service';
import { ApplicationApiService } from '../../core/services/application-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { ApplicationResponse, QuoteResponse } from '../../core/models/api.model';

const APPLICATION_RESPONSE: ApplicationResponse = {
  pages: [
    { title: 'About You', questions: ['email', 'phone', 'occupation'] },
    { title: 'Lifestyle', questions: ['smokedLast12Months'] },
  ],
};

function setup(quoteResponses: QuoteResponse[]) {
  let callIndex = 0;
  const quoteApiStub = {
    submitQuote: () => of(quoteResponses[Math.min(callIndex++, quoteResponses.length - 1)]),
  };
  const applicationApiStub = {
    getApplication: () => of(APPLICATION_RESPONSE),
  };

  TestBed.configureTestingModule({
    providers: [
      WizardStateService,
      { provide: ApplicationApiService, useValue: applicationApiStub },
      { provide: QuoteApiService, useValue: quoteApiStub },
    ],
  });

  return TestBed.inject(WizardStateService);
}

describe('WizardStateService', () => {
  it('loads pages from the application API and starts in-progress', () => {
    const wizard = setup([]);
    wizard.loadApplication();

    expect(wizard.status()).toBe('in-progress');
    expect(wizard.pages().map((p) => p.title)).toEqual(['About You', 'Lifestyle']);
    expect(wizard.currentPage()?.title).toBe('About You');
  });

  it('advances to the next page without calling the quote API until the last page', () => {
    const wizard = setup([{ status: 'quoted', quote: { product: 'x', coverAmount: 1, premium: 1 } }]);
    wizard.loadApplication();

    wizard.submitCurrentPage({ email: 'a@b.com', phone: '123', occupation: 'office' });

    expect(wizard.status()).toBe('in-progress');
    expect(wizard.currentPage()?.title).toBe('Lifestyle');
  });

  it('appends new pages when the API asks additional questions, looping until quoted', () => {
    const wizard = setup([
      {
        status: 'additionalQuestionsRequired',
        pages: [{ title: 'Smoking Details', questions: ['cigarettesPerWeek'] }],
      },
      { status: 'quoted', quote: { product: 'Life Protect', coverAmount: 500000, premium: 60 } },
    ]);
    wizard.loadApplication();

    wizard.submitCurrentPage({ email: 'a@b.com', phone: '123', occupation: 'office' });
    wizard.submitCurrentPage({ smokedLast12Months: true });

    expect(wizard.status()).toBe('in-progress');
    expect(wizard.currentPage()?.title).toBe('Smoking Details');

    wizard.submitCurrentPage({ cigarettesPerWeek: 20 });

    expect(wizard.status()).toBe('quoted');
    expect(wizard.quote()).toEqual({ product: 'Life Protect', coverAmount: 500000, premium: 60 });
  });

  it('goBack moves to the previous page and preserves already-entered answers', () => {
    const wizard = setup([{ status: 'quoted', quote: { product: 'x', coverAmount: 1, premium: 1 } }]);
    wizard.loadApplication();

    wizard.submitCurrentPage({ email: 'a@b.com', phone: '123', occupation: 'office' });
    wizard.goBack();

    expect(wizard.currentPage()?.title).toBe('About You');
    expect(wizard.currentPageAnswers()).toEqual({
      email: 'a@b.com',
      phone: '123',
      occupation: 'office',
    });
  });

  it('cannot go back from the first page', () => {
    const wizard = setup([]);
    wizard.loadApplication();

    expect(wizard.canGoBack()).toBe(false);
    wizard.goBack();
    expect(wizard.currentPage()?.title).toBe('About You');
  });

  it('surfaces an error state when the application fails to load', () => {
    TestBed.configureTestingModule({
      providers: [
        WizardStateService,
        {
          provide: ApplicationApiService,
          useValue: { getApplication: () => throwError(() => new Error('network down')) },
        },
        { provide: QuoteApiService, useValue: { submitQuote: () => of({ status: 'quoted' }) } },
      ],
    });
    const wizard = TestBed.inject(WizardStateService);

    wizard.loadApplication();

    expect(wizard.status()).toBe('error');
    expect(wizard.errorMessage()).toBeTruthy();
  });
});
