import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

function MicrosoftMark() {
    return (
        <svg
            aria-hidden="true"
            className="size-3.5"
            viewBox="0 0 16 16"
            fill="none"
        >
            <rect width="7" height="7" fill="#F25022" />
            <rect x="9" width="7" height="7" fill="#7FBA00" />
            <rect y="9" width="7" height="7" fill="#00A4EF" />
            <rect x="9" y="9" width="7" height="7" fill="#FFB900" />
        </svg>
    );
}

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Entrar" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-3"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-3">
                            <div className="grid gap-1.5">
                                <Label
                                    className="text-[11px] font-medium text-[#a1a1aa]"
                                    htmlFor="email"
                                >
                                    E-mail corporativo
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="nome@empresa.com.br"
                                    className="h-8 rounded-[3px] border-[#3f3f46] bg-[#18181b] px-2 text-xs text-[#fafafa] placeholder:text-[#71717a] focus-visible:border-[#71717a] focus-visible:ring-0"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label
                                        className="text-[11px] font-medium text-[#a1a1aa]"
                                        htmlFor="password"
                                    >
                                        Senha
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-[10px] text-[#a1a1aa] hover:text-[#fafafa]"
                                            tabIndex={5}
                                        >
                                            Esqueceu a senha?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Digite sua senha"
                                    className="h-8 rounded-[3px] border-[#3f3f46] bg-[#18181b] px-2 text-xs text-[#fafafa] placeholder:text-[#71717a] focus-visible:border-[#71717a] focus-visible:ring-0"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="size-3.5 rounded-[3px] border-[#3f3f46] data-[state=checked]:border-[#fafafa] data-[state=checked]:bg-[#fafafa] data-[state=checked]:text-[#09090b]"
                                />
                                <Label
                                    className="text-[10px] text-[#a1a1aa]"
                                    htmlFor="remember"
                                >
                                    Lembrar de mim
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="h-8 w-full rounded-[3px] bg-[#fafafa] text-xs font-medium text-[#09090b] hover:bg-white/90"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Entrar
                            </Button>

                            <div className="relative my-1">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-[#27272a]" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-[#09090b] px-2 text-[9px] tracking-wide text-[#71717a] uppercase">
                                        Ou continue com
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="h-8 w-full rounded-[3px] border-[#3f3f46] bg-[#18181b] text-[11px] font-medium text-[#fafafa] hover:bg-[#27272a] hover:text-[#fafafa]"
                                asChild
                            >
                                <a href="/login/microsoft">
                                    <MicrosoftMark />
                                    Entrar com Microsoft
                                </a>
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-3 text-center text-xs font-medium text-emerald-400">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Entrar',
    description: 'Utilize o seu e-mail corporativo para login',
};
