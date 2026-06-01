import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from typing import List, Optional
import httpx
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dateutil.parser import isoparse
from supabase import create_client, Client
from puntuacion import calcular_puntos, calcular_puntos_torneo

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

from auth import hash_pin, verify_pin, create_session_token, verify_session_token

class CurrentUser:
    def __init__(self, payload: dict):
        self.id = payload["id"]
        self.grupo_codigo = payload["grupo_codigo"]
        self.es_admin = payload["es_admin"]

# Dependency to check user authentication using Custom HMAC Token
async def get_current_user(authorization: str = Header(None)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no está configurado en el servidor")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Falta el token de autorización o es inválido")
    
    token = authorization.split(" ")[1]
    payload = verify_session_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido, expirado o mal firmado")
    return CurrentUser(payload)

# Helper to check if a user is admin
async def get_profile(user_id: str):
    res = supabase.table("perfiles").select("*").eq("id", user_id).single().execute()
    return res.data

# Request/Response models
class GroupAuthInput(BaseModel):
    grupo_codigo: str

class JoinInput(BaseModel):
    grupo_codigo: str
    nombre_visible: str
    pin: str

class LoginInput(BaseModel):
    grupo_codigo: str
    nombre_visible: str
    pin: str

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

# Endpoints de Autenticación Personalizada para Grupos/Pollas
@app.post("/api/auth/group")
async def get_group_users(input_data: GroupAuthInput):
    try:
        group_code = input_data.grupo_codigo.strip().lower()
        if not group_code:
            raise HTTPException(status_code=400, detail="Código de grupo inválido")
            
        res = supabase.table("perfiles").select("id, nombre_visible").eq("grupo_codigo", group_code).execute()
        return {
            "grupo_codigo": group_code,
            "usuarios": res.data or []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener grupo: {str(e)}")

@app.post("/api/auth/join")
async def join_group(input_data: JoinInput):
    try:
        group_code = input_data.grupo_codigo.strip().lower()
        name = input_data.nombre_visible.strip()
        pin = input_data.pin.strip()
        
        if not group_code or not name or not pin:
            raise HTTPException(status_code=400, detail="Todos los campos son obligatorios")
            
        # Verificar si el participante ya existe en este grupo
        res_check = supabase.table("perfiles").select("id").eq("grupo_codigo", group_code).eq("nombre_visible", name).execute()
        if res_check.data:
            raise HTTPException(status_code=400, detail="Ya existe un participante con ese nombre en este grupo")
            
        # Verificar si es el primer usuario del grupo para asignarle admin
        res_group_count = supabase.table("perfiles").select("id").eq("grupo_codigo", group_code).execute()
        is_first = len(res_group_count.data or []) == 0
        
        # Guardar hash del PIN
        hashed_pin = hash_pin(pin)
        
        # Crear perfil
        profile_data = {
            "grupo_codigo": group_code,
            "nombre_visible": name,
            "pin_hash": hashed_pin,
            "es_admin": is_first
        }
        
        res_insert = supabase.table("perfiles").insert(profile_data).execute()
        if not res_insert.data:
            raise HTTPException(status_code=500, detail="No se pudo crear el perfil")
            
        new_profile = res_insert.data[0]
        
        # Crear fila por defecto en predicciones_torneo
        supabase.table("predicciones_torneo").insert({
            "usuario_id": new_profile["id"],
            "campeon": None,
            "mejor_jugador": None,
            "puntos_obtenidos": 0
        }).execute()
        
        # Generar token
        token = create_session_token(new_profile["id"], group_code, new_profile["es_admin"])
        
        return {
            "token": token,
            "profile": {
                "id": new_profile["id"],
                "grupo_codigo": group_code,
                "nombre_visible": name,
                "es_admin": new_profile["es_admin"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrarse: {str(e)}")

@app.post("/api/auth/login")
async def login_user(input_data: LoginInput):
    try:
        group_code = input_data.grupo_codigo.strip().lower()
        name = input_data.nombre_visible.strip()
        pin = input_data.pin.strip()
        
        if not group_code or not name or not pin:
            raise HTTPException(status_code=400, detail="Todos los campos son obligatorios")
            
        # Buscar el perfil
        res = supabase.table("perfiles").select("*").eq("grupo_codigo", group_code).eq("nombre_visible", name).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Participante no encontrado en este grupo")
            
        profile = res.data[0]
        
        # Verificar el PIN
        if not verify_pin(pin, profile["pin_hash"]):
            raise HTTPException(status_code=401, detail="PIN incorrecto")
            
        # Generar token
        token = create_session_token(profile["id"], group_code, profile["es_admin"])
        
        return {
            "token": token,
            "profile": {
                "id": profile["id"],
                "grupo_codigo": group_code,
                "nombre_visible": name,
                "es_admin": profile["es_admin"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al iniciar sesión: {str(e)}")

@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    try:
        profile = await get_profile(user.id)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
        return {
            "id": profile["id"],
            "grupo_codigo": profile["grupo_codigo"],
            "nombre_visible": profile["nombre_visible"],
            "es_admin": profile["es_admin"],
            "creado_en": profile["creado_en"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener perfil: {str(e)}")

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

# 6. Endpoint de sincronización (Cron Job / Vercel Cron)
@app.post("/api/cron/sincronizar")
async def sincronizar(date: Optional[str] = None, authorization: str = Header(None)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no está configurado en el servidor")
        
    # Validar secreto de cron
    cron_secret = os.environ.get("CRON_SECRET")
    if not cron_secret:
        raise HTTPException(status_code=500, detail="CRON_SECRET no está configurado en las variables de entorno")
        
    provided_secret = None
    if authorization and authorization.startswith("Bearer "):
        provided_secret = authorization.split(" ")[1]
    
    if provided_secret != cron_secret:
        raise HTTPException(status_code=401, detail="No autorizado: Secreto de cron inválido")

    # Determinar fechas a sincronizar
    dates_to_sync = []
    if date:
        dates_to_sync = [date]
    else:
        # Por defecto, ayer y hoy para cubrir cambios de huso horario
        now = datetime.now(timezone.utc)
        dates_to_sync = [
            (now - timedelta(days=1)).strftime("%Y%m%d"),
            now.strftime("%Y%m%d")
        ]

    partidos_actualizados = []
    total_recalculados = 0

    try:
        for d_str in dates_to_sync:
            url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates={d_str}"
            response = httpx.get(url)
            if response.status_code != 200:
                continue
                
            data = response.json()
            events = data.get("events", [])
            
            for event in events:
                event_id = event.get("id")
                espn_state = event.get("status", {}).get("type", {}).get("state", "pre")
                
                # Solo procesamos partidos finalizados en ESPN
                if espn_state != "post":
                    continue
                    
                competitions = event.get("competitions", [])
                if not competitions:
                    continue
                    
                competitors = competitions[0].get("competitors", [])
                if len(competitors) < 2:
                    continue
                
                goles_local = None
                goles_visitante = None
                
                for comp in competitors:
                    role = comp.get("homeAway")
                    score_str = comp.get("score")
                    
                    if role == "home" and score_str is not None:
                        goles_local = int(score_str)
                    elif role == "away" and score_str is not None:
                        goles_visitante = int(score_str)

                if goles_local is None or goles_visitante is None:
                    continue

                # Consultar si el partido existe en base de datos
                res_match = supabase.table("partidos").select("*").eq("espn_event_id", event_id).execute()
                if not res_match.data:
                    continue
                    
                db_match = res_match.data[0]
                
                # Verificar si es necesario actualizar
                necesita_actualizacion = (
                    db_match["estado"] != "finalizado" or
                    db_match["goles_local"] != goles_local or
                    db_match["goles_visitante"] != goles_visitante
                )
                
                if necesita_actualizacion:
                    # 1. Actualizar estado y goles del partido
                    supabase.table("partidos").update({
                        "goles_local": goles_local,
                        "goles_visitante": goles_visitante,
                        "estado": "finalizado"
                    }).eq("id", db_match["id"]).execute()
                    
                    # 2. Buscar predicciones del partido para recalcular
                    res_preds = supabase.table("predicciones").select("*").eq("partido_id", db_match["id"]).execute()
                    preds = res_preds.data or []
                    
                    for pred in preds:
                        puntos = calcular_puntos(
                            pred_local=pred["pred_local"],
                            pred_visitante=pred["pred_visitante"],
                            real_local=goles_local,
                            real_visitante=goles_visitante,
                            fase=db_match["fase"]
                        )
                        
                        # Guardar puntos obtenidos en la predicción
                        supabase.table("predicciones").update({
                            "puntos_obtenidos": puntos
                        }).eq("id", pred["id"]).execute()
                        
                        total_recalculados += 1
                        
                    partidos_actualizados.append({
                        "partido": f"{db_match['equipo_local']} vs {db_match['equipo_visitante']}",
                        "goles": f"{goles_local}-{goles_visitante}",
                        "predicciones_actualizadas": len(preds)
                    })
                    
        return {
            "status": "success",
            "partidos_actualizados": partidos_actualizados,
            "total_predicciones_recalculadas": total_recalculados
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la sincronización: {str(e)}")

# 7. Endpoint para obtener la tabla de posiciones (Leaderboard)
@app.get("/api/leaderboard")
async def get_leaderboard(user=Depends(get_current_user)):
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase no está configurado en el servidor")
            
        # Obtener perfiles, partidos finalizados, predicciones y predicciones de torneo
        res_perfiles = supabase.table("perfiles").select("id, nombre_visible").eq("grupo_codigo", user.grupo_codigo).execute()
        res_partidos = supabase.table("partidos").select("id, goles_local, goles_visitante, estado").eq("estado", "finalizado").execute()
        res_preds = supabase.table("predicciones").select("usuario_id, partido_id, pred_local, pred_visitante, puntos_obtenidos").execute()
        res_torneo = supabase.table("predicciones_torneo").select("usuario_id, puntos_obtenidos").execute()
        
        perfiles = res_perfiles.data or []
        preds = res_preds.data or []
        torneos = res_torneo.data or []
        partidos_finalizados = res_partidos.data or []
        
        # Mapear datos para búsqueda rápida
        partidos_map = {p["id"]: p for p in partidos_finalizados}
        torneos_map = {t["usuario_id"]: t["puntos_obtenidos"] for t in torneos}
        
        # Agrupar predicciones por usuario
        user_preds = {}
        for p in preds:
            u_id = p["usuario_id"]
            if u_id not in user_preds:
                user_preds[u_id] = []
            user_preds[u_id].append(p)
            
        leaderboard = []
        for perf in perfiles:
            u_id = perf["id"]
            nombre = perf["nombre_visible"]
            
            puntos_partidos = 0
            marcadores_exactos = 0
            
            u_preds = user_preds.get(u_id, [])
            for pred in u_preds:
                puntos_partidos += pred["puntos_obtenidos"]
                
                # Contar marcadores exactos en partidos ya finalizados
                p_id = pred["partido_id"]
                if p_id in partidos_map:
                    match = partidos_map[p_id]
                    if pred["pred_local"] == match["goles_local"] and pred["pred_visitante"] == match["goles_visitante"]:
                        marcadores_exactos += 1
                        
            puntos_torneo = torneos_map.get(u_id, 0)
            puntos_totales = puntos_partidos + puntos_torneo
            
            leaderboard.append({
                "usuario_id": u_id,
                "nombre_visible": nombre,
                "puntos_totales": puntos_totales,
                "marcadores_exactos": marcadores_exactos
            })
            
        # Ordenar por puntos totales desc, luego por marcadores exactos desc
        leaderboard.sort(key=lambda x: (x["puntos_totales"], x["marcadores_exactos"]), reverse=True)
        
        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al calcular la tabla de posiciones: {str(e)}")

# Request Models para Admin
class AdminMatchResultInput(BaseModel):
    partido_id: int
    goles_local: Optional[int] = None
    goles_visitante: Optional[int] = None
    estado: str # 'programado', 'en_juego', 'finalizado'

class AdminRecalculateInput(BaseModel):
    partido_id: int

class AdminFinalizeTournamentInput(BaseModel):
    campeon_real: str
    mejor_jugador_real: str

# 8. Guard para validar que el usuario es administrador
async def require_admin(user=Depends(get_current_user)):
    profile = await get_profile(user.id)
    if not profile or not profile.get("es_admin"):
        raise HTTPException(
            status_code=403, 
            detail="No autorizado: Se requiere rol de administrador"
        )
    return user

# 9. Modificación manual de resultado de un partido
@app.put("/api/admin/resultado", dependencies=[Depends(require_admin)])
async def admin_save_resultado(input_data: AdminMatchResultInput):
    try:
        # Obtener datos anteriores del partido
        res_match = supabase.table("partidos").select("*").eq("id", input_data.partido_id).single().execute()
        match = res_match.data
        if not match:
            raise HTTPException(status_code=404, detail="Partido no encontrado")

        # Actualizar partido
        payload = {
            "estado": input_data.estado,
            "goles_local": input_data.goles_local if input_data.estado == "finalizado" else None,
            "goles_visitante": input_data.goles_visitante if input_data.estado == "finalizado" else None
        }
        
        supabase.table("partidos").update(payload).eq("id", input_data.partido_id).execute()

        # Si el partido se marca como finalizado, recalcular puntos de las predicciones
        recalculados = 0
        if input_data.estado == "finalizado" and input_data.goles_local is not None and input_data.goles_visitante is not None:
            res_preds = supabase.table("predicciones").select("*").eq("partido_id", input_data.partido_id).execute()
            preds = res_preds.data or []
            
            for pred in preds:
                puntos = calcular_puntos(
                    pred_local=pred["pred_local"],
                    pred_visitante=pred["pred_visitante"],
                    real_local=input_data.goles_local,
                    real_visitante=input_data.goles_visitante,
                    fase=match["fase"]
                )
                supabase.table("predicciones").update({"puntos_obtenidos": puntos}).eq("id", pred["id"]).execute()
                recalculados += 1
                
        return {
            "status": "success",
            "message": "Partido actualizado correctamente",
            "predicciones_recalculadas": recalculados
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en panel de administración: {str(e)}")

# 10. Recalcular puntos de un partido manualmente
@app.post("/api/admin/recalcular", dependencies=[Depends(require_admin)])
async def admin_recalcular_partido(input_data: AdminRecalculateInput):
    try:
        res_match = supabase.table("partidos").select("*").eq("id", input_data.partido_id).single().execute()
        match = res_match.data
        if not match:
            raise HTTPException(status_code=404, detail="Partido no encontrado")
            
        if match["estado"] != "finalizado" or match["goles_local"] is None or match["goles_visitante"] is None:
            raise HTTPException(status_code=400, detail="El partido no está finalizado o no tiene goles cargados")

        res_preds = supabase.table("predicciones").select("*").eq("partido_id", input_data.partido_id).execute()
        preds = res_preds.data or []
        
        for pred in preds:
            puntos = calcular_puntos(
                pred_local=pred["pred_local"],
                pred_visitante=pred["pred_visitante"],
                real_local=match["goles_local"],
                real_visitante=match["goles_visitante"],
                fase=match["fase"]
            )
            supabase.table("predicciones").update({"puntos_obtenidos": puntos}).eq("id", pred["id"]).execute()
            
        return {
            "status": "success",
            "message": "Recálculo manual finalizado",
            "predicciones_recalculadas": len(preds)
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al recalcular partido: {str(e)}")

# 11. Fijar campeón y mejor jugador reales + recalcular predicciones de torneo
@app.post("/api/admin/finalizar-torneo", dependencies=[Depends(require_admin)])
async def admin_finalize_tournament(input_data: AdminFinalizeTournamentInput):
    try:
        # Obtener todas las predicciones de torneo
        res_torneos = supabase.table("predicciones_torneo").select("*").execute()
        preds_torneo = res_torneos.data or []
        
        recalculados = 0
        for pred in preds_torneo:
            puntos = calcular_puntos_torneo(
                pred_campeon=pred["campeon"],
                real_campeon=input_data.campeon_real,
                pred_jugador=pred["mejor_jugador"],
                real_jugador=input_data.mejor_jugador_real
            )
            
            supabase.table("predicciones_torneo").update({
                "puntos_obtenidos": puntos
            }).eq("usuario_id", pred["usuario_id"]).execute()
            
            recalculados += 1
            
        return {
            "status": "success",
            "message": "Torneo finalizado y puntos del bonus de torneo calculados con éxito",
            "predicciones_torneo_actualizadas": recalculados
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al finalizar torneo: {str(e)}")

# 12. Forzar sincronización manual de ESPN desde el panel de admin
@app.post("/api/admin/sincronizar", dependencies=[Depends(require_admin)])
async def admin_sincronizar_manual(date: Optional[str] = None):
    try:
        # Reutilizamos el proceso llamando directamente la lógica de sincronización
        # Simulamos que tenemos el secreto correcto
        dates_to_sync = []
        if date:
            dates_to_sync = [date]
        else:
            now = datetime.now(timezone.utc)
            dates_to_sync = [
                (now - timedelta(days=1)).strftime("%Y%m%d"),
                now.strftime("%Y%m%d")
            ]

        partidos_actualizados = []
        total_recalculados = 0

        for d_str in dates_to_sync:
            url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates={d_str}"
            response = httpx.get(url)
            if response.status_code != 200:
                continue
                
            data = response.json()
            events = data.get("events", [])
            
            for event in events:
                event_id = event.get("id")
                espn_state = event.get("status", {}).get("type", {}).get("state", "pre")
                
                if espn_state != "post":
                    continue
                    
                competitions = event.get("competitions", [])
                if not competitions:
                    continue
                    
                competitors = competitions[0].get("competitors", [])
                if len(competitors) < 2:
                    continue
                
                goles_local = None
                goles_visitante = None
                
                for comp in competitors:
                    role = comp.get("homeAway")
                    score_str = comp.get("score")
                    
                    if role == "home" and score_str is not None:
                        goles_local = int(score_str)
                    elif role == "away" and score_str is not None:
                        goles_visitante = int(score_str)

                if goles_local is None or goles_visitante is None:
                    continue

                res_match = supabase.table("partidos").select("*").eq("espn_event_id", event_id).execute()
                if not res_match.data:
                    continue
                    
                db_match = res_match.data[0]
                
                necesita_actualizacion = (
                    db_match["estado"] != "finalizado" or
                    db_match["goles_local"] != goles_local or
                    db_match["goles_visitante"] != goles_visitante
                )
                
                if necesita_actualizacion:
                    supabase.table("partidos").update({
                        "goles_local": goles_local,
                        "goles_visitante": goles_visitante,
                        "estado": "finalizado"
                    }).eq("id", db_match["id"]).execute()
                    
                    res_preds = supabase.table("predicciones").select("*").eq("partido_id", db_match["id"]).execute()
                    preds = res_preds.data or []
                    
                    for pred in preds:
                        puntos = calcular_puntos(
                            pred_local=pred["pred_local"],
                            pred_visitante=pred["pred_visitante"],
                            real_local=goles_local,
                            real_visitante=goles_visitante,
                            fase=db_match["fase"]
                        )
                        supabase.table("predicciones").update({
                            "puntos_obtenidos": puntos
                        }).eq("id", pred["id"]).execute()
                        total_recalculados += 1
                        
                    partidos_actualizados.append({
                        "partido": f"{db_match['equipo_local']} vs {db_match['equipo_visitante']}",
                        "goles": f"{goles_local}-{goles_visitante}",
                        "predicciones_actualizadas": len(preds)
                    })
                    
        return {
            "status": "success",
            "partidos_actualizados": partidos_actualizados,
            "total_predicciones_recalculadas": total_recalculados
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la sincronización manual: {str(e)}")
