<?php

//test branch checkout

use App\Models\Priority;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PushTokenController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\PaymentController;
// TeamMemberController removed — team_members table dropped
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\Auth\AppleController;
use App\Http\Controllers\Auth\LinkedinController;
use App\Http\Controllers\Auth\MicrosoftController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ScrapeController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\RingWebhookController;
use App\Http\Controllers\RingDeviceController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/



Route::middleware(['auth:sanctum', \App\Http\Middleware\ExtendSanctumToken::class])
    ->get('/auth/validate-token', function (Request $request) {
        return response()->json([
            'valid' => true,
            'user' => $request->user(),
        ]);
    });

Route::middleware(['auth:sanctum'])
    ->post('/auth/handoff-token', [AuthController::class, 'createHandoffToken']);

// --- Event show — must be registered BEFORE role-specific groups so any authenticated
//     role (admin, corporate, team) can resolve the route; the controller handles authz. ---
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/events/{event}', [EventController::class, 'show']);
});

// --- Admin Endpoints ---
// 'corporate' role was merged into 'admin' (Phase 6a): this single group now
// carries both the former platform-moderation routes AND the former
// role:corporate event-authoring + self-service routes. There is no more
// multi-company model, so CorporateController's "manage any company"
// apiResource (/companies, suspend, activate) was deleted outright rather
// than merged — see AdminController docblock for what was folded in instead.
Route::middleware(['auth:sanctum', 'role:admin,super-admin'])->group(function () {
    // Instant broadcast (marketing, alerts, informational)
    Route::post('/notifications/broadcast', [NotificationController::class, 'broadcast']);
    Route::apiResource('/users', UserController::class);
    Route::get('/archived-users', [UserController::class, 'archivedUsers']);
    Route::post('/users/{user}/block', [UserController::class, 'toggleBlock'])->whereNumber('user');
    Route::post('/users/{user}/legal-hold', [UserController::class, 'setLegalHold'])->whereNumber('user');
    // 'show' is excluded here — it is registered in the shared group above.
    // store/update/destroy (POST /events, PUT /events/{event}, DELETE
    // /events/{event}) are already covered by this apiResource — the former
    // role:corporate group's explicit registrations of those same three
    // routes were redundant (same handler) and have been dropped.
    Route::apiResource('/events', EventController::class)->except(['getEventsbyStatus', 'getEventBySlug', 'show']);
    Route::patch('/events/{event}/status', [EventController::class, 'adminUpdateStatus']);

    // Ring device registry — shared pool devices admin onboards/assigns, plus
    // the request queue admins file when they don't have their own device.
    Route::get('/ring-devices', [RingDeviceController::class, 'adminIndex']);
    Route::post('/ring-devices', [RingDeviceController::class, 'adminStore']);
    Route::put('/ring-devices/{ringDevice}', [RingDeviceController::class, 'adminUpdate']);
    Route::delete('/ring-devices/{ringDevice}', [RingDeviceController::class, 'adminDestroy']);
    Route::post('/ring-devices/{ringDevice}/assign-event', [RingDeviceController::class, 'adminAssignEvent']);
    Route::get('/ring-devices-event-options', [RingDeviceController::class, 'adminEventOptions']);
    Route::get('/ring-device-requests', [RingDeviceController::class, 'adminRequests']);
    Route::post('/ring-device-requests/{ringDeviceRequest}/fulfill', [RingDeviceController::class, 'adminFulfillRequest']);
    Route::post('/ring-device-requests/{ringDeviceRequest}/reject', [RingDeviceController::class, 'adminRejectRequest']);
    Route::get('/ring-platform-credentials', [RingDeviceController::class, 'adminPlatformCredentials']);
    Route::post('/ring-platform-credentials', [RingDeviceController::class, 'adminSavePlatformCredentials']);
    //Route::apiResource('/payments', PaymentController::class);

    Route::get('/payments', [PaymentController::class, 'index']);
    Route::get('/payments/{id}', [PaymentController::class, 'adminShow']);
    Route::delete('/payments/{Id}', [PaymentController::class, 'destroy']);

    // Add more admin-specific endpoints as needed('/
    Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);

    // Create a normal user
    Route::post('/register', [UserController::class, 'userRegister']);

    // --- Folded in from the former role:corporate group ---
    // Flat platform-wide views (formerly "my own company" dashboard/analytics/
    // ticket-sales, scoped by corporate_id) — see AdminController docblock.
    Route::get('/corporate/dashboard', [AdminController::class, 'corporateDashboard']);
    Route::get('/corporate/analytics', [AdminController::class, 'corporateAnalytics']);
    Route::get('/corporate/ticket-sales', [AdminController::class, 'ticketSales']);

    Route::get('/my-company', [AdminController::class, 'myProfile']);
    Route::put('/my-company', [AdminController::class, 'updateMyProfile']);
    Route::post('/my-company', [AdminController::class, 'updateMyProfile']);
    Route::get('/company/users', [AdminController::class, 'myUsers']);

    // Event authoring — previously role:corporate-only, now admin-only.
    Route::get('/my-events', [EventController::class, 'myEvents']);
    // NOTE: GET /events/{event} is registered in the shared auth:sanctum group
    // (line ~55) so any authenticated role can view a single event.
    Route::post('/events/{event}/banner', [EventController::class, 'uploadBanner']);
    Route::post('/events/{event}/ticket-categories', [EventController::class, 'storeTicketCategory']);
    Route::post('/events/{event}/floor-plans', [EventController::class, 'storeFloorPlan']);
    Route::post('/events/{event}/speakers', [EventController::class, 'storeEventSpeaker']);
    Route::match(['put', 'post'], '/events/{event}/speakers/{speakerId}', [EventController::class, 'updateEventSpeaker']);
    Route::get('/team-members/lookup', [EventController::class, 'lookupTeamMemberEmail']);
    Route::post('/events/{event}/team-members', [EventController::class, 'storeEventTeamMember']);
    Route::put('/events/{event}/team-members/{teamMember}', [EventController::class, 'updateEventTeamMember']);
    Route::delete('/events/{event}/team-members/{teamMember}', [EventController::class, 'destroyEventTeamMember']);
    Route::post('/events/{event}/sponsors', [EventController::class, 'storeEventSponsor']);
    Route::match(['put', 'post'], '/events/{event}/sponsors/{sponsor}', [EventController::class, 'updateEventSponsor']);
    Route::delete('/events/{event}/sponsors/{sponsor}', [EventController::class, 'destroyEventSponsor']);
    Route::post('/events/{event}/exhibitors', [EventController::class, 'storeEventExhibitor']);
    Route::match(['put', 'post'], '/events/{event}/exhibitors/{exhibitor}', [EventController::class, 'updateEventExhibitor']);
    Route::delete('/events/{event}/exhibitors/{exhibitor}', [EventController::class, 'destroyEventExhibitor']);
    Route::get('/speakers/lookup', [EventController::class, 'lookupSpeaker']);
    Route::post('/events/{event}/sessions', [EventController::class, 'storeSession']);
    Route::post('/events/{event}/clone', [EventController::class, 'cloneEvent']);
});

