"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { justificanteSubido, urlJustificante } from "../../actions";

export default function Justificante({ codigo, yaSubido }: { codigo: string; yaSubido: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"" | "subiendo" | "ok">("");
  const [error, setError] = useState("");
  const subir = async (f: File) => {
    setError(""); setEstado("subiendo");
    const tipo = f.type || (f.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const u = await urlJustificante(codigo, tipo, f.size);
    if (u.error || !u.ruta || !u.token) { setError(u.error ?? "Error"); setEstado(""); return; }
    const { error: e } = await createClient().storage.from("eventos-justificantes").uploadToSignedUrl(u.ruta, u.token, f, { contentType: tipo });
    if (e) { setError("No se ha podido subir. Prueba otra vez."); setEstado(""); return; }
    const r = await justificanteSubido(codigo, u.ruta);
    if (r.error) { setError(r.error); setEstado(""); return; }
    setEstado("ok");
    router.refresh();
  };
  return (
    <div>
      <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
      <button type="button" disabled={estado === "subiendo"} onClick={() => input.current?.click()} className="btn-primario w-full justify-center">
        <Upload size={16} /> {estado === "subiendo" ? "Subiendo…" : yaSubido || estado === "ok" ? "Cambiar el justificante" : "Subir justificante"}
      </button>
      {(estado === "ok" || yaSubido) && <p className="mt-2 text-center text-sm text-green-700">✓ Justificante recibido. Te avisaremos por email cuando esté validado.</p>}
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
