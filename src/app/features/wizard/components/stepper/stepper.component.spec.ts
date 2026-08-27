import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { StepperComponent } from './stepper.component';
import { StepperGroup } from '../../../../core/models/wizard.model';

function createComponent(groups: StepperGroup[]) {
  const fixture = TestBed.createComponent(StepperComponent);
  fixture.componentRef.setInput('groups', groups);
  fixture.detectChanges();
  return fixture;
}

describe('StepperComponent', () => {
  it('renders each top-level group title and its sub-steps', () => {
    const fixture = createComponent([
      {
        id: 'application',
        title: 'Application',
        state: 'current',
        children: [
          { id: 'about-you', title: 'About You', state: 'current' },
          { id: 'lifestyle', title: 'Lifestyle', state: 'upcoming' },
        ],
      },
      { id: 'quote', title: 'Quote', state: 'upcoming', children: [] },
    ]);

    const groupTitles = fixture.debugElement
      .queryAll(By.css('.group__title'))
      .map((el) => el.nativeElement.textContent.trim());
    expect(groupTitles).toEqual(['Application', 'Quote']);

    const subStepTitles = fixture.debugElement
      .queryAll(By.css('.substep__title'))
      .map((el) => el.nativeElement.textContent.trim());
    expect(subStepTitles).toEqual(['About You', 'Lifestyle']);
  });

  it('shows a checkmark for a done group and a number for one that is not done', () => {
    const fixture = createComponent([
      { id: 'application', title: 'Application', state: 'done', children: [] },
      { id: 'quote', title: 'Quote', state: 'current', children: [] },
    ]);

    const markers = fixture.debugElement.queryAll(By.css('.group__marker'));
    expect(markers[0].query(By.css('svg'))).toBeTruthy(); // done -> checkmark icon
    expect(markers[1].nativeElement.textContent.trim()).toBe('2'); // not done -> step number

    expect(markers[0].nativeElement.classList).toContain('group__marker--done');
    expect(markers[1].nativeElement.classList).toContain('group__marker--current');
  });

  it('highlights the current sub-step and does not highlight upcoming/done ones', () => {
    const fixture = createComponent([
      {
        id: 'application',
        title: 'Application',
        state: 'current',
        children: [
          { id: 'about-you', title: 'About You', state: 'done' },
          { id: 'lifestyle', title: 'Lifestyle', state: 'current' },
        ],
      },
      { id: 'quote', title: 'Quote', state: 'upcoming', children: [] },
    ]);

    const substeps = fixture.debugElement.queryAll(By.css('.substep'));
    expect(substeps[0].nativeElement.classList).not.toContain('substep--current');
    expect(substeps[1].nativeElement.classList).toContain('substep--current');
  });

  it('renders no sub-step list for a group with no children', () => {
    const fixture = createComponent([
      { id: 'quote', title: 'Quote', state: 'upcoming', children: [] },
    ]);

    expect(fixture.debugElement.query(By.css('.substeps'))).toBeFalsy();
  });
});
