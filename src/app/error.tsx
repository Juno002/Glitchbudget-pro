'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4" role="alert" data-error-state="prisma">
      <section className="w-full max-w-lg rounded-[var(--radius-card)] border bg-card p-6 shadow-[var(--shadow-card)]">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Estado de la aplicación</p>
        <h1 className="mt-2 font-display text-3xl font-normal tracking-[-0.035em]">No pudimos abrir esta vista</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Inténtalo de nuevo. Si el problema continúa, comprueba que el navegador permite guardar datos de este sitio. Evita borrarlos: allí están tus movimientos y copias locales.</p>
        <button className="mt-5 min-h-11 rounded-[var(--radius-interactive)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-control)]" onClick={reset}>Reintentar</button>
      </section>
    </main>
  );
}
