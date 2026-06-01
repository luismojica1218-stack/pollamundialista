# El Ático — Polla Mundialista 2026

Monorepo para la gestión de predicciones de la Copa Mundial de la FIFA 2026.

## Estructura del Proyecto

- `/web`: Frontend desarrollado con Next.js (App Router), TypeScript y Tailwind CSS.
- `/api`: Backend desarrollado con FastAPI (Python 3.12+).

## Requisitos Previos

- Node.js 18+ y npm
- Python 3.12+ y pip

## Configuración y Arranque Local

### 1. Backend (FastAPI)

1. Ve a la carpeta `/api`:
   ```bash
   cd api
   ```
2. Crea y activa un entorno virtual de Python:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Ejecuta el servidor de desarrollo:
   ```bash
   uvicorn index:app --reload --port 8000
   ```
   El backend estará disponible en `http://localhost:8000` y la documentación interactiva en `http://localhost:8000/api/docs`.

### 2. Frontend (Next.js)

1. Ve a la carpeta `/web`:
   ```bash
   cd web
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env.local` en `/web` con las variables de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```
4. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   El frontend estará disponible en `http://localhost:3000`.

## Configuración de Base de Datos (Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Abre la consola de SQL Editor en tu dashboard de Supabase.
3. Copia el contenido de del archivo de migración `supabase/migrations/001_init.sql` y ejecútalo para crear las tablas, disparadores y políticas de RLS correspondientes.

## Variables de Entorno Requeridas

Debes configurar las siguientes variables de entorno tanto localmente (archivo `.env` en la raíz) como en tu panel de control de Vercel:

| Variable | Ubicación | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend & Backend | URL del proyecto Supabase (ej. `https://xxx.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Clave anónima pública de Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Clave de rol de servicio privada (Service Role Key) para bypass de RLS en operaciones administrativas. **Nunca exponer en el cliente.** |
| `CRON_SECRET` | Backend | Token secreto para proteger el endpoint `/api/cron/sincronizar`. |

## Carga Inicial de los 104 Partidos

Una vez configuradas las variables de entorno en tu archivo `.env` en la raíz del proyecto, puedes ejecutar el script administrativo de carga de partidos:

```bash
cd api
source venv/bin/activate
python scripts/cargar_partidos.py
```
Este script consultará la API de ESPN y poblará la tabla `partidos` en tu base de datos de Supabase.

## Despliegue en Vercel

1. Sube este repositorio a tu cuenta de GitHub.
2. Ve a [Vercel](https://vercel.com) y crea un nuevo proyecto importando tu repositorio.
3. En la sección de configuración de variables de entorno, añade todas las variables listadas en la sección anterior.
4. Vercel detectará la configuración monorepo utilizando el archivo `vercel.json` y desplegará las funciones de Python en `/api/*` y la aplicación de Next.js.
5. El Cron Job de sincronización se activará automáticamente y ejecutará el recálculo e importación cada 5 minutos en producción.
