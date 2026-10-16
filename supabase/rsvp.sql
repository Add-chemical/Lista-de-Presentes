-- Confirmação de presença (RSVP) por família. Executar no SQL Editor do Supabase.
-- Pode ser executado mais de uma vez. A página só envia dados (via submit_rsvp);
-- nenhuma confirmação pode ser lida pela página.

create table if not exists public.rsvps (
  id             bigint generated always as identity primary key,
  family_name    text not null check (length(family_name) between 1 and 120),
  contact_name   text not null check (length(contact_name) between 1 and 120),
  whatsapp       text not null check (length(whatsapp) <= 30),
  email          text check (email is null or length(email) <= 254),
  attending      boolean not null,
  members        jsonb not null default '[]'::jsonb,  -- [{"name": "...", "child": false}, ...]
  adults         int not null default 0,
  children       int not null default 0,
  message        text check (message is null or length(message) <= 1000),
  created_at     timestamptz not null default now()
);

alter table public.rsvps enable row level security;
revoke all on public.rsvps from anon, authenticated;

create or replace function public.submit_rsvp(
  r_family text, r_contact text, r_whats text, r_email text,
  r_attending boolean, r_members jsonb, r_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m        jsonb;
  clean    jsonb := '[]'::jsonb;
  n_adults int := 0;
  n_kids   int := 0;
  m_name   text;
begin
  r_family  := btrim(coalesce(r_family, ''));
  r_contact := btrim(coalesce(r_contact, ''));
  r_whats   := btrim(coalesce(r_whats, ''));
  r_email   := nullif(btrim(coalesce(r_email, '')), '');
  r_message := nullif(btrim(coalesce(r_message, '')), '');

  if r_family = '' or length(r_family) > 120 or r_contact = '' or length(r_contact) > 120
     or length(regexp_replace(r_whats, '\D', '', 'g')) < 10 or length(r_whats) > 30
     or (r_email is not null and (r_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(r_email) > 254))
     or r_attending is null
     or (r_message is not null and length(r_message) > 1000)
     or jsonb_typeof(coalesce(r_members, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(r_members, '[]'::jsonb)) > 20 then
    raise exception 'Dados da confirmação inválidos' using errcode = '22023';
  end if;

  for m in select * from jsonb_array_elements(coalesce(r_members, '[]'::jsonb)) loop
    m_name := btrim(coalesce(m->>'name', ''));
    continue when m_name = '';
    if length(m_name) > 120 then
      raise exception 'Nome de convidado muito longo' using errcode = '22023';
    end if;
    clean := clean || jsonb_build_object('name', m_name, 'child', coalesce((m->>'child')::boolean, false));
    if coalesce((m->>'child')::boolean, false) then n_kids := n_kids + 1; else n_adults := n_adults + 1; end if;
  end loop;

  if r_attending and jsonb_array_length(clean) = 0 then
    raise exception 'Informe ao menos um convidado' using errcode = '22023';
  end if;

  insert into public.rsvps (family_name, contact_name, whatsapp, email, attending, members, adults, children, message)
  values (r_family, r_contact, r_whats, r_email, r_attending, clean, n_adults, n_kids, r_message);
  return true;
end;
$$;

revoke all on function public.submit_rsvp(text, text, text, text, boolean, jsonb, text) from public;
grant execute on function public.submit_rsvp(text, text, text, text, boolean, jsonb, text) to anon, authenticated;

-- Consultas (SQL Editor):
-- Resumo:        select attending, count(*) familias, sum(adults) adultos, sum(children) criancas from public.rsvps group by attending;
-- Por família:   select created_at, family_name, contact_name, whatsapp, attending, adults, children, message from public.rsvps order by created_at;
-- Lista nominal: select r.family_name, x->>'name' as convidado, (x->>'child')::boolean as crianca
--                  from public.rsvps r, jsonb_array_elements(r.members) x where r.attending order by 1, 2;
