'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Trophy, CalendarDays, Award, Star, ArrowRight, BarChart3, Users, Key } from 'lucide-react';

export default function Home() {
  const { profile, loading } = useAuth();
  const [groupCode, setGroupCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = groupCode.trim().toLowerCase();
    if (!cleanCode) {
      setError('Por favor ingresa un código de grupo');
      return;
    }
    setError('');
    router.push(`/login?group=${cleanCode}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-slate-950">
      {/* Premium Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Trophy className="h-5 w-5" />
            </div>
            <span className="font-display font-bold tracking-tight text-white">
              El Ático
            </span>
          </div>

          <nav className="flex items-center gap-4">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
            ) : profile ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-sm text-slate-400">
                  Grupo: <span className="text-teal-400 font-semibold">{profile.grupo_codigo}</span> | <span className="text-white font-semibold">{profile.nombre_visible}</span>
                </span>
                <Link
                  href="/predicciones"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer font-display"
                >
                  Mi Panel <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Entrar a un Grupo
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-900/60">
          <div className="absolute top-0 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse delay-1000"></div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400 border border-teal-500/20 mb-6">
              <Trophy className="h-3.5 w-3.5" /> Copa Mundial FIFA 2026
            </span>
            
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display max-w-3xl mx-auto leading-tight">
              El Ático <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                Polla Mundialista
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
              Compite en un grupo cerrado con tus amigos prediciendo los marcadores del mundial. Totalmente simplificado: sin registros de correo ni contraseñas complejas. ¡Solo ingresa el código de tu grupo, elige tu nombre y empieza a pronosticar!
            </p>

            {/* Group Access Card (Interactive & Responsive) */}
            <div className="mt-10 max-w-md mx-auto px-4">
              {profile ? (
                <div className="glass rounded-2xl p-6 border border-teal-500/20 shadow-xl bg-teal-950/5">
                  <p className="text-sm text-slate-300 mb-4">
                    Ya estás conectado al grupo <span className="font-bold text-teal-400 uppercase">{profile.grupo_codigo}</span> como <span className="font-bold text-white">{profile.nombre_visible}</span>.
                  </p>
                  <Link
                    href="/predicciones"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-400 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer font-display shadow-lg shadow-teal-500/10"
                  >
                    Ir a mis Predicciones
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleGroupSubmit} className="glass rounded-2xl p-6 border border-slate-800 shadow-2xl text-left bg-slate-900/20">
                  <h3 className="text-md font-semibold text-white mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-400" /> Ingresar a una Polla
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Escribe el código de tu grupo (ej: <code>el-atico</code>). Si el grupo no existe, se creará automáticamente para ti y tus amigos.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={groupCode}
                        onChange={(e) => setGroupCode(e.target.value)}
                        placeholder="Código del grupo..."
                        className="w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-white placeholder-slate-600"
                        maxLength={20}
                      />
                      <Key className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                    </div>
                    {error && (
                      <p className="text-xs text-rose-500 font-semibold px-1">{error}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-400 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer font-display shadow-lg shadow-teal-500/10"
                    >
                      Entrar al Grupo
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Scoring Rules Section */}
        <section className="py-16 sm:py-24 bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
                Reglas de Puntuación
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">
                Así es como sumas puntos en cada uno de los 104 partidos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1: Puntos Base */}
              <div className="glass rounded-2xl p-6 border border-slate-800/80 shadow-lg bg-slate-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-4">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-display mb-3">Puntos Por Partido</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start justify-between">
                    <span>Acertar resultado (1/X/2)</span>
                    <span className="font-bold text-teal-400">3 pts</span>
                  </li>
                  <li className="flex items-start justify-between">
                    <span>Acertar marcador exacto</span>
                    <span className="font-bold text-teal-400">+5 pts</span>
                  </li>
                  <li className="flex items-start justify-between">
                    <span>Goles del equipo local</span>
                    <span className="font-bold text-teal-400">+1 pt</span>
                  </li>
                  <li className="flex items-start justify-between">
                    <span>Goles del equipo visitante</span>
                    <span className="font-bold text-teal-400">+1 pt</span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-900 text-xs text-slate-500">
                  Nota: ¡Un marcador exacto acertado en fase de grupos otorga un total de 10 puntos!
                </div>
              </div>

              {/* Card 2: Multiplicadores */}
              <div className="glass rounded-2xl p-6 border border-slate-800/80 shadow-lg bg-slate-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-4">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-display mb-3">Multiplicadores de Fase</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex justify-between">
                    <span>Fase de Grupos</span>
                    <span className="font-semibold text-white">x1</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Ronda de 32</span>
                    <span className="font-semibold text-white">x1.5</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Octavos de Final</span>
                    <span className="font-semibold text-white">x2</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Cuartos de Final</span>
                    <span className="font-semibold text-white">x2.5</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Semifinales</span>
                    <span className="font-semibold text-white">x3</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Final y 3er Puesto</span>
                    <span className="font-semibold text-white">x4</span>
                  </li>
                </ul>
              </div>

              {/* Card 3: Bonus del Torneo */}
              <div className="glass rounded-2xl p-6 border border-slate-800/80 shadow-lg bg-slate-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-4">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-display mb-3">Bonus del Torneo</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex justify-between">
                    <span>Selección Campeona</span>
                    <span className="font-bold text-teal-400">25 pts</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Mejor Jugador (Balón de Oro)</span>
                    <span className="font-bold text-teal-400">15 pts</span>
                  </li>
                </ul>
                <div className="mt-6 p-3 rounded bg-teal-500/5 border border-teal-500/10 text-xs text-slate-400 flex gap-2">
                  <Star className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>Los bonus se definen antes de que empiece la fase de eliminación directa (Octavos de final).</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} El Ático — Polla Mundialista. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
