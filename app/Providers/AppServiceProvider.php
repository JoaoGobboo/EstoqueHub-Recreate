<?php

namespace App\Providers;

use App\Contracts\ChamadoConnectorInterface;
use App\Services\ChamadoMockConnector;
use App\Services\Microsoft\AzureLoginOAuthProvider;
use App\Services\Microsoft\AzureOAuthProvider;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ChamadoConnectorInterface::class, ChamadoMockConnector::class);

        $this->app->bind(AzureOAuthProvider::class, function () {
            return new AzureOAuthProvider([
                'clientId' => config('services.microsoft.client_id'),
                'clientSecret' => config('services.microsoft.client_secret'),
                'redirectUri' => config('services.microsoft.redirect_uri'),
                'tenant' => config('services.microsoft.tenant_id'),
                'defaultEndPointVersion' => AzureOAuthProvider::ENDPOINT_VERSION_2_0,
                'scopes' => ['openid', 'profile', 'offline_access', 'User.Read', 'Tasks.ReadWrite', 'Mail.Send'],
            ]);
        });

        $this->app->bind(AzureLoginOAuthProvider::class, function () {
            return new AzureLoginOAuthProvider([
                'clientId' => config('services.microsoft.client_id'),
                'clientSecret' => config('services.microsoft.client_secret'),
                'redirectUri' => config('services.microsoft.login_redirect_uri'),
                'tenant' => config('services.microsoft.tenant_id'),
                'defaultEndPointVersion' => AzureLoginOAuthProvider::ENDPOINT_VERSION_2_0,
                'scopes' => ['openid', 'profile', 'email', 'User.Read'],
            ]);
        });
    }

    public function boot(): void
    {
        $this->configureDefaults();
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(app()->isProduction());

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}