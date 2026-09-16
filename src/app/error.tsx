'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg p-8 space-y-4" role="alert">
      <h1 className="text-2xl font-semibold">No pudimos abrir esta vista</h1>
      <p>Inténtalo de nuevo. Si el problema continúa, comprueba que el navegador permite guardar datos de este sitio. Evita borrarlos: allí están tus movimientos y copias locales.</p>
      <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={reset}>Reintentar</button>
    </main>
  );
}
