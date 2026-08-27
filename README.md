# Insurance Quote Journey

A simplified life-insurance application journey (**Your Details / About You → Lifestyle → Quote**)
built for the Angular/React Frontend Coding Assessment. Implemented in **Angular 22** with
TypeScript, standalone components, signals, and the new `@if`/`@for`/`@switch` control flow.

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

There is no real backend. `GET /application` and `POST /quote` are served by an
`HttpInterceptor` (`src/app/core/mocks/`) so the app is fully self-contained and runnable with a
single `npm start`, per the brief's contract in the "Sample GET/POST Responses" section.

## Architecture

**The wizard is data-driven, not hardcoded.** `GET /application` returns a list of pages, each a
`{ title, questions[] }`. The app never assumes there are exactly two pages, or which fields
belong to which page — it renders whatever the API sends:

- `QUESTION_REGISTRY` (`core/questions/question-definition.model.ts`) maps a question **key**
  (`email`, `phone`, `occupation`, `smokedLast12Months`, `cigarettesPerWeek`, …) to its label,
  input type, options, and validators. `QuestionPageComponent` builds a `FormGroup` on the fly
  from a page's `questions` array by looking each key up in the registry. An unrecognised key
  falls back to a plain required text field instead of breaking the journey — the frontend stays
  forward-compatible with a backend that adds a question the UI hasn't shipped support for yet.
- `WizardStateService` (signals-based) owns the page list, the current index, and the accumulated
  answers map. Pages are stored as a flat, ever-growing array rather than static routes, because
  the step count isn't known upfront: `POST /quote` can append more pages
  (`additionalQuestionsRequired`) after any submission. `submitCurrentPage()` implements the
  "submit → maybe more questions → submit again" loop generically — it doesn't special-case
  smoking, cigarette count, or any particular question.
- The stepper sidebar renders directly off `WizardStateService.steps()`, so newly-appended pages
  (e.g. "Smoking Details") automatically show up as a step without any UI code change.
- A single route hosts the whole journey; step-to-step navigation is signal-driven state rather
  than router state. Given the page count is dynamic and only known after a round-trip to
  `/quote`, a static route tree (`/apply/about-you`, `/apply/lifestyle`, …) can't express steps
  that don't exist yet — modelling them as state avoided keeping two sources of truth in sync.

```
core/
  models/            API and wizard domain types
  questions/         question key → {label, type, validators} registry
  services/          ApplicationApiService, QuoteApiService (talk to /api/*)
  mocks/             HttpInterceptor + quote "underwriting" logic standing in for a backend
features/wizard/
  wizard-state.service.ts     orchestrates paging, answers, and the quote loop
  wizard-page/                container: wires the service to the stepper + current step
  components/
    question-page/            builds a reactive FormGroup for one API page
    question-field/            renders one control based on its registry definition
    stepper/                    sidebar step list
    quote-result/               final quote display
```

## Assumptions

- **Occupation options** aren't specified in the brief's sample payloads, so a representative
  fixed list is used (Office/Professional, Trade/Manual Labour, Healthcare, Education,
  Retail/Hospitality, Other). A real backend would presumably supply this list.
- **Premium calculation** is illustrative only: a $45 base premium with small loadings for
  smoking status, cigarette volume, and occupation. It's meant to make the
  "additionalQuestionsRequired → quoted" loop demonstrably data-driven, not to model real
  underwriting.
- **Currency/frequency**: quote amounts are formatted as AUD; the premium is labelled "Monthly"
  since the brief doesn't state a frequency for the sample `64.85`.
- **Phone validation** accepts 8–15 digits/spaces/`()+-`, which is deliberately loose since no
  specific country format was specified.
- The brief's prose groups "Your Details" (email/phone) separately from "About You" (occupation),
  but the sample `GET /application` response bundles email, phone, and occupation into a single
  "About You" page. The implementation follows the sample JSON as the source of truth over the
  prose description, since the frontend is driven entirely by that response.

## Known limitations

- No persistence: refreshing the browser restarts the journey (no `sessionStorage`/URL state).
- The mock backend lives in an `HttpInterceptor`; swapping in a real API means removing that
  provider from `app.config.ts` — no other code references it.
- No dedicated a11y pass (e.g. `aria-invalid`/`aria-describedby` wiring on error messages) beyond
  semantic HTML and labelled inputs.
- No e2e test runner is wired into the project (the brief doesn't require one); the journey was
  manually verified end-to-end in a real browser during development, including the validation,
  back-navigation, additional-question loop, and both smoker/non-smoker paths.

## AI assistance

This solution was built with substantial assistance from Claude Code (Anthropic), including
scaffolding, the question-registry/wizard-state architecture, component implementation, and
browser-driven verification of the flows described above. Approximate time spent: ~2 hours of
focused session time, matching the brief's suggested scope.
