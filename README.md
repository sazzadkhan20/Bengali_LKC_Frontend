---
title: Bengali LKC
emoji: 📚
colorFrom: blue
colorTo: green
sdk: docker
app_port: 3000
pinned: false
license: mit
---

# Bengali LKC — Bengali Local Knowledge Core

A role-based crowdsourcing platform for Bengali lexical data entry, multi-tier
validation, dispute arbitration and UKC-compatible LMF XML export.
Implements **LKC-BEN-SRS-001** (Bengali LKC Framework Requirements
Specification).

Built with **Next.js (App Router) · TypeScript · Tailwind CSS**, using
folder-based and dynamic routing throughout, and shipped with a production
Docker image for university-server deployment.

---

## Features

| Area | Highlights |
| --- | --- |
| **Public (Visitor)** | Homepage, word search (exact + prefix), gloss search, dictionary browse ordered by the Bengali Varnamala, semantic graphs — with **no internal IDs exposed** |
| **Seven-tier RBAC** | Platform Architect, System Moderator, Lexical Contributor, Lexical Editor, Chief Lexical Editor, Arbitration Curator + unauthenticated Visitor |
| **Quick Input** | Single-form lexical record entry: Bengali word, POS, synset link/create with ILI validation, definitions, sense & synset relations, honeypot + timing + CAPTCHA simulation, duplicate detection |
| **Validation pipeline** | Nine lifecycle states (DRAFT → … → VALIDATED/REJECTED) with the full §5.2 transition matrix, mandatory comments, audit trail |
| **Arbitration** | Contributor dispute rights, 72-hour response window, side-by-side claim view, panel voting with 2/3 quorum, conflict-of-interest exclusion, System Moderator tie-breaks and Pending Corrections |
| **Admin** | User creation, credential issuance / force reset / deactivation, anti-bot configuration, audit log (CSV/JSON download), data statistics |
| **Leader Board** | Per-role reward points (credited only on VALIDATED, SRS §7.8), independent Contributor / LE / CLE boards, 4-tier system (Gold/Silver/Bronze/Provisional), configurable point value & thresholds |
| **Community Board** | Authenticated-author feed (SRS §14): 500-char posts, Like/Unlike/Celebrate reactions, single-level replies, milestone auto-announcements with opt-out, post reporting + System Moderator moderation |
| **XML export** | Dry-run + configurable LMF export in the exact `Bangla_Mono_Lingual_Lexicons.xml` format, SHA-256 audit logging |
| **i18n** | English / Bengali UI toggle, Noto Sans Bengali rendering |

The full canonical lexicon (19,270 entries · 22,904 senses · 12,480 synsets ·
9,884 synset relations) is served from JSON seed data parsed out of
`Bangla Mono Lingual Lexicons.xml`.

## Getting started (development)

```bash
npm install

# Regenerate seed data if the canonical XML changes
# (expects the XML one directory above, or pass a path)
node scripts/build-seed.mjs

# If Turbopack panics with "Next.js package not found", clear the cache first:
# npm run clean

npm run dev
```

Open http://localhost:3000.

If Turbopack still fails on a Windows path that contains spaces, use the Webpack
dev server instead: `npm run dev:webpack`.

### Demo credentials

Authentication is credential-based (SRS §3.2): the Platform Architect creates
every account and emails a one-time password that must be changed at first
login. The demo seeds one credential per role — they are listed on the
`/login` page:

| Username | Password | Role |
| --- | --- | --- |
| `architect` | `architect2026` | Platform Architect |
| `moderator` | `moderator2026` | System Moderator |
| `contributor` | `contributor2026` | Lexical Contributor |
| `editor` | `editor2026` | Lexical Editor |
| `chief` | `chief2026` | Chief Lexical Editor |
| `curator` | `curator2026` | Arbitration Curator |
| `mita.c` | `welcome-mita-2026` | One-time password → forced first-login change |

A forgot-password flow (`/forgot-password`) issues a new one-time password
(emailed in production; shown on screen in the demo). Routine password
changes use a 2-step validation: current password first, then an OTP sent
to the registered email address.

## Deployment (Docker)

```bash
docker build -t bengali-lkc .
docker run -d -p 3000:3000 --name bengali-lkc bengali-lkc
# or
docker compose up -d --build
```

The image is a multi-stage build on `node:22-alpine` using Next.js standalone
output, runs as a non-root user and includes a healthcheck. Put it behind the
university reverse proxy (nginx/Apache) with TLS termination — HTTPS is
mandatory per SRS §12.3.

## Architecture notes

- `src/lib/lexicon.ts` — in-memory indexes over the canonical lexicon
  (entry/sense/synset maps, Varnamala buckets, reverse relations, search).
- `src/lib/store.ts` — **mock workflow database** (users, credentials,
  submissions, arbitration cases, community posts, audit trail, system
  config, reward-point derivation). It sits behind a small API surface so it
  can be swapped for PostgreSQL/Prisma without touching the UI.
  State resets on server restart by design for the demo.
- `src/lib/leaderboard.ts` / `src/lib/community.ts` — Leader Board ranking
  (SRS §7.8) and Community Board view models (SRS §14).
- `src/lib/wordnet21.ts` + `data/wordnet21-ili.json` — Princeton WordNet 2.1
  ILI registry (~118k synsets). Rebuild with `npm run build:wordnet21` after
  extracting the official `WordNet-2.1.tar.gz` into `data/wordnet21-src/`.
- `src/app/api/**` — REST endpoints for auth (login, change-password,
  forgot-password), submissions, review actions, arbitration, community,
  lookups (including `/api/lookup/ili`), export, audit download, users,
  credentials, config.
- `src/app/(public)/**` — visitor-facing routes; `src/app/(app)/dashboard/**`
  — authenticated role dashboards. Dynamic routes: `/word/[id]`,
  `/synset/[id]`, `/dashboard/submissions/[id]`, `/dashboard/arbitration/[id]`.

## Route map

```
/                        Homepage (hero, live counters, pipeline)
/login                   Credential login (demo credentials listed)
/change-password         2-step password change (current password + email OTP)
/forgot-password         Email-validated password reset
/about                   Project background and roles
/dictionary              Varnamala browse (50/page, stats for authenticated)
/search                  Word search  · /search/gloss  Gloss search
/search/synset           Synset / ILI search   (authenticated)
/search/sense            Sense ID search       (authenticated)
/word/[id]               Entry detail + concept hierarchy + semantic graph
/synset/[id]             Synset detail + hypernym path + graph (authenticated)
/dashboard               Role-specific dashboard (6 variants)
/dashboard/quick-input   Quick Input form (inline ILI Finder when creating a synset)
/dashboard/ili-finder    Standalone WordNet 2.1 ILI lookup (English word + POS)
/dashboard/submissions   My submissions (+ /[id] detail & actions)
/dashboard/queue         Review queues / queue management
/dashboard/arbitration   Case list (+ /[id] side-by-side voting view)
/dashboard/corrections   SM pending corrections
/dashboard/history       LE/CLE decision history
/dashboard/statistics    Data statistics dashboard
/dashboard/leaderboard   Leader Board (per-role points, tiers, ranks)
/dashboard/community     Author Community Board
  └ /profile/[id]        Author profile (info, rank) + /posts history
/dashboard/users|credentials|audit|config|export   Admin tools
```
