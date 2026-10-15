
# Eventry Backend API

Laravel 10 REST API for **Eventry** — event registration, ticket payments, and Ring-device + facial-recognition check-in. Built from a stripped-down PassIDy/CardConnect codebase for an AWS Builder hackathon.

## Features

- **Event Management**: full event lifecycle — authoring, speakers/sessions/sponsors/exhibitors, ticket categories, floor plans, enrollment, analytics
- **Check-in**: manual, Ring-device capture-match, and face-recognition (AWS Rekognition) check-in paths
- **Ring Device Integration**: webhook ingestion (HMAC-signed), device arm/disarm, live-view (WHEP), chime/capture test tooling, self-service device onboarding
- **AI Vision**: AWS Bedrock (Claude 3 Haiku) captions Ring-captured thumbnails
- **Payments**: event ticket checkout via Stripe and Paystack, native in-app purchase verification (Apple/Google)
- **Auth**: Laravel Sanctum bearer tokens + SSO (Google, Microsoft, LinkedIn, Apple)
- **Roles**: `admin` (platform operator + event authoring), `team` (check-in staff), `user` (attendee)

## Installation

1. Clone and enter the backend:
```bash
cd backend
```

2. Install dependencies:
```bash
composer install
```

3. Set up environment:
```bash
cp .env.example .env
php artisan key:generate
```

4. Configure database in `.env` (PostgreSQL by default):
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=laravel_eventry_api
DB_USERNAME=your_username
DB_PASSWORD=your_password
```
MySQL also works — set `DB_CONNECTION=mysql`, `DB_PORT=3306` (raw-SQL spots in migrations/`AdminController` are driver-aware and handle either).

5. Run migrations and seed data:
```bash
php artisan migrate --seed
```

6. Start the development server:
```bash
php artisan serve
```
Defaults to `http://localhost:8000`.

## API Documentation

See `API_DOCUMENTATION.md` for the full endpoint reference.

### Base URL
```
http://localhost:8000/api
```

### Authentication
```
Authorization: Bearer {token}
```

## Key env vars

```env
FRONTEND_URLS=http://localhost:8080,...      # CORS allowed origins
TOKEN_EXPIRY_MINUTES=120
TOKEN_GRACE_MINUTES=30

# Ring device check-in
RING_CLIENT_ID=
RING_CLIENT_SECRET=
RING_HMAC_SECRET=
RING_ACCESS_TOKEN=

# AWS Bedrock (AI captions) — falls back to AWS_ACCESS_KEY_ID/SECRET/REGION if unset
AWS_BEDROCK_ACCESS_KEY_ID=
AWS_BEDROCK_SECRET_ACCESS_KEY=
AWS_BEDROCK_REGION=
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# AWS Rekognition (face check-in) — falls back to AWS_ACCESS_KEY_ID/SECRET/REGION if unset
AWS_REKOGNITION_ACCESS_KEY_ID=
AWS_REKOGNITION_SECRET_ACCESS_KEY=
AWS_REKOGNITION_REGION=

# Payments
PAYSTACK_SECRET_KEY=
STRIPE_SECRET=
```

## Default Seeded Users

- **Admin**: see `database/seeders/DatabaseSeeder.php`
- **User**: see `database/seeders/DatabaseSeeder.php`

## Rate Limiting

- Public endpoints: throttled via `custom-throttle` middleware
- Password reset / account-deletion request: 5 requests / 10 minutes
- Image proxy: 60 requests / minute

## Testing

```bash
php artisan test
```

## Deployment

See `../aws_deployment_steps.md` for the full AWS Lightsail + S3 deployment walkthrough. Short version:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Security

- CORS configured for frontend domain (`FRONTEND_URLS`)
- Rate limiting enabled
- SQL injection protection via Eloquent ORM
- Ring webhook verified via HMAC-SHA256 signature, not Sanctum
- Image proxy SSRF-hardened (scheme/host allowlist, DNS private-range check, size cap)
- Input validation and sanitization on all mutating endpoints

## License

MIT License
