<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('ESTOQUEHUB_ADMIN_EMAIL', 'admin@estoquehub.local')],
            [
                'name' => env('ESTOQUEHUB_ADMIN_NAME', 'Administrador EstoqueHub'),
                'password' => env('ESTOQUEHUB_ADMIN_PASSWORD', 'password'),
                'email_verified_at' => now(),
                'is_admin' => true,
            ],
        );
    }
}
