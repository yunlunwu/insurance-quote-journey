import { ApiPage } from './api.model';

/** Pages already carry a stable `id` from the API, so no client-side id
 * synthesis is needed even when new pages are appended mid-journey. */
export type WizardPage = ApiPage;

export type AnswerValue = string | number;
export type AnswersMap = Record<string, AnswerValue>;

export type WizardStatus = 'loading' | 'in-progress' | 'submitting' | 'quoted' | 'error';

export type StepState = 'done' | 'current' | 'upcoming';

/** A leaf page within the "Application" group (About You, Lifestyle, and
 * any pages appended later, e.g. Smoking Details). */
export interface StepperSubStep {
  id: string;
  title: string;
  state: StepState;
}

/** Top-level stepper entries. Only "Application" has children — its
 * sub-steps are whatever pages the API's `pages` array currently holds, so
 * the group grows live if `POST /quote` appends a follow-up question. */
export interface StepperGroup {
  id: string;
  title: string;
  state: StepState;
  children: StepperSubStep[];
}
