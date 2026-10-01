// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/hooks/useAuth';
import Navbar from '@/features/shared/components/Navbar';

// Misma fuente que el ERP (ver app/globals.css).
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  // Cada página pone su título ("Iniciar sesión") y queda "Iniciar sesión | Postula Ya".
  title: { default: 'Postula Ya', template: '%s | Postula Ya' },
  description: 'Encuentra tu próximo empleo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}