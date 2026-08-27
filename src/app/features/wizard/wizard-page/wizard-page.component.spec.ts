import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { WizardPageComponent } from './wizard-page.component';
import { ApplicationApiService } from '../../../core/services/application-api.service';
import { QuoteApiService } from '../../../core/services/quote-api.service';
import { ApplicationResponse, QuoteResponse } from '../../../core/models/api.model';

// "about-you" bundles email/phone/occupation, same as the live API — the
// component tree under test applies applyYourDetailsSplit() for real, so the
// actual journey is Your Details -> About You -> Lifestyle -> (...) -> Quote.
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
          options: ['Teacher', 'Builder'],
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

function createComponent(quoteResponses: QuoteResponse[]) {
  let callIndex = 0;
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ApplicationApiService,
        useValue: { getApplication: () => of(APPLICATION_RESPONSE) },
      },
      {
        provide: QuoteApiService,
        useValue: {
          submitQuote: () => of(quoteResponses[Math.min(callIndex++, quoteResponses.length - 1)]),
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(WizardPageComponent);
  fixture.detectChanges(); // triggers ngOnInit -> loadApplication
  return fixture;
}

function setValue(fixture: ReturnType<typeof createComponent>, selector: string, value: string) {
  const el = fixture.debugElement.query(By.css(selector)).nativeElement;
  el.value = value;
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
}

function submit(fixture: ReturnType<typeof createComponent>) {
  fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', {});
  fixture.detectChanges();
}

function pageTitle(fixture: ReturnType<typeof createComponent>): string {
  return fixture.debugElement.query(By.css('.page__title')).nativeElement.textContent;
}

/** Fills and submits "Your Details" then "About You", landing on "Lifestyle". */
function completeYourDetailsAndAboutYou(fixture: ReturnType<typeof createComponent>): void {
  expect(pageTitle(fixture)).toBe('Your Details');
  setValue(fixture, '#email', 'a@b.com');
  setValue(fixture, '#phone', '0400000000');
  submit(fixture);

  expect(pageTitle(fixture)).toBe('About You');
  setValue(fixture, '#occupation', 'Teacher');
  submit(fixture);

  expect(pageTitle(fixture)).toBe('Lifestyle');
}

describe('WizardPageComponent (integration)', () => {
  it('walks the full non-smoker journey through to a quote', () => {
    const fixture = createComponent([
      { status: 'quoted', quote: { product: 'Life Protect', coverAmount: 500000, premium: 64.85 } },
    ]);

    completeYourDetailsAndAboutYou(fixture);

    fixture.debugElement
      .query(By.css('.radio-group#smokedLast12Months input[value="No"]'))
      .nativeElement.click();
    fixture.detectChanges();
    submit(fixture);

    expect(fixture.debugElement.query(By.css('.quote__product')).nativeElement.textContent).toBe(
      'Life Protect',
    );
  });

  it('renders the additional-question loop before showing a quote', () => {
    const fixture = createComponent([
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
      { status: 'quoted', quote: { product: 'Life Protect', coverAmount: 500000, premium: 104.75 } },
    ]);

    completeYourDetailsAndAboutYou(fixture);

    fixture.debugElement
      .query(By.css('.radio-group#smokedLast12Months input[value="Yes"]'))
      .nativeElement.click();
    submit(fixture);

    expect(pageTitle(fixture)).toBe('Smoking Details');

    setValue(fixture, '#cigarettesPerWeek', '20');
    submit(fixture);

    expect(fixture.debugElement.query(By.css('.quote__product'))).toBeTruthy();
  });

  it('shows an error state with a working retry button when loading the application fails', () => {
    let attempt = 0;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ApplicationApiService,
          useValue: {
            getApplication: () =>
              attempt++ === 0
                ? throwError(
                    () =>
                      new HttpErrorResponse({
                        status: 500,
                        error: { status: 'error', error: { code: 'INTERNAL', message: 'Server is down.' } },
                      }),
                  )
                : of(APPLICATION_RESPONSE),
          },
        },
        { provide: QuoteApiService, useValue: { submitQuote: () => of({ status: 'quoted' }) } },
      ],
    });

    const fixture = TestBed.createComponent(WizardPageComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.state-message--error')).nativeElement.textContent).toBe(
      'Server is down.',
    );

    fixture.debugElement.query(By.css('.state-message--error + button')).nativeElement.click();
    fixture.detectChanges();

    expect(pageTitle(fixture)).toBe('Your Details');
  });
});
