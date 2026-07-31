<?php

use App\Http\Controllers\MicrosoftAuthController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login/microsoft', [MicrosoftAuthController::class, 'redirect'])
        ->name('login.microsoft');
    Route::get('/login/microsoft/callback', [MicrosoftAuthController::class, 'callback'])
        ->name('login.microsoft.callback');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
