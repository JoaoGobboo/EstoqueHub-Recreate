type Props = {
    children: React.ReactNode;
};

function PencilLoginMark() {
    return (
        <svg
            aria-hidden="true"
            className="size-5"
            viewBox="0 0 14 14"
            fill="none"
        >
            <path
                d="M4.1 1.2h5.8"
                stroke="#FAFAFA"
                strokeWidth="1.1"
                strokeLinecap="round"
            />
            <path
                d="M2.9 3.6h8.2"
                stroke="#FAFAFA"
                strokeWidth="1.1"
                strokeLinecap="round"
            />
            <rect
                x="1.8"
                y="6"
                width="10.4"
                height="6.8"
                rx="1.1"
                stroke="#FAFAFA"
                strokeWidth="1.1"
            />
        </svg>
    );
}

export default function AuthLoginLayout({ children }: Props) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 overflow-hidden bg-[#18181b] px-5 py-6 text-[#fafafa]">
            <div className="flex w-full max-w-[920px] flex-col overflow-hidden rounded-[7px] border border-[#27272a] bg-[#09090b] sm:flex-row">
                <div className="flex w-full flex-col items-center justify-center gap-6 px-8 py-10 sm:w-1/2 sm:px-10">
                    <div className="flex w-full max-w-[300px] flex-col items-center gap-1">
                        <div className="mb-1 flex size-6 items-center justify-center">
                            <PencilLoginMark />
                        </div>
                        <h1 className="text-center text-lg leading-6 font-bold">
                            Bem vindo ao EstoqueHub
                        </h1>
                        <p className="text-center text-xs text-[#a1a1aa]">
                            Utilize o seu e-mail corporativo para login
                        </p>
                    </div>

                    <div className="w-full max-w-[300px]">{children}</div>
                </div>

                <div className="relative hidden min-h-[560px] w-1/2 overflow-hidden bg-[#27272a] sm:block">
                    <img
                        src="/assets/thtnM.png"
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/5 to-[#09090b]/25" />
                </div>
            </div>

            <p className="max-w-[585px] px-3 text-center text-[10px] leading-4 text-[#a1a1aa]">
                Este &eacute; um sistema corporativo interno do Grupo Positivo.
                O acesso &eacute; restrito a usu&aacute;rios autorizados e
                monitorado conforme as pol&iacute;ticas da companhia.
            </p>
        </div>
    );
}
