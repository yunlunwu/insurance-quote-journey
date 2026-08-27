# Insurance Quote Journey

**Angular 22** · **Vite 8** (Angular's dev server) · **Node 24.16.0**

A simplified life-insurance application journey for the Angular/React Frontend Coding Assessment —
collects applicant details across a few steps, submits them to a Quote API, and shows the returned
quote, looping through any follow-up questions the API asks first.

## Why npm, regardless of Angular vs React

`npm start` is the brief's run contract, not a React-specific one — both `ng new` (Angular) and
`create-react-app`/Vite React projects wire `npm start` to their own dev server by convention.
This repo maps it to `ng serve` in `package.json`; nothing about the requirement implies React.

## Setup

```bash
nvm use        # picks up the pinned Node version from .nvmrc (24.16.0)
npm install
npm start      # ng serve — http://localhost:4200
```

```bash
npm test       # unit tests (Vitest)
npm run build  # production build to dist/
```

## The live API

`GET /application` and `POST /quote` are served by a real backend deployed for this assessment:

```
https://insurance-quote-api-f4h7ebg2hrg8f3gh.australiasoutheast-01.azurewebsites.net
```

The app talks to it through relative `/api/*` paths, which `ng serve` forwards via
`proxy.conf.json` (wired in via `angular.json`'s `serve.options.proxyConfig`). This is necessary,
not just convenient: **the live API does not send CORS headers** and doesn't answer `OPTIONS`
preflight requests, so a browser calling it directly from `http://localhost:4200` would have the
response blocked by the browser's CORS policy. Routing through the dev server's own proxy makes
the cross-origin request happen server-side, where CORS doesn't apply. `ApplicationApiService` /
`QuoteApiService` are unaware of any of this — they just call `/api/application` and `/api/quote`.

> Production caveat: this proxy only exists in `ng serve`. A static production build served from
> somewhere other than this dev server would need the API to send CORS headers, or a small proxy
> in front of it — see **Known limitations**.

## Page structure (user-facing flow)

The step list itself is **not hardcoded** — it's rendered from whatever `GET /application`
returns, and grows live if `POST /quote` asks a follow-up question. The one exception is
`applyYourDetailsSplit()` (see Architecture below), which splits the API's "About You" page into
"Your Details" + "About You" client-side to match the wireframe. With the live API's current data,
a typical run looks like:

```
1. Your Details         (client-side split of GET /application's "About You" page)
   - Email Address        [email, required]
   - Phone Number         [text,  required]
        │  Next → submits page, moves to next step (no API call yet)
        ▼
2. About You             (the rest of that same API page)
   - Occupation           [select, required — Accountant / Teacher / Builder / Pilot / Other]
        │  Next → submits page, moves to next step (no API call yet — not the last page)
        ▼
3. Lifestyle             (from GET /application)
   - Have you smoked in the last 12 months?  [radio, required — Yes / No]
        │  Next → POST /quote with ALL answers so far
        │
        ├─ "No"  ─────────────────────────────────────────────────────┐
        │                                                              │
        └─ "Yes" → API responds additionalQuestionsRequired:           │
                                                                        │
4. Smoking Details        (appended dynamically by POST /quote)        │
   - Cigarettes per week  [number, required]                          │
        │  Next → POST /quote again with the full answer set           │
        ▼                                                              ▼
5. Quote  ◄─────────────────────────────────────────────────────────────
   - Product / Cover amount / Premium
```

Back navigation is available on every step except the first, and preserves everything already
typed (answers are kept in `WizardStateService`, not lost when a step is left).

The sidebar stepper mirrors the assessment's wireframe exactly: **"Your Details"** stands alone as
step 1, then a single **"Application"** group (step 2) contains every page after it as nested
sub-steps with a connecting line — "About You" and "Lifestyle" today, plus "Smoking Details" if the
API appends it — followed by **"Quote"** as its own top-level step 3. `WizardStateService.steps()`
pulls "Your Details" out into its own group only when it's literally the first page (i.e. only when
`applyYourDetailsSplit()` actually produced one); every other page still just falls under
"Application" generically, so this degrades safely if that split doesn't happen. Each page header
also gets a small icon (`core/questions/page-icon.ts`), matched by page `id` with a generic
document icon as the fallback for any page id the mapping doesn't recognise — decorative only, it
has no effect on validation or submission.

## Architecture

**The wizard is data-driven, not hardcoded**, and each question is fully self-describing. A page
from the API looks like:

```json
{ "id": "about-you", "title": "About You", "questions": [
  { "id": "email", "label": "Email Address", "type": "email", "required": true },
  { "id": "occupation", "label": "Occupation", "type": "select", "required": true,
    "options": ["Accountant", "Teacher", "Builder", "Pilot", "Other"] }
] }
```

Because `label`/`type`/`required`/`options` all come from the API, the frontend never hardcodes
what "occupation" means or which options it has:

- `QuestionFieldComponent` renders purely off a question's `type` (`email` / `text` / `number` /
  `select` / `radio`) and its `options`, if any. A question type the UI doesn't recognise yet
  falls back to a plain text input rather than breaking the journey.
