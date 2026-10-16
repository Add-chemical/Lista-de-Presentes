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
| `supabase/seed.sql` | Cadastro dos 81 presentes no banco |
| `supabase/gift_registry.sql` | Tabelas, regras de acesso (RLS) e função `claim_gift` |
| `.nojekyll` | Faz o GitHub Pages publicar os arquivos sem processamento |

## Configuração

1. **Banco:** no Supabase, abrir o SQL Editor e executar `supabase/gift_registry.sql`; depois
   preencher `config.js` com a Project URL e a chave `anon`. Enquanto `config.js` estiver vazio,
   a página exibe "A lista de presentes será disponibilizada em breve."
2. **Itens:** executar `supabase/seed.sql` (81 presentes, mesma lista de `itens.js`). Itens avulsos:
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
