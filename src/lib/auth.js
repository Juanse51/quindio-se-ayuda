// ---------------------------------------------------------------------------
// Acceso al panel de coordinación.
//
//   - Con Supabase: correo y contraseña reales. Además de iniciar sesión, se
//     verifica que la persona esté en la tabla `coordinadores`; tener cuenta no
//     alcanza. Quien mande peticiones a mano tampoco pasa: las políticas RLS
//     hacen la misma verificación del lado del servidor.
//   - Sin Supabase: se conserva la clave de la Fase 1 para poder trabajar en
//     local. No es seguridad real y la interfaz lo dice.
//
// Devuelve siempre { correo, coordinador } o null si no hay sesión.
// ---------------------------------------------------------------------------

import { supabase, hayBackend } from "./supabase.js";
import { CLAVE_COORD } from "./data.js";

const MENSAJES = {
  "Invalid login credentials": "Correo o contraseña incorrectos.",
  "Email not confirmed": "La cuenta aún no está confirmada. Pídele al equipo que la active.",
};

const traducir = (error) =>
  MENSAJES[error?.message] ||
  "No se pudo iniciar sesión. Revisa tu conexión e inténtalo otra vez.";

// --- Con Supabase -----------------------------------------------------------

const esCoordinador = async () => {
  const { data, error } = await supabase.rpc("es_coordinador");
  if (error) {
    console.error("No se pudo verificar el rol de coordinación", error);
    return false;
  }
  return data === true;
};

const remoto = {
  async sesion() {
    const { data } = await supabase.auth.getSession();
    const usuario = data?.session?.user;
    if (!usuario) return null;
    return { correo: usuario.email, coordinador: await esCoordinador() };
  },

  async entrar(correo, clave) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });
    if (error) throw new Error(traducir(error));

    if (!(await esCoordinador())) {
      await supabase.auth.signOut();
      throw new Error(
        "Esta cuenta no tiene permisos de coordinación. Pídele al equipo que te agregue."
      );
    }
    return { correo: data.user.email, coordinador: true };
  },

  async salir() {
    await supabase.auth.signOut();
  },

  // Mantiene la app sincronizada si la sesión caduca o se cierra en otra pestaña.
  alCambiar(cb) {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT") return;
      // Diferido a propósito: el cliente de Supabase se bloquea si se le hacen
      // llamadas asíncronas dentro de este callback.
      setTimeout(() => remoto.sesion().then(cb), 0);
    });
    return () => data?.subscription?.unsubscribe();
  },
};

// --- Sin Supabase (clave en el código, solo para desarrollo local) -----------

let sesionLocal = null;

const local = {
  async sesion() {
    return sesionLocal;
  },

  async entrar(_correo, clave) {
    if (clave !== CLAVE_COORD) throw new Error("Clave incorrecta.");
    sesionLocal = { correo: "coordinación (local)", coordinador: true };
    return sesionLocal;
  },

  async salir() {
    sesionLocal = null;
  },

  alCambiar() {
    return () => {};
  },
};

export const auth = hayBackend ? remoto : local;
