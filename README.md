# MX11 Services Dashboard

Plain HTML, CSS and browser JavaScript with a small Node.js 24 server.
There are **no npm dependencies**, including development dependencies, and no build step.

## Development

Use Node.js 24 LTS. No package installation is required.

1. Copy `.env.example` to the ignored `.env.local` and configure the integrations you use.
2. Run `npm run dev`, or `node --watch --env-file-if-exists=.env.local server/index.js`.

`npm run check` checks JavaScript syntax, verifies the dependency-free manifest and runs
isolated tests using Node's built-in test runner. `npm run build` is a compatibility alias
for source checks; it does not generate an output directory. `npm audit` reports zero packages.

## Implementation

`public/` contains three complete HTML pages, one stylesheet (`site.css`), SVGs and small native
ES modules. The home page's service links and portfolio navigation work without JavaScript.
Browser JavaScript updates status cards, the network topology and the service health overview,
expands server lists, manages announcements and admin access, opens photo/video lightboxes and
draws the interactive grid background (cursor spotlight, click ripples, travelling data packets).
Elements marked `data-reveal` fade in on scroll; `--d` staggers them. All motion respects reduced
motion, and the background pauses while the tab is hidden.

`site.css` defines the design tokens on `:root` (brand navy `#242a64`, glow blue, status colours)
and plain component classes. Per-service accent colours appear only on hover.

`server/index.js` serves a fixed inventory of public files, supports gzip/Brotli and conditional
requests, and routes `/api/*` requests using the standard Request and Response interfaces.
Private server files, configuration and data are outside the public file inventory.
Integration modules use native Node HTTP, fetch, crypto, TCP/UDP, filesystem and process APIs.
The Network cards use the host OS's `ping` utility, included in the Alpine container.
The service health overview reads the public Uptime Kuma status page (`STATUS_URL`,
`STATUS_PAGE_SLUG`) and needs no credentials.

## Configuration and security

All integration credentials come from environment variables. Unconfigured integrations
return an explicit 503 response; they do not call external services with placeholder keys.
The Immich shared-link credential is used only on the server, including image delivery.
YouTube playlists are paginated, and upstream requests have timeouts.

The previously committed Pelican, Crafty, YouTube and Immich shared-link credentials
must be revoked or replaced with credentials limited to the required read permissions.
Removing Git history does not invalidate credentials or remove copies from other clones.

Git history was rewritten to remove the exposed values and generated build artifacts.
Existing clones should be replaced with fresh clones. Do not merge or push the old history.
GitHub may retain old commit views; ask GitHub Support for cached-view removal when needed.

## Operations

Run `npm start`, or `node --env-file-if-exists=.env.local server/index.js`.
`PORT` defaults to 3000; `HOST` defaults to `0.0.0.0`.
For Docker, build the Dockerfile and pass secrets at runtime. The container runs as UID 1001
on Node.js 24 and performs no npm installation or framework build.

Mount a persistent volume at `/app/data` (owned by UID 1001), or set `MX11_DATA_DIR` to a
writable persistent directory. Announcements survive restarts; admin sessions do not.
Sessions expire on the server after eight hours. Login attempts are limited to ten per
five minutes per application process. Configure additional limits at the reverse proxy
for multi-instance deployments. Set `APP_ORIGIN` if the proxy changes the request host.
Production admin cookies require HTTPS (`NODE_ENV=production`). Admin request bodies are
limited to 16 KiB, and cross-origin mutations are rejected.

The status API shares a 15-second snapshot and in-flight probes between visitors.
Panel snapshots refresh every 30 seconds while their card is open.
In-memory caches and login/session state are scoped to a single application process;
use one replica unless these stores are replaced with shared infrastructure.
