<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PublicCourseContext
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('course_context.enabled') !== true) {
            $response = response()->json(['state' => 'UNAVAILABLE', 'reason' => 'CONTEXT_NOT_READY', 'noFallback' => true], 503);
        } elseif ($request->getContent() !== '') {
            $response = response()->json(['error' => 'QUERY_ONLY_REQUEST_REQUIRED'], 422);
        } else {
            $response = $next($request);
        }

        $response->headers->set('Cache-Control', 'no-store');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'no-referrer');

        return $response;
    }
}
