# Despliegue en Cloudflare Workers (OpenNext)

Mismo patrón que **Alerta Violeta / Mi Plaza**, con la diferencia de que este proyecto
usa **Prisma + Postgres de Supabase** (Alerta usaba el cliente HTTP de Supabase).

## Resumen de la arquitectura de deploy

- Adaptador: **`@opennextjs/cloudflare`** (`open-next.config.ts` + `wrangler.jsonc`).
- Scripts en `package.json`:
  - `pnpm deploy` → `opennextjs-cloudflare build && opennextjs-cloudflare deploy`
  - `pnpm preview` → `opennextjs-cloudflare build && opennextjs-cloudflare preview`
- **Middleware**: se usa `src/middleware.ts` (runtime Edge), NO `proxy.ts`. Next 16
  renombró la convención a `proxy.ts` (runtime Node), pero `@opennextjs/cloudflare`
  todavía no soporta middleware en Node
  ([issue #962](https://github.com/opennextjs/opennextjs-cloudflare/issues/962)).
  Cuando OpenNext lo soporte, se puede volver a `proxy.ts`.
- **Prisma en Workers**: driver adapter `@prisma/adapter-pg` (ya configurado en
  `src/lib/prisma.ts`) + la conexión **pooler** de Supabase (puerto 6543,
  `?pgbouncer=true`). La conexión directa (5432) solo se usa para migraciones.

## Pasos que hace Sebastián en el dashboard de Cloudflare

1. **Conectar el repo** en Cloudflare → Workers & Pages → crear aplicación desde Git.
2. **Settings → Build**:
   - **Build command:** `npm run build`
   - **Deploy command:** `npm run deploy`  ← NO dejar `npx wrangler deploy` (ese fue el bug de Alerta).
3. **Settings → Variables and Secrets** — cargar (marcar como *Secret* las server-side):

   Variables de **build** (las `NEXT_PUBLIC_*`, se inyectan al compilar):
   ```
   NEXT_PUBLIC_SUPABASE_URL       = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = sb_publishable_...
   NEXT_PUBLIC_SITE_URL           = https://glow-by-lk.<sub>.workers.dev
   ```

   Secrets de **runtime** (server-side):
   ```
   DATABASE_URL               = postgresql://postgres.xxxx:PASS@aws-0-xx.pooler.supabase.com:6543/postgres?pgbouncer=true
   AUTH_SECRET                = (genera con: npx auth secret)
   SUPABASE_SERVICE_ROLE_KEY  = sb_secret_...
   SUPABASE_STORAGE_BUCKET    = product-images
   ```
   > `DIRECT_URL` NO hace falta en Cloudflare (solo se usa para correr migraciones
   > desde tu máquina). El Worker usa `DATABASE_URL` (pooler).

4. **Supabase → Authentication → URL Configuration**: agregar el dominio
   `https://glow-by-lk.<sub>.workers.dev` como Site URL / Redirect URL.

5. **Relanzar el deploy** desde Cloudflare.

## Antes del primer deploy (una sola vez, desde tu máquina)

Aplicar las migraciones a la base de Supabase real (usa la conexión **directa**):

```bash
# en .env.local, con DIRECT_URL apuntando a la conexión directa de Supabase (5432)
pnpm prisma migrate deploy
pnpm db:seed        # crea el admin, marcas, categorías y los 16 productos
```

## Notas

- El bucket `product-images` de Supabase Storage debe existir y ser **público**
  (Storage → New bucket → Public).
- Todas las páginas del catálogo y del admin son dinámicas (`force-dynamic`): no
  hay ISR ni caché en R2, por eso `open-next.config.ts` es la config mínima.
- Para probar el Worker en local antes de subir: `pnpm preview` (necesita
  `.dev.vars` con las variables de runtime; ver `.env.example`).

## Alternativa: Vercel

Si el setup de Prisma en Workers da problemas, este proyecto también corre en
Vercel sin cambios de código: importar el repo, cargar las mismas variables de
entorno (con `DATABASE_URL` = pooler de Supabase) y desplegar. En Vercel se puede
volver a `proxy.ts` si se quiere (soporta middleware en Node).
