import type { Metadata } from 'next';
import { Syne, DM_Mono } from 'next/font/google';
import './globals.css';
import { FinanceProvider } from '@/contexts/finance-context';
import { Toaster } from '@/components/ui/toaster';
import { PWARegistration } from '@/components/pwa-registration';

const syne = Syne({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
});
const dmMono = DM_Mono({ 
  subsets: ['latin'], 
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});


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
      <body className={`${syne.variable} ${dmMono.variable} font-body bg-background text-foreground relative overflow-x-hidden min-h-screen`}>
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary opacity-10 blur-[120px]" />
          <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#00e5ff] opacity-10 blur-[120px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-[#ff2d78] opacity-10 blur-[120px]" />
        </div>
        
        <FinanceProvider>
          {children}
          <Toaster />
          <PWARegistration />
        </FinanceProvider>
      </body>
    </html>
  );
}
