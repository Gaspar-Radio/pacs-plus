// ==UserScript==
// @name         PACS LADI - Plus (visual, pesquisa e calculadoras)
// @namespace    http://tampermonkey.net/
// @version      1.7.1
// @description  Substitui o Stylus, o “AM2 - Otimizar textos e colunas” e o “AM2 - Recolher painel de série única” por ajustes liga/desliga que localizam colunas e campos pelo NOME (não pela posição), + pesquisa rápida (Radiopaedia, e-Anatomy, Radiology Assistant…), links rápidos e calculadoras radiológicas.
// @author       Dr. Gabriel Gaspar
// @match        *://pacs.ladi.org.br/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-plus.user.js
// @downloadURL  https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-plus.user.js
// ==/UserScript==

(function () {
    'use strict';
    if (window.__pacsPlusLoaded) return;
    window.__pacsPlusLoaded = true;

    // =====================================================================
    // 0. CONFIGURAÇÃO (salva neste computador)
    // =====================================================================
    const CFG_KEY = 'pacsplus_cfg_v1';
    const DEFAULT_SITES = [
        'Radiopaedia | https://radiopaedia.org/search?lang=us&q=%s&scope=all',
        'e-Anatomy | https://www.google.com/search?q=site%3Aimaios.com+e-anatomy+%s',
        'Radiology Assistant | https://radiologyassistant.nl/search?q=%s',
        'Google Imagens | https://www.google.com/search?tbm=isch&q=%s+radiology',
        'PubMed | https://pubmed.ncbi.nlm.nih.gov/?term=%s'
    ].join('\n');
    const DEFAULT_LINKS = [
        'Radiopaedia | https://radiopaedia.org/',
        'e-Anatomy | https://www.imaios.com/en/e-anatomy',
        'Radiology Assistant | https://radiologyassistant.nl/'
    ].join('\n');

    // Cada bloco visual = 1 interruptor. Nome curto + descrição do que faz.
    const BLOCKS = [
        ['historico', 'Histórico de exames', 'Tabela de histórico compacta (fonte 12 px), só Exame, Data/Hora, Situação e Ações'],
        ['historicoLinha', 'Histórico em uma linha', 'Exame à esquerda e só a sigla da modalidade (CR, CT, US) à direita'],
        ['abreviar', 'Abreviar exame e convênio', 'Ex.: “ARTICULAR POR ARTICULAÇÃO” → “ARTICULAR”; passe o mouse para ver o nome completo. Ao desligar, recarregue a página'],
        ['preFiltros', 'Pré-filtros sem rolagem', 'A lista abre inteira, à direita, com itens compactos'],
        ['paineis', 'Cabeçalhos dos painéis', 'Painéis do exame mais baixos'],
        ['dadosPaciente', 'Dados do paciente', 'Compacto; oculta Registro, Tipo, Radiologista e Unidade (pelo NOME do campo)'],
        ['moverExecutado', 'Executado / Última alteração ao lado da Anamnese', 'Move esses 3 campos para a 3ª coluna'],
        ['radios', 'Tipos de laudo (rádios)', 'Em linha; oculta OIT, Mamografia, Ecocardio e Dupla'],
        ['botoes', 'Botões do diálogo', 'Botões menores'],
        ['barraInferior', 'Barra inferior do diálogo', 'Botões em uma única linha'],
        ['filtros', 'Barra de filtros', 'Uma linha; mostra só Paciente, Datas, Modalidades, Situação e Urgente (pelo NOME)'],
        ['iconesLote', 'Ícones de lote', 'Oculta “Publicar em lote” e “Operações em lote”'],
        ['ocultarRelatorios', 'Ocultar ícone “Relatórios”', 'Na barra de filtros'],
        ['ocultarSelecao', 'Ocultar coluna de seleção (checkbox)', 'A 1ª coluna da lista, usada para ações em lote'],
        ['tabela', 'Tabela de exames compacta', 'Linhas baixas, fonte 13 px, larguras por NOME de coluna'],
        ['colunasExtras', 'Ocultar colunas extras', 'Oculta ID Paciente, Unidade, Tipo, Valor e Repasse, se aparecerem'],
        ['acoesExtras', 'Ocultar ícones de ação pouco usados', 'Info, Relatório, Seringa e Gravar áudio'],
        ['prazoSituacao', 'Prazo e Situação compactos', 'Chips menores; “C” de crítico em bolinha'],
        ['barraSuperior', 'Barra superior baixa (40 px)', ''],
        ['editor', 'Editor de laudo em uma linha', 'Oculta Link, Pesquisar/substituir, Citação e Indentação; fonte 15 px'],
        ['editorBotao6', 'Editor: ocultar botão “Formatação”', 'Localizado pelo nome do botão'],
        ['esticar', 'Lista ocupando a tela toda', ''],
        ['viewerRecolherSerieUnica', 'Visualizador: recolher painel quando o exame tem UMA série', 'Regra do antigo “AM2 - Recolher painel de série única” (qualquer modalidade)'],
        ['viewerRecolherUS', 'Visualizador: recolher painel sempre no ultrassom', 'Mesmo que o US tenha mais de uma série'],
        ['viewerRecolherTodos', 'Visualizador: recolher painel de séries em TODOS os exames', 'Inclui TC, RX etc.'],
        ['slaUSProprio', 'Prazo próprio do ultrassom (sem SLA no PACS)', 'US marcado como REVISAR e não urgente ganha prazo de 3 dias úteis a partir da data do exame (vence 07:00), sem precisar confirmar. Só aparece nos computadores com o Plus'],
        ['slaUteis', 'Prazo (SLA) eletivo (TC e US) em dias úteis', 'Recalcula o cronômetro da coluna Prazo pelos dias úteis (sem fim de semana e feriados de Santa Rita). O SLA de urgência não é alterado. Regras na aba ⏱ Prazos'],
    ];

    const DEFAULT_OFF = ['ocultarRelatorios', 'ocultarSelecao', 'viewerRecolherTodos']; // começam desligados
    const LARGURA_COMPACTA = 1400; // modo automático: janela mais estreita que isto => compacto (ex.: meia tela)

    // Regras do prazo em dias úteis (aba ⏱ Prazos)
    const SLA_PADRAO = {
        slas: 'TC ELETIVO\nUS ELETIVO',     // descrição do(s) SLA(s) do PACS a recalcular (um por linha); urgência fica de fora
        dias: 'CT = 5\nUS = 3',             // dias úteis por modalidade (sigla do PACS)
        hora: '07:00',                      // o laudo tem que estar pronto na abertura do dia útil final
        carnaval: true,                     // segunda e terça de Carnaval sem expediente
        extras: '24/05 | Aniversário de Santa Rita do Sapucaí',
        usSituacoes: 'REVISAR'              // prazo próprio do US: situações que contam (uma por linha)
    };

    function loadCfg() {
        let c = {};
        try { c = JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { c = {}; }
        c.blocks = c.blocks || {};
        BLOCKS.forEach(([k]) => { if (c.blocks[k] === undefined) c.blocks[k] = !DEFAULT_OFF.includes(k); });
        if (!['auto', 'normal', 'compacta'].includes(c.densidade)) c.densidade = 'auto';
        if (c.master === undefined) c.master = true;
        if (!c.sites) c.sites = DEFAULT_SITES;
        if (!c.links) c.links = DEFAULT_LINKS;
        c.sla = Object.assign({}, SLA_PADRAO, c.sla || {});
        // v1.6.1: inclui o SLA eletivo do ultrassom em configurações já salvas (uma única vez)
        if (!c.slaMigUS) {
            const linhas = String(c.sla.slas || '').split('\n').map(l => l.trim().toUpperCase().replace(/\s+/g, ' ')).filter(Boolean);
            if (!linhas.includes('US ELETIVO')) c.sla.slas = (String(c.sla.slas || '').trim() + '\nUS ELETIVO').trim();
            c.slaMigUS = true;
        }
        return c;
    }
    let cfg = loadCfg();
    function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* sem armazenamento */ } }
    const on = k => cfg.master && cfg.blocks[k];

    // =====================================================================
    // 1. UTILITÁRIOS
    // =====================================================================
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ').trim();
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function styleEl(id) {
        let el = document.getElementById(id);
        if (!el) { el = document.createElement('style'); el.id = id; (document.head || document.documentElement).appendChild(el); }
        return el;
    }
    function setCss(id, css) { const el = styleEl(id); if (el.textContent !== css) el.textContent = css; }
    function num(v) { if (v == null) return NaN; const s = String(v).trim().replace(/\s/g, '').replace(',', '.'); return s === '' ? NaN : Number(s); }
    function fmt(n, d = 1) { return Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–'; }
    function parseList(txt) {
        return String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
            const i = l.indexOf('|');
            return i < 0 ? null : { nome: l.slice(0, i).trim(), url: l.slice(i + 1).trim() };
        }).filter(x => x && x.nome && /^https?:\/\//i.test(x.url));
    }

    // =====================================================================
    // 2. CSS FIXO (blocos que não dependem de posição de coluna)
    // =====================================================================
    const STATIC = {
        historico: `
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
#datatableExamesHistorico.v-data-table--dense td, #datatableExamesHistorico.v-data-table--dense th { height: auto !important; padding: 1px 6px !important; }`,
        historicoLinha: `
#datatableExamesHistorico td:nth-child(1) { white-space: nowrap !important; overflow: hidden !important; }
#datatableExamesHistorico td:nth-child(1) .v-list-item__content { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 8px !important; overflow: hidden !important; }
#datatableExamesHistorico td:nth-child(1) .v-list-item__title { flex: 1 1 auto !important; min-width: 0 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
#datatableExamesHistorico td:nth-child(1) .v-list-item__subtitle { flex: 0 0 auto !important; white-space: nowrap !important; font-weight: 700 !important; opacity: .75; }
#datatableExamesHistorico.v-data-table--dense td { height: 22px !important; }`,
        paineis: `
.v-dialog__content .v-expansion-panel-header { min-height: 32px !important; padding: 3px 16px !important; font-size: 14px !important; }
.v-dialog__content .v-expansion-panel-header--active { min-height: 32px !important; }
.v-dialog__content .v-expansion-panel--active + .v-expansion-panel,
.v-dialog__content .v-expansion-panel--active:not(:first-child) { margin-top: 0 !important; }`,
        dadosPaciente: `
.v-dialog__content .v-expansion-panel-content { font-size: 13px !important; }
.v-dialog__content .v-expansion-panel-content__wrap { padding: 0 16px 6px 16px !important; }
.v-dialog__content .v-expansion-panel-content .row { margin: 0 !important; position: relative !important; }
.v-dialog__content .v-expansion-panel-content .row > .col { padding: 0 8px !important; }
.v-dialog__content .v-expansion-panel-content .row > .col > strong > br { display: none !important; }
.v-dialog__content .v-expansion-panel-content .row > .col > strong { font-size: 13px !important; font-weight: 600 !important; display: block !important; height: auto !important; line-height: 1.5 !important; margin: 0 !important; padding: 0 !important; }
.v-dialog__content .v-expansion-panel-content .row > .col > strong[data-pp-oculto] { display: none !important; }`,
        moverExecutado: `
.v-dialog__content .v-expansion-panel-content .row { position: relative !important; }
.v-dialog__content .v-expansion-panel-content .row > .col > strong[data-pp-mv] { position: absolute !important; left: 66.66% !important; width: 33% !important; padding-left: 8px !important; top: auto !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.v-dialog__content .v-expansion-panel-content .row > .col > strong[data-pp-mv="0"] { bottom: 40px !important; }
.v-dialog__content .v-expansion-panel-content .row > .col > strong[data-pp-mv="1"] { bottom: 20px !important; }
.v-dialog__content .v-expansion-panel-content .row > .col > strong[data-pp-mv="2"] { bottom: 0 !important; }
/* reserva espaço abaixo da Anamnese para os 3 campos movidos */
.v-dialog__content .v-expansion-panel-content .row:has(strong[data-pp-mv]) > .col:last-child { padding-bottom: 64px !important; }`,
        radios: `
.v-dialog__content [role="radiogroup"] { flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; }
.v-dialog__content .v-radio:has(input[value="OIT"]),
.v-dialog__content .v-radio:has(input[value="Mamografia"]),
.v-dialog__content .v-radio:has(input[value="MAMOGRAFIA"]),
.v-dialog__content .v-radio:has(input[value="ECOCARDIO"]),
.v-dialog__content .v-radio:has(input[value="DUPLA"]) { display: none !important; }
.v-dialog__content .v-radio { margin-right: 8px !important; margin-bottom: 0 !important; margin-top: 0 !important; align-items: center !important; }
.v-dialog__content .v-input--selection-controls__input { margin-right: 3px !important; transform: scale(0.9); }
.v-dialog__content .v-input--selection-controls { margin-top: 0 !important; padding-top: 0 !important; align-items: center !important; }
.v-dialog__content .v-label { font-size: 13px !important; }`,
        botoes: `
.v-dialog__content .v-btn { font-size: 12px !important; padding: 0 10px !important; height: 30px !important; min-width: 56px !important; margin: 1px !important; letter-spacing: 0 !important; }`,
        barraInferior: `
.v-dialog__content .row.align-center.justify-center.align-content-center { font-size: 13px !important; align-items: center !important; flex-wrap: nowrap !important; justify-content: center !important; }
.v-dialog__content .row.align-center.justify-center.align-content-center > .col-12 { flex: 0 0 auto !important; max-width: none !important; width: auto !important; }
.v-dialog__content .row.align-center.justify-center.align-content-center > .col { padding: 2px 4px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
.v-dialog__content .row.align-center.justify-center.align-content-center .v-btn { min-width: 0 !important; padding: 0 8px !important; margin: 1px 2px !important; font-size: 12px !important; }
.v-dialog__content .v-input--checkbox, .v-dialog__content .v-input--checkbox .v-input__slot { margin: 0 !important; padding: 0 !important; align-items: center !important; }
.v-dialog__content .v-input--checkbox .v-input--selection-controls__input { transform: scale(0.9); margin-right: 5px !important; }`,
        filtros: `
.v-main .row.row--dense .v-label, .v-main .row.row--dense .v-select__selection, .v-main .row.row--dense input, .v-main .row.row--dense .v-text-field input { font-size: 13px !important; }
.v-main button[title="Pesquisar"], .v-main button[title="Limpar Filtros"] { height: 34px !important; width: 34px !important; }
.v-main button[title="Pesquisar"] .v-icon, .v-main button[title="Limpar Filtros"] .v-icon { font-size: 22px !important; }
.v-main button[title="Relatórios"] { display: inline-flex !important; height: 34px !important; width: 34px !important; min-width: 34px !important; }
.v-main button[title="Relatórios"] .v-icon { font-size: 22px !important; }
.v-main .v-card__title.pa-2.mb-2 { font-size: 16px !important; padding: 5px 8px !important; margin-bottom: 4px !important; }
.v-main .v-card__title .v-input--dense .v-input__slot { min-height: 34px !important; height: 34px !important; }
.v-main .v-card__title .v-input--dense input, .v-main .v-card__title .v-input--dense .v-select__selection { font-size: 14px !important; }
.v-main button[title="Salvar Filtro"], .v-main button[title="Mostrar/Ocultar Filtros"] { height: 34px !important; width: 34px !important; }
.v-main button[title="Salvar Filtro"] .v-icon, .v-main button[title="Mostrar/Ocultar Filtros"] .v-icon { font-size: 22px !important; }`,
        iconesLote: `
.v-main button[title="Publicar em Lote"], .v-main button[title="Operações em lote"] { display: none !important; }`,
        tabela: `
.v-data-table.elevation-1 td, .v-data-table.elevation-1 th, .v-data-table.elevation-1 td * { font-size: 13px !important; }
.v-data-table.elevation-1.v-data-table--dense td, .v-data-table.elevation-1.v-data-table--dense th { height: 28px !important; padding: 0 4px !important; }
.v-main .v-data-table.elevation-1, .v-main .v-data-table.elevation-1 .v-data-table__wrapper, .v-main .v-data-table.elevation-1 table { width: 100% !important; max-width: 100% !important; }
.v-data-table.elevation-1 .v-data-table__wrapper { overflow-x: hidden !important; }
.v-data-table.elevation-1 table { table-layout: fixed !important; width: 100% !important; }
.v-data-table.elevation-1 td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle !important; }`,
        acoesExtras: `
html .v-data-table.elevation-1[data-pp-lista] td .v-btn[title="Gravar Áudio"],
html .v-data-table.elevation-1[data-pp-lista] td .v-btn.v-btn--icon:has(.mdi-information),
html .v-data-table.elevation-1[data-pp-lista] td .v-btn.v-btn--icon:has(.mdi-file-document-refresh),
html .v-data-table.elevation-1[data-pp-lista] td .v-btn.v-btn--icon:has(.mdi-needle) { display: none !important; }`,
        barraSuperior: `
header.v-app-bar.v-toolbar--dense { height: 40px !important; }
header.v-app-bar.v-toolbar--dense .v-toolbar__content { height: 40px !important; }
header.v-app-bar.v-toolbar--dense .v-toolbar__content .v-btn { height: 40px !important; }
.v-main { padding-top: 40px !important; }`,
        editor: `
.ck.ck-toolbar [data-cke-tooltip-text^="Link"],
.ck.ck-toolbar [data-cke-tooltip-text^="Pesquisar e substituir"],
.ck.ck-toolbar [data-cke-tooltip-text^="Bloco de citação"],
.ck.ck-toolbar [data-cke-tooltip-text^="Aumentar indentação"],
.ck.ck-toolbar [data-cke-tooltip-text^="Diminuir indentação"] { display: none !important; }
.ck.ck-toolbar .ck-heading-dropdown .ck-button__label,
.ck.ck-toolbar .ck-heading-dropdown .ck-dropdown__button .ck-button__label { max-width: 70px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
.ck.ck-toolbar .ck-button { padding-left: 3px !important; padding-right: 3px !important; }
.ck.ck-toolbar > .ck-toolbar__items > * { margin: 0 !important; }
.ck-toolbar__items { flex-wrap: nowrap !important; }
.ck.ck-toolbar { padding: 0 2px !important; }
.document-editor__toolbar { display: flex !important; flex-wrap: nowrap !important; align-items: center !important; flex-direction: row !important; padding: 0 !important; min-height: 0 !important; }
.document-editor__toolbar > .v-btn { height: 28px !important; font-size: 13px !important; padding: 0 8px !important; min-width: 0 !important; }
.document-editor__toolbar > .v-btn .v-btn__content { font-size: 13px !important; }
.document-editor__toolbar > .ck.ck-toolbar { flex: 1 1 0 !important; width: auto !important; min-width: 0 !important; max-width: none !important; border: none !important; background: transparent !important; }
.ck.ck-content, .ck.ck-editor__editable { font-size: 15px !important; line-height: 1.5 !important; }`,
        editorBotao6: `
.document-editor__toolbar > .v-btn[data-pp-oculto] { display: none !important; }`,
        ocultarRelatorios: `
.v-main button[title="Relatórios"] { display: none !important; }`,
        preFiltros: `
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) {
  position: fixed !important; top: 44px !important; right: 12px !important; left: auto !important; bottom: auto !important;
  width: min(680px, calc(100vw - 24px)) !important; min-width: min(680px, calc(100vw - 24px)) !important; max-width: min(680px, calc(100vw - 24px)) !important;
  max-height: calc(100vh - 56px) !important; overflow-x: hidden !important; overflow-y: auto !important; padding: 0 !important; margin: 0 !important; transform-origin: top right !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-list { padding: 0 !important; margin: 0 !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-list-item { min-height: 42px !important; height: 42px !important; padding: 0 10px 0 14px !important; margin: 0 !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-list-item__content { min-height: 0 !important; padding: 0 !important; margin: 0 !important; align-self: center !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-list-item__title { font-size: 13px !important; line-height: 1.15 !important; font-weight: 500 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-list-item__action { min-width: 30px !important; width: 30px !important; height: 32px !important; margin: 0 0 0 3px !important; padding: 0 !important; align-self: center !important; justify-content: center !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-btn.v-btn--icon { width: 30px !important; min-width: 30px !important; max-width: 30px !important; height: 30px !important; min-height: 30px !important; padding: 0 !important; margin: 0 1px !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-icon { width: 23px !important; height: 23px !important; font-size: 23px !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline)) .v-divider { margin: 0 !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline))::-webkit-scrollbar { width: 8px !important; }
.v-menu__content:has(:is(.mdi-delete, .mdi-delete-outline)):has(:is(.mdi-star, .mdi-star-outline))::-webkit-scrollbar-thumb { border-radius: 4px !important; }`,
        esticar: `
.v-main__wrap > .container.fill-height { align-items: stretch !important; padding-top: 2px !important; padding-bottom: 2px !important; max-width: 100% !important; }
.v-main__wrap > .container.fill-height > .layout.align-center { align-items: stretch !important; justify-content: stretch !important; width: 100% !important; }
.v-main__wrap > .container.fill-height > .layout > .v-card { width: 100% !important; max-width: 100% !important; flex: 1 1 auto !important; display: flex !important; flex-direction: column !important; min-height: 0 !important; }
.v-main__wrap .v-card > .v-card__title + .v-card__text + div { flex: 1 1 auto !important; display: flex !important; flex-direction: column !important; min-height: 0 !important; }
.v-main__wrap .v-card > div > .v-data-table { flex: 1 1 auto !important; display: flex !important; flex-direction: column !important; min-height: 0 !important; }
.v-main__wrap .v-card .v-data-table > .v-data-table__wrapper { flex: 1 1 auto !important; max-height: none !important; min-height: 0 !important; }
.v-main__wrap .v-card > .layout { flex: 0 0 auto !important; }`
    };

    // Modo COMPACTO (antigo estilo “CASA – meia tela” do Mac): fontes e alturas menores.
    // Prefixo html[data-pp-dens="c"] => vence as regras normais sem precisar repeti-las.
    const C = 'html[data-pp-dens="c"]';
    const COMPACTO = `
${C} .v-data-table.elevation-1 td, ${C} .v-data-table.elevation-1 th, ${C} .v-data-table.elevation-1 td * { font-size: 11px !important; }
${C} .v-data-table.elevation-1.v-data-table--dense td, ${C} .v-data-table.elevation-1.v-data-table--dense th { height: 24px !important; padding: 0 6px !important; }
${C} #datatableExamesHistorico, ${C} #datatableExamesHistorico th, ${C} #datatableExamesHistorico td, ${C} #datatableExamesHistorico td * { font-size: 11px !important; }
${C} .v-dialog__content .v-expansion-panel-header { min-height: 28px !important; padding: 2px 16px !important; font-size: 13px !important; }
${C} .v-dialog__content .v-expansion-panel-header--active { min-height: 28px !important; }
${C} .v-dialog__content .v-expansion-panel-content { font-size: 12px !important; }
${C} .v-dialog__content .v-expansion-panel-content__wrap { padding: 0 16px 4px 16px !important; }
${C} .v-dialog__content .v-expansion-panel-content .row > .col > strong { font-size: 12px !important; line-height: 1.4 !important; }
${C} .v-dialog__content .v-expansion-panel-content .row > .col > strong[data-pp-mv="0"] { bottom: 34px !important; }
${C} .v-dialog__content .v-expansion-panel-content .row > .col > strong[data-pp-mv="1"] { bottom: 17px !important; }
${C} .v-dialog__content .v-expansion-panel-content .row:has(strong[data-pp-mv]) > .col:last-child { padding-bottom: 54px !important; }
${C} .v-dialog__content .v-radio { margin-right: 6px !important; }
${C} .v-dialog__content .v-input--selection-controls__input { margin-right: 2px !important; transform: scale(0.85); }
${C} .v-dialog__content .v-label { font-size: 12px !important; }
${C} .v-dialog__content .v-btn { font-size: 11px !important; padding: 0 8px !important; height: 26px !important; min-width: 50px !important; }
${C} .v-dialog__content .row.align-center.justify-center.align-content-center { font-size: 12px !important; }
${C} .v-dialog__content .row.align-center.justify-center.align-content-center .v-btn { padding: 0 6px !important; font-size: 11px !important; }
${C} .v-main .row.row--dense .v-label, ${C} .v-main .row.row--dense .v-select__selection, ${C} .v-main .row.row--dense input, ${C} .v-main .row.row--dense .v-text-field input { font-size: 12px !important; }
${C} .v-main button[title="Pesquisar"], ${C} .v-main button[title="Limpar Filtros"], ${C} .v-main button[title="Salvar Filtro"], ${C} .v-main button[title="Mostrar/Ocultar Filtros"] { height: 30px !important; width: 30px !important; }
${C} .v-main button[title="Pesquisar"] .v-icon, ${C} .v-main button[title="Limpar Filtros"] .v-icon, ${C} .v-main button[title="Salvar Filtro"] .v-icon, ${C} .v-main button[title="Mostrar/Ocultar Filtros"] .v-icon { font-size: 20px !important; }
${C} .v-main .v-card__title.pa-2.mb-2 { font-size: 15px !important; padding: 4px 8px !important; }
${C} .v-main .v-card__title .v-input--dense .v-input__slot { min-height: 30px !important; height: 30px !important; }
${C} .v-main .v-card__title .v-input--dense input, ${C} .v-main .v-card__title .v-input--dense .v-select__selection { font-size: 13px !important; }
${C} header.v-app-bar.v-toolbar--dense, ${C} header.v-app-bar.v-toolbar--dense .v-toolbar__content, ${C} header.v-app-bar.v-toolbar--dense .v-toolbar__content .v-btn { height: 36px !important; }
${C} .v-main { padding-top: 36px !important; }
${C} .document-editor__toolbar > .v-btn { height: 24px !important; font-size: 12px !important; padding: 0 6px !important; }
${C} .document-editor__toolbar > .v-btn .v-btn__content { font-size: 12px !important; }
${C} .ck.ck-toolbar .ck-heading-dropdown .ck-button__label { max-width: 60px !important; }
${C} .ck.ck-toolbar .ck-button { padding-left: 2px !important; padding-right: 2px !important; }
${C} #pp-btn { top: 6px; }`;

    function densidadeAtual() {
        if (cfg.densidade === 'normal' || cfg.densidade === 'compacta') return cfg.densidade;
        return window.innerWidth < LARGURA_COMPACTA ? 'compacta' : 'normal';
    }
    function applyDensidade() {
        const d = cfg.master && densidadeAtual() === 'compacta' ? 'c' : 'n';
        if (document.documentElement.getAttribute('data-pp-dens') !== d) document.documentElement.setAttribute('data-pp-dens', d);
    }

    function applyStatic() {
        applyDensidade();
        const css = Object.keys(STATIC).filter(on).map(k => `/* ${k} */${STATIC[k]}`).join('\n');
        setCss('pp-static', cfg.master ? css + '\n/* compacto */' + COMPACTO : '');
    }
    let resizeT = null;
    window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { const a = document.documentElement.getAttribute('data-pp-dens'); applyDensidade(); if (document.documentElement.getAttribute('data-pp-dens') !== a) applyDynamic(); }, 200); });

    // =====================================================================
    // 3. CSS DINÂMICO — colunas e filtros localizados pelo NOME
    // ---------------------------------------------------------------------
    // A ordem das colunas muda conforme a configuração de colunas de cada
    // computador; por isso o nth-child fixo do Stylus “quebrava”. Aqui o
    // script lê os cabeçalhos e gera as regras com a posição real.
    // =====================================================================
    // “Exame” fica sem largura fixa: absorve todo o espaço que sobrar.
    // Larguras em PIXELS para colunas de conteúdo curto (não “comem” espaço em meia tela).
    // Paciente e Exame ficam sem largura fixa e dividem igualmente o que sobrar.
    const COL_PX = {
        normal:   { idade: 48, data: 92, hora: 70, mod: 46, convenio: 110, prazo: 122, situacao: 100 },
        compacta: { idade: 40, data: 80, hora: 60, mod: 40, convenio: 92, prazo: 104, situacao: 86 }
    };
    const COL_EXTRAS = ['id paciente', 'unidade', 'tipo', 'valor', 'repasse'];
    const FILTROS_MOSTRAR = ['paciente', 'data exame', 'data inicial', 'data final', 'modalidades', 'situacao', 'urgente'];
    // Todos os filtros que o PACS oferece hoje (rótulo exibido). A ordem/visibilidade é configurável em ⚙️ Ajustes.
    const FILTROS_TODOS = ['Paciente', 'ID Paciente', 'Data exame', 'Data Inicial', 'Data Final', 'Modalidades', 'Tipo exames', 'Convênios', 'Solicitantes', 'Radiologistas', 'Unidades', 'Assinatura', 'Situação', 'Urgente', 'Crítico', 'Tipo', 'Imagem', 'Contraste', 'Ações'];
    let filtrosVistos = []; // rótulos encontrados na página (para listar filtros novos do PACS)
    function filtrosCfg() {
        if (!cfg.filtros) cfg.filtros = { ordem: FILTROS_TODOS.map(norm), vis: FILTROS_MOSTRAR.slice() };
        const nomes = FILTROS_TODOS.concat(filtrosVistos.filter(v => !FILTROS_TODOS.some(t => norm(t) === norm(v))));
        nomes.forEach(n => { if (!cfg.filtros.ordem.includes(norm(n))) cfg.filtros.ordem.push(norm(n)); });
        return { nomes, ...cfg.filtros };
    }
    const FILTRO_WIDTH = { 'paciente': '16%', 'data exame': '9%', 'data inicial': '11%', 'data final': '11%', 'modalidades': '15%', 'situacao': '13%', 'urgente': '9%', '__icones': '9%' };

    function findListTable() {
        const tables = document.querySelectorAll('.v-main .v-data-table.elevation-1');
        for (const t of tables) {
            const names = [...t.querySelectorAll(':scope thead tr:first-child > th')].map(th => norm(th.innerText));
            if (names.includes('paciente') && names.includes('situacao')) return { t, names };
        }
        return null;
    }

    function listCss() {
        const found = findListTable();
        if (!found) return '';
        const { t, names } = found;
        t.setAttribute('data-pp-lista', '1');
        const S = '.v-data-table[data-pp-lista]';
        const idx = n => names.indexOf(n) + 1;
        const cell = i => `${S} th:nth-child(${i}), ${S} td:nth-child(${i})`;
        // Ocultar coluna = ocultar th/td E o <col> correspondente (senão o <col> continua reservando espaço)
        const hideCol = i => `${cell(i)} { display: none !important; }\n`;
        // O PACS cria um <col> para cada coluna POSSÍVEL (16), mesmo quando a tabela mostra menos
        // (ex.: Mac com 12). Os <col> sobrando reservavam espaço e espremiam Paciente/Exame.
        // Sem o <colgroup>, as larguras passam a vir só do cabeçalho real.
        let css = `${S} > .v-data-table__wrapper > table > colgroup { display: none !important; }\n`;
        if (on('tabela')) {
            // coluna de seleção (1ª, sem título)
            if (names[0] === '') css += on('ocultarSelecao')
                ? hideCol(1)
                : `${cell(1)} { display: table-cell !important; width: 34px !important; min-width: 34px !important; max-width: 34px !important; padding: 0 2px !important; text-align: center !important; overflow: visible !important; }\n`;
            ['data', 'hora', 'mod'].forEach(n => { const i = idx(n); if (i) css += `${cell(i)} { padding-left: 2px !important; padding-right: 2px !important; }\n`; });
            Object.entries(COL_PX[densidadeAtual()]).forEach(([n, w]) => { const i = idx(n); if (i) css += `${cell(i)} { width: ${w}px !important; min-width: ${w}px !important; max-width: ${w}px !important; box-sizing: border-box !important; }\n`; });
            { const i = idx('paciente'); if (i) css += `${cell(i)} { width: 17% !important; max-width: none !important; min-width: 0 !important; }\n`; }
            { const i = idx('exame'); if (i) css += `${cell(i)} { width: auto !important; max-width: none !important; min-width: 0 !important; }\n`; }
            const iConv = idx('convenio');
            if (iConv) css += `${cell(iConv)} { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }\n`;
            const iAc = idx('acoes');
            // Ações (do estilo do Mac): largura fixa para os botões + botão extra (Horos/RadiAnt); menu ⋮ sempre na mesma linha, à direita
            const A = `${S} td:nth-child(${iAc})`, EXTRA = '[data-ladi-radiant-button="true"], [data-ladi-horos-button="true"]';
            if (iAc) css += `${cell(iAc)} { width: 184px !important; min-width: 184px !important; max-width: 184px !important; box-sizing: border-box !important; white-space: nowrap !important; overflow: visible !important; }
${S} th:nth-child(${iAc}) { padding-left: 4px !important; padding-right: 2px !important; text-align: left !important; }
${A} { position: relative !important; padding: 0 28px 0 2px !important; text-align: left !important; font-size: 0 !important; }
${A} .v-btn.v-btn--icon, ${A} :is(${EXTRA}) { display: inline-flex !important; flex: 0 0 22px !important; width: 22px !important; min-width: 22px !important; max-width: 22px !important; height: 22px !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; vertical-align: middle !important; overflow: visible !important; }
${A} .v-btn.v-btn--icon .v-icon, ${A} :is(${EXTRA}) .v-icon { display: inline-flex !important; width: 17px !important; height: 17px !important; font-size: 17px !important; line-height: 17px !important; margin: 0 !important; padding: 0 !important; }
${A} :is(${EXTRA}) { color: #64b5f6 !important; }
${A} > :is(button, .v-btn):has(:is(.mdi-dots-vertical, .mdi-dots-horizontal)), ${A} :is(.v-menu, .v-menu__activator):has(:is(.mdi-dots-vertical, .mdi-dots-horizontal)) { position: absolute !important; top: 50% !important; margin-top: -11px !important; right: 4px !important; left: auto !important; transform: none !important; z-index: 3 !important; }
${S} td:nth-child(1) .v-input, ${S} td:nth-child(1) .v-input__control, ${S} td:nth-child(1) .v-input__slot { margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
${S} td:nth-child(1) .v-input--selection-controls__input { margin: 0 auto !important; }
${S} td .v-tooltip { display: none !important; }\n`;
        }
        if (on('colunasExtras')) COL_EXTRAS.forEach(n => { const i = idx(n); if (i) css += hideCol(i); });
        if (on('prazoSituacao')) {
            const iP = idx('prazo');
            if (iP) css += `${S} td:nth-child(${iP}) { padding: 0 2px !important; }
${S} td:nth-child(${iP}) > div { display: flex !important; align-items: center !important; }
${S} td:nth-child(${iP}) .v-chip { font-size: 11px !important; padding: 0 5px !important; height: 20px !important; }
${S} td:nth-child(${iP}) .v-chip .v-chip__content { padding: 0 !important; }
${S} td:nth-child(${iP}) .v-icon { font-size: 14px !important; margin-left: 2px !important; }\n`;
            const iS = idx('situacao');
            if (iS) css += `${S} td:nth-child(${iS}) { overflow: visible !important; white-space: nowrap !important; padding: 0 4px !important; }
${S} td:nth-child(${iS}) .v-tooltip { display: none !important; }
${S} td:nth-child(${iS}) .v-chip.red { display: inline-flex !important; vertical-align: middle !important; min-width: 16px !important; width: 16px !important; height: 16px !important; padding: 0 !important; font-size: 9px !important; border-radius: 50% !important; margin-right: 3px !important; }
${S} td:nth-child(${iS}) .v-chip.red .v-chip__content { padding: 0 !important; justify-content: center !important; }
${S} td:nth-child(${iS}) .v-chip:not(.red) { display: inline-flex !important; vertical-align: middle !important; font-size: 11px !important; padding: 0 5px !important; height: 20px !important; letter-spacing: 0 !important; }\n`;
        }
        return css;
    }

    function filtrosCss() {
        if (!on('filtros')) return '';
        const rows = document.querySelectorAll('.v-main .row.row--dense');
        for (const row of rows) {
            const kids = [...row.children];
            const labels = kids.map(d => { const l = d.querySelector('label'); return norm(l ? l.innerText : ''); });
            if (!labels.includes('modalidades') || !labels.includes('situacao')) continue;
            row.setAttribute('data-pp-filtros', '1');
            kids.forEach(d => { const l = d.querySelector('label'); const t = l ? l.innerText.trim() : ''; if (t && !filtrosVistos.includes(t)) filtrosVistos.push(t); });
            const fc = filtrosCfg();
            const S = '.v-main .row.row--dense[data-pp-filtros]';
            let css = `${S} { flex-wrap: nowrap !important; align-items: flex-end !important; }\n`;
            kids.forEach((d, i) => {
                const n = i + 1, lab = labels[i];
                const ehIcones = !lab && d.querySelector('button[title="Pesquisar"]');
                if (ehIcones) { css += `${S} > div:nth-child(${n}) { order: 9999 !important; flex: 0 0 auto !important; max-width: none !important; width: auto !important; display: flex !important; flex-wrap: nowrap !important; align-items: center !important; white-space: nowrap !important; }\n`; return; }
                if (fc.vis.includes(lab)) {
                    const w = FILTRO_WIDTH[lab] || '10%';
                    const ord = fc.ordem.indexOf(lab);
                    css += `${S} > div:nth-child(${n}) { order: ${ord < 0 ? 500 : ord} !important; flex: 1 1 ${w} !important; max-width: ${w} !important; min-width: 0 !important; display: block !important; }\n`;
                } else {
                    css += `${S} > div:nth-child(${n}) { display: none !important; }\n`;
                }
            });
            return css;
        }
        return '';
    }

    function marcarBotaoFormatacao() {
        document.querySelectorAll('.document-editor__toolbar > .v-btn').forEach(b => {
            const alvo = on('editorBotao6') && norm(b.innerText).startsWith('formatacao');
            if (alvo && !b.hasAttribute('data-pp-oculto')) b.setAttribute('data-pp-oculto', '');
            else if (!alvo && b.hasAttribute('data-pp-oculto')) b.removeAttribute('data-pp-oculto');
        });
    }

    // (v1.1) versão dinâmica dos pré-filtros — mantida só como referência, não é mais usada
    function preFiltrosCss() {
        if (!on('preFiltros')) return '';
        const lab = [...document.querySelectorAll('.v-main label')].find(l => norm(l.innerText) === 'pre filtros');
        const slot = lab && lab.closest('.v-input') && lab.closest('.v-input').querySelector('[aria-owns]');
        const id = slot && slot.getAttribute('aria-owns');
        if (!id || !/^[\w-]+$/.test(id)) return '';
        return `.v-menu__content:has(#${id}) { max-height: calc(100vh - 110px) !important; }
#${id} { padding: 2px 0 !important; }
#${id} .v-list-item { min-height: 32px !important; }
#${id} .v-list-item__content { padding: 4px 0 !important; }
#${id} .v-list-item__title { font-size: 13px !important; }
#${id} .v-list-item__action { margin: 0 !important; }
#${id} .v-list-item__action .v-btn { height: 26px !important; width: 26px !important; }\n`;
    }

    // ---- Abreviação de textos (antigo “AM2 - Otimizar textos e colunas” v2.3.3) ----
    const normU = v => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    function transformExamText(value) {
        const original = String(value == null ? '' : value);
        const key = normU(original.replace(/&#(?:x20|32);/gi, ' '));
        if (/^DOPPLER(?: COLORIDO)? DE VASOS CERVICAIS ARTERIAIS BILATERAL CAROTIDAS? E VERTEBRAIS$/.test(key)) return 'DOPPLER CAROTIDA E VERTEBRAIS';
        if (key === 'DOPPLER ARTERIAL DE MEMBRO INFERIOR UNILATERAL') return 'DOPPLER ARTERIAL MI';
        if (key === 'ABDOME SUPERIOR FIGADO VIAS BILIARES VESICULA PANCREAS BACO') return 'ABDOME SUPERIOR';
        if (key === 'DOPPLER VENOSO DE MEMBRO INFERIOR UNILATERAL') return 'DOPPLER VENOSO MI';
        if (/^ABDOM(?:E|EM) INFERIOR FEMININO BEXIGA UTERO OVARIO E ANEXOS$/.test(key)) return 'ABDOME INFERIOR FEMININO';
        if (key === 'ARTICULAR POR ARTICULACAO') return 'ARTICULAR';
        if (key === 'TRANSVAGINAL INCLUI ABDOME INFERIOR FEMININO') return 'TRANSVAGINAL';
        if (key.startsWith('ESTRUTURAS SUPERFICIAIS ')) return 'ESTRUTURAS SUPERFICIAIS';
        if (key.startsWith('ORGAOS SUPERFICIAIS ')) return 'ORGAOS SUPERFICIAIS';
        if (/^APARELHO URINARIO(?: FEMININO| MASCULINO)? RINS URETERES (?:E )?BEXIGA$/.test(key)) return 'APARELHO URINARIO';
        if (/^ABDOM(?:E|EM) INFERIOR MASCULINO BEXIGA PROSTATA E VESICULAS SEMINAIS$/.test(key)) return 'ABDOME INFERIOR MASCULINO';
        return original.replace(/\bTOMOGRAFIA(?:\s+COMPUTADORIZADA)?(?:\s+DE)?(?=\s|$)/i, 'TC').replace(/\bDOPPLER\s+COLORIDO\b/gi, 'DOPPLER').replace(/\s+/g, ' ').trim();
    }
    function transformInsuranceText(value) {
        const original = String(value == null ? '' : value);
        const key = normU(original.replace(/&#(?:x20|32);/gi, ' '));
        const nomes = {
            'UNIMED SUL MINEIRA': 'UNIMED', 'SUL AMERICA SERVICOS DE SAUDE S.A. - DIRETO': 'SUL AMERICA', 'MEDIC GLOBAL SAUDE': 'MEDIC',
            'BRADESCO EMPRESARIAL': 'BRADESCO', 'UNIMED INTERCAMBIO': 'UNIMED', 'SPA SAUDE - SISTEMA DE PROMOCAO ASSISTENCIAL': 'SPA'
        };
        if (Object.prototype.hasOwnProperty.call(nomes, key)) return nomes[key];
        if (key === 'PREFEITURA MUNICIPAL') return 'PMRSRS';
        if (/^SERPRAM(?:\s|-|$)/.test(key)) return 'SERPRAM';
        return original.trim();
    }
    const siglaModalidade = v => { const t = String(v || '').trim(); const i = t.indexOf(' - '); return i > 0 ? t.slice(0, i).trim() : t; };

    // Troca o texto visível mantendo o original no “title” (passar o mouse)
    function transformCell(el, fn) {
        if (!(el instanceof HTMLElement)) return;
        const atual = (el.textContent || '').trim();
        if (!atual) return;
        const novo = fn(atual);
        if (novo === atual) return;
        if (!el.title) el.title = atual;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n, feito = false;
        while ((n = walker.nextNode())) {
            if (!n.nodeValue || !n.nodeValue.trim()) continue;
            if (!feito) { n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, novo); feito = true; } else n.nodeValue = '';
        }
    }

    function abreviarTextos() {
        if (!cfg.master) return;
        if (on('abreviar')) {
            const f = findListTable();
            if (f) {
                const iE = f.names.indexOf('exame'), iC = f.names.indexOf('convenio');
                f.t.querySelectorAll('tbody > tr').forEach(tr => {
                    const c = tr.children;
                    if (iE >= 0 && c[iE]) transformCell(c[iE], transformExamText);
                    if (iC >= 0 && c[iC]) transformCell(c[iC], transformInsuranceText);
                });
            }
            document.querySelectorAll('#datatableExamesHistorico tbody td:first-child .v-list-item__title').forEach(el => transformCell(el, transformExamText));
        }
        if (on('historicoLinha')) {
            document.querySelectorAll('#datatableExamesHistorico tbody td:first-child .v-list-item__subtitle').forEach(el => transformCell(el, siglaModalidade));
        }
    }

    // Campos do diálogo do exame: o PACS só mostra um campo quando ele existe
    // (ex.: sem Técnico, a “Unidade” sobe uma posição). Por isso marcamos pelo rótulo.
    function marcarDadosPaciente() {
        const cols = document.querySelectorAll('.v-dialog__content .v-expansion-panel-content .row > .col');
        cols.forEach(col => {
            const strongs = [...col.querySelectorAll(':scope > strong')];
            if (!strongs.length) return;
            const rot = s => norm((s.innerText || '').split(':')[0]);
            const labels = strongs.map(rot);
            const ehPaciente = labels.some(l => l === 'sexo' || l === 'data nasc' || l === 'prontuario');
            const ehExame = labels.some(l => l === 'solicitante' || l === 'modalidade');
            let mv = 0;
            strongs.forEach((s, i) => {
                const l = labels[i];
                let ocultar = false, mover = null;
                if (on('dadosPaciente') && ehPaciente && (l === 'registro' || l === 'tipo')) ocultar = true;
                if (on('dadosPaciente') && ehExame && (l === 'radiologista' || l === 'unidade')) ocultar = true;
                if (on('moverExecutado') && ehExame && (l === 'executado em' || l === 'ultima alteracao por' || l === 'ultima alteracao em')) mover = String(mv++);
                if (ocultar) { if (!s.hasAttribute('data-pp-oculto')) s.setAttribute('data-pp-oculto', ''); } else if (s.hasAttribute('data-pp-oculto')) s.removeAttribute('data-pp-oculto');
                if (mover !== null) { if (s.getAttribute('data-pp-mv') !== mover) s.setAttribute('data-pp-mv', mover); } else if (s.hasAttribute('data-pp-mv')) s.removeAttribute('data-pp-mv');
            });
        });
    }

    function applyDynamic() {
        try {
            setCss('pp-dyn', cfg.master ? (listCss() + filtrosCss()) : '');
            marcarBotaoFormatacao();
            marcarDadosPaciente();
            abreviarTextos();
        } catch (e) { console.warn('[PACS Plus] ajuste dinâmico falhou', e); }
    }

    function applyAll() { applyStatic(); applyDynamic(); }

    // Reaplica quando a página se redesenha (lista recarregada, diálogo aberto etc.)
    let pend = false;
    const obs = new MutationObserver(muts => {
        if (pend) return;
        // ignora mudanças feitas dentro do próprio painel do PACS Plus
        if (muts.every(m => { const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; return el && el.closest && el.closest('#pp-panel'); })) return;
        pend = true;
        setTimeout(() => { pend = false; applyDynamic(); }, 120);
    });


    // =====================================================================
    // 3B. PRAZO (SLA) EM DIAS ÚTEIS
    // ---------------------------------------------------------------------
    // O PACS calcula o SLA no servidor em HORAS CORRIDAS (cadastro “Prazo
    // (Horas)”): não conhece fim de semana nem feriado. A lista mostra um
    // cronômetro até o campo sla_prazo_final de cada exame.
    // Aqui, só para os exames cujo SLA é o eletivo (ex.: “TC ELETIVO”), o
    // script troca o sla_prazo_final NA TELA pela data correta em dias úteis:
    //   • o dia do exame não conta; a contagem começa no próximo dia útil;
    //   • vence na abertura (hora configurável) do N-ésimo dia útil
    //     (TC = 5, US = 3): TC na segunda → pronto na segunda seguinte.
    // O cronômetro, as cores e a ordenação do próprio PACS passam a usar esse
    // prazo. Nada é gravado no servidor; o SLA de urgência fica intocado.
    // =====================================================================
    const pad2 = n => String(n).padStart(2, '0');
    const chaveDia = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    function pascoa(ano) { // algoritmo de Meeus/Jones/Butcher
        const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4,
            f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
            i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
            mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(ano, mes - 1, dia);
    }
    const FERIADOS_FIXOS = [
        ['01/01', 'Confraternização Universal'], ['21/04', 'Tiradentes'], ['01/05', 'Dia do Trabalho'],
        ['07/09', 'Independência'], ['12/10', 'Nossa Senhora Aparecida'], ['02/11', 'Finados'],
        ['15/11', 'Proclamação da República'], ['20/11', 'Consciência Negra'], ['25/12', 'Natal']
    ];
    // linhas “DD/MM | nome” (todo ano) ou “DD/MM/AAAA | nome” (só naquele ano)
    function parseExtras(txt) {
        return String(txt || '').split('\n').map(l => {
            const m = l.match(/^\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(?:[|\-–—]\s*(.*))?$/);
            return m ? { d: +m[1], m: +m[2], a: m[3] ? +m[3] : null, nome: (m[4] || 'Feriado').trim() } : null;
        }).filter(Boolean);
    }
    const cacheFeriados = {};
    function feriadosDoAno(ano, regras) {
        const k = ano + '|' + JSON.stringify([regras.carnaval, regras.extras]);
        if (cacheFeriados[k]) return cacheFeriados[k];
        const mapa = {};
        const add = (dt, nome) => { mapa[chaveDia(dt)] = nome; };
        FERIADOS_FIXOS.forEach(([dm, nome]) => { const [d, m] = dm.split('/').map(Number); add(new Date(ano, m - 1, d), nome); });
        const p = pascoa(ano), rel = n => new Date(ano, p.getMonth(), p.getDate() + n);
        if (regras.carnaval) { add(rel(-48), 'Carnaval (segunda)'); add(rel(-47), 'Carnaval (terça)'); }
        add(rel(-2), 'Sexta-feira Santa');
        add(rel(60), 'Corpus Christi');
        parseExtras(regras.extras).forEach(x => { if (!x.a || x.a === ano) add(new Date(ano, x.m - 1, x.d), x.nome); });
        return (cacheFeriados[k] = mapa);
    }
    function ehDiaUtil(d, regras) {
        const w = d.getDay();
        return w !== 0 && w !== 6 && !feriadosDoAno(d.getFullYear(), regras)[chaveDia(d)];
    }
    function diasPorModalidade(regras) {
        const m = {};
        String(regras.dias || '').split('\n').forEach(l => { const x = l.match(/^\s*([A-Za-z]{2,3})\s*[=:]\s*(\d{1,2})\s*$/); if (x) m[x[1].toUpperCase()] = +x[2]; });
        return m;
    }
    // dataExame = 'AAAA-MM-DD' (dia da realização) → Date do vencimento
    function prazoDiasUteis(dataExame, nDias, regras) {
        const [y, mo, d] = String(dataExame).slice(0, 10).split('-').map(Number);
        if (!y || !mo || !d || !(nDias > 0)) return null;
        const dia = new Date(y, mo - 1, d);
        for (let c = 0, guarda = 0; c < nDias && guarda < 400; guarda++) {
            dia.setDate(dia.getDate() + 1);
            if (ehDiaUtil(dia, regras)) c++;
        }
        const [h, mi] = String(regras.hora || '07:00').split(':').map(Number);
        dia.setHours(h || 0, mi || 0, 0, 0);
        return dia;
    }

    // Componente Vue da lista (Vue 2 expõe __vue__ no elemento)
    function componenteLista() {
        const t = document.querySelector('.v-main .v-data-table');
        let v = t && t.__vue__;
        for (let i = 0; v && i < 15; i++, v = v.$parent) if (Array.isArray(v.exames) && typeof v.getSla === 'function') return v;
        return null;
    }
    const slaStat = { ajustados: 0, ultimo: null };
    function aplicarSlaUteis() {
        if (!on('slaUteis')) return;
        const comp = componenteLista();
        if (!comp) return;
        const regras = cfg.sla, dias = diasPorModalidade(regras);
        const alvos = String(regras.slas || '').split('\n').map(norm).filter(Boolean);
        let n = 0;
        comp.exames.forEach(ex => {
            const sla = ex && ex.sla;
            if (!sla || !sla.sla_prazo_final || !Array.isArray(sla.slas) || !sla.slas.length) return;
            if (sla.__ppUteis) { n++; return; }
            // só se TODOS os SLAs que o PACS aplicou ao exame forem eletivos da lista (urgência fica intocada)
            if (!sla.slas.every(x => alvos.includes(norm(x && x.sla_descricao)))) return;
            const mod = String(ex.tipoexame && ex.tipoexame.modalidade && ex.tipoexame.modalidade.mod_sigla || '').toUpperCase();
            const nd = dias[mod];
            if (!nd) return;
            const venc = prazoDiasUteis(ex.exa_data, nd, regras);
            if (!venc) return;
            sla.__ppOriginal = sla.sla_prazo_final;
            sla.sla_prazo_final = venc.toISOString();
            sla.__ppUteis = true;
            n++;
        });
        slaStat.ajustados = n;
        slaStat.ultimo = new Date();
    }
    // Prazo próprio do US (v1.7): o PACS não tem SLA de ultrassom. Para US em REVISAR e NÃO urgente,
    // cria em memória um "SLA" já confirmado com vencimento em dias úteis a partir de exa_data.
    // A coluna Prazo nativa exige sla_count_prazo > 0 e sla.ultimoacao_tipo = CONFIRMADO.
    // Nada é enviado ao servidor; a lista recarregada (GET exame) traz objetos novos sem o SLA falso.
    const SLA_PROPRIO_DESC = 'US — prazo próprio (Plus, dias úteis)';
    function aplicarSlaUSProprio() {
        const comp = componenteLista();
        if (!comp) return;
        const regras = cfg.sla, ativo = on('slaUSProprio');
        const nd = diasPorModalidade(regras).US || 3;
        const situacoes = String(regras.usSituacoes || 'REVISAR').split('\n').map(x => x.trim().toUpperCase()).filter(Boolean);
        comp.exames.forEach(ex => {
            if (!ex) return;
            const mod = String(ex.tipoexame && ex.tipoexame.modalidade && ex.tipoexame.modalidade.mod_sigla || '').toUpperCase();
            const proprio = ex.sla && ex.sla.__ppProprio;
            const cabe = ativo && mod === 'US' && !ex.exa_idnurgente && situacoes.includes(String(ex.exa_situacao || '').toUpperCase());
            if (!cabe) {
                if (proprio) { comp.$set(ex, 'sla', ex.__ppSlaOriginal || { slaTempoRestante: null }); comp.$set(ex, 'sla_count_prazo', ex.__ppCountOriginal || 0); }
                return;
            }
            // o PACS devolve sla = { slaTempoRestante: null } para exame SEM SLA; só conta como SLA real se tiver slas[]
            const slaReal = ex.sla && !proprio && Array.isArray(ex.sla.slas) && ex.sla.slas.length > 0;
            if (slaReal) return; // já tem SLA do PACS: não mexe
            if (!proprio) {
                const venc = prazoDiasUteis(ex.exa_data, nd, regras);
                if (!venc) return;
                const total = Math.max(0, Math.round((venc.getTime() - new Date(String(ex.exa_data).slice(0, 10) + 'T00:00:00').getTime()) / 1000));
                ex.__ppCountOriginal = ex.sla_count_prazo || 0;
                ex.__ppSlaOriginal = ex.sla || null;
                comp.$set(ex, 'sla_count_prazo', 1);
                comp.$set(ex, 'sla', { __ppProprio: true, __ppUteis: true, ultimoacao_tipo: 'CONFIRMADO', sla_prazo_final: venc.toISOString(),
                    sla_prazo: total, slas: [{ sla_codigo: 0, sla_descricao: SLA_PROPRIO_DESC, sla_prazo: nd * 24 }], slaTempoRestante: null });
            }
            // o cronômetro nativo só existe se a lista tiver SLA do PACS: atualiza aqui também
            ex.sla.slaTempoRestante = Math.floor((new Date(ex.sla.sla_prazo_final).getTime() - Date.now()) / 1000);
        });
    }
    setInterval(() => { try { aplicarSlaUSProprio(); } catch (e) { console.warn('[PACS Plus] prazo próprio do US falhou', e); } }, 1000);

    setInterval(() => { try { aplicarSlaUteis(); } catch (e) { console.warn('[PACS Plus] prazo em dias úteis falhou', e); } }, 1000);

    // =====================================================================
    // 4. CALCULADORAS
    // =====================================================================
    const CALCS = {
        volume: {
            nome: 'Volume (elipsoide)',
            html: `
<div class="pp-grid3"><label>D1<input data-k="a" inputmode="decimal"></label><label>D2<input data-k="b" inputmode="decimal"></label><label>D3<input data-k="c" inputmode="decimal"></label></div>
<div class="pp-grid2"><label>Unidade<select data-k="u"><option value="cm">cm</option><option value="mm">mm</option></select></label>
<label>Fator<select data-k="f"><option value="0.523">0,523 — elipsoide (tireoide, nódulo, próstata, órgãos)</option><option value="0.52">0,52 — bexiga / resíduo</option><option value="0.71">0,71 — testículo (Lambert)</option></select></label></div>`,
            calc(v) {
                let a = num(v.a), b = num(v.b), c = num(v.c);
                if (![a, b, c].every(Number.isFinite)) return null;
                if (v.u === 'mm') { a /= 10; b /= 10; c /= 10; }
                const f = Number(v.f), vol = a * b * c * f;
                return {
                    html: `<b>${fmt(vol, 1)} cm³</b> <span class="pp-muted">(${fmt(a, 1)} × ${fmt(b, 1)} × ${fmt(c, 1)} cm × ${String(f).replace('.', ',')})</span>`,
                    texto: `volume estimado de ${fmt(vol, 1)} cm³ (${fmt(a, 1)} x ${fmt(b, 1)} x ${fmt(c, 1)} cm)`
                };
            }
        },
        doppler: {
            nome: 'Doppler — IR e IP',
            html: `<div class="pp-grid3"><label>VPS (cm/s)<input data-k="s" inputmode="decimal"></label><label>VDF (cm/s)<input data-k="d" inputmode="decimal"></label><label>Vm/TAMV (opcional)<input data-k="m" inputmode="decimal"></label></div>`,
            calc(v) {
                const s = num(v.s), d = num(v.d), m = num(v.m);
                if (!Number.isFinite(s) || !Number.isFinite(d) || s <= 0) return null;
                const ir = (s - d) / s;
                const ip = Number.isFinite(m) && m > 0 ? (s - d) / m : NaN;
                return {
                    html: `IR <b>${fmt(ir, 2)}</b>${Number.isFinite(ip) ? ` · IP <b>${fmt(ip, 2)}</b>` : ' <span class="pp-muted">(IP precisa da velocidade média)</span>'}`,
                    texto: `IR ${fmt(ir, 2)}${Number.isFinite(ip) ? `, IP ${fmt(ip, 2)}` : ''}`
                };
            }
        },
        carotida: {
            nome: 'Estenose carotídea (SRU 2003)',
            html: `
<div class="pp-grid3"><label>VPS ACI (cm/s)<input data-k="psv" inputmode="decimal"></label><label>VDF ACI (cm/s)<input data-k="edv" inputmode="decimal"></label><label>VPS ACC (cm/s)<input data-k="cca" inputmode="decimal"></label></div>
<label>Placa visível<select data-k="pl"><option value="nao">Não</option><option value="sim">Sim</option></select></label>
<div class="pp-muted">Critério primário: VPS da ACI + placa. Razão e VDF são adicionais. Não se aplica a suboclusão/oclusão.</div>`,
            calc(v) {
                const psv = num(v.psv), edv = num(v.edv), cca = num(v.cca);
                if (!Number.isFinite(psv)) return null;
                let cat;
                if (psv < 125) cat = v.pl === 'sim' ? '<50%' : 'normal';
                else if (psv <= 230) cat = '50–69%';
                else cat = '≥70% (excluída suboclusão)';
                const ratio = Number.isFinite(cca) && cca > 0 ? psv / cca : NaN;
                const catR = !Number.isFinite(ratio) ? null : ratio < 2 ? '<50%' : ratio <= 4 ? '50–69%' : '≥70%';
                const catE = !Number.isFinite(edv) ? null : edv < 40 ? '<50%' : edv <= 100 ? '50–69%' : '≥70%';
                const base = cat.startsWith('≥70') ? '≥70%' : (cat === 'normal' ? '<50%' : cat);
                const conc = [catR, catE].filter(Boolean);
                const disc = conc.some(c => c !== base);
                const extras = [];
                if (Number.isFinite(ratio)) extras.push(`razão ACI/ACC ${fmt(ratio, 1)} (${catR})`);
                if (Number.isFinite(edv)) extras.push(`VDF ${fmt(edv, 0)} cm/s (${catE})`);
                const catTxt = cat === 'normal' ? 'sem estenose significativa' : `estenose ${cat.replace(' (excluída suboclusão)', '')}`;
                return {
                    html: `<b>${cat === 'normal' ? 'Normal' : cat}</b>${extras.length ? `<div class="pp-muted">${extras.join(' · ')}</div>` : ''}${disc ? '<div class="pp-warn">⚠ Parâmetros adicionais discordantes do VPS — avaliar morfologia/fatores hemodinâmicos.</div>' : ''}`,
                    texto: `${catTxt} da ACI pelos critérios do SRU (VPS ${fmt(psv, 0)} cm/s${extras.length ? ', ' + extras.map(e => e.replace(/ \(.*\)$/, '')).join(', ') : ''})`
                };
            }
        },
        tirads: {
            nome: 'TI-RADS (ACR 2017)',
            html: `
<label>Composição<select data-k="comp"><option value="0">Cístico / quase totalmente cístico (0)</option><option value="esp">Espongiforme (0 — TR1)</option><option value="1">Misto sólido-cístico (1)</option><option value="2" selected>Sólido / quase totalmente sólido (2)</option></select></label>
<label>Ecogenicidade<select data-k="eco"><option value="0">Anecoico (0)</option><option value="1">Hiper/isoecoico (1)</option><option value="2" selected>Hipoecoico (2)</option><option value="3">Muito hipoecoico (3)</option></select></label>
<div class="pp-grid2"><label>Forma<select data-k="forma"><option value="0">Mais largo que alto (0)</option><option value="3">Mais alto que largo (3)</option></select></label>
<label>Margens<select data-k="marg"><option value="0">Lisas / mal definidas (0)</option><option value="2">Lobuladas / irregulares (2)</option><option value="3">Extensão extratireoidiana (3)</option></select></label></div>
<div class="pp-checks">Focos ecogênicos:
<label><input type="checkbox" data-k="f1"> Macrocalcificações (1)</label>
<label><input type="checkbox" data-k="f2"> Periféricas/em anel (2)</label>
<label><input type="checkbox" data-k="f3"> Focos puntiformes (3)</label></div>
<label>Maior dimensão (cm)<input data-k="tam" inputmode="decimal"></label>`,
            calc(v) {
                let pts;
                if (v.comp === 'esp') pts = 0;
                else pts = Number(v.comp) + Number(v.eco) + Number(v.forma) + Number(v.marg) + (v.f1 ? 1 : 0) + (v.f2 ? 2 : 0) + (v.f3 ? 3 : 0);
                let tr, rec = '';
                if (pts === 0) tr = 'TR1';
                else if (pts === 1) tr = 'TR1/TR2';
                else if (pts === 2) tr = 'TR2';
                else if (pts === 3) tr = 'TR3';
                else if (pts <= 6) tr = 'TR4';
                else tr = 'TR5';
                const lim = { TR3: [2.5, 1.5], TR4: [1.5, 1.0], TR5: [1.0, 0.5] }[tr];
                const tam = num(v.tam);
                if (!lim) rec = 'Sem PAAF.';
                else if (!Number.isFinite(tam)) rec = `PAAF se ≥ ${fmt(lim[0], 1)} cm; seguimento se ≥ ${fmt(lim[1], 1)} cm.`;
                else if (tam >= lim[0]) rec = `PAAF indicada (≥ ${fmt(lim[0], 1)} cm).`;
                else if (tam >= lim[1]) rec = `Seguimento ultrassonográfico (≥ ${fmt(lim[1], 1)} cm).`;
                else rec = 'Abaixo do limiar de seguimento.';
                const nota = pts === 1 ? '<div class="pp-warn">1 ponto não tem faixa definida no ACR (TR1 = 0, TR2 = 2); ambos sem PAAF.</div>' : '';
                return {
                    html: `<b>ACR ${tr}</b> — ${pts} ponto(s)<div>${rec}</div>${nota}`,
                    texto: `ACR TI-RADS ${tr} (${pts} ponto${pts === 1 ? '' : 's'})`
                };
            }
        },
        adrenal: {
            nome: 'Adrenal — washout (TC)',
            html: `<div class="pp-grid3"><label>Sem contraste (UH)<input data-k="u" inputmode="decimal"></label><label>Portal ~60–75 s (UH)<input data-k="e" inputmode="decimal"></label><label>Tardia 15 min (UH)<input data-k="d" inputmode="decimal"></label></div>`,
            calc(v) {
                const u = num(v.u), e = num(v.e), d = num(v.d);
                const out = [], txt = [];
                if (Number.isFinite(u) && u <= 10) { out.push('Sem contraste ≤ 10 UH: <b>adenoma rico em lipídio</b>.'); txt.push(`atenuação pré-contraste de ${fmt(u, 0)} UH`); }
                if (Number.isFinite(e) && Number.isFinite(d)) {
                    if (Number.isFinite(u) && e - u !== 0) {
                        const apw = (e - d) / (e - u) * 100;
                        out.push(`Washout absoluto <b>${fmt(apw, 0)}%</b> ${apw >= 60 ? '(≥ 60%: compatível com adenoma)' : '(< 60%)'}`);
                        txt.push(`washout absoluto de ${fmt(apw, 0)}%`);
                    }
                    if (e !== 0) {
                        const rpw = (e - d) / e * 100;
                        out.push(`Washout relativo <b>${fmt(rpw, 0)}%</b> ${rpw >= 40 ? '(≥ 40%: compatível com adenoma)' : '(< 40%)'}`);
                        txt.push(`washout relativo de ${fmt(rpw, 0)}%`);
                    }
                }
                if (!out.length) return null;
                return { html: out.join('<br>'), texto: txt.join(', ') };
            }
        },
        esteatose: {
            nome: 'Esteatose (TC sem contraste)',
            html: `<div class="pp-grid2"><label>Fígado (UH)<input data-k="f" inputmode="decimal"></label><label>Baço (UH)<input data-k="b" inputmode="decimal"></label></div>
<div class="pp-muted">Somente fase sem contraste.</div>`,
            calc(v) {
                const f = num(v.f), b = num(v.b);
                if (!Number.isFinite(f)) return null;
                const out = [];
                if (f < 40) out.push('Fígado < 40 UH: sugere esteatose moderada/acentuada.');
                let txt = `densidade hepática de ${fmt(f, 0)} UH`;
                if (Number.isFinite(b)) {
                    const dif = f - b;
                    out.push(`Fígado − baço = <b>${fmt(dif, 0)} UH</b>${dif < -10 ? ' (< −10: sugere esteatose moderada/acentuada)' : dif < 0 ? ' (fígado menos denso que o baço: sugere esteatose)' : ' (sem critério de esteatose)'}`);
                    txt += ` (diferença fígado-baço de ${fmt(dif, 0)} UH)`;
                } else if (f >= 40) out.push('Sem critério absoluto de esteatose moderada/acentuada.');
                return { html: out.join('<br>'), texto: txt };
            }
        }
    };

    // =====================================================================
    // 5. PAINEL (🧰 Plus)
    // =====================================================================
    const PANEL_CSS = `
#pp-btn { position: fixed; top: 10px; left: 236px; z-index: 150; background: #0f766e; color: #fff; border: 1.5px solid #5eead4; border-radius: 7px; padding: 5px 11px; font: 700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.45); }
#pp-btn:hover { background: #115e59; }
html[data-pp-viewer] #pp-btn { top: auto; bottom: 8px; left: 8px; padding: 3px 8px; font-size: 11px; opacity: .8; }
#pp-panel { position: fixed; top: 46px; left: 140px; width: 470px; max-width: 96vw; max-height: 82vh; overflow: auto; z-index: 10000002; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; box-shadow: 0 16px 40px rgba(0,0,0,.6); font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: none; }
#pp-panel.open { display: block; }
#pp-panel * { box-sizing: border-box; }
#pp-panel .pp-tabs { display: flex; gap: 4px; padding: 8px 8px 0; border-bottom: 1px solid #334155; position: sticky; top: 0; background: #0f172a; }
#pp-panel .pp-tab { background: transparent; color: #94a3b8; border: none; border-bottom: 2px solid transparent; padding: 6px 10px; font-weight: 700; font-size: 12px; cursor: pointer; }
#pp-panel .pp-tab.on { color: #fff; border-bottom-color: #14b8a6; }
#pp-panel .pp-close { margin-left: auto; background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; }
#pp-panel .pp-body { padding: 10px 12px 12px; }
#pp-panel input, #pp-panel select, #pp-panel textarea { width: 100%; background: #1e293b; color: #f8fafc; border: 1px solid #475569; border-radius: 5px; padding: 5px 7px; font-size: 13px; margin-top: 2px; }
#pp-panel input[type=checkbox] { width: auto; margin: 0 4px 0 0; }
#pp-panel label { display: block; font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 6px; }
#pp-panel .pp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
#pp-panel .pp-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
#pp-panel .pp-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0; }
#pp-panel .pp-chip { background: #1e293b; color: #e2e8f0; border: 1px solid #475569; border-radius: 14px; padding: 4px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
#pp-panel .pp-chip:hover { background: #134e4a; border-color: #14b8a6; }
#pp-panel .pp-chip.def { border-color: #14b8a6; }
#pp-panel .pp-h { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 10px 0 4px; letter-spacing: .04em; }
#pp-panel .pp-res { background: #1e293b; border: 1px solid #334155; border-radius: 7px; padding: 8px 10px; margin-top: 8px; min-height: 36px; }
#pp-panel .pp-muted { color: #94a3b8; font-size: 11.5px; }
#pp-panel .pp-warn { color: #fbbf24; font-size: 11.5px; margin-top: 3px; }
#pp-panel .pp-checks { font-size: 12px; color: #cbd5e1; margin: 4px 0 8px; }
#pp-panel .pp-checks label { display: inline-flex; align-items: center; margin: 0 10px 0 0; color: #cbd5e1; font-size: 12px; }
#pp-panel .pp-btn { background: #0f766e; color: #fff; border: none; border-radius: 5px; padding: 5px 10px; font-weight: 700; font-size: 12px; cursor: pointer; }
#pp-panel .pp-btn.sec { background: #334155; }
#pp-panel .pp-row { display: flex; gap: 6px; align-items: center; justify-content: space-between; }
#pp-panel .pp-tog { display: flex; align-items: flex-start; gap: 6px; padding: 4px 0; border-bottom: 1px solid #1e293b; color: #e2e8f0; font-size: 12.5px; font-weight: 600; margin: 0; }
#pp-panel .pp-tog small { display: block; color: #94a3b8; font-weight: 400; }
#pp-panel .pp-fil { display: flex; align-items: center; gap: 8px; padding: 4px 6px; margin-bottom: 3px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; cursor: grab; }
#pp-panel .pp-fil.off { opacity: .55; }
#pp-panel .pp-fil.drag { opacity: .4; }
#pp-panel .pp-fil.alvo { border-color: #14b8a6; box-shadow: 0 -2px 0 #14b8a6; }
#pp-panel .pp-fil label { flex: 1; display: flex; align-items: center; margin: 0; color: #e2e8f0; font-size: 12.5px; cursor: pointer; }
#pp-panel .pp-handle { color: #64748b; font-size: 14px; }
#pp-panel .pp-mv button { background: #334155; color: #cbd5e1; border: none; border-radius: 3px; font-size: 9px; padding: 2px 5px; margin-left: 2px; cursor: pointer; }
#pp-panel kbd { background: #334155; border-radius: 3px; padding: 0 4px; font-size: 11px; }`;

    let activeTab = 'busca', activeCalc = 'volume';

    function openUrl(url) { window.open(url, '_blank', 'noopener'); }

    function buildPanel() {
        if (document.getElementById('pp-panel') || !document.body) return;
        setCss('pp-panel-css', PANEL_CSS);
        const btn = document.createElement('button');
        btn.id = 'pp-btn';
        btn.textContent = '🧰 Plus';
        const ver = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || '';
        btn.title = `PACS Plus ${ver ? 'v' + ver + ' — ' : ''}pesquisa, calculadoras e ajustes visuais (Alt+R)`;
        btn.onclick = () => togglePanel();
        document.body.appendChild(btn);
        const p = document.createElement('div');
        p.id = 'pp-panel';
        document.body.appendChild(p);
        renderPanel();
    }

    function togglePanel(force, tab) {
        const p = document.getElementById('pp-panel');
        if (!p) return;
        const abrir = force !== undefined ? force : !p.classList.contains('open');
        if (tab) activeTab = tab;
        p.classList.toggle('open', abrir);
        if (abrir) renderPanel();
    }

    function renderPanel() {
        const p = document.getElementById('pp-panel');
        if (!p) return;
        const tabs = [['busca', '🔎 Pesquisa'], ['calc', '🧮 Calculadoras'], ['filtros', '🧩 Filtros'], ['prazos', '⏱ Prazos'], ['ajustes', '⚙️ Ajustes']];
        p.innerHTML = `<div class="pp-tabs">${tabs.map(([k, n]) => `<button class="pp-tab ${activeTab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}<button class="pp-close" title="Fechar (Esc)">✕</button></div><div class="pp-body"></div>`;
        p.querySelectorAll('.pp-tab').forEach(b => { b.onclick = () => { activeTab = b.dataset.tab; renderPanel(); }; });
        p.querySelector('.pp-close').onclick = () => togglePanel(false);
        const body = p.querySelector('.pp-body');
        if (activeTab === 'busca') renderBusca(body);
        else if (activeTab === 'calc') renderCalc(body);
        else if (activeTab === 'filtros') renderFiltros(body);
        else if (activeTab === 'prazos') renderPrazos(body);
        else renderAjustes(body);
    }

    let ultimaBusca = '';
    function renderBusca(body) {
        const sites = parseList(cfg.sites), links = parseList(cfg.links);
        body.innerHTML = `
<input id="pp-q" placeholder="Termo… (Enter = ${esc(sites[0] ? sites[0].nome : '—')})" value="${esc(ultimaBusca)}" autocomplete="off">
<div class="pp-chips">${sites.map((s, i) => `<button class="pp-chip ${i === 0 ? 'def' : ''}" data-i="${i}">${esc(s.nome)}</button>`).join('')}</div>
<div class="pp-muted">Dica: selecione um termo no laudo e aperte <kbd>Alt</kbd>+<kbd>R</kbd>.</div>
${links.length ? `<div class="pp-h">Links rápidos</div><div class="pp-chips">${links.map((l, i) => `<button class="pp-chip" data-l="${i}">${esc(l.nome)}</button>`).join('')}</div>` : ''}`;
        const q = body.querySelector('#pp-q');
        const go = i => { const t = q.value.trim(); if (!t || !sites[i]) return; ultimaBusca = t; openUrl(sites[i].url.replace('%s', encodeURIComponent(t))); };
        q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(0); } });
        q.addEventListener('input', () => { ultimaBusca = q.value; });
        body.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => go(Number(b.dataset.i)); });
        body.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => openUrl(links[Number(b.dataset.l)].url); });
        setTimeout(() => { q.focus(); q.select(); }, 30);
    }

    function renderCalc(body) {
        body.innerHTML = `
<label>Calculadora<select id="pp-calc-sel">${Object.entries(CALCS).map(([k, c]) => `<option value="${k}" ${k === activeCalc ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
<div id="pp-calc-form">${CALCS[activeCalc].html}</div>
<div class="pp-res" id="pp-calc-res"><span class="pp-muted">Preencha os campos.</span></div>
<div class="pp-row" style="margin-top:8px;"><span class="pp-muted" id="pp-calc-txt"></span><button class="pp-btn" id="pp-calc-copy">📋 Copiar para o laudo</button></div>`;
        body.querySelector('#pp-calc-sel').onchange = e => { activeCalc = e.target.value; renderCalc(body); };
        const form = body.querySelector('#pp-calc-form');
        let ultimo = null;
        const run = () => {
            const v = {};
            form.querySelectorAll('[data-k]').forEach(el => { v[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; });
            let r = null;
            try { r = CALCS[activeCalc].calc(v); } catch (e) { r = null; }
            ultimo = r;
            body.querySelector('#pp-calc-res').innerHTML = r ? r.html : '<span class="pp-muted">Preencha os campos.</span>';
            body.querySelector('#pp-calc-txt').textContent = r ? `“${r.texto}”` : '';
        };
        form.addEventListener('input', run);
        form.addEventListener('change', run);
        body.querySelector('#pp-calc-copy').onclick = async () => {
            if (!ultimo) return;
            const b = body.querySelector('#pp-calc-copy');
            try { await navigator.clipboard.writeText(ultimo.texto); b.textContent = '✓ Copiado'; } catch (e) { b.textContent = 'Falhou — selecione e copie'; }
            setTimeout(() => { b.textContent = '📋 Copiar para o laudo'; }, 1500);
        };
        run();
        const first = form.querySelector('input'); if (first) setTimeout(() => first.focus(), 30);
    }

    // Ordem e visibilidade da barra de filtros (arrastar e soltar)
    function renderFiltros(body) {
        const fc = filtrosCfg();
        const nomeDe = k => fc.nomes.find(n => norm(n) === k) || k;
        const validos = new Set(fc.nomes.map(norm));
        const ordem = fc.ordem.filter(k => validos.has(k));
        body.innerHTML = `
<div class="pp-muted" style="margin-bottom:6px;">Arraste <b>☰</b> para mudar a ordem (ou use ▲▼). Marque o que deve aparecer na barra. Vale na hora.${on('filtros') ? '' : '<div class="pp-warn">O ajuste “Barra de filtros” está desligado em ⚙️ Ajustes.</div>'}</div>
<div id="pp-fil-list">${ordem.map((k, i) => `
<div class="pp-fil ${fc.vis.includes(k) ? '' : 'off'}" draggable="true" data-f="${esc(k)}">
<span class="pp-handle" title="Arrastar">☰</span>
<label><input type="checkbox" data-fv="${esc(k)}" ${fc.vis.includes(k) ? 'checked' : ''}> ${esc(nomeDe(k))}</label>
<span class="pp-mv"><button data-up="${i}" title="Subir">▲</button><button data-dn="${i}" title="Descer">▼</button></span>
</div>`).join('')}</div>
<div class="pp-row" style="margin-top:8px;"><span class="pp-muted">${fc.vis.length} filtro(s) visível(is)</span><button class="pp-btn sec" id="pp-fil-reset">Restaurar padrão</button></div>`;
        const salvar = (novaOrdem, vis) => { cfg.filtros = { ordem: novaOrdem, vis }; saveCfg(); applyDynamic(); renderFiltros(body); };
        body.querySelectorAll('[data-fv]').forEach(cb => { cb.onchange = () => {
            const k = cb.dataset.fv, vis = fc.vis.filter(x => x !== k);
            if (cb.checked) vis.push(k);
            salvar(fc.ordem, vis);
        }; });
        const mover = (de, para) => { if (para < 0 || para >= ordem.length) return; const o = ordem.slice(); const [x] = o.splice(de, 1); o.splice(para, 0, x); salvar(o.concat(fc.ordem.filter(k => !validos.has(k))), fc.vis); };
        body.querySelectorAll('[data-up]').forEach(b => { b.onclick = () => mover(+b.dataset.up, +b.dataset.up - 1); });
        body.querySelectorAll('[data-dn]').forEach(b => { b.onclick = () => mover(+b.dataset.dn, +b.dataset.dn + 1); });
        let arrastando = null;
        body.querySelectorAll('.pp-fil').forEach(el => {
            el.addEventListener('dragstart', e => { arrastando = el.dataset.f; el.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', arrastando); } catch (x) { /* ok */ } });
            el.addEventListener('dragend', () => { el.classList.remove('drag'); body.querySelectorAll('.pp-fil').forEach(x => x.classList.remove('alvo')); });
            el.addEventListener('dragover', e => { e.preventDefault(); body.querySelectorAll('.pp-fil').forEach(x => x.classList.remove('alvo')); el.classList.add('alvo'); });
            el.addEventListener('drop', e => {
                e.preventDefault();
                const de = ordem.indexOf(arrastando), alvo = ordem.indexOf(el.dataset.f);
                if (de < 0 || alvo < 0 || de === alvo) return;
                mover(de, alvo);
            });
        });
        body.querySelector('#pp-fil-reset').onclick = () => { delete cfg.filtros; saveCfg(); applyDynamic(); renderFiltros(body); };
    }

    // Aba ⏱ Prazos: regras + simulador + feriados do ano
    const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const fmtDia = d => `${DIAS_SEM[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    function renderPrazos(body) {
        const r = cfg.sla;
        const hoje = chaveDia(new Date());
        body.innerHTML = `
${on('slaUteis') ? '' : '<div class="pp-warn">O ajuste “Prazo (SLA) do TC eletivo em dias úteis” está desligado em ⚙️ Ajustes.</div>'}
<div class="pp-muted">O dia do exame não conta. Vence na abertura do N-ésimo dia útil seguinte. Fim de semana e feriados não contam.
${slaStat.ultimo ? `Exames recalculados na lista agora: <b>${slaStat.ajustados}</b>.` : ''}</div>
<div class="pp-h">SLAs do PACS a recalcular (descrição, um por linha)</div>
<textarea id="pp-sla-slas" rows="2">${esc(r.slas)}</textarea>
<div class="pp-muted">Exame com SLA de urgência nunca é alterado.</div>
<div class="pp-grid2">
<label>Dias úteis por modalidade<textarea id="pp-sla-dias" rows="2">${esc(r.dias)}</textarea></label>
<label>Pronto até (hora do dia final)<input id="pp-sla-hora" value="${esc(r.hora)}" placeholder="07:00"></label></div>
<label class="pp-tog"><input type="checkbox" id="pp-sla-carnaval" ${r.carnaval ? 'checked' : ''}><span>Carnaval (segunda e terça) sem expediente</span></label>
<div class="pp-h">Feriados municipais / extras — “DD/MM | nome” (todo ano) ou “DD/MM/AAAA | nome”</div>
<textarea id="pp-sla-extras" rows="3">${esc(r.extras)}</textarea>
<div class="pp-row" style="margin-top:6px;"><button class="pp-btn sec" id="pp-sla-reset">Restaurar padrão</button><button class="pp-btn" id="pp-sla-save">Salvar regras</button></div>
<div class="pp-h">Simular</div>
<div class="pp-grid2"><label>Data do exame<input type="date" id="pp-sim-data" value="${hoje}"></label>
<label>Modalidade<select id="pp-sim-mod">${Object.keys(diasPorModalidade(r)).map(m => `<option>${esc(m)}</option>`).join('')}</select></label></div>
<div class="pp-res" id="pp-sim-res"></div>
<div class="pp-h">Feriados considerados em ${new Date().getFullYear()}</div>
<div class="pp-muted" id="pp-sla-fer"></div>`;
        const sim = () => {
            const d = body.querySelector('#pp-sim-data').value, m = body.querySelector('#pp-sim-mod').value;
            const n = diasPorModalidade(cfg.sla)[m];
            const v = d && n ? prazoDiasUteis(d, n, cfg.sla) : null;
            body.querySelector('#pp-sim-res').innerHTML = v ? `Laudo pronto até <b>${fmtDia(v)} às ${pad2(v.getHours())}:${pad2(v.getMinutes())}</b> <span class="pp-muted">(${n} dias úteis)</span>` : '<span class="pp-muted">Escolha a data.</span>';
        };
        const listarFer = () => {
            const ano = new Date().getFullYear(), f = feriadosDoAno(ano, cfg.sla);
            body.querySelector('#pp-sla-fer').innerHTML = Object.keys(f).sort().map(k => { const [y, m, d] = k.split('-').map(Number); return `${fmtDia(new Date(y, m - 1, d))} — ${esc(f[k])}`; }).join('<br>');
        };
        body.querySelector('#pp-sim-data').onchange = sim;
        body.querySelector('#pp-sim-mod').onchange = sim;
        body.querySelector('#pp-sla-save').onclick = () => {
            const hora = body.querySelector('#pp-sla-hora').value.trim();
            cfg.sla = {
                slas: body.querySelector('#pp-sla-slas').value,
                dias: body.querySelector('#pp-sla-dias').value,
                hora: /^\d{1,2}:\d{2}$/.test(hora) ? hora : SLA_PADRAO.hora,
                carnaval: body.querySelector('#pp-sla-carnaval').checked,
                extras: body.querySelector('#pp-sla-extras').value
            };
            saveCfg();
            recalcularLista();
            renderPrazos(body);
        };
        body.querySelector('#pp-sla-reset').onclick = () => { cfg.sla = Object.assign({}, SLA_PADRAO); saveCfg(); recalcularLista(); renderPrazos(body); };
        sim(); listarFer();
    }
    // Regras mudaram: devolve o prazo original do PACS e recalcula
    function recalcularLista() {
        const comp = componenteLista();
        if (comp) comp.exames.forEach(ex => { const s = ex && ex.sla; if (s && s.__ppUteis) { s.sla_prazo_final = s.__ppOriginal; delete s.__ppUteis; } });
        aplicarSlaUteis();
    }

    function renderAjustes(body) {
        body.innerHTML = `
<div class="pp-row"><label class="pp-tog" style="border:none;"><input type="checkbox" id="pp-master" ${cfg.master ? 'checked' : ''}> Ajustes visuais ligados <small>Desligue para ver o PACS original (diagnóstico rápido).</small></label></div>
<label style="margin-top:6px;">Densidade da tela<select id="pp-dens">
<option value="auto" ${cfg.densidade === 'auto' ? 'selected' : ''}>Automática — compacta quando a janela tiver menos de ${LARGURA_COMPACTA}px (agora: ${densidadeAtual()})</option>
<option value="normal" ${cfg.densidade === 'normal' ? 'selected' : ''}>Normal (fonte 13 px — tela cheia)</option>
<option value="compacta" ${cfg.densidade === 'compacta' ? 'selected' : ''}>Compacta (fonte 11 px — meia tela)</option></select></label>
<div class="pp-h">Ajustes (cada um liga/desliga na hora)</div>
${BLOCKS.map(([k, n, d]) => `<label class="pp-tog"><input type="checkbox" data-b="${k}" ${cfg.blocks[k] ? 'checked' : ''} ${cfg.master ? '' : 'disabled'}><span>${esc(n)}${d ? `<small>${esc(d)}</small>` : ''}</span></label>`).join('')}
<div class="pp-h">Sites de pesquisa — “Nome | URL com %s”</div>
<textarea id="pp-sites" rows="5">${esc(cfg.sites)}</textarea>
<div class="pp-h">Links rápidos — “Nome | URL”</div>
<textarea id="pp-links" rows="4">${esc(cfg.links)}</textarea>
<div class="pp-row" style="margin-top:8px;"><button class="pp-btn sec" id="pp-reset">Restaurar padrão</button><button class="pp-btn" id="pp-save">Salvar listas</button></div>
<div class="pp-muted" style="margin-top:8px;">As configurações ficam salvas neste computador.</div>`;
        body.querySelector('#pp-master').onchange = e => { cfg.master = e.target.checked; saveCfg(); applyAll(); renderPanel(); };
        body.querySelector('#pp-dens').onchange = e => { cfg.densidade = e.target.value; saveCfg(); applyAll(); renderPanel(); };
        body.querySelectorAll('[data-b]').forEach(cb => { cb.onchange = () => { cfg.blocks[cb.dataset.b] = cb.checked; saveCfg(); applyAll(); if (cb.dataset.b === 'slaUteis') recalcularLista(); }; });
        body.querySelector('#pp-save').onclick = () => { cfg.sites = body.querySelector('#pp-sites').value; cfg.links = body.querySelector('#pp-links').value; saveCfg(); const b = body.querySelector('#pp-save'); b.textContent = '✓ Salvo'; setTimeout(() => { b.textContent = 'Salvar listas'; }, 1200); };
        body.querySelector('#pp-reset').onclick = () => { if (!confirm('Restaurar todos os ajustes e listas para o padrão?')) return; localStorage.removeItem(CFG_KEY); cfg = loadCfg(); applyAll(); renderPanel(); };
    }

    // =====================================================================
    // 6. ATALHOS
    // =====================================================================
    window.addEventListener('keydown', e => {
        // Alt+R (Option+R no Mac): pesquisa com o texto selecionado
        if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR') {
            e.preventDefault();
            const sel = String(window.getSelection ? window.getSelection() : '').trim();
            if (sel && sel.length <= 120) ultimaBusca = sel;
            activeTab = 'busca';
            togglePanel(true);
            return;
        }
        if (e.key === 'Escape') {
            const p = document.getElementById('pp-panel');
            if (p && p.classList.contains('open')) { p.classList.remove('open'); e.stopPropagation(); }
        }
    }, true);

    document.addEventListener('mousedown', e => {
        const p = document.getElementById('pp-panel');
        if (!p || !p.classList.contains('open')) return;
        if (e.target.closest('#pp-panel') || e.target.closest('#pp-btn')) return;
        p.classList.remove('open');
    }, true);

    // =====================================================================
    // 6B. VISUALIZADOR (OHIF) — recolhe o painel de séries automaticamente
    // ---------------------------------------------------------------------
    // Faz UM clique no botão “Series” por exame aberto. Se você reabrir o
    // painel na mão, o script não fecha de novo naquele exame.
    // =====================================================================
    const ehViewer = () => location.pathname.startsWith('/viewer');
    let viewerFeito = null; // UID do estudo já tratado
    let viewerVisto = { uid: null, t: 0, n: -1 }; // quando a imagem ficou pronta / nº de séries estável
    const VIEWER_ESPERA_MS = 1500; // dá tempo a outros scripts/preferências agirem primeiro (evita clique duplo)
    function modalidadeViewer() {
        try {
            const cs = window.cornerstone;
            const el = document.querySelector('.viewport-element');
            if (!cs || !el) return null;
            const img = cs.getImage(el);
            const m = img && cs.metaData.get('generalSeriesModule', img.imageId);
            return m && m.modality ? String(m.modality).toUpperCase() : null;
        } catch (e) { return null; }
    }
    function checarViewer() {
        if (!ehViewer() || !cfg.master) return;
        if (!on('viewerRecolherUS') && !on('viewerRecolherTodos') && !on('viewerRecolherSerieUnica')) return;
        const uid = location.pathname.split('/').pop();
        if (viewerFeito === uid) return;
        const painel = document.querySelector('.sidepanel.from-left');
        const botao = document.querySelector('.ToolbarRow .pull-left .roundedButtonWrapper');
        if (!painel || !botao) return;
        const mod = modalidadeViewer();
        if (!mod) return; // imagem ainda carregando: tenta de novo no próximo ciclo
        const nSeries = Math.max(document.querySelectorAll('.series-details').length, document.querySelectorAll('.study-browser .thumbnail-container').length);
        // espera o nº de séries ficar estável por 1,5 s (as miniaturas carregam aos poucos)
        if (viewerVisto.uid !== uid || viewerVisto.n !== nSeries) { viewerVisto = { uid, t: Date.now(), n: nSeries }; return; }
        if (Date.now() - viewerVisto.t < VIEWER_ESPERA_MS) return;
        viewerFeito = uid;
        const recolher = on('viewerRecolherTodos') || (on('viewerRecolherUS') && mod === 'US') || (on('viewerRecolherSerieUnica') && nSeries === 1);
        if (recolher && painel.classList.contains('is-open')) (botao.querySelector('.roundedButton') || botao).click();
    }
    setInterval(checarViewer, 700);

    // =====================================================================
    // 7. INÍCIO
    // =====================================================================
    function start() {
        if (!document.body) { setTimeout(start, 200); return; }
        setInterval(() => { const v = ehViewer(); if (v !== document.documentElement.hasAttribute('data-pp-viewer')) document.documentElement.toggleAttribute('data-pp-viewer', v); }, 1000);
        if (ehViewer()) document.documentElement.setAttribute('data-pp-viewer', '');
        applyAll();
        buildPanel();
        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        setInterval(() => { if (!document.getElementById('pp-btn')) { const p = document.getElementById('pp-panel'); if (p) p.remove(); buildPanel(); } }, 2000);
    }
    start();
})();
