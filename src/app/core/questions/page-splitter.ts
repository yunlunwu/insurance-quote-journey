import { ApiPage } from '../models/api.model';

const YOUR_DETAILS_QUESTION_IDS = new Set(['email', 'phone']);

/**
 * The assessment's wireframe shows "Your Details" (Email, Phone) as its own
 * top-level step, separate from "Application / About You" (Occupation) —
 * but the live API bundles all three into one "About You" page. This splits
 * that single page into two client-side steps to match the wireframe,
 * without the rest of the app needing to know about it: WizardStateService's
 * paging/loop logic, QuestionPageComponent, and QuestionFieldComponent all
 * still just walk whatever flat page list they're given.
 *
 * Deliberately narrow, not a general "split any page" rule: only ever acts
 * on a page id'd "about-you", and only pulls out questions id'd
 * "email"/"phone". Any other page, or an "about-you" page that doesn't have
 * those questions, passes through unchanged — so this degrades safely if
 * the API's shape ever changes instead of producing an empty or broken step.
 */
export function applyYourDetailsSplit(pages: ApiPage[]): ApiPage[] {
  return pages.flatMap((page): ApiPage[] => {
    if (page.id !== 'about-you') {
      return [page];
    }

    const yourDetailsQuestions = page.questions.filter((q) => YOUR_DETAILS_QUESTION_IDS.has(q.id));
    if (yourDetailsQuestions.length === 0) {
      return [page];
    }

    const aboutYouQuestions = page.questions.filter((q) => !YOUR_DETAILS_QUESTION_IDS.has(q.id));
    const yourDetailsPage: ApiPage = {
      id: 'your-details',
      title: 'Your Details',
      questions: yourDetailsQuestions,
    };

    return aboutYouQuestions.length > 0
      ? [yourDetailsPage, { ...page, questions: aboutYouQuestions }]
      : [yourDetailsPage];
  });
}
