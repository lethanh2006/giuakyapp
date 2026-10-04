# Chat Service

NestJS 11 service for one-to-one conversations, image messages and Socket.IO
presence/events. The team shares the MongoDB Atlas dev database `nrapp_dev`;
Chat stores conversations and messages in the `chats` and `messages`
collections. `MONGO_DB_NAME` controls the database used by this service.

See [Luồng hoạt động tổng quan của chức năng chat](docs/chat-flow.md) for the
frontend-to-backend flow, API examples and realtime events (Vietnamese).
See [COMMON.md](COMMON.md) for the shared HTTP flow and source layout.

## HTTP contract

- `GET /health`, `GET /health/ready`, `GET /health/live`
- `POST /api/chat/chat/new`
- `GET /api/chat/chat/all`
- `POST /api/chat/message` (`multipart/form-data`, optional `image`, maximum 5MB)
- `GET /api/chat/message/:chatId`

Chat routes accept the Gateway's base64 `x-user-payload` header. Direct calls
remain compatible with `Authorization: Bearer <jwt>`.

## Socket.IO contract

Connect on the default `/socket.io` path with `auth.token`. The service accepts
`typing` and `typingStop`, and emits `getOnlineUsers`, `userTyping`,
`userTypingStop`, `newMessage` and `messagesSeen`. Multiple tabs/devices are
tracked for each user.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Run `npm run setup` at the project root to install dependencies and generate
matching secrets. Set the Atlas dev URI supplied privately by the team owner
in `backend/.env`:

```env
MONGO_MODE=atlas
MONGO_URL=mongodb+srv://<db_user>:<url_encoded_password>@<dev_cluster>/nrapp_dev?retryWrites=true&w=majority
MONGO_DB_NAME=nrapp_dev
```

Start the services needed for chat from the project root:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail,chat
```

The runner starts the required local infrastructure and watches source
changes. Atlas is the default MongoDB connection; a MongoDB Docker container
is not required. All team members using the same URI and database see the same
dev chat data. Use `npm run dev:backend` when testing the whole application.

If starting Chat directly with `npm run dev`, start its dependencies separately
as well. The service reads `backend/.env` before its own `.env`, so the central
MongoDB configuration also applies to direct startup. Optional local MongoDB
uses `MONGO_MODE=local` and Compose's `local-mongo` profile, which initializes
replica set `rs0`.
See [local onboarding](../../README.md). Keep real database credentials out of Git.

Image uploads retain the `chat-images` Cloudinary folder, JPG/JPEG/PNG/GIF
allow-list and 800x800 `limit` transformation.
