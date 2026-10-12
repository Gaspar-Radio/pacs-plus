// ==UserScript==
// @name         PACS LADI - Contador de Anexos
// @namespace    hamc-rt
// @version      1.0.0
// @description  Mostra no clipe 📎 da lista de exames quantos anexos o exame tem de fato (igual ao balão de comentários). Sem anexo = sem número. Só leitura: usa o campo arq_count_arquivo que o próprio PACS já envia na lista.
// @author       Dr. Gabriel Gaspar
// @match        *://pacs.ladi.org.br/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/contador-anexos.user.js
// @downloadURL  https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/contador-anexos.user.js
// ==/UserScript==

(function () {
  'use strict';
  if (window.__ppAnexosLoaded) return;
  window.__ppAnexosLoaded = true;

  const VERSAO = '1.0.0';
  const P = 'ppanx';

  // ---------------- estilo (balão no mesmo padrão do de comentários) ----------------
  const st = document.createElement('style');
  st.textContent = `
  .${P}-host{position:relative!important;overflow:visible!important}
  .${P}-badge{position:absolute;top:-7px;right:-7px;z-index:2;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;
    border-radius:9px;background:#4caf50;color:#fff;font:700 11px/18px Roboto,-apple-system,"Segoe UI",sans-serif;text-align:center;
    pointer-events:none;box-shadow:0 0 0 1.5px rgba(0,0,0,.25)}
  .${P}-badge.muitos{background:#2e7d32}`;
  document.head.appendChild(st);

  // ---------------- utilitários ----------------
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ').trim();
  const fmtBR = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const qtd = ex => { const n = Number(ex && ex.arq_count_arquivo); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };

  // componente Vue da lista de exames (GridExames)
  function grid() {
    const t = document.querySelector('.v-main .v-data-table');
    let v = t && t.__vue__;
    for (let i = 0; v && i < 15; i++, v = v.$parent) if (Array.isArray(v.exames)) return v;
    const app = document.querySelector('#app'); const root = app && app.__vue__; if (!root) return null;
    let g = null;
    (function walk(x) { if (!x || g) return; if (x.$options && x.$options.name === 'GridExames') g = x; (x.$children || []).forEach(walk); })(root);
    return g;
  }

  // botão do clipe: título "Anexos" (PACS) ou, por segurança, o ícone mdi-paperclip
  function botaoClipe(raiz) {
    const b = raiz.querySelector('button[title="Anexos"]');
    if (b) return b;
    const i = raiz.querySelector('.mdi-paperclip');
    return i ? i.closest('button') : null;
  }

  function aplicaBalao(btn, n) {
    if (!btn) return;
    let bd = btn.querySelector(':scope > .' + P + '-badge');
    if (!n) { if (bd) bd.remove(); btn.classList.remove(P + '-host'); btn.removeAttribute('data-ppanx'); return; }
    btn.classList.add(P + '-host');
    if (!bd) { bd = document.createElement('span'); bd.className = P + '-badge'; btn.appendChild(bd); }
    const txt = n > 99 ? '99+' : String(n);
    if (bd.textContent !== txt) bd.textContent = txt;
    bd.classList.toggle('muitos', n >= 3);
    btn.setAttribute('data-ppanx', String(n));
    btn.setAttribute('aria-label', n === 1 ? '1 anexo' : n + ' anexos');
  }

  // ---------------- lista de exames ----------------
  function lista() {
    const g = grid(); if (!g || !Array.isArray(g.exames)) return;
    const t = (g.$el && g.$el.querySelector && g.$el.querySelector('.v-data-table')) || document.querySelector('.v-main .v-data-table');
    if (!t) return;
    const ths = [...t.querySelectorAll('thead tr:first-child > th')].map(th => norm(th.innerText || th.textContent));
    if (!ths.length) return;
    const iData = ths.indexOf('data'), iHora = ths.indexOf('hora');
    const rows = [...t.querySelectorAll('tbody tr')].filter(r => r.children.length === ths.length);
    const mesmaQtd = rows.length === g.exames.length;
    rows.forEach((r, i) => {
      const btn = botaoClipe(r); if (!btn) return;
      const item = g.exames[i];
      // confere a linha com o exame (Data/Hora, quando existem neste computador) — nunca mostra número de outro exame
      const ok = item && mesmaQtd
        && (iData < 0 || r.children[iData].textContent.trim() === fmtBR(item.exa_data))
        && (iHora < 0 || r.children[iHora].textContent.trim().slice(0, 5) === String(item.exa_hora || '').slice(0, 5));
      aplicaBalao(btn, ok ? qtd(item) : 0);
    });
  }

  // ---------------- clipe fora da lista (ex.: cabeçalho do exame no editor de laudo) ----------------
  function outros() {
    document.querySelectorAll('button[title="Anexos"]').forEach(btn => {
      if (btn.closest('tbody')) return;                    // linhas da lista: tratadas acima
      let v = btn.__vue__, ex = null;
      for (let i = 0; v && i < 10; i++, v = v.$parent) { if (v.exame && typeof v.exame === 'object' && 'arq_count_arquivo' in v.exame) { ex = v.exame; break; } }
      aplicaBalao(btn, ex ? qtd(ex) : 0);
    });
  }

  function rodar() {
    if (/\/viewer/.test(location.pathname)) return;
    try { lista(); } catch (e) { console.warn('[Anexos] lista', e); }
    try { outros(); } catch (e) { console.warn('[Anexos] outros', e); }
  }

  // gancho de testes automatizados (sem efeito no uso normal)
  if (window.__ANX_TEST__) { window.__ANX_TEST__.api = { rodar, qtd, VERSAO }; if (window.__ANX_TEST__.semTimers) return; }

  // a lista do PACS se redesenha com frequência: reaplica após cada mudança (com folga) e a cada 1,5 s
  let tm = null;
  const agenda = () => { clearTimeout(tm); tm = setTimeout(rodar, 150); };
  new MutationObserver(ms => { if (ms.some(m => !(m.target.classList && (m.target.classList.contains(P + '-badge') || m.target.classList.contains(P + '-host'))))) agenda(); })
    .observe(document.body, { childList: true, subtree: true });
  setInterval(rodar, 1500);
  rodar();
})();
