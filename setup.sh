#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "==> npm install..."
  npm install
fi

if [ ! -f .env ]; then
  echo "==> .env aanmaken van .env.example..."
  cp .env.example .env
  echo "    NB: vul daarna MISTRAL_API_KEY en AUTH_SECRET in .env"
fi

echo "==> Database initialiseren..."
npx prisma db push

echo "==> Admin-account aanmaken (indien nog geen)..."
npm run db:seed

echo "==> Productie-build..."
npm run build

echo ""
echo "Klaar! Volgende stappen:"
echo "  1. Vul MISTRAL_API_KEY en AUTH_SECRET in .env"
echo "  2. Start de server: npm start (of gebruik de systemd-unit uit README.md)"
