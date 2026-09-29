'use client';

import { ReactNode, useState } from 'react';
import { Plus } from 'lucide-react';
import Header from '@/components/layout/header';
import BottomNav from '@/components/layout/bottom-nav';
import DesktopSidebar from '@/components/layout/desktop-sidebar';
import TransactionModal from '@/components/dashboard/TransactionModal';

export default function AppShell({ children }: { children: ReactNode }) {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background text-foreground md:flex" data-app-shell="prisma">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:ring-2 focus:ring-primary"
      >
        Saltar al contenido
      </a>

      <DesktopSidebar onNewMovement={() => setComposerOpen(true)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          data-private-surface="true"
          className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)] pt-5 sm:px-6 sm:pt-7 md:pb-8 lg:px-10 lg:py-9"
        >
          <div className="mx-auto w-full max-w-[1280px]">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />

      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        aria-label="Nuevo movimiento"
        data-shell-fab="mobile"
        className="fixed right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--brand-coral))] text-white shadow-[var(--shadow-floating)] transition-[transform,box-shadow] duration-[var(--motion-standard)] bottom-[calc(env(safe-area-inset-bottom,0px)+5.4rem)] hover:shadow-[var(--shadow-floating-strong)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
      >
        <Plus className="h-5 w-5" />
      </button>

      <TransactionModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        mode="new"
      />
    </div>
  );
}
