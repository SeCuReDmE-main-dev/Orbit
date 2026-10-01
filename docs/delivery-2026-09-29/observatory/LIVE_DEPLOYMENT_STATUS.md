# Orbit public deployment status — 2026-09-29

## Intended public surfaces

| URL | Intended role | Static package state |
| --- | --- | --- |
| `https://orbit.securedme.ca/` | Interactive atom landing | Packaged and locally built |
| `https://orbit.securedme.ca/app/` | Public Orbit observatory | Packaged and locally built |
| `https://orbit.securedme.ca/guide/` | Human guide | Packaged and locally built |
| `https://orbit.securedme.ca/studio/` | Authenticated Studio for project `pzscx4w8` | Packaged and locally built |

`/studio/` is not a generic personal-Studio provisioner. It uses the authenticated Sanity session and the permissions that Sanity grants for the existing Orbit project.

## Verified release package

- Package: `orbit-public-orbit-observatory-20260929-1600.zip`
- SHA-256: `3c4e412d25d3eb4172b9fe53a95c57874a8ae71517004b087d218241da681a97`
- Archive secret-marker scan: passed
- Required paths: `index.html`, `app/index.html`, `guide/index.html`, `studio/index.html`, `.htaccess`
- Static Studio assets are mounted at `/static/`, matching the absolute asset URLs emitted by the Sanity build.

## Active deployment operator receipt

The active `securedme-education-alpha` operators were used, not the legacy cache:

- Settings health: success; canonical environment and virtual environment are `Z:\SecuredMe Education suite\.env` and `Z:\SecuredMe Education suite\.venv`.
- cPanel broker: ready; SSH deployment credentials and the live-mutation gate are present.
- Broker host alignment: the active Settings Operator updated the two non-secret addresses to the verified cPanel host `bishop.web-dns1.com` (plan `42d2fceab96421f6e1697d63`). No credential value was read or changed.
- Deployment plan: `34f6a9138b898819666e9b3f`.
- Remote backup retained: `/home/xacm7978/orbit.securedme.ca.backup-34f6a9138b898819666e9b3f`.
- Apply result: success over `brokered-ssh-sftp`; package SHA-256 matched before the atomic switch; required paths were verified; staging was cleaned.

The first attempt failed safely before mutation. After the address alignment, the active operator completed the same plan. Its cPanel UAPI read operations still fail safely, so no conclusion is drawn about the API token beyond that separate limitation.

## Public smoke test after deployment

The following HTTPS routes were fetched after the successful deployment:

| URL | HTTP status | Observed title / role |
| --- | ---: | --- |
| `https://orbit.securedme.ca/` | 200 | `Orbit — Un espace pour votre curiosité` landing |
| `https://orbit.securedme.ca/app/` | 200 | `Orbit — atelier de recherche` |
| `https://orbit.securedme.ca/guide/` | 200 | public guide |
| `https://orbit.securedme.ca/studio/` | 200 | `Sanity Studio` |

Browser inspection of the landing and `/app/` also confirmed the interactive atom, the central five-step dossier and exactly ten registered WebMCP tools. The read-only Context tool currently returns `CONTEXT_GATEWAY_UNAVAILABLE`: the static release is live, but the server-side Laravel Context gateway still has not been installed or configured on cPanel.

The public check returned `403` for `/.env` and `/.git/config`. The static release manifest is public by design; it contains route and release metadata only. Direct `/api/v1/knowledge/outline` currently returns `404`, which the WebMCP wrapper turns into the explicit unavailable state above.

## What remains external

The remaining external deployment is the private Laravel Context gateway at `/api/v1/knowledge/*`. Its Sanity organization token must remain server-side and outside the document root. Do not upload `.env`, the Laravel gateway environment, or any mailbox credential to the public static directory.

## Atom portal update — 2026-09-29

The landing now has a fourth clickable portal, **Studio Sanity**, linked to `/studio/`. A fourth animated ring and satellite were added for it. Each portal follows its own satellite; its label chooses a nearby position to reduce overlap with other labels.

- Release: `orbit-public-atom-studio-follow-20260929-1647.zip`.
- SHA-256: `812f155e2dfc898f8f8c23b66e67d16519da29f2b876bea1b256e9f9512e5b32`.
- cPanel plan: `4cb49ac1c2a26a4bd1939f1e`; apply result: success.
- Remote backup: `/home/xacm7978/orbit.securedme.ca.backup-4cb49ac1c2a26a4bd1939f1e`.
- Validation: Astro Web build passed; package secret-marker scan passed; Chrome showed four portals and four rings on the public landing; clicking **Studio Sanity** reached the public `/studio/` route with the `Sanity Studio` title.
