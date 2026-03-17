import type { Metadata } from 'next';
import './globals.css';
import { FinanceProvider } from '@/contexts/finance-context';
import { Toaster } from '@/components/ui/toaster';
import { PWARegistration } from '@/components/pwa-registration';

export const metadata: Metadata = {
  title: 'GlitchBudget Pro',
  description: 'A simple and clean personal budget app to manage your finances.',
  icons: [{ rel: 'icon', url: '/icon-192.png', type: 'image/png' }],
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
        <meta name="theme-color" content="#0d0d0d" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GlitchBudget" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <FinanceProvider>
          {children}
          <Toaster />
          <PWARegistration />
        </FinanceProvider>
      </body>
    </html>
  );
}
