import { ApplicationConfig, CSP_NONCE, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

/**
 * Angular applies this nonce to every `<style>` tag it injects at runtime
 * for component-scoped CSS, letting `index.html`'s CSP keep `style-src`
 * free of `'unsafe-inline'`. There's no backend here to mint a fresh nonce
 * per request, so this is a static, build-time value baked into both this
 * file and the `style-src` directive in index.html (must stay in sync) —
 * weaker than a real per-request nonce (visible in the page source, so it
 * doesn't stop a determined attacker who can already inject markup), but it
 * still blocks naive/accidental inline-style injection and keeps CSP
 * meaningfully enforced for scripts, which is where it matters most.
 */
export const CSP_NONCE_VALUE = 'ng-csp-nonce-insurance-quote-journey';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    { provide: CSP_NONCE, useValue: CSP_NONCE_VALUE },
  ],
};
