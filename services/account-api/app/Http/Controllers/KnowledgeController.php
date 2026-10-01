<?php

namespace App\Http\Controllers;

use App\Services\SanityContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Throwable;

class KnowledgeController extends Controller
{
    public function outline(Request $request, SanityContext $context): JsonResponse
    {
        abort_if($request->query() !== [], 422);

        return $this->retrieve($context, 'outline');
    }

    public function entries(Request $request, SanityContext $context): JsonResponse
    {
        abort_if(array_diff(array_keys($request->query()), ['paths']) !== [], 422);
        $raw = $request->query('paths');
        abort_unless(is_string($raw) && strlen($raw) <= 2200, 422);
        $paths = json_decode($raw, true);
        Validator::make(['paths' => $paths], [
            'paths' => ['required', 'array', 'list', 'min:1', 'max:5'],
            'paths.*' => ['required', 'string', 'max:200', 'distinct:strict', 'regex:~^[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_-]+)*$~D'],
        ])->validate();

        return $this->retrieve($context, 'entries', $paths);
    }

    private function retrieve(SanityContext $context, string $kind, array $paths = []): JsonResponse
    {
        try {
            return response()->json($context->read($kind, $paths));
        } catch (Throwable) {
            // Do not expose upstream exceptions, headers or third-party data.
            return response()->json(['state' => 'UNAVAILABLE', 'reason' => 'CONTEXT_NOT_READY', 'noFallback' => true], 503);
        }
    }
}
