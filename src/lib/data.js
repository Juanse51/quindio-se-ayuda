import {
  Droplet, Utensils, Home, BedDouble, Pill, Truck, Package, HelpCircle, HandHeart,
} from "lucide-react";

// Municipios del Quindío
export const MUNICIPIOS = [
  "Armenia", "Buenavista", "Calarcá", "Circasia", "Córdoba", "Filandia",
  "Génova", "La Tebaida", "Montenegro", "Pijao", "Quimbaya", "Salento",
];

// Categorías de necesidad / ofrecimiento
export const CATEGORIAS = {
  agua:         { label: "Agua",                  Icon: Droplet },
  alimentos:    { label: "Alimentos",             Icon: Utensils },
  refugio:      { label: "Refugio / alojamiento", Icon: Home },
  abrigo:       { label: "Cobijas / abrigo",      Icon: BedDouble },
  medicinas:    { label: "Medicinas / salud",     Icon: Pill },
  transporte:   { label: "Transporte",            Icon: Truck },
  insumos:      { label: "Insumos / aseo",        Icon: Package },
  voluntariado: { label: "Voluntariado",          Icon: HandHeart },
  otro:         { label: "Otro",                  Icon: HelpCircle },
};

export const URGENCIAS = {
  alta:  { label: "Alta",  chip: "bg-red-100 text-red-700 border-red-200" },
  media: { label: "Media", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  baja:  { label: "Baja",  chip: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const ESTADOS = {
  abierta:    { label: "Abierta",    chip: "bg-blue-50 text-blue-700 border-blue-200" },
  en_proceso: { label: "En proceso", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  resuelta:   { label: "Resuelta",   chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

// Estilos de acento según el tipo de publicación (clases completas para Tailwind)
export const ACENTO = {
  solicitud: {
    solid: "bg-blue-600 hover:bg-blue-700",
    badge: "text-blue-700 bg-blue-50 border-blue-200",
    chipOn: "border-blue-500 bg-blue-50 text-blue-700",
    text: "text-blue-700",
  },
  oferta: {
    solid: "bg-emerald-600 hover:bg-emerald-700",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    chipOn: "border-emerald-500 bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
  },
};

export const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

// Clave del panel para el modo local (sin Supabase configurado). Cuando hay
// base de datos, el acceso es con correo y contraseña reales y esta clave no se
// usa. Ver src/lib/auth.js.
export const CLAVE_COORD = "quindio2026";

// Contenido de asesoría siempre visible. El equipo puede sumar más desde el panel.
export const GUIA_BASE = [
  {
    id: "g-replica", cat: "Qué hacer",
    titulo: "¿Qué hago después de una réplica?",
    cuerpo: "Mantén la calma y aléjate de muros, fachadas y estructuras con daños. Ten a mano linterna, agua y tus documentos. Antes de volver a entrar a una vivienda, revisa que no haya grietas nuevas, olor a gas ni cables sueltos. Sigue solo la información de canales oficiales.",
  },
  {
    id: "g-donar", cat: "Cómo ayudar",
    titulo: "¿Cómo dono sin estorbar?",
    cuerpo: "Revisa primero el tablero y el directorio para donar lo que de verdad se está pidiendo. Prefiere agua, alimentos no perecederos y elementos de aseo. Evita ropa usada sin clasificar. Lleva las donaciones solo a los puntos que están recibiendo y en los horarios indicados.",
  },
  {
    id: "g-lineas", cat: "Líneas oficiales",
    titulo: "Líneas y entidades oficiales",
    cuerpo: "Para cualquier emergencia que ponga en riesgo la vida, llama al 123. Otras entidades de apoyo son la Defensa Civil, la Cruz Roja, los Bomberos y la Alcaldía de tu municipio. Los coordinadores irán agregando aquí los números locales verificados del Quindío.",
  },
  {
    id: "g-falsa", cat: "Qué hacer",
    titulo: "Cuidado con la información falsa",
    cuerpo: "En emergencias circulan muchos rumores. Antes de compartir algo, verifica que venga de una fuente oficial. Desconfía de cadenas que piden difundir con urgencia o que dan cifras sin fuente. Compartir información falsa desvía la ayuda.",
  },
  {
    id: "g-emocional", cat: "Apoyo",
    titulo: "Sentir miedo o angustia es normal",
    cuerpo: "Después de un sismo es común sentir susto, tristeza o dificultad para dormir. Habla con alguien de confianza, procura descansar e hidratarte, y limita la exposición a imágenes del evento. Si la angustia te supera o afecta a un menor, busca acompañamiento de un profesional o de tu EPS.",
  },
];

// Utilidades
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const soloDigitos = (s) => (s || "").replace(/\D/g, "");

export const hace = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
};
