-- Teléfono del cliente ahora opcional. El unique permite varios NULL (en
-- Postgres los NULL son distintos entre sí), así que varios clientes pueden
-- quedar sin número.
alter table public.customers alter column whatsapp drop not null;

-- crear_pedido: si el teléfono viene vacío, se guarda NULL y NO se hace match
-- por número (cada cliente sin teléfono es independiente).
create or replace function public.crear_pedido(
  p_customer_id uuid,
  p_nuevo_cliente jsonb,
  p_items jsonb
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_customer   public.customers;
  v_total      numeric(12,2) := 0;
  v_order      public.orders;
  v_item       jsonb;
  v_prod       public.products;
  v_precio     numeric(12,2);
  v_cant       int;
  v_whatsapp   text;
begin
  if p_customer_id is not null then
    select * into v_customer from public.customers where id = p_customer_id;
    if not found then raise exception 'CLIENTE_NO_EXISTE'; end if;
  elsif p_nuevo_cliente is not null then
    v_whatsapp := nullif(trim(p_nuevo_cliente->>'whatsapp'), '');
    -- solo intentamos reutilizar cliente si hay teléfono
    if v_whatsapp is not null then
      select * into v_customer from public.customers where whatsapp = v_whatsapp;
    end if;
    if v_customer.id is null then
      insert into public.customers (nombre, whatsapp, direccion)
      values (
        p_nuevo_cliente->>'nombre',
        v_whatsapp,
        nullif(p_nuevo_cliente->>'direccion','')
      )
      returning * into v_customer;
    end if;
  else
    raise exception 'SIN_CLIENTE';
  end if;

  insert into public.orders (customer_id, cliente_nombre, cliente_telefono, total, estado)
  values (v_customer.id, v_customer.nombre, coalesce(v_customer.whatsapp, ''), 0, 'PENDIENTE')
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

grant execute on function public.crear_pedido(uuid,jsonb,jsonb) to service_role;
