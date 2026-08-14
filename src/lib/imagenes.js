// ---------------------------------------------------------------------------
// Subida de imágenes.
//
// La foto se redimensiona y se comprime EN EL NAVEGADOR antes de salir. No es
// un detalle de optimización: esto se usa desde celulares con mala señal, y una
// foto de cámara moderna pesa entre 3 y 8 MB. Subirla tal cual haría que mucha
// gente se quedara esperando y abandonara el formulario a medio llenar.
//
// Con Supabase se guarda en el bucket `imagenes` y en la base queda solo el
// nombre del archivo. Sin Supabase (modo local) se guarda como data URL dentro
// del propio objeto, con menos resolución para no llenar el localStorage.
// ---------------------------------------------------------------------------

import { supabase, hayBackend } from "./supabase.js";
import { uid } from "./data.js";

const BUCKET = "imagenes";
const MAX_LADO = hayBackend ? 1280 : 800;
const CALIDAD = 0.72;
const MAX_BYTES = 3 * 1024 * 1024; // igual que el límite del bucket

export const TIPOS_ACEPTADOS = "image/jpeg,image/png,image/webp";

// createImageBitmap respeta la orientación EXIF; sin eso, las fotos tomadas en
// vertical con el celular salen acostadas.
const cargarImagen = async (file) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // algunos navegadores no aceptan la opción; se sigue por el camino largo
    }
  }
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolver(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
};

const comprimir = async (file) => {
  const img = await cargarImagen(file);
  const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
  const ancho = Math.max(1, Math.round(img.width * escala));
  const alto = Math.max(1, Math.round(img.height * escala));

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext("2d").drawImage(img, 0, 0, ancho, alto);
  if (img.close) img.close();

  const blob = await new Promise((r) => lienzo.toBlob(r, "image/jpeg", CALIDAD));
  if (!blob) throw new Error("No se pudo procesar la imagen.");
  return blob;
};

const aDataURL = (blob) =>
  new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(new Error("No se pudo procesar la imagen."));
    lector.readAsDataURL(blob);
  });

// Devuelve lo que hay que guardar en la columna `imagen`, o null.
export async function subirImagen(file) {
  if (!file) return null;
  if (!file.type?.startsWith("image/")) {
    throw new Error("Ese archivo no es una imagen.");
  }

  const blob = await comprimir(file);
  if (blob.size > MAX_BYTES) {
    throw new Error("La imagen sigue siendo muy pesada. Intenta con otra.");
  }

  if (!hayBackend) return aDataURL(blob);

  const nombre = `${uid()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombre, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("No se pudo subir la imagen", error);
    throw new Error("No se pudo subir la imagen. Revisa tu conexión.");
  }
  return nombre;
}

// Traduce lo guardado a una URL mostrable. Acepta los tres formatos que pueden
// existir: nombre en el bucket, data URL del modo local, o una URL completa.
export function urlImagen(valor) {
  if (!valor) return null;
  if (valor.startsWith("data:") || valor.startsWith("http")) return valor;
  if (!supabase) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(valor).data.publicUrl;
}
