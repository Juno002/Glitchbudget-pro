'use client';

import Header from "@/components/layout/header";
import { ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

export default function AppShell({ children }: { children: ReactNode }) {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header onNewMovement={() => setFabOpen(true)} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-[160px] md:pb-24">
        <div className="mx-auto w-full max-w-6xl">
          {children}
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setFabOpen(true)}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-20 flex md:hidden items-center justify-center w-14 h-14 rounded-full bg-[hsl(var(--primary)_/_0.15)] border border-primary/40 text-primary shadow-[0_0_20px_hsl(var(--primary)_/_0.15)] hover:bg-[hsl(var(--primary)_/_0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)_/_0.25)] active:scale-95 transition-all"
        aria-label="Nuevo movimiento"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TransactionModal
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        mode="new"
      />
    </div>
  );
}
