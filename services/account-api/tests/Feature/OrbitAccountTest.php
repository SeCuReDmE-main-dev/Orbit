<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrbitAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_read_or_write_workspaces(): void
    {
        $this->getJson('/api/v1/workspaces')->assertUnauthorized();
        $this->putJson('/api/v1/workspaces/'.Str::uuid(), [])->assertUnauthorized();
        $this->getJson('/api/v1/session')->assertOk()->assertJsonPath('user', null)->assertJsonPath('capabilities.email', false);
    }

    public function test_foreign_origin_is_rejected(): void
    {
        $this->withHeader('Origin', 'https://attacker.invalid')->getJson('/api/v1/session')->assertForbidden();
    }

    private function challenge(string $email, string $code = '123456', int $minutes = 10): void
    {
        config(['orbit.email_enabled' => true]);
        $this->withSession(['orbit.email_challenge' => 'fixture-browser-nonce']);
        DB::table('email_challenges')->insert([
            'email' => $email, 'code_hash' => hash_hmac('sha256', $code, config('app.key')),
            'session_hash' => hash('sha256', 'fixture-browser-nonce'), 'attempts' => 0,
            'expires_at' => now()->addMinutes($minutes),
        ]);
    }

    public function test_email_code_logs_in_once_and_logout_revokes_session(): void
    {
        $this->challenge('learner@example.org');
        $this->postJson('/api/v1/auth/email/verify', ['email' => 'learner@example.org', 'code' => '123456'])
            ->assertOk()->assertJsonPath('user.email', 'learner@example.org');
        $this->assertDatabaseCount('email_challenges', 0);
        $this->putJson('/api/v1/storage-consent', ['local' => true])->assertOk();
        $this->getJson('/api/v1/session')->assertJsonPath('storageConsent.local', true);
        $this->postJson('/api/v1/logout')->assertOk();
        $this->getJson('/api/v1/session')->assertJsonPath('user', null)->assertJsonPath('storageConsent.local', false);
        $this->postJson('/api/v1/auth/email/verify', ['email' => 'learner@example.org', 'code' => '123456'])->assertUnprocessable();
    }

    public function test_expired_and_repeated_guesses_are_rejected(): void
    {
        $this->challenge('expired@example.org', '123456', -1);
        $this->postJson('/api/v1/auth/email/verify', ['email' => 'expired@example.org', 'code' => '123456'])->assertUnprocessable();
        $this->challenge('guess@example.org');
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/email/verify', ['email' => 'guess@example.org', 'code' => '111111'])->assertUnprocessable();
        }
        $this->postJson('/api/v1/auth/email/verify', ['email' => 'guess@example.org', 'code' => '123456'])->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_email_does_not_implicitly_merge_an_oauth_account(): void
    {
        User::factory()->create(['email' => 'social@example.org', 'email_login_enabled' => false]);
        $this->challenge('social@example.org');
        $this->postJson('/api/v1/auth/email/verify', ['email' => 'social@example.org', 'code' => '123456'])
            ->assertUnprocessable()->assertJsonPath('error', 'USE_ORIGINAL_PROVIDER');
        $this->assertGuest();
    }

    public function test_unconfigured_providers_are_not_fake_logins(): void
    {
        config([
            'orbit.google.client_id' => null,
            'orbit.google.client_secret' => null,
            'orbit.github.client_id' => null,
            'orbit.github.client_secret' => null,
            'orbit.email_enabled' => false,
        ]);

        $this->get('/auth/google/redirect')->assertServiceUnavailable();
        $this->get('/auth/github/redirect')->assertServiceUnavailable();
        $this->postJson('/api/v1/auth/email/request', ['email' => 'nobody@example.org'])->assertServiceUnavailable();
        $this->assertDatabaseCount('users', 0);
    }
}
