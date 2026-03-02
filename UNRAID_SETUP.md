# Dispatcharr Dev - Unraid Community Apps Template

## Quick Setup Guide

### Prerequisites

You need **3 containers** for Dispatcharr Dev to work:
1. PostgreSQL Dev
2. Redis Dev  
3. Dispatcharr Dev (this template)

---

## Step 1: Create Custom Docker Network (IMPORTANT!)

**Why:** The containers need to communicate using container names (not IP addresses)

**Terminal:**
```bash
docker network create dispatcharr_dev_network
```

**Or via Unraid UI:**
- Docker → Settings → Custom Network → Add
- Network Name: `dispatcharr_dev_network`
- Driver: `bridge`

---

## Step 2: Deploy PostgreSQL Dev

**Via Unraid Docker → Add Container:**

| Setting | Value |
|---------|-------|
| **Name** | `dispatcharr-db-dev` |
| **Repository** | `postgres:17` |
| **Network Type** | Custom: `dispatcharr_dev_network` |
| **Port** | `5437:5432` (host:container) |
| **Path** | `/mnt/user/appdata/dispatcharr-dev/postgres:/var/lib/postgresql/data` |

**Environment Variables:**
- `POSTGRES_DB=dispatcharr_dev`
- `POSTGRES_USER=dispatch_dev`  
- `POSTGRES_PASSWORD=dev_secret_2026`

---

## Step 3: Deploy Redis Dev

**Via Unraid Docker → Add Container:**

| Setting | Value |
|---------|-------|
| **Name** | `dispatcharr-redis-dev` |
| **Repository** | `redis:latest` |
| **Network Type** | Custom: `dispatcharr_dev_network` |
| **No port mappings** | (internal only) |

---

## Step 4: Deploy Dispatcharr Dev (Use the XML Template)

**Method A: Community Applications Template**

1. Copy `dispatcharr-dev-unraid-template.xml` to Unraid
2. Docker → Add Container → Template
3. Select the template file
4. Click **Apply**

**Method B: Manual Entry**

Use the XML template as reference and fill in all the fields manually.

**CRITICAL SETTINGS:**
- **Network Type:** Custom: `dispatcharr_dev_network` ✅
- **POSTGRES_HOST:** `dispatcharr-db-dev` ✅
- **REDIS_HOST:** `dispatcharr-redis-dev` ✅
- **Port:** `9192:9191` (avoids conflict with production on 9191) ✅

---

## Step 5: Access & Verify

**Web UI:** http://10.0.10.1:9192  
**Admin Panel:** http://10.0.10.1:9192/admin

**Create superuser:**
```bash
docker exec -it dispatcharr-dev python manage.py createsuperuser
```

---

## Step 6: Add to Plex

1. Plex Settings → Live TV & DVR
2. DVR Devices → Add manually
3. Enter: `10.0.10.1:9192`
4. Plex discovers as HDHomeRun tuner ✅

---

## Troubleshooting

### Container won't start

**Check logs:**
```bash
docker logs dispatcharr-dev
```

**Common issues:**
- Missing custom network (`dispatcharr_dev_network`)
- Wrong database hostname (must be container name: `dispatcharr-db-dev`)
- PostgreSQL not running yet (wait 10s, then restart Dispatcharr)

### Can't connect to database

**Verify network:**
```bash
docker exec -it dispatcharr-dev ping dispatcharr-db-dev
```

Should resolve to container IP. If "Name or service not known" → network issue.

**Fix:** Ensure all 3 containers use `dispatcharr_dev_network`

### SECRET_KEY error

The template includes a pre-generated SECRET_KEY. For production, generate a new one:
```bash
openssl rand -base64 64
```

---

## Night Development Workflow

When I work on multi-account pooling features:

1. **Code changes pushed to GitHub** (feature branch)
2. **Redeploy dev instance** on Unraid:
   ```bash
   docker pull ghcr.io/dispatcharr/dispatcharr:latest
   docker restart dispatcharr-dev
   ```
3. **Test new features** at http://10.0.10.1:9192
4. **When stable** → deploy to production (port 9191)

---

## Production vs Dev

| Feature | Production | Dev Instance |
|---------|-----------|--------------|
| **Port** | 9191 | **9192** |
| **Database** | `dispatcharr` | `dispatcharr_dev` |
| **Network** | `dispatcharr_network` | `dispatcharr_dev_network` |
| **Data Path** | `/mnt/user/appdata/dispatcharr/data` | `/mnt/user/appdata/dispatcharr-dev/data` |
| **Logging** | Normal | **Debug** |
| **Purpose** | Stable, reliable | **Testing, breaking changes OK** |

---

## Backup Dev Instance

**Database dump:**
```bash
docker exec dispatcharr-db-dev pg_dump -U dispatch_dev dispatcharr_dev > dev_backup.sql
```

**Restore:**
```bash
cat dev_backup.sql | docker exec -i dispatcharr-db-dev psql -U dispatch_dev dispatcharr_dev
```

---

**Created:** 2026-02-28  
**Target:** Unraid server at 10.0.10.1  
**Template:** `dispatcharr-dev-unraid-template.xml`
