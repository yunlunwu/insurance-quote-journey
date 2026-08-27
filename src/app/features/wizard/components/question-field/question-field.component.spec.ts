import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { QuestionFieldComponent } from './question-field.component';
import { ApiQuestion } from '../../../../core/models/api.model';

function createComponent(question: ApiQuestion, control: FormControl) {
  const fixture = TestBed.createComponent(QuestionFieldComponent);
  fixture.componentRef.setInput('question', question);
  fixture.componentRef.setInput('control', control);
  fixture.detectChanges();
  return fixture;
}

describe('QuestionFieldComponent', () => {
  it('renders every API-provided option for a select question', () => {
    const fixture = createComponent(
      { id: 'occupation', label: 'Occupation', type: 'select', required: true, options: ['Teacher', 'Builder', 'Pilot'] },
      new FormControl(''),
    );

    const optionLabels = fixture.debugElement
      .queryAll(By.css('option'))
      .map((el) => el.nativeElement.textContent.trim());

    expect(optionLabels).toEqual(['Select an option', 'Teacher', 'Builder', 'Pilot']);
  });

  it('renders one radio input per API-provided option', () => {
    const fixture = createComponent(
      {
        id: 'smokedLast12Months',
        label: 'Have you smoked in the last 12 months?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No'],
      },
      new FormControl(''),
    );

    const radios = fixture.debugElement.queryAll(By.css('input[type="radio"]'));
    expect(radios.map((el) => el.nativeElement.value)).toEqual(['Yes', 'No']);
  });

  it(
    'reflects control.touched after markAsTouched (guards against wrapping this in computed(), ' +
      'which would memoize on the first read and never notice later mutations to a FormControl, ' +
      'since touched/invalid live outside the signal graph)',
    () => {
      const control = new FormControl('', Validators.required);
      const fixture = createComponent(
        { id: 'email', label: 'Email Address', type: 'email', required: true },
        control,
      );

      expect(fixture.debugElement.query(By.css('.field__error'))).toBeFalsy();

      control.markAsTouched();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.field__error'))).toBeTruthy();
    },
  );

  it('shows the error once `submitted` becomes true, even if the field was never touched', () => {
    const control = new FormControl('', Validators.required);
    const fixture = createComponent(
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      control,
    );

    expect(fixture.debugElement.query(By.css('.field__error'))).toBeFalsy();

    fixture.componentRef.setInput('submitted', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.field__error'))?.nativeElement.textContent).toContain(
      'Email Address is required.',
    );
  });
});
