def calcular_puntos(pred_local: int, pred_visitante: int, real_local: int, real_visitante: int, fase: str) -> int:
    """
    Calcula los puntos obtenidos por una predicción en base al resultado real y la fase del torneo.
    Lógica de puntos base:
    - Acertar signo (1/X/2): +3 puntos
    - Acertar marcador exacto: +5 puntos
    - Acertar goles de equipo local: +1 punto
    - Acertar goles de equipo visitante: +1 punto
    Multiplicadores por fase:
    - grupos: 1
    - ronda32: 1.5
    - octavos: 2
    - cuartos: 2.5
    - semis: 3
    - final: 4
    - tercer_puesto: 4
    """
    base = 0
    
    # 1. Determinar signo de la predicción y del resultado real
    pred_signo = 1 if pred_local > pred_visitante else (2 if pred_local < pred_visitante else 0)
    real_signo = 1 if real_local > real_visitante else (2 if real_local < real_visitante else 0)
    
    # Acertar ganador o empate
    if pred_signo == real_signo:
        base += 3
        
    # 2. Acertar marcador exacto
    if pred_local == real_local and pred_visitante == real_visitante:
        base += 5
        
    # 3. Acertar goles de cada equipo
    if pred_local == real_local:
        base += 1
    if pred_visitante == real_visitante:
        base += 1
        
    # 4. Multiplicador de fase
    multiplicadores = {
        'grupos': 1,
        'ronda32': 1.5,
        'octavos': 2,
        'cuartos': 2.5,
        'semis': 3,
        'final': 4,
        'tercer_puesto': 4
    }
    
    mult = multiplicadores.get(fase, 1)
    
    # Calcular total redondeado
    return round(base * mult)


def calcular_puntos_torneo(pred_campeon: str | None, real_campeon: str | None, pred_jugador: str | None, real_jugador: str | None) -> int:
    """
    Calcula los puntos de las predicciones especiales del torneo.
    - Campeón correcto: 25 puntos
    - Mejor jugador correcto: 15 puntos
    """
    puntos = 0
    
    # Limpiar y normalizar strings para comparación insensible a mayúsculas y espacios
    def clean(s: str | None) -> str:
        if not s:
            return ""
        return " ".join(s.strip().lower().split())
        
    if pred_campeon and real_campeon and clean(pred_campeon) == clean(real_campeon):
        puntos += 25
        
    if pred_jugador and real_jugador and clean(pred_jugador) == clean(real_jugador):
        puntos += 15
        
    return puntos
