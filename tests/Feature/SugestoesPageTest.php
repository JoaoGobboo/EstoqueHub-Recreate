<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SugestoesPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get(route('sugestoes'))
            ->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_suggestions_page(): void
    {
        $user = User::factory()->create();
        $this->withoutVite();

        $this->actingAs($user)
            ->get(route('sugestoes'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('sugestoes'));
    }
}
