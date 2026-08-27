import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { validatorsFor } from './question-validators';
import { ApiQuestion } from '../models/api.model';

function question(overrides: Partial<ApiQuestion>): ApiQuestion {
  return { id: 'q', label: 'Q', type: 'text', required: false, ...overrides };
}

describe('validatorsFor', () => {
  it('adds no validators for an optional plain-text question', () => {
    const control = new FormControl('', validatorsFor(question({ required: false })));
    expect(control.valid).toBe(true);
  });

  it('adds a required validator when the question is required', () => {
    const control = new FormControl('', validatorsFor(question({ required: true })));
    expect(control.hasError('required')).toBe(true);

    control.setValue('anything');
    expect(control.valid).toBe(true);
  });

  it('adds an email-format validator for type "email"', () => {
    const control = new FormControl('not-an-email', validatorsFor(question({ type: 'email', required: true })));
    expect(control.hasError('email')).toBe(true);

    control.setValue('valid@example.com');
    expect(control.valid).toBe(true);
  });

  it('adds a min(0) validator for type "number"', () => {
    const control = new FormControl(-5, validatorsFor(question({ type: 'number', required: true })));
    expect(control.hasError('min')).toBe(true);

    control.setValue(5);
    expect(control.valid).toBe(true);
  });

  it('does not add a format validator for "text" (e.g. phone) beyond required', () => {
    const control = new FormControl('anything at all', validatorsFor(question({ type: 'text', required: true })));
    expect(control.valid).toBe(true);
  });

  it('does not add a format validator for "select"/"radio" beyond required', () => {
    const selectControl = new FormControl('Teacher', validatorsFor(question({ type: 'select', required: true })));
    const radioControl = new FormControl('Yes', validatorsFor(question({ type: 'radio', required: true })));
    expect(selectControl.valid).toBe(true);
    expect(radioControl.valid).toBe(true);
  });
});
