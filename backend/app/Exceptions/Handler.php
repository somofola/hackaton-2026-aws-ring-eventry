<?php

namespace App\Exceptions;

use Throwable;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class Handler extends ExceptionHandler
{
    /**
     * A list of exception types with their corresponding custom log levels.
     *
     * @var array<class-string<\Throwable>, \Psr\Log\LogLevel::*>
     */
    protected $levels = [
        //
    ];

    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<\Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    protected function unauthenticated($request, AuthenticationException $exception)
    {
        // Check if the request expects a JSON response (API requests)
        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'error' => 'You are not authenticated to access this resource.',
                'status' => 401
            ], 401);
        }

        // Default response for web requests (redirect to login page)
        return redirect()->guest(route('login'));
    }

    public function render($request, Throwable $e)
    {

        if ($request->is('api/*') || $request->expectsJson()) {
            // Return a JSON response for ModelNotFoundException (e.g., route-model binding fails)
            if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
                return response()->json([
                    'message' => 'Resource not found',
                    'status' => '404',
                ], 404);
            }
        }

        if ($e instanceof ThrottleRequestsException) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Too many requests. Please try again later.',
                    'status' => 429,
                    'retry_after' => $e->getHeaders()['Retry-After'] ?? null
                ], 429);
            }
        }

        // Customize response for authorization errors
        if ($e instanceof AuthorizationException) {
            return response()->json([
                'error' => 'You are not authorized to perform this action.'
            ], 403);
        }

        // Customize response for authentication errors
        if ($e instanceof AuthenticationException) {
            return response()->json([
                'error' => 'You are not authenticated to access this resource.'
            ], 401);
        }

        // Call the parent render method for default behavior
        return parent::render($request, $e);
    }
}
