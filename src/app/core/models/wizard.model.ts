import { ApiPage } from './api.model';

/** Pages already carry a stable `id` from the API, so no client-side id
 * synthesis is needed even when new pages are appended mid-journey. */
export type WizardPage = ApiPage;

export type AnswerValue = string | number;
export type AnswersMap = Record<string, AnswerValue>;

export type WizardStatus = 'loading' | 'in-progress' | 'submitting' | 'quoted' | 'error';

export type StepState = 'done' | 'current' | 'upcoming';

export interface StepperItem {
  id: string;
  title: string;
  state: StepState;
}
