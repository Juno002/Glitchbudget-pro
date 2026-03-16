import type { Metadata } from 'next';
import './globals.css';
import { FinanceProvider } from '@/contexts/finance-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'GlitchBudget Pro',
  description: 'A simple and clean personal budget app to manage your finances.',
  icons: [{ rel: 'icon', url: '/logo.svg' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b1220" />
      </head>
      <body>
        <FinanceProvider>
          {children}
          <Toaster />
        </FinanceProvider>
      </body>
    </html>
  );
}
