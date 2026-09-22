React frontend
Nest backend

Both already installed apps.

Want to create user message-ing app, with one thing that different

1. User logs in (Email, password as everywhere)
2. Data username and avatar thats all.
3. user then can't chat with other peoples who logged in. he should create a group with unique id.
   that unique group will be saved in store with that id/password.
4. same user or other user can simply hit join existing group button, type id/password (id & password are same thing, will you please say what's the corrected way? ).
5. when user comes to group he enters chat mode and can write messages in that group/chat.
6. other user or users can write as well, and thats it.
7. In chat every user writes text, no emojis, no sound sending, sending pics will be included.

#So the breakdown is:
The whole work user sign-up or sign-in.
Creates group with unique password or enters existing one with typing password of existing 3. Starts writing and recievning messages from other users in that chat.

# Project Spec: Group Chat Demo App

## Overview

A portfolio demo app where users sign up, create or join a chat group using a
single shared invite code, and exchange real-time text messages and images
within that group. No DMs between individual users — all messaging happens
inside a group.

## Tech Stack

- **Frontend**: React
- **Backend**: Nest.js (constructor-injected services, module-per-integration —
  see project `AGENT.md` code standards)
- **Database**: PostgreSQL, via Prisma ORM (Neon or Supabase free tier for a
  serverless Postgres instance)
- **Real-time**: Nest.js WebSocket Gateway (`@nestjs/websockets` + Socket.io)
- **Image storage**: Cloudflare R2 (or any S3-compatible bucket)
- **Auth**: Email + password, hashed with bcrypt/argon2, JWT session

## Infrastructure note (Cloudflare)

Cloudflare Workers cannot host a standard long-running Nest.js process or
native persistent WebSocket connections. Recommended split for this demo:

- **Frontend** → Cloudflare Pages
- **Backend (Nest + Socket.io)** → Railway, Render, or Fly.io (free/cheap tier,
  normal Node.js runtime, supports long-lived sockets)
- **Image storage** → Cloudflare R2 (works fine independent of where the
  backend runs)

If a fully Cloudflare-native backend is required later, real-time would need
to be rebuilt on Durable Objects instead of a Nest Gateway — out of scope for
this demo.

## Terminology correction: "ID/password"

Treat this as a **single invite code**, not two separate values. One unique
code is generated when a group is created; anyone who has that code can join.
This matches familiar patterns (Discord invite links, Kahoot PINs). Avoid
building a second "password" field — it adds complexity with no benefit here.

## Core Flow

1. **Sign up / sign in** — email + password. On sign-up, also collect
   username and avatar.
2. **Create group** — user clicks "Create Group," backend generates a unique
   invite code, group is created and the creator is auto-joined.
3. **Join group** — user clicks "Join Group," types an existing invite code.
   If valid, they're added as a member.
4. **Chat** — once in a group, user enters chat mode: sends/receives text
   messages and images in real time with other members of that group.
5. No emoji picker, no sound/voice messages. Image sending is in scope.

## Data Model (Prisma sketch)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  username     String
  avatarUrl    String?
  createdAt    DateTime @default(now())
  memberships  GroupMember[]
  messages     Message[]
}

model Group {
  id         String   @id @default(cuid())
  inviteCode String   @unique
  createdAt  DateTime @default(now())
  members    GroupMember[]
  messages   Message[]
}

model GroupMember {
  id        String   @id @default(cuid())
  userId    String
  groupId   String
  joinedAt  DateTime @default(now())
  user      User  @relation(fields: [userId], references: [id])
  group     Group @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

model Message {
  id        String   @id @default(cuid())
  groupId   String
  userId    String
  content   String?
  imageUrl  String?
  createdAt DateTime @default(now())
  group     Group @relation(fields: [groupId], references: [id])
  user      User  @relation(fields: [userId], references: [id])
}
```

## Backend Modules (per project code standards)

- `src/lib/database/` — `prisma.module.ts` + `prisma.service.ts` (`@Global()`)
- `src/lib/storage/` — `storage.module.ts` + `storage.service.ts` (R2 upload,
  `@Global()`)
- `src/module/auth/` — sign-up, sign-in, JWT issuing/guard
- `src/module/user/` — profile (username, avatar) read/update
- `src/module/group/` — create group, join by invite code, list my groups
- `src/module/chat/` — WebSocket gateway: join room, send message, broadcast
  to group, message history fetch (REST, paginated)
- `src/common/` — auth guard, WS auth guard, DTO validation pipes

## REST Endpoints (indicative)

- `POST /auth/signup` — email, password, username, avatar
- `POST /auth/signin` — email, password → JWT
- `POST /groups` — create group → returns inviteCode
- `POST /groups/join` — { inviteCode } → joins caller to group
- `GET /groups/:id/messages` — paginated message history
- `POST /groups/:id/messages/image` — image upload → returns imageUrl

## WebSocket Events (indicative)

- `join_group` (client → server): join a group's socket room
- `send_message` (client → server): { groupId, content? , imageUrl? }
- `new_message` (server → client): broadcast to group room

## Explicit Non-Goals (for this demo)

- No 1:1 direct messages between users
- No emoji reactions or emoji picker
- No voice/sound messages
- No group password separate from the invite code
- No read receipts / typing indicators (nice-to-have, not required for v1)

## Suggested Build Order

1. Auth (sign-up/sign-in, JWT) + username/avatar capture
2. Group create/join by invite code
3. REST message history (no real-time yet) to validate data model
4. WebSocket gateway for live send/receive
5. Image upload (R2) wired into chat
6. Deploy: frontend → Cloudflare Pages, backend → Railway/Render/Fly, DB →
   Neon/Supabase, images → R2
