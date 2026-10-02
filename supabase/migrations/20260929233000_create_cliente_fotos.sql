create table public.cliente_fotos (
  id uuid primary key default gen_random_uuid(),
  cliente_id integer not null references public.clientes(id) on delete cascade,
  tipo text not null,
  r2_key text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint cliente_fotos_tipo_check
    check (tipo in ('foto_cliente', 'documento_frente', 'documento_reverso', 'foto_local')),
  constraint cliente_fotos_mime_type_check
    check (mime_type in ('image/webp', 'image/jpeg')),
  constraint cliente_fotos_size_check
    check (size_bytes > 0 and size_bytes <= 15728640),
  constraint cliente_fotos_cliente_tipo_key unique (cliente_id, tipo)
);

alter table public.cliente_fotos enable row level security;

revoke all on table public.cliente_fotos from public, anon, authenticated;
grant select on table public.cliente_fotos to authenticated;
grant all on table public.cliente_fotos to service_role;

create policy "Cobradores y sus admins leen fotos de clientes"
on public.cliente_fotos
for select
to authenticated
using (
  exists (
    select 1
    from public.clientes as cliente
    where cliente.id = cliente_fotos.cliente_id
      and (
        (
          cliente.usuario_id = (select auth.uid())
          and exists (
            select 1
            from public.usuarios as cobrador
            where cobrador.auth_id = (select auth.uid())
              and cobrador.rol = 'cobrador'
          )
        )
        or (
          exists (
            select 1
            from public.usuarios as administrador
            where administrador.auth_id = (select auth.uid())
              and administrador.rol = 'admin'
          )
          and exists (
            select 1
            from public.usuarios as cobrador
            where cobrador.auth_id = cliente.usuario_id
              and cobrador.rol = 'cobrador'
              and cobrador.admin_id = (select auth.uid())
          )
        )
      )
  )
);