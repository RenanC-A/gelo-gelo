/* ============ Gelo gelo — lógica ============ */
(() => {
  'use strict';

  const URL_DADOS = 'data/ofertas.json';
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const $ = (id) => document.getElementById(id);
  const el = {
    busca: $('busca'), chips: $('chips-btus'),
    tipo: $('filtro-tipo'), preco: $('filtro-preco'), ordem: $('filtro-ordem'),
    contador: $('contador'), limpar: $('limpar'), vazioLimpar: $('vazio-limpar'),
    grade: $('grade'), vazio: $('vazio'), erro: $('erro'), atualizado: $('atualizado'),
  };

  const estado = { q: '', btus: '', tipo: '', preco: '', ordem: 'destaque' };
  let ofertas = [];

  /* ---------- utilidades ---------- */
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const urlSegura = (u) => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
  const btuTexto = (n) => Number(n).toLocaleString('pt-BR') + ' BTUs';
  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const desconto = (o) => (o.precoOriginal && o.precoOriginal > o.preco) ? Math.round((1 - o.preco / o.precoOriginal) * 100) : 0;

  const diasRestantes = (iso) => {
    if (!iso) return null;
    const fim = new Date(iso + 'T23:59:59');
    return Math.ceil((fim - new Date()) / 86400000);
  };

  const ICONE_AR = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="14" width="52" height="22" rx="6"/><path d="M14 28h36M16 42c0 6-4 6-4 12M32 42c0 6-4 6-4 12M48 42c0 6-4 6-4 12"/></svg>`;

  /* ---------- carregar dados ---------- */
  async function carregar() {
    try {
      const resp = await fetch(URL_DADOS, { cache: 'no-cache' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      const lista = Array.isArray(json) ? json : json.ofertas;
      if (!Array.isArray(lista)) throw new Error('Formato inválido');

      ofertas = lista
        .filter((o) => o && o.titulo && Number(o.preco) > 0)
        .filter((o) => { const d = diasRestantes(o.validade); return d === null || d >= 0; })
        .map((o, i) => ({ ...o, preco: Number(o.preco), precoOriginal: o.precoOriginal ? Number(o.precoOriginal) : 0, btus: o.btus ? Number(o.btus) : 0, _ordem: i }));

      if (json.atualizadoEm) {
        const d = new Date(json.atualizadoEm + 'T12:00:00');
        el.atualizado.textContent = 'Última atualização: ' + d.toLocaleDateString('pt-BR') + '.';
      }
      iniciar();
    } catch (e) {
      console.error(e);
      el.grade.setAttribute('aria-busy', 'false');
      el.grade.innerHTML = '';
      el.erro.hidden = false;
      el.erro.textContent = location.protocol === 'file:'
        ? 'Não foi possível carregar as ofertas. Abra o site por um servidor local (ex.: "python -m http.server") ou pelo GitHub Pages.'
        : 'Não foi possível carregar as ofertas agora. Tente novamente em instantes.';
    }
  }

  /* ---------- montar controles ---------- */
  function iniciar() {
    // chips de BTUs (derivados dos dados)
    const btus = [...new Set(ofertas.map((o) => o.btus).filter(Boolean))].sort((a, b) => a - b);
    el.chips.innerHTML = [''].concat(btus).map((b) =>
      `<button type="button" class="chip" data-btus="${b}" aria-pressed="false">${b ? Number(b).toLocaleString('pt-BR') : 'Todos'}</button>`
    ).join('');

    // tipos (derivados dos dados)
    [...new Set(ofertas.map((o) => o.tipo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .forEach((t) => el.tipo.insertAdjacentHTML('beforeend', `<option value="${esc(t)}">${esc(t)}</option>`));

    lerUrl();
    sincronizarControles();
    ligarEventos();
    renderizar();
    el.grade.setAttribute('aria-busy', 'false');
  }

  function ligarEventos() {
    el.busca.addEventListener('input', debounce(() => { estado.q = el.busca.value; atualizar(); }));
    el.chips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      estado.btus = b.dataset.btus; atualizar();
    });
    el.tipo.addEventListener('change', () => { estado.tipo = el.tipo.value; atualizar(); });
    el.preco.addEventListener('change', () => { estado.preco = el.preco.value; atualizar(); });
    el.ordem.addEventListener('change', () => { estado.ordem = el.ordem.value; atualizar(); });
    [el.limpar, el.vazioLimpar].forEach((b) => b.addEventListener('click', limparFiltros));

    // expandir/recolher descrição
    el.grade.addEventListener('click', (e) => {
      const b = e.target.closest('.card__mais'); if (!b) return;
      const d = b.previousElementSibling;
      const aberto = d.classList.toggle('recolhido') === false;
      b.textContent = aberto ? 'Ver menos' : 'Ver mais';
      b.setAttribute('aria-expanded', aberto);
    });
  }

  function limparFiltros() {
    Object.assign(estado, { q: '', btus: '', tipo: '', preco: '', ordem: 'destaque' });
    sincronizarControles();
    atualizar();
  }

  function sincronizarControles() {
    el.busca.value = estado.q;
    el.tipo.value = estado.tipo;
    el.preco.value = estado.preco;
    el.ordem.value = estado.ordem;
    el.chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.btus === estado.btus)));
  }

  /* ---------- URL compartilhável (?q=&btus=&tipo=&preco=&ordem=) ---------- */
  function lerUrl() {
    const p = new URLSearchParams(location.search);
    estado.q = p.get('q') || '';
    estado.btus = p.get('btus') || '';
    estado.tipo = p.get('tipo') || '';
    estado.preco = p.get('preco') || '';
    estado.ordem = p.get('ordem') || 'destaque';
  }
  function gravarUrl() {
    const p = new URLSearchParams();
    if (estado.q) p.set('q', estado.q);
    if (estado.btus) p.set('btus', estado.btus);
    if (estado.tipo) p.set('tipo', estado.tipo);
    if (estado.preco) p.set('preco', estado.preco);
    if (estado.ordem !== 'destaque') p.set('ordem', estado.ordem);
    const qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* ---------- filtrar / ordenar ---------- */
  function filtrar() {
    const termos = norm(estado.q).split(/\s+/).filter(Boolean);
    const [min, max] = estado.preco ? estado.preco.split('-').map((v) => (v === '' ? null : Number(v))) : [null, null];

    let lista = ofertas.filter((o) => {
      if (estado.btus && String(o.btus) !== estado.btus) return false;
      if (estado.tipo && o.tipo !== estado.tipo) return false;
      if (min !== null && o.preco < min) return false;
      if (max !== null && o.preco >= max) return false;
      if (termos.length) {
        const alvo = norm([o.titulo, o.marca, o.tipo, o.descricao, o.loja, o.voltagem, o.btus, (o.tags || []).join(' ')].join(' '));
        if (!termos.every((t) => alvo.includes(t))) return false;
      }
      return true;
    });

    const ordens = {
      destaque: (a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || a._ordem - b._ordem,
      desconto: (a, b) => desconto(b) - desconto(a) || a.preco - b.preco,
      menor: (a, b) => a.preco - b.preco,
      maior: (a, b) => b.preco - a.preco,
    };
    return lista.sort(ordens[estado.ordem] || ordens.destaque);
  }

  function atualizar() { sincronizarControles(); gravarUrl(); renderizar(); }

  /* ---------- renderizar ---------- */
  function cardHtml(o, i) {
    const link = urlSegura(o.link);
    const img = urlSegura(o.imagem);
    const d = desconto(o);
    const dias = diasRestantes(o.validade);
    const meta = [o.marca, o.tipo, o.btus ? btuTexto(o.btus) : '', o.voltagem].filter(Boolean).join(' · ');
    const longa = (o.descricao || '').length > 110;

    const midia = img
      ? `<div class="card__midia"><img src="${esc(img)}" alt="${esc(o.titulo)}" loading="lazy" decoding="async">`
      : `<div class="card__midia card__midia--vazia">${ICONE_AR}`;

    return `
    <article class="card" style="animation-delay:${Math.min(i, 12) * 30}ms">
      ${midia}
        ${o.selo ? `<span class="selo">${esc(o.selo)}</span>` : ''}
        ${dias !== null && dias <= 3 ? `<span class="selo selo--aviso">${dias <= 0 ? 'Último dia' : `Termina em ${dias}d`}</span>` : ''}
      </div>
      <div class="card__corpo">
        <p class="card__meta">${esc(meta)}</p>
        <h2 class="card__titulo">${esc(o.titulo)}</h2>
        ${o.descricao ? `<p class="card__desc${longa ? ' recolhido' : ''}">${esc(o.descricao)}</p>${longa ? '<button type="button" class="link-btn card__mais" aria-expanded="false">Ver mais</button>' : ''}` : ''}
        ${o.tags && o.tags.length ? `<ul class="tags">${o.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <div class="preco">
          ${d ? `<span class="preco__antigo">${BRL.format(o.precoOriginal)}</span>` : ''}
          <div class="preco__linha">
            <span class="preco__atual">${BRL.format(o.preco)}</span>
            ${d ? `<span class="preco__desconto">−${d}%</span>` : ''}
          </div>
          ${o.parcelas ? `<span class="preco__parcelas">${esc(o.parcelas)}</span>` : ''}
        </div>
        ${link ? `<div class="card__rodape">
          <a class="botao" href="${esc(link)}" target="_blank" rel="sponsored nofollow noopener noreferrer">Ver oferta</a>
          ${o.loja ? `<span class="card__loja">na ${esc(o.loja)}</span>` : ''}
        </div>` : ''}
      </div>
    </article>`;
  }

  function renderizar() {
    const lista = filtrar();
    el.grade.innerHTML = lista.map(cardHtml).join('');
    el.vazio.hidden = lista.length > 0;
    el.erro.hidden = true;

    const filtrando = estado.q || estado.btus || estado.tipo || estado.preco;
    el.limpar.hidden = !filtrando;
    el.contador.textContent = lista.length === 1 ? '1 oferta' : `${lista.length} ofertas`;
  }

  // esqueleto enquanto carrega
  el.grade.innerHTML = '<div class="esqueleto"></div>'.repeat(3);
  $('ano').textContent = new Date().getFullYear();
  carregar();
})();
