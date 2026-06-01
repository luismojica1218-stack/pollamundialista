'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Users, UserPlus, Key, Lock, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';

interface GroupUser {
  id: string;
  nombre_visible: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, joinGroup, loginUser, loading: authLoading } = useAuth();

  const [groupCode, setGroupCode] = useState('');
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<GroupUser | null>(null);
  
  // Form states
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  
  // UI States
  const [stage, setStage] = useState<'enter-group' | 'select-user' | 'register-user'>('enter-group');
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && profile) {
      router.push('/predicciones');
    }
  }, [profile, authLoading, router]);

  // Load group from URL search param if present
  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (groupParam) {
      const cleanCode = groupParam.trim().toLowerCase();
      setGroupCode(cleanCode);
      fetchGroupUsers(cleanCode);
    }
  }, [searchParams]);

  const fetchGroupUsers = async (code: string) => {
    setLoadingGroup(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/auth/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo_codigo: code })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error al conectar con el grupo');
      }

      setUsers(data.usuarios);
      if (data.usuarios.length === 0) {
        setStage('register-user');
      } else {
        setStage('select-user');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el grupo');
      setStage('enter-group');
    } finally {
      setLoadingGroup(false);
    }
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = groupCode.trim().toLowerCase();
    if (!cleanCode) {
      setErrorMsg('Por favor ingresa un código de grupo.');
      return;
    }
    fetchGroupUsers(cleanCode);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nickname.trim();
    const cleanPin = pin.trim();

    if (!cleanName || !cleanPin) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }
    if (cleanPin.length < 4) {
      setErrorMsg('El PIN debe tener al menos 4 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await joinGroup(groupCode, cleanName, cleanPin);
      router.push('/predicciones');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al unirse al grupo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();

    if (!selectedUser || !cleanPin) {
      setErrorMsg('Por favor introduce tu PIN.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await loginUser(groupCode, selectedUser.nombre_visible, cleanPin);
      router.push('/predicciones');
    } catch (err: any) {
      setErrorMsg(err.message || 'PIN incorrecto. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNickname('');
    setPin('');
    setErrorMsg('');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-700"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 glow-teal mb-3">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display">
            El Ático
          </h1>
          <p className="text-xs text-slate-405">
            Polla Mundialista 2026
          </p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800">
          
          {/* Header navigation per stage */}
          {stage !== 'enter-group' && (
            <button
              onClick={() => {
                if (stage === 'register-user' && users.length > 0) {
                  setStage('select-user');
                } else {
                  setStage('enter-group');
                  setUsers([]);
                }
                resetForm();
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" /> Cambiar de {stage === 'register-user' && users.length > 0 ? 'vista' : 'grupo'}
            </button>
          )}

          {errorMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STAGE 1: ENTER GROUP CODE */}
          {stage === 'enter-group' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-2 font-display">
                Entrar a una Polla
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Ingresa el código del grupo que te pasaron tus amigos. Si eres el creador, inventa un código nuevo.
              </p>

              <form onSubmit={handleGroupSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Código de Grupo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={groupCode}
                      onChange={(e) => setGroupCode(e.target.value)}
                      placeholder="ej: el-atico"
                      className="block w-full px-3 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm uppercase font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingGroup}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-400 transition-all cursor-pointer font-display"
                >
                  {loadingGroup ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Conectar <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STAGE 2: SELECT USER & ENTER PIN */}
          {stage === 'select-user' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 font-display">
                Polla: <span className="text-teal-400 uppercase">{groupCode}</span>
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Elige tu nombre de la lista para ingresar:
              </p>

              {!selectedUser ? (
                <div className="space-y-4">
                  {/* Grid layout optimized for smartphone taps */}
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setErrorMsg('');
                        }}
                        className="py-3 px-3 bg-slate-900/40 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 text-white font-medium rounded-xl text-xs transition-all text-center truncate cursor-pointer"
                      >
                        {u.nombre_visible}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-900 text-center">
                    <button
                      onClick={() => {
                        setStage('register-user');
                        resetForm();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-teal-500 hover:text-teal-400 font-semibold transition-colors cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Soy un nuevo participante
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl mb-4 text-center">
                    <span className="text-xs text-slate-400">Conectando como</span>
                    <h3 className="text-md font-bold text-white mt-0.5">{selectedUser.nombre_visible}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setPin('');
                      }}
                      className="text-[10px] text-teal-500 hover:underline mt-1 block w-full text-center cursor-pointer"
                    >
                      Cambiar de nombre
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Introduce tu PIN de seguridad
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="PIN..."
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="block w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all text-center tracking-widest text-lg font-bold"
                        maxLength={10}
                      />
                      <Lock className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-400 transition-all cursor-pointer font-display"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Ingresar <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STAGE 3: REGISTER NEW USER IN GROUP */}
          {stage === 'register-user' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 font-display">
                Unirse a la Polla: <span className="text-teal-400 uppercase">{groupCode}</span>
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Elige tu nombre y un PIN de seguridad para unirte:
              </p>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Tu Nombre Completo / Apodo
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="ej: Luis Mojica"
                    className="block w-full px-3 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm font-medium"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Crea un PIN de Seguridad (mínimo 4 números)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="PIN..."
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="block w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all text-center tracking-widest text-lg font-bold"
                      maxLength={10}
                    />
                    <Key className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 text-center">
                    Este PIN te servirá para que nadie más pueda editar tus predicciones.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-400 transition-all cursor-pointer font-display"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Unirme y Jugar <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
