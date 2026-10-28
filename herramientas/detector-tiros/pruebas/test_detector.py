import json
import os
import sys
import tempfile
import unittest

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
sys.path.insert(0, AQUI)

import detector  # noqa: E402
import video_sintetico  # noqa: E402


class PruebaDetector(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.video = os.path.join(cls.dir, "partido.mp4")
        cls.reales = video_sintetico.generar(cls.video)
        x, y, w, h = video_sintetico.ARO
        detector.main(["calibrar", cls.video, "--aro", f"derecha={x},{y},{w},{h}"])
        cls.salida = os.path.join(cls.dir, "partido.detecciones.json")
        detector.main(["analizar", cls.video, "--perfil", "preciso", "--depurar"])
        with open(cls.salida, encoding="utf-8") as f:
            cls.res = json.load(f)

    def test_encuentra_los_tiros_y_no_el_pase(self):
        ts = [round(e["t"]) for e in self.res["eventos"]]
        self.assertEqual(len(self.res["eventos"]), 3, ts)
        for r in self.reales:
            self.assertTrue(any(abs(e["t"] - r["momento"]) < 1.5 for e in self.res["eventos"]), f"No encuentra el tiro de {r['momento']}")

    def test_resultado(self):
        por_t = sorted(self.res["eventos"], key=lambda e: e["t"])
        self.assertEqual([e["resultado"] for e in por_t], ["anotada", "fallada", "anotada"])

    def test_capturas(self):
        carpeta = os.path.join(self.dir, "partido.detecciones_capturas")
        self.assertTrue(os.path.isdir(carpeta))
        self.assertEqual(len(os.listdir(carpeta)), len(self.res["eventos"]))

    def test_evaluar(self):
        eti = os.path.join(self.dir, "etiquetas.json")
        with open(eti, "w", encoding="utf-8") as f:
            json.dump({"clips": self.reales}, f)
        r = detector.main(["evaluar", self.salida, eti])
        out = os.path.join(self.dir, "ev.json")
        detector.main(["evaluar", self.salida, eti, "--salida", out])
        with open(out, encoding="utf-8") as f:
            ev = json.load(f)
        self.assertEqual(ev["recall"], 1.0)
        self.assertEqual(ev["precision"], 1.0)
        self.assertEqual(ev["acierto_resultado"], 1.0)

    def test_sin_calibracion(self):
        otro = os.path.join(self.dir, "otro.mp4")
        os.link(self.video, otro) if hasattr(os, "link") else None
        with self.assertRaises(SystemExit):
            detector.main(["analizar", otro])

    def test_video_inexistente(self):
        with self.assertRaises(SystemExit):
            detector.main(["analizar", os.path.join(self.dir, "no_existe.mp4")])


if __name__ == "__main__":
    unittest.main(verbosity=2)
