import { ApplicationResponse, Quote, QuoteResponse } from '../models/api.model';
import { AnswersMap } from '../models/wizard.model';

/** Matches the "Sample GET /application Response" in the assessment brief. */
export const MOCK_APPLICATION_RESPONSE: ApplicationResponse = {
  pages: [
    { title: 'About You', questions: ['email', 'phone', 'occupation'] },
    { title: 'Lifestyle', questions: ['smokedLast12Months'] },
  ],
};

const BASE_PREMIUM = 45;
const OCCUPATION_LOADING: Record<string, number> = {
  trade: 15,
  other: 8,
};
const SMOKER_BASE_LOADING = 12;
const HEAVY_SMOKER_THRESHOLD = 50;
const HEAVY_SMOKER_LOADING = 8;

/**
 * Stands in for the real underwriting/quote engine. Mirrors the brief's
 * behaviour exactly: ask for cigarettesPerWeek once, before any smoker is
 * ever quoted, then always return a quote.
 */
export function evaluateQuote(answers: AnswersMap): QuoteResponse {
  const smoked = answers['smokedLast12Months'] === true;
  const cigarettesAnswered = answers['cigarettesPerWeek'] !== undefined;

  if (smoked && !cigarettesAnswered) {
    return {
      status: 'additionalQuestionsRequired',
      pages: [{ title: 'Smoking Details', questions: ['cigarettesPerWeek'] }],
    };
  }

  return { status: 'quoted', quote: computeQuote(answers) };
}

function computeQuote(answers: AnswersMap): Quote {
  let premium = BASE_PREMIUM;

  const occupation = answers['occupation'];
  if (typeof occupation === 'string' && occupation in OCCUPATION_LOADING) {
    premium += OCCUPATION_LOADING[occupation];
  }

  if (answers['smokedLast12Months'] === true) {
    premium += SMOKER_BASE_LOADING;
    const cigarettesPerWeek = Number(answers['cigarettesPerWeek'] ?? 0);
    if (cigarettesPerWeek > HEAVY_SMOKER_THRESHOLD) {
      premium += HEAVY_SMOKER_LOADING;
    }
  }

  return {
    product: 'Life Protect',
    coverAmount: 500_000,
    premium: Math.round(premium * 100) / 100,
  };
}
