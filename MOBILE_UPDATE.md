# Mobile-Responsive UI - Deployment Guide

## Current Status

The mobile-responsive changes were committed to the `main` branch but **haven't been deployed yet** because the dev instance is running a pre-built Docker image that doesn't include our changes.

## Quick Deploy (Rebuild from Source)

To deploy the mobile improvements, the dev instance needs to be rebuilt from our GitHub fork:

```bash
ssh root@10.0.10.1

# Stop current dev containers
docker stop dispatcharr-dev dispatcharr-celery-dev
docker rm dispatcharr-dev dispatcharr-celery-dev

# Build from our fork (includes mobile changes)
cd /tmp && rm -rf Dispatcharr
git clone https://github.com/iamnick-e/Dispatcharr.git
cd Dispatcharr
docker build -t dispatcharr:mobile -f docker/Dockerfile .

# Run new containers with mobile-responsive UI
docker run -d \
  --name dispatcharr-dev \
  --network dispatcharr_dev_network \
  -p 9192:9191 \
  -e DISPATCHARR_ENV=modular \
  -e SECRET_KEY='3hYXQO6XjLqAK7zu4BlsZ5tjqm2/Me17FV3NwDT7UcgcAjpAkb0ZXNuUD7W1abnYnno=' \
  -e POSTGRES_HOST=dispatcharr-db-dev \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=dispatcharr \
  -e POSTGRES_USER=dispatch \
  -e REDIS_HOST=dispatcharr-redis-dev \
  -e REDIS_PORT=6379 \
  -e DISPATCHARR_LOG_LEVEL=debug \
  -v /mnt/user/appdata/dispatcharr-dev/data:/data \
  --restart unless-stopped \
  dispatcharr:mobile

docker run -d \
  --name dispatcharr-celery-dev \
  --network dispatcharr_dev_network \
  -e DISPATCHARR_ENV=modular \
  -e SECRET_KEY='3hYXQO6XjLqAK7zu4BlsZ5tjqm2/Me17FV3NwDT7UcgcAjpAkb0ZXNuUD7W1abnYnno=' \
  -e POSTGRES_HOST=dispatcharr-db-dev \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=dispatcharr \
  -e POSTGRES_USER=dispatch \
  -e REDIS_HOST=dispatcharr-redis-dev \
  -e REDIS_PORT=6379 \
  -e DISPATCHARR_LOG_LEVEL=debug \
  -v /mnt/user/appdata/dispatcharr-dev/data:/data \
  --restart unless-stopped \
  --entrypoint /app/docker/entrypoint.celery.sh \
  dispatcharr:mobile
```

## What Changes Were Made

**Mobile Improvements (Branch: `feature/mobile-responsive-ui`):**
- Hamburger menu for mobile navigation
- Auto-collapse sidebar on small screens
- Touch-friendly overlay (tap outside to close)
- Larger touch targets (44px minimum)
- Responsive spacing and layouts
- Auto-close sidebar when navigating on mobile

**Files Changed:**
- `frontend/src/App.jsx` - Mobile detection, hamburger menu, overlay
- `frontend/src/components/Sidebar.jsx` - Auto-close on link click
- `frontend/src/index.css` - Mobile-responsive CSS
- `frontend/src/components/sidebar.css` - Sidebar mobile styles

**Commit:** `8f1f3de8` on `main` branch  
**GitHub:** https://github.com/iamnick-e/Dispatcharr

## Testing on Mobile

Once deployed:
1. Open http://10.0.10.1:9192 on your phone
2. Tap the hamburger menu (☰) in top-left
3. Navigate using the sidebar
4. Sidebar should auto-close after clicking links
5. Tap outside sidebar to close it

## Why This Happened

Docker containers use **baked-in images**, not live code. To get updates from the repository, the image must be rebuilt. The upstream `ghcr.io/dispatcharr/dispatcharr:latest` image doesn't have our changes - only our fork does.

---

**Let me know if you want me to run the deployment automatically!** 🫎
