<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialController extends Controller
{
    private function provider(string $provider)
    {
        abort_unless(in_array($provider, ['google', 'github'], true), 404);
        abort_unless(filled(config("orbit.$provider.client_id")) && filled(config("orbit.$provider.client_secret")), 503, 'PROVIDER_NOT_CONFIGURED');
        config(["services.$provider" => config("orbit.$provider")]);

        return Socialite::driver($provider);
    }

    public function redirect(string $provider)
    {
        return $this->provider($provider)->redirect();
    }

    public function callback(Request $request, string $provider)
    {
        try {
            // Socialite validates the session-bound OAuth state. Never use stateless().
            $remote = $this->provider($provider)->user();
            $subject = (string) $remote->getId();
            $email = Str::lower((string) $remote->getEmail());
            if (! $subject || strlen($subject) > 191 || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return redirect('/?auth=provider-email-unavailable');
            }
            $user = DB::transaction(function () use ($provider, $subject, $email, $remote) {
                $identity = DB::table('social_identities')->where('provider', $provider)->where('subject', $subject)->first();
                if ($identity) {
                    return User::findOrFail($identity->user_id);
                }
                // Matching email alone never merges identities or grants an existing account.
                if (User::where('email', $email)->exists()) {
                    return null;
                }
                $user = new User;
                $user->name = Str::limit($remote->getName() ?: $remote->getNickname() ?: 'Orbit explorer', 200, '');
                $user->email = $email;
                $user->password = Str::random(64);
                $user->save();
                DB::table('social_identities')->insert(['user_id' => $user->id, 'provider' => $provider, 'subject' => $subject, 'created_at' => now(), 'updated_at' => now()]);

                return $user;
            });
            if (! $user) {
                return redirect('/?auth=use-original-provider');
            }
            Auth::login($user);
            $request->session()->regenerate();
            $request->session()->forget('orbit.local_consent');

            return redirect('/app/');
        } catch (\Throwable $e) {
            return redirect('/?auth=provider-declined');
        }
    }
}
