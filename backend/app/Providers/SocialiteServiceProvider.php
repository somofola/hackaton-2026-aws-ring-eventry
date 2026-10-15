<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Facades\Socialite;
use App\Providers\Socialite\LinkedInOpenIDProvider;

class SocialiteServiceProvider extends ServiceProvider
{
    public function boot()
    {
        Socialite::extend('linkedin-openid', function ($app) {
            $config = $app['config']['services.linkedin'];

            return new LinkedInOpenIDProvider(
                $app['request'],
                $config['client_id'],
                $config['client_secret'],
                $config['redirect']
            );
        });
    }
}
