'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminRoute from '@/components/AdminRoute';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, RefreshCw, Play, Save, CheckCircle, AlertTriangle, CalendarDays, Award } from 'lucide-react';

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
}

const SELECCIONES = [
  "Alemania", "Angola", "Arabia Saudita", "Argelia", "Argentina", "Australia", 
  "Bélgica", "Bolivia", "Brasil", "Canadá", "Chile", "Colombia", "Corea del Sur", 
  "Costa de Marfil", "Costa Rica", "Croacia", "Dinamarca", "Ecuador", "Egipto", 
  "Escocia", "España", "Estados Unidos", "Francia", "Gales", "Ghana", "Honduras", 
  "Inglaterra", "Irán", "Iraq", "Italia", "Jamaica", "Japón", "Marruecos", "México", 
  "Nigeria", "Noruega", "Nueva Zelanda", "Países Bajos", "Panamá", "Paraguay", 
  "Perú", "Polonia", "Portugal", "Qatar", "Senegal", "Suecia", "Suiza", "Uruguay"
].sort();

const FASE_NAMES: { [key: string]: string } = {
  grupos: 'Fase de Grupos',
  ronda32: 'Ronda de 32',
  octavos: 'Octavos de Final',
  cuartos: 'Cuartos de Final',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer Puesto',
  final: 'Final'
};

