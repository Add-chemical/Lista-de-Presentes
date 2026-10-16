# Lista de Presentes de Casamento

Página estática (GitHub Pages) que lista os presentes disponíveis e remove automaticamente
os itens já escolhidos. Dados armazenados no Supabase.

Endereço: https://add-chemical.github.io/Lista-de-Presentes/

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Página da lista |
| `config.js` | URL e chave pública (anon) do Supabase |
| `itens.js` | Catálogo exibido só para consulta enquanto `config.js` estiver vazio |
| `supabase/seed.sql` | Cadastro dos 83 presentes no banco |
| `supabase/gift_registry.sql` | Tabelas, regras de acesso (RLS) e função `claim_gift` |
| `.nojekyll` | Faz o GitHub Pages publicar os arquivos sem processamento |

## Configuração

1. **Banco:** no Supabase, abrir o SQL Editor e executar `supabase/gift_registry.sql`; depois
   preencher `config.js` com a Project URL e a chave `anon`. Enquanto `config.js` estiver vazio,
   a página exibe "A lista de presentes será disponibilizada em breve."
2. **Itens:** executar `supabase/seed.sql` (83 presentes, mesma lista de `itens.js`). Itens avulsos:
   ```sql
   insert into public.gifts (name, section) values
     ('Liquidificador', 'Eletroportáteis e Outros'),
     ('Jogo de lençol casal', 'Quarto');
   ```
   Seções aceitas: Eletroportáteis e Outros, Quarto, Banheiro, Eletrodoméstico, Cozinha,
   Lavanderia, Mesa e Jantar.
3. **Publicação:** Settings → Pages → Source: *Deploy from a branch* → Branch `main`, pasta `/ (root)`.

## Consultar quem escolheu cada presente

Os dados dos convidados não ficam visíveis na página. Consultar no SQL Editor:

```sql
select g.section, g.name, c.guest_name, c.guest_email, c.guest_whatsapp, c.claimed_at
  from public.gift_claims c join public.gifts g on g.id = c.gift_id
 order by c.claimed_at;
```

Para devolver um item à lista:

```sql
delete from public.gift_claims where gift_id = <id>;
update public.gifts set status = 'available' where id = <id>;
```

## Confirmação de presença

Botão **Confirmar presença** no topo da página (link direto: `.../Lista-de-Presentes/#presenca`).
Cada família informa sobrenome, responsável, WhatsApp, e-mail (opcional), se irá, os nomes dos
convidados (marcando crianças) e uma mensagem opcional.

1. No SQL Editor do Supabase, executar `supabase/rsvp.sql` (pode ser executado mais de uma vez).
2. Consultar as confirmações (os dados não ficam visíveis na página):

```sql
-- Resumo
select attending, count(*) familias, sum(adults) adultos, sum(children) criancas
  from public.rsvps group by attending;

-- Por família
select created_at, family_name, contact_name, whatsapp, email, attending, adults, children, message
  from public.rsvps order by created_at;

-- Lista nominal de quem vai
select r.family_name, x->>'name' as convidado, (x->>'child')::boolean as crianca
  from public.rsvps r, jsonb_array_elements(r.members) x
 where r.attending order by 1, 2;
```

Se uma família enviar mais de uma vez, as duas confirmações ficam gravadas; apagar a duplicada com
`delete from public.rsvps where id = <id>;`.
