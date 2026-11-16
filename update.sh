#!/usr/bin/env bash
# Update de applicatie naar de nieuwste versie en herstart de systemd-service.
# Gebruik: sudo bash update.sh
set -euo pipefail
cd "$(dirname "$0")"

SERVICE_NAME="lestrajecten"
APP_USER="www-data"
APP_DIR="$(pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Draai dit script met sudo (het past eigenaarschap aan en herstart de service)."
  exit 1
fi

# npm als www-data: geef een schrijfbare HOME en cache (www-data heeft /var/www niet)
mkdir -p "$APP_DIR/.npm-cache"
chown "$APP_USER:$APP_USER" "$APP_DIR/.npm-cache"
run_as() {
  sudo -u "$APP_USER" env HOME="$APP_DIR" npm_config_cache="$APP_DIR/.npm-cache" "$@"
}

echo "==> Nieuwste versie ophalen..."
sudo -u "$APP_USER" git pull 2>/dev/null || git pull

echo "==> Dependencies (volledig, incl. dev)..."
run_as npm install --no-audit --no-fund

echo "==> Productie-build..."
run_as npm run build

echo "==> Eigenaarschap herstellen naar $APP_USER..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> Service herstarten..."
if systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
  systemctl restart "$SERVICE_NAME"
  systemctl status "$SERVICE_NAME" --no-pager | head -5
else
  echo "Geen ${SERVICE_NAME}.service gevonden; start de app handmatig met 'npm start'."
fi

echo "Klaar."
