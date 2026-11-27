/* ============ Gelo gelo — painel admin (lógica) ============ */
(() => {
  'use strict';

  const URL_DADOS = 'data/ofertas.json';
  const CHAVE = 'gelogelo-admin-rascunho';
  const MARCAS = ['Agratto', 'Midea', 'LG', 'Samsung', 'Gree', 'Elgin', 'TCL', 'Philco', 'Consul', 'Electrolux', 'Springer', 'Daikin', 'Fujitsu', 'Carrier', 'Hisense', 'Komeco', 'Britânia', 'Fontaine', 'Eos', 'Vix', 'Haier', 'Panasonic', 'Trane', 'York'];
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const $ = (id) => document.getElementById(id);
  const campos = ['titulo', 'marca', 'tipo', 'btus', 'voltagem', 'preco', 'precoOriginal', 'link', 'imagem', 'parcelas', 'loja', 'selo', 'validade', 'tags', 'descricao'];
  const f = Object.fromEntries(campos.map((c) => [c, $(c)]));
  f.destaque = $('destaque');

  let lista = [];
  let editando = -1;
  let lojaPadrao = f.loja.value;

  /* ---------- utilidades ---------- */
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const urlOk = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };

  // aceita "3.466,13", "3466,13", "3466.13", "R$ 3.466"
  function num(s) {
    let v = String(s ?? '').replace(/R\$|\s/g, '');
    if (!v) return 0;
    if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, '');
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function mostrarStatus(msg) { $('status').textContent = msg || ''; }
  function mostrarErro(msg) { const e = $('erro-form'); e.textContent = msg || ''; e.hidden = !msg; }

  /* ---------- rascunho / carga ---------- */
  function salvarRascunho() {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* ignora */ }
  }
  function lerRascunho() {
    try { const r = JSON.parse(localStorage.getItem(CHAVE)); return Array.isArray(r) ? r : null; } catch { return null; }
  }

  async function carregarDoSite() {
    try {
      const r = await fetch(URL_DADOS, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      lista = Array.isArray(j) ? j : (j.ofertas || []);
      mostrarStatus('Lista carregada do site publicado.');
    } catch {
      lista = [];
      mostrarStatus('Não foi possível ler data/ofertas.json (abra por servidor ou GitHub Pages). Começando com lista vazia.');
    }
    salvarRascunho();
    atualizarTudo();
  }

  /* ---------- preenchimento automático a partir do título ---------- */
  function autoPreencher() {
    const t = f.titulo.value;
    if (!t) return;
    if (!f.btus.value) {
      const m = t.match(/(\d{1,2})[.\s]?(\d{3})\s*btu/i) || t.match(/(\d{1,2})\s*mil\s*btu/i);
      if (m) f.btus.value = m[2] ? m[1] + m[2] : m[1] + '000';
    }
    if (!f.tipo.value) {
      const n = norm(t);
      if (/inverter/.test(n)) f.tipo.value = 'Split Inverter';
      else if (/janela/.test(n)) f.tipo.value = 'Janela';
      else if (/portatil/.test(n)) f.tipo.value = 'Portátil';
      else if (/cassete|cassette/.test(n)) f.tipo.value = 'Cassete';
      else if (/piso/.test(n)) f.tipo.value = 'Piso Teto';
      else if (/split|hi.?wall|\bhw\b/.test(n)) f.tipo.value = 'Split Convencional';
    }
    if (!f.marca.value) {
      const n = norm(t);
      const achada = MARCAS.find((m) => new RegExp('\\b' + norm(m) + '\\b').test(n));
      if (achada) f.marca.value = achada;
    }
    if (!f.voltagem.value) {
      const v = t.match(/\b(127|220)\s*v\b/i) || (/bivolt/i.test(t) ? [0, 'Bivolt'] : null);
      if (v) f.voltagem.value = /^\d/.test(v[1]) ? v[1] + 'V' : v[1];
    }
  }

  function atualizarResumo() {
    const p = num(f.preco.value), o = num(f.precoOriginal.value);
    $('resumo').textContent = (p && o > p) ? `Desconto exibido no site: −${Math.round((1 - p / o) * 100)}% (de ${BRL.format(o)} por ${BRL.format(p)})` : '';
  }

  function atualizarPrevia() {
    const box = $('previa'), u = f.imagem.value.trim();
    if (urlOk(u)) { box.hidden = false; box.firstElementChild.src = u; } else { box.hidden = true; }
  }

  /* ---------- formulário ---------- */
  function lerFormulario() {
    const o = {
      id: slug(f.titulo.value),
      titulo: f.titulo.value.trim(),
      marca: f.marca.value.trim(),
      tipo: f.tipo.value.trim(),
      btus: num(f.btus.value) || '',
      voltagem: f.voltagem.value.trim(),
      preco: num(f.preco.value),
      precoOriginal: num(f.precoOriginal.value) || '',
      parcelas: f.parcelas.value.trim(),
      loja: f.loja.value.trim(),
      link: f.link.value.trim(),
      imagem: f.imagem.value.trim(),
      selo: f.selo.value.trim(),
      destaque: f.destaque.checked || '',
      tags: f.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
      descricao: f.descricao.value.trim(),
      validade: f.validade.value,
    };
    // remove vazios
    Object.keys(o).forEach((k) => {
      if (o[k] === '' || o[k] === 0 || (Array.isArray(o[k]) && !o[k].length)) delete o[k];
    });
    return o;
  }

  function preencherFormulario(o) {
    campos.forEach((c) => {
      if (c === 'tags') f.tags.value = (o.tags || []).join(', ');
      else if (c === 'preco' || c === 'precoOriginal') f[c].value = o[c] ? String(o[c]).replace('.', ',') : '';
      else f[c].value = o[c] ?? '';
    });
    f.destaque.checked = !!o.destaque;
    atualizarPrevia(); atualizarResumo();
  }

  function limparFormulario() {
    campos.forEach((c) => { f[c].value = ''; });
    f.loja.value = lojaPadrao;
    f.destaque.checked = false;
    editando = -1;
    $('form-titulo').textContent = 'Nova oferta';
    $('btn-salvar').textContent = 'Adicionar à lista';
    $('btn-cancelar').hidden = true;
    mostrarErro('');
    atualizarPrevia(); atualizarResumo();
  }

  function enviar(e) {
    e.preventDefault();
    const o = lerFormulario();
    if (!o.titulo) return mostrarErro('Informe o título.');
    if (!o.preco) return mostrarErro('Informe o preço atual (ex.: 3.466,13).');
    if (!o.link || !urlOk(o.link)) return mostrarErro('Informe o link de afiliado completo, começando com https://');
    if (o.imagem && !urlOk(o.imagem)) return mostrarErro('A URL da imagem precisa começar com https://');
    if (o.precoOriginal && o.precoOriginal < o.preco) return mostrarErro('O preço de comparação deve ser maior que o preço atual (ou deixe em branco).');
    mostrarErro('');

    if (editando >= 0) {
      lista[editando] = o;
    } else {
      const i = lista.findIndex((x) => x.id === o.id);
      if (i >= 0) lista[i] = o; else lista.unshift(o); // mais nova primeiro
    }
    salvarRascunho();
    mostrarStatus(editando >= 0 ? 'Oferta atualizada.' : 'Oferta adicionada.');
    limparFormulario();
    atualizarTudo();
  }

  /* ---------- lista e saída ---------- */
  function atualizarTudo() {
    $('qtd').textContent = `(${lista.length})`;
    const ul = $('lista');
    ul.innerHTML = '';
    if (!lista.length) {
      ul.innerHTML = '<li class="vazio-lista">Nenhuma oferta ainda. Preencha o formulário e clique em “Adicionar à lista”.</li>';
    }
    lista.forEach((o, i) => {
      const li = document.createElement('li');
      li.className = 'item';
      const img = urlOk(o.imagem) ? `<img src="${encodeURI(o.imagem)}" alt="" loading="lazy">` : 'sem foto';
      const d = o.precoOriginal > o.preco ? ` · −${Math.round((1 - o.preco / o.precoOriginal) * 100)}%` : '';
      li.innerHTML = `
        <div class="item__img">${img}</div>
        <div><div class="item__titulo"></div><div class="item__sub">${BRL.format(o.preco)}${d}</div></div>
        <div class="item__acoes">
          <button type="button" class="link-btn" data-acao="editar" data-i="${i}">Editar</button>
          <button type="button" class="link-btn" data-acao="remover" data-i="${i}">Remover</button>
        </div>`;
      li.querySelector('.item__titulo').textContent = o.titulo; // textContent: sem injeção de HTML
      ul.appendChild(li);
    });

    $('saida').value = JSON.stringify({ atualizadoEm: hoje(), ofertas: lista }, null, 2) + '\n';
  }

  function aoClicarLista(e) {
    const b = e.target.closest('button[data-acao]'); if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.acao === 'remover') {
      if (!confirm('Remover esta oferta da lista?')) return;
      lista.splice(i, 1);
      if (editando === i) limparFormulario(); else if (editando > i) editando--;
      salvarRascunho(); atualizarTudo(); mostrarStatus('Oferta removida.');
    } else {
      editando = i;
      preencherFormulario(lista[i]);
      $('form-titulo').textContent = 'Editando oferta';
      $('btn-salvar').textContent = 'Salvar alterações';
      $('btn-cancelar').hidden = false;
      f.titulo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function copiar() {
    const txt = $('saida').value;
    try { await navigator.clipboard.writeText(txt); mostrarStatus('JSON copiado.'); }
    catch { $('saida').select(); document.execCommand('copy'); mostrarStatus('JSON copiado.'); }
  }

  function baixar() {
    const blob = new Blob([$('saida').value], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ofertas.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    mostrarStatus('Arquivo baixado. Substitua data/ofertas.json no repositório.');
  }

  /* ---------- eventos ---------- */
  $('form').addEventListener('submit', enviar);
  f.titulo.addEventListener('blur', autoPreencher);
  f.titulo.addEventListener('change', autoPreencher);
  f.preco.addEventListener('input', atualizarResumo);
  f.precoOriginal.addEventListener('input', atualizarResumo);
  f.imagem.addEventListener('input', atualizarPrevia);
  $('btn-cancelar').addEventListener('click', limparFormulario);
  $('btn-limpar-form').addEventListener('click', limparFormulario);
  $('lista').addEventListener('click', aoClicarLista);
  $('btn-copiar').addEventListener('click', copiar);
  $('btn-baixar').addEventListener('click', baixar);
  $('btn-recarregar').addEventListener('click', () => {
    if (confirm('Descartar o rascunho e recarregar a lista publicada no site?')) carregarDoSite();
  });

  /* ---------- início ---------- */
  const rascunho = lerRascunho();
  if (rascunho) { lista = rascunho; mostrarStatus('Rascunho deste navegador carregado.'); atualizarTudo(); }
  else carregarDoSite();
})();
