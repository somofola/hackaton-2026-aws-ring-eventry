<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RingOAuthController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
/* 
Route::get('/', function () {
    return ['Laravel' => app()->version()];
}); */


Route::get('/', function () {
    return view('welcome');
});

Route::get('/hello', function () {
    return response('<h1>Hello world</h1>', 200)
    ->header('Content-Type', 'text/html')
    ->header('foo','bar');
});

/* Route::fallback(function() {
    return response()->json(['Status' => '200 Ok']);
}); */

// Redirect to Laravel 404 error page
Route::get('/error-404', function () {
    abort(404);
});

// Ring One-Way Account Linking (Ring-driven — see RingOAuthController).
// "connect" path name is legacy from an earlier wrong-flow build; kept as-is
// because it's already registered as the Account Link URL in Ring's console.
//
// The {ownerId?} variants are for a corporate user who registered their own
// Ring Developer app (RingOwnerCredential) — they register THESE URLs
// (with their own user id) as the Token Exchange / Account Link URLs in
// their own Ring console, instead of the bare shared ones below.
Route::prefix('api/ring')->group(function () {
    Route::get('/connect/{ownerId?}', [RingOAuthController::class, 'linkPage'])->whereNumber('ownerId');
    Route::post('/link/confirm/{ownerId?}', [RingOAuthController::class, 'confirm'])->whereNumber('ownerId');
    Route::post('/token-exchange/{ownerId?}', [RingOAuthController::class, 'tokenExchange'])->whereNumber('ownerId');
});

Route::fallback(function() {
    //return view('welcome');
    abort(404);
});


require __DIR__.'/auth.php';
