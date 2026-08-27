import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { QuoteResultComponent } from './quote-result.component';

describe('QuoteResultComponent', () => {
  it('renders the product name and formats cover amount / premium as AUD currency', () => {
    const fixture = TestBed.createComponent(QuoteResultComponent);
    fixture.componentRef.setInput('quote', {
      product: 'Life Protect',
      coverAmount: 500000,
      premium: 104.75,
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.quote__product')).nativeElement.textContent).toBe(
      'Life Protect',
    );
    const values = fixture.debugElement
      .queryAll(By.css('.quote__row dd'))
      .map((el) => el.nativeElement.textContent.trim());
    expect(values).toEqual(['A$500,000', 'A$104.75']);
  });
});
