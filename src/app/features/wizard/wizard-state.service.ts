import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ApplicationApiService } from '../../core/services/application-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { ApiErrorResponse, Quote } from '../../core/models/api.model';
import {
  AnswersMap,
  StepperGroup,
  StepperSubStep,
  WizardPage,
  WizardStatus,
} from '../../core/models/wizard.model';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function messageFrom(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorResponse | undefined;
    if (body?.error?.message) {
      return body.error.message;
    }
  }
  return DEFAULT_ERROR_MESSAGE;
}

/**
 * Owns the entire wizard journey: loading the initial page list, walking
 * forward/back through them, accumulating answers, and driving the
 * "submit -> maybe more questions -> submit again" loop against /quote.
 *
 * Pages are stored as a flat, ever-growing list rather than as nested
 * routes because the API can append pages at runtime (additionalQuestions
 * Required) — a static route tree can't express a step count that isn't
 * known until the previous step's answer is submitted. The backend is
 * stateless: every /quote call resubmits the full accumulated answers map,
 * not just the current page's, since the server has no memory of earlier
 * calls.
 */
@Injectable({ providedIn: 'root' })
export class WizardStateService {
  private readonly applicationApi = inject(ApplicationApiService);
  private readonly quoteApi = inject(QuoteApiService);

  private readonly _pages = signal<WizardPage[]>([]);
  private readonly _currentPageIndex = signal(0);
  private readonly _answers = signal<AnswersMap>({});
  private readonly _status = signal<WizardStatus>('loading');
  private readonly _quote = signal<Quote | null>(null);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _applicationTitle = signal<string>('Life Insurance Application');

  readonly pages = this._pages.asReadonly();
  readonly status = this._status.asReadonly();
  readonly quote = this._quote.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly applicationTitle = this._applicationTitle.asReadonly();

  readonly currentPage = computed<WizardPage | undefined>(
    () => this._pages()[this._currentPageIndex()],
  );

  readonly canGoBack = computed(
    () => this._currentPageIndex() > 0 && this._status() === 'in-progress',
  );

  /**
   * Memoized, not a plain method: this is read from a template binding
   * (`[initialAnswers]`) on every change-detection pass. A plain method
   * would allocate a fresh object each time, which looks like a changed
   * input to the child component and re-triggers its form-rebuild effect —
   * wiping any in-progress edits and "touched" state on every unrelated
   * re-render. computed() only recomputes when currentPage or answers
   * actually change, keeping the reference stable in between.
   */
  readonly currentPageAnswers = computed<AnswersMap>(() => {
    const page = this.currentPage();
    if (!page) {
      return {};
    }
    const answers = this._answers();
    return Object.fromEntries(
      page.questions.map((question) => [question.id, answers[question.id]]),
    );
  });

  readonly steps = computed<StepperGroup[]>(() => {
    const currentIndex = this._currentPageIndex();
    const isQuoted = this._status() === 'quoted';

    const children: StepperSubStep[] = this._pages().map((page, index) => ({
      id: page.id,
      title: page.title,
      state: isQuoted || index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    }));

    return [
      { id: 'application', title: 'Application', state: isQuoted ? 'done' : 'current', children },
      { id: 'quote', title: 'Quote', state: isQuoted ? 'done' : 'upcoming', children: [] },
    ];
  });

  loadApplication(): void {
    this._status.set('loading');
    this._errorMessage.set(null);

    this.applicationApi.getApplication().subscribe({
      next: (response) => {
        this._applicationTitle.set(response.title);
        this._pages.set(response.pages);
        this._currentPageIndex.set(0);
        this._status.set('in-progress');
      },
      error: (error) => {
        this._status.set('error');
        this._errorMessage.set(messageFrom(error));
      },
    });
  }

  goBack(): void {
    if (!this.canGoBack()) {
      return;
    }
    this._currentPageIndex.update((index) => index - 1);
  }

  submitCurrentPage(pageAnswers: AnswersMap): void {
    const mergedAnswers = { ...this._answers(), ...pageAnswers };
    this._answers.set(mergedAnswers);

    const isLastPage = this._currentPageIndex() === this._pages().length - 1;
    if (!isLastPage) {
      this._currentPageIndex.update((index) => index + 1);
      return;
    }

    this._status.set('submitting');
    this._errorMessage.set(null);

    this.quoteApi.submitQuote(mergedAnswers).subscribe({
      next: (response) => {
        if (response.status === 'quoted' && response.quote) {
          this._quote.set(response.quote);
          this._status.set('quoted');
          return;
        }

        this._pages.update((pages) => [...pages, ...(response.pages ?? [])]);
        this._currentPageIndex.update((index) => index + 1);
        this._status.set('in-progress');
      },
      error: (error) => {
        this._status.set('error');
        this._errorMessage.set(messageFrom(error));
      },
    });
  }

  retry(): void {
    if (this._pages().length === 0) {
      this.loadApplication();
      return;
    }
    this._status.set('in-progress');
  }
}
