<?php

return [
    'paths' => ['api/v1/course-context/outline', 'api/v1/course-context/entries'],
    'allowed_methods' => ['GET', 'HEAD'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
