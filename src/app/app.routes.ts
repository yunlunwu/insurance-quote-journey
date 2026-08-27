import { Routes } from '@angular/router';
import { WizardPageComponent } from './features/wizard/wizard-page/wizard-page.component';

export const routes: Routes = [
  { path: '', component: WizardPageComponent },
  { path: '**', redirectTo: '' },
];
