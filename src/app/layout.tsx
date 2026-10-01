import type { Metadata } from 'next';
import { DM_Mono, DM_Sans, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import { FinanceProvider } from '@/contexts/finance-context';
import { Toaster } from '@/components/ui/toaster';
import { MotionPreferences } from '@/components/motion-preferences';
import { PWARegistration } from '@/components/pwa-registration';
import { VisibleViewport } from '@/components/visible-viewport';
import { BalanceVisibilityProvider } from '@/contexts/balance-visibility-context';
import { BALANCE_VISIBILITY_STORAGE_KEY } from '@/domain/local-security';
import { AppLockProvider } from '@/contexts/app-lock-context';
import { AppLockGate } from '@/components/security/app-lock-gate';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
});
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});


export const metadata: Metadata = {
  title: 'Prisma',
  description: 'Finanzas personales privadas, con datos guardados en tu dispositivo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'production' && <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'" />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.balancesHidden=localStorage.getItem('${BALANCE_VISIBILITY_STORAGE_KEY}')==='1'?'true':'false'}catch{document.documentElement.dataset.balancesHidden='false'}` }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f5f4ef" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Prisma" />
      </head>
      <body className={`${dmSans.variable} ${dmSerif.variable} ${dmMono.variable} font-body bg-background text-foreground relative min-h-screen overflow-x-hidden`}>
        <VisibleViewport />
        {/* Background Gradients */}
        <div className="ambient-background fixed inset-0 pointer-events-none -z-10">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary opacity-10 blur-[120px]" />
          <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#00e5ff] opacity-10 blur-[120px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-[#ff2d78] opacity-10 blur-[120px]" />
        </div>
        
        <MotionPreferences>
          <BalanceVisibilityProvider>
            <AppLockProvider>
              <AppLockGate>
                <FinanceProvider>
                  {children}
                  <Toaster />
                  <PWARegistration />
                </FinanceProvider>
              </AppLockGate>
            </AppLockProvider>
          </BalanceVisibilityProvider>
        </MotionPreferences>
      </body>
    </html>
  );
}
