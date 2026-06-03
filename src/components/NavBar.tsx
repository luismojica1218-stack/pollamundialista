'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Trophy, LogOut, Menu, X, ShieldAlert, Award, CalendarDays, BarChart3, UserCheck } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();
  const { profile, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Predicciones', href: '/predicciones', icon: CalendarDays },
    { name: 'Predicciones de Torneo', href: '/predicciones-torneo', icon: Award },
    { name: 'Leaderboard', href: '/leaderboard', icon: BarChart3 },
    { name: 'Mis Puntos', href: '/mis-puntos', icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="font-display font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                El Ático
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors ${
                  pathname === '/admin' ? 'ring-1 ring-rose-300' : ''
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                Admin
              </Link>
            )}

            <a
              href="/reglas.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-2"
            >
              Reglas
            </a>
          </nav>

          {/* Right Action Menu */}
          <div className="hidden md:flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-2.5 pl-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                  {profile.nombre_visible?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-900">
                    {profile.nombre_visible}
                  </span>
                  <span className="text-xs text-slate-400">
                    Grupo: {profile.grupo_codigo}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => signOut()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            {profile && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                  {profile.nombre_visible?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{profile.nombre_visible}</p>
                  <p className="text-xs text-slate-400">Grupo: {profile.grupo_codigo}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-semibold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
              >
                <ShieldAlert className="h-5 w-5" />
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
