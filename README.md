# Gelo gelo

Site estático de ofertas e promoções de ar-condicionado. Sem build, sem dependências: HTML + CSS + JavaScript puro, pronto para o **GitHub Pages**.

## Estrutura

```
index.html
assets/
  style.css
  app.js
data/
  ofertas.json   ← é aqui que você atualiza as ofertas
```

## Publicar no GitHub Pages

1. Crie um repositório e envie estes arquivos para a raiz.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. O site ficará em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Os caminhos são relativos, então funciona tanto em `usuario.github.io` quanto em subpasta de repositório.

## Testar localmente

O navegador bloqueia `fetch` em `file://`, então use um servidor local:

```bash
python -m http.server 8000
# abra http://localhost:8000
```

## Como adicionar ou editar ofertas

Edite `data/ofertas.json` e acrescente um objeto à lista `ofertas`. Atualize também `atualizadoEm`.

| Campo | Obrigatório | Descrição |
|---|---|---|
| `titulo` | sim | Nome da oferta |
| `preco` | sim | Preço atual (número, ex.: `1899.9`) |
| `link` | sim* | Link de afiliado (*sem link, o botão não aparece) |
| `precoOriginal` | não | Preço "de"; o desconto em % é calculado sozinho |
| `marca`, `tipo`, `btus`, `voltagem` | não | `tipo` e `btus` alimentam os filtros automaticamente |
| `parcelas` | não | Texto livre, ex.: `"10x de R$ 189,99 sem juros"` |
| `loja` | não | Nome da loja |
| `imagem` | não | URL ou caminho (ex.: `assets/img/modelo.jpg`). Se vazio, mostra um ícone |
| `descricao` | não | Texto curto ou longo; acima de ~110 caracteres aparece "Ver mais" |
| `tags` | não | Lista de rótulos curtos |
| `selo` | não | Destaque na imagem (ex.: `"Frete grátis"`) |
| `destaque` | não | `true` para aparecer primeiro na ordenação padrão |
| `validade` | não | `AAAA-MM-DD`; ofertas vencidas somem sozinhas e, nos últimos 3 dias, aparece um aviso |

Novos BTUs e tipos aparecem nos filtros automaticamente.

## Importante

- Os dados atuais são **exemplos fictícios** (marcas, preços e links inventados). Substitua antes de publicar.
- Mantenha o aviso de afiliados no rodapé; ele é exigido por programas de afiliados e pela boa prática de transparência.
- Os links usam `rel="sponsored nofollow noopener noreferrer"`.
- Ajuste as faixas de preço em `index.html` (select `filtro-preco`) se quiser outros intervalos.
- O estado dos filtros vai para a URL (`?q=inverter&btus=12000`), então dá para compartilhar buscas.
