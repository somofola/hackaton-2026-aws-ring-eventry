# Eventry — AWS Ring Hackathon

Event registration, ticket payments, and Ring-device + facial-recognition check-in. Built for 2026 AWS Builder RING hackathon and deployed AWS Amplify, AWS Lightsail + S3 .

Monorepo: `frontend/` (React + Vite + TS, Capacitor for mobile) and `backend/` (Laravel API).

## Roles

- `admin` — platform operator: event authoring, Ring device pool, analytics
- `team` — check-in staff: manual / Ring / face check-in
- `user` — attendee: browse, enroll, pay, view tickets

## Quick start

```bash
# backend
cd backend
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan serve        # http://localhost:8000

# frontend (separate shell)
cd frontend
pnpm install
pnpm run dev              # http://localhost:8080
```

Frontend needs `VITE_API_URL` pointed at the backend (`frontend/.env`, falls back to a default in `src/services/api.ts`).

## Key integrations

- **Ring devices** — webhook ingestion (HMAC-signed), live view (WHEP), arm/disarm, capture-match check-in
- **AWS Rekognition** — face-recognition check-in
- **AWS Bedrock (Claude 3 Haiku)** — captions Ring-captured thumbnails
- **Stripe / Paystack** — event ticket payments

## Docs

- `frontend/README.md` — frontend architecture, structure, commands
- `backend/README.md` + `backend/API_DOCUMENTATION.md` — backend install, env vars, full API reference
- `aws_deployment_steps.md` — AWS Lightsail + S3 deployment walkthrough

## License

MIT License