// --- Team Endpoints ---
Route::middleware(['auth:sanctum', 'role:team'])->group(function () {
    Route::get('/team/dashboard', [EventController::class, 'teamDashboard']);
});

// --- Authenticated User Endpoints ---
Route::middleware(['auth:sanctum', 'role:user'])->group(function () {
    //Route::apiResource('/events', EventController::class)->except(['show']);

    Route::get('/my-enrollments', [EventController::class, 'myEnrollments']);
    Route::post('/events/{event}/enroll', [EventController::class, 'enroll']);
    Route::get('/events/{event}/reviews', [EventController::class, 'getReviews']);
    Route::post('/events/{event}/reviews', [EventController::class, 'storeReview']);

    // NOTE: company management routes were deleted entirely in the
    // admin/corporate role merge (Phase 6a) — there is no more multi-company
    // model to browse/suspend/activate/analyze.
    //Route::apiResource('/payments', PaymentController::class);
    // Payment routes
    Route::post('/payments', [PaymentController::class, 'store']);
    Route::post('/payments/verify', [PaymentController::class, 'verify']);
});

// --- Event Check-in, Enrollments, Analytics & Payments (any authenticated role) ---
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/events/{event}/enrollments', [EventController::class, 'getEnrollments']);
    Route::post('/events/{event}/check-in', [EventController::class, 'checkIn']);
    Route::post('/events/{event}/check-in/qr', [EventController::class, 'checkInByQr']);
    Route::post('/events/{event}/check-in/face', [EventController::class, 'checkInByFace']);
    Route::get('/events/{event}/ring-status', [RingWebhookController::class, 'status']);
    Route::get('/events/{event}/analytics', [EventController::class, 'analytics']);
    Route::get('/events/{event}/payments', [EventController::class, 'payments']);
    Route::post('/events/{event}/enrollments/{enrollment}/face-optin', [EventController::class, 'faceOptIn']);

    // Arm/disarm a Ring device for a specific event's no-kiosk capture path.
    // Runtime cache mapping, not a schema column — device stays reusable hardware.
    Route::post('/ring/devices/{deviceId}/arm', [RingWebhookController::class, 'arm']);
    Route::delete('/ring/devices/{deviceId}/arm', [RingWebhookController::class, 'disarm']);

    // Manual device test tooling (corporate "Ring" tab in EditEvent) — fire
    // chime / pull+decode a snapshot standalone, without waiting on a real
    // person_detected webhook.
    Route::post('/ring/devices/{deviceId}/test-chime', [RingWebhookController::class, 'testChime']);
    Route::post('/ring/devices/{deviceId}/test-capture', [RingWebhookController::class, 'testCapture']);

    // WHEP live-view proxy (see RingService::openWhepSession/closeWhepSession) —
    // lets the no-physical-device demo view show a live feed from a Playground
    // device, which also keeps its media buffer populated for test-capture.
    Route::post('/ring/devices/{deviceId}/whep', [RingWebhookController::class, 'openWhep']);
    Route::delete('/ring/devices/{deviceId}/whep', [RingWebhookController::class, 'closeWhep']);

    // Corporate/team self-service device onboarding + request queue (see RingDeviceController).
    Route::get('/my-ring-devices', [RingDeviceController::class, 'myDevices']);
    Route::post('/my-ring-devices', [RingDeviceController::class, 'onboardOwnDevice']);
    Route::get('/my-ring-device-requests', [RingDeviceController::class, 'myRequests']);
    Route::post('/ring-device-requests', [RingDeviceController::class, 'requestDevice']);

    // Corporate's own Ring Developer app credentials (see RingCredentialResolver).
    Route::get('/my-ring-credentials', [RingDeviceController::class, 'myCredentials']);
    Route::post('/my-ring-credentials', [RingDeviceController::class, 'saveMyCredentials']);
});

