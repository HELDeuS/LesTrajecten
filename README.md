# LesTrajecten

Webapplicatie voor het bouwen van complete lestrajecten op basis van kwalificatiedossiers, met AI-ondersteuning (Mistral AI). Geschikt voor meerdere docenten op een Ubuntu-server.

## Functionaliteit

- **Kwalificatiedossiers**: voeg de inhoud van een dossier toe (tekst), met CREBO-code en omschrijving.
- **Algemene leerdoelen & uitkomsten**: genereer met AI (Bloom-taxonomie) of stel handmatig vast.
- **Lestrajecten**: koppel een vak, cohort, periode (start/einde), aantal lessen en lesduur; lessen worden automatisch aangemaakt.
- **Modules & specifieke leerdoelen**: verdiep algemene doelen per module en vak met AI.
- **Lessen**: koppel leerdoelen, datum en module; genereer met AI een lesplan (inleiding, activiteiten, materialen, beoordeling).
- **Lesopdrachten**: genereer met AI praktische opdrachten per les.
- **PowerPoint**: download per les een gegenereerde .pptx-presentatie.
- **Gebruikersbeheer**: login met rollen (beheerder/docent); beheerders maken accounts aan. Beheerders zien alles, docenten hun eigen materiaal.

## Techniek

- Next.js 15 (App Router) + React + Tailwind CSS 4
- Prisma + SQLite (eenvoudig up te graden naar PostgreSQL)
- Authenticatie: e-mail/wachtwoord met bcrypt en JWT-sessiecookie (jose)
- AI: Mistral AI Chat API (`MISTRAL_API_KEY`)

## Installatie (Ubuntu)

```bash
# Vereist: Node.js 20+ (bijv. via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installeer in /opt/lestrajecten (de locatie waar ook de systemd-unit naar verwijst)
sudo mkdir -p /opt/lestrajecten
sudo chown -R $USER:$USER /opt/lestrajecten
cd /opt
git clone https://github.com/HELDeuS/LesTrajecten.git lestrajecten
cd /opt/lestrajecten
bash setup.sh          # npm install, .env, database, seed en productie-build
# Vul daarna MISTRAL_API_KEY en AUTH_SECRET in .env
npm start              # draait op poort 3000
```

### Productie draaien met systemd

```ini
# /etc/systemd/system/lestrajecten.service
[Unit]
Description=LesTrajecten
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/lestrajecten
# Start direct via node (npm werkt niet als www-data / pad verschilt per installatie)
ExecStart=/usr/bin/env node node_modules/next/dist/bin/next start -H 0.0.0.0
Environment=NODE_ENV=production
EnvironmentFile=/opt/lestrajecten/.env
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
# Node moet voor www-data bereikbaar zijn; check zo nodig het pad met: which node
sudo chown -R www-data:www-data /opt/lestrajecten
sudo systemctl daemon-reload
sudo systemctl enable --now lestrajecten
sudo systemctl status lestrajecten
```

Komt "No such file or directory" terug, dan staat node ergens anders. Vind het juiste pad met `which node` en zet dat in `ExecStart=<pad>/node node_modules/next/dist/bin/next start -H 0.0.0.0`.

Zet daarna een reverse proxy (bijv. nginx of Caddy) met HTTPS voor de server.

## Eerste login

- Standaard beheerder: `admin@lestrajecten.local` / `Admin123!` — **wijzig dit direct** via `ADMIN_PASSWORD` bij de seed of via een nieuw wachtwoord.
- Via **Beheer** maak je docent-accounts aan.

## Ontwikkelen

```bash
npm run dev     # development server
npm run lint    # lint
npm run build   # productie build
```
