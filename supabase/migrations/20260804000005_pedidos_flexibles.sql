-- Pedidos: transiciones libres entre estados + eliminar pedido.
-- El stock se reconcilia por "estado de venta": se descuenta al entrar a un
-- estado de venta (CONFIRMADO/EN_PREPARACION/ENVIADO/ENTREGADO) y se devuelve
-- al salir a uno que no lo es (PENDIENTE/CANCELADO). Todo atómico.

create or replace function public.cambiar_estado_pedido(
  p_order_id uuid,
  p_nuevo_estado text,
  p_admin_email text default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order   public.orders;
  v_item    public.order_items;
  v_es_venta boolean;
  v_desc    boolean;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO_NO_EXISTE'; end if;

  if p_nuevo_estado not in
     ('PENDIENTE','CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO','CANCELADO') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  v_es_venta := p_nuevo_estado in ('CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO');
  v_desc := v_order.stock_descontado;

  -- entra a estado de venta y el stock aún no está descontado -> descontar
  if v_es_venta and not v_order.stock_descontado then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      perform public.registrar_movimiento(
        v_item.product_id, 'SALIDA', v_item.cantidad,
        'Pedido #' || v_order.numero, p_admin_email, p_order_id);
    end loop;
    v_desc := true;
  end if;

  -- sale a estado no-venta y el stock estaba descontado -> devolver
  if not v_es_venta and v_order.stock_descontado then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      perform public.registrar_movimiento(
        v_item.product_id, 'ENTRADA', v_item.cantidad,
        'Reversa pedido #' || v_order.numero, p_admin_email, p_order_id);
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

-- Eliminar pedido: si tenía stock descontado, lo devuelve al inventario antes
-- de borrar (así el inventario queda consistente). Los items caen en cascada.
create or replace function public.eliminar_pedido(
  p_order_id uuid,
  p_admin_email text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_item  public.order_items;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return; end if;

  if v_order.stock_descontado then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      perform public.registrar_movimiento(
        v_item.product_id, 'ENTRADA', v_item.cantidad,
        'Eliminación pedido #' || v_order.numero, p_admin_email, null);
    end loop;
  end if;

  delete from public.orders where id = p_order_id;
end;
$$;

grant execute on function public.cambiar_estado_pedido(uuid,text,text) to service_role;
grant execute on function public.eliminar_pedido(uuid,text) to service_role;

-- Resumen de movimientos para el módulo de histórico (compras vs ventas).
create or replace function public.movimientos_resumen()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'comprado', coalesce((select sum(cantidad) from public.inventory_movements where tipo = 'ENTRADA'), 0),
    'vendido',  coalesce((select -sum(cantidad) from public.inventory_movements where tipo = 'SALIDA'), 0),
    'movimientos', (select count(*) from public.inventory_movements)
  );
$$;

grant execute on function public.movimientos_resumen() to service_role;
