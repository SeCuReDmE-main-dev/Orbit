<?php

namespace App\Http\Controllers;

use App\Services\PublicCourseContextReader;
use App\Services\SanityContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use Throwable;

class CourseContextController extends Controller
{
    public function outline(Request $request, SanityContext $context, PublicCourseContextReader $reader): JsonResponse
    {
        abort_if($request->query() !== [], 422);

        return $this->retrieve($context, $reader, 'outline');
    }

    public function entries(Request $request, SanityContext $context, PublicCourseContextReader $reader): JsonResponse
    {
        abort_if(array_diff(array_keys($request->query()), ['paths']) !== [], 422);
        $raw = $request->query('paths');
        abort_unless(is_string($raw) && strlen($raw) <= 2200, 422);
        $paths = json_decode($raw, true);
        Validator::make(['paths' => $paths], [
            'paths' => ['required', 'array', 'list', 'min:1', 'max:5'],
            'paths.*' => ['required', 'string', 'max:200', 'distinct:strict', 'regex:~^[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_-]+)*$~D'],
        ])->validate();

        return $this->retrieve($context, $reader, 'entries', $paths);
    }

    private function retrieve(SanityContext $context, PublicCourseContextReader $reader, string $kind, array $paths = []): JsonResponse
    {
        try {
            return response()->json($kind === 'outline' ? $reader->outline($context) : $reader->entries($context, $paths));
        } catch (InvalidArgumentException) {
            return response()->json(['error' => 'COURSE_PATH_NOT_ALLOWED'], 422);
        } catch (Throwable) {
            return response()->json(['state' => 'UNAVAILABLE', 'reason' => 'CONTEXT_NOT_READY', 'noFallback' => true], 503);
        }
    }
}
