import { ValidatorFn, Validators } from '@angular/forms';
import { ApiQuestion } from '../models/api.model';

/**
 * Derives validators purely from what the API told us about a question
 * (`required`, `type`). There is deliberately no per-question-id knowledge
 * here (no "if id === 'email'"): the API is self-describing, so the same
 * few rules apply to any question it ever sends, known today or not.
 */
export function validatorsFor(question: ApiQuestion): ValidatorFn[] {
  const validators: ValidatorFn[] = [];

  if (question.required) {
    validators.push(Validators.required);
  }
  if (question.type === 'email') {
    validators.push(Validators.email);
  }
  if (question.type === 'number') {
    validators.push(Validators.min(0));
  }

  return validators;
}
