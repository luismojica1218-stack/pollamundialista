'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NavBar from '@/components/NavBar';
import CountryFlag from '@/components/CountryFlag';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Calendar, Star } from 'lucide-react';

interface Partido {
  id: number;
  equipo_local: string;
  equipo_visitante: string;
  fase: string;
  inicio_utc: string;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: string;
}

interface Prediccion {
  partido_id: number;
  pred_local: number;
  pred_visitante: number;
  puntos_obtenidos: number;
}

const FASE_NAMES: { [key: string]: string } = {
  grupos: 'Fase de Grupos',
  ronda32: 'Ronda de 32',
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer Puesto',
  final: 'Final'
};

export default function MisPuntosPage() {
  const { token } = useAuth();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [predicciones, setPredicciones] = useState<{ [partidoId: number]: Prediccion }>({});
  const [puntosTorneo, setPuntosTorneo] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch matches, user predictions and tournament predictions
      const [resPartidos, resPreds, resTorneo] = await Promise.all([
        fetch('/api/partidos', { headers }),
        fetch('/api/predicciones', { headers }),
        fetch('/api/predicciones-torneo', { headers })
      ]);

      if (resPartidos.ok && resPreds.ok) {
        const partidosData: Partido[] = await resPartidos.json();
        const predsData: Prediccion[] = await resPreds.json();

        // Only show finished matches
        const finishedPartidos = partidosData.filter(p => p.estado === 'finalizado');
        setPartidos(finishedPartidos);

        const predsMap: { [partidoId: number]: Prediccion } = {};
        predsData.forEach(p => {
          predsMap[p.partido_id] = p;
        });
        setPredicciones(predsMap);
      }

      if (resTorneo.ok) {
        const torneoData = await resTorneo.json();
        setPuntosTorneo(torneoData.puntos_obtenidos || 0);
      }
    } catch (e) {
      console.error('Error fetching points details:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, token]);

  const totalPartidosPuntos = Object.values(predicciones).reduce((acc, p) => acc + p.puntos_obtenidos, 0);
  const totalPuntos = totalPartidosPuntos + puntosTorneo;
  const totalExactos = partidos.filter(p => {
    const pred = predicciones[p.id];
    return pred && pred.pred_local === p.goles_local && pred.pred_visitante === p.goles_visitante;
  }).length;

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-950">
        <NavBar />

        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12">
          {/* Header section with summaries */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 glow-teal">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                Mis Puntos
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Desglose detallado de tus aciertos y puntos acumulados.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass rounded-xl p-5 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    Puntos Totales
                  </span>
                  <span className="text-3xl font-bold text-white font-display">
                    {totalPuntos} <span className="text-sm text-teal-400">pts</span>
                  </span>
                </div>
                <div className="glass rounded-xl p-5 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    Marcadores Exactos
                  </span>
                  <span className="text-3xl font-bold text-teal-400 font-display">
                    {totalExactos}
                  </span>
                </div>
                <div className="glass rounded-xl p-5 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    Bonus de Torneo
                  </span>
                  <span className="text-3xl font-bold text-slate-300 font-display">
                    {puntosTorneo} <span className="text-sm text-slate-400">pts</span>
                  </span>
                </div>
              </div>

              {/* Match breakdown */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white font-display">
                  Partidos Finalizados
                </h2>

                {partidos.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center border border-slate-800 text-slate-400 text-sm">
                    <Calendar className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    Aún no ha finalizado ningún partido del torneo.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {partidos.map(partido => {
                      const pred = predicciones[partido.id];
                      const points = pred ? pred.puntos_obtenidos : 0;
                      
                      const isExact = pred && 
                        pred.pred_local === partido.goles_local && 
                        pred.pred_visitante === partido.goles_visitante;

                      const isWinnerCorrect = pred && (
                        (pred.pred_local > pred.pred_visitante && partido.goles_local! > partido.goles_visitante!) ||
                        (pred.pred_local < pred.pred_visitante && partido.goles_local! < partido.goles_visitante!) ||
                        (pred.pred_local === pred.pred_visitante && partido.goles_local! === partido.goles_visitante!)
                      );

                      return (
                        <div
                          key={partido.id}
                          className="glass rounded-xl p-4 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          {/* Teams & Phase */}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                              {FASE_NAMES[partido.fase]}
                            </span>
                            <div className="flex items-center gap-2 text-sm sm:text-base">
                              <span className="font-semibold text-white truncate">{partido.equipo_local}</span>
                              <CountryFlag teamName={partido.equipo_local} />
                              <span className="text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 mx-1">
                                {partido.goles_local} – {partido.goles_visitante}
                              </span>
                              <CountryFlag teamName={partido.equipo_visitante} />
                              <span className="font-semibold text-white truncate">{partido.equipo_visitante}</span>
                            </div>
                          </div>

                          {/* Prediction info */}
                          <div className="flex items-center gap-6 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-xs text-slate-500 block mb-1">Tu Pronóstico</span>
                              {pred ? (
                                <span className={`text-sm font-bold ${
                                  isExact ? 'text-teal-400' : isWinnerCorrect ? 'text-slate-300' : 'text-slate-500'
                                }`}>
                                  {pred.pred_local} – {pred.pred_visitante}
                                </span>
                              ) : (
                                <span className="text-xs italic text-slate-600">Sin predicción</span>
                              )}
                            </div>

                            {/* Points badge */}
                            <div className="flex items-center justify-center shrink-0">
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold font-display ${
                                points > 0
                                  ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500'
                              }`}>
                                <Trophy className="h-4 w-4 shrink-0" />
                                +{points} pts
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
