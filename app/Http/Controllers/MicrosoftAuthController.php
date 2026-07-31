<?php

namespace App\Http\Controllers;

use App\Services\Microsoft\MicrosoftLoginService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class MicrosoftAuthController extends Controller
{
    public function redirect(MicrosoftLoginService $microsoft): RedirectResponse
    {
        if (! filled(config('services.microsoft.tenant_id'))
            || ! filled(config('services.microsoft.client_id'))
            || ! filled(config('services.microsoft.client_secret'))
        ) {
            return redirect()->route('login')->withErrors([
                'email' => 'O login Microsoft ainda não foi configurado neste ambiente.',
            ]);
        }

        return $microsoft->redirectParaLogin();
    }

    public function callback(Request $request, MicrosoftLoginService $microsoft): RedirectResponse
    {
        try {
            $usuario = $microsoft->tratarCallback($request);
        } catch (Throwable $e) {
            report($e);

            return redirect()->route('login')->withErrors([
                'email' => 'Não foi possível entrar com a conta Microsoft. Tente novamente.',
            ]);
        }

        Auth::login($usuario);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }
}
