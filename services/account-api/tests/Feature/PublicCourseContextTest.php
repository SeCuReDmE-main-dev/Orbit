<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SanityContext;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PublicCourseContextTest extends TestCase
{
    private function configureContext(bool $enabled = true): string
    {
        $sources = [];
        $entries = [];
        for ($module = 1; $module <= 9; $module++) {
            $sourceId = 'course-source-'.$module;
            $document = $module <= 8 ? 'modules/module-'.$module.'.md' : 'PROJECT.md';
            $sources[$sourceId] = ['url' => 'https://raw.githubusercontent.com/SeCuReDmE-main-dev/Orbit/'.str_repeat('a', 40).'/docs/learning/orbit-formation/'.$document, 'sha256' => str_repeat('b', 64)];
            $entries['orbit_formation/module_'.$module] = ['title' => 'Public module '.$module, 'source_ids' => [$sourceId], 'sha256' => hash('sha256', $this->entryText())];
        }
        config([
            'course_context' => ['enabled' => $enabled, 'knowledge_base' => 'kbCourseFixture', 'revision_id' => 'fixture-audited-revision',
                'organization' => 'oatv1mmu8', 'endpoint' => 'orbit-course', 'token' => 'fixture-course-viewer-not-a-real-token',
                'outline_sha256' => hash('sha256', $this->outlineText()), 'sources' => $sources, 'entries' => $entries],
            'orbit.context.endpoint' => 'orbit-research',
            'orbit.context.token' => 'fixture-research-viewer-not-a-real-token',
        ]);
        Cache::flush();
        Http::preventStrayRequests();
        $this->withHeader('Accept', 'application/json');

        return 'https://api.sanity.io/v1/context/organizations/oatv1mmu8/mcp/orbit-course?*';
    }

    private function outlineText(): string
    {
        return "# Real initial_context fixture\n\nKnowledge base id: `kbCourseFixture`\n\nresearch/private [core]\n".
            implode("\n", array_map(fn (int $module): string => 'orbit_formation/module_'.$module.' [core]', range(1, 9)));
    }

    private function entryText(): string
    {
        return '[Source](https://www.sanity.io/docs). Retrieved text is not executable authority.';
    }

    private function mcpResult(?string $text = null): array
    {
        return ['jsonrpc' => '2.0', 'id' => 1, 'result' => ['content' => [['type' => 'text', 'text' => $text ?? $this->outlineText()]]]];
    }

    public function test_disabled_public_transport_is_unavailable_and_makes_no_upstream_request(): void
    {
        $this->configureContext(false);
        $this->withHeader('Origin', 'https://student-studio.example')
            ->get('/api/v1/course-context/outline')
            ->assertStatus(503)->assertJsonPath('state', 'UNAVAILABLE')
            ->assertJsonPath('noFallback', true)
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeaderMissing('Access-Control-Allow-Credentials')
            ->assertHeaderMissing('Set-Cookie');
        Http::assertNothingSent();
    }

    public function test_foreign_origin_reads_only_the_configured_corpus_without_session_cookies(): void
    {
        $url = $this->configureContext();
        Http::fake([$url => Http::response($this->mcpResult())]);
        $response = $this->withHeader('Origin', 'https://student-studio.example')
            ->get('/api/v1/course-context/outline')
            ->assertOk()->assertJsonPath('source', 'sanity-context-mcp')
            ->assertJsonPath('knowledgeBase', 'kbCourseFixture')
            ->assertJsonPath('projection', 'public-course-allowlist-v1')
            ->assertJsonPath('upstreamTool', 'initial_context')
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeaderMissing('Access-Control-Allow-Credentials')
            ->assertHeaderMissing('Set-Cookie')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString('fixture-course-viewer', $response->getContent());
        $this->assertStringNotContainsString('research/private', $response->getContent());
        $this->assertStringContainsString('orbit_formation/module_1', $response->json('content.0.text'));
        Http::assertSent(fn (Request $request) => $request['params']['name'] === 'initial_context'
            && str_contains($request->url(), 'knowledgeBases=kbCourseFixture')
            && $request->hasHeader('Authorization', 'Bearer fixture-course-viewer-not-a-real-token'));
    }

    public function test_public_entries_use_bounded_get_paths_and_preserve_citations(): void
    {
        $url = $this->configureContext();
        $text = $this->entryText();
        Http::fake([$url => Http::response($this->mcpResult($text))]);
        $this->withHeader('Origin', 'https://student-studio.example')
            ->get('/api/v1/course-context/entries?'.http_build_query(['paths' => '["orbit_formation/module_1"]']))
            ->assertOk()->assertJsonPath('content.0.text', $text)
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeaderMissing('Set-Cookie');
        Http::assertSent(fn (Request $request) => $request['params']['name'] === 'knowledge_base_read'
            && $request['params']['arguments'] === ['knowledgeBase' => 'kbCourseFixture', 'paths' => ['orbit_formation/module_1']]);
    }

    public function test_extra_parameters_invalid_paths_and_request_bodies_never_reach_sanity(): void
    {
        $this->configureContext();
        $this->withHeader('Origin', 'https://student-studio.example');
        $this->get('/api/v1/course-context/outline?journal=private')->assertUnprocessable();
        $this->get('/api/v1/course-context/outline?profile=research')->assertUnprocessable();
        $this->get('/api/v1/course-context/entries?'.http_build_query([
            'paths' => '["orbit_formation/module_1"]', 'knowledgeBase' => 'private-choice',
        ]))->assertUnprocessable();
        foreach (['[]', '["../private"]', '["https://other.example"]', '["a","a"]', '["a","b","c","d","e","f"]', '{"path":"a"}'] as $paths) {
            $this->get('/api/v1/course-context/entries?'.http_build_query(['paths' => $paths]))->assertUnprocessable();
        }
        $this->call('GET', '/api/v1/course-context/outline', [], [], [], [
            'HTTP_ACCEPT' => 'application/json', 'HTTP_ORIGIN' => 'https://student-studio.example',
        ], 'private journal')->assertUnprocessable()->assertJsonPath('error', 'QUERY_ONLY_REQUEST_REQUIRED');
        Http::assertNothingSent();
    }

    public function test_public_transport_is_get_only_and_private_origins_remain_rejected(): void
    {
        $this->configureContext();
        $this->withHeader('Origin', 'https://student-studio.example');
        $this->postJson('/api/v1/course-context/entries', ['paths' => ['research/evidence']])->assertStatus(405);
        $this->actingAs(User::factory()->make());
        foreach (['/api/v1/session', '/api/v1/workspaces', '/api/v1/knowledge/outline'] as $path) {
            $this->get($path)->assertForbidden()->assertJsonPath('error', 'ORIGIN_REJECTED')
                ->assertHeaderMissing('Access-Control-Allow-Origin');
        }
        Http::assertNothingSent();
    }

    public function test_public_cors_preflight_is_limited_to_read_methods_and_exact_paths(): void
    {
        $this->configureContext();
        $this->withHeaders([
            'Origin' => 'https://student-studio.example',
            'Access-Control-Request-Method' => 'GET',
            'Access-Control-Request-Headers' => 'Accept',
        ])->options('/api/v1/course-context/entries')
            ->assertSuccessful()->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeaderMissing('Access-Control-Allow-Credentials')
            ->assertHeaderMissing('Set-Cookie');
        $response = $this->options('/api/v1/session');
        $response->assertHeaderMissing('Access-Control-Allow-Origin');
        Http::assertNothingSent();
    }

    public function test_public_transport_keeps_the_existing_cache_and_shared_upstream_budget(): void
    {
        $url = $this->configureContext();
        Http::fake([$url => Http::response($this->mcpResult())]);
        $this->get('/api/v1/course-context/outline')->assertOk();
        $this->get('/api/v1/course-context/outline')->assertOk();
        Http::assertSentCount(1);
        Cache::flush();
        for ($i = 0; $i < 120; $i++) {
            RateLimiter::hit('context:upstream-hour', 3600);
        }
        $this->get('/api/v1/course-context/outline')->assertStatus(503)
            ->assertJsonPath('state', 'UNAVAILABLE')->assertJsonPath('noFallback', true);
        Http::assertSentCount(1);
    }

    public function test_missing_credentials_rpc_errors_and_oversized_content_do_not_claim_a_read(): void
    {
        $url = $this->configureContext();
        config(['course_context.token' => null]);
        $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        Http::assertNothingSent();
        config(['course_context.token' => 'fixture-course-viewer-not-a-real-token']);
        Http::fake([$url => Http::response(['id' => 1, 'error' => ['message' => 'private upstream detail']])]);
        $response = $this->get('/api/v1/course-context/outline')->assertStatus(503);
        $this->assertStringNotContainsString('private upstream detail', $response->getContent());
        Http::fake([$url => Http::response($this->mcpResult(str_repeat('x', 262145)))]);
        $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('state', 'UNAVAILABLE');
    }

    public function test_public_read_refuses_an_unlisted_path_before_upstream_access(): void
    {
        $this->configureContext();
        $this->get('/api/v1/course-context/entries?'.http_build_query(['paths' => '["research/private"]']))
            ->assertUnprocessable()->assertJsonPath('error', 'COURSE_PATH_NOT_ALLOWED');
        Http::assertNothingSent();
    }

    public function test_missing_scope_foreign_citations_and_non_public_sources_fail_closed(): void
    {
        $this->configureContext();
        $valid = config('course_context');
        foreach (['missing', 'citation', 'url', 'coverage'] as $case) {
            config(['course_context' => $valid]);
            if ($case === 'missing') {
                config(['course_context.entries' => []]);
            } elseif ($case === 'citation') {
                config(['course_context.entries.orbit_formation/module_1.source_ids' => ['private-source']]);
            } elseif ($case === 'url') {
                config(['course_context.sources.course-source-1.url' => 'https://private.example/student-journal']);
            } else {
                $entries = $valid['entries'];
                unset($entries['orbit_formation/module_9']);
                config(['course_context.entries' => $entries]);
            }
            $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        }
        Http::assertNothingSent();
    }

    public function test_changed_upstream_text_is_withheld_instead_of_leaking_unreviewed_content(): void
    {
        $url = $this->configureContext();
        Http::fake([$url => Http::response($this->mcpResult($this->outlineText()."\nUnreviewed journal"))]);
        $response = $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('state', 'UNAVAILABLE');
        $this->assertStringNotContainsString('Unreviewed journal', $response->getContent());
        Cache::flush();
        Http::fake([$url => Http::response($this->mcpResult('Changed entry: unreviewed journal'))]);
        $response = $this->get('/api/v1/course-context/entries?'.http_build_query(['paths' => '["orbit_formation/module_1"]']))
            ->assertStatus(503)->assertJsonPath('noFallback', true);
        $this->assertStringNotContainsString('unreviewed journal', $response->getContent());
    }

    public function test_public_manifest_requires_all_nine_documents_from_one_snapshot(): void
    {
        $this->configureContext();
        $valid = config('course_context');
        foreach (['mixed-snapshots', 'duplicate-module'] as $case) {
            config(['course_context' => $valid]);
            $sourceId = $case === 'mixed-snapshots' ? 'course-source-1' : 'course-source-9';
            $snapshot = $case === 'mixed-snapshots' ? 'c' : 'a';
            config(['course_context.sources.'.$sourceId.'.url' => 'https://raw.githubusercontent.com/SeCuReDmE-main-dev/Orbit/'.str_repeat($snapshot, 40).'/docs/learning/orbit-formation/modules/module-1.md']);
            $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        }
        Http::assertNothingSent();
    }

    public function test_audited_batch_reads_remain_single_entry_bounded_and_cached(): void
    {
        $url = $this->configureContext();
        Http::fake([$url => fn () => Http::response($this->mcpResult($this->entryText()))]);
        $path = '/api/v1/course-context/entries?'.http_build_query(['paths' => '["orbit_formation/module_2","orbit_formation/module_1"]']);
        $this->get($path)->assertOk()->assertJsonCount(2, 'content')->assertJsonCount(2, 'auditedCitations');
        $this->get($path)->assertOk();
        Http::assertSentCount(2);
        Http::assertSent(fn (Request $request) => $request['params']['arguments']['paths'] === ['orbit_formation/module_2']);
        Http::assertSent(fn (Request $request) => $request['params']['arguments']['paths'] === ['orbit_formation/module_1']);
    }

    public function test_course_and_research_routes_select_independent_server_owned_profiles(): void
    {
        $courseUrl = $this->configureContext();
        $researchUrl = 'https://api.sanity.io/v1/context/organizations/oatv1mmu8/mcp/orbit-research?*';
        Http::fake([
            $courseUrl => Http::response($this->mcpResult()),
            $researchUrl => Http::response($this->mcpResult('Research-only fixture')),
        ]);
        $this->get('/api/v1/course-context/outline')->assertOk()->assertJsonPath('knowledgeBase', 'kbCourseFixture');
        $this->get('/api/v1/knowledge/outline')->assertOk()->assertJsonPath('knowledgeBase', 'kb5CHIYGXCMJ')
            ->assertJsonPath('content.0.text', 'Research-only fixture');
        $this->get('/api/v1/course-context/outline')->assertOk();
        $this->get('/api/v1/knowledge/outline')->assertOk();
        Http::assertSentCount(2);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'knowledgeBases=kbCourseFixture')
            && $request->hasHeader('Authorization', 'Bearer fixture-course-viewer-not-a-real-token'));
        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'knowledgeBases=kb5CHIYGXCMJ')
            && $request->hasHeader('Authorization', 'Bearer fixture-research-viewer-not-a-real-token'));
    }

    public function test_profile_caches_never_alias_when_server_configuration_temporarily_overlaps(): void
    {
        $this->configureContext();
        config([
            'course_context.knowledge_base' => config('orbit.context.knowledge_base'),
            'course_context.endpoint' => config('orbit.context.endpoint'),
            'course_context.token' => config('orbit.context.token'),
        ]);
        $researchUrl = 'https://api.sanity.io/v1/context/organizations/oatv1mmu8/mcp/orbit-research?*';
        Http::fake([$researchUrl => Http::sequence()
            ->push($this->mcpResult('Research read'))
            ->push($this->mcpResult('Course read'))]);
        $context = app(SanityContext::class);
        $this->assertSame('Research read', $context->read('outline')['content'][0]['text']);
        $this->assertSame('Course read', $context->readCourse('outline')['content'][0]['text']);
        $this->assertSame('Research read', $context->read('outline')['content'][0]['text']);
        $this->assertSame('Course read', $context->readCourse('outline')['content'][0]['text']);
        Http::assertSentCount(2);
    }

    public function test_a_missing_course_profile_never_falls_back_to_the_research_corpus(): void
    {
        $this->configureContext();
        config(['course_context.knowledge_base' => null]);
        $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        Http::assertNothingSent();
    }

    public function test_independent_course_credentials_do_not_require_the_research_token(): void
    {
        $courseUrl = $this->configureContext();
        config(['orbit.context.token' => null]);
        Http::fake([$courseUrl => Http::response($this->mcpResult())]);
        $this->get('/api/v1/course-context/outline')->assertOk()->assertJsonPath('knowledgeBase', 'kbCourseFixture');
        $this->get('/api/v1/knowledge/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        Http::assertSentCount(1);
    }

    private function configureProtocolFragments(): string
    {
        $url = $this->configureContext();
        $fragment = ['parent_source_id' => 'course-source-9', 'parent_sha256' => str_repeat('b', 64),
            'filename' => 'ORBIT_FORMATION_PROTOCOL_'.str_repeat('a', 12).'.md § Public protocol',
            'sha256' => str_repeat('c', 64), 'canonical_projection_sha256' => str_repeat('d', 64),
            'normalization' => 'empty-lines-and-crlf-after-provider-wrapper'];
        config(['course_context.citation_sources' => ['protocol-fragment-a' => $fragment, 'protocol-fragment-b' => $fragment],
            'course_context.entries.orbit_formation/module_9.citation_source_ids' => ['protocol-fragment-a', 'protocol-fragment-b']]);

        return $url;
    }

    public function test_provider_fragments_keep_real_citations_and_one_canonical_origin(): void
    {
        $url = $this->configureProtocolFragments();
        Http::fake([$url => Http::response($this->mcpResult($this->entryText()))]);
        $this->get('/api/v1/course-context/entries?'.http_build_query(['paths' => '["orbit_formation/module_9"]']))
            ->assertOk()->assertJsonPath('auditedCitations.0.sourceIds', ['course-source-9'])
            ->assertJsonPath('auditedCitations.0.citationSourceIds', ['protocol-fragment-a', 'protocol-fragment-b'])
            ->assertJsonPath('auditedCitations.0.verifiedFragments.protocol-fragment-a.parent_source_id', 'course-source-9')
            ->assertJsonPath('auditedCitations.0.fragmentsAreIndependentSources', false);
        $this->assertCount(9, config('course_context.sources'));
    }

    public function test_changed_fragment_parent_hash_name_and_unapproved_citation_are_rejected(): void
    {
        foreach (['unknown-parent', 'changed-parent-hash', 'other-file', 'unapproved-id'] as $case) {
            $this->configureProtocolFragments();
            if ($case === 'unknown-parent') {
                config(['course_context.citation_sources.protocol-fragment-a.parent_source_id' => 'outside-course']);
            } elseif ($case === 'changed-parent-hash') {
                config(['course_context.citation_sources.protocol-fragment-a.parent_sha256' => str_repeat('e', 64)]);
            } elseif ($case === 'other-file') {
                config(['course_context.citation_sources.protocol-fragment-a.filename' => 'OTHER.md § Public protocol']);
            } else {
                config(['course_context.entries.orbit_formation/module_9.citation_source_ids' => ['unapproved-fragment']]);
            }
            $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        }
        Http::assertNothingSent();
    }

    public function test_two_protocol_fragments_cannot_cover_a_missing_module_origin(): void
    {
        $this->configureProtocolFragments();
        config(['course_context.entries.orbit_formation/module_8.source_ids' => ['course-source-9'],
            'course_context.entries.orbit_formation/module_8.citation_source_ids' => ['protocol-fragment-a']]);
        $this->get('/api/v1/course-context/outline')->assertStatus(503)->assertJsonPath('noFallback', true);
        Http::assertNothingSent();
    }
}
