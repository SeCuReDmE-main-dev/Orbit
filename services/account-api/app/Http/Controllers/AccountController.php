<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    public function session(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user ? ['id' => (string) $user->id, 'name' => $user->name, 'email' => $user->email] : null,
            'csrfToken' => csrf_token(),
            // This is an explicit decision for this device session, not consent on every device.
            'storageConsent' => ['local' => (bool) $request->session()->get('orbit.local_consent', false), 'decided' => $request->session()->has('orbit.local_consent')],
            'capabilities' => [
                'google' => filled(config('orbit.google.client_id')) && filled(config('orbit.google.client_secret')),
                'github' => filled(config('orbit.github.client_id')) && filled(config('orbit.github.client_secret')),
                'email' => $this->emailAvailable(),
            ],
        ]);
    }

    private function emailAvailable(): bool
    {
        // A log/array mail transport is never advertised as a deliverable login service.
        return config('orbit.email_enabled') && (app()->environment('testing') ||
            (config('mail.default') === 'smtp' && filled(config('mail.mailers.smtp.host'))));
    }

    public function requestCode(Request $request)
    {
        abort_unless($this->emailAvailable(), 503, 'EMAIL_NOT_CONFIGURED');
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:254']]);
        $email = Str::lower(trim($data['email']));
        $key = 'orbit-email:'.hash('sha256', $email);
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return response()->json(['error' => 'RATE_LIMITED'], 429)->header('Retry-After', RateLimiter::availableIn($key));
        }
        RateLimiter::hit($key, 600);
        $code = (string) random_int(100000, 999999);
        $nonce = Str::random(48);
        $request->session()->put('orbit.email_challenge', $nonce);
        $sessionHash = hash('sha256', $nonce);
        DB::table('email_challenges')->updateOrInsert(['email' => $email], [
            'code_hash' => hash_hmac('sha256', $code, config('app.key')),
            'session_hash' => $sessionHash, 'attempts' => 0,
            'expires_at' => now()->addMinutes(config('orbit.code_minutes')),
        ]);
        try {
            Mail::raw("Votre code Orbit : {$code}\nValable 10 minutes, une seule fois. Ne le partagez pas.\nSi vous ne l’avez pas demandé, ignorez ce message.",
                fn ($message) => $message->to($email)->subject('Votre code de connexion Orbit'));
        } catch (\Throwable $e) {
            DB::table('email_challenges')->where('email', $email)->where('session_hash', $sessionHash)->delete();

            // Do not log mail transport exceptions: they may contain credentials or message contents.
            return response()->json(['error' => 'EMAIL_DELIVERY_UNAVAILABLE'], 503);
        }

        return response()->json(['sent' => true]);
    }

    public function verifyCode(Request $request)
    {
        abort_unless($this->emailAvailable(), 503, 'EMAIL_NOT_CONFIGURED');
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:254'], 'code' => ['required', 'regex:/^[0-9]{6}$/']]);
        $email = Str::lower(trim($data['email']));
        $result = DB::transaction(function () use ($email, $data, $request) {
            $challenge = DB::table('email_challenges')->where('email', $email)->lockForUpdate()->first();
            if (! $challenge || Carbon::parse($challenge->expires_at)->isPast() || $challenge->attempts >= 5 ||
                ! hash_equals($challenge->session_hash, hash('sha256', (string) $request->session()->get('orbit.email_challenge', '')))) {
                return ['error' => 'INVALID_OR_EXPIRED_CODE'];
            }
            DB::table('email_challenges')->where('email', $email)->increment('attempts');
            if (! hash_equals($challenge->code_hash, hash_hmac('sha256', $data['code'], config('app.key')))) {
                return ['error' => 'INVALID_OR_EXPIRED_CODE'];
            }
            DB::table('email_challenges')->where('email', $email)->delete();
            $user = User::where('email', $email)->first();
            if ($user && ! $user->email_login_enabled) {
                return ['error' => 'USE_ORIGINAL_PROVIDER'];
            }
            if (! $user) {
                $user = new User;
                $user->name = Str::before($email, '@');
                $user->email = $email;
                $user->password = Str::random(64);
                $user->email_verified_at = now();
                $user->email_login_enabled = true;
                $user->save();
            }

            return ['user' => $user];
        });
        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 422);
        }
        Auth::login($result['user']);
        $request->session()->regenerate();
        $request->session()->forget('orbit.email_challenge');
        $request->session()->forget('orbit.local_consent');

        return $this->session($request);
    }

    public function consent(Request $request)
    {
        $data = $request->validate(['local' => ['required', 'boolean']]);
        $request->session()->put('orbit.local_consent', (bool) $data['local']);

        return response()->json(['local' => (bool) $data['local']]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['loggedOut' => true]);
    }
}
