<?php

namespace App\Providers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/dashboard';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     *
     * @return void
     */

    protected function configureRateLimiting()
    {
        RateLimiter::for('custom-throttle', function (Request $request) {
            return Limit::perMinutes(
                env('THROTTLE_DECAY_MINUTES', 1),
                env('THROTTLE_MAX_REQUESTS', 60)
            )->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(env('THROTTLE_MAX_REQUESTS', 60))->by($request->user()?->id ?: $request->ip())->response(function (Request $request, array $headers) {
                return response()->json([
                    'message' => 'Too many requests. Please slow down.',
                    'message2' => 'Too many requests. Please try again later.',
                    'status' => 429,
                ], Response::HTTP_TOO_MANY_REQUESTS, $headers);
            });
        });
    }
}