// --- General Auth & Throttled Routes ---
Route::middleware(['auth:sanctum', 'throttle:custom-throttle'])->group(function () {//delete , 'throttle:custom-throttle' if it causes issues

    //Payments Routes
    //Route::post('/payments/initialize', [PaymentController::class, 'initiatePayment']); //add to controller
    Route::post('/payments/initialize/paystack', [PaymentController::class, 'initializePaystackModal']); //add to controller
    Route::post('/payments/initialize/stripe', [PaymentController::class, 'initializeStripeModal']);
    Route::get('/payments/reference/{reference}', [PaymentController::class, 'getMyPaymentbyReference']);
    Route::post('/payments/verify/paystack', [PaymentController::class, 'verifyPaystackPayment']); //add to controller
    Route::post('/payments/verify/stripe', [PaymentController::class, 'verifyStripePayment']); //add to controller

    // Native in-app purchase receipt verification (iOS App Store / Google Play)
    Route::post('/payments/verify/apple',  [\App\Http\Controllers\IapController::class, 'verifyApple']);
    Route::post('/payments/verify/google', [\App\Http\Controllers\IapController::class, 'verifyGoogle']);

    Route::get('/my-payments', [PaymentController::class, 'getMyPayments']); // get only user's payments
    Route::get('/payments/all', [PaymentController::class, 'getMyPayments']); // legacy alias
    Route::get('/payments/all/{Id}', [PaymentController::class, 'getMyPaymentById']); // get only user's specific payment
    Route::get('/payments/reference/{Ref}', [PaymentController::class, 'getByReference']);

    // SECURITY: exclude `store` so role:user POST /payments binding wins,
    // and exclude `show` so admin's PaymentController::adminShow remains the
    // bound handler for GET /payments/{id}.
    Route::apiResource('/payments', PaymentController::class)->except(['index', 'show', 'store', 'destroy', 'initiatePayment', 'verifyPayment']);
    Route::get('/payments/assignedadmin/programme/{Id}', [PaymentController::class, 'getByAssignedAdminIdByProgramme']); //all payments with same assigned admin id for a programme
    Route::get('/payments/user/{userId}', [PaymentController::class, 'getByUserId']); //all orders from user
    Route::get('/payments/department/{Id}', [PaymentController::class, 'getByDepartmentId']); //all orders with same department id
    Route::get('/payments/category/{Id}', [PaymentController::class, 'getByCategoryId']); //all orders with same category id
    Route::get('/payments/programme/{Id}', [PaymentController::class, 'getByProgrammeId']); //all orders with same programme id
    //enrollment Routes

    Route::get('/linkedin/scrape', [ScrapeController::class, 'linkedinProfile']);

    Route::get('/user/profile', [UserController::class, 'getProfile']);
    Route::put('/user/profile', [UserController::class, 'update']);
    // SECURITY: password.confirmed gates require POST /auth/confirm-password within
    // the last 10 minutes. Frontend should catch 423 + prompt for password.
    Route::post('/user/change-password', [UserController::class, 'changePassword'])
        ->middleware('password.confirmed');
    Route::post('/user/force-change-password', [UserController::class, 'forceChangePassword']);
    Route::post('/user/secondary-email', [UserController::class, 'requestSecondaryEmail'])
        ->middleware('password.confirmed');

    // Notification preferences & inbox
    // Push token registration
    Route::post('/push-tokens', [PushTokenController::class, 'store']);
    Route::delete('/push-tokens', [PushTokenController::class, 'destroy']);

    Route::get('/notification-types', [NotificationController::class, 'getTypes']);
    Route::get('/notification-subscriptions', [NotificationController::class, 'getSubscriptions']);
    Route::put('/notification-subscriptions', [NotificationController::class, 'updateSubscriptions']);
    Route::get('/notifications', [NotificationController::class, 'getUserNotifications']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    // SECURITY: sensitive-op re-auth — call before hitting password.confirmed routes.
    Route::post('/auth/confirm-password', [AuthController::class, 'confirmPassword']);
    // App Store §5.1.1(v) / Play account-deletion policy — self-service deletion.
    Route::delete('/auth/account', [AuthController::class, 'deleteAccount'])
        ->middleware('password.confirmed');

    // programme report routes
});

// --- Team Invite (public, no auth) ---
Route::middleware(['throttle:custom-throttle'])->group(function () {
    Route::get('/team-invite/validate', [EventController::class, 'validateTeamInvite']);
    Route::post('/team-invite/accept', [EventController::class, 'acceptTeamInvite']);
});

// --- Public Endpoints ---
Route::middleware(['throttle:custom-throttle'])->group(function () {
	Route::get('/', function () {
		return response()->json(['status' => 'OK'], 200);
	});


    Route::get('/products', [ProductController::class, 'index']);

    // Ring device webhook — authenticated via X-Signature HMAC-SHA256 (RING_HMAC_SECRET), not Sanctum.
    Route::post('/webhooks/ring', [RingWebhookController::class, 'handle']);

    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::get('/auth/handoff/{token}', [AuthController::class, 'exchangeHandoffToken']);

    Route::post('/auth/app/register', [AuthController::class, 'appRegister']);
    Route::post('/auth/app/login/pin', [AuthController::class, 'appPinLogin']);
    Route::post('/auth/app/login/email', [AuthController::class, 'appEmailLogin']);

    Route::get('/auth/google/redirect', [GoogleController::class, 'redirectToGoogle']);
    Route::post('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);

    Route::get('/auth/microsoft/redirect', [MicrosoftController::class, 'redirectToMicrosoft']);
    Route::post('/auth/microsoft/callback', [MicrosoftController::class, 'handleMicrosoftCallback']);

    Route::get('/auth/linkedin/redirect', [LinkedinController::class, 'redirectToLinkedin']);
    Route::post('/auth/linkedin/callback', [LinkedinController::class, 'handleLinkedinCallback']);
    Route::get('/auth/linkedin/import-result', [LinkedinController::class, 'importResult']);

    Route::get('/auth/apple/redirect', [AppleController::class, 'redirectToApple']);
    // Apple's authorize server POSTs directly here (response_mode=form_post) — see AppleController docblock.
    Route::post('/auth/apple/callback', [AppleController::class, 'handleAppleCallback']);
    Route::get('/auth/confirm-secondary-email', [UserController::class, 'confirmSecondaryEmail']);
    Route::get('/auth/confirm-email-change', [UserController::class, 'confirmEmailChange']);

    // --- Web account-deletion request (no app access) — email-confirm before scheduling.
    Route::post('/auth/account/request-deletion', [AuthController::class, 'requestAccountDeletion'])->middleware('throttle:5,10');
    Route::get('/auth/account/confirm-delete/{token}', [AuthController::class, 'confirmAccountDeletion']);

    // --- Support Chat ---
    Route::post('/support/send-chat-history', [SupportController::class, 'sendChatHistory']);

    // --- Public Contact Form (SEO site) — tight per-IP rate-limit to deter abuse.
    Route::post('/contact', [ContactController::class, 'store'])->middleware('throttle:5,10');

    Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    Route::get('/auth/verify-email/resend/{uuid}', [AuthController::class, 'resendVerificationEmail']);
    // SECURITY (F-13): tighter per-IP rate-limit on password recovery to deter
    // mailbox flooding & enumeration loops. 5 requests / 10 minutes.
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:5,10');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:10,10');

    // --- Public Endpoints ---
    Route::get('/events/slug/{slug}', [EventController::class, 'getBySlug']);
    Route::get('/events/status/{status}', [EventController::class, 'getEventsByStatus']);
    // Public /companies browsing routes were deleted in the admin/corporate
    // role merge (Phase 6a) — there is no more multi-company model to list.

    // Image proxy — fetches CDN-hosted images server-side so the frontend can read them
    // for canvas/PDF generation without CORS restrictions.
    //
    // SECURITY (F-04): Hardened against SSRF.
    //   - Requires authentication (auth:sanctum).
    //   - Scheme + host allowlist; only known CDNs.
    //   - DNS resolution checked against RFC1918/loopback/link-local/multicast.
    //   - Redirects disabled.
    //   - Content-Type must be image/*.
    //   - Response size capped at 5 MB.
    Route::get('/image-proxy', function (\Illuminate\Http\Request $request) {
        $url = $request->query('url');
        if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
            return response('Invalid URL', 400);
        }

        $parsed = parse_url($url);
        $scheme = strtolower($parsed['scheme'] ?? '');
        $host   = strtolower($parsed['host'] ?? '');

        if (!in_array($scheme, ['http', 'https'], true) || $host === '') {
            return response('Invalid URL scheme or host', 400);
        }

        // Host allowlist — CDNs only.
        $allowedHosts = [
            'static.eventry.app',
            'static.srhosting.tk',
            'eventry-static.s3.eu-central-003.backblazeb2.com',
        ];
        if (!in_array($host, $allowedHosts, true)) {
            return response('Host not allowed', 403);
        }

        // Resolve DNS and block private/loopback/reserved ranges.
        $ips = @gethostbynamel($host) ?: [];
        if (empty($ips)) {
            return response('Host not resolvable', 400);
        }
        foreach ($ips as $ip) {
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return response('Host resolves to restricted range', 403);
            }
        }

        try {
            $response = \Illuminate\Support\Facades\Http::withOptions([
                'allow_redirects' => false,
            ])->timeout(10)->get($url);

            if ($response->status() !== 200) {
                return response('Upstream error', 502);
            }

            $contentType = $response->header('Content-Type') ?: '';
            if (!str_starts_with(strtolower($contentType), 'image/')) {
                return response('Not an image', 415);
            }

            $body = $response->body();
            if (strlen($body) > 5 * 1024 * 1024) {
                return response('Response too large', 413);
            }

            return response($body, 200, [
                'Content-Type'                => $contentType,
                'Cache-Control'               => 'public, max-age=86400',
                'Access-Control-Allow-Origin' => '*',
            ]);
        } catch (\Throwable) {
            return response('Failed to fetch image', 502);
        }
    })->middleware(['auth:sanctum', 'throttle:60,1']);
});
