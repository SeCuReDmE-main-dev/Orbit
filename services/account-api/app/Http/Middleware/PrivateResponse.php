<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class PrivateResponse
{
    public function handle(Request $request, Closure $next)
    {
        // Browser requests must originate here; no permissive CORS for private sessions.
        $origin = $request->header('Origin');
        $expected = $request->getSchemeAndHttpHost();
        if ($origin && $origin !== $expected) {
            return response()->json(['error' => 'ORIGIN_REJECTED'], 403);
        }
        if (strlen($request->getContent()) > 262144) {
            return response()->json(['error' => 'PAYLOAD_TOO_LARGE'], 413);
        }
        $response = $next($request);
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'same-origin');

        return $response;
    }
}
