# Lista de Presentes de Casamento

Página estática (GitHub Pages) que lista os presentes disponíveis e remove automaticamente
os itens já escolhidos. Os dados ficam numa Planilha Google, acessada por um Google Apps Script.

Endereço: https://add-chemical.github.io/Lista-de-Presentes/

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Página da lista |
| `config.js` | URL do app da Web do Apps Script |
| `itens.js` | Catálogo exibido só para consulta enquanto `config.js` estiver vazio |
| `google-apps-script/Code.gs` | Código a colar no Apps Script da planilha |
| `.nojekyll` | Faz o GitHub Pages publicar os arquivos sem processamento |

## Planilha Google

1. Criar uma planilha em branco em https://sheets.new (ex.: "Lista de Presentes – Respostas").
2. Menu **Extensões → Apps Script**. Apagar o conteúdo de `Código.gs`, colar todo o
   `google-apps-script/Code.gs` e salvar.
3. No seletor de função, escolher **`setup`** e clicar em **Executar**. Autorizar o acesso
   (aviso "O Google não verificou este app" → **Avançado** → **Acessar ... (não seguro)**; o script é seu).
   A aba **Presentes** é criada com os 81 itens.
4. **Implantar → Nova implantação** → tipo **App da Web**:
   - *Executar como:* **Eu**
   - *Quem pode acessar:* **Qualquer pessoa**
5. Copiar a URL gerada (termina em `/exec`) e colocá-la em `config.js`:
   `window.GIFTS_API_URL = "https://script.google.com/macros/s/.../exec";`

Ao alterar o código depois, usar **Implantar → Gerenciar implantações → Editar → Nova versão**,
para manter a mesma URL.

## Uso da planilha

- Cada escolha preenche, na linha do item: Status `escolhido`, Nome, E-mail, WhatsApp e Data/hora.
- **Devolver um item à lista:** mudar Status para `disponível` (e apagar os dados do convidado).
- **Retirar um item** (ex.: já escolhido pelo Google Formulário): mudar Status para `escolhido`.
- **Adicionar item:** nova linha com ID inédito, Seção (uma das 7 abaixo), Presente e Status `disponível`.

Seções aceitas pela página: Eletroportáteis e Outros, Quarto, Banheiro, Eletrodoméstico, Cozinha,
Lavanderia, Mesa e Jantar.

A página só recebe ID, seção e nome dos itens disponíveis; dados dos convidados não saem da planilha.
