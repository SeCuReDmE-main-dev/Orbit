<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrbitWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    private function document(): array
    {
        return ['id' => (string) Str::uuid(), 'revision' => 0, 'title' => 'Atmosphere', 'question' => 'Why?',
            'context' => 'Public context', 'requestId' => 'research-fixture', 'axes' => ['Observation'],
            'sources' => [['id' => 'source-1', 'title' => 'NASA', 'url' => 'https://www.nasa.gov/', 'status' => 'read']],
            'report' => 'A cited result', 'checkpoints' => [['id' => 'check-1', 'at' => now()->toISOString(), 'summary' => 'First checkpoint', 'provenance' => 'fixture']],
            'updatedAt' => now()->toISOString()];
    }

    public function test_owner_isolation_idempotence_and_full_restore(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $doc = $this->document();
        $payload = ['operationId' => (string) Str::uuid(), 'baseRevision' => 0, 'document' => $doc];
        $this->actingAs($a)->putJson('/api/v1/workspaces/'.$doc['id'], $payload)->assertOk()->assertJsonPath('document.revision', 1);
        $this->putJson('/api/v1/workspaces/'.$doc['id'], $payload)->assertOk()->assertJsonPath('document.revision', 1);
        $this->getJson('/api/v1/workspaces')->assertOk()->assertJsonPath('items.0.sources.0.id', 'source-1')->assertJsonPath('items.0.checkpoints.0.id', 'check-1');
        $this->actingAs($b)->getJson('/api/v1/workspaces')->assertExactJson(['items' => []]);
        $this->assertDatabaseCount('private_workspaces', 1);
        $this->assertDatabaseCount('workspace_operations', 1);
    }

    public function test_conflict_preserves_both_versions_and_cannot_reuse_operation_for_other_content(): void
    {
        $this->actingAs(User::factory()->create());
        $doc = $this->document();
        $payload = ['operationId' => (string) Str::uuid(), 'baseRevision' => 0, 'document' => $doc];
        $this->putJson('/api/v1/workspaces/'.$doc['id'], $payload)->assertOk();
        $payload['document']['report'] = 'A conflicting edit';
        $this->putJson('/api/v1/workspaces/'.$doc['id'], $payload)->assertConflict()->assertJsonPath('error', 'OPERATION_ID_REUSED');
        $payload['operationId'] = (string) Str::uuid();
        $this->putJson('/api/v1/workspaces/'.$doc['id'], $payload)->assertConflict()
            ->assertJsonPath('current.report', 'A cited result')->assertJsonPath('conflict.report', 'A conflicting edit');
        $this->getJson('/api/v1/workspaces')->assertJsonPath('items.0.report', 'A cited result');
        $this->assertDatabaseHas('workspace_versions', ['conflict' => true]);
    }

    public function test_rejects_injected_owner_unknown_fields_and_unsafe_url(): void
    {
        $this->actingAs(User::factory()->create());
        $doc = $this->document();
        $doc['owner'] = 999;
        $payload = ['operationId' => (string) Str::uuid(), 'baseRevision' => 0, 'document' => $doc];
        $this->putJson('/api/v1/workspaces/'.$doc['id'], $payload)->assertUnprocessable();
        unset($payload['document']['owner']);
        $payload['document']['sources'][0]['url'] = 'javascript:alert(1)';
        $this->putJson('/api/v1/workspaces/'.$doc['id'], $payload)->assertUnprocessable();
        $this->assertDatabaseCount('private_workspaces', 0);
    }
}
