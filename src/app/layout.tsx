import type { Metadata } from 'next';

import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/features/auth/auth-context';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'DoorKart Admin', template: '%s · DoorKart Admin' },
  description: 'DoorKart shop administration',
  // An internal tool: it should never appear in search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
