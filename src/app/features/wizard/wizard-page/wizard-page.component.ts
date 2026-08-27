import { Component, inject, OnInit } from '@angular/core';
import { WizardStateService } from '../wizard-state.service';
import { StepperComponent } from '../components/stepper/stepper.component';
import { QuestionPageComponent } from '../components/question-page/question-page.component';
import { QuoteResultComponent } from '../components/quote-result/quote-result.component';
import { AnswersMap } from '../../../core/models/wizard.model';

@Component({
  selector: 'app-wizard-page',
  imports: [StepperComponent, QuestionPageComponent, QuoteResultComponent],
  templateUrl: './wizard-page.component.html',
  styleUrl: './wizard-page.component.css',
})
export class WizardPageComponent implements OnInit {
  protected readonly wizard = inject(WizardStateService);

  ngOnInit(): void {
    this.wizard.loadApplication();
  }

  protected onSubmitPage(answers: AnswersMap): void {
    this.wizard.submitCurrentPage(answers);
  }

  protected onBack(): void {
    this.wizard.goBack();
  }

  protected onRetry(): void {
    this.wizard.retry();
  }
}
