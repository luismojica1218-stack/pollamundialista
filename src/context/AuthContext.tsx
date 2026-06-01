'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Profile {
  id: string;
  grupo_codigo: string;
  nombre_visible: string;
  es_admin: boolean;
  creado_en?: string;
}

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  token: string | null;
  joinGroup: (groupCode: string, nickname: string, pin: string) => Promise<void>;
  loginUser: (groupCode: string, nickname: string, pin: string) => Promise<void>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  isAdmin: false,
  token: null,
  joinGroup: async () => {},
  loginUser: async () => {},
  signOut: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        localStorage.setItem('polla_profile', JSON.stringify(data));
      } else {
        signOut();
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
      signOut();
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('polla_token');
    const savedProfile = localStorage.getItem('polla_profile');

    if (savedToken && savedProfile) {
      setToken(savedToken);
      try {
        setProfile(JSON.parse(savedProfile));
        fetchProfile(savedToken).finally(() => setLoading(false));
      } catch (e) {
        localStorage.removeItem('polla_profile');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const joinGroup = async (groupCode: string, nickname: string, pin: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupo_codigo: groupCode,
          nombre_visible: nickname,
          pin
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error al unirse al grupo');
      }

      setToken(data.token);
      setProfile(data.profile);
      localStorage.setItem('polla_token', data.token);
      localStorage.setItem('polla_profile', JSON.stringify(data.profile));
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (groupCode: string, nickname: string, pin: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupo_codigo: groupCode,
          nombre_visible: nickname,
          pin
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error al iniciar sesión');
      }

      setToken(data.token);
      setProfile(data.profile);
      localStorage.setItem('polla_token', data.token);
      localStorage.setItem('polla_profile', JSON.stringify(data.profile));
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setToken(null);
    setProfile(null);
    localStorage.removeItem('polla_token');
    localStorage.removeItem('polla_profile');
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  const isAdmin = profile?.es_admin || false;

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        isAdmin,
        token,
        joinGroup,
        loginUser,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