- `validatorsFor()` (`core/questions/question-validators.ts`) derives Angular validators purely
  from `required`/`type` — no per-question-id special-casing (no `if (id === 'email')`).
- `WizardStateService` (signals-based) owns the page list, current index, and the accumulated
  answers map. Pages are a flat, ever-growing array rather than static routes, because the step
  count isn't known upfront: `POST /quote` can append more pages
  (`additionalQuestionsRequired`) after any submission. **The API is stateless** — every
  `/quote` call resubmits the *entire* accumulated answers map, not just the current page's,
  since the server has no memory of earlier calls (verified against the live API: submitting only
  the newest field is rejected with "required" errors for every earlier field).
- The stepper sidebar renders directly off `WizardStateService.steps()`, so a newly-appended page
  (e.g. "Smoking Details") automatically shows up as a step with no UI code change.
- A single route hosts the whole journey; step-to-step navigation is signal-driven state rather
  than router state, since the page count is only known after a round-trip to `/quote` — a static
  route tree can't express steps that don't exist yet.
- `applyYourDetailsSplit()` (`core/questions/page-splitter.ts`) is the one deliberate, narrow
  exception to "render whatever the API sends": the wireframe shows "Your Details" (Email, Phone)
  as its own step, separate from "About You" (Occupation), but the live API bundles all three into
  one "About You" page. `WizardStateService.loadApplication()` runs this split on the raw API
  response before anything else sees it, so every other piece — the submit loop, the stepper
  grouping, `QuestionPageComponent`, `QuestionFieldComponent` — still just walks a flat page list
  with no idea the split happened. It only ever acts on a page id'd `"about-you"` and only pulls
  out questions id'd `"email"`/`"phone"`; anything else passes through untouched.

## Content Security Policy

