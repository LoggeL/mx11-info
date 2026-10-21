# MX11 Services Dashboard

Next.js 16 and React 19 dashboard for Max's services, game servers and portfolio.
The existing layout, CSS, logos and animation settings are preserved.

## Development

Use Node.js 24 LTS and npm.

1. Run `npm ci`.
2. Copy `.env.example` to the ignored `.env.local` and configure only the integrations you use.
3. Run `npm run dev`.

`npm run check` runs lint, type checks, isolated tests and the production build.
`npm audit --omit=dev` checks production dependencies.

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

Build with `npm run build` and start with `npm start`, or build the Dockerfile.
The container runs as an unprivileged user on Node.js 24.
Pass secrets at runtime with your deployment's environment settings; do not bake them into images.

Mount a persistent volume at `/app/data` (owned by UID 1001), or set `MX11_DATA_DIR` to a
writable persistent directory. Announcements survive restarts; admin sessions do not.
Sessions expire on the server after eight hours. Login attempts are limited to ten per
five minutes per application process. Configure additional limits at the reverse proxy
for multi-instance deployments. Set `APP_ORIGIN` if the proxy changes the request host.

The status API shares a 15-second snapshot and in-flight probes between visitors.
Panel snapshots refresh every 30 seconds while their card is open.
In-memory caches and login/session state are scoped to a single application process;
use one replica unless these stores are replaced with shared infrastructure.
