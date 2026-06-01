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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:bg-teal-500/20 transition-all">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="font-display font-bold tracking-tight text-white group-hover:text-teal-400 transition-colors">
                El Ático
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-teal-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
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
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ${
                  pathname === '/admin' ? 'border-red-500/55 bg-red-500/20' : ''
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>

          {/* Right Action Menu */}
          <div className="hidden md:flex items-center gap-4">
            {profile && (
              <div className="flex flex-col text-right">
                <span className="text-sm font-semibold text-white">
                  {profile.nombre_visible}
                </span>
                <span className="text-xs text-slate-500">
                  Grupo: {profile.grupo_codigo}
                </span>
              </div>
            )}
            
            <button
              onClick={() => signOut()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 py-4 space-y-3">
          <div className="pb-3 border-b border-slate-900 flex items-center justify-between">
            {profile && (
              <div>
                <p className="text-sm font-semibold text-white">{profile.nombre_visible}</p>
                <p className="text-xs text-slate-500">Grupo: {profile.grupo_codigo}</p>
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar Sesión
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-400 font-semibold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors`}
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
