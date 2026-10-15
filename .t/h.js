(function(){
const on=()=>true;
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ').trim();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let st=document.getElementById('pp-test-static'); if(!st){st=document.createElement('style');st.id='pp-test-static';document.head.appendChild(st);} st.textContent=`
#datatableExamesHistorico .v-data-table__wrapper { overflow-x: hidden !important; max-height: none !important; }
#datatableExamesHistorico table { table-layout: fixed !important; width: 100% !important; }
#datatableExamesHistorico, #datatableExamesHistorico th, #datatableExamesHistorico td, #datatableExamesHistorico td * { font-size: 12px !important; }
#datatableExamesHistorico .v-chip { height: 18px !important; font-size: 11px !important; padding: 0 6px !important; }
#datatableExamesHistorico td, #datatableExamesHistorico th { white-space: nowrap; vertical-align: middle !important; }
#datatableExamesHistorico td:nth-child(1), #datatableExamesHistorico th:nth-child(1) { white-space: normal; padding-left: 16px !important; }
#datatableExamesHistorico td:nth-child(2), #datatableExamesHistorico th:nth-child(2),
#datatableExamesHistorico td:nth-child(3), #datatableExamesHistorico th:nth-child(3),
#datatableExamesHistorico td:nth-child(4), #datatableExamesHistorico th:nth-child(4),
#datatableExamesHistorico td:nth-child(5), #datatableExamesHistorico th:nth-child(5),
#datatableExamesHistorico td:nth-child(7), #datatableExamesHistorico th:nth-child(7),
#datatableExamesHistorico td:nth-child(8), #datatableExamesHistorico th:nth-child(8),
#datatableExamesHistorico td:nth-child(11), #datatableExamesHistorico th:nth-child(11) { display: none !important; }
#datatableExamesHistorico th:nth-child(1),  #datatableExamesHistorico td:nth-child(1)  { width: 44% !important; max-width: 44% !important; }
#datatableExamesHistorico th:nth-child(6),  #datatableExamesHistorico td:nth-child(6)  { width: 18% !important; max-width: 18% !important; }
#datatableExamesHistorico th:nth-child(9),  #datatableExamesHistorico td:nth-child(9)  { width: 16% !important; max-width: 16% !important; }
#datatableExamesHistorico th:nth-child(10), #datatableExamesHistorico td:nth-child(10) { width: 22% !important; max-width: 22% !important; }
#datatableExamesHistorico td:nth-child(10) { white-space: nowrap !important; overflow: visible !important; }
#datatableExamesHistorico td:nth-child(10) > *, #datatableExamesHistorico td:nth-child(10) .row { display: inline-flex !important; flex-wrap: nowrap !important; align-items: center !important; width: auto !important; margin: 0 4px 0 0 !important; vertical-align: middle !important; }
#datatableExamesHistorico td:nth-child(10) .v-btn { height: 20px !important; min-height: 20px !important; }
#datatableExamesHistorico .v-list-item { min-height: 0 !important; padding: 0 !important; }
#datatableExamesHistorico .v-list-item__content { padding: 0 !important; }
#datatableExamesHistorico .v-list-item__title, #datatableExamesHistorico .v-list-item__subtitle { line-height: 1.3 !important; white-space: normal !important; }
#datatableExamesHistorico.v-data-table--dense td, #datatableExamesHistorico.v-data-table--dense th { height: auto !important; padding: 1px 6px !important; }

#datatableExamesHistorico td:nth-child(1) { white-space: nowrap !important; overflow: hidden !important; }
#datatableExamesHistorico td:nth-child(1) .v-list-item__content { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 8px !important; overflow: hidden !important; }
#datatableExamesHistorico td:nth-child(1) .v-list-item__title { flex: 1 1 auto !important; min-width: 0 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
#datatableExamesHistorico td:nth-child(1) .v-list-item__subtitle { flex: 0 0 auto !important; white-space: nowrap !important; font-weight: 700 !important; opacity: .75; }
#datatableExamesHistorico.v-data-table--dense td { height: 22px !important; }

#datatableExamesHistorico .pp-hist-acoes { display: inline-flex !important; align-items: center; gap: 2px; margin-left: 4px; vertical-align: middle; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha { position: relative; cursor: pointer; font-size: 19px !important; width: 22px; height: 22px; line-height: 22px; text-align: center; color: #808080; border-radius: 4px; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha:hover { background: rgba(127,127,127,.18); }
#datatableExamesHistorico .pp-hist-acoes .pp-ha[data-on="anexo"] { color: #2196f3 !important; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha[data-on="roxo"] { color: #c50ec5 !important; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha[data-n]::after { content: attr(data-n); position: absolute; top: -5px; right: -5px; min-width: 13px; height: 13px; padding: 0 2px; border-radius: 7px; background: #4caf50; color: #fff; font: 700 9px/13px Roboto, Arial, sans-serif; text-align: center; }
#datatableExamesHistorico th:nth-child(1), #datatableExamesHistorico td:nth-child(1) { width: 40% !important; max-width: 40% !important; }
#datatableExamesHistorico th:nth-child(10), #datatableExamesHistorico td:nth-child(10) { width: 26% !important; max-width: 26% !important; }

/* Buscar Matriz / Buscar Frase: o diálogo é reconhecido pela estrutura (barra + subtítulo + campo de busca),
   a lista pelos itens “Sigla/Descrição” — não depende do texto nem da posição */
.v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) > .v-card > .v-toolbar, .v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) > .v-card > .v-toolbar .v-toolbar__content { height: 40px !important; }
.v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) .v-toolbar__title { font-size: 17px !important; }
.v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) > .v-card > .v-subheader { display: none !important; }
.v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) > .v-card > .container { padding: 10px 14px 2px !important; }
.v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) .v-input__slot { min-height: 40px !important; }
.v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) .v-text-field--outlined .v-input__append-inner { margin-top: 8px !important; }
.v-dialog:has(> .v-card > .v-toolbar + .v-subheader + .container .v-autocomplete) .v-text-field__details { display: none !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) { max-height: var(--pp-mh, calc(100vh - 140px)) !important; overflow-y: auto !important; scrollbar-width: thin; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap)::-webkit-scrollbar { width: 8px !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap)::-webkit-scrollbar-thumb { border-radius: 4px !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list { padding: 0 !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item { min-height: 28px !important; padding: 0 6px 0 12px !important; overflow: hidden !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__content { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 12px !important; padding: 3px 0 !important; overflow: visible !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__subtitle { display: none !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__title { width: auto !important; margin: 0 !important; font-size: 13px !important; line-height: 1.25 !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__title:nth-child(2) { flex: 0 0 8.5em !important; font-weight: 700 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__title:nth-child(4) { flex: 1 1 auto !important; min-width: 0 !important; white-space: normal !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__action { margin: 0 0 0 6px !important; min-width: 0 !important; height: 26px !important; align-self: center !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__action .v-btn { width: 26px !important; height: 26px !important; }
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__action .v-icon { font-size: 18px !important; }`;
document.getElementById('pp-test-busca')?.remove();
    const HIST_CACHE = new Map(); // exa_codigo -> { t, arq, com, carregando }
    const HIST_TTL = 5 * 60 * 1000;
    function laudoVm() {
        const t = document.getElementById('datatableExamesHistorico');
        let p = t && t.__vue__;
        while (p && !('examesPacienteHistorico' in p)) p = p.$parent;
        return p || null;
    }
    async function pacsGet(path) {
        const tok = localStorage.getItem('lwtoken');
        if (!tok) throw new Error('PACS sem login');
        const r = await fetch('/backend/api/' + path, { headers: { 'x-access-token': tok } });
        if (r.status === 401 || r.status === 403) throw new Error('sessão do PACS expirada — entre de novo');
        if (!r.ok) throw new Error('PACS respondeu HTTP ' + r.status);
        return r.json();
    }
    function histContagens(exa) {
        const c = HIST_CACHE.get(exa);
        if (c && (c.carregando || Date.now() - c.t < HIST_TTL)) return c;
        const novo = { t: Date.now(), arq: null, com: null, carregando: true };
        HIST_CACHE.set(exa, novo);
        Promise.allSettled([pacsGet('exame/' + exa), pacsGet('exame/' + exa + '/comentario')]).then(([e, cm]) => {
            if (e.status === 'fulfilled') novo.arq = parseInt(e.value && e.value.arq_count_arquivo, 10) || 0;
            if (cm.status === 'fulfilled') novo.com = parseInt(cm.value && (cm.value.count != null ? cm.value.count : (cm.value.rows || []).length), 10) || 0;
            novo.carregando = false; novo.t = Date.now();
            pintarHistAcoes();
        });
        return novo;
    }
    const dataBR = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
    // Liga cada linha da tabela ao objeto do exame (pela ordem, conferindo data/hora; senão procura pela data/hora)
    function itemDaLinha(vm, tr, idx) {
        const itens = vm.examesPacienteHistorico || [];
        const txt = norm(tr.innerText);
        const bate = it => it && txt.includes(norm(dataBR(it.exa_data) + ' ' + String(it.exa_hora || '').slice(0, 8)));
        if (bate(itens[idx])) return itens[idx];
        const achados = itens.filter(bate);
        return achados.length === 1 ? achados[0] : null;
    }
    function histAcoes() {
        const t = document.getElementById('datatableExamesHistorico');
        if (!t) return;
        if (!on('historicoAcoes')) { t.querySelectorAll('.pp-hist-acoes').forEach(e => e.remove()); return; }
        const vm = laudoVm();
        if (!vm) return;
        const linhas = [...t.querySelectorAll('tbody > tr')].filter(tr => !tr.classList.contains('v-data-table__expanded__content') && tr.children.length >= 10);
        linhas.forEach((tr, i) => {
            const it = itemDaLinha(vm, tr, i);
            const td = tr.children[9];
            let box = td.querySelector(':scope > .pp-hist-acoes');
            if (!it) { if (box) box.remove(); return; }
            if (box && box.dataset.exa === String(it.exa_codigo)) return;
            if (box) box.remove();
            box = document.createElement('span');
            box.className = 'pp-hist-acoes';
            box.dataset.exa = String(it.exa_codigo);
            const ico = (tipo, mdi, titulo) => `<i class="v-icon notranslate mdi ${mdi} pp-ha" data-tipo="${tipo}" title="${titulo}"></i>`;
            box.innerHTML =
                (vm.btnListarAnexosExame !== false ? ico('anexos', 'mdi-paperclip', 'Anexos') : '') +
                (vm.btnComentarioExame !== false ? ico('comentarios', 'mdi-chat', 'Comentários') : '') +
                (vm.btnListarAnamneseExame !== false ? ico('anamnese', 'mdi-file-document', 'Anamnese') : '');
            box.addEventListener('click', ev => {
                const el = ev.target.closest('.pp-ha');
                if (!el) return;
                ev.stopPropagation(); ev.preventDefault();
                histClique(el.dataset.tipo, Number(box.dataset.exa));
            });
            td.appendChild(box);
        });
        pintarHistAcoes();
    }
    function pintarHistAcoes() {
        const vm = laudoVm();
        document.querySelectorAll('#datatableExamesHistorico .pp-hist-acoes').forEach(box => {
            const exa = Number(box.dataset.exa);
            const it = vm && (vm.examesPacienteHistorico || []).find(x => x.exa_codigo === exa);
            const c = histContagens(exa);
            const set = (tipo, cor, n, extra) => {
                const el = box.querySelector(`[data-tipo="${tipo}"]`);
                if (!el) return;
                if (cor) { if (el.dataset.on !== cor) el.dataset.on = cor; } else if (el.dataset.on) delete el.dataset.on;
                if (n > 0) { if (el.dataset.n !== String(n)) el.dataset.n = String(n); } else if (el.dataset.n) delete el.dataset.n;
                const tit = el.getAttribute('title').split(' (')[0] + (extra || '');
                if (el.getAttribute('title') !== tit) el.setAttribute('title', tit);
            };
            set('anexos', c.arq > 0 ? 'anexo' : '', 0, c.arq > 0 ? ` (${c.arq})` : (c.carregando ? ' (verificando…)' : ' (nenhum)'));
            set('comentarios', c.com > 0 ? 'roxo' : '', c.com, c.com > 0 ? ` (${c.com})` : (c.carregando ? ' (verificando…)' : ' (nenhum)'));
            const anam = it && String(it.exa_anamnese || '').trim();
            set('anamnese', anam ? 'roxo' : '', 0, anam ? ' (' + anam.slice(0, 120).replace(/\s+/g, ' ') + (anam.length > 120 ? '…' : '') + ')' : ' (vazia)');
        });
    }
    function histClique(tipo, exa) {
        const vm = laudoVm();
        if (!vm) return;
        const it = (vm.examesPacienteHistorico || []).find(x => x.exa_codigo === exa);
        if (!it) return;
        const atual = vm.exame && vm.exame.exa_codigo === exa;
        if (tipo === 'comentarios') {
            vm.abrirEditarComentarioExame({ item: { exa_codigo: exa }, callBackClose: () => { HIST_CACHE.delete(exa); pintarHistAcoes(); } });
            // o diálogo nativo não avisa ao fechar sem salvar: reconta quando ele some
            vigiarFechamento(() => { HIST_CACHE.delete(exa); pintarHistAcoes(); });
        } else if (tipo === 'anamnese') {
            vm.abrirEditarAnamnese({
                item: { exa_codigo: exa },
                callBackClose: async () => {
                    try {
                        const e = await pacsGet('exame/' + exa);
                        if (vm.$set) vm.$set(it, 'exa_anamnese', e.exa_anamnese); else it.exa_anamnese = e.exa_anamnese;
                        // exame do laudo aberto: mantém a anamnese nova na memória do laudo (evita regravar a antiga ao salvar o laudo)
                        if (atual && vm.exame) { if (vm.$set) vm.$set(vm.exame, 'exa_anamnese', e.exa_anamnese); else vm.exame.exa_anamnese = e.exa_anamnese; }
                    } catch (er) { /* só a cor do ícone fica desatualizada */ }
                    pintarHistAcoes();
                }
            });
        } else if (tipo === 'anexos') {
            // exame do laudo aberto: o diálogo nativo é seguro (é o mesmo objeto) e permite anexar
            if (atual && typeof vm.abrirListaArquivos === 'function') { vm.abrirListaArquivos(vm.exame); return; }
            abrirAnexosHist(it);
        }
    }
    function vigiarFechamento(fn) {
        const ini = Date.now();
        let viu = false;
        const t = setInterval(() => {
            const aberto = [...document.querySelectorAll('.v-dialog--active .v-toolbar__title, .v-dialog--active .v-card__title')].some(e => /coment/i.test(e.innerText));
            if (aberto) viu = true;
            if ((viu && !aberto) || Date.now() - ini > 30 * 60 * 1000) { clearInterval(t); if (viu) fn(); }
        }, 700);
    }

    // ---- Visualizador de anexos (só leitura) ----
    function dataUriParaBlob(uri) {
        const [cab, b64] = String(uri || '').split(';base64,');
        const tipo = (cab || '').split(':')[1] || 'application/octet-stream';
        const bin = atob(b64 || ''), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Blob([u8], { type: tipo });
    }
    function fecharAnexos() {
        const w = document.getElementById('pp-anexos');
        if (!w) return;
        (w.__urls || []).forEach(u => URL.revokeObjectURL(u));
        w.remove();
        document.removeEventListener('keydown', escAnexos, true);
    }
    function escAnexos(e) { if (e.key === 'Escape' && document.getElementById('pp-anexos')) { e.stopPropagation(); e.preventDefault(); fecharAnexos(); } }
    async function abrirAnexosHist(it) {
        fecharAnexos();
        const exa = it.exa_codigo;
        const desc = (it.tipoexame && it.tipoexame.tpe_descricao) || 'Exame';
        const w = document.createElement('div');
        w.id = 'pp-anexos';
        w.__urls = [];
        w.innerHTML = `
<div class="ppx-fundo"></div>
<div class="ppx-jan" role="dialog" aria-label="Anexos do exame anterior">
  <div class="ppx-top"><span class="ppx-tit">📎 Anexos — ${esc(desc)} · ${esc(dataBR(it.exa_data))}</span><span class="ppx-ro">só leitura</span><button class="ppx-x" title="Fechar (Esc)">✕</button></div>
  <div class="ppx-corpo"><div class="ppx-lista"><div class="ppx-msg">Carregando…</div></div><div class="ppx-prev"></div></div>
</div>`;
        const st = document.createElement('style');
        st.textContent = `
#pp-anexos { position: fixed; inset: 0; z-index: 2000; font-family: Roboto, Arial, sans-serif; }
#pp-anexos .ppx-fundo { position: absolute; inset: 0; background: rgba(0,0,0,.55); }
#pp-anexos .ppx-jan { position: absolute; top: 3vh; left: 50%; transform: translateX(-50%); width: min(1300px, 96vw); height: 94vh; background: #1e1e1e; color: #eee; border-radius: 6px; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,.6); overflow: hidden; }
#pp-anexos .ppx-top { display: flex; align-items: center; gap: 10px; padding: 0 8px 0 16px; height: 40px; background: #3f5a8a; color: #fff; flex: 0 0 auto; }
#pp-anexos .ppx-tit { font-size: 15px; font-weight: 600; flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pp-anexos .ppx-ro { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,.2); }
#pp-anexos .ppx-x { background: none; border: 0; color: #fff; font-size: 20px; cursor: pointer; width: 32px; height: 32px; border-radius: 4px; }
#pp-anexos .ppx-x:hover { background: rgba(255,255,255,.15); }
#pp-anexos .ppx-corpo { flex: 1 1 auto; display: flex; min-height: 0; }
#pp-anexos .ppx-lista { flex: 0 0 260px; overflow-y: auto; border-right: 1px solid #333; padding: 6px; scrollbar-width: thin; }
#pp-anexos .ppx-item { display: block; width: 100%; text-align: left; background: none; border: 0; color: #ddd; padding: 7px 8px; border-radius: 4px; cursor: pointer; font-size: 13px; line-height: 1.3; word-break: break-word; }
#pp-anexos .ppx-item:hover { background: #2c2c2c; }
#pp-anexos .ppx-item.ativo { background: #2b4a7a; color: #fff; }
#pp-anexos .ppx-item small { display: block; opacity: .6; font-size: 11px; }
#pp-anexos .ppx-prev { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; }
#pp-anexos .ppx-barra { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid #333; flex: 0 0 auto; }
#pp-anexos .ppx-barra b { flex: 1 1 auto; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pp-anexos .ppx-btn { background: #2196f3; color: #fff; border: 0; border-radius: 4px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
#pp-anexos .ppx-btn.sec { background: #555; }
#pp-anexos .ppx-area { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; background: #111; overflow: auto; }
#pp-anexos .ppx-area img { max-width: 100%; max-height: 100%; object-fit: contain; }
#pp-anexos .ppx-area embed, #pp-anexos .ppx-area iframe { width: 100%; height: 100%; border: 0; background: #fff; }
#pp-anexos .ppx-msg { padding: 16px; opacity: .8; font-size: 13px; text-align: center; }`;
        w.appendChild(st);
        document.body.appendChild(w);
        w.querySelector('.ppx-fundo').addEventListener('click', fecharAnexos);
        w.querySelector('.ppx-x').addEventListener('click', fecharAnexos);
        document.addEventListener('keydown', escAnexos, true);
        const lista = w.querySelector('.ppx-lista'), prev = w.querySelector('.ppx-prev');
        const arquivos = []; // { nome, criado, blob?, url?, tipo }
        let total = 0;
        const buscar = async off => {
            const j = await pacsGet(`arquivo/exame/${exa}?arq_tipoarquivo=ARQUIVO&offset=${off}`);
            const rows = Array.isArray(j) ? j : (j && j.rows) ? j.rows : (j && j.arq_blob ? [j] : []);
            if (j && j.count != null) total = parseInt(j.count, 10) || 0;
            return rows[0] || null;
        };
        const mostrar = async i => {
            lista.querySelectorAll('.ppx-item').forEach((b, k) => b.classList.toggle('ativo', k === i));
            const a = arquivos[i];
            prev.innerHTML = `<div class="ppx-barra"><b title="${esc(a.nome)}">${esc(a.nome)}</b></div><div class="ppx-area"><div class="ppx-msg">Carregando…</div></div>`;
            const area = prev.querySelector('.ppx-area'), barra = prev.querySelector('.ppx-barra');
            try {
                if (!a.url) {
                    const row = a.row || await buscar(i);
                    if (!row || !row.arq_blob) throw new Error('anexo não encontrado');
                    const blob = dataUriParaBlob(row.arq_blob);
                    a.url = URL.createObjectURL(blob); a.tipo = blob.type; w.__urls.push(a.url);
                    a.row = null; // libera o texto base64
                }
                if (!document.getElementById('pp-anexos') || !prev.isConnected) return;
                const bAbrir = document.createElement('button'); bAbrir.className = 'ppx-btn'; bAbrir.textContent = 'Abrir em nova guia';
                bAbrir.onclick = () => window.open(a.url, '_blank');
                const bBaixar = document.createElement('button'); bBaixar.className = 'ppx-btn sec'; bBaixar.textContent = 'Baixar';
                bBaixar.onclick = () => { const l = document.createElement('a'); l.href = a.url; l.download = a.nome || 'anexo'; document.body.appendChild(l); l.click(); l.remove(); };
                barra.append(bAbrir, bBaixar);
                const t = a.tipo || '';
                if (/^image\//.test(t)) area.innerHTML = `<img src="${a.url}" alt="">`;
                else if (/pdf/.test(t)) area.innerHTML = `<embed src="${a.url}" type="application/pdf">`;
                else if (/^text\//.test(t)) area.innerHTML = `<iframe src="${a.url}"></iframe>`;
                else area.innerHTML = `<div class="ppx-msg">Pré-visualização indisponível para este tipo de arquivo (${esc(t || 'desconhecido')}).<br>Use “Abrir em nova guia” ou “Baixar”.</div>`;
            } catch (er) { area.innerHTML = `<div class="ppx-msg">Não foi possível abrir: ${esc(er.message)}</div>`; }
        };
        try {
            const primeiro = await buscar(0);
            if (!document.getElementById('pp-anexos')) return;
            if (!primeiro) { lista.innerHTML = '<div class="ppx-msg">Este exame não tem anexos.</div>'; prev.innerHTML = ''; return; }
            if (!total) total = 1;
            for (let i = 0; i < total; i++) arquivos.push({ nome: i === 0 ? primeiro.arq_nomeoriginal : `Anexo ${i + 1}`, criado: i === 0 ? primeiro.arq_created : '', row: i === 0 ? primeiro : null });
            const desenhaLista = () => {
                lista.innerHTML = arquivos.map((a, i) => `<button class="ppx-item" data-i="${i}">${esc(a.nome || 'Anexo ' + (i + 1))}${a.criado ? `<small>${esc(dataBR(a.criado))}</small>` : ''}</button>`).join('');
                lista.querySelectorAll('.ppx-item').forEach(b => b.addEventListener('click', () => mostrar(+b.dataset.i)));
            };
            desenhaLista();
            mostrar(0);
            // nomes dos demais: busca em segundo plano (um por vez, para não pesar)
            for (let i = 1; i < total; i++) {
                if (!document.getElementById('pp-anexos')) return;
                try {
                    const r = await buscar(i);
                    if (r) { arquivos[i].nome = r.arq_nomeoriginal; arquivos[i].criado = r.arq_created; if (!arquivos[i].url) arquivos[i].row = r; }
                } catch (e) { /* mantém “Anexo N” */ }
                const ativo = lista.querySelector('.ppx-item.ativo');
                const k = ativo ? +ativo.dataset.i : 0;
                desenhaLista();
                const b = lista.querySelector(`.ppx-item[data-i="${k}"]`); if (b) b.classList.add('ativo');
            }
        } catch (er) {
            lista.innerHTML = `<div class="ppx-msg">Erro ao buscar anexos: ${esc(er.message)}</div>`;
        }
    }

    // Buscar Matriz / Frase: a lista vai até o pé da tela (rolagem só se não couber)
    function buscaAltura() {
        if (!on('buscaCompacta')) return;
        document.querySelectorAll('.v-autocomplete__content.menuable__content__active').forEach(m => {
            if (!m.querySelector('.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap')) return;
            const top = m.getBoundingClientRect().top;
            const mh = Math.max(160, Math.floor(window.innerHeight - top - 12)) + 'px';
            if (m.style.getPropertyValue('--pp-mh') !== mh) m.style.setProperty('--pp-mh', mh);
        });
    }


window.__ppT={histAcoes,buscaAltura,pintarHistAcoes,abrirAnexosHist,fecharAnexos,HIST_CACHE};
if(window.__ppObs) window.__ppObs.disconnect();
let pend=false; window.__ppObs=new MutationObserver(m=>{ if(m.every(x=>{const el=x.target.nodeType===1?x.target:x.target.parentElement; return el&&el.closest&&el.closest('#pp-anexos, .pp-hist-acoes');})) return; if(pend) return; pend=true; setTimeout(()=>{pend=false; histAcoes(); buscaAltura();},120);});
window.__ppObs.observe(document.body,{childList:true,subtree:true,characterData:true});
histAcoes();
})();