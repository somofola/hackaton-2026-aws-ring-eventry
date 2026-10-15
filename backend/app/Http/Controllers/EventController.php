<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventEnrollment;
use App\Models\EventExhibitor;
use App\Models\EventFloorPlan;
use App\Models\EventSession;
use App\Models\EventSpeaker;
use App\Models\EventReview;
use App\Models\EventSponsor;
use App\Models\EventTeamMember;
use App\Models\EventTicketCategory;
use App\Models\User;
use App\Mail\SpeakerAddedMail;
use App\Mail\TeamMemberAddedMail;
use App\Mail\TeamMemberInviteMail;
use App\Mail\NewTicketPurchaseMail;
use App\Services\PushNotificationService;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $query = Event::query()
            ->with(['organizer', 'corporate', 'speakers.user', 'sessions', 'exhibitors', 'teamMembers', 'ticketCategories']);

        // Filter by company for corporate users
        if ($request->has('corporate_id')) {
            $query->where('corporate_id', $request->corporate_id);
        }

        // Filter by organizer
        if ($request->has('organizer_id')) {
            $query->where('organizer_id', $request->organizer_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%")
                  ->orWhere('location', 'like', "%{$request->search}%");
            });
        }

        $events = $query->orderBy('start_date', 'asc')
                       ->paginate($request->per_page ?? 15);

        return response()->json($events);
    }

    public function myEvents(Request $request)
    {
        $user = $request->user();

        $events = Event::where('organizer_id', $user->id)
            ->with(['speakers.user', 'sessions', 'exhibitors', 'teamMembers', 'ticketCategories'])
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json($events);
    }

    public function getEventsByStatus(Request $request, $status)
    {
        // Public endpoint: non-admin callers may only list 'live' or 'completed' events.
        $user = $request->user();
        $isAdmin = $user && in_array($user->role, ['admin', 'super-admin']);
        if (!$isAdmin && !in_array($status, ['live', 'completed'], true)) {
            $status = 'live';
        }

        $query = Event::query()
            ->with(['organizer', 'corporate', 'speakers.user', 'sessions', 'exhibitors', 'teamMembers', 'ticketCategories'])
            ->where('status', $status);

        if ($request->has('corporate_id')) {
            $query->where('corporate_id', $request->corporate_id);
        }

        if ($request->has('organizer_id')) {
            $query->where('organizer_id', $request->organizer_id);
        }

        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%")
                  ->orWhere('location', 'like', "%{$request->search}%");
            });
        }

        $events = $query->orderBy('start_date', 'asc')
                        ->paginate($request->per_page ?? 50);

        return response()->json($events);
    }

    public function getEventBySlug($slug)
    {
        $event = Event::where('slug', $slug)
            ->where('status', 'live')
            ->with(['organizer', 'corporate', 'speakers.user', 'sessions', 'exhibitors', 'teamMembers', 'ticketCategories'])
            ->firstOrFail();

        return response()->json($event);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'title'                 => 'required|string|max:255',
            'description'           => 'nullable|string',
            'start_date'            => 'required|date',
            'end_date'              => 'nullable|date|after_or_equal:start_date',
            'start_time'            => 'nullable|string',
            'end_time'              => 'nullable|string',
            'location'              => 'required|string',
            'event_type'            => 'nullable|in:virtual,physical,hybrid',
            'virtual_link'          => 'nullable|string|max:500',
            'max_attendees'         => 'nullable|integer|min:0',
            'image_url'             => 'nullable|url',
            'corporate_id'          => 'nullable|exists:users,id',
            'status'                => 'sometimes|in:draft,live,cancelled,completed',
            'registration_deadline' => 'nullable|date',
            'tags'                  => 'nullable|array',
            'venue_details'         => 'nullable|string',
            'contact_email'         => 'nullable|email',
            'contact_phone'         => 'nullable|string',
            'website_url'           => 'nullable|url',
            'social_links'          => 'nullable|array',
            'custom_fields'         => 'nullable|array',
            'branding_settings'     => 'nullable|array',
            'issues_certificate'    => 'nullable|boolean',
        ]);

        $validated['uuid']               = (string) Str::uuid();
        $validated['current_attendees']  = 0;
        $validated['organizer_id']       = $user->id;
        $validated['organizer_name']     = $user->name;
        // Auto-set corporate_id so ownership checks (and staff/team-member
        // scoping via User.corporate_id) work correctly. 'corporate' role was
        // merged into 'admin' — the authoring admin now plays that scoping role.
        if (in_array($user->role, ['admin', 'super-admin']) && empty($validated['corporate_id'])) {
            $validated['corporate_id'] = $user->id;
        }
        $validated['max_attendees']      = $validated['max_attendees'] ?? 0;
        $validated['start_time']         = $validated['start_time'] ?? null;
        $validated['description']        = $validated['description'] ?? '';
        $validated['status']             = $validated['status'] ?? 'draft';

        $event = Event::create($validated);

        return response()->json($event->load(['organizer', 'corporate', 'speakers.user', 'sessions', 'exhibitors', 'teamMembers', 'ticketCategories']), 201);
    }

    public function show(Request $request, Event $event)
    {
        $user = $request->user();
        $isAdmin    = $user && in_array($user->role, ['admin', 'super-admin']);
        $isOrganizer = $user && (int) $event->organizer_id === (int) $user->id;
        $isCorporateOwner = $user && $event->corporate_id && (int) $event->corporate_id === (int) $user->id;

        if ($user && !$isAdmin && !$isOrganizer && !$isCorporateOwner) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($this->formatEventResponse($event->load([
            'organizer',
            'corporate',
            'speakers.user',
            'sessions',
            'exhibitors',
            'sponsors',
            'teamMembers',
            'ticketCategories',
            'floorPlans',
            'enrollments.user',
            'payments'
        ])));
    }

    public function update(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'sometimes|nullable|string',
            'end_time' => 'sometimes|nullable|string',
            'location' => 'sometimes|string',
            'event_type' => 'nullable|in:virtual,physical,hybrid',
            'virtual_link' => 'nullable|string|max:500',
            'latitude'     => 'nullable|numeric|between:-90,90',
            'longitude'    => 'nullable|numeric|between:-180,180',
            'max_attendees' => 'sometimes|integer|min:1',
            'image_url' => 'nullable|url',
            'status' => 'sometimes|in:draft,live,cancelled,completed',
            'registration_deadline' => 'nullable|date',
            'tags' => 'nullable|array',
            'venue_details' => 'nullable|string',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'website_url' => 'nullable|url',
            'social_links' => 'nullable|array',
            'custom_fields' => 'nullable|array',
            'branding_settings' => 'nullable|array',
            'issues_certificate' => 'nullable|boolean',
        ]);

        $event->update($validated);

        if ($request->has('speakers'))         $this->syncSpeakers($event, $request->input('speakers', []));
        if ($request->has('sessions'))         $this->syncSessions($event, $request->input('sessions', []));
        if ($request->has('exhibitors'))       $this->syncExhibitors($event, $request->input('exhibitors', []));
        if ($request->has('team_members'))     $this->syncTeamMembers($event, $request->input('team_members', []));
        if ($request->has('ticket_categories'))$this->syncTicketCategories($event, $request->input('ticket_categories', []));
        if ($request->has('floor_plans'))      $this->syncFloorPlans($event, $request->input('floor_plans', []));

        Cache::tags(['events'])->flush();

        return response()->json($this->loadEvent($event));
    }

    // ── Sync helpers ──────────────────────────────────────────────────────────

    private function loadEvent(Event $event): array
    {
        $event->load([
            'speakers.user',
            'sessions',
            'exhibitors',
            'sponsors',
            'teamMembers',
            'ticketCategories',
            'floorPlans',
        ]);
        return $this->formatEventResponse($event);
    }

    private function formatEventResponse(Event $event): array
    {
        $data = $event->toArray();

        // Transform speakers: flatten user data + event-context fields
        $data['speakers'] = $event->speakers->map(function ($es) {
            $user = $es->user;
            return [
                'id'       => $user?->id,
                'user_id'  => $user?->id,
                'name'     => $user?->name,
                'title'    => $es->title,
                'company'  => $es->company,
                'bio'      => $user?->description,
                'imageUrl' => $user?->profile_image_url,
                'social'   => $es->social,
            ];
        })->values()->toArray();

        // Transform sessions: camelCase fields for frontend
        $data['sessions'] = $event->sessions->map(function ($s) {
            return [
                'id'         => $s->id,
                'title'      => $s->title,
                'description'=> $s->description,
                'startTime'  => $s->start_time,
                'endTime'    => $s->end_time,
                'speakerIds' => $s->speaker_ids ?? [],
                'location'   => $s->location,
                'capacity'   => $s->capacity,
            ];
        })->values()->toArray();

        // Transform exhibitors
        $data['exhibitors'] = $event->exhibitors->map(function ($ex) {
            return [
                'id'          => $ex->id,
                'name'        => $ex->company_name,
                'description' => $ex->description,
                'website'     => $ex->website,
                'logoUrl'     => $ex->logo_url,
                'boothNumber' => $ex->booth_number,
                'contact'     => [
                    'name'  => $ex->contact_name,
                    'email' => $ex->contact_email,
                    'phone' => $ex->contact_phone,
                ],
            ];
        })->values()->toArray();

        // Transform team members
        $data['team_members'] = $event->teamMembers->map(function ($m) {
            return [
                'id'       => $m->id,
                'user_id'  => $m->user_id,
                'name'     => $m->name,
                'role'     => $m->role,
                'email'    => $m->email,
                'phone'    => $m->phone,
                'imageUrl' => $m->image_url,
            ];
        })->values()->toArray();

        // Transform ticket categories
        $data['ticket_categories'] = $event->ticketCategories->map(function ($tc) {
            return [
                'id'             => $tc->id,
                'name'           => $tc->name,
                'description'    => $tc->description,
                'price'          => (float) $tc->price,
                'maxQuantity'    => $tc->max_quantity,
                'soldQuantity'   => $tc->sold_quantity,
                'color'          => $tc->color,
                'floorPlanAreas' => $tc->floor_plan_areas ?? [],
            ];
        })->values()->toArray();

        // Transform floor plans
        $data['floor_plans'] = $event->floorPlans->map(function ($fp) {
            return [
                'id'      => $fp->id,
                'name'    => $fp->name,
                'imageUrl'=> $fp->floor_plan_url,
                'areas'   => $fp->areas ?? [],
                'width'   => $fp->width ?? 800,
                'height'  => $fp->height ?? 600,
            ];
        })->values()->toArray();

        // Transform sponsors
        $data['sponsors'] = ($event->relationLoaded('sponsors') ? $event->sponsors : collect())->map(function ($sp) {
            return [
                'id'           => $sp->id,
                'name'         => $sp->name,
                'tier'         => $sp->tier,
                'logoUrl'      => $sp->logo_url,
                'website'      => $sp->website,
                'description'  => $sp->description,
                'contactName'  => $sp->contact_name,
                'contactEmail' => $sp->contact_email,
            ];
        })->values()->toArray();

        return $data;
    }

    private function syncSpeakers(Event $event, array $incoming): void
    {
        $keptUserIds = [];

        foreach ($incoming as $sp) {
            $userId = $sp['user_id'] ?? null;

            if ($userId && User::where('id', $userId)->where('role', 'speaker')->exists()) {
                User::where('id', $userId)->update([
                    'name'              => $sp['name'],
                    'description'       => $sp['bio'] ?? null,
                    'profile_image_url' => $sp['imageUrl'] ?? null,
                ]);
            } else {
                $user = User::create([
                    'name'              => $sp['name'],
                    'email'             => 'speaker_' . Str::uuid() . '@eventry.internal',
                    'password'          => Hash::make(Str::random(24)),
                    'role'              => 'speaker',
                    'description'       => $sp['bio'] ?? null,
                    'profile_image_url' => $sp['imageUrl'] ?? null,
                    'email_verified_at' => now(),
                ]);
                $userId = $user->id;
            }

            $keptUserIds[] = $userId;

            EventSpeaker::updateOrCreate(
                ['event_id' => $event->id, 'user_id' => $userId],
                [
                    'title'   => $sp['title'] ?? null,
                    'company' => $sp['company'] ?? null,
                    'social'  => $sp['social'] ?? null,
                ]
            );
        }

        EventSpeaker::where('event_id', $event->id)
            ->whereNotIn('user_id', $keptUserIds)
            ->delete();
    }

    private function syncSessions(Event $event, array $incoming): void
    {
        $keptIds = [];

        foreach ($incoming as $s) {
            $dbId = is_numeric($s['id'] ?? null) && strlen((string)($s['id'] ?? '')) < 13
                ? (int) $s['id'] : null;

            $data = [
                'event_id'    => $event->id,
                'title'       => $s['title'],
                'description' => $s['description'] ?? null,
                'start_time'  => $s['startTime'] ?? null,
                'end_time'    => $s['endTime'] ?? null,
                'speaker_ids' => $s['speakerIds'] ?? [],
                'location'    => $s['location'] ?? null,
                'capacity'    => $s['capacity'] ?? null,
            ];

            if ($dbId && EventSession::where('id', $dbId)->where('event_id', $event->id)->exists()) {
                EventSession::where('id', $dbId)->update($data);
                $session = EventSession::find($dbId);
            } else {
                $session = EventSession::create($data);
            }

            $keptIds[] = $session->id;

            // Sync event_session_speakers pivot
            $userIds = array_filter((array)($s['speakerIds'] ?? []), fn($id) => is_numeric($id));
            $session->speakers()->sync($userIds);
        }

        EventSession::where('event_id', $event->id)->whereNotIn('id', $keptIds)->delete();
    }

    private function syncExhibitors(Event $event, array $incoming): void
    {
        $keptIds = [];

        foreach ($incoming as $ex) {
            $dbId = is_numeric($ex['id'] ?? null) && strlen((string)($ex['id'] ?? '')) < 13
                ? (int) $ex['id'] : null;

            $data = [
                'event_id'       => $event->id,
                'company_name'   => $ex['name'] ?? null,
                'description'    => $ex['description'] ?? null,
                'website'        => $ex['website'] ?? null,
                'logo_url'       => $ex['logoUrl'] ?? null,
                'booth_number'   => $ex['boothNumber'] ?? null,
                'contact_name'   => $ex['contact']['name'] ?? null,
                'contact_email'  => $ex['contact']['email'] ?? null,
                'contact_phone'  => $ex['contact']['phone'] ?? null,
            ];

            if ($dbId && EventExhibitor::where('id', $dbId)->where('event_id', $event->id)->exists()) {
                EventExhibitor::where('id', $dbId)->update($data);
                $record = EventExhibitor::find($dbId);
            } else {
                $record = EventExhibitor::create($data);
            }

            $keptIds[] = $record->id;
        }

        EventExhibitor::where('event_id', $event->id)->whereNotIn('id', $keptIds)->delete();
    }

    private function syncTeamMembers(Event $event, array $incoming): void
    {
        $keptIds = [];

        foreach ($incoming as $m) {
            $dbId = is_numeric($m['id'] ?? null) && strlen((string)($m['id'] ?? '')) < 13
                ? (int) $m['id'] : null;

            $data = [
                'event_id'  => $event->id,
                'user_id'   => $m['user_id'] ?? null,
                'name'      => $m['name'] ?? null,
                'email'     => $m['email'] ?? null,
                'phone'     => $m['phone'] ?? null,
                'image_url' => $m['imageUrl'] ?? null,
                'role'      => $m['role'] ?? null,
            ];

            if ($dbId && EventTeamMember::where('id', $dbId)->where('event_id', $event->id)->exists()) {
                EventTeamMember::where('id', $dbId)->update($data);
                $record = EventTeamMember::find($dbId);
            } else {
                $record = EventTeamMember::create($data);
            }

            $keptIds[] = $record->id;
        }

        EventTeamMember::where('event_id', $event->id)->whereNotIn('id', $keptIds)->delete();
    }

    private function syncTicketCategories(Event $event, array $incoming): void
    {
        $keptIds = [];

        foreach ($incoming as $tc) {
            $dbId = is_numeric($tc['id'] ?? null) && strlen((string)($tc['id'] ?? '')) < 13
                ? (int) $tc['id'] : null;

            $data = [
                'event_id'        => $event->id,
                'name'            => $tc['name'],
                'description'     => $tc['description'] ?? null,
                'price'           => $tc['price'] ?? 0,
                'max_quantity'    => $tc['maxQuantity'] ?? 0,
                'sold_quantity'   => $tc['soldQuantity'] ?? 0,
                'color'           => $tc['color'] ?? null,
                'floor_plan_areas'=> $tc['floorPlanAreas'] ?? null,
            ];

            if ($dbId && EventTicketCategory::where('id', $dbId)->where('event_id', $event->id)->exists()) {
                EventTicketCategory::where('id', $dbId)->update($data);
                $record = EventTicketCategory::find($dbId);
            } else {
                $record = EventTicketCategory::create($data);
            }

            $keptIds[] = $record->id;
        }

        EventTicketCategory::where('event_id', $event->id)->whereNotIn('id', $keptIds)->delete();
    }

    private function syncFloorPlans(Event $event, array $incoming): void
    {
        $keptIds = [];

        foreach ($incoming as $fp) {
            $dbId = is_numeric($fp['id'] ?? null) && strlen((string)($fp['id'] ?? '')) < 13
                ? (int) $fp['id'] : null;

            $data = [
                'event_id'      => $event->id,
                'name'          => $fp['name'],
                'floor_plan_url'=> $fp['imageUrl'] ?? null,
                'areas'         => $fp['areas'] ?? [],
                'width'         => $fp['width'] ?? null,
                'height'        => $fp['height'] ?? null,
            ];

            if ($dbId && EventFloorPlan::where('id', $dbId)->where('event_id', $event->id)->exists()) {
                EventFloorPlan::where('id', $dbId)->update($data);
                $record = EventFloorPlan::find($dbId);
            } else {
                $record = EventFloorPlan::create($data);
            }

            $keptIds[] = $record->id;
        }

        EventFloorPlan::where('event_id', $event->id)->whereNotIn('id', $keptIds)->delete();
    }

    public function adminUpdateStatus(Request $request, Event $event)
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,live,cancelled,completed',
        ]);

        $event->update(['status' => $validated['status']]);

        return response()->json(['status' => $event->status]);
    }

    public function storeTicketCategory(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'description'      => 'required|string',
            'price'            => 'nullable|numeric|min:0',
            'maxQuantity'      => 'nullable|integer|min:0',
            'color'            => 'nullable|string|max:20',
            'floorPlanAreas'   => 'nullable|array',
        ]);

        $category = EventTicketCategory::create([
            'event_id'         => $event->id,
            'name'             => $validated['name'],
            'description'      => $validated['description'],
            'price'            => $validated['price'] ?? 0,
            'max_quantity'     => $validated['maxQuantity'] ?? 0,
            'sold_quantity'    => 0,
            'color'            => $validated['color'] ?? '#3B82F6',
            'floor_plan_areas' => $validated['floorPlanAreas'] ?? null,
        ]);

        return response()->json([
            'id'             => $category->id,
            'name'           => $category->name,
            'description'    => $category->description,
            'price'          => (float) $category->price,
            'maxQuantity'    => $category->max_quantity,
            'soldQuantity'   => $category->sold_quantity,
            'color'          => $category->color,
            'floorPlanAreas' => $category->floor_plan_areas ?? [],
        ], 201);
    }

    public function lookupSpeaker(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $user = User::where('email', $request->query('email'))->first();

        if (!$user) {
            return response()->json(['found' => false]);
        }

        return response()->json([
            'found' => true,
            'user'  => [
                'name'     => $user->name,
                'bio'      => $user->description,
                'imageUrl' => $user->profile_image_url,
            ],
        ]);
    }

    public function storeEventSpeaker(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'email'         => 'required|email',
            'name'          => 'required|string|max:255',
            'title'         => 'nullable|string|max:255',
            'company'       => 'nullable|string|max:255',
            'bio'           => 'nullable|string',
            'linkedin'      => 'nullable|string|max:500',
            'twitter'       => 'nullable|string|max:500',
            'session_id'    => 'nullable|integer|exists:event_sessions,id',
            'profile_image' => 'nullable|file|mimes:jpg,jpeg,png,webp',
        ]);

        $email = $request->input('email');
        $existingUser = User::where('email', $email)->first();

        // Handle profile image upload
        $imageUrl = null;
        if ($request->hasFile('profile_image')) {
            $filename = time() . '_' . (string) Str::uuid() . '.webp';
            $imageContent = app(ImageService::class)->processCardImage($request->file('profile_image'), 250);
            Storage::disk('r2')->put('event/speaker/' . $filename, $imageContent);
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('r2');
            $imageUrl = $disk->url('event/speaker/' . $filename);
        }

        $isNewAccount = false;
        if ($existingUser) {
            if ($imageUrl) {
                $existingUser->update(['profile_image_url' => $imageUrl]);
            }
            $speakerUser = $existingUser->fresh();
        } else {
            $isNewAccount = true;
            $speakerUser = User::create([
                'name'              => $request->input('name'),
                'email'             => $email,
                'password'          => Hash::make(Str::random(24)),
                'role'              => 'speaker',
                'description'       => $request->input('bio'),
                'profile_image_url' => $imageUrl,
                'email_verified_at' => now(),
            ]);
        }

        $eventSpeaker = EventSpeaker::updateOrCreate(
            ['event_id' => $event->id, 'user_id' => $speakerUser->id],
            [
                'title'   => $request->input('title'),
                'company' => $request->input('company'),
                'social'  => array_filter([
                    'linkedin' => $request->input('linkedin') ?: null,
                    'twitter'  => $request->input('twitter') ?: null,
                ]) ?: null,
            ]
        );

        // Assign to session if requested
        $sessionTitle = null;
        if ($sessionId = $request->input('session_id')) {
            $session = EventSession::find($sessionId);
            if ($session && $session->event_id === $event->id) {
                $sessionTitle = $session->title;
                $speakerIds = $session->speaker_ids ?? [];
                if (!in_array($speakerUser->id, $speakerIds)) {
                    $speakerIds[] = $speakerUser->id;
                    $session->update(['speaker_ids' => $speakerIds]);
                }
                DB::table('event_session_speakers')->updateOrInsert(
                    ['session_id' => $sessionId, 'user_id' => $speakerUser->id],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // Send notification email
        try {
            Mail::to($email)->send(new SpeakerAddedMail(
                speakerName: $speakerUser->name,
                eventTitle: $event->title,
                sessionTitle: $sessionTitle,
                isNewAccount: $isNewAccount,
            ));
        } catch (\Exception $e) {
            // Log but do not fail the request if mail fails
            \Log::warning("SpeakerAddedMail failed for {$email}: " . $e->getMessage());
        }

        return response()->json([
            'id'        => $speakerUser->id,
            'user_id'   => $speakerUser->id,
            'name'      => $speakerUser->name,
            'title'     => $eventSpeaker->title,
            'company'   => $eventSpeaker->company,
            'bio'       => $speakerUser->description,
            'imageUrl'  => $speakerUser->profile_image_url,
            'social'    => $eventSpeaker->social,
            'session_id'=> $request->input('session_id') ? (int)$request->input('session_id') : null,
        ], 201);
    }

    public function updateEventSpeaker(Request $request, Event $event, $speakerId)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name'          => 'sometimes|string|max:255',
            'title'         => 'nullable|string|max:255',
            'company'       => 'nullable|string|max:255',
            'bio'           => 'nullable|string',
            'linkedin'      => 'nullable|string|max:500',
            'twitter'       => 'nullable|string|max:500',
            'session_id'    => 'nullable|integer|exists:event_sessions,id',
            'profile_image' => 'nullable|file|mimes:jpg,jpeg,png,webp',
        ]);

        $speakerUser = User::find($speakerId);
        if (!$speakerUser) {
            return response()->json(['message' => 'Speaker not found'], 404);
        }

        $eventSpeaker = EventSpeaker::where('event_id', $event->id)
            ->where('user_id', $speakerUser->id)
            ->first();

        if (!$eventSpeaker) {
            return response()->json(['message' => 'Speaker not found for this event'], 404);
        }

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            $filename = time() . '_' . (string) Str::uuid() . '.webp';
            $imageContent = app(ImageService::class)->processCardImage($request->file('profile_image'), 250);
            Storage::disk('r2')->put('event/speaker/' . $filename, $imageContent);
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('r2');
            $speakerUser->update(['profile_image_url' => $disk->url('event/speaker/' . $filename)]);
        }

        // Update user name and bio
        $userUpdate = [];
        if ($request->has('name')) $userUpdate['name'] = $request->input('name');
        if ($request->has('bio'))  $userUpdate['description'] = $request->input('bio');
        if ($userUpdate) $speakerUser->update($userUpdate);

        // Update event speaker record
        $eventSpeaker->update([
            'title'   => $request->input('title'),
            'company' => $request->input('company'),
            'social'  => array_filter([
                'linkedin' => $request->input('linkedin') ?: null,
                'twitter'  => $request->input('twitter') ?: null,
            ]) ?: null,
        ]);

        // Re-assign session if provided
        if ($request->has('session_id')) {
            // Remove speaker from all sessions of this event
            $eventSessionIds = EventSession::where('event_id', $event->id)->pluck('id')->toArray();
            DB::table('event_session_speakers')
                ->where('user_id', $speakerUser->id)
                ->whereIn('session_id', $eventSessionIds)
                ->delete();

            foreach (EventSession::whereIn('id', $eventSessionIds)->get() as $sess) {
                $ids = array_values(array_filter($sess->speaker_ids ?? [], fn($id) => $id != $speakerUser->id));
                $sess->update(['speaker_ids' => $ids]);
            }

            if ($sessionId = $request->input('session_id')) {
                $session = EventSession::find($sessionId);
                if ($session && $session->event_id === $event->id) {
                    $speakerIds = $session->speaker_ids ?? [];
                    if (!in_array($speakerUser->id, $speakerIds)) {
                        $speakerIds[] = $speakerUser->id;
                        $session->update(['speaker_ids' => $speakerIds]);
                    }
                    DB::table('event_session_speakers')->updateOrInsert(
                        ['session_id' => $sessionId, 'user_id' => $speakerUser->id],
                        ['created_at' => now(), 'updated_at' => now()]
                    );
                }
            }
        }

        $speakerUser = $speakerUser->fresh();
        $eventSpeaker = $eventSpeaker->fresh();

        return response()->json([
            'id'         => $speakerUser->id,
            'user_id'    => $speakerUser->id,
            'name'       => $speakerUser->name,
            'title'      => $eventSpeaker->title,
            'company'    => $eventSpeaker->company,
            'bio'        => $speakerUser->description,
            'imageUrl'   => $speakerUser->profile_image_url,
            'social'     => $eventSpeaker->social,
            'session_id' => $request->input('session_id') ? (int)$request->input('session_id') : null,
        ]);
    }

    private function formatExhibitor(EventExhibitor $ex): array
    {
        return [
            'id'          => $ex->id,
            'name'        => $ex->company_name,
            'description' => $ex->description,
            'website'     => $ex->website,
            'logoUrl'     => $ex->logo_url,
            'boothNumber' => $ex->booth_number,
            'contact'     => [
                'name'  => $ex->contact_name,
                'email' => $ex->contact_email,
                'phone' => $ex->contact_phone,
            ],
        ];
    }

    public function storeEventExhibitor(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'company_name'  => 'required|string|max:255',
            'contact_name'  => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'website'       => 'nullable|string|max:500',
            'booth_number'  => 'nullable|string|max:50',
            'description'   => 'nullable|string',
            'logo'          => 'nullable|file|mimes:jpg,jpeg,png,webp',
        ]);

        $logoUrl = null;
        if ($request->hasFile('logo')) {
            $filename = time() . '_' . (string) Str::uuid() . '.webp';
            $imageContent = app(ImageService::class)->processCardImage($request->file('logo'), 25);
            Storage::disk('r2')->put('event/exhibitor/' . $filename, $imageContent);
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('r2');
            $logoUrl = $disk->url('event/exhibitor/' . $filename);
        }

        $ex = EventExhibitor::create([
            'event_id'      => $event->id,
            'company_name'  => $request->input('company_name'),
            'contact_name'  => $request->input('contact_name'),
            'contact_email' => $request->input('contact_email'),
            'contact_phone' => $request->input('contact_phone'),
            'website'       => $request->input('website'),
            'booth_number'  => $request->input('booth_number'),
            'description'   => $request->input('description'),
            'logo_url'      => $logoUrl,
        ]);

        return response()->json($this->formatExhibitor($ex), 201);
    }

    public function updateEventExhibitor(Request $request, Event $event, EventExhibitor $exhibitor)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($exhibitor->event_id !== $event->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'company_name'  => 'sometimes|string|max:255',
            'contact_name'  => 'sometimes|string|max:255',
            'contact_email' => 'sometimes|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'website'       => 'nullable|string|max:500',
            'booth_number'  => 'nullable|string|max:50',
            'description'   => 'nullable|string',
            'logo'          => 'nullable|file|mimes:jpg,jpeg,png,webp',
        ]);

        $data = $request->only([
            'company_name', 'contact_name', 'contact_email',
            'contact_phone', 'website', 'booth_number', 'description',
        ]);

        if ($request->hasFile('logo')) {
            $filename = time() . '_' . (string) Str::uuid() . '.webp';
            $imageContent = app(ImageService::class)->processCardImage($request->file('logo'), 25);
            Storage::disk('r2')->put('event/exhibitor/' . $filename, $imageContent);
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('r2');
            $data['logo_url'] = $disk->url('event/exhibitor/' . $filename);
        }

        $exhibitor->update($data);

        return response()->json($this->formatExhibitor($exhibitor->fresh()));
    }

    private function formatSponsor(EventSponsor $sp): array
    {
        return [
            'id'           => $sp->id,
            'name'         => $sp->name,
            'tier'         => $sp->tier,
            'logoUrl'      => $sp->logo_url,
            'website'      => $sp->website,
            'description'  => $sp->description,
            'contactName'  => $sp->contact_name,
            'contactEmail' => $sp->contact_email,
        ];
    }

    public function storeEventSponsor(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name'          => 'required|string|max:255',
            'tier'          => 'nullable|in:platinum,gold,silver,bronze,partner',
            'website'       => 'nullable|string|max:500',
            'description'   => 'nullable|string',
            'contact_name'  => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'logo'          => 'nullable|file|mimes:jpg,jpeg,png,webp',
        ]);

        $logoUrl = null;
        if ($request->hasFile('logo')) {
            $filename = time() . '_' . (string) Str::uuid() . '.webp';
            $imageContent = app(ImageService::class)->processCardImage($request->file('logo'), 25);
            Storage::disk('r2')->put('event/sponsor/' . $filename, $imageContent);
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('r2');
            $logoUrl = $disk->url('event/sponsor/' . $filename);
        }

        $sp = EventSponsor::create([
            'event_id'      => $event->id,
            'name'          => $request->input('name'),
            'tier'          => $request->input('tier', 'bronze'),
            'website'       => $request->input('website'),
            'description'   => $request->input('description'),
            'contact_name'  => $request->input('contact_name'),
            'contact_email' => $request->input('contact_email'),
            'logo_url'      => $logoUrl,
        ]);

        return response()->json($this->formatSponsor($sp), 201);
    }

    public function updateEventSponsor(Request $request, Event $event, EventSponsor $sponsor)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($sponsor->event_id !== $event->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'name'          => 'sometimes|string|max:255',
            'tier'          => 'nullable|in:platinum,gold,silver,bronze,partner',
            'website'       => 'nullable|string|max:500',
            'description'   => 'nullable|string',
            'contact_name'  => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'logo'          => 'nullable|file|mimes:jpg,jpeg,png,webp',
        ]);

        $data = $request->only(['name', 'tier', 'website', 'description', 'contact_name', 'contact_email']);

        if ($request->hasFile('logo')) {
            $filename = time() . '_' . (string) Str::uuid() . '.webp';
            $imageContent = app(ImageService::class)->processCardImage($request->file('logo'), 25);
            Storage::disk('r2')->put('event/sponsor/' . $filename, $imageContent);
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('r2');
            $data['logo_url'] = $disk->url('event/sponsor/' . $filename);
        }

        $sponsor->update($data);

        return response()->json($this->formatSponsor($sponsor->fresh()));
    }

    public function destroyEventSponsor(Request $request, Event $event, EventSponsor $sponsor)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($sponsor->event_id !== $event->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $sponsor->delete();
        return response()->json(null, 204);
    }

    public function destroyEventExhibitor(Request $request, Event $event, EventExhibitor $exhibitor)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($exhibitor->event_id !== $event->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $exhibitor->delete();
        return response()->json(null, 204);
    }

    public function lookupTeamMemberEmail(Request $request)
    {
        $email = $request->query('email');
        $user = User::where('email', $email)->first();
        if ($user) {
            return response()->json([
                'found' => true,
                'user'  => [
                    'name'     => $user->name,
                    'phone'    => $user->phone ?? null,
                    'imageUrl' => $user->profile_image_url,
                ],
            ]);
        }
        return response()->json(['found' => false]);
    }

    public function storeEventTeamMember(Request $request, Event $event)
    {
        $auth = $request->user();
        if (!in_array($auth->role, ['admin', 'super-admin']) && $event->organizer_id !== $auth->id && (int) $auth->id !== (int) $event->corporate_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email    = strtolower(trim($request->input('email')));
        $existing = User::where('email', $email)->first();
        $eventDate = $event->start_date ? \Carbon\Carbon::parse($event->start_date)->format('d M Y') : 'TBC';

        if ($existing) {
            // User exists — add directly and notify
            $record = EventTeamMember::create([
                'event_id'  => $event->id,
                'user_id'   => $existing->id,
                'name'      => $existing->name,
                'email'     => $email,
                'phone'     => $existing->phone ?? null,
                'image_url' => $existing->profile_image_url ?? null,
                'role'      => 'Team Member',
            ]);

            try {
                Mail::to($email)->send(new TeamMemberAddedMail(
                    memberName: $existing->name,
                    eventTitle: $event->title,
                    eventDate:  $eventDate,
                    role:       'Team Member',
                ));
            } catch (\Throwable $e) {
                \Log::warning('TeamMemberAddedMail failed: ' . $e->getMessage());
            }
        } else {
            // New user — save with invite token
            $token = Str::random(48);
            $record = EventTeamMember::create([
                'event_id'     => $event->id,
                'user_id'      => null,
                'name'         => null,
                'email'        => $email,
                'role'         => 'Team Member',
                'invite_token' => $token,
            ]);

            $acceptUrl = rtrim(env('FRONTEND_URL', 'http://localhost:8080'), '/') . '/team-invite/accept?token=' . $token;

            try {
                Mail::to($email)->send(new TeamMemberInviteMail(
                    eventTitle: $event->title,
                    eventDate:  $eventDate,
                    role:       'Team Member',
                    acceptUrl:  $acceptUrl,
                ));
            } catch (\Throwable $e) {
                \Log::warning('TeamMemberInviteMail failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'id'           => $record->id,
            'user_id'      => $record->user_id,
            'name'         => $record->name,
            'email'        => $record->email,
            'phone'        => $record->phone,
            'imageUrl'     => $record->image_url,
            'role'         => $record->role,
            'invite_sent'  => !$existing,
        ], 201);
    }

    public function validateTeamInvite(Request $request)
    {
        $token  = $request->query('token');
        $record = EventTeamMember::where('invite_token', $token)->with('event')->first();

        if (!$record || !$record->event) {
            return response()->json(['valid' => false, 'message' => 'Invalid or expired invitation.'], 404);
        }

        return response()->json([
            'valid'      => true,
            'email'      => $record->email,
            'event'      => $record->event->title,
            'event_date' => $record->event->start_date
                ? \Carbon\Carbon::parse($record->event->start_date)->format('d M Y')
                : null,
            'role'       => $record->role,
        ]);
    }

    public function acceptTeamInvite(Request $request)
    {
        $request->validate([
            'token'    => 'required|string',
            'name'     => 'required|string|max:255',
            'gender'   => 'required|in:male,female,other',
            'phone'    => 'required|string|max:50',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = EventTeamMember::where('invite_token', $request->token)->with('event')->first();

        if (!$record) {
            return response()->json(['message' => 'Invalid or expired invitation.'], 404);
        }

        if (User::where('email', $record->email)->exists()) {
            return response()->json(['message' => 'An account with this email already exists. Please log in.'], 409);
        }

        $user = User::create([
            'name'              => $request->name,
            'email'             => $record->email,
            'gender'            => $request->gender,
            'phone'             => $request->phone,
            'password'          => Hash::make($request->password),
            'role'              => 'team',
            'email_verified_at' => now(),
        ]);

        // Link the team member record to the newly created user
        $record->update([
            'user_id'      => $user->id,
            'name'         => $user->name,
            'phone'        => $user->phone,
            'invite_token' => null,
        ]);

        return response()->json(['message' => 'Account created successfully. You can now log in.'], 201);
    }

    public function updateEventTeamMember(Request $request, Event $event, EventTeamMember $teamMember)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($teamMember->event_id !== $event->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'role'  => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:50',
        ]);

        $teamMember->update($request->only(['name', 'role', 'phone']));

        return response()->json([
            'id'       => $teamMember->id,
            'user_id'  => $teamMember->user_id,
            'name'     => $teamMember->name,
            'email'    => $teamMember->email,
            'phone'    => $teamMember->phone,
            'imageUrl' => $teamMember->image_url,
            'role'     => $teamMember->role,
        ]);
    }

    public function destroyEventTeamMember(Request $request, Event $event, EventTeamMember $teamMember)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($teamMember->event_id !== $event->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $teamMember->delete();
        return response()->json(null, 204);
    }

    public function storeSession(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'startTime'    => 'required|string',
            'endTime'      => 'required|string',
            'location'     => 'required|string|max:255',
            'capacity'     => 'nullable|integer|min:1',
            'speakerIds'   => 'nullable|array',
            'speakerIds.*' => 'integer',
        ]);

        $speakerIds = array_values(array_filter(
            $request->input('speakerIds', []),
            fn($id) => is_numeric($id)
        ));

        $session = EventSession::create([
            'event_id'    => $event->id,
            'title'       => $request->input('title'),
            'description' => $request->input('description'),
            'start_time'  => $request->input('startTime'),
            'end_time'    => $request->input('endTime'),
            'location'    => $request->input('location'),
            'capacity'    => $request->input('capacity'),
            'speaker_ids' => $speakerIds,
        ]);

        if (!empty($speakerIds)) {
            $session->speakers()->sync($speakerIds);
        }

        return response()->json([
            'id'          => (string) $session->id,
            'title'       => $session->title,
            'description' => $session->description,
            'startTime'   => $session->start_time,
            'endTime'     => $session->end_time,
            'speakerIds'  => array_map('strval', $session->speaker_ids ?? []),
            'location'    => $session->location,
            'capacity'    => $session->capacity,
        ], 201);
    }

    public function storeFloorPlan(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name'             => 'required|string|max:255',
            'floor_plan_image' => 'required|file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        $filename = time() . '_' . (string) Str::uuid() . '.webp';
        $imageContent = app(ImageService::class)->processCardImage($request->file('floor_plan_image'), 250);
        Storage::disk('r2')->put('event/floor_plan/' . $filename, $imageContent);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('r2');
        $imageUrl = $disk->url('event/floor_plan/' . $filename);

        $floorPlan = EventFloorPlan::create([
            'event_id'       => $event->id,
            'name'           => $request->input('name'),
            'floor_plan_url' => $imageUrl,
            'areas'          => [],
        ]);

        return response()->json([
            'id'       => $floorPlan->id,
            'name'     => $floorPlan->name,
            'imageUrl' => $floorPlan->floor_plan_url,
            'areas'    => [],
        ], 201);
    }

    public function uploadBanner(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'banner_image_file' => 'required|file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        $filename = time() . '_' . (string) Str::uuid() . '.webp';
        $imageContent = app(ImageService::class)->processCardImage($request->file('banner_image_file'), 200);
        Storage::disk('r2')->put('event/banner/' . $filename, $imageContent);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('r2');
        $event->update(['image_url' => $disk->url('event/banner/' . $filename)]);

        return response()->json(['image_url' => $event->image_url]);
    }

    public function destroy(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $eventId = $event->id;

        // Disable foreign key checks, delete, then re-enable
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            DB::table('event_team_members')->where('event_id', $eventId)->delete();
            DB::table('event_sessions')->where('event_id', $eventId)->delete();
            DB::table('event_speakers')->where('event_id', $eventId)->delete();
            DB::table('event_exhibitors')->where('event_id', $eventId)->delete();
            DB::table('event_sponsors')->where('event_id', $eventId)->delete();
            DB::table('event_ticket_categories')->where('event_id', $eventId)->delete();
            DB::table('event_floor_plans')->where('event_id', $eventId)->delete();
            DB::table('event_enrollments')->where('event_id', $eventId)->delete();
            DB::table('events')->where('id', $eventId)->delete();
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        Cache::tags(['events'])->flush();

        return response()->json(['message' => 'Event deleted successfully']);
    }

    public function cloneEvent(Request $request, Event $event)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin']) && $event->organizer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $event->load(['speakers', 'sessions', 'exhibitors', 'sponsors', 'teamMembers', 'ticketCategories', 'floorPlans']);

        $newEvent = $event->replicate([
            'uuid', 'slug', 'status', 'current_attendees', 'created_at', 'updated_at',
        ]);
        $newEvent->uuid               = (string) Str::uuid();
        $newEvent->title              = 'Copy of ' . $event->title;
        $newEvent->status             = 'draft';
        $newEvent->current_attendees  = 0;
        $newEvent->organizer_id       = $user->id;
        $newEvent->organizer_name     = $user->name;
        if (in_array($user->role, ['admin', 'super-admin'])) {
            $newEvent->corporate_id = $user->id;
        }
        $newEvent->save();

        // Clone ticket categories (reset sold_quantity)
        foreach ($event->ticketCategories as $tc) {
            $newEvent->ticketCategories()->create(array_merge(
                $tc->only(['name', 'description', 'price', 'max_quantity', 'type']),
                ['sold_quantity' => 0]
            ));
        }

        // Note: Speakers are NOT cloned - they are global entities that can be
        // linked to multiple events. This allows speakers to see all events they've spoken at.

        // Clone sessions (preserving original speaker references)
        foreach ($event->sessions as $se) {
            $newEvent->sessions()->create($se->only([
                'title', 'description', 'start_time', 'end_time', 'location', 'capacity', 'speaker_id', 'speaker_ids',
            ]));
        }

        // Clone exhibitors
        foreach ($event->exhibitors as $ex) {
            $newEvent->exhibitors()->create($ex->only([
                'company_name', 'description', 'logo_url', 'website_url', 'booth_number',
                'contact_name', 'contact_email', 'contact_phone',
            ]));
        }

        // Clone sponsors
        foreach ($event->sponsors as $sp) {
            $newEvent->sponsors()->create($sp->only([
                'name', 'description', 'logo_url', 'website_url', 'tier',
                'contact_name', 'contact_email',
            ]));
        }

        // Clone floor plans
        foreach ($event->floorPlans as $fp) {
            $newEvent->floorPlans()->create($fp->only([
                'name', 'image_url', 'description',
            ]));
        }

        return response()->json($newEvent->load([
            'organizer', 'corporate', 'speakers', 'sessions',
            'exhibitors', 'sponsors', 'teamMembers', 'ticketCategories', 'floorPlans',
        ]), 201);
    }

    public function enroll(Request $request, Event $event)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'user_name' => 'required|string',
            'user_email' => 'required|email',
            'ticket_category_id' => 'nullable|exists:event_ticket_categories,id',
        ]);

        if ($event->current_attendees >= $event->max_attendees) {
            return response()->json(['message' => 'Event is full'], 400);
        }

        $enrollment = EventEnrollment::create([
            'event_id' => $event->id,
            'user_id' => $validated['user_id'],
            'user_name' => $validated['user_name'],
            'user_email' => $validated['user_email'],
            'ticket_category_id' => $validated['ticket_category_id'] ?? null,
            'enrolled_at' => now(),
            'confirmation_number' => strtoupper(Str::random(8)),
            'qr_code' => "e:{$event->uuid}:u:{$validated['user_id']}:" . time(),
            'status' => 'enrolled',
        ]);

        $event->increment('current_attendees');

        // Notify corporate organizer of new ticket purchase
        $corporateUser = $event->corporate ?? ($event->corporate_id ? User::find($event->corporate_id) : null);
        if ($corporateUser) {
            try {
                Mail::to($corporateUser->email)->send(
                    new NewTicketPurchaseMail($event->fresh(), $enrollment->load('ticketCategory'))
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("NewTicketPurchaseMail failed for event {$event->id}: " . $e->getMessage());
            }
            try {
                app(PushNotificationService::class)->sendToUser(
                    $corporateUser,
                    "{$validated['user_name']} just registered for \"{$event->title}\". " .
                    "Total attendees: {$event->current_attendees}/{$event->max_attendees}.",
                    'events'
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Ticket purchase push failed for event {$event->id}: " . $e->getMessage());
            }
        }

        $payload = $enrollment->load(['user', 'event', 'ticketCategory'])->toArray();
        $enrolledUser = \App\Models\User::find($validated['user_id']);
        $external = \App\Support\ExternalRegistrationLink::build($event->fresh(), $enrolledUser);
        if ($external) {
            $payload['external_registration'] = $external;
        }
        return response()->json($payload, 201);
    }

    public function getEnrollments(Request $request, Event $event)
    {
        $user = $request->user();

        $isAdmin = in_array($user->role, ['admin', 'super-admin']);
        $isOwner = (int) $event->organizer_id === (int) $user->id;
        // corporate_id on the event == the corporate account ID that owns the event
        $isCorporateMember = $event->corporate_id &&
            (int) $user->id === (int) $event->corporate_id;
        $isTeamMember = $event->teamMembers()
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('email', $user->email);
            })->exists();

        if (!$isAdmin && !$isOwner && !$isCorporateMember && !$isTeamMember) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $enrollments = $event->enrollments()
            ->with(['user'])
            ->orderBy('enrolled_at', 'desc')
            ->get();

        return response()->json($enrollments);
    }

    public function checkIn(Request $request, Event $event)
    {
        $user = $request->user();

        $isAdmin = in_array($user->role, ['admin', 'super-admin']);
        $isOwner = (int) $event->organizer_id === (int) $user->id;
        $isCorporateMember = $event->corporate_id && (
            (int) $user->id === (int) $event->corporate_id ||
            (int) $user->corporate_id === (int) $event->corporate_id
        );
        $isTeamMember = $event->teamMembers()
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('email', $user->email);
            })->exists();

        if (!$isAdmin && !$isOwner && !$isCorporateMember && !$isTeamMember) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'enrollment_id' => 'required|exists:event_enrollments,id',
            'checked_in_by' => 'required|string',
            'ring_device_id' => 'nullable|string',
        ]);

        $enrollment = EventEnrollment::find($validated['enrollment_id']);

        if ($enrollment->event_id !== $event->id) {
            return response()->json(['message' => 'Enrollment does not belong to this event'], 400);
        }

        $enrollment->update([
            'checked_in' => true,
            'checked_in_at' => now(),
            'checked_in_by' => $validated['checked_in_by'],
            'status' => 'attended',
        ]);

        cache()->put("event:{$event->id}:last_checkin", [
            'name' => $enrollment->user_name,
            'method' => 'manual',
            'at' => now()->toIso8601String(),
        ], now()->addMinutes(10));

        $ringChime = null;

        if (!empty($validated['ring_device_id'])) {
            $ringChime = app(\App\Services\RingService::class)->triggerChime($validated['ring_device_id']);
        }

        return response()->json([
            ...$enrollment->load(['user', 'event'])->toArray(),
            'ring_chime' => $ringChime,
        ]);
    }

    /** Shared by checkInByQr/checkInByFace — staff allowed to check attendees in for this event. */
    private function isCheckInStaff(Event $event, $user): bool
    {
        $isAdmin = in_array($user->role, ['admin', 'super-admin']);
        $isOwner = (int) $event->organizer_id === (int) $user->id;
        $isCorporateMember = $event->corporate_id && (
            (int) $user->id === (int) $event->corporate_id ||
            (int) $user->corporate_id === (int) $event->corporate_id
        );
        $isTeamMember = $event->teamMembers()
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('email', $user->email);
            })->exists();

        return $isAdmin || $isOwner || $isCorporateMember || $isTeamMember;
    }

    /**
     * Shared tail for checkInByQr/checkInByFace once a not-yet-checked-in
     * enrollment has been resolved — marks it attended, records the
     * check-in method for the live counter feed, fires the Ring chime.
     */
    private function finalizeCheckIn(EventEnrollment $enrollment, string $checkedInBy, ?string $ringDeviceId, string $method)
    {
        $enrollment->update([
            'checked_in' => true,
            'checked_in_at' => now(),
            'checked_in_by' => $checkedInBy,
            'status' => 'attended',
        ]);

        cache()->put("event:{$enrollment->event_id}:last_checkin", [
            'name' => $enrollment->user_name,
            'method' => $method,
            'at' => now()->toIso8601String(),
        ], now()->addMinutes(10));

        $ringChime = null;

        if (!empty($ringDeviceId)) {
            $ringChime = app(\App\Services\RingService::class)->triggerChime($ringDeviceId);
        }

        return response()->json([
            ...$enrollment->load(['user', 'event'])->toArray(),
            'ring_chime' => $ringChime,
        ]);
    }

    /**
     * Check in by raw QR payload (kiosk scan) instead of a known enrollment_id.
     * QR payload format set at enrollment time: "e:{event uuid}:u:{user_id}:{timestamp}".
     */
    public function checkInByQr(Request $request, Event $event)
    {
        if (!$this->isCheckInStaff($event, $request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'qr_code' => 'required|string',
            'checked_in_by' => 'required|string',
            'ring_device_id' => 'nullable|string',
        ]);

        $enrollment = EventEnrollment::where('event_id', $event->id)
            ->where('qr_code', $validated['qr_code'])
            ->first();

        if (!$enrollment) {
            return response()->json(['message' => 'No matching enrollment for this QR code'], 404);
        }

        if ($enrollment->checked_in) {
            return response()->json([
                'message' => 'Already checked in',
                'enrollment' => $enrollment->load(['user', 'event']),
            ], 409);
        }

        return $this->finalizeCheckIn($enrollment, $validated['checked_in_by'], $validated['ring_device_id'] ?? null, 'qr');
    }

    /**
     * Check in by matching a live-captured frame against this event's
     * Rekognition Face Collection (staff-triggered — see
     * FaceCheckInScanner.tsx). Only attendees who opted in via faceOptIn()
     * below are indexed, so most frames simply won't match.
     */
    public function checkInByFace(Request $request, Event $event)
    {
        if (!$this->isCheckInStaff($event, $request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'image' => 'required|image|max:5120',
            'checked_in_by' => 'required|string',
            'ring_device_id' => 'nullable|string',
        ]);

        $imageBytes = file_get_contents($validated['image']->getRealPath());

        $enrollmentId = app(\App\Services\RingFaceService::class)->searchByImage($event->id, $imageBytes);

        if (!$enrollmentId) {
            return response()->json(['message' => 'No confident face match found'], 404);
        }

        $enrollment = EventEnrollment::where('event_id', $event->id)->find($enrollmentId);

        if (!$enrollment) {
            return response()->json(['message' => 'Matched enrollment no longer exists'], 404);
        }

        if ($enrollment->checked_in) {
            return response()->json([
                'message' => 'Already checked in',
                'enrollment' => $enrollment->load(['user', 'event']),
            ], 409);
        }

        return $this->finalizeCheckIn($enrollment, $validated['checked_in_by'], $validated['ring_device_id'] ?? null, 'face');
    }

    /**
     * Opt-in only: attendee uploads a photo at registration to enable
     * face-based check-in for this event specifically (not a global profile
     * field — see event_enrollments.face_checkin_opt_in). Indexed into a
     * per-event Rekognition Face Collection, purged wholesale when the
     * event ends (see PurgeEventFaceData console command).
     */
    public function faceOptIn(Request $request, Event $event, EventEnrollment $enrollment)
    {
        $user = $request->user();

        if ((int) $enrollment->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ((int) $enrollment->event_id !== (int) $event->id) {
            return response()->json(['message' => 'Enrollment does not belong to this event'], 400);
        }

        $validated = $request->validate([
            'photo' => 'required|image|max:5120',
        ]);

        $imageBytes = file_get_contents($validated['photo']->getRealPath());

        $indexed = app(\App\Services\RingFaceService::class)->indexFace($event->id, $enrollment->id, $imageBytes);

        if (!$indexed) {
            return response()->json(['message' => 'No usable face detected in photo'], 422);
        }

        $enrollment->update([
            'face_checkin_opt_in' => true,
            'face_indexed_at' => now(),
        ]);

        return response()->json(['message' => 'Face check-in enabled for this event']);
    }

    public function analytics(Request $request, Event $event)
    {
        $user = $request->user();

        $isAdmin = in_array($user->role, ['admin', 'super-admin']);
        $isOwner = (int) $event->organizer_id === (int) $user->id;
        $isCorporateMember = $event->corporate_id && (
            (int) $user->id === (int) $event->corporate_id ||
            (int) $user->corporate_id === (int) $event->corporate_id
        );
        $isTeamMember = $event->teamMembers()
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('email', $user->email);
            })->exists();

        if (!$isAdmin && !$isOwner && !$isCorporateMember && !$isTeamMember) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $analytics = [
            'basic_stats' => $event->checkInStats(),
            'registration_trend' => $event->enrollments()
                ->selectRaw('DATE(enrolled_at) as date, COUNT(*) as count')
                ->groupBy('date')
                ->orderBy('date', 'desc')
                ->limit(30)
                ->get(),
            'ticket_sales' => $event->ticketCategories()
                ->select('name', 'sold_quantity', 'max_quantity', 'price')
                ->get(),
            'revenue' => (function () use ($event) {
                $categoryIds = $event->ticketCategories()->pluck('id');
                $base = \App\Models\Payment::whereIn('item_id', $categoryIds)->where('type', 'event_ticket_category');
                return [
                    'total'    => (clone $base)->whereIn('status', ['paid', 'successful'])->sum('amount'),
                    'pending'  => (clone $base)->where('status', 'pending')->sum('amount'),
                    'refunded' => (clone $base)->where('status', 'refunded')->sum('amount'),
                ];
            })(),
            'demographics' => [
                'total_speakers' => $event->speakers()->count(),
                'total_sessions' => $event->sessions()->count(),
                'total_exhibitors' => $event->exhibitors()->count(),
                'team_members' => $event->teamMembers()->count(),
            ]
        ];

        return response()->json($analytics);
    }

    public function payments(Request $request, Event $event)
    {
        $user = $request->user();

        $isAdmin = in_array($user->role, ['admin', 'super-admin']);
        $isOwner = (int) $event->organizer_id === (int) $user->id;
        $isCorporateMember = $event->corporate_id && (
            (int) $user->id === (int) $event->corporate_id ||
            (int) $user->corporate_id === (int) $event->corporate_id
        );

        if (!$isAdmin && !$isOwner && !$isCorporateMember) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $categoryIds = $event->ticketCategories()->pluck('id');

        // Index payments by user_id for fast lookup
        $paymentsMap = \App\Models\Payment::whereIn('item_id', $categoryIds)
            ->where('type', 'event_ticket_category')
            ->with(['user'])
            ->get()
            ->keyBy('user_id');

        $enrollments = $event->enrollments()->with(['user'])->orderBy('enrolled_at', 'desc')->get();

        $result = $enrollments->map(function ($enrollment) use ($paymentsMap) {
            $payment = $paymentsMap->get($enrollment->user_id);
            return [
                'id'                 => $enrollment->id,
                'user_id'            => $enrollment->user_id,
                'user_name'          => $enrollment->user_name,
                'user_email'         => $enrollment->user_email,
                'enrolled_at'        => $enrollment->enrolled_at,
                'status'             => $enrollment->status,
                'confirmation_number'=> $enrollment->confirmation_number,
                'payment_reference'  => $payment?->payment_reference,
                'amount'             => $payment ? (float) $payment->amount : 0.0,
                'currency'           => $payment?->currency ?? 'USD',
                'payment_status'     => $payment?->status ?? 'free',
                'paid_at'            => $payment?->paid_at,
            ];
        });

        return response()->json($result);
    }

    public function myEnrollments()
    {
        $enrollments = EventEnrollment::where('user_id', Auth::id())
            ->with(['event.organizer', 'event.corporate', 'event.sponsors'])
            ->orderBy('enrolled_at', 'desc')
            ->get();

        return response()->json($enrollments);
    }

    public function getBySlug($slug)
    {
        $data = Cache::tags(['events'])->remember('slug:' . $slug . ':live', now()->addMinutes(5), function () use ($slug) {
            $event = Event::where('slug', $slug)
                ->where('status', 'live')
                ->with([
                    'organizer',
                    'corporate',
                    'speakers.user',
                    'sessions',
                    'exhibitors',
                    'sponsors',
                    'teamMembers',
                    'ticketCategories',
                    'floorPlans',
                    'enrollments.user',
                    'payments',
                    'reviews.user',
                ])->firstOrFail();
            return $this->formatEventResponse($event);
        });

        return response()->json($data);
    }

    // ── Reviews ──────────────────────────────────────────────────────────────

    public function getReviews(Event $event)
    {
        $reviews = $event->reviews()
            ->with('user:id,name,profile_image_url')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => [
                'id'         => $r->id,
                'user_id'    => $r->user_id,
                'name'       => $r->user->name ?? 'Anonymous',
                'avatar'     => $r->user->profile_image_url ?? null,
                'rating'     => $r->rating,
                'comment'    => $r->comment,
                'created_at' => $r->created_at,
            ]);

        return response()->json($reviews);
    }

    public function storeReview(Request $request, Event $event)
    {
        $user = $request->user();

        // Only enrolled or attended users may review
        $enrolled = $event->enrollments()
            ->where('user_id', $user->id)
            ->whereIn('status', ['enrolled', 'attended'])
            ->exists();

        if (!$enrolled) {
            return response()->json(['message' => 'You must be enrolled in this event to leave a review.'], 403);
        }

        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review = EventReview::updateOrCreate(
            ['event_id' => $event->id, 'user_id' => $user->id],
            $validated
        );

        return response()->json([
            'id'         => $review->id,
            'user_id'    => $user->id,
            'name'       => $user->name,
            'avatar'     => $user->profile_image_url ?? null,
            'rating'     => $review->rating,
            'comment'    => $review->comment,
            'created_at' => $review->created_at,
        ], 201);
    }

    public function teamDashboard(Request $request)
    {
        $user = $request->user();

        // Events where this user is a team member (matched by user_id or email)
        $eventIds = EventTeamMember::where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->pluck('event_id');

        $events = Event::whereIn('id', $eventIds)
            ->with(['ticketCategories'])
            ->orderBy('start_date', 'asc')
            ->get();

        $totalAttendees = 0;
        $totalCheckedIn = 0;

        $eventList = $events->map(function ($event) use (&$totalAttendees, &$totalCheckedIn) {
            $enrolled  = $event->enrollments()->count();
            $checkedIn = $event->enrollments()->where('checked_in', true)->count();

            $totalAttendees += $enrolled;
            $totalCheckedIn += $checkedIn;

            return [
                'id'               => $event->id,
                'uuid'             => $event->uuid,
                'slug'             => $event->slug,
                'title'            => $event->title,
                'description'      => $event->description,
                'start_date'       => $event->start_date?->toDateString(),
                'start_time'       => $event->start_time,
                'location'         => $event->location,
                'status'           => $event->status,
                'total_attendees'  => $enrolled,
                'checked_in'       => $checkedIn,
            ];
        });

        return response()->json([
            'events'          => $eventList,
            'total_events'    => $events->count(),
            'total_attendees' => $totalAttendees,
            'total_checked_in'=> $totalCheckedIn,
        ]);
    }
}
