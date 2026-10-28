#!/usr/bin/env python3
"""
Detector de tiros · Coach Manager CBTuró (prueba piloto)

Analiza en tu ordenador el vídeo original de un partido grabado con cámara fija y busca
los momentos en los que el balón llega al aro: «tiro candidato», y si puede, si entra o no.
El resultado es un archivo JSON que se importa en Coach Manager (Vídeo → Importar detecciones)
como clips «por revisar».

Solo usa OpenCV y NumPy (licencias Apache 2.0 y BSD). No envía nada a internet.

Uso:
  python detector.py calibrar  PARTIDO.mp4                # marcar los aros con el ratón
  python detector.py analizar  PARTIDO.mp4                # buscar los tiros
  python detector.py evaluar   PARTIDO.detecciones.json ETIQUETAS.json   # comparar con lo etiquetado a mano
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass, field, asdict

# Consola de Windows: que las tildes no rompan la salida
for _f in (sys.stdout, sys.stderr):
    try:
        _f.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import numpy as np  # antes que cv2 (necesario en el ejecutable de Windows)
    import cv2
except ImportError as _e:  # mensaje claro si falta algo
    print(f"({_e})")
    print("Falta OpenCV o NumPy. Ejecuta primero instalar.bat (o: pip install -r requirements.txt).")
    sys.exit(1)

VERSION = "0.1.0"

# Perfiles: fotogramas por segundo que se analizan alrededor de los aros
PERFILES = {"rapido": 8, "equilibrado": 12, "preciso": 20}

# Color del balón por defecto (HSV de OpenCV: H 0-180). Se puede ajustar al calibrar.
BALON_DEFECTO = {"h_min": 2, "h_max": 22, "s_min": 90, "v_min": 70}


# ----------------------------------------------------------------------------- utilidades
def ruta_calibracion(video: str) -> str:
    return os.path.splitext(video)[0] + ".aros.json"


def ruta_salida(video: str) -> str:
    return os.path.splitext(video)[0] + ".detecciones.json"


def mmss(s: float) -> str:
    s = max(0, int(round(s)))
    h, m, ss = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{ss:02d}" if h else f"{m}:{ss:02d}"


def abrir_video(ruta: str):
    if not os.path.isfile(ruta):
        raise SystemExit(f"No encuentro el vídeo: {ruta}")
    cap = cv2.VideoCapture(ruta)
    if not cap.isOpened():
        raise SystemExit(f"No puedo abrir el vídeo (¿formato raro o archivo dañado?): {ruta}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    ancho = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    alto = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if fps <= 0 or fps > 240:
        fps = 25.0
    return cap, fps, n, ancho, alto


# ----------------------------------------------------------------------------- calibración
def calibrar(args) -> None:
    cap, fps, n, ancho, alto = abrir_video(args.video)
    datos = {"video": os.path.basename(args.video), "ancho": ancho, "alto": alto, "aros": [], "balon": dict(BALON_DEFECTO)}

    if args.aro:  # sin ventanas: --aro izquierda=x,y,w,h
        for txt in args.aro:
            nombre, _, nums = txt.partition("=")
            x, y, w, h = (int(float(v)) for v in nums.split(","))
            datos["aros"].append({"nombre": nombre.strip() or f"aro{len(datos['aros']) + 1}", "x": x, "y": y, "w": w, "h": h})
    else:
        cap.set(cv2.CAP_PROP_POS_MSEC, args.segundo * 1000)
        ok, frame = cap.read()
        if not ok:
            raise SystemExit("No he podido leer ese momento del vídeo. Prueba con --segundo 60.")
        for nombre in ("izquierda", "derecha"):
            print(f"\nDibuja un rectángulo justo alrededor del ARO de la canasta {nombre.upper()} (solo el aro, no el tablero).")
            print("  Enter o Espacio = aceptar · C = no se ve esta canasta / saltar")
            r = cv2.selectROI(f"Aro {nombre} · Enter para aceptar, C para saltar", frame, showCrosshair=True)
            cv2.destroyAllWindows()
            if r[2] > 3 and r[3] > 1:
                datos["aros"].append({"nombre": nombre, "x": int(r[0]), "y": int(r[1]), "w": int(r[2]), "h": int(r[3])})
        if not args.sin_balon:
            print("\n(Opcional) Busca un momento en el que se vea bien el balón y dibuja un rectángulo pequeño SOLO sobre el balón.")
            print("  Si en este fotograma no se ve, pulsa C y se usará el naranja por defecto.")
            r = cv2.selectROI("Balón (opcional) · Enter para aceptar, C para saltar", frame, showCrosshair=True)
            cv2.destroyAllWindows()
            if r[2] > 2 and r[3] > 2:
                datos["balon"] = color_balon(frame[r[1]:r[1] + r[3], r[0]:r[0] + r[2]])
    cap.release()
    if not datos["aros"]:
        raise SystemExit("No se ha marcado ningún aro. Vuelve a ejecutar la calibración.")
    salida = args.salida or ruta_calibracion(args.video)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"\nCalibración guardada en: {salida}")
    for a in datos["aros"]:
        print(f"  Aro {a['nombre']}: x={a['x']} y={a['y']} ancho={a['w']} alto={a['h']}")


def color_balon(recorte) -> dict:
    hsv = cv2.cvtColor(recorte, cv2.COLOR_BGR2HSV).reshape(-1, 3)
    # nos quedamos con los píxeles con color (no el fondo gris)
    con_color = hsv[(hsv[:, 1] > 60) & (hsv[:, 2] > 50)]
    if len(con_color) < 5:
        return dict(BALON_DEFECTO)
    h, s, v = np.median(con_color, axis=0)
    return {"h_min": int(max(0, h - 10)), "h_max": int(min(179, h + 10)), "s_min": int(max(60, s - 70)), "v_min": int(max(50, v - 80))}


# ----------------------------------------------------------------------------- análisis
@dataclass
class Aro:
    nombre: str
    x: int
    y: int
    w: int
    h: int
    # zona de trabajo alrededor del aro (recorte del fotograma)
    x0: int = 0
    y0: int = 0
    x1: int = 0
    y1: int = 0

    def preparar(self, ancho: int, alto: int) -> None:
        W = self.w
        self.x0 = max(0, int(self.x - 1.6 * W))
        self.x1 = min(ancho, int(self.x + self.w + 1.6 * W))
        self.y0 = max(0, int(self.y - 2.8 * W))
        self.y1 = min(alto, int(self.y + self.h + 1.6 * W))

    def a_aro(self, cx: float, cy: float) -> tuple[float, float]:
        """Coordenadas relativas al aro, en «anchos de aro»: u horizontal desde el centro, v vertical desde el borde superior (negativo = por encima)."""
        return ((cx - (self.x + self.w / 2)) / self.w, (cy - self.y) / self.w)


@dataclass
class Evento:
    t: float               # momento del tiro (llegada al aro), en segundos del vídeo
    t_inicio: float
    t_fin: float
    canasta: str
    resultado: str         # anotada / fallada / desconocido
    confianza: float
    observaciones: int
    trayectoria: list = field(default_factory=list)  # [(t, u, v)] para depurar


class SeguidorAro:
    """Busca el balón cerca de un aro y decide si hay tiro y si entra."""

    def __init__(self, aro: Aro, balon: dict, fps_analisis: float):
        self.aro = aro
        self.balon = balon
        self.fondo = cv2.createBackgroundSubtractorMOG2(history=int(fps_analisis * 20), varThreshold=24, detectShadows=False)
        d = 0.53 * aro.w  # diámetro esperado del balón junto al aro (24 cm de balón / 45 cm de aro)
        self.area_min = math.pi * (d / 2) ** 2 * 0.2
        self.area_max = math.pi * (d / 2) ** 2 * 3.5
        self.kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        self.obs: list[tuple[float, float, float]] = []   # observaciones de la jugada en curso
        self.ultimo_t = -1e9
        self.eventos: list[Evento] = []
        self.fin_ultimo = -1e9

    def procesar(self, t: float, frame) -> None:
        a = self.aro
        rec = frame[a.y0:a.y1, a.x0:a.x1]
        if rec.size == 0:
            return
        mov = self.fondo.apply(rec)
        hsv = cv2.cvtColor(rec, cv2.COLOR_BGR2HSV)
        b = self.balon
        color = cv2.inRange(hsv, (b["h_min"], b["s_min"], b["v_min"]), (b["h_max"], 255, 255))
        mascara = cv2.bitwise_and(mov, color)
        mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, self.kernel)
        mascara = cv2.dilate(mascara, self.kernel, iterations=1)
        contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        mejor = None
        for c in contornos:
            area = cv2.contourArea(c)
            if not (self.area_min <= area <= self.area_max):
                continue
            x, y, w, h = cv2.boundingRect(c)
            if not (0.4 <= w / max(h, 1) <= 2.5):
                continue
            cx, cy = a.x0 + x + w / 2, a.y0 + y + h / 2
            u, v = a.a_aro(cx, cy)
            if abs(u) > 1.7 or v < -2.8 or v > 1.6:
                continue
            # el más cercano a la última posición (o al aro si no hay)
            ref = (self.obs[-1][1], self.obs[-1][2]) if self.obs else (0.0, -1.0)
            dist = (u - ref[0]) ** 2 + (v - ref[1]) ** 2
            if mejor is None or dist < mejor[0]:
                mejor = (dist, u, v)
        if mejor:
            self.registrar(t, mejor[1], mejor[2])
        elif self.obs and t - self.ultimo_t > 1.2:
            self.cerrar()

    def registrar(self, t: float, u: float, v: float) -> None:
        if self.obs and t - self.ultimo_t > 1.2:
            self.cerrar()
        self.obs.append((t, u, v))
        self.ultimo_t = t
        if t - self.obs[0][0] > 4.0:  # una jugada no dura tanto junto al aro
            self.cerrar()

    def cerrar(self) -> None:
        obs, self.obs = self.obs, []
        if len(obs) < 2:
            return
        arriba = [o for o in obs if o[2] < -0.15 and abs(o[1]) < 1.4]
        if not arriba:
            return  # el balón no ha pasado por encima del aro: no es un tiro (un pase o un bote)
        en_aro = [o for o in obs if abs(o[1]) < 0.5 and -0.2 <= o[2] <= 0.35]
        red = [o for o in obs if abs(o[1]) < 0.65 and 0.3 < o[2] <= 1.5]
        # Entra: pasa por el aro y luego por la red, bajando y centrado
        t_arriba = arriba[0][0]
        anotada = False
        if red:
            primero_red = red[0][0]
            antes = [o for o in obs if o[0] <= primero_red and o[2] < 0.3]
            centrado = all(abs(o[1]) < 0.8 for o in obs if o[0] >= primero_red - 0.3 and o[0] <= primero_red)
            anotada = bool(antes) and centrado and primero_red >= t_arriba
        if anotada:
            resultado = "anotada"
        elif len(arriba) >= 2 and not red:
            resultado = "fallada"
        else:
            resultado = "desconocido"
        # Momento del tiro: cuando el balón llega a la altura del aro (o la última vez que se ve arriba)
        llegada = en_aro[0][0] if en_aro else (red[0][0] if red else arriba[-1][0])
        # Confianza: más observaciones y trayectoria de arco (sube o está arriba y luego baja) = más fiable
        vs = [o[2] for o in obs]
        baja_al_final = vs[-1] > min(vs)
        conf = min(1.0, 0.25 + 0.1 * len(obs)) * (1.0 if baja_al_final else 0.7) * (1.0 if resultado != "desconocido" else 0.8)
        if llegada - self.fin_ultimo < 1.5 and self.eventos:
            # rebote en el aro y vuelve a subir: misma jugada, nos quedamos con el resultado más informativo
            prev = self.eventos[-1]
            if prev.resultado != "anotada" and resultado == "anotada":
                prev.resultado, prev.confianza = "anotada", max(prev.confianza, conf)
            prev.t_fin = obs[-1][0]
            prev.observaciones += len(obs)
            prev.trayectoria += [list(o) for o in obs]
            self.fin_ultimo = obs[-1][0]
            return
        self.eventos.append(Evento(
            t=round(llegada, 2), t_inicio=round(obs[0][0], 2), t_fin=round(obs[-1][0], 2), canasta=self.aro.nombre,
            resultado=resultado, confianza=round(conf, 2), observaciones=len(obs), trayectoria=[[round(x, 2) for x in o] for o in obs],
        ))
        self.fin_ultimo = obs[-1][0]


def analizar(args) -> dict:
    cal = args.calibracion or ruta_calibracion(args.video)
    if not os.path.isfile(cal):
        raise SystemExit(f"Falta la calibración ({cal}). Ejecuta primero: python detector.py calibrar \"{args.video}\"")
    with open(cal, encoding="utf-8") as f:
        c = json.load(f)
    cap, fps, n, ancho, alto = abrir_video(args.video)
    if (c.get("ancho"), c.get("alto")) not in ((ancho, alto), (None, None)):
        print(f"Aviso: la calibración se hizo con un vídeo de {c.get('ancho')}x{c.get('alto')} y este es {ancho}x{alto}.")
    fps_an = args.fps or PERFILES[args.perfil]
    paso = max(1, round(fps / fps_an))
    aros = []
    for a in c["aros"]:
        aro = Aro(a["nombre"], a["x"], a["y"], a["w"], a["h"])
        aro.preparar(ancho, alto)
        aros.append(aro)
    seguidores = [SeguidorAro(a, c.get("balon", BALON_DEFECTO), fps / paso) for a in aros]
    inicio = max(0.0, args.inicio or 0.0)
    fin = args.fin if args.fin else (n / fps if n else 1e9)
    if inicio:
        cap.set(cv2.CAP_PROP_POS_MSEC, inicio * 1000)
    i = int(round(inicio * fps))
    t0 = time.time()
    ultimo_aviso = 0.0
    duracion = max(1.0, fin - inicio)
    interrumpido = False
    print(f"Analizando {os.path.basename(args.video)}: {ancho}x{alto}, {fps:.1f} fps, {mmss(duracion)} · {len(aros)} aro(s) · {fps / paso:.1f} fotogramas por segundo")
    try:
        while True:
            t = i / fps
            if t > fin:
                break
            if (i - int(round(inicio * fps))) % paso:
                if not cap.grab():
                    break
                i += 1
                continue
            ok, frame = cap.read()
            if not ok:
                break
            for s in seguidores:
                s.procesar(t, frame)
            i += 1
            if time.time() - ultimo_aviso > 2:
                ultimo_aviso = time.time()
                hecho = (t - inicio) / duracion
                pasado = time.time() - t0
                resto = pasado / hecho - pasado if hecho > 0.02 else None
                tiros = sum(len(s.eventos) for s in seguidores)
                print(f"\r  {hecho * 100:5.1f} %  vídeo {mmss(t)}  · tiros encontrados: {tiros}" + (f"  · faltan ~{mmss(resto)}" if resto else ""), end="", flush=True)
    except KeyboardInterrupt:
        interrumpido = True
        print("\nInterrumpido: guardo lo que se ha analizado hasta ahora.")
    for s in seguidores:
        if s.obs:
            s.cerrar()
    cap.release()
    eventos = sorted((e for s in seguidores for e in s.eventos), key=lambda e: e.t)
    if args.confianza_min:
        eventos = [e for e in eventos if e.confianza >= args.confianza_min]
    res = {
        "herramienta": "detector-tiros", "version": VERSION, "video": {"archivo": os.path.basename(args.video), "fps": fps, "ancho": ancho, "alto": alto, "duracion": round(n / fps, 1) if n else None},
        "ajustes": {"perfil": args.perfil, "fps_analisis": round(fps / paso, 2), "inicio": inicio, "fin": None if fin >= 1e9 else fin},
        "aros": [{"nombre": a.nombre, "x": a.x, "y": a.y, "w": a.w, "h": a.h} for a in aros],
        "analizado_hasta": round(min(fin, i / fps), 1), "interrumpido": interrumpido, "segundos_proceso": round(time.time() - t0, 1),
        "eventos": [{k: v for k, v in asdict(e).items() if args.depurar or k != "trayectoria"} for e in eventos],
    }
    salida = args.salida or ruta_salida(args.video)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    an = sum(1 for e in eventos if e.resultado == "anotada")
    fa = sum(1 for e in eventos if e.resultado == "fallada")
    print(f"\n\nListo en {mmss(time.time() - t0)}: {len(eventos)} tiros candidatos ({an} anotados, {fa} fallados, {len(eventos) - an - fa} sin saber).")
    for a in aros:
        print(f"  Canasta {a.nombre}: {sum(1 for e in eventos if e.canasta == a.nombre)}")
    print(f"Archivo para importar en Coach Manager: {salida}")
    if args.depurar:
        guardar_capturas(args.video, eventos, aros, os.path.splitext(salida)[0] + "_capturas")
    return res


def guardar_capturas(video: str, eventos: list[Evento], aros: list[Aro], carpeta: str) -> None:
    """Una imagen por tiro con la zona del aro y la trayectoria detectada (para comprobar a ojo)."""
    os.makedirs(carpeta, exist_ok=True)
    cap, fps, *_ = abrir_video(video)
    por_nombre = {a.nombre: a for a in aros}
    for k, e in enumerate(eventos):
        a = por_nombre[e.canasta]
        cap.set(cv2.CAP_PROP_POS_MSEC, e.t * 1000)
        ok, frame = cap.read()
        if not ok:
            continue
        img = frame[a.y0:a.y1, a.x0:a.x1].copy()
        cv2.rectangle(img, (a.x - a.x0, a.y - a.y0), (a.x - a.x0 + a.w, a.y - a.y0 + a.h), (255, 255, 0), 1)
        for _, u, v in e.trayectoria:
            px = int(a.x + a.w / 2 + u * a.w - a.x0)
            py = int(a.y + v * a.w - a.y0)
            cv2.circle(img, (px, py), 3, (0, 255, 0) if e.resultado == "anotada" else (0, 0, 255), -1)
        nombre = f"{k + 1:03d}_{mmss(e.t).replace(':', 'm')}s_{e.canasta}_{e.resultado}.jpg"
        cv2.imwrite(os.path.join(carpeta, nombre), img)
    cap.release()
    print(f"Capturas para revisar en: {carpeta}")


# ----------------------------------------------------------------------------- evaluación
def evaluar(args) -> dict:
    with open(args.detecciones, encoding="utf-8") as f:
        det = json.load(f)
    with open(args.etiquetas, encoding="utf-8") as f:
        eti = json.load(f)
    reales = [c for c in eti.get("clips", []) if c.get("estadistica") in ("t2", "t3", "tl")]
    if not args.con_libres:
        reales = [c for c in reales if c["estadistica"] != "tl"]
    detectados = list(det.get("eventos", []))
    hasta = det.get("analizado_hasta")
    if hasta:
        reales = [c for c in reales if c["momento"] <= hasta + args.tolerancia]
    usados = set()
    pares = []
    for d in sorted(detectados, key=lambda x: x["t"]):
        t = d["t"] + args.desfase
        cand = [(abs(c["momento"] - t), j) for j, c in enumerate(reales) if j not in usados and abs(c["momento"] - t) <= args.tolerancia]
        if cand:
            _, j = min(cand)
            usados.add(j)
            pares.append((d, reales[j]))
    tp = len(pares)
    precision = tp / len(detectados) if detectados else 0.0
    recall = tp / len(reales) if reales else 0.0
    con_res = [(d, c) for d, c in pares if d["resultado"] in ("anotada", "fallada") and c.get("resultado") in ("bien", "mal")]
    acierto_res = sum(1 for d, c in con_res if (d["resultado"] == "anotada") == (c["resultado"] == "bien")) / len(con_res) if con_res else None
    res = {
        "tiros_etiquetados": len(reales), "tiros_detectados": len(detectados), "coinciden": tp,
        "precision": round(precision, 3), "recall": round(recall, 3),
        "acierto_resultado": None if acierto_res is None else round(acierto_res, 3), "con_resultado_comparable": len(con_res),
        "no_encontrados": [round(reales[j]["momento"], 1) for j in range(len(reales)) if j not in usados],
        "falsos": [round(d["t"], 1) for d in detectados if not any(d is p[0] for p in pares)],
    }
    print(f"Tiros etiquetados a mano: {len(reales)}  ·  detectados: {len(detectados)}  ·  coinciden (±{args.tolerancia:g} s): {tp}")
    print(f"  Encuentra el {recall * 100:.0f} % de los tiros (recall) · el {precision * 100:.0f} % de lo detectado son tiros de verdad (precisión)")
    if acierto_res is not None:
        print(f"  Anotada/fallada correcta en el {acierto_res * 100:.0f} % de {len(con_res)} tiros comparables")
    if res["no_encontrados"]:
        print("  No encontrados (segundo del vídeo): " + ", ".join(mmss(x) for x in res["no_encontrados"][:30]))
    if res["falsos"]:
        print("  Detectados que no son tiros: " + ", ".join(mmss(x) for x in res["falsos"][:30]))
    if args.salida:
        with open(args.salida, "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
    return res


# ----------------------------------------------------------------------------- línea de órdenes
def main(argv=None) -> None:
    p = argparse.ArgumentParser(description="Detector de tiros de Coach Manager CBTuró (prueba piloto)")
    sub = p.add_subparsers(dest="orden", required=True)

    c = sub.add_parser("calibrar", help="Marcar los aros (y el color del balón) con el ratón")
    c.add_argument("video")
    c.add_argument("--segundo", type=float, default=120, help="Momento del vídeo que se muestra para marcar (por defecto 120)")
    c.add_argument("--aro", action="append", help="Sin ventana: nombre=x,y,ancho,alto (se puede repetir)")
    c.add_argument("--sin-balon", action="store_true", help="No preguntar por el color del balón")
    c.add_argument("--salida")
    c.set_defaults(func=calibrar)

    a = sub.add_parser("analizar", help="Buscar los tiros en el vídeo")
    a.add_argument("video")
    a.add_argument("--perfil", choices=PERFILES, default="equilibrado")
    a.add_argument("--fps", type=float, help="Fotogramas por segundo a analizar (anula el perfil)")
    a.add_argument("--inicio", type=float, help="Empezar en este segundo")
    a.add_argument("--fin", type=float, help="Acabar en este segundo")
    a.add_argument("--calibracion")
    a.add_argument("--confianza-min", type=float, default=0.0)
    a.add_argument("--depurar", action="store_true", help="Guardar una imagen por tiro y la trayectoria en el JSON")
    a.add_argument("--salida")
    a.set_defaults(func=analizar)

    e = sub.add_parser("evaluar", help="Comparar las detecciones con las etiquetas exportadas de Coach Manager")
    e.add_argument("detecciones")
    e.add_argument("etiquetas")
    e.add_argument("--tolerancia", type=float, default=3.0, help="Segundos de margen (por defecto 3)")
    e.add_argument("--desfase", type=float, default=0.0, help="Segundos a sumar a las detecciones si el vídeo de YouTube no empieza igual que el original")
    e.add_argument("--con-libres", action="store_true", help="Contar también los tiros libres")
    e.add_argument("--salida")
    e.set_defaults(func=evaluar)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
