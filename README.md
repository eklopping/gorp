# SessionNote

Shared TTRPG session notes for a whole table. The GM creates a campaign, invites players with a link, and everyone can edit session notes. The GM can kick or ban members.

## Stack

- Next.js (App Router)
- Better Auth (email/password)
- Drizzle ORM + SQLite (simple single-VM deploy; Postgres later if needed)
- Docker Compose for Linux VM hosting

## Local development

1. Copy env values:

```bash
cp .env.example .env
```

2. Set `BETTER_AUTH_SECRET` to a long random string.

3. Install and push the schema:

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Linux VM deploy

```bash
cp .env.example .env
# edit BETTER_AUTH_SECRET and BETTER_AUTH_URL (https://your-domain)
docker compose up -d --build
```

Data lives in the `sessionnote-data` volume (`/data/sessionnote.db` in the container). Put a reverse proxy (Caddy/Nginx) in front for TLS.

## Current MVP

- Sign up / log in
- GM creates campaign (auto-creates invite)
- Invite link join as player
- GM kick (can rejoin) / ban (cannot rejoin)
- Shared session notes create + edit

## Next

- Customizable ID cards (people/places)
- Mentions in notes + sidebar history
- Campaign timeline
- Map import + markers
