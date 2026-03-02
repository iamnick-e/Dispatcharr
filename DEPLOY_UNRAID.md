# Dispatcharr Dev Instance - Unraid Deployment

**Target Server:** 10.0.10.1 (Unraid)  
**Purpose:** Test multi-account pooling development  
**Ports:** 9192 (web), 5437 (postgres)

---

## Quick Deployment on Unraid

### Option 1: Docker Compose (Recommended)

**1. Copy files to Unraid:**
```bash
# From your workstation or via SSH
scp -r ~/.openclaw/workspace/Dispatcharr/docker root@10.0.10.1:/mnt/user/appdata/dispatcharr-dev/
```

**2. SSH into Unraid and deploy:**
```bash
ssh root@10.0.10.1
cd /mnt/user/appdata/dispatcharr-dev/docker
docker compose -f docker-compose.dev-instance.yml up -d
```

**3. Access:**
- Web UI: http://10.0.10.1:9192
- Admin: http://10.0.10.1:9192/admin

---

### Option 2: Unraid Community Applications (Manual Setup)

**1. Install containers via Unraid UI:**

Navigate to: **Docker → Add Container**

#### Container 1: PostgreSQL Dev
- **Name:** `dispatcharr_db_dev`
- **Repository:** `postgres:17`
- **Network Type:** `Custom: dispatcharr_dev_network` (create first)
- **Port Mappings:** `5437:5432` (host:container)
- **Variables:**
  - `POSTGRES_DB=dispatcharr_dev`
  - `POSTGRES_USER=dispatch_dev`
  - `POSTGRES_PASSWORD=dev_secret_2026`
- **Path:** `/mnt/user/appdata/dispatcharr-dev/postgres:/var/lib/postgresql/data`

#### Container 2: Redis Dev
- **Name:** `dispatcharr_redis_dev`
- **Repository:** `redis:latest`
- **Network Type:** `Custom: dispatcharr_dev_network`
- **No port mappings needed** (internal only)

#### Container 3: Dispatcharr Web Dev
- **Name:** `dispatcharr_web_dev`
- **Repository:** `ghcr.io/dispatcharr/dispatcharr:latest`
- **Network Type:** `Custom: dispatcharr_dev_network`
- **Port Mappings:** `9192:9191` (host:container)
- **Path:** `/mnt/user/appdata/dispatcharr-dev/data:/data`
- **Variables:**
  - `DISPATCHARR_ENV=modular`
  - `SECRET_KEY=3hYXQO6XjLqAK7zu4BlsZ5tjqm2/Me17FV3NwDT7UcgcAjpAkb0ZXNuUD7W1abnYnno=`
  - `POSTGRES_HOST=dispatcharr_db_dev`
  - `POSTGRES_PORT=5432`
  - `POSTGRES_DB=dispatcharr_dev`
  - `POSTGRES_USER=dispatch_dev`
  - `POSTGRES_PASSWORD=dev_secret_2026`
  - `REDIS_HOST=dispatcharr_redis_dev`
  - `REDIS_PORT=6379`
  - `DISPATCHARR_LOG_LEVEL=debug`

#### Container 4: Dispatcharr Celery Dev
- **Name:** `dispatcharr_celery_dev`
- **Repository:** `ghcr.io/dispatcharr/dispatcharr:latest`
- **Network Type:** `Custom: dispatcharr_dev_network`
- **Path:** `/mnt/user/appdata/dispatcharr-dev/data:/data`
- **Post Arguments:** `/app/docker/entrypoint.celery.sh`
- **Variables:** (same as Web container above)

---

## Quick Transfer from st-svr-02 to Unraid

If you're currently on st-svr-02 and want to move to Unraid:

```bash
# On st-svr-02
cd ~/.openclaw/workspace/Dispatcharr
tar czf dispatcharr-dev.tar.gz docker/

# Transfer to Unraid
scp dispatcharr-dev.tar.gz root@10.0.10.1:/mnt/user/appdata/

# On Unraid
ssh root@10.0.10.1
cd /mnt/user/appdata
tar xzf dispatcharr-dev.tar.gz
mv docker dispatcharr-dev
cd dispatcharr-dev
docker compose -f docker-compose.dev-instance.yml up -d
```

---

## Access URLs (Unraid)

- **Dev Instance:** http://10.0.10.1:9192
- **Admin Panel:** http://10.0.10.1:9192/admin
- **Production:** http://10.0.10.1:9191 (if you have prod running)

---

## Add to Plex

1. Open Plex Settings → Live TV & DVR
2. Add DVR Device → Manual
3. Enter: `10.0.10.1:9192`
4. Plex discovers as HDHomeRun device

---

## Night Development Integration

When I work on multi-account pooling at night:
1. Commit code to feature branch
2. Push to GitHub
3. SSH to Unraid and redeploy:
   ```bash
   ssh root@10.0.10.1
   cd /mnt/user/appdata/dispatcharr-dev
   docker compose -f docker-compose.dev-instance.yml down
   docker compose -f docker-compose.dev-instance.yml pull
   docker compose -f docker-compose.dev-instance.yml up -d
   ```
4. Morning briefing: dev instance updated and ready to test

---

## Troubleshooting

**Check logs:**
```bash
ssh root@10.0.10.1
cd /mnt/user/appdata/dispatcharr-dev
docker compose -f docker-compose.dev-instance.yml logs -f web-dev
```

**Restart containers:**
```bash
docker compose -f docker-compose.dev-instance.yml restart
```

**Fresh start (wipes data):**
```bash
docker compose -f docker-compose.dev-instance.yml down -v
docker compose -f docker-compose.dev-instance.yml up -d
```

---

**Created:** 2026-02-28  
**Target:** Unraid server at 10.0.10.1  
**Status:** Ready to deploy
