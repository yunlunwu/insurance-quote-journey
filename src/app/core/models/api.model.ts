/**
 * Shapes returned by the live backend:
 * GET /application and POST /quote. Every question is fully self-describing
 * (label, type, required, options) — the frontend never needs to know what
 * "occupation" or "cigarettesPerWeek" mean, only how to render each `type`.
 */

export type ApiQuestionType = 'email' | 'text' | 'number' | 'select' | 'radio';

export interface ApiQuestion {
  id: string;
  label: string;
  type: ApiQuestionType;
  required: boolean;
  options?: string[];
}

export interface ApiPage {
  id: string;
  title: string;
  questions: ApiQuestion[];
}

export interface ApplicationResponse {
  id: string;
  title: string;
  pages: ApiPage[];
}

export type QuoteStatus = 'additionalQuestionsRequired' | 'quoted';

export interface Quote {
  product: string;
  coverAmount: number;
  premium: number;
}

export interface QuoteResponse {
  status: QuoteStatus;
  pages?: ApiPage[];
  quote?: Quote;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
