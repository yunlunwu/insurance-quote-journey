import { describe, expect, it } from 'vitest';
import { evaluateQuote } from './mock-application-data';

describe('evaluateQuote', () => {
  it('asks for cigarettesPerWeek the first time a smoker is evaluated', () => {
    const result = evaluateQuote({ smokedLast12Months: true });

    expect(result.status).toBe('additionalQuestionsRequired');
    expect(result.pages).toEqual([
      { title: 'Smoking Details', questions: ['cigarettesPerWeek'] },
    ]);
  });

  it('returns a quote directly for a non-smoker', () => {
    const result = evaluateQuote({ smokedLast12Months: false, occupation: 'office' });

    expect(result.status).toBe('quoted');
    expect(result.quote).toEqual({ product: 'Life Protect', coverAmount: 500_000, premium: 45 });
  });

  it('returns a quote once cigarettesPerWeek has already been answered', () => {
    const result = evaluateQuote({ smokedLast12Months: true, cigarettesPerWeek: 20 });

    expect(result.status).toBe('quoted');
    expect(result.quote?.premium).toBeGreaterThan(45);
  });

  it('loads a heavier smoker more than a light smoker', () => {
    const light = evaluateQuote({ smokedLast12Months: true, cigarettesPerWeek: 10 });
    const heavy = evaluateQuote({ smokedLast12Months: true, cigarettesPerWeek: 60 });

    expect(heavy.quote!.premium).toBeGreaterThan(light.quote!.premium);
  });

  it('applies an occupation loading on top of the base premium', () => {
    const office = evaluateQuote({ smokedLast12Months: false, occupation: 'office' });
    const trade = evaluateQuote({ smokedLast12Months: false, occupation: 'trade' });

    expect(trade.quote!.premium).toBeGreaterThan(office.quote!.premium);
  });
});
