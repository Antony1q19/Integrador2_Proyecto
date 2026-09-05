// features/shared/components/Navbar.tsx
//
// Navbar global de la app (montado en app/layout.tsx). Se auto-oculta en
// /login, que ya tiene su propio layout centrado y minimalista.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import SesionMenu from './SesionMenu';

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 md:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-800 text-white">
            <Briefcase size={16} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            Postula Ya
          </span>
        </Link>

        <SesionMenu />
      </div>
    </header>
  );
}
