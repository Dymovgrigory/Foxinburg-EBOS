#!/bin/bash
set -e

DOMAIN="foxinburg.ru"
EMAIL="admin@foxinburg.ru"

# 1. Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# 2. Ensure .env.production exists
if [ ! -f .env.production ]; then
    echo "ERROR: .env.production not found. Copy from .env.production.example and fill secrets."
    exit 1
fi

# 3. Load environment and ensure docker compose uses it for interpolation
set -a
source .env.production
set +a
# Docker Compose reads .env by default for variable interpolation in the YAML file.
# Keep .env in sync with .env.production so secrets are actually used at runtime.
cp .env.production .env

# 4. SSL certificates
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Obtaining SSL certificate for $DOMAIN..."
    apt-get install -y certbot
    mkdir -p /var/www/certbot

    # Start with HTTP-only config + webroot for certbot challenge
    cat > docker-compose.init.yml <<EOF
services:
  frontend:
    volumes:
      - ./nginx/nginx.init.conf:/etc/nginx/conf.d/default.conf:ro
      - /var/www/certbot:/var/www/certbot:ro
EOF
    docker compose -f docker-compose.prod.yml -f docker-compose.init.yml up -d --build frontend backend postgres redis
    sleep 5

    certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -d "www.$DOMAIN" --agree-tos --non-interactive -m "$EMAIL"

    rm docker-compose.init.yml
fi

# 5. Start everything with HTTPS config
docker compose -f docker-compose.prod.yml up -d --build

# 6. Run migrations
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# 7. SSL auto-renew hook
if ! grep -q "foxinburg renew" /etc/cron.d/foxinburg-renew 2>/dev/null; then
    echo "0 3 * * * root certbot renew --deploy-hook 'cd $(pwd) && docker compose -f docker-compose.prod.yml restart frontend' >> /var/log/foxinburg-certbot.log 2>&1" | tee /etc/cron.d/foxinburg-renew
fi

echo "Deployment complete: https://$DOMAIN"
