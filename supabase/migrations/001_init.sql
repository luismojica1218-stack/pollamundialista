-- Crear tabla perfiles
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre_visible TEXT NOT NULL,
    es_admin BOOLEAN DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT now()
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

-- 1. Políticas para 'perfiles'
CREATE POLICY "Permitir lectura a usuarios autenticados" ON public.perfiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir actualización de perfil propio" ON public.perfiles
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND es_admin = (SELECT es_admin FROM public.perfiles WHERE id = auth.uid()));

-- 2. Políticas para 'partidos'
CREATE POLICY "Permitir lectura a usuarios autenticados" ON public.partidos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gestión total a administradores" ON public.partidos
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND es_admin = true));

-- 3. Políticas para 'predicciones'
CREATE POLICY "Permitir lectura de predicciones propias" ON public.predicciones
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Permitir inserción de predicciones propias" ON public.predicciones
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Permitir actualización de predicciones propias" ON public.predicciones
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- 4. Políticas para 'predicciones_torneo'
CREATE POLICY "Permitir lectura de predicciones torneo propias" ON public.predicciones_torneo
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Permitir inserción/actualización de predicciones torneo propias" ON public.predicciones_torneo
    FOR ALL TO authenticated
    USING (auth.uid() = usuario_id);

-- Crear disparador (trigger) para crear perfil al registrarse un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre_visible, es_admin)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre_visible', split_part(new.email, '@', 1)),
        false
    );
    
    -- Crear también fila en predicciones_torneo por defecto
    INSERT INTO public.predicciones_torneo (usuario_id, campeon, mejor_jugador, puntos_obtenidos)
    VALUES (new.id, null, null, 0);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