export default function AdminPage() {
  const { token } = useAuth();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin form inputs
  const [matchScores, setMatchScores] = useState<{ [matchId: number]: { local: string; visitante: string; estado: string } }>({});
  const [campeonReal, setCampeonReal] = useState('');
  const [mejorJugadorReal, setMejorJugadorReal] = useState('');
  
  // Visual indicators
  const [syncing, setSyncing] = useState(false);
  const [actionStates, setActionStates] = useState<{ [key: string]: 'idle' | 'loading' | 'success' | 'error' }>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch('/api/partidos', { headers });
      
      if (res.ok) {
        const data: Partido[] = await res.json();
        setPartidos(data);

        // Load current scores to state
        const scoresMap: { [matchId: number]: { local: string; visitante: string; estado: string } } = {};
        data.forEach(p => {
          scoresMap[p.id] = {
            local: p.goles_local !== null ? p.goles_local.toString() : '',
            visitante: p.goles_visitante !== null ? p.goles_visitante.toString() : '',
            estado: p.estado
          };
        });
        setMatchScores(scoresMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, token]);

  const handleScoreChange = (matchId: number, field: 'local' | 'visitante' | 'estado', val: string) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: val
      }
    }));
  };

  const handleSaveResult = async (matchId: number) => {
    const scoreState = matchScores[matchId];
    if (!scoreState) return;

    setActionStates(prev => ({ ...prev, [`save-${matchId}`]: 'loading' }));
    setMessage({ text: '', type: '' });

    try {
      if (!token) {
        setActionStates(prev => ({ ...prev, [`save-${matchId}`]: 'error' }));
        setMessage({ text: 'No hay token de sesión válido.', type: 'error' });
        return;
      }

      const payload = {
        partido_id: matchId,
        goles_local: scoreState.estado === 'finalizado' ? parseInt(scoreState.local, 10) : null,
        goles_visitante: scoreState.estado === 'finalizado' ? parseInt(scoreState.visitante, 10) : null,
        estado: scoreState.estado
      };

      const response = await fetch('/api/admin/resultado', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setActionStates(prev => ({ ...prev, [`save-${matchId}`]: 'success' }));
        setMessage({ text: 'Partido actualizado y predicciones recalculadas correctamente.', type: 'success' });
        fetchData();
      } else {
        setActionStates(prev => ({ ...prev, [`save-${matchId}`]: 'error' }));
        const err = await response.json();
        setMessage({ text: err.detail || 'Error al guardar resultado.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setActionStates(prev => ({ ...prev, [`save-${matchId}`]: 'error' }));
    }
  };

  const handleRecalculate = async (matchId: number) => {
    setActionStates(prev => ({ ...prev, [`recalc-${matchId}`]: 'loading' }));
    setMessage({ text: '', type: '' });

    try {
      if (!token) {
        setActionStates(prev => ({ ...prev, [`recalc-${matchId}`]: 'error' }));
        setMessage({ text: 'No hay token de sesión válido.', type: 'error' });
        return;
      }

      const response = await fetch('/api/admin/recalcular', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ partido_id: matchId })
      });

      if (response.ok) {
        setActionStates(prev => ({ ...prev, [`recalc-${matchId}`]: 'success' }));
        setMessage({ text: 'Puntos de este partido recalculados con éxito.', type: 'success' });
      } else {
        setActionStates(prev => ({ ...prev, [`recalc-${matchId}`]: 'error' }));
        const err = await response.json();
        setMessage({ text: err.detail || 'Error al recalcular partido.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setActionStates(prev => ({ ...prev, [`recalc-${matchId}`]: 'error' }));
    }
  };

  const handleSincronizarESPN = async () => {
    setSyncing(true);
    setMessage({ text: '', type: '' });

    try {
      if (!token) {
        setMessage({ text: 'No hay token de sesión válido.', type: 'error' });
        setSyncing(false);
        return;
      }

      const response = await fetch('/api/admin/sincronizar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const resData = await response.json();
        setMessage({ 
          text: `Sincronización finalizada con éxito. Partidos actualizados: ${resData.partidos_actualizados.length}. Predicciones recalculadas: ${resData.total_predicciones_recalculadas}.`, 
          type: 'success' 
        });
        fetchData();
      } else {
        const err = await response.json();
        setMessage({ text: err.detail || 'Error en la sincronización manual.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setMessage({ text: 'Error de conexión en la sincronización.', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleFinalizeTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campeonReal || !mejorJugadorReal) {
      setMessage({ text: 'Ingresa tanto el campeón como el mejor jugador para finalizar.', type: 'error' });
      return;
    }

    setActionStates(prev => ({ ...prev, 'finalize': 'loading' }));
    setMessage({ text: '', type: '' });

    try {
      if (!token) {
        setActionStates(prev => ({ ...prev, 'finalize': 'error' }));
        setMessage({ text: 'No hay token de sesión válido.', type: 'error' });
        return;
      }

      const response = await fetch('/api/admin/finalizar-torneo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campeon_real: campeonReal,
          mejor_jugador_real: mejorJugadorReal
        })
      });

      if (response.ok) {
        setActionStates(prev => ({ ...prev, 'finalize': 'success' }));
        setMessage({ text: '¡Mundial finalizado! Puntos de campeón y MVP otorgados a todos los usuarios.', type: 'success' });
      } else {
        setActionStates(prev => ({ ...prev, 'finalize': 'error' }));
        const err = await response.json();
        setMessage({ text: err.detail || 'Error al finalizar el torneo.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setActionStates(prev => ({ ...prev, 'finalize': 'error' }));
    }
  };

  return (
    <AdminRoute>
      <div className="flex flex-col min-h-screen bg-slate-950">
        <NavBar />

        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                  Panel de Administración
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Gestiona resultados manuales, recalcula puntos y sincroniza partidos desde ESPN.
                </p>
              </div>
            </div>

            {/* Sync button */}
            <button
              onClick={handleSincronizarESPN}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-red-550 text-white rounded-xl text-sm font-semibold hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar ESPN Manual
            </button>
          </div>

          {/* Feedback messages */}
          {message.text && (
            <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Finalize Tournament Widget */}
          <div className="glass rounded-2xl p-6 border border-slate-800/80 mb-8 shadow-xl">
            <h2 className="text-lg font-semibold text-white font-display mb-4 flex items-center gap-2">
              <Award className="text-red-400 h-5 w-5" />
              Finalizar Torneo (Ganadores Reales)
            </h2>
            <form onSubmit={handleFinalizeTournament} className="grid grid-cols-1 sm:grid-cols-3 items-end gap-4">
              <div>
                <label htmlFor="campeon_real" className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Campeón Real
                </label>
                <select
                  id="campeon_real"
                  value={campeonReal}
                  onChange={(e) => setCampeonReal(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="">-- Seleccionar campeón --</option>
                  {SELECCIONES.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="mvp_real" className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Mejor Jugador Real (Balón de Oro)
                </label>
                <input
                  id="mvp_real"
                  type="text"
                  value={mejorJugadorReal}
                  onChange={(e) => setMejorJugadorReal(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Nombre oficial"
                />
              </div>

              <button
                type="submit"
                disabled={actionStates['finalize'] === 'loading'}
                className="w-full py-2 bg-red-650 hover:bg-red-550 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                {actionStates['finalize'] === 'loading' ? (
                  <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'Otorgar Bonus Especiales'
                )}
              </button>
            </form>
          </div>

          {/* Matches List Editable */}
          <div className="glass rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white font-display flex items-center gap-2">
                <CalendarDays className="text-red-400 h-5 w-5" />
                Listado de Partidos
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {partidos.length} partidos cargados
              </span>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/10">
                      <th className="py-4 px-6 w-32">Fase</th>
                      <th className="py-4 px-6">Partido</th>
                      <th className="py-4 px-6 text-center w-36">Resultado (Local-Vis)</th>
                      <th className="py-4 px-6 w-40">Estado</th>
                      <th className="py-4 px-6 text-right pr-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {partidos.map((partido) => {
                      const scores = matchScores[partido.id] || { local: '', visitante: '', estado: 'programado' };
                      const isSaving = actionStates[`save-${partido.id}`] === 'loading';
                      const isRecalculating = actionStates[`recalc-${partido.id}`] === 'loading';

                      return (
                        <tr key={partido.id} className="hover:bg-slate-900/20 transition-colors">
                          {/* Fase */}
                          <td className="py-4 px-6 text-xs font-semibold uppercase text-slate-500">
                            {FASE_NAMES[partido.fase] || partido.fase}
                          </td>

                          {/* Match details */}
                          <td className="py-4 px-6">
                            <span className="font-semibold text-white text-sm">
                              {partido.equipo_local} vs {partido.equipo_visitante}
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              ESPN ID: {partido.espn_event_id}
                            </span>
                          </td>

                          {/* Editable scores */}
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="text"
                                maxLength={2}
                                value={scores.local}
                                disabled={scores.estado !== 'finalizado'}
                                onChange={(e) => handleScoreChange(partido.id, 'local', e.target.value)}
                                className="w-9 h-9 text-center bg-slate-900 text-sm font-bold text-white border border-slate-800 rounded-lg disabled:opacity-40"
                                placeholder="-"
                              />
                              <span className="text-slate-600">:</span>
                              <input
                                type="text"
                                maxLength={2}
                                value={scores.visitante}
                                disabled={scores.estado !== 'finalizado'}
                                onChange={(e) => handleScoreChange(partido.id, 'visitante', e.target.value)}
                                className="w-9 h-9 text-center bg-slate-900 text-sm font-bold text-white border border-slate-800 rounded-lg disabled:opacity-40"
                                placeholder="-"
                              />
                            </div>
                          </td>

                          {/* Match State Dropdown */}
                          <td className="py-4 px-6">
                            <select
                              value={scores.estado}
                              onChange={(e) => handleScoreChange(partido.id, 'estado', e.target.value)}
                              className="w-full bg-slate-900 text-slate-300 text-xs border border-slate-800 rounded-lg py-1.5 px-2 focus:outline-none"
                            >
                              <option value="programado">Programado</option>
                              <option value="en_juego">En juego</option>
                              <option value="finalizado">Finalizado</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right pr-6 space-x-2">
                            <button
                              onClick={() => handleSaveResult(partido.id)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1 text-slate-950 font-bold bg-teal-400 hover:bg-teal-350 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Guardar resultado"
                            >
                              <Save className="h-3 w-3" />
                              Guardar
                            </button>
                            
                            {partido.estado === 'finalizado' && (
                              <button
                                onClick={() => handleRecalculate(partido.id)}
                                disabled={isRecalculating}
                                className="inline-flex items-center gap-1 text-slate-300 border border-slate-800 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                title="Forzar recálculo manual de puntos"
                              >
                                <Play className="h-3 w-3" />
                                Recalcular
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}
