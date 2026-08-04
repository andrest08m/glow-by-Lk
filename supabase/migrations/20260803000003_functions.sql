-- Funciones RPC — toda la lógica que mueve stock vive aquí y es ATÓMICA
-- (cada función corre en una sola transacción implícita). El servidor las
-- invoca con supabase.rpc(...) usando la service-role key.

-- Estado según cantidad vs mínimo
create or replace function public.glow_estado(p_cantidad int, p_minimo int)
returns text language sql immutable as $$
  select case
    when p_cantidad <= 0 then 'AGOTADO'
    when p_cantidad <= p_minimo then 'POCO_STOCK'
    else 'DISPONIBLE'
  end;
$$;

-- ── registrar_movimiento ────────────────────────────────────────────────────
-- ENTRADA/SALIDA reciben unidades (>0). AJUSTE recibe la cantidad final exacta.
-- SALIDA con stock insuficiente lanza excepción (revierte todo).
create or replace function public.registrar_movimiento(
  p_product_id uuid,
  p_tipo text,
  p_cantidad int,
  p_motivo text default null,
  p_admin_email text default null,
  p_order_id uuid default null
) returns public.inventory_movements
language plpgsql security definer set search_path = public as $$
declare
  v_prod   public.products;
  v_delta  int;
  v_nuevo  int;
  v_mov    public.inventory_movements;
begin
  select * into v_prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCTO_NO_EXISTE';
  end if;

  if p_tipo = 'ENTRADA' then
    if p_cantidad <= 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
    v_delta := p_cantidad;
    v_nuevo := v_prod.cantidad + p_cantidad;
  elsif p_tipo = 'SALIDA' then
    if p_cantidad <= 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
    if v_prod.cantidad < p_cantidad then
      raise exception 'STOCK_INSUFICIENTE|%|%|%', v_prod.nombre, v_prod.cantidad, p_cantidad;
    end if;
    v_delta := -p_cantidad;
    v_nuevo := v_prod.cantidad - p_cantidad;
  elsif p_tipo = 'AJUSTE' then
    if p_cantidad < 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
    v_delta := p_cantidad - v_prod.cantidad;
    v_nuevo := p_cantidad;
  else
    raise exception 'TIPO_INVALIDO';
  end if;

  update public.products
     set cantidad = v_nuevo,
         estado   = public.glow_estado(v_nuevo, v_prod.stock_minimo),
         updated_at = now()
   where id = p_product_id;

  insert into public.inventory_movements
    (product_id, tipo, cantidad, saldo_resultante, motivo, admin_email, order_id)
  values
    (p_product_id, p_tipo, v_delta, v_nuevo, p_motivo, p_admin_email, p_order_id)
  returning * into v_mov;

  return v_mov;
end;
$$;

-- ── crear_pedido ────────────────────────────────────────────────────────────
-- p_items: jsonb array de { "product_id": uuid, "cantidad": int }.
-- p_nuevo_cliente: jsonb { nombre, whatsapp, direccion } o null (si viene
-- p_customer_id se usa ese). No toca stock (eso ocurre al confirmar).
create or replace function public.crear_pedido(
  p_customer_id uuid,
  p_nuevo_cliente jsonb,
  p_items jsonb
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_customer   public.customers;
  v_nombre     text;
  v_telefono   text;
  v_total      numeric(12,2) := 0;
  v_order      public.orders;
  v_item       jsonb;
  v_prod       public.products;
  v_precio     numeric(12,2);
  v_cant       int;
begin
  if p_customer_id is not null then
    select * into v_customer from public.customers where id = p_customer_id;
    if not found then raise exception 'CLIENTE_NO_EXISTE'; end if;
  elsif p_nuevo_cliente is not null then
    select * into v_customer from public.customers
      where whatsapp = (p_nuevo_cliente->>'whatsapp');
    if not found then
      insert into public.customers (nombre, whatsapp, direccion)
      values (
        p_nuevo_cliente->>'nombre',
        p_nuevo_cliente->>'whatsapp',
        nullif(p_nuevo_cliente->>'direccion','')
      )
      returning * into v_customer;
    end if;
  else
    raise exception 'SIN_CLIENTE';
  end if;

  v_nombre   := v_customer.nombre;
  v_telefono := v_customer.whatsapp;

  insert into public.orders (customer_id, cliente_nombre, cliente_telefono, total, estado)
  values (v_customer.id, v_nombre, v_telefono, 0, 'PENDIENTE')
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products where id = (v_item->>'product_id')::uuid;
    if not found then raise exception 'PRODUCTO_NO_EXISTE'; end if;
    v_cant   := (v_item->>'cantidad')::int;
    if v_cant <= 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
    v_precio := coalesce(v_prod.precio_oferta, v_prod.precio);

    insert into public.order_items (order_id, product_id, cantidad, precio_unitario)
    values (v_order.id, v_prod.id, v_cant, v_precio);

    v_total := v_total + v_precio * v_cant;
  end loop;

  update public.orders set total = v_total where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- ── cambiar_estado_pedido ───────────────────────────────────────────────────
-- Valida la transición; al CONFIRMAR descuenta stock (SALIDA por ítem, revierte
-- todo si falta stock); al CANCELAR un pedido ya descontado, devuelve el stock.
create or replace function public.cambiar_estado_pedido(
  p_order_id uuid,
  p_nuevo_estado text,
  p_admin_email text default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order     public.orders;
  v_item      public.order_items;
  v_permitido text[];
  v_desc      boolean;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO_NO_EXISTE'; end if;

  v_permitido := case v_order.estado
    when 'PENDIENTE'      then array['CONFIRMADO','CANCELADO']
    when 'CONFIRMADO'     then array['EN_PREPARACION','ENVIADO','CANCELADO']
    when 'EN_PREPARACION' then array['ENVIADO','CANCELADO']
    when 'ENVIADO'        then array['ENTREGADO','CANCELADO']
    else array[]::text[]
  end;

  if not (p_nuevo_estado = any(v_permitido)) then
    raise exception 'TRANSICION_INVALIDA|%|%', v_order.estado, p_nuevo_estado;
  end if;

  v_desc := v_order.stock_descontado;

  if p_nuevo_estado = 'CONFIRMADO' and not v_order.stock_descontado then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      perform public.registrar_movimiento(
        v_item.product_id, 'SALIDA', v_item.cantidad,
        'Pedido #' || v_order.numero, p_admin_email, p_order_id
      );
    end loop;
    v_desc := true;
  end if;

  if p_nuevo_estado = 'CANCELADO' and v_order.stock_descontado then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      perform public.registrar_movimiento(
        v_item.product_id, 'ENTRADA', v_item.cantidad,
        'Cancelación pedido #' || v_order.numero, p_admin_email, p_order_id
      );
    end loop;
    v_desc := false;
  end if;

  update public.orders
     set estado = p_nuevo_estado, stock_descontado = v_desc, updated_at = now()
   where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- Solo el service-role (servidor) ejecuta estas funciones.
grant execute on function public.registrar_movimiento(uuid,text,int,text,text,uuid) to service_role;
grant execute on function public.crear_pedido(uuid,jsonb,jsonb) to service_role;
grant execute on function public.cambiar_estado_pedido(uuid,text,text) to service_role;
