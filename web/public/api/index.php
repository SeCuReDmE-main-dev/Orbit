<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$applicationRoot = dirname(__DIR__, 2).'/orbit-account-api';

if (file_exists($maintenance = $applicationRoot.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $applicationRoot.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $applicationRoot.'/bootstrap/app.php';

// The front controller is mounted below /api, while the route contract already
// includes /api. Present it as the site front controller so Laravel receives
// the complete request path, for example /api/v1/knowledge/outline.
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

$app->handleRequest(Request::capture());
