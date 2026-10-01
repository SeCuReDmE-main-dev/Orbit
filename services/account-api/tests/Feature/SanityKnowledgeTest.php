<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class SanityKnowledgeTest extends TestCase
{
    private function configureContext(): string
    {
        config(['orbit.context.endpoint' => 'orbit-research', 'orbit.context.token' => 'fixture-viewer-not-a-real-token']);
        Cache::flush();
        Http::preventStrayRequests();

        return 'https://api.sanity.io/v1/context/organizations/oatv1mmu8/mcp/orbit-research?*';
    }

    private function mcpResult(string $text = 'Knowledge base id: kb5CHIYGXCMJ. research/evidence'): array
    {
        return ['jsonrpc' => '2.0', 'id' => 1, 'result' => ['content' => [['type' => 'text', 'text' => $text]]]];
    }

    public function test_outline_is_bounded_cached_and_never_exposes_credentials(): void
    {
        $url = $this->configureContext();
        Http::fake([$url => Http::response($this->mcpResult())]);
        $response = $this->getJson('/api/v1/knowledge/outline')->assertOk()
            ->assertJsonPath('source', 'sanity-context-mcp')->assertJsonPath('knowledgeBase', 'kb5CHIYGXCMJ');
        $this->assertStringNotContainsString('fixture-viewer', $response->getContent());
        $this->getJson('/api/v1/knowledge/outline')->assertOk();
        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request) => $request['params']['name'] === 'initial_context'
            && str_contains($request->url(), 'knowledgeBases=kb5CHIYGXCMJ')
            && $request->hasHeader('Authorization', 'Bearer fixture-viewer-not-a-real-token'));
    }

    public function test_selected_entries_preserve_citations_from_json_and_sse(): void
    {
        $url = $this->configureContext();
        $text = '[Primary source](https://www.sanity.io/docs). Reported, not independently verified.';
        Http::fake([$url => Http::response('event: message'."\n".'data: '.json_encode($this->mcpResult($text))."\n\n", 200, ['Content-Type' => 'text/event-stream'])]);
        $this->getJson('/api/v1/knowledge/entries?'.http_build_query(['paths' => '["research/evidence"]']))
            ->assertOk()->assertJsonPath('content.0.text', $text);
        Http::assertSent(fn (Request $request) => $request['params']['name'] === 'knowledge_base_read'
            && $request['params']['arguments'] === ['knowledgeBase' => 'kb5CHIYGXCMJ', 'paths' => ['research/evidence']]);
    }

    public function test_foreign_origins_extra_parameters_and_bad_paths_never_reach_sanity(): void
    {
        $this->configureContext();
        $this->withHeader('Origin', 'https://foreign.invalid')->getJson('/api/v1/knowledge/outline')->assertForbidden();
        $this->flushHeaders();
        $this->getJson('/api/v1/knowledge/outline?token=stolen')->assertUnprocessable();
        foreach (['[]', '["../private"]', '["https://foreign.invalid"]', '["a","a"]', '["a","b","c","d","e","f"]', '{"path":"a"}'] as $paths) {
            $this->getJson('/api/v1/knowledge/entries?'.http_build_query(['paths' => $paths]))->assertUnprocessable();
        }
        Http::assertNothingSent();
    }

    public function test_missing_config_and_upstream_errors_do_not_claim_success_or_leak_details(): void
    {
        $url = $this->configureContext();
        config(['orbit.context.token' => null]);
        $this->getJson('/api/v1/knowledge/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        Http::assertNothingSent();
        config(['orbit.context.token' => 'fixture-viewer-not-a-real-token']);
        Http::fake([$url => Http::response(['error' => ['message' => 'private upstream detail']], 403)]);
        $response = $this->getJson('/api/v1/knowledge/outline')->assertStatus(503)->assertJsonPath('state', 'UNAVAILABLE');
        $this->assertStringNotContainsString('private upstream detail', $response->getContent());
    }

    public function test_oversized_response_is_rejected(): void
    {
        $url = $this->configureContext();
        Http::fake([$url => Http::response($this->mcpResult(str_repeat('x', 262145)))]);
        $this->getJson('/api/v1/knowledge/outline')->assertStatus(503)->assertJsonPath('state', 'UNAVAILABLE');
    }

    public function test_rpc_error_is_not_promoted_to_evidence(): void
    {
        $url = $this->configureContext();
        Http::fake([$url => Http::response(['id' => 1, 'result' => ['isError' => true, 'content' => [['type' => 'text', 'text' => 'No entry']]]])]);
        $this->getJson('/api/v1/knowledge/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
    }

    public function test_shared_upstream_budget_is_bounded(): void
    {
        $this->configureContext();
        for ($i = 0; $i < 120; $i++) {
            RateLimiter::hit('context:upstream-hour', 3600);
        }
        $this->getJson('/api/v1/knowledge/outline')->assertStatus(503);
        Http::assertNothingSent();
    }
}
