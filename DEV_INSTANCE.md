# Dispatcharr Dev Instance Deployment

**Server:** 10.0.10.1 (st-svr-02)  
**Purpose:** Test multi-account pooling feature development  
**Repository:** https://github.com/iamnick-e/Dispatcharr (fork)

---

## Quick Setup

### 1. Deploy Dev Instance

```bash
cd ~/.openclaw/workspace/Dispatcharr/docker
./deploy-dev.sh
```

**This will:**
- Stop any existing dev containers
- Pull latest Dispatcharr base image
- Start dev instance on ports 9192/5437
- Run database migrations
- Create superuser (admin/admin@dispatcharr.dev)

### 2. Access Dev Instance

- **Web UI:** http://10.0.10.1:9192
- **Admin:** http://10.0.10.1:9192/admin
- **Postgres:** localhost:5437 (from host)

### 3. Add to Plex

1. Open Plex Settings → Live TV & DVR
2. Add DVR Device
3. Manually enter IP: `10.0.10.1:9192`
4. Plex discovers dev instance as separate tuner source

---

## Development Workflow

### After Making Code Changes

```bash
cd ~/.openclaw/workspace/Dispatcharr/docker
./redeploy-dev.sh
```

**This will:**
- Restart containers
- Run migrations
- Collect static files
- Ready for testing

### View Logs

```bash
# All logs
docker compose -f docker/docker-compose.dev-instance.yml logs -f

# Web only
docker compose -f docker/docker-compose.dev-instance.yml logs -f web-dev

# Celery only
docker compose -f docker/docker-compose.dev-instance.yml logs -f celery-dev
```

### Stop Dev Instance

```bash
cd ~/.openclaw/workspace/Dispatcharr/docker
docker compose -f docker-compose.dev-instance.yml down
```

### Start Dev Instance

```bash
cd ~/.openclaw/workspace/Dispatcharr/docker
docker compose -f docker-compose.dev-instance.yml up -d
```

---

## Configuration Details

### Ports

| Service | Production | Dev Instance |
|---------|------------|--------------|
| Web UI  | 9191       | **9192**     |
| Postgres| 5436       | **5437**     |
| Redis   | (internal) | (internal)   |

### Environment

- **Database:** `dispatcharr_dev` (separate from production)
- **User:** `dispatch_dev`
- **Password:** `dev_secret_2026`
- **Network:** `dispatcharr_dev_network` (isolated)
- **Log Level:** `debug`

### Volumes

- **Data:** `./docker/data-dev` (separate from production)
- **Database:** `postgres_data_dev` (Docker volume)
- **Source:** `../` mounted read-only at `/app/dispatcharr-dev`

---

## Testing Multi-Account Pooling

### Once Feature is Implemented

1. **Access Admin UI**
   ```
   http://10.0.10.1:9192/admin
   ```

2. **Create Test Accounts** (3x from same provider)
   - Account 1: username1/password1
   - Account 2: username2/password2
   - Account 3: username3/password3

3. **Create Account Pool**
   - Name: "Test Pool"
   - Strategy: "Least Used"
   - Assign all 3 accounts

4. **Configure Plex**
   - Add dev instance as tuner: `10.0.10.1:9192`
   - Should discover 3 tuners (one per pooled account)

5. **Test Concurrent Streams**
   - Start 3 simultaneous streams
   - Verify each uses different account
   - Check logs for pool manager activity

6. **Test Failover**
   - Disconnect one account
   - Verify automatic failover to next available

---

## Night Development Integration

When night development works on multi-account pooling:

1. Code changes pushed to feature branch
2. Auto-redeploy dev instance:
   ```bash
   cd ~/.openclaw/workspace/Dispatcharr/docker
   ./redeploy-dev.sh
   ```
3. Report includes dev instance URL for testing
4. Morning: Nick tests changes in Plex

---

## Troubleshooting

### Container Status
```bash
docker compose -f docker/docker-compose.dev-instance.yml ps
```

### Restart Everything
```bash
docker compose -f docker/docker-compose.dev-instance.yml restart
```

### Fresh Start (wipes data)
```bash
docker compose -f docker/docker-compose.dev-instance.yml down -v
./deploy-dev.sh
```

### Check Database Connection
```bash
docker exec -it dispatcharr_db_dev psql -U dispatch_dev -d dispatcharr_dev
```

### Django Shell
```bash
docker exec -it dispatcharr_web_dev python manage.py shell
```

---

## Production vs Dev

**Production Instance (Don't Touch):**
- Port: 9191
- Data: `./docker/data`
- Database: `dispatcharr` (port 5436)

**Dev Instance (Safe to Break):**
- Port: 9192
- Data: `./docker/data-dev`
- Database: `dispatcharr_dev` (port 5437)
- Completely isolated from production

Test features in dev, deploy to production only when confirmed working.

---

## Next Steps

1. Run `./deploy-dev.sh` to start dev instance
2. Access http://10.0.10.1:9192 to verify it's running
3. Add to Plex as additional tuner source
4. Wait for night development to implement pooling features
5. Test each phase as it's deployed

---

**Created:** 2026-02-28  
**Last Updated:** 2026-02-28
