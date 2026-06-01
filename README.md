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

## Despliegue

El proyecto está configurado para desplegarse directamente en Vercel utilizando la configuración descrita en `vercel.json` en la raíz.
