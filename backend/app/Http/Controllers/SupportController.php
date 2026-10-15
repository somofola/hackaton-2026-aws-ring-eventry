<?php

namespace App\Http\Controllers;

use App\Mail\ChatHistoryMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SupportController extends Controller
{
    /**
     * Send chat history to the user's email address.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendChatHistory(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
            'chat_history' => 'required|string|max:50000',
            'timestamp' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        try {
            $email = $request->input('email');
            $chatHistory = $request->input('chat_history');
            $timestamp = $request->input('timestamp', now()->toIso8601String());

            Mail::to($email)->send(new ChatHistoryMail($chatHistory, $timestamp));

            Log::info('Chat history sent', ['email' => $email]);

            return response()->json([
                'success' => true,
                'message' => 'Chat history sent successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send chat history', [
                'email' => $request->input('email'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send email. Please try again later.',
            ], 500);
        }
    }
}
