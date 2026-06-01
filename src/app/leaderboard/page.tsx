'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trophy, Award, RefreshCw, Star, User } from 'lucide-react';

interface LeaderboardEntry {
  usuario_id: string;
  nombre_visible: string;
  puntos_totales: number;
  marcadores_exactos: number;
}

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch('/api/leaderboard', { headers });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime changes in 'predicciones' table
    const predictionsChannel = supabase
      .channel('realtime-leaderboard-predictions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predicciones' },
        (payload) => {
          console.log('Realtime change detected in predictions:', payload);
          fetchLeaderboard();
        }
      )
      .subscribe();

    // Subscribe to realtime changes in 'predicciones_torneo' table
    const tournamentChannel = supabase
      .channel('realtime-leaderboard-tournament')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predicciones_torneo' },
        (payload) => {
          console.log('Realtime change detected in tournament predictions:', payload);
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(predictionsChannel);
      supabase.removeChannel(tournamentChannel);
    };
  }, [fetchLeaderboard]);

  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-950">
        <NavBar />

        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 glow-teal">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                  Tabla de Posiciones
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Clasificación en vivo. En caso de empate, define el mayor número de marcadores exactos.
                </p>
              </div>
            </div>

            {/* Last updated indicator */}
            <div className="flex items-center gap-3 text-xs text-slate-400 self-start sm:self-center">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping"></span>
                <span>En vivo. Actualizado: {formatLastUpdated()}</span>
              </span>
              <button
                onClick={() => fetchLeaderboard(true)}
                disabled={refreshing}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title="Actualizar manualmente"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-slate-800">
              <User className="mx-auto h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No hay participantes registrados</h3>
              <p className="text-sm text-slate-400">
                Los usuarios aparecerán en la tabla cuando se registren y comiencen a jugar.
              </p>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-4 px-6 text-center w-16">Puesto</th>
                      <th className="py-4 px-6">Participante</th>
                      <th className="py-4 px-6 text-center">Marcadores Exactos</th>
                      <th className="py-4 px-6 text-right pr-8">Puntos Totales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {leaderboard.map((entry, idx) => {
                      const isMe = profile && profile.id === entry.usuario_id;
                      const position = idx + 1;
                      
                      // Highlight positions
                      let posBadge = '';
                      if (position === 1) {
                        posBadge = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                      } else if (position === 2) {
                        posBadge = 'text-slate-300 bg-slate-100/10 border-slate-100/20';
                      } else if (position === 3) {
                        posBadge = 'text-amber-600 bg-amber-700/10 border-amber-700/20';
                      } else {
                        posBadge = 'text-slate-400 bg-slate-900 border-slate-800/50';
                      }

                      return (
                        <tr
                          key={entry.usuario_id}
                          className={`transition-colors ${
                            isMe
                              ? 'bg-teal-500/5 hover:bg-teal-500/10'
                              : 'hover:bg-slate-900/30'
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center justify-center font-display font-bold text-xs h-6 w-6 rounded-full border ${posBadge}`}>
                              {position}
                            </span>
                          </td>

                          {/* User Display Name */}
                          <td className="py-4 px-6 font-medium text-white">
                            <span className="flex items-center gap-2">
                              {entry.nombre_visible}
                              {isMe && (
                                <span className="inline-flex items-center gap-1 rounded bg-teal-400/10 px-1.5 py-0.5 text-[10px] font-bold text-teal-400 border border-teal-400/20">
                                  Tú
                                </span>
                              )}
                              {position === 1 && (
                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400/20 shrink-0" />
                              )}
                            </span>
                          </td>

                          {/* Exact matches count */}
                          <td className="py-4 px-6 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs text-slate-300 border border-slate-800">
                              <Award className="h-3.5 w-3.5 text-teal-400" />
                              {entry.marcadores_exactos}
                            </span>
                          </td>

                          {/* Total points */}
                          <td className="py-4 px-6 text-right pr-8 font-bold font-display text-base text-white">
                            <span className={`${isMe ? 'text-teal-400' : ''}`}>
                              {entry.puntos_totales} pts
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
