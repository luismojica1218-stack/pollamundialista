-- Limpiar tablas previas
DROP TABLE IF EXISTS public.predicciones_torneo CASCADE;
DROP TABLE IF EXISTS public.predicciones CASCADE;
DROP TABLE IF EXISTS public.partidos CASCADE;
DROP TABLE IF EXISTS public.perfiles CASCADE;

-- Crear tabla perfiles
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_codigo TEXT NOT NULL,
    nombre_visible TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    es_admin BOOLEAN DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT now(),
    UNIQUE (grupo_codigo, nombre_visible)
);

-- Crear tabla partidos
CREATE TABLE IF NOT EXISTS public.partidos (
    id SERIAL PRIMARY KEY,
    espn_event_id TEXT UNIQUE,
    equipo_local TEXT,
    equipo_visitante TEXT,
    fase TEXT CHECK (fase IN ('grupos','ronda32','octavos','cuartos','semis','final','tercer_puesto')),
    inicio_utc TIMESTAMPTZ NOT NULL,
    goles_local INT,
    goles_visitante INT,
    estado TEXT DEFAULT 'programado' CHECK (estado IN ('programado','en_juego','finalizado'))
);

-- Crear tabla predicciones
CREATE TABLE IF NOT EXISTS public.predicciones (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE,
    partido_id INT REFERENCES public.partidos(id) ON DELETE CASCADE,
    pred_local INT NOT NULL CHECK (pred_local >= 0),
    pred_visitante INT NOT NULL CHECK (pred_visitante >= 0),
    puntos_obtenidos INT DEFAULT 0,
    actualizado_en TIMESTAMPTZ DEFAULT now(),
    UNIQUE (usuario_id, partido_id)
);

-- Crear tabla predicciones_torneo
CREATE TABLE IF NOT EXISTS public.predicciones_torneo (
    usuario_id UUID PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
    campeon TEXT,
    mejor_jugador TEXT,
    puntos_obtenidos INT DEFAULT 0,
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predicciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predicciones_torneo ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura Pública (Permite lectura y Realtime al frontend)
CREATE POLICY "Permitir lectura publica de perfiles" ON public.perfiles FOR SELECT TO public USING (true);
CREATE POLICY "Permitir lectura publica de partidos" ON public.partidos FOR SELECT TO public USING (true);
CREATE POLICY "Permitir lectura publica de predicciones" ON public.predicciones FOR SELECT TO public USING (true);
CREATE POLICY "Permitir lectura publica de predicciones_torneo" ON public.predicciones_torneo FOR SELECT TO public USING (true);
