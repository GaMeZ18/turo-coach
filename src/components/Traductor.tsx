"use client";

import { useEffect } from "react";
import { aCatalan } from "@/lib/ca";

const ATRIBUTOS = ["placeholder", "title", "aria-label"];

/** Si el idioma es catalán, traduce los textos de la interfaz que se ven (y los que van apareciendo) */
export default function Traductor({ idioma }: { idioma: string }) {
  useEffect(() => {
    if (idioma !== "ca") return;
    const raiz = document.body;
    const saltar = (el: Element | null) => !!el?.closest("script, style, textarea, input, [translate='no'], [data-no-traducir], code, pre");

    const nodo = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) {
        if (saltar(n.parentElement)) return;
        const t = aCatalan(n.nodeValue ?? "");
        if (t !== null && t !== n.nodeValue) n.nodeValue = t;
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      const el = n as Element;
      if (el.matches("script, style, [translate='no'], [data-no-traducir]")) return;
      for (const a of ATRIBUTOS) {
        const v = el.getAttribute(a);
        if (v) { const t = aCatalan(v); if (t !== null && t !== v) el.setAttribute(a, t); }
      }
      if (el.tagName === "OPTION" || el.tagName === "BUTTON") { /* su texto va en nodos hijos */ }
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let x = w.nextNode(); x; x = w.nextNode()) {
        if (x.nodeType === Node.TEXT_NODE) {
          if (saltar(x.parentElement)) continue;
          const t = aCatalan(x.nodeValue ?? "");
          if (t !== null && t !== x.nodeValue) x.nodeValue = t;
        } else {
          const e = x as Element;
          for (const a of ATRIBUTOS) {
            const v = e.getAttribute(a);
            if (v) { const t = aCatalan(v); if (t !== null && t !== v) e.setAttribute(a, t); }
          }
        }
      }
    };

    nodo(raiz);
    document.title = aCatalan(document.title) ?? document.title;
    document.documentElement.setAttribute("data-traducido", "1");

    const obs = new MutationObserver((cambios) => {
      for (const c of cambios) {
        if (c.type === "characterData") nodo(c.target);
        else if (c.type === "attributes" && c.target.nodeType === Node.ELEMENT_NODE) {
          const e = c.target as Element, v = e.getAttribute(c.attributeName!);
          if (v) { const t = aCatalan(v); if (t !== null && t !== v) e.setAttribute(c.attributeName!, t); }
        } else c.addedNodes.forEach(nodo);
      }
    });
    obs.observe(raiz, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });

    // window.confirm de los botones de borrar
    const confirmar = window.confirm.bind(window);
    window.confirm = (m?: string) => confirmar(m ? aCatalan(m) ?? m : m);
    return () => { obs.disconnect(); window.confirm = confirmar; };
  }, [idioma]);
  return null;
}
