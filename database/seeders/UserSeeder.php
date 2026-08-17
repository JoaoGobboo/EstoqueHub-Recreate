<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => config('services.estoquehub.admin_email')],
            [
                'name' => config('services.estoquehub.admin_name'),
                'password' => config('services.estoquehub.admin_password'),
                'email_verified_at' => now(),
                'is_admin' => true,
            ],
        );
    }
}
