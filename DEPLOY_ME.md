# Dispatcharr Dev Instance - Quick Start

**You need to run this manually** (Docker permission issue)

## Deploy Dev Instance

```bash
cd ~/.openclaw/workspace/Dispatcharr/docker
sudo ./deploy-dev.sh
```

**Or add yourself to docker group (one-time):**
```bash
sudo usermod -aG docker nick
newgrp docker  # Refresh groups
./deploy-dev.sh  # Should work now
```

## After Deployment

- Access: http://10.0.10.1:9192
- Admin: http://10.0.10.1:9192/admin (admin / admin@dispatcharr.dev)
- Add to Plex as second tuner source

## Complete Guide

See `DEV_INSTANCE.md` for full documentation.

---

**Status:** Waiting for you to deploy the dev instance
