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

git clone https://github.com/HELDeuS/LesTrajecten.git
cd LesTrajecten
npm install
cp .env.example .env
# Vul MISTRAL_API_KEY en AUTH_SECRET (willekeurige string) in
npx prisma db push
npm run db:seed        # maakt admin-account aan (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run build
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
ExecStart=/usr/bin/npm start
Restart=always
User=www-data
EnvironmentFile=/opt/lestrajecten/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now lestrajecten
```

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
