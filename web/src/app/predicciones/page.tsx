'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase';
import { CalendarDays, Save, CheckCircle2, XCircle, AlertCircle, Clock, Trophy } from 'lucide-react';

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
  final: 'Final'
};

export default function PrediccionesPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [predicciones, setPredicciones] = useState<{ [partidoId: number]: Prediccion }>({});
  const [localScores, setLocalScores] = useState<{ [partidoId: number]: { local: string; visitante: string } }>({});
  const [savingStates, setSavingStates] = useState<{ [partidoId: number]: 'idle' | 'saving' | 'saved' | 'error' }>({});
  const [loading, setLoading] = useState(true);
  const [faseFilter, setFaseFilter] = useState<string>('todas');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Tick current time every minute for countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch matches and user predictions in parallel
      const [resPartidos, resPreds] = await Promise.all([
        fetch('/api/partidos', { headers }),
        fetch('/api/predicciones', { headers })
      ]);

      if (resPartidos.ok && resPreds.ok) {
        const partidosData: Partido[] = await resPartidos.json();
        const predsData: Prediccion[] = await resPreds.json();

        setPartidos(partidosData);

        // Convert predictions to map
        const predsMap: { [partidoId: number]: Prediccion } = {};
        const localScoresMap: { [partidoId: number]: { local: string; visitante: string } } = {};

        predsData.forEach(p => {
          predsMap[p.partido_id] = p;
          localScoresMap[p.partido_id] = {
            local: p.pred_local.toString(),
            visitante: p.pred_visitante.toString()
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScoreChange = (partidoId: number, team: 'local' | 'visitante', val: string) => {
    // Only allow positive digits
    const cleaned = val.replace(/\D/g, '');
    
    setLocalScores(prev => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        [team]: cleaned
      }
    }));

    // Reset saving state when typing
    if (savingStates[partidoId] === 'saved') {
      setSavingStates(prev => ({ ...prev, [partidoId]: 'idle' }));
    }
  };

  const handleSave = async (partidoId: number) => {
    const scores = localScores[partidoId];
    if (!scores || scores.local === '' || scores.visitante === '') {
      return;
    }

    setSavingStates(prev => ({ ...prev, [partidoId]: 'saving' }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch('/api/predicciones', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partido_id: partidoId,
          pred_local: parseInt(scores.local, 10),
          pred_visitante: parseInt(scores.visitante, 10)
        })
      });

      if (response.ok) {
        const savedPred: Prediccion = await response.json();
        setPredicciones(prev => ({ ...prev, [partidoId]: savedPred }));
        setSavingStates(prev => ({ ...prev, [partidoId]: 'saved' }));
      } else {
        setSavingStates(prev => ({ ...prev, [partidoId]: 'error' }));
      }
    } catch (e) {
      console.error(e);
      setSavingStates(prev => ({ ...prev, [partidoId]: 'error' }));
    }
  };

  // Helper to format deadline and remaining time
  const getDeadlineInfo = (inicioUtc: string) => {
    const inicio = new Date(inicioUtc);
    const deadline = new Date(inicio.getTime() - 60 * 60 * 1000); // 1 hour before
    const diffMs = deadline.getTime() - currentTime.getTime();
    
    const formattedDeadline = deadline.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (diffMs <= 0) {
      return { closed: true, text: 'Predicciones cerradas' };
    }

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdown = '';
    if (diffHrs < 24) {
      countdown = ` (Cierra en ${diffHrs}h ${diffMins}m)`;
    } else {
      const diffDays = Math.floor(diffHrs / 24);
      countdown = ` (Cierra en ${diffDays}d)`;
    }

    return { closed: false, text: `Cierre: ${formattedDeadline}${countdown}` };
  };

  const filteredPartidos = partidos.filter(p => {
    if (faseFilter === 'todas') return true;
    return p.fase === faseFilter;
  });

  // Group filtered matches by date (local day)
  const groupedPartidos: { [dateStr: string]: Partido[] } = {};
  filteredPartidos.forEach(p => {
    const localDate = new Date(p.inicio_utc).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    // Capitalize day of the week
    const capitalized = localDate.charAt(0).toUpperCase() + localDate.slice(1);
    if (!groupedPartidos[capitalized]) {
      groupedPartidos[capitalized] = [];
    }
    groupedPartidos[capitalized].push(p);
  });

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-950">
        <NavBar />

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white font-display">
                Tus Predicciones
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Guarda tus pronósticos para los 104 partidos del Mundial. Se bloquean 1 hora antes de cada inicio.
              </p>
            </div>

            {/* Filter tags */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFaseFilter('todas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  faseFilter === 'todas'
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              {Object.entries(FASE_NAMES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setFaseFilter(code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    faseFilter === code
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            </div>
          ) : partidos.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-slate-800">
              <CalendarDays className="mx-auto h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No hay partidos cargados</h3>
              <p className="text-sm text-slate-400">
                Pídele al administrador que sincronice los partidos desde la API de ESPN en el panel de control.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedPartidos).map(([dateStr, datePartidos]) => (
                <div key={dateStr} className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-teal-400 font-display border-l-2 border-teal-500 pl-3">
                    {dateStr}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {datePartidos.map(partido => {
                      const dl = getDeadlineInfo(partido.inicio_utc);
                      const isClosed = partido.cerrado || dl.closed;
                      const pred = predicciones[partido.id];
                      const localVal = localScores[partido.id]?.local ?? '';
                      const visitanteVal = localScores[partido.id]?.visitante ?? '';
                      const saving = savingStates[partido.id] || 'idle';
                      
                      const isModified = pred 
                        ? (pred.pred_local.toString() !== localVal || pred.pred_visitante.toString() !== visitanteVal)
                        : (localVal !== '' && visitanteVal !== '');

                      const localTimeStr = new Date(partido.inicio_utc).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={partido.id}
                          className={`glass rounded-xl p-5 border transition-all ${
                            isClosed
                              ? 'border-slate-900 bg-slate-950/40 opacity-90'
                              : 'border-slate-800/80 hover:border-slate-700/80'
                          }`}
                        >
                          {/* Top row: time/fase and status */}
                          <div className="flex items-center justify-between mb-4 text-xs">
                            <span className="text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800/60">
                              {FASE_NAMES[partido.fase]} • {localTimeStr}
                            </span>
                            
                            <span className={`flex items-center gap-1 font-medium ${
                              isClosed ? 'text-red-400' : 'text-slate-400'
                            }`}>
                              <Clock className="h-3.5 w-3.5" />
                              {dl.text}
                            </span>
                          </div>

                          {/* Middle row: Match teams and inputs */}
                          <div className="flex items-center justify-between gap-4">
                            {/* Local Team */}
                            <div className="flex-1 text-right">
                              <span className="font-semibold text-white block text-sm sm:text-base truncate">
                                {partido.equipo_local}
                              </span>
                            </div>

                            {/* Inputs / Score */}
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="text"
                                maxLength={2}
                                disabled={isClosed}
                                value={localVal}
                                onChange={(e) => handleScoreChange(partido.id, 'local', e.target.value)}
                                className={`w-12 h-12 text-center font-bold text-lg rounded-lg bg-slate-900/90 border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                                  isClosed
                                    ? 'border-slate-800 text-slate-500'
                                    : isModified
                                    ? 'border-teal-500 text-teal-400 ring-1 ring-teal-500/20'
                                    : 'border-slate-800 text-white'
                                }`}
                                placeholder="-"
                              />
                              
                              <span className="text-slate-600 font-bold">:</span>
                              
                              <input
                                type="text"
                                maxLength={2}
                                disabled={isClosed}
                                value={visitanteVal}
                                onChange={(e) => handleScoreChange(partido.id, 'visitante', e.target.value)}
                                className={`w-12 h-12 text-center font-bold text-lg rounded-lg bg-slate-900/90 border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                                  isClosed
                                    ? 'border-slate-800 text-slate-500'
                                    : isModified
                                    ? 'border-teal-500 text-teal-400 ring-1 ring-teal-500/20'
                                    : 'border-slate-800 text-white'
                                }`}
                                placeholder="-"
                              />
                            </div>

                            {/* Visitante Team */}
                            <div className="flex-1 text-left">
                              <span className="font-semibold text-white block text-sm sm:text-base truncate">
                                {partido.equipo_visitante}
                              </span>
                            </div>
                          </div>

                          {/* Bottom Row: Actions or match results */}
                          <div className="mt-4 pt-3 border-t border-slate-900/50 flex items-center justify-between text-xs">
                            <div>
                              {isClosed && (
                                <div className="flex items-center gap-1.5">
                                  {partido.estado === 'finalizado' ? (
                                    <>
                                      <span className="text-slate-400">Resultado real:</span>
                                      <span className="font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                                        {partido.goles_local} – {partido.goles_visitante}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                      En juego / Pendiente
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Save action or points earned */}
                            <div>
                              {isClosed ? (
                                pred && partido.estado === 'finalizado' && (
                                  <div className="flex items-center gap-1 text-teal-400 font-semibold bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
                                    <Trophy className="h-3.5 w-3.5" />
                                    <span>+{pred.puntos_obtenidos} pts</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-2">
                                  {saving === 'saving' && (
                                    <span className="text-slate-500 flex items-center gap-1">
                                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-transparent"></div>
                                      Guardando
                                    </span>
                                  )}
                                  {saving === 'saved' && (
                                    <span className="text-teal-400 flex items-center gap-1 font-semibold">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Guardado
                                    </span>
                                  )}
                                  {saving === 'error' && (
                                    <span className="text-red-400 flex items-center gap-1">
                                      <XCircle className="h-4 w-4" />
                                      Error
                                    </span>
                                  )}
                                  
                                  {isModified && (
                                    <button
                                      onClick={() => handleSave(partido.id)}
                                      disabled={saving === 'saving' || localVal === '' || visitanteVal === ''}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 font-bold hover:bg-teal-350 transition-colors shadow-lg shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                      Guardar
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
