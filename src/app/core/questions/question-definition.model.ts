import { ValidatorFn, Validators } from '@angular/forms';
import { AnswerValue } from '../models/wizard.model';

export type QuestionType = 'email' | 'tel' | 'number' | 'select' | 'radio-boolean' | 'text';

export interface SelectOption {
  label: string;
  value: string;
}

export interface QuestionDefinition {
  key: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  options?: SelectOption[];
  validators: ValidatorFn[];
  /** Converts the raw form control value into the value sent to the API. */
  toAnswer?: (raw: unknown) => AnswerValue;
  /** Converts a previously-submitted answer back into a form control value. */
  fromAnswer?: (answer: AnswerValue) => unknown;
}

const PHONE_PATTERN = /^[0-9 ()+-]{8,15}$/;

/**
 * Registry of every question key the API may reference. Keyed lookup keeps
 * QuestionPageComponent generic: it never needs to know about individual
 * fields, only how to render whatever the API's `questions` array names.
 */
export const QUESTION_REGISTRY: Record<string, QuestionDefinition> = {
  email: {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'name@example.com',
    validators: [Validators.required, Validators.email],
  },
  phone: {
    key: 'phone',
    label: 'Phone Number',
    type: 'tel',
    placeholder: '0400 000 000',
    validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
  },
  occupation: {
    key: 'occupation',
    label: 'What is your occupation?',
    type: 'select',
    placeholder: 'Select an option',
    // Not specified by the assessment brief; a reasonable stand-in list.
    options: [
      { label: 'Office / Professional', value: 'office' },
      { label: 'Trade / Manual Labour', value: 'trade' },
      { label: 'Healthcare', value: 'healthcare' },
      { label: 'Education', value: 'education' },
      { label: 'Retail / Hospitality', value: 'retail' },
      { label: 'Other', value: 'other' },
    ],
    validators: [Validators.required],
  },
  smokedLast12Months: {
    key: 'smokedLast12Months',
    label: 'Have you smoked in the last 12 months?',
    type: 'radio-boolean',
    validators: [Validators.required],
    toAnswer: (raw) => raw === 'yes',
    fromAnswer: (answer) => (answer === undefined ? undefined : answer ? 'yes' : 'no'),
  },
  cigarettesPerWeek: {
    key: 'cigarettesPerWeek',
    label: 'How many cigarettes do you smoke per week, on average?',
    type: 'number',
    placeholder: 'e.g. 35',
    validators: [Validators.required, Validators.min(1), Validators.max(500)],
    toAnswer: (raw) => (raw === null || raw === '' ? undefined : Number(raw)),
  },
};

/**
 * Fallback for any question key the API introduces that this build doesn't
 * know about yet: render it as a plain required text field rather than
 * breaking the journey. Keeps the wizard forward-compatible with backend
 * changes that don't ship in lockstep with the frontend.
 */
export function resolveQuestion(key: string): QuestionDefinition {
  return (
    QUESTION_REGISTRY[key] ?? {
      key,
      label: key,
      type: 'text',
      validators: [Validators.required],
    }
  );
}
