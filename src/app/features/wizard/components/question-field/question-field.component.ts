import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { QuestionDefinition } from '../../../../core/questions/question-definition.model';

@Component({
  selector: 'app-question-field',
  imports: [ReactiveFormsModule],
  templateUrl: './question-field.component.html',
  styleUrl: './question-field.component.css',
})
export class QuestionFieldComponent {
  readonly definition = input.required<QuestionDefinition>();
  readonly control = input.required<FormControl>();
  /** True once the parent page's submit was rejected for validation. */
  readonly submitted = input(false);

  /**
   * Deliberately plain methods, not computed(): FormControl.touched/invalid
   * mutate outside the signal graph (reactive forms predate signals). A
   * computed() would memoize on first read and never notice later status
   * changes. `submitted` is a real signal input, so a failed-submit
   * attempt correctly forces this component's view to be re-checked; a
   * per-field blur is a DOM event on this component's own template, which
   * zoneless change detection already re-checks on its own.
   */
  protected showError(): boolean {
    const control = this.control();
    return control.invalid && (control.touched || control.dirty || this.submitted());
  }

  protected errorMessage(): string {
    const errors = this.control().errors;
    if (!errors) {
      return '';
    }
    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['email']) {
      return 'Enter a valid email address.';
    }
    if (errors['pattern']) {
      return 'Enter a valid phone number.';
    }
    if (errors['min'] || errors['max']) {
      return 'Enter a realistic number.';
    }
    return 'This value is invalid.';
  }
}
