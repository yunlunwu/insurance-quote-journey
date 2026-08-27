import { describe, expect, it } from 'vitest';
import { pageIconFor } from './page-icon';

describe('pageIconFor', () => {
  it('maps known page ids to their icon', () => {
    expect(pageIconFor('about-you')).toBe('person');
    expect(pageIconFor('lifestyle')).toBe('heart');
    expect(pageIconFor('smoking-details')).toBe('lungs');
  });

  it('falls back to a generic document icon for an unrecognised page id', () => {
    expect(pageIconFor('some-new-page-the-api-added')).toBe('document');
  });
});
