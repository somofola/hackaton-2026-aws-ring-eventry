<?php

namespace App\Http\Controllers;

use App\Models\NotificationType;
use App\Models\NotificationSubscription;
use App\Models\AppNotification;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class NotificationController extends Controller
{
    /** GET /notification-types — all active types */
    public function getTypes()
    {
        $types = NotificationType::where('is_active', true)->orderBy('id')->get();
        return response()->json($types);
    }

    /** GET /notification-subscriptions — current user's preferences */
    public function getSubscriptions(Request $request)
    {
        $subscriptions = NotificationSubscription::where('user_id', Auth::id())
            ->get(['notification_type_id', 'channel', 'enabled']);

        return response()->json($subscriptions);
    }

    /** PUT /notification-subscriptions — save user's preferences */
    public function updateSubscriptions(Request $request)
    {
        $validated = $request->validate([
            'subscriptions'                          => 'required|array',
            'subscriptions.*.notification_type_id'  => 'required|exists:notification_types,id',
            'subscriptions.*.channel'               => 'required|in:app,web',
            'subscriptions.*.enabled'               => 'required|boolean',
        ]);

        foreach ($validated['subscriptions'] as $sub) {
            NotificationSubscription::updateOrCreate(
                [
                    'user_id'              => Auth::id(),
                    'notification_type_id' => $sub['notification_type_id'],
                    'channel'              => $sub['channel'],
                ],
                ['enabled' => $sub['enabled']]
            );
        }

        return response()->json(['message' => 'Notification preferences saved.']);
    }

    /** GET /notifications — current user's notifications (paginated, filterable) */
    public function getUserNotifications(Request $request)
    {
        $query = AppNotification::where('user_id', Auth::id())
            ->with('notificationType:id,name,label')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'unread') {
                $query->whereIn('status', ['pending', 'sent']);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('search')) {
            $query->where('message', 'like', '%' . $request->search . '%');
        }

        $notifications = $query->paginate($request->per_page ?? 20);

        $unreadCount = AppNotification::where('user_id', Auth::id())
            ->whereIn('status', ['pending', 'sent'])
            ->count();

        return response()->json(array_merge($notifications->toArray(), ['unread_count' => $unreadCount]));
    }

    /** GET /notifications/unread-count */
    public function unreadCount()
    {
        $key = 'notifications:unread:' . Auth::id();

        $count = Cache::remember($key, now()->addMinute(), function () {
            return AppNotification::where('user_id', Auth::id())
                ->whereIn('status', ['pending', 'sent'])
                ->count();
        });

        return response()->json(['count' => $count]);
    }

    /** PATCH /notifications/{id}/read — mark a notification as read */
    public function markRead($id)
    {
        $notification = AppNotification::where('user_id', Auth::id())->findOrFail($id);
        $notification->update(['status' => 'read', 'read_at' => now()]);

        Cache::forget('notifications:unread:' . Auth::id());

        return response()->json(['message' => 'Marked as read.']);
    }

    /** PATCH /notifications/read-all — mark all as read */
    public function markAllRead()
    {
        AppNotification::where('user_id', Auth::id())
            ->where('status', '!=', 'read')
            ->update(['status' => 'read', 'read_at' => now()]);

        Cache::forget('notifications:unread:' . Auth::id());

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    /**
     * POST /admin/notifications/broadcast — admin-only instant broadcast
     * Instant delivery for: alerts, marketing, informational
     */
    public function broadcast(Request $request, PushNotificationService $push)
    {
        $validated = $request->validate([
            'message'   => 'required|string|max:500',
            'type_name' => 'required|exists:notification_types,name',
            'all_users' => 'boolean', // if true, bypass subscription preferences
        ]);

        if ($validated['all_users'] ?? false) {
            $push->broadcastToAll($validated['message'], $validated['type_name']);
        } else {
            $push->broadcastInstant($validated['message'], $validated['type_name']);
        }

        return response()->json(['message' => 'Broadcast sent.']);
    }
}
