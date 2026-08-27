import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Quote } from '../../../../core/models/api.model';

@Component({
  selector: 'app-quote-result',
  imports: [CurrencyPipe],
  templateUrl: './quote-result.component.html',
  styleUrl: './quote-result.component.css',
})
export class QuoteResultComponent {
  readonly quote = input.required<Quote>();
}
