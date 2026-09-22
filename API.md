# Frontend API Reference

Base REST URL: `http://localhost:3000/api`
Base WebSocket URL: `http://localhost:3000/chat` (Socket.io namespace `/chat`)

All authenticated requests send `Authorization: Bearer <accessToken>`.

---

## 1. Auth

### Sign up
`POST /api/auth/signup`

Request body:
```json
{
  "email": "sev@example.com",
  "password": "at-least-8-chars",
  "username": "sev",
  "avatarUrl": "https://example.com/avatar.png"
}
```

Response `201`:
```json
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "clx123...",
    "email": "sev@example.com",
    "username": "sev",
    "avatarUrl": "https://example.com/avatar.png"
  }
}
```

### Sign in
`POST /api/auth/signin`

Request body:
```json
{ "email": "sev@example.com", "password": "at-least-8-chars" }
```

Response `200`: same shape as signup.

Store `accessToken` (e.g. in memory + httpOnly-adjacent storage or a secure
cookie) and attach it to every subsequent request.

---

## 2. User

### Get my profile
`GET /api/users/me` — requires auth.

Response:
```json
{ "id": "clx123...", "email": "sev@example.com", "username": "sev", "avatarUrl": null, "createdAt": "..." }
```

### Update my profile
`PATCH /api/users/me` — requires auth.

Request body (either field optional):
```json
{ "username": "new-name", "avatarUrl": "https://example.com/new.png" }
```

---

## 3. Groups (this is the "create/join chat" step, right after sign-in)

### Create a group
`POST /api/groups` — requires auth.

Request body:
```json
{ "name": "Optional display name" }
```

Response `201`:
```json
{
  "id": "clxabc...",
  "name": "Optional display name",
  "inviteCode": "K7M2P9QX",
  "createdAt": "...",
  "members": [{ "id": "...", "userId": "...", "groupId": "...", "joinedAt": "..." }]
}
```

`inviteCode` is the single code you show the user to share — there is no
separate password. Anyone with the code can join.

### Join an existing group
`POST /api/groups/join` — requires auth.

Request body:
```json
{ "inviteCode": "K7M2P9QX" }
```

Response `200`: the group object.

### List my groups
`GET /api/groups` — requires auth.

Response: array of group objects, newest first.

---

## 4. Chat — message history & image upload (REST)

### Get message history
`GET /api/groups/:groupId/messages?cursor=<messageId>` — requires auth.

Returns the 30 most recent messages (oldest → newest). Pass the id of the
oldest message you currently have as `cursor` to page further back.

Response:
```json
[
  {
    "id": "msg1...",
    "groupId": "clxabc...",
    "userId": "clx123...",
    "content": "hey",
    "imageUrl": null,
    "createdAt": "...",
    "user": { "id": "clx123...", "username": "sev", "avatarUrl": null }
  }
]
```

### Upload an image (before sending it as a message)
`POST /api/groups/:groupId/messages/image` — requires auth, `multipart/form-data`, field name `file`.

Response:
```json
{ "imageUrl": "https://your-r2-domain/messages/uuid.png" }
```

Flow: upload the image via this endpoint first, then send the returned
`imageUrl` (optionally with caption text) over the WebSocket `send_message`
event below.

---

## 5. Chat — real-time (Socket.io)

Connect, authenticated, to the `chat` namespace:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: { token: accessToken },
});
```

### Join a group's live room
Emit once per group you want to receive live messages for (typically when
the user opens that chat screen):

```js
socket.emit('join_group', { groupId: 'clxabc...' });
```

### Send a message
```js
socket.emit('send_message', {
  groupId: 'clxabc...',
  content: 'hello!',       // optional if imageUrl is present
  imageUrl: undefined,      // optional, from the upload endpoint above
});
```

### Receive messages
```js
socket.on('new_message', (message) => {
  // message has the same shape as the history endpoint's items
});
```

---

## Suggested frontend flow

1. Sign up / sign in → store `accessToken`.
2. Prompt: "Create a group" or "Join a group" → call the matching endpoint.
3. On entering a group screen: `GET` history, then `socket.emit('join_group', ...)`.
4. Render `new_message` events live; send via `socket.emit('send_message', ...)`.
5. For images: upload via REST first, then send the returned URL over the socket.
