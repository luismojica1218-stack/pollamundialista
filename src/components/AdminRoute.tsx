'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, ArrowRight } from 'lucide-react';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/predicciones');
      } else {
        // Verificar si ya fue autorizado en esta sesión
        const isVerified = sessionStorage.getItem('admin_pin_verified') === 'true';
        if (isVerified) {
          setPinVerified(true);
        }
      }
    }
  }, [profile, loading, isAdmin, router]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1218') {
      sessionStorage.setItem('admin_pin_verified', 'true');
      setPinVerified(true);
      setError(false);
    } else {
      setError(true);
      setPin('');
      // Reset error state animation trigger
      setTimeout(() => setError(false), 500);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!profile || !isAdmin) {
    return null; // Redireccionará en el useEffect
  }

  if (!pinVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden text-center">
          {/* Luz difusa decorativa roja */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Lock className="h-6 w-6" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold font-display text-white">
                Acceso Restringido
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa el PIN de seguridad del Administrador
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div className="space-y-1">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={4}
                className={`block w-full px-4 py-3 bg-slate-950 border rounded-xl text-white text-center font-bold text-2xl tracking-widest focus:outline-none focus:ring-2 transition-all ${
                  error 
                    ? 'border-red-500 ring-2 ring-red-500/20 animate-shake' 
                    : 'border-slate-800 focus:ring-red-500/50 focus:border-red-500'
                }`}
                autoFocus
              />
              {error && (
                <p className="text-[10px] text-red-400 font-semibold mt-1">
                  PIN incorrecto. Intenta de nuevo.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold transition-all shadow-lg shadow-red-500/10 cursor-pointer text-sm"
            >
              <span>Verificar PIN</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
