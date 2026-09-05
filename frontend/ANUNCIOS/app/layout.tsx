// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/hooks/useAuth';

export const metadata: Metadata = {
  title: 'Bolsa de Trabajo',
  description: 'Encuentra tu próximo empleo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}