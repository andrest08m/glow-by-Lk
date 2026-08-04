# Despliegue — glow by Lk (Cloudflare Workers + Supabase)

Misma estructura que **Alerta Violeta / Mi Plaza**: Next.js con el adaptador
`@opennextjs/cloudflare` (se despliega como **Worker**, no como Pages clásico) y
**Supabase** para base de datos, auth y storage. Sin Prisma: se usa el cliente
`@supabase/supabase-js` por HTTP, que corre nativo en Workers.

## 1. Preparar Supabase (una vez)

1. **Aplicar el schema.** En el dashboard de Supabase → **SQL Editor**, pega y
   ejecuta en orden el contenido de:
   - `supabase/migrations/20260803000001_schema.sql`
   - `supabase/migrations/20260803000002_rls.sql`
   - `supabase/migrations/20260803000003_functions.sql`
   - `supabase/migrations/20260803000004_storage_dashboard.sql`

   (O con el CLI de Supabase enlazado al proyecto: `supabase db push`.)

2. **Crear el bucket** `product-images` como **público** — la migración de storage
   ya lo crea; verifica en Storage que exista y sea público.

3. **Sembrar datos + admin.** Con `.env.local` completo (ver abajo):
   ```bash
   pnpm tsx scripts/seed.ts
   ```
   Crea el usuario admin en **Supabase Auth** (ADMIN_EMAIL / ADMIN_PASSWORD) y
   carga marcas, categorías, ajustes y los 16 productos.
   > También puedes crear el admin manualmente en Supabase → Authentication → Add user.

## 2. Variables de entorno

`.env.local` (local) y en Cloudflare (producción). Las `NEXT_PUBLIC_*` son
build-time; el resto, secrets de runtime.

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY       = sb_secret_...        (secret)
SUPABASE_STORAGE_BUCKET         = product-images
NEXT_PUBLIC_SITE_URL            = https://glow-by-lk.<sub>.workers.dev
```

## 3. Cloudflare (lo que hace Sebastián en el dashboard)

1. **Workers & Pages → Create → Connect to Git** → elegir el repo.
2. **Settings → Build**:
   - **Build command:** `npm run build`
   - **Deploy command:** `npm run deploy`  ← NO `npx wrangler deploy` (ese fue el bug de Alerta).
3. **Settings → Variables and Secrets**: cargar las variables de arriba (marcar
   como *Secret* `SUPABASE_SERVICE_ROLE_KEY`).
4. **Supabase → Authentication → URL Configuration**: agregar el dominio
   `https://glow-by-lk.<sub>.workers.dev` como Site URL / Redirect URL.
5. Relanzar el deploy.

## Notas

- No hay ISR: todo el catálogo y el admin se renderizan por request
  (`force-dynamic`), por eso `open-next.config.ts` es la config mínima.
- El middleware corre en runtime Edge (convención `middleware.ts`, no `proxy.ts`,
  porque OpenNext aún no soporta middleware Node en Next 16).
- Las operaciones que mueven stock son funciones RPC de Postgres (atómicas): el
  stock nunca queda inconsistente aunque haya ventas simultáneas.
- El cliente service-role solo se usa en el servidor (admin/RPC/storage) y bypassa
  RLS; el catálogo público se lee con la anon key respetando RLS.
