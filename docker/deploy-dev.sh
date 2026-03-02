#!/bin/bash
# Deploy Dispatcharr Dev Instance
# Server: 10.0.10.1
# Ports: 9192 (web), 5437 (postgres)

set -e

echo "🚀 Deploying Dispatcharr Dev Instance..."

cd "$(dirname "$0")"

# Stop existing dev instance if running
echo "📦 Stopping existing dev containers..."
docker compose -f docker-compose.dev-instance.yml down || true

# Pull latest base image
echo "🔄 Pulling latest Dispatcharr image..."
docker pull ghcr.io/dispatcharr/dispatcharr:latest

# Start dev instance
echo "▶️  Starting dev instance..."
docker compose -f docker-compose.dev-instance.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "🔧 Running Django migrations..."
docker exec dispatcharr_web_dev python manage.py migrate

# Create superuser if needed (optional)
echo "👤 Creating superuser (skip if exists)..."
docker exec -it dispatcharr_web_dev python manage.py createsuperuser --noinput --username admin --email admin@dispatcharr.dev || echo "Superuser already exists"

# Show status
echo ""
echo "✅ Dispatcharr Dev Instance Deployed!"
echo ""
echo "📍 Access URLs:"
echo "   Web UI:  http://10.0.10.1:9192"
echo "   Admin:   http://10.0.10.1:9192/admin"
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.dev-instance.yml ps
echo ""
echo "📝 View Logs:"
echo "   docker compose -f docker/docker-compose.dev-instance.yml logs -f"
echo ""
