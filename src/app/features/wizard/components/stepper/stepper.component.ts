import { Component, input } from '@angular/core';
import { StepperItem } from '../../../../core/models/wizard.model';

@Component({
  selector: 'app-stepper',
  imports: [],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.css',
})
export class StepperComponent {
  readonly steps = input.required<StepperItem[]>();
}
