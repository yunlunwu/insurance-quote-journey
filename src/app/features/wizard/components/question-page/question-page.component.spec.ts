import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { QuestionPageComponent } from './question-page.component';
import { WizardPage } from '../../../../core/models/wizard.model';
import { AnswersMap } from '../../../../core/models/wizard.model';

const ABOUT_YOU_PAGE: WizardPage = {
  id: 'about-you',
  title: 'About You',
  questions: [
    { id: 'email', label: 'Email Address', type: 'email', required: true },
    {
      id: 'occupation',
      label: 'Occupation',
      type: 'select',
      required: true,
      options: ['Teacher', 'Builder'],
    },
  ],
};

const SMOKING_PAGE: WizardPage = {
  id: 'smoking-details',
  title: 'Smoking Details',
  questions: [
    { id: 'cigarettesPerWeek', label: 'Cigarettes per week', type: 'number', required: true },
  ],
};

function createComponent(page: WizardPage) {
  const fixture = TestBed.createComponent(QuestionPageComponent);
  fixture.componentRef.setInput('page', page);
  fixture.detectChanges();
  return fixture;
}

describe('QuestionPageComponent', () => {
  it('does not emit submitPage when required fields are left empty', () => {
    const fixture = createComponent(ABOUT_YOU_PAGE);
    const emitted: AnswersMap[] = [];
    fixture.componentInstance.submitPage.subscribe((answers) => emitted.push(answers));

    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', {});
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(fixture.debugElement.queryAll(By.css('.field__error')).length).toBeGreaterThan(0);
  });

  it('emits submitPage with the entered values once the form is valid', () => {
    const fixture = createComponent(ABOUT_YOU_PAGE);
    const emitted: AnswersMap[] = [];
    fixture.componentInstance.submitPage.subscribe((answers) => emitted.push(answers));

    fixture.debugElement.query(By.css('#email')).nativeElement.value = 'a@b.com';
    fixture.debugElement.query(By.css('#email')).triggerEventHandler('input', {
      target: { value: 'a@b.com' },
    });
    fixture.debugElement.query(By.css('#occupation')).nativeElement.value = 'Teacher';
    fixture.debugElement.query(By.css('#occupation')).triggerEventHandler('change', {
      target: { value: 'Teacher' },
    });
    fixture.detectChanges();

    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', {});
    fixture.detectChanges();

    expect(emitted).toEqual([{ email: 'a@b.com', occupation: 'Teacher' }]);
  });

  it('converts number-type answers to an actual number, not a string', () => {
    const fixture = createComponent(SMOKING_PAGE);
    const emitted: AnswersMap[] = [];
    fixture.componentInstance.submitPage.subscribe((answers) => emitted.push(answers));

    const input = fixture.debugElement.query(By.css('#cigarettesPerWeek'));
    input.nativeElement.value = '20';
    input.triggerEventHandler('input', { target: { value: '20' } });
    fixture.detectChanges();

    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', {});
    fixture.detectChanges();

    expect(emitted).toEqual([{ cigarettesPerWeek: 20 }]);
    expect(typeof emitted[0]['cigarettesPerWeek']).toBe('number');
  });

  it('rebuilds the form when navigating to a different page', () => {
    const fixture = createComponent(ABOUT_YOU_PAGE);
    fixture.componentRef.setInput('page', SMOKING_PAGE);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#cigarettesPerWeek'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('#email'))).toBeFalsy();
  });
});
