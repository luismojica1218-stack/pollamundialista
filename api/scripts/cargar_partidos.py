import os
import sys
from datetime import datetime, timedelta
import httpx
from supabase import create_client, Client

# Helper para cargar variables de entorno desde un archivo .env si existe
def load_env():
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'web', '.env.local'),
        os.path.join(os.path.dirname(__file__), '..', '.env'),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            print(f"Cargando variables de entorno desde: {path}")
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, val = line.split('=', 1)
                        os.environ[key.strip()] = val.strip().strip('"').strip("'")
            break

load_env()

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas en las variables de entorno.")
    sys.exit(1)

# Inicializar cliente de Supabase
supabase: Client = create_client(supabase_url, supabase_key)

# Mapeo de fases de ESPN a la base de datos
FASE_MAPPING = {
    'group-stage': 'grupos',
    'round-of-32': 'ronda32',
    'round-of-16': 'octavos',
    'quarterfinals': 'cuartos',
    'semifinals': 'semis',
    '3rd-place-match': 'tercer_puesto',
    'final': 'final'
}

# Mapeo de estado de ESPN a la base de datos
ESTADO_MAPPING = {
    'pre': 'programado',
    'in': 'en_juego',
    'post': 'finalizado'
}

def sync_matches():
    # Fechas de inicio y fin del mundial 2026
    start_date = datetime(2026, 6, 11)
    end_date = datetime(2026, 7, 19)
    delta = timedelta(days=1)
    
    current_date = start_date
    total_upserted = 0
    
    print("Iniciando carga de partidos desde la API de ESPN...")
    
    while current_date <= end_date:
        date_str = current_date.strftime("%Y%m%d")
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates={date_str}"
        
        try:
            response = httpx.get(url)
            if response.status_code != 200:
                print(f"Error {response.status_code} al consultar fecha {date_str}")
                current_date += delta
                continue
                
            data = response.json()
            events = data.get("events", [])
            
            if events:
                print(f"Procesando {len(events)} partidos para el {current_date.strftime('%Y-%m-%d')}...")
                
            for event in events:
                event_id = event.get("id")
                date_utc = event.get("date") # ISO 8601 UTC format
                
                # Derivar fase
                espn_slug = event.get("season", {}).get("slug", "group-stage")
                fase = FASE_MAPPING.get(espn_slug, "grupos")
                
                # Obtener estado
                espn_state = event.get("status", {}).get("type", {}).get("state", "pre")
                estado = ESTADO_MAPPING.get(espn_state, "programado")
                
                # Parsear competidores (equipos)
                competitions = event.get("competitions", [])
                if not competitions:
                    continue
                    
                competitors = competitions[0].get("competitors", [])
                if len(competitors) < 2:
                    continue
                
                home_team = None
                away_team = None
                goles_local = None
                goles_visitante = None
                
                for comp in competitors:
                    role = comp.get("homeAway")
                    team_name = comp.get("team", {}).get("displayName", "TBD")
                    score_str = comp.get("score")
                    
                    if role == "home":
                        home_team = team_name
                        if espn_state == "post" and score_str is not None:
                            goles_local = int(score_str)
                    elif role == "away":
                        away_team = team_name
                        if espn_state == "post" and score_str is not None:
                            goles_visitante = int(score_str)
                
                # Preparar payload
                payload = {
                    "espn_event_id": event_id,
                    "equipo_local": home_team,
                    "equipo_visitante": away_team,
                    "inicio_utc": date_utc,
                    "fase": fase,
                    "estado": estado
                }
                
                # Si el partido ya finalizó, incluimos los goles
                if estado == "finalizado":
                    payload["goles_local"] = goles_local
                    payload["goles_visitante"] = goles_visitante
                
                # Realizar UPSERT en la base de datos
                try:
                    res = supabase.table("partidos").upsert(payload).execute()
                    if res.data:
                        total_upserted += 1
                except Exception as e:
                    print(f"Error al guardar partido {event_id} ({home_team} vs {away_team}): {e}")
                    
        except Exception as e:
            print(f"Error procesando la fecha {date_str}: {e}")
            
        current_date += delta
        
    print(f"\nSincronización completada. Se guardaron/actualizaron {total_upserted} partidos en la base de datos.")

if __name__ == "__main__":
    sync_matches()
