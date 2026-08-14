// ---------------------------------------------------------------------------
// Capa de almacenamiento.
//
// Una sola interfaz, dos implementaciones:
//
//   - Supabase  → cuando hay credenciales en .env. Es la de producción: los
//                 datos se comparten entre todas las personas y dispositivos.
//   - localStorage → cuando no las hay. Solo local a cada navegador; sirve para
//                 desarrollar la interfaz sin conectarse a nada.
//
// Interfaz:
//   listar(prefijo)                        → array de objetos, del más nuevo al más viejo
//   guardar(prefijo, item | items[])       → crea (acepta uno o varios)
//   actualizarEstado(prefijo, id, estado)  → solo cambia el estado de una publicación
//   eliminar(prefijo, id)                  → borra
//
// A diferencia de la Fase 1, los errores SE LANZAN en vez de solo registrarse:
// con una base de datos remota, un guardado puede fallar de verdad y la persona
// tiene que enterarse en lugar de creer que publicó.
// ---------------------------------------------------------------------------

import { supabase, hayBackend } from "./supabase.js";

// Los prefijos de la Fase 1 se conservan como identificador de colección.
const TABLAS = {
  "sol:": { tabla: "publicaciones", filtro: { tipo: "solicitud" }, upsert: false },
  "ofr:": { tabla: "publicaciones", filtro: { tipo: "oferta" }, upsert: false },
  "aco:": { tabla: "puntos", filtro: null, upsert: true },
  "gui:": { tabla: "guia", filtro: null, upsert: true },
  "arr:": { tabla: "arriendos", filtro: null, upsert: false },
};

const destino = (prefijo) => {
  const t = TABLAS[prefijo];
  if (!t) throw new Error(`Prefijo de almacenamiento desconocido: ${prefijo}`);
  return t;
};

// Postgres usa snake_case; el resto de la app usa camelCase. La única columna
// que difiere hoy es tipoPunto.
const aFila = {
  publicaciones: (o) => o,
  guia: (o) => o,
  arriendos: (o) => o,
  puntos: ({ tipoPunto, ...resto }) => ({ ...resto, tipo_punto: tipoPunto }),
};

const aObjeto = {
  publicaciones: (r) => r,
  guia: (r) => r,
  arriendos: (r) => r,
  puntos: ({ tipo_punto, ...resto }) => ({ ...resto, tipoPunto: tipo_punto }),
};

const LIMITE = 2000; // tope de filas por consulta

const fallo = (accion, error) => {
  console.error(`No se pudo ${accion}`, error);
  return new Error(
    `No se pudo ${accion}. Revisa tu conexión e inténtalo otra vez.`
  );
};

// --- Implementación Supabase ------------------------------------------------

const remoto = {
  async listar(prefijo) {
    const { tabla, filtro } = destino(prefijo);
    let q = supabase
      .from(tabla)
      .select("*")
      .order("creado", { ascending: false })
      .limit(LIMITE);
    if (filtro) q = q.match(filtro);

    const { data, error } = await q;
    if (error) throw fallo("cargar la información", error);
    return (data || []).map(aObjeto[tabla]);
  },

  async guardar(prefijo, item) {
    const { tabla, upsert } = destino(prefijo);
    const filas = (Array.isArray(item) ? item : [item]).map(aFila[tabla]);
    if (filas.length === 0) return;

    const { error } = upsert
      ? await supabase.from(tabla).upsert(filas)
      : await supabase.from(tabla).insert(filas);
    if (error) throw fallo("guardar", error);
  },

  async actualizarEstado(prefijo, id, estado) {
    const { tabla } = destino(prefijo);
    const { error } = await supabase.from(tabla).update({ estado }).eq("id", id);
    if (error) throw fallo("cambiar el estado", error);
  },

  async eliminar(prefijo, id) {
    const { tabla } = destino(prefijo);
    const { error } = await supabase.from(tabla).delete().eq("id", id);
    if (error) throw fallo("eliminar", error);
  },
};

// --- Implementación localStorage (modo sin backend) -------------------------

const NS = "qsa";
const clave = (prefijo, id) => `${NS}:${prefijo}${id}`;

const local = {
  async listar(prefijo) {
    destino(prefijo);
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${NS}:${prefijo}`)) {
          try {
            out.push(JSON.parse(localStorage.getItem(k)));
          } catch {
            // ignora entradas corruptas
          }
        }
      }
    } catch (e) {
      throw fallo("cargar la información", e);
    }
    return out.filter(Boolean).sort((a, b) => (b.creado || 0) - (a.creado || 0));
  },

  async guardar(prefijo, item) {
    destino(prefijo);
    const items = Array.isArray(item) ? item : [item];
    try {
      for (const it of items) {
        localStorage.setItem(clave(prefijo, it.id), JSON.stringify(it));
      }
    } catch (e) {
      throw fallo("guardar", e);
    }
  },

  async actualizarEstado(prefijo, id, estado) {
    destino(prefijo);
    try {
      const k = clave(prefijo, id);
      const actual = JSON.parse(localStorage.getItem(k) || "null");
      if (!actual) throw new Error("no existe");
      localStorage.setItem(k, JSON.stringify({ ...actual, estado }));
    } catch (e) {
      throw fallo("cambiar el estado", e);
    }
  },

  async eliminar(prefijo, id) {
    destino(prefijo);
    try {
      localStorage.removeItem(clave(prefijo, id));
    } catch (e) {
      throw fallo("eliminar", e);
    }
  },
};

export const store = hayBackend ? remoto : local;
