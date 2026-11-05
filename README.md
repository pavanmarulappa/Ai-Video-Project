# Frameforge

Frameforge is a local-first MVP for creating and managing AI video generations. It includes account registration, a private dashboard, a provider-aware video form, a background worker, history, previews, and downloads.

## Roadmap and architecture

1. **Web app:** Next.js App Router, React, TypeScript, and Tailwind CSS render the marketing site and signed-in studio.
2. **Accounts and jobs:** Prisma stores users and generation metadata in PostgreSQL. Passwords are hashed; a signed, HTTP-only cookie protects the studio and API routes.
3. **Background generation:** The web app validates and saves a job, then sends its ID to BullMQ. A separate worker updates its status and calls the configured provider.
4. **Provider boundary:** Runway, Replicate, and fal.ai adapters implement the same interface and advertise their own supported ratios, durations, and resolutions. An admin can change the active provider in the studio; each generation keeps the provider it was submitted to.
5. **Video storage:** The worker copies completed output into local disk storage by default, or an S3-compatible bucket when configured. Videos stay out of the database and are streamed only through an authenticated, owner-checked route.

Frameforge now uses real video providers only. Add an API key for the selected provider before generating. API usage may incur charges.

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

Set `FAL_KEY` in `.env`, then visit [http://localhost:3000](http://localhost:3000), create an account, and submit a video prompt. The video should move from **In queue** to **Creating** and then **Complete**. The `FAL_KEY` stays on the server and is never sent to the browser.

To access provider settings locally, set `ADMIN_EMAIL` in `.env` to the email address you use to register or sign in. After signing in, open **Providers** in the left navigation. Add provider API keys to the server environment before selecting those providers.

The `.env.example` secret is suitable only for local development. Before sharing a running app, replace `AUTH_SECRET` in `.env` with a random value. You can generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

To stop PostgreSQL and Redis, run `docker compose down`. Their local data stays in Docker volumes.

## Video providers

The studio includes three provider options:

- **Runway Gen-4.5:** 720p text-to-video, 2–10 seconds in this adapter. Set `RUNWAY_API_KEY`.
- **Replicate Wan 3:** 720p or 1080p, portrait supported, up to 30 seconds. Set `REPLICATE_API_TOKEN`.
- **fal.ai Wan 3:** 720p or 1080p, portrait supported, up to 30 seconds, with generated audio enabled. Set `FAL_KEY`.

Provider API usage may be billed per successful generation; free trial credits or promotional access are account-specific and not guaranteed. Check live pricing and account credit terms before generating. Wan 3 supports up to 30 seconds in one request, so 35–45 second videos still need more than one clip and editing.

The active provider is selected in **Providers** in the signed-in studio. Its choice is stored in PostgreSQL and applies to new generations; existing queued jobs retain their original provider. `VIDEO_PROVIDER` is only the initial default before an admin makes a selection. The admin account is the signed-in email that matches `ADMIN_EMAIL`.

### Connecting Runway

The Runway adapter uses the official text-to-video task endpoint from the Node server and worker. It sends the API key in a server-side `Authorization: Bearer` header and the required `X-Runway-Version: 2024-11-06` header. The adapter creates a task, saves its task ID, polls for completion, and downloads the returned output into your configured storage. This matters because Runway output URLs are temporary.

Current adapter settings are intentionally limited to the options documented for Runway Gen-4.5 text-to-video:

- Model: `gen4.5` (fixed in this adapter).
- Aspect ratio: landscape 16:9 or portrait 9:16. Square is not offered by this adapter.
- Duration choices shown in the form: every integer from 2 through 10 seconds.
- Resolution: 720p. The form hides higher resolutions that this adapter does not advertise.
- Billing and availability depend on your Runway developer account, credits, and model access. Check the live pricing and model pages before using paid generation.

1. Create an API key in your Runway developer account.
2. In `.env`, set `RUNWAY_API_KEY="your-key"`.
3. Restart both `npm run dev` and `npm run worker`, then select Runway in **Providers**.

Official references (review them for changes before upgrading the adapter):

- [Runway API getting started: text-to-video and task flow](https://docs.dev.runwayml.com/guides/using-the-api/)
- [Runway API reference: text-to-video request, authentication, and version header](https://docs.dev.runwayml.com/api/)
- [Runway input docs: model aspect ratios and duration capabilities](https://docs.dev.runwayml.com/assets/inputs/)
- [Runway output docs: task output and temporary URLs](https://docs.dev.runwayml.com/assets/outputs/)
- [Runway model guide](https://docs.dev.runwayml.com/guides/models/) and [pricing](https://docs.dev.runwayml.com/guides/pricing/)

### Connecting Replicate and fal.ai

Add the chosen service's server key to `.env`, then restart the app and worker. Select that provider in the **Providers** page.

```env
REPLICATE_API_TOKEN="your-replicate-token"
FAL_KEY="your-fal-api-key"
```

The default endpoints are Alibaba Wan 3 (`alibaba/wan-3` on Replicate and `alibaba/wan-3.0/text-to-video` on fal.ai). Optional environment variables let you change them: `REPLICATE_MODEL` and `FAL_VIDEO_ENDPOINT`. Do not expose any provider key to browser code or commit it to Git.

- [Replicate Wan 3 model/API and current pricing](https://replicate.com/alibaba/wan-3)
- [fal.ai Wan 3 text-to-video API schema](https://fal.ai/models/alibaba/wan-3.0/text-to-video/api)
- [fal.ai model API billing](https://fal.ai/docs/documentation/model-apis/pricing)

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Local PostgreSQL in `.env.example` | Prisma connection string |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ connection |
| `AUTH_SECRET` | Local development placeholder | Signs the seven-day HTTP-only session cookie; use a random secret outside local development |
| `ADMIN_EMAIL` | Empty | Email that receives the provider-settings admin control |
| `VIDEO_PROVIDER` | `fal` | Initial provider before an admin saves a selection: `runway`, `replicate`, or `fal` |
| `RUNWAY_API_KEY` | Empty | Server-only Runway credential when using the Runway adapter |
| `REPLICATE_API_TOKEN` | Empty | Server-only Replicate credential |
| `REPLICATE_MODEL` | `alibaba/wan-3` | Replicate model in `owner/model` format |
| `FAL_KEY` | Empty | Server-only fal.ai credential |
| `FAL_VIDEO_ENDPOINT` | `alibaba/wan-3.0/text-to-video` | fal.ai model endpoint |
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

- This MVP implements local and S3-compatible object storage, but leaves MinIO setup to the developer.
- Email verification, password reset, rate limiting, billing, and high availability are outside this MVP. The single-server [Ubuntu deployment guide](DEPLOY-UBUNTU.md) supports private SSH-tunnel access without a domain and public HTTPS when you add one.
- Runway's model list, limits, API headers, output retention, and prices can change. The adapter is intentionally narrow; use the linked official docs when updating it.
- If a provider task fails after its retry attempts, the history records the failure message and the user can submit a new job.
