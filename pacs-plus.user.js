// ==UserScript==
// @name         PACS LADI - Plus (visual, pesquisa e calculadoras)
// @namespace    http://tampermonkey.net/
// @version      1.32.1
// @description  Substitui o Stylus, o “AM2 - Otimizar textos e colunas” e o “AM2 - Recolher painel de série única” por ajustes liga/desliga que localizam colunas e campos pelo NOME (não pela posição), + pesquisa rápida (Radiopaedia, e-Anatomy, Radiology Assistant…), links rápidos, calculadoras radiológicas, monitor de TC urgente e aviso de chegada do 1º paciente de US (ntfy).
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
        ['historicoAcoes', 'Histórico: anexos, comentários e anamnese', 'Em cada exame anterior aparecem 📎 Anexos (só leitura), 💬 Comentários e 📄 Anamnese, com as mesmas cores da lista principal'],
        ['barraUnica', 'Barra única no topo', 'Agenda, Plus e Anamnese TC lado a lado na barra do PACS (sem cobrir o logo nem uns aos outros) + avisos: nuvem da Agenda e TC urgente'],
        ['temaGrafite', 'Tema grafite no laudo', 'Moldura e barra do editor em cinza-escuro, coerentes com o tema escuro do PACS. O “papel” (normal / suave / escuro) troca no botão ◐ da barra única ou em ⚙️ Ajustes. Só a tela: a impressão não muda'],
        ['laudoBotoes', 'Laudo: linha de botões enxuta', 'Oculta Gravar áudio, Ass. Única/Dupla e os botões Assinar, Analisar e Pré-Laudo; alinha Padrão, Anexos, Visualizar, Imprimir e Resultado crítico numa linha só'],
        ['revisaoIA', 'Laudo: 🛡 Revisar (regras + IA)', 'Botão na barra do editor: regras fixas + Jev (checklist com probabilidade) + Claude Opus 5.5 (ou Sonnet) + Gemini 4 Argon, procuram incompatibilidades (lado, sexo, corpo × conclusão, medidas/unidades, contraste, padrão do serviço…). ✍ Corrigir propõe antes → depois (conta: o Plus; frase/lado: Sonnet; diagnóstico: Opus) e só altera ao clicar Aplicar. Usa o login da Agenda'],
        ['rodapeCompacto', 'Rodapé da lista compacto', 'Linha “Linhas por página / 1-50 de …” com 30 px de altura (antes ~60 px)'],
        ['zoomPdf', 'Laudo impresso (PDF) já abre com zoom', 'Ao clicar em Imprimir, a aba do PDF abre no zoom escolhido em ⚙️ Ajustes (padrão 110%) em vez de 100%. Só a visualização: o papel impresso não muda'],
        ['zoomLaudo', 'Laudo: zoom só da folha (A− 120% A+)', 'Controle na barra do editor: aumenta ou diminui só o texto da folha do laudo (90–160%), salvo neste computador. Só a tela: a impressão não muda'],
        ['calcLaudo', 'Calculadoras na tela do laudo', 'Botão 🧮 na barra do editor: abre as calculadoras ao lado do laudo, com “Inserir no laudo” (vai para onde está o cursor)'],
        ['buscaCompacta', 'Buscar Matriz / Buscar Frase compactos', 'Janela baixa e lista com um item por linha (sigla + descrição), ocupando a altura da tela: rolagem só se não couber'],
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
        ['tcSoMeus', 'TC: prazo só nos exames seus', 'Relógio/cronômetro do TC só em REVISAR com “Necessita de laudo”, ou urgente com ficha dentro da sua escala (aba 🚨 Urgências). O resto (telelaudo) fica sem prazo'],
        ['slaTCProprio', 'TC seu ainda sem confirmação: prazo próprio', 'TC eletivo em REVISAR que o PACS mostra “aguardando confirmação” ganha prazo de 5 dias úteis a partir da data do exame'],
        ['slaUSProprio', 'Prazo próprio do ultrassom (sem SLA no PACS)', 'US marcado como REVISAR e não urgente ganha prazo de 3 dias úteis a partir da data do exame (vence 07:00), sem precisar confirmar. Só aparece nos computadores com o Plus'],
        ['slaUteis', 'Prazo (SLA) eletivo (TC e US) em dias úteis', 'Recalcula o cronômetro da coluna Prazo pelos dias úteis (sem fim de semana e feriados de Santa Rita). O SLA de urgência não é alterado. Regras na aba ⏱ Prazos'],
    ];

    // v1.18 — botões da barra do CKEditor ocultados (início do nome que aparece ao passar o mouse; um por linha)
    const CK_OCULTAR_PADRAO = 'Titulo\nSelecionar tudo\nLinha horizontal'; // 1.18.1: Quebra de página voltou (o usuário usa)
    const DEFAULT_OFF = ['ocultarRelatorios', 'ocultarSelecao', 'viewerRecolherTodos']; // começam desligados
    const LARGURA_COMPACTA = 1400; // modo automático: janela mais estreita que isto => compacto (ex.: meia tela)

    // Regras do prazo em dias úteis (aba ⏱ Prazos)
    const SLA_PADRAO = {
        slas: 'TC ELETIVO\nUS ELETIVO',     // descrição do(s) SLA(s) do PACS a recalcular (um por linha); urgência fica de fora
        dias: 'CT = 5\nUS = 3',             // dias úteis por modalidade (sigla do PACS)
        hora: '07:00',                      // o laudo tem que estar pronto na abertura do dia útil final
        carnaval: true,                     // segunda e terça de Carnaval sem expediente
        extras: '24/05 | Aniversário de Santa Rita do Sapucaí',
        usSituacoes: 'REVISAR',             // prazo próprio do US: situações que contam (uma por linha)
        tcSituacoes: 'REVISAR'              // TC “seu” (prazo aparece): situações que contam
    };

    // Monitor de TC urgente (aba 🚨 Urgências) — cada computador tem a sua configuração
    const URG_PADRAO = {
        tela: false,                 // cartão + som + notificação do sistema neste computador
        celular: false,              // este computador envia ao celular (pode ligar em mais de um: só o "líder" envia; os outros ficam de reserva — v1.17)
        nomePc: '',                  // nome deste computador nos avisos (vazio = Mac/Windows)
        teste: false,                // modo teste: só pacientes TESTE, ignora escala e data
        dias: '1,2,3,4,5',           // 0 = dom … 6 = sáb
        inicio: '07:00', fim: '17:00',
        modalidades: 'CT',
        lembretes: '60,30,15',       // minutos antes do prazo
        repetirVencido: 15, repetirVezes: 4,
        horas: 2,                    // prazo da urgência (teto, e base do prazo provisório)
        semConfirmacao: 15,          // avisa se o urgente não for confirmado em X min (repete 1x — v1.23)
        provisorio: false,           // v1.21: false = cronômetro só começa na confirmação dos técnicos; true = prazo provisório desde a marcação (antigo)
        encerra: 'LIBERADO',         // situações que encerram o acompanhamento
        som: true, notifWindows: true,
        ntfyServidor: 'https://ntfy.sh', ntfyTopico: '',
        tgToken: '', tgChat: '',
        poUser: '', poToken: '', poEmergencia: true,
        pausaAte: '',                // AAAA-MM-DD
        testeAte: 0                  // fim do modo teste (ms)
    };

    // Monitor de chegada do 1º paciente de US (aba 🩺 Chegada) — cada computador tem a sua configuração
    const CHEG_PADRAO = {
        ligado: false,               // este computador vigia (ligar em UM só: o de casa)
        tela: true,                  // notificação do sistema neste computador (nome completo)
        avisarNenhum: true,          // avisa se a janela terminar sem ficha
        dias: '1,2,3,4,5',
        janelas: '07:45-08:15\n12:45-13:15',
        corteTarde: '12:00',         // ficha antes = manhã; a partir = tarde
        modalidades: 'US',
        ntfyServidor: 'https://ntfy.sh', ntfyTopico: '',
        pausaAte: ''
    };

    function loadCfg() {
        let c = {};
        try { c = JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { c = {}; }
        c.blocks = c.blocks || {};
        BLOCKS.forEach(([k]) => { if (c.blocks[k] === undefined) c.blocks[k] = !DEFAULT_OFF.includes(k); });
        if (!['auto', 'normal', 'compacta'].includes(c.densidade)) c.densidade = 'auto';
        if (!['normal', 'suave', 'escuro'].includes(c.papel)) c.papel = 'suave';
        if (!['100', '110', '125', '150', 'largura', 'pagina'].includes(String(c.zoomPdf))) c.zoomPdf = '110';
        c.zoomLaudo = Math.min(160, Math.max(90, Math.round((Number(c.zoomLaudo) || 100) / 10) * 10));
        if (c.master === undefined) c.master = true;
        if (!c.sites) c.sites = DEFAULT_SITES;
        if (!c.links) c.links = DEFAULT_LINKS;
        // v1.18: ocultar linhas da lista sem mexer no filtro do PACS; botões do CKEditor que não usa
        c.ocultarLista = Object.assign({ lib: false, mods: [] }, c.ocultarLista || {});
        if (!Array.isArray(c.ocultarLista.mods)) c.ocultarLista.mods = [];
        if (typeof c.ckOcultar !== 'string') c.ckOcultar = CK_OCULTAR_PADRAO;
        if (!c.ckMig1181) { c.ckOcultar = c.ckOcultar.split('\n').filter(x => x.trim() !== 'Quebra de página').join('\n'); c.ckMig1181 = true; }
        c.sla = Object.assign({}, SLA_PADRAO, c.sla || {});
        c.urg = Object.assign({}, URG_PADRAO, c.urg || {});
        c.cheg = Object.assign({}, CHEG_PADRAO, c.cheg || {});
        // v1.6.1: inclui o SLA eletivo do ultrassom em configurações já salvas (uma única vez)
        if (!c.slaMigUS) {
            const linhas = String(c.sla.slas || '').split('\n').map(l => l.trim().toUpperCase().replace(/\s+/g, ' ')).filter(Boolean);
            if (!linhas.includes('US ELETIVO')) c.sla.slas = (String(c.sla.slas || '').trim() + '\nUS ELETIVO').trim();
            c.slaMigUS = true;
        }
        return c;
    }
    let cfg = loadCfg();
    // v1.9.1: gravação por mesclagem — cada aba grava só o que ELA mudou desde a última leitura,
    // sobre a versão mais recente salva. Evita que outra aba do PACS (aberta com ajustes antigos)
    // regrave por cima, por ex. desligando "Enviar avisos ao celular".
    const clone = o => JSON.parse(JSON.stringify(o));
    let cfgBase = clone(cfg);
    function recarregarCfg() { cfg = loadCfg(); cfgBase = clone(cfg); return cfg; }
    function saveCfg() {
        try {
            const atual = loadCfg();
            Object.keys(cfg).forEach(k => { if (JSON.stringify(cfg[k]) !== JSON.stringify(cfgBase[k])) atual[k] = cfg[k]; });
            cfg = atual;
            localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
            cfgBase = clone(cfg);
        } catch (e) { /* sem armazenamento */ }
    }
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
        temaGrafite: `
html { --pp-g-bg:#1b1d21; --pp-g-bg2:#23262b; --pp-g-bg3:#2c3036; --pp-g-line:#3a3f46; --pp-g-tx:#e3e6ea; }
.document-editor__editable-container { background: var(--pp-g-bg) !important; }
.document-editor__toolbar { background: var(--pp-g-bg2) !important; border-bottom: 1px solid var(--pp-g-line) !important; }
.document-editor__toolbar > .v-btn { color: var(--pp-g-tx) !important; }
.document-editor .ck.ck-toolbar { background: var(--pp-g-bg2) !important; border-color: var(--pp-g-line) !important; }
.document-editor .ck.ck-button, .document-editor a.ck.ck-button { color: var(--pp-g-tx) !important; }
.document-editor .ck.ck-button:not(.ck-disabled):hover { background: var(--pp-g-bg3) !important; }
.document-editor .ck.ck-button.ck-on { background: #34404e !important; color: #9cc7f0 !important; }
.document-editor .ck.ck-toolbar__separator { background: var(--pp-g-line) !important; }
.document-editor .ck.ck-dropdown__panel, .document-editor .ck.ck-list { background: var(--pp-g-bg2) !important; border-color: var(--pp-g-line) !important; }
.document-editor .ck.ck-list__item .ck-button:hover:not(.ck-disabled) { background: var(--pp-g-bg3) !important; }
html[data-pp-papel="suave"] .ck.ck-content.ck-editor__editable { background: #e9e8e4 !important; color: #16181b !important; border-color: #4a5058 !important; box-shadow: 0 0 0 1px #000, 0 6px 24px rgba(0,0,0,.5) !important; }
html[data-pp-papel="escuro"] .ck.ck-content.ck-editor__editable { filter: invert(.9) hue-rotate(180deg); background: #fff !important; border-color: transparent !important; box-shadow: 0 0 0 1px #555 !important; }`,
        barraUnica: `
#pp-dock { position: fixed; top: 0; left: 204px; height: 36px; z-index: 150; display: flex; align-items: center; gap: 6px; font: 600 12px -apple-system,"Segoe UI",Roboto,sans-serif; pointer-events: none; }
html[data-pp-viewer] #pp-dock { display: none !important; }
#pp-dock > * { pointer-events: auto; }
#pp-dock .ppd-sep { width: 1px; height: 18px; background: #4a5058; margin: 0 2px; }
#pp-dock > #btn-agenda-flutuante, #pp-dock > #pp-btn, #pp-dock > #ge-btn, #pp-dock > #hamctc-top {
  position: static !important; inset: auto !important; transform: none !important; margin: 0 !important; opacity: 1 !important;
  height: 26px !important; padding: 0 10px !important; border-radius: 6px !important; box-shadow: none !important;
  font: 600 12px -apple-system,"Segoe UI",Roboto,sans-serif !important; line-height: 24px !important; display: inline-flex !important; align-items: center; gap: 5px;
  background: #2c3036 !important; color: #e3e6ea !important; border: 1px solid #3a3f46 !important; border-bottom-width: 2px !important; cursor: pointer; white-space: nowrap; }
#pp-dock > #btn-agenda-flutuante { border-bottom-color: #3b82f6 !important; }
#pp-dock > #pp-btn { border-bottom-color: #14b8a6 !important; }
#pp-dock > #hamctc-top { border-bottom-color: #7cc4c9 !important; }
#pp-dock > #ge-btn { border-bottom-color: #8b5cf6 !important; }
#pp-dock > button:hover { background: #363b42 !important; }
#pp-dock .ppd-chip { height: 22px; padding: 0 8px; border-radius: 11px; display: inline-flex; align-items: center; gap: 4px; background: #23262b; border: 1px solid #3a3f46; color: #a9b0b8; font-weight: 600; font-size: 11px; cursor: default; white-space: nowrap; }
#pp-dock .ppd-chip[hidden] { display: none; }
#pp-dock .ppd-chip.ok { color: #34d399; } #pp-dock .ppd-chip.warn { color: #fbbf24; } #pp-dock .ppd-chip.err { color: #f87171; border-color: #7f1d1d; }
#pp-dock .ppd-chip.urg { color: #fff; background: #b91c1c; border-color: #ef4444; cursor: pointer; }
#pp-dock .ppd-chip.urg.azul { background: #1d4ed8; border-color: #3b82f6; } #pp-dock .ppd-chip.urg.laranja { background: #c2410c; border-color: #f97316; }
#pp-dock .ppd-papel { cursor: pointer; color: #e3e6ea; }
#pp-dock .ppd-oc { display: inline-flex; align-items: center; gap: 3px; }
#pp-dock .ppd-oc[hidden] { display: none; }
#pp-dock .ppd-oc .ppd-chip { cursor: pointer; padding: 0 7px; }
#pp-dock .ppd-oc .ppd-chip.on { background: #7f1d1d; border-color: #ef4444; color: #fecaca; text-decoration: line-through; }
#pp-dock .ppd-oc .ppd-n { color: #fbbf24; font-size: 11px; font-weight: 700; min-width: 0; }
.v-data-table tbody > tr[data-pp-oc] { display: none !important; }`,
        laudoBotoes: `
.v-dialog__content button[title="Gravar Áudio"] { display: none !important; }
.v-dialog__content .v-input:has(> .v-input__control input[value="UNICA"]) { display: none !important; }
.v-dialog__content button[data-pp-oculto] { display: none !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-input { margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; align-self: center !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-input .v-messages, .v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-input .v-text-field__details { display: none !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-input__slot { margin-bottom: 0 !important; min-height: 26px !important; align-items: center !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .row { align-items: center !important; flex-wrap: nowrap !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) > [class*="col-"] { padding-top: 6px !important; padding-bottom: 6px !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-btn:not(.v-btn--icon) { height: 34px !important; min-width: 80px !important; padding: 0 14px !important; margin: 0 4px !important; font-size: 13.5px !important; font-weight: 600 !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-btn.v-btn--icon { width: 40px !important; height: 40px !important; margin: 0 4px !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-btn.v-btn--icon .v-icon { font-size: 26px !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-label { font-size: 14.5px !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-input--selection-controls__input { transform: none !important; margin-right: 6px !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) .v-input { margin: 0 6px !important; }
.v-dialog__content .row.align-content-center:has(input[value="PADRAO"]) > [class*="col-"]:first-child { padding-right: 14px !important; }`,
        zoomLaudo: `
.document-editor__toolbar > .pp-zoom-laudo { display: inline-flex; align-items: center; gap: 0; margin: 0 3px; padding: 0 1px; border: 1px solid rgba(148,163,184,.35); border-radius: 6px; height: 28px; align-self: center; }
.pp-zoom-laudo button { background: none; border: 0; color: #e2e8f0; cursor: pointer; font: 600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2px 4px; border-radius: 4px; }
.pp-zoom-laudo button:hover { background: rgba(148,163,184,.2); }
.pp-zoom-laudo .pz-v { min-width: 36px; color: #93c5fd; }`,
        revisaoIA: `
.document-editor__toolbar > .v-btn.pp-rev-btn { color: #fbbf24 !important; font-weight: 700 !important; }
.v-dialog__content .row > .v-btn.pp-rod-conf { background-color: #b45309 !important; min-width: 0 !important; padding: 0 10px !important; }
.v-dialog__content .row > .v-btn.pp-rod-lib { background-color: #15803d !important; min-width: 0 !important; padding: 0 10px !important; box-shadow: 0 0 0 2px #86efac inset !important; }
.v-dialog__content .row > .v-btn.pp-canc-sep { margin-left: 36px !important; }
/* v1.28 — barra do laudo compacta (cores mantidas): botões de situação estreitos, Conferir e Cancelar só ícone */
html body .v-dialog__content .row.pp-rodape { flex-wrap: nowrap !important; }
html body .v-dialog__content .row.pp-rodape.pp-rodape.pp-rodape > .v-btn.v-btn { min-width: 0 !important; width: auto !important; flex: 0 0 auto !important; height: 34px !important; padding: 0 9px !important; margin: 0 2px !important; font-size: 13px !important; letter-spacing: 0 !important; }
html body .v-dialog__content .row.pp-rodape.pp-rodape.pp-rodape > .v-btn.v-btn.pp-rod-conf { width: 38px !important; padding: 0 !important; margin-left: 12px !important; }
html body .v-dialog__content .row.pp-rodape.pp-rodape.pp-rodape > .v-btn.v-btn.pp-rod-conf .v-icon { font-size: 22px !important; }
html body .v-dialog__content .row.pp-rodape.pp-rodape.pp-rodape > .v-btn.v-btn.pp-canc-sep { min-width: 110px !important; padding: 0 16px !important; margin-left: 22px !important; font-size: 14px !important; font-weight: 700 !important; } /* v1.32: Cancelar escrito e maior (uso frequente) */
.document-editor__toolbar > .v-btn.pp-calc-laudo, .document-editor__toolbar > .v-btn.pp-rev-btn { padding: 0 5px !important; min-width: 0 !important; }
#pp-rev { position: fixed; right: 16px; width: 430px; max-width: 94vw; max-height: calc(100vh - 110px); overflow: auto; z-index: 10000003; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; box-shadow: 0 16px 40px rgba(0,0,0,.6); font: 12.5px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
#pp-rev .pr-top { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #1e293b; position: sticky; top: 0; background: #0f172a; z-index: 1; }
#pp-rev .pr-top { flex-wrap: wrap; }
#pp-rev .pr-top b { flex: 1; font-size: 13px; }
#pp-rev select { background: #1e293b; color: #f1f5f9; border: 1px solid #475569; border-radius: 5px; padding: 2px 4px; font-size: 12px; }
#pp-rev .pr-x { background: none; border: 0; color: #94a3b8; font-size: 16px; cursor: pointer; }
#pp-rev .pr-b.cor { background: #4c1d95; border-color: #7c3aed; color: #ede9fe; }
#pp-rev .pr-b.cor small { opacity: .75; font-weight: 400; margin-left: 3px; }
#pp-rev .pr-full { padding: 6px 10px 2px; }
#pp-rev .pr-full > b { font-size: 12px; color: #c4b5fd; }
#pp-rev .pr-co { margin-top: 6px; padding: 6px 8px; border: 1px solid #4c1d95; border-radius: 6px; background: #1e1b4b; }
#pp-rev .pr-co.err, #pp-rev .pr-ok.err { color: #fca5a5; }
#pp-rev.min { width: auto; overflow: visible; border-color: #f59e0b; }
#pp-rev .pr-mini { padding: 6px 12px; cursor: pointer; font-weight: 700; white-space: nowrap; }
#pp-rev .pr-mini .pr-g { color: #f87171; } #pp-rev .pr-mini .pr-exp { color: #94a3b8; margin-left: 6px; }
#pp-rev .pr-alt { margin: 6px 10px 0; padding: 6px 8px; border-radius: 6px; background: #422006; border: 1px solid #b45309; color: #fde68a; display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
#pp-rev .pr-ped { padding: 8px 10px 2px; }
#pp-rev .pr-ped textarea { width: 100%; box-sizing: border-box; resize: vertical; min-height: 54px; background: #1e293b; color: #f1f5f9; border: 1px solid #475569; border-radius: 6px; padding: 6px 8px; font: inherit; }
#pp-rev .pr-ped textarea:focus { outline: none; border-color: #7c3aed; }
#pp-rev .pr-pedb { display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 4px; }
#pp-rev .pr-pedb label { display: flex; align-items: center; gap: 4px; color: #cbd5e1; font-size: 11.5px; }
#pp-rev .pr-pd { margin-top: 6px; }
#pp-rev .pr-mini { margin-top: 5px; padding: 5px 9px; border: 1px solid #334155; border-left: 4px solid #64748b; border-radius: 7px; background: #172033; color: #cbd5e1; cursor: pointer; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pp-rev .pr-mini:hover { background: #1e293b; } #pp-rev .pr-mini.grave { border-left-color: #ef4444; } #pp-rev .pr-mini.atencao { border-left-color: #f59e0b; }
#pp-rev .pr-resp { display: flex; gap: 6px; align-items: flex-end; margin-top: 6px; }
#pp-rev .pr-resp textarea { flex: 1; min-height: 38px; resize: vertical; background: #0f172a; color: #e5e7eb; border: 1px solid #6d28d9; border-radius: 6px; padding: 5px 7px; font: inherit; font-size: 12px; }
#pp-rev .pr-voce { font-size: 11.5px; color: #93c5fd; margin-top: 3px; white-space: pre-wrap; }
#pp-rev .pr-pq { color: #c4b5fd; font-style: italic; font-size: 11.5px; white-space: pre-wrap; }
#pp-rev .pr-dep, #pp-rev .pr-antes, #pp-rev .pr-obs { white-space: pre-wrap; }
#pp-rev .pr-tq { padding: 4px 0; border-bottom: 1px dashed #312e81; }
#pp-rev .pr-tq:last-of-type { border-bottom: 0; }
#pp-rev .pr-antes { color: #fca5a5; text-decoration: line-through; text-decoration-color: rgba(252,165,165,.5); }
#pp-rev .pr-dep { color: #86efac; }
#pp-rev .pr-tq.ok .pr-antes { opacity: .5; }
#pp-rev .pr-ok { font-size: 11px; color: #86efac; }
#pp-rev .pr-obs { font-size: 11.5px; color: #cbd5e1; margin-top: 4px; font-style: italic; }
#pp-rev .pr-niv { font-size: 10.5px; color: #a5b4fc; margin-left: auto; align-self: center; }
#pp-rev .pr-sts { display: flex; flex-wrap: wrap; gap: 5px; padding: 7px 10px 2px; }
#pp-rev .pr-st { padding: 1px 8px; border-radius: 10px; background: #1e293b; border: 1px solid #334155; font-size: 11px; font-weight: 600; }
#pp-rev .pr-st.ok { color: #34d399; } #pp-rev .pr-st.wait { color: #fbbf24; } #pp-rev .pr-st.err { color: #f87171; border-color: #7f1d1d; cursor: help; }
#pp-rev .pr-lib { margin: 8px 10px 0; padding: 8px 10px; border-radius: 8px; background: #064e3b; border: 1px solid #10b981; font-weight: 600; }
#pp-rev .pr-lib.g { background: #450a0a; border-color: #ef4444; }
#pp-rev .pr-libb { display: flex; gap: 6px; margin-top: 6px; }
#pp-rev .pr-lista { padding: 6px 10px; display: flex; flex-direction: column; gap: 6px; }
#pp-rev .pr-it { background: #1e293b; border: 1px solid #334155; border-left: 4px solid #f59e0b; border-radius: 7px; padding: 7px 9px; }
#pp-rev .pr-it.grave { border-left-color: #ef4444; }
#pp-rev .pr-it.conc { box-shadow: inset 0 0 0 1px #64748b; }
#pp-rev .pr-h { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
#pp-rev .pr-cat { flex: 1; font-weight: 700; color: #f1f5f9; }
#pp-rev .pr-it.grave .pr-cat { color: #fca5a5; }
#pp-rev .pr-f { font-size: 10px; font-weight: 700; padding: 0 6px; border-radius: 8px; background: #334155; color: #cbd5e1; }
#pp-rev .pr-f.regra { background: #4c1d95; color: #ddd6fe; } #pp-rev .pr-f.haiku { background: #7c2d12; color: #fed7aa; } #pp-rev .pr-f.gemini { background: #1e3a8a; color: #bfdbfe; }
#pp-rev .pr-tr { margin-top: 3px; color: #cbd5e1; font-style: italic; }
#pp-rev .pr-sg { margin-top: 3px; color: #93c5fd; }
#pp-rev .pr-ac { display: flex; gap: 5px; justify-content: flex-end; margin-top: 5px; }
#pp-rev .pr-b { background: #0f766e; color: #fff; border: 0; border-radius: 5px; padding: 3px 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
#pp-rev .pr-b.sec { background: #334155; }
#pp-rev .pr-b:disabled { opacity: .5; cursor: default; }
#pp-rev .pr-vazio { padding: 14px 4px; text-align: center; color: #94a3b8; }
#pp-rev .pr-rod { border-top: 1px solid #1e293b; padding: 7px 10px 9px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between; }
#pp-rev .pr-rod label { display: flex; align-items: center; gap: 5px; color: #cbd5e1; font-size: 11.5px; }
#pp-rev .pr-log { flex-basis: 100%; color: #64748b; font-size: 10.5px; }
#pp-rev .pr-err { margin: 4px 10px 0; color: #fca5a5; font-size: 11px; }
#pp-rev .pr-info { margin: 4px 10px 0; color: #c4b5fd; font-size: 11px; }
#pp-rev .pr-f.jev { background: #134e4a; color: #99f6e4; } #pp-rev .pr-f.sonnet { background: #7c2d12; color: #fdba74; } #pp-rev .pr-f.opus { background: #581c87; color: #f5d0fe; } #pp-rev .pr-f.grok { background: #27272a; color: #e4e4e7; } #pp-rev .pr-fraco { font-size: 11px; color: #a1a1aa; font-style: italic; margin-top: 2px; }`,
        rodapeCompacto: `
.v-main .v-data-table > .v-data-footer { min-height: 0 !important; height: 30px !important; padding: 0 8px !important; font-size: 12px !important; align-items: center !important; flex-wrap: nowrap !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__select { height: 30px !important; margin-right: 16px !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__select .v-select { margin: 0 0 0 10px !important; padding: 0 !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__select .v-input__slot { min-height: 0 !important; margin: 0 !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__select .v-select__selections { padding: 0 !important; min-height: 0 !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__select .v-select__selection--comma { margin: 0 4px 0 0 !important; font-size: 12px !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__select .v-input__append-inner { margin-top: 0 !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__select .v-text-field__details, .v-main .v-data-table > .v-data-footer .v-data-footer__select .v-messages { display: none !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__pagination { margin: 0 16px !important; }
.v-main .v-data-table > .v-data-footer .v-data-footer__icons-before .v-btn, .v-main .v-data-table > .v-data-footer .v-data-footer__icons-after .v-btn { width: 28px !important; height: 28px !important; margin: 0 2px !important; }`,
        calcLaudo: `
.document-editor__toolbar > .v-btn.pp-calc-laudo { color: #5eead4 !important; font-weight: 700 !important; }
#pp-panel[data-pos="laudo"] { top: var(--pp-top, 96px); left: auto; right: 16px; width: 440px; max-height: calc(100vh - var(--pp-top, 96px) - 12px); }`,
        historicoAcoes: `
#datatableExamesHistorico .pp-hist-acoes { display: inline-flex !important; align-items: center; gap: 3px; margin-left: 6px; vertical-align: middle; }
#datatableExamesHistorico td:nth-child(10) .v-icon { font-size: 17px !important; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha { position: relative; cursor: pointer; font-size: 17px !important; width: 20px; height: 20px; line-height: 20px; text-align: center; color: #808080; border-radius: 4px; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha:hover { background: rgba(127,127,127,.18); }
#datatableExamesHistorico .pp-hist-acoes .pp-ha[data-on="anexo"] { color: #2196f3 !important; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha[data-on="roxo"] { color: #c50ec5 !important; }
#datatableExamesHistorico .pp-hist-acoes .pp-ha[data-n]::after { content: attr(data-n); position: absolute; top: -6px; right: -7px; min-width: 13px; height: 13px; padding: 0 2px; border-radius: 7px; background: #4caf50; color: #fff; font: 700 9px/13px Roboto, Arial, sans-serif; text-align: center; }
#datatableExamesHistorico th:nth-child(1), #datatableExamesHistorico td:nth-child(1) { width: 40% !important; max-width: 40% !important; }
#datatableExamesHistorico th:nth-child(10), #datatableExamesHistorico td:nth-child(10) { width: 26% !important; max-width: 26% !important; }`,
        buscaCompacta: `
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
.v-autocomplete__content:has(.v-list-item__content > .v-list-item__subtitle + .v-list-item__title.text-pre-wrap) .v-list-item__action .v-icon { font-size: 18px !important; }`,
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
.ck-toolbar__items { flex-wrap: wrap !important; } /* v1.18: se não couber, quebra dentro da barra (não vaza para fora) */
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
            const A = `${S} td:nth-child(${iAc})`, EXTRA = '[data-ladi-radiant-button="true"], [data-ladi-horos-button="true"], [data-pp-com="true"]';
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
            histAcoes();
            buscaAltura();
            calcLaudoBtn();
            revBtn();
            zoomLaudoCtl();
            marcarBotoesLaudo();
        } catch (e) { console.warn('[PACS Plus] ajuste dinâmico falhou', e); }
    }

    function applyAll() { applyStatic(); applyDynamic(); try { ckOcultarCss(); } catch (e) { /* ok */ } }

    // Reaplica quando a página se redesenha (lista recarregada, diálogo aberto etc.)
    let pend = false;
    const obs = new MutationObserver(muts => {
        if (pend) return;
        // ignora mudanças feitas dentro do próprio painel do PACS Plus
        if (muts.every(m => { const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; return el && el.closest && el.closest('#pp-panel, #pp-urg, #pp-anexos, .pp-hist-acoes, #pp-dock, #pp-rev, .ck-content, .ck-editor__editable'); })) return;
        pend = true;
        setTimeout(() => { pend = false; applyDynamic(); aplicarPrazosLista(); }, 120);
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
    // ---- Prazo próprio (sem SLA no PACS / sem confirmação) — helpers comuns a US e TC ----
    // A coluna Prazo nativa exige sla_count_prazo > 0 e sla.ultimoacao_tipo = CONFIRMADO/PENDENCIADO.
    // Atenção: o PACS devolve sla = { slaTempoRestante: null } (ou {}) para exame SEM SLA, e
    // sla_count_prazo em texto ("2"); SLA real é só quando sla.slas tem itens.
    // Nada é enviado ao servidor; a lista recarregada (GET exame) traz objetos novos sem o SLA falso.
    const SLA_PROPRIO_DESC = 'US — prazo próprio (Plus, dias úteis)';
    const SLA_TC_DESC = 'TC — prazo próprio (Plus, dias úteis)';
    function modDe(ex) { return String(ex && ex.tipoexame && ex.tipoexame.modalidade && ex.tipoexame.modalidade.mod_sigla || '').toUpperCase(); }
    const listaSit = txt => String(txt || '').split(/[\n,;]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
    function slaRealDe(ex) { const s = ex && ex.sla; return !!(s && !s.__ppProprio && Array.isArray(s.slas) && s.slas.length > 0); }
    function criarSlaProprio(comp, ex, nd, desc) {
        const venc = prazoDiasUteis(ex.exa_data, nd, cfg.sla);
        if (!venc) return false;
        const total = Math.max(0, Math.round((venc.getTime() - new Date(String(ex.exa_data).slice(0, 10) + 'T00:00:00').getTime()) / 1000));
        ex.__ppCountOriginal = ex.sla_count_prazo || 0;
        ex.__ppSlaOriginal = ex.sla || null;
        comp.$set(ex, 'sla_count_prazo', 1);
        comp.$set(ex, 'sla', { __ppProprio: true, __ppUteis: true, ultimoacao_tipo: 'CONFIRMADO', sla_prazo_final: venc.toISOString(),
            sla_prazo: total, slas: [{ sla_codigo: 0, sla_descricao: desc, sla_prazo: nd * 24 }], slaTempoRestante: null });
        return true;
    }
    function restaurarSlaProprio(comp, ex) {
        comp.$set(ex, 'sla', ex.__ppSlaOriginal || { slaTempoRestante: null });
        comp.$set(ex, 'sla_count_prazo', ex.__ppCountOriginal || 0);
    }
    // o cronômetro nativo só existe se a lista tiver SLA do PACS: atualiza aqui também
    function tickSlaProprio(ex) { ex.sla.slaTempoRestante = Math.floor((new Date(ex.sla.sla_prazo_final).getTime() - Date.now()) / 1000); }

    // Prazo próprio do US (v1.7): US em REVISAR e NÃO urgente → 3 dias úteis a partir de exa_data.
    function aplicarSlaUSProprio() {
        const comp = componenteLista();
        if (!comp) return;
        const regras = cfg.sla, ativo = on('slaUSProprio');
        const nd = diasPorModalidade(regras).US || 3;
        const situacoes = listaSit(regras.usSituacoes || 'REVISAR');
        comp.exames.forEach(ex => {
            if (!ex || modDe(ex) !== 'US') return;
            const proprio = ex.sla && ex.sla.__ppProprio;
            const cabe = ativo && !ex.exa_idnurgente && situacoes.includes(String(ex.exa_situacao || '').toUpperCase());
            if (!cabe) { if (proprio) restaurarSlaProprio(comp, ex); return; }
            if (slaRealDe(ex)) return; // já tem SLA do PACS: não mexe
            if (!proprio && !criarSlaProprio(comp, ex, nd, SLA_PROPRIO_DESC)) return;
            tickSlaProprio(ex);
        });
    }

    // ---- Escala do radiologista (aba 🚨 Urgências) — usada pelo prazo do TC e pelo monitor ----
    const minutosDoDia = hhmm => { const [h, m] = String(hhmm || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    function janelaDias() { return String(cfg.urg.dias || '').split(/[^\d]+/).filter(x => x !== '').map(Number).filter(n => n >= 0 && n <= 6); }
    function naEscalaData(dt) {
        if (!(dt instanceof Date) || isNaN(dt)) return false;
        if (!janelaDias().includes(dt.getDay())) return false;
        if (feriadosDoAno(dt.getFullYear(), cfg.sla)[chaveDia(dt)]) return false;
        const t = dt.getHours() * 60 + dt.getMinutes();
        return t >= minutosDoDia(cfg.urg.inicio) && t <= minutosDoDia(cfg.urg.fim);
    }
    function dataHoraExame(ex) {
        const [y, mo, d] = String(ex && ex.exa_data || '').slice(0, 10).split('-').map(Number);
        const [h, mi, s] = String(ex && ex.exa_hora || '').split(':').map(Number);
        return y && mo && d ? new Date(y, mo - 1, d, h || 0, mi || 0, s || 0) : null;
    }
    const naEscala = ex => naEscalaData(dataHoraExame(ex));

    // ---- Prazo do TC (v1.8) ----
    // O TC é "seu" quando está em REVISAR com “Necessita de laudo”, ou quando é URGENTE com ficha
    // dentro da sua escala. O resto é telelaudo: fica sem relógio/cronômetro (só na tela, nada no servidor).
    // TC eletivo seu ainda “aguardando confirmação” ganha prazo próprio de 5 dias úteis (igual ao US).
    function tcEhMeu(ex) {
        const emRevisar = listaSit(cfg.sla.tcSituacoes || 'REVISAR').includes(String(ex.exa_situacao || '').toUpperCase()) && ex.exa_idnnecessitalaudo !== false;
        return ex.exa_idnurgente ? (emRevisar || naEscala(ex)) : emRevisar;
    }
    function aplicarPrazosTC() {
        const comp = componenteLista();
        if (!comp) return;
        const ocultar = on('tcSoMeus'), proprioOn = on('slaTCProprio');
        const nd = diasPorModalidade(cfg.sla).CT || 5;
        comp.exames.forEach(ex => {
            if (!ex || modDe(ex) !== 'CT') return;
            const meu = tcEhMeu(ex);
            const proprio = ex.sla && ex.sla.__ppProprio;
            if (ocultar && !meu) {
                if (proprio) restaurarSlaProprio(comp, ex);
                if (!ex.__ppOcultoTC) { ex.__ppCountOcultoTC = ex.sla_count_prazo; ex.__ppOcultoTC = true; comp.$set(ex, 'sla_count_prazo', 0); }
                return;
            }
            if (ex.__ppOcultoTC) { ex.__ppOcultoTC = false; comp.$set(ex, 'sla_count_prazo', ex.__ppCountOcultoTC); }
            const quer = proprioOn && meu && !ex.exa_idnurgente && (!slaRealDe(ex) || ex.sla.ultimoacao_tipo === 'PENDENTE');
            if (!quer) { if (proprio) restaurarSlaProprio(comp, ex); return; }
            if (!proprio && !criarSlaProprio(comp, ex, nd, SLA_TC_DESC)) return;
            tickSlaProprio(ex);
        });
    }

    function aplicarPrazosLista() {
        try { aplicarPrazosTC(); } catch (e) { console.warn('[PACS Plus] prazo do TC falhou', e); }
        try { aplicarSlaUSProprio(); } catch (e) { console.warn('[PACS Plus] prazo próprio do US falhou', e); }
        try { aplicarSlaUteis(); } catch (e) { console.warn('[PACS Plus] prazo em dias úteis falhou', e); }
    }
    setInterval(aplicarPrazosLista, 1000);

    // =====================================================================
    // 3C. MONITOR DE TC URGENTE — aviso na tela e no celular (v1.8)
    // ---------------------------------------------------------------------
    // A cada 60 s lê pela API do PACS (mesma sessão) os TC URGENTES de hoje com
    // ficha dentro da escala (seg–sex 07–17, sem feriados). Fora da escala é
    // telelaudo: ignorado. Prazo = SLA de urgência do PACS, contado a partir da
    // CONFIRMAÇÃO dos técnicos. v1.21: antes da confirmação NÃO há cronômetro
    // (só o aviso "marcado, aguardando confirmação" e o lembrete de que falta
    // confirmar). Opção "provisorio" volta ao modo antigo (2 h desde a marcação).
    // Avisos: tela (cartão + som + notificação do sistema) e celular (ntfy;
    // opcional Telegram e Pushover). No ntfy os lembretes (60/30/15 min, vencido,
    // repetições) ficam AGENDADOS NO SERVIDOR: chegam mesmo se o PC desligar e são
    // cancelados quando o laudo é liberado. Um vigia avisa se o monitor parar no
    // meio da escala; outro, se ele não iniciar no próximo dia de escala.
    // Só uma aba por computador vigia (eleição pelo localStorage). Nunca grava
    // nada no PACS. Nome de paciente aparece só na tela, nunca no celular.
    // =====================================================================
    const URG_ESTADO_KEY = 'pp_urg_estado_v1', URG_LIDER_KEY = 'pp_urg_lider_v1', URG_UI_KEY = 'pp_urg_ui_v1', URG_SOM_KEY = 'pp_urg_som_v1';
    const URG_POLL_MS = 60000, URG_TICK_MS = 20000, URG_LIDER_TTL = 150000;
    const URG_VIGIA_CADA = 15 * 60000, URG_VIGIA_ATRASO = 25 * 60000; // v1.21.1: 15 min (antes 6) — economiza a cota diária do ntfy.sh
    const URG_TAB = Math.random().toString(36).slice(2, 10);
    const URG_LINK = location.origin + '/exames';
    const urgLigado = () => !!(cfg.urg.tela || cfg.urg.celular);
    const urgPausado = () => !!cfg.urg.pausaAte && chaveDia(new Date()) <= cfg.urg.pausaAte;
    // modo teste: SOMA os pacientes TESTE (qualquer data, ignorando a escala) ao monitoramento normal; desliga sozinho em 2 h
    const urgModoTeste = () => !!cfg.urg.teste && Date.now() < (+cfg.urg.testeAte || 0);
    const hm = ms => { const d = new Date(ms); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
    function faltaTxt(ms) {
        const m = Math.max(0, Math.round(ms / 60000));
        if (m < 60) return m + ' min';
        const h = Math.floor(m / 60), r = m % 60;
        return h + ' h' + (r ? ' ' + r + ' min' : '');
    }
    function lembretesMin() { return [...new Set(String(cfg.urg.lembretes || '').split(/[^\d]+/).map(Number).filter(n => n > 0 && n <= 600))].sort((a, b) => b - a); }
    function hashCurto(s) { let h = 5381; for (const ch of String(s)) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h.toString(36); }
    function exameCurto(desc) {
        return String(desc || '').toUpperCase()
            .replace(/^TOMOGRAFIA COMPUTADORIZADA\s+((DE|DO|DA|DOS|DAS)\s+)?/, '').replace(/^TC\s+((DE|DO|DA|DOS|DAS)\s+)?/, '')
            .replace(/\bSEM CONTRASTE\b/g, 'S/C').replace(/\bCOM CONTRASTE\b/g, 'C/C').replace(/\s+/g, ' ').trim() || 'TC';
    }
    function idadeDe(nasc) {
        const m = String(nasc || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        const h = new Date();
        let a = h.getFullYear() - +m[1];
        if (h.getMonth() + 1 < +m[2] || (h.getMonth() + 1 === +m[2] && h.getDate() < +m[3])) a--;
        return a >= 0 && a < 130 ? a : null;
    }

    // ---- estado compartilhado entre as abas deste computador ----
    function urgEstado() { let e = null; try { e = JSON.parse(localStorage.getItem(URG_ESTADO_KEY)); } catch (x) { e = null; } return e && typeof e === 'object' ? e : {}; }
    function urgSalvar(e) { try { localStorage.setItem(URG_ESTADO_KEY, JSON.stringify(e)); } catch (x) { /* sem espaço */ } }
    function urgUi() { try { return JSON.parse(localStorage.getItem(URG_UI_KEY)) || {}; } catch (x) { return {}; } }
    function urgUiSalvar(ui) { try { localStorage.setItem(URG_UI_KEY, JSON.stringify(ui)); } catch (x) { /* ok */ } }
    // só UMA aba vigia (a líder); as outras só mostram o cartão
    function urgSouLider() {
        const agora = Date.now();
        let l = null;
        try { l = JSON.parse(localStorage.getItem(URG_LIDER_KEY)); } catch (x) { l = null; }
        if (l && l.id !== URG_TAB && agora - l.ts < URG_LIDER_TTL) return false;
        try { localStorage.setItem(URG_LIDER_KEY, JSON.stringify({ id: URG_TAB, ts: agora })); l = JSON.parse(localStorage.getItem(URG_LIDER_KEY)); } catch (x) { return true; }
        return !!l && l.id === URG_TAB;
    }
    window.addEventListener('pagehide', () => {
        try { const l = JSON.parse(localStorage.getItem(URG_LIDER_KEY)); if (l && l.id === URG_TAB) localStorage.removeItem(URG_LIDER_KEY); } catch (x) { /* ok */ }
        // v1.17 — líder fechando a aba: solta a vez na nuvem para a reserva assumir logo
        try {
            const n = typeof sessaoNuvemPlus === 'function' ? sessaoNuvemPlus() : null;
            if (n && urgPapel === 'lider') fetch(n.url + '/rest/v1/rpc/monitor_assumir', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', apikey: n.key, Authorization: 'Bearer ' + n.tok }, body: JSON.stringify({ p_nome: 'tc_urgente', p_pc: urgPcId(), p_pc_nome: urgPcNome(), p_soltar: true }) });
        } catch (x) { /* ok */ }
    });

    // ---- v1.17: vários computadores — só um envia ao celular (líder, pela nuvem); os outros ficam de reserva ----
    // Líder = quem renovou por último na tabela monitor_lider (TTL 3 min). Quem tem leitura do PACS falhando
    // (ex.: sessão expirada após o reinício diário do PC do hospital) solta a vez e a reserva assume em ~1–2 min.
    // Sem login na nuvem/sem internet com o Supabase: age sozinho (melhor aviso repetido que nenhum).
    const URG_PC_KEY = 'pp_urg_pc_id_v1', URG_LEASE_TTL = 180, URG_LEASE_CADA = 60000;
    let urgPapel = 'inicial', urgLiderNome = '', urgLeaseEm = 0, urgLeaseErro = '';
    function urgPcId() { let id = ''; try { id = localStorage.getItem(URG_PC_KEY) || ''; if (!id) { id = 'pc-' + Math.random().toString(36).slice(2, 10); localStorage.setItem(URG_PC_KEY, id); } } catch (x) { id = 'pc-' + URG_TAB; } return id; }
    const urgPcNome = () => String(cfg.urg.nomePc || '').trim() || (/Mac/i.test(navigator.platform || navigator.userAgent) ? 'Mac' : 'Windows');
    const celOn = () => !!cfg.urg.celular && urgPapel !== 'reserva' && urgPapel !== 'inicial';
    async function urgLease(podeVigiar) {
        const n = sessaoNuvemPlus();
        if (!n) { urgLeaseErro = 'sem login na nuvem (📅 Agenda → 🔐 Login)'; return 'sozinho'; }
        try {
            const r = await fetch(n.url + '/rest/v1/rpc/monitor_assumir', { method: 'POST', headers: { 'content-type': 'application/json', apikey: n.key, Authorization: 'Bearer ' + n.tok },
                body: JSON.stringify({ p_nome: 'tc_urgente', p_pc: urgPcId(), p_pc_nome: urgPcNome(), p_ttl: URG_LEASE_TTL, p_soltar: !podeVigiar }) });
            if (!r.ok) throw new Error('nuvem HTTP ' + r.status);
            const d = (await r.json() || [])[0] || {};
            urgLeaseErro = ''; urgLiderNome = d.pc_nome || '';
            // decisão só pelo servidor (não depende do relógio deste PC)
            return d.pc === urgPcId() && podeVigiar ? 'lider' : 'reserva';
        } catch (e) { urgLeaseErro = String(e.message || e); return 'sozinho'; }
    }

    // ---- canais ----
    const ntfyBase = () => String(cfg.urg.ntfyServidor || 'https://ntfy.sh').trim().replace(/\/+$/, '');
    // v1.21.1 — cota diária do ntfy.sh (plano grátis, por endereço de internet; Mac e PC da mesma casa somam).
    // Ao receber 429, para de tentar até a virada do dia em UTC (21h de Brasília) e mostra o aviso.
    const NTFY_COTA_KEY = 'pp_ntfy_cota_v1';
    function ntfyCotaAte() { try { const c = JSON.parse(localStorage.getItem(NTFY_COTA_KEY)); return c && c.ate > Date.now() ? c.ate : 0; } catch (e) { return 0; } }
    function ntfyMarcarCota(r) {
        if (!r || r.status !== 429) return;
        const d = new Date(); const ate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 2);
        const ja = ntfyCotaAte();
        try { localStorage.setItem(NTFY_COTA_KEY, JSON.stringify({ ate, em: Date.now() })); } catch (e) { /* ok */ }
        if (!ja) { console.warn('[PACS Plus] ntfy: cota diária esgotada (429)'); try { urgTela('⚠ Avisos no celular parados', `Cota diária grátis do ntfy.sh esgotada nesta internet. Volta às ${hm(ate)}. Avisos na tela continuam.`, 'aviso', 'pp-cota'); } catch (e) { /* ok */ } }
    }
    async function ntfyEnviar(o, forcar) {
        const u = cfg.urg;
        if ((!celOn() && !forcar) || !u.ntfyTopico) return null;
        if (!forcar && ntfyCotaAte()) return false;
        const p = new URLSearchParams();
        if (o.titulo) p.set('t', o.titulo);
        p.set('p', String(Math.min(o.prio || 3, 2))); // v1.26: ≤ 2 = sem som/vibração no celular
        if (o.tags) p.set('ta', o.tags);
        p.set('click', URG_LINK);
        if (o.sid) p.set('sid', o.sid);
        if (o.em && o.em - Date.now() > 15000) p.set('delay', String(Math.floor(o.em / 1000)));
        try {
            const r = await fetch(`${ntfyBase()}/${encodeURIComponent(u.ntfyTopico)}?${p}`, { method: 'POST', body: o.msg || o.titulo || '' });
            ntfyMarcarCota(r);
            if (r.ok && forcar) { try { localStorage.removeItem(NTFY_COTA_KEY); } catch (e) { /* ok */ } }
            return r.ok;
        } catch (e) { console.warn('[PACS Plus] ntfy falhou', e); return false; }
    }
    // acao: 'delete' (cancela agendado / apaga do celular) ou 'clear' (marca como lido)
    async function ntfyAcao(sid, acao, topico) {
        const t = topico || cfg.urg.ntfyTopico;
        if (!t || !sid) return false;
        if (ntfyCotaAte()) return false;
        try { const r = await fetch(`${ntfyBase()}/${encodeURIComponent(t)}/${encodeURIComponent(sid)}/${acao}`); ntfyMarcarCota(r); return r.ok; } catch (e) { return false; }
    }
    const tgTokenOk = t => /^\d{5,}:[\w-]{20,}$/.test(String(t || '').trim());
    async function tgEnviar(texto, forcar) {
        const u = cfg.urg;
        if ((!celOn() && !forcar) || !tgTokenOk(u.tgToken) || !u.tgChat) return null;
        try {
            const r = await fetch(`https://api.telegram.org/bot${String(u.tgToken).trim()}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ chat_id: String(u.tgChat).trim(), text: texto, disable_web_page_preview: 'true' }) });
            return r.ok;
        } catch (e) { return false; }
    }
    async function tgDescobrirChat(token) {
        if (!tgTokenOk(token)) throw new Error('token inválido');
        const r = await fetch(`https://api.telegram.org/bot${String(token).trim()}/getUpdates`);
        const j = await r.json();
        if (!j.ok) throw new Error(j.description || 'Telegram recusou');
        const ups = (j.result || []).slice().reverse();
        for (const up of ups) { const c = (up.message || up.channel_post || up.my_chat_member || {}).chat; if (c && c.id) return String(c.id); }
        return null;
    }
    async function poEnviar(o, forcar) {
        const u = cfg.urg;
        if ((!celOn() && !forcar) || !u.poUser || !u.poToken) return null;
        let prio = -1; // v1.26: Pushover sempre "silencioso" (-1); emergência desativada
        const f = { token: String(u.poToken).trim(), user: String(u.poUser).trim(), title: o.titulo, message: o.msg || o.titulo, priority: String(prio), url: URG_LINK, url_title: 'Abrir PACS' };
        if (prio === 2) Object.assign(f, { retry: '60', expire: '1800', tags: o.tag || 'pacsplus' });
        try {
            const r = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(f) });
            return r.ok;
        } catch (e) { return false; }
    }
    async function poCancelar(tag) {
        const u = cfg.urg;
        if (!u.poToken || !tag) return false;
        try {
            const r = await fetch(`https://api.pushover.net/1/receipts/cancel_by_tag/${encodeURIComponent(tag)}.json`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: String(u.poToken).trim() }) });
            return r.ok;
        } catch (e) { return false; }
    }

    // ---- tela: som + notificação do sistema ----
    let urgAudio = null;
    function urgAudioCtx() {
        try {
            if (!urgAudio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; urgAudio = new AC(); }
            if (urgAudio.state === 'suspended') urgAudio.resume();
        } catch (e) { urgAudio = null; }
        return urgAudio;
    }
    // o navegador só libera som depois de um clique na página
    document.addEventListener('pointerdown', () => { if (cfg.urg.tela) urgAudioCtx(); }, true);
    // v1.26 (pedido do usuário, 23/10): NUNCA tocar som — a esposa fica no mesmo ambiente do PC de casa.
    // Bip, notificação do sistema, ntfy e Pushover ficam sempre silenciosos; nenhuma configuração religa.
    const SEM_SOM = true;
    function urgBip(nivel) {
        if (SEM_SOM || !cfg.urg.som) return;
        const ctx = urgAudioCtx();
        if (!ctx || ctx.state !== 'running') return;
        const seq = nivel === 'urgente' ? [988, 0, 988, 0, 988, 0, 1319, 1319] : nivel === 'aviso' ? [784, 0, 784] : [660];
        let t = ctx.currentTime + 0.05;
        seq.forEach(f => {
            if (f) {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'square'; o.frequency.value = f;
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(0.2, t + 0.015);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
                o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.22);
            }
            t += 0.24;
        });
    }
    function urgTela(titulo, msg, nivel, tag) {
        if (!cfg.urg.tela) return;
        try {
            if (cfg.urg.notifWindows && 'Notification' in window && Notification.permission === 'granted') {
                const n = new Notification(titulo, { body: msg, tag: tag || undefined, renotify: false, silent: true, requireInteraction: nivel === 'urgente' });
                n.onclick = () => { try { window.focus(); } catch (x) { /* ok */ } n.close(); };
            }
        } catch (e) { /* sem notificação do sistema */ }
        try { localStorage.setItem(URG_SOM_KEY, JSON.stringify({ t: Date.now(), nivel })); } catch (e) { /* ok */ }
        urgBip(nivel);
    }

    // ---- mensagens (sem nome de paciente; o nome só vai para a tela deste computador) ----
    const urgChave = x => `${x.pac_codigo}|${x.exa_his_atendimento || String(x.exa_data || '').slice(0, 10)}`;
    const gsid = g => 'u' + hashCurto(`${g.key}|${g.dia}|${g.ciclo || 0}`);
    function urgMsg(g, tipo, quando) {
        const agora = quando || Date.now();
        const exs = Object.values(g.exames || {}).map(y => y.d);
        const exTxt = exs.slice(0, 3).join(' + ') + (exs.length > 3 ? ` +${exs.length - 3}` : '');
        const info = [exTxt, g.idade != null ? g.idade + ' a' : '', g.conv, g.ficha ? 'ficha ' + g.ficha : ''].filter(Boolean).join(' · ');
        const v = g.vence ? hm(g.vence) : '—', falta = (g.vence || agora) - agora;
        const prov = g.provisorio ? ' · prazo provisório (sem confirmação)' : '';
        const ign = '\n(se já liberou, ignore)';
        let r;
        if (tipo === 'novo') r = ['🚨 TC URGENTE — vence ' + v, `${info}\nConfirmado ${g.confirmadoEm ? hm(g.confirmadoEm) : ''} · faltam ${faltaTxt(falta)}`, 5, 'rotating_light', 'urgente', 1];
        else if (tipo === 'novoSemConf') r = ['🚨 TC URGENTE marcado — aguardando confirmação', g.vence ? `${info}\nPrazo provisório ${v} (${+cfg.urg.horas || 2} h a partir de agora). O prazo oficial começa quando os técnicos confirmarem.` : `${info}\nCronômetro ainda NÃO iniciado: o prazo de ${+cfg.urg.horas || 2} h começa quando os técnicos confirmarem o exame.`, 5, 'rotating_light', 'urgente', 1];
        else if (tipo === 'semConf') r = ['⚠ TC urgente ainda sem confirmação', `${info}\nMarcado há ${faltaTxt(agora - g.detectadoEm)} e os técnicos ainda não confirmaram.${g.vence ? ' Prazo provisório ' + v + '.' : ' Cronômetro parado até a confirmação.'}`, 4, 'warning', 'aviso', 1];
        else if (tipo === 'conf') r = ['⏱ TC urgente confirmado — vence ' + v, `${info}\nConfirmado ${g.confirmadoEm ? hm(g.confirmadoEm) : ''} · faltam ${faltaTxt(falta)}`, 4, 'stopwatch', 'aviso', 1];
        else if (tipo === 'r0') r = ['❌ PRAZO VENCIDO — TC urgente (' + v + ')', info + prov + ign, 5, 'x', 'urgente', 2];
        else if (/^r\d+$/.test(tipo)) {
            const m = +tipo.slice(1), forte = m <= 15;
            const t = m >= 60 && m % 60 === 0 ? `⏰ Falta${m > 60 ? 'm' : ''} ${m / 60} h` : `${forte ? '🚨' : '⏰'} Faltam ${m} min`;
            r = [t + ' — TC urgente (vence ' + v + ')', info + prov + ign, forte ? 5 : 4, forte ? 'rotating_light' : 'alarm_clock', forte ? 'urgente' : 'aviso', forte ? 2 : 1];
        } else if (/^v\d+$/.test(tipo)) r = [`❌ Vencido há ${faltaTxt(agora - g.vence)} — TC urgente`, `Venceu às ${v} · ${info}${ign}`, 5, 'x', 'urgente', 2];
        else if (tipo === 'fimLiberado' && !g.vence) r = ['✅ TC urgente liberado', `${info}\nLiberado ${hm(g.encerradoEm || agora)} (antes da confirmação dos técnicos)`, 2, 'white_check_mark', 'info', 0];
        else if (tipo === 'fimLiberado') {
            const d = g.vence - (g.encerradoEm || agora);
            r = [d >= 0 ? `✅ TC urgente liberado — ${faltaTxt(d)} antes do prazo` : `✅ TC urgente liberado — ${faltaTxt(-d)} após o prazo`, `${info}\nPrazo ${v} · liberado ${hm(g.encerradoEm || agora)}`, 2, 'white_check_mark', 'info', 0];
        } else r = ['ℹ Urgência retirada ou exame cancelado', `${info}\nLembretes cancelados.`, 2, 'information_source', 'info', -1];
        return { titulo: r[0], msg: r[1], prio: r[2], tags: r[3], nivel: r[4], poPrio: r[5], tela: (g.nome ? g.nome + ' · ' : '') + r[1] };
    }

    // ---- eventos ----
    async function urgEvento(g, tipo, e) {
        g.enviados[tipo] = Date.now();
        urgSalvar(e); // marca antes de enviar (não repete se outra aba assumir)
        const m = urgMsg(g, tipo);
        urgTela(m.titulo, m.tela, m.nivel, gsid(g));
        if (!celOn()) return;
        const sid = gsid(g) + '-' + tipo;
        if (!(g.agenda && g.agenda[sid])) { // se já está agendado no ntfy, o servidor entrega sozinho
            if (await ntfyEnviar({ sid, titulo: m.titulo, msg: m.msg, prio: m.prio, tags: m.tags })) (g.entregues = g.entregues || []).push(sid);
        }
        await tgEnviar(m.titulo + '\n' + m.msg);
        await poEnviar({ titulo: m.titulo, msg: m.msg, prio: m.poPrio, tag: gsid(g) });
    }
    // agenda no servidor do ntfy os lembretes do prazo atual (substitui/cancela os antigos)
    async function urgAgendar(g) {
        // v1.9.2: só marca como agendado se o celular estiver ligado — assim, ao ligar o celular
        // com um urgente já aberto, os lembretes desse paciente também são agendados no ntfy.
        if (!celOn() || !cfg.urg.ntfyTopico || !g.vence) return;
        g.agendaVence = g.vence;
        const base = gsid(g), agora = Date.now(), plano = [];
        lembretesMin().forEach(m => plano.push(['r' + m, g.vence - m * 60000]));
        plano.push(['r0', g.vence]);
        const rep = +cfg.urg.repetirVencido || 0, vezes = Math.min(12, +cfg.urg.repetirVezes || 0);
        if (rep > 0) for (let i = 1; i <= vezes; i++) plano.push(['v' + i, g.vence + i * rep * 60000]);
        const nova = {};
        for (const [tipo, em] of plano) {
            if (em <= agora + 20000 || g.enviados[tipo]) continue;
            const m = urgMsg(g, tipo, em), sid = base + '-' + tipo;
            if (await ntfyEnviar({ sid, em, titulo: m.titulo, msg: m.msg, prio: m.prio, tags: m.tags })) nova[sid] = em;
        }
        for (const [sid, em] of Object.entries(g.agenda || {})) if (!nova[sid] && em > agora) await ntfyAcao(sid, 'delete');
        g.agenda = nova;
    }
    async function urgCancelarAgenda(g) {
        const agora = Date.now();
        for (const [sid, em] of Object.entries(g.agenda || {})) if (em > agora) await ntfyAcao(sid, 'delete');
        g.agenda = {};
        g.agendaVence = null;
    }
    // v1.27.2 — FAXINA dos lembretes agendados no ntfy (falha de 23/10/2026: lembretes "Vencido há…" de exames já
    // liberados continuaram chegando porque o cancelamento ficou só na memória do PC que agendou — falhou (cota 429 /
    // troca de PC líder / versão antiga) e ninguém mais sabia cancelar). Agora quem envia ao celular consulta, a cada
    // 10 min, os lembretes AINDA AGENDADOS no servidor do ntfy e apaga os de urgentes que não estão mais em aberto.
    // Só roda logo após uma leitura boa do PACS (lista atual) ou fora do horário sem urgente aberto. Falhou → tenta de novo.
    const URG_VARRER_CADA = 10 * 60000;
    let urgVarridoEm = 0;
    async function urgVarrerAgendados(e, ativo) {
        const u = cfg.urg;
        if (!celOn() || !u.ntfyTopico || !(urgPapel === 'lider' || urgPapel === 'sozinho') || ntfyCotaAte()) return;
        if (Date.now() - urgVarridoEm < URG_VARRER_CADA) return;
        const leituraBoa = e.ultLeitura && e.ultTentativa && e.ultLeitura >= e.ultTentativa && Date.now() - e.ultLeitura < 5 * 60000;
        if (ativo && !leituraBoa) return; // lista do PACS desatualizada: não decide nada
        urgVarridoEm = Date.now();
        const vivos = new Set();
        Object.values(e.grupos || {}).filter(g => g.aberto).forEach(g => { for (let c = 0; c <= (g.ciclo || 0) + 2; c++) vivos.add('u' + hashCurto(`${g.key}|${g.dia}|${c}`)); });
        let linhas;
        try {
            const r = await fetch(`${ntfyBase()}/${encodeURIComponent(u.ntfyTopico)}/json?poll=1&scheduled=1&since=24h`);
            ntfyMarcarCota(r); if (!r.ok) return;
            linhas = (await r.text()).split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (x) { return null; } }).filter(Boolean);
        } catch (x) { return; }
        const agora = Date.now() / 1000, ultimo = new Map(); // último evento de cada id (apagado e reagendado conta o reagendamento)
        linhas.forEach(m => { if (m.sequence_id && (m.event === 'message' || m.event === 'message_delete')) ultimo.set(m.sequence_id, m); });
        const orfaos = [...ultimo.values()].filter(m => m.event === 'message' && m.time > agora + 30 && /^u[0-9a-z]+-(r\d+|v\d+)$/.test(m.sequence_id) && !vivos.has(m.sequence_id.split('-')[0]));
        let ok = 0;
        for (const m of orfaos) if (await ntfyAcao(m.sequence_id, 'delete')) ok++;
        if (orfaos.length) console.info(`[PACS Plus] faxina ntfy: ${ok}/${orfaos.length} lembrete(s) órfão(s) cancelado(s)`);
        if (ok < orfaos.length) urgVarridoEm = Date.now() - URG_VARRER_CADA + 2 * 60000; // falhou algum → tenta em 2 min
    }
    async function urgEncerrar(g, motivo, e) {
        g.aberto = false; g.encerradoEm = Date.now(); g.motivo = motivo;
        urgSalvar(e);
        const m = urgMsg(g, motivo === 'liberado' ? 'fimLiberado' : 'fimRemovido');
        urgTela(m.titulo, m.tela, 'info', gsid(g));
        if (!celOn()) return;
        await urgCancelarAgenda(g);
        g.entregues = []; // v1.23: não marca como lidas no celular (cada "clear" gasta 1 mensagem da cota)
        await ntfyEnviar({ sid: gsid(g) + '-fim', titulo: m.titulo, msg: m.msg, prio: m.prio, tags: m.tags });
        await poCancelar(gsid(g));
        await tgEnviar(m.titulo + '\n' + m.msg);
        if (motivo === 'liberado') await poEnviar({ titulo: m.titulo, msg: m.msg, prio: m.poPrio, tag: gsid(g) });
        urgSalvar(e);
    }
    // novo prazo: zera lembretes e marca como "pulados" os que já passaram
    function urgResetLembretes(g, agora) {
        Object.keys(g.enviados).forEach(k => { if (/^(r\d+|v\d+)$/.test(k)) delete g.enviados[k]; });
        lembretesMin().forEach(m => { if (g.vence - m * 60000 <= agora) g.enviados['r' + m] = 'pulado'; });
        const rep = +cfg.urg.repetirVencido || 0, vezes = Math.min(12, +cfg.urg.repetirVezes || 0);
        if (rep > 0) for (let i = 1; i <= vezes; i++) if (g.vence + i * rep * 60000 <= agora) g.enviados['v' + i] = 'pulado';
    }

    // ---- leitura do PACS (somente leitura) ----
    let urgModCodes = null;
    async function urgCodigosModalidade(tok) {
        if (urgModCodes) return urgModCodes;
        try {
            const r = await fetch('/backend/api/modalidade', { headers: { 'x-access-token': tok } });
            if (r.ok) {
                const j = await r.json(), arr = Array.isArray(j) ? j : (j.rows || []), m = {};
                arr.forEach(x => { if (x && x.mod_sigla) m[String(x.mod_sigla).toUpperCase()] = x.mod_codigo; });
                if (Object.keys(m).length) urgModCodes = m;
            }
        } catch (e) { /* segue sem filtro de modalidade (filtra aqui) */ }
        return urgModCodes || {};
    }
    async function urgConsulta(tok, codes, mods, teste) {
        const p = ['offset=0', 'limit=300', 'tela=EXAMES', 'pac_pacs_codigo=', 'data_inicial=', 'data_final=', 'exa_idnsomenteassinador=false', 'exa_dataparam=$exame.exa_data$',
            'pac_nome=' + (teste ? 'TESTE' : ''), 'data_codigo=' + (teste ? 1 : 2), 'exa_idnurgente[]=true'];
        mods.forEach(m => { if (codes[m] != null) p.push('mod_codigo[]=' + encodeURIComponent(codes[m])); });
        const r = await fetch('/backend/api/exame?' + p.join('&'), { headers: { 'x-access-token': tok } });
        if (r.status === 401 || r.status === 403) { const er = new Error('sessão do PACS expirada'); er.code = 'login'; throw er; }
        if (!r.ok) throw new Error('PACS respondeu HTTP ' + r.status);
        const j = await r.json(), hoje = chaveDia(new Date());
        const rows = (j.rows || []).filter(x => x && x.exa_idnurgente && x.paciente && mods.includes(modDe(x)) && x.exa_idnnecessitalaudo !== false);
        return teste ? rows.filter(x => /TESTE/i.test(x.paciente.pac_nome || ''))
            : rows.filter(x => String(x.exa_data || '').slice(0, 10) === hoje && naEscala(x));
    }
    async function urgLer() {
        const tok = localStorage.getItem('lwtoken');
        if (!tok) { const er = new Error('PACS sem login'); er.code = 'login'; throw er; }
        const mods = listaSit(cfg.urg.modalidades || 'CT');
        const codes = await urgCodigosModalidade(tok);
        const rows = await urgConsulta(tok, codes, mods, false);
        if (urgModoTeste()) {
            const vistos = new Set(rows.map(x => x.exa_codigo));
            (await urgConsulta(tok, codes, mods, true)).forEach(x => { if (!vistos.has(x.exa_codigo)) rows.push(x); });
        }
        if (rows.length) {
            try {
                const rs = await fetch('/backend/api/exame/sla', { method: 'POST', headers: { 'x-access-token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ exames: rows }) });
                if (rs.ok) { const mp = new Map(((await rs.json()) || []).map(x => [x.exa_codigo, x.sla])); rows.forEach(x => { if (mp.has(x.exa_codigo)) x.sla = mp.get(x.exa_codigo); }); }
            } catch (e) { /* sem SLA: usa prazo provisório */ }
        }
        return rows;
    }

    // ---- processamento da leitura ----
    async function urgProcessar(rows, e) {
        const agora = Date.now(), encerra = listaSit(cfg.urg.encerra || 'LIBERADO');
        const porGrupo = {};
        rows.forEach(x => { const k = urgChave(x); (porGrupo[k] = porGrupo[k] || []).push(x); });
        for (const [k, xs] of Object.entries(porGrupo)) {
            let g = e.grupos[k];
            const todosEncerrados = xs.every(x => encerra.includes(String(x.exa_situacao || '').toUpperCase()));
            if (g && !g.aberto) {
                // só reabre se aparecer exame novo ainda não liberado
                const novos = xs.filter(x => !(g.cods || {})[x.exa_codigo] && !encerra.includes(String(x.exa_situacao || '').toUpperCase()));
                if (!novos.length) continue;
                g = e.grupos[k] = { key: k, dia: e.dia, ciclo: (g.ciclo || 0) + 1, detectadoEm: agora, enviados: {}, aberto: true, cods: g.cods || {} };
            }
            if (!g) {
                if (todosEncerrados) { e.grupos[k] = { key: k, dia: e.dia, ciclo: 0, aberto: false, motivo: 'jaLiberado', cods: Object.fromEntries(xs.map(x => [x.exa_codigo, 1])) }; continue; }
                g = e.grupos[k] = { key: k, dia: e.dia, ciclo: 0, detectadoEm: agora, enviados: {}, aberto: true, cods: {} };
            }
            const novo = !g.avisoNovo && !g.vence;
            g.miss = 0;
            const x0 = xs[0];
            g.nome = String((x0.paciente && x0.paciente.pac_nome) || '');
            g.idade = idadeDe(x0.paciente && x0.paciente.pac_dtnasc);
            const conv = String((x0.convenio && x0.convenio.conv_descricao) || '');
            g.conv = conv ? transformInsuranceText(conv) : '';
            g.ficha = String(x0.exa_hora || '').slice(0, 5);
            g.exames = {};
            xs.forEach(x => { g.cods[x.exa_codigo] = 1; g.exames[x.exa_codigo] = { d: exameCurto(x.tipoexame && x.tipoexame.tpe_descricao), s: String(x.exa_situacao || '').toUpperCase() }; });
            if (todosEncerrados) { if (!novo) await urgEncerrar(g, 'liberado', e); else { g.aberto = false; g.motivo = 'jaLiberado'; } continue; }
            const slas = xs.map(x => x.sla).filter(s => s && Array.isArray(s.slas) && s.slas.length);
            const conf = slas.filter(s => s.ultimoacao_tipo === 'CONFIRMADO' && s.sla_prazo_final && !isNaN(new Date(s.sla_prazo_final)));
            const horasCfg = +cfg.urg.horas || 2;
            const horas = Math.min(horasCfg, slas.length ? Math.min(...slas.map(s => Math.min(...s.slas.map(y => +y.sla_prazo || horasCfg)))) : horasCfg);
            g.pausado = slas.length > 0 && slas.every(s => s.ultimoacao_tipo === 'PENDENCIADO');
            const eraProv = g.provisorio;
            let vence;
            if (conf.length) {
                vence = Math.min(...conf.map(s => new Date(s.sla_prazo_final).getTime()));
                const cs = conf.map(s => new Date(s.ultimoacao_created).getTime()).filter(n => !isNaN(n));
                g.confirmadoEm = cs.length ? Math.min(...cs) : (g.confirmadoEm || agora);
                vence = Math.min(vence, g.confirmadoEm + horasCfg * 3600000); // SLA eletivo num exame urgente não estica o prazo
                g.provisorio = false;
            } else {
                // v1.21: sem confirmação o cronômetro NÃO corre (exame marcado pode nem ter imagem ainda)
                vence = cfg.urg.provisorio ? g.detectadoEm + horas * 3600000 : null;
                g.provisorio = true; g.confirmadoEm = null;
            }
            if (g.vence !== vence) { g.vence = vence; if (vence) urgResetLembretes(g, agora); }
            if (novo) { g.avisoNovo = true; await urgEvento(g, g.provisorio ? 'novoSemConf' : 'novo', e); }
            else if (eraProv && !g.provisorio && !g.enviados.conf) await urgEvento(g, 'conf', e);
            if (g.pausado || !g.vence) { if (Object.keys(g.agenda || {}).length) await urgCancelarAgenda(g); }
            else if (g.agendaVence !== g.vence) await urgAgendar(g);
        }
        // grupos que sumiram (urgência retirada ou exame cancelado): 2 leituras seguidas
        for (const g of Object.values(e.grupos)) {
            if (!g.aberto || porGrupo[g.key]) continue;
            g.miss = (g.miss || 0) + 1;
            if (g.miss >= 2) await urgEncerrar(g, 'removido', e);
        }
    }

    // ---- lembretes por horário (tela, Telegram, Pushover; ntfy só se não estiver agendado) ----
    async function urgTick(e) {
        const agora = Date.now(), L = lembretesMin();
        const rep = +cfg.urg.repetirVencido || 0, vezes = Math.min(12, +cfg.urg.repetirVezes || 0);
        for (const g of Object.values(e.grupos || {})) {
            if (!g.aberto || g.pausado) continue;
            // falta confirmar: avisa após X min e repete a cada X min (até 4 vezes)
            if (g.provisorio && g.detectadoEm) {
                const n = Math.floor((agora - g.detectadoEm) / ((+cfg.urg.semConfirmacao || 15) * 60000));
                const ja = g.semConfN || (g.enviados.semConf ? 1 : 0);
                if (n >= 1 && n > ja && ja < 2) { g.semConfN = n; await urgEvento(g, 'semConf', e); }
            }
            if (!g.vence) continue;
            const dev = L.filter(m => !g.enviados['r' + m] && agora >= g.vence - m * 60000 && agora < g.vence);
            if (dev.length) { const m = Math.min(...dev); dev.forEach(x => { if (x !== m) g.enviados['r' + x] = 'pulado'; }); await urgEvento(g, 'r' + m, e); }
            if (!g.enviados.r0 && agora >= g.vence) { L.forEach(m => { if (!g.enviados['r' + m]) g.enviados['r' + m] = 'pulado'; }); await urgEvento(g, 'r0', e); }
            if (rep > 0) {
                const dv = [];
                for (let i = 1; i <= vezes; i++) if (!g.enviados['v' + i] && agora >= g.vence + i * rep * 60000) dv.push(i);
                if (dv.length) { const i = Math.max(...dv); dv.forEach(x => { if (x !== i) g.enviados['v' + x] = 'pulado'; }); await urgEvento(g, 'v' + i, e); }
            }
        }
    }

    // ---- vigias (só ntfy): "monitor parou" na escala e "monitor não iniciou" no próximo dia ----
    function proximoInicioEscala(apos) {
        const d = new Date(apos); d.setHours(0, 0, 0, 0);
        const [h, mi] = String(cfg.urg.inicio || '07:00').split(':').map(Number);
        for (let i = 1; i <= 8; i++) {
            d.setDate(d.getDate() + 1);
            if (!janelaDias().includes(d.getDay()) || feriadosDoAno(d.getFullYear(), cfg.sla)[chaveDia(d)]) continue;
            if (cfg.urg.pausaAte && chaveDia(d) <= cfg.urg.pausaAte) continue;
            const alvo = new Date(d); alvo.setHours(h || 0, (mi || 0) + 30, 0, 0);
            return alvo;
        }
        return null;
    }
    function fimEscalaHoje() { const d = new Date(), f = minutosDoDia(cfg.urg.fim); d.setHours(Math.floor(f / 60), f % 60, 59, 0); return d.getTime(); }
    // v1.23 — com login na nuvem (papel 'lider') quem vigia "PAROU / não iniciou" é o SERVIDOR (pg_cron a cada 5 min,
    // interno.monitor_verificar): aqui só informamos 1x/min até quando vigiamos hoje e quando começa a próxima escala.
    // Zero mensagens no ntfy enquanto tudo funciona. Sem login na nuvem ('sozinho'): mantém o vigia antigo pelo ntfy.
    let urgVigiaRpcEm = 0;
    async function urgVigiaServidor(e) {
        const n = sessaoNuvemPlus(), u = cfg.urg, agora = Date.now();
        if (!n || agora - urgVigiaRpcEm < URG_LEASE_CADA - 5000) return;
        urgVigiaRpcEm = agora;
        const dentro = !urgPausado() && naEscalaData(new Date());
        // próximo início: hoje (se ainda não começou e hoje é dia de escala) ou o próximo dia de escala
        const hojeIni = new Date(agora); const [hI, mI] = String(u.inicio || '07:00').split(':').map(Number); hojeIni.setHours(hI || 0, (mI || 0) + 30, 0, 0);
        const ehDia = janelaDias().includes(hojeIni.getDay()) && !feriadosDoAno(hojeIni.getFullYear(), cfg.sla)[chaveDia(hojeIni)] && !(u.pausaAte && chaveDia(hojeIni) <= u.pausaAte);
        const prox = ehDia && agora < hojeIni.getTime() - 30 * 60000 ? hojeIni : proximoInicioEscala(agora);
        try {
            await fetch(n.url + '/rest/v1/rpc/monitor_vigia_estado', { method: 'POST', headers: { 'content-type': 'application/json', apikey: n.key, Authorization: 'Bearer ' + n.tok },
                body: JSON.stringify({ p_nome: 'tc_urgente', p_pc: urgPcId(), p_vigia_ate: dentro ? new Date(fimEscalaHoje() + 3 * 60000).toISOString() : null,
                    p_proximo_inicio: prox ? prox.toISOString() : null, p_topico: u.ntfyTopico, p_servidor: ntfyBase() }) });
        } catch (x) { /* próxima volta */ }
        // limpeza única: cancela os vigias antigos agendados no ntfy (2 mensagens, uma vez só)
        if (!e.vigiaMig123) { e.vigiaMig123 = true; await ntfyAcao('pp-vigia', 'delete'); await ntfyAcao('pp-inicio', 'delete'); e.vigiaEm = 0; }
    }
    async function urgVigia(e) {
        const u = cfg.urg;
        if (!celOn() || !u.ntfyTopico) return;
        const agora = Date.now(), hoje = chaveDia(new Date());
        const dentro = !urgPausado() && naEscalaData(new Date());
        const lendoOk = e.ultLeitura && agora - e.ultLeitura < 3 * 60000; // se a leitura falha, o vigia não é renovado e dispara
        if (urgPapel === 'lider') {
            if (lendoOk) await urgVigiaServidor(e);
            if (dentro && lendoOk && e.diaAtivo !== hoje) {
                e.diaAtivo = hoje;
                await ntfyEnviar({ titulo: '✅ Monitor de urgências ativo', msg: `O ${urgPcNome()} está vigiando os TC urgentes da escala (${u.inicio}–${u.fim}). Se nenhum computador vigiar, o servidor avisa.`, prio: 2, tags: 'white_check_mark' });
            }
            return;
        }
        if (dentro && lendoOk) {
            if (e.diaAtivo !== hoje) {
                e.diaAtivo = hoje;
                await ntfyAcao('pp-inicio', 'delete');
                await ntfyEnviar({ titulo: '✅ Monitor de urgências ativo', msg: `O ${urgPcNome()} está vigiando os TC urgentes da escala (${u.inicio}–${u.fim}). Se ele parar, outro computador com o PACS aberto assume; se nenhum estiver, você recebe um aviso.`, prio: 2, tags: 'white_check_mark' });
            } else if (e.vigiaEm && agora - e.vigiaEm > URG_VIGIA_ATRASO) {
                await ntfyEnviar({ titulo: '✅ Monitor de urgências voltou', msg: `O ${urgPcNome()} voltou a vigiar os TC urgentes.`, prio: 2, tags: 'white_check_mark' });
            }
            if ((!e.vigiaEm || agora - e.vigiaEm >= URG_VIGIA_CADA) && agora - (e.vigiaTentEm || 0) >= 5 * 60000) {
                e.vigiaTentEm = agora; // falhou? tenta de novo só em 5 min (antes: a cada 20 s)
                const em = Math.min(agora + URG_VIGIA_ATRASO, fimEscalaHoje() + 3 * 60000);
                const ok = await ntfyEnviar({ sid: 'pp-vigia', em, titulo: '⚠ Monitor de urgências PAROU',
                    msg: 'Sem sinal do computador que vigia os TC urgentes (desligado/hibernando, Chrome ou PACS fechado, sem internet ou sessão expirada). Urgências NÃO estão sendo vigiadas — abra o PACS.', prio: 4, tags: 'warning' });
                if (ok) e.vigiaEm = agora;
            }
        } else if (!dentro && e.vigiaEm) {
            await ntfyAcao('pp-vigia', 'delete');
            e.vigiaEm = 0;
            const prox = proximoInicioEscala(agora);
            if (prox && prox.getTime() - agora < 3 * 86400000 - 120000) {
                const ok = await ntfyEnviar({ sid: 'pp-inicio', em: prox.getTime(), titulo: '⚠ Monitor de urgências não iniciou',
                    msg: `Até ${hm(prox.getTime())} nenhum computador com o PACS aberto começou a vigiar os TC urgentes. Abra/faça login no PACS (Mac ou PC de casa).`, prio: 4, tags: 'warning' });
                e.inicioAgendado = ok ? chaveDia(prox) : '';
            }
        }
    }

    // ---- ciclo (a cada 20 s; leitura do PACS a cada 60 s) ----
    let urgRodando = false;
    async function urgCiclo() {
        if (urgRodando || !urgLigado() || !urgSouLider()) return;
        urgRodando = true;
        const e = urgEstado();
        try {
            if (cfg.urg.teste && !urgModoTeste()) { recarregarCfg(); cfg.urg.teste = false; cfg.urg.testeAte = 0; saveCfg(); }
            const hoje = chaveDia(new Date());
            if (e.dia !== hoje) { e.dia = hoje; e.grupos = {}; e.sessaoAvisada = false; }
            e.grupos = e.grupos || {};
            const abertos = Object.values(e.grupos).some(g => g.aberto);
            const ativo = !urgPausado() && (urgModoTeste() || naEscalaData(new Date()) || abertos);
            // v1.17 — decide quem envia ao celular (só se "enviar ao celular" estiver ligado aqui)
            if (cfg.urg.celular && Date.now() - urgLeaseEm >= URG_LEASE_CADA - 5000) {
                urgLeaseEm = Date.now();
                // solta a vez só se a ÚLTIMA tentativa de leitura falhou (ex.: sessão do PACS expirada)
                const falhando = ativo && e.ultTentativa && Date.now() - e.ultTentativa < 3 * 60000 && (!e.ultLeitura || e.ultLeitura < e.ultTentativa);
                const lendoOk = !falhando && !ntfyCotaAte(); // v1.21.1: cota do ntfy esgotada aqui → outro PC (outra internet) assume
                const antes = urgPapel;
                urgPapel = await urgLease(!!lendoOk);
                if (antes === 'reserva' && urgPapel !== 'reserva') {
                    // assumiu: reenvia o estado dos urgentes abertos e reagenda os lembretes (mesmos ids no ntfy = substitui)
                    const abertos = Object.values(e.grupos).filter(g => g.aberto);
                    if (abertos.length || naEscalaData(new Date())) await ntfyEnviar({ titulo: `🔁 ${urgPcNome()} assumiu o monitor de urgências`, msg: abertos.length ? `${abertos.length} TC urgente(s) em aberto — lembretes reagendados.` : 'O outro computador parou de vigiar; este assumiu.', prio: 3, tags: 'repeat' });
                    for (const g of abertos) { g.agendaVence = null; if (!g.pausado) await urgAgendar(g); }
                    e.vigiaEm = 0;
                }
            } else if (!cfg.urg.celular) urgPapel = 'sozinho';
            if (ativo && Date.now() - (e.ultLeitura || 0) >= URG_POLL_MS - 5000 && Date.now() - (e.ultTentativa || 0) >= URG_POLL_MS - 5000) {
                e.ultTentativa = Date.now();
                try {
                    const rows = await urgLer();
                    e.ultLeitura = Date.now(); e.erro = ''; e.sessaoAvisada = false;
                    await urgProcessar(rows, e);
                } catch (err) {
                    e.erro = (err && err.message) || String(err);
                    if (err && err.code === 'login' && !e.sessaoAvisada) {
                        e.sessaoAvisada = true;
                        urgTela('⚠ Monitor de urgências parado', 'Sessão do PACS expirada — faça login para voltar a vigiar os TC urgentes.', 'aviso', 'pp-sessao');
                        // v1.23: sem mensagem no celular — outro PC assume; se ninguém assumir, o servidor manda "PAROU"
                        if (urgPapel === 'sozinho') await ntfyEnviar({ titulo: `⚠ Sessão do PACS expirou (${urgPcNome()})`, msg: `O ${urgPcNome()} parou de vigiar os TC urgentes. Faça login no PACS.`, prio: 4, tags: 'warning' });
                    }
                }
            }
            if (!urgPausado()) await urgTick(e);
            await urgVigia(e);
            await urgVarrerAgendados(e, ativo);
        } catch (err) {
            console.warn('[PACS Plus] monitor de urgências', err);
            e.erro = String((err && err.message) || err);
        } finally {
            urgSalvar(e);
            urgRodando = false;
            urgBanner();
        }
    }

    // ---- cartão na tela (todas as abas com "alerta na tela" ligado) ----
    const URG_CSS = `
#pp-urg { position: fixed; right: 14px; bottom: 14px; z-index: 10000001; display: flex; flex-direction: column; gap: 8px; width: 370px; max-width: 92vw; font: 12.5px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
#pp-urg .pp-uc { color: #fff; border: 2px solid; border-radius: 10px; padding: 8px 10px; box-shadow: 0 10px 28px rgba(0,0,0,.55); }
#pp-urg .pp-uc.azul { background: #1e3a8a; border-color: #93c5fd; }
#pp-urg .pp-uc.laranja { background: #9a3412; border-color: #fdba74; }
#pp-urg .pp-uc.vermelho { background: #991b1b; border-color: #fecaca; }
#pp-urg .pp-uc.vencido { background: #7f1d1d; border-color: #fff; animation: ppUrgPisca 1s steps(2) infinite; }
#pp-urg .pp-uc.erro { background: #78350f; border-color: #fbbf24; }
@keyframes ppUrgPisca { 50% { border-color: #fde047; box-shadow: 0 0 0 4px rgba(253,224,71,.55); } }
#pp-urg .pp-ut { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-weight: 800; font-size: 13px; }
#pp-urg .pp-uf { font-size: 20px; font-weight: 900; white-space: nowrap; }
#pp-urg .pp-us { opacity: .92; margin-top: 2px; }
#pp-urg .pp-ub { display: flex; gap: 6px; margin-top: 6px; }
#pp-urg button { background: rgba(255,255,255,.18); color: #fff; border: 1px solid rgba(255,255,255,.4); border-radius: 6px; padding: 3px 8px; font-weight: 700; font-size: 11.5px; cursor: pointer; }
#pp-urg .pp-umin { align-self: flex-end; background: #991b1b; color: #fff; border-radius: 16px; padding: 5px 12px; font-weight: 800; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.5); }
html[data-pp-viewer] #pp-urg { bottom: 40px; }`;
    function urgVerNaLista(nome) {
        const comp = componenteLista();
        if (comp && comp.filtro && typeof comp.getExames === 'function') { comp.$set(comp.filtro, 'pac_nome', nome); comp.getExames(); }
        else location.href = URG_LINK;
    }
    function urgBanner() {
        let box = document.getElementById('pp-urg');
        if (!document.body || !cfg.urg.tela || !urgLigado()) { if (box) box.remove(); return; }
        const e = urgEstado(), agora = Date.now();
        const grupos = (e.dia === chaveDia(new Date()) ? Object.values(e.grupos || {}) : []).filter(g => g.aberto).sort((a, b) => (a.vence || 9e15) - (b.vence || 9e15));
        const ocultos = urgUi().ocultar || {};
        let html = '';
        if (e.erro && naEscalaData(new Date()) && !urgPausado() && agora - (e.ultLeitura || 0) > 3 * 60000) {
            html += `<div class="pp-uc erro"><div class="pp-ut"><span>⚠ Monitor de TC urgente sem leitura</span></div><div class="pp-us">${esc(e.erro)} · última leitura: ${e.ultLeitura ? hm(e.ultLeitura) : '—'}</div></div>`;
        }
        const visiveis = grupos.filter(g => !(ocultos[g.key] > agora && (!g.vence || g.vence - agora > 15 * 60000)));
        html += visiveis.map(g => {
            if (!g.vence) {
                const exs0 = Object.values(g.exames || {}).map(y => y.d).join(' + ');
                return `<div class="pp-uc azul"><div class="pp-ut"><span>🚨 TC URGENTE · aguardando confirmação</span><span class="pp-uf">⏸</span></div>`
                    + `<div class="pp-us"><b>${esc(g.nome)}</b>${g.idade != null ? ' · ' + g.idade + ' a' : ''}${g.conv ? ' · ' + esc(g.conv) : ''}${g.ficha ? ' · ficha ' + esc(g.ficha) : ''}</div>`
                    + `<div class="pp-us">${esc(exs0)}</div><div class="pp-us">marcado há ${faltaTxt(agora - (g.detectadoEm || agora))} · o prazo de ${+cfg.urg.horas || 2} h começa na confirmação dos técnicos</div>`
                    + `<div class="pp-ub"><button data-urg-ver="${esc(g.nome)}">🔎 Ver na lista</button><button data-urg-ocultar="${esc(g.key)}">Ocultar 15 min</button></div></div>`;
            }
            const falta = g.vence - agora;
            const cls = falta <= 0 ? 'vencido' : falta <= 30 * 60000 ? 'vermelho' : falta <= 60 * 60000 ? 'laranja' : 'azul';
            const exs = Object.values(g.exames || {}).map(y => y.d).join(' + ');
            const st = g.pausado ? 'pendenciado (cronômetro pausado)' : g.provisorio ? 'aguardando confirmação · prazo provisório' : 'confirmado ' + (g.confirmadoEm ? hm(g.confirmadoEm) : '');
            return `<div class="pp-uc ${cls}"><div class="pp-ut"><span>🚨 TC URGENTE · vence ${hm(g.vence)}</span><span class="pp-uf">${falta <= 0 ? 'vencido há ' + faltaTxt(-falta) : faltaTxt(falta)}</span></div>`
                + `<div class="pp-us"><b>${esc(g.nome)}</b>${g.idade != null ? ' · ' + g.idade + ' a' : ''}${g.conv ? ' · ' + esc(g.conv) : ''}${g.ficha ? ' · ficha ' + esc(g.ficha) : ''}</div>`
                + `<div class="pp-us">${esc(exs)}</div><div class="pp-us">${esc(st)}</div>`
                + `<div class="pp-ub"><button data-urg-ver="${esc(g.nome)}">🔎 Ver na lista</button><button data-urg-ocultar="${esc(g.key)}">Ocultar 15 min</button></div></div>`;
        }).join('');
        const esc2 = grupos.length - visiveis.length;
        if (esc2) html += `<div class="pp-umin" data-urg-mostrar="1">🚨 ${esc2} TC urgente${esc2 > 1 ? 's' : ''} — mostrar</div>`;
        if (!html) { if (box) box.remove(); return; }
        if (!box) {
            setCss('pp-urg-css', URG_CSS);
            box = document.createElement('div');
            box.id = 'pp-urg';
            document.body.appendChild(box);
            box.addEventListener('click', ev => {
                const b = ev.target.closest('[data-urg-ocultar],[data-urg-mostrar],[data-urg-ver]');
                if (!b) return;
                const ui = urgUi(); ui.ocultar = ui.ocultar || {};
                if (b.dataset.urgOcultar) ui.ocultar[b.dataset.urgOcultar] = Date.now() + 15 * 60000;
                if (b.dataset.urgMostrar) ui.ocultar = {};
                urgUiSalvar(ui);
                if (b.dataset.urgVer) urgVerNaLista(b.dataset.urgVer);
                urgBanner();
            });
        }
        if (box.__html !== html) { box.innerHTML = html; box.__html = html; }
    }
    window.addEventListener('storage', ev => {
        if (ev.key === URG_ESTADO_KEY || ev.key === URG_UI_KEY) urgBanner();
        else if (ev.key === URG_SOM_KEY && cfg.urg.tela && document.visibilityState === 'visible') { try { urgBip(JSON.parse(ev.newValue).nivel); } catch (x) { /* ok */ } }
        else if (ev.key === CFG_KEY) { recarregarCfg(); urgBanner(); }
    });

    function urgGerarTopico() {
        const b = new Uint8Array(15);
        (window.crypto || window.msCrypto).getRandomValues(b);
        return 'pacs-urg-' + Array.from(b, x => (x % 36).toString(36)).join('');
    }
    async function urgTeste() {
        const out = [];
        urgAudioCtx();
        if (cfg.urg.tela) {
            const perm = 'Notification' in window ? Notification.permission : 'indisponível';
            urgTela('🧪 Teste do PACS Plus', 'Alerta na tela funcionando.', 'aviso', 'pp-teste');
            out.push(`Tela: cartão/som disparados · notificação do sistema: ${perm === 'granted' ? 'permitida' : perm === 'denied' ? 'BLOQUEADA no navegador' : 'clique em “Permitir notificações”'}`);
        } else out.push('Tela: desligado neste computador');
        if (cfg.urg.ntfyTopico) { const ok = await ntfyEnviar({ sid: 'pp-teste', titulo: '🧪 Teste PACS Plus', msg: 'Se você recebeu isto, os avisos de TC urgente vão chegar neste celular.', prio: 4, tags: 'test_tube' }, true); const c = ntfyCotaAte(); out.push('ntfy (celular): ' + (ok ? '✅ enviado' : c ? `❌ cota diária grátis do ntfy.sh esgotada nesta internet (erro 429) — volta às ${hm(c)}` : '❌ falhou (sem internet ou servidor fora)')); }
        else out.push('ntfy: sem tópico');
        if (tgTokenOk(cfg.urg.tgToken) && cfg.urg.tgChat) out.push('Telegram: ' + ((await tgEnviar('🧪 Teste PACS Plus — avisos de TC urgente funcionando.', true)) ? '✅ enviado' : '❌ falhou'));
        if (cfg.urg.poUser && cfg.urg.poToken) out.push('Pushover: ' + ((await poEnviar({ titulo: '🧪 Teste PACS Plus', msg: 'Avisos de TC urgente funcionando.', prio: 0 }, true)) ? '✅ enviado' : '❌ falhou'));
        return out;
    }

    // =====================================================================
    // 3D. MONITOR DE CHEGADA — 1º paciente de US do período (v1.9)
    // ---------------------------------------------------------------------
    // Nas janelas configuradas (padrão seg–sex 07:45–08:15 e 12:45–13:15, sem
    // feriados) lê a cada 60 s pela API do PACS (mesma sessão, só leitura) os
    // exames de US de HOJE. A 1ª ficha do período (manhã: ficha antes do corte;
    // tarde: a partir do corte, padrão 12:00) vira aviso no celular (ntfy) e,
    // opcionalmente, notificação do sistema neste computador. Se a janela
    // terminar sem ficha, avisa "nenhuma ficha". Celular recebe só INICIAIS.
    // Um vigia agendado no servidor do ntfy avisa se o monitor não iniciar na
    // próxima janela (Mac dormindo, Chrome/PACS fechado, sem internet).
    // Só uma aba por computador vigia. O id do aviso no ntfy é fixo por
    // dia+período: se dois computadores avisarem, o celular mostra um só.
    // Tópico próprio, separado do de TC urgente. Nunca grava nada no PACS.
    // =====================================================================
    const CHEG_ESTADO_KEY = 'pp_cheg_estado_v1', CHEG_LIDER_KEY = 'pp_cheg_lider_v1', CHEG_HIST_KEY = 'pp_cheg_hist_v1';
    const CHEG_POLL_MS = 60000, CHEG_TICK_MS = 20000, CHEG_LIDER_TTL = 150000, CHEG_TOLERANCIA_MS = 5 * 60000;
    const CHEG_TAB = Math.random().toString(36).slice(2, 10);
    const AGENDA_DB_KEY = 'agenda_multidatas_master_db'; // agenda (outro script): só leitura, para "agendado HH:MM"
    const chegNtfyBase = () => String(cfg.cheg.ntfyServidor || 'https://ntfy.sh').trim().replace(/\/+$/, '');
    const chegPausado = () => !!cfg.cheg.pausaAte && chaveDia(new Date()) <= cfg.cheg.pausaAte;
    const chegDias = () => String(cfg.cheg.dias || '').split(/[^\d]+/).filter(x => x !== '').map(Number).filter(n => n >= 0 && n <= 6);
    const STOP_NOME = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E', "D'", 'DI', 'DU']);
    function iniciais(nome) {
        const p = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(t => t && !STOP_NOME.has(t));
        return p.length ? p.map(t => t[0]).join('.') + '.' : '?';
    }
    function usCurto(desc) {
        return String(desc || '').toUpperCase()
            .replace(/^(ULTRASSONOGRAFIA|ULTRA-SONOGRAFIA|ULTRASONOGRAFIA|ULTRASSOM|USG|US)\s+((DE|DO|DA|DOS|DAS)\s+)?/, '')
            .replace(/\s+/g, ' ').trim() || 'US';
    }
    const nomeNorm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
    const ehTeste = nome => /\bTESTE\b/i.test(String(nome || ''));

    // janelas: "07:45-08:15" por linha → [{ ini, fim (min do dia), periodo }]
    function chegJanelas() {
        const corte = minutosDoDia(cfg.cheg.corteTarde || '12:00');
        return String(cfg.cheg.janelas || '').split(/[\n,;]+/).map(l => {
            const m = l.match(/(\d{1,2}:\d{2})\s*[-–a]+\s*(\d{1,2}:\d{2})/);
            if (!m) return null;
            const ini = minutosDoDia(m[1]), fim = minutosDoDia(m[2]);
            return fim > ini ? { ini, fim, txt: `${pad2(Math.floor(ini / 60))}:${pad2(ini % 60)}–${pad2(Math.floor(fim / 60))}:${pad2(fim % 60)}`, periodo: ini < corte ? 'manha' : 'tarde' } : null;
        }).filter(Boolean).sort((a, b) => a.ini - b.ini);
    }
    const NOME_PER = { manha: 'manhã', tarde: 'tarde' };
    function chegDiaValido(d) {
        if (!chegDias().includes(d.getDay())) return false;
        if (feriadosDoAno(d.getFullYear(), cfg.sla)[chaveDia(d)]) return false;
        return !(cfg.cheg.pausaAte && chaveDia(d) <= cfg.cheg.pausaAte);
    }
    // janela em andamento agora (com tolerância depois do fim para a leitura final)
    function chegJanelaAtual(agora) {
        const d = new Date(agora);
        if (!chegDiaValido(d)) return null;
        const t = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
        return chegJanelas().find(j => t >= j.ini && t < j.fim + CHEG_TOLERANCIA_MS / 60000) || null;
    }
    function inicioJanela(d, j) { const x = new Date(d); x.setHours(Math.floor(j.ini / 60), j.ini % 60, 0, 0); return x.getTime(); }
    function fimJanela(d, j) { const x = new Date(d); x.setHours(Math.floor(j.fim / 60), j.fim % 60, 0, 0); return x.getTime(); }
    function proximaJanela(apos) {
        const js = chegJanelas();
        if (!js.length) return null;
        const d0 = new Date(apos); d0.setHours(0, 0, 0, 0);
        for (let i = 0; i <= 10; i++) {
            const d = new Date(d0); d.setDate(d0.getDate() + i);
            if (!chegDiaValido(d)) continue;
            for (const j of js) { const ini = inicioJanela(d, j); if (ini > apos) return { em: ini, j }; }
        }
        return null;
    }

    // ---- estado (compartilhado entre as abas deste computador) ----
    function chegEstado() { let e = null; try { e = JSON.parse(localStorage.getItem(CHEG_ESTADO_KEY)); } catch (x) { e = null; } return e && typeof e === 'object' ? e : {}; }
    function chegSalvar(e) { try { localStorage.setItem(CHEG_ESTADO_KEY, JSON.stringify(e)); } catch (x) { /* sem espaço */ } }
    function chegHist() { try { return JSON.parse(localStorage.getItem(CHEG_HIST_KEY)) || {}; } catch (x) { return {}; } }
    function chegHistSalvar(dia, periodo, hora) {
        const h = chegHist();
        h[dia] = Object.assign({}, h[dia] || {}, { [periodo]: hora });
        const dias = Object.keys(h).sort();
        while (dias.length > 120) delete h[dias.shift()];
        try { localStorage.setItem(CHEG_HIST_KEY, JSON.stringify(h)); } catch (x) { /* ok */ }
    }
    function chegSouLider() {
        const agora = Date.now();
        let l = null;
        try { l = JSON.parse(localStorage.getItem(CHEG_LIDER_KEY)); } catch (x) { l = null; }
        if (l && l.id !== CHEG_TAB && agora - l.ts < CHEG_LIDER_TTL) return false;
        try { localStorage.setItem(CHEG_LIDER_KEY, JSON.stringify({ id: CHEG_TAB, ts: agora })); l = JSON.parse(localStorage.getItem(CHEG_LIDER_KEY)); } catch (x) { return true; }
        return !!l && l.id === CHEG_TAB;
    }
    function chegOutraAbaVigia() {
        let l = null;
        try { l = JSON.parse(localStorage.getItem(CHEG_LIDER_KEY)); } catch (x) { return false; }
        return !!l && l.id !== CHEG_TAB && Date.now() - l.ts < CHEG_LIDER_TTL;
    }
    window.addEventListener('pagehide', () => {
        try { const l = JSON.parse(localStorage.getItem(CHEG_LIDER_KEY)); if (l && l.id === CHEG_TAB) localStorage.removeItem(CHEG_LIDER_KEY); } catch (x) { /* ok */ }
    });

    // ---- canais ----
    async function chegNtfy(o, topico) {
        const t = topico || cfg.cheg.ntfyTopico;
        if (!t) return null;
        const p = new URLSearchParams();
        if (o.titulo) p.set('t', o.titulo);
        p.set('p', String(Math.min(o.prio || 3, 2))); // v1.26: ≤ 2 = sem som/vibração no celular
        if (o.tags) p.set('ta', o.tags);
        p.set('click', URG_LINK);
        if (o.sid) p.set('sid', o.sid);
        if (o.em && o.em - Date.now() > 15000) p.set('delay', String(Math.floor(o.em / 1000)));
        try {
            const r = await fetch(`${chegNtfyBase()}/${encodeURIComponent(t)}?${p}`, { method: 'POST', body: o.msg || o.titulo || '' });
            ntfyMarcarCota(r);
            return r.ok;
        } catch (e) { console.warn('[PACS Plus] ntfy (chegada) falhou', e); return false; }
    }
    async function chegNtfyApagar(sid, topico) {
        const t = topico || cfg.cheg.ntfyTopico;
        if (!t || !sid) return false;
        try { const r = await fetch(`${chegNtfyBase()}/${encodeURIComponent(t)}/${encodeURIComponent(sid)}/delete`); return r.ok; } catch (e) { return false; }
    }
    function chegTela(titulo, msg, tag) {
        if (!cfg.cheg.tela) return;
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const n = new Notification(titulo, { body: msg, tag: tag || undefined, silent: true });
                n.onclick = () => { try { window.focus(); } catch (x) { /* ok */ } n.close(); };
            }
        } catch (e) { /* sem notificação do sistema */ }
    }

    // ---- leitura do PACS (somente leitura) ----
    async function chegConsulta(tok, teste) {
        const mods = listaSit(cfg.cheg.modalidades || 'US');
        const codes = await urgCodigosModalidade(tok);
        const p = ['offset=0', 'limit=300', 'tela=EXAMES', 'pac_pacs_codigo=', 'data_inicial=', 'data_final=', 'exa_idnsomenteassinador=false', 'exa_dataparam=$exame.exa_data$',
            'pac_nome=' + (teste ? 'TESTE' : ''), 'data_codigo=' + (teste ? 1 : 2)];
        mods.forEach(m => { if (codes[m] != null) p.push('mod_codigo[]=' + encodeURIComponent(codes[m])); });
        const r = await fetch('/backend/api/exame?' + p.join('&'), { headers: { 'x-access-token': tok } });
        if (r.status === 401 || r.status === 403) { const er = new Error('sessão do PACS expirada'); er.code = 'login'; throw er; }
        if (!r.ok) throw new Error('PACS respondeu HTTP ' + r.status);
        const j = await r.json(), hoje = chaveDia(new Date());
        const rows = (j.rows || []).filter(x => x && x.paciente && x.exa_hora && mods.includes(modDe(x)) && String(x.exa_situacao || '').toUpperCase() !== 'CANCELADO');
        return teste ? rows.filter(x => ehTeste(x.paciente.pac_nome))
            : rows.filter(x => String(x.exa_data || '').slice(0, 10) === hoje && !ehTeste(x.paciente.pac_nome));
    }
    async function chegLer(teste) {
        const tok = localStorage.getItem('lwtoken');
        if (!tok) { const er = new Error('PACS sem login'); er.code = 'login'; throw er; }
        return chegConsulta(tok, teste);
    }

    // agenda do dia (script Agenda, mesmo computador): 1º horário do período e horário do paciente
    function chegAgenda(periodo, pacCodigo, nome) {
        let db = null;
        try { db = JSON.parse(localStorage.getItem(AGENDA_DB_KEY)); } catch (x) { db = null; }
        const lista = db && Array.isArray(db[chaveDia(new Date())]) ? db[chaveDia(new Date())] : [];
        const corte = minutosDoDia(cfg.cheg.corteTarde || '12:00');
        const doPer = lista.filter(i => i && /^\d{2}:\d{2}$/.test(String(i.hora || '')) && !i.removidoOrigemEm && i.status !== 'cancelado' && i.origem !== 'encaixe'
            && ((minutosDoDia(i.hora) < corte) === (periodo === 'manha')));
        if (!doPer.length) return null;
        const primeiro = doPer.map(i => i.hora).sort()[0];
        const nn = nomeNorm(nome);
        const meu = doPer.filter(i => (pacCodigo != null && Number(i.pacsPacienteId) === Number(pacCodigo)) || nomeNorm(i.paciente) === nn).map(i => i.hora).sort()[0] || null;
        return { primeiro, agendado: meu, total: new Set(doPer.map(i => nomeNorm(i.paciente))).size };
    }

    // 1ª ficha do período → { pac, nome, ficha 'HH:MM', exames[], conv, outros }
    function chegPrimeiro(rows, periodo) {
        const corte = minutosDoDia(cfg.cheg.corteTarde || '12:00');
        const doPer = rows.filter(x => (minutosDoDia(String(x.exa_hora).slice(0, 5)) < corte) === (periodo === 'manha'));
        if (!doPer.length) return null;
        doPer.sort((a, b) => String(a.exa_hora).localeCompare(String(b.exa_hora)) || (a.exa_codigo - b.exa_codigo));
        const x0 = doPer[0], pac = x0.pac_codigo;
        const dele = doPer.filter(x => x.pac_codigo === pac);
        const conv = String((x0.convenio && x0.convenio.conv_descricao) || '');
        return {
            pac, nome: String(x0.paciente.pac_nome || ''), ficha: String(x0.exa_hora).slice(0, 5),
            exames: [...new Set(dele.map(x => usCurto(transformExamText(String((x.tipoexame && x.tipoexame.tpe_descricao) || '')))))],
            conv: conv ? transformInsuranceText(conv).replace(/^PMRSRS$/, 'PREFEITURA') : '',
            outros: new Set(doPer.map(x => x.pac_codigo)).size - 1
        };
    }
    function chegMsg(p, periodo, teste) {
        const ag = teste ? null : chegAgenda(periodo, p.pac, p.nome);
        const exTxt = p.exames.slice(0, 3).join(' + ') + (p.exames.length > 3 ? ` +${p.exames.length - 3}` : '');
        const linha1 = [iniciais(p.nome), exTxt, p.conv].filter(Boolean).join(' · ');
        const extra = [];
        if (ag) {
            if (ag.agendado) extra.push('agendado ' + ag.agendado);
            else extra.push('fora da agenda (encaixe?)');
            extra.push(`1º horário ${ag.primeiro} · ${ag.total} paciente${ag.total > 1 ? 's' : ''} na agenda`);
        }
        if (p.outros > 0) extra.push(`+${p.outros} outra${p.outros > 1 ? 's' : ''} ficha${p.outros > 1 ? 's' : ''} já aberta${p.outros > 1 ? 's' : ''}`);
        return {
            titulo: `${teste ? '🧪 [TESTE] ' : ''}🩺 1º paciente US (${NOME_PER[periodo]}) — ficha ${p.ficha}`,
            msg: linha1 + (extra.length ? '\n' + extra.join(' · ') : ''),
            tela: (p.nome || '') + ' · ' + exTxt + (extra.length ? '\n' + extra.join(' · ') : '')
        };
    }

    // ---- vigia: "monitor não iniciou" agendado no ntfy para a próxima janela ----
    async function chegAgendarVigia(e, apos) {
        if (!cfg.cheg.ligado || !cfg.cheg.ntfyTopico) return;
        const prox = proximaJanela(apos || Date.now());
        if (!prox) return;
        const em = prox.em + 3 * 60000;
        if (em - Date.now() > 3 * 86400000 - 120000) { e.vigiaPara = 0; return; } // ntfy agenda até 3 dias
        if (e.vigiaPara === em) return;
        const ok = await chegNtfy({ sid: 'pc-inicio', em, titulo: '⚠ Monitor de chegada não iniciou',
            msg: `Às ${hm(em)} o computador de casa ainda não tinha lido o PACS (Mac dormindo, Chrome/PACS fechado, sem internet ou sessão expirada). Você não será avisado do 1º paciente desta janela.`, prio: 4, tags: 'warning' });
        if (ok) e.vigiaPara = em;
    }
    async function chegCancelarVigia(e) {
        if (e.vigiaPara && e.vigiaPara > Date.now()) await chegNtfyApagar('pc-inicio');
        e.vigiaPara = 0;
    }

    // ---- processamento de uma leitura dentro da janela ----
    async function chegProcessar(rows, e, j, agora) {
        const per = e.periodos[j.periodo] = e.periodos[j.periodo] || { estado: 'vigiando' };
        if (per.estado !== 'vigiando') return;
        const p = chegPrimeiro(rows, j.periodo);
        const sid = `pc-${e.dia.replace(/-/g, '')}-${j.periodo}`;
        if (p) {
            const m = chegMsg(p, j.periodo, false);
            Object.assign(per, { estado: 'chegou', ficha: p.ficha, avisadoEm: agora, resumo: m.msg, nome: p.nome });
            chegSalvar(e); // marca antes de enviar (não repete se outra aba assumir)
            chegHistSalvar(e.dia, j.periodo, p.ficha);
            chegTela(m.titulo, m.tela, sid);
            if (cfg.cheg.ntfyTopico) per.entregue = !!(await chegNtfy({ sid, titulo: m.titulo, msg: m.msg, prio: 4, tags: 'stethoscope' }));
        } else if (agora >= fimJanela(new Date(agora), j)) {
            Object.assign(per, { estado: 'nenhum', avisadoEm: agora });
            chegSalvar(e);
            chegHistSalvar(e.dia, j.periodo, '—');
            if (cfg.cheg.avisarNenhum) {
                const t = `⌛ Nenhuma ficha de US até ${hm(agora)} (${NOME_PER[j.periodo]})`;
                const ag = chegAgenda(j.periodo, null, '');
                const msg = ag ? `Agenda: 1º horário ${ag.primeiro} · ${ag.total} paciente${ag.total > 1 ? 's' : ''}. O monitor desta janela encerrou.` : 'O monitor desta janela encerrou.';
                chegTela(t, msg, sid);
                if (cfg.cheg.ntfyTopico) await chegNtfy({ sid, titulo: t, msg, prio: 3, tags: 'hourglass' });
            }
        }
        if (per.estado !== 'vigiando') await chegAgendarVigia(e, agora);
    }

    // ---- ciclo (a cada 20 s; leitura do PACS a cada 60 s só dentro da janela) ----
    let chegRodando = false;
    async function chegCiclo() {
        if (chegRodando || !cfg.cheg.ligado) return;
        const agora = Date.now(), j = chegJanelaAtual(agora);
        if (!chegSouLider()) return;
        chegRodando = true;
        const e = chegEstado();
        try {
            const hoje = chaveDia(new Date(agora));
            if (e.dia !== hoje) { e.dia = hoje; e.periodos = {}; e.sessaoAvisada = false; e.erro = ''; }
            e.periodos = e.periodos || {};
            e.vivo = agora;
            if (!j) { if (!e.vigiaPara || e.vigiaPara < agora) await chegAgendarVigia(e, agora); return; }
            const per = e.periodos[j.periodo];
            if (per && per.estado !== 'vigiando') return;
            if (agora - (e.ultTentativa || 0) < CHEG_POLL_MS - 5000 && agora < fimJanela(new Date(agora), j)) return;
            e.ultTentativa = agora;
            try {
                const rows = await chegLer(false);
                e.ultLeitura = Date.now(); e.erro = ''; e.sessaoAvisada = false;
                if (e.vigiaPara && Math.abs(e.vigiaPara - (inicioJanela(new Date(agora), j) + 3 * 60000)) < 60000) await chegCancelarVigia(e);
                await chegProcessar(rows, e, j, Date.now());
            } catch (err) {
                e.erro = (err && err.message) || String(err);
                if (err && err.code === 'login' && !e.sessaoAvisada) {
                    e.sessaoAvisada = true;
                    chegTela('⚠ Monitor de chegada parado', 'Sessão do PACS expirada — faça login.', 'pc-sessao');
                    await chegNtfy({ titulo: '⚠ PACS pediu login (computador de casa)', msg: `O monitor do 1º paciente (${j.txt}) está parado até alguém fazer login no PACS.`, prio: 4, tags: 'warning' });
                }
            }
        } catch (err) {
            console.warn('[PACS Plus] monitor de chegada', err);
            e.erro = String((err && err.message) || err);
        } finally {
            chegSalvar(e);
            chegRodando = false;
        }
    }

    // aba aberta pelo agendador do Mac (#ppauto) quando outra aba já vigia: fecha a duplicada
    function chegFecharDuplicada() {
        if (!/ppauto/.test(location.hash)) return;
        setTimeout(() => {
            if (!chegOutraAbaVigia()) { try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { /* ok */ } return; }
            try { window.close(); } catch (x) { /* o navegador pode não deixar: fica aberta, sem problema */ }
        }, 8000);
    }

    function chegGerarTopico() {
        const b = new Uint8Array(15);
        (window.crypto || window.msCrypto).getRandomValues(b);
        return 'pacs-chegada-' + Array.from(b, x => (x % 36).toString(36)).join('');
    }
    async function chegTesteEnvio() {
        const out = [];
        if (cfg.cheg.tela) {
            chegTela('🧪 Teste — monitor de chegada', 'Notificação deste computador funcionando.', 'pc-teste');
            out.push('Tela: ' + ('Notification' in window ? (Notification.permission === 'granted' ? 'notificação disparada' : 'clique em “Permitir notificações”') : 'indisponível'));
        }
        if (!cfg.cheg.ntfyTopico) out.push('ntfy: sem tópico'); else
            out.push('ntfy (celular): ' + ((await chegNtfy({ sid: 'pc-teste', titulo: '🧪 Teste — monitor de chegada', msg: 'J.S.S. · ABDOME TOTAL · PREFEITURA (exemplo)\nSe você recebeu isto, o aviso do 1º paciente vai chegar neste celular.', prio: 4, tags: 'test_tube' })) ? '✅ enviado' : '❌ falhou'));
        return out;
    }
    // usa o paciente TESTE mais recente do PACS (qualquer data) e manda o aviso no formato real
    async function chegTestePaciente() {
        const rows = await chegLer(true);
        if (!rows.length) return 'Nenhum exame de US de paciente TESTE encontrado no PACS.';
        rows.sort((a, b) => (String(b.exa_data) + String(b.exa_hora)).localeCompare(String(a.exa_data) + String(a.exa_hora)));
        const dia = String(rows[0].exa_data).slice(0, 10);
        const doDia = rows.filter(x => String(x.exa_data).slice(0, 10) === dia);
        const corte = minutosDoDia(cfg.cheg.corteTarde || '12:00');
        const periodo = minutosDoDia(String(doDia[0].exa_hora).slice(0, 5)) < corte ? 'manha' : 'tarde';
        const p = chegPrimeiro(doDia, periodo);
        const m = chegMsg(p, periodo, true);
        chegTela(m.titulo, m.tela, 'pc-teste');
        const ok = cfg.cheg.ntfyTopico ? await chegNtfy({ sid: 'pc-teste', titulo: m.titulo, msg: m.msg, prio: 4, tags: 'test_tube' }) : null;
        return `Paciente TESTE de ${dia.split('-').reverse().join('/')} · ficha ${p.ficha} · ${p.exames.join(' + ')}<br>Celular: ${ok == null ? 'sem tópico' : ok ? '✅ enviado' : '❌ falhou'}<br><span class="pp-muted">${esc(m.titulo)} — ${esc(m.msg)}</span>`;
    }

    // =====================================================================
    // 3E. HISTÓRICO DO PACIENTE — anexos, comentários e anamnese (v1.10)
    // ---------------------------------------------------------------------
    // Na tela do laudo, o histórico só traz Visualizar/Imprimir/Recuperar.
    // Aqui entram os mesmos atalhos da lista principal:
    //   • 💬 Comentários e 📄 Anamnese → abrem os PRÓPRIOS diálogos do PACS
    //     (ações do Vuex editarComentarioExame / editarAnamnese), que só usam
    //     o exa_codigo do exame clicado e buscam tudo de novo no servidor.
    //   • 📎 Anexos → visualizador do Plus, SÓ LEITURA. O diálogo de anexos
    //     nativo (abrirListaArquivos) faz Object.assign(this.exame, item), ou
    //     seja, trocaria o exame do laudo aberto pelo exame antigo — por isso
    //     NUNCA é chamado com um exame do histórico (só com o exame atual).
    // Contagens (anexos/comentários) vêm de GET exame/{id} e exame/{id}/comentario,
    // com cache por exame (não pesa: só os exames do histórico aberto).
    // =====================================================================
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

    // =====================================================================
    // 3F. BARRA ÚNICA, TEMA GRAFITE E CALCULADORAS NO LAUDO (v1.11)
    // ---------------------------------------------------------------------
    // Barra única: os botões dos outros scripts (Agenda, Anamnese TC) são
    // MOVIDOS para dentro de #pp-dock (mesmo id; os scripts continuam achando
    // o botão pelo id). No visualizador e com o ajuste desligado, devolve tudo.
    // =====================================================================
    const DOCK_IDS = ['btn-agenda-flutuante', 'pp-btn', 'ge-btn', 'hamctc-top'];
    const PAPEIS = [['normal', '◐ Papel branco'], ['suave', '◐ Papel suave'], ['escuro', '◐ Papel escuro']];
    function aplicarPapel() {
        const v = on('temaGrafite') ? (cfg.papel || 'suave') : 'normal';
        if (document.documentElement.getAttribute('data-pp-papel') !== v) document.documentElement.setAttribute('data-pp-papel', v);
    }
    function dockTick() {
        aplicarPapel();
        let d = document.getElementById('pp-dock');
        const ativo = on('barraUnica') && !ehViewer() && document.body;
        if (!ativo) {
            if (d) { DOCK_IDS.forEach(id => { const b = document.getElementById(id); if (b && b.parentElement === d) document.body.appendChild(b); }); d.remove(); }
            return;
        }
        if (!d) {
            d = document.createElement('div');
            d.id = 'pp-dock';
            d.innerHTML = '<span class="ppd-sep"></span><span class="ppd-chip" id="ppd-nuvem" hidden></span><span class="ppd-chip urg" id="ppd-urg" hidden title="TC urgente na sua escala — clique para ver os cartões"></span><span class="ppd-chip ppd-papel" id="ppd-papel" hidden title="Cor do papel do laudo (só na tela)"></span><span class="ppd-oc" id="ppd-oc" hidden title="Ocultar na lista (não mexe no filtro do PACS)">👁 ' + OCUL_GRUPOS.map(([k, r, t]) => `<span class="ppd-chip" data-oc="${k}" title="Ocultar/mostrar: ${t}">${r}</span>`).join('') + '<span class="ppd-n"></span></span>';
            document.body.appendChild(d);
            d.querySelector('#ppd-urg').onclick = () => { const ui = urgUi(); ui.ocultar = {}; urgUiSalvar(ui); urgBanner(); };
            d.querySelector('#ppd-oc').onclick = ev => {
                const c = ev.target.closest('[data-oc]'); if (!c) return;
                recarregarCfg();
                const o = cfg.ocultarLista, k = c.dataset.oc;
                if (k === 'lib') o.lib = !o.lib; else o.mods = o.mods.includes(k) ? o.mods.filter(x => x !== k) : o.mods.concat(k);
                saveCfg(); ocultarLinhasLista(); dockTick();
            };
            d.querySelector('#ppd-papel').onclick = () => {
                const i = PAPEIS.findIndex(x => x[0] === (cfg.papel || 'suave'));
                cfg.papel = PAPEIS[(i + 1) % PAPEIS.length][0]; saveCfg(); dockTick();
            };
        }
        const sep = d.querySelector('.ppd-sep');
        DOCK_IDS.forEach(id => { const b = document.getElementById(id); if (b && b.parentElement !== d) d.insertBefore(b, sep); });
        // ordem fixa: Agenda, Plus, Anamnese
        DOCK_IDS.forEach(id => { const b = document.getElementById(id); if (b && b.parentElement === d) d.insertBefore(b, sep); });
        // menu do Guia abre embaixo do botão (que agora fica na barra)
        const gb = document.getElementById('ge-btn'), gm = document.getElementById('ge-menu');
        if (gb && gm && gb.parentElement === d) { const l = Math.round(gb.getBoundingClientRect().left) + 'px'; if (gm.style.left !== l) gm.style.left = l; if (gm.style.top !== '40px') gm.style.top = '40px'; }
        // nuvem da Agenda (espelha o indicador da gaveta)
        const nv = d.querySelector('#ppd-nuvem'), ind = document.getElementById('indicatorNuvem');
        if (ind) {
            const t = (ind.textContent || '').replace('Nuvem ', '').trim();
            const c = ind.style.color || '';
            const cls = 'ppd-chip ' + (/34d399|52, 211, 153/.test(c) ? 'ok' : /f87171|248, 113, 113/.test(c) ? 'err' : 'warn');
            if (nv.textContent !== t) nv.textContent = t;
            if (nv.className !== cls) nv.className = cls;
            if (nv.title !== 'Agenda: ' + ind.title) nv.title = 'Agenda: ' + ind.title;
            nv.hidden = !t;
        } else nv.hidden = true;
        // TC urgente
        const ug = d.querySelector('#ppd-urg');
        let txt = '', cor = '';
        if (urgLigado()) {
            const e = urgEstado(), agora = Date.now();
            const gs = (e.dia === chaveDia(new Date()) ? Object.values(e.grupos || {}) : []).filter(g => g.aberto).sort((a, b) => (a.vence || 9e15) - (b.vence || 9e15));
            if (gs.length) {
                const f = gs[0].vence ? gs[0].vence - agora : null;
                txt = `🚨 ${gs.length} TC urgente${gs.length > 1 ? 's' : ''} · ${f == null ? 'aguardando confirmação' : f <= 0 ? 'vencido' : faltaTxt(f)}`;
                cor = f == null ? 'azul' : f <= 30 * 60000 ? '' : f <= 60 * 60000 ? 'laranja' : 'azul';
            }
        }
        if (ug.textContent !== txt) ug.textContent = txt;
        const ucl = 'ppd-chip urg' + (cor ? ' ' + cor : '');
        if (ug.className !== ucl) ug.className = ucl;
        ug.hidden = !txt;
        // v1.18 — ocultar linhas (só na lista de exames)
        const oc = d.querySelector('#ppd-oc'), o = cfg.ocultarLista || { lib: false, mods: [] };
        oc.hidden = !findListTable();
        if (!oc.hidden) {
            oc.querySelectorAll('[data-oc]').forEach(c => { const ativo = c.dataset.oc === 'lib' ? o.lib : o.mods.includes(c.dataset.oc); c.classList.toggle('on', !!ativo); });
            const nt = oculStat.n ? `−${oculStat.n}` : '';
            const nel = oc.querySelector('.ppd-n'); if (nel.textContent !== nt) nel.textContent = nt;
            nel.title = oculStat.n ? `${oculStat.n} de ${oculStat.total} exames desta página ocultos` : '';
        }
        // papel
        const pp = d.querySelector('#ppd-papel');
        pp.hidden = !on('temaGrafite');
        const rot = (PAPEIS.find(x => x[0] === (cfg.papel || 'suave')) || PAPEIS[1])[1];
        if (pp.textContent !== rot) pp.textContent = rot;
    }

    // Botões de situação que não são usados (Assinar, Analisar, Pré-Laudo): marcados pelo TEXTO
    const SITUACOES_OCULTAS = ['assinar', 'analisar', 'pre-laudo'];
    function marcarBotoesLaudo() {
        const lib = [...document.querySelectorAll('.v-dialog__content button')].find(b => norm(b.innerText) === 'liberar');
        if (!lib) return;
        [...lib.parentElement.children].forEach(b => {
            const ocultar = on('laudoBotoes') && SITUACOES_OCULTAS.includes(norm(b.innerText));
            if (ocultar) { if (!b.hasAttribute('data-pp-oculto')) b.setAttribute('data-pp-oculto', ''); }
            else if (b.hasAttribute('data-pp-oculto') && SITUACOES_OCULTAS.includes(norm(b.innerText))) b.removeAttribute('data-pp-oculto');
        });
    }

    // Calculadoras na tela do laudo
    function editorLaudo() {
        const el = document.querySelector('.v-dialog--active .ck-editor__editable, .ck-editor__editable');
        return el && el.ckeditorInstance && !el.ckeditorInstance.isReadOnly ? el.ckeditorInstance : null;
    }
    function inserirNoLaudo(texto) {
        const ed = editorLaudo();
        if (!ed || !texto) return false;
        try {
            ed.model.change(w => {
                // espaço automático se o cursor estiver colado numa palavra
                const pos = ed.model.document.selection.getFirstPosition();
                const antes = pos && pos.textNode ? pos.textNode.data.slice(0, pos.offset - pos.textNode.startOffset) : (pos && pos.nodeBefore && pos.nodeBefore.data) || '';
                const prefixo = antes && !/\s$/.test(antes) ? ' ' : '';
                ed.model.insertContent(w.createText(prefixo + texto));
            });
            ed.editing.view.focus();
            return true;
        } catch (e) { console.warn('[PACS Plus] inserir no laudo falhou', e); return false; }
    }
    function calcLaudoBtn() {
        const tb = document.querySelector('.document-editor__toolbar');
        let b = document.querySelector('.document-editor__toolbar > .pp-calc-laudo');
        if (!tb || !on('calcLaudo')) { if (b) b.remove(); return; }
        if (b) return;
        const ref = [...tb.querySelectorAll(':scope > .v-btn')].filter(x => /^(frase|matriz|formatacao)/.test(norm(x.innerText)));
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'v-btn v-btn--text theme--dark v-size--small pp-calc-laudo';
        b.innerHTML = '<span class="v-btn__content">🧮</span>';
        b.title = 'Calculadoras do PACS Plus (o resultado vai para o cursor do laudo)';
        b.addEventListener('mousedown', e => e.preventDefault()); // não tira o cursor do laudo
        b.onclick = e => {
            e.stopPropagation();
            const p = document.getElementById('pp-panel');
            if (!p) return;
            const aberto = p.classList.contains('open') && p.dataset.pos === 'laudo' && activeTab === 'calc';
            p.dataset.pos = 'laudo';
            const tbAtual = b.closest('.document-editor__toolbar') || tb;
            p.style.setProperty('--pp-top', Math.round(Math.max(48, Math.min(tbAtual.getBoundingClientRect().bottom + 8, window.innerHeight - 320))) + 'px');
            togglePanel(!aberto, 'calc');
        };
        const ultimo = ref[ref.length - 1];
        if (ultimo && ultimo.nextSibling) tb.insertBefore(b, ultimo.nextSibling); else tb.insertBefore(b, tb.firstChild);
    }

    // =====================================================================
    // 3G. REVISÃO DO LAUDO (regras fixas + Jev + Claude Opus/Sonnet + Gemini) — v1.12; v1.22: Haiku removido, Opus é o revisor padrão, Gemini 4 Argon
    // ---------------------------------------------------------------------
    // Botão 🛡 Revisar na barra do editor. Camadas:
    //   • Regras fixas (aqui mesmo, instantâneas): campo vazio, sexo × anatomia,
    //     lado × nome do exame, contraste × técnica, unidades, volume, Doppler
    //     sem fluxo, falta de conclusão, termo crítico sem “Resultado crítico”.
    //   • IA pela nuvem (ia-proxy v6, login da Agenda): Haiku 5.5 e, no modo
    //     duplo, Gemini em paralelo; prompts diferentes para US e TC.
    //     Achado apontado pelas duas = alta confiança.
    // Nunca bloqueia: no modo “revisar ao Liberar”, achado grave pede confirmação.
    // Registro local sem texto do laudo (tempo, tokens, nº de achados).
    // =====================================================================
    const REV_LOG_KEY = 'pacsplus_rev_log_v1';
    const REV_PADRAO = { modo: 'completo', noLiberar: false, aoColar: false, triagem: true, opusAuto: true, revisor: 'opus', grok: true, gemini: true }; // v1.28.1: Gemini volta (API paga) // v1.25: revisão só pelos botões do rodapé // v1.22: revisor opus (padrão) | sonnet — Haiku saiu ('auto'/'haiku' antigos viram opus)
    const revCfg = () => {
        // v1.28.1 — API paga do Gemini (23/10/2026): liga o "+ Gemini" uma vez em quem o tinha desligado
        if (cfg.rev && !cfg.rev.gemMig1281) { cfg.rev.gemini = true; cfg.rev.gemMig1281 = true; try { saveCfg(); } catch (e) { /* ok */ } }
        return Object.assign({}, REV_PADRAO, cfg.rev || {});
    };
    // v1.24 (pedido do usuário): liga uma vez "Revisar ao Liberar" + "Revisar ao colar" + triagem nos computadores que já tinham a revisão configurada
    if (cfg.rev && !cfg.rev.mig124) { cfg.rev = Object.assign(revCfg(), { noLiberar: true, aoColar: true, triagem: true, mig124: true }); try { saveCfg(); } catch (e) { /* ok */ } }
    // v1.25 (usuário, 23/10 16h): automático inviável (laudo conjunto liberado em dois locais; Gemini grátis estoura o tempo) →
    // desliga ao colar/ao Liberar, Gemini pausado, modo Jev + Claude. Revisão pelos botões "🛡 Conferir" e "✔ Liberar c/ IA" ao lado do Liberar.
    if (cfg.rev && !cfg.rev.mig125) { cfg.rev = Object.assign(revCfg(), { noLiberar: false, aoColar: false, gemini: false, modo: 'completo', mig125: true }); try { saveCfg(); } catch (e) { /* ok */ } }
    const CAT_NOME = {
        campo_vazio: 'Campo não preenchido', sexo_anatomia: 'Sexo × anatomia', lateralidade: 'Lateralidade',
        exame_texto: 'Exame × texto', corpo_conclusao: 'Corpo × conclusão', medidas: 'Medidas / unidades',
        classificacao: 'Classificação', redacao_sentido: 'Redação / ditado', critico: 'Resultado crítico', padrao: 'Padrão do serviço', outro: 'Outro'
    };
    function laudoComp() {
        let el = document.querySelector('.v-dialog__content .document-editor'), vm = null;
        while (el && !vm) { if (el.__vue__) vm = el.__vue__; el = el.parentElement; }
        let p = vm;
        while (p && !(p.exame && p.exame.tipoexame && ('examesPacienteHistorico' in p))) p = p.$parent;
        return p || null;
    }
    function htmlParaTexto(html) {
        const d = document.createElement('div');
        d.innerHTML = String(html || '').replace(/<\/(p|h\d|li|tr|div)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/t[dh]>/gi, '\t');
        return (d.textContent || '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    function idadeAnos(dt) {
        const m = String(dt || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        const h = new Date(), n = new Date(+m[1], +m[2] - 1, +m[3]);
        let a = h.getFullYear() - n.getFullYear();
        if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
        return a >= 0 && a < 130 ? a : null;
    }
    function contextoLaudo() {
        const ed = editorLaudo(), vm = laudoComp();
        if (!ed || !vm || !vm.exame) return null;
        const e = vm.exame, pac = e.paciente || {};
        const mod = String((e.tipoexame && e.tipoexame.modalidade && e.tipoexame.modalidade.mod_sigla) || '').toUpperCase();
        const crit = caixaCritico(false);
        const critInput = crit && crit.querySelector('input[type=checkbox]');
        return {
            ed, exa: e.exa_codigo, mod, tipo: mod === 'US' ? 'US' : mod === 'CT' ? 'TC' : 'GERAL',
            exame: String((e.tipoexame && e.tipoexame.tpe_descricao) || ''),
            sexo: String(pac.pac_sexo || '').toUpperCase(), idade: idadeAnos(pac.pac_dtnasc),
            indicacao: typeof e.exa_anamnese === 'string' ? e.exa_anamnese.replace(/\[FICHA TC HAMC[\s\S]*?\[\/FICHA TC\]/g, '').trim().slice(0, 600) : '',
            critico: !!(critInput && (critInput.checked || critInput.getAttribute('aria-checked') === 'true')),
            texto: htmlParaTexto(ed.getData())
        };
    }

    // ---------- regras fixas ----------
    const numBR = s => Number(String(s).replace(',', '.'));
    function frase(texto, idx) {
        const ini = Math.max(texto.lastIndexOf('\n', idx), texto.lastIndexOf('. ', idx) + 1, 0);
        let fim = texto.length;
        [texto.indexOf('\n', idx), texto.indexOf('. ', idx)].forEach(p => { if (p >= 0 && p < fim) fim = p + 1; });
        return texto.slice(ini, fim).trim().slice(0, 160);
    }
    // v1.27 — lista do SERVIÇO (decisão do usuário 23/10/2026, base CFM 20/2019 + CBR/ACR). NÃO são críticos: fratura simples de
    // costela, fratura vertebral estável sem retropulsão, fraturas não complicadas, crônicos/degenerativos, incidentais e quadros
    // inflamatórios (apendicite/colecistite/diverticulite/abscesso) compatíveis com a indicação (inclusive "dor abdominal a esclarecer").
    const CRITICOS = ['pneumoperitonio', 'perfuracao de visc', 'pneumotorax hipertensivo', 'pneumotorax volumoso', 'disseccao', 'sindrome aortica aguda',
        'tromboembolismo pulmonar', 'embolia pulmonar', 'hemorragia subaracnoide', 'hemorragia intraparenquimatosa', 'hematoma subdural', 'hematoma extradural',
        'hematoma epidural', 'hemorragia intracraniana', 'herniacao', 'hidrocefalia aguda', 'compressao medular', 'tamponamento', 'hemoperitonio',
        'sangramento ativo', 'extravasamento ativo', 'isquemia mesenterica', 'volvo', 'torcao testicular', 'torcao ovariana', 'torcao anexial',
        'ectopica rota', 'aneurisma roto', 'ruptura de aneurisma', 'rotura de aneurisma', 'fratura instavel', 'torax instavel'];
    const CRIT_POLITICA = `ACHADO CRÍTICO (protocolo do serviço — só cobre a marcação "Resultado crítico" nestes casos): AVC agudo/oclusão arterial; hemorragia intracraniana aguda; herniação; hidrocefalia aguda; compressão medular; pneumotórax hipertensivo ou volumoso; síndrome aórtica aguda/rotura de aneurisma; TEP agudo; tamponamento; pneumoperitônio/perfuração; hemoperitônio/sangramento ativo; isquemia mesentérica; obstrução em alça fechada/volvo; gestação ectópica rota; torção ovariana ou testicular; fratura INSTÁVEL de coluna ou pelve; tórax instável; tubo/cateter mal posicionado. Apendicite, colecistite, diverticulite e abscesso SÓ são críticos quando incompatíveis com a indicação (ex.: pedido por nefrolitíase e laudo com apendicite); com indicação compatível ou inespecífica ("dor abdominal", "abdome agudo") NÃO são críticos. NÃO são críticos: fratura simples de costela, fratura vertebral estável sem retropulsão, fraturas não complicadas, alterações crônicas/degenerativas, achados incidentais. Nunca cobre "Resultado crítico" fora desta lista.`;
    // ---------- Referências do serviço (tabela Bersch validada + ESUR-SPIWG 2024 para testículo) ----------
    // Regra: só confere a medida que está escrita; se a medida não foi informada, não diz nada.
    // Aponta (atenção) quando o valor está fora da referência e a alteração não aparece na frase nem na impressão,
    // ou quando o laudo afirma uma alteração que a própria medida não sustenta (campo "inv").
    const MED_RE = /(\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?){0,2})\s*(cm³|cm3|ml|mL|cc|mm²|mm2|cm²|cm2|cm|mm)(?![a-z0-9²³])/i;
    const BLOQ_REF = /cist|n[óo]dul|c[áa]lcul|les[ãa]o|imagem|forma[çc][ãa]o|massa|cole[çc][ãa]o|par[êe]nquima|cortical|cortex|c[óo]rtex|pelve|pielo|espessura|parede|ectasi|dilata|abscess|linfonod|hemangiom|calcifica|fluxo|velocidade|[íi]ndice/i;
    const ehEx = (c, re) => re.test(norm(c.exame));
    const REFS_SERVICO = [
        { nome: 'Rim', org: '\\brim (?:direito|esquerdo)\\b', tipo: 'lin', pega: 'max', un: 'cm', min: 9, max: 13, ref: '9–13 cm', gap: 220,
          alt: /aumentad|reduzid|nefromegalia|atr[óo]fic|redu[çc][ãa]o (?:volum|dimens)|dimens[õo]es (?:aumentadas|reduzidas)|assim[ée]tric|pequeno|transplant|rim [úu]nico|vic[áa]ri|hipertrofia compensat/i },
        { nome: 'Baço', org: '\\bba[çc]o\\b', tipo: 'lin', pega: 'max', un: 'cm', max: 12, ref: 'até 12 cm (longitudinal)', gap: 160, alt: /esplenomegalia|aumentad|limite superior/i },
        { nome: 'Lobo hepático direito', org: '\\blobo (?:hep[áa]tico )?direito\\b', tipo: 'lin', pega: 'first', un: 'cm', max: 15, ref: '≤ 15 cm', ex: /abdom|figado|hepat|superior/, nex: /tireo|tiroi|pulm|torax/, alt: /hepatomegalia|aumentad|limite superior/i },
        { nome: 'Lobo hepático esquerdo', org: '\\blobo (?:hep[áa]tico )?esquerdo\\b', tipo: 'lin', pega: 'first', un: 'cm', max: 10, ref: '≤ 10 cm', ex: /abdom|figado|hepat|superior/, nex: /tireo|tiroi|pulm|torax/, alt: /hepatomegalia|aumentad|limite superior/i },
        { nome: 'Hepatocolédoco', org: '\\b(?:hepatocol[ée]doco|col[ée]doco|via biliar principal)\\b', tipo: 'lin', pega: 'first', un: 'mm', maxFn: c => (c.idade > 60 ? Math.min(10, 6 + Math.floor((c.idade - 60) / 10)) : 6), ref: '≤ 6 mm (+1 mm/década após 60 anos, máx. 10)', bloq: /cist|n[óo]dul|c[áa]lcul|les[ãa]o|imagem|massa/i,
          alt: /dilata|ectasi|aumentad|colecistectom|coledocolit|obstru/i, inv: /dilata[çc][ãa]o (?:das vias biliares|do (?:hepato)?col[ée]doco)|col[ée]doco dilatado|hepatocol[ée]doco dilatado/i },
        { nome: 'Veia porta', org: '\\bve(?:ia)? porta\\b', tipo: 'lin', pega: 'first', un: 'mm', max: 12, ref: '≤ 12 mm', bloq: /trombo|velocidade|fluxo/i, alt: /hipertens[ãa]o portal|dilata|ectasi|aumentad/i },
        { nome: 'Parede da vesícula', org: '\\bparedes? (?:da )?(?:ves[íi]cula|vesicular)\\b|\\bves[íi]cula biliar[^.;\\n]{0,60}?paredes?', tipo: 'lin', pega: 'first', un: 'mm', max: 3, ref: '≤ 3 mm', bloq: /c[áa]lcul|p[óo]lip|les[ãa]o|imagem/i, alt: /espessad|colecistite|edema|contra[íi]da|colabad|p[óo]s-?prandial|jejum/i },
        { nome: 'Wirsung', org: '\\b(?:wirsung|ducto pancre[áa]tico(?: principal)?)\\b', tipo: 'lin', pega: 'first', un: 'mm', max: 2, ref: '≤ 2 mm', alt: /dilata|ectasi|proeminente|aumentad/i },
        { nome: 'Aorta abdominal', org: '\\baorta(?: abdominal)?\\b', tipo: 'lin', pega: 'max', un: 'mm', max: 30, ref: 'aneurisma > 30 mm', grupo: 'aorta', ex: /abdom|aort|retroperit|doppler/, alt: /aneurism/i, inv: /aneurisma (?:da )?aorta|aneurisma fusiforme|aneurisma sacular/i },
        { nome: 'Aorta abdominal', org: '\\baorta(?: abdominal)?\\b', tipo: 'lin', pega: 'max', un: 'mm', max: 24, ref: 'ectasia 24–30 mm', grupo: 'aorta', ex: /abdom|aort|retroperit|doppler/, alt: /ect[áa]si|aneurism|dilata/i },
        { nome: 'Próstata (volume)', org: '\\bpr[óo]stata\\b', tipo: 'vol', pega: 'first', un: 'cm³', max: 30, ref: '< 30 cm³', gap: 220, alt: /aumentad|hiperplasia|hpb|prostatomegalia|volume aumentado/i },
        { nome: 'Tireoide (volume total)', org: '\\bvolume (?:total|glandular|tireoidiano)|\\bvolume (?:da )?(?:gl[âa]ndula|tire[óo]ide)', tipo: 'vol', pega: 'first', un: 'cm³', min: 6, max: 15, ref: '6–15 cm³ (adulto)', adulto: true, ex: /tireo|tiroi|cervical|pescoc/, alt: /b[óo]cio|aumentad|reduzid|atr[óo]fi|redu[çc][ãa]o volum/i },
        { nome: 'Apêndice', org: '\\bap[êe]ndice(?: cecal| vermiforme)?\\b', tipo: 'lin', pega: 'first', un: 'mm', max: 6, ref: '≤ 6 mm', bloq: /apendicol|c[áa]lcul|les[ãa]o|cole[çc]/i, alt: /apendicite|espessad|aumentad|distendid|inflama/i },
        { nome: 'Nervo mediano (área)', org: '\\bnervo mediano\\b', tipo: 'area', pega: 'first', un: 'mm²', max: 10, maxBifido: 12, ref: '≤ 10 mm² (12 mm² se bífido)', gap: 220, bloq: /^$/, alt: /neuropatia|t[úu]nel do carpo|espessad|aumentad|edema|compress/i },
        { nome: 'Nervo ulnar (área)', org: '\\bnervo ulnar\\b', tipo: 'area', pega: 'first', un: 'mm²', max: 9, ref: '≤ 9 mm² (cotovelo)', gap: 220, bloq: /^$/, alt: /neuropatia|t[úu]nel cubital|espessad|aumentad|edema|compress|subluxa/i },
        { nome: 'Testículo (volume)', org: '\\btest[íi]culo (?:direito|esquerdo)\\b', tipo: 'vol', pega: 'first', un: 'cm³', minLado: { direito: 12, esquerdo: 11 }, ref: 'hipotrofia: direito < 12 mL, esquerdo < 11 mL (ESUR-SPIWG 2024, elipsoide 0,52)', adulto: true, gap: 220, alt: /hipotrof|atr[óo]fi|reduzid|pequen|hipoplas|redu[çc][ãa]o volum/i },
        { nome: 'ILA', org: '\\b(?:ila|[íi]ndice de l[íi]quido amni[óo]tico)\\b', tipo: 'lin', pega: 'first', un: 'cm', min: 5, max: 24, ref: '5–24 cm', ex: /obst|gesta|morfol|perfil biof/, bloq: /^$/, alt: /oligo[âa]mni|oligodr|polidr|poli-?h?idr|reduzid|aumentad/i },
        { nome: 'Maior bolsão vertical', org: '\\bmaior bols[ãa]o(?: vertical)?\\b', tipo: 'lin', pega: 'first', un: 'cm', min: 2, max: 8, ref: '2–8 cm', ex: /obst|gesta|morfol|perfil biof/, bloq: /^$/, alt: /oligo[âa]mni|oligodr|polidr|poli-?h?idr|reduzid|aumentad/i },
        { nome: 'Colo uterino (cervicometria)', org: '\\b(?:colo uterino|comprimento (?:do colo|cervical)|cervicometria)\\b', tipo: 'lin', pega: 'first', un: 'mm', min: 25, ref: '≥ 25 mm', ex: /obst|gesta|morfol|cervicom/, bloq: /^$/, alt: /curto|encurt|incompet|afunil|risco (?:aumentado )?de (?:parto )?prematur/i }
    ];
    function refsServico(c, t, imp) {
        const out = [], grupos = new Set();
        const ex = norm(c.exame);
        REFS_SERVICO.forEach(r => {
            if (r.ex && !r.ex.test(ex)) return;
            if (r.nex && r.nex.test(ex)) return;
            if (r.adulto && !(c.idade >= 18)) return;
            if (r.grupo && grupos.has(r.grupo)) return;
            const reO = new RegExp(r.org, 'gi'); let m;
            while ((m = reO.exec(t))) {
                const ini = m.index + m[0].length;
                let resto = t.slice(ini, ini + (r.gap || 120));
                const fim = resto.search(/\.(?:\s|$)|;|\n/); if (fim >= 0) resto = resto.slice(0, fim);
                // acha a primeira medida do TIPO certo (linear/área/volume) depois do órgão
                let mm = null, base = 0;
                while (base < resto.length) {
                    const x = MED_RE.exec(resto.slice(base)); if (!x) break;
                    const u = x[2].toLowerCase(), tp = /³|3|ml|cc/.test(u) ? 'vol' : /²|2/.test(u) ? 'area' : 'lin';
                    if (tp === r.tipo) { mm = { m: x, idx: base + x.index, u }; break; }
                    if (r.tipo === 'lin') break; // linear: a primeira medida tem de ser a do órgão
                    base += x.index + x[0].length;
                }
                if (!mm) continue;
                const antes = resto.slice(0, mm.idx);
                if ((r.bloq || BLOQ_REF).test(antes)) continue;
                const nums = mm.m[1].split(/\s*[x×]\s*/).map(numBR).filter(Number.isFinite);
                if (!nums.length) continue;
                let v = r.pega === 'max' ? Math.max(...nums) : nums[0];
                const u = mm.u;
                if (r.tipo === 'lin') { if (r.un === 'cm' && u === 'mm') v /= 10; if (r.un === 'mm' && u === 'cm') v *= 10; }
                if (r.tipo === 'area') { if (r.un === 'mm²' && /cm/.test(u)) v *= 100; }
                const frase = t.slice(Math.max(0, t.lastIndexOf('\n', m.index), t.lastIndexOf('. ', m.index) + 1), ini + resto.length);
                let max = r.maxFn ? r.maxFn(c) : r.max, min = r.min;
                if (r.maxBifido && /b[íi]fido/i.test(frase)) max = r.maxBifido;
                if (r.minLado) { const lado = /direito/i.test(m[0]) ? 'direito' : 'esquerdo'; min = r.minLado[lado]; }
                const acima = max != null && v > max + 1e-9, abaixo = min != null && v < min - 1e-9;
                const citado = r.alt.test(frase) || r.alt.test(imp);
                const val = `${String(mm.m[1]).trim()} ${mm.m[2]}`;
                if ((acima || abaixo) && !citado) {
                    out.push({ cat: 'medidas', idx: m.index, msg: `${r.nome}: ${val} está ${acima ? 'acima' : 'abaixo'} da referência do serviço — ${r.ref} — e a alteração não aparece descrita nem na impressão.`, sug: 'Conferir a medida ou citar a alteração.' });
                    if (r.grupo) grupos.add(r.grupo);
                    break;
                }
                if (!acima && !abaixo && r.inv && (r.inv.test(frase) || r.inv.test(imp))) {
                    out.push({ cat: 'corpo_conclusao', idx: m.index, msg: `${r.nome}: o laudo descreve alteração, mas a medida informada (${val}) está dentro da referência — ${r.ref}.`, sug: 'Conferir a medida ou o termo usado.' });
                    if (r.grupo) grupos.add(r.grupo);
                    break;
                }
                if (r.grupo && (acima || abaixo)) { grupos.add(r.grupo); break; }
            }
        });
        return out;
    }
    function regrasLaudo(c) {
        const t = c.texto, tn = norm(t), ex = norm(c.exame), out = [];
        const add = (categoria, gravidade, idx, explicacao, sugestao) => { const it = { categoria, gravidade, trecho: idx >= 0 ? frase(t, idx) : '', explicacao, sugestao: sugestao || '', fontes: ['regra'] }; out.push(it); return it; };
        if (t.length < 30) { add('outro', 'atencao', -1, 'Laudo vazio ou muito curto.', ''); return out; }
        let m = t.match(/\b[Xx]{2,}\b|_{3,}|\[\s*\]|\(\s*\)|\?{2,}/);
        if (m) add('campo_vazio', 'grave', m.index, `Campo de matriz não preenchido (“${m[0]}”).`, 'Preencher ou remover.');
        const fem = /\b(utero|uterin[oa]s?|ovari[oa]s?|endometri[oa]l?|miometri[oa]l?|tubas? uterinas?|colo uterino|anexos uterinos)\b/;
        const masc = /\b(prostat\w*|testicul\w*|testiculo\w*|epididim\w*|vesiculas? seminais|bolsa escrotal|escrot\w*)\b/;
        if (/^MASC/.test(c.sexo)) { const r = tn.match(fem); if (r) add('sexo_anatomia', 'grave', t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(r[0]), `Paciente do sexo masculino com estrutura feminina citada (“${r[0]}”).`, 'Conferir paciente/matriz.'); }
        if (/^FEM/.test(c.sexo)) { const r = tn.match(masc); if (r) add('sexo_anatomia', 'grave', t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(r[0]), `Paciente do sexo feminino com estrutura masculina citada (“${r[0]}”).`, 'Conferir paciente/matriz.'); }
        // lateralidade pelo nome do exame
        const exD = /\b(direit[oa]|mid|msd|d)\b/.test(ex), exE = /\b(esquerd[oa]|mie|mse)\b/.test(ex) || /\s e (ap|pa|perfil|obliqu)/.test(ex);
        const tl = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (exD && !exE && !/bilateral/.test(ex)) { const i = tl.search(/\besquerd[oa]s?\b/); if (i >= 0) add('lateralidade', 'atencao', i, 'Exame do lado DIREITO e o texto cita “esquerdo(a)”.', 'Conferir o lado.'); }
        if (exE && !exD && !/bilateral/.test(ex)) { const i = tl.search(/\bdireit[oa]s?\b/); if (i >= 0) add('lateralidade', 'atencao', i, 'Exame do lado ESQUERDO e o texto cita “direito(a)”.', 'Conferir o lado.'); }
        // v1.25.1 — negação na FRASE inteira (desde o último ponto/quebra), não só 60 letras antes:
        // "Ausência de efeito de massa, desvio … ou sinais de herniação" e "obtidas sem o uso do meio de contraste iodado endovenoso"
        // são negativas. Uma ressalva depois da negação ("porém", "exceto", "mas") desfaz a negação.
        const negado = (txt, i) => {
            const ini = Math.max(txt.lastIndexOf('.', i - 1), txt.lastIndexOf('\n', i - 1), txt.lastIndexOf(';', i - 1), i - 250);
            const trecho = txt.slice(ini + 1, i);
            const m = trecho.match(/\b(sem|nao|ausencia|ausentes?|afastad|exclu|negativ|descart|nenhum|inexist)\w*/g);
            if (!m) return false;
            const ultimaNeg = Math.max(...m.map(w => trecho.lastIndexOf(w)));
            return !/\b(porem|mas|exceto|entretanto|contudo|todavia|salvo)\b/.test(trecho.slice(ultimaNeg));
        };
        const buscaNaoNegada = (txt, re) => { const g = new RegExp(re.source, 'g'); let m; while ((m = g.exec(txt))) { if (!negado(txt, m.index)) return m.index; } return -1; };
        // contraste
        if (/sem contraste/.test(ex)) { const i = buscaNaoNegada(tl, /apos (a )?(injecao|administracao)|contraste (iodado )?(endovenoso|intravenoso)|fases? (arterial|portal|venosa|tardia|de equilibrio|excretora)|realce (pelo|ao|apos o) (meio de )?contraste/); if (i >= 0) add('exame_texto', 'grave', i, 'Exame SEM contraste, mas o texto descreve uso de contraste/fases.', 'Conferir técnica e matriz.'); }
        if (/com contraste/.test(ex)) { const i = tl.search(/sem (a )?(injecao|uso|administracao) (de|do) (meio de )?contraste|\bsem contraste\b/); if (i >= 0) add('exame_texto', 'atencao', i, 'Exame COM contraste, mas o texto diz “sem contraste”.', 'Conferir técnica.'); }
        // unidades implausíveis (linear: não pega cm³/cm²/cm3/cm/s)
        const reU = /(\d+(?:[.,]\d+)?)\s*(mm|cm)(?![³²0-9a-z])(?!\s*\/\s*s)/gi;
        let u;
        while ((u = reU.exec(t))) { const v = numBR(u[1]), un = u[2].toLowerCase(); if ((un === 'cm' && v > 40) || (un === 'mm' && v > 300)) { add('medidas', 'atencao', u.index, `Medida implausível: ${u[0]}.`, 'Conferir a unidade (mm × cm).'); break; } }
        // unidade × grandeza: volume em cm³/mL; área em mm²/cm²
        let g;
        if ((g = /volume[^.\n]{0,60}?\d+(?:[.,]\d+)?\s*(cm²|cm2|mm²|mm2)(?![0-9])/i.exec(t))) add('medidas', 'atencao', g.index, `Volume com unidade de área (${g[1]}).`, 'Volume em cm³ ou mL.');
        if ((g = /(?<![a-zà-ú])[áa]rea[^.\n]{0,60}?\d+(?:[.,]\d+)?\s*(cm³|cm3|mm³|mm3|ml)(?![0-9a-z])/i.exec(t))) add('medidas', 'atencao', g.index, `Área com unidade de volume (${g[1]}).`, 'Área em mm² ou cm².');
        if ((g = /(?<![a-zà-ú])[áa]rea (?:seccional |transversa |de sec[çc][ãa]o )?[^.\n]{0,40}?(\d+(?:[.,]\d+)?)\s*(mm|cm)(?![²³23a-z])/i.exec(t))) add('medidas', 'atencao', g.index, `Área com unidade linear (${g[1]} ${g[2]}).`, `Área em ${g[2]}².`);
        // volume elipsoide (0,52 ou 0,523), tolerando o arredondamento das medidas e do volume
        const casas = s => { const p = String(s).split(/[.,]/)[1]; return p ? p.length : 0; };
        const reV = /(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b[^.\n]{0,90}?(\d+(?:[.,]\d+)?)\s*(cm³|cm3|ml|mL|cc)/gi; let v;
        while ((v = reV.exec(t))) {
            const f = v[4].toLowerCase() === 'mm' ? 0.1 : 1;
            const dims = [v[1], v[2], v[3]].map(x => ({ d: numBR(x) * f, e: 0.5 * Math.pow(10, -casas(x)) * f }));
            const vol = numBR(v[5]), ev = 0.5 * Math.pow(10, -casas(v[5]));
            const prod = dims.reduce((p, x) => p * x.d, 1);
            const vmin = dims.reduce((p, x) => p * Math.max(0, x.d - x.e), 1) * 0.52 * 0.97 - ev;
            const vmax = dims.reduce((p, x) => p * (x.d + x.e), 1) * 0.523 * 1.03 + ev;
            if (vol < vmin || vol > vmax) {
                const certo = fmt(prod * 0.523, 1), fator = prod > 0 ? fmt(vol / prod, 2) : '–';
                const r = add('medidas', 'grave', v.index, `Volume ${v[5]} ${v[6]} não confere com ${v[1]} × ${v[2]} × ${v[3]} ${v[4]}: com 0,523 dá ${certo} cm³ (o valor escrito equivale a fator ${fator}).`, `Corrigir para ${certo} ${v[6]}.`);
                const bV = v[0].slice(v[0].lastIndexOf(v[5])); r.fix = { busca: bV, troca: certo + bV.slice(v[5].length) };
            }
        }
        if (/doppler/.test(ex) && !/fluxo|doppler|espectr|velocidade|refluxo|\bir\b|\bip\b|resistividade|pulsatilidade|perviedade|pervi[ao]/.test(tl)) add('exame_texto', 'atencao', -1, 'Exame de Doppler sem descrição de fluxo/velocidades no texto.', 'Conferir se a matriz é a de Doppler.');
        if (t.length > 200 && !/impress[aã]o|conclus[aã]o|opini[aã]o/i.test(t)) add('corpo_conclusao', 'atencao', -1, 'Não encontrei Impressão/Conclusão no laudo.', '');
        // ---- PATCH do serviço: esvaziamento vesical (resíduo pelo volume absoluto; ≥ 80% eliminado = satisfatório) ----
        const iImp = (() => { const m = /impress[aã]o|conclus[aã]o/i.exec(t); return m ? m.index : -1; })();
        const corpo = iImp >= 0 ? t.slice(0, iImp) : t, imp = iImp >= 0 ? t.slice(iImp) : '';
        const reVol = '(\\d+(?:[.,]\\d+)?)\\s*(?:ml|mL|cm³|cm3|cc)';
        const pre = new RegExp('pr[ée][- ]?miccional[^.\\n]{0,80}?' + reVol, 'i').exec(corpo);
        const posTodos = [...corpo.matchAll(new RegExp('(?:p[óo]s[- ]?miccional|residual)[^.\\n]{0,80}?' + reVol, 'gi'))];
        const pos = posTodos.length ? posTodos[posTodos.length - 1] : null; // várias tentativas: vale a última
        const naoUrinou = /n[ãa]o consegui[ur] (realizar a etapa|urinar)|n[ãa]o realizou a etapa p[óo]s/i.test(t);
        const catRes = ml => ml <= 30 ? 'desprezível' : ml <= 80 ? 'pequeno' : ml <= 150 ? 'moderado' : ml <= 300 ? 'acentuado' : 'muito acentuado';
        if (naoUrinou && /incomplet/i.test(t)) add('padrao', 'grave', t.search(/incomplet/i), 'Paciente não urinou, mas o laudo classifica o esvaziamento como incompleto.', 'Usar “Estudo pós-miccional não realizado.” (padrão do serviço).');
        if (pos && !naoUrinou) {
            const vPos = numBR(pos[1]), cat = catRes(vPos);
            const trechoRes = (s, base) => { const re = /(?:res[ií]duo|residual)[^.\n]{0,120}?\b(muito acentuado|acentuado|moderado|pequeno|desprez[ií]vel)\b/ig; let m, ult = null; while ((m = re.exec(s))) ult = { cat: m[1].toLowerCase(), idx: base + m.index + m[0].length - m[1].length, txt: m[1] }; return ult; };
            const norma = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '');
            [[trechoRes(corpo, 0), 'análise'], [trechoRes(imp, Math.max(iImp, 0)), 'impressão']].forEach(([r, onde]) => {
                if (r && norma(r.cat) !== norma(cat)) {
                    const it = add('padrao', 'grave', r.idx, `Resíduo de ${pos[1]} mL é “${cat}” (0–30 desprezível · 31–80 pequeno · 81–150 moderado · 151–300 acentuado · > 300 muito acentuado), mas a ${onde} diz “${r.txt}”.`, `Trocar por “${cat}”.`);
                    it.fix = { busca: r.txt, troca: cat, pos: r.idx };
                }
            });
            if (pre) {
                const vPre = numBR(pre[1]);
                if (vPre > 0 && vPos <= vPre) {
                    const elim = vPre - vPos, pct = Math.round(elim / vPre * 100), satisf = pct >= 80;
                    const mP = /(?:cerca de|aproximadamente|~)?\s*(\d{1,3})\s*%/.exec(corpo);
                    if (mP && Math.abs(Number(mP[1]) - pct) > 1) { const it = add('padrao', 'grave', mP.index, `Percentual eliminado: (${pre[1]} − ${pos[1]}) ÷ ${pre[1]} = ${pct}%, mas o laudo diz ${mP[1]}%.`, `Corrigir para ${pct}%.`); const bP = mP[0].slice(mP[0].indexOf(mP[1])); it.fix = { busca: bP, troca: bP.replace(mP[1], String(pct)) }; }
                    const mE = /elimina[çc][ãa]o de (?:aproximadamente |cerca de )?(\d+(?:[.,]\d+)?)\s*(?:ml|mL)/i.exec(corpo);
                    if (mE && Math.abs(numBR(mE[1]) - elim) > 2) { const certo = Number.isInteger(elim) ? String(elim) : fmt(elim, 1); const it = add('padrao', 'grave', mE.index, `Volume eliminado: ${pre[1]} − ${pos[1]} = ${certo} mL, mas o laudo diz ${mE[1]} mL.`, `Corrigir para ${certo} mL.`); it.fix = { busca: mE[1], troca: certo, pos: mE.index + mE[0].indexOf(mE[1]) }; }
                    const mS = /esvaziamento vesical (satisfat[óo]rio|incompleto)/ig; let s;
                    while ((s = mS.exec(t))) {
                        const disse = /satisf/i.test(s[1]);
                        if (disse !== satisf) { const it = add('padrao', 'grave', s.index, `Eliminou ${pct}% do volume inicial → esvaziamento ${satisf ? 'SATISFATÓRIO (≥ 80%)' : 'INCOMPLETO (< 80%)'}, mas o laudo diz “${s[1]}”.`, `Trocar por “${satisf ? 'satisfatório' : 'incompleto'}”.`); it.fix = { busca: s[1], troca: satisf ? 'satisfatório' : 'incompleto', pos: s.index + s[0].length - s[1].length }; }
                    }
                }
            }
            if (imp && /res[ií]duo[^.\n]{0,80}?\d+(?:[.,]\d+)?\s*(?:ml|mL|%)/i.test(imp)) add('padrao', 'atencao', iImp + imp.search(/res[ií]duo/i), 'Volume/percentual do resíduo na IMPRESSÃO (padrão do serviço: só a classificação).', 'Deixar os números na ANÁLISE.');
        }
        // ---- PATCH do serviço: doença de depósito hepático ----
        const tlx = tl;
        if (/aumento (difuso )?da ecogenicidade|hiperecogenicidade/.test(tlx) && /hepatopatia cronica|cirrose|fibrose/.test(tlx)
            && !/(contornos? (irregular|lobulad|nodular)|superficie (irregular|nodular)|hipertrofia do (lobo )?caudado|esplenomegalia|ascite|colaterais|circulacao colateral|recanaliza)/.test(tlx))
            add('padrao', 'atencao', tlx.search(/hepatopatia cronica|cirrose|fibrose/), 'Hepatopatia crônica/cirrose/fibrose citada com base só no aumento da ecogenicidade (sem outros sinais morfológicos descritos).', 'Usar “doença de depósito, mais comumente relacionada à esteatose” se só houver aumento da ecogenicidade.');
        let gr;
        if ((gr = /esteatose[^.\n]{0,60}?(?:grau\s*(?:ii|iii|2|3)\b|moderad|acentuad)|grau\s*(?:ii|iii|2|3)\b[^.\n]{0,40}?esteatose/.exec(tlx)) && !/atenua/.test(tlx))
            add('padrao', 'atencao', gr.index, 'Esteatose graduada como moderada/acentuada sem descrição de atenuação posterior do feixe.', 'Grau II/III exige atenuação e redução da visualização das estruturas profundas (padrão do serviço).');
        // ---- Referências do serviço (aprovadas 15/10/2026): confere só medida INFORMADA; nunca cobra medida ausente ----
        refsServico(c, t, iImp >= 0 ? imp : '').forEach(x => add(x.cat, 'atencao', x.idx, x.msg, x.sug));
        if (!c.critico) {
            for (const k of CRITICOS) {
                let i = -1, de = 0;
                // todas as ocorrências; só conta a não negada e (subdural) não crônica
                while ((i = tl.indexOf(k, de)) >= 0 && (negado(tl, i) || (k === 'hematoma subdural' && /cronic/.test(tl.slice(i, i + 60))))) de = i + k.length;
                if (i < 0) continue;
                add('critico', 'atencao', i, `Termo de achado crítico (“${k}”) com “Resultado Crítico” desmarcado.`, 'Marcar Resultado Crítico se for o caso.'); break;
            }
        }
        return out;
    }

    // ---------- IA ----------
    const REV_BASE = `Você é um REVISOR DE SEGURANÇA de laudos radiológicos em português do Brasil. Objetivo único: encontrar ERROS DE INCOMPATIBILIDADE que possam prejudicar o paciente ou expor o médico. NÃO comente estilo, redação aceitável, nem dê recomendações clínicas genéricas.
Procure:
1. lateralidade (direito/esquerdo) incoerente entre nome do exame, corpo e conclusão;
2. anatomia incompatível com sexo ou idade;
3. achado relevante descrito no corpo e ausente na impressão/conclusão; conclusão que cita algo não descrito ou contradiz o corpo;
4. medidas divergentes entre corpo e conclusão, unidade errada (mm × cm), valor implausível; grandeza × unidade: linear em mm/cm, ÁREA em mm²/cm² (ex.: nervo mediano em mm²), VOLUME em cm³/mL, velocidade em cm/s — aponte volume com unidade de área/linear e vice-versa; volume elipsoide = D1 × D2 × D3 × 0,52 (ou 0,523) — aceite a diferença explicada pelo arredondamento das medidas a 1 casa decimal (cerca de ±3–5%); outro fator (0,65, 0,71…) é erro;
5. classificações (TI-RADS, BI-RADS, O-RADS, Bosniak, LI-RADS, Fleischner, Lung-RADS etc.) incoerentes com a descrição;
6. texto de outra região/exame (matriz errada) ou técnica incompatível com o nome do exame;
7. contradição interna (“sem X” e depois “X presente”), frase truncada ou palavra trocada pelo ditado que muda o sentido;
8. campos de matriz não preenchidos (XX, ___).
Regras: aponte só o que está no texto; NÃO invente achados; NUNCA aponte medida ausente ou não informada (o médico não mede tudo) — só confira as medidas escritas; "trecho" deve ser cópia LITERAL e curta (até 120 caracteres) do laudo, para localizar; se estiver coerente, devolva lista vazia. Gravidade: "grave" = erro factual ou que pode mudar conduta (lado, sexo, medida, achado omitido na conclusão, técnica errada); "atencao" = provável erro menor ou ambíguo. No máximo 8 itens, mais importantes primeiro. Explicação e sugestão curtas (no máximo 25 palavras cada).`;
    const REV_ESP_CRIT = '\n' + CRIT_POLITICA;
    const REV_ESP = {
        US: `Contexto: ULTRASSONOGRAFIA. Atenção especial: órgãos descritos coerentes com a região do exame; Doppler — lado, vasos/segmentos, refluxo/trombose/estenose coerentes com a conclusão, IR/IP e velocidades plausíveis; carótidas — grau de estenose coerente com VPS/VDF/razão (consenso SRU); tireoide — TI-RADS de cada nódulo coerente com composição/ecogenicidade/forma/margens/focos e tamanho; volumes (tireoide, próstata, ovário, útero, bexiga/resíduo) coerentes com as medidas; obstétrico — biometria, idade gestacional e peso coerentes; mama — BI-RADS coerente.`,
        TC: `Contexto: TOMOGRAFIA COMPUTADORIZADA. Atenção especial: técnica (sem/com contraste, fases) coerente com o nome do exame; achados agudos (hemorragia, pneumoperitônio, dissecção, TEP, isquemia, fratura, obstrução) obrigatoriamente na conclusão; níveis vertebrais e segmentos coerentes entre corpo e conclusão; nódulos — medida e conduta (Fleischner/Lung-RADS) coerentes; Bosniak/LI-RADS coerentes; lateralidade de lesões; incidental relevante sem menção na conclusão.`,
        GERAL: `Contexto: exame de imagem.`
    };
    // Padrão do serviço (PATCH ABDOME/URO 2026-09, ativo por decisão do usuário) — enviado só quando o exame envolve abdome/vias urinárias/pelve
    const REV_PATCH_URO = `PADRÃO DO SERVIÇO (prevalece sobre tabelas genéricas) — use categoria "padrao" quando violado:
• Resíduo pós-miccional pelo volume absoluto: 0–30 mL desprezível; 31–80 pequeno; 81–150 moderado; 151–300 acentuado; > 300 muito acentuado.
• Esvaziamento: % eliminado = (pré − pós) ÷ pré × 100; ≥ 80% = satisfatório; < 80% = incompleto. A categoria do resíduo é independente do %.
• Várias tentativas: vale o ÚLTIMO pós-miccional, calculado sobre o pré-miccional inicial.
• Não conseguiu urinar: "Estudo pós-miccional não realizado" — nunca classificar como incompleto.
• IMPRESSÃO sem números/percentuais do resíduo: "Resíduo vesical pós-miccional <categoria>, com esvaziamento vesical satisfatório/incompleto."
• Fígado: aumento da ecogenicidade = "doença de depósito, mais comumente relacionada à esteatose hepática"; Grau I/II/III só com os descritores correspondentes (ecogenicidade; atenuação posterior; visualização dos vasos e do diafragma); NÃO chamar hepatopatia crônica/cirrose/fibrose só pela ecogenicidade (exige contornos/superfície irregular, hipertrofia do caudado, sinais de hipertensão portal etc.); hepatomegalia em linha separada; "limite superior da normalidade" não é hepatomegalia.`;
    // Referências aprovadas pelo usuário (15/10/2026) — vão só no exame correspondente (economia de tokens/latência)
    const REV_REFS = [
        { ex: /tireo|tiroi/, txt: `ACR TI-RADS 2017 (conduta do serviço = ACR): pontos — composição (cístico/espongiforme 0, misto 1, sólido 2), ecogenicidade (anecoico 0, hiper/iso 1, hipo 2, muito hipo 3), forma (mais alto que largo 3), margens (lisa/mal definida 0, lobulada/irregular 2, extensão extratireoidiana 3), focos (macro 1, periféricos 2, puntiformes 3). TR1 0 · TR2 2 · TR3 3 · TR4 4–6 · TR5 ≥ 7. PAAF: TR3 ≥ 2,5 cm; TR4 ≥ 1,5 cm; TR5 ≥ 1,0 cm. Seguimento: TR3 ≥ 1,5; TR4 ≥ 1,0; TR5 ≥ 0,5 cm. Aponte categoria incoerente com os descritores e conduta incoerente com categoria/tamanho. Volume tireoidiano adulto 6–15 cm³ (elipsoide 0,52).` },
        { ex: /mama|mamar/, txt: `BI-RADS 5ª ed.: 0 incompleto · 1 negativo · 2 benigno · 3 provavelmente benigno (≤ 2%, seguimento curto) · 4A/4B/4C suspeito (biópsia) · 5 altamente sugestivo (≥ 95%) · 6 malignidade comprovada. Descritores de suspeição (forma irregular, orientação não paralela, margem não circunscrita: indistinta, angulada, microlobulada, espiculada) com categoria 2/3 = incoerente.` },
        { ex: /pelv|transvag|endovag|anex|ovari|ginec|utero/, txt: `O-RADS US v2022: 1 normal (folículo ≤ 3 cm, corpo lúteo) · 2 quase certamente benigno (cisto simples/unilocular liso < 10 cm; hemorrágico, dermoide, endometrioma típicos < 10 cm) · 3 baixo risco (unilocular/bilocular liso ≥ 10 cm; multilocular liso < 10 cm sem fluxo/fluxo leve; sólido liso) · 4 intermediário (multilocular irregular ou fluxo moderado; unilocular com componente sólido/1–3 papilas) · 5 alto risco (≥ 4 papilas; sólido irregular; ascite/nódulos peritoneais). Volume ovariano menacme 3–10 cm³, menopausa 1–5; endométrio menopausa < 4 mm.` },
        { ex: /rim|rins|renal|urotom|abdom|urinar/, tipo: 'TC', txt: `Bosniak 2019 (TC/RM): I parede fina lisa sem septo/calcificação/realce, −9 a 20 UH · II até 3 septos finos, calcificação, hiperatenuante ≥ 70 UH sem contraste · IIF parede/septo minimamente espessado (3 mm) liso com realce ou ≥ 4 septos finos · III parede/septo ≥ 4 mm ou irregular com realce · IV nódulo com realce. Aponte categoria incoerente com a descrição.` },
        { ex: /torax|pulm|tórax/, tipo: 'TC', txt: `Fleischner 2017 (nódulo incidental, ≥ 35 anos): sólido único < 6 mm nada (alto risco: TC 12 m opcional); 6–8 mm TC 6–12 m; > 8 mm TC 3 m, PET-CT ou biópsia. Múltiplos ≥ 6 mm TC 3–6 m. Vidro fosco ≥ 6 mm TC 6–12 m e depois a cada 2 anos até 5 anos; parte sólida ≥ 6 mm TC 3–6 m. Aponte conduta incoerente com tamanho/tipo.` },
        { ex: /carot|vertebr|cervical.*doppler|doppler.*cervical/, txt: `Carótidas (DIC 2015/SRU): ACI < 50%: VPS < 140, VDF < 40, ACI/ACC < 2,0 · 50–69%: VPS 140–230, VDF 40–100, razão 2,0–4,0 · ≥ 70%: VPS > 230, VDF > 100, razão > 4,0. Placa: EMI > 1,5 mm ou protrusão > 0,5 mm. Vertebral: < 50% VPS ≥ 85; 50–69% ≥ 140; > 70% ≥ 210 cm/s. Aponte grau de estenose incoerente com as velocidades.` },
        { ex: /abdom|rins|renal|figado|hepat|vias urin|prostat|pelv|aort|retroperit/, tipo: 'US', txt: `Referências do serviço (só confira medidas INFORMADAS): rim 9–13 cm; baço até 12 cm; lobo hepático D ≤ 15 cm, E ≤ 10 cm; hepatocolédoco ≤ 6 mm (+1 mm/década após 60, máx. 10); v. porta ≤ 12 mm; parede da vesícula ≤ 3 mm; Wirsung ≤ 2 mm; aorta ≤ 24 mm (ectasia 24–30, aneurisma > 30); a. ilíaca ≤ 12 mm (ectasia 12–15, aneurisma > 15); próstata < 30 cm³; apêndice ≤ 6 mm; hidronefrose Grignon I < 10 mm · II 10–15 · III > 15 ou pequena dilatação calicinal · IV moderada (córtex > 2 mm) · V grande (córtex < 2 mm).` },
        { ex: /escrot|testic|bolsa/, txt: `Testículo: volume pelo elipsoide 0,52 (ESUR-SPIWG 2024); hipotrofia no adulto: direito < 12 mL, esquerdo < 11 mL. Varicocele: veias > 2 mm com refluxo > 1 s à Valsalva.` },
        { ex: /obst|gesta|morfol/, txt: `Obstetrícia: ILA 5–24 cm; maior bolsão vertical 2–8 cm; colo ≥ 25 mm; gestação inviável: DMSG ≥ 25 mm sem embrião ou CCN ≥ 7 mm sem BCF.` },
        { ex: /punho|cotovel|nervo|carpo|cubital|membro superior/, txt: `Nervos (área em mm²): mediano ≤ 10 mm² (12 se bífido); ulnar no cotovelo ≤ 9 mm². Área com unidade linear ou de volume é erro.` }
    ];
    const refsDoExame = c => { const e = norm(c.exame); return REV_REFS.filter(r => r.ex.test(e) && (!r.tipo || r.tipo === c.tipo)).map(r => r.txt).join('\n'); };
    const ehUro = c => /abdom|rins|renal|vias urin|aparelho urin|bexig|prostat|pelv|retroperit|figado|hepat/.test(norm(c.exame));
    const revSistema = (c, extra) => { const rf = refsDoExame(c); return REV_BASE + REV_ESP_CRIT + '\n' + REV_ESP[c.tipo] + (c.tipo !== 'TC' && ehUro(c) ? '\n' + REV_PATCH_URO : '') + (rf ? '\nREFERÊNCIAS APROVADAS PELO SERVIÇO (use para conferir; não cobre o que não foi medido):\n' + rf : '') + (extra || ''); };
    const REV_CATS = ['lateralidade', 'sexo_anatomia', 'corpo_conclusao', 'medidas', 'classificacao', 'exame_texto', 'redacao_sentido', 'campo_vazio', 'padrao', 'outro'];
    const REV_TOOL = {
        name: 'revisao', description: 'Registra os possíveis erros de incompatibilidade encontrados no laudo (lista vazia se coerente).',
        input_schema: { type: 'object', properties: { achados: { type: 'array', items: { type: 'object', properties: {
            categoria: { type: 'string', enum: REV_CATS }, gravidade: { type: 'string', enum: ['grave', 'atencao'] },
            trecho: { type: 'string' }, explicacao: { type: 'string' }, sugestao: { type: 'string' } }, required: ['categoria', 'gravidade', 'trecho', 'explicacao'] } } }, required: ['achados'] }
    };
    const REV_SCHEMA_GEMINI = { type: 'OBJECT', properties: { achados: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        categoria: { type: 'STRING', enum: REV_CATS }, gravidade: { type: 'STRING', enum: ['grave', 'atencao'] },
        trecho: { type: 'STRING' }, explicacao: { type: 'STRING' }, sugestao: { type: 'STRING' } }, required: ['categoria', 'gravidade', 'trecho', 'explicacao'] } } }, required: ['achados'] };
    function revMensagem(c) {
        return `Modalidade: ${c.tipo === 'TC' ? 'Tomografia computadorizada' : c.tipo === 'US' ? 'Ultrassonografia' : c.mod}
Exame: ${c.exame}
Sexo: ${c.sexo || 'não informado'}
Idade: ${c.idade != null ? c.idade + ' anos' : 'não informada'}
Indicação: ${c.indicacao || 'não informada'}
"Resultado crítico" marcado: ${c.critico ? 'sim' : 'não'}

LAUDO:
${c.texto}`;
    }
    function sessaoNuvemPlus() {
        try {
            const s = JSON.parse(localStorage.getItem('agenda_supabase_sessao_v91') || 'null');
            let url = String(localStorage.getItem('supabase_project_url') || '').trim().replace(/^["']|["']$/g, '');
            const key = String(localStorage.getItem('supabase_anon_key') || '').replace(/\s+/g, '');
            if (!s || !s.access_token || !url || !key) return null;
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
            if (Number(s.expires_at) - Date.now() / 1000 < 30) return null;
            return { url: new URL(url).origin, key, tok: s.access_token };
        } catch (e) { return null; }
    }
    async function iaProxy(corpo) {
        const n = sessaoNuvemPlus();
        if (!n) throw new Error('sem login na nuvem (📅 Agenda → ⚙️ API → 🔐 Login)');
        const r = await fetch(n.url + '/functions/v1/ia-proxy', { method: 'POST', headers: { 'content-type': 'application/json', apikey: n.key, Authorization: 'Bearer ' + n.tok }, body: JSON.stringify(corpo) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(`nuvem ${r.status} ${String(d.detalhe || d.erro || '').slice(0, 140)}`);
        return d;
    }
    function limparAchados(lista, fonte) {
        return (Array.isArray(lista) ? lista : []).filter(a => a && a.explicacao).slice(0, 10).map(a => ({
            categoria: REV_CATS.includes(a.categoria) ? a.categoria : 'outro', gravidade: a.gravidade === 'grave' ? 'grave' : 'atencao',
            trecho: String(a.trecho || '').slice(0, 200), explicacao: String(a.explicacao || '').slice(0, 400), sugestao: String(a.sugestao || '').slice(0, 300), fontes: [fonte]
        }));
    }
    // ---------- Jev (TypeSafe): checklist sim/não com probabilidade ----------
    // Afirmações de ERRO: probabilidade alta = provável erro. Rápido (< 1 s); não localiza o trecho.
    const JEV_COMUNS = {
        lado_corpo_conclusao: ['lateralidade', 'grave', 'O lado (direito/esquerdo) de algum achado na impressão/conclusão é diferente do lado descrito no corpo do laudo.'],
        lado_exame: ['lateralidade', 'grave', 'O nome do exame indica um lado (direito ou esquerdo) e o laudo descreve estruturas do lado oposto.'],
        achado_omitido: ['corpo_conclusao', 'grave', 'Existe achado anormal relevante descrito no corpo do laudo que NÃO aparece na impressão/conclusão.'],
        conclusao_sem_base: ['corpo_conclusao', 'grave', 'A impressão/conclusão cita um achado que não foi descrito no corpo do laudo.'],
        conclusao_contradiz: ['corpo_conclusao', 'grave', 'A impressão/conclusão contradiz o corpo do laudo (por exemplo, diz normal havendo alteração descrita).'],
        medida_divergente: ['medidas', 'grave', 'Alguma medida citada na impressão/conclusão é diferente da mesma medida no corpo do laudo.'],
        unidade_implausivel: ['medidas', 'atencao', 'Há medida com unidade provavelmente errada (mm no lugar de cm ou o contrário) ou valor anatomicamente implausível.'],
        volume_incoerente: ['medidas', 'atencao', 'Algum volume informado não confere com as três dimensões multiplicadas por 0,52 a 0,523 (elipsoide), mesmo considerando o arredondamento das medidas a uma casa decimal.'],
        unidade_grandeza: ['medidas', 'atencao', 'Há volume escrito com unidade de área ou linear (mm², cm², mm, cm), ou área escrita com unidade de volume ou linear (deveria ser mm² ou cm²).'],
        sexo_anatomia: ['sexo_anatomia', 'grave', 'O laudo descreve órgão incompatível com o sexo do paciente informado.'],
        regiao_errada: ['exame_texto', 'grave', 'O laudo descreve região anatômica ou tipo de exame diferente do nome do exame (provável matriz errada).'],
        contradicao_interna: ['redacao_sentido', 'grave', 'O laudo afirma e nega o mesmo achado em trechos diferentes.'],
        frase_sem_sentido: ['redacao_sentido', 'atencao', 'Há frase truncada, sem sentido ou palavra trocada pelo ditado que altera o significado.'],
        classificacao_incoerente: ['classificacao', 'grave', 'Alguma classificação (TI-RADS, BI-RADS, O-RADS, Bosniak, LI-RADS, Fleischner) é incoerente com a descrição do achado.'],
        campo_vazio: ['campo_vazio', 'grave', 'O laudo contém campo de modelo não preenchido (XX, ___, colchetes vazios).']
    };
    const JEV_ESP = {
        URO: { esvaziamento_incoerente: ['padrao', 'grave', 'A classificação do resíduo pós-miccional ou do esvaziamento vesical não segue: resíduo 0–30 mL desprezível, 31–80 pequeno, 81–150 moderado, 151–300 acentuado, acima de 300 muito acentuado; esvaziamento satisfatório se eliminou 80% ou mais do volume pré-miccional, senão incompleto.'],
               hepatopatia_so_ecogenicidade: ['padrao', 'atencao', 'O laudo diagnostica hepatopatia crônica, cirrose ou fibrose baseado apenas no aumento da ecogenicidade hepática, sem outros sinais morfológicos descritos.'] },
        US: { doppler_incoerente: ['exame_texto', 'grave', 'Em exame com Doppler, a conclusão sobre estenose, refluxo ou trombose não é coerente com as velocidades ou achados descritos.'] },
        TC: { tecnica_incoerente: ['exame_texto', 'grave', 'A técnica descrita (com ou sem contraste, fases) é incoerente com o nome do exame.'],
              nivel_incoerente: ['corpo_conclusao', 'grave', 'Níveis vertebrais, segmentos ou lobos citados na conclusão diferem dos descritos no corpo do laudo.'],
              agudo_fora_conclusao: ['corpo_conclusao', 'grave', 'Achado agudo (hemorragia, pneumoperitônio, dissecção, tromboembolismo, fratura, obstrução) descrito no corpo não está na conclusão.'] },
        GERAL: {}
    };
    const JEV_CRITICO = 'O laudo descreve achado crítico DA LISTA DO SERVIÇO (AVC agudo, hemorragia intracraniana aguda, herniação, hidrocefalia aguda, compressão medular, pneumotórax hipertensivo/volumoso, síndrome aórtica aguda, TEP agudo, tamponamento, pneumoperitônio/perfuração, hemoperitônio/sangramento ativo, isquemia mesentérica, volvo/alça fechada, ectópica rota, torção, fratura instável de coluna/pelve, tórax instável, tubo/cateter mal posicionado). NÃO contam: fratura simples de costela, fratura vertebral estável, quadros inflamatórios compatíveis com a indicação.';
    // v1.23 — checklists por TIPO DE EXAME (pelo nome do exame). Regras citadas = referências já aprovadas pelo usuário (ACR TI-RADS, BI-RADS, SRU, Fleischner).
    const JEV_EXAME = [
        { re: /tireo/, so: null, q: {
            tirads_pontos: ['classificacao', 'grave', 'A categoria ACR TI-RADS informada não corresponde à soma dos pontos das características descritas do nódulo (composição, ecogenicidade, forma, margens e focos ecogênicos): TR1 0 pt, TR2 2 pt, TR3 3 pt, TR4 4–6 pt, TR5 7 ou mais.'],
            tirads_conduta: ['classificacao', 'grave', 'A recomendação de PAAF ou seguimento não segue o ACR TI-RADS para a categoria e o maior diâmetro do nódulo (TR3: PAAF ≥ 2,5 cm, seguimento ≥ 1,5 cm; TR4: PAAF ≥ 1,5 cm, seguimento ≥ 1,0 cm; TR5: PAAF ≥ 1,0 cm, seguimento ≥ 0,5 cm).'] } },
        { re: /mama|mamari/, so: null, q: {
            birads_descricao: ['classificacao', 'grave', 'A categoria BI-RADS é incoerente com as características descritas da lesão (forma, margens, orientação, ecogenicidade, achados associados).'],
            birads_conduta: ['classificacao', 'grave', 'A recomendação não corresponde à categoria BI-RADS (1–2: rotina; 3: controle em curto prazo, 6 meses; 4–5: biópsia; 6: conduta oncológica; 0: complementação).'] } },
        { re: /carot|vertebr|cervic/, so: 'US', q: {
            estenose_velocidade: ['medidas', 'grave', 'O grau de estenose carotídea informado não é coerente com as velocidades descritas (critérios SRU: < 50% com VPS < 125 cm/s; 50–69% com VPS 125–230 cm/s; ≥ 70% com VPS > 230 cm/s ou razão ACI/ACC > 4).'] } },
        { re: /venos|varize|safen|trombose|tvp/, so: 'US', q: {
            refluxo_tempo: ['exame_texto', 'grave', 'A conclusão sobre refluxo ou insuficiência venosa não é coerente com os tempos de refluxo descritos (patológico: > 0,5 s em veias superficiais, > 0,35 s em perfurantes, > 1,0 s em veias profundas femoral e poplítea).'],
            trombose_conclusao: ['corpo_conclusao', 'grave', 'O corpo descreve veia não compressível ou com material intraluminal e a conclusão não cita trombose, ou a conclusão cita trombose sem descrição que a sustente.'] } },
        { re: /obstet|gesta|morfolog|fetal|biometr/, so: 'US', q: {
            ig_biometria: ['medidas', 'grave', 'A idade gestacional da conclusão não é coerente com a biometria descrita ou com a idade gestacional de referência citada (DUM ou primeiro ultrassom).'],
            peso_percentil: ['classificacao', 'grave', 'A classificação do peso fetal (adequado, pequeno ou grande para a idade gestacional) é incoerente com o percentil informado (PIG < p10, GIG > p90).'] } },
        { re: /torax|pulm/, so: 'TC', q: {
            fleischner_conduta: ['classificacao', 'grave', 'A recomendação de seguimento de nódulo pulmonar não segue Fleischner 2017 para o tamanho, número e tipo (sólido, subsólido) descritos, ou falta recomendação quando a diretriz indica seguimento.'] } }
    ];
    // v1.23 — lateralidade por ESCOLHA (o Jev diz o lado no corpo e na conclusão; o Plus compara de forma exata)
    const JEV_LADO = { direito: 'lado direito', esquerdo: 'lado esquerdo', bilateral: 'ambos os lados', nenhum: 'sem achado anormal lateralizado, ou exame sem lado' };
    const ladoDoNome = ex => { const n = norm(ex); const d = /direit|\b(mid|msd)\b/.test(n), e = /esquerd|\b(mie|mse)\b/.test(n); return d && !e ? 'direito' : e && !d ? 'esquerdo' : null; };
    const aLado = l => l === 'direito' ? 'à direita' : 'à esquerda';
    async function revJev(c) {
        const t0 = performance.now();
        const mapa = Object.assign({}, JEV_COMUNS, JEV_ESP[c.tipo] || {}, c.tipo !== 'TC' && ehUro(c) ? JEV_ESP.URO : {});
        const nEx = norm(c.exame);
        JEV_EXAME.forEach(g => { if (g.re.test(nEx) && (!g.so || g.so === c.tipo)) Object.assign(mapa, g.q); });
        const questions = {};
        Object.entries(mapa).forEach(([k, v]) => { questions[k] = { type: 'noul', instructions: v[2] }; });
        if (!c.critico) questions.critico_presente = { type: 'noul', instructions: JEV_CRITICO };
        questions.lado_corpo_ch = { type: 'choice', instructions: 'No CORPO (descrição) do laudo, de que lado está o principal achado anormal?', criteria: JEV_LADO };
        questions.lado_conc_ch = { type: 'choice', instructions: 'Na IMPRESSÃO/CONCLUSÃO do laudo, de que lado está o principal achado anormal?', criteria: JEV_LADO };
        const d = await iaProxy({ acao: 'jev', state: revMensagem(c), questions });
        const ans = d.answers || {};
        const achados = [], probs = {};
        Object.entries(ans).forEach(([k, a]) => {
            const p = a && typeof a.noul === 'number' ? a.noul : null;
            if (p == null) return;
            probs[k] = p;
            if (k === 'critico_presente') { if (p >= JEV_LIM.sozinho) achados.push({ categoria: 'critico', gravidade: 'atencao', trecho: '', explicacao: `Possível achado crítico e “Resultado Crítico” desmarcado (Jev ${fmt(p, 2)}).`, sugestao: 'Conferir e marcar se for o caso.', fontes: ['jev'], prob: p }); return; }
            const m = mapa[k];
            if (!m || p < JEV_LIM.mostrar) return;
            achados.push({ categoria: m[0], gravidade: p >= JEV_LIM.grave ? m[1] : 'atencao', trecho: '', explicacao: `${m[2]} (Jev ${fmt(p, 2)})`, sugestao: '', fontes: ['jev'], prob: p });
        });
        // v1.23: lados por escolha (só com confiança ≥ 0,75)
        const lc = ans.lado_corpo_ch, lk = ans.lado_conc_ch, lado = x => x && x.confidence >= 0.75 && ['direito', 'esquerdo'].includes(x.choice) ? x.choice : null;
        const ladoC = lado(lc), ladoK = lado(lk), ladoN = ladoDoNome(c.exame);
        if (ladoC && ladoK && ladoC !== ladoK) achados.push({ categoria: 'lateralidade', gravidade: 'grave', trecho: '', explicacao: `Achado principal ${aLado(ladoC)} no corpo do laudo e ${aLado(ladoK)} na conclusão (Jev, confiança ${fmt(Math.min(lc.confidence, lk.confidence), 2)}).`, sugestao: 'Conferir o lado.', fontes: ['jev'], prob: Math.min(lc.confidence, lk.confidence) });
        else if (ladoN && ladoC && ladoN !== ladoC) achados.push({ categoria: 'lateralidade', gravidade: 'grave', trecho: '', explicacao: `O exame é do lado ${ladoN} e o achado principal descrito está ${aLado(ladoC)} (Jev, confiança ${fmt(lc.confidence, 2)}).`, sugestao: 'Conferir o lado do exame e do texto.', fontes: ['jev'], prob: lc.confidence });
        const u = d.usage || {};
        return { achados, probs, lados: { corpo: lc && lc.choice, conclusao: lk && lk.choice }, ms: performance.now() - t0, tin: u.input_tokens || 0, tout: u.output_tokens || 0, modelo: d.model || 'jev' };
    }

    // ---------- Claude (Opus = revisor padrão; Sonnet opcional, com Opus como sênior) ----------
    async function revClaude(c, modelo, esforco, fonte, tentativa = 1) {
        const t0 = performance.now();
        let d;
        try {
            d = await iaProxy({ acao: 'claude_mensagem', modelo, max_tokens: fonte === 'opus' ? 12000 : 6000, thinking: { type: 'adaptive' }, output_config: { effort: esforco },
                system: revSistema(c, (fonte === 'opus' ? '\nVocê é o REVISOR SÊNIOR: leia o laudo inteiro com atenção redobrada a coerência global, conclusões e condutas.' : '') + '\nResponda SEMPRE chamando a ferramenta "revisao" uma única vez, sem texto adicional.'),
                tools: [REV_TOOL], tool_choice: { type: 'auto' }, messages: [{ role: 'user', content: revMensagem(c) }] });
        } catch (e) { if (tentativa < 2) return revClaude(c, modelo, esforco, fonte, tentativa + 1); throw e; }
        const blk = (d.content || []).find(b => b.type === 'tool_use' && b.name === 'revisao');
        let lista = blk && blk.input && blk.input.achados;
        if (!lista) { const txt = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n'); const m = txt.match(/\{[\s\S]*\}/); if (m) { try { lista = JSON.parse(m[0]).achados; } catch (e) { /* segue */ } } }
        if (!Array.isArray(lista)) {
            if (tentativa < 2) return revClaude(c, modelo, esforco, fonte, tentativa + 1);
            throw new Error('resposta sem a lista de achados' + (d.stop_reason ? ' (' + d.stop_reason + ')' : ''));
        }
        const u = d.usage || {};
        return { achados: limparAchados(lista, fonte), ms: performance.now() - t0, tin: u.input_tokens || 0, tout: u.output_tokens || 0, modelo: d.modelo || modelo };
    }
    const revHaiku = c => revClaude(c, 'claude-haiku-5-5', 'medium', 'haiku');
    const revOpus = c => revClaude(c, 'claude-opus-5-5', 'medium', 'opus');
    const revSonnet = c => revClaude(c, 'claude-sonnet-5-5', 'medium', 'sonnet');
    const GEMINI_REVISOR = 'gemini-3.8-flash'; // v1.24: custo × benefício (Argon = papel do Opus, 2–5× o preço); o servidor cai para 3.6 Flash se falhar
    const geminiNome = m => /argon/.test(m || '') ? 'Gemini 4 Argon' : /3\.8/.test(m || '') ? 'Gemini 3.8 Flash' : /3\.6/.test(m || '') ? 'Gemini 3.6 Flash' : 'Gemini';
    async function revGemini(c) {
        const t0 = performance.now();
        const d = await iaProxy({ acao: 'gemini', modelo: GEMINI_REVISOR, system: revSistema(c), parts: [{ text: revMensagem(c) }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: REV_SCHEMA_GEMINI, temperature: 0, thinkingConfig: { thinkingLevel: 'low' } } }); // v1.32.1: raciocínio low (padrão medium = lento)
        let j = null; try { j = JSON.parse(d.texto); } catch (e) { const m = String(d.texto || '').match(/\{[\s\S]*\}/); if (m) { try { j = JSON.parse(m[0]); } catch (x) { /* segue */ } } }
        if (!j || !Array.isArray(j.achados)) throw new Error('resposta sem a lista de achados');
        const u = d.usage || {};
        return { achados: limparAchados(j.achados, 'gemini'), ms: performance.now() - t0, tin: u.promptTokenCount || 0, tout: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), modelo: d.modelo || 'gemini' };
    }
    // v1.22.1 — Grok (xAI, grok-4.7): revisor independente opcional (☑ + Grok no painel). Mesmo prompt; resposta em JSON.
    async function revGrok(c) {
        const t0 = performance.now();
        const formato = '\nResponda SOMENTE com um objeto JSON: {"achados":[{"categoria":"<uma de: ' + REV_CATS.join(', ') + '>","gravidade":"grave|atencao","trecho":"<trecho literal do laudo>","explicacao":"...","sugestao":"..."}]} — lista vazia se o laudo estiver coerente.';
        const d = await iaProxy({ acao: 'grok', system: revSistema(c, formato), mensagem: revMensagem(c) });
        let j = null; try { j = JSON.parse(d.texto); } catch (e) { const m = String(d.texto || '').match(/\{[\s\S]*\}/); if (m) { try { j = JSON.parse(m[0]); } catch (x) { /* segue */ } } }
        if (!j || !Array.isArray(j.achados)) throw new Error('resposta sem a lista de achados');
        const u = d.usage || {};
        return { achados: limparAchados(j.achados, 'grok'), ms: performance.now() - t0, tin: u.prompt_tokens || 0, tout: u.completion_tokens || 0, modelo: d.modelo || 'grok' };
    }
    // junta achados iguais de fontes diferentes (mesmo trecho ou mesma categoria com trechos parecidos)
    const tokensDe = s => new Set(norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 2));
    // mesmo erro = mesma categoria + trecho igual/contido ou palavras em comum (categorias diferentes nunca se fundem:
    // “lado trocado” e “medida divergente” podem estar na mesma frase e são erros distintos)
    function parecidos(a, b) {
        if (a.categoria !== b.categoria) return false;
        const na = norm(a.trecho), nb = norm(b.trecho);
        if (!na || !nb) return !na && !nb;
        if (na.includes(nb) || nb.includes(na)) return true;
        const ta = tokensDe(a.trecho), tb = tokensDe(b.trecho);
        if (!ta.size || !tb.size) return false;
        let inter = 0; ta.forEach(w => { if (tb.has(w)) inter++; });
        return inter / Math.min(ta.size, tb.size) >= 0.5;
    }
    function juntarAchados(listas) {
        const out = [];
        listas.flat().forEach(a => {
            const igual = out.find(o => parecidos(o, a) && !(o.fontes.includes('regra') && a.fontes.includes('regra'))); // dois itens de regra nunca se fundem (cada um tem a sua correção)
            if (igual) { a.fontes.forEach(f => { if (!igual.fontes.includes(f)) igual.fontes.push(f); }); if (a.gravidade === 'grave') igual.gravidade = 'grave'; if (!igual.sugestao && a.sugestao) igual.sugestao = a.sugestao; }
            else out.push(Object.assign({}, a, { fontes: a.fontes.slice() }));
        });
        const peso = a => (a.gravidade === 'grave' ? 10 : 0) + a.fontes.length * 3 + (a.fontes.includes('regra') ? 2 : 0);
        return out.sort((x, y) => peso(y) - peso(x));
    }
    function selecionarTrecho(trecho) {
        const ed = editorLaudo();
        if (!ed || !trecho) return false;
        // chave que preserva o comprimento (minúsculas, sem acento) → índice vale no texto original
        const chave = x => String(x).normalize('NFC').toLowerCase().split('').map(ch => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ch).join('');
        const alvoExato = chave(String(trecho).replace(/^[“"']|[”"']$/g, '').trim());
        const alvo = norm(trecho).slice(0, 60);
        const root = ed.model.document.getRoot();
        const blocos = [];
        (function andar(el) { for (const ch of el.getChildren()) { if (ch.is('element')) { const txt = [...ch.getChildren()].map(n => n.is('$text') || n.is('text') ? n.data : '').join(''); if (txt) blocos.push({ el: ch, txt }); andar(ch); } } })(root);
        for (const b of blocos) {
            const ie = chave(b.txt).indexOf(alvoExato);
            if (ie >= 0) {
                try {
                    ed.model.change(w => w.setSelection(w.createRange(w.createPositionAt(b.el, ie), w.createPositionAt(b.el, ie + alvoExato.length))));
                    ed.editing.view.focus(); ed.editing.view.scrollToTheSelection();
                    return true;
                } catch (e) { /* tenta o modo aproximado */ }
            }
        }
        for (const b of blocos) {
            const nb = norm(b.txt), i = nb.indexOf(alvo);
            if (i < 0) continue;
            // posição aproximada no texto original (norm só troca acentos/espaços)
            const ini = Math.min(i, b.txt.length), fim = Math.min(ini + trecho.length, b.txt.length);
            try {
                ed.model.change(w => w.setSelection(w.createRange(w.createPositionAt(b.el, ini), w.createPositionAt(b.el, fim))));
                ed.editing.view.focus();
                ed.editing.view.scrollToTheSelection();
                return true;
            } catch (e) { return false; }
        }
        return false;
    }
    // v1.23: registro sem texto para calibrar os limiares (categoria, fontes, probabilidade do Jev e do juiz, decisão do médico)
    const marcaCalib = (r, a, decisao) => ({ t: Date.now(), calib: decisao, tipo: r.ctx.tipo, cat: a.categoria, grav: a.gravidade, fontes: a.fontes.join('+'), jev: a.prob != null ? Math.round(a.prob * 100) / 100 : null, juiz: a.juiz != null ? Math.round(a.juiz * 100) / 100 : null, fraco: !!a.fraco });
    function revLog(reg) {
        try { const l = JSON.parse(localStorage.getItem(REV_LOG_KEY) || '[]'); l.push(reg); localStorage.setItem(REV_LOG_KEY, JSON.stringify(l.slice(-300))); } catch (e) { /* ok */ }
    }
    function revResumoLog() {
        let l = []; try { l = JSON.parse(localStorage.getItem(REV_LOG_KEY) || '[]'); } catch (e) { l = []; }
        if (!l.length) return '';
        const med = k => { const v = l.map(x => x[k]).filter(x => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
        const partes = ['jev', 'haiku', 'sonnet', 'gemini', 'opus'].filter(m => l.some(x => x[m + 'Ms'] > 0 || (m === 'haiku' && x.hMs > 0) || (m === 'gemini' && x.gMs > 0)))
            .map(m => { const k = m === 'haiku' && !l.some(x => x.haikuMs) ? 'h' : m === 'gemini' && !l.some(x => x.geminiMs) ? 'g' : m; return `${MOTORES[m].nome} ${fmt(med(k + 'Ms') / 1000, 1)} s / ${Math.round(med(k + 'In'))}+${Math.round(med(k + 'Out'))} tok`; });
        return `${l.length} revisões neste PC · média: ${partes.join(' · ')}`;
    }


    // ---------- ✍ Corrigir: cálculo (Plus) · frase/lado (Sonnet) · diagnóstico/global (Opus) ----------
    // v1.25: quem corrige é o MESMO Claude que revisa (Opus por padrão) — antes parte das correções ia ao Sonnet
    const nivelCorrecao = a => a.fix ? 'calc' : revisorDe(revCfg());
    const NIVEL_NOME = { calc: 'cálculo do Plus', sonnet: 'Sonnet', opus: 'Opus' };
    const chaveTxt = x => String(x).normalize('NFC').toLowerCase().split('').map(ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '') || ch).join('');
    function blocosLaudo(ed) {
        const blocos = [];
        // elementos não-texto (quebra de linha etc.) ocupam 1 posição no modelo → '\u0001' mantém os índices
        (function andar(el) { for (const ch of el.getChildren()) { if (ch.is('element')) { const filhos = [...ch.getChildren()]; if (filhos.some(n => n.is('$text') || n.is('text'))) blocos.push({ el: ch, txt: filhos.map(n => n.is('$text') || n.is('text') ? n.data : '\u0001').join('') }); andar(ch); } } })(ed.model.document.getRoot());
        return blocos;
    }
    // acha "original" no laudo; "dica" (frase do achado) desempata quando o mesmo texto aparece mais de uma vez
    function acharNoLaudo(ed, original, dica) {
        const alvo = chaveTxt(String(original || '').trim());
        if (!alvo) return null;
        const blocos = blocosLaudo(ed), ocorr = [];
        blocos.forEach(b => { const k = chaveTxt(b.txt); let i = k.indexOf(alvo); while (i >= 0) { ocorr.push({ b, i, k }); i = k.indexOf(alvo, i + 1); } });
        if (!ocorr.length) return null;
        if (dica) {
            const d = chaveTxt(String(dica).replace(/^[“"']|[”"']$/g, '').trim()).slice(0, 80);
            const comDica = ocorr.filter(o => { const j = o.k.indexOf(d); return j >= 0 && o.i >= j && o.i < j + Math.max(d.length, chaveTxt(dica).length); });
            if (comDica.length) return { el: comDica[0].b.el, i: comDica[0].i, n: alvo.length };
            const d2 = d.slice(0, 40), perto = ocorr.filter(o => d2 && o.k.includes(d2));
            if (perto.length === 1) return { el: perto[0].b.el, i: perto[0].i, n: alvo.length };
        }
        if (ocorr.length > 1) return { ambiguo: ocorr.length };
        return { el: ocorr[0].b.el, i: ocorr[0].i, n: alvo.length };
    }
    function substituirNoLaudo(original, novo, dica) {
        const ed = editorLaudo();
        if (!ed) return 'editor fechado';
        const pos = acharNoLaudo(ed, original, dica);
        if (!pos) return 'trecho não encontrado (o laudo mudou?)';
        if (pos.ambiguo) return `trecho aparece ${pos.ambiguo} vezes — corrija à mão`;
        try {
            ed.model.change(w => {
                const p0 = w.createPositionAt(pos.el, pos.i), p1 = w.createPositionAt(pos.el, pos.i + pos.n);
                const no = p0.textNode || p0.nodeAfter;
                const attrs = no && no.getAttributes ? new Map(no.getAttributes()) : new Map(); // mantém negrito/fonte do 1º caractere
                w.remove(w.createRange(p0, p1));
                // v1.20: "\n" no texto novo = parágrafo novo (inserções pedidas ao Opus)
                const partes = String(novo).replace(/\r/g, '').split(/\n+/);
                w.insertText(partes[0], attrs, w.createPositionAt(pos.el, pos.i));
                let el = pos.el, fim = pos.i + partes[0].length;
                for (let k = 1; k < partes.length; k++) {
                    const sp = w.split(w.createPositionAt(el, fim));
                    el = sp.position.nodeAfter;
                    w.insertText(partes[k], attrs, w.createPositionAt(el, 0));
                    fim = partes[k].length;
                }
                w.setSelection(w.createRange(w.createPositionAt(pos.el, pos.i), w.createPositionAt(el, fim)));
            });
            ed.editing.view.focus(); ed.editing.view.scrollToTheSelection();
            return '';
        } catch (e) { return 'falha ao editar: ' + (e.message || e); }
    }
    const CORR_TOOL = {
        name: 'correcao', description: 'Devolve as substituições mínimas de texto que corrigem os erros apontados no laudo.',
        input_schema: { type: 'object', properties: {
            trocas: { type: 'array', items: { type: 'object', properties: { original: { type: 'string', description: 'cópia LITERAL e contínua do laudo (dentro de um único parágrafo), longa o bastante para ser única' }, novo: { type: 'string' } }, required: ['original', 'novo'] } },
            observacao: { type: 'string', description: 'curta; o que não foi corrigido e por quê' } }, required: ['trocas'] }
    };
    async function corrigirIA(c, modelo, achados, completa, tentativa = 1) {
        const t0 = performance.now();
        const lista = achados.map((a, i) => `${i + 1}. [${CAT_NOME[a.categoria] || a.categoria}] ${a.explicacao}${a.trecho ? ` — trecho: “${a.trecho}”` : ''}${a.sugestao ? ` — sugestão: ${a.sugestao}` : ''}`).join('\n');
        const sys = revSistema(c, `
TAREFA AGORA: CORRIGIR o laudo (não só apontar). Regras:
• Altere o MÍNIMO necessário; não reescreva estilo, não acrescente achados, não invente medidas.
• "original" = cópia LITERAL exata de um trecho contínuo do laudo, dentro de um único parágrafo, com 4–30 palavras, que apareça UMA só vez; "novo" = o mesmo trecho já corrigido.
• Se a correção depender de informação que o laudo não tem (qual lado é o certo, uma medida que falta), NÃO troque: explique em "observacao".
• Siga o padrão do serviço quando aplicável.
${completa ? '• Revisão COMPLETA: corrija também qualquer outro erro de incompatibilidade que encontrar no laudo inteiro (lado, corpo × conclusão, medidas, classificação, padrão do serviço).' : '• Corrija apenas os itens listados.'}
Responda SEMPRE chamando a ferramenta "correcao" uma única vez.`);
        let d;
        try {
            d = await iaProxy({ acao: 'claude_mensagem', modelo, max_tokens: /opus/.test(modelo) ? 12000 : 6000, thinking: { type: 'adaptive' }, output_config: { effort: 'medium' },
                system: sys, tools: [CORR_TOOL], tool_choice: { type: 'auto' },
                messages: [{ role: 'user', content: revMensagem(c) + (lista ? '\n\nERROS APONTADOS A CORRIGIR:\n' + lista : '') }] });
        } catch (e) { if (tentativa < 2) return corrigirIA(c, modelo, achados, completa, tentativa + 1); throw e; }
        const blk = (d.content || []).find(b => b.type === 'tool_use' && b.name === 'correcao');
        let inp = blk && blk.input;
        if (!inp) { const txt = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n'); const m = txt.match(/\{[\s\S]*\}/); if (m) { try { inp = JSON.parse(m[0]); } catch (e) { /* segue */ } } }
        if (!inp || !Array.isArray(inp.trocas)) { if (tentativa < 2) return corrigirIA(c, modelo, achados, completa, tentativa + 1); throw new Error('resposta sem as correções'); }
        const trocas = inp.trocas.filter(x => x && x.original && typeof x.novo === 'string' && x.original !== x.novo).slice(0, 12).map(x => ({ original: String(x.original), novo: String(x.novo) }));
        return { trocas, obs: String(inp.observacao || '').slice(0, 400), ms: performance.now() - t0, modelo: d.modelo || modelo };
    }
    const chaveAchado = a => norm(a.categoria + a.trecho + a.explicacao);
    async function pedirCorrecao(r, a, completa) {
        const k = completa ? '__opus__' : chaveAchado(a);
        const nivel = completa ? 'opus' : nivelCorrecao(a);
        r.corr = r.corr || {};
        if (nivel === 'calc') {
            r.corr[k] = { nivel, trocas: [{ original: a.fix.busca, novo: a.fix.troca, dica: a.trecho }], obs: '' };
            renderRevisao(); return;
        }
        const item = completa ? 'Revisão completa do laudo (todas as incompatibilidades)' : `[${CAT_NOME[a.categoria] || a.categoria}] ${a.explicacao}${a.trecho ? ` — trecho: “${a.trecho}”` : ''}${a.sugestao ? ` — sugestão: ${a.sugestao}` : ''}`;
        r.corr[k] = { nivel, carregando: true, item };
        renderRevisao();
        try {
            const c = contextoLaudo() || r.ctx;
            const lista = completa ? achadosAtuais(r).filter(x => !r.ignorados.has(chaveAchado(x))) : [a];
            const x = await corrigirIA(c, nivel === 'opus' ? 'claude-opus-5-5' : 'claude-sonnet-5-5', lista, completa);
            r.corr[k] = { nivel, item, trocas: x.trocas, obs: x.obs || (x.trocas.length ? '' : 'Nenhuma troca proposta.'), ms: x.ms };
        } catch (e) { r.corr[k] = { nivel, item, erro: String(e.message || e).slice(0, 200) }; }
        if (revAtual === r) renderRevisao();
    }
    // ---------- 💬 Pedido livre ao Opus (v1.20): texto digitado ou ditado pelo médico ----------
    const PEDIDO_SIS = `Você é o ASSISTENTE DE EDIÇÃO de laudos radiológicos do médico, em português do Brasil. O médico escreve (ou dita) um PEDIDO sobre o laudo aberto: revisar um trecho, inserir uma frase, ajustar a redação, reorganizar a impressão, padronizar a forma etc.
Regras:
• Faça exatamente o que foi pedido; não altere o resto do laudo. Não invente achados, medidas nem lado que o laudo/pedido não traga; se faltar informação, diga em "observacao" o que falta.
• Entregue a edição como substituições: "original" = cópia LITERAL exata de um trecho contínuo do laudo, DENTRO DE UM ÚNICO PARÁGRAFO, que apareça uma só vez (pode ser o parágrafo inteiro); "novo" = o mesmo trecho já editado.
• Para INSERIR: use como "original" o fim literal do parágrafo de referência e em "novo" repita esse trecho seguido do texto novo; use "\\n" em "novo" para começar parágrafo novo.
• Para reescrever vários parágrafos, uma troca por parágrafo. No máximo 20 trocas.
• Mantenha o estilo, a terminologia e a formatação do laudo (caixa alta onde já houver).
• Se o pedido for uma PERGUNTA ou revisão sem mudança necessária, devolva trocas vazias e responda em "observacao" (curta, objetiva).
Responda SEMPRE chamando a ferramenta "correcao" uma única vez.`;
    async function pedidoOpus(c, pedido, tentativa = 1, esforco = 'medium') {
        const t0 = performance.now();
        const rf = refsDoExame(c);
        const sys = PEDIDO_SIS + '\n' + REV_ESP[c.tipo] + (c.tipo !== 'TC' && ehUro(c) ? '\n' + REV_PATCH_URO : '') + (rf ? '\nREFERÊNCIAS DO SERVIÇO:\n' + rf : '');
        let d;
        try {
            d = await iaProxy({ acao: 'claude_mensagem', modelo: 'claude-opus-5-5', max_tokens: 14000, thinking: { type: 'adaptive' }, output_config: { effort: esforco },
                system: sys, tools: [CORR_TOOL], tool_choice: { type: 'auto' },
                messages: [{ role: 'user', content: revMensagem(c) + '\n\nPEDIDO DO MÉDICO:\n' + pedido }] });
        } catch (e) { if (tentativa < 2) return pedidoOpus(c, pedido, tentativa + 1, esforco); throw e; }
        const blk = (d.content || []).find(b => b.type === 'tool_use' && b.name === 'correcao');
        let inp = blk && blk.input;
        const txt = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        if (!inp) { const m = txt.match(/\{[\s\S]*\}/); if (m) { try { inp = JSON.parse(m[0]); } catch (e) { /* segue */ } } }
        if (!inp && txt) inp = { trocas: [], observacao: txt };
        if (!inp || !Array.isArray(inp.trocas)) { if (tentativa < 2) return pedidoOpus(c, pedido, tentativa + 1, esforco); throw new Error('resposta sem as edições'); }
        const trocas = inp.trocas.filter(x => x && x.original && typeof x.novo === 'string' && x.original !== x.novo).slice(0, 20).map(x => ({ original: String(x.original), novo: String(x.novo) }));
        return { trocas, obs: String(inp.observacao || '').slice(0, 1500), ms: performance.now() - t0 };
    }
    async function enviarPedido(r, texto) {
        texto = String(texto || '').trim();
        if (!texto) return;
        r.pedidos = r.pedidos || [];
        const k = '__ped' + Date.now();
        r.corr = r.corr || {};
        r.corr[k] = { nivel: 'opus', carregando: true, pedido: texto };
        r.pedidos.push(k); r.rascunho = '';
        renderRevisao();
        try {
            const c = contextoLaudo() || r.ctx;
            const x = await pedidoOpus(c, texto);
            r.corr[k] = { nivel: 'opus', pedido: texto, trocas: x.trocas, obs: x.obs || (x.trocas.length ? '' : 'Nada a alterar.'), ms: x.ms };
            if (revCfg().pedidoDireto && x.trocas.length) aplicarTrocas(r.corr[k]);
        } catch (e) { r.corr[k] = { nivel: 'opus', pedido: texto, erro: String(e.message || e).slice(0, 200) }; }
        if (revAtual === r) renderRevisao();
    }
    function aplicarTrocas(cr) {
        (cr.trocas || []).forEach(t => { if (t.feito) return; const f = substituirNoLaudo(t.original, t.novo, t.dica); if (f) t.falha = f; else { t.feito = true; t.falha = ''; } });
    }
    function htmlCorrecao(cr, k) {
        if (!cr) return '';
        // v1.31: conversa do item (observação da IA ↔ resposta do médico)
        const hist = (cr.hist || []).map(h => `${h.obs ? `<div class="pr-obs">IA: ${esc(h.obs)}</div>` : ''}<div class="pr-voce">Você: ${esc(h.resp)}</div>`).join('');
        if (cr.carregando) return `<div class="pr-co">${hist}⏳ ${cr.hist ? 'Opus corrigindo com a sua resposta…' : cr.pedido ? 'Opus trabalhando no pedido…' : NIVEL_NOME[cr.nivel] + ' preparando a correção…'}</div>`;
        if (cr.erro) return `<div class="pr-co err">${hist}⚠ ${esc(cr.erro)}<div class="pr-ac"><button class="pr-b sec" data-desc>Descartar</button></div></div>`;
        const todasFeitas = (cr.trocas || []).length && (cr.trocas || []).every(t => t.feito);
        const resp = k && (cr.obs || !(cr.trocas || []).length) ? `<div class="pr-resp"><textarea class="pr-rt" data-k="${esc(k)}" rows="2" placeholder="Responder / complementar só este item (digite ou dite) — Ctrl+Enter envia"></textarea><button class="pr-b" data-resp>Responder</button></div>` : '';
        return `<div class="pr-co">${hist}${(cr.trocas || []).map((t, j) => `<div class="pr-tq ${t.feito ? 'ok' : ''}" data-j="${j}"><div class="pr-antes">${esc(t.original)}</div><div class="pr-dep">→ ${esc(t.novo)}</div>${t.feito ? '<div class="pr-ok">✓ aplicado (Ctrl+Z desfaz)</div>' : t.falha ? `<div class="pr-ok err">⚠ ${esc(t.falha)}</div>` : ''}</div>`).join('')}
${cr.obs ? `<div class="pr-obs">${cr.hist ? 'IA: ' : ''}${esc(cr.obs)}</div>` : ''}${resp}
<div class="pr-ac">${(cr.trocas || []).some(t => !t.feito) ? `<button class="pr-b" data-apl>Aplicar${cr.trocas.length > 1 ? ' tudo' : ''}</button>` : ''}${k ? '<button class="pr-b sec" data-mini title="Recolhe este item numa linha; clique na linha para ver de novo">▁ Minimizar</button>' : ''}${todasFeitas ? '' : '<button class="pr-b sec" data-desc>Descartar</button>'}<span class="pr-niv">${NIVEL_NOME[cr.nivel]}${cr.ms ? ' · ' + fmt(cr.ms / 1000, 1) + ' s' : ''}</span></div></div>`;
    }
    function ligarCorrecao(el, r, k) {
        const cr = r.corr && r.corr[k];
        if (!cr) return;
        const ap = el.querySelector(':scope > .pr-co [data-apl]');
        if (ap) ap.onclick = () => { aplicarTrocas(cr); renderRevisao(); };
        const ds = el.querySelector(':scope > .pr-co [data-desc]');
        if (ds) ds.onclick = () => { delete r.corr[k]; if (r.pedidos) r.pedidos = r.pedidos.filter(x => x !== k); renderRevisao(); };
        const mi = el.querySelector(':scope > .pr-co [data-mini]');
        if (mi) mi.onclick = () => { (r.mini = r.mini || new Set()).add(k); renderRevisao(); };
        const rt = el.querySelector(':scope > .pr-co .pr-rt'), rb = el.querySelector(':scope > .pr-co [data-resp]');
        if (rt) {
            rt.value = cr.rasc || '';
            rt.oninput = () => { cr.rasc = rt.value; };
            rt.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); responderCorrecao(r, k, rt.value); } };
            if (rb) rb.onclick = () => responderCorrecao(r, k, rt.value);
        }
    }
    // v1.31 — resposta do médico a uma dúvida da IA, só naquele item (não refaz a revisão inteira)
    async function responderCorrecao(r, k, resp) {
        const cr = r.corr && r.corr[k]; resp = String(resp || '').trim();
        if (!cr || !resp || cr.carregando) return;
        const hist = (cr.hist || []).concat([{ obs: cr.obs || '', resp }]);
        const base = { nivel: 'opus', pedido: cr.pedido, item: cr.item, hist };
        r.corr[k] = Object.assign({ carregando: true }, base);
        renderRevisao();
        try {
            const c = contextoLaudo() || r.ctx;
            const conversa = hist.map(h => `Sua observação anterior: ${h.obs || '(nenhuma)'}\nResposta do médico: ${h.resp}`).join('\n');
            const x = await pedidoOpus(c, `Continuação de UM item da revisão do laudo (corrija só este item).\nITEM: ${cr.item || cr.pedido || 'revisão do laudo'}\n${conversa}\nCom a resposta do médico, faça agora a correção no laudo (trocas). Se ainda faltar informação, pergunte de forma objetiva em "observacao".`);
            r.corr[k] = Object.assign(base, { trocas: x.trocas, obs: x.obs || (x.trocas.length ? '' : 'Nada a alterar.'), ms: x.ms });
            if (revCfg().pedidoDireto && x.trocas.length) aplicarTrocas(r.corr[k]);
        } catch (e) { r.corr[k] = Object.assign(base, { erro: String(e.message || e).slice(0, 200) }); }
        if (revAtual === r) renderRevisao();
    }

    // ---------- tela ----------
    let revAtual = null; // { hash, ctx, regras, haiku, gemini, erroH, erroG, carregando, ignorados:Set, depois:fn }
    const hashTxt = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };
    function revPainel() {
        let p = document.getElementById('pp-rev');
        if (!p) { p = document.createElement('div'); p.id = 'pp-rev'; document.body.appendChild(p); }
        return p;
    }
    // v1.20: 🛡 não revisa de novo sozinho — reabre o resultado do mesmo exame; revisar de novo só pelo botão
    function abrirRevisao() {
        const aberto = document.getElementById('pp-rev');
        if (aberto && revAtual && !revAtual.min) { fecharRevisao(); return; }
        const c = contextoLaudo();
        if (!c) return;
        if (revAtual && revAtual.exa === c.exa) {
            revAtual.min = false;
            revAtual.alterado = hashTxt(c.texto + '|' + c.exame + '|' + c.critico) !== revAtual.hash;
            renderRevisao(); return;
        }
        revisar(false);
    }
    // =====================================================================
    // 3H. 📣 COMUNICAÇÃO DE ACHADO CRÍTICO (v1.27, pedido do usuário 23/10/2026)
    // Gera a mensagem curta para o WhatsApp (copiar e colar; *negrito* do WhatsApp), com o achado resumido
    // pelo Claude Sonnet (1 linha, editável). Ao copiar, registra sozinho 1 comentário no exame
    // (POST /backend/api/exame/comentario {exa_codigo, acao_tipo:'COMENTARIO', acao_comentario}). Sem níveis,
    // sem cobrança de confirmação, sem nome/CRM (sai do WhatsApp do próprio médico).
    // =====================================================================
    const COM_PREFIXO = 'Comunicação de achado crítico';
    const comDataBR = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
    const comOk = new Map(); // exa → true quando já há comentário de comunicação
    async function comExameApi(exa) {
        const r = await fetch('/backend/api/exame/' + exa, { headers: { 'x-access-token': localStorage.getItem('lwtoken') || '' } });
        if (!r.ok) throw new Error('PACS ' + r.status);
        const d = await r.json(); return d && d.exame ? d.exame : d;
    }
    async function comJaRegistrado(exa) {
        if (comOk.has(exa)) return comOk.get(exa);
        comOk.set(exa, false);
        try {
            const r = await fetch('/backend/api/exame/' + exa + '/comentario', { headers: { 'x-access-token': localStorage.getItem('lwtoken') || '' } });
            const d = await r.json();
            const ok = (d.rows || []).some(x => String(x.acao_comentario || '').startsWith(COM_PREFIXO));
            comOk.set(exa, ok); return ok;
        } catch (e) { comOk.delete(exa); return false; }
    }
    async function comResumir(texto, exame) {
        try {
            const d = await iaProxy({ acao: 'claude_mensagem', modelo: 'claude-sonnet-5-5', max_tokens: 400, thinking: { type: 'disabled' },
                system: 'Você resume, em UMA linha (até 25 palavras), o(s) achado(s) crítico(s) de um laudo radiológico para comunicar ao médico assistente. Linguagem médica objetiva, sem conduta, sem recomendação, sem dados do paciente. Use a impressão/conclusão. Responda só a linha, sem aspas e terminando com ponto.',
                messages: [{ role: 'user', content: `Exame: ${exame}\nLaudo:\n${String(texto).slice(0, 12000)}` }] });
            const t = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').replace(/\s+/g, ' ').trim();
            if (t) return t;
        } catch (e) { /* cai para a impressão */ }
        const n = String(texto || ''); const i = n.search(/impress[aã]o|conclus[aã]o|opini[aã]o/i);
        return (i >= 0 ? n.slice(i).split('\n').slice(1).join(' ') : n).replace(/\s+/g, ' ').trim().slice(0, 220);
    }
    function comMensagem(o) {
        return `*${COM_PREFIXO}*\nConforme protocolo institucional de comunicação de achados críticos em exames de imagem, informo:\n` +
            `Paciente: ${o.paciente}${o.atend ? ' · Atend. ' + o.atend : ''}\nExame: ${o.exame}${o.data ? ' · ' + o.data : ''}\nAchado: ${o.achado}\nSolicito ciência.`;
    }
    const COM_CSS = `#pp-com{position:fixed;z-index:10000003;top:12%;left:50%;transform:translateX(-50%);width:560px;max-width:94vw;background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.6);padding:14px;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
#pp-com h3{margin:0 0 8px;font-size:15px} #pp-com textarea{width:100%;min-height:150px;background:#111827;color:#e5e7eb;border:1px solid #475569;border-radius:8px;padding:8px;font:13px/1.45 inherit;box-sizing:border-box}
#pp-com .pc-b{display:flex;gap:8px;justify-content:flex-end;margin-top:10px} #pp-com button{border:0;border-radius:7px;padding:6px 12px;font-weight:700;cursor:pointer;color:#fff;background:#334155}
#pp-com button.pc-ok{background:#15803d} #pp-com .pc-st{margin-top:6px;font-size:12px;color:#94a3b8}`;
    async function abrirComunicacao(exa, fonte) {
        setCss('pp-com-css', COM_CSS);
        let w = document.getElementById('pp-com'); if (w) w.remove();
        w = document.createElement('div'); w.id = 'pp-com';
        w.innerHTML = '<h3>📣 Comunicação de achado crítico</h3><textarea id="pc-txt">Gerando a mensagem…</textarea><div class="pc-st" id="pc-st">O resumo do achado é feito pela IA — confira antes de copiar.</div><div class="pc-b"><button id="pc-x">Fechar</button><button class="pc-ok" id="pc-cp" disabled>📋 Copiar</button></div>';
        document.body.appendChild(w);
        const $ = q => w.querySelector(q);
        $('#pc-x').onclick = () => w.remove();
        try {
            let ex, texto;
            if (fonte === 'laudo') { const vm = laudoComp(); ex = vm && vm.exame; const c = contextoLaudo(); texto = c ? c.texto : ''; exa = ex && ex.exa_codigo; }
            else { ex = await comExameApi(exa); texto = htmlParaTexto((ex.laudo && ex.laudo.lau_laudo) || ''); }
            if (!ex) throw new Error('exame não encontrado');
            const exame = String((ex.tipoexame && ex.tipoexame.tpe_descricao) || '');
            const achado = await comResumir(texto, exame);
            $('#pc-txt').value = comMensagem({ paciente: String((ex.paciente && ex.paciente.pac_nome) || '').toUpperCase(), atend: ex.exa_his_atendimento || '', exame, data: comDataBR(ex.exa_data), achado });
            $('#pc-cp').disabled = false;
        } catch (e) { $('#pc-txt').value = ''; $('#pc-st').textContent = 'Não consegui montar a mensagem: ' + e.message; return; }
        $('#pc-cp').onclick = async () => {
            const msg = $('#pc-txt').value;
            try { await navigator.clipboard.writeText(msg); } catch (e) { $('#pc-txt').select(); document.execCommand('copy'); }
            const d = new Date(), quando = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
            const linhaAchado = (msg.match(/^Achado:\s*(.+)$/m) || [])[1] || '';
            try {
                const r = await fetch('/backend/api/exame/comentario', { method: 'POST', headers: { 'x-access-token': localStorage.getItem('lwtoken') || '', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ exa_codigo: Number(exa), acao_tipo: 'COMENTARIO', acao_comentario: `${COM_PREFIXO} enviada via WhatsApp em ${quando}.${linhaAchado ? ' Achado: ' + linhaAchado : ''}` }) });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                comOk.set(Number(exa), true); comOk.set(String(exa), true);
                $('#pc-st').textContent = `✓ Copiado. Registrado nos comentários do exame (${quando}). Cole no WhatsApp.`;
            } catch (e) { $('#pc-st').textContent = '✓ Copiado. ⚠ Não consegui registrar nos comentários (' + e.message + ').'; }
        };
    }
    // caixinha "Resultado crítico" do laudo (o texto vira ☠ em 1.27.1 → reconhece também pela marca data-pp-crit)
    function caixaCritico(soVisivel) {
        return [...document.querySelectorAll('.v-dialog__content .v-input')].find(v => (!soVisivel || v.offsetParent) && (v.hasAttribute('data-pp-crit') || norm(v.innerText) === 'resultado critico'));
    }
    // v1.27.1 — barra compacta (pedido do usuário: em 110% não cabia): "Resultado crítico" = caixinha + ☠ vermelha,
    // Comunicação = ⚠ (mdi-alert), Comentários = 💬 (mdi-comment); só ícones, no tamanho de Anexar/Visualizar/Imprimir.
    const COM_ICON_CSS = `html body .v-dialog__content .v-input[data-pp-crit] label.v-label{font-size:0 !important;}
.v-dialog__content [data-pp-crit] .pp-caveira{font-size:28px !important;color:#ef4444 !important;margin-left:2px;}
.v-dialog__content .pp-ico-btn{min-width:0 !important;width:40px !important;height:40px !important;padding:0 !important;margin:0 2px !important;background:transparent !important;box-shadow:none !important;}
.v-dialog__content .pp-ico-btn .v-icon{font-size:27px !important;}
.v-dialog__content [data-pp-crit]{margin-left:10px !important;}`;
    function comIcone(cls, mdi, cor, titulo, onClick) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'v-btn v-btn--icon v-btn--round theme--dark pp-ico-btn ' + cls; b.title = titulo;
        b.innerHTML = `<span class="v-btn__content"><i aria-hidden="true" class="v-icon notranslate mdi ${mdi} theme--dark" style="color:${cor};"></i></span>`;
        b.addEventListener('mousedown', e => e.preventDefault());
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick(); });
        return b;
    }
    function comBotoesLaudo() {
        const crit = caixaCritico(true);
        let b = document.querySelector('.pp-com-btn');
        if (!crit || !editorLaudo()) { if (b) b.remove(); const c0 = document.querySelector('.pp-cmt-btn'); if (c0) c0.remove(); return; }
        setCss('pp-com-ico-css', COM_ICON_CSS);
        if (!crit.hasAttribute('data-pp-crit')) { crit.setAttribute('data-pp-crit', ''); crit.title = 'Resultado crítico'; }
        const lab = crit.querySelector('.v-label');
        if (lab) {
            if (lab.style.getPropertyValue('font-size') !== '0px') lab.style.setProperty('font-size', '0px', 'important');
            if (!lab.querySelector('.pp-caveira')) lab.insertAdjacentHTML('beforeend', '<i aria-hidden="true" class="v-icon notranslate mdi mdi-skull pp-caveira"></i>');
        }
        // Padrão / Anexo → "P" / "A" (nome completo no título)
        crit.closest('.v-dialog__content') && crit.closest('.v-dialog__content').querySelectorAll('input[value="PADRAO"], input[value="ANEXO"]').forEach(inp => {
            const r = inp.closest('.v-radio'), l = r && r.querySelector('.v-label');
            if (!l || l.querySelector('.pp-curto')) return;
            const nome = l.textContent.trim();
            l.style.setProperty('font-size', '0px', 'important'); r.title = nome;
            l.insertAdjacentHTML('beforeend', `<span class="pp-curto" style="font-size:14.5px;font-weight:700;">${inp.value === 'PADRAO' ? 'P' : 'A'}</span>`);
        });
        if (!b || b.previousElementSibling !== crit) {
            if (b) b.remove();
            b = comIcone('pp-com-btn', 'mdi-alert', '#f59e0b', 'Comunicação de achado crítico — gera a mensagem para o WhatsApp e registra nos comentários', () => abrirComunicacao(null, 'laudo'));
            crit.after(b);
        }
        let c = document.querySelector('.pp-cmt-btn');
        if (!c || c.previousElementSibling !== b) {
            if (c) c.remove();
            c = comIcone('pp-cmt-btn', 'mdi-comment-text', '#e5e7eb', 'Comentários / ações deste exame', () => {
                const v2 = laudoComp(); if (!v2 || !v2.exame) return;
                document.querySelector('#app').__vue__.$store.dispatch('editarComentarioExame/abrirEditarComentarioExame', { item: { exa_codigo: v2.exame.exa_codigo }, callBackClose: () => {} });
            });
            b.after(c);
        }
    }
    // ícone 📣 na coluna Ações da lista: só exames LIBERADOS marcados como "Resultado crítico"; ✓ verde quando já registrado
    function comIconesLista() {
        const f = findListTable(), comp = f && componenteLista();
        if (!f || !comp) return;
        const iAc = f.names.indexOf('acoes'); if (iAc < 0) return;
        const linhas = [...f.t.querySelectorAll('tbody > tr')];
        if (linhas.length !== comp.exames.length) return;
        linhas.forEach((tr, i) => {
            const ex = comp.exames[i], td = tr.children[iAc]; if (!td) return;
            let b = td.querySelector(':scope [data-pp-com]');
            const crit = ex && ex.laudo && ex.laudo.lau_idncritico && String(ex.exa_situacao || '').toUpperCase() === 'LIBERADO';
            if (!crit) { if (b) b.remove(); return; }
            const exa = ex.exa_codigo, ok = comOk.get(exa) === true;
            if (!b) {
                b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-pp-com', 'true');
                b.className = 'v-btn v-btn--icon theme--dark v-size--small';
                b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); abrirComunicacao(Number(b.dataset.exa), 'lista'); });
                td.appendChild(b);
                comJaRegistrado(exa);
            }
            b.dataset.exa = exa;
            const html = `<span class="v-btn__content" style="font-size:14px">${ok ? '📣✓' : '📣'}</span>`;
            if (b.innerHTML !== html) b.innerHTML = html;
            b.title = ok ? 'Comunicação de achado crítico já registrada — gerar de novo' : 'Gerar comunicação de achado crítico (WhatsApp)';
            b.style.cssText = ok ? 'color:#4ade80 !important;filter:none' : 'color:#94a3b8 !important';
        });
    }
    setInterval(() => { try { if (cfg.master && on('revisaoIA')) { comBotoesLaudo(); comIconesLista(); } } catch (e) { /* segue */ } }, 1500);
    // v1.28.2 — exames antigos ainda têm o bloco [FICHA TC HAMC … /FICHA TC] dentro da Anamnese (Anamnese TC ≤ 1.8).
    // Só na TELA: esconde o bloco no cabeçalho do laudo (o PACS não é alterado; a ficha está nos Comentários/PDF).
    const RE_FICHA_TELA = /\s*\[FICHA TC HAMC[\s\S]*?\[\/FICHA TC\]/gi;
    function esconderFichaAnamnese() {
        document.querySelectorAll('.v-dialog__content .v-expansion-panel-content').forEach(painel => {
            if (!/\[FICHA TC HAMC|\[\/FICHA TC\]/i.test(painel.textContent)) return;
            // bloco partido em mais de um nó de texto: apaga o miolo até o fecho
            const tw0 = document.createTreeWalker(painel, NodeFilter.SHOW_TEXT); let dentro = false;
            for (let n = tw0.nextNode(); n; n = tw0.nextNode()) {
                const v = n.nodeValue;
                if (dentro) { const i = v.search(/\[\/FICHA TC\]/i); if (i >= 0) { n.nodeValue = v.slice(i + 11); dentro = false; } else n.nodeValue = ''; continue; }
                const ini = v.search(/\[FICHA TC HAMC/i);
                if (ini >= 0 && !/\[\/FICHA TC\]/i.test(v.slice(ini))) { n.nodeValue = v.slice(0, ini).trimEnd() + ' 📋'; if (n.parentElement) n.parentElement.title = 'A ficha de anamnese TC está nos Comentários e no PDF anexado'; dentro = true; }
            }
            const tw = document.createTreeWalker(painel, NodeFilter.SHOW_TEXT);
            const nos = []; for (let n = tw.nextNode(); n; n = tw.nextNode()) if (/\[FICHA TC HAMC/i.test(n.nodeValue)) nos.push(n);
            nos.forEach(n => {
                const novo = n.nodeValue.replace(RE_FICHA_TELA, '').replace(/\[FICHA TC HAMC[\s\S]*$/i, '').trimEnd();
                n.nodeValue = novo + ' 📋';
                if (n.parentElement) n.parentElement.title = 'A ficha de anamnese TC está nos Comentários e no PDF anexado';
            });
        });
    }
    setInterval(() => { try { if (cfg.master) esconderFichaAnamnese(); } catch (e) { /* segue */ } }, 1500);

    // =====================================================================
    // 3I. JANELAS ARRASTÁVEIS + AÇÕES NO TRECHO SELECIONADO (v1.29, pedido do usuário 23/10/2026)
    // =====================================================================
    // Arrastar: segure o cabeçalho (barra de abas do Plus, título da Revisão/Comunicação/Trecho) e arraste.
    // Duplo clique no cabeçalho = volta à posição padrão. A posição fica guardada neste navegador.
    const ARR_KEY = 'pp_arrastar_v1';
    const ARR_ALCA = { 'pp-panel': '.pp-tabs', 'pp-rev': '.pr-top', 'pp-com': 'h3', 'pp-sel-pop': '.ps-top' };
    let arrPos = {}; try { arrPos = JSON.parse(localStorage.getItem(ARR_KEY) || '{}') || {}; } catch (e) { arrPos = {}; }
    function arrSalvar() { try { localStorage.setItem(ARR_KEY, JSON.stringify(arrPos)); } catch (e) { /* ok */ } }
    function arrAplicar(el) {
        const q = el && arrPos[el.id]; if (!q) return;
        const x = Math.max(0, Math.min(q.x, window.innerWidth - 80)), y = Math.max(0, Math.min(q.y, window.innerHeight - 40));
        el.style.setProperty('left', x + 'px', 'important'); el.style.setProperty('top', y + 'px', 'important');
        el.style.setProperty('right', 'auto', 'important'); el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('transform', 'none', 'important');
        if (el.id === 'pp-panel' || el.id === 'pp-rev') el.style.setProperty('max-height', `calc(100vh - ${y}px - 12px)`, 'important');
    }
    function arrLimpar(el) { ['left', 'top', 'right', 'bottom', 'transform', 'max-height'].forEach(k => el.style.removeProperty(k)); }
    document.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        for (const [id, sel] of Object.entries(ARR_ALCA)) {
            const win = document.getElementById(id);
            if (!win || !win.contains(e.target)) continue;
            const alca = e.target.closest(sel);
            if (!alca || !win.contains(alca) || e.target.closest('button, input, select, textarea, a, label')) return;
            e.preventDefault();
            const r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
            const mover = ev => { arrPos[id] = { x: ev.clientX - dx, y: ev.clientY - dy }; arrAplicar(win); };
            const soltar = () => { document.removeEventListener('mousemove', mover, true); document.removeEventListener('mouseup', soltar, true); arrSalvar(); };
            document.addEventListener('mousemove', mover, true); document.addEventListener('mouseup', soltar, true);
            return;
        }
    }, true);
    document.addEventListener('dblclick', e => {
        for (const [id, sel] of Object.entries(ARR_ALCA)) {
            const win = document.getElementById(id);
            if (win && win.contains(e.target) && e.target.closest(sel) && !e.target.closest('button, input, select, textarea')) { delete arrPos[id]; arrSalvar(); arrLimpar(win); if (id === 'pp-rev' && revAtual) renderRevisao(); return; }
        }
    }, true);
    setInterval(() => { Object.keys(ARR_ALCA).forEach(id => { const el = document.getElementById(id); if (el && arrPos[id]) arrAplicar(el); }); }, 700);
    setCss('pp-arr-css', '#pp-panel .pp-tabs, #pp-rev .pr-top, #pp-com h3, #pp-sel-pop .ps-top { cursor: move; user-select: none; }');

    // ---- Trecho selecionado no laudo: mini-barra ✍ Reescrever · 🛡 Revisar · 🧮 Volume · 💬 Pedir ----
    const SEL_CSS = `#pp-sel .ps-l{display:flex;gap:2px} #pp-sel .ps-mais{display:none;border-top:1px solid #334155;margin-top:3px;padding-top:3px} #pp-sel.mais .ps-mais{display:flex}
#pp-sel{position:fixed;z-index:10000004;display:flex;flex-direction:column;gap:0;padding:3px;background:#0f172a;border:1px solid #475569;border-radius:9px;box-shadow:0 8px 22px rgba(0,0,0,.55);font:600 12.5px -apple-system,"Segoe UI",Roboto,sans-serif}
#pp-sel button{background:transparent;color:#e2e8f0;border:0;border-radius:6px;padding:5px 8px;cursor:pointer;font:inherit;white-space:nowrap}
#pp-sel button:hover{background:#1e293b}
#pp-sel-pop{position:fixed;z-index:10000004;top:120px;right:470px;width:460px;max-width:94vw;max-height:70vh;overflow:auto;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.6);font:12.5px/1.45 -apple-system,"Segoe UI",Roboto,sans-serif}
#pp-sel-pop .ps-top{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #1e293b;font-weight:700;font-size:13px}
#pp-sel-pop .ps-top b{flex:1} #pp-sel-pop .ps-c{padding:10px} #pp-sel-pop .ps-q{color:#94a3b8;font-style:italic;margin-bottom:8px;white-space:pre-wrap}
#pp-sel-pop .ps-t{border:1px solid #334155;border-radius:8px;padding:8px;margin:6px 0;background:#111827}
#pp-sel-pop .ps-de{color:#fca5a5;text-decoration:line-through;white-space:pre-wrap} #pp-sel-pop .ps-para{color:#86efac;white-space:pre-wrap;margin-top:3px}
#pp-sel-pop textarea{width:100%;min-height:58px;box-sizing:border-box;background:#111827;color:#e5e7eb;border:1px solid #475569;border-radius:7px;padding:6px;font:inherit}
#pp-sel-pop button{border:0;border-radius:7px;padding:5px 11px;font-weight:700;cursor:pointer;color:#fff;background:#334155;margin:6px 6px 0 0}
#pp-sel-pop button.ok{background:#15803d} #pp-sel-pop button.ia{background:#6d28d9} #pp-sel-pop .ps-x{margin:0;background:transparent;color:#94a3b8;font-size:16px;padding:0 4px}
#pp-sel-pop .ps-obs{color:#cbd5e1;margin-top:6px;white-space:pre-wrap} #pp-sel-pop .ps-err{color:#fca5a5}`;
    const numVirg = (v, casas) => v.toFixed(casas).replace('.', ',');
    function medidasDe(txt) {
        const brutos = (String(txt).match(/\d+(?:[.,]\d+)?/g) || []).filter(x => parseFloat(x.replace(',', '.')) > 0);
        const ns = brutos.map(x => parseFloat(x.replace(',', '.')));
        if (ns.length < 3) return null;
        const mm = /\bmm\b/i.test(txt) && !/\bcm\b/i.test(txt);
        const [a, b, c] = ns.slice(0, 3);
        let v = a * b * c * 0.523; if (mm) v /= 1000;
        const txtV = v >= 10 ? numVirg(Math.round(v), 0) : v >= 0.1 ? numVirg(v, 1) : numVirg(v, 2);
        return { a, b, c, mm, v, txtV, d: brutos.slice(0, 3) };
    }
    let selAtual = null; // { txt, ed }
    function selEsconder() { const b = document.getElementById('pp-sel'); if (b) b.remove(); }
    function selMostrar() {
        if (!cfg.master || !on('revisaoIA')) return selEsconder();
        const ed = editorLaudo(), raiz = document.querySelector('.v-dialog__content .ck-editor__editable');
        const s = window.getSelection();
        if (!ed || !raiz || !s || s.isCollapsed || !s.rangeCount || !raiz.contains(s.anchorNode) || !raiz.contains(s.focusNode)) return selEsconder();
        const txt = s.toString().replace(/\s+/g, ' ').trim();
        if (txt.length < 2) return selEsconder();
        selAtual = { txt, ed };
        setCss('pp-sel-css', SEL_CSS);
        let b = document.getElementById('pp-sel');
        if (b) b.classList.remove('mais');
        if (!b) {
            b = document.createElement('div'); b.id = 'pp-sel';
            b.addEventListener('mousedown', e => e.preventDefault()); // não perde a seleção
            b.addEventListener('click', e => { const bt = e.target.closest('button[data-a]'); if (!bt) return; e.stopPropagation(); if (bt.dataset.a === 'mais') { b.classList.toggle('mais'); return; } selAcao(bt.dataset.a); });
            document.body.appendChild(b);
        }
        const vol = medidasDe(txt), temNum = /\d/.test(txt) && /\b(mm|cm)\b/i.test(txt);
        b.innerHTML = `<div class="ps-l"><button data-a="reescrever" title="Opus reescreve só este trecho (mesmo sentido; você confere antes de aplicar)">✍ Reescrever</button><button data-a="revisar" title="Opus revisa só este trecho">🛡 Revisar</button>${vol ? `<button data-a="volume" title="Volume do elipsoide (0,523 × D1 × D2 × D3) — cálculo exato, sem IA">🧮 Volume</button>` : ''}<button data-a="mais" title="Mais ações">⋯ Mais</button></div>` +
            `<div class="ps-l ps-mais"><button data-a="encurtar" title="Deixa o trecho mais enxuto sem perder informação">✂ Encurtar</button>${temNum ? `<button data-a="medidas" title="Converte mm ↔ cm e padroniza o “x” (sem IA)">📏 mm↔cm</button>` : ''}<button data-a="classificar" title="Sugere TI-RADS, Bosniak, Fleischner, Lung-RADS, BI-RADS, O-RADS, LI-RADS, PI-RADS… com categoria e motivo">🏷 Classificar</button><button data-a="comparar" title="Compara com o laudo anterior do paciente e escreve a evolução">🕘 Comparar</button><button data-a="impressao" title="Escreve a IMPRESSÃO a partir dos achados (selecione a análise)">📝 Impressão</button><button data-a="pedir" title="Escreva o que quer que o Opus faça com este trecho">💬 Pedir…</button></div>`;
        const r = s.getRangeAt(0).getBoundingClientRect();
        const w = b.offsetWidth || 300;
        b.style.left = Math.round(Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8))) + 'px';
        b.style.top = Math.round(r.top > 60 ? r.top - 40 : r.bottom + 8) + 'px';
    }
    document.addEventListener('mouseup', e => { if (e.target.closest && e.target.closest('#pp-sel')) return; setTimeout(selMostrar, 20); }, true);
    document.addEventListener('keyup', e => { if (e.shiftKey || e.key === 'Shift') setTimeout(selMostrar, 20); }, true);
    document.addEventListener('mousedown', e => { if (!e.target.closest || !e.target.closest('#pp-sel')) selEsconder(); }, true);
    document.addEventListener('scroll', selEsconder, true);
    function selMarcar(ed) {
        // marca o trecho no editor (acompanha edições) para inserir/substituir depois, mesmo se o cursor sair dali
        try {
            const rg = ed.model.document.selection.getFirstRange(); if (!rg || rg.isCollapsed) return false;
            ed.model.change(w => { if (ed.model.markers.has('pp-sel')) w.updateMarker('pp-sel', { range: rg }); else w.addMarker('pp-sel', { range: rg, usingOperation: false, affectsData: false }); });
            return true;
        } catch (e) { return false; }
    }
    function selInserirApos(ed, texto) {
        try {
            const mk = ed.model.markers.get('pp-sel'); if (!mk) return false;
            const fim = mk.getEnd();
            ed.model.change(w => { const no = fim.textNode || fim.nodeBefore; const at = no && no.getAttributes ? new Map(no.getAttributes()) : new Map(); w.insertText(texto, at, fim); });
            ed.editing.view.focus(); return true;
        } catch (e) { return false; }
    }
    function selPop(titulo, html) {
        setCss('pp-sel-css', SEL_CSS);
        let p = document.getElementById('pp-sel-pop');
        if (!p) { p = document.createElement('div'); p.id = 'pp-sel-pop'; document.body.appendChild(p); }
        p.innerHTML = `<div class="ps-top"><b>${titulo}</b><button class="ps-x" title="Fechar">✕</button></div><div class="ps-c">${html}</div>`;
        p.querySelector('.ps-x').onclick = () => p.remove();
        arrAplicar(p);
        return p;
    }
    async function selAcao(a) {
        const s0 = selAtual; selEsconder(); if (!s0) return;
        const ed = s0.ed, txt = s0.txt;
        selMarcar(ed);
        if (a === 'volume') {
            const m = medidasDe(txt); if (!m) return;
            const u = m.mm ? 'mm' : 'cm', frase = `, com volume estimado em ${m.txtV} cm³`;
            const p = selPop('🧮 Volume (elipsoide)', `<div class="ps-q">«${esc(txt)}»</div><div>0,523 × ${m.d.join(' × ')} ${u}${m.mm ? ' ÷ 1000' : ''} = <b style="font-size:15px">${m.txtV} cm³</b></div><div class="ps-obs">Vai inserir logo após o trecho: “${esc(frase)}”</div><button class="ok" data-b="ins">↵ Inserir após o trecho</button><button data-b="cp">📋 Copiar valor</button>`);
            p.querySelector('[data-b=ins]').onclick = () => { if (selInserirApos(ed, frase)) p.remove(); else p.querySelector('.ps-obs').textContent = 'Não consegui inserir — copie o valor.'; };
            p.querySelector('[data-b=cp]').onclick = () => { try { navigator.clipboard.writeText(m.txtV + ' cm³'); } catch (e) { /* ok */ } };
            return;
        }
        if (a === 'pedir') {
            const p = selPop('💬 Pedido sobre o trecho', `<div class="ps-q">«${esc(txt)}»</div><textarea placeholder="Ex.: deixe mais objetivo · troque para linguagem de impressão · acrescente que não há sinais de complicação"></textarea><button class="ia" data-b="ir">Enviar ao Opus</button>`);
            const ta = p.querySelector('textarea'); ta.focus();
            const ir = () => { const q = ta.value.trim(); if (q) selIA(ed, txt, `Aplique SOMENTE ao trecho selecionado o pedido do médico: "${q}".`); };
            p.querySelector('[data-b=ir]').onclick = ir;
            ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ir(); });
            return;
        }
        if (a === 'medidas') {
            const cv = converterMedidas(txt);
            const p = selPop('📏 Converter medidas', `<div class="ps-t"><div class="ps-de">${esc(txt)}</div><div class="ps-para">${esc(cv)}</div><button class="ok" data-b="ap">✔ Aplicar</button><button data-b="cp">📋 Copiar</button></div><div class="ps-obs" style="color:#64748b;font-size:11px">Cálculo local, sem IA · Ctrl+Z desfaz</div>`);
            p.querySelector('[data-b=ap]').onclick = e => { e.target.textContent = selSubstituir(ed, cv) ? '✔ Aplicado' : '✖ trecho mudou — use Copiar'; e.target.disabled = true; };
            p.querySelector('[data-b=cp]').onclick = () => { try { navigator.clipboard.writeText(cv); } catch (x) { /* ok */ } };
            return;
        }
        if (a === 'encurtar') return selIA(ed, txt, 'Encurte o trecho selecionado: mais enxuto e direto, sem perder NENHUMA informação (achados, medidas, lateralidade, negativas relevantes). Não acrescente nada.');
        if (a === 'classificar') return selIA(ed, txt, 'Classifique o achado do trecho pelo sistema de classificação aplicável e vigente (ex.: ACR TI-RADS, Bosniak 2019, Fleischner 2017, Lung-RADS, BI-RADS, O-RADS, LI-RADS, PI-RADS). Em "observacao": sistema, categoria (com pontuação quando houver), o motivo em 1–2 linhas e o que falta descrever se os dados forem insuficientes. Só proponha troca (acrescentar a categoria ao trecho) se os dados do laudo forem suficientes; nunca invente característica.', 'medium');
        if (a === 'impressao') return selIA(ed, txt, 'Escreva a IMPRESSÃO a partir dos achados do laudo (use o trecho selecionado como base principal). Padrão do serviço: tópicos curtos em ordem de importância, sem repetir medidas desnecessárias, sem condutas não pedidas, mantendo lateralidade. Se já existir a seção IMPRESSÃO/CONCLUSÃO, substitua o conteúdo dela (troca com "original" = texto atual da impressão, mesmo fora do trecho). Se não existir, insira ao fim do trecho uma linha "IMPRESSÃO:" seguida dos tópicos (use \\n para quebrar linha).', 'medium', true);
        if (a === 'comparar') {
            const ant = await laudoAnterior();
            if (!ant) { selPop('🕘 Comparar com o anterior', `<div class="ps-q">«${esc(txt)}»</div><div class="ps-err">Não achei laudo anterior liberado deste paciente no histórico.</div>`); return; }
            return selIA(ed, txt, `Compare o achado do trecho selecionado com o LAUDO ANTERIOR abaixo (${ant.data} · ${ant.exame}). Proponha troca no trecho acrescentando uma frase curta de evolução (ex.: "inalterado em relação ao exame de ${ant.data}", "aumentou de X para Y cm", "novo em relação a ${ant.data}"). Use só o que está escrito nos dois laudos; se o achado não é citado no anterior ou a comparação não é possível, não troque e explique em "observacao".\nLAUDO ANTERIOR (${ant.data} · ${ant.exame}):\n${ant.texto}`, 'medium');
        }
        if (a === 'reescrever') return selIA(ed, txt, 'Reescreva SOMENTE o trecho selecionado com redação radiológica clara, objetiva e formal (português do Brasil), mantendo exatamente o mesmo sentido, as mesmas medidas e a lateralidade. Não acrescente nem retire achados.');
        if (a === 'revisar') return selIA(ed, txt, 'Revise SOMENTE o trecho selecionado: português, concordância, termos técnicos, lateralidade, medidas/unidades e coerência com o restante do laudo e com a indicação. Corrija o mínimo necessário. Se estiver correto, não troque nada e diga em "observacao".');
    }
    function selSubstituir(ed, novo) {
        try {
            const mk = ed.model.markers.get('pp-sel'); if (!mk) return false;
            const rg = mk.getRange(); if (rg.isCollapsed) return false;
            ed.model.change(w => { const ini = rg.start, no = ini.textNode || ini.nodeAfter; const at = no && no.getAttributes ? new Map(no.getAttributes()) : new Map(); const pos = w.createPositionAt(rg.start.parent, rg.start.offset); w.remove(rg); w.insertText(novo, at, pos); });
            ed.editing.view.focus(); return true;
        } catch (e) { return false; }
    }
    // mm ↔ cm (local): todas as medidas do trecho mudam de unidade; "x"/"×" padronizados como " x "
    function converterMedidas(txt) {
        const praCm = /\bmm\b/i.test(txt) && !/\bcm\b/i.test(txt);
        const fmt = v => { const r = Math.round(v * 100) / 100; return (Number.isInteger(r) ? String(r) : (Math.round(r * 10) === r * 10 ? r.toFixed(1) : r.toFixed(2))).replace('.', ','); };
        return String(txt)
            .replace(/(\d+(?:[.,]\d+)?)/g, n => { const v = parseFloat(n.replace(',', '.')); return fmt(praCm ? v / 10 : v * 10); })
            .replace(praCm ? /\bmm\b/gi : /\bcm\b/gi, praCm ? 'cm' : 'mm')
            .replace(/(\d)\s*[x×X]\s*(?=\d)/g, '$1 x ');
    }
    // laudo anterior liberado do mesmo paciente (histórico do diálogo): prefere a mesma modalidade, o mais recente
    async function laudoAnterior() {
        const vm = laudoComp(); if (!vm || !vm.exame) return null;
        const atual = vm.exame, mod = String((atual.tipoexame && atual.tipoexame.modalidade && atual.tipoexame.modalidade.mod_sigla) || '');
        const quando = x => String(x.exa_data || '').slice(0, 10) + ' ' + String(x.exa_hora || '');
        const cands = (vm.examesPacienteHistorico || []).filter(x => x.exa_codigo !== atual.exa_codigo && quando(x) <= quando(atual) && String(x.exa_situacao || '').toUpperCase() === 'LIBERADO');
        const modDe = x => String((x.tipoexame && x.tipoexame.modalidade && x.tipoexame.modalidade.mod_sigla) || (x.modalidade && x.modalidade.mod_sigla) || '');
        cands.sort((a, b) => ((modDe(b) === mod) - (modDe(a) === mod)) || quando(b).localeCompare(quando(a)));
        for (const x of cands.slice(0, 4)) {
            try {
                const ex = await comExameApi(x.exa_codigo);
                const t = htmlParaTexto((ex.laudo && ex.laudo.lau_laudo) || '').trim();
                if (t) return { data: comDataBR(ex.exa_data), exame: String((ex.tipoexame && ex.tipoexame.tpe_descricao) || ''), texto: t.slice(0, 12000) };
            } catch (e) { /* tenta o próximo */ }
        }
        return null;
    }
    async function selIA(ed, txt, ordem, esforco = 'low', foraDoTrecho = false) {
        const p = selPop('✍ Opus — trecho selecionado', `<div class="ps-q">«${esc(txt)}»</div><div class="ps-obs">⏳ Pensando…</div>`);
        const c = contextoLaudo();
        if (!c) { p.querySelector('.ps-obs').textContent = 'Abra o laudo para usar.'; return; }
        try {
            const x = await pedidoOpus(c, `${ordem}\nTRECHO SELECIONADO: «${txt}»` + (foraDoTrecho ? '' : '\nAs trocas devem ficar DENTRO desse trecho ("original" = parte literal dele).'), 1, esforco);
            if (!document.body.contains(p)) return;
            const cr = { trocas: x.trocas };
            const html = (x.trocas.length ? x.trocas.map((t, i) => `<div class="ps-t"><div class="ps-de">${esc(t.original)}</div><div class="ps-para">${esc(t.novo)}</div><button class="ok" data-i="${i}">✔ Aplicar</button><button data-c="${i}">📋 Copiar</button></div>`).join('') : '') +
                (x.obs ? `<div class="ps-obs">${esc(x.obs)}</div>` : '') + (x.trocas.length > 1 ? `<button class="ok" data-todas>✔ Aplicar todas</button>` : '') + `<div class="ps-obs" style="color:#64748b;font-size:11px">Opus · ${Math.round(x.ms / 1000)} s · Ctrl+Z desfaz</div>`;
            p.querySelector('.ps-c').innerHTML = `<div class="ps-q">«${esc(txt)}»</div>` + html;
            const aplicar = i => { const t = cr.trocas[i]; if (t.feito) return; const f = substituirNoLaudo(t.original, t.novo); const bt = p.querySelector(`[data-i="${i}"]`); if (f) { if (bt) bt.textContent = '✖ ' + f; } else { t.feito = true; if (bt) { bt.textContent = '✔ Aplicado'; bt.disabled = true; } } };
            p.querySelectorAll('[data-i]').forEach(bt => { bt.onclick = () => aplicar(+bt.dataset.i); });
            p.querySelectorAll('[data-c]').forEach(bt => { bt.onclick = () => { try { navigator.clipboard.writeText(cr.trocas[+bt.dataset.c].novo); } catch (e) { /* ok */ } }; });
            const td = p.querySelector('[data-todas]'); if (td) td.onclick = () => cr.trocas.forEach((t, i) => aplicar(i));
        } catch (e) { if (document.body.contains(p)) p.querySelector('.ps-c').innerHTML = `<div class="ps-q">«${esc(txt)}»</div><div class="ps-err">Falhou: ${esc(String(e.message || e).slice(0, 200))}</div>`; }
    }
    function fecharRevisao() { const p = document.getElementById('pp-rev'); if (p) p.remove(); if (revAtual) revAtual.depois = null; }
    function renderRevisao() {
        if (!revAtual) return;
        const p = revPainel(), r = revAtual, rc = revCfg();
        const tb = document.querySelector('.v-dialog__content .document-editor__toolbar');
        p.style.top = Math.round(Math.max(48, Math.min(tb ? tb.getBoundingClientRect().bottom + 8 : 96, window.innerHeight - 320))) + 'px';
        arrAplicar(p);
        const todos = achadosAtuais(r).filter(a => !r.ignorados.has(norm(a.categoria + a.trecho + a.explicacao)));
        const graves = todos.filter(a => a.gravidade === 'grave').length;
        // v1.20: preserva o que está sendo digitado no pedido (o painel é redesenhado quando cada IA responde)
        const ta0 = p.querySelector('#pr-ped'), foco = ta0 && document.activeElement === ta0 ? [ta0.selectionStart, ta0.selectionEnd] : null;
        const rt0 = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('pr-rt') ? document.activeElement : null;
        const focoResp = rt0 ? [rt0.dataset.k, rt0.selectionStart, rt0.selectionEnd] : null;
        const mini = r.mini = r.mini || new Set();
        if (ta0) r.rascunho = ta0.value;
        const pedCarregando = (r.pedidos || []).some(k => r.corr[k] && r.corr[k].carregando);
        // v1.20: minimizado = só uma barrinha; clique expande
        p.classList.toggle('min', !!r.min);
        if (r.min) {
            p.innerHTML = `<div class="pr-mini" title="Expandir a revisão">🛡 Revisão · ${r.carregando || pedCarregando ? '⏳' : todos.length ? `${todos.length} achado(s)${graves ? ` · <span class="pr-g">${graves} grave(s)</span>` : ''}` : '✓ sem achados'} <span class="pr-exp">▲</span></div>`;
            p.querySelector('.pr-mini').onclick = () => { r.min = false; renderRevisao(); };
            return;
        }
        const st = m => { const x = r.res[m], erro = r.err[m]; return `<span class="pr-st ${erro ? 'err' : x ? 'ok' : 'wait'}" title="${esc(erro || (x && x.modelo) || '')}">${m === 'gemini' && x ? geminiNome(x.modelo) : MOTORES[m].nome} ${erro ? '⚠ erro' : x ? `✓ ${x.achados.length}` : '⏳'}</span>`; };
        const fonteChip = (f, a) => `<span class="pr-f ${f}">${f === 'regra' ? 'Regra' : MOTORES[f] ? MOTORES[f].nome : f}${f === 'jev' && a.prob != null ? ' ' + fmt(a.prob, 2) : ''}</span>`;
        const erros = Object.entries(r.err).filter(([, e]) => e);
        p.innerHTML = `
<div class="pr-top"><b>🛡 Revisão · ${r.ctx.tipo === 'GERAL' ? esc(r.ctx.mod) : r.ctx.tipo}</b>
<select id="pr-modo" title="Motores">${Object.entries(REV_MODOS).map(([k, v]) => `<option value="${k}" ${rc.modo === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select>
<select id="pr-revisor" title="Qual Claude revisa">${Object.entries(REVISORES).map(([k, v]) => `<option value="${k}" ${revisorDe(rc) === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
<button class="pr-x pr-min" title="Minimizar">▁</button><button class="pr-x" title="Fechar (Esc) — o resultado fica guardado; 🛡 reabre sem revisar de novo">✕</button></div>
<div class="pr-sts"><span class="pr-st ok">Regras ✓ ${r.regras.length}</span>${r.ativos.map(st).join('')}</div>
${r.alterado && !r.carregando ? `<div class="pr-alt">✎ O laudo mudou desde esta revisão. <button class="pr-b sec" id="pr-alt-rev">🔄 Revisar novamente</button></div>` : ''}
<div class="pr-ped"><textarea id="pr-ped" rows="3" placeholder="💬 Pedido ao Opus — digite ou cole o ditado. Ex.: “revise a impressão”, “insira que a vesícula não foi visualizada por jejum inadequado”, “deixe a conclusão em tópicos”."></textarea>
<div class="pr-pedb"><label title="Aplica a resposta direto no laudo (Ctrl+Z desfaz)"><input type="checkbox" id="pr-ped-dir" ${rc.pedidoDireto ? 'checked' : ''}> Aplicar direto</label><button class="pr-b cor" id="pr-ped-env" title="Ctrl+Enter">Enviar ao Opus</button></div>
${(r.pedidos || []).slice().reverse().map(k => !r.corr[k] ? '' : mini.has(k) ? `<div class="pr-mini" data-maxi="${k}">▸ 💬 “${esc(String(r.corr[k].pedido).slice(0, 70))}” — ${estadoCorr(r.corr[k])}</div>` : `<div class="pr-pd" data-k="${k}"><div class="pr-pq">“${esc(r.corr[k].pedido)}”</div>${htmlCorrecao(r.corr[k], k)}</div>`).join('')}</div>
${erros.length ? `<div class="pr-err">${erros.map(([m, e]) => MOTORES[m].nome + ': ' + esc(e)).join('<br>')}</div>` : ''}
${r.motivoOpus ? `<div class="pr-info">🎓 Opus chamado: ${esc(r.motivoOpus)}</div>` : ''}
${r.triagem === 'normal' ? `<div class="pr-info">✓ Triagem: laudo normal pelas regras + Jev — IAs não chamadas (sem custo). <button class="pr-b sec" id="pr-tri-full">Revisar com as IAs</button></div>` : ''}
${r.depois ? `<div class="pr-lib ${todos.length ? 'g' : ''}">${r.carregando ? '⏳ Revisando antes de liberar…' : todos.length ? `⚠ ${todos.length} pendência(s)${graves ? ` (${graves} grave(s))` : ''}. Corrija, ignore ou libere mesmo assim — nada é liberado sem o seu clique.` : '✓ Sem pendências.'}
<div class="pr-libb"><button class="pr-b" id="pr-lib">${r.carregando ? 'Liberar sem esperar' : todos.length ? 'Liberar mesmo assim' : 'Liberar'}</button><button class="pr-b sec" id="pr-canc">Voltar ao laudo</button></div></div>` : ''}
${!r.carregando && r.ctx.texto.length >= 30 ? `<div class="pr-full" data-k="__opus__">${r.corr && r.corr.__opus__ ? (mini.has('__opus__') ? `<div class="pr-mini" data-maxi="__opus__">▸ 🎓 Revisão completa com correção (Opus) — ${estadoCorr(r.corr.__opus__)}</div>` : '<b>🎓 Revisão completa com correção (Opus)</b>' + htmlCorrecao(r.corr.__opus__, '__opus__')) : '<button class="pr-b cor" id="pr-full" title="Opus revisa o laudo inteiro e propõe as correções (antes → depois)">🎓 Revisão completa com correção (Opus)</button>'}</div>` : ''}
<div class="pr-lista">${todos.length ? todos.map((a, i) => mini.has(chaveAchado(a)) ? `<div class="pr-mini ${a.gravidade}" data-maxi="${esc(chaveAchado(a))}">▸ ${a.gravidade === 'grave' ? '●' : '○'} ${esc(CAT_NOME[a.categoria] || a.categoria)} — ${r.corr && r.corr[chaveAchado(a)] ? estadoCorr(r.corr[chaveAchado(a)]) : esc(String(a.explicacao).slice(0, 60)) + '…'}</div>` : `
<div class="pr-it ${a.gravidade} ${a.fontes.length > 1 ? 'conc' : ''}" data-i="${i}">
<div class="pr-h"><span class="pr-cat">${a.gravidade === 'grave' ? '●' : '○'} ${esc(CAT_NOME[a.categoria] || a.categoria)}</span>${a.fontes.map(f => fonteChip(f, a)).join('')}</div>
<div class="pr-ex">${esc(a.explicacao)}</div>${a.fraco ? `<div class="pr-fraco">provável falso alarme — Jev ${fmt(a.juiz, 2)}</div>` : ''}
${a.trecho ? `<div class="pr-tr">“${esc(a.trecho)}”</div>` : ''}
${a.sugestao ? `<div class="pr-sg">→ ${esc(a.sugestao)}</div>` : ''}
<div class="pr-ac">${a.trecho ? '<button class="pr-b sec" data-loc>Localizar</button>' : ''}${r.corr && r.corr[chaveAchado(a)] ? '' : `<button class="pr-b cor" data-cor title="Propõe a correção (antes → depois); nada muda sem Aplicar">✍ Corrigir <small>${NIVEL_NOME[nivelCorrecao(a)]}</small></button>`}${a.categoria === 'critico' ? '<button class="pr-b cor" data-com title="Gera a mensagem para o WhatsApp">📣 Comunicação</button>' : ''}<button class="pr-b sec" data-mini-it title="Recolhe este item numa linha">▁</button><button class="pr-b sec" data-ign>Ignorar</button></div>${htmlCorrecao(r.corr && r.corr[chaveAchado(a)], chaveAchado(a))}</div>`).join('')
            : `<div class="pr-vazio">${r.carregando ? 'Analisando…' : '✓ Nenhuma incompatibilidade encontrada.'}</div>`}</div>
<div class="pr-rod"><label><input type="checkbox" id="pr-auto" ${rc.noLiberar ? 'checked' : ''}> Revisar ao clicar Liberar</label>
<label title="Revisa sozinho 3 s depois de colar/editar o laudo (laudo normal: só regras + Jev; com achado: IAs em segundo plano)"><input type="checkbox" id="pr-colar" ${rc.aoColar !== false ? 'checked' : ''}> Revisar ao colar</label>
<label title="Gemini 3.8 Flash como revisor extra independente (API paga)"><input type="checkbox" id="pr-gemini" ${rc.gemini ? 'checked' : ''}> + Gemini</label>
<label title="Grok 4.7 (xAI) como revisor extra independente — em teste"><input type="checkbox" id="pr-grok" ${rc.grok ? 'checked' : ''}> + Grok${grokSemChave ? ' <small>(sem chave)</small>' : ''}</label>
${r.revisor === 'opus' ? '' : `<label title="Chama o Opus 5.5 sozinho em laudo extenso (> ${REV_EXTENSO} caracteres) ou quando as IAs discordam num item grave"><input type="checkbox" id="pr-opus-auto" ${rc.opusAuto ? 'checked' : ''}> Sênior automático</label>`}
<span style="display:flex;gap:6px;"><button class="pr-b sec" id="pr-opus" ${r.ativos.includes('opus') ? 'disabled' : ''} title="Revisão sênior com Claude Opus 5.5 (mais lento e mais caro)">🎓 Sênior (Opus)</button><button class="pr-b sec" id="pr-de-novo">🔄 Revisar novamente</button></span>
<div class="pr-log">Vermelho = grave · borda dupla = mais de uma fonte · Jev = probabilidade de erro (0–1); “provável falso alarme” = só uma IA apontou e o Jev discorda. A IA pode errar: a decisão é sua.</div></div>`;
        p.querySelector('.pr-x:not(.pr-min)').onclick = fecharRevisao;
        p.querySelector('.pr-min').onclick = () => { r.min = true; renderRevisao(); };
        const ar = p.querySelector('#pr-alt-rev'); if (ar) ar.onclick = () => revisar(true);
        const ta = p.querySelector('#pr-ped');
        ta.value = r.rascunho || '';
        ta.oninput = () => { r.rascunho = ta.value; };
        ta.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviarPedido(r, ta.value); } };
        if (foco) { ta.focus(); try { ta.setSelectionRange(foco[0], foco[1]); } catch (e) { /* ok */ } }
        p.querySelector('#pr-ped-env').onclick = () => enviarPedido(r, ta.value);
        p.querySelector('#pr-ped-dir').onchange = e => { cfg.rev = Object.assign(revCfg(), { pedidoDireto: e.target.checked }); saveCfg(); };
        p.querySelectorAll('.pr-pd').forEach(el => ligarCorrecao(el, r, el.dataset.k));
        p.querySelector('#pr-modo').onchange = e => { cfg.rev = Object.assign(revCfg(), { modo: e.target.value }); saveCfg(); revisar(true); };
        p.querySelector('#pr-revisor').onchange = e => { cfg.rev = Object.assign(revCfg(), { revisor: e.target.value }); saveCfg(); revisar(true); };
        p.querySelector('#pr-auto').onchange = e => { cfg.rev = Object.assign(revCfg(), { noLiberar: e.target.checked }); saveCfg(); };
        p.querySelector('#pr-gemini').onchange = e => { cfg.rev = Object.assign(revCfg(), { gemini: e.target.checked }); saveCfg(); if (e.target.checked && !r.ativos.includes('gemini')) rodarMotor(r, 'gemini'); };
        p.querySelector('#pr-colar').onchange = e => { cfg.rev = Object.assign(revCfg(), { aoColar: e.target.checked }); saveCfg(); };
        const tf = p.querySelector('#pr-tri-full'); if (tf) tf.onclick = () => revisar(true, r.depois);
        p.querySelector('#pr-grok').onchange = e => { cfg.rev = Object.assign(revCfg(), { grok: e.target.checked }); saveCfg(); if (e.target.checked && !r.ativos.includes('grok')) { grokSemChave = false; rodarMotor(r, 'grok'); } };
        const poa = p.querySelector('#pr-opus-auto'); if (poa) poa.onchange = e => { cfg.rev = Object.assign(revCfg(), { opusAuto: e.target.checked }); saveCfg(); };
        p.querySelector('#pr-de-novo').onclick = () => revisar(true);
        p.querySelector('#pr-opus').onclick = () => rodarOpus(r, 'pedido manual');
        p.querySelectorAll('.pr-mini[data-maxi]').forEach(el => { el.onclick = () => { mini.delete(el.dataset.maxi); renderRevisao(); }; });
        p.querySelectorAll('.pr-it').forEach(el => {
            const a = todos[+el.dataset.i];
            const mb = el.querySelector('[data-mini-it]'); if (mb) mb.onclick = () => { mini.add(chaveAchado(a)); renderRevisao(); };
            const loc = el.querySelector('[data-loc]'); if (loc) loc.onclick = () => { if (!selecionarTrecho(a.trecho)) { loc.textContent = 'Não achei'; setTimeout(() => { loc.textContent = 'Localizar'; }, 1500); } };
            el.querySelector('[data-ign]').onclick = () => { r.ignorados.add(norm(a.categoria + a.trecho + a.explicacao)); r.nIgnorados = (r.nIgnorados || 0) + 1; revLog(marcaCalib(r, a, 'ignorado')); renderRevisao(); };
            const cb = el.querySelector('[data-cor]'); if (cb) cb.onclick = () => { revLog(marcaCalib(r, a, 'corrigido')); pedirCorrecao(r, a, false); };
            const cm = el.querySelector('[data-com]'); if (cm) cm.onclick = () => abrirComunicacao(null, 'laudo');
            ligarCorrecao(el, r, chaveAchado(a));
        });
        const pf = p.querySelector('#pr-full'); if (pf) pf.onclick = () => pedirCorrecao(r, null, true);
        const fu = p.querySelector('.pr-full'); if (fu) ligarCorrecao(fu, r, '__opus__');
        const bl = p.querySelector('#pr-lib'); if (bl) bl.onclick = () => { const f = r.depois; r.depois = null; fecharRevisao(); if (f) f(); };
        const bc = p.querySelector('#pr-canc'); if (bc) bc.onclick = () => { r.depois = null; renderRevisao(); };
        if (focoResp) { const t = [...p.querySelectorAll('.pr-rt')].find(x => x.dataset.k === focoResp[0]); if (t) { t.focus(); try { t.setSelectionRange(focoResp[1], focoResp[2]); } catch (e) { /* ok */ } } }
    }
    function estadoCorr(cr) {
        if (cr.carregando) return '⏳ trabalhando…';
        if (cr.erro) return '⚠ erro';
        const tr = cr.trocas || [];
        if (tr.length && tr.every(t => t.feito)) return '✓ corrigido';
        if (tr.length) return `${tr.filter(t => !t.feito).length} troca(s) a aplicar`;
        return cr.obs ? '💬 aguardando sua resposta' : 'sem troca';
    }
    const MOTORES = {
        jev: { nome: 'Jev', fn: c => revJev(c) },
        haiku: { nome: 'Haiku', fn: c => revHaiku(c) },
        sonnet: { nome: 'Sonnet', fn: c => revSonnet(c) },
        gemini: { nome: 'Gemini', fn: c => revGemini(c) },
        opus: { nome: 'Opus', fn: c => revOpus(c) },
        grok: { nome: 'Grok', fn: c => revGrok(c) }
    };
    const REV_MODOS = { // v1.25: Gemini e Grok viraram caixinhas opcionais (+ Gemini / + Grok)
        completo: { nome: 'Jev + Claude', motores: ['jev', 'claude'] },
        so_claude: { nome: 'Só Claude', motores: ['claude'] }
    };
    const REVISORES = { opus: 'Claude: Opus', sonnet: 'Claude: Sonnet' };
    const revisorDe = rc => rc.revisor === 'sonnet' ? 'sonnet' : 'opus'; // v1.22: Haiku saiu
    const REV_LLMS = ['opus', 'sonnet', 'gemini', 'grok', 'haiku'];
    // v1.23 — limiares do Jev num só lugar (calibrar com o registro de Ignorar/Corrigir): mostrar ≥ 0,5; sozinho ≥ 0,7; grave ≥ 0,85; juiz < 0,3 = provável falso alarme
    const JEV_LIM = Object.assign({ mostrar: 0.5, sozinho: 0.7, grave: 0.85, falso: 0.3 }, (cfg.rev && cfg.rev.jevLim) || {});
    const REV_EXTENSO = 3000; // caracteres: acima disso o sênior entra sozinho (se ligado)
    function achadosAtuais(r) {
        // ordem: regras e LLMs primeiro (têm trecho); Jev por último, junta-se pela categoria
        const listas = [r.regras || []];
        ['haiku', 'sonnet', 'gemini', 'opus', 'grok'].forEach(m => { if (r.res[m]) listas.push(r.res[m].achados); });
        const base = juntarAchados(listas);
        // Jev confirma itens da mesma categoria (selo com a probabilidade); sozinho só aparece se ≥ 0,7
        if (r.res.jev) r.res.jev.achados.slice().sort((x, y) => y.prob - x.prob).forEach(j => {
            const iguais = base.filter(o => o.categoria === j.categoria);
            if (iguais.length) { iguais.forEach(o => { if (!o.fontes.includes('jev')) o.fontes.push('jev'); o.prob = Math.max(o.prob || 0, j.prob); }); return; }
            if (j.prob >= JEV_LIM.sozinho) base.push(Object.assign({}, j, { fontes: ['jev'], gravidade: j.prob >= JEV_LIM.grave ? j.gravidade : 'atencao' }));
        });
        // v1.23 — Jev como JUIZ: probabilidade de cada achado das IAs ser erro real
        if (r.juiz) base.forEach(a => {
            const p = r.juiz[chaveAchado(a)];
            if (p == null) return;
            a.juiz = p;
            if (p >= JEV_LIM.sozinho && !a.fontes.includes('jev')) { a.fontes.push('jev'); a.prob = Math.max(a.prob || 0, p); }
            if (p < JEV_LIM.falso && !a.fontes.includes('regra') && a.fontes.filter(f => REV_LLMS.includes(f)).length === 1) { a.gravidade = 'atencao'; a.fraco = true; }
        });
        const peso = a => (a.gravidade === 'grave' ? 10 : 0) + a.fontes.length * 3 + (a.fontes.includes('regra') ? 2 : 0) - (a.fraco ? 12 : 0);
        // v1.24: texto mudou pouco (reaproveitado) → some o achado das IAs cujo trecho já não existe (provavelmente corrigido)
        const txtN = r.alterado ? norm(r.ctx.texto) : '';
        const vale = a => !r.alterado || !a.trecho || a.fontes.includes('regra') || txtN.includes(norm(a.trecho).slice(0, 40));
        return base.filter(vale).sort((x, y) => peso(y) - peso(x));
    }
    async function revJevJuiz(r) {
        if (!r.ativos.includes('jev') || r.ctx.texto.length < 30) return;
        r.juiz = r.juiz || {};
        const lista = achadosAtuais(r).filter(a => a.fontes.some(f => REV_LLMS.includes(f)) && !(chaveAchado(a) in r.juiz)).slice(0, 40);
        if (!lista.length) return;
        const questions = {};
        lista.forEach((a, i) => { questions['v' + i] = { type: 'noul', instructions: `É verdade que o laudo contém este erro (${CAT_NOME[a.categoria] || a.categoria})? ${a.explicacao}${a.trecho ? ` — trecho citado: “${a.trecho}”` : ''}` }; });
        const t0 = performance.now();
        try {
            const d = await iaProxy({ acao: 'jev', state: revMensagem(r.ctx), questions });
            lista.forEach((a, i) => { const x = (d.answers || {})['v' + i]; if (x && typeof x.noul === 'number') r.juiz[chaveAchado(a)] = x.noul; });
            r.juizMs = Math.round(performance.now() - t0);
        } catch (e) { r.juizErro = e.message; }
        if (revAtual === r) renderRevisao();
    }
    let grokSemChave = false;
    function rodarMotor(r, m) {
        if (!r.ativos.includes(m)) r.ativos.push(m);
        delete r.err[m]; r.res[m] = null;
        // v1.22.1: tempo máximo por motor — um modelo lento (ex.: Gemini na fila do Google) não segura a revisão nem o Liberar
        const lim = m === 'opus' ? 90000 : m === 'grok' ? 60000 : 45000; // v1.28: Grok 60 s (proxy com raciocínio 'low')
        const corrida = Promise.race([MOTORES[m].fn(r.ctx), new Promise((_, rej) => setTimeout(() => rej(new Error(`demorou mais de ${lim / 1000} s — ignorado nesta revisão`)), lim))]);
        return corrida.then(x => { r.res[m] = x; }).catch(e => {
            // v1.22.1: Grok sem chave cadastrada → some em silêncio até recarregar a página (sem caixa de erro a cada revisão)
            if (m === 'grok' && /XAI_API_KEY/.test(e.message)) { grokSemChave = true; r.ativos = r.ativos.filter(x => x !== 'grok'); return; }
            r.err[m] = e.message;
        }).finally(() => { if (revAtual === r) renderRevisao(); });
    }
    async function rodarOpus(r, motivo) {
        if (r.ativos.includes('opus') && (r.res.opus || !r.err.opus)) return;
        r.motivoOpus = motivo;
        r.carregando = true;
        renderRevisao();
        await rodarMotor(r, 'opus');
        await revJevJuiz(r);
        r.carregando = false;
        if (revAtual === r) renderRevisao();
    }
    // v1.24 — triagem: laudo "normal" (impressão normal, sem regra/Jev acusando, curto) não chama as IAs grandes
    function impressaoNormal(t) {
        // normalização própria: mantém pontuação (o norm() geral tira ponto e dois-pontos)
        const n = String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const re = /(impressao|conclusao|opiniao)/g; let i = -1, m;
        while ((m = re.exec(n))) i = m.index;
        if (i < 0) return false;
        const imp = n.slice(i, i + 500);
        const ok = /(normal|normais|normalidade|sem alteracoes|sem achados|nao (ha|foram|se observ)|sem evidencias?|sem sinais|sem (nodul|lesoes|lesao))/.test(imp);
        // tira só o trecho negado (até vírgula, ponto, ";", quebra ou "exceto/porém/mas")
        const semNegacoes = imp.replace(/(sem|nao (ha|se observa\w*|foram \w+|se identifica\w*|se caracteriza\w*)|ausencia de)((?!\b(exceto|porem|mas|entretanto|salvo)\b)[^.;,\n]){0,80}/g, ' ');
        const achado = /(nodul|cist|calcul|litias|esteatos|massa|lesao|lesoes|espessament|derrame|aumentad|reduzid|dilatac|ectasi|estenos|trombo|fratur|hernia|rads|megalia|colecist|apendic|diverticul|hidronefros|ateromat|placa|refluxo|insuficienc|aneurism|consolidac|atelectas|enfisem|edema|hematom|colecao|abscess|sugestiv|compativ|provavel|inflamat|neoplas|alterac|exceto|porem|variz|varize|tortuos|incompet|calcifica|cirro|hepatopat|nefropat|ateros|ectopi|polip|adenomeg|linfonod|cardiomeg|opacid|vidro fosco|bronquiec|cicatri|sequel|operad|protes|stent|cateter|dreno|corpo estranho)/.test(semNegacoes);
        // impressão longa raramente é "normal": mais de ~220 caracteres → revisão completa
        return ok && !achado && imp.trim().length <= 220;
    }
    function precisaIA(r) {
        if (r.regras.length) return true;
        const j = r.res.jev;
        if (!j) return true; // Jev falhou → revisão completa
        if (j.achados.some(a => (a.prob || 0) >= JEV_LIM.mostrar)) return true;
        if (r.ctx.texto.length > REV_EXTENSO) return true;
        return !impressaoNormal(r.ctx.texto);
    }
    // mudança pequena = até 5% das palavras (mín. 5) — não revisa de novo
    function mudancaPequena(a, b) {
        if (!a || !b) return false;
        const conta = t => { const m = new Map(); norm(t).split(/\s+/).filter(Boolean).forEach(w => m.set(w, (m.get(w) || 0) + 1)); return m; };
        const A = conta(a), B = conta(b); let d = 0, n = 0;
        new Set([...A.keys(), ...B.keys()]).forEach(w => { d += Math.abs((A.get(w) || 0) - (B.get(w) || 0)); n += Math.max(A.get(w) || 0, B.get(w) || 0); });
        return d / 2 <= Math.max(5, n * 0.05);
    }
    const temGrave = r => achadosAtuais(r).some(a => a.gravidade === 'grave');
    // v1.26.1 (usuário): "Liberar c/ IA" só libera sozinho se NÃO houver nenhuma pendência (grave ou atenção);
    // com qualquer achado, para e espera o clique em "Liberar mesmo assim".
    const pendencias = r => achadosAtuais(r).filter(a => !r.ignorados.has(chaveAchado(a))).length;
    // erro que impede liberar sozinho: só do Claude principal (Gemini/Grok lentos ou fora não seguram o Liberar)
    const erroPrincipal = r => !!(r.err[r.revisor] || r.err.jev && !REV_LLMS.some(m => r.res[m]));
    async function revisar(forcar, depois, opc = {}) {
        const c = contextoLaudo();
        if (!c) return null;
        const hash = hashTxt(c.texto + '|' + c.exame + '|' + c.critico);
        const rc = revCfg();
        const modo = REV_MODOS[rc.modo] ? rc.modo : 'completo';
        // reaproveita: mesmo exame e texto igual ou quase igual (v1.24) — inclusive se ainda está rodando
        // v1.26.2: para LIBERAR (depois) só reaproveita se o texto for EXATAMENTE o revisado — 1 palavra trocada
        // (ex.: direito → esquerdo) passava como "mudança pequena" e liberava sem nova revisão.
        const mesmoTexto = revAtual && revAtual.hashRevisado === hash;
        if (!forcar && revAtual && revAtual.exa === c.exa && revAtual.modo === modo && revAtual.revisor === revisorDe(rc)
            && (mesmoTexto || (!depois && mudancaPequena(revAtual.ctx.texto, c.texto)))) {
            const r0 = revAtual;
            if (r0.hash !== hash) { r0.alterado = true; r0.ctx = c; r0.regras = regrasLaudo(c); r0.hash = hash; }
            if (opc.auto) return r0;
            r0.depois = depois || null;
            if (r0.depois && !r0.carregando && !pendencias(r0) && !erroPrincipal(r0)) { const f = r0.depois; r0.depois = null; fecharRevisao(); f(); return r0; }
            r0.min = false; renderRevisao(); return r0;
        }
        const rasc = revAtual && revAtual.exa === c.exa ? (document.getElementById('pr-ped') || {}).value || revAtual.rascunho || '' : '';
        const r = revAtual = { rascunho: rasc, hash, hashRevisado: hash, exa: c.exa, ctx: c, modo, regras: regrasLaudo(c), res: {}, err: {}, ativos: [], motivoOpus: '', carregando: true, ignorados: new Set(), depois: depois || null, min: !!opc.auto, auto: !!opc.auto };
        renderRevisao();
        r.revisor = revisorDe(rc);
        if (c.texto.length >= 30) {
            const motores = REV_MODOS[modo].motores;
            const triar = !forcar && rc.triagem !== false && motores.includes('jev') && (opc.auto || !!depois);
            if (triar) { await rodarMotor(r, 'jev'); if (!precisaIA(r)) r.triagem = 'normal'; }
        }
        if (c.texto.length >= 30 && r.triagem !== 'normal') {
            const onda = REV_MODOS[modo].motores.filter(m => !(m === 'jev' && r.res.jev)).map(m => rodarMotor(r, m === 'claude' ? r.revisor : m));
            if (rc.grok && !grokSemChave) onda.push(rodarMotor(r, 'grok')); // v1.22.1: Grok opcional, junto de qualquer modo
            if (rc.gemini) onda.push(rodarMotor(r, 'gemini')); // v1.28.1: ligado por padrão (API paga)
            if (rc.opusAuto && r.revisor !== 'opus' && c.texto.length > REV_EXTENSO) { r.motivoOpus = `laudo extenso (${c.texto.length} caracteres)`; onda.push(rodarMotor(r, 'opus')); }
            await Promise.all(onda);
            await revJevJuiz(r); // v1.23: Jev confere cada achado das IAs (< 1 s)
            // discordância: item grave apontado por UMA só IA quando havia duas ou mais rodando
            const ias = r.ativos.filter(m => ['opus', 'sonnet', 'gemini', 'grok'].includes(m) && r.res[m]); // discordância só entre LLMs (Jev é checklist)
            if (rc.opusAuto && !r.ativos.includes('opus') && ias.length >= 2) {
                const disc = achadosAtuais(r).find(a => a.gravidade === 'grave' && !a.fontes.includes('regra') && a.fontes.filter(f => ias.includes(f)).length === 1);
                if (disc) { r.motivoOpus = `as IAs discordaram (“${CAT_NOME[disc.categoria] || disc.categoria}”)`; await rodarMotor(r, 'opus'); await revJevJuiz(r); }
            }
        }
        r.carregando = false;
        const reg = { t: Date.now(), tipo: c.tipo, modo, n: c.texto.length, nR: r.regras.length, erros: Object.keys(r.err).join(''), triagem: r.triagem || 'completa', auto: !!opc.auto };
        Object.entries(r.res).forEach(([m, x]) => { if (x) Object.assign(reg, { [m + 'Ms']: Math.round(x.ms), [m + 'In']: x.tin, [m + 'Out']: x.tout, [m + 'N']: x.achados.length }); });
        revLog(reg);
        if (revAtual === r) {
            // revisão do "Liberar c/ IA" sem NENHUMA pendência → segue sozinho (v1.26.1: antes bastava não ter grave)
            if (r.depois && !pendencias(r) && !erroPrincipal(r)) { const f = r.depois; r.depois = null; fecharRevisao(); f(); return r; }
            renderRevisao();
        }
        return r;
    }
    // ---------- Zoom só da folha do laudo (visual; impressão intacta) ----------
    // v1.19 — PDF do laudo (blob: aberto em outra aba no leitor do Chrome) já abre no zoom escolhido.
    // O leitor de PDF do Chrome aceita parâmetros no fim do endereço: #zoom=110 / #view=FitH / #view=Fit.
    function urlPdfComZoom(u) {
        try {
            const s = String(u || '');
            if (!cfg.master || !on('zoomPdf') || !/^blob:/i.test(s) || s.includes('#')) return u;
            const z = String(cfg.zoomPdf || '110');
            const frag = z === 'largura' ? '#view=FitH' : z === 'pagina' ? '#view=Fit' : z === '100' ? '' : '#zoom=' + z;
            return frag ? s + frag : u;
        } catch (e) { return u; }
    }
    (function ganchoPdf() {
        const abrir = window.open;
        window.open = function (u, ...resto) { return abrir.call(this, urlPdfComZoom(u), ...resto); };
        const clicar = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
            if (!this.hasAttribute('download') && /^blob:/i.test(this.href || '')) { const n = urlPdfComZoom(this.href); if (n !== this.href) this.href = n; }
            return clicar.call(this);
        };
        document.addEventListener('click', e => {
            const a = e.target && e.target.closest && e.target.closest('a[href^="blob:"]');
            if (a && !a.hasAttribute('download')) { const n = urlPdfComZoom(a.href); if (n !== a.href) a.href = n; }
        }, true);
    })();

    // v1.18 — oculta botões do CKEditor pelo nome (dropdown inteiro, não só o botão)
    function ckOcultarCss() {
        const nomes = String(cfg.ckOcultar || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => x.replace(/["\\]/g, ''));
        setCss('pp-ck-ocultar', cfg.master && on('editor') && nomes.length ? nomes.map(n => `.document-editor .ck.ck-toolbar .ck-toolbar__items > :is([data-cke-tooltip-text^="${n}"], :has(> [data-cke-tooltip-text^="${n}"]))`).join(',\n') + ' { display: none !important; }' : '');
    }
    // v1.18 — ocultar linhas da lista (liberados / modalidades) sem mexer no filtro do PACS.
    // A linha i da tabela é o exame i do componente da lista (conferido 19/10/2026: 50/50).
    const OCUL_GRUPOS = [['lib', 'LIB', 'Exames LIBERADOS'], ['CT', 'TC', 'Tomografia (CT)'], ['US', 'US', 'Ultrassom'], ['RX', 'RX', 'Raio-X (CR/DX)'], ['OUT', 'Outros', 'Demais modalidades (MR, MG, ECG, OT…)']];
    const grupoMod = sig => { sig = String(sig || '').toUpperCase(); return sig === 'CT' || sig === 'US' ? sig : (sig === 'CR' || sig === 'DX') ? 'RX' : 'OUT'; };
    let oculStat = { n: 0, total: 0 };
    function ocultarLinhasLista() {
        const f = findListTable(), comp = f && componenteLista();
        const o = cfg.ocultarLista || { lib: false, mods: [] };
        let n = 0, total = 0;
        if (f && comp) {
            const linhas = [...f.t.querySelectorAll('tbody > tr')];
            const ok = linhas.length === comp.exames.length;
            linhas.forEach((tr, i) => {
                const ex = ok ? comp.exames[i] : null;
                if (ex) total++;
                const sit = String(ex && ex.exa_situacao || '').toUpperCase();
                const mod = ex && ex.tipoexame && ex.tipoexame.modalidade && ex.tipoexame.modalidade.mod_sigla;
                const esconder = !!ex && cfg.master && ((o.lib && sit === 'LIBERADO') || o.mods.includes(grupoMod(mod)));
                if (esconder) { n++; if (!tr.hasAttribute('data-pp-oc')) tr.setAttribute('data-pp-oc', ''); }
                else if (tr.hasAttribute('data-pp-oc')) tr.removeAttribute('data-pp-oc');
            });
        }
        oculStat = { n, total };
    }
    setInterval(ocultarLinhasLista, 700);

    // v1.32 — zoom só da LISTA de exames (nome, idade, exame, data…), sem mexer no zoom do Chrome. Controle A− % A+ na barra do topo.
    function zoomListaCss() {
        const z = cfg.zoomLista || 100;
        setCss('pp-zoom-lista', z !== 100 ? `.v-main .v-data-table.elevation-1 > .v-data-table__wrapper { zoom: ${z / 100}; }` : '');
    }
    function zoomListaCtl() {
        zoomListaCss();
        const d = document.getElementById('pp-dock');
        let w = document.getElementById('ppd-zlista');
        if (!d) { if (w) w.remove(); return; }
        if (w) { const v = w.querySelector('.pz-v'), t = (cfg.zoomLista || 100) + '%'; if (v.textContent !== t) v.textContent = t; if (w.parentElement !== d) d.appendChild(w); return; }
        w = document.createElement('span'); w.id = 'ppd-zlista'; w.className = 'pp-zoom-laudo pp-zoom-lista'; w.title = 'Tamanho da letra da lista de exames';
        w.innerHTML = '<span class="pz-l">Lista</span><button type="button" class="pz-b" data-d="-10" title="Diminuir a lista">A−</button><button type="button" class="pz-v" title="Voltar a 100%"></button><button type="button" class="pz-b" data-d="10" title="Aumentar a lista">A+</button>';
        w.querySelector('.pz-v').textContent = (cfg.zoomLista || 100) + '%';
        w.addEventListener('click', e => {
            const b = e.target.closest('button'); if (!b) return;
            e.stopPropagation();
            const z = b.dataset.d ? (cfg.zoomLista || 100) + Number(b.dataset.d) : 100;
            cfg.zoomLista = Math.min(160, Math.max(80, z)); saveCfg();
            w.querySelector('.pz-v').textContent = cfg.zoomLista + '%'; zoomListaCss();
        });
        d.appendChild(w);
        setCss('pp-zoom-lista-ui', '#pp-dock .pp-zoom-lista { display: inline-flex; align-items: center; gap: 0; height: 26px; border: 1px solid #4a5058; border-radius: 6px; padding: 0 2px; background: #1f2937; } #pp-dock .pp-zoom-lista .pz-l { color: #94a3b8; font-size: 11px; padding: 0 4px; } #pp-dock .pp-zoom-lista button { background: none; border: 0; color: #e2e8f0; cursor: pointer; font: 700 12px -apple-system,"Segoe UI",Roboto,sans-serif; padding: 2px 5px; border-radius: 4px; } #pp-dock .pp-zoom-lista button:hover { background: rgba(148,163,184,.2); } #pp-dock .pp-zoom-lista .pz-v { min-width: 38px; color: #93c5fd; }');
    }
    setInterval(() => { try { if (cfg.master) zoomListaCtl(); } catch (e) { /* segue */ } }, 1500);
    function zoomLaudoCss() {
        const z = cfg.zoomLaudo || 100;
        setCss('pp-zoom-laudo', on('zoomLaudo') && z !== 100 ? `@media screen { .v-dialog__content .document-editor .ck-editor__editable { zoom: ${z / 100}; } }` : '');
    }
    function zoomLaudoCtl() {
        zoomLaudoCss();
        const tb = document.querySelector('.v-dialog__content .document-editor__toolbar');
        let w = tb && tb.querySelector(':scope > .pp-zoom-laudo');
        if (!tb || !on('zoomLaudo')) { if (w) w.remove(); return; }
        if (w) { const v = w.querySelector('.pz-v'); const txt = (cfg.zoomLaudo || 100) + '%'; if (v.textContent !== txt) v.textContent = txt; return; }
        w = document.createElement('span');
        w.className = 'pp-zoom-laudo';
        w.innerHTML = '<button type="button" class="pz-b" data-d="-10" title="Diminuir a folha do laudo">A−</button><button type="button" class="pz-v" title="Voltar a 100%"></button><button type="button" class="pz-b" data-d="10" title="Aumentar a folha do laudo">A+</button>';
        w.querySelector('.pz-v').textContent = (cfg.zoomLaudo || 100) + '%';
        w.addEventListener('mousedown', e => e.preventDefault());
        w.addEventListener('click', e => {
            const b = e.target.closest('button'); if (!b) return;
            e.stopPropagation();
            const z = b.dataset.d ? (cfg.zoomLaudo || 100) + Number(b.dataset.d) : 100;
            cfg.zoomLaudo = Math.min(160, Math.max(90, z)); saveCfg();
            w.querySelector('.pz-v').textContent = cfg.zoomLaudo + '%'; zoomLaudoCss();
        });
        const rev = tb.querySelector(':scope > .pp-rev-btn') || tb.querySelector(':scope > .pp-calc-laudo');
        if (rev && rev.nextSibling) tb.insertBefore(w, rev.nextSibling); else tb.appendChild(w);
    }
    // v1.25 — botões no rodapé do laudo: Aberto · Digitado · Revisar · [🛡 Conferir] [✔ Liberar c/ IA] Liberar · · Cancelar
    function revBotoesRodape() {
        const lib = [...document.querySelectorAll('.v-dialog__content .row button')].find(b => b.offsetParent && norm(b.innerText) === 'liberar');
        const row = lib && lib.parentElement;
        document.querySelectorAll('.pp-rod-btn').forEach(x => { if (!row || x.parentElement !== row) x.remove(); });
        if (!row || !on('revisaoIA') || !editorLaudo()) return;
        const canc = [...row.children].find(b => b.classList.contains('pp-canc-sep') || norm(b.innerText) === 'cancelar');
        if (canc && !canc.classList.contains('pp-canc-sep')) { canc.classList.add('pp-canc-sep'); canc.title = 'Cancelar (fecha sem salvar)'; }
        row.classList.add('pp-rodape'); // v1.28: barra compacta (CSS revisaoIA)
        const fazer = (cls, txt, tit, fn) => {
            let b = row.querySelector(':scope > .' + cls);
            if (!b) {
                b = document.createElement('button'); b.type = 'button';
                b.className = 'white--text ma-1 v-btn v-btn--is-elevated v-btn--has-bg theme--dark v-size--small pp-rod-btn ' + cls;
                b.innerHTML = '<span class="v-btn__content">' + txt + '</span>'; b.title = tit;
                b.addEventListener('mousedown', e => e.preventDefault());
                b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fn(); });
            }
            if (b.nextSibling !== lib && cls === 'pp-rod-lib') row.insertBefore(b, lib);
            return b;
        };
        const bl = fazer('pp-rod-lib', '✔ Liberar c/ IA', 'Confere com regras + Jev + Claude e libera: laudo normal sai em ~1 s; com achado, abre a revisão e libera sozinho se não houver nada grave.', () => {
            revisar(false, () => { revLiberando = true; try { lib.click(); } finally { revLiberando = false; } });
        });
        const bc = fazer('pp-rod-conf', '<i aria-hidden="true" class="v-icon notranslate mdi mdi-shield-search theme--dark"></i>', '🛡 Conferir — revisão completa por IA (regras + Jev + Claude), sem liberar. ✍ Corrigir só altera o laudo ao clicar Aplicar.', () => abrirRevisao());
        if (bc.nextSibling !== bl) row.insertBefore(bc, bl);
    }
    function revBtn() {
        const tb = document.querySelector('.v-dialog__content .document-editor__toolbar');
        let b = tb && tb.querySelector(':scope > .pp-rev-btn');
        try { revBotoesRodape(); } catch (e) { /* segue */ }
        if (b) b.remove(); // v1.25: o 🛡 saiu da barra do editor (agora no rodapé)
        if (!tb) fecharRevisao();
        return;
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'v-btn v-btn--text theme--dark v-size--small pp-rev-btn';
        b.innerHTML = '<span class="v-btn__content">🛡 Rev.</span>';
        b.title = 'Revisão do laudo: regras fixas + Jev + IA (Claude Opus ou Sonnet, Gemini 3.8 Flash, Grok). Revisa sozinho ao colar e ao Liberar; laudo normal não chama as IAs. ✍ Corrigir só altera o laudo ao clicar Aplicar (Ctrl+Z desfaz).';
        b.addEventListener('mousedown', e => e.preventDefault());
        b.onclick = e => { e.stopPropagation(); abrirRevisao(); };
        const calc = tb.querySelector(':scope > .pp-calc-laudo');
        if (calc && calc.nextSibling) tb.insertBefore(b, calc.nextSibling); else tb.insertBefore(b, tb.firstChild);
    }
    // v1.24 — Revisar ao colar: 3 s depois da última mudança no texto (só uma vez por versão do laudo; mudança pequena não repete)
    let revObsEd = null, revObsUlt = 0;
    setInterval(() => {
        try {
            if (!cfg.master || !on('revisaoIA') || revCfg().aoColar === false) return;
            const ed = editorLaudo();
            if (!ed) { revObsEd = null; return; }
            if (revObsEd !== ed) { revObsEd = ed; revObsUlt = 0; ed.model.document.on('change:data', () => { revObsUlt = Date.now(); }); return; }
            if (!revObsUlt || Date.now() - revObsUlt < 3000) return;
            revObsUlt = 0;
            const c = contextoLaudo();
            if (!c || c.texto.length < 80) return;
            if (revAtual && revAtual.exa === c.exa && revAtual.carregando) return; // termina a atual; o Liberar confere se mudou muito
            revisar(false, null, { auto: true });
        } catch (e) { /* segue */ }
    }, 1500);
    // Revisar ao clicar Liberar (opcional)
    let revLiberando = false;
    document.addEventListener('click', e => {
        if (revLiberando || !on('revisaoIA') || !revCfg().noLiberar) return;
        const b = e.target.closest && e.target.closest('.v-dialog__content button');
        if (!b || norm(b.innerText) !== 'liberar' || !editorLaudo()) return;
        e.preventDefault(); e.stopImmediatePropagation();
        revisar(false, () => { revLiberando = true; try { b.click(); } finally { revLiberando = false; } });
    }, true);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('pp-rev')) { fecharRevisao(); } }, true);

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
#pp-panel { position: fixed; top: 46px; left: 140px; width: 520px; max-width: 96vw; max-height: 82vh; overflow: auto; z-index: 10000002; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; box-shadow: 0 16px 40px rgba(0,0,0,.6); font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: none; }
#pp-panel.open { display: block; }
#pp-panel * { box-sizing: border-box; }
#pp-panel .pp-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 8px 0; border-bottom: 1px solid #334155; position: sticky; top: 0; background: #0f172a; }
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
        btn.onclick = () => { const p = document.getElementById('pp-panel'); if (p) delete p.dataset.pos; togglePanel(); };
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
        const tabs = [['busca', '🔎 Pesquisa'], ['calc', '🧮 Calc.'], ['filtros', '🧩 Filtros'], ['prazos', '⏱ Prazos'], ['urg', '🚨 Urgências'], ['cheg', '🩺 Chegada'], ['ajustes', '⚙️ Ajustes']];
        p.innerHTML = `<div class="pp-tabs">${tabs.map(([k, n]) => `<button class="pp-tab ${activeTab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}<button class="pp-close" title="Fechar (Esc)">✕</button></div><div class="pp-body"></div>`;
        p.querySelectorAll('.pp-tab').forEach(b => { b.onclick = () => { activeTab = b.dataset.tab; renderPanel(); }; });
        p.querySelector('.pp-close').onclick = () => togglePanel(false);
        const body = p.querySelector('.pp-body');
        if (activeTab === 'busca') renderBusca(body);
        else if (activeTab === 'calc') renderCalc(body);
        else if (activeTab === 'filtros') renderFiltros(body);
        else if (activeTab === 'prazos') renderPrazos(body);
        else if (activeTab === 'urg') renderUrgencias(body);
        else if (activeTab === 'cheg') renderChegada(body);
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
<div class="pp-row" style="margin-top:8px;"><span class="pp-muted" id="pp-calc-txt"></span><span style="display:flex;gap:6px;flex:0 0 auto;">${editorLaudo() ? '<button class="pp-btn" id="pp-calc-ins" title="Insere onde está o cursor do laudo">↵ Inserir no laudo</button>' : ''}<button class="pp-btn ${editorLaudo() ? 'sec' : ''}" id="pp-calc-copy">📋 Copiar</button></span></div>`;
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
            setTimeout(() => { b.textContent = '📋 Copiar'; }, 1500);
        };
        const ins = body.querySelector('#pp-calc-ins');
        if (ins) ins.onclick = () => {
            if (!ultimo) return;
            const ok = inserirNoLaudo(ultimo.texto);
            ins.textContent = ok ? '✓ Inserido' : 'Falhou — use Copiar';
            setTimeout(() => { ins.textContent = '↵ Inserir no laudo'; }, 1500);
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
${on('slaUteis') ? '' : '<div class="pp-warn">O ajuste “Prazo (SLA) eletivo (TC e US) em dias úteis” está desligado em ⚙️ Ajustes.</div>'}
<div class="pp-muted">O dia do exame não conta. Vence na abertura do N-ésimo dia útil seguinte. Fim de semana e feriados não contam.
${slaStat.ultimo ? `Exames recalculados na lista agora: <b>${slaStat.ajustados}</b>.` : ''}</div>
<div class="pp-h">SLAs do PACS a recalcular (descrição, um por linha)</div>
<textarea id="pp-sla-slas" rows="2">${esc(r.slas)}</textarea>
<div class="pp-muted">Exame com SLA de urgência nunca é alterado.</div>
<div class="pp-grid2">
<label>Dias úteis por modalidade<textarea id="pp-sla-dias" rows="2">${esc(r.dias)}</textarea></label>
<label>Pronto até (hora do dia final)<input id="pp-sla-hora" value="${esc(r.hora)}" placeholder="07:00"></label></div>
<div class="pp-grid2"><label>TC: situações em que o exame é seu (prazo aparece)<input id="pp-sla-tcsit" value="${esc(r.tcSituacoes)}"></label>
<label>US: situações com prazo próprio<input id="pp-sla-ussit" value="${esc(r.usSituacoes)}"></label></div>
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
            cfg.sla = Object.assign({}, cfg.sla, {
                tcSituacoes: body.querySelector('#pp-sla-tcsit').value.trim() || 'REVISAR',
                usSituacoes: body.querySelector('#pp-sla-ussit').value.trim() || 'REVISAR',
                slas: body.querySelector('#pp-sla-slas').value,
                dias: body.querySelector('#pp-sla-dias').value,
                hora: /^\d{1,2}:\d{2}$/.test(hora) ? hora : SLA_PADRAO.hora,
                carnaval: body.querySelector('#pp-sla-carnaval').checked,
                extras: body.querySelector('#pp-sla-extras').value
            });
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

    // Aba 🚨 Urgências: monitor de TC urgente (escala, celular, testes)
    function renderUrgencias(body) {
        const u = cfg.urg, e = urgEstado(), agora = Date.now(), dias = janelaDias();
        let lider = null; try { lider = JSON.parse(localStorage.getItem(URG_LIDER_KEY)); } catch (x) { lider = null; }
        const vigiaAqui = lider && lider.id === URG_TAB && agora - lider.ts < URG_LIDER_TTL;
        const grupos = e.dia === chaveDia(new Date()) ? Object.values(e.grupos || {}) : [];
        const abertos = grupos.filter(g => g.aberto).sort((a, b) => (a.vence || 9e15) - (b.vence || 9e15));
        const fechados = grupos.filter(g => !g.aberto && g.motivo && g.motivo !== 'jaLiberado').length;
        const estado = !urgLigado() ? '⚪ Monitor desligado neste computador' : urgPausado() ? '⏸ Pausado até ' + esc(u.pausaAte) : '🟢 Monitor ligado neste computador';
        body.innerHTML = `
<div class="pp-res" style="margin-top:0;"><b>${estado}</b>${urgModoTeste() ? ' · <span class="pp-warn">MODO TESTE até ' + hm(cfg.urg.testeAte) + ' (inclui pacientes TESTE)</span>' : ''}
<div class="pp-muted">Agora: ${naEscalaData(new Date()) ? 'dentro' : 'fora'} da escala · última leitura: ${e.ultLeitura ? hm(e.ultLeitura) : '—'}${urgLigado() ? ' · ' + (vigiaAqui ? 'esta aba é a que vigia' : 'outra aba deste computador vigia') : ''}${e.erro ? ' · <span class="pp-warn">' + esc(e.erro) + '</span>' : ''}</div>
${abertos.length ? abertos.map(g => `<div>🚨 <b>${esc(g.nome)}</b> — ${esc(Object.values(g.exames || {}).map(y => y.d).join(' + '))} · ${g.vence ? 'vence <b>' + hm(g.vence) + '</b>' + (g.provisorio ? ' (provisório)' : '') : '<b>aguardando confirmação</b> (cronômetro parado)'}</div>`).join('') : '<div class="pp-muted">Nenhum TC urgente aberto agora.</div>'}
${fechados ? `<div class="pp-muted">Encerrados hoje: ${fechados}</div>` : ''}</div>
<label class="pp-tog"><input type="checkbox" id="pp-u-tela" ${u.tela ? 'checked' : ''}><span>Alerta na tela deste computador<small>Cartão no canto da tela, som e notificação do sistema.</small></span></label>
<label class="pp-tog"><input type="checkbox" id="pp-u-cel" ${u.celular ? 'checked' : ''}><span>Enviar avisos ao celular a partir deste computador<small>Pode ligar em mais de um (ex.: Mac de casa sempre ligado + PC do hospital). Só um envia por vez; se ele parar ou a sessão do PACS expirar, o outro assume em ~2 min. Precisa do login da Agenda (🔐) nos dois e do MESMO tópico do ntfy.</small></span></label>
${u.celular ? `<div class="pp-res" style="margin-top:0;">${urgPapel === 'lider' ? '📡 <b>Este computador (' + esc(urgPcNome()) + ') está enviando ao celular.</b>' : urgPapel === 'inicial' ? '⏳ verificando qual computador envia…' : urgPapel === 'reserva' ? '🛟 <b>Reserva</b> — quem envia agora: <b>' + esc(urgLiderNome || 'outro computador') + '</b>. Este assume se ele parar.' : '📡 Enviando sozinho' + (urgLeaseErro ? ' <span class="pp-warn">(' + esc(urgLeaseErro) + ' — se outro PC também enviar, os avisos chegam repetidos)</span>' : '')}</div>` : ''}
<div class="pp-grid2"><label>Nome deste computador (aparece nos avisos)<input id="pp-u-nomepc" value="${esc(u.nomePc)}" placeholder="${esc(urgPcNome())}"></label><span></span></div>
<label class="pp-tog"><input type="checkbox" id="pp-u-teste" ${urgModoTeste() ? 'checked' : ''}><span>Modo teste (desliga sozinho em 2 h)<small>Além dos urgentes reais, vigia os pacientes TESTE de qualquer data, mesmo fora da escala. Marque um TC do paciente TESTE como urgente para testar.</small></span></label>
<div class="pp-h">Sua escala — TC urgente fora dela é telelaudo (sem aviso, sem prazo)</div>
<div class="pp-checks">${DIAS_SEM.map((n, i) => `<label><input type="checkbox" data-udia="${i}" ${dias.includes(i) ? 'checked' : ''}>${n}</label>`).join('')}</div>
<div class="pp-grid3"><label>Início<input id="pp-u-ini" value="${esc(u.inicio)}" placeholder="07:00"></label><label>Fim<input id="pp-u-fim" value="${esc(u.fim)}" placeholder="17:00"></label><label>Modalidades<input id="pp-u-mods" value="${esc(u.modalidades)}"></label></div>
<div class="pp-grid3"><label>Lembretes (min antes)<input id="pp-u-lemb" value="${esc(u.lembretes)}"></label><label>Repetir vencido a cada (min)<input id="pp-u-rep" value="${esc(u.repetirVencido)}"></label><label>… quantas vezes<input id="pp-u-vezes" value="${esc(u.repetirVezes)}"></label></div>
<div class="pp-grid3"><label>Prazo da urgência (h)<input id="pp-u-horas" value="${esc(u.horas)}"></label><label>Avisar sem confirmação após (min)<input id="pp-u-semc" value="${esc(u.semConfirmacao)}"></label><label>Encerra quando<input id="pp-u-enc" value="${esc(u.encerra)}"></label></div>
<label class="pp-tog"><input type="checkbox" id="pp-u-prov" ${u.provisorio ? 'checked' : ''}><span>Prazo provisório antes da confirmação (modo antigo)<small>Desligado (recomendado): o cronômetro só começa quando os técnicos confirmam o exame no PACS — igual ao SLA do PACS. Ligado: conta ${esc(u.horas)} h desde a marcação de urgente.</small></span></label>
<div class="pp-grid2"><label>Pausar avisos até (férias/folga)<input type="date" id="pp-u-pausa" value="${esc(u.pausaAte)}"></label>
<div class="pp-checks" style="margin-top:16px;"><span class="pp-muted" title="Pedido do usuário: nunca tocar som (computador e celular)">🔇 Sem som (sempre)</span><input type="checkbox" id="pp-u-som" hidden><label><input type="checkbox" id="pp-u-notif" ${u.notifWindows ? 'checked' : ''}>Notificação do sistema</label></div></div>
<div class="pp-h">Celular — app ntfy (grátis, Android e iPhone)</div>
<div class="pp-grid2"><label>Tópico (funciona como senha)<input id="pp-u-topico" value="${esc(u.ntfyTopico)}" placeholder="clique em Gerar"></label><label>Servidor<input id="pp-u-serv" value="${esc(u.ntfyServidor)}"></label></div>
<div class="pp-row"><span class="pp-muted">No celular: app <b>ntfy</b> → <b>+</b> → cole o tópico → Inscrever.</span><span style="white-space:nowrap;"><button class="pp-btn sec" id="pp-u-gerar">Gerar</button> <button class="pp-btn sec" id="pp-u-copiar">Copiar</button></span></div>
<div class="pp-h">Telegram (opcional)</div>
<div class="pp-grid2"><label>Token do bot (@BotFather)<input id="pp-u-tgtok" value="${esc(u.tgToken)}"></label><label>Chat ID<input id="pp-u-tgchat" value="${esc(u.tgChat)}"></label></div>
<div class="pp-row"><span class="pp-muted">Crie o bot no @BotFather, mande /start para ele e clique em Descobrir.</span><button class="pp-btn sec" id="pp-u-tgdesc">Descobrir</button></div>
<div class="pp-h">Pushover (opcional — toca mesmo com o iPhone no silencioso)</div>
<div class="pp-grid2"><label>User key<input id="pp-u-pouser" value="${esc(u.poUser)}"></label><label>API token do app<input id="pp-u-potok" value="${esc(u.poToken)}"></label></div>
<input type="checkbox" id="pp-u-poemerg" hidden><div class="pp-muted">🔇 Pushover também sempre silencioso (sem emergência repetindo).</div>
<div class="pp-row" style="margin-top:8px;"><span style="white-space:nowrap;"><button class="pp-btn sec" id="pp-u-perm">Permitir notificações</button> <button class="pp-btn sec" id="pp-u-testar">Enviar teste</button></span><button class="pp-btn" id="pp-u-salvar">Salvar</button></div>
<div class="pp-res" id="pp-u-res" style="display:none;"></div>
<div class="pp-muted" style="margin-top:8px;">Em cada computador que vigia: Chrome → Configurações → Desempenho → <b>Economia de memória</b> → “Sempre manter estes sites ativos” → adicione <b>pacs.ladi.org.br</b>; não deixe o computador dormir/hibernar no horário da escala (Mac: Ajustes → Bateria/Energia → “Impedir repouso automático com a tela desligada”). Nome de paciente nunca vai para o celular. Tópico e tokens ficam só neste computador.</div>`;
        const $ = id => body.querySelector(id);
        const res = txt => { const r = $('#pp-u-res'); r.style.display = 'block'; r.innerHTML = txt; };
        const hora = (v, padrao) => /^\d{1,2}:\d{2}$/.test(String(v).trim()) ? String(v).trim().padStart(5, '0') : padrao;
        const inteiro = (v, padrao, min, max) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= min && n <= max ? n : padrao; };
        $('#pp-u-gerar').onclick = () => { if ($('#pp-u-topico').value && !confirm('Gerar um tópico NOVO? Você terá que inscrever o celular de novo.')) return; $('#pp-u-topico').value = urgGerarTopico(); res('Tópico novo gerado — clique em <b>Salvar</b> e inscreva o celular nele.'); };
        $('#pp-u-copiar').onclick = async () => { try { await navigator.clipboard.writeText($('#pp-u-topico').value); res('Tópico copiado.'); } catch (x) { $('#pp-u-topico').select(); res('Selecione e copie (Ctrl+C).'); } };
        $('#pp-u-tgdesc').onclick = async () => {
            try { const id = await tgDescobrirChat($('#pp-u-tgtok').value); if (id) { $('#pp-u-tgchat').value = id; res('Chat ID encontrado: <b>' + esc(id) + '</b> — clique em Salvar.'); } else res('Nenhuma mensagem encontrada. Mande /start para o seu bot no Telegram e tente de novo.'); }
            catch (x) { res('Telegram: ' + esc(x.message || x)); }
        };
        $('#pp-u-perm').onclick = async () => {
            urgAudioCtx();
            if (!('Notification' in window)) return res('Este navegador não tem notificações do sistema.');
            const p = await Notification.requestPermission();
            res(p === 'granted' ? '✅ Notificações permitidas neste navegador. Som liberado.' : p === 'denied' ? '❌ Notificações bloqueadas — libere no cadeado ao lado do endereço do site.' : 'Permissão não concedida.');
        };
        $('#pp-u-salvar').onclick = async () => {
            recarregarCfg();
            const antes = Object.assign({}, cfg.urg);
            const n = {
                tela: $('#pp-u-tela').checked, celular: $('#pp-u-cel').checked, teste: $('#pp-u-teste').checked, nomePc: $('#pp-u-nomepc').value.trim().slice(0, 30),
                testeAte: $('#pp-u-teste').checked ? (urgModoTeste() ? cfg.urg.testeAte : Date.now() + 2 * 3600000) : 0,
                dias: [...body.querySelectorAll('[data-udia]')].filter(c => c.checked).map(c => c.dataset.udia).join(','),
                inicio: hora($('#pp-u-ini').value, URG_PADRAO.inicio), fim: hora($('#pp-u-fim').value, URG_PADRAO.fim),
                modalidades: $('#pp-u-mods').value.trim() || 'CT',
                lembretes: lembretesMinDe($('#pp-u-lemb').value).join(',') || URG_PADRAO.lembretes,
                repetirVencido: inteiro($('#pp-u-rep').value, URG_PADRAO.repetirVencido, 0, 120),
                repetirVezes: inteiro($('#pp-u-vezes').value, URG_PADRAO.repetirVezes, 0, 12),
                horas: inteiro($('#pp-u-horas').value, URG_PADRAO.horas, 1, 48),
                semConfirmacao: inteiro($('#pp-u-semc').value, URG_PADRAO.semConfirmacao, 1, 240),
                provisorio: $('#pp-u-prov').checked,
                encerra: $('#pp-u-enc').value.trim() || 'LIBERADO',
                pausaAte: $('#pp-u-pausa').value || '',
                som: false, notifWindows: $('#pp-u-notif').checked,
                ntfyTopico: $('#pp-u-topico').value.trim(), ntfyServidor: $('#pp-u-serv').value.trim() || URG_PADRAO.ntfyServidor,
                tgToken: $('#pp-u-tgtok').value.trim(), tgChat: $('#pp-u-tgchat').value.trim(),
                poUser: $('#pp-u-pouser').value.trim(), poToken: $('#pp-u-potok').value.trim(), poEmergencia: $('#pp-u-poemerg').checked
            };
            if (n.celular && !n.ntfyTopico) n.ntfyTopico = urgGerarTopico();
            // desligou o envio ou trocou de tópico: cancela os vigias do tópico antigo (senão chegaria "monitor parou")
            if (antes.celular && antes.ntfyTopico && (!n.celular || n.ntfyTopico !== antes.ntfyTopico)) {
                await ntfyAcao('pp-vigia', 'delete', antes.ntfyTopico);
                await ntfyAcao('pp-inicio', 'delete', antes.ntfyTopico);
                const e2 = urgEstado(); e2.vigiaEm = 0; e2.diaAtivo = ''; urgSalvar(e2);
            }
            cfg.urg = Object.assign({}, URG_PADRAO, n);
            saveCfg();
            if (!urgLigado()) { try { const l = JSON.parse(localStorage.getItem(URG_LIDER_KEY)); if (l && l.id === URG_TAB) localStorage.removeItem(URG_LIDER_KEY); } catch (x) { /* ok */ } }
            urgBanner();
            renderUrgencias(body);
            const r2 = body.querySelector('#pp-u-res'); r2.style.display = 'block';
            r2.innerHTML = '✓ Salvo neste computador.' + (cfg.urg.celular ? ` Celular: <b>ligado</b> · tópico <b>${esc(cfg.urg.ntfyTopico)}</b>` : ' Celular: <b>desligado</b>.');
            setTimeout(urgCiclo, 500);
            // conferência: 3 s depois, relê o que ficou gravado (outra aba pode ter regravado)
            const quer = n.celular;
            setTimeout(() => {
                let gravado = null; try { gravado = JSON.parse(localStorage.getItem(CFG_KEY)).urg.celular; } catch (x) { /* ok */ }
                if (!!gravado !== !!quer) {
                    const r3 = body.querySelector('#pp-u-res');
                    if (r3) { r3.style.display = 'block'; r3.innerHTML = '<span class="pp-warn">⚠ Outra aba do PACS mudou este ajuste. Feche as outras abas do PACS e salve de novo.</span>'; }
                }
            }, 3000);
        };
        // caixas de liga/desliga salvam na hora (não depende de clicar em Salvar)
        ['#pp-u-tela', '#pp-u-cel', '#pp-u-teste'].forEach(id => { const cb = $(id); if (cb) cb.onchange = () => $('#pp-u-salvar').click(); });
        $('#pp-u-testar').onclick = async () => { res('Enviando…'); res((await urgTeste()).map(esc).join('<br>')); };
    }
    function lembretesMinDe(txt) { return [...new Set(String(txt || '').split(/[^\d]+/).map(Number).filter(n => n > 0 && n <= 600))].sort((a, b) => b - a); }

    // Aba 🩺 Chegada: monitor do 1º paciente de US (janelas, celular, histórico)
    function renderChegada(body) {
        const c = cfg.cheg, e = chegEstado(), agora = Date.now(), hoje = chaveDia(new Date());
        const js = chegJanelas(), j = chegJanelaAtual(agora), prox = proximaJanela(agora);
        let lider = null; try { lider = JSON.parse(localStorage.getItem(CHEG_LIDER_KEY)); } catch (x) { lider = null; }
        const vigiaAqui = lider && lider.id === CHEG_TAB && agora - lider.ts < CHEG_LIDER_TTL;
        const pers = e.dia === hoje ? (e.periodos || {}) : {};
        const estado = !c.ligado ? '⚪ Monitor desligado neste computador' : chegPausado() ? '⏸ Pausado até ' + esc(c.pausaAte) : j ? '🟢 Vigiando agora (' + j.txt + ')' : '🟢 Ligado — aguardando a próxima janela';
        const linhaPer = k => {
            const p = pers[k];
            if (!p) return `<div class="pp-muted">${NOME_PER[k]}: —</div>`;
            if (p.estado === 'chegou') return `<div>🩺 ${NOME_PER[k]}: ficha <b>${esc(p.ficha)}</b> — <b>${esc(p.nome)}</b> <span class="pp-muted">· avisado ${hm(p.avisadoEm)}${p.entregue === false ? ' · <span class="pp-warn">celular falhou</span>' : ''}</span></div>`;
            if (p.estado === 'nenhum') return `<div>⌛ ${NOME_PER[k]}: nenhuma ficha na janela</div>`;
            return `<div>👀 ${NOME_PER[k]}: vigiando…</div>`;
        };
        // histórico: últimas 20 datas + mediana por período
        const h = chegHist(), dias = Object.keys(h).sort().reverse();
        const mediana = k => {
            const v = dias.map(d => h[d][k]).filter(x => /^\d{2}:\d{2}$/.test(x || '')).map(minutosDoDia).sort((a, b) => a - b);
            if (!v.length) return '—';
            const m = v.length % 2 ? v[(v.length - 1) / 2] : Math.round((v[v.length / 2 - 1] + v[v.length / 2]) / 2);
            return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)} <span class="pp-muted">(${v.length} dias)</span>`;
        };
        const fmtD = d => { const [y, m, dd] = d.split('-').map(Number); return `${DIAS_SEM[new Date(y, m - 1, dd).getDay()]} ${pad2(dd)}/${pad2(m)}`; };
        const dsel = chegDias();
        body.innerHTML = `
<div class="pp-res" style="margin-top:0;"><b>${estado}</b>
<div class="pp-muted">Janelas: ${js.map(x => x.txt).join(' e ') || '<span class="pp-warn">nenhuma válida</span>'}${prox ? ' · próxima: ' + fmtD(chaveDia(new Date(prox.em))) + ' ' + hm(prox.em) : ''} · última leitura: ${e.ultLeitura ? hm(e.ultLeitura) : '—'}${c.ligado ? ' · ' + (vigiaAqui ? 'esta aba é a que vigia' : 'outra aba deste computador vigia') : ''}${e.erro ? ' · <span class="pp-warn">' + esc(e.erro) + '</span>' : ''}</div>
${linhaPer('manha')}${linhaPer('tarde')}</div>
<label class="pp-tog"><input type="checkbox" id="pp-c-lig" ${c.ligado ? 'checked' : ''}><span>Vigiar a chegada do 1º paciente neste computador<small>Ligue em UM computador só (o de casa), que fica acordado com o PACS aberto.</small></span></label>
<label class="pp-tog"><input type="checkbox" id="pp-c-tela" ${c.tela ? 'checked' : ''}><span>Notificação também neste computador<small>Aviso do sistema (Mac/Windows) com o nome completo — o celular recebe só as iniciais.</small></span></label>
<label class="pp-tog"><input type="checkbox" id="pp-c-nenhum" ${c.avisarNenhum ? 'checked' : ''}><span>Avisar quando a janela terminar sem nenhuma ficha</span></label>
<div class="pp-h">Dias e janelas de vigilância</div>
<div class="pp-checks">${DIAS_SEM.map((n, i) => `<label><input type="checkbox" data-cdia="${i}" ${dsel.includes(i) ? 'checked' : ''}>${n}</label>`).join('')}</div>
<div class="pp-grid3"><label>Janelas (uma por linha)<textarea id="pp-c-jan" rows="2">${esc(c.janelas)}</textarea></label><label>Corte manhã/tarde<input id="pp-c-corte" value="${esc(c.corteTarde)}"><small class="pp-muted">ficha antes = manhã</small></label><label>Modalidades<input id="pp-c-mods" value="${esc(c.modalidades)}"></label></div>
<div class="pp-grid2"><label>Pausar até (férias/folga)<input type="date" id="pp-c-pausa" value="${esc(c.pausaAte)}"></label><span></span></div>
<div class="pp-h">Celular — app ntfy (tópico próprio, separado do de TC urgente)</div>
<div class="pp-grid2"><label>Tópico (funciona como senha)<input id="pp-c-topico" value="${esc(c.ntfyTopico)}" placeholder="clique em Gerar"></label><label>Servidor<input id="pp-c-serv" value="${esc(c.ntfyServidor)}"></label></div>
<div class="pp-row"><span class="pp-muted">No celular: app <b>ntfy</b> → <b>+</b> → cole o tópico → Inscrever.</span><span style="white-space:nowrap;"><button class="pp-btn sec" id="pp-c-gerar">Gerar</button> <button class="pp-btn sec" id="pp-c-copiar">Copiar</button></span></div>
<div class="pp-row" style="margin-top:8px;"><span style="white-space:nowrap;"><button class="pp-btn sec" id="pp-c-perm">Permitir notificações</button> <button class="pp-btn sec" id="pp-c-testar">Enviar teste</button> <button class="pp-btn sec" id="pp-c-tpac">Testar com paciente TESTE</button></span><button class="pp-btn" id="pp-c-salvar">Salvar</button></div>
<div class="pp-res" id="pp-c-res" style="display:none;"></div>
<div class="pp-h">Hora da 1ª ficha — mediana</div>
<div>Manhã: <b>${mediana('manha')}</b> · Tarde: <b>${mediana('tarde')}</b></div>
${dias.length ? `<div class="pp-muted" style="margin-top:4px;">${dias.slice(0, 20).map(d => `${fmtD(d)}: ${esc(h[d].manha || '·')} / ${esc(h[d].tarde || '·')}`).join('<br>')}</div>` : '<div class="pp-muted">Sem histórico ainda.</div>'}
<div class="pp-muted" style="margin-top:8px;">O PACS precisa estar aberto e logado neste computador, e ele não pode dormir (no Mac: instalador “manter acordado + abrir PACS”). Se ele não ler o PACS no início de uma janela, chega no celular “monitor de chegada não iniciou”. Configuração só deste computador.</div>`;
        const $ = id => body.querySelector(id);
        const res = txt => { const r = $('#pp-c-res'); r.style.display = 'block'; r.innerHTML = txt; };
        $('#pp-c-gerar').onclick = () => { if ($('#pp-c-topico').value && !confirm('Gerar um tópico NOVO? Você terá que inscrever o celular de novo.')) return; $('#pp-c-topico').value = chegGerarTopico(); res('Tópico novo gerado — clique em <b>Salvar</b> e inscreva o celular nele.'); };
        $('#pp-c-copiar').onclick = async () => { try { await navigator.clipboard.writeText($('#pp-c-topico').value); res('Tópico copiado.'); } catch (x) { $('#pp-c-topico').select(); res('Selecione e copie (Ctrl+C / ⌘C).'); } };
        $('#pp-c-perm').onclick = async () => {
            if (!('Notification' in window)) return res('Este navegador não tem notificações do sistema.');
            const p = await Notification.requestPermission();
            res(p === 'granted' ? '✅ Notificações permitidas neste navegador.' : p === 'denied' ? '❌ Notificações bloqueadas — libere no cadeado ao lado do endereço do site.' : 'Permissão não concedida.');
        };
        $('#pp-c-salvar').onclick = async () => {
            const antes = Object.assign({}, cfg.cheg);
            const hora = (v, padrao) => /^\d{1,2}:\d{2}$/.test(String(v).trim()) ? String(v).trim().padStart(5, '0') : padrao;
            const n = {
                ligado: $('#pp-c-lig').checked, tela: $('#pp-c-tela').checked, avisarNenhum: $('#pp-c-nenhum').checked,
                dias: [...body.querySelectorAll('[data-cdia]')].filter(x => x.checked).map(x => x.dataset.cdia).join(','),
                janelas: $('#pp-c-jan').value.trim() || CHEG_PADRAO.janelas,
                corteTarde: hora($('#pp-c-corte').value, CHEG_PADRAO.corteTarde),
                modalidades: $('#pp-c-mods').value.trim() || 'US',
                pausaAte: $('#pp-c-pausa').value || '',
                ntfyTopico: $('#pp-c-topico').value.trim(), ntfyServidor: $('#pp-c-serv').value.trim() || CHEG_PADRAO.ntfyServidor
            };
            if (n.ligado && !n.ntfyTopico) n.ntfyTopico = chegGerarTopico();
            // regras mudaram: cancela o vigia agendado (é reagendado pelo ciclo)
            const e2 = chegEstado();
            if (antes.ntfyTopico && e2.vigiaPara && e2.vigiaPara > Date.now()) await chegNtfyApagar('pc-inicio', antes.ntfyTopico);
            e2.vigiaPara = 0; chegSalvar(e2);
            cfg.cheg = Object.assign({}, CHEG_PADRAO, n);
            saveCfg();
            if (!cfg.cheg.ligado) { try { const l = JSON.parse(localStorage.getItem(CHEG_LIDER_KEY)); if (l && l.id === CHEG_TAB) localStorage.removeItem(CHEG_LIDER_KEY); } catch (x) { /* ok */ } }
            renderChegada(body);
            const r2 = body.querySelector('#pp-c-res'); r2.style.display = 'block';
            r2.innerHTML = '✓ Salvo neste computador.' + (cfg.cheg.ntfyTopico ? ` Tópico do celular: <b>${esc(cfg.cheg.ntfyTopico)}</b>` : '') + (chegJanelas().length ? '' : ' <span class="pp-warn">Nenhuma janela válida (use 07:45-08:15).</span>');
            setTimeout(chegCiclo, 500);
        };
        $('#pp-c-testar').onclick = async () => { res('Enviando…'); res((await chegTesteEnvio()).map(esc).join('<br>')); };
        $('#pp-c-tpac').onclick = async () => { res('Lendo o PACS…'); try { res(await chegTestePaciente()); } catch (x) { res('❌ ' + esc(x.message || x)); } };
    }

    function renderAjustes(body) {
        body.innerHTML = `
<div class="pp-row"><label class="pp-tog" style="border:none;"><input type="checkbox" id="pp-master" ${cfg.master ? 'checked' : ''}> Ajustes visuais ligados <small>Desligue para ver o PACS original (diagnóstico rápido).</small></label></div>
<label style="margin-top:6px;">Densidade da tela<select id="pp-dens">
<option value="auto" ${cfg.densidade === 'auto' ? 'selected' : ''}>Automática — compacta quando a janela tiver menos de ${LARGURA_COMPACTA}px (agora: ${densidadeAtual()})</option>
<option value="normal" ${cfg.densidade === 'normal' ? 'selected' : ''}>Normal (fonte 13 px — tela cheia)</option>
<option value="compacta" ${cfg.densidade === 'compacta' ? 'selected' : ''}>Compacta (fonte 11 px — meia tela)</option></select></label>
<label style="margin-top:6px;">Zoom do laudo impresso (PDF que abre ao clicar em Imprimir)<select id="pp-zpdf">${[['100', '100%'], ['110', '110% (padrão)'], ['125', '125%'], ['150', '150%'], ['largura', 'Ajustar à largura da tela'], ['pagina', 'Página inteira']].map(([v, n]) => `<option value="${v}" ${String(cfg.zoomPdf) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
<label style="margin-top:6px;">Papel do laudo (tema grafite — só a tela; impressão não muda)<select id="pp-papel">${PAPEIS.map(([v, n]) => `<option value="${v}" ${(cfg.papel || 'suave') === v ? 'selected' : ''}>${esc(n.replace('◐ ', ''))}</option>`).join('')}</select></label>
<div class="pp-h">Ajustes (cada um liga/desliga na hora)</div>
${BLOCKS.map(([k, n, d]) => `<label class="pp-tog"><input type="checkbox" data-b="${k}" ${cfg.blocks[k] ? 'checked' : ''} ${cfg.master ? '' : 'disabled'}><span>${esc(n)}${d ? `<small>${esc(d)}</small>` : ''}</span></label>`).join('')}
<div class="pp-h">Barra do laudo — botões ocultos (início do nome que aparece ao passar o mouse; um por linha)</div>
<textarea id="pp-ckoc" rows="4">${esc(cfg.ckOcultar)}</textarea>
<div class="pp-muted">Disponíveis: Desfazer, Refazer, Remover Formatação, Selecionar tudo, Titulo, Fonte, Tamanho da fonte, Cor da Fonte, Cor de Fundo, Itálico, Negrito, Sublinhado, Tachado, Espaçamento entre linhas, Alinhar à esquerda, Alinhar à direita, Centralizar, Justificar, Lista com marcadores, Inserir tabela, Inserir imagem, Linha horizontal, Quebra de página, Maiúscula / Minúscula. Vale com “Editor de laudo em uma linha” ligado.</div>
<div class="pp-h">Sites de pesquisa — “Nome | URL com %s”</div>
<textarea id="pp-sites" rows="5">${esc(cfg.sites)}</textarea>
<div class="pp-h">Links rápidos — “Nome | URL”</div>
<textarea id="pp-links" rows="4">${esc(cfg.links)}</textarea>
<div class="pp-row" style="margin-top:8px;"><button class="pp-btn sec" id="pp-reset">Restaurar padrão</button><button class="pp-btn" id="pp-save">Salvar listas</button></div>
<div class="pp-muted" style="margin-top:8px;">As configurações ficam salvas neste computador.</div>`;
        body.querySelector('#pp-master').onchange = e => { cfg.master = e.target.checked; saveCfg(); applyAll(); renderPanel(); };
        body.querySelector('#pp-dens').onchange = e => { cfg.densidade = e.target.value; saveCfg(); applyAll(); renderPanel(); };
        body.querySelector('#pp-papel').onchange = e => { cfg.papel = e.target.value; saveCfg(); dockTick(); };
        body.querySelector('#pp-zpdf').onchange = e => { cfg.zoomPdf = e.target.value; saveCfg(); };
        body.querySelectorAll('[data-b]').forEach(cb => { cb.onchange = () => { cfg.blocks[cb.dataset.b] = cb.checked; saveCfg(); applyAll(); dockTick(); if (cb.dataset.b === 'slaUteis') recalcularLista(); }; });
        body.querySelector('#pp-save').onclick = () => { cfg.sites = body.querySelector('#pp-sites').value; cfg.links = body.querySelector('#pp-links').value; cfg.ckOcultar = body.querySelector('#pp-ckoc').value; saveCfg(); ckOcultarCss(); const b = body.querySelector('#pp-save'); b.textContent = '✓ Salvo'; setTimeout(() => { b.textContent = 'Salvar listas'; }, 1200); };
        body.querySelector('#pp-reset').onclick = () => { if (!confirm('Restaurar todos os ajustes e listas para o padrão?')) return; localStorage.removeItem(CFG_KEY); recarregarCfg(); applyAll(); renderPanel(); };
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
        if (e.target.closest('#pp-panel') || e.target.closest('#pp-btn') || e.target.closest('.pp-calc-laudo')) return;
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
    const VIEWER_ESPERA_MS = 400; // só para a regra "série única": nº de séries estável por 0,4 s (miniaturas carregam aos poucos)
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
        // Todos / US: recolhe assim que a imagem carrega (não depende do nº de séries).
        const imediato = on('viewerRecolherTodos') || (on('viewerRecolherUS') && mod === 'US');
        const nSeries = Math.max(document.querySelectorAll('.series-details').length, document.querySelectorAll('.study-browser .thumbnail-container').length);
        if (!imediato) {
            // série única: espera o nº de séries ficar estável por 0,4 s
            if (viewerVisto.uid !== uid || viewerVisto.n !== nSeries) { viewerVisto = { uid, t: Date.now(), n: nSeries }; return; }
            if (Date.now() - viewerVisto.t < VIEWER_ESPERA_MS) return;
        }
        viewerFeito = uid;
        const recolher = imediato || (on('viewerRecolherSerieUnica') && nSeries === 1);
        if (recolher && painel.classList.contains('is-open')) (botao.querySelector('.roundedButton') || botao).click();
    }
    setInterval(checarViewer, 200);

    // =====================================================================
    // 7. INÍCIO
    // =====================================================================
    function start() {
        if (!document.body) { setTimeout(start, 200); return; }
        setInterval(() => { const v = ehViewer(); if (v !== document.documentElement.hasAttribute('data-pp-viewer')) document.documentElement.toggleAttribute('data-pp-viewer', v); }, 1000);
        if (ehViewer()) document.documentElement.setAttribute('data-pp-viewer', '');
        applyAll();
        buildPanel();
        dockTick();
        setInterval(dockTick, 1000);
        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        setInterval(() => { if (!document.getElementById('pp-btn')) { const p = document.getElementById('pp-panel'); if (p) p.remove(); buildPanel(); } }, 2000);
        if (!(window.__PP_TEST__ && window.__PP_TEST__.semTimers)) {
            setInterval(urgCiclo, URG_TICK_MS);
            setInterval(urgBanner, 5000);
            setTimeout(urgCiclo, 3000);
            setInterval(chegCiclo, CHEG_TICK_MS);
            setTimeout(chegCiclo, 4000);
            chegFecharDuplicada();
        }
        urgBanner();
    }
    start();
    // gancho só para testes automatizados (não faz nada no uso normal)

    // ---- Aviso de versão nova (16/10/2026): se este computador ficou para trás, mostra um aviso com o botão Atualizar.
    // Lê só o cabeçalho do arquivo publicado (raw.githubusercontent permite CORS); não instala nada sozinho.
    (function avisoVersaoNova(nome, url) {
        if (window.top !== window || /^\/viewer/.test(location.pathname)) return;
        const local = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || '';
        if (!local) return;
        const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 4; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
        const id = 'ladi-upd-' + nome.replace(/\W/g, '');
        function mostrar(v) {
            if (!document.body || document.getElementById(id)) return;
            try { if (sessionStorage.getItem(id) === v) return; } catch (e) { /* ok */ }
            let box = document.getElementById('ladi-upd-box');
            if (!box) { box = document.createElement('div'); box.id = 'ladi-upd-box'; box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;flex-direction:column;gap:6px;font:12px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'; document.body.appendChild(box); }
            const d = document.createElement('div'); d.id = id;
            d.style.cssText = 'background:#1e3a8a;color:#fff;border:1px solid #93c5fd;border-radius:8px;padding:6px 10px;box-shadow:0 6px 16px rgba(0,0,0,.35);display:flex;gap:10px;align-items:center';
            const t = document.createElement('span'); t.textContent = `🔄 ${nome} ${v} disponível (este computador: ${local})`;
            const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Atualizar'; a.title = 'Abre a tela do Tampermonkey: clique em Atualizar e depois recarregue o PACS';
            a.style.cssText = 'color:#fde047;font-weight:700;text-decoration:underline';
            const x = document.createElement('button'); x.textContent = '×'; x.title = 'Lembrar depois'; x.style.cssText = 'background:none;border:0;color:#fff;cursor:pointer;font-size:15px;padding:0 2px';
            x.onclick = () => { try { sessionStorage.setItem(id, v); } catch (e) { /* ok */ } d.remove(); };
            d.append(t, a, x); box.appendChild(d);
        }
        async function checar() {
            try {
                const r = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
                if (!r.ok) return;
                const m = (await r.text()).slice(0, 4000).match(/@version\s+([\d.]+)/);
                if (m && cmp(m[1], local) > 0) mostrar(m[1]);
            } catch (e) { /* sem internet: tenta na próxima */ }
        }
        setTimeout(checar, 20000);
        setInterval(checar, 6 * 3600000);
    })('PACS Plus', 'https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-plus.user.js');

    if (window.__PP_TEST__) window.__PP_TEST__.api = { chegCiclo, chegEstado, chegHist, chegJanelas, proximaJanela, iniciais, usCurto, chegTestePaciente, urgCiclo, urgProcessar, urgTick, urgEstado, urgSalvar, urgBanner, urgMsg, aplicarPrazosLista, naEscalaData, tcEhMeu, get cfg() { return cfg; }, saveCfg, loadCfg: () => recarregarCfg() };
})();
