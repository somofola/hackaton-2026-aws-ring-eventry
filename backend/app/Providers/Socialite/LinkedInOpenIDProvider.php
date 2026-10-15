<?php

namespace App\Providers\Socialite;

use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\ProviderInterface;
use Laravel\Socialite\Two\User;
use GuzzleHttp\RequestOptions;

class LinkedInOpenIDProvider extends AbstractProvider implements ProviderInterface
{
    protected $scopes = ['openid', 'profile', 'email'];
    protected $scopeSeparator = ' ';

    protected function getAuthUrl($state)
    {
        return $this->buildAuthUrlFromBase(
            'https://www.linkedin.com/oauth/v2/authorization',
            $state
        );
    }

    protected function getTokenUrl()
    {
        return 'https://www.linkedin.com/oauth/v2/accessToken';
    }

    protected function getUserByToken($token)
    {
        $response = $this->getHttpClient()->get('https://api.linkedin.com/v2/userinfo', [
            RequestOptions::HEADERS => [
                'Authorization' => 'Bearer '.$token,
            ],
        ]);

        return json_decode($response->getBody(), true);
    }

    protected function mapUserToObject(array $user)
    {
        return (new User)->setRaw($user)->map([
            'id'              => $user['sub'] ?? null,
            'nickname'        => null,
            'name'            => $user['name'] ?? trim(($user['given_name'] ?? '').' '.($user['family_name'] ?? '')),
            'first_name'      => $user['given_name'] ?? null,
            'last_name'       => $user['family_name'] ?? null,
            'email'           => $user['email']  ?? null,
            'avatar'          => $user['picture'] ?? null,
            'avatar_original' => $user['picture'] ?? null,
        ]);
        //'email'           => $user['email'] ?? ($user['sub'].'@linkedin.local'),
    }
}
