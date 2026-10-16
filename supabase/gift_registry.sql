-- Lista de presentes de casamento (public/presentes/index.html).
-- Itens visíveis: apenas status = 'available'. Dados dos convidados ficam em gift_claims,
-- tabela sem nenhum acesso para anon/authenticated; a escrita ocorre só via claim_gift().

create table if not exists public.gifts (
  id         bigint generated always as identity primary key,
  name       text not null,
  section    text not null check (section in (
               'Eletroportáteis e Outros', 'Quarto', 'Banheiro', 'Eletrodoméstico',
               'Cozinha', 'Lavanderia', 'Mesa e Jantar')),
  status     text not null default 'available' check (status in ('available', 'taken')),
  created_at timestamptz not null default now()
);

create table if not exists public.gift_claims (
  id             bigint generated always as identity primary key,
  gift_id        bigint not null unique references public.gifts(id) on delete cascade,
  guest_name     text not null check (length(guest_name) <= 120),
  guest_email    text not null check (length(guest_email) <= 254),
  guest_whatsapp text not null check (length(guest_whatsapp) <= 30),
  claimed_at     timestamptz not null default now()
);

alter table public.gifts enable row level security;
alter table public.gift_claims enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.gifts to anon, authenticated;
revoke insert, update, delete on public.gifts from anon, authenticated;
revoke all on public.gift_claims from anon, authenticated;

drop policy if exists "Public reads available gifts" on public.gifts;
create policy "Public reads available gifts" on public.gifts
  for select to anon, authenticated using (status = 'available');

-- Reserva atômica: o UPDATE condicionado a status = 'available' garante que,
-- em requisições simultâneas, apenas uma obtém a linha. Retorna false se o item já foi escolhido.
create or replace function public.claim_gift(gift_id bigint, g_name text, g_email text, g_whats text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id bigint;
begin
  g_name  := btrim(coalesce(g_name, ''));
  g_email := btrim(coalesce(g_email, ''));
  g_whats := btrim(coalesce(g_whats, ''));
  if g_name = '' or length(g_name) > 120
     or g_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(g_email) > 254
     or length(regexp_replace(g_whats, '\D', '', 'g')) < 10 or length(g_whats) > 30 then
    raise exception 'Dados do convidado inválidos' using errcode = '22023';
  end if;

  update public.gifts set status = 'taken'
   where id = claim_gift.gift_id and status = 'available'
  returning id into claimed_id;

  if claimed_id is null then
    return false;
  end if;

  insert into public.gift_claims (gift_id, guest_name, guest_email, guest_whatsapp)
  values (claimed_id, g_name, g_email, g_whats);
  return true;
end;
$$;

revoke all on function public.claim_gift(bigint, text, text, text) from public;
grant execute on function public.claim_gift(bigint, text, text, text) to anon, authenticated;

-- Cadastro dos itens (exemplo; substituir pela lista real):
-- insert into public.gifts (name, section) values
--   ('Liquidificador', 'Eletroportáteis e Outros'),
--   ('Jogo de lençol casal', 'Quarto');
--
-- Consulta de quem escolheu o quê (executar no SQL Editor do Supabase):
-- select g.section, g.name, c.guest_name, c.guest_email, c.guest_whatsapp, c.claimed_at
--   from public.gift_claims c join public.gifts g on g.id = c.gift_id order by c.claimed_at;
