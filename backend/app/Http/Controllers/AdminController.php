<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventEnrollment;
use App\Models\EventTicketCategory;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Mail\EmailChangeVerificationMail;
use App\Mail\EmailChangeNotificationMail;
use App\Services\PushNotificationService;

/**
 * NOTE: 'corporate' and 'admin' roles were merged into a single flat 'admin'
 * role (see CLAUDE.md Phase 6a). This controller folds in everything that
 * used to live in CorporateController:
 *   - myProfile/updateMyProfile/myUsers/ticketSales/
 *     corporateDashboard/corporateAnalytics — self-service methods, kept
 *     under the same names/routes, with their former corporate_id-scoped
 *     "my company only" filtering REMOVED (there's no more multi-tenant
 *     company model, so these are now flat platform-wide views).
 *   - CorporateController's admin-side "manage any company" methods
 *     (index/show/update/suspend/activate/destroy/analytics($id) — browsing
 *     a list of role=corporate accounts) were deleted outright: there is no
 *     more multi-company concept to browse/suspend/activate.
 */
class AdminController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $range = $request->get('range', 'this_month');
        $now   = now();

        // Custom date range: ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD
        if ($range === 'custom') {
            $periodStart = $request->get('from')
                ? Carbon::parse($request->get('from'))->startOfDay()
                : $now->copy()->startOfMonth();
            $periodEnd = $request->get('to')
                ? Carbon::parse($request->get('to'))->endOfDay()
                : $now->copy()->endOfDay();
            $days = (int) $periodStart->diffInDays($periodEnd) + 1;
            $prevEnd   = $periodStart->copy()->subSecond();
            $prevStart = $prevEnd->copy()->subDays($days - 1)->startOfDay();
        } else {

        // Resolve calendar-aware period and comparison boundaries
        [$periodStart, $periodEnd, $prevStart, $prevEnd] = match ($range) {
            'this_week' => [
                $now->copy()->startOfWeek(),
                $now->copy()->endOfDay(),
                $now->copy()->subWeek()->startOfWeek(),
                $now->copy()->subWeek()->endOfDay(),
            ],
            'last_month' => [
                $now->copy()->subMonth()->startOfMonth(),
                $now->copy()->subMonth()->endOfMonth(),
                $now->copy()->subMonths(2)->startOfMonth(),
                $now->copy()->subMonths(2)->endOfMonth(),
            ],
            '3months' => [
                $now->copy()->subMonths(3)->startOfMonth(),
                $now->copy()->endOfDay(),
                $now->copy()->subMonths(6)->startOfMonth(),
                $now->copy()->subMonths(3)->startOfMonth()->subSecond(),
            ],
            '6months' => [
                $now->copy()->subMonths(6)->startOfMonth(),
                $now->copy()->endOfDay(),
                $now->copy()->subMonths(12)->startOfMonth(),
                $now->copy()->subMonths(6)->startOfMonth()->subSecond(),
            ],
            '1year' => [
                $now->copy()->subYear()->addDay()->startOfDay(),
                $now->copy()->endOfDay(),
                $now->copy()->subYears(2)->addDay()->startOfDay(),
                $now->copy()->subYear()->startOfDay()->subSecond(),
            ],
            default => [ // this_month
                $now->copy()->startOfMonth(),
                $now->copy()->endOfDay(),
                $now->copy()->subMonth()->startOfMonth(),
                $now->copy()->subMonth()->endOfMonth(),
            ],
        };

        } // end else (non-custom ranges)

        // Cache key scoped to range + exact date window so cross-period requests never collide
        $cacheKey = 'admin:dashboard:' . $range
            . ':' . $periodStart->format('YmdHi')
            . ':' . $periodEnd->format('YmdHi');

        $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($range, $periodStart, $periodEnd, $prevStart, $prevEnd) {

            $pct = fn($curr, $prev) => $prev > 0
                ? round((($curr - $prev) / $prev) * 100, 1)
                : ($curr > 0 ? 100.0 : 0.0);

            // Users
            $totalUsers  = User::where('role', 'user')->count();
            $newUsers    = User::where('role', 'user')->whereBetween('created_at', [$periodStart, $periodEnd])->count();
            $prevUsers   = User::where('role', 'user')->whereBetween('created_at', [$prevStart, $prevEnd])->count();
            $usersChange = $pct($newUsers, $prevUsers);

            // Events
            $totalEvents  = Event::count();
            $newEvents    = Event::whereBetween('created_at', [$periodStart, $periodEnd])->count();
            $prevEvents   = Event::whereBetween('created_at', [$prevStart, $prevEnd])->count();
            $eventsChange = $pct($newEvents, $prevEvents);

            // Event ticket revenue (type = event_ticket_category), grouped by currency.
            // Returns amounts grouped by currency: ['USD' => 100.0, 'NGN' => 50000.0, ...]
            // 'paid' = Stripe/free plans; 'successful' = Paystack
            $ticketQuery = fn(?Carbon $from = null, ?Carbon $to = null): array =>
                Payment::whereIn('payments.status', ['paid', 'successful'])
                    ->where('payments.type', 'event_ticket_category')
                    ->when($from && $to, fn($q) => $q->whereBetween('payments.paid_at', [$from, $to]))
                    ->groupBy('payments.currency')
                    ->selectRaw('UPPER(payments.currency) as currency, SUM(payments.amount) as total')
                    ->pluck('total', 'currency')
                    ->map(fn($v) => (float) $v)
                    ->toArray();

            // Secondary stats
            $activeUsers   = User::whereBetween('last_activity_at', [$periodStart, $periodEnd])->count();
            $newSignups    = User::whereBetween('created_at', [$periodStart, $periodEnd])->count();
            $eventsCreated = Event::whereBetween('created_at', [$periodStart, $periodEnd])->count();

            // Revenue chart
            $revenueChart = $this->buildRevenueChart($range, $periodStart, $periodEnd, $ticketQuery);

            // Recent users
            $recentUsers = User::orderByDesc('created_at')->take(5)
                ->get(['name', 'email', 'role', 'created_at'])
                ->map(fn($u) => [
                    'name'       => $u->name,
                    'email'      => $u->email,
                    'role'       => $u->role,
                    'created_at' => $u->created_at->toISOString(),
                ])->toArray();

            // Recent events
            $recentEvents = Event::orderByDesc('created_at')->take(5)
                ->get(['title', 'status', 'current_attendees', 'created_at', 'updated_at'])
                ->map(fn($e) => [
                    'title'             => $e->title,
                    'status'            => $e->status,
                    'current_attendees' => (int) $e->current_attendees,
                    'created_at'        => $e->created_at->toISOString(),
                    'updated_at'        => $e->updated_at->toISOString(),
                ])->toArray();

            // Top events by attendance (with ticket revenue)
            $topEvents = Event::orderByDesc('current_attendees')->take(5)
                ->get(['id', 'title', 'current_attendees'])
                ->map(function ($e) {
                    $revenue = (float) (EventTicketCategory::where('event_id', $e->id)
                        ->selectRaw('SUM(sold_quantity * price) as rev')
                        ->value('rev') ?? 0);
                    return [
                        'title'     => $e->title,
                        'attendees' => (int) $e->current_attendees,
                        'revenue'   => $revenue,
                    ];
                })->toArray();

            return [
                'stats' => [
                    'total_users'    => $totalUsers,
                    'users_change'   => $usersChange,
                    'total_events'   => $totalEvents,
                    'events_change'  => $eventsChange,
                    // Revenue: per-currency maps — frontend converts to USD
                    'ticket_rev_all_time' => $ticketQuery(),
                    'ticket_rev_period'   => $ticketQuery($periodStart, $periodEnd),
                    'ticket_rev_prev'     => $ticketQuery($prevStart, $prevEnd),
                    // Secondary
                    'active_users'   => $activeUsers,
                    'new_signups'    => $newSignups,
                    'events_created' => $eventsCreated,
                ],
                'revenue_chart' => $revenueChart,
                'recent_users'  => $recentUsers,
                'recent_events' => $recentEvents,
                'top_events'    => $topEvents,
            ];
        });

        return response()->json($data);
    }

    // ───────────────────────────────────────────────────────────────────
    // Folded in from the former CorporateController (role merge, Phase 6a).
    // These used to be "my own company" self-service views, scoped to the
    // authenticated corporate user via corporate_id/organizer_id. There is
    // no more multi-company model, so the scoping filters below are gone —
    // any admin hitting these now sees the flat platform-wide view.
    // ───────────────────────────────────────────────────────────────────

    /**
     * Return the authenticated admin's own profile (includes default_card_template_id).
     */
    public function myProfile(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    /**
     * Allow the authenticated admin to update their own profile.
     */
    public function updateMyProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'               => 'sometimes|string|max:255',
            'company'            => 'sometimes|string|max:255',
            'email'              => 'sometimes|email|unique:users,email,' . $user->id,
            'phone'              => 'sometimes|nullable|string|max:20',
            'address'            => 'sometimes|nullable|string|max:500',
            'gender'             => 'sometimes|nullable|in:male,female,non-binary,prefer_not_to_say',
            'website'            => 'sometimes|nullable|string|max:255',
            'description'        => 'sometimes|nullable|string',
            'industry'           => 'sometimes|nullable|string|max:255',
            'founded_date'       => 'sometimes|nullable|date',
            'employee_count'     => 'sometimes|nullable|integer|min:1',
            'profile_image_file' => 'sometimes|nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // Handle logo upload (same S3 pattern as UserController)
        if ($request->hasFile('profile_image_file') && $request->file('profile_image_file')->isValid()) {
            try {
                /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
                $disk = Storage::disk('s3');

                // Delete old logo if stored on S3
                if ($user->profile_image_url) {
                    $oldPath = parse_url($user->profile_image_url, PHP_URL_PATH);
                    $disk->delete(ltrim($oldPath, '/'));
                }

                $extension = $request->file('profile_image_file')->getClientOriginalExtension();
                $filename  = time() . '_' . (string) Str::uuid() . '.' . $extension;
                $path = $request->file('profile_image_file')->storeAs('profile', $filename, 's3');

                $validated['profile_image_url'] = $disk->url($path);
            } catch (\Exception $e) {
                return response()->json(['message' => 'Logo upload failed.', 'error' => $e->getMessage()], 500);
            }
        }

        unset($validated['profile_image_file']);

        // Handle email change — requires verification before activating
        $emailChangePending = false;
        if (isset($validated['email'])) {
            if ($validated['email'] !== $user->email) {
                $newEmail = $validated['email'];
                unset($validated['email']);

                $token  = bin2hex(random_bytes(32));
                $validated['email_pending']      = $newEmail;
                $validated['email_change_token'] = hash('sha256', $token);

                $frontendUrl     = rtrim(config('app.frontend_url'), '/');
                $confirmationUrl = $frontendUrl . '/confirm-email-change?token=' . $token;

                try {
                    Mail::to($newEmail)->send(new EmailChangeVerificationMail($user->name, $newEmail, $confirmationUrl));
                } catch (\Throwable $e) {
                    Log::error("EmailChangeVerificationMail failed for admin user {$user->id}: " . $e->getMessage());
                }
                try {
                    Mail::to($user->email)->send(new EmailChangeNotificationMail($user, $newEmail));
                } catch (\Throwable $e) {
                    Log::error("EmailChangeNotificationMail failed for admin user {$user->id}: " . $e->getMessage());
                }
                try {
                    app(PushNotificationService::class)->sendToUser(
                        $user,
                        'An email change was requested for your account. Check your inbox to confirm. If this wasn\'t you, secure your account immediately.',
                        'alerts'
                    );
                } catch (\Throwable $e) {
                    Log::error("Email change push notification failed for admin user {$user->id}: " . $e->getMessage());
                }

                $emailChangePending = true;
            } else {
                // Same email re-submitted — clear any pending change
                unset($validated['email']);
                $validated['email_pending']      = null;
                $validated['email_change_token'] = null;
            }
        }

        $user->update($validated);

        $responseData = $user->fresh()->toArray();
        if ($emailChangePending) {
            $responseData['email_change_pending'] = true;
        }

        return response()->json($responseData);
    }

    /**
     * List all role=user/team accounts (flat platform-wide staff roster —
     * formerly scoped to User::where('corporate_id', $corporateUser->id)).
     */
    public function myUsers(Request $request): JsonResponse
    {
        $users = User::whereIn('role', ['user', 'team'])
            ->get(['id', 'name', 'email', 'profile_image_url', 'role', 'corporate_id']);

        return response()->json($users);
    }

    /**
     * Platform-wide ticket sales (formerly scoped to one corporate's events).
     * Supports ?event_id=, ?date_from=, ?date_to=, ?status=, ?search=
     */
    public function ticketSales(Request $request): JsonResponse
    {
        // All event IDs platform-wide (previously filtered to one corporate's events).
        $eventIds = Event::query()->pluck('id');

        // All ticket category IDs for those events
        $categoryIds = EventTicketCategory::whereIn('event_id', $eventIds)->pluck('id');

        // Base query: payments for event ticket categories
        $query = Payment::whereIn('item_id', $categoryIds)
            ->where('type', 'event_ticket_category')
            ->with([
                'user:id,name,email',
            ]);

        // Filter by event
        if ($request->filled('event_id')) {
            $filteredCategoryIds = EventTicketCategory::where('event_id', $request->event_id)
                ->whereIn('id', $categoryIds)
                ->pluck('id');
            $query->whereIn('item_id', $filteredCategoryIds);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from . ' 00:00:00');
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        // Filter by status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search by reference or buyer name/email
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('payment_reference', 'like', "%{$s}%")
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$s}%")
                      ->orWhere('email', 'like', "%{$s}%"));
            });
        }

        $payments = $query->orderByDesc('created_at')->get();

        // Attach event + ticket category info via item_id lookup
        $categoryMap = EventTicketCategory::whereIn('id', $categoryIds)
            ->with('event:id,title,start_date')
            ->get()
            ->keyBy('id');

        $rows = $payments->map(function ($p) use ($categoryMap) {
            $cat   = $categoryMap[$p->item_id] ?? null;
            $event = $cat?->event;
            return [
                'id'                => $p->id,
                'reference'         => $p->payment_reference,
                'buyer_name'        => $p->user?->name ?? '—',
                'buyer_email'       => $p->user?->email ?? '—',
                'event_title'       => $event?->title ?? '—',
                'event_date'        => $event?->start_date?->toDateString() ?? null,
                'ticket_category'   => $cat?->name ?? '—',
                'amount'            => (float) $p->amount,
                'currency'          => $p->currency ?? 'USD',
                'status'            => $p->status,
                'paid_at'           => $p->paid_at?->toISOString(),
                'created_at'        => $p->created_at->toISOString(),
            ];
        });

        // KPI summary
        $paid    = $rows->filter(fn($r) => in_array($r['status'], ['paid', 'successful']));
        $summary = [
            'total_revenue'      => $paid->sum('amount'),
            'total_sales'        => $rows->count(),
            'paid_count'         => $paid->count(),
            'pending_count'      => $rows->where('status', 'pending')->count(),
            'failed_count'       => $rows->where('status', 'failed')->count(),
        ];

        // Events list for filter dropdown
        $events = Event::whereIn('id', $eventIds)
            ->orderBy('title')
            ->get(['id', 'title', 'start_date']);

        return response()->json([
            'summary' => $summary,
            'sales'   => $rows->values(),
            'events'  => $events,
        ]);
    }

    /**
     * Flat, platform-wide events/staff dashboard (formerly "my own company"
     * dashboard, scoped by corporate_id/organizer_id to the calling corporate
     * user). Kept as a distinct method/route from dashboard() above since
     * that one is revenue/user-growth focused and this one is events/staff
     * focused — no naming collision, so both survive as separate endpoints.
     */
    public function corporateDashboard(Request $request): JsonResponse
    {
        $data = Cache::remember('admin:events-dashboard', now()->addMinutes(5), function () {
            $staffCount  = User::whereIn('role', ['user', 'team'])->count();
            $eventIds    = Event::query()->pluck('id');
            $totalEvents = $eventIds->count();

            $totalAttendees = (int) Event::whereIn('id', $eventIds)->sum('current_attendees');

            $ticketRow = EventTicketCategory::whereIn('event_id', $eventIds)
                ->selectRaw('SUM(sold_quantity * price) as revenue')->first();
            $eventRevenue = (float) ($ticketRow->revenue ?? 0);

            $totalEnrollments = EventEnrollment::whereIn('event_id', $eventIds)->count();
            $checkedIn        = EventEnrollment::whereIn('event_id', $eventIds)->where('checked_in', true)->count();
            $checkInRate = $totalEnrollments > 0 ? round(($checkedIn / $totalEnrollments) * 100, 1) : 0;

            $recentEvents = Event::whereIn('id', $eventIds)
                ->orderByDesc('updated_at')
                ->take(5)
                ->get(['id', 'title', 'status', 'current_attendees', 'updated_at'])
                ->map(fn($e) => [
                    'title'             => $e->title,
                    'status'            => $e->status,
                    'current_attendees' => (int) $e->current_attendees,
                    'updated_at'        => $e->updated_at->toISOString(),
                ])->toArray();

            $upcomingEvents = Event::whereIn('id', $eventIds)
                ->where('status', 'live')
                ->where('start_date', '>=', now()->toDateString())
                ->orderBy('start_date')
                ->take(5)
                ->get(['title', 'start_date', 'current_attendees', 'max_attendees', 'status'])
                ->map(fn($e) => [
                    'title'             => $e->title,
                    'date'              => $e->start_date,
                    'status'            => $e->status,
                    'current_attendees' => (int) $e->current_attendees,
                    'max_attendees'     => (int) $e->max_attendees,
                ])->toArray();

            return [
                'stats' => [
                    'staff_count'       => $staffCount,
                    'total_events'      => $totalEvents,
                    'total_attendees'   => $totalAttendees,
                    'event_revenue'     => $eventRevenue,
                    'check_in_rate'     => $checkInRate,
                ],
                'recent_events'   => $recentEvents,
                'upcoming_events' => $upcomingEvents,
            ];
        });

        return response()->json($data);
    }

    /**
     * Flat, platform-wide events analytics (formerly "my own company"
     * analytics scoped to one corporate's events).
     */
    public function corporateAnalytics(Request $request): JsonResponse
    {
        $data = Cache::remember('admin:events-analytics', now()->addMinutes(5), function () {
            $isPgsql = DB::connection()->getDriverName() === 'pgsql';
            $monthExpr = fn (string $col) => $isPgsql
                ? "TO_CHAR($col, 'Mon')"
                : "DATE_FORMAT($col, '%b')";
            $monthKeyExpr = fn (string $col) => $isPgsql
                ? "TO_CHAR($col, 'YYYY-MM')"
                : "DATE_FORMAT($col, '%Y-%m')";

            $staffCount = User::whereIn('role', ['user', 'team'])->count();

            $eventsCreated  = Event::count();
            $totalAttendees = Event::sum('current_attendees');

            $eventIds = Event::query()->pluck('id');

            $eventStatusColors = ['live' => '#10B981', 'draft' => '#F59E0B', 'cancelled' => '#EF4444', 'completed' => '#6B7280'];
            $eventsByStatus = Event::select('status', DB::raw('COUNT(*) as count'))
                ->groupBy('status')
                ->get()
                ->map(fn($r) => [
                    'status' => $r->status,
                    'count'  => (int) $r->count,
                    'color'  => $eventStatusColors[$r->status] ?? '#9CA3AF',
                ])->values()->toArray();

            $monthlyEventRows = Event::where('created_at', '>=', now()->subMonths(5)->startOfMonth())
                ->select(
                    DB::raw($monthExpr('created_at') . ' as month'),
                    DB::raw($monthKeyExpr('created_at') . ' as month_key'),
                    DB::raw('COUNT(*) as count')
                )
                ->groupBy('month_key', 'month')
                ->orderBy('month_key')
                ->get()
                ->keyBy('month_key');

            $monthlyEvents = [];
            for ($i = 5; $i >= 0; $i--) {
                $dt  = now()->subMonths($i);
                $key = $dt->format('Y-m');
                $monthlyEvents[] = [
                    'month' => $dt->format('M'),
                    'count' => isset($monthlyEventRows[$key]) ? (int) $monthlyEventRows[$key]->count : 0,
                ];
            }

            $capacityRow = Event::selectRaw('SUM(max_attendees) as total_capacity, SUM(current_attendees) as total_enrolled')
                ->first();
            $totalCapacity = (int) ($capacityRow->total_capacity ?? 0);
            $totalEnrolled = (int) ($capacityRow->total_enrolled ?? 0);
            $fillRate = $totalCapacity > 0 ? round(($totalEnrolled / $totalCapacity) * 100, 1) : 0;

            $enrollmentsByStatus = EventEnrollment::whereIn('event_id', $eventIds)
                ->select('status', DB::raw('COUNT(*) as count'))
                ->groupBy('status')
                ->get()
                ->map(fn($r) => ['status' => ucfirst($r->status), 'count' => (int) $r->count])
                ->values()->toArray();

            $totalEnrollments = EventEnrollment::whereIn('event_id', $eventIds)->count();
            $checkedIn        = EventEnrollment::whereIn('event_id', $eventIds)->where('checked_in', true)->count();
            $checkInRate = $totalEnrollments > 0 ? round(($checkedIn / $totalEnrollments) * 100, 1) : 0;

            $monthlyEnrollmentRows = EventEnrollment::whereIn('event_id', $eventIds)
                ->where('enrolled_at', '>=', now()->subMonths(5)->startOfMonth())
                ->select(
                    DB::raw($monthExpr('enrolled_at') . ' as month'),
                    DB::raw($monthKeyExpr('enrolled_at') . ' as month_key'),
                    DB::raw('COUNT(*) as count')
                )
                ->groupBy('month_key', 'month')
                ->orderBy('month_key')
                ->get()
                ->keyBy('month_key');

            $monthlyEnrollments = [];
            for ($i = 5; $i >= 0; $i--) {
                $dt  = now()->subMonths($i);
                $key = $dt->format('Y-m');
                $monthlyEnrollments[] = [
                    'month' => $dt->format('M'),
                    'count' => isset($monthlyEnrollmentRows[$key]) ? (int) $monthlyEnrollmentRows[$key]->count : 0,
                ];
            }

            $topEvents = Event::orderByDesc('current_attendees')
                ->take(5)
                ->get(['title', 'start_date', 'status', 'current_attendees', 'max_attendees'])
                ->map(fn($e) => [
                    'title'             => $e->title,
                    'date'              => $e->start_date,
                    'status'            => $e->status,
                    'current_attendees' => (int) $e->current_attendees,
                    'max_attendees'     => (int) $e->max_attendees,
                    'fill_rate'         => $e->max_attendees > 0 ? round(($e->current_attendees / $e->max_attendees) * 100, 1) : 0,
                ])->values()->toArray();

            $upcomingEvents = Event::where('status', 'live')
                ->where('start_date', '>=', now()->toDateString())
                ->orderBy('start_date')
                ->take(3)
                ->get(['title', 'start_date', 'current_attendees', 'max_attendees'])
                ->map(fn($e) => [
                    'title'             => $e->title,
                    'date'              => $e->start_date,
                    'current_attendees' => (int) $e->current_attendees,
                    'max_attendees'     => (int) $e->max_attendees,
                ])->values()->toArray();

            $ticketRevenue = EventTicketCategory::whereIn('event_id', $eventIds)
                ->selectRaw('SUM(sold_quantity * price) as revenue, SUM(sold_quantity) as tickets_sold')
                ->first();

            return [
                'summary' => [
                    'staff_count'     => $staffCount,
                    'events_created'  => $eventsCreated,
                    'total_attendees' => (int) $totalAttendees,
                ],
                'events' => [
                    'by_status'           => $eventsByStatus,
                    'monthly_created'     => $monthlyEvents,
                    'total_capacity'      => $totalCapacity,
                    'total_enrolled'      => $totalEnrolled,
                    'fill_rate'           => $fillRate,
                    'enrollment_statuses' => $enrollmentsByStatus,
                    'check_in_rate'       => $checkInRate,
                    'monthly_enrollments' => $monthlyEnrollments,
                    'top_events'          => $topEvents,
                    'upcoming'            => $upcomingEvents,
                    'tickets_sold'        => (int) ($ticketRevenue->tickets_sold ?? 0),
                    'ticket_revenue'      => (float) ($ticketRevenue->revenue ?? 0),
                ],
            ];
        });

        return response()->json($data);
    }

    private function buildRevenueChart(
        string $range,
        Carbon $periodStart,
        Carbon $periodEnd,
        callable $ticketQuery
    ): array {
        $chart = [];

        // Auto-select granularity for custom ranges
        if ($range === 'custom') {
            $days = (int) $periodStart->diffInDays($periodEnd) + 1;
            if ($days <= 31) {
                $range = '_custom_daily';
            } elseif ($days <= 90) {
                $range = '_custom_weekly';
            } else {
                $range = '_custom_monthly';
            }
        }

        if ($range === 'this_week' || $range === '_custom_daily') {
            $day = $periodStart->copy()->startOfDay();
            while ($day->lte($periodEnd)) {
                $start = $day->copy()->startOfDay();
                $end   = $day->copy()->endOfDay();
                $chart[] = [
                    'period' => ($range === 'this_week') ? $day->format('D') : $day->format('M j'),
                    'ticket' => $ticketQuery($start, $end),
                ];
                $day->addDay();
            }
        } elseif (in_array($range, ['this_month', 'last_month', '_custom_weekly'])) {
            $start = $periodStart->copy()->startOfDay();
            while ($start->lte($periodEnd)) {
                $end = $start->copy()->addDays(6)->endOfDay();
                if ($end->gt($periodEnd)) {
                    $end = $periodEnd->copy()->endOfDay();
                }
                $chart[] = [
                    'period' => $start->format('M j'),
                    'ticket' => $ticketQuery($start->copy(), $end->copy()),
                ];
                $start->addDays(7);
            }
        } else {
            $month = $periodStart->copy()->startOfMonth();
            while ($month->lte($periodEnd)) {
                $start = $month->copy()->startOfMonth();
                $end   = $month->copy()->endOfMonth();
                if ($end->gt($periodEnd)) {
                    $end = $periodEnd->copy()->endOfDay();
                }
                $chart[] = [
                    'period' => $month->format('M y'),
                    'ticket' => $ticketQuery($start, $end),
                ];
                $month->addMonth();
            }
        }

        return $chart;
    }
}
