'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NavBar from '@/components/NavBar';
import CountryFlag from '@/components/CountryFlag';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, Save, CheckCircle2, XCircle, Clock, Trophy, Lock } from 'lucide-react';

interface Partido {
  id: number;
  espn_event_id: string;
  equipo_local: string;
  equipo_visitante: string;
  fase: string;
  inicio_utc: string;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: string;
  cerrado: boolean;
}

interface Prediccion {
  id: number;
  usuario_id: string;
  partido_id: number;
  pred_local: number;
  pred_visitante: number;
  puntos_obtenidos: number;
  actualizado_en: string;
}

const FASE_NAMES: { [key: string]: string } = {
  grupos: 'Fase de Grupos',
  ronda32: 'Ronda de 32',
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer Puesto',
  final: 'Final',
};

// Color accent per phase — gives the bracket a sense of escalating stakes
const FASE_STYLES: { [key: string]: { chip: string; bar: string } } = {
  grupos: { chip: 'bg-slate-100 text-slate-600', bar: 'bg-slate-300' },
  ronda32: { chip: 'bg-sky-100 text-sky-700', bar: 'bg-sky-400' },
  octavos: { chip: 'bg-cyan-100 text-cyan-700', bar: 'bg-cyan-400' },
  cuartos: { chip: 'bg-teal-100 text-teal-700', bar: 'bg-teal-400' },
  semis: { chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  tercer_puesto: { chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  final: { chip: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-400' },
};

export default function PrediccionesPage() {
  const { token } = useAuth();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [predicciones, setPredicciones] = useState<{ [partidoId: number]: Prediccion }>({});
  const [localScores, setLocalScores] = useState<{ [partidoId: number]: { local: string; visitante: string } }>({});
  const [savingStates, setSavingStates] = useState<{ [partidoId: number]: 'idle' | 'saving' | 'saved' | 'error' }>({});
  const [loading, setLoading] = useState(true);
  const [faseFilter, setFaseFilter] = useState<string>('todas');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resPartidos, resPreds] = await Promise.all([
        fetch('/api/partidos', { headers }),
        fetch('/api/predicciones', { headers }),
      ]);

      if (resPartidos.ok && resPreds.ok) {
        const partidosData: Partido[] = await resPartidos.json();
        const predsData: Prediccion[] = await resPreds.json();
        setPartidos(partidosData);

        const predsMap: { [partidoId: number]: Prediccion } = {};
        const localScoresMap: { [partidoId: number]: { local: string; visitante: string } } = {};
        predsData.forEach((p) => {
          predsMap[p.partido_id] = p;
          localScoresMap[p.partido_id] = {
            local: p.pred_local.toString(),
            visitante: p.pred_visitante.toString(),
          };
        });
        setPredicciones(predsMap);
        setLocalScores(localScoresMap);
      }
    } catch (e) {
      console.error('Error fetching matches/predictions:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [fetchData, token]);

  const handleScoreChange = (partidoId: number, team: 'local' | 'visitante', val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setLocalScores((prev) => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [team]: cleaned },
    }));
    if (savingStates[partidoId] === 'saved') {
      setSavingStates((prev) => ({ ...prev, [partidoId]: 'idle' }));
    }
  };

  const handleSave = async (partidoId: number) => {
    const scores = localScores[partidoId];
    if (!scores || scores.local === '' || scores.visitante === '') return;
    setSavingStates((prev) => ({ ...prev, [partidoId]: 'saving' }));
    try {
      if (!token) {
        setSavingStates((prev) => ({ ...prev, [partidoId]: 'error' }));
        return;
      }
      const response = await fetch('/api/predicciones', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partido_id: partidoId,
          pred_local: parseInt(scores.local, 10),
          pred_visitante: parseInt(scores.visitante, 10),
        }),
      });
      if (response.ok) {
        const savedPred: Prediccion = await response.json();
        setPredicciones((prev) => ({ ...prev, [partidoId]: savedPred }));
        setSavingStates((prev) => ({ ...prev, [partidoId]: 'saved' }));
      } else {
        setSavingStates((prev) => ({ ...prev, [partidoId]: 'error' }));
      }
    } catch (e) {
      console.error(e);
      setSavingStates((prev) => ({ ...prev, [partidoId]: 'error' }));
    }
  };

  const getDeadlineInfo = (inicioUtc: string) => {
    const inicio = new Date(inicioUtc);
    const deadline = new Date(inicio.getTime() - 30 * 60 * 1000);
    const diffMs = deadline.getTime() - currentTime.getTime();
    const formattedDeadline = deadline.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    if (diffMs <= 0) return { closed: true, text: 'Cerrada' };
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    let countdown = '';
    if (diffHrs < 24) countdown = `Cierra en ${diffHrs}h ${diffMins}m`;
    else countdown = `Cierra el ${formattedDeadline}`;
    return { closed: false, text: countdown };
  };

  const filteredPartidos = partidos.filter((p) => faseFilter === 'todas' || p.fase === faseFilter);

  // Stats for the summary header
  const totalPts = Object.values(predicciones).reduce((s, p) => s + (p.puntos_obtenidos || 0), 0);
  const hechas = Object.keys(predicciones).length;

  const groupedPartidos: { [dateStr: string]: Partido[] } = {};
  filteredPartidos.forEach((p) => {
    const localDate = new Date(p.inicio_utc).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const capitalized = localDate.charAt(0).toUpperCase() + localDate.slice(1);
    if (!groupedPartidos[capitalized]) groupedPartidos[capitalized] = [];
    groupedPartidos[capitalized].push(p);
  });

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <NavBar />

        <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero header card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl shadow-emerald-600/20 mb-8">
            <div className="absolute -right-8 -top-8 opacity-10">
              <Trophy className="h-44 w-44" />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <CalendarDays className="h-3.5 w-3.5" /> Copa Mundial FIFA 2026
              </span>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight font-display">
                Tus Predicciones
              </h1>
              <p className="mt-1.5 text-sm text-emerald-50/90 max-w-lg leading-relaxed">
                Pronostica los 104 partidos. Puedes sobreescribir tus resultados tantas veces como quieras hasta exactamente <strong>30 minutos antes</strong> del pitazo inicial de cada encuentro.
              </p>
              <div className="mt-5 flex gap-3">
                <div className="rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur">
                  <p className="text-2xl font-extrabold font-display leading-none">{hechas}</p>
                  <p className="text-[11px] uppercase tracking-wider text-emerald-50/80 mt-1">Predicciones</p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur">
                  <p className="text-2xl font-extrabold font-display leading-none">{totalPts}</p>
                  <p className="text-[11px] uppercase tracking-wider text-emerald-50/80 mt-1">Puntos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFaseFilter('todas')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                faseFilter === 'todas'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              Todas
            </button>
            {Object.entries(FASE_NAMES).map(([code, name]) => (
              <button
                key={code}
                onClick={() => setFaseFilter(code)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  faseFilter === code
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : partidos.length === 0 ? (
            <div className="card rounded-3xl p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 mb-4">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No hay partidos cargados</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Pídele al administrador que sincronice los partidos desde la API de ESPN en el panel de control.
              </p>
            </div>
          ) : (
            <div className="space-y-9">
              {Object.entries(groupedPartidos).map(([dateStr, datePartidos]) => (
                <div key={dateStr} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 font-display">
                      {dateStr}
                    </h3>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs font-semibold text-slate-400">
                      {datePartidos.length} partido{datePartidos.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {datePartidos.map((partido) => {
                      const dl = getDeadlineInfo(partido.inicio_utc);
                      const isClosed = partido.cerrado || dl.closed;
                      const pred = predicciones[partido.id];
                      const localVal = localScores[partido.id]?.local ?? '';
                      const visitanteVal = localScores[partido.id]?.visitante ?? '';
                      const saving = savingStates[partido.id] || 'idle';
                      const fase = FASE_STYLES[partido.fase] || FASE_STYLES.grupos;
                      const enJuego = partido.estado === 'en_juego';
                      const finalizado = partido.estado === 'finalizado';

                      const isModified = pred
                        ? pred.pred_local.toString() !== localVal || pred.pred_visitante.toString() !== visitanteVal
                        : localVal !== '' && visitanteVal !== '';

                      const localTimeStr = new Date(partido.inicio_utc).toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit',
                      });

                      const ScoreController = ({ team, value }: { team: 'local' | 'visitante'; value: string }) => {
                        const step = (amount: number) => {
                          let current = parseInt(value, 10);
                          if (isNaN(current)) current = 0;
                          handleScoreChange(partido.id, team, Math.max(0, current + amount).toString());
                        };
                        return (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button" disabled={isClosed} onClick={() => step(-1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-lg font-bold select-none cursor-pointer"
                            >−</button>
                            <input
                              type="text" inputMode="numeric" maxLength={2} disabled={isClosed} value={value}
                              onChange={(e) => handleScoreChange(partido.id, team, e.target.value)}
                              className={`w-11 h-11 text-center font-extrabold text-lg rounded-xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/15 ${
                                isClosed
                                  ? 'border-slate-200 bg-slate-50 text-slate-400'
                                  : isModified
                                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/40'
                                  : 'border-slate-200 text-slate-900 bg-white'
                              }`}
                              placeholder="–"
                            />
                            <button
                              type="button" disabled={isClosed} onClick={() => step(1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-lg font-bold select-none cursor-pointer"
                            >+</button>
                          </div>
                        );
                      };

                      return (
                        <div
                          key={partido.id}
                          className={`card card-hover relative overflow-hidden rounded-2xl p-5 ${isClosed ? 'opacity-95' : ''}`}
                        >
                          {/* phase color bar */}
                          <div className={`absolute left-0 top-0 h-full w-1 ${fase.bar}`} />

                          {/* Top row */}
                          <div className="flex items-center justify-between mb-4 pl-1">
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${fase.chip}`}>
                              {FASE_NAMES[partido.fase]} · {localTimeStr}
                            </span>
                            {enJuego ? (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                                <span className="h-2 w-2 rounded-full bg-rose-500 live-dot" /> EN VIVO
                              </span>
                            ) : (
                              <span className={`flex items-center gap-1 text-xs font-semibold ${isClosed ? 'text-slate-400' : 'text-slate-500'}`}>
                                {isClosed ? <Lock className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                {dl.text}
                              </span>
                            )}
                          </div>

                          {/* Teams + score */}
                          <div className="flex items-center gap-3 pl-1">
                            <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                              <span className="font-bold text-slate-900 block text-[15px] truncate">{partido.equipo_local}</span>
                              <CountryFlag teamName={partido.equipo_local} />
                            </div>
                            <ScoreController team="local" value={localVal} />
                            <span className="text-slate-300 font-bold">:</span>
                            <ScoreController team="visitante" value={visitanteVal} />
                            <div className="flex-1 min-w-0 flex items-center justify-start gap-2">
                              <CountryFlag teamName={partido.equipo_visitante} />
                              <span className="font-bold text-slate-900 block text-[15px] truncate">{partido.equipo_visitante}</span>
                            </div>
                          </div>

                          {/* Bottom row */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs pl-1 min-h-[34px]">
                            <div>
                              {finalizado ? (
                                <span className="flex items-center gap-1.5 text-slate-500">
                                  Resultado:
                                  <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {partido.goles_local} – {partido.goles_visitante}
                                  </span>
                                </span>
                              ) : enJuego ? (
                                <span className="font-semibold text-rose-600">
                                  {partido.goles_local ?? 0} – {partido.goles_visitante ?? 0} (en juego)
                                </span>
                              ) : (
                                <span className="text-slate-400">Aún sin jugar</span>
                              )}
                            </div>

                            <div>
                              {isClosed ? (
                                pred && finalizado && (
                                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                    <Trophy className="h-3.5 w-3.5" />
                                    +{pred.puntos_obtenidos} pts
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-2">
                                  {saving === 'saving' && (
                                    <span className="text-slate-400 flex items-center gap-1 text-xs">
                                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                                      Guardando
                                    </span>
                                  )}
                                  {((saving === 'saved' || pred) && !isModified && saving !== 'saving') && (
                                    <span className="text-emerald-600 flex items-center gap-1 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 shadow-sm">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Guardado
                                    </span>
                                  )}
                                  {saving === 'error' && (
                                    <span className="text-rose-500 flex items-center gap-1 font-semibold">
                                      <XCircle className="h-4 w-4" /> Error
                                    </span>
                                  )}
                                  {isModified && (
                                    <button
                                      onClick={() => handleSave(partido.id)}
                                      disabled={saving === 'saving' || localVal === '' || visitanteVal === ''}
                                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      <Save className="h-3.5 w-3.5" /> Guardar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