`index.html` sets a CSP via `<meta http-equiv="Content-Security-Policy">`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'nonce-…'; img-src 'self' data:;
connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'
```

- `script-src 'self'` with no `'unsafe-inline'`/`'unsafe-eval'` — only the app's own bundled JS
  can run.
- `style-src` has no `'unsafe-inline'` either, which took two real changes to achieve (verified
  with zero CSP console violations across the full journey, in both `ng serve` and the built
  production output, served statically):
  1. `angular.json`'s production config sets `optimization.styles.inlineCritical: false`. Angular's
     build otherwise inlines critical CSS as a literal `<style>` block in `index.html` (plus an
     inline `onload` handler to swap in the rest) — both would need `'unsafe-inline'`.
  2. Angular *also* injects each component's scoped CSS as a `<style>` tag at runtime, independent
     of that build setting. `app.config.ts` provides Angular's `CSP_NONCE` token with a fixed
     value, which Angular then stamps onto every such tag; the same value appears in the meta
     tag's `style-src`. There's no backend here to mint a fresh nonce per request, so this is a
     **static, build-time nonce** — weaker than a real one (it's visible in the page source, so it
     doesn't stop a determined attacker who can already inject markup), but it still blocks
     naive/accidental inline-style injection while keeping the policy meaningfully strict for
     scripts, which matters more.
- `img-src` allows `data:` for the select dropdown's inline SVG chevron background-image.
- `connect-src 'self'` matches the app only ever calling same-origin `/api/*` (see the proxy note
  above) — it never talks to the Azure domain directly from the browser.
- `frame-ancestors`/`report-uri`/`sandbox` aren't set: the CSP spec doesn't allow them in a
  `<meta>`-delivered policy at all (only in a real `Content-Security-Policy` HTTP header), so a
  production deploy behind a real server/CDN should add those there instead.

## Folder and file structure

```
insurance-quote-journey/
├── angular.json                        Angular CLI workspace config; dev-server proxy + CSP-friendly build options
├── proxy.conf.json                     ng serve proxy: /api/* -> the live Azure-hosted API (CORS workaround)
├── package.json                        npm scripts (start/test/build) + pinned Node engines range
├── .nvmrc                              pinned Node version (24.16.0)
│
└── src/
    ├── index.html                      HTML shell Angular bootstraps into + CSP meta tag
    ├── main.ts                         app entry point — bootstraps the root App component
    ├── styles.css                      global CSS variables (colors/radii/shadows) + reset
    │
    └── app/
        ├── app.ts / .html / .css       root shell component — just a <router-outlet>
        ├── app.spec.ts                 smoke test: root component creates
        ├── app.config.ts               app-wide providers: router, HttpClient, CSP nonce
        ├── app.routes.ts               single route -> WizardPageComponent (+ wildcard redirect)
        │
        ├── core/
        │   ├── models/
        │   │   ├── api.model.ts             TS types for the live API's request/response shapes
        │   │   └── wizard.model.ts          frontend-only types: WizardPage, AnswersMap, stepper types
        │   ├── questions/
        │   │   ├── question-validators.ts        validatorsFor(question) — Angular validators from required/type
        │   │   ├── question-validators.spec.ts   tests: required/email/number rules, no phantom formats
        │   │   ├── page-icon.ts                  pageIconFor(pageId) — decorative header icon, generic fallback
        │   │   ├── page-icon.spec.ts             tests: known ids + unrecognised-id fallback
        │   │   ├── page-splitter.ts               applyYourDetailsSplit() — splits "About You" for the wireframe
        │   │   └── page-splitter.spec.ts          tests: split, pass-through, and both edge cases
        │   └── services/
        │       ├── application-api.service.ts        GET /api/application
        │       ├── application-api.service.spec.ts   test: correct method + URL
        │       ├── quote-api.service.ts               POST /api/quote (wraps the body as { answers })
        │       └── quote-api.service.spec.ts          test: request body is wrapped correctly
        │
        └── features/wizard/
            ├── wizard-state.service.ts        state machine: pages, current step, answers, quote loop
            ├── wizard-state.service.spec.ts   tests: paging, multi-round loop, back, retry, both error paths
            │
            ├── wizard-page/
            │   ├── wizard-page.component.*        container: renders the sidebar stepper + current step/quote
            │   └── wizard-page.component.spec.ts  integration tests: full journey through the real DOM
            │
            └── components/
                ├── question-page/
                │   ├── question-page.component.ts       builds a reactive FormGroup for one API page
                │   ├── question-page.component.html     form markup: header icon, fields, Back/Next
                │   ├── question-page.component.css      form layout + button styling
                │   └── question-page.component.spec.ts  tests: validation gating, number coercion, rebuild
                ├── question-field/
                │   ├── question-field.component.ts      renders one control based on question.type
                │   ├── question-field.component.html    switch over email/text/number/select/radio
                │   ├── question-field.component.css     input/select/radio styling
                │   └── question-field.component.spec.ts tests: option rendering, error visibility
                ├── stepper/
                │   ├── stepper.component.ts     sidebar step-list input (groups + sub-steps)
                │   ├── stepper.component.html   nested "Application" group + "Quote" step markup
                │   ├── stepper.component.css    connecting-line/dot/marker styling
                │   └── stepper.component.spec.ts tests: group/sub-step rendering, marker + highlight states
                └── quote-result/
                    ├── quote-result.component.ts       final quote display
                    ├── quote-result.component.html     product / cover amount / premium layout
                    ├── quote-result.component.css      quote card styling
                    └── quote-result.component.spec.ts  test: renders product + AUD-formatted amounts
```

## Assumptions

- **Currency/frequency**: quote amounts are formatted as AUD; the premium is labelled "Monthly"
  since the API doesn't state a frequency for the returned `premium`.
- Both the PDF's sample JSON and the live API bundle Email, Phone, and Occupation into a single
  "About You" page, even though the wireframe shows "Your Details" (Email, Phone) as its own step.
  Rather than picking one, the frontend splits that one API page into two client-side steps (see
  `applyYourDetailsSplit()` in Architecture) to match the wireframe without diverging from what the
  API actually sends over the wire — answers for both steps still get merged into the same
  accumulated answers map and submitted exactly as the API describes.
- Verified against the live API that occupation and cigarette count do **not** change the
  premium (flat $64.85 non-smoker / $104.75 smoker) — the frontend doesn't assume or encode any
  pricing logic itself, it only displays whatever `POST /quote` returns.

## Known limitations

- No persistence: refreshing the browser restarts the journey (no `sessionStorage`/URL state).
- The CORS workaround (`proxy.conf.json`) only applies to `ng serve`. A production static deploy
  would need the API to add CORS headers, or a small reverse proxy in front of it.
- No dedicated a11y pass (e.g. `aria-invalid`/`aria-describedby` wiring on error messages) beyond
  semantic HTML and labelled inputs.
- No e2e test runner is wired into the project (the brief doesn't require one); the journey was
  additionally verified end-to-end in a real browser (Playwright, used only for manual
  verification during development, not committed) against the **live** API — validation, back
  navigation, the additional-question loop, and both smoker/non-smoker paths all confirmed
  working, with quote values matching the live API's responses exactly ($64.85 / $104.75).
- Phone number has no format validation beyond "required" — the API declares its type as plain
  `text` with no pattern, and `validatorsFor()` deliberately only derives rules from what the API
  states (see Architecture), so it doesn't invent a pattern the API never specified.

## Time spent

Approximately 2.5 hours.

## Tests

42 tests across 12 files. Every non-trivial unit has its own spec — the two API services (request
shape, including the `{ answers }` wrapping), the three pure question-metadata helpers
(`validatorsFor`, `pageIconFor`, `applyYourDetailsSplit`), all four wizard components,
`WizardStateService` (the paging/answers/quote-loop state machine), and a `WizardPageComponent`
integration spec that drives the whole tree — fill a field, submit, check the next step rendered —
the same way the manual browser testing described above did, so the wiring between components (not
just each one in isolation) is covered too.

```
npm test
```

```
 ✓ src/app/core/services/application-api.service.spec.ts > ApplicationApiService
     > GETs /api/application
 ✓ src/app/app.spec.ts > App > should create the app
 ✓ src/app/core/services/quote-api.service.spec.ts > QuoteApiService
     > POSTs to /api/quote with the answers wrapped in an "answers" property
 ✓ src/app/core/questions/page-splitter.spec.ts > applyYourDetailsSplit
     > splits an "about-you" page into "Your Details" (email/phone) and "About You" (the rest)
     > does not touch pages other than "about-you"
     > drops the "About You" remainder page if nothing but email/phone was in it
     > leaves an "about-you" page untouched if it has neither email nor phone
 ✓ src/app/core/questions/page-icon.spec.ts > pageIconFor
     > maps known page ids to their icon
     > falls back to a generic document icon for an unrecognised page id
 ✓ src/app/core/questions/question-validators.spec.ts > validatorsFor
     > adds no validators for an optional plain-text question
     > adds a required validator when the question is required
     > adds an email-format validator for type "email"
     > adds a min(0) validator for type "number"
     > does not add a format validator for "text" (e.g. phone) beyond required
     > does not add a format validator for "select"/"radio" beyond required
 ✓ src/app/features/wizard/wizard-state.service.spec.ts > WizardStateService
     > loads pages and the application title, with "Your Details" split out as its own first page
     > advances page by page without calling the quote API until the last page
     > appends new pages when the API asks additional questions, looping until quoted
     > goBack moves to the previous page and preserves already-entered answers
     > cannot go back from the first page
     > keeps currentPageAnswers referentially stable across repeated reads when nothing changed
     > surfaces the API-provided error message when the application fails to load
     > surfaces the API-provided error message when submitting the quote fails, without losing entered answers
     > retry() re-fetches the application if it never loaded, otherwise just clears the error
     > loops through multiple consecutive additionalQuestionsRequired rounds before quoting
     > steps() shows "Your Details" as its own top-level step, ahead of the "Application" group
 ✓ src/app/features/wizard/components/quote-result/quote-result.component.spec.ts
     > QuoteResultComponent > renders the product name and formats cover amount / premium as AUD currency
 ✓ src/app/features/wizard/components/stepper/stepper.component.spec.ts > StepperComponent
     > renders each top-level group title and its sub-steps
     > shows a checkmark for a done group and a number for one that is not done
     > highlights the current sub-step and does not highlight upcoming/done ones
     > renders no sub-step list for a group with no children
 ✓ src/app/features/wizard/components/question-field/question-field.component.spec.ts
     > QuestionFieldComponent > renders every API-provided option for a select question
     > QuestionFieldComponent > renders one radio input per API-provided option
     > QuestionFieldComponent > reflects control.touched after markAsTouched
     > QuestionFieldComponent > shows the error once `submitted` becomes true
 ✓ src/app/features/wizard/components/question-page/question-page.component.spec.ts
     > QuestionPageComponent > does not emit submitPage when required fields are left empty
     > QuestionPageComponent > emits submitPage with the entered values once the form is valid
     > QuestionPageComponent > converts number-type answers to an actual number, not a string
     > QuestionPageComponent > rebuilds the form when navigating to a different page
 ✓ src/app/features/wizard/wizard-page/wizard-page.component.spec.ts > WizardPageComponent (integration)
     > walks the full non-smoker journey through to a quote
     > renders the additional-question loop before showing a quote
     > shows an error state with a working retry button when loading the application fails

 Test Files  12 passed (12)
      Tests  42 passed (42)
   Duration  3.83s
```

Two of the `WizardStateService`/`QuestionFieldComponent` tests are deliberate regression guards
for real bugs caught during manual browser testing, not just coverage padding:

1. **Referential stability of `currentPageAnswers`.** It's a `computed()`, not a plain method,
   because a plain method run from a template binding allocates a new object on every
   change-detection pass. That looked like a changed `@Input()` to the child form component and
   silently retriggered its form-rebuild effect on every unrelated re-render — wiping whatever
   the user had typed and resetting "touched" state before validation could ever show.
2. **`QuestionFieldComponent`'s error visibility uses a plain method, not `computed()`.**
   `FormControl.touched`/`.invalid` mutate outside Angular's signal graph (reactive forms predate
   signals), so a `computed()` here would memoize on the first read and never notice
   `markAllAsTouched()` afterwards — validation errors would silently never appear.

A third bug — a missing `[formGroup]` binding on the page `<form>`, which meant the Next button's
click did a real native form submit (full page reload) instead of calling the Angular handler —
was also found this way, but isn't independently unit-testable (it's a DOM/native-submission
behaviour); it was caught and fixed via the manual browser verification described above.
