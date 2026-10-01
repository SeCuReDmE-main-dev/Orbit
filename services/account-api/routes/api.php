<?php

use App\Http\Controllers\CourseContextController;
use App\Http\Middleware\PublicCourseContext;
use Illuminate\Support\Facades\Route;

Route::middleware([PublicCourseContext::class, 'throttle:20,1'])->group(function (): void {
    Route::get('/v1/course-context/outline', [CourseContextController::class, 'outline']);
    Route::get('/v1/course-context/entries', [CourseContextController::class, 'entries']);
});
