import Link from 'next/link';

export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;
    // Right panel feature descriptors (concise & professional; avoid buzzwords per requirements)
    const featurePillars = [
        {
            title: 'Interactive Lessons',
            body: 'Dynamic lesson flows turn material into progressive question sequences instead of static reading.'
        },
        {
            title: 'Question‑Led Mastery',
            body: 'No more cookie-cutter lessons. Guided lessons push you to articulate reasoning—revealing gaps earlier and strengthening recall.'
        },
        {
            title: 'Active Study Workspace',
            body: 'A focused environment that converts notes into varied interactions—minimizing passive review and drift.'
        }
    ];

    return (
        <div className="flex min-h-screen">
            <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white relative">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <h2 className="text-center text-3xl font-bold tracking-tight text-black">
                        {productName}
                    </h2>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    {children}
                </div>
            </div>

            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Gradient backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900" />
                {/* Subtle animated radial glow */}
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl animate-pulse" />
                <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-300/10 blur-2xl" />

                <div className="relative w-full flex items-center justify-center p-12">
                    <div className="w-full max-w-xl space-y-8">
                        <header className="space-y-4">
                            <h3 className="text-3xl font-semibold leading-tight tracking-tight bg-gradient-to-r from-white via-primary-100 to-primary-300 text-transparent bg-clip-text drop-shadow-sm">
                                Turn material into interactive lessons.
                            </h3>
                            <p className="text-primary-100 text-sm leading-relaxed">
                                {productName} provides a scholarly, question‑driven workspace: it engages, probes, and helps you build durable understanding through interaction—not passive review.
                            </p>
                        </header>

                        <ul className="space-y-3">
                            {featurePillars.map((f, i) => (
                                <li
                                    key={f.title}
                                    className="group relative rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 flex gap-4 items-start hover:border-primary-300/40 hover:bg-white/10 transition-colors"
                                    style={{ animationDelay: `${i * 90}ms` }}
                                >
                                    <span className="text-primary-200 font-mono text-xs pt-0.5 tracking-widest">
                                        {(i + 1).toString().padStart(2, '0')}
                                    </span>
                                    <div className="space-y-0.5">
                                        <h4 className="text-[13px] font-medium text-white tracking-wide">{f.title}</h4>
                                        <p className="text-[11px] text-primary-100 leading-relaxed">
                                            {f.body}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="pt-2 border-t border-white/10 space-y-2">
                            <p className="text-xs text-primary-200">
                                Transform static material into active lessons—shape how you learn, not just what you review.
                            </p>
                            <div>
                                <span className="text-[11px] uppercase tracking-wider text-white/90 font-medium block">
                                    Student‑led • Question‑driven • Interactive
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}