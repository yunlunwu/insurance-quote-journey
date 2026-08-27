import { describe, expect, it } from 'vitest';
import { applyYourDetailsSplit } from './page-splitter';
import { ApiPage } from '../models/api.model';

const EMAIL = { id: 'email', label: 'Email Address', type: 'email' as const, required: true };
const PHONE = { id: 'phone', label: 'Phone Number', type: 'text' as const, required: true };
const OCCUPATION = {
  id: 'occupation',
  label: 'Occupation',
  type: 'select' as const,
  required: true,
  options: ['Teacher'],
};

describe('applyYourDetailsSplit', () => {
  it('splits an "about-you" page into "Your Details" (email/phone) and "About You" (the rest)', () => {
    const pages: ApiPage[] = [
      { id: 'about-you', title: 'About You', questions: [EMAIL, PHONE, OCCUPATION] },
      { id: 'lifestyle', title: 'Lifestyle', questions: [] },
    ];

    const result = applyYourDetailsSplit(pages);

    expect(result.map((p) => p.id)).toEqual(['your-details', 'about-you', 'lifestyle']);
    expect(result[0]).toEqual({ id: 'your-details', title: 'Your Details', questions: [EMAIL, PHONE] });
    expect(result[1].questions).toEqual([OCCUPATION]);
  });

  it('does not touch pages other than "about-you"', () => {
    const pages: ApiPage[] = [{ id: 'lifestyle', title: 'Lifestyle', questions: [] }];
    expect(applyYourDetailsSplit(pages)).toEqual(pages);
  });

  it('drops the "About You" remainder page if nothing but email/phone was in it', () => {
    const pages: ApiPage[] = [{ id: 'about-you', title: 'About You', questions: [EMAIL, PHONE] }];

    const result = applyYourDetailsSplit(pages);

    expect(result).toEqual([{ id: 'your-details', title: 'Your Details', questions: [EMAIL, PHONE] }]);
  });

  it('leaves an "about-you" page untouched if it has neither email nor phone', () => {
    const page: ApiPage = { id: 'about-you', title: 'About You', questions: [OCCUPATION] };
    expect(applyYourDetailsSplit([page])).toEqual([page]);
  });
});
