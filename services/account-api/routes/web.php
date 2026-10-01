<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\KnowledgeController;
use App\Http\Controllers\SocialController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Middleware\PrivateResponse;
use Illuminate\Support\Facades\Route;

Route::middleware([PrivateResponse::class])->group(function () {
    Route::get('/api/v1/knowledge/outline', [KnowledgeController::class, 'outline'])->middleware('throttle:20,1');
    Route::get('/api/v1/knowledge/entries', [KnowledgeController::class, 'entries'])->middleware('throttle:20,1');
    Route::get('/api/v1/session', [AccountController::class, 'session'])->middleware('throttle:120,1');
    Route::post('/api/v1/auth/email/request', [AccountController::class, 'requestCode'])->middleware('throttle:5,10');
    Route::post('/api/v1/auth/email/verify', [AccountController::class, 'verifyCode'])->middleware('throttle:20,10');
    Route::get('/auth/{provider}/redirect', [SocialController::class, 'redirect'])->whereIn('provider', ['google', 'github'])->middleware('throttle:10,1');
    Route::get('/auth/{provider}/callback', [SocialController::class, 'callback'])->whereIn('provider', ['google', 'github']);
    Route::middleware(['auth', 'throttle:120,1'])->group(function () {
        Route::post('/api/v1/logout', [AccountController::class, 'logout']);
        Route::put('/api/v1/storage-consent', [AccountController::class, 'consent']);
        Route::get('/api/v1/workspaces', [WorkspaceController::class, 'index']);
        Route::put('/api/v1/workspaces/{id}', [WorkspaceController::class, 'save'])->whereUuid('id');
    });
});
