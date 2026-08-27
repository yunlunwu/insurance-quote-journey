import { Component, input } from '@angular/core';
import { StepperGroup } from '../../../../core/models/wizard.model';

@Component({
  selector: 'app-stepper',
  imports: [],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.css',
})
export class StepperComponent {
  readonly groups = input.required<StepperGroup[]>();
}
