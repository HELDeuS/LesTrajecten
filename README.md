# LesTrajecten

Webapplicatie voor het bouwen van complete lestrajecten op basis van kwalificatiedossiers, met AI-ondersteuning. De AI-laag is provider-onafhankelijk: elke OpenAI-compatibele API werkt (Mistral, of een private server met vLLM/llama.cpp/Ollama/LM Studio). Geschikt voor meerdere docenten op een Ubuntu-server.

## Functionaliteit

- **Kwalificatiedossiers**: upload de SBB-pdf en laat de tekst extraheren (Mistral OCR of lokaal), of plak handmatig; met CREBO-code en omschrijving.
- **AI dossier-analyse**: AI extraheert kerntaken en werkprocessen uit het dossier.
- **Algemene leerdoelen & uitkomsten**: genereer met AI (Bloom-taxonomie) of stel handmatig vast.
- **Trajectdoelen met kerntaken-selectie**: kies per traject de relevante kerntaken/werkprocessen, laat AI leerdoelen en -uitkomsten voor het hele traject voorstellen, bewerk ze en sla ze op.
- **Doelverdeling per periode**: AI verdeelt de trajectdoelen over de periodes en bepaalt de complexiteit (oplopende Bloom-niveaus); alles bewerkbaar.
- **Lestrajecten**: het complete traject voor één vak over de hele opleiding; je geeft de opleidingsperiode (start/einde), lessen per week en lesduur op.
- **Modules/periodes**: deel het traject op in periodes van X weken; lessen worden automatisch per module aangemaakt (weken × lessen/week) en over de periode ingepland met weeknummers en data.
- **Specifieke leerdoelen**: verdiep algemene doelen per module en vak met AI.
- **Lessen**: koppel leerdoelen, datum en module; genereer met AI een lesplan (inleiding, activiteiten, materialen, beoordeling).
- **Lesopdrachten**: genereer met AI praktische opdrachten per les.
- **PowerPoint**: download per les een gegenereerde .pptx-presentatie.
- **Gebruikersbeheer**: login met rollen (beheerder/docent); beheerders maken accounts aan. Beheerders zien alles, docenten hun eigen materiaal.

## AI-provider configureren

Stel in `.env` in (elke OpenAI-compatibele endpoint):

```bash
AI_BASE_URL=http://mijnserver:8000/v1   # of https://api.mistral.ai/v1
AI_API_KEY=supergeheim                   # private servers: waarde vaak vrij te kiezen
AI_MODEL=llama3.1:8b                    # modelnaam zoals de server die kent
# AI_JSON_MODE=off                      # alleen als de server response_format niet ondersteunt
```

Pdf-extractie: `AI_PDF_EXTRACT=mistral` (OCR via Mistral, ook voor gescande pdf's) of `local` (tekst-extractie op de eigen server, geen API-sleutel nodig). Oudere `MISTRAL_API_KEY`/`MISTRAL_MODEL`-configuratie blijft werken.

## Techniek

- Next.js 15 (App Router) + React + Tailwind CSS 4
- Prisma + SQLite (eenvoudig up te graden naar PostgreSQL)
- Authenticatie: e-mail/wachtwoord met bcrypt en JWT-sessiecookie (jose)
- AI: provider-onafhankelijke laag (OpenAI-compatibel: `AI_BASE_URL`/`AI_API_KEY`/`AI_MODEL`)

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

**Belangrijk:** de service draait als `www-data`, dus na elke update (`git pull`, `npm install`, `npm run build`) moet het eigenaarschap teruggezet worden:

```bash
sudo chown -R www-data:www-data /opt/lestrajecten
sudo systemctl restart lestrajecten
```

Zonder dit krijg je de fout `attempt to write a readonly database` bij het opslaan (SQLite heeft schrijfrechten nodig op de map én het databasebestand). Update in één keer met `sudo bash update.sh` (git pull, build, eigenaarschap en herstart).

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
