import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { of, throwError } from 'rxjs';
import { WizardStateService } from './wizard-state.service';
import { ApplicationApiService } from '../../core/services/application-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { ApplicationResponse, QuoteResponse } from '../../core/models/api.model';

// The live API bundles email/phone/occupation into one "About You" page;
// applyYourDetailsSplit() (exercised for real here, not stubbed) turns that
// into "Your Details" -> "About You" -> "Lifestyle" to match the wireframe.
const APPLICATION_RESPONSE: ApplicationResponse = {
  id: '1',
  title: 'Life Insurance Application',
  pages: [
    {
      id: 'about-you',
      title: 'About You',
      questions: [
        { id: 'email', label: 'Email Address', type: 'email', required: true },
        { id: 'phone', label: 'Phone Number', type: 'text', required: true },
        {
          id: 'occupation',
          label: 'Occupation',
          type: 'select',
          required: true,
          options: ['Accountant', 'Teacher', 'Builder', 'Pilot', 'Other'],
        },
      ],
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      questions: [
        {
          id: 'smokedLast12Months',
          label: 'Have you smoked in the last 12 months?',
          type: 'radio',
          required: true,
          options: ['Yes', 'No'],
        },
      ],
    },
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

/** Walks "Your Details" then "About You", landing on "Lifestyle". */
function completeYourDetailsAndAboutYou(wizard: WizardStateService): void {
  wizard.submitCurrentPage({ email: 'a@b.com', phone: '123' });
  wizard.submitCurrentPage({ occupation: 'Teacher' });
}

describe('WizardStateService', () => {
  it('loads pages and the application title, with "Your Details" split out as its own first page', () => {
    const wizard = setup([]);
    wizard.loadApplication();

    expect(wizard.status()).toBe('in-progress');
    expect(wizard.applicationTitle()).toBe('Life Insurance Application');
    expect(wizard.pages().map((p) => p.title)).toEqual(['Your Details', 'About You', 'Lifestyle']);
    expect(wizard.currentPage()?.title).toBe('Your Details');
  });

  it('advances page by page without calling the quote API until the last page', () => {
    const wizard = setup([{ status: 'quoted', quote: { product: 'x', coverAmount: 1, premium: 1 } }]);
    wizard.loadApplication();

    wizard.submitCurrentPage({ email: 'a@b.com', phone: '123' });
    expect(wizard.status()).toBe('in-progress');
    expect(wizard.currentPage()?.title).toBe('About You');

    wizard.submitCurrentPage({ occupation: 'Teacher' });
    expect(wizard.status()).toBe('in-progress');
    expect(wizard.currentPage()?.title).toBe('Lifestyle');
  });

  it('appends new pages when the API asks additional questions, looping until quoted', () => {
    const wizard = setup([
      {
        status: 'additionalQuestionsRequired',
        pages: [
          {
            id: 'smoking-details',
            title: 'Smoking Details',
            questions: [
              {
                id: 'cigarettesPerWeek',
                label: 'How many cigarettes do you smoke each week?',
                type: 'number',
                required: true,
              },
            ],
          },
        ],
      },
      { status: 'quoted', quote: { product: 'Life Protect', coverAmount: 500000, premium: 104.75 } },
    ]);
    wizard.loadApplication();

    completeYourDetailsAndAboutYou(wizard);
    wizard.submitCurrentPage({ smokedLast12Months: 'Yes' });

    expect(wizard.status()).toBe('in-progress');
    expect(wizard.currentPage()?.title).toBe('Smoking Details');

    wizard.submitCurrentPage({ cigarettesPerWeek: 20 });

    expect(wizard.status()).toBe('quoted');
    expect(wizard.quote()).toEqual({ product: 'Life Protect', coverAmount: 500000, premium: 104.75 });
  });

  it('goBack moves to the previous page and preserves already-entered answers', () => {
    const wizard = setup([{ status: 'quoted', quote: { product: 'x', coverAmount: 1, premium: 1 } }]);
    wizard.loadApplication();

    wizard.submitCurrentPage({ email: 'a@b.com', phone: '123' });
    wizard.submitCurrentPage({ occupation: 'Teacher' });
    wizard.goBack();

    expect(wizard.currentPage()?.title).toBe('About You');
    expect(wizard.currentPageAnswers()).toEqual({ occupation: 'Teacher' });

    wizard.goBack();
    expect(wizard.currentPage()?.title).toBe('Your Details');
    expect(wizard.currentPageAnswers()).toEqual({ email: 'a@b.com', phone: '123' });
  });

  it('cannot go back from the first page', () => {
    const wizard = setup([]);
    wizard.loadApplication();

    expect(wizard.canGoBack()).toBe(false);
    wizard.goBack();
    expect(wizard.currentPage()?.title).toBe('Your Details');
  });

  it(
    'keeps currentPageAnswers referentially stable across repeated reads when nothing changed ' +
      '(regression: a fresh object here looks like a changed @Input to the child form and ' +
      'silently wipes in-progress edits/touched state on every unrelated re-render)',
    () => {
      const wizard = setup([]);
      wizard.loadApplication();

      const first = wizard.currentPageAnswers();
      const second = wizard.currentPageAnswers();

      expect(first).toBe(second);
    },
  );

  it('surfaces the API-provided error message when the application fails to load', () => {
    TestBed.configureTestingModule({
      providers: [
        WizardStateService,
        {
          provide: ApplicationApiService,
          useValue: {
            getApplication: () =>
              throwError(
                () =>
                  new HttpErrorResponse({
                    status: 500,
                    error: { status: 'error', error: { code: 'INTERNAL', message: 'Server is down.' } },
                  }),
              ),
          },
        },
        { provide: QuoteApiService, useValue: { submitQuote: () => of({ status: 'quoted' }) } },
      ],
    });
    const wizard = TestBed.inject(WizardStateService);

    wizard.loadApplication();

    expect(wizard.status()).toBe('error');
    expect(wizard.errorMessage()).toBe('Server is down.');
  });

  it('surfaces the API-provided error message when submitting the quote fails, without losing entered answers', () => {
    TestBed.configureTestingModule({
      providers: [
        WizardStateService,
        { provide: ApplicationApiService, useValue: { getApplication: () => of(APPLICATION_RESPONSE) } },
        {
          provide: QuoteApiService,
          useValue: {
            submitQuote: () =>
              throwError(
                () =>
                  new HttpErrorResponse({
                    status: 400,
                    error: {
                      status: 'error',
                      error: { code: 'INVALID_REQUEST', message: 'Smoking answer must be either "Yes" or "No".' },
                    },
                  }),
              ),
          },
        },
      ],
    });
    const wizard = TestBed.inject(WizardStateService);
    wizard.loadApplication();

    completeYourDetailsAndAboutYou(wizard);
    wizard.submitCurrentPage({ smokedLast12Months: 'maybe' });

    expect(wizard.status()).toBe('error');
    expect(wizard.errorMessage()).toBe('Smoking answer must be either "Yes" or "No".');
  });

  it('retry() re-fetches the application if it never loaded, otherwise just clears the error', () => {
    let calls = 0;
    TestBed.configureTestingModule({
      providers: [
        WizardStateService,
        {
          provide: ApplicationApiService,
          useValue: {
            getApplication: () => {
              calls++;
              return calls === 1
                ? throwError(() => new HttpErrorResponse({ status: 500 }))
                : of(APPLICATION_RESPONSE);
            },
          },
        },
        { provide: QuoteApiService, useValue: { submitQuote: () => of({ status: 'quoted' }) } },
      ],
    });
    const wizard = TestBed.inject(WizardStateService);

    wizard.loadApplication();
    expect(wizard.status()).toBe('error');

    wizard.retry();
    expect(calls).toBe(2);
    expect(wizard.status()).toBe('in-progress');
  });

  it('loops through multiple consecutive additionalQuestionsRequired rounds before quoting', () => {
    const wizard = setup([
      {
        status: 'additionalQuestionsRequired',
        pages: [
          {
            id: 'smoking-details',
            title: 'Smoking Details',
            questions: [
              { id: 'cigarettesPerWeek', label: 'Cigarettes per week', type: 'number', required: true },
            ],
          },
        ],
      },
      {
        status: 'additionalQuestionsRequired',
        pages: [
          {
            id: 'medical-history',
            title: 'Medical History',
            questions: [{ id: 'hasCondition', label: 'Any conditions?', type: 'radio', required: true, options: ['Yes', 'No'] }],
          },
        ],
      },
      { status: 'quoted', quote: { product: 'Life Protect', coverAmount: 500000, premium: 150 } },
    ]);
    wizard.loadApplication();

    completeYourDetailsAndAboutYou(wizard);
    wizard.submitCurrentPage({ smokedLast12Months: 'Yes' });
    expect(wizard.currentPage()?.title).toBe('Smoking Details');

    wizard.submitCurrentPage({ cigarettesPerWeek: 20 });
    expect(wizard.status()).toBe('in-progress');
    expect(wizard.currentPage()?.title).toBe('Medical History');

    wizard.submitCurrentPage({ hasCondition: 'No' });
    expect(wizard.status()).toBe('quoted');
    expect(wizard.quote()?.premium).toBe(150);
  });

  it('steps() shows "Your Details" as its own top-level step, ahead of the "Application" group', () => {
    const wizard = setup([]);
    wizard.loadApplication();

    const [yourDetails, application, quote] = wizard.steps();
    expect(yourDetails.id).toBe('your-details');
    expect(yourDetails.state).toBe('current');
    expect(yourDetails.children).toEqual([]);
    expect(application.state).toBe('upcoming');
    expect(quote.state).toBe('upcoming');

    wizard.submitCurrentPage({ email: 'a@b.com', phone: '123' });

    const stepsAfter = wizard.steps();
    expect(stepsAfter[0].state).toBe('done');
    expect(stepsAfter[1].id).toBe('application');
    expect(stepsAfter[1].state).toBe('current');
    expect(stepsAfter[1].children.map((c) => [c.id, c.state])).toEqual([
      ['about-you', 'current'],
      ['lifestyle', 'upcoming'],
    ]);
  });
});
