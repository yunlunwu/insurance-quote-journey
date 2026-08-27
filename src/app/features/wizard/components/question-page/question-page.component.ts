import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AnswersMap, WizardPage } from '../../../../core/models/wizard.model';
import { QuestionDefinition, resolveQuestion } from '../../../../core/questions/question-definition.model';
import { QuestionFieldComponent } from '../question-field/question-field.component';

interface RenderableField {
  definition: QuestionDefinition;
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
    return this.page().questions.map((key) => ({
      definition: resolveQuestion(key),
      control: group.get(key) as FormControl,
    }));
  });

  constructor() {
    effect(() => {
      const page = this.page();
      const answers = this.initialAnswers();

      const controlsConfig: Record<string, FormControl> = {};
      for (const key of page.questions) {
        const definition = resolveQuestion(key);
        const initialValue = definition.fromAnswer
          ? definition.fromAnswer(answers[key])
          : (answers[key] ?? '');
        controlsConfig[key] = this.fb.control(initialValue, definition.validators);
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
    for (const key of this.page().questions) {
      const definition = resolveQuestion(key);
      const rawValue = group.get(key)!.value;
      answers[key] = definition.toAnswer ? definition.toAnswer(rawValue) : rawValue;
    }
    this.submitPage.emit(answers);
  }

  protected onBack(): void {
    this.back.emit();
  }
}
