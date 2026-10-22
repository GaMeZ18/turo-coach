# Genera public/extension/turo-coach-fcbq.zip (ejecutar tras cambiar la extensión)
import pathlib, zipfile
raiz = pathlib.Path(__file__).parent
dest = raiz.parent / "public" / "extension" / "turo-coach-fcbq.zip"
with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(raiz.iterdir()):
        if f.suffix in (".json", ".js", ".png"):
            z.write(f, f"turo-coach-fcbq/{f.name}")
print(dest)
