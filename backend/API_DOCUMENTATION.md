
# Eventry API Documentation

## Base URL
```
https://your-api-domain.com/api
```

## Authentication
API uses Laravel Sanctum bearer tokens. Include in header:
```
Authorization: Bearer {token}
```

Roles: `user`, `team`, `admin` (`super-admin` also honored wherever `admin` is).

---

## Auth

### Register
```http
POST /auth/register
```

### Login
```http
POST /auth/login
```

### Logout
```http
POST /auth/logout
```
(auth required)

### Validate Token
```http
GET /auth/validate-token
```
Returns `{ valid, user }`. Called by frontend on every route change.

### SSO
```http
GET  /auth/google/redirect
POST /auth/google/callback
GET  /auth/microsoft/redirect
POST /auth/microsoft/callback
GET  /auth/linkedin/redirect
POST /auth/linkedin/callback
GET  /auth/apple/redirect
POST /auth/apple/callback
```

### Password / Account
```http
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/confirm-password
POST   /user/change-password        (requires password.confirmed)
POST   /auth/account/request-deletion
GET    /auth/account/confirm-delete/{token}
DELETE /auth/account                (requires password.confirmed)
```

---

## Users (Admin only — `role:admin,super-admin`)

```http
GET    /users
GET    /users/{id}
POST   /users
PUT    /users/{id}
DELETE /users/{id}
POST   /users/{user}/block
POST   /users/{user}/legal-hold
POST   /register              (admin creates a user)
```

### Current User Profile
```http
GET /user/profile
PUT /user/profile
```

---

## Events

### Public
```http
GET /events/slug/{slug}
GET /events/status/{status}
```

### Authenticated (any role)
```http
GET /events/{event}                 show single event
GET /events/{event}/enrollments
GET /events/{event}/analytics
GET /events/{event}/payments
POST /events/{event}/check-in              manual check-in
POST /events/{event}/check-in/qr           Ring capture-match check-in
POST /events/{event}/check-in/face         face-recognition check-in
POST /events/{event}/enrollments/{enrollment}/face-optin
```

### User role
```http
GET  /my-enrollments
POST /events/{event}/enroll
GET  /events/{event}/reviews
POST /events/{event}/reviews
```

### Team role
```http
GET /team/dashboard
```

### Admin (event authoring — merged former corporate capabilities)
```http
GET    /events
POST   /events
PUT    /events/{event}
DELETE /events/{event}
PATCH  /events/{event}/status
GET    /my-events
POST   /events/{event}/banner
POST   /events/{event}/ticket-categories
POST   /events/{event}/floor-plans
POST   /events/{event}/speakers
PUT|POST /events/{event}/speakers/{speakerId}
POST   /events/{event}/sponsors
PUT|POST /events/{event}/sponsors/{sponsor}
DELETE /events/{event}/sponsors/{sponsor}
POST   /events/{event}/exhibitors
PUT|POST /events/{event}/exhibitors/{exhibitor}
DELETE /events/{event}/exhibitors/{exhibitor}
POST   /events/{event}/sessions
POST   /events/{event}/clone
GET    /speakers/lookup
POST   /events/{event}/team-members
PUT    /events/{event}/team-members/{teamMember}
DELETE /events/{event}/team-members/{teamMember}
GET    /team-members/lookup
```

### Team Invite (public)
```http
GET  /team-invite/validate
POST /team-invite/accept
```

---

## Ring Device Check-in

### Webhook (HMAC-signed, not Sanctum)
```http
POST /webhooks/ring
```
Signed via `X-Signature` header, `RING_HMAC_SECRET`.

### Device control (any authenticated role)
```http
POST   /ring/devices/{deviceId}/arm
DELETE /ring/devices/{deviceId}/arm
POST   /ring/devices/{deviceId}/test-chime
POST   /ring/devices/{deviceId}/test-capture
POST   /ring/devices/{deviceId}/whep
DELETE /ring/devices/{deviceId}/whep
GET    /events/{event}/ring-status
```

### Self-service device onboarding (any authenticated role)
```http
GET  /my-ring-devices
POST /my-ring-devices
GET  /my-ring-device-requests
POST /ring-device-requests
GET  /my-ring-credentials
POST /my-ring-credentials
```

### Admin — shared device pool
```http
GET    /ring-devices
POST   /ring-devices
PUT    /ring-devices/{ringDevice}
DELETE /ring-devices/{ringDevice}
POST   /ring-devices/{ringDevice}/assign-event
GET    /ring-devices-event-options
GET    /ring-device-requests
POST   /ring-device-requests/{ringDeviceRequest}/fulfill
POST   /ring-device-requests/{ringDeviceRequest}/reject
GET    /ring-platform-credentials
POST   /ring-platform-credentials
```

---

## Payments (Event Tickets)

### User (role:user)
```http
POST /payments
POST /payments/verify
```

### Throttled, any auth user
```http
POST /payments/initialize/paystack
POST /payments/initialize/stripe
POST /payments/verify/paystack
POST /payments/verify/stripe
POST /payments/verify/apple
POST /payments/verify/google
GET  /payments/reference/{reference}
GET  /my-payments
```

### Admin
```http
GET    /payments
GET    /payments/{id}
DELETE /payments/{id}
```

---

## Admin Dashboard & Analytics

```http
GET /admin/dashboard
GET /corporate/dashboard        flat platform-wide dashboard (role merge: corporate -> admin)
GET /corporate/analytics
GET /corporate/ticket-sales
GET /my-company
PUT /my-company
GET /company/users
```

---

## Notifications

```http
GET    /notification-types
GET    /notification-subscriptions
PUT    /notification-subscriptions
GET    /notifications
GET    /notifications/unread-count
PATCH  /notifications/read-all
PATCH  /notifications/{id}/read
POST   /notifications/broadcast        (admin)
POST   /push-tokens
DELETE /push-tokens
```

---

## Misc

```http
GET  /linkedin/scrape                    LinkedIn profile scrape (used for SSO profile import)
GET  /image-proxy                        SSRF-hardened image proxy, allowlisted CDN hosts only
POST /support/send-chat-history
POST /contact
GET  /products
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "errors": { "email": ["The email field is required."] }
}
```

### 401 Unauthorized
```json
{ "message": "Unauthenticated." }
```

### 403 Forbidden
```json
{ "message": "This action is unauthorized." }
```

### 404 Not Found
```json
{ "message": "Resource not found." }
```

### 500 Internal Server Error
```json
{ "message": "Server Error" }
```

---

## Rate Limiting
- Public endpoints: throttled via `custom-throttle` middleware (see `config/`)
- Password reset / account-deletion-request: 5 requests / 10 minutes
- Image proxy: 60 requests / minute

## Pagination
List endpoints return paginated results:
```json
{
  "data": [...],
  "current_page": 1,
  "last_page": 5,
  "per_page": 15,
  "total": 75,
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." }
}
```
