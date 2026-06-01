import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dateutil.parser import isoparse
from supabase import create_client, Client

app = FastAPI(title="El Ático - API", docs_url="/api/docs", openapi_url="/api/openapi.json")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar Supabase Client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Permitir que el backend arranque aunque no estén las variables, para evitar caídas en andamiaje
supabase: Client = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

# Dependency to check user authentication using Supabase JWT
async def get_current_user(authorization: str = Header(None)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no está configurado en el servidor")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Falta el token de autorización o es inválido")
    
    token = authorization.split(" ")[1]
    try:
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Token inválido o expirado")
        return res.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"No autorizado: {str(e)}")

# Helper to check if a user is admin
async def get_profile(user_id: str):
    res = supabase.table("perfiles").select("*").eq("id", user_id).single().execute()
    return res.data

# Request/Response models
class PredictionInput(BaseModel):
    partido_id: int
    pred_local: int
    pred_visitante: int

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "supabase_configured": supabase is not None
    }

# 1. Listar partidos con campo calculado 'cerrado'
@app.get("/api/partidos")
async def get_partidos(user=Depends(get_current_user)):
    try:
        res = supabase.table("partidos").select("*").order("inicio_utc").execute()
        partidos = res.data or []
        
        now = datetime.now(timezone.utc)
        for partido in partidos:
            inicio_match = isoparse(partido["inicio_utc"])
            # Cerrado si falta menos de 1 hora para el inicio
            partido["cerrado"] = now >= (inicio_match - timedelta(hours=1))
            
        return partidos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener partidos: {str(e)}")

# 2. Obtener predicciones del usuario autenticado
@app.get("/api/predicciones")
async def get_predicciones(user=Depends(get_current_user)):
    try:
        res = supabase.table("predicciones").select("*").eq("usuario_id", user.id).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener predicciones: {str(e)}")

# 3. Crear/actualizar predicción del usuario
@app.post("/api/predicciones")
async def save_prediccion(input_data: PredictionInput, user=Depends(get_current_user)):
    try:
        # Obtener datos del partido para validar el cierre
        res_partido = supabase.table("partidos").select("*").eq("id", input_data.partido_id).single().execute()
        partido = res_partido.data
        
        if not partido:
            raise HTTPException(status_code=404, detail="Partido no encontrado")
            
        now = datetime.now(timezone.utc)
        inicio_match = isoparse(partido["inicio_utc"])
        
        # Validar si el partido ya está cerrado (menos de 1 hora para iniciar)
        if now >= (inicio_match - timedelta(hours=1)):
            raise HTTPException(
                status_code=403, 
                detail="El partido está cerrado. No se pueden guardar predicciones dentro de la hora previa al inicio."
            )
            
        # Preparar payload de predicción
        payload = {
            "usuario_id": user.id,
            "partido_id": input_data.partido_id,
            "pred_local": input_data.pred_local,
            "pred_visitante": input_data.pred_visitante,
            "actualizado_en": datetime.now(timezone.utc).isoformat()
        }
        
        # Guardar predicción
        res_pred = supabase.table("predicciones").upsert(payload).execute()
        return res_pred.data[0] if res_pred.data else {"status": "saved"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar predicción: {str(e)}")

# Request model para predicciones de torneo
class TournamentPredictionInput(BaseModel):
    campeon: Optional[str] = None
    mejor_jugador: Optional[str] = None

# 4. Obtener predicción de torneo del usuario autenticado
@app.get("/api/predicciones-torneo")
async def get_predicciones_torneo(user=Depends(get_current_user)):
    try:
        res = supabase.table("predicciones_torneo").select("*").eq("usuario_id", user.id).execute()
        if res.data:
            return res.data[0]
        return {
            "usuario_id": user.id,
            "campeon": None,
            "mejor_jugador": None,
            "puntos_obtenidos": 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener predicción de torneo: {str(e)}")

# 5. Guardar predicción de torneo (campeón y mejor jugador)
@app.put("/api/predicciones-torneo")
async def save_predicciones_torneo(input_data: TournamentPredictionInput, user=Depends(get_current_user)):
    try:
        # Calcular fecha límite: menor inicio_utc de los partidos con fase != 'grupos'
        res_matches = supabase.table("partidos").select("inicio_utc").neq("fase", "grupos").order("inicio_utc").limit(1).execute()
        
        if res_matches.data:
            deadline = isoparse(res_matches.data[0]["inicio_utc"])
        else:
            # Fallback si no hay partidos de eliminatoria cargados: fin del primer partido del torneo + 16 días
            # o una fecha estimativa como 2026-06-27 21:00:00 UTC
            deadline = datetime(2026, 6, 27, 21, 0, 0, tzinfo=timezone.utc)
            
        now = datetime.now(timezone.utc)
        if now >= deadline:
            raise HTTPException(
                status_code=403,
                detail=f"Las predicciones del torneo están cerradas. La fecha límite de edición era {deadline.strftime('%Y-%m-%d %H:%M:%S')} UTC."
            )
            
        payload = {
            "usuario_id": user.id,
            "campeon": input_data.campeon,
            "mejor_jugador": input_data.mejor_jugador,
            "actualizado_en": datetime.now(timezone.utc).isoformat()
        }
        
        res_torneo = supabase.table("predicciones_torneo").upsert(payload).execute()
        return res_torneo.data[0] if res_torneo.data else {"status": "saved"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar predicción de torneo: {str(e)}")
