<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WorkspaceController extends Controller
{
    public function index(Request $request)
    {
        $items = DB::table('private_workspaces')->where('user_id', $request->user()->id)
            ->orderByDesc('updated_at')->limit(100)->get()->map(fn ($row) => json_decode($row->document, true));

        return response()->json(['items' => $items]);
    }

    public function save(Request $request, string $id)
    {
        $data = $request->validate([
            'operationId' => ['required', 'uuid'], 'baseRevision' => ['required', 'integer', 'min:0', 'max:1000000000'],
            'document' => ['required', 'array:id,revision,title,question,context,requestId,axes,sources,report,checkpoints,updatedAt'],
            'document.id' => ['required', 'uuid', Rule::in([$id])],
            'document.revision' => ['required', 'integer', Rule::in([$request->input('baseRevision')])],
            'document.title' => ['required', 'string', 'max:255'],
            'document.question' => ['present', 'nullable', 'string', 'max:2000'],
            'document.context' => ['present', 'nullable', 'string', 'max:12000'],
            'document.requestId' => ['required', 'string', 'max:160'],
            'document.axes' => ['present', 'array', 'max:9'], 'document.axes.*' => ['string', 'max:300'],
            'document.sources' => ['present', 'array', 'max:30'],
            'document.sources.*' => ['array:id,title,url,text,status'],
            'document.sources.*.id' => ['required', 'string', 'max:160'],
            'document.sources.*.title' => ['required', 'string', 'max:500'],
            'document.sources.*.url' => ['required', 'url:http,https', 'max:2000'],
            'document.sources.*.text' => ['sometimes', 'string', 'max:12000'],
            'document.sources.*.status' => ['required', Rule::in(['discovered', 'excerpt-read', 'read'])],
            'document.report' => ['present', 'nullable', 'string', 'max:40000'],
            'document.checkpoints' => ['present', 'array', 'max:64'],
            'document.checkpoints.*' => ['array:id,at,summary,provenance'],
            'document.checkpoints.*.id' => ['required', 'string', 'max:160'],
            'document.checkpoints.*.at' => ['required', 'date'],
            'document.checkpoints.*.summary' => ['required', 'string', 'max:2000'],
            'document.checkpoints.*.provenance' => ['sometimes', 'string', 'max:2000'],
            'document.updatedAt' => ['required', 'date'],
        ]);
        foreach (['question', 'context', 'report'] as $field) {
            $data['document'][$field] ??= '';
        }
        $owner = $request->user()->id;
        $hash = hash('sha256', json_encode([$id, $data['baseRevision'], $data['document']], JSON_THROW_ON_ERROR));
        $result = DB::transaction(function () use ($data, $id, $owner, $hash) {
            User::whereKey($owner)->lockForUpdate()->firstOrFail();
            $operation = DB::table('workspace_operations')->where('user_id', $owner)->where('operation_id', $data['operationId'])->first();
            if ($operation) {
                return hash_equals($operation->request_hash, $hash)
                    ? [json_decode($operation->response, true), $operation->http_status]
                    : [['error' => 'OPERATION_ID_REUSED'], 409];
            }
            $row = DB::table('private_workspaces')->where('user_id', $owner)->where('workspace_id', $id)->first();
            $current = $row ? json_decode($row->document, true) : null;
            $conflict = ($row?->revision ?? 0) !== $data['baseRevision'];
            DB::table('workspace_versions')->insert([
                'user_id' => $owner, 'workspace_id' => $id, 'base_revision' => $data['baseRevision'],
                'conflict' => $conflict, 'document' => json_encode($data['document'], JSON_THROW_ON_ERROR), 'created_at' => now(),
            ]);
            if ($conflict) {
                $body = ['error' => 'REVISION_CONFLICT', 'current' => $current, 'conflict' => $data['document']];
                $status = 409;
            } else {
                $document = $data['document'];
                $document['revision'] = ($row?->revision ?? 0) + 1;
                $document['updatedAt'] = now()->toISOString();
                DB::table('private_workspaces')->updateOrInsert(['user_id' => $owner, 'workspace_id' => $id], [
                    'revision' => $document['revision'], 'document' => json_encode($document, JSON_THROW_ON_ERROR),
                    'updated_at' => now(), 'created_at' => $row?->created_at ?? now(),
                ]);
                $body = ['document' => $document];
                $status = 200;
            }
            DB::table('workspace_operations')->insert([
                'user_id' => $owner, 'operation_id' => $data['operationId'], 'request_hash' => $hash,
                'http_status' => $status, 'response' => json_encode($body, JSON_THROW_ON_ERROR), 'created_at' => now(),
            ]);

            return [$body, $status];
        });

        return response()->json(...$result);
    }
}
