# Deploy Frameforge to a single Ubuntu server

This guide deploys the current MVP with Docker Compose. It runs the Next.js app, background worker, PostgreSQL, Redis, and Caddy on one server. No domain is required for the default setup: Caddy listens on a loopback port and you reach it through an SSH tunnel. Later, you can attach a domain and enable public HTTPS.

## Before you start

You need:

- An Ubuntu server with a public IPv4 address and SSH access. Docker currently documents Ubuntu 22.04 and 24.04 among its supported releases.
- The project pushed to a Git repository the server can clone, or a way to copy this folder to the server.
- A domain is optional for now. Without one, use the SSH tunnel in step 4, or expose temporary plain HTTP by IP as described there.

For the default SSH-tunnel setup, allow SSH in your server provider's firewall and Ubuntu firewall. You do not need public ports 80 or 443. Do not open PostgreSQL (5432) or Redis (6379) to the public internet; this Compose file keeps both private.

## 1. Install Docker Engine and Compose

Connect over SSH, then use Docker's official Ubuntu APT repository (rather than the convenience script):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run hello-world
```

These commands follow [Docker's official Ubuntu installation guide](https://docs.docker.com/engine/install/ubuntu/). The deployment commands below use `sudo docker`, so you don't need to add your account to the Docker group.

If you use UFW, allow your SSH port before enabling it so you don't lock yourself out. For the usual SSH port:

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

If SSH uses a nonstandard port, allow that port before `sudo ufw enable`. The direct-IP option requires port 80; public HTTPS with a domain requires ports 80 and 443 (TCP, plus optional UDP 443) in both firewalls.

## 2. Put the project on the server

Push the workspace to a Git repository, then replace the example URL below with its clone URL. For a private repository, configure an SSH deploy key or another read-only clone credential first.

```bash
sudo mkdir -p /opt/frameforge
sudo chown "$USER":"$USER" /opt/frameforge
git clone YOUR_REPOSITORY_URL /opt/frameforge
cd /opt/frameforge
```

If you copy the folder with `scp` instead, make sure these files arrive too: `Dockerfile`, `compose.production.yml`, `Caddyfile`, `.env.production.example`, and `prisma/migrations/`.

## 3. Set the access mode and secrets

Create the production environment file and generate three independent secrets. The hex output is URL-safe for the PostgreSQL and Redis connection strings.

```bash
cp .env.production.example .env.production
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
nano .env.production
```

For no-domain access, keep these example settings:

- `SITE_ADDRESS=:80`
- `CADDY_HTTP_BIND=127.0.0.1:8080`
- `CADDY_HTTPS_BIND=127.0.0.1:8443`

Then replace these values in `.env.production`:

- `AUTH_SECRET` with the first generated value.
- `POSTGRES_PASSWORD` with the second generated value.
- `REDIS_PASSWORD` with the third generated value.
- `ADMIN_EMAIL` with the email address you use to sign in to Frameforge.

This deployment uses real video providers only. Set `VIDEO_PROVIDER=fal` and add your `FAL_KEY` before generating. You can use `RUNWAY_API_KEY` or `REPLICATE_API_TOKEN` instead and select that provider in the studio's **Providers** page. Provider APIs charge for successful generations; trial credits vary by account and are not guaranteed. Never put keys in frontend code or Git.

The provider settings page is available to the account whose sign-in email matches `ADMIN_EMAIL`. Its selection is stored in PostgreSQL and applies to new generations. Runway Gen-4.5 outputs up to 10 seconds; Replicate Wan 3 and fal.ai Wan 3 support up to 30 seconds. A 35–45 second video still needs multiple clips and editing. fal.ai Wan 3 generates audio; the other adapters do not request audio.

Restrict the file to your account:

```bash
chmod 600 .env.production
```

Keep `.env.production` off Git and retain the same `AUTH_SECRET` across restarts. Changing it signs everyone out.

## 4. Build and start the services

Check the Compose file without printing its resolved secrets, then build and launch the stack:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml config --quiet
sudo docker compose --env-file .env.production -f compose.production.yml up --build -d
```

