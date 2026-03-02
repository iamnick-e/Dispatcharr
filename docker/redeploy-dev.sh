#!/bin/bash
# Redeploy Dev Instance After Code Changes
# Use this after making changes to test in dev environment

set -e

echo "🔄 Redeploying Dispatcharr Dev Instance..."

cd "$(dirname "$0")"

# Restart containers to pick up changes
echo "🔄 Restarting containers..."
docker compose -f docker-compose.dev-instance.yml restart web-dev celery-dev

# Run migrations (in case models changed)
echo "🔧 Running migrations..."
docker exec dispatcharr_web_dev python manage.py migrate

# Collect static files (if UI changed)
echo "📦 Collecting static files..."
docker exec dispatcharr_web_dev python manage.py collectstatic --noinput || true

echo ""
echo "✅ Dev instance redeployed!"
echo "📍 Access: http://10.0.10.1:9192"
echo ""
echo "📝 View logs:"
echo "   docker compose -f docker/docker-compose.dev-instance.yml logs -f web-dev"
echo ""
