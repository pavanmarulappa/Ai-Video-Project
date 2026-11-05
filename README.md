# Frameforge

Frameforge is a local-first MVP for creating and managing AI video generations. It includes account registration, a private dashboard, a provider-aware video form, a background worker, history, previews, and downloads.

## Roadmap and architecture

1. **Web app:** Next.js App Router, React, TypeScript, and Tailwind CSS render the marketing site and signed-in studio.
2. **Accounts and jobs:** Prisma stores users and generation metadata in PostgreSQL. Passwords are hashed; a signed, HTTP-only cookie protects the studio and API routes.
3. **Background generation:** The web app validates and saves a job, then sends its ID to BullMQ. A separate worker updates its status and calls the configured provider.
4. **Provider boundary:** The mock and Runway adapters implement the same interface and advertise their own supported ratios, durations, and resolutions. The server rejects unsupported settings.
5. **Video storage:** The worker copies completed output into local disk storage by default, or an S3-compatible bucket when configured. Videos stay out of the database and are streamed only through an authenticated, owner-checked route.

The default mock provider needs no paid AI credentials. It returns the same public CC0 flower sample for every prompt, so the MVP can exercise the complete queue, storage, preview, and download flow. The first run needs internet access to fetch that sample.

## Requirements

- Node.js 20.9 or newer (Node 24 is fine)
- npm
- Docker Desktop with Compose, for the local PostgreSQL and Redis services

## Run it locally (Windows PowerShell)

From the project folder:

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
npm run db:deploy
```

Open two PowerShell terminals in the project folder. In the first one, start the web app:

```powershell
npm run dev
```

In the second one, start the background worker:

```powershell
npm run worker
```

Visit [http://localhost:3000](http://localhost:3000), create an account, and submit a video prompt. The video should move from **In queue** to **Creating** and then **Complete**. The mock result is the same sample video each time; its prompt and requested settings are still saved in your history.

The `.env.example` secret is suitable only for local development. Before sharing a running app, replace `AUTH_SECRET` in `.env` with a random value. You can generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

To stop PostgreSQL and Redis, run `docker compose down`. Their local data stays in Docker volumes.

## Connecting Runway

The Runway adapter uses the official text-to-video task endpoint from the Node server and worker. It sends the API key in a server-side `Authorization: Bearer` header and the required `X-Runway-Version: 2024-11-06` header. The adapter creates a task, saves its task ID, polls for completion, and downloads the returned output into your configured storage. This matters because Runway output URLs are temporary.

Current adapter settings are intentionally limited to the options documented for Runway Gen-4.5 text-to-video:

- Model: `gen4.5` (fixed in this adapter).
- Aspect ratio: landscape 16:9 or portrait 9:16. Square is not offered by this adapter.
- Duration choices shown in the form: 5, 8, or 10 seconds (within Gen-4.5's documented 2–10 second range).
- Resolution: 720p. The form hides higher resolutions that this adapter does not advertise.
- Billing and availability depend on your Runway developer account, credits, and model access. Check the live pricing and model pages before using paid generation.

1. Create an API key in your Runway developer account.
2. In `.env`, set `VIDEO_PROVIDER="runway"` and `RUNWAY_API_KEY="your-key"`.
3. Restart both `npm run dev` and `npm run worker`.

Official references (review them for changes before upgrading the adapter):

- [Runway API getting started: text-to-video and task flow](https://docs.dev.runwayml.com/guides/using-the-api/)
- [Runway API reference: text-to-video request, authentication, and version header](https://docs.dev.runwayml.com/api/)
- [Runway input docs: model aspect ratios and duration capabilities](https://docs.dev.runwayml.com/assets/inputs/)
- [Runway output docs: task output and temporary URLs](https://docs.dev.runwayml.com/assets/outputs/)
- [Runway model guide](https://docs.dev.runwayml.com/guides/models/) and [pricing](https://docs.dev.runwayml.com/guides/pricing/)

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Local PostgreSQL in `.env.example` | Prisma connection string |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ connection |
| `AUTH_SECRET` | Local development placeholder | Signs the seven-day HTTP-only session cookie; use a random secret outside local development |
| `VIDEO_PROVIDER` | `mock` | `mock` or `runway` |
| `RUNWAY_API_KEY` | Empty | Server-only Runway credential when using the Runway adapter |
| `MOCK_VIDEO_URL` | Public sample MP4 | Optional HTTPS source for mock output |
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `VIDEO_STORAGE_DIR` | `data/videos` | Folder for local generated videos; ignored by Git |
| `AWS_REGION` | `us-east-1` | S3 bucket region |
| `S3_BUCKET` | Empty | Bucket name when `STORAGE_DRIVER=s3` |
| `S3_ENDPOINT` | Empty | Optional endpoint for MinIO or another S3-compatible service |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Empty | Optional explicit S3 credentials; normal AWS credential-chain configuration also works |
| `S3_FORCE_PATH_STYLE` | `false` | Set `true` for S3-compatible services that require path-style URLs |
| `WORKER_CONCURRENCY` | `2` | Number of generation jobs handled at once by the worker |

For a local S3-compatible service such as MinIO, set `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_BUCKET`, access keys, and `S3_FORCE_PATH_STYLE=true`. Create the bucket before generating. PostgreSQL and Redis are included in `docker-compose.yml`; MinIO is optional and is not started by the default Compose file.

## Useful commands

```powershell
npm run dev          # Next.js development server
npm run worker       # Background generation worker
npm run db:migrate -- --name describe-your-change
npm run db:generate  # Regenerate Prisma client after schema changes
npm run build        # Production build
npm run start        # Serve a production build
```

## Limitations

- Mock mode is a workflow demo and does not synthesize a new video from the prompt. Its public sample source must be reachable from the worker.
- This MVP implements local and S3-compatible object storage, but leaves MinIO setup to the developer.
- Email verification, password reset, rate limiting, billing, and high availability are outside this MVP. The single-server [Ubuntu deployment guide](DEPLOY-UBUNTU.md) supports private SSH-tunnel access without a domain and public HTTPS when you add one.
- Runway's model list, limits, API headers, output retention, and prices can change. The adapter is intentionally narrow; use the linked official docs when updating it.
- If a provider task fails after its retry attempts, the history records the failure message and the user can submit a new job.
