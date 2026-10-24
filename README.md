# Thesis

An investment thesis workspace with Akta-powered company sourcing.

## Features

Define investment theses across verticals, then open **Company sourcing** to discover real companies for a selected thesis. Search against the theme, funding stages, headquarters geography, and screening priorities; optionally add a narrower focus. Review company evidence, filter known conflicts, shortlist companies, and export CSV evidence or Markdown theses.

Basic discovery requests 5, 10, or 20 companies without enrichment. Optional enrichment requests firmographic, location, and funding detail sections and requires a compatible Akta Subscription or Enterprise plan. Requests use Akta credits; the UI shows reported consumption. The server temporarily reuses identical searches for ten minutes and limits discovery bursts per caller within its current runtime.

## Matching

Akta translates the thesis into company search criteria. The UI separately compares the fields actually returned against theme keywords, geography, funding stage, and private-company status. A signal count is not a probability or a complete semantic thesis assessment. Missing fields stay unverified; known conflicts are explicit. Founder quality, traction, moat, risks, and investor check-size suitability require diligence. Investor check size is never treated as a company's funding-round amount.

Changing a thesis invalidates its old discovery view. Older shortlisted companies retain a warning until rediscovered against the new thesis version. Theses, retrieved results, settings, and shortlists persist in this browser's localStorage; there is no shared team database or cross-device sync.

## Security and hosting

The existing Site stays owner-private. Sites dispatch enforces viewer/service access before the worker. `/api/sourcing/*` uses that private boundary and rejects cross-origin browser POSTs. Keep the Site private unless server authorization is added for a broader audience.

Configure `AKTA_API_KEY` as a **secret** using Sites runtime environment settings. It is read only by the server worker and is never sent to the browser, embedded in assets, or stored in localStorage. `.env.example` documents the variable name without a credential. The API destination is fixed to Akta, redirects are rejected, and upstream error bodies are not relayed.

## Development

```sh
node /absolute/path/to/sites/scripts/install-dependencies.mjs
npm run dev
```

For local server secrets, configure an ignored `.dev.vars` using the names in `.env.example`. Production runtime values are configured in Sites and require deployment to apply.

```sh
node --test tests/sourcing.test.mjs
npx tsc --noEmit
node /absolute/path/to/sites/scripts/build-site.mjs
```

## Source

- `app/page.tsx`, `lib/workspace-html.ts`: workspace shell
- `public/app.js`, `public/styles.css`: interactive UI and visual system
- `worker/index.ts`: framework entry and API routing
- `lib/sourcing.js`: Akta client, validation, normalization, evidence, cache, errors
- `.openai/hosting.json`: existing Site identity and hosting configuration

Starter thesis content is illustrative. Companies in the Sourcing tab come only from Akta requests. See the [Akta API reference](https://docs.akta.pro/api-reference/listgen-api) for current endpoint and plan details.
