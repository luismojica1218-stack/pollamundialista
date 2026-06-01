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
  const { profile, token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    if (!token) return;
    try {
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
  }, [token]);

  useEffect(() => {
    if (token) {
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
    }
  }, [token, fetchLeaderboard]);

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

        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 glow-teal shrink-0">
                <Trophy className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                  Clasificación
                </h1>
                <p className="text-xs sm:text-sm text-slate-405 mt-0.5">
                  Grupo: <span className="text-teal-400 font-semibold uppercase">{profile?.grupo_codigo}</span>
                </p>
              </div>
            </div>

            {/* Last updated / refresh button */}
            <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-slate-400 self-stretch sm:self-center bg-slate-900/10 border border-slate-900 rounded-xl p-2.5 sm:p-0 sm:bg-transparent sm:border-0">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping"></span>
                <span>Actualizado: {formatLastUpdated()}</span>
              </span>
              <button
                onClick={() => fetchLeaderboard(true)}
                disabled={refreshing}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 text-slate-450 hover:bg-slate-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
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
            <div className="glass rounded-2xl p-12 text-center border border-slate-800 bg-slate-900/10">
              <User className="mx-auto h-12 w-12 text-slate-650 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No hay participantes registrados</h3>
              <p className="text-sm text-slate-400">
                Los usuarios aparecerán en la tabla cuando configuren sus predicciones.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (sm and up) */}
              <div className="hidden sm:block glass rounded-2xl border border-slate-800/85 shadow-2xl overflow-hidden bg-slate-900/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                                ? 'bg-teal-500/5 hover:bg-teal-500/10 border-l-2 border-l-teal-500'
                                : 'hover:bg-slate-900/30'
                            }`}
                          >
                            <td className="py-4 px-6 text-center">
                              <span className={`inline-flex items-center justify-center font-display font-bold text-xs h-6 w-6 rounded-full border ${posBadge}`}>
                                {position}
                              </span>
                            </td>

                            <td className="py-4 px-6 font-medium text-white">
                              <span className="flex items-center gap-2">
                                {entry.nombre_visible}
                                {isMe && (
                                  <span className="inline-flex items-center gap-1 rounded bg-teal-400/10 px-1.5 py-0.5 text-[9px] font-bold text-teal-400 border border-teal-400/20">
                                    Tú
                                  </span>
                                )}
                                {position === 1 && (
                                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400/20 shrink-0" />
                                )}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs text-slate-300 border border-slate-800">
                                <Award className="h-3.5 w-3.5 text-teal-400" />
                                {entry.marcadores_exactos}
                              </span>
                            </td>

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

              {/* MOBILE STACKED CARDS VIEW (< sm) */}
              <div className="block sm:hidden space-y-3 px-1">
                {leaderboard.map((entry, idx) => {
                  const isMe = profile && profile.id === entry.usuario_id;
                  const position = idx + 1;

                  let posBadge = '';
                  if (position === 1) {
                    posBadge = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                  } else if (position === 2) {
                    posBadge = 'text-slate-300 bg-slate-100/10 border-slate-100/20';
                  } else if (position === 3) {
                    posBadge = 'text-amber-600 bg-amber-700/10 border-amber-700/20';
                  } else {
                    posBadge = 'text-slate-450 bg-slate-950 border-slate-900';
                  }

                  return (
                    <div
                      key={entry.usuario_id}
                      className={`glass rounded-xl p-4 border transition-all flex items-center justify-between gap-3 ${
                        isMe
                          ? 'border-teal-500/30 bg-teal-500/5 shadow-md shadow-teal-500/5'
                          : 'border-slate-850/80 bg-slate-900/10'
                      }`}
                    >
                      {/* Rank & Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex items-center justify-center font-display font-bold text-xs h-6 w-6 rounded-full border shrink-0 ${posBadge}`}>
                          {position}
                        </span>
                        
                        <div className="min-w-0">
                          <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                            <span className="truncate">{entry.nombre_visible}</span>
                            {isMe && (
                              <span className="inline-flex items-center gap-1 rounded bg-teal-400/10 px-1 py-0.5 text-[8px] font-bold text-teal-400 border border-teal-400/20 shrink-0">
                                Tú
                              </span>
                            )}
                            {position === 1 && (
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400/20 shrink-0" />
                            )}
                          </span>
                          
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <Award className="h-3 w-3 text-teal-500" />
                            <span>{entry.marcadores_exactos} exactos</span>
                          </div>
                        </div>
                      </div>

                      {/* Total points */}
                      <div className="text-right shrink-0">
                        <div className={`font-display font-bold text-base ${isMe ? 'text-teal-400' : 'text-white'}`}>
                          {entry.puntos_totales}
                        </div>
                        <span className="text-[9px] text-slate-500">puntos</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
