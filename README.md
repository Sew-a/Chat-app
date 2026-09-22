# Chat App Backend

Group chat demo backend. Users sign up/sign in, create a group (getting a single
**invite code**) or join an existing one, then exchange real-time text messages
and images with everyone else in that group. No 1:1 DMs.

Built with **NestJS 12**, **Prisma + PostgreSQL**, **Socket.io**, and
**Cloudflare R2** (S3-compatible) for image storage.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture / Project Structure](#architecture--project-structure)
- [Data Model](#data-model)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Ports](#ports)
- [REST API](#rest-api)
- [WebSocket Events](#websocket-events)
- [Image Upload Flow](#image-upload-flow)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Deployment Notes](#deployment-notes)
- [Security Notes](#security-notes)
- [Non-Goals (v1)](#non-goals-v1)

---

## Features

- Email + password auth (argon2 hashed), JWT (`7d` expiry).
- Each user has a username and optional avatar URL.
- **Create group** → server generates a unique invite code; creator is
  auto-joined. **Join group** → type an existing invite code. No separate
  password: the invite code *is* the key (like Discord invite links / Kahoot).
- Real-time chat per group via a Socket.io namespace (`/chat`).
- Text messages (max 2000 chars) and image messages (via REST upload → R2).
- Paginated message history (cursor-based, 30 per page).
- Group membership enforced on every REST and WS operation.
- Validation on all inputs (class-validator + global `ValidationPipe`).

## Tech Stack

| Layer       | Technology                                   |
| ----------- | -------------------------------------------- |
| Framework   | NestJS 12 (constructor-injected services)    |
| Database    | PostgreSQL 16 via Prisma ORM                 |
| Real-time   | `@nestjs/websockets` + Socket.io (`/chat`)   |
| Auth        | Passport (JWT) + argon2 password hashing    |
| Images      | Cloudflare R2 (any S3-compatible bucket)     |
| Runtime     | Node.js 20+ (built with Node 24 in dev)      |

## Architecture / Project Structure

```
src/
├── main.ts                     # Bootstrap: CORS, ValidationPipe, global filters, /api prefix
├── app.module.ts               # Root module wiring
├── lib/
│   ├── database/
│   │   ├── prisma.module.ts    # @Global Prisma module
│   │   └── prisma.service.ts   # PrismaClient lifecycle (connect/disconnect)
│   └── storage/
│       ├── storage.module.ts   # @Global R2 storage module
│       └── storage.service.ts  # R2 upload (path-style S3, image whitelist)
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts   # @CurrentUser() -> { userId, email }
│   ├── filters/
│   │   └── multer-error.filter.ts      # MulterError -> 413 / 400 (added)
│   └── guards/
│       ├── jwt-auth.guard.ts           # HTTP JWT guard
│       └── ws-auth.guard.ts            # WebSocket JWT guard
└── module/
    ├── auth/                   # signup / signin / JWT (strategies, dto)
    ├── user/                   # GET /users/me, PATCH /users/me
    ├── group/                  # create, join by invite code, list mine
    └── chat/                   # REST history + upload, WS gateway/service
```

Modules are intentionally split one-per-integration (`AuthModule`,
`GroupModule`, ...). `PrismaModule`, `StorageModule` and `AuthModule` are
`@Global()`.

## Data Model

```prisma
User         id, email (unique), passwordHash, username, avatarUrl?, createdAt
Group        id, name?, inviteCode (unique), createdAt
GroupMember  id, userId, groupId, joinedAt   @@unique([userId, groupId])
Message      id, groupId, userId, content?, imageUrl?, createdAt
```

A message must have `content` OR `imageUrl` (`ChatService.createMessage`
enforces this). `inviteCode` is the single shareable string (8 chars,
unambiguous alphabet, no `0/O/1/I`).

## Prerequisites

- Node.js ≥ 20 (project developed on Node 24)
- Docker (for local PostgreSQL)
- Optional: a Cloudflare R2 bucket (or any S3-compatible storage) for image uploads

## Quick Start

```bash
# 1. Start PostgreSQL. Postgres listens on 5432 INSIDE the container; the docker
#    flag maps host port 5555 -> container 5432, matching DATABASE_URL.
docker run -d --name chat-postgres \
  -e POSTGRES_USER=chat -e POSTGRES_PASSWORD=chat -e POSTGRES_DB=chat-app \
  -p 5555:5432 postgres:16-alpine

# 2. Configure env (values in .env are already wired for local dev)
cp .env.example .env   # adjust DATABASE_URL / JWT_SECRET as needed

# 3. Install, generate the Prisma client, sync the schema
npm install
npm run prisma:generate
npm run prisma:push

# 4. Run (dev watches; prod uses dist/)
npm run start:dev     # or npm run build && npm run start:prod

# Health check
curl http://localhost:3000/api/users/me   # -> 401 until you send a JWT (expected)
```

The app listens on **port 3000** by default (`PORT` env). REST routes are
prefixed with `/api`.

## Environment Variables

All values come from `.env` (see `.env.example`).

| Variable              | Required | Description                                          |
| --------------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL`        | Yes      | Prisma Postgres DSN. Local example points at `localhost:5555` |
| `JWT_SECRET`          | Yes      | Secret used to sign/verify JWTs                       |
| `FRONTEND_URL`        | No       | CORS origin for the React app (default `*`)           |
| `PORT`                | No       | HTTP port (default `3000`)                            |
| `R2_ENDPOINT`         | No*      | R2/S3 endpoint e.g. `https://<account>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID`    | No*      | R2 access key                                         |
| `R2_SECRET_ACCESS_KEY`| No*      | R2 secret key                                         |
| `R2_BUCKET_NAME`      | No*      | Bucket name, e.g. `chat-app-images`                   |
| `R2_PUBLIC_BASE_URL`  | No*      | Public URL prefix for uploaded files                  |

\* Without R2 vars, `/chat/.../image` uploads return **503 Service Unavailable**
(intended). Once configured, uploads work.

## Ports

| Port | Owner          | Notes                                            |
| ---- | -------------- | ------------------------------------------------ |
| 5555 | PostgreSQL     | Host-side port of the Postgres container (inside the container it is 5432). `DATABASE_URL` uses 5555. |
| 5556 | Prisma Studio  | `npm run prisma:studio` is pinned to **5556** because Prisma Studio's default (5555) would collide with the database on the same host. |
| 3000 | NestJS (HTTP)  | Main app + REST endpoints under `/api`.          |
| (3000) | Socket.io      | Live chat namespace `http://localhost:3000/chat` |

> ⚙️ Fixed issues: the original setup mapped the container as `-p 5555:5555`,
> which points at a port Postgres never listens on (it uses 5432) → the app
> could not connect. The correct mapping is `-p 5555:5432`. `prisma:studio` was
> also moved to 5556 to avoid clashing with the database.

## REST API

Full reference with example request/response bodies: [`API.md`](./API.md).

| Method | Route                                  | Auth | Description                              |
| ------ | -------------------------------------- | ---- | ---------------------------------------- |
| POST   | `/api/auth/signup`                     | –    | email, password, username, avatarUrl? → `{ accessToken, user }` |
| POST   | `/api/auth/signin`                     | –    | email, password → `{ accessToken, user }` |
| GET    | `/api/users/me`                        | ✔    | My profile                               |
| PATCH  | `/api/users/me`                        | ✔    | Update username / avatarUrl              |
| POST   | `/api/groups`                          | ✔    | Create group → `{ id, name, inviteCode, ... }` |
| POST   | `/api/groups/join`                     | ✔    | `{ inviteCode }` → joined group            |
| GET    | `/api/groups`                          | ✔    | My groups (newest first)                 |
| GET    | `/api/groups/:groupId/messages`        | ✔    | 30 msg history (`?cursor=<messageId>`)   |
| POST   | `/api/groups/:groupId/messages/image`  | ✔    | Multipart `file` upload → `{ imageUrl }` |

All authenticated requests send `Authorization: Bearer <token>`.

**Auth flow (frontend):** after signup/signin store the `accessToken`, attach it
to every request, and pass it to the Socket.io handshake (`auth: { token }`).

## WebSocket Events

Connect to the `chat` namespace, e.g. `io('http://localhost:3000/chat', { auth: { token } })`.

**Client → Server**

| Event         | Payload                    | Purpose                              |
| ------------- | -------------------------- | ------------------------------------ |
| `join_group`  | `{ groupId }`              | Join the group's socket room (membership checked) |
| `send_message`| `{ groupId, content?, imageUrl? }` | Persist + broadcast a message |

**Server → Client**

| Event          | Payload                                  |
| -------------- | ---------------------------------------- |
| `joined_group` | `{ groupId }` (ack of `join_group`)      |
| `message_sent` | `{ messageId }` (ack of `send_message`)  |
| `new_message`  | Full message incl. `user { id, username, avatarUrl }` — broadcast to all room members (sender included) |

## Image Upload Flow

1. Client uploads the file: `POST /api/groups/:groupId/messages/image`
   (`multipart/form-data`, field name **`file`**).
2. Backend validates: member of the group, file is an image (JPEG/PNG/WebP/GIF/AVIF),
   max **10 MB**, then puts it in R2 under `messages/<uuid>.<ext>` and returns
   `{ imageUrl }`.
3. Client sends the live message over WS: `emit('send_message', { groupId, imageUrl, content? })`.

Upload protections (added in this pass):

- `FileInterceptor` uses `limits: { fileSize: 10MB }` so oversized uploads are
  rejected mid-stream instead of being buffered into memory (OOM guard).
- `fileFilter` rejects non-`image/*` files with a clean **400**.
- `StorageService` derives the stored extension from a **MIME-type whitelist**,
  never from the client filename (prevents arbitrary/HTML/JS uploads → stored XSS).
- R2 client now uses **path-style addressing** (`forcePathStyle: true`), required
  by R2/S3-compatible buckets.
- `MulterError` is mapped to **413 / 400** instead of a raw 500.

## Scripts

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run build`       | Compile to `dist/` (cleans output first) |
| `npm run start`       | Run from source                          |
| `npm run start:dev`   | Run with watch                           |
| `npm run start:prod`  | Run compiled `dist/main`                 |
| `npm run prisma:generate` | Generate Prisma Client               |
| `npm run prisma:push` | Push schema to the DB (no migration history) |
| `npm run prisma:migrate` | Create/apply migrations              |
| `npm run prisma:studio` | Open Studio on **http://localhost:5556** |

> No linter/formatter/test suit is configured for this project yet.

## Troubleshooting

- **`prisma generate` fails with `EPERM ... query_engine-windows.dll.node`**:
  a running server (`node dist/main.js`) locks the engine DLL. Stop the app
  process first, then re-run generate/build.
- **App won't boot / connection refused**: Postgres must be reachable on
  `DATABASE_URL`. Confirm the container mapping is `-p 5555:5432`
  (`docker ps` should show `0.0.0.0:5555->5432/tcp`), then `npm run prisma:push`.
- **`prisma:studio` won't open**: it is pinned to 5556 — open
  `http://localhost:5556`, not 5555 (5555 is the database).
- **Image upload returns 503**: R2 vars not set (expected until configured).
- **400 "avatarUrl must be a string" on signup**: fixed in this pass — `avatarUrl`
  is optional (`@IsOptional()`), so omitting it no longer fails validation.

## Deployment Notes

Per the project spec (`AGENT.md`): Cloudflare Workers cannot host a long-running
NestJS process or persistent WebSockets. Suggested split:

- **Frontend (React)** → Cloudflare Pages
- **Backend (NestJS + Socket.io)** → Railway / Render / Fly.io (long-lived
  Node runtime)
- **Database** → Neon / Supabase (serverless Postgres); set `DATABASE_URL` to
  the provider DSN
- **Images** → Cloudflare R2 (works regardless of where the backend runs)

For production: set a strong `JWT_SECRET`, restrict the Socket.io gateway CORS
(`chat.gateway.ts` currently uses `origin: '*'`), and use HTTPS everywhere.

## Security Notes

- Passwords hashed with argon2; never logged or returned.
- JWT contains `sub` (userId) + `email`; expiry 7 days.
- Every group-scoped operation runs `assertMembership` (REST and WS).
- Uploads: whitelisted image MIME types, server-side extension derivation,
  size cap, path-style R2 addressing.
- Gateway CORS is `*` — tighten to your frontend origin before shipping.
- `.env` contains a local dev secret and is committed in this repo — for
  production use real secrets via your host's environment/secrets manager.

## Non-Goals (v1)

From the spec — intentionally out of scope:

- No 1:1 direct messages
- No emoji picker / reactions
- No voice/sound messages
- No separate group password (only the invite code)
- No read receipts / typing indicators

---

© Group Chat Demo — portfolio project. See [`AGENT.md`](./AGENT.md) for the
original spec and [`API.md`](./API.md) for the full endpoint reference.