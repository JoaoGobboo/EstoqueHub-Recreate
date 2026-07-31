<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Tests\TestCase;

abstract class ApiTestCase extends TestCase
{
    protected User $usuario;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = User::factory()->create();
        $this->actingAs($this->usuario);
    }
}
