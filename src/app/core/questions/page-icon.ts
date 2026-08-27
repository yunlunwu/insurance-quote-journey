export type PageIconKey = 'person' | 'heart' | 'lungs' | 'document';

/**
 * Purely decorative: picks an icon for a page's header based on its id.
 * Not business logic — an unrecognised page id (any page this build hasn't
 * seen before) safely falls back to a generic document icon rather than
 * breaking anything.
 */
export function pageIconFor(pageId: string): PageIconKey {
  switch (pageId) {
    case 'about-you':
      return 'person';
    case 'lifestyle':
      return 'heart';
    case 'smoking-details':
      return 'lungs';
    default:
      return 'document';
  }
}
