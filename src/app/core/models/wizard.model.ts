import { ApiPage } from './api.model';

/** A page in the wizard, tagged with a stable id so it survives being
 * appended dynamically (additional questions) without index churn. */
export interface WizardPage extends ApiPage {
  id: string;
}

export type AnswerValue = string | number | boolean | undefined;
export type AnswersMap = Record<string, AnswerValue>;

export type WizardStatus = 'loading' | 'in-progress' | 'submitting' | 'quoted' | 'error';

export type StepState = 'done' | 'current' | 'upcoming';

export interface StepperItem {
  id: string;
  title: string;
  state: StepState;
}
