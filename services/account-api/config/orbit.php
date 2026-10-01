<?php

return [
    'context' => [
        'organization' => 'oatv1mmu8',
        'knowledge_base' => 'kb5CHIYGXCMJ',
        'endpoint' => env('SANITY_CONTEXT_ENDPOINT_NAME'),
        'token' => env('SANITY_CONTEXT_VIEWER_TOKEN'),
    ],
    'email_enabled' => env('ORBIT_EMAIL_AUTH_ENABLED', false),
    'code_minutes' => 10,
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', rtrim(env('APP_URL', ''), '/').'/auth/google/callback'),
    ],
    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI', rtrim(env('APP_URL', ''), '/').'/auth/github/callback'),
    ],
];
