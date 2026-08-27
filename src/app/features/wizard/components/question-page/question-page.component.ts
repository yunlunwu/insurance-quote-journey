import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiQuestion } from '../../../../core/models/api.model';
import { AnswersMap, WizardPage } from '../../../../core/models/wizard.model';
import { validatorsFor } from '../../../../core/questions/question-validators';
import { QuestionFieldComponent } from '../question-field/question-field.component';

interface RenderableField {
  question: ApiQuestion;
  control: FormControl;
}

@Component({
  selector: 'app-question-page',
  imports: [ReactiveFormsModule, QuestionFieldComponent],
  templateUrl: './question-page.component.html',
  styleUrl: './question-page.component.css',
})
export class QuestionPageComponent {
  private readonly fb = inject(FormBuilder);

  readonly page = input.required<WizardPage>();
  readonly initialAnswers = input<AnswersMap>({});
  readonly submitting = input(false);
  readonly canGoBack = input(false);

  readonly submitPage = output<AnswersMap>();
  readonly back = output<void>();

  protected readonly form = signal<FormGroup>(this.fb.group({}));
  protected readonly submitAttempted = signal(false);

  protected readonly fields = computed<RenderableField[]>(() => {
    const group = this.form();
    return this.page().questions.map((question) => ({
      question,
      control: group.get(question.id) as FormControl,
    }));
  });

  constructor() {
    effect(() => {
      const page = this.page();
      const answers = this.initialAnswers();

      const controlsConfig: Record<string, FormControl> = {};
      for (const question of page.questions) {
        controlsConfig[question.id] = this.fb.control(
          answers[question.id] ?? '',
          validatorsFor(question),
        );
      }

      this.form.set(this.fb.group(controlsConfig));
      this.submitAttempted.set(false);
    });
  }

  protected onSubmit(): void {
    const group = this.form();
    if (group.invalid) {
      group.markAllAsTouched();
      this.submitAttempted.set(true);
      return;
    }

    const answers: AnswersMap = {};
    for (const question of this.page().questions) {
      const rawValue = group.get(question.id)!.value;
      answers[question.id] = question.type === 'number' ? Number(rawValue) : rawValue;
    }
    this.submitPage.emit(answers);
  }

  protected onBack(): void {
    this.back.emit();
  }
}
