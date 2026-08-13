# Quindío Se Ayuda

Red de ayuda mutua para el Quindío tras el sismo. Fase 2 (web + base de datos).

## Requisitos

- Node.js 18 o superior
- npm
- Un proyecto de Supabase (gratis) si quieres que los datos se compartan

## Puesta en marcha

### 1. Instalar

```bash
npm install
```

### 2. Crear el proyecto en Supabase

Si todavía no existe:

1. Entra a [supabase.com](https://supabase.com) e inicia sesión **con la cuenta
   que va a ser dueña del proyecto**. Si tienes varias, verifica arriba a la
   derecha cuál está activa antes de seguir.
2. **New project**. Elige la organización y llena:
   - **Name:** `quindio-se-ayuda`
   - **Database password:** genérala con el botón y **guárdala en tu gestor de
     contraseñas antes de continuar**. No se puede volver a ver. La app no la
     necesita (usa la llave anon), pero sí hace falta para conectarse
     directamente a la base o para restaurar copias.
   - **Region:** `East US (North Virginia)` es la más cercana en tiempo de
     respuesta desde Colombia.
3. **Create new project** y espera ~2 minutos a que quede *Active*.

### 3. Crear las tablas

En Supabase: **SQL Editor → New query**, pega todo el contenido de
[`supabase/schema.sql`](supabase/schema.sql) y dale **Run**. Se puede volver a
ejecutar cuantas veces quieras sin borrar datos.

### 4. Conectar la app

```bash
cp .env.example .env
```

Abre `.env` y pega los dos valores que están en **Supabase → Project Settings →
API**:

- `VITE_SUPABASE_URL` → la *Project URL*
- `VITE_SUPABASE_ANON_KEY` → la llave **pública**. Según la antigüedad del
  proyecto aparece como *anon public* (un texto largo que empieza por `eyJ…`) o
  como *Publishable key* (empieza por `sb_publishable_…`). Cualquiera de las dos
  sirve; van en la misma variable.

> Esa llave viaja al navegador y es pública por diseño; lo que protege los datos
> son las políticas RLS del esquema. **Nunca** pongas aquí la *service_role* /
> *secret key*: esa salta todas las políticas.

### 5. Comprobar que quedó bien

```bash
npm run verificar
```

Revisa las credenciales, que las tablas existan y que los permisos hagan lo que
deben —que un visitante anónimo pueda marcar algo como resuelto pero no pueda
reescribir el contacto de otra persona ni borrar publicaciones—. No escribe ni
borra nada. Si algo falla, dice exactamente qué paso repetir.

### 6. Arrancar

```bash
npm run dev
```

Abre la URL que muestra la terminal (normalmente http://localhost:5173).

Si no configuras el `.env`, la app arranca igual pero guarda en `localStorage`:
cada quien ve solo lo suyo. La página de inicio avisa cuando está en ese modo.

## Dar acceso al panel de coordinación

El acceso es con correo y contraseña reales. Tener cuenta no basta: hay que
estar en la tabla `coordinadores`.

1. **Supabase → Authentication → Users → Add user.** Pon correo y contraseña, y
   marca *Auto Confirm User*.
2. **SQL Editor**, con el correo de esa persona:

   ```sql
   insert into public.coordinadores (user_id, nombre)
   select id, 'Nombre de la persona'
   from auth.users where email = 'persona@correo.com'
   on conflict (user_id) do nothing;
   ```

Para quitar el acceso, basta con borrar su fila de `coordinadores`.

> Conviene desactivar el registro abierto en **Authentication → Providers →
> Email → "Allow new users to sign up"**. Aun estando activo, quien se registre
> por su cuenta no puede moderar nada: las políticas RLS solo reconocen a quien
> esté en `coordinadores`.

## Quién puede hacer qué

| | Visitante | Coordinación |
|---|---|---|
| Ver tablero, directorio y asesoría | ✅ | ✅ |
| Publicar solicitud u ofrecimiento | ✅ | ✅ |
| Marcar "en proceso" / "resuelta" | ✅ | ✅ |
| Editar el texto o el contacto de una publicación ajena | ❌ | ❌ |
| Borrar publicaciones | ❌ | ✅ |
| Administrar directorio y asesoría | ❌ | ✅ |
| Importar CSV | ❌ | ✅ |

Todo esto se aplica en el servidor (RLS + permisos por columna), no solo en la
interfaz. Ver [`supabase/schema.sql`](supabase/schema.sql).

## Construir para producción

```bash
npm run build
npm run preview
```

Al desplegar, hay que configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
como variables de entorno del hosting: Vite las incrusta en el build, así que
tienen que estar presentes **al momento de construir**.
