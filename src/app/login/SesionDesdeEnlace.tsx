"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Los correos por defecto de Supabase (invitación, enlace mágico, recuperar contraseña)
 * devuelven al usuario a la web con la sesión en el fragmento de la URL:
 *   /#access_token=...&refresh_token=...&type=invite
 * El middleware lo manda a /login (el fragmento se conserva) y aquí lo convertimos
 * en una sesión con cookies, para que el servidor la reconozca.
 */
export default function SesionDesdeEnlace() {
  const [estado, setEstado] = useState<"nada" | "entrando" | "error">("nada");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const p = new URLSearchParams(hash);

    if (p.get("error")) {
      setEstado("error");
      setMensaje(
        p.get("error_code") === "otp_expired"
          ? "El enlace ha caducado o ya se ha usado. Pide otra invitación o un enlace nuevo."
          : p.get("error_description")?.replace(/\+/g, " ") ?? "No se ha podido entrar con ese enlace."
      );
      history.replaceState(null, "", window.location.pathname);
      return;
    }

    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (!access_token || !refresh_token) return;

    setEstado("entrando");
    const tipo = p.get("type");
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setEstado("error");
          setMensaje("No se ha podido iniciar la sesión. Vuelve a intentarlo.");
          return;
        }
        // Invitación o recuperar contraseña → a ponerse contraseña
        window.location.replace(tipo === "invite" || tipo === "recovery" || tipo === "signup" ? "/cuenta?nuevo=1" : "/");
      });
  }, []);

  if (estado === "entrando") {
    return <p className="mb-4 rounded-lg bg-azul/5 p-3 text-sm text-azul">Entrando…</p>;
  }
  if (estado === "error") {
    return <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>;
  }
  return null;
}
