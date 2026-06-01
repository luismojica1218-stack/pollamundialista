'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/context/AuthContext';
import { Award, Save, CheckCircle2, AlertCircle, ShieldCheck, HelpCircle } from 'lucide-react';

const SELECCIONES = [
  "Alemania", "Angola", "Arabia Saudita", "Argelia", "Argentina", "Australia", 
  "Bélgica", "Bolivia", "Brasil", "Canadá", "Chile", "Colombia", "Corea del Sur", 
  "Costa de Marfil", "Costa Rica", "Croacia", "Dinamarca", "Ecuador", "Egipto", 
  "Escocia", "España", "Estados Unidos", "Francia", "Gales", "Ghana", "Honduras", 
  "Inglaterra", "Irán", "Iraq", "Italia", "Jamaica", "Japón", "Marruecos", "México", 
  "Nigeria", "Noruega", "Nueva Zelanda", "Países Bajos", "Panamá", "Paraguay", 
  "Perú", "Polonia", "Portugal", "Qatar", "Senegal", "Suecia", "Suiza", "Uruguay"
].sort();

interface PrediccionTorneo {
  usuario_id: string;
  campeon: string | null;
  mejor_jugador: string | null;
  puntos_obtenidos: number;
  actualizado_en: string;
}

export default function PrediccionesTorneoPage() {
  const { token } = useAuth();
  const [campeon, setCampeon] = useState<string>('');
  const [mejorJugador, setMejorJugador] = useState<string>('');
  const [dbPred, setDbPred] = useState<PrediccionTorneo | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch user tournament predictions
      const resTorneo = await fetch('/api/predicciones-torneo', { headers });
      if (resTorneo.ok) {
        const data: PrediccionTorneo = await resTorneo.json();
        setDbPred(data);
        setCampeon(data.campeon || '');
        setMejorJugador(data.mejor_jugador || '');
      }

      // Fetch knockout matches to determine deadline
      const resPartidos = await fetch('/api/partidos', { headers });
      if (resPartidos.ok) {
        const partidos = await resPartidos.json();
        const knockoutMatches = partidos.filter((p: any) => p.fase !== 'grupos');
        
        let deadlineDate = new Date(Date.UTC(2026, 5, 27, 21, 0, 0)); // Fallback: 27 de junio 2026 21:00 UTC
        if (knockoutMatches.length > 0) {
          // Sort by start date to find the earliest knockout match
          knockoutMatches.sort((a: any, b: any) => new Date(a.inicio_utc).getTime() - new Date(b.inicio_utc).getTime());
          deadlineDate = new Date(knockoutMatches[0].inicio_utc);
        }

        setDeadline(deadlineDate);
        setIsClosed(new Date() >= deadlineDate);
      }
    } catch (e) {
      console.error('Error fetching tournament data:', e);
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, token]);

  const handleSave = async () => {
    setSavingState('saving');
    setErrorMsg('');
    try {
      if (!token) {
        setErrorMsg('Error: Sesión no válida.');
        setSavingState('error');
        return;
      }

      const response = await fetch('/api/predicciones-torneo', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campeon: campeon || null,
          mejor_jugador: mejorJugador || null
        })
      });

      if (response.ok) {
        const updated: PrediccionTorneo = await response.json();
        setDbPred(updated);
        setSavingState('saved');
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.detail || 'Error al guardar la predicción de torneo.');
        setSavingState('error');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de red al guardar.');
      setSavingState('error');
    }
  };

  const isModified = dbPred 
    ? ((dbPred.campeon || '') !== campeon || (dbPred.mejor_jugador || '') !== mejorJugador)
    : (campeon !== '' || mejorJugador !== '');

  const formattedDeadline = deadline?.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-950">
        <NavBar />

        <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 glow-teal">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                Predicciones Especiales
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Elige al campeón y al mejor jugador de la Copa del Mundo 2026.
              </p>
            </div>
          </div>

          {/* Deadline card */}
          {deadline && (
            <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 text-sm ${
              isClosed
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}>
              <AlertCircle className={`h-5 w-5 shrink-0 ${isClosed ? 'text-red-400' : 'text-teal-400'}`} />
              <div>
                <span className="font-semibold block">
                  {isClosed ? 'El plazo ha finalizado' : 'Fecha límite de edición'}
                </span>
                <span className="capitalize text-slate-400">
                  {formattedDeadline} (Inicio de los Octavos de Final)
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-8 border border-slate-800/80 shadow-xl space-y-8">
              {/* Campeon prediction */}
              <div className="space-y-3">
                <label htmlFor="campeon" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Selección Campeona (+25 puntos)
                </label>
                <select
                  id="campeon"
                  disabled={isClosed}
                  value={campeon}
                  onChange={(e) => setCampeon(e.target.value)}
                  className={`block w-full px-4 py-3 bg-slate-900/60 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm appearance-none cursor-pointer ${
                    isClosed ? 'border-slate-800 text-slate-500' : 'border-slate-800'
                  }`}
                >
                  <option value="">-- Elige una selección --</option>
                  {SELECCIONES.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mejor jugador prediction */}
              <div className="space-y-3">
                <label htmlFor="mejor_jugador" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Mejor Jugador / Balón de Oro (+15 puntos)
                </label>
                <input
                  id="mejor_jugador"
                  type="text"
                  disabled={isClosed}
                  value={mejorJugador}
                  onChange={(e) => setMejorJugador(e.target.value)}
                  placeholder="Nombre del jugador"
                  className={`block w-full px-4 py-3 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm ${
                    isClosed ? 'border-slate-800 text-slate-500' : 'border-slate-800'
                  }`}
                />
              </div>

              {/* Points obtained if closed */}
              {isClosed && dbPred && (dbPred.puntos_obtenidos > 0) && (
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="text-teal-400 h-5 w-5" />
                    ¡Puntos obtenidos por predicciones de torneo!
                  </span>
                  <span className="text-teal-400 font-bold font-display text-lg">
                    +{dbPred.puntos_obtenidos} pts
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              {!isClosed && (
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-900">
                  {savingState === 'saving' && (
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent"></div>
                      Guardando
                    </span>
                  )}
                  {savingState === 'saved' && (
                    <span className="text-teal-400 text-sm flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Guardado con éxito
                    </span>
                  )}
                  
                  {isModified && (
                    <button
                      onClick={handleSave}
                      disabled={savingState === 'saving'}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400 text-slate-950 font-bold hover:bg-teal-350 transition-colors shadow-lg shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
                    >
                      <Save className="h-4 w-4" />
                      Guardar Predicciones
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