The app container applies checked-in Prisma migrations before starting Next.js. PostgreSQL, Redis, and video files use named Docker volumes, so they survive container replacements. The app and worker share the video volume. Caddy persists its certificate data.

Check that the services are up and inspect logs:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml ps
sudo docker compose --env-file .env.production -f compose.production.yml logs --tail=100 app worker caddy
```

### Access privately through SSH (recommended without a domain)

On your own computer, open a terminal and keep this tunnel running:

```bash
ssh -N -L 8080:127.0.0.1:8080 UBUNTU_USER@SERVER_PUBLIC_IP
```

Replace `UBUNTU_USER` and `SERVER_PUBLIC_IP` with your SSH username and server IP. Then visit `http://localhost:8080`, register, and submit a prompt. The tunnel carries browser traffic over SSH, while the website stays inaccessible from public web ports. If your SSH server uses a nonstandard port, add `-p PORT` to the `ssh` command.

### Optional: open the site directly by server IP

This uses plain HTTP, without encryption. Use it only for temporary testing; don't enter real passwords or sensitive information over a public IP connection.

In `.env.production`, change `CADDY_HTTP_BIND=0.0.0.0:80`. Allow TCP port 80 in UFW and in your server provider's firewall, then recreate Caddy:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml up -d --force-recreate caddy
```

Visit `http://SERVER_PUBLIC_IP`. Keep `SITE_ADDRESS=:80` so Caddy serves HTTP.

### Later: add a domain and public HTTPS

Point the domain's `A` record to the server's public IPv4 address. In `.env.production`, set `SITE_ADDRESS` to the hostname (without `https://`), `CADDY_HTTP_BIND=0.0.0.0:80`, and `CADDY_HTTPS_BIND=0.0.0.0:443`. Allow ports 80 and 443 in both firewalls, then recreate Caddy. Caddy manages certificates and redirects HTTP to HTTPS when DNS and ports are reachable ([Caddy automatic HTTPS requirements](https://caddyserver.com/docs/automatic-https)).

When requests come through HTTPS, the app marks the session cookie secure. On the SSH tunnel or temporary HTTP path, it uses a non-secure cookie because the browser connection is HTTP; use the tunnel to encrypt that traffic.

## 5. Deploy future code changes

From the project folder on the server:

```bash
git pull
sudo docker compose --env-file .env.production -f compose.production.yml up --build -d
sudo docker compose --env-file .env.production -f compose.production.yml ps
```

This rebuilds and recreates the app and worker when their image changes. Docker Compose recommends production-specific overrides and rebuilding services when deploying new code; this project uses a dedicated production Compose file ([Docker Compose production guide](https://docs.docker.com/compose/how-tos/production/)).

## 6. Back up and operate the server

Create a database dump before major changes and copy it off the server:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "frameforge-$(date +%F).sql"
```

The database dump does not include generated videos. Back up the `generated-videos` volume too, or configure S3-compatible storage and back up that bucket. Keep backups off the same server.

Useful commands:

```bash
sudo docker compose --env-file .env.production -f compose.production.yml logs -f app worker
sudo docker compose --env-file .env.production -f compose.production.yml restart app worker
sudo docker compose --env-file .env.production -f compose.production.yml down
```

`down` stops and removes containers but preserves named volumes. Do not add `-v` unless you intend to delete the database, Redis queue data, generated videos, and Caddy certificate data.

## What this deployment does not provide

- It is a single-server MVP, not a high-availability setup. A server or disk failure can take the site down; keep off-server backups.
- Local video storage is persistent on this server, but it is not replicated. S3-compatible storage is better when video durability or server replacement matters.
- The Docker image includes development dependencies because the MVP worker runs TypeScript through `tsx`. The image is intentionally simple to operate; a later hardening pass can compile the worker and reduce the runtime image.
- Add rate limiting, account recovery, monitoring, and a backup schedule before opening a public service to large-scale use.

Next.js recommends putting a reverse proxy in front of a self-hosted server; this deployment uses Caddy for that role ([Next.js self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting)).
