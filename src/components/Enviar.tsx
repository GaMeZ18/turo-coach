"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Botón de envío para cualquier formulario con server action.
 * - Mientras guarda: se desactiva y muestra un spinner (evita duplicados por doble clic).
 * - Con `confirmar`: pide confirmación antes de enviar (para borrados).
 */
export default function Enviar({
  children,
  className = "btn-primario",
  confirmar,
  pendiente,
  title,
  formAction,
}: {
  children: React.ReactNode;
  className?: string;
  confirmar?: string;
  pendiente?: React.ReactNode;
  title?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait`}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {pending ? (
        pendiente ?? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {typeof children === "string" ? <span>{children}</span> : null}
          </>
        )
      ) : (
        children
      )}
    </button>
  );
}
