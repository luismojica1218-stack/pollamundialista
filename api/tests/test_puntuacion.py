import sys
import os

# Asegurar que la ruta 'api' esté en el path de Python
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from puntuacion import calcular_puntos, calcular_puntos_torneo

def test_puntos_marcador_exacto_octavos():
    # 2-1 real, 2-1 pred, octavos -> (3+5+1+1)*2 = 20
    assert calcular_puntos(pred_local=2, pred_visitante=1, real_local=2, real_visitante=1, fase='octavos') == 20

def test_puntos_ganador_y_un_goles_octavos():
    # 2-1 real, 3-1 pred, octavos -> (3+0+0+1)*2 = 8
    assert calcular_puntos(pred_local=3, pred_visitante=1, real_local=2, real_visitante=1, fase='octavos') == 8

def test_puntos_solo_ganador_grupos():
    # 2-1 real, 1-0 pred, grupos -> (3+0+0+0)*1 = 3
    assert calcular_puntos(pred_local=1, pred_visitante=0, real_local=2, real_visitante=1, fase='grupos') == 3

def test_puntos_marcador_exacto_empate_final():
    # 0-0 real, 0-0 pred, final -> (3+5+1+1)*4 = 40
    assert calcular_puntos(pred_local=0, pred_visitante=0, real_local=0, real_visitante=0, fase='final') == 40

def test_puntos_sin_acierto_grupos():
    # 2-1 real, 0-2 pred, grupos -> 0
    assert calcular_puntos(pred_local=0, pred_visitante=2, real_local=2, real_visitante=1, fase='grupos') == 0

def test_puntos_torneo():
    # Ambos correctos -> 25 + 15 = 40
    assert calcular_puntos_torneo("Argentina", "Argentina", "Messi", "Messi") == 40
    # Solo campeón correcto -> 25
    assert calcular_puntos_torneo("Francia", "  FRANCIA  ", "Mbappe", "Messi") == 25
    # Solo jugador correcto -> 15
    assert calcular_puntos_torneo("Brasil", "Uruguay", "Vinicius Jr", "vinicius jr") == 15
    # Ninguno correcto -> 0
    assert calcular_puntos_torneo("Brasil", "Uruguay", "Mbappe", "Messi") == 0
