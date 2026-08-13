// ---------------------------------------------------------------------------
// Comprueba que la conexión con Supabase quedó bien.
//
//   npm run verificar
//
// Revisa tres cosas, en orden:
//   1. que el .env tenga credenciales con forma válida
//   2. que las tablas del esquema existan y se puedan leer
//   3. que los permisos hagan lo que deben (que un visitante anónimo NO pueda
//      reescribir ni borrar publicaciones ajenas)
//
// No escribe ni borra nada: las pruebas de permisos apuntan a un id inexistente,
// porque Postgres revisa los permisos antes de mirar si hay filas que coincidan.
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const mal = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const aviso = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const titulo = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

const salir = (mensaje) => {
  console.log(`\n\x1b[31m${mensaje}\x1b[0m\n`);
  process.exit(1);
};

// --- 1. Credenciales --------------------------------------------------------

titulo("1. Credenciales (.env)");

let env;
try {
  env = readFileSync(join(raiz, ".env"), "utf8");
} catch {
  mal("No existe el archivo .env");
  salir("Ejecuta:  cp .env.example .env   y pega ahí tus credenciales.");
}

const vars = {};
for (const linea of env.split("\n")) {
  const limpia = linea.trim();
  if (!limpia || limpia.startsWith("#")) continue;
  const i = limpia.indexOf("=");
  if (i === -1) continue;
  vars[limpia.slice(0, i).trim()] = limpia
    .slice(i + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const url = vars.VITE_SUPABASE_URL;
const llave = vars.VITE_SUPABASE_ANON_KEY;

if (!url || !llave) {
  mal("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env");
  salir("Los dos valores están en Supabase → Project Settings → API.");
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  aviso(`La URL no tiene la forma esperada: ${url}`);
  aviso("Debería verse así:  https://abcdefghijk.supabase.co");
} else {
  ok(`URL: ${url}`);
}

// El JWT clásico lleva el rol adentro; conviene avisar antes de que una
// service_role key termine publicada en el navegador.
const rolDeLaLlave = (jwt) => {
  try {
    const cuerpo = jwt.split(".")[1];
    if (!cuerpo) return null;
    return JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")).role;
  } catch {
    return null;
  }
};

if (llave.startsWith("sb_secret_") || rolDeLaLlave(llave) === "service_role") {
  mal("Esa es la llave secreta (service_role): salta TODAS las políticas de seguridad.");
  salir("Usa la llave pública (anon / publishable). La secreta nunca va en el navegador.");
}

const tipoLlave = llave.startsWith("sb_publishable_")
  ? "publishable (formato nuevo)"
  : llave.startsWith("eyJ")
    ? "anon (formato JWT clásico)"
    : "formato no reconocido";

if (tipoLlave === "formato no reconocido") {
  aviso(`La llave no parece una anon key ni una publishable key.`);
} else {
  ok(`Llave: ${tipoLlave}`);
}

// El cliente monta su capa de realtime al crearse y exige un WebSocket global,
// que Node solo trae desde la v22. Este script nunca abre esa conexión, así que
// basta con un sustituto para que no reviente al arrancar. En el navegador no
// hace falta: WebSocket siempre existe.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class {
    constructor() {
      throw new Error("El verificador no usa realtime.");
    }
  };
}

const supabase = createClient(url, llave);

// --- 2. Tablas --------------------------------------------------------------

titulo("2. Tablas del esquema");

const TABLAS = ["publicaciones", "puntos", "guia"];
let faltanTablas = false;

for (const tabla of TABLAS) {
  const { count, error } = await supabase
    .from(tabla)
    .select("*", { count: "exact", head: true });

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      mal(`Falta la tabla "${tabla}"`);
      faltanTablas = true;
    } else if (error.message?.includes("fetch failed")) {
      mal(`No se pudo conectar con ${url}`);
      salir("Revisa la URL y que el proyecto esté activo en el dashboard.");
    } else {
      mal(`${tabla}: ${error.message}`);
      faltanTablas = true;
    }
  } else {
    ok(`${tabla} — ${count} registro${count === 1 ? "" : "s"}`);
  }
}

if (faltanTablas) {
  salir(
    "Falta ejecutar el esquema.\n" +
      "Supabase → SQL Editor → New query → pega supabase/schema.sql → Run."
  );
}

const { error: errRpc } = await supabase.rpc("es_coordinador");
if (errRpc) {
  mal(`La función es_coordinador() no responde: ${errRpc.message}`);
  faltanTablas = true;
} else {
  ok("Función es_coordinador() disponible");
}

// --- 3. Permisos ------------------------------------------------------------

titulo("3. Permisos de un visitante anónimo");

const ID_INEXISTENTE = "__verificacion_sin_efecto__";
let permisosMal = false;

// Debe PODER cambiar el estado (los botones del tablero son públicos).
{
  const { error } = await supabase
    .from("publicaciones")
    .update({ estado: "resuelta" })
    .eq("id", ID_INEXISTENTE);
  if (error) {
    mal(`No puede marcar como resuelta, pero debería: ${error.message}`);
    permisosMal = true;
  } else {
    ok("Puede cambiar el estado de una publicación");
  }
}

// NO debe poder reescribir el contenido de una publicación ajena.
{
  const { error } = await supabase
    .from("publicaciones")
    .update({ descripcion: "prueba", contacto: "prueba" })
    .eq("id", ID_INEXISTENTE);
  if (error) {
    ok("No puede reescribir la descripción ni el contacto de otra persona");
  } else {
    mal("PUEDE reescribir descripciones y contactos ajenos. Eso está mal.");
    aviso("Revisa la sección 5 de supabase/schema.sql (permisos por columna).");
    permisosMal = true;
  }
}

// NO debe poder borrar.
{
  const { error } = await supabase
    .from("publicaciones")
    .delete()
    .eq("id", ID_INEXISTENTE);
  if (error) {
    ok("No puede borrar publicaciones");
  } else {
    mal("PUEDE borrar publicaciones. Eso está mal.");
    permisosMal = true;
  }
}

// NO debe poder tocar el directorio.
{
  const { error } = await supabase
    .from("puntos")
    .insert({ id: ID_INEXISTENTE, nombre: "prueba", municipio: "Armenia", creado: Date.now() });
  if (error) {
    ok("No puede agregar puntos al directorio");
  } else {
    mal("PUEDE agregar puntos al directorio sin ser coordinación. Eso está mal.");
    await supabase.from("puntos").delete().eq("id", ID_INEXISTENTE);
    permisosMal = true;
  }
}

// --- Resultado --------------------------------------------------------------

if (permisosMal) {
  salir("Hay permisos mal configurados. Vuelve a ejecutar supabase/schema.sql completo.");
}

console.log("\n\x1b[32m\x1b[1mTodo en orden.\x1b[0m La app ya está conectada a la base de datos.");
console.log("Siguiente paso: crear tu usuario de coordinación (ver README.md).\n");
