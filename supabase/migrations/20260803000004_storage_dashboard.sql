-- Bucket de imágenes de producto (público para lectura) + RPCs del dashboard.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Lectura pública de las imágenes; escritura solo service-role (bypassa RLS).
drop policy if exists "product_images_public_read_storage" on storage.objects;
create policy "product_images_public_read_storage" on storage.objects
  for select using (bucket_id = 'product-images');

-- ── Dashboard: ventas por día (últimos N días, zona horaria Bogotá) ─────────
create or replace function public.ventas_por_dia(p_dias int default 30)
returns table(fecha date, total numeric)
language sql stable security definer set search_path = public as $$
  with dias as (
    select generate_series(
      (now() at time zone 'America/Bogota')::date - (p_dias - 1),
      (now() at time zone 'America/Bogota')::date,
      interval '1 day'
    )::date as fecha
  )
  select d.fecha,
         coalesce(sum(o.total), 0) as total
    from dias d
    left join public.orders o
      on (o.created_at at time zone 'America/Bogota')::date = d.fecha
     and o.estado in ('CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO')
   group by d.fecha
   order by d.fecha;
$$;

-- ── Dashboard: top productos por unidades vendidas ──────────────────────────
create or replace function public.top_productos(p_limite int default 6)
returns table(product_id uuid, nombre text, unidades bigint)
language sql stable security definer set search_path = public as $$
  select oi.product_id,
         coalesce(p.nombre, '(eliminado)') as nombre,
         sum(oi.cantidad)::bigint as unidades
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    left join public.products p on p.id = oi.product_id
   where o.estado in ('CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO')
   group by oi.product_id, p.nombre
   order by unidades desc
   limit p_limite;
$$;

-- ── Dashboard: métricas escalares (una sola llamada) ────────────────────────
create or replace function public.dashboard_metricas()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ventas_hoy_total', (
      select coalesce(sum(total),0) from public.orders
       where estado in ('CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO')
         and (created_at at time zone 'America/Bogota')::date = (now() at time zone 'America/Bogota')::date),
    'ventas_hoy_pedidos', (
      select count(*) from public.orders
       where estado in ('CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO')
         and (created_at at time zone 'America/Bogota')::date = (now() at time zone 'America/Bogota')::date),
    'ventas_mes_total', (
      select coalesce(sum(total),0) from public.orders
       where estado in ('CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO')
         and date_trunc('month', created_at at time zone 'America/Bogota')
           = date_trunc('month', now() at time zone 'America/Bogota')),
    'ventas_mes_pedidos', (
      select count(*) from public.orders
       where estado in ('CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO')
         and date_trunc('month', created_at at time zone 'America/Bogota')
           = date_trunc('month', now() at time zone 'America/Bogota')),
    'pedidos_semana', (
      select count(*) from public.orders where created_at >= now() - interval '7 days'),
    'clientes', (select count(*) from public.customers),
    'poco_stock', (select count(*) from public.products where estado = 'POCO_STOCK' and activo),
    'agotados', (select count(*) from public.products where estado = 'AGOTADO' and activo),
    'nuevos', (select count(*) from public.products where nuevo and activo)
  );
$$;

grant execute on function public.ventas_por_dia(int) to service_role;
grant execute on function public.top_productos(int) to service_role;
grant execute on function public.dashboard_metricas() to service_role;
