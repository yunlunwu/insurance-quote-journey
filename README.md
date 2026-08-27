# Insurance Quote Journey

A simplified life-insurance application journey (**Your Details / About You → Lifestyle → Quote**)
built for the Angular/React Frontend Coding Assessment. Implemented in **Angular 22** with
TypeScript, standalone components, signals, and the new `@if`/`@for`/`@switch` control flow.

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
returns, and grows live if `POST /quote` asks a follow-up question. With the live API's current
data, a typical run looks like:

```
1. About You            (from GET /application)
   - Email Address        [email,  required]
   - Phone Number         [text,   required]
   - Occupation           [select, required — Accountant / Teacher / Builder / Pilot / Other]
        │  Next → submits page, moves to next step (no API call yet — not the last page)
        ▼
2. Lifestyle             (from GET /application)
   - Have you smoked in the last 12 months?  [radio, required — Yes / No]
        │  Next → POST /quote with ALL answers so far
        │
        ├─ "No"  ─────────────────────────────────────────────────────┐
        │                                                              │
        └─ "Yes" → API responds additionalQuestionsRequired:           │
                                                                        │
3. Smoking Details        (appended dynamically by POST /quote)        │
   - Cigarettes per week  [number, required]                          │
        │  Next → POST /quote again with the full answer set           │
        ▼                                                              ▼
4. Quote  ◄─────────────────────────────────────────────────────────────
   - Product / Cover amount / Premium
```

Back navigation is available on every step except the first, and preserves everything already
typed (answers are kept in `WizardStateService`, not lost when a step is left).

The sidebar stepper mirrors the assessment's wireframe: a single **"Application"** group (numbered
step 1) contains all data-collection pages as nested sub-steps with a connecting line — "About
You" and "Lifestyle" today, plus "Smoking Details" if the API appends it — followed by **"Quote"**
as its own top-level step. This is a genuine grouping, not a static copy of the mockup: the
sub-step list is `WizardStateService.steps()[0].children`, built from the same live `pages()`
array that drives the form, so an API-appended page shows up as a new sub-step automatically. Each
page header also gets a small icon (`core/questions/page-icon.ts`), matched by page `id` with a
generic document icon as the fallback for any page id the mapping doesn't recognise — decorative
only, it has no effect on validation or submission.

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

```
core/
  models/            API and wizard domain types
  questions/         validatorsFor(question) — derives validators from required/type
                     pageIconFor(pageId) — decorative header icon, generic fallback
  services/          ApplicationApiService, QuoteApiService (talk to /api/*)
features/wizard/
  wizard-state.service.ts     orchestrates paging, answers, and the quote loop
  wizard-page/                container: wires the service to the stepper + current step
  components/
    question-page/            builds a reactive FormGroup for one API page
    question-field/            renders one control based on the question's own metadata
    stepper/                    sidebar step list (nested Application group + Quote)
    quote-result/               final quote display
proxy.conf.json      dev-server proxy: /api/* -> the live Azure-hosted API (CORS workaround)
```

## Assumptions

- **Currency/frequency**: quote amounts are formatted as AUD; the premium is labelled "Monthly"
  since the API doesn't state a frequency for the returned `premium`.
- The brief's PDF prose groups "Your Details" (email/phone) separately from "About You"
  (occupation), but both the PDF's sample JSON and the live API bundle email, phone, and
  occupation into one "About You" page. The implementation follows the API as the source of
  truth, since the frontend renders whatever page/question structure it returns.
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

## Tests

16 tests across 4 files — `WizardStateService` (the paging/answers/quote-loop state machine,
including two regression tests for reactivity bugs found during manual browser testing — see
below), `QuestionPageComponent` (form building, validation gating, number-type coercion), and
`QuestionFieldComponent` (rendering per question type, error visibility).

```
npm test
```

```
 ✓ src/app/app.spec.ts > App > should create the app
 ✓ src/app/features/wizard/wizard-state.service.spec.ts > WizardStateService
     > loads pages and the application title from the application API
     > advances to the next page without calling the quote API until the last page
     > appends new pages when the API asks additional questions, looping until quoted
     > goBack moves to the previous page and preserves already-entered answers
     > cannot go back from the first page
     > keeps currentPageAnswers referentially stable across repeated reads when nothing changed
     > surfaces the API-provided error message when the application fails to load
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

 Test Files  4 passed (4)
      Tests  16 passed (16)
   Duration  2.35s
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

## AI assistance

This solution was built with substantial assistance from Claude Code (Anthropic), including
scaffolding, the data-driven wizard architecture, component implementation, and browser-driven
verification of the live-API flows described above (including probing the live API directly with
curl to confirm its exact request/response contract before wiring the frontend to it). Approximate
time spent: ~2.5 hours of focused session time, slightly over the brief's suggested 2-hour scope,
due to integrating against the live API (contract discovery, CORS workaround) in addition to the
original build.
