#!/usr/bin/env bash
# Update de applicatie naar de nieuwste versie en herstart de systemd-service.
# Gebruik: sudo bash update.sh
set -euo pipefail
cd "$(dirname "$0")"

SERVICE_NAME="lestrajecten"
APP_USER="www-data"

if [ "$(id -u)" -ne 0 ]; then
  echo "Draai dit script met sudo (het past eigenaarschap aan en herstart de service)."
  exit 1
fi

echo "==> Nieuwste versie ophalen..."
sudo -u "$APP_USER" git pull 2>/dev/null || git pull

echo "==> Dependencies en build (als app-gebruiker)..."
if [ -d node_modules ]; then sudo -u "$APP_USER" npm install --omit=dev --no-audit --no-fund; fi
sudo -u "$APP_USER" npm run build

echo "==> Eigenaarschap herstellen naar $APP_USER..."
chown -R "$APP_USER:$APP_USER" .

echo "==> Service herstarten..."
if systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
  systemctl restart "$SERVICE_NAME"
  systemctl status "$SERVICE_NAME" --no-pager | head -5
else
  echo "Geen ${SERVICE_NAME}.service gevonden; start de app handmatig met 'npm start'."
fi

echo "Klaar."
