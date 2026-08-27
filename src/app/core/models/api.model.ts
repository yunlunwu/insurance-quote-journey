/**
 * Shapes returned by the backend, per the assessment spec:
 * GET /application and POST /quote.
 */

export interface ApiPage {
  title: string;
  questions: string[];
}

export interface ApplicationResponse {
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
