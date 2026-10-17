<?php

namespace App\Http\Controllers;

use App\Mail\ContactFormMail;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    /**
     * Accept a contact-form submission from the public SEO site.
     *
     * SECURITY:
     *   - Strict validation (length caps to deter abuse).
     *   - Honeypot field `website` must be empty (silent reject).
     *   - Throttle applied at the route level.
     *   - Email queued; no PII echoed in the response.
     */
    public function store(Request $request)
    {
        // Honeypot — bots usually fill every visible-looking field.
        if (filled($request->input('website'))) {
            return response()->json(['success' => true], 202);
        }

        $validator = Validator::make($request->all(), [
            'name'    => 'required|string|max:120',
            'email'   => 'required|email|max:200',
            'subject' => 'nullable|string|max:200',
            'message' => 'required|string|min:10|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $data = $validator->validated();

        $contact = ContactMessage::create([
            'name'       => $data['name'],
            'email'      => $data['email'],
            'subject'    => $data['subject'] ?? null,
            'message'    => $data['message'],
            'ip'         => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        try {
            $to = config('app.support_email');
            Mail::to($to)->queue(new ContactFormMail($contact));
        } catch (\Throwable $e) {
            Log::error('Contact form mail failed', ['id' => $contact->id, 'err' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Thanks — your message has been received.',
        ], 201);
    }
}
