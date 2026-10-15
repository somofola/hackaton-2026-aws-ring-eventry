<?php

namespace App\Http\Controllers;

use Stripe\Stripe;
use App\Models\User;
use App\Models\Event;
use App\Models\Status;
use App\Models\Payment;
use Stripe\PaymentIntent;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Stripe\Checkout\Session;
use Illuminate\Validation\Rule;
use App\Models\Card;
use App\Models\Product;
use App\Services\PaystackService;
use Illuminate\Http\JsonResponse;
use App\Jobs\DelayedVerifyPayment;
use Illuminate\Support\Facades\DB;
use App\Models\EventTicketCategory;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use App\Mail\PaymentReceiptMail;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    protected $paystackService;

    public function __construct(PaystackService $paystackService)
    {
        $this->paystackService = $paystackService;
    }

    /**
     * Set a default charge of 300 NGN for each payment.
     *
     * @var int
     */
    public $charges = 300;


    /**
     * Verify payment after Paystack callback.
     */


    /**
     * Send ticket confirmation email.
     */
    private function sendTicketEmail($user, $ticketNumbers, $payment)
    {
        //$ticketNumbers = $tickets->pluck('ticket_number')->toArray();

        $emailData = [
            'user' => $user,
            //'tickets' => $tickets,
            'ticketNumbers' => $ticketNumbers,
            'payment' => $payment,
            /* 'carDetails' => [
                'title' => 'Chery Tiggo 8 Pro SUV',
                'description' => 'Experience the future of automotive excellence',
                'drawDate' => 'November 15, 2025'
            ] */
        ];

        Mail::send('emails.ticket-confirmation', $emailData, function ($message) use ($user) {
            $message->to($user->email, $user->name)
                ->subject('LBS Raffle Tickets - Car Giveaway');
        });
    }

    /////////////////////////////////RECHECK THESE/////////////////////////////////////

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return response()->json(Payment::with(['user'])->orderBy('created_at', 'desc')->get());
    }

    public function adminShow($id)
    {
        $payment = Payment::with(['user'])->find($id);
        if (!$payment) {
            return response()->json(['error' => 'Payment not found'], 404);
        }
        return response()->json($payment);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
        return response()->json(201);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Payment  $payment
     * @return \Illuminate\Http\Response
     */
    public function show(Request $request, $paymentID)
    {
        $user = $request->user();

        $payment = Payment::with(['user', 'order.programme'])->find($paymentID);
        if (!$payment) {
            return response()->json(['error' => 'Payment not found'], 404);
        }

        if (!$payment->order || !$payment->order->programme) {
            return response()->json(['error' => 'Payment or programme data is incomplete.'], 500);
        }

        $programme = $payment->order->programme;

        /*  // Get role IDs
         $adminRoleId = UserRole::where('name', 'admin')->value('id');
         $superAdminRoleId = UserRole::where('name', 'super-admin')->value('id');
  */
        // Access logic
        //$isOwner = $payment->user_id === $user->id;
        //$isSuperAdmin = $user->user_role_id === $superAdminRoleId;
        $isAssignedAdmin = is_array($programme->assigned_admin_id) && in_array($user->id, $programme->assigned_admin_id);
        //$isSameDepartmentAdmin = $user->user_role_id === $adminRoleId && $programme->department_id === $user->department_id;

        $payments = [];
        $isSuperAdmin = null;
        $isSameDepartmentAdmin = null;


        if ($isSuperAdmin) {
            $payments = Payment::with(['user', 'order.programme'])->get();
        } elseif ($isSameDepartmentAdmin) {
            $payments = Payment::with(['user', 'order.programme'])
                ->whereHas('order.programme', function ($query) use ($user) {
                    $query->where('department_id', $user->department_id);
                })
                ->get();
        } elseif ($isAssignedAdmin) {
            $payments = Payment::with(['user', 'order.programme'])
                ->whereHas('order.programme', function ($query) use ($user) {
                    $query->whereJsonContains('assigned_admin_id', $user->id);
                })
                ->get();
        } else {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($payments, 200);
    }

    public function getByUserId($userId)
    {
        $payments = Payment::where('user_id', $userId)->get();

        if ($payments->isEmpty()) {
            return response()->json(['message' => 'No orders found for this user.'], 404);
        }

        return response()->json($payments, 200);
    }

    public function getByDepartmentId(Request $request, $departmentId)
    {
        $user = $request->user();
        $roleName = optional($user->userRole)->name;

        if (!in_array($roleName, ['admin', 'accounts', 'super-admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $payments = Payment::whereHas('order.programme', function ($query) use ($departmentId) {
            $query->where('department_id', $departmentId);
        })->with(['order.programme', 'status'])->get();

        if ($payments->isEmpty()) {
            return response()->json(['message' => 'No payments found for this department.'], 404);
        }

        return response()->json($payments, 200);
    }

    /* public function getByAssignedAdminIdByProgramme(Request $request, $programmeId)
    {
        $user = $request->user();
        $roleName = optional($user->userRole)->name;

        if (!in_array($roleName, ['programme-manager', 'programme-coordinator'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $programme = Programme::where('id', $programmeId)
            ->whereJsonContains('assigned_admin_id', $user->id)
            ->first();

        if (!$programme) {
            return response()->json(['error' => 'You are not assigned to this programme.'], 403);
        }

        $payments = Payment::whereHas('order', function ($query) use ($programmeId) {
            $query->where('programme_id', $programmeId);
        })
            ->with(['order.programme', 'status'])
            ->get();

        if ($payments->isEmpty()) {
            return response()->json(['message' => 'No payments found for this programme.'], 404);
        }

        return response()->json($payments, 200);
    } */

    //getbyprogrammeid
    public function getByProgrammeId($programmeId)
    {
        $payments = Payment::whereHas('order.programme', function ($query) use ($programmeId) {
            $query->where('id', $programmeId);
        })->get();

        if ($payments->isEmpty()) {
            return response()->json(['message' => 'No payments found for this programme.'], 404);
        }

        return response()->json($payments, 200);
    }

    public function getByOrderId($orderId)
    {
        $payments = Payment::with(['order.programme', 'status'])
            ->where('order_id', $orderId)
            ->get();

        if ($payments->isEmpty()) {
            return response()->json(['message' => 'No payments found for this order.'], 404);
        }

        return response()->json($payments, 200);
    }

    public function getByUserAndProgramme($userId, $programmeId)
    {
        // Validate user ID
        $user = User::findOrFail($userId);

        $payments = Payment::with('order')
            ->where('user_id', $userId)
            ->get();

        // Filter payments where the related order's programme_id matches
        $filtered = $payments->filter(function ($payment) use ($programmeId) {
            return $payment->order && $payment->order->programme_id == $programmeId;
        })->values();

        if ($filtered->isEmpty()) {
            return response()->json(['message' => 'No payments found for this user and programme.'], 404);
        }

        return response()->json($filtered, 200);
    }

    public function getMyPayments(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        $payments = Payment::with(['order.product'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($payments);
    }

    public function getMyPaymentById(Request $request, $paymentId)
    {
        $user = $request->user(); // Authenticated user from token
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $payment = Payment::with(['order.programme', 'status'])
            ->where('user_id', $user->id)
            ->where('id', $paymentId)
            ->first();

        if (!$payment) {
            return response()->json(['message' => 'Payment not found.'], 404);
        }

        return response()->json($payment);
    }

    public function getMyPaymentsByOrderId(Request $request, $orderId)
    {
        $user = $request->user(); // Authenticated user from token
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        $payments = Payment::with(['order.programme', 'status'])
            ->where('user_id', $user->id)
            ->where('order_id', $orderId)
            ->get();
        if ($payments->isEmpty()) {
            return response()->json(['message' => 'No payments found for this order.'], 404);
        }
        return response()->json($payments);
    }

    /**
     * Get payments with the payment_gateway_response
     * of the payment reference.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  $reference
     * @return \Illuminate\Http\Response
     */
    public function getByReference($reference)
    {
        $payments = Payment::where('payment_gateway_response', $reference)
            ->with(['order.programme'])
            ->get();

        if ($payments->isEmpty()) {
            return response()->json(['message' => 'No payments found for this reference.'], 404);
        }

        $result = $payments->map(function ($payment) {
            return [
                'payment' => $payment,
            ];
        });

        return response()->json($result);
    }

    public function getMyPaymentbyReference($reference)
    {
        $user = Auth::user(); // Authenticated user from token
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $payment = Payment::with(['user'])
            ->where('user_id', $user->id)
            ->where('payment_reference', $reference)
            ->first();

        if (!$payment) {
            return response()->json(['message' => 'No payments found.'], 404);
        }
        return response()->json($payment);
    }

    public function initializePaystackModal(Request $request)
    {
        //Log::info('Initialize Paystack Modal called', ['request' => $request->all()]);
        $validated = $request->validate([
            'paymentType' => 'required|in:event_ticket_category',
            'itemId' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) {
                    if (!DB::table('event_ticket_categories')->where('id', $value)->exists()) {
                        $fail("The $attribute does not exist as a ticket category.");
                    }
                },
            ],
            'formData' => 'required|array',
            'formData.firstName' => 'required|string|max:255',
            'formData.lastName' => 'required|string|max:255',
            'formData.email' => 'required|email',
            'formData.phone' => 'sometimes|nullable|string|max:20',
            'formData.address' => 'sometimes|nullable|string|max:255',
            'formData.city' => 'sometimes|nullable|string|max:25',
            'formData.state' => 'sometimes|nullable|string|max:25',
            'formData.zipcode' => 'sometimes|nullable|string|max:15',
            'formData.country' => 'sometimes|nullable|string|max:50',
            'formData.company' => 'sometimes|nullable|string|max:100',
            'formData.dietaryRequirements' => 'sometimes|nullable|string|max:250',
            'formData.specialRequests' => 'sometimes|nullable|string|max:250',
            'currency' => 'required|string', // e.g. 'NGN', 'USD'
            'billingCycle' => 'sometimes|string|in:monthly,yearly,oneoff,lifetime',
        ]);

        //save subscriber to event participants or subcribed table

        //$amount = Event::find($request->event_id)->price * 1500 * 100 + 30000; // e.g. ₦5,000 in kobo. You may pull from event price instead.
        $currency = strtoupper($validated['currency']);
        $billingCycle = strtolower($validated['billingCycle'] ?? 'oneoff');// 'monthly' | 'yearly'

        $receiptCode = 'EVENT_';
        $ticketCategory = \App\Models\EventTicketCategory::findOrFail($validated['itemId']);
        $amount = $ticketCategory->price;

        if (!is_numeric($amount)) {
            return response()->json([
                'message' => 'Price not available for the selected currency/billing cycle'
            ], 422);
        }

        $reference = $receiptCode . Str::upper(Str::random(10));
        //check that $reference is unique
        while (Payment::where('payment_reference', $reference)->exists()) {
            $reference = $receiptCode . Str::upper(Str::random(10));
        }

        // Optional: Save initial payment record before redirecting to Paystack
        $payment = Payment::create([
            'user_id' => Auth::id(),
            'type' => $validated['paymentType'],
            'item_id' => $validated['itemId'],
            'amount' => $amount,
            'currency' => $currency,
            'billing_cycle' => $billingCycle,
            'payment_reference' => $reference,
            'payment_gateway_response' => null,
            'status' => $amount == 0 ? 'paid' : 'pending',
        ]);

        // Free event ticket: create enrollment + send confirmation email
        $freeEvent = null;
        $freeUser  = null;
        if ($amount == 0 && $validated['paymentType'] === 'event_ticket_category') {
            $freeUser  = Auth::user();
            $freeEvent = $this->createEventEnrollment($payment, $freeUser);
            try {
                Mail::to($freeUser->email)->send(new PaymentReceiptMail($payment, $freeUser));
            } catch (\Exception $e) {
                Log::error('Failed to send free enrollment email', ['error' => $e->getMessage()]);
            }
        }

        return response()->json($this->withExternalRegistration([
            'email' => $validated['formData']['email'],
            'amount' => $amount,
            'reference' => $reference,
        ], $freeEvent, $freeUser), 200);
    }

    public function initializeStripeModal(Request $request)
    {
        $validated = $request->validate([
            'paymentType' => 'required|string',
            'itemId' => 'required|integer',
            'currency' => 'required|string',
            'billingCycle' => 'sometimes|string|in:monthly,yearly,oneoff,lifetime',
            'formData' => 'nullable|array',
        ]);

        Stripe::setApiKey(config('services.stripe.secret'));

        $currency     = strtolower($validated['currency']);
        $billingCycle = strtolower($validated['billingCycle'] ?? 'oneoff');

        $receiptCode    = 'EVENT_';
        $ticketCategory = \App\Models\EventTicketCategory::with('event')->findOrFail($validated['itemId']);
        $amount         = $ticketCategory->price;
        $description    = $ticketCategory->name . ' — ' . ($ticketCategory->event->title ?? 'Event');

        if (!is_numeric($amount)) {
            return response()->json(['error' => 'Price not available for the selected currency/billing cycle'], 422);
        }

        $reference = $receiptCode . Str::upper(Str::random(10));
        while (Payment::where('payment_reference', $reference)->exists()) {
            $reference = $receiptCode . Str::upper(Str::random(10));
        }

        $amountInCents = (int) round($amount * 100);

        $paymentIntent = PaymentIntent::create([
            'amount'               => $amountInCents,
            'currency'             => $currency,
            'payment_method_types' => ['card'],
            'description'          => $description,
            'receipt_email'        => $validated['formData']['email'] ?? null,
            'metadata'             => [
                'item_id'      => $validated['itemId'],
                'billing_cycle'=> $billingCycle,
                'receipt_code' => $reference,
            ],
        ]);

        // Optional: Save initial payment record before redirecting to Paystack
        $payment = Payment::create([
            'user_id' => Auth::id(),
            'type' => $validated['paymentType'],
            'item_id' => $validated['itemId'],
            'amount' => $amount,
            'currency' => $currency, // Assuming NGN for Nigerian Naira
            'billing_cycle' => $billingCycle,
            'payment_reference' => $reference,
            'payment_gateway_response' => null,
            'status' => $amount == 0 ? 'paid' : 'pending', // 👈 auto set if free
        ]);

        return response()->json([
            'clientSecret' => $paymentIntent->client_secret,
        ]);
    }

    public function recheckPending(Request $apiPayload)
    {
        // Get the reference from the webhook JSON payload
        $payload = $apiPayload->all();

        $reference = $payload['data']['reference'] ?? null;

        if (empty($reference)) {
            return response()->json(['error' => 'Missing reference in webhook payload.'], 422);
        }

        if (!str_contains($reference, 'PYMT') || !str_contains($reference, 'LBS-PYMT')) {
            return response()->json([
                'error' => 'Invalid reference format in webhook payload.',
                'reference' => $reference
            ], 422);
        }

        // Create a new Request instance to pass to verifyPayment
        /*$recheckRequest = new Request([
            'reference' => $reference,
            'type' => 'recheckViaHook'
        ]);
        return $this->verifyPayment($recheckRequest);*/

        // Delay job by 1 minute
        DelayedVerifyPayment::dispatch($reference)->delay(now()->addMinute(5)); //type added in dispatch method

        // Log to custom channel
        Log::channel('webhook_verifications')->info('Scheduled payment verification from webhook.', [
            'reference' => $reference,
            'payload' => $payload
        ]);

        return response()->json(['message' => 'Verification scheduled.'], 202);
    }

    public function verifyPaystackPayment(Request $request)
    {
        $reference = $request->reference;

        //return response()->json($request, 200);

        if (!$reference) {
            return response()->json(['error' => 'Payment reference is required.'], 422);
        }

        $user = Auth::user();
        if ($user) {
            $payment = Payment::where('payment_reference', $reference)
                ->where('user_id', $user->id)
                ->first();
        }

        // Handle webhook: recheckViaHook
        if (!isset($payment) && isset($request->type) && $request->type === 'recheckViaHook') {
            // Retrieve payment without user scope
            $payment = Payment::where('payment_reference', $reference)->first();

            // If payment found, simulate authenticated user from it
            if ($payment) {
                $user = User::find($payment->user_id);
            }
        }

        if (!$payment) {
            return response()->json(['error' => 'Invalid payment reference.'], 404);
        }

        //check if the payment is already verified
        if ($payment->status === 'paid') {
            return response()->json(['message' => 'Payment already verified.'], 200);
        }


        // Verify the payment with Paystack
        $paystack = new PaystackService();
        $response = $paystack->verifyTransaction($reference);

        if ($response['data']['status'] === 'success') {
            $amountPaid = $response['data']['amount'] / 100; // convert from kobo

            if ((int) $payment->amount !== $amountPaid) {
                return response()->json(['error' => 'Invalid Payment amount .'], 422);
            }

            $payment->payment_gateway_response = $response;
            $payment->status = 'paid';
            $payment->paid_at = now();
            $payment->save();

            /** Create enrollment for event tickets */
            if ($payment->type === 'event_ticket_category') {
                $event = $this->createEventEnrollment($payment, $user);
                try {
                    Mail::to($user->email)->send(new PaymentReceiptMail($payment, $user));
                } catch (\Exception $e) {
                    Log::error('Failed to send event receipt email', ['error' => $e->getMessage()]);
                }
                return response()->json($this->withExternalRegistration([
                    'status'  => 'success',
                    'message' => 'Payment verified.',
                ], $event, $user), 200);
            }

            return response()->json(['status' => 'success', 'message' => 'Payment verified.'], 200);
        }
        return response()->json(['error' => 'Payment verification failed.'], 422);
    }

    public function verifyStripePayment(Request $request)
    {
        $reference = $request->input('piId');

        //return response()->json($request, 200);

        if (!$reference) {
            return response()->json(['error' => 'Payment reference is required.'], 422);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $pi = PaymentIntent::retrieve($reference);

        if ($pi['status'] !== 'succeeded') {
            return response()->json(['status' => 'failed', 'message' => 'Payment unsuccessful.'], 201);
        }
        //check if succeded

        $user = Auth::user();
        if ($user) {
            $payment = Payment::where('payment_reference', $pi['metadata']['receipt_code'])
                ->where('user_id', $user->id)
                ->first();
        }

        // Handle webhook: recheckViaHook
        if (!isset($payment) && isset($request->type) && $request->type === 'recheckViaHook') {
            // Retrieve payment without user scope
            $payment = Payment::where('payment_reference', $reference)->first();

            // If payment found, simulate authenticated user from it
            if ($payment) {
                $user = User::find($payment->user_id);
            }
        }

        if (!$payment) {
            return response()->json(['error' => 'Invalid payment reference.'], 404);
        }

        //check if the payment is already verified
        if ($payment->status === 'paid') {
            return response()->json(['message' => 'Payment already verified.'], 200);
        } else if ($payment->status === 'pending') {
            //update payment
            $payment->payment_gateway_response = $pi->toJSON();
            $payment->status = 'paid';
            $payment->paid_at = now();
            $payment->save();

            /** Create enrollment for event tickets */
            if ($payment->type === 'event_ticket_category') {
                $event = $this->createEventEnrollment($payment, $user);
                try {
                    Mail::to($user->email)->send(new PaymentReceiptMail($payment, $user));
                } catch (\Exception $e) {
                    Log::error('Failed to send event receipt email', ['error' => $e->getMessage()]);
                }
                return response()->json($this->withExternalRegistration([
                    'message'      => 'Payment verified.',
                    'receipt_code' => $pi['metadata']['receipt_code'],
                ], $event, $user), 200);
            }

            $receipt_code = $pi['metadata']['receipt_code'];
            return response()->json(['message' => 'Payment verified.', 'receipt_code' => $receipt_code], 200);
        } else {
            return response()->json(['error' => 'Payment verification failed.'], 422);
        }
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\Payment  $payment
     * @return \Illuminate\Http\Response
     */
    public function edit(Payment $payment)
    {
        //
        return response()->json(201);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Payment  $payment
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Payment $payment)
    {
        //
        return response()->json(201);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Payment  $payment
     * @return \Illuminate\Http\Response
     */
    public function destroy(Payment $payment)
    {
        //
        return response()->json(201);
    }

    private function decrementMaxParticipants($eventId)
    {
        $event = Event::find($eventId);
        if ($event && $event->max_participants > 0) {
            $event->decrement('max_participants');
            $event->refresh();
            return true;
        }
        return false;
    }

    //////////////////////////////////////////////
    /* public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'programme' => 'required|string|max:255',
            'noOfTickets' => 'required|integer|min:1|max:1000',
            'ticket_numbers' => 'required|array|min:1',
            'ticket_numbers.*' => 'integer|min:1|max:' . env('MAX_TICKETS', 1000),
            'paymentType' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check if tickets are still available
            $soldTickets = Ticket::whereIn('ticket_number', $request->ticket_numbers)
                ->where('status', 'sold')
                ->pluck('ticket_number')
                ->toArray();

            if (!empty($soldTickets)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some tickets are no longer available',
                    'sold_tickets' => $soldTickets
                ], 400);
            }

            // Create or fetch user
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                // Create new user
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'programme' => $request->programme, // Ensure programme is included
                    'password' => bcrypt(Str::random(16)), // Generate a random password
                ]);
            }

            // Generate unique reference
            $reference = 'LBS_RAFFLE_2025_' . time() . '_' . $user->id . '_' . rand(1000, 9999);

            // Calculate amount based on number of tickets
            $ticketPrice = env('TICKET_PRICE', 50000); // Default ₦50,000
            $amount = $request->noOfTickets * $ticketPrice + env('BANK_CHARGES', 300); // Add bank charges

            /* // Initialize payment with Paystack
            $paystackResponse = $this->paystackService->initializeTransaction(
                $user->email,
                $amount * 100, // Convert to kobo
                $reference,
                'NGN'
            ); 

            if (!$paystackResponse['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to initialize payment',
                    'error' => $paystackResponse['message']
                ], 400);
            } //

            // Create pending payment record
            $payment = Payment::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'reference' => $reference,
                'paystack_reference' => $paystackResponse['data']['reference'] ?? $reference,
                'status' => 'pending',
                'ticket_numbers' => $request->ticket_numbers,
            ]);

            $payment_id = $payment->id;

            //insert tickets into the database
            foreach ($request->ticket_numbers as $ticketNumber) {
                Ticket::create([
                    'user_id' => $user->id,
                    'payment_id' => $payment_id,
                    'ticket_number' => $ticketNumber,
                    'status' => 'pending', // Initially set to pending
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment initialized successfully',
                'data' => [
                    'email' => $user->email,
                    'amount' => $amount,
                    'reference' => $reference,
                    'authorization_url' => $paystackResponse['data']['authorization_url'] ?? null
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to initialize payment',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(), // add trace
            ], 500);
        }
    }

    public function verify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reference' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Find payment record
            $payment = Payment::where('reference', $request->reference)->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found'
                ], 404);
            }

            // Verify payment with Paystack
            $paymentVerification = $this->paystackService->verifyTransaction($payment->paystack_reference);

            if (!$paymentVerification['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed',
                    'error' => $paymentVerification['message']
                ], 400);
            }

            // Update payment status
            $payment->update([
                'status' => 'successful',
                'paystack_reference' => $paymentVerification['data'] ?? $payment->paystack_reference
            ]);

            // update ticket records
            /*  foreach ($payment->ticket_numbers as $ticketNumber) {
                 //update ticket status to sold
                 $ticket = Ticket::where('ticket_number', $ticketNumber)
                     ->where('status', 'pending')
                     ->first();
                 if ($ticket) {
                     $ticket->update(['status' => 'sold']); 
                 }
             }//

            Ticket::whereIn('ticket_number', $payment->ticket_numbers)
                ->where('status', 'pending')
                ->where('payment_id', $payment->id)
                ->update(['status' => 'sold']);

            // Get user details
            $user = User::find($payment->user_id);

            // Send confirmation email
            $this->sendTicketEmail($user, $payment->ticket_numbers, $payment);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment verified successfully',
                'data' => [
                    'status' => 'success',
                    'payment' => $payment,
                    'tickets' => $payment->ticket_numbers,
                    'user' => $user
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
 */

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /**
     * Create an EventEnrollment after a successful event ticket payment.
     * Idempotent: skips silently if the user is already enrolled.
     */
    public function createEventEnrollment(\App\Models\Payment $payment, $user): ?\App\Models\Event
    {
        if ($payment->type !== 'event_ticket_category' || !$user) return null;

        $ticketCategory = \App\Models\EventTicketCategory::with('event')->find($payment->item_id);
        if (!$ticketCategory) return null;

        $event = $ticketCategory->event;
        if (!$event) return null;

        $alreadyEnrolled = \App\Models\EventEnrollment::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->exists();
        if ($alreadyEnrolled) return $event;

        if ($event->max_attendees > 0 && $event->current_attendees >= $event->max_attendees) return $event;

        \App\Models\EventEnrollment::create([
            'event_id'            => $event->id,
            'user_id'             => $user->id,
            'user_name'           => $user->name,
            'user_email'          => $user->email,
            'ticket_category_id'  => $ticketCategory->id,
            'enrolled_at'         => now(),
            'confirmation_number' => strtoupper(\Illuminate\Support\Str::random(8)),
            'qr_code'             => "e:{$event->uuid}:u:{$user->id}:" . time(),
            'status'              => 'enrolled',
        ]);

        $event->increment('current_attendees');

        if (isset($ticketCategory->sold_quantity)) {
            $ticketCategory->increment('sold_quantity');
        }

        return $event;
    }

    /**
     * Merge an external_registration handoff payload into a payment response
     * when the event the user just enrolled in is a scraped 3rd-party event.
     */
    public function withExternalRegistration(array $payload, ?\App\Models\Event $event, ?\App\Models\User $user): array
    {
        if (!$event) return $payload;
        $ext = \App\Support\ExternalRegistrationLink::build($event, $user);
        if ($ext) $payload['external_registration'] = $ext;
        return $payload;
    }
}
