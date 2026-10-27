// ==UserScript==
// @name         PACS LADI - Agenda Operacional Master
// @namespace    http://tampermonkey.net/
// @version      9.3.5
// @description  Agenda integrada ao PACS (chegada pela hora da ficha, atendimento pela chegada das imagens, encaixe automático, contagem de pacientes/procedimentos), sincronização Supabase blindada (fila offline, URL/chave saneadas, erros visíveis), LOGIN por e-mail/senha (Supabase Auth, sessão renovada sozinha), IA pela nuvem (chaves só no Supabase, com as chaves locais de reserva), TEMPO REAL entre os computadores (Realtime, com polling de reserva), envio forçado de todo o histórico local, Analytics de No-Show e espera pelas views da nuvem, No-Show por convênio e por horário, Dark Mode, Zoom, OCR de prints/PDF com Claude (Gemini reserva), importação automática da planilha da Prefeitura e Consulta de escalas/POPs.
// @author       Dr. Gabriel Gaspar
// @match        *://pacs.ladi.org.br/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @connect      api.anthropic.com
// @connect      docs.google.com
// @connect      supabase.co
// @connect      *.supabase.co
// @connect      drive.google.com
// @connect      googleusercontent.com
// @connect      *.googleusercontent.com
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-agenda.user.js
// @downloadURL  https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-agenda.user.js
// ==/UserScript==

(function () {
    'use strict';

    // =====================================================================
    // 1. ESTILOS
    // =====================================================================
    GM_addStyle(`
        #btn-agenda-flutuante { position: fixed !important; top: 10px !important; left: 140px !important; z-index: 150 !important; background: #2563eb !important; color: #fff !important; border: 1.5px solid #60a5fa !important; border-radius: 7px !important; padding: 5px 12px !important; font-size: 12px !important; font-weight: 700 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; cursor: pointer !important; box-shadow: 0 3px 10px rgba(0,0,0,0.45) !important; display: flex !important; align-items: center !important; gap: 5px !important; transition: all 0.15s ease !important; }
        html[data-ag-viewer] #btn-agenda-flutuante, html[data-ag-viewer] #agenda-drawer-wrapper, html[data-ag-viewer] #agenda-bg-backdrop { display: none !important; }
        #btn-agenda-flutuante:hover { background: #1d4ed8 !important; transform: translateY(-1px) !important; }
        #agenda-drawer-wrapper { position: fixed !important; top: 0 !important; right: -1100px !important; width: 920px; max-width: 98vw !important; height: 100vh !important; background: #f8fafc; box-shadow: -12px 0 35px rgba(0,0,0,0.75) !important; z-index: 10000000 !important; transition: right 0.26s cubic-bezier(0.4,0,0.2,1), width 0.2s ease !important; display: flex !important; flex-direction: column !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; color: #1e293b; }
        #agenda-drawer-wrapper.open { right: 0 !important; }
        #agenda-drawer-wrapper.drop-on { outline: 4px dashed #3b82f6 !important; outline-offset: -8px; }
        .obs-cell { font-size: 9.5px; color: #b45309; margin-top: 1px; }
        .badge-urg { background: #dc2626 !important; color: #fff !important; border: 1px solid #b91c1c !important; cursor: pointer; margin-left: 4px; }
        .btn-urg { opacity: .35; filter: grayscale(1); }
        .btn-urg.on { opacity: 1; filter: none; background: #fee2e2 !important; border-color: #dc2626 !important; }
        .badge-saiu { background: #fef3c7 !important; color: #92400e !important; border: 1px solid #f59e0b !important; }
        #agenda-top-bar { background: #0f172a !important; color: #fff !important; padding: 7px 12px !important; display: flex !important; justify-content: space-between !important; align-items: center !important; border-bottom: 1px solid #334155 !important; flex-shrink: 0 !important; gap: 6px; flex-wrap: wrap !important; }
        #agenda-top-bar > div { flex-wrap: wrap; row-gap: 4px; }
        #agenda-top-bar > div:last-child { justify-content: flex-end; margin-left: auto; }
        .btn-top-action { border: none !important; border-radius: 5px !important; padding: 4px 8px !important; font-size: 10.5px !important; font-weight: 700 !important; cursor: pointer !important; transition: opacity 0.15s !important; display: inline-flex !important; align-items: center !important; gap: 4px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
        .btn-top-action:hover { opacity: 0.88; }
        .zoom-control-group { display: inline-flex !important; align-items: center; background: #1e293b; border: 1px solid #475569; border-radius: 5px; overflow: hidden; flex-shrink: 0 !important; white-space: nowrap !important; }
        .btn-zoom { background: transparent; color: #f8fafc; border: none; padding: 3px 6px; font-size: 10px; font-weight: bold; cursor: pointer; line-height: 1; display: inline-block !important; min-width: 22px; flex-shrink: 0 !important; }
        .btn-zoom:hover { background: #334155; }
        #labelZoomVal { font-size: 9.5px; font-weight: 700; color: #60a5fa; padding: 0 4px; user-select: none; min-width: 34px; text-align: center; }
        #agenda-body-scroll { flex: 1 !important; overflow-y: auto !important; padding: 8px 12px 14px 12px !important; transform-origin: top left; }
        #agenda-bg-backdrop { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.65) !important; z-index: 9999998 !important; display: none !important; backdrop-filter: blur(2px) !important; }
        #agenda-bg-backdrop.open { display: block !important; }
        .agenda-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; overflow: visible !important; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
        .agenda-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
        .agenda-table th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 9px; padding: 4px 7px; border-bottom: 1px solid #e2e8f0; }
        .agenda-table td { padding: 3px 7px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; line-height: 1.25; }
        .agenda-table tr:hover { background: #f8fafc; }
        .editable-cell { outline: none; border-radius: 3px; padding: 1px 2px; min-height: 16px; }
        .editable-cell:focus { background: #fef08a !important; box-shadow: 0 0 0 1.5px #eab308; color: #000 !important; }
        .badge-base { padding: 1.5px 5px; border-radius: 4px; font-weight: 700; font-size: 9px; display: inline-block; white-space: nowrap; }
        .badge-pref { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .badge-conv { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .badge-part { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .badge-social { background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe; }
        .badge-sus-urgente { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
        .sla-normal { background: #f1f5f9; color: #475569; font-weight: 600; }
        .sla-amarelo { background: #fef9c3; color: #854d0e; border: 1px solid #facc15; font-weight: 700; }
        .sla-laranja { background: #ffedd5; color: #9a3412; border: 1px solid #fb923c; font-weight: 700; }
        .sla-vermelho { background: #ffe4e6; color: #9f1239; border: 1px solid #f43f5e; font-weight: 800; animation: pulseSLA 1.8s infinite; }
        @keyframes pulseSLA { 0% { opacity: 1; } 50% { opacity: 0.65; } 100% { opacity: 1; } }
        .btn-act { border: none; padding: 2.5px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; cursor: pointer; line-height: 1.15; }
        .btn-chegou { background: #f59e0b; color: #fff; } .btn-chegou:hover { background: #d97706; }
        .btn-atend { background: #10b981; color: #fff; } .btn-atend:hover { background: #059669; }
        .btn-falta { background: #f43f5e; color: #fff; } .btn-falta:hover { background: #e11d48; }
        .btn-del { background: transparent; color: #94a3b8; font-size: 11px; } .btn-del:hover { color: #e11d48; }

        /* Banner de erro de nuvem (persistente, não some sozinho) */
        #cloudErrorBanner { display: none; background: #fee2e2; border: 1.5px solid #ef4444; color: #7f1d1d; border-radius: 7px; padding: 6px 10px; margin-bottom: 6px; font-size: 10.5px; font-weight: 600; }
        #cloudErrorBanner.show { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        #cloudErrorBanner button { background: #b91c1c; color: #fff; border: none; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; }

        /* v8.5 — PACS */
        #pacsPendBox { display: none; background: #fffbeb; border: 1.5px solid #f59e0b; color: #78350f; border-radius: 7px; padding: 6px 10px; margin-bottom: 6px; font-size: 10.5px; }
        .badge-multi { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; margin-left: 4px; }
        .badge-pacs { background: #ecfeff; color: #155e75; border: 1px solid #a5f3fc; margin-left: 4px; cursor: pointer; }
        .badge-enc { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; margin-left: 4px; }
        .badge-fusao { cursor: pointer; border: 1px dashed #f59e0b !important; color: #b45309 !important; background: #fffbeb !important; }
        .badge-nome { margin-left: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; cursor: help; }
        .pac-cell { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; }

        /* MODO ESCURO */
        #agenda-drawer-wrapper.dark-mode { background: #0f172a !important; color: #f1f5f9 !important; border-left: 1px solid #1e293b !important; }
        #agenda-drawer-wrapper.dark-mode .agenda-card { background: #1e293b !important; border-color: #334155 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important; }
        #agenda-drawer-wrapper.dark-mode .agenda-table th { background: #0b1329 !important; color: #94a3b8 !important; border-bottom-color: #334155 !important; }
        #agenda-drawer-wrapper.dark-mode .agenda-table td { border-bottom-color: #27354a !important; color: #f1f5f9 !important; }
        #agenda-drawer-wrapper.dark-mode .agenda-table tr:hover { background: #253349 !important; }
        #agenda-drawer-wrapper.dark-mode .slim-panel-bar { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        #agenda-drawer-wrapper.dark-mode input[type="date"], #agenda-drawer-wrapper.dark-mode input[type="text"], #agenda-drawer-wrapper.dark-mode select { background: #0f172a !important; color: #f8fafc !important; border-color: #475569 !important; }
        #agenda-drawer-wrapper.dark-mode .editable-cell:focus { background: #ca8a04 !important; color: #fff !important; }
        #agenda-drawer-wrapper.dark-mode #cloudErrorBanner { background: #450a0a; color: #fecaca; border-color: #b91c1c; }
        #agenda-drawer-wrapper.dark-mode #pacsPendBox { background: #422006; color: #fde68a; border-color: #a16207; }
        #agenda-drawer-wrapper.dark-mode .badge-multi { background: #1e1b4b !important; color: #c7d2fe !important; border-color: #4338ca !important; }
        #agenda-drawer-wrapper.dark-mode .badge-pacs { background: #083344 !important; color: #a5f3fc !important; border-color: #0e7490 !important; }
        #agenda-drawer-wrapper.dark-mode .badge-enc { background: #2e1065 !important; color: #ddd6fe !important; border-color: #6d28d9 !important; }
        #agenda-drawer-wrapper.dark-mode .badge-pref { background: #451a03 !important; color: #fde047 !important; border-color: #854d0e !important; }
        #agenda-drawer-wrapper.dark-mode .badge-conv { background: #172554 !important; color: #93c5fd !important; border-color: #1e40af !important; }
        #agenda-drawer-wrapper.dark-mode .badge-part { background: #022c22 !important; color: #6ee7b7 !important; border-color: #065f46 !important; }
        #agenda-drawer-wrapper.dark-mode .badge-social { background: #2e1065 !important; color: #d8b4fe !important; border-color: #6b21a8 !important; }
        #agenda-drawer-wrapper.dark-mode .badge-sus-urgente { background: #4c0519 !important; color: #fecdd3 !important; border-color: #9f1239 !important; }
        #agenda-drawer-wrapper.dark-mode .sla-normal { background: #1e293b !important; color: #cbd5e1 !important; }
        #agenda-drawer-wrapper.dark-mode .sla-amarelo { background: #422006 !important; color: #fef08a !important; border-color: #a16207 !important; }
        #agenda-drawer-wrapper.dark-mode .sla-laranja { background: #431407 !important; color: #fed7aa !important; border-color: #c2410c !important; }
        #agenda-drawer-wrapper.dark-mode .sla-vermelho { background: #4c0519 !important; color: #fda4af !important; border-color: #e11d48 !important; }

        #modalDashboard { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 780px; max-width: 95vw; max-height: 90vh; background: #fff; border-radius: 12px; box-shadow: 0 20px 45px rgba(0,0,0,0.7); z-index: 10000005; display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; }
        #modalDashboard.open { display: flex !important; }
        #modalDocs { position: fixed; inset: 3vh 2vw; background: #f8fafc; border-radius: 12px; box-shadow: 0 20px 45px rgba(0,0,0,0.75); z-index: 10000006; display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; font-size: 11.5px; }
        #modalDocs.open { display: flex !important; }
        #modalDocs .docs-topo { background: #0f172a; color: #fff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-shrink: 0; }
        #modalDocs .docs-topo button { background: #334155; color: #fff; border: 1px solid #475569; border-radius: 5px; padding: 3px 9px; font-weight: 700; font-size: 10.5px; cursor: pointer; }
        #modalDocs .docs-topo select { font-size: 10.5px; border-radius: 4px; padding: 2px 4px; }
        #docsAviso { display: none; background: #fef3c7; color: #78350f; padding: 5px 12px; font-size: 10.5px; border-bottom: 1px solid #f59e0b; }
        #modalDocs .docs-corpo { flex: 1; display: flex; min-height: 0; }
        #modalDocs .docs-lado { width: 300px; flex-shrink: 0; border-right: 1px solid #e2e8f0; overflow-y: auto; padding: 8px; background: #fff; }
        #modalDocs .docs-cat { font-weight: 800; font-size: 11px; margin: 10px 0 4px; color: #0f172a; }
        #modalDocs .docs-cat span { font-weight: 500; color: #64748b; }
        #modalDocs .docs-vazio { color: #94a3b8; font-size: 10.5px; padding: 2px 6px; }
        #modalDocs .docs-item { display: flex; justify-content: space-between; align-items: center; gap: 4px; padding: 6px 8px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
        #modalDocs .docs-item:hover { background: #f1f5f9; }
        #modalDocs .docs-item.sel { background: #dbeafe; border-color: #93c5fd; font-weight: 700; }
        #modalDocs .docs-acoes button { background: none; border: none; cursor: pointer; font-size: 11px; padding: 0 2px; }
        #docsForm { display: none; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 7px; padding: 7px; margin-bottom: 6px; }
        #docsForm .docs-f-tit { font-weight: 800; font-size: 10.5px; margin-bottom: 4px; }
        #docsForm input, #docsForm select { width: 100%; box-sizing: border-box; margin-bottom: 4px; font-size: 10.5px; padding: 3px 5px; border: 1px solid #cbd5e1; border-radius: 4px; }
        #docsForm button { flex: 1; background: #0284c7; color: #fff; border: none; border-radius: 4px; padding: 4px; font-weight: 700; font-size: 10.5px; cursor: pointer; }
        #docsForm button#btnDocsLimpar { background: #64748b; flex: 0 0 70px; }
        #modalDocs .docs-principal { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        #modalDocs .docs-cab { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid #e2e8f0; background: #fff; font-weight: 700; }
        #docsAcoes { display: flex; gap: 6px; flex-wrap: wrap; }
        #docsAcoes a, #docsAcoes button { background: #eff6ff; color: #1d4ed8; border: 1px solid #93c5fd; border-radius: 5px; padding: 3px 8px; font-weight: 700; font-size: 10.5px; text-decoration: none; cursor: pointer; }
        #docsVisor { flex: 1; overflow: auto; background: #e2e8f0; padding: 10px; text-align: center; }
        #docsVisor img { max-width: 100%; height: auto; cursor: zoom-in; box-shadow: 0 2px 10px rgba(0,0,0,.25); background: #fff; }
        #docsVisor.real img { max-width: none; cursor: zoom-out; }
        #docsVisor .docs-msg { color: #475569; padding: 40px 20px; line-height: 1.6; }
        html[data-ag-viewer] #modalDocs { display: none !important; }
        #modalDashboard.dark-mode { background: #0f172a !important; color: #f1f5f9 !important; border: 1px solid #334155 !important; }
        #modalDashboard.dark-mode .dash-box { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        .bar-track { background: #e2e8f0; border-radius: 3px; height: 7px; overflow: hidden; }
        #modalDashboard.dark-mode .bar-track { background: #334155; }
        .bar-fill { background: #e11d48; height: 100%; }
    `);

    // =====================================================================
    // 2. CHAVES E ESTADO
    // =====================================================================
    const STORAGE_KEY_DB = 'agenda_multidatas_master_db';
    const OUTBOX_KEY = 'agenda_cloud_outbox_v83';
    const API_KEY_STORAGE = 'gemini_api_key';
    const SUPABASE_URL_STORAGE = 'supabase_project_url';
    const SUPABASE_KEY_STORAGE = 'supabase_anon_key';
    const THEME_STORAGE_KEY = 'agenda_theme_mode';
    const ZOOM_STORAGE_KEY = 'agenda_zoom_level';
    const TABLE = 'agenda_exames';
    const CONFLICT_COLS = 'data_agenda,hora,paciente,exame';
    const POLL_MS = 30000; // auto-refresh da nuvem com a gaveta aberta (sem tempo real)
    const POLL_RESERVA_MS = 180000; // com tempo real ativo, a leitura periódica vira só reserva (3 min)
    const SYNCED_DATES_KEY = 'agenda_synced_dates_v84';   // dias já confirmados com a nuvem
    const LEGACY_PUSH_KEY = 'agenda_legacy_pushed_v84';   // histórico local antigo já enviado

    function getTodayIso() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function safeJsonParse(str, fallback) {
        try { const v = JSON.parse(str); return v == null ? fallback : v; } catch (e) { return fallback; }
    }

    let agendaDatabase = safeJsonParse(localStorage.getItem(STORAGE_KEY_DB), {});
    let outbox = safeJsonParse(localStorage.getItem(OUTBOX_KEY), []);
    let selectedDate = getTodayIso();
    let sectionState = { manha: true, tarde: true };
    let isDarkMode = localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    let zoomLevel = parseInt(localStorage.getItem(ZOOM_STORAGE_KEY), 10) || 100;
    let inflight = 0;
    let lastCloudError = null;
    let errorAlertShown = false; // evita spam de alert: 1 alert por sequência de falhas
    let isFlushing = false;
    let currentProcByPatient = {};
    let ultimaLeituraNuvem = 0; // v9.0 — última releitura do dia (tempo real ou periódica)
    let escritaGen = 0;         // v9.0 — muda a cada alteração local/envio; leitura que cruzou uma escrita é descartada
    let syncedDates = safeJsonParse(localStorage.getItem(SYNCED_DATES_KEY), {});
    function markSynced(d) { syncedDates[d] = true; localStorage.setItem(SYNCED_DATES_KEY, JSON.stringify(syncedDates)); }

    // Envio automático, UMA vez por computador, de todo o histórico salvo localmente
    // (inclusive o que as versões antigas não conseguiram subir). Roda antes de qualquer leitura da nuvem.
    function pushLegacyLocalOnce() {
        if (localStorage.getItem(LEGACY_PUSH_KEY) || !getSupabaseConfig()) return;
        Object.keys(agendaDatabase).forEach(d => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Array.isArray(agendaDatabase[d])) return;
            agendaDatabase[d].forEach(item => {
                if (!item || !item.paciente) return;
                const row = toCloudRow(item, d);
                const k = `${d}|${naturalKey(row)}`;
                outbox = outbox.filter(op => op.k !== k);
                outbox.push({ t: 'upsert', k, date: d, row });
            });
        });
        persistOutbox();
        localStorage.setItem(LEGACY_PUSH_KEY, new Date().toISOString());
    }

    // =====================================================================
    // 3. UTILITÁRIOS
    // =====================================================================
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function normalizeTime(hStr) {
        if (!hStr) return '00:00';
        const clean = String(hStr).trim().replace(/[hH.]/g, ':');
        const parts = clean.split(':');
        let hh = (parts[0] || '0').replace(/\D/g, '') || '0';
        let mm = (parts[1] || '00').replace(/\D/g, '') || '00';
        hh = hh.padStart(2, '0').slice(-2);
        mm = mm.padEnd(2, '0').slice(0, 2);
        return `${hh}:${mm}`;
    }

    function normText(s) {
        return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
    }

    function timeToMinutes(hStr) {
        const [hh, mm] = normalizeTime(hStr).split(':').map(Number);
        return (hh * 60) + (mm || 0);
    }

    function periodoFromHora(h) { return timeToMinutes(h) < 720 ? 'manha' : 'tarde'; }

    function sortPatientsList(list) {
        return list.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
    }

    function naturalKey(item) {
        return `${normalizeTime(item.hora)}|${normText(item.paciente)}|${normText(item.exame)}`;
    }

    function fmtBR(dateIso) { return dateIso.split('-').reverse().join('/'); }

    function persistDb() { localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(agendaDatabase)); }
    function persistOutbox() { localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)); }

    function saveLocal() {
        if (agendaDatabase[selectedDate]) agendaDatabase[selectedDate] = sortPatientsList(agendaDatabase[selectedDate]);
        persistDb();
        renderAgenda();
    }

    // =====================================================================
    // 4. SUPABASE — CONFIG SANEADA
    // =====================================================================
    // Causa-raiz do v8.1/v8.2: a URL salva continha "/rest/v1" (copiada do painel),
    // o script concatenava outro "/rest/v1" => .../rest/v1/rest/v1/agenda_exames => HTTP 404.
    function sanitizeSupabaseUrl(raw) {
        let u = String(raw || '').trim().replace(/^["']|["']$/g, '');
        if (!u) return '';
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        try {
            const parsed = new URL(u);
            return `${parsed.protocol}//${parsed.host}`; // descarta qualquer caminho (/rest/v1, /, etc.)
        } catch (e) {
            return u.replace(/\/+$/, '').replace(/\/rest\/v1.*$/i, '');
        }
    }

    function sanitizeKey(raw) {
        return String(raw || '').replace(/\s+/g, '').replace(/^["']|["']$/g, '');
    }

    function getSupabaseConfig() {
        const url = sanitizeSupabaseUrl(localStorage.getItem(SUPABASE_URL_STORAGE));
        const key = sanitizeKey(localStorage.getItem(SUPABASE_KEY_STORAGE));
        return (url && key) ? { url, key } : null;
    }

    function explainHttp(status, body) {
        const b = String(body || '').slice(0, 300);
        if (status === 0) return 'Sem resposta. O Tampermonkey pode ter BLOQUEADO a conexão com supabase.co (Painel Tampermonkey > script > Configurações > "Domínios permitidos/@connect"), ou o PC está sem internet.';
        if (status === 401 || status === 403) return `HTTP ${status}: chave (anon/publishable) inválida, incompleta ou de outro projeto. Copie de novo em Supabase > Project Settings > API Keys. Detalhe: ${b}`;
        if (status === 404) return `HTTP 404: endereço errado. A Project URL deve ser só "https://xxxx.supabase.co" (sem /rest/v1). Detalhe: ${b}`;
        if (status === 409) return `HTTP 409: conflito de registro duplicado. Detalhe: ${b}`;
        if (status === 400 || status === 422) return `HTTP ${status}: dado rejeitado pelo banco. Detalhe: ${b}`;
        return `HTTP ${status}: ${b}`;
    }

    // =====================================================================
    // 5. SUPABASE — TRANSPORTE
    // =====================================================================
    // v9.1 — com login, toda chamada leva o token do usuário (Authorization: Bearer <access_token>);
    // sem login, segue como antes (só a chave pública). 401 → renova a sessão e tenta 1 vez de novo.
    async function requestSupabase(endpoint, method, payload, extraHeaders = {}, _repetida = false) {
        let tok = null;
        try { tok = await tokenValido(); } catch (e) { tok = null; } // falha de rede ao renovar: tenta sem token
        try {
            return await requestSupabaseRaw(endpoint, method, payload, extraHeaders, tok);
        } catch (err) {
            if (!_repetida && err.status === 401 && lerSessao()) {
                try { await renovarSessao(); } catch (e) { /* segue */ }
                return requestSupabase(endpoint, method, payload, extraHeaders, true);
            }
            throw err;
        }
    }

    function requestSupabaseRaw(endpoint, method, payload, extraHeaders, tok) {
        return new Promise((resolve, reject) => {
            const config = getSupabaseConfig();
            if (!config) return reject(new Error('Supabase não configurado (⚙️ API).'));

            const headers = {
                'apikey': config.key,
                'Content-Type': 'application/json',
                ...extraHeaders
            };
            // Com login: token do usuário. Sem login: chave legada (JWT "eyJ...") vai também no Authorization;
            // chave nova "sb_publishable_..." NÃO pode ir como Bearer (gera 401).
            if (tok) headers['Authorization'] = `Bearer ${tok}`;
            else if (config.key.startsWith('eyJ')) headers['Authorization'] = `Bearer ${config.key}`;

            inflight++;
            updateSyncIndicator();

            const done = () => { inflight = Math.max(0, inflight - 1); updateSyncIndicator(); };

            GM_xmlhttpRequest({
                method,
                url: `${config.url}/rest/v1/${endpoint}`,
                headers,
                data: payload != null ? JSON.stringify(payload) : undefined,
                timeout: 15000,
                onload(res) {
                    done();
                    if (res.status >= 200 && res.status < 300) {
                        let data = {};
                        try { data = res.responseText ? JSON.parse(res.responseText) : {}; } catch (e) { data = {}; }
                        resolve(data);
                    } else {
                        const err = new Error(explainHttp(res.status, res.responseText));
                        err.status = res.status;
                        reject(err);
                    }
                },
                onerror(e) {
                    done();
                    const err = new Error(explainHttp(0, e && e.error));
                    err.status = 0;
                    reject(err);
                },
                ontimeout() {
                    done();
                    const err = new Error('Tempo esgotado (15 s) ao conectar ao Supabase. Internet lenta ou instável.');
                    err.status = 0;
                    reject(err);
                }
            });
        });
    }

    function reportCloudError(err, context, forceAlert) {
        lastCloudError = `${context}: ${err.message}`;
        console.error('[Agenda Supabase]', lastCloudError);
        const banner = document.getElementById('cloudErrorBanner');
        const txt = document.getElementById('cloudErrorText');
        if (banner && txt) {
            txt.innerText = `⚠️ Nuvem: ${lastCloudError}  —  ${outbox.length} alteração(ões) aguardando envio (salvas neste PC).`;
            banner.classList.add('show');
        }
        if (forceAlert || !errorAlertShown) {
            errorAlertShown = true;
            alert(`⚠️ Falha no Supabase (${context})\n\n${err.message}\n\nNada foi perdido: as alterações ficam na fila deste computador e serão reenviadas automaticamente.`);
        }
        updateSyncIndicator();
    }

    function clearCloudError() {
        lastCloudError = null;
        errorAlertShown = false;
        const banner = document.getElementById('cloudErrorBanner');
        if (banner) banner.classList.remove('show');
        updateSyncIndicator();
    }

    function updateSyncIndicator() {
        const el = document.getElementById('indicatorNuvem');
        if (!el) return;
        const config = getSupabaseConfig();
        const pend = outbox.length;
        const ses = lerSessao();
        atualizarPainelLogin();
        if (!config) {
            el.innerHTML = '💾 Local';
            el.style.color = '#f59e0b';
            el.title = 'Somente local. Configure o Supabase em ⚙️ API.';
        } else if (inflight > 0) {
            el.innerHTML = '⏳ Sincronizando...';
            el.style.color = '#38bdf8';
        } else if (lastCloudError) {
            el.innerHTML = `⚠️ Erro nuvem${pend ? ` (${pend} pend.)` : ''}`;
            el.style.color = '#f87171';
            el.title = lastCloudError;
        } else if (pend > 0) {
            el.innerHTML = `⏳ ${pend} na fila`;
            el.style.color = '#fbbf24';
            el.title = 'Alterações aguardando envio.';
        } else if (!ses) {
            el.innerHTML = '☁️ Nuvem OK 🔓';
            el.style.color = '#fbbf24';
            el.title = 'Funcionando, mas SEM LOGIN neste computador. Entre em ⚙️ API → 🔐 Login (uma vez por computador): em breve a nuvem só aceitará quem estiver logado.';
        } else if (rt.status === 'on') {
            el.innerHTML = '☁️ Nuvem OK ⚡';
            el.style.color = '#34d399';
            el.title = `Sincronizado com o Supabase (🔐 ${ses.email}). ⚡ Tempo real ativo: mudanças feitas nos outros computadores aparecem em ~1 s.`;
        } else {
            el.innerHTML = '☁️ Nuvem OK';
            el.style.color = '#34d399';
            el.title = 'Sincronizado com o Supabase. Tempo real ' + (rt.status === 'conectando' ? 'conectando...' : `indisponível${rt.motivo ? ' (' + rt.motivo + ')' : ''}`) + ' — atualizando a cada 30 s.';
        }
    }

    // =====================================================================
    // 5A. LOGIN (v9.1) — Supabase Auth (e-mail + senha, 1 usuário)
    // ---------------------------------------------------------------------
    // A senha NUNCA é guardada: só a sessão (access_token ~1 h + refresh_token),
    // em localStorage deste computador. Renova sozinha 5 min antes de vencer
    // (e a cada chamada, se faltar < 2 min). Várias abas no mesmo PC: trava curta
    // em localStorage para só uma renovar (o refresh_token é de uso único).
    // Cadastro público DESLIGADO no projeto (só o usuário criado no painel).
    // =====================================================================
    const AUTH_STORAGE = 'agenda_supabase_sessao_v91';
    const AUTH_LOCK = 'agenda_supabase_sessao_trava_v91';
    let renovacaoEmCurso = null;

    function lerSessao() {
        const s = safeJsonParse(localStorage.getItem(AUTH_STORAGE), null);
        return s && s.access_token && s.refresh_token ? s : null;
    }
    function gravarSessao(j) {
        const antiga = lerSessao() || {};
        const s = {
            access_token: j.access_token,
            refresh_token: j.refresh_token,
            expires_at: Number(j.expires_at) || (Math.floor(Date.now() / 1000) + (Number(j.expires_in) || 3600)),
            email: (j.user && j.user.email) || antiga.email || ''
        };
        localStorage.setItem(AUTH_STORAGE, JSON.stringify(s));
        return s;
    }
    function apagarSessao() { localStorage.removeItem(AUTH_STORAGE); }

    function authPost(caminho, corpo) {
        return new Promise((resolve, reject) => {
            const config = getSupabaseConfig();
            if (!config) return reject(new Error('Supabase não configurado (⚙️ API).'));
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${config.url}/auth/v1/${caminho}`,
                headers: { 'apikey': config.key, 'Content-Type': 'application/json' },
                data: JSON.stringify(corpo),
                timeout: 15000,
                onload(res) { resolve({ status: res.status, json: safeJsonParse(res.responseText, {}) }); },
                onerror() { const e = new Error('Sem conexão com o Supabase (login).'); e.status = 0; reject(e); },
                ontimeout() { const e = new Error('Tempo esgotado no login (15 s).'); e.status = 0; reject(e); }
            });
        });
    }

    async function entrar(email, senha) {
        const r = await authPost('token?grant_type=password', { email: String(email || '').trim(), password: String(senha || '') });
        if (r.status === 200 && r.json.access_token) {
            const s = gravarSessao(r.json);
            updateSyncIndicator();
            rtReconectar();
            return s;
        }
        const cod = r.json.error_code || r.json.error || '';
        if (cod === 'invalid_credentials' || cod === 'invalid_grant') throw new Error('E-mail ou senha incorretos.');
        if (cod === 'email_not_confirmed') throw new Error('E-mail ainda não confirmado no Supabase (marque "Auto Confirm User" ao criar).');
        throw new Error(`Login recusado (HTTP ${r.status}): ${r.json.msg || r.json.error_description || cod}`);
    }

    function sair() {
        const s = lerSessao(), config = getSupabaseConfig();
        apagarSessao();
        // encerra a sessão no servidor (melhor esforço)
        if (s && config) GM_xmlhttpRequest({ method: 'POST', url: `${config.url}/auth/v1/logout`, headers: { apikey: config.key, Authorization: `Bearer ${s.access_token}` }, timeout: 8000 });
        updateSyncIndicator();
        rtReconectar();
    }

    function renovarSessao() {
        if (renovacaoEmCurso) return renovacaoEmCurso;
        renovacaoEmCurso = (async () => {
            let s = lerSessao();
            if (!s) return null;
            // outra aba deste computador já está renovando: espera e usa o resultado dela
            if ((Number(localStorage.getItem(AUTH_LOCK)) || 0) > Date.now()) {
                await new Promise(ok => setTimeout(ok, 2500));
                s = lerSessao();
                if (!s) return null;
                if (s.expires_at - Date.now() / 1000 > 120) return s;
            }
            localStorage.setItem(AUTH_LOCK, String(Date.now() + 10000));
            try {
                const r = await authPost('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
                if (r.status === 200 && r.json.access_token) {
                    const n = gravarSessao(r.json);
                    rtAtualizarToken(n.access_token);
                    return n;
                }
                const s3 = lerSessao(); // outra aba trocou o refresh_token nesse meio-tempo
                if (s3 && s3.refresh_token !== s.refresh_token) return s3;
                if (r.status === 400 || r.status === 401 || r.status === 403) {
                    apagarSessao();
                    updateSyncIndicator();
                    reportCloudError(new Error('Sessão encerrada (senha trocada, usuário removido ou sessão expirada). Entre de novo em ⚙️ API → 🔐 Login.'), 'login', false);
                    return null;
                }
                throw new Error(`HTTP ${r.status} ao renovar a sessão`);
            } finally {
                localStorage.removeItem(AUTH_LOCK);
            }
        })();
        return renovacaoEmCurso.finally(() => { renovacaoEmCurso = null; });
    }

    async function tokenValido() {
        const s = lerSessao();
        if (!s) return null;
        if (s.expires_at - Date.now() / 1000 > 120) return s.access_token;
        const n = await renovarSessao();
        return n ? n.access_token : null;
    }

    function atualizarPainelLogin() {
        const form = document.getElementById('loginForm'), st = document.getElementById('loginStatus');
        if (!form || !st) return;
        const s = lerSessao();
        form.style.display = s ? 'none' : 'grid';
        st.style.display = s ? 'flex' : 'none';
        const t = document.getElementById('loginStatusTxt');
        if (t && s) {
            const ic = v => v === true ? '✅' : v === false ? '—' : '…';
            t.innerText = `✅ Logado como ${s.email || '(usuário)'} · 🤖 IA pela nuvem: Claude ${ic(iaNuvem.claude)} Gemini ${ic(iaNuvem.gemini)}`;
            t.title = 'IA pela nuvem: chaves guardadas nos Secrets do Supabase (não neste computador). "—" = chave não cadastrada lá; usa a chave local deste PC, se houver.';
        }
    }

    // =====================================================================
    // 6. FILA OFFLINE (OUTBOX) — nada se perde se a nuvem falhar
    // =====================================================================
    // v9.0 — nome padronizado do convênio (o SPDATA/IA grava variações: "SERPRAM-SERVICO DE", "IPSENMG"...).
    // Mesma regra da função convenio_canonico() do banco. SUS mantém o setor ("SUS - Pronto Socorro").
    function normConvenio(c) {
        const u = normText(c).normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (!u) return 'NÃO INFORMADO';
        if (u.startsWith('PREFEITURA')) return 'PREFEITURA';
        if (/^SUS\b/.test(u)) return normText(c);
        if (/^SER[PF][A-Z]*([ -]|$)/.test(u)) return 'SERPRAM';
        if (/^IPSEN?MG/.test(u)) return 'IPSEMG';
        if (/^IPSM/.test(u)) return 'IPSM (PM)';
        if (/^UNIMED INTERC/.test(u)) return 'UNIMED INTERCÂMBIO';
        if (/^UNIMED( SUL.*)?$/.test(u)) return 'UNIMED SUL MINEIRA';
        if (/^SPA SAUDE/.test(u)) return 'SPA SAÚDE';
        if (/^BRADESCO/.test(u)) return 'BRADESCO';
        if (/^CARTAO DESC/.test(u)) return 'CARTÃO DESCONTO';
        return normText(c);
    }

    function toCloudRow(item, dateStr) {
        return {
            data_agenda: dateStr,
            hora: normalizeTime(item.hora),
            tipo: item.tipo || 'Hospital/Convênio',
            convenio: normConvenio(item.convenio),
            paciente: normText(item.paciente),
            exame: normText(item.exame) || 'NÃO INFORMADO',
            status: item.status || 'pendente',
            chegou_em: item.chegouEm || null,
            atendido_em: item.atendidoEm || null,
            tempo_espera_min: (item.tempoEsperaMin === undefined || Number.isNaN(item.tempoEsperaMin)) ? null : item.tempoEsperaMin,
            // v8.5 — integração PACS (sempre enviados, para lotes uniformes no PostgREST)
            origem: item.origem || 'agenda',
            pacs_paciente_id: item.pacsPacienteId == null ? null : item.pacsPacienteId,
            pacs_exame_ids: Array.isArray(item.pacsExameIds) && item.pacsExameIds.length ? item.pacsExameIds : null,
            pacs_atendimento: item.pacsAtendimento || null,
            pacs_qtd_exames: item.pacsQtdExames || null,
            chegada_fonte: item.chegadaFonte || null,
            imagem_em: item.imagemEm || null,
            atendido_fonte: item.atendidoFonte || null,
            // v8.7 — vários exames no mesmo horário, observação e saída da origem
            qtd_exames: Math.max(1, parseInt(item.qtdExames != null ? item.qtdExames : item.qtd_exames, 10) || 1),
            obs: item.obs || null,
            removido_origem_em: item.removidoOrigemEm || item.removido_origem_em || null,
            // v8.7.2 — nome como veio da planilha/PDF quando a linha passou a usar o nome do PACS
            nome_origem: item.nomeOrigem || item.nome_origem || null,
            // v9.3 — urgência (null = não classificado; o banco aplica a regra do SUS e não deixa null apagar o que já foi marcado)
            urgente: item.urgente == null ? null : !!item.urgente,
            urgente_fonte: item.urgente == null ? null : (item.urgenteFonte || null),
            setor: item.setor || null
        };
    }

    // v9.0 — última versão de cada linha que a nuvem CONFIRMOU (lida ou gravada com sucesso).
    // Evita reenviar linha idêntica (antes: milhares de POST/dia e eco no tempo real dos outros PCs).
    // Datas/horas comparadas pelo instante (a nuvem devolve "+00:00", o navegador gera "Z").
    const confirmadoNaNuvem = new Map();
    function assinaturaLinha(row) {
        return JSON.stringify(row, (k, v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) && !isNaN(Date.parse(v))) ? Date.parse(v) : v);
    }
    function marcarConfirmado(row) { confirmadoNaNuvem.set(`${row.data_agenda}|${naturalKey(row)}`, assinaturaLinha(row)); }

    function enqueueUpsert(item, dateStr) {
        if (!getSupabaseConfig()) return;
        const row = toCloudRow(item, dateStr);
        const k = `${dateStr}|${naturalKey(row)}`;
        // igual ao que a nuvem já tem e nada pendente para esta linha → não reenvia
        if (confirmadoNaNuvem.get(k) === assinaturaLinha(row) && !outbox.some(op => op.k === k)) return;
        escritaGen++;
        // Coalescer: mantém só a última versão do mesmo registro na fila
        outbox = outbox.filter(op => !(op.k === k));
        outbox.push({ t: 'upsert', k, date: dateStr, row });
        persistOutbox();
        flushOutbox();
    }

    function enqueueDelete(item, dateStr) {
        if (!getSupabaseConfig()) return;
        escritaGen++;
        const row = toCloudRow(item, dateStr);
        const k = `${dateStr}|${naturalKey(row)}`;
        outbox = outbox.filter(op => !(op.k === k));
        outbox.push({ t: 'delete', k, date: dateStr, row });
        persistOutbox();
        flushOutbox();
    }

    function deleteEndpoint(row) {
        return `${TABLE}?data_agenda=eq.${row.data_agenda}` +
            `&hora=eq.${encodeURIComponent(row.hora)}` +
            `&paciente=eq.${encodeURIComponent(row.paciente)}` +
            `&exame=eq.${encodeURIComponent(row.exame)}`;
    }

    async function flushOutbox(manual = false) {
        if (!getSupabaseConfig() || isFlushing || outbox.length === 0) { updateSyncIndicator(); return true; }
        isFlushing = true;
        try {
            while (outbox.length > 0) {
                const op = outbox[0];
                if (op.t === 'upsert') {
                    // Agrupa upserts consecutivos em um único lote
                    const batch = [];
                    // a linha em envio deixa de contar como "confirmada": se o usuário desfizer a ação
                    // durante o envio (A→B→A), a volta para A precisa ser enviada também
                    while (outbox.length > 0 && outbox[0].t === 'upsert' && batch.length < 200) { const o = outbox.shift(); confirmadoNaNuvem.delete(o.k); batch.push(o.row); }
                    try {
                        await requestSupabase(`${TABLE}?on_conflict=${CONFLICT_COLS}`, 'POST', batch, {
                            'Prefer': 'resolution=merge-duplicates,return=minimal'
                        });
                        batch.forEach(marcarConfirmado);
                        escritaGen++;
                    } catch (err) {
                        // devolve o lote para a frente da fila
                        outbox = batch.map(row => ({ t: 'upsert', k: `${row.data_agenda}|${naturalKey(row)}`, date: row.data_agenda, row })).concat(outbox);
                        throw err;
                    }
                } else {
                    await requestSupabase(deleteEndpoint(op.row), 'DELETE', null, { 'Prefer': 'return=minimal' });
                    confirmadoNaNuvem.delete(op.k);
                    escritaGen++;
                    outbox = outbox.filter(o => o !== op); // a fila pode ter sido refeita durante o envio
                }
                persistOutbox();
            }
            clearCloudError();
            return true;
        } catch (err) {
            persistOutbox();
            reportCloudError(err, 'envio de alterações', manual);
            return false;
        } finally {
            isFlushing = false;
            updateSyncIndicator();
        }
    }

    // =====================================================================
    // 7. LEITURA DA NUVEM (fonte da verdade quando não há pendências)
    // =====================================================================
    function mapCloudRow(r) {
        return {
            id: 'c' + r.id,
            hora: normalizeTime(r.hora),
            tipo: r.tipo,
            convenio: r.convenio,
            paciente: r.paciente,
            exame: r.exame,
            status: r.status || 'pendente',
            periodo: periodoFromHora(r.hora),
            chegouEm: r.chegou_em,
            atendidoEm: r.atendido_em,
            tempoEsperaMin: r.tempo_espera_min,
            origem: r.origem || 'agenda',
            pacsPacienteId: r.pacs_paciente_id == null ? null : Number(r.pacs_paciente_id),
            pacsExameIds: Array.isArray(r.pacs_exame_ids) ? r.pacs_exame_ids.map(Number) : null,
            pacsAtendimento: r.pacs_atendimento || null,
            pacsQtdExames: r.pacs_qtd_exames || null,
            chegadaFonte: r.chegada_fonte || null,
            imagemEm: r.imagem_em || null,
            atendidoFonte: r.atendido_fonte || null,
            qtdExames: r.qtd_exames || 1,
            obs: r.obs || null,
            removidoOrigemEm: r.removido_origem_em || null,
            nomeOrigem: r.nome_origem || null,
            urgente: r.urgente == null ? null : !!r.urgente,
            urgenteFonte: r.urgente_fonte || null,
            setor: r.setor || null
        };
    }

    async function loadDayFromCloud(dateStr, silent = false) {
        if (!getSupabaseConfig()) { renderAgenda(); return; }
        // 1º envia o que está pendente; se falhar, NÃO sobrescreve o local
        const ok = await flushOutbox();
        if (!ok) { renderAgenda(); return; }
        const hasPendingForDate = outbox.some(op => op.date === dateStr);
        if (hasPendingForDate) { renderAgenda(); return; }
        // Não sobrescreve enquanto o usuário está digitando numa célula
        if (silent && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('editable-cell')) return;
        const genAntes = escritaGen;
        try {
            const rows = await requestSupabase(`${TABLE}?data_agenda=eq.${dateStr}&select=*&order=hora.asc`, 'GET');
            // v9.0 — houve alteração/envio durante a leitura: a resposta pode estar velha.
            // Mantém o local; o eco do tempo real (ou a próxima leitura) traz o estado final.
            if (escritaGen !== genAntes || isFlushing) { if (dateStr === selectedDate) renderAgenda(); return; }
            if (Array.isArray(rows)) {
                const local = agendaDatabase[dateStr] || [];
                // PROTEÇÃO: nuvem vazia + dia local com pacientes nunca sincronizados
                // => NÃO apaga o local; envia o local para a nuvem.
                if (rows.length === 0 && local.length > 0 && !syncedDates[dateStr]) {
                    for (const k of [...confirmadoNaNuvem.keys()]) if (k.startsWith(dateStr + '|')) confirmadoNaNuvem.delete(k);
                    local.forEach(item => enqueueUpsert(item, dateStr));
                } else {
                    agendaDatabase[dateStr] = sortPatientsList(rows.map(mapCloudRow));
                    persistDb();
                    markSynced(dateStr);
                    // o que a nuvem tem agora para este dia (linhas apagadas em outro PC deixam de constar)
                    for (const k of [...confirmadoNaNuvem.keys()]) if (k.startsWith(dateStr + '|')) confirmadoNaNuvem.delete(k);
                    agendaDatabase[dateStr].forEach(it => marcarConfirmado(toCloudRow(it, dateStr)));
                }
                clearCloudError();
            }
        } catch (err) {
            reportCloudError(err, 'leitura da agenda', false);
        }
        if (dateStr === selectedDate) renderAgenda();
    }

    // =====================================================================
    // 7A. TEMPO REAL (v9.0) — Supabase Realtime (WebSocket, protocolo Phoenix)
    // ---------------------------------------------------------------------
    // Uma conexão por aba escuta INSERT/UPDATE/DELETE em agenda_exames. Mudou o
    // dia aberto (ou apagou algo — o DELETE não traz a data) → relê o dia em
    // ~1 s. Sem nenhum dado de paciente no tráfego além do que o REST já lê.
    // Se o WebSocket falhar/cair: reconecta com espera crescente (5 s → 5 min) e
    // a leitura a cada 30 s volta a valer. Com o tempo real ativo, a leitura
    // periódica vira reserva (3 min). Exige a tabela na publicação
    // supabase_realtime (feito no banco em 14/10/2026).
    // =====================================================================
    const RT_TOPIC = 'realtime:pacs-agenda';
    const RT_HEARTBEAT_MS = 25000;
    const RT_SILENCIO_MS = 75000; // sem nenhuma mensagem (nem resposta do heartbeat) → conexão morta
    const rt = { ws: null, status: 'off', ref: 0, hb: null, retry: 0, retryTimer: null, lastMsg: 0, debounce: null, joinRef: null, motivo: '' };

    function rtSend(obj) {
        try { if (rt.ws && rt.ws.readyState === 1) rt.ws.send(JSON.stringify(obj)); } catch (e) { /* onclose trata */ }
    }

    function rtFalha(motivo) {
        rt.status = 'falhou';
        rt.motivo = motivo;
        console.warn('[Agenda tempo real]', motivo);
        updateSyncIndicator();
    }

    function rtPermitido() {
        return window.top === window.self && !document.documentElement.hasAttribute('data-ag-viewer');
    }

    async function rtConectar() {
        if (!rtPermitido()) return; // visualizador de imagens e iframes não abrem conexão
        const cfg = getSupabaseConfig();
        if (!cfg || typeof WebSocket === 'undefined') return;
        if (rt.ws && (rt.ws.readyState === 0 || rt.ws.readyState === 1)) return;
        clearTimeout(rt.retryTimer);
        let tokUsuario = null;
        try { tokUsuario = await tokenValido(); } catch (e) { tokUsuario = null; }
        if (rt.ws && (rt.ws.readyState === 0 || rt.ws.readyState === 1)) return; // outra chamada abriu durante a espera
        let ws;
        try {
            ws = new WebSocket(`${cfg.url.replace(/^http/i, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(cfg.key)}&vsn=1.0.0`);
        } catch (e) { rtFalha('WebSocket bloqueado: ' + e.message); rtReagendar(); return; }
        rt.ws = ws;
        rt.status = 'conectando';
        updateSyncIndicator();
        ws.onopen = () => {
            rt.lastMsg = Date.now();
            rt.joinRef = String(++rt.ref);
            const payload = { config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table: TABLE }] } };
            if (tokUsuario) payload.access_token = tokUsuario;            // v9.1: token do usuário logado
            else if (cfg.key.startsWith('eyJ')) payload.access_token = cfg.key; // chave legada; a sb_publishable vai só na URL
            rtSend({ topic: RT_TOPIC, event: 'phx_join', payload, ref: rt.joinRef, join_ref: rt.joinRef });
            clearInterval(rt.hb);
            rt.hb = setInterval(() => {
                if (Date.now() - rt.lastMsg > RT_SILENCIO_MS) { try { ws.close(); } catch (e) { /* ok */ } return; }
                rtSend({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++rt.ref) });
            }, RT_HEARTBEAT_MS);
        };
        ws.onmessage = ev => {
            rt.lastMsg = Date.now();
            let m;
            try { m = JSON.parse(ev.data); } catch (e) { return; }
            if (!m || m.topic !== RT_TOPIC) return;
            if (m.event === 'phx_reply' && m.ref === rt.joinRef) {
                if (m.payload && m.payload.status === 'ok') { rt.status = 'on'; rt.retry = 0; rt.motivo = ''; updateSyncIndicator(); }
                else { rtFalha('canal recusado: ' + JSON.stringify((m.payload && m.payload.response) || {}).slice(0, 200)); try { ws.close(); } catch (e) { /* ok */ } }
                return;
            }
            if (m.event === 'system' && m.payload && m.payload.status === 'error') {
                rtFalha('assinatura recusada: ' + String(m.payload.message || '').slice(0, 200));
                try { ws.close(); } catch (e) { /* ok */ }
                return;
            }
            if (m.event === 'postgres_changes') rtMudanca(m.payload && m.payload.data);
            if (m.event === 'phx_error' || m.event === 'phx_close') { try { ws.close(); } catch (e) { /* ok */ } }
        };
        ws.onerror = () => { /* onclose trata */ };
        ws.onclose = () => {
            if (rt.ws === ws || !rt.ws) clearInterval(rt.hb); // não derruba o heartbeat de uma conexão mais nova
            if (rt.ws === ws) rt.ws = null;
            if (rt.status !== 'falhou') rt.status = 'off';
            updateSyncIndicator();
            rtReagendar();
        };
    }

    // sessão renovada: o servidor do tempo real precisa do token novo (senão derruba o canal quando o antigo vence)
    function rtAtualizarToken(tok) {
        if (tok && rt.status === 'on') rtSend({ topic: RT_TOPIC, event: 'access_token', payload: { access_token: tok }, ref: String(++rt.ref) });
    }

    function rtReagendar() {
        clearTimeout(rt.retryTimer);
        const espera = Math.min(300000, 5000 * Math.pow(2, rt.retry++));
        rt.retryTimer = setTimeout(rtConectar, espera);
    }

    function rtReconectar() {
        rt.retry = 0;
        clearTimeout(rt.retryTimer);
        if (rt.ws) { try { rt.ws.close(); } catch (e) { /* ok */ } } else rtConectar();
    }

    function rtMudanca(data) {
        if (!data) return;
        const dia = (data.record && data.record.data_agenda) || (data.old_record && data.old_record.data_agenda) || null;
        if (dia && dia !== selectedDate) return; // outro dia: será lido ao abrir aquele dia
        rtRecarregar();
    }

    function rtRecarregar() {
        clearTimeout(rt.debounce);
        rt.debounce = setTimeout(() => {
            // não sobrescreve enquanto alguém digita numa célula: tenta de novo em 3 s
            const ae = document.activeElement;
            if (ae && ae.classList && ae.classList.contains('editable-cell')) { rt.debounce = setTimeout(rtRecarregar, 3000); return; }
            ultimaLeituraNuvem = Date.now();
            loadDayFromCloud(selectedDate, true);
        }, 1200);
    }

    // =====================================================================
    // 7B. INTEGRAÇÃO PACS (v8.5)
    // ---------------------------------------------------------------------
    // Lê a lista de exames de US do dia pela API interna do PACS (a mesma que a
    // tela "Exames" usa), com o token da sessão já aberta. O token NUNCA sai do
    // navegador nem vai para o Supabase.
    //   • Chegada  = hora da ficha (exa_data + exa_hora)
    //   • Imagem   = 1ª chegada de imagens no PACS (exa_pacs_data + exa_pacs_hora)
    //   • Atendido = clique em "Atend"; se não houver clique, a hora da imagem
    //   • Paciente no PACS fora da agenda => encaixe automático
    // =====================================================================
    const PACS_SYNC_MS = 60000;
    const PACS_MOD_US = 35; // modalidade ULTRASSOM no PACS
    const PACS_LINK_AUTO = 0.88;  // similaridade de nome para vínculo automático
    const PACS_LINK_ASK = 0.72;   // entre ASK e AUTO: pede confirmação
    const PACS_DECISIONS_KEY = 'agenda_pacs_decisoes_v85';

    let pacsState = { lastOk: null, lastError: null, running: false, pendentes: [], grupos: 0, exames: 0 };
    let pacsMissCount = {}; // linhas vinculadas cujo exame sumiu do PACS (precisa sumir em 2 leituras seguidas)
    let pacsDecisions = safeJsonParse(localStorage.getItem(PACS_DECISIONS_KEY), {});

    function persistPacsDecisions() {
        // guarda só as decisões dos últimos dias
        const hoje = getTodayIso();
        Object.keys(pacsDecisions).forEach(k => { if (k.slice(0, 10) < hoje) delete pacsDecisions[k]; });
        localStorage.setItem(PACS_DECISIONS_KEY, JSON.stringify(pacsDecisions));
    }

    function pacsToken() {
        try { return localStorage.getItem('lwtoken'); } catch (e) { return null; }
    }

    // Nome sem acento/pontuação, maiúsculo, espaços simples
    function normName(s) {
        return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
            const cur = [i];
            for (let j = 1; j <= b.length; j++) {
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
            prev = cur;
        }
        return prev[b.length];
    }

    // 0..1 — combina distância de edição com sobreposição de palavras
    // (tolera erro de OCR e nome abreviado/incompleto em um dos lados)
    function nameScore(a, b) {
        const x = normName(a), y = normName(b);
        if (!x || !y) return 0;
        if (x === y) return 1;
        const lev = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
        const stop = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E']);
        const tx = x.split(' ').filter(t => !stop.has(t)), ty = y.split(' ').filter(t => !stop.has(t));
        let tok = 0;
        // v8.7.2 — nome cortado no fim (SPDATA trunca nomes longos): um é prefixo do outro
        const [curto, longo] = x.length <= y.length ? [x, y] : [y, x];
        const nCurto = curto.split(' ').filter(t => !stop.has(t)).length;
        if (curto.length >= 12 && longo.startsWith(curto) && nCurto >= 2) tok = nCurto >= 3 ? 0.93 : 0.85;
        if (tx.length >= 2 && ty.length >= 2 && tx[0] === ty[0]) {
            const [menor, maior] = tx.length <= ty.length ? [tx, ty] : [ty, tx];
            // a última palavra do nome menor pode estar cortada ("OLIV" = "OLIVEIRA")
            const contem = (t, i) => maior.includes(t) || (i === menor.length - 1 && t.length >= 3 && maior.some(m => m.startsWith(t)));
            const contidos = menor.filter(contem).length;
            // um nome contém o outro: automático só com 3+ palavras em comum (2 palavras => pede confirmação)
            if (contidos === menor.length) tok = Math.max(tok, menor.length >= 3 ? 0.95 : 0.85);
            else if (contidos / menor.length >= 0.67) tok = Math.max(tok, 0.8);
        }
        return Math.max(lev, tok);
    }

    function pacsDateTimeIso(dataStr, horaStr) {
        if (!dataStr || !horaStr) return null;
        const [y, mo, d] = dataStr.split('-').map(Number);
        const [h, mi, s] = String(horaStr).split(':').map(Number);
        const dt = new Date(y, mo - 1, d, h || 0, mi || 0, s || 0); // horário local (Brasília)
        return isNaN(dt) ? null : dt.toISOString();
    }

    function cleanExamDesc(s) {
        return normText(s).replace(/\s+/g, ' ');
    }

    function convenioFromPacs(desc) {
        const c = normText(desc);
        if (c.includes('PREFEITURA')) return { tipo: 'Prefeitura', convenio: 'PREFEITURA' };
        if (/^SUS\b/.test(c)) return { tipo: 'SUS Hospitalar', convenio: c };
        return { tipo: 'Hospital/Convênio', convenio: c || 'NÃO INFORMADO' };
    }

    async function fetchPacsExamsToday() {
        const tok = pacsToken();
        if (!tok) { const e = new Error('PACS sem login nesta aba.'); e.code = 'nologin'; throw e; }
        const qs = 'offset=0&limit=300&tela=EXAMES&pac_nome=&pac_pacs_codigo=&data_codigo=2&data_inicial=&data_final=' +
            `&mod_codigo[]=${PACS_MOD_US}&exa_idnsomenteassinador=false&exa_dataparam=$exame.exa_data$`;
        const res = await fetch(`${location.origin}/backend/api/exame?${qs}`, { headers: { 'x-access-token': tok } });
        if (res.status === 401 || res.status === 403) { const e = new Error('Sessão do PACS expirada — faça login de novo.'); e.code = 'nologin'; throw e; }
        if (!res.ok) throw new Error(`PACS respondeu HTTP ${res.status}`);
        const j = await res.json();
        const hoje = getTodayIso();
        return (j.rows || []).filter(x => x && x.paciente && x.exa_data === hoje && x.exa_situacao !== 'CANCELADO');
    }

    // Agrupa exames por paciente (pac_codigo)
    function groupPacsExams(rows) {
        const map = {};
        rows.forEach(x => {
            const k = x.pac_codigo;
            if (!map[k]) map[k] = { pacId: Number(k), nome: normText(x.paciente.pac_nome), exames: [] };
            map[k].exames.push(x);
        });
        return Object.values(map).map(g => {
            g.exames.sort((a, b) => a.exa_codigo - b.exa_codigo);
            const fichas = g.exames.map(x => pacsDateTimeIso(x.exa_data, x.exa_hora)).filter(Boolean).sort();
            const imagens = g.exames.filter(x => x.exa_pacs_hora).map(x => pacsDateTimeIso(x.exa_pacs_data || x.exa_data, x.exa_pacs_hora)).filter(Boolean).sort();
            g.fichaEm = fichas[0] || null;
            g.imagemEm = imagens[0] || null;
            g.horaFicha = normalizeTime(String(g.exames[0].exa_hora || '').slice(0, 5));
            g.atendimento = String(g.exames[0].exa_his_atendimento || '') || null;
            g.convenioDesc = (g.exames[0].convenio && g.exames[0].convenio.conv_descricao) || '';
            g.examIds = g.exames.map(x => Number(x.exa_codigo));
            g.examDescs = g.exames.map(x => cleanExamDesc(x.tipoexame && x.tipoexame.tpe_descricao));
            g.urgente = g.exames.some(x => x.exa_idnurgente === true);
            g.setor = setorDoPacs(g.exames[0]);
            return g;
        }).sort((a, b) => String(a.fichaEm).localeCompare(String(b.fichaEm)));
    }

    // v9.3 — setor de origem (PS, internado, maternidade…) a partir do exame do PACS; null se o PACS não informar
    // Campos do HIS no PACS (conferido 16/10/2026): exa_tipo 'I' = internado / 'E' = externo;
    // exa_his_adicional.patientBloco = ala ("G - MATERNIDADE", "L - UTI ADULTO"…);
    // patientOrigemsolicatacaoExame = 'P.E.P' (pedido do prontuário: PS/internação) ou 'S.A.D.T' (guia ambulatorial).
    function setorDoPacs(x) {
        if (!x) return null;
        const conv = normText(x.convenio && x.convenio.conv_descricao);
        const m = conv.match(/^SUS\s*-\s*(.+)$/);
        if (m) return m[1].trim();
        const a = x.exa_his_adicional || {};
        const tit = t => String(t).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).replace(/\b(E|De|Da|Do)\b/g, w => w.toLowerCase()).replace(/\bUti\b/g, 'UTI');
        if (x.exa_tipo === 'I') { const b = String(a.patientBloco || '').replace(/^\s*[A-Z]\s*-\s*/i, '').trim(); return b ? 'Internado · ' + tit(b) : 'Internado'; }
        const o = String(a.patientOrigemsolicatacaoExame || '').toUpperCase();
        if (x.exa_tipo === 'E' && o.startsWith('P.E.P')) return 'Pronto Socorro';
        if (o.startsWith('S.A.D.T')) return 'Ambulatório';
        return null;
    }

    function patientKeyOf(item) {
        return item.pacsPacienteId > 0 ? `p${item.pacsPacienteId}` : `n${normName(item.paciente)}`;
    }

    // Aplica os dados do PACS a uma linha da agenda. Retorna a nova linha.
    function applyPacsToRow(row, g, examIds) {
        const r = { ...row };
        // v8.7.2 — o nome correto é sempre o do PACS; o da origem fica guardado em nomeOrigem
        if (g.nome && normName(g.nome) !== normName(r.paciente)) {
            if (r.origem !== 'encaixe_pacs' && !r.nomeOrigem) r.nomeOrigem = r.paciente;
            r.paciente = normText(g.nome);
        }
        r.pacsPacienteId = g.pacId;
        r.pacsExameIds = examIds && examIds.length ? examIds : null;
        r.pacsAtendimento = g.atendimento;
        r.pacsQtdExames = r.pacsExameIds ? r.pacsExameIds.length : null;
        if (g.fichaEm) { r.chegouEm = g.fichaEm; r.chegadaFonte = 'pacs'; }
        if (g.imagemEm) r.imagemEm = g.imagemEm;
        // A ficha prova a presença: pendente/falta => em espera
        if (r.status === 'pendente' || r.status === 'faltou' || r.status === 'cancelado' || !r.status) r.status = 'esperando';
        // Sem clique em "Atend": usa a chegada das imagens
        if (r.status === 'esperando' && r.imagemEm) {
            r.status = 'atendido';
            r.atendidoEm = r.imagemEm;
            r.atendidoFonte = 'imagem';
        }
        if (r.status === 'atendido' && !r.atendidoFonte) r.atendidoFonte = 'manual';
        r.tempoEsperaMin = (r.status === 'atendido' && r.chegouEm && r.atendidoEm) ? calcWaitTime(r.chegouEm, r.atendidoEm) : null;
        // v9.3 — urgência marcada no PACS (exa_idnurgente). Marcação à mão sempre prevalece.
        if (r.urgenteFonte !== 'manual') {
            if (g.urgente) { r.urgente = true; r.urgenteFonte = 'pacs'; }
            else if (r.urgenteFonte === 'pacs') { r.urgente = false; r.urgenteFonte = 'pacs'; }
        }
        if (g.setor && !r.setor) r.setor = g.setor;
        return r;
    }

    const PACS_FIELDS = ['paciente', 'nomeOrigem', 'status', 'chegouEm', 'atendidoEm', 'tempoEsperaMin', 'pacsPacienteId', 'pacsExameIds', 'pacsAtendimento', 'pacsQtdExames', 'chegadaFonte', 'imagemEm', 'atendidoFonte', 'origem', 'urgente', 'urgenteFonte', 'setor'];
    function rowChanged(a, b) {
        return PACS_FIELDS.some(f => JSON.stringify(a[f] == null ? null : a[f]) !== JSON.stringify(b[f] == null ? null : b[f]));
    }

    function newEncaixeFromPacs(g) {
        const { tipo, convenio } = convenioFromPacs(g.convenioDesc);
        const base = {
            id: 'l' + Date.now() + '_' + g.pacId,
            hora: g.horaFicha, tipo, convenio,
            paciente: g.nome,
            exame: g.examDescs[0] || 'NÃO INFORMADO', // 1º exame (estável); a quantidade fica em pacsQtdExames
            status: 'pendente', periodo: periodoFromHora(g.horaFicha),
            chegouEm: null, atendidoEm: null, tempoEsperaMin: null,
            origem: 'encaixe_pacs'
        };
        return applyPacsToRow(base, g, g.examIds);
    }

    // Distribui os exames do PACS entre as linhas da agenda do mesmo paciente
    function linkGroupToRows(g, rows) {
        rows = [...rows].sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
        const out = [];
        rows.forEach((row, i) => {
            let ids;
            if (i < rows.length - 1) ids = g.examIds[i] != null ? [g.examIds[i]] : [];
            else ids = g.examIds.slice(i); // a última linha recebe o restante (ex.: 2 punhos numa linha só)
            out.push(applyPacsToRow(row, g, ids));
        });
        return out;
    }

    async function syncPacsToday(manual = false) {
        if (pacsState.running) return;
        if (!pacsToken()) { pacsState.lastError = 'nologin'; updatePacsIndicator(); return; }
        pacsState.running = true;
        updatePacsIndicator();
        const today = getTodayIso();
        try {
            const exams = await fetchPacsExamsToday();
            // garante a agenda de hoje atualizada com a nuvem antes de comparar
            if (getSupabaseConfig()) await loadDayFromCloud(today, true);
            // v8.7.2 — encaixe criado antes de a agenda ser importada: funde com a linha da agenda
            const fundidos = fundirEncaixesDia(today);
            const grupos = groupPacsExams(exams);
            let list = [...(agendaDatabase[today] || [])];
            const claimed = new Set();
            const updates = []; // { old, neu }
            const novos = [];
            const pendentes = [];
            const byId = new Map(list.map(r => [String(r.id), r]));

            const commit = (old, neu) => { if (rowChanged(old, neu)) updates.push({ old, neu }); claimed.add(String(old.id)); };

            // 1º: grupos já vinculados (pelo ID do paciente no PACS)
            const restantes = [];
            grupos.forEach(g => {
                const linked = list.filter(r => r.pacsPacienteId === g.pacId);
                if (linked.length) linkGroupToRows(g, linked).forEach((neu, i) => commit(linked[i], neu));
                else restantes.push(g);
            });

            // 1b: exame CANCELADO/removido no PACS (ex.: convênio não autorizou).
            // O PACS apaga o exame; a linha vinculada deixa de ter ficha. Por segurança só age se o
            // exame sumir em 2 leituras seguidas e se a lista do PACS não veio vazia.
            const activeIds = new Set(exams.map(x => Number(x.exa_codigo)));
            const removidos = [];
            list.forEach(r => {
                if (!(r.pacsPacienteId > 0) || claimed.has(String(r.id))) { delete pacsMissCount[r.id]; return; }
                const ids = Array.isArray(r.pacsExameIds) ? r.pacsExameIds.map(Number) : [];
                if (!ids.length || ids.some(x => activeIds.has(x)) || exams.length === 0) { delete pacsMissCount[r.id]; return; }
                pacsMissCount[r.id] = (pacsMissCount[r.id] || 0) + 1;
                if (pacsMissCount[r.id] < 2) return;
                delete pacsMissCount[r.id];
                const feitoNoClique = r.status === 'atendido' && r.atendidoFonte === 'manual';
                if (feitoNoClique) return; // você marcou como atendido: não mexe
                if (r.origem === 'encaixe_pacs') { removidos.push(r); return; } // encaixe que nunca existiu na agenda
                commit(r, { ...r, status: 'cancelado', chegouEm: null, chegadaFonte: null, imagemEm: null, atendidoEm: null, atendidoFonte: null, tempoEsperaMin: null, pacsExameIds: null, pacsQtdExames: null });
            });

            // 2º: vínculo por nome (somente linhas ainda sem paciente do PACS)
            restantes.forEach(g => {
                const decKey = `${today}|${g.pacId}`;
                const dec = pacsDecisions[decKey];
                const livres = list.filter(r => !claimed.has(String(r.id)) && r.pacsPacienteId == null);

                if (dec && dec.tipo === 'vincular') {
                    const alvo = livres.filter(r => normName(r.paciente) === dec.nome);
                    if (alvo.length) { linkGroupToRows(g, alvo).forEach((neu, i) => commit(alvo[i], neu)); return; }
                }
                if (dec && dec.tipo === 'encaixe') { novos.push(newEncaixeFromPacs(g)); return; }

                let best = null, bestScore = 0, second = 0;
                livres.forEach(r => {
                    const sc = nameScore(r.paciente, g.nome);
                    if (sc > bestScore) { if (best && normName(best.paciente) !== normName(r.paciente)) second = bestScore; bestScore = sc; best = r; }
                    else if (best && normName(best.paciente) !== normName(r.paciente) && sc > second) second = sc;
                });
                const ambiguo = bestScore < 1 && second >= PACS_LINK_ASK; // dois nomes diferentes parecidos: pergunta

                if (best && bestScore >= PACS_LINK_AUTO && !ambiguo) {
                    const alvo = livres.filter(r => normName(r.paciente) === normName(best.paciente));
                    linkGroupToRows(g, alvo).forEach((neu, i) => commit(alvo[i], neu));
                } else if (best && bestScore >= PACS_LINK_ASK) {
                    pendentes.push({ pacId: g.pacId, nomePacs: g.nome, nomeAgenda: best.paciente, horaAgenda: best.hora, score: bestScore, ficha: g.horaFicha, exames: g.examDescs });
                } else {
                    novos.push(newEncaixeFromPacs(g));
                }
            });

            // evita encaixe duplicado (outro computador pode ter criado antes)
            const keys = new Set(list.map(naturalKey));
            const novosOk = novos.filter(n => !keys.has(naturalKey(n)) && !list.some(r => r.pacsPacienteId === n.pacsPacienteId));

            if (updates.length || novosOk.length || removidos.length) {
                removidos.forEach(r => { byId.delete(String(r.id)); enqueueDelete(r, today); });
                updates.forEach(({ old, neu }) => {
                    byId.set(String(old.id), neu);
                    // nome trocado pelo do PACS muda a chave única: apaga o registro antigo antes de gravar
                    if (naturalKey(old) !== naturalKey(neu)) enqueueDelete(old, today);
                    enqueueUpsert(neu, today);
                });
                list = Array.from(byId.values()).concat(novosOk);
                novosOk.forEach(n => enqueueUpsert(n, today));
                agendaDatabase[today] = sortPatientsList(list);
                persistDb();
            }

            pacsState.pendentes = pendentes;
            pacsState.grupos = grupos.length;
            pacsState.exames = exams.length;
            pacsState.lastOk = new Date();
            pacsState.lastError = null;
            if (manual) alert(`🩻 PACS lido: ${grupos.length} paciente(s), ${exams.length} procedimento(s).\n` +
                `${updates.length} linha(s) atualizada(s), ${novosOk.length} encaixe(s) criado(s), ${removidos.length} encaixe(s) removido(s)` +
                (fundidos ? `, ${fundidos} encaixe(s) mesclado(s) com a agenda` : '') +
                (pendentes.length ? `, ${pendentes.length} vínculo(s) para confirmar.` : '.'));
        } catch (err) {
            pacsState.lastError = err.code === 'nologin' ? 'nologin' : err.message;
            console.error('[Agenda PACS]', err);
            if (manual) alert('⚠️ Falha ao ler o PACS: ' + err.message);
        } finally {
            pacsState.running = false;
            updatePacsIndicator();
            if (selectedDate === today) renderAgenda();
        }
    }

    function resolvePendente(pacId, tipo) {
        const today = getTodayIso();
        const p = pacsState.pendentes.find(x => String(x.pacId) === String(pacId));
        if (!p) return;
        pacsDecisions[`${today}|${pacId}`] = tipo === 'vincular' ? { tipo, nome: normName(p.nomeAgenda) } : { tipo };
        persistPacsDecisions();
        pacsState.pendentes = pacsState.pendentes.filter(x => x !== p);
        renderAgenda();
        syncPacsToday();
    }

    // Desfaz um vínculo errado: a linha da agenda fica marcada para não vincular de novo
    // a esse paciente do PACS (ID negativo) e o paciente do PACS vira encaixe.
    function unlinkPacs(id) {
        const list = agendaDatabase[selectedDate] || [];
        const row = list.find(i => String(i.id) === String(id));
        if (!row || !(row.pacsPacienteId > 0)) return;
        if (!confirm(`Desfazer o vínculo de "${row.paciente}" com o PACS?\n\nA linha volta para "pendente" e o paciente do PACS será lançado como encaixe.`)) return;
        const pacId = row.pacsPacienteId;
        pacsDecisions[`${selectedDate}|${pacId}`] = { tipo: 'encaixe' };
        pacsDecisions[`${selectedDate}|fusao|${pacId}`] = { tipo: 'nao' }; // não mescla de novo sozinho
        persistPacsDecisions();
        // volta o nome como estava na origem (planilha/PDF), se ele tinha sido trocado pelo do PACS
        if (row.nomeOrigem && row.origem !== 'encaixe_pacs') enqueueDelete(row, selectedDate);
        updateItem(id, i => ({
            ...i, pacsPacienteId: -pacId, pacsExameIds: null, pacsAtendimento: null, pacsQtdExames: null,
            paciente: (i.nomeOrigem && i.origem !== 'encaixe_pacs') ? i.nomeOrigem : i.paciente,
            nomeOrigem: i.origem !== 'encaixe_pacs' ? null : i.nomeOrigem,
            status: i.origem === 'encaixe_pacs' ? i.status : 'pendente',
            chegouEm: null, chegadaFonte: null, imagemEm: null, atendidoEm: null, atendidoFonte: null, tempoEsperaMin: null
        }));
        syncPacsToday();
    }

    // =====================================================================
    // 7C. MESCLAR ENCAIXE COM A AGENDA (v8.7.2)
    // ---------------------------------------------------------------------
    // Caso: o paciente fez a ficha no PACS antes de a agenda (planilha/PDF) ser importada
    // => virou ENCAIXE; depois a importação trouxe a mesma pessoa, às vezes com o nome
    // diferente (SOUZA × SOUSA, nome cortado no PDF). A fusão:
    //   • mantém a linha da AGENDA (horário, exame, convênio, origem, qtd);
    //   • traz do encaixe o vínculo PACS, chegada, imagens, atendimento e status;
    //   • usa o NOME DO PACS (o da origem fica em nome_origem p/ casar reimportações);
    //   • apaga o encaixe.
    // Automática (no ciclo do PACS e após importar) com similaridade ≥ PACS_LINK_AUTO e sem
    // ambiguidade; entre ASK e AUTO o ENCAIXE fica com "🔗?" e a fusão é pelo clique.
    // =====================================================================
    const ORIGENS_ENCAIXE = ['encaixe_pacs', 'encaixe_manual'];
    const STATUS_RANK = { atendido: 3, esperando: 2, pendente: 1, faltou: 0, cancelado: 0 };
    const ehEncaixe = r => ORIGENS_ENCAIXE.includes(r && r.origem);
    const fusaoKey = (dateStr, enc) => `${dateStr}|fusao|${enc.pacsPacienteId > 0 ? enc.pacsPacienteId : 'n' + normName(enc.paciente)}`;

    // linhas da agenda que podem ser o mesmo paciente do encaixe, da mais provável para a menos
    function candidatosFusao(enc, list, { incluirAtendidos = false } = {}) {
        return list.filter(r => String(r.id) !== String(enc.id) && !ehEncaixe(r)
                && !(r.pacsPacienteId > 0)                                             // já é outro paciente do PACS
                && !(enc.pacsPacienteId > 0 && r.pacsPacienteId === -enc.pacsPacienteId) // vínculo desfeito por você
                && (incluirAtendidos || r.status !== 'atendido'))
            .map(r => ({ r, score: Math.max(nameScore(r.paciente, enc.paciente), r.nomeOrigem ? nameScore(r.nomeOrigem, enc.paciente) : 0) }))
            .sort((a, b) => (b.score - a.score) || (Math.abs(timeToMinutes(a.r.hora) - timeToMinutes(enc.hora)) - Math.abs(timeToMinutes(b.r.hora) - timeToMinutes(enc.hora))));
    }

    // todas as linhas da agenda do mesmo paciente (2 horários = 2 linhas)
    function alvosDoPaciente(alvo, cands) {
        const n = normName(alvo.paciente);
        return cands.map(c => c.r).filter(r => normName(r.paciente) === n)
            .sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
    }

    // Puro: devolve as novas versões das linhas da agenda
    function fundirEncaixe(enc, alvos) {
        const ids = Array.isArray(enc.pacsExameIds) ? enc.pacsExameIds : [];
        const nomePacs = enc.pacsPacienteId > 0 || enc.origem === 'encaixe_pacs';
        const rankEnc = STATUS_RANK[enc.status] != null ? STATUS_RANK[enc.status] : 1;
        return alvos.map((a, i) => {
            const n = { ...a };
            if (nomePacs && normName(enc.paciente) !== normName(a.paciente)) {
                n.nomeOrigem = a.nomeOrigem || a.paciente;
                n.paciente = normText(enc.paciente);
            }
            if (enc.pacsPacienteId > 0) {
                n.pacsPacienteId = enc.pacsPacienteId;
                n.pacsAtendimento = enc.pacsAtendimento || null;
                const part = i < alvos.length - 1 ? (ids[i] != null ? [ids[i]] : []) : ids.slice(i);
                n.pacsExameIds = part.length ? part : null;
                n.pacsQtdExames = n.pacsExameIds ? n.pacsExameIds.length : null;
            }
            const rankA = STATUS_RANK[a.status] != null ? STATUS_RANK[a.status] : 1;
            if (rankEnc > rankA) {
                ['status', 'chegouEm', 'chegadaFonte', 'atendidoEm', 'atendidoFonte', 'tempoEsperaMin'].forEach(f => { n[f] = enc[f] == null ? null : enc[f]; });
            }
            if (!n.imagemEm && enc.imagemEm) n.imagemEm = enc.imagemEm;
            if (!n.obs && enc.obs) n.obs = enc.obs;
            return n;
        });
    }

    // Aplica a fusão no dia (local + fila da nuvem)
    function aplicarFusao(dateStr, enc, alvos) {
        const novos = fundirEncaixe(enc, alvos);
        enqueueDelete(enc, dateStr);
        alvos.forEach((a, i) => { if (naturalKey(a) !== naturalKey(novos[i])) enqueueDelete(a, dateStr); });
        novos.forEach(n => enqueueUpsert(n, dateStr));
        const troca = new Map(alvos.map((a, i) => [String(a.id), novos[i]]));
        agendaDatabase[dateStr] = sortPatientsList((agendaDatabase[dateStr] || [])
            .filter(r => String(r.id) !== String(enc.id))
            .map(r => troca.get(String(r.id)) || r));
        persistDb();
        return novos;
    }

    // Melhor candidato sem ambiguidade (ou null)
    function melhorFusao(enc, list) {
        const c = candidatosFusao(enc, list);
        if (!c.length) return null;
        const best = c[0];
        const segundo = c.find(x => normName(x.r.paciente) !== normName(best.r.paciente));
        const ambiguo = best.score < 1 && segundo && segundo.score >= PACS_LINK_ASK;
        return { best, ambiguo, cands: c };
    }

    // Automática: só encaixes do PACS (a ficha prova que é a mesma pessoa que chegou)
    function fundirEncaixesDia(dateStr) {
        let n = 0;
        const encs = (agendaDatabase[dateStr] || []).filter(r => r.origem === 'encaixe_pacs' && r.pacsPacienteId > 0);
        encs.forEach(enc => {
            // encaixe redundante: uma linha da agenda já está vinculada ao MESMO paciente do PACS
            const jaVinculadas = (agendaDatabase[dateStr] || []).filter(r => !ehEncaixe(r) && r.pacsPacienteId === enc.pacsPacienteId)
                .sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
            if (jaVinculadas.length) { aplicarFusao(dateStr, enc, jaVinculadas); n++; return; }
            if (pacsDecisions[fusaoKey(dateStr, enc)]) return; // você disse "não é a mesma pessoa"
            const m = melhorFusao(enc, agendaDatabase[dateStr] || []);
            if (!m || m.ambiguo || m.best.score < PACS_LINK_AUTO) return;
            aplicarFusao(dateStr, enc, alvosDoPaciente(m.best.r, m.cands));
            n++;
        });
        return n;
    }

    // Sugestão para o badge (entre ASK e AUTO, ou ambíguo)
    function sugestaoFusao(enc, list) {
        if (!ehEncaixe(enc) || pacsDecisions[fusaoKey(selectedDate, enc)]) return null;
        const m = melhorFusao(enc, list);
        return (m && m.best.score >= PACS_LINK_ASK) ? m.best : null;
    }

    function fecharFusao() { const o = document.getElementById('agFusaoOverlay'); if (o) o.remove(); }

    // Manual: lista as linhas do dia por semelhança de nome e mescla a escolhida
    function abrirFusao(encId) {
        const dateStr = selectedDate;
        const list = agendaDatabase[dateStr] || [];
        const enc = list.find(r => String(r.id) === String(encId));
        if (!enc) return;
        fecharFusao();
        const cands = candidatosFusao(enc, list, { incluirAtendidos: true });
        const dark = isDarkMode;
        const ov = document.createElement('div');
        ov.id = 'agFusaoOverlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:2147483600; display:flex; align-items:center; justify-content:center; font-family:inherit;';
        const st = s => ({ pendente: 'pendente', esperando: 'em espera', atendido: 'atendido', faltou: 'faltou', cancelado: 'cancelado' }[s] || s || '');
        const linhas = cands.slice(0, 12).map(({ r, score }) => `
            <button data-fusao-alvo="${escapeHtml(r.id)}" style="display:flex; width:100%; justify-content:space-between; gap:8px; text-align:left; padding:6px 8px; margin:3px 0; border-radius:6px; cursor:pointer;
                border:1px solid ${score >= PACS_LINK_AUTO ? '#10b981' : score >= PACS_LINK_ASK ? '#f59e0b' : (dark ? '#334155' : '#cbd5e1')}; background:${dark ? '#0f172a' : '#fff'}; color:inherit;">
                <span><b>${escapeHtml(normalizeTime(r.hora))}</b> · ${escapeHtml(r.paciente)}<br><small style="opacity:.75;">${escapeHtml(r.exame)} · ${escapeHtml(st(r.status))}</small></span>
                <span style="font-weight:700; white-space:nowrap;">${Math.round(score * 100)}%</span>
            </button>`).join('') || '<div style="opacity:.7; padding:8px 0;">Nenhuma linha da agenda disponível neste dia.</div>';
        ov.innerHTML = `
            <div style="background:${dark ? '#1e293b' : '#f8fafc'}; color:${dark ? '#e2e8f0' : '#0f172a'}; width:min(520px, 94vw); max-height:84vh; overflow:auto; border-radius:10px; padding:14px 16px; box-shadow:0 10px 40px rgba(0,0,0,.4); font-size:12.5px;">
                <div style="font-weight:800; font-size:14px; margin-bottom:4px;">🔗 Mesclar encaixe com a agenda</div>
                <div style="margin-bottom:8px; opacity:.85;">Encaixe <b>${escapeHtml(normalizeTime(enc.hora))}</b> · <b>${escapeHtml(enc.paciente)}</b> · ${escapeHtml(enc.exame)}<br>
                Escolha a linha da agenda que é a mesma pessoa. Fica o horário/exame da agenda${enc.pacsPacienteId > 0 ? ', com o <b>nome do PACS</b>' : ''}, a chegada e o atendimento; o encaixe é apagado.</div>
                ${linhas}
                <div style="display:flex; justify-content:space-between; gap:8px; margin-top:10px;">
                    <button data-fusao-nao="1" class="btn-act btn-falta" title="Não sugerir de novo hoje">Não é ninguém da agenda</button>
                    <button data-fusao-fechar="1" class="btn-act btn-chegou">Fechar</button>
                </div>
            </div>`;
        ov.addEventListener('click', e => {
            if (e.target === ov || e.target.closest('[data-fusao-fechar]')) { fecharFusao(); return; }
            if (e.target.closest('[data-fusao-nao]')) {
                pacsDecisions[fusaoKey(dateStr, enc)] = { tipo: 'nao' };
                persistPacsDecisions();
                fecharFusao(); renderAgenda(); return;
            }
            const b = e.target.closest('[data-fusao-alvo]');
            if (!b) return;
            const alvo = cands.find(c => String(c.r.id) === String(b.dataset.fusaoAlvo));
            if (!alvo) return;
            const alvos = alvosDoPaciente(alvo.r, cands);
            const nomeFinal = enc.pacsPacienteId > 0 || enc.origem === 'encaixe_pacs' ? enc.paciente : alvo.r.paciente;
            if (!confirm(`Mesclar?\n\nENCAIXE ${normalizeTime(enc.hora)} · ${enc.paciente}\n  ⇒ AGENDA ${alvos.map(a => normalizeTime(a.hora)).join(', ')} · ${alvo.r.paciente}\n\nNome final: ${nomeFinal}\nO encaixe será apagado.`)) return;
            delete pacsDecisions[fusaoKey(dateStr, enc)];
            persistPacsDecisions();
            aplicarFusao(dateStr, enc, alvos);
            fecharFusao();
            renderAgenda();
            if (dateStr === getTodayIso()) syncPacsToday();
        });
        document.body.appendChild(ov);
    }

    // Depois de importar planilha/PDF/print: mescla encaixes já existentes nos dias importados
    async function fundirAposImportar(datas) {
        const hoje = getTodayIso();
        let n = 0;
        for (const d of datas) {
            if (d > hoje) continue; // encaixe do PACS só existe em dia que já aconteceu
            if (d !== selectedDate && getSupabaseConfig()) await loadDayFromCloud(d, true);
            n += fundirEncaixesDia(d);
        }
        if (n) { renderAgenda(); alert(`🔗 ${n} encaixe(s) do PACS mesclado(s) com a agenda importada (mantido o nome do PACS).`); }
        return n;
    }

    function updatePacsIndicator() {
        const el = document.getElementById('indicatorPacs');
        if (!el) return;
        if (pacsState.running) { el.innerHTML = '🩻 Lendo PACS...'; el.style.color = '#38bdf8'; return; }
        if (pacsState.lastError === 'nologin') { el.innerHTML = '🩻 PACS: sem login'; el.style.color = '#f59e0b'; el.title = 'Faça login no PACS nesta aba para a chegada automática funcionar.'; return; }
        if (pacsState.lastError) { el.innerHTML = '🩻 PACS: erro'; el.style.color = '#f87171'; el.title = pacsState.lastError; return; }
        if (pacsState.lastOk) {
            const h = `${String(pacsState.lastOk.getHours()).padStart(2, '0')}:${String(pacsState.lastOk.getMinutes()).padStart(2, '0')}`;
            el.innerHTML = `🩻 PACS ${h}`;
            el.style.color = '#34d399';
            el.title = `Última leitura às ${h}: ${pacsState.grupos} paciente(s), ${pacsState.exames} procedimento(s). Clique para ler agora.`;
            return;
        }
        el.innerHTML = '🩻 PACS';
        el.style.color = '#94a3b8';
    }

    function renderPacsPendentes() {
        const box = document.getElementById('pacsPendBox');
        if (!box) return;
        const pend = selectedDate === getTodayIso() ? pacsState.pendentes : [];
        if (!pend.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
        box.style.display = 'block';
        box.innerHTML = `<div style="font-weight:700; margin-bottom:4px;">🔗 Confirmar vínculo com o PACS (nome parecido, não idêntico)</div>` +
            pend.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; padding:3px 0; border-top:1px dashed #fcd34d;">
                    <span>PACS <b>${escapeHtml(p.nomePacs)}</b> (ficha ${escapeHtml(p.ficha)} · ${escapeHtml(p.exames.join(' + '))})
                    ⇄ agenda <b>${escapeHtml(p.nomeAgenda)}</b> (${escapeHtml(p.horaAgenda)}) — ${Math.round(p.score * 100)}%</span>
                    <span style="white-space:nowrap;">
                        <button class="btn-act btn-atend" data-pacs="vincular" data-pacid="${escapeHtml(p.pacId)}">É a mesma pessoa</button>
                        <button class="btn-act btn-chegou" data-pacs="encaixe" data-pacid="${escapeHtml(p.pacId)}">É encaixe</button>
                    </span>
                </div>`).join('');
    }

    // =====================================================================
    // 8. ENVIO FORÇADO / TESTE
    // =====================================================================
    async function pushAllLocalToCloud() {
        if (!getSupabaseConfig()) { alert('⚠️ Configure a Project URL e a chave do Supabase primeiro.'); return; }
        const dates = Object.keys(agendaDatabase).filter(d => Array.isArray(agendaDatabase[d]) && agendaDatabase[d].length > 0);
        if (dates.length === 0) { alert('⚠️ Não há nenhum paciente salvo localmente neste computador.'); return; }
        const total = dates.reduce((acc, d) => acc + agendaDatabase[d].length, 0);
        if (!confirm(`Enviar ${total} registro(s) de ${dates.length} dia(s) deste computador para a nuvem?\n\nRegistros iguais (mesma data + hora + paciente + exame) serão mesclados, sem duplicar.`)) return;

        dates.forEach(d => {
            const seen = new Set();
            agendaDatabase[d].forEach(item => {
                const row = toCloudRow(item, d);
                const k = `${d}|${naturalKey(row)}`;
                if (seen.has(k)) return;
                seen.add(k);
                outbox = outbox.filter(op => op.k !== k);
                outbox.push({ t: 'upsert', k, date: d, row });
            });
        });
        persistOutbox();
        const ok = await flushOutbox(true);
        if (ok) {
            alert(`✅ ${total} registro(s) de ${dates.length} dia(s) gravados no Supabase.\nConfira em Supabase > Table Editor > agenda_exames.`);
            loadDayFromCloud(selectedDate);
        }
    }

    async function testSupabaseConnection() {
        const cfg = getSupabaseConfig();
        if (!cfg) { alert('⚠️ Preencha a URL e a chave antes de testar.'); return; }
        try {
            await requestSupabase(`${TABLE}?select=id&limit=1`, 'GET');
            // teste de escrita real (insere e apaga um registro de teste)
            const probe = { data_agenda: '2000-01-01', hora: '00:00', tipo: 'TESTE', convenio: 'TESTE', paciente: 'TESTE CONEXAO ' + Date.now(), exame: 'TESTE', status: 'pendente' };
            await requestSupabase(`${TABLE}?on_conflict=${CONFLICT_COLS}`, 'POST', [probe], { 'Prefer': 'resolution=merge-duplicates,return=minimal' });
            await requestSupabase(deleteEndpoint(probe), 'DELETE', null, { 'Prefer': 'return=minimal' });
            clearCloudError();
            alert(`✅ Conexão OK (leitura + gravação + exclusão).\n\nURL usada: ${cfg.url}\nTipo de chave: ${cfg.key.startsWith('eyJ') ? 'anon (legada/JWT)' : 'publishable (nova)'}`);
        } catch (err) {
            reportCloudError(err, 'teste de conexão', true);
        }
    }

    // =====================================================================
    // 9. GEMINI (OCR)
    // =====================================================================
    function requestGeminiEndpoint(endpointUrl, apiKey, payload) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: endpointUrl,
                // v9.2.1: chave no cabeçalho (forma oficial). Chaves novas do AI Studio (desde mai/2026)
                // começam com "AQ." e não funcionam no antigo ?key= da URL.
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                data: JSON.stringify(payload),
                timeout: 90000,
                onload(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.error) reject(new Error(data.error.message || 'Erro retornado pela API'));
                        else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) resolve(data);
                        else reject(new Error('Resposta da IA sem dados válidos.'));
                    } catch (e) {
                        reject(new Error('Resposta corrompida do servidor: ' + String(response.responseText).slice(0, 300)));
                    }
                },
                onerror() { reject(new Error('Falha na conexão de rede com a API do Google.')); },
                ontimeout() { reject(new Error('Tempo de leitura da imagem esgotado (90 s).')); }
            });
        });
    }

    async function callGeminiVision(apiKey, payload) {
        const models = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];
        let lastError = null;
        for (const m of models) {
            try {
                return await requestGeminiEndpoint(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, apiKey, payload);
            } catch (err) {
                lastError = err;
                if (err.message && /API_KEY|quota|RESOURCE_EXHAUSTED/i.test(err.message)) throw err;
            }
        }
        throw lastError || new Error('A API do Gemini não respondeu. Verifique a chave em ⚙️ API.');
    }

    // =====================================================================
    // 9B. IA — Claude (padrão) com Gemini de reserva
    // ---------------------------------------------------------------------
    // Ordem: a IA escolhida em ⚙️ API primeiro; se falhar (ou não tiver chave),
    // tenta a outra. Aceita imagens (JPEG comprimido) e PDF.
    // =====================================================================
    const ANTHROPIC_KEY_STORAGE = 'anthropic_api_key';
    const IA_PREF_STORAGE = 'ia_preferida'; // 'claude' | 'gemini'
    const CLAUDE_MODEL = 'claude-sonnet-5-5';

    function requestClaude(apiKey, content, maxTokens = 16000) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.anthropic.com/v1/messages',
                headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                data: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
                timeout: 240000,
                onload(res) {
                    let data = null;
                    try { data = JSON.parse(res.responseText); } catch (e) { /* abaixo */ }
                    if (res.status !== 200 || !data) {
                        const msg = data && data.error ? data.error.message : String(res.responseText || '').slice(0, 200);
                        return reject(new Error(`HTTP ${res.status}${res.status === 401 ? ' (chave inválida)' : res.status === 402 || /credit/i.test(msg) ? ' (sem crédito)' : ''}: ${msg}`));
                    }
                    const texto = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
                    if (!texto) return reject(new Error('resposta vazia'));
                    resolve(texto);
                },
                onerror() { reject(new Error('sem conexão com api.anthropic.com')); },
                ontimeout() { reject(new Error('tempo esgotado (4 min)')); }
            });
        });
    }

    // v9.2 — IA pela nuvem: Edge Function "ia-proxy" do Supabase. As chaves da
    // Anthropic/Google ficam nos Secrets do projeto; só funciona logado.
    // Ordem para cada IA: nuvem (se logado e a chave existir lá) → chave local deste PC (reserva).
    const iaNuvem = { claude: null, gemini: null }; // null = não sabe; false = sem chave na nuvem
    async function requestProxyIA(corpo) {
        const config = getSupabaseConfig();
        const tok = await tokenValido();
        if (!config || !tok) { const e = new Error('sem login'); e.codigo = 'login'; throw e; }
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${config.url}/functions/v1/ia-proxy`,
                headers: { apikey: config.key, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
                data: JSON.stringify(corpo),
                timeout: 240000,
                onload(res) {
                    const d = safeJsonParse(res.responseText, {});
                    if (res.status === 200) return resolve(d);
                    const e = new Error(d.detalhe || d.erro || `HTTP ${res.status}`);
                    e.codigo = d.erro || String(res.status);
                    reject(e);
                },
                onerror() { const e = new Error('sem conexão com a nuvem (IA)'); e.codigo = 'rede'; reject(e); },
                ontimeout() { const e = new Error('tempo esgotado (4 min)'); e.codigo = 'tempo'; reject(e); }
            });
        });
    }
    async function statusIaNuvem() {
        try { const d = await requestProxyIA({ acao: 'status' }); iaNuvem.claude = !!d.claude; iaNuvem.gemini = !!d.gemini; }
        catch (e) { /* sem login ou sem rede: mantém o que sabia */ }
        return iaNuvem;
    }

    async function chamarIA({ prompt, imagens = [], pdfs = [] }) {
        const kC = (localStorage.getItem(ANTHROPIC_KEY_STORAGE) || '').trim();
        const kG = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
        const logado = !!lerSessao() && !!getSupabaseConfig();
        if (!kC && !kG && !logado) throw new Error('Entre na nuvem (⚙️ API → 🔐 Login) ou configure a chave do Claude/Gemini em ⚙️ API.');
        const ordem = (localStorage.getItem(IA_PREF_STORAGE) || 'claude') === 'gemini' ? ['gemini', 'claude'] : ['claude', 'gemini'];
        const content = [
            ...imagens.map(i => ({ type: 'image', source: { type: 'base64', media_type: i.mimeType, data: i.base64 } })),
            ...pdfs.map(p => ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: p.base64 } })),
            { type: 'text', text: prompt }
        ];
        const parts = [{ text: prompt },
            ...imagens.map(i => ({ inline_data: { mime_type: i.mimeType, data: i.base64 } })),
            ...pdfs.map(p => ({ inline_data: { mime_type: 'application/pdf', data: p.base64 } }))];
        const erros = [];
        for (const ia of ordem) {
            const nome = ia === 'claude' ? 'Claude' : 'Gemini';
            // 1) nuvem
            if (logado && iaNuvem[ia] !== false) {
                try {
                    const d = await requestProxyIA(ia === 'claude' ? { acao: 'claude', content } : { acao: 'gemini', parts });
                    iaNuvem[ia] = true;
                    return { texto: d.texto, ia: nome + ' ☁️' };
                } catch (e) {
                    if (e.codigo === 'sem_chave') iaNuvem[ia] = false;
                    else erros.push(`${nome} (nuvem): ${e.message}`);
                }
            }
            // 2) chave local deste computador (reserva)
            if (ia === 'claude' && kC) {
                try { return { texto: await requestClaude(kC, content), ia: 'Claude' }; }
                catch (e) { erros.push('Claude: ' + e.message); }
            }
            if (ia === 'gemini' && kG) {
                try {
                    const d = await callGeminiVision(kG, { contents: [{ parts }] });
                    return { texto: d.candidates[0].content.parts.map(p => p.text || '').join(''), ia: 'Gemini' };
                } catch (e) { erros.push('Gemini: ' + e.message); }
            }
        }
        if (!erros.length) erros.push('Nenhuma chave de IA disponível: cadastre ANTHROPIC_API_KEY/GEMINI_API_KEY nos Secrets do Supabase ou a chave em ⚙️ API.');
        throw new Error(erros.join('\n'));
    }

    function lerArquivoBase64(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = e => resolve({ base64: String(e.target.result).split(',')[1], mimeType: file.type || 'application/pdf' });
            r.onerror = () => reject(new Error('Falha ao ler o arquivo ' + file.name));
            r.readAsDataURL(file);
        });
    }

    // =====================================================================
    // 9C. SINCRONIZAÇÃO POR ORIGEM (planilha da Prefeitura, PDF do SPDATA, prints)
    // ---------------------------------------------------------------------
    // - 1 horário = 1 linha; vários exames no mesmo horário ficam juntos ("A + B")
    //   e contam como N procedimentos (coluna qtd_exames).
    // - Nunca sobrescreve o que já existe (status, chegada, atendimento): insere só o novo
    //   (ignore-duplicates) e faz PATCH pontual (obs, qtd, "voltou", "saiu").
    // - Linha da mesma origem que não veio mais → removido_origem_em; se cancelarAusentes
    //   e ainda pendente → status 'cancelado' (Prefeitura). PDF só sinaliza (IA pode errar).
    // =====================================================================
    const ORIGEM_PREF = 'prefeitura_planilha', ORIGEM_PDF = 'spdata_pdf';
    const chaveLinha = r => `${r.data_agenda}|${normalizeTime(r.hora)}|${normText(r.paciente)}|${normText(r.exame)}`;
    const chaveSlot = r => `${r.data_agenda}|${normalizeTime(r.hora)}|${normText(r.paciente)}`;

    // junta várias linhas do mesmo horário/paciente num bloco só
    function agruparPorHorario(linhas) {
        const m = new Map();
        linhas.forEach(l => {
            const k = chaveSlot(l);
            const partes = normText(l.exame).split(/\s*\+\s*/).filter(Boolean);
            if (!m.has(k)) m.set(k, { ...l, _partes: [], _qtdFixa: l._qtdFixa != null ? l._qtdFixa : null });
            const g = m.get(k);
            partes.forEach(p => { if (!g._partes.includes(p)) g._partes.push(p); });
            if (l.obs && !g.obs) g.obs = l.obs;
        });
        return [...m.values()].map(g => { const { _partes, _qtdFixa, ...r } = g; return { ...r, exame: _partes.join(' + ') || 'NÃO INFORMADO', qtd_exames: _qtdFixa != null ? _qtdFixa : Math.max(1, _partes.length) }; });
    }

    async function sincronizarOrigem(origem, ini, fim, novosBrutos, { cancelarAusentes = false, sinalizarAusentes = true, datas = null } = {}) {
        const novos = agruparPorHorario(novosBrutos);
        const exist = await requestSupabase(`${TABLE}?data_agenda=gte.${ini}&data_agenda=lte.${fim}&select=id,data_agenda,hora,paciente,nome_origem,exame,status,origem,removido_origem_em,obs,qtd_exames&limit=10000`, 'GET');
        // v8.7.2 — linha renomeada para o nome do PACS casa pelo nome original da origem
        const lista = (Array.isArray(exist) ? exist : []).map(r => r.nome_origem ? { ...r, paciente: r.nome_origem } : r);
        const mapa = new Map(lista.map(r => [chaveLinha(r), r]));
        const slotsOutra = new Set(lista.filter(r => r.origem !== origem).map(chaveSlot));
        const novosK = new Set(novos.map(chaveLinha));
        const agora = new Date().toISOString();
        const inserir = [], patches = [];
        const rel = { novos: [], saiu: [], voltou: [], outraOrigem: 0, total: novos.length };
        novos.forEach(n => {
            const e = mapa.get(chaveLinha(n));
            if (!e) {
                if (slotsOutra.has(chaveSlot(n))) { rel.outraOrigem++; return; }
                inserir.push(n); rel.novos.push(n); return;
            }
            if (e.origem !== origem) return;
            const p = {};
            if (e.removido_origem_em) { p.removido_origem_em = null; if (e.status === 'cancelado') p.status = 'pendente'; rel.voltou.push(n); }
            if ((e.obs || null) !== (n.obs || null)) p.obs = n.obs || null;
            if ((e.qtd_exames || 1) !== (n.qtd_exames || 1)) p.qtd_exames = n.qtd_exames || 1;
            if (Object.keys(p).length) patches.push([e.id, p]);
        });
        if (sinalizarAusentes) {
            lista.filter(e => e.origem === origem && !novosK.has(chaveLinha(e)) && !e.removido_origem_em && (!datas || datas.has(e.data_agenda)))
                .forEach(e => {
                    const p = { removido_origem_em: agora };
                    if (cancelarAusentes && (e.status === 'pendente' || !e.status)) p.status = 'cancelado';
                    patches.push([e.id, p]); rel.saiu.push(e);
                });
        }
        for (let i = 0; i < inserir.length; i += 200) {
            await requestSupabase(`${TABLE}?on_conflict=${CONFLICT_COLS}`, 'POST', inserir.slice(i, i + 200), { 'Prefer': 'resolution=ignore-duplicates,return=minimal' });
        }
        for (const [id, p] of patches) await requestSupabase(`${TABLE}?id=eq.${id}`, 'PATCH', p, { 'Prefer': 'return=minimal' });
        return rel;
    }

    function relatorioSync(titulo, rel, extra = '') {
        const fmt = r => `${fmtBR(r.data_agenda)} ${normalizeTime(r.hora)} · ${normText(r.paciente)} · ${r.exame}`;
        const lim = (arr, n = 12) => arr.slice(0, n).map(fmt).join('\n') + (arr.length > n ? `\n… e mais ${arr.length - n}` : '');
        let t = `${titulo}\n\n✅ Novos: ${rel.novos.length}   ↩️ Voltaram: ${rel.voltou.length}   ⚠️ Saíram da origem: ${rel.saiu.length}` +
            `\n(já existiam: ${rel.total - rel.novos.length - rel.voltou.length}${rel.outraOrigem ? `, ${rel.outraOrigem} no mesmo horário vindos de print/encaixe` : ''})`;
        if (rel.saiu.length) t += `\n\n⚠️ SAÍRAM:\n${lim(rel.saiu)}`;
        if (rel.voltou.length) t += `\n\n↩️ VOLTARAM:\n${lim(rel.voltou)}`;
        if (rel.novos.length && rel.novos.length <= 20) t += `\n\nNOVOS:\n${lim(rel.novos, 20)}`;
        return t + extra;
    }

    async function recarregarAposImportar(datas) {
        // descarta o cache local dos dias afetados que não têm envio pendente (serão relidos da nuvem)
        datas.forEach(d => { if (d !== selectedDate && !outbox.some(op => op.date === d)) delete agendaDatabase[d]; });
        persistDb();
        await loadDayFromCloud(selectedDate);
        try { await fundirAposImportar(datas); } catch (e) { console.error('[Agenda fusão]', e); }
    }

    // =====================================================================
    // 9D. PREFEITURA — planilha "CONTROLE USG E TC HAMC", aba USG HAMC
    // ---------------------------------------------------------------------
    // O ID da planilha fica na tabela agenda_config (nunca no código público).
    // Colunas: A data · B hora · C dia · D paciente · E nasc/CNS (não usado) · F ESF ·
    // G telefone (não usado) · H procedimento · I observação.
    // =====================================================================
    async function configNuvem(chave) {
        const r = await requestSupabase(`agenda_config?chave=eq.${encodeURIComponent(chave)}&select=valor`, 'GET');
        return Array.isArray(r) && r[0] ? r[0].valor : null;
    }

    function baixarTexto(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url, timeout: 60000,
                onload(res) {
                    const t = res.responseText || '';
                    if (res.status === 200 && !/^\s*<(!DOCTYPE|html)/i.test(t)) resolve(t);
                    else reject(new Error(res.status === 200 ? 'sem acesso à planilha (faça login no Google com a conta que tem acesso)' : 'HTTP ' + res.status));
                },
                onerror() { reject(new Error('sem conexão com o Google')); },
                ontimeout() { reject(new Error('o Google demorou demais')); }
            });
        });
    }

    function parseCSV(txt) {
        const rows = []; let row = [], cell = '', q = false;
        for (let i = 0; i < txt.length; i++) {
            const c = txt[i];
            if (q) {
                if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; }
                else cell += c;
            } else if (c === '"') q = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
            else cell += c;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        return rows;
    }

    function exameDaPlanilha(proc, dataIso, hora) {
        let p = normText(proc).replace(/\s*([,/+;])\s*/g, '$1');
        const dow = new Date(dataIso + 'T12:00:00').getDay();
        const tarde = timeToMinutes(hora) >= 720;
        // "DOPPLER VASCULAR" genérico: sexta manhã = membros inferiores; quinta tarde = carótidas (bloco pescoço)
        if (/^DOPPLER VASCULAR$/.test(p)) {
            if (dow === 5 && !tarde) p = 'DOPPLER VASCULAR MMII (ARTERIAL E VENOSO)';
            else if (dow === 4 && tarde) p = 'DOPPLER DE CAROTIDAS E VERTEBRAIS';
        }
        const partes = p.split(/[,/+;]/).map(s => s.trim()).filter(Boolean)
            .map(s => /^(USG|US|USTV|DOPPLER|ECO|ULTRA|ELASTO)/.test(s) ? s : 'USG ' + s);
        return partes.join(' + ');
    }

    function obsDaPlanilha(o) {
        const t = normText(o);
        if (!t || t.length < 3) return null;
        if (/VER E-?SUS|REGULA|IMPRIM|TELEFON|LIGAR|WHATS|CONFIRMAD|^OK$|^SIM$|^NAO$|^NÃO$/.test(t)) return null;
        return t;
    }

    async function importarPrefeitura() {
        if (!getSupabaseConfig()) return alert('Configure a nuvem (⚙️ API) primeiro.');
        const btn = document.getElementById('btnImportPref');
        const txtBtn = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Prefeitura…'; }
        try {
            const id = await configNuvem('prefeitura_planilha_id');
            const gid = await configNuvem('prefeitura_planilha_gid');
            if (!id || !gid) throw new Error('Planilha da Prefeitura não configurada na nuvem (agenda_config).');
            const csv = await baixarTexto(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=csv&gid=${encodeURIComponent(gid)}`);
            const hoje = getTodayIso();
            let fim = hoje;
            const linhas = [];
            parseCSV(csv).forEach(c => {
                const m = String(c[0] || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (!m) return;
                const data = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                if (data < hoje) return;
                if (data > fim) fim = data;
                const paciente = normText(c[3]), proc = normText(c[7]);
                if (!paciente || !proc || /VER E-?SUS/.test(paciente)) return; // horário vago/bloqueado
                const hora = normalizeTime(c[1]);
                linhas.push(toCloudRow({
                    hora, tipo: 'Prefeitura', convenio: 'PREFEITURA', paciente, exame: exameDaPlanilha(proc, data, hora),
                    status: 'pendente', origem: ORIGEM_PREF, obs: obsDaPlanilha(c[8])
                }, data));
            });
            if (!linhas.length) throw new Error('Nenhum agendamento a partir de hoje foi encontrado na aba USG HAMC.');
            const rel = await sincronizarOrigem(ORIGEM_PREF, hoje, fim, linhas, { cancelarAusentes: true });
            localStorage.setItem('agenda_pref_ultima_sync', new Date().toISOString());
            const datas = [...new Set(linhas.map(l => l.data_agenda))];
            await recarregarAposImportar(datas);
            alert(relatorioSync(`📥 Prefeitura sincronizada — ${fmtBR(hoje)} a ${fmtBR(fim)}`, rel,
                `\n\nCancelados aqui = pacientes que saíram da planilha (use "Chegou" se aparecerem).`));
        } catch (e) {
            alert('Não foi possível sincronizar a Prefeitura: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = txtBtn; }
        }
    }

    // =====================================================================
    // 10. TEMA E ZOOM
    // =====================================================================
    function toggleTheme() {
        isDarkMode = !isDarkMode;
        localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
        applyTheme();
        renderAgenda();
    }

    function applyTheme() {
        const drawer = document.getElementById('agenda-drawer-wrapper');
        const modal = document.getElementById('modalDashboard');
        const btn = document.getElementById('btnToggleTheme');
        [drawer, modal].forEach(el => el && el.classList.toggle('dark-mode', isDarkMode));
        if (btn) btn.innerHTML = isDarkMode ? '☀️ Claro' : '🌙 Escuro';
    }

    function changeZoom(delta) {
        const levels = [90, 100, 110, 120, 130];
        let i = levels.indexOf(zoomLevel);
        if (i === -1) i = 1;
        i = Math.min(levels.length - 1, Math.max(0, i + delta));
        zoomLevel = levels[i];
        localStorage.setItem(ZOOM_STORAGE_KEY, zoomLevel);
        applyZoom();
    }

    function applyZoom() {
        const body = document.getElementById('agenda-body-scroll');
        const label = document.getElementById('labelZoomVal');
        const drawer = document.getElementById('agenda-drawer-wrapper');
        if (body) body.style.zoom = zoomLevel / 100;
        if (label) label.innerText = `${zoomLevel}%`;
        if (drawer) drawer.style.width = ({ 90: '840px', 100: '920px', 110: '960px' }[zoomLevel]) || '1030px';
    }

    // =====================================================================
    // 11. SLA
    // =====================================================================
    function calcWaitTime(chegada, atendido) {
        if (!chegada) return null;
        const diff = (atendido ? new Date(atendido) : new Date()) - new Date(chegada);
        return diff < 0 ? 0 : Math.floor(diff / 60000);
    }

    function formatMinutes(min) {
        if (min === null || min === undefined || isNaN(min)) return '-';
        if (min < 60) return `${min}m`;
        return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}m`;
    }

    function getSLAClass(min) {
        if (min === null) return 'sla-normal';
        if (min >= 60) return 'sla-vermelho';
        if (min >= 45) return 'sla-laranja';
        if (min >= 30) return 'sla-amarelo';
        return 'sla-normal';
    }

    // =====================================================================
    // 11B. CONSULTA — escalas, POPs e manuais (arquivos do Google Drive)
    // ---------------------------------------------------------------------
    // Cadastro único na tabela Supabase `agenda_documentos` (vale para os 3 PCs).
    // A imagem é buscada no Drive com a sessão Google do navegador (GM_xmlhttpRequest
    // envia os cookies), então só abre num PC logado na conta dona dos arquivos.
    // Nenhum arquivo é copiado: o Drive continua sendo a fonte única.
    // =====================================================================
    const DOCS_CACHE_KEY = 'agenda_docs_cache_v1';
    const DOCS_CATS = [
        { k: 'escala_us', t: '🩺 Escalas Ultrassom', mensal: true },
        { k: 'escala_tc', t: '🧠 Escala TC Urgência', mensal: true },
        { k: 'pop', t: '📋 POPs', mensal: false },
        { k: 'manual', t: '📘 Manuais e guias', mensal: false }
    ];
    let docsLista = [];
    let docsMes = null;          // 'AAAA-MM' exibido nas escalas
    let docsSel = null;          // id do documento aberto
    let docsGerenciar = false;   // modo de edição do cadastro
    const docsBlobCache = {};    // drive_id -> objectURL

    function driveIdDe(txt) {
        const s = String(txt || '').trim();
        if (!s) return '';
        let m = s.match(/\/d\/([A-Za-z0-9_-]{20,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
        if (m) return m[1];
        return /^[A-Za-z0-9_-]{20,}$/.test(s) ? s : '';
    }
    const driveVer = id => `https://drive.google.com/file/d/${id}/view`;
    const driveBaixar = id => `https://drive.google.com/uc?export=download&id=${id}`;
    const mesHoje = () => getTodayIso().slice(0, 7);
    function mesNome(m) {
        if (!m) return '';
        const [y, mm] = m.split('-').map(Number);
        const n = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mm - 1];
        return `${n} ${y}`;
    }

    async function docsCarregar() {
        try { docsLista = JSON.parse(localStorage.getItem(DOCS_CACHE_KEY) || '[]'); } catch (e) { docsLista = []; }
        docsRender();
        if (!getSupabaseConfig()) { docsAviso('Configure a nuvem em ⚙️ API para carregar os documentos.'); return; }
        try {
            const rows = await requestSupabase('agenda_documentos?select=*&ativo=eq.true&order=categoria.asc,mes.asc.nullslast,ordem.asc,id.asc', 'GET');
            docsLista = Array.isArray(rows) ? rows : [];
            try { localStorage.setItem(DOCS_CACHE_KEY, JSON.stringify(docsLista)); } catch (e) { /* cheio */ }
            docsAviso('');
        } catch (e) {
            docsAviso('⚠️ Não consegui atualizar da nuvem (mostrando a última cópia deste PC). ' + e.message);
        }
        docsRender();
    }

    function docsMesesDisponiveis() {
        const s = new Set(docsLista.filter(d => d.mes && (d.categoria === 'escala_us' || d.categoria === 'escala_tc')).map(d => d.mes));
        return [...s].sort().reverse();
    }

    function docsAviso(txt) {
        const el = document.getElementById('docsAviso');
        if (el) { el.textContent = txt; el.style.display = txt ? 'block' : 'none'; }
    }

    function docsRender() {
        const lista = document.getElementById('docsLista');
        if (!lista) return;
        const meses = docsMesesDisponiveis();
        if (!docsMes) docsMes = meses.includes(mesHoje()) ? mesHoje() : (meses[0] || mesHoje());
        const selMes = document.getElementById('docsMes');
        if (selMes) {
            const opts = new Set([...meses, docsMes]);
            selMes.innerHTML = [...opts].sort().reverse().map(m => `<option value="${m}" ${m === docsMes ? 'selected' : ''}>${mesNome(m)}${m === mesHoje() ? ' (atual)' : ''}</option>`).join('');
        }
        let html = '';
        DOCS_CATS.forEach(c => {
            const itens = docsLista.filter(d => d.categoria === c.k && (!c.mensal || d.mes === docsMes));
            html += `<div class="docs-cat">${c.t}${c.mensal ? ` <span>· ${mesNome(docsMes)}</span>` : ''}</div>`;
            if (!itens.length) html += `<div class="docs-vazio">${c.mensal ? 'Nada cadastrado para este mês.' : 'Nada cadastrado.'}</div>`;
            itens.forEach(d => {
                html += `<div class="docs-item ${String(d.id) === String(docsSel) ? 'sel' : ''}" data-doc="${d.id}">
                    <span class="docs-tit">${escapeHtml(d.titulo)}</span>
                    ${docsGerenciar ? `<span class="docs-acoes"><button data-docedit="${d.id}" title="Editar">✏️</button><button data-docdel="${d.id}" title="Remover da lista">🗑️</button></span>` : ''}
                </div>`;
            });
        });
        lista.innerHTML = html;
        const form = document.getElementById('docsForm');
        if (form) form.style.display = docsGerenciar ? 'block' : 'none';
        const bg = document.getElementById('btnDocsGerenciar');
        if (bg) bg.textContent = docsGerenciar ? '✔ Concluir' : '✏️ Gerenciar';
        if (!docsSel) {
            const prim = docsLista.find(d => d.categoria === 'escala_us' && d.mes === docsMes) || docsLista.find(d => d.mes === docsMes);
            if (prim) docsAbrir(prim.id);
        }
    }

    function docsAbrir(id) {
        const d = docsLista.find(x => String(x.id) === String(id));
        if (!d) return;
        docsSel = d.id;
        document.querySelectorAll('#docsLista .docs-item').forEach(el => el.classList.toggle('sel', el.dataset.doc === String(d.id)));
        const tit = document.getElementById('docsTitulo');
        const acoes = document.getElementById('docsAcoes');
        const area = document.getElementById('docsVisor');
        tit.textContent = d.titulo + (d.mes ? ` — ${mesNome(d.mes)}` : '');
        const pdf = d.pdf_drive_id || '';
        acoes.innerHTML = `<a href="${driveVer(d.drive_id)}" target="_blank" rel="noopener">↗ Abrir no Drive</a>
            <a href="${driveBaixar(d.drive_id)}" target="_blank" rel="noopener">⬇ Baixar</a>
            ${pdf ? `<a href="${driveVer(pdf)}" target="_blank" rel="noopener">📄 PDF</a>` : ''}
            <button id="btnDocsZoom" title="Alternar: ajustar à largura / tamanho real">🔍 Zoom</button>`;
        document.getElementById('btnDocsZoom').onclick = () => area.classList.toggle('real');
        area.classList.remove('real');
        area.innerHTML = '<div class="docs-msg">Carregando do Drive…</div>';
        docsImagem(d.drive_id).then(url => {
            if (docsSel !== d.id) return;
            area.innerHTML = `<img src="${url}" alt="">`;
            area.querySelector('img').onclick = () => area.classList.toggle('real');
        }).catch(err => {
            if (docsSel !== d.id) return;
            area.innerHTML = `<div class="docs-msg">Não foi possível mostrar a prévia aqui (${escapeHtml(err.message)}).<br>
                Confira se este navegador está logado no Google da conta dona dos arquivos, ou use <b>↗ Abrir no Drive</b>.</div>`;
        });
    }

    function docsImagem(driveId) {
        if (docsBlobCache[driveId]) return Promise.resolve(docsBlobCache[driveId]);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w2400`,
                responseType: 'blob',
                timeout: 30000,
                onload(res) {
                    const tipo = (res.response && res.response.type) || '';
                    if (res.status >= 200 && res.status < 300 && /^image\//.test(tipo)) {
                        const u = URL.createObjectURL(res.response);
                        docsBlobCache[driveId] = u;
                        resolve(u);
                    } else reject(new Error(res.status === 200 ? 'sem acesso ao arquivo' : 'HTTP ' + res.status));
                },
                onerror() { reject(new Error('sem conexão com o Drive')); },
                ontimeout() { reject(new Error('o Drive demorou demais')); }
            });
        });
    }

    function docsPreencherForm(d) {
        const $ = id => document.getElementById(id);
        $('docsFId').value = d ? d.id : '';
        $('docsFCat').value = d ? d.categoria : 'escala_us';
        $('docsFTitulo').value = d ? d.titulo : '';
        $('docsFMes').value = d ? (d.mes || '') : docsMes;
        $('docsFLink').value = d ? driveVer(d.drive_id) : '';
        $('docsFPdf').value = d && d.pdf_drive_id ? driveVer(d.pdf_drive_id) : '';
        $('docsFOrdem').value = d ? d.ordem : 0;
        $('btnDocsSalvar').textContent = d ? '💾 Salvar alteração' : '➕ Adicionar';
    }

    async function docsSalvar() {
        const $ = id => document.getElementById(id);
        const cat = $('docsFCat').value;
        const mensal = DOCS_CATS.find(c => c.k === cat).mensal;
        const reg = {
            categoria: cat,
            titulo: $('docsFTitulo').value.trim(),
            mes: mensal ? ($('docsFMes').value || null) : null,
            drive_id: driveIdDe($('docsFLink').value),
            pdf_drive_id: driveIdDe($('docsFPdf').value) || null,
            ordem: parseInt($('docsFOrdem').value, 10) || 0
        };
        if (!reg.titulo) return alert('Informe o título.');
        if (!reg.drive_id) return alert('Cole o link do arquivo no Drive (Compartilhar → Copiar link, ou o endereço da página do arquivo).');
        if (mensal && !reg.mes) return alert('Escolha o mês da escala.');
        const id = $('docsFId').value;
        try {
            if (id) await requestSupabase(`agenda_documentos?id=eq.${encodeURIComponent(id)}`, 'PATCH', reg, { Prefer: 'return=minimal' });
            else await requestSupabase('agenda_documentos', 'POST', reg, { Prefer: 'return=minimal' });
            if (reg.mes) docsMes = reg.mes;
            docsPreencherForm(null);
            await docsCarregar();
        } catch (e) { alert('Não foi possível salvar na nuvem: ' + e.message); }
    }

    async function docsRemover(id) {
        const d = docsLista.find(x => String(x.id) === String(id));
        if (!d || !confirm(`Remover "${d.titulo}" da lista?\n(O arquivo no Drive não é apagado.)`)) return;
        try {
            await requestSupabase(`agenda_documentos?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ativo: false }, { Prefer: 'return=minimal' });
            if (String(docsSel) === String(id)) docsSel = null;
            await docsCarregar();
        } catch (e) { alert('Não foi possível remover: ' + e.message); }
    }

    function docsMontar() {
        if (document.getElementById('modalDocs')) return;
        const m = document.createElement('div');
        m.id = 'modalDocs';
        m.innerHTML = `
            <div class="docs-topo">
                <span style="font-weight:bold; font-size:12.5px;">📚 Consulta — escalas, POPs e manuais</span>
                <span style="display:flex; gap:6px; align-items:center;">
                    <label style="font-size:10.5px;">Mês das escalas <select id="docsMes"></select></label>
                    <button id="btnDocsAtualizar" title="Recarregar da nuvem">🔄</button>
                    <button id="btnDocsGerenciar">✏️ Gerenciar</button>
                    <button id="btnDocsFechar" style="background:#e11d48;">✕</button>
                </span>
            </div>
            <div id="docsAviso"></div>
            <div class="docs-corpo">
                <div class="docs-lado">
                    <div id="docsForm">
                        <input type="hidden" id="docsFId">
                        <div class="docs-f-tit">Cadastrar / editar (vale para os 3 PCs)</div>
                        <select id="docsFCat">${DOCS_CATS.map(c => `<option value="${c.k}">${c.t}</option>`).join('')}</select>
                        <input id="docsFTitulo" placeholder="Título (ex.: Escala Prefeitura)">
                        <input id="docsFMes" type="month" title="Mês (só para escalas)">
                        <input id="docsFLink" placeholder="Link do arquivo no Drive (PNG ou PDF)">
                        <input id="docsFPdf" placeholder="Link do PDF (opcional)">
                        <input id="docsFOrdem" type="number" placeholder="Ordem" title="Ordem na lista">
                        <div style="display:flex; gap:4px;"><button id="btnDocsSalvar">➕ Adicionar</button><button id="btnDocsLimpar">Limpar</button></div>
                    </div>
                    <div id="docsLista"></div>
                </div>
                <div class="docs-principal">
                    <div class="docs-cab"><span id="docsTitulo">Selecione um item</span><span id="docsAcoes"></span></div>
                    <div id="docsVisor"><div class="docs-msg">Selecione um item à esquerda.</div></div>
                </div>
            </div>`;
        document.body.appendChild(m);
        const $ = id => document.getElementById(id);
        $('btnDocsFechar').onclick = () => m.classList.remove('open');
        $('btnDocsAtualizar').onclick = docsCarregar;
        $('btnDocsGerenciar').onclick = () => { docsGerenciar = !docsGerenciar; docsPreencherForm(null); docsRender(); };
        $('btnDocsSalvar').onclick = docsSalvar;
        $('btnDocsLimpar').onclick = () => docsPreencherForm(null);
        $('docsMes').onchange = e => { docsMes = e.target.value; docsSel = null; docsRender(); };
        $('docsLista').addEventListener('click', e => {
            const ed = e.target.closest('[data-docedit]');
            if (ed) { e.stopPropagation(); docsPreencherForm(docsLista.find(x => String(x.id) === ed.dataset.docedit)); return; }
            const del = e.target.closest('[data-docdel]');
            if (del) { e.stopPropagation(); docsRemover(del.dataset.docdel); return; }
            const it = e.target.closest('[data-doc]');
            if (it) docsAbrir(it.dataset.doc);
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && m.classList.contains('open')) m.classList.remove('open'); });
    }

    function openDocs() {
        docsMontar();
        document.getElementById('modalDocs').classList.add('open');
        docsCarregar();
    }

    // =====================================================================
    // 12. INTERFACE
    // =====================================================================
    // Visualizador de imagens (/viewer): a Agenda fica oculta (só aparece na lista de exames).
    const agEhViewer = () => String((location && location.pathname) || '').startsWith('/viewer');
    function agMarcarViewer() { try { const h = document.documentElement, v = agEhViewer(); if (v !== h.hasAttribute('data-ag-viewer')) h.toggleAttribute('data-ag-viewer', v); } catch (e) { /* página ainda sem <html> */ } }
    agMarcarViewer(); setInterval(agMarcarViewer, 500);

    function initUI() {
        if (!document.body) return;
        if (!document.getElementById('btn-agenda-flutuante')) {
            const btn = document.createElement('button');
            btn.id = 'btn-agenda-flutuante';
            btn.innerHTML = '📅 Agenda';
            btn.onclick = toggleDrawer;
            document.body.appendChild(btn);
        }
        if (document.getElementById('agenda-drawer-wrapper')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'agenda-bg-backdrop';
        backdrop.onclick = closeDrawer;
        document.body.appendChild(backdrop);

        const thead = `
            <thead><tr>
                <th style="width:50px; text-align:center;">Hora</th>
                <th style="width:125px;">Origem / Setor</th>
                <th>Paciente</th>
                <th>Procedimento</th>
                <th style="width:80px; text-align:center;">Espera / Total</th>
                <th style="width:130px; text-align:center;">Ações Operacionais</th>
            </tr></thead>`;

        const drawer = document.createElement('div');
        drawer.id = 'agenda-drawer-wrapper';
        drawer.innerHTML = `
            <div id="agenda-top-bar">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:bold; font-size:12.5px;">📅 Agenda • Dr. Gabriel Gaspar</span>
                    <div style="font-size:10px; color:#cbd5e1; display:flex; align-items:center; gap:4px;">
                        <span id="labelDiaSemana" style="color:#60a5fa; font-weight:700;">-</span> •
                        <span id="labelDataExtenso">-</span>
                    </div>
                    <span id="indicatorNuvem" style="font-size:9.5px; font-weight:bold; margin-left:6px; cursor:pointer;" title="Clique para sincronizar agora">💾 Local</span>
                    <span id="indicatorPacs" style="font-size:9.5px; font-weight:bold; margin-left:6px; cursor:pointer; color:#94a3b8;" title="Clique para ler o PACS agora">🩻 PACS</span>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <div class="zoom-control-group" title="Zoom da agenda">
                        <button id="btnZoomOut" class="btn-zoom">A-</button>
                        <span id="labelZoomVal">100%</span>
                        <button id="btnZoomIn" class="btn-zoom">A+</button>
                    </div>
                    <button id="btnToggleTheme" class="btn-top-action" style="background:#334155; color:#f8fafc; border:1px solid #475569;">🌙 Escuro</button>
                    <button id="btnOpenDashboard" class="btn-top-action" style="background:#6366f1; color:#fff;">📊 Dashboard & Faltas</button>
                    <button id="btnOpenDocs" class="btn-top-action" style="background:#0d9488; color:#fff;" title="Escalas do mês, POPs e manuais">📚 Consulta</button>
                    <button id="btnPrintPDF" class="btn-top-action" style="background:#0284c7; color:#fff;">🖨️ Imprimir</button>
                    <button id="btnImportPref" class="btn-top-action" style="background:#16a34a; color:#fff;" title="Sincroniza a agenda da Prefeitura a partir da planilha (de hoje em diante)">📥 Prefeitura</button>
                    <button id="btnUploadPrints" class="btn-top-action" style="background:#3b82f6; color:#fff;" title="Prints ou PDF da agenda (ex.: PDF da semana do SPDATA). Também pode arrastar o arquivo para a Agenda.">📷 Prints / PDF</button>
                    <input type="file" id="nativeFileInput" multiple accept="image/*,application/pdf,.pdf" style="display:none;">
                    <button id="btnConfigKey" class="btn-top-action" style="background:#f59e0b; color:#000;">⚙️ API</button>
                    <button id="btnClearDay" class="btn-top-action" style="background:#fee2e2; color:#991b1b;" title="Limpar o dia">🗑️</button>
                    <button id="agenda-close-btn" class="btn-top-action" style="background:#e11d48; color:#fff; margin-left:3px;">✕ Voltar</button>
                </div>
            </div>

            <div id="agenda-body-scroll">
                <div id="cloudErrorBanner"><span id="cloudErrorText"></span><button id="btnRetryCloud">🔄 Tentar de novo</button></div>
                <div id="pacsPendBox"></div>

                <div id="boxApiKey" style="display:none; background:#fef3c7; border:1.5px solid #f59e0b; border-radius:7px; padding:8px 12px; margin-bottom:8px; color:#78350f;">
                    <div style="font-weight:bold; font-size:11px; margin-bottom:6px;">⚙️ Configurações de Conexão e Nuvem</div>
                    <div style="display:grid; grid-template-columns:1fr; gap:6px;">
                        <div style="display:grid; grid-template-columns:2fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:10px; font-weight:700;">🤖 Chave Anthropic (Claude Sonnet 5.5) — IA principal:</label>
                                <input type="password" id="inputAnthropicKey" placeholder="sk-ant-..." style="width:100%; padding:3px 7px; border-radius:4px; border:1px solid #d97706; font-size:10.5px; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:10px; font-weight:700;">IA preferida:</label>
                                <select id="selIaPref" style="width:100%; padding:3px 5px; border-radius:4px; border:1px solid #d97706; font-size:10.5px;"><option value="claude">Claude (Gemini reserva)</option><option value="gemini">Gemini (Claude reserva)</option></select>
                            </div>
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:700;">🔑 Chave Google Gemini API (reserva):</label>
                            <input type="password" id="inputApiKey" placeholder="AQ.... ou AIzaSy..." style="width:100%; padding:3px 7px; border-radius:4px; border:1px solid #d97706; font-size:10.5px; box-sizing:border-box;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:10px; font-weight:700;">☁️ Supabase Project URL (só o domínio):</label>
                                <input type="text" id="inputSupabaseUrl" placeholder="https://SEU-PROJETO.supabase.co" style="width:100%; padding:3px 7px; border-radius:4px; border:1px solid #d97706; font-size:10.5px; box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size:10px; font-weight:700;">🔒 Chave anon / publishable:</label>
                                <input type="password" id="inputSupabaseKey" placeholder="eyJhbGciOi... ou sb_publishable_..." style="width:100%; padding:3px 7px; border-radius:4px; border:1px solid #d97706; font-size:10.5px; box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="font-size:9.5px;">A URL é corrigida automaticamente (remove "/rest/v1" e barras). Nunca use a chave <b>service_role / secret</b> aqui.</div>
                        <div id="painelLogin" style="border:1px solid #d97706; border-radius:5px; padding:5px 7px; background:rgba(217,119,6,.06);">
                            <div style="font-size:10px; font-weight:800; margin-bottom:3px;">🔐 Login na nuvem (uma vez por computador)</div>
                            <div id="loginForm" style="display:grid; grid-template-columns:1fr 1fr auto; gap:6px; align-items:end;">
                                <input type="email" id="inputLoginEmail" placeholder="seu e-mail" autocomplete="username" style="width:100%; padding:3px 7px; border-radius:4px; border:1px solid #d97706; font-size:10.5px; box-sizing:border-box;">
                                <input type="password" id="inputLoginSenha" placeholder="senha (fica no 1Password)" autocomplete="current-password" style="width:100%; padding:3px 7px; border-radius:4px; border:1px solid #d97706; font-size:10.5px; box-sizing:border-box;">
                                <button id="btnLogin" style="background:#16a34a; color:#fff; font-weight:700; border:none; padding:4px 12px; border-radius:4px; font-size:10.5px; cursor:pointer;">Entrar</button>
                            </div>
                            <div id="loginStatus" style="display:none; justify-content:space-between; align-items:center; gap:6px; font-size:10.5px;">
                                <span id="loginStatusTxt"></span>
                                <button id="btnLogout" style="background:#64748b; color:#fff; font-weight:700; border:none; padding:3px 10px; border-radius:4px; font-size:10px; cursor:pointer;">Sair</button>
                            </div>
                            <div style="font-size:9px; opacity:.8; margin-top:3px;">A senha não fica salva: só a sessão, renovada sozinha. Use "Sair" se deixar de usar este computador.</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; gap:6px; flex-wrap:wrap;">
                            <div style="display:flex; gap:6px;">
                                <button id="btnTestSupabase" style="background:#0284c7; color:#fff; font-weight:700; border:none; padding:4px 10px; border-radius:4px; font-size:10px; cursor:pointer;">🧪 Testar Conexão</button>
                                <button id="btnPushAllToCloud" style="background:#059669; color:#fff; font-weight:700; border:none; padding:4px 10px; border-radius:4px; font-size:10px; cursor:pointer;">⬆️ Enviar TODA a agenda deste PC para a nuvem</button>
                            </div>
                            <button id="btnSaveConfig" style="background:#d97706; color:#fff; font-weight:700; border:none; padding:4px 14px; border-radius:4px; font-size:10.5px; cursor:pointer;">Salvar Conexões</button>
                        </div>
                    </div>
                </div>

                <div class="slim-panel-bar" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:5px 8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:3px;">
                        <button id="btnPrevDay" style="padding:1.5px 6px; border-radius:3px; border:1px solid #cbd5e1; background:#f8fafc; font-size:9.5px; cursor:pointer;">◀</button>
                        <input type="date" id="nativeDatePicker" style="padding:1.5px 4px; border-radius:3px; border:1px solid #cbd5e1; font-weight:700; font-size:10.5px; cursor:pointer;">
                        <button id="btnNextDay" style="padding:1.5px 6px; border-radius:3px; border:1px solid #cbd5e1; background:#f8fafc; font-size:9.5px; cursor:pointer;">▶</button>
                        <button id="btnToday" style="padding:1.5px 8px; border-radius:3px; border:1px solid #93c5fd; background:#eff6ff; font-weight:700; font-size:10px; color:#1d4ed8; cursor:pointer;">Hoje</button>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px; font-size:10.5px; font-weight:600;">
                        <span title="Pacientes únicos no dia">👤 Pacientes: <strong id="cntPacientes">0</strong></span>
                        <span title="Procedimentos no dia (um paciente pode ter mais de um)">🧾 Proc: <strong id="cntProc">0</strong></span>
                        <span>⏳ Pend: <strong id="cntPendente" style="color:#eab308;">0</strong></span>
                        <span>⏱️ Espera: <strong id="cntEsperando" style="color:#60a5fa;">0</strong></span>
                        <span>🟢 Atend: <strong id="cntAtendido" style="color:#34d399;">0</strong></span>
                        <span>🔴 Falta: <strong id="cntFaltou" style="color:#f87171;">0</strong></span>
                        <span title="Exame cancelado/removido no PACS (ex.: convênio não autorizou)">⊘ Canc: <strong id="cntCancelado" style="color:#94a3b8;">0</strong></span>
                    </div>
                </div>

                <div id="statusLoadingIA" style="display:none; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:5px; text-align:center; color:#1d4ed8; font-weight:bold; font-size:10.5px; margin-bottom:6px;">
                    ⏳ A IA está processando os prints e estruturando os horários...
                </div>

                <div class="agenda-card" id="cardManha">
                    <div id="headerManha" style="background:#d97706; color:#fff; padding:5px 8px; font-weight:bold; font-size:10.5px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
                        <span>☀️ PERÍODO DA MANHÃ (07:00 – 12:00)</span>
                        <span id="badgeCountManha" style="font-size:9px; background:rgba(0,0,0,0.25); padding:1px 5px; border-radius:6px;">0 pacientes</span>
                    </div>
                    <div id="bodyManha"><table class="agenda-table">${thead}<tbody id="tbodyNativeManha"></tbody></table></div>
                </div>

                <div class="agenda-card" id="cardTarde">
                    <div id="headerTarde" style="background:#1d4ed8; color:#fff; padding:5px 8px; font-weight:bold; font-size:10.5px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
                        <span>🌤️ PERÍODO DA TARDE (12:00 – 19:00)</span>
                        <span id="badgeCountTarde" style="font-size:9px; background:rgba(0,0,0,0.25); padding:1px 5px; border-radius:6px;">0 pacientes</span>
                    </div>
                    <div id="bodyTarde"><table class="agenda-table">${thead}<tbody id="tbodyNativeTarde"></tbody></table></div>
                </div>

                <div class="slim-panel-bar" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:6px 8px; margin-top:6px;">
                    <div style="font-weight:700; font-size:10.5px; margin-bottom:4px; display:flex; justify-content:space-between;">
                        <span>➕ Encaixe Rápido (SUS / Hospitalar / Convênios)</span>
                        <span style="font-size:9.5px; color:#64748b;">Enter para salvar</span>
                    </div>
                    <div style="display:grid; grid-template-columns:60px 145px 1.2fr 1.2fr 46px 30px; gap:4px;">
                        <input type="text" id="encHora" placeholder="11:15" style="padding:3px 5px; border-radius:3px; border:1px solid #cbd5e1; font-size:10.5px; font-weight:700;">
                        <select id="encOrigem" style="padding:3px; border-radius:3px; border:1px solid #cbd5e1; font-size:10px; font-weight:600;">
                            <option value="Prefeitura">Prefeitura</option>
                            <option value="SUS - Pronto Socorro">SUS - Pronto Socorro</option>
                            <option value="SUS - UTI">SUS - UTI</option>
                            <option value="SUS - Internado">SUS - Internado</option>
                            <option value="SUS - Maternidade">SUS - Maternidade</option>
                            <option value="Convênio">Convênio</option>
                            <option value="Particular">Particular</option>
                            <option value="Social">Social</option>
                        </select>
                        <input type="text" id="encPaciente" placeholder="Nome do paciente" style="padding:3px 5px; border-radius:3px; border:1px solid #cbd5e1; font-size:10.5px; text-transform:uppercase;">
                        <input type="text" id="encExame" placeholder="Exame / Procedimento" style="padding:3px 5px; border-radius:3px; border:1px solid #cbd5e1; font-size:10.5px; text-transform:uppercase;">
                        <label title="Encaixe de urgência (SUS já conta sozinho)" style="display:flex; align-items:center; gap:2px; font-size:10px; font-weight:700; color:#dc2626; cursor:pointer;"><input type="checkbox" id="encUrg" style="margin:0;">🚨</label>
                        <button id="btnSalvarEncaixe" style="background:#10b981; color:#fff; font-weight:bold; border:none; border-radius:3px; cursor:pointer; font-size:11px;">➕</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(drawer);

        const modalDash = document.createElement('div');
        modalDash.id = 'modalDashboard';
        modalDash.innerHTML = `
            <div style="background:#0f172a; color:#fff; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-weight:bold; font-size:12.5px;">📊 Painel Analítico & Gestão de Faltas (No-Show)</span>
                    <div style="display:flex; gap:4px;">
                        <button id="tabDashHoje" style="background:#2563eb; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📅 Dia Selecionado</button>
                        <button id="tabDashNuvem" style="background:#334155; color:#cbd5e1; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📊 Analytics (nuvem)</button>
                    </div>
                </div>
                <button id="btnCloseModalDash" style="background:none; border:none; color:#fff; font-size:15px; cursor:pointer;">✕</button>
            </div>
            <div id="contentDashboard" style="padding:14px; overflow-y:auto; font-size:11.5px; flex:1;"></div>`;
        document.body.appendChild(modalDash);

        // ---- Listeners
        const $ = id => document.getElementById(id);
        $('agenda-close-btn').onclick = closeDrawer;
        $('btnCloseModalDash').onclick = () => modalDash.classList.remove('open');
        $('btnToggleTheme').onclick = toggleTheme;
        $('tabDashHoje').onclick = () => renderDashboardAba(1);
        $('tabDashNuvem').onclick = () => renderDashboardAba(2);
        $('btnZoomIn').onclick = () => changeZoom(1);
        $('btnZoomOut').onclick = () => changeZoom(-1);
        $('indicatorNuvem').onclick = () => { errorAlertShown = false; loadDayFromCloud(selectedDate); };
        $('indicatorPacs').onclick = () => syncPacsToday(true);
        $('btnRetryCloud').onclick = async () => { const ok = await flushOutbox(true); if (ok) loadDayFromCloud(selectedDate); };

        $('btnConfigKey').onclick = () => {
            const b = $('boxApiKey');
            b.style.display = b.style.display === 'none' ? 'block' : 'none';
            $('inputApiKey').value = localStorage.getItem(API_KEY_STORAGE) || '';
            $('inputSupabaseUrl').value = localStorage.getItem(SUPABASE_URL_STORAGE) || '';
            $('inputAnthropicKey').value = localStorage.getItem(ANTHROPIC_KEY_STORAGE) || '';
            $('selIaPref').value = localStorage.getItem(IA_PREF_STORAGE) || 'claude';
            $('inputSupabaseKey').value = localStorage.getItem(SUPABASE_KEY_STORAGE) || '';
        };

        $('btnSaveConfig').onclick = () => {
            const gemKey = $('inputApiKey').value.trim();
            const subUrl = sanitizeSupabaseUrl($('inputSupabaseUrl').value);
            const subKey = sanitizeKey($('inputSupabaseKey').value);
            if (gemKey) localStorage.setItem(API_KEY_STORAGE, gemKey);
            const antKey = $('inputAnthropicKey').value.replace(/\s+/g, '');
            if (antKey) localStorage.setItem(ANTHROPIC_KEY_STORAGE, antKey);
            localStorage.setItem(IA_PREF_STORAGE, $('selIaPref').value);
            if (subUrl) { localStorage.setItem(SUPABASE_URL_STORAGE, subUrl); $('inputSupabaseUrl').value = subUrl; }
            if (subKey) localStorage.setItem(SUPABASE_KEY_STORAGE, subKey);
            pushLegacyLocalOnce();
            errorAlertShown = false;
            alert(`Configurações salvas.\nURL gravada: ${subUrl || '(vazia)'}\n\nAgora clique em 🧪 Testar Conexão.`);
            updateSyncIndicator();
            loadDayFromCloud(selectedDate);
            rtReconectar();
        };

        $('btnTestSupabase').onclick = testSupabaseConnection;
        $('btnLogin').onclick = async () => {
            const btn = $('btnLogin');
            if (!getSupabaseConfig()) { alert('Preencha e salve a Project URL e a chave do Supabase primeiro.'); return; }
            btn.disabled = true; btn.innerText = '...';
            try {
                const s = await entrar($('inputLoginEmail').value, $('inputLoginSenha').value);
                statusIaNuvem().then(atualizarPainelLogin);
                $('inputLoginSenha').value = '';
                clearCloudError();
                alert(`✅ Logado como ${s.email}.\nEste computador fica conectado (a sessão se renova sozinha).`);
                loadDayFromCloud(selectedDate);
            } catch (err) {
                alert('⚠️ ' + err.message);
            } finally {
                btn.disabled = false; btn.innerText = 'Entrar';
                updateSyncIndicator();
            }
        };
        $('inputLoginSenha').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnLogin').click(); });
        $('btnLogout').onclick = () => {
            if (!confirm('Sair da nuvem neste computador?\n\nDepois que a nuvem for fechada para quem não está logado, a agenda deste PC deixa de sincronizar até entrar de novo.')) return;
            sair();
        };
        atualizarPainelLogin();
        if (lerSessao()) statusIaNuvem().then(atualizarPainelLogin);
        $('btnPushAllToCloud').onclick = pushAllLocalToCloud;
        $('btnPrevDay').onclick = () => changeDay(-1);
        $('btnNextDay').onclick = () => changeDay(1);
        $('btnToday').onclick = () => setDate(getTodayIso());
        $('nativeDatePicker').onchange = e => { if (e.target.value) setDate(e.target.value); };
        $('btnClearDay').onclick = clearCurrentDay;
        $('headerManha').onclick = () => toggleSection('manha');
        $('headerTarde').onclick = () => toggleSection('tarde');
        $('btnUploadPrints').onclick = () => $('nativeFileInput').click();
        $('btnImportPref').onclick = importarPrefeitura;
        // arrastar prints/PDF para a Agenda
        const drw = $('agenda-drawer-wrapper');
        drw.addEventListener('dragover', ev => { if (ev.dataTransfer && [...ev.dataTransfer.types].includes('Files')) { ev.preventDefault(); drw.classList.add('drop-on'); } });
        drw.addEventListener('dragleave', ev => { if (ev.target === drw) drw.classList.remove('drop-on'); });
        drw.addEventListener('drop', ev => { if (!ev.dataTransfer || !ev.dataTransfer.files.length) return; ev.preventDefault(); drw.classList.remove('drop-on'); handleMultipleUpload({ files: ev.dataTransfer.files }); });
        $('nativeFileInput').onchange = handleMultipleUpload;
        $('btnSalvarEncaixe').onclick = handleAddEncaixe;
        ['encHora', 'encPaciente', 'encExame'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleAddEncaixe(); }));
        $('btnOpenDashboard').onclick = openDashboard;
        $('btnOpenDocs').onclick = openDocs;
        $('btnPrintPDF').onclick = printPDF;

        const bodyScroll = $('agenda-body-scroll');
        bodyScroll.addEventListener('click', e => {
            const pacsBadge = e.target.closest('[data-action="unlink"]');
            if (pacsBadge) { unlinkPacs(pacsBadge.dataset.id); return; }
            const urgBadge = e.target.closest('[data-action="urg"]');
            if (urgBadge) { markUrgente(urgBadge.dataset.id); return; }
            const fusBadge = e.target.closest('[data-action="fundir"]');
            if (fusBadge) { abrirFusao(fusBadge.dataset.id); return; }
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.pacs) { resolvePendente(btn.dataset.pacid, btn.dataset.pacs); return; }
            const act = btn.dataset.action, id = btn.dataset.id;
            if (!act || !id) return;
            if (act === 'chegou') markChegou(id);
            else if (act === 'atendido') markAtendido(id);
            else if (act === 'falta') markFalta(id);
            else if (act === 'urgente') markUrgente(id);
            else if (act === 'delete') deletePatient(id);
        });
        bodyScroll.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('editable-cell')) { e.preventDefault(); e.target.blur(); }
        });
        bodyScroll.addEventListener('focusout', e => {
            const cell = e.target.closest('.editable-cell');
            if (!cell || !cell.dataset.field || !cell.dataset.id) return;
            updatePatientField(cell.dataset.id, cell.dataset.field, cell.innerText.trim());
        });

        applyTheme();
        applyZoom();
        updateSyncIndicator();
        updatePacsIndicator();
        setDate(selectedDate);
    }

    // =====================================================================
    // 13. AÇÕES OPERACIONAIS (UI otimista + fila de nuvem)
    // =====================================================================
    function updateItem(id, fn) {
        const list = agendaDatabase[selectedDate] || [];
        agendaDatabase[selectedDate] = list.map(i => {
            if (String(i.id) !== String(id)) return i;
            const updated = fn(i);
            enqueueUpsert(updated, selectedDate);
            return updated;
        });
        saveLocal();
    }

    function markChegou(id) {
        updateItem(id, i => {
            const toWaiting = i.status !== 'esperando';
            return { ...i, status: toWaiting ? 'esperando' : 'pendente', chegouEm: toWaiting ? new Date().toISOString() : null, chegadaFonte: toWaiting ? 'manual' : null, atendidoEm: null, atendidoFonte: null, tempoEsperaMin: null };
        });
    }

    function markAtendido(id) {
        updateItem(id, i => {
            if (i.status === 'atendido') return { ...i, status: i.chegouEm ? 'esperando' : 'pendente', atendidoEm: null, atendidoFonte: null, tempoEsperaMin: null };
            const now = new Date().toISOString();
            return { ...i, status: 'atendido', atendidoEm: now, atendidoFonte: 'manual', tempoEsperaMin: i.chegouEm ? calcWaitTime(i.chegouEm, now) : null };
        });
    }

    function markFalta(id) {
        updateItem(id, i => (i.status === 'faltou')
            ? { ...i, status: 'pendente' }
            : { ...i, status: 'faltou', chegouEm: null, chegadaFonte: null, atendidoEm: null, atendidoFonte: null, tempoEsperaMin: null });
    }

    // v9.3 — urgência à mão (vale para estatística; não mexe no PACS)
    // mesma regra do banco: sem classificação, SUS hospitalar conta como urgência
    const ESPERA_MAX_VALIDA = 720; // > 12 h = erro de registro (fora das médias, igual ao banco)
    const ehSusHosp = i => i.tipo === 'SUS Hospitalar' || /^SUS\b/i.test(String(i.convenio || ''));
    const urgEfetivo = i => i.urgente != null ? !!i.urgente : ehSusHosp(i);
    const setorEfetivo = i => i.setor || ((String(i.convenio || '').match(/^SUS\s*-\s*(.+)$/i) || [])[1] || '').trim() || null;
    function markUrgente(id) {
        updateItem(id, i => ({ ...i, urgente: !urgEfetivo(i), urgenteFonte: 'manual' }));
    }

    function deletePatient(id) {
        if (!confirm('Remover este paciente da agenda?')) return;
        const list = agendaDatabase[selectedDate] || [];
        const item = list.find(i => String(i.id) === String(id));
        if (item) enqueueDelete(item, selectedDate);
        agendaDatabase[selectedDate] = list.filter(i => String(i.id) !== String(id));
        saveLocal();
    }

    function updatePatientField(id, field, val) {
        const list = agendaDatabase[selectedDate] || [];
        const old = list.find(i => String(i.id) === String(id));
        if (!old) return;
        let v = val;
        if (field === 'hora') v = normalizeTime(val);
        if (field === 'paciente' || field === 'exame') v = normText(val);
        if (String(old[field]) === String(v)) return; // nada mudou
        const updated = { ...old, [field]: v };
        if (field === 'hora') updated.periodo = periodoFromHora(v);
        if (field === 'exame') updated.qtdExames = Math.max(1, v.split(/\s*\+\s*/).filter(Boolean).length);
        // nome corrigido à mão numa linha importada: guarda o original p/ a próxima importação casar
        if (field === 'paciente' && !ehEncaixe(old) && !old.nomeOrigem) updated.nomeOrigem = old.paciente;
        // hora/paciente/exame fazem parte da chave única: apaga o registro antigo na nuvem antes de gravar o novo
        if (['hora', 'paciente', 'exame'].includes(field)) enqueueDelete(old, selectedDate);
        enqueueUpsert(updated, selectedDate);
        agendaDatabase[selectedDate] = list.map(i => String(i.id) === String(id) ? updated : i);
        saveLocal();
    }

    // =====================================================================
    // 14. NAVEGAÇÃO
    // =====================================================================
    function toggleDrawer() {
        initUI();
        const drawer = document.getElementById('agenda-drawer-wrapper');
        const backdrop = document.getElementById('agenda-bg-backdrop');
        if (!drawer.classList.contains('open')) {
            drawer.classList.add('open');
            backdrop.classList.add('open');
            applyTheme();
            applyZoom();
            setDate(getTodayIso());
        } else {
            closeDrawer();
        }
    }

    function closeDrawer() {
        const d = document.getElementById('agenda-drawer-wrapper');
        const b = document.getElementById('agenda-bg-backdrop');
        if (d) d.classList.remove('open');
        if (b) b.classList.remove('open');
    }

    function toggleSection(p) {
        sectionState[p] = !sectionState[p];
        const b = document.getElementById(p === 'manha' ? 'bodyManha' : 'bodyTarde');
        if (b) b.style.display = sectionState[p] ? 'block' : 'none';
    }

    function setDate(dateStr) {
        selectedDate = dateStr;
        const picker = document.getElementById('nativeDatePicker');
        if (picker) picker.value = dateStr;
        const [ano, mes, dia] = dateStr.split('-');
        const d = new Date(ano, mes - 1, dia);
        const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const lSem = document.getElementById('labelDiaSemana');
        const lExt = document.getElementById('labelDataExtenso');
        if (lSem) lSem.innerText = dias[d.getDay()];
        if (lExt) lExt.innerText = `${dia}/${mes}/${ano}`;
        if (!agendaDatabase[selectedDate]) agendaDatabase[selectedDate] = [];
        renderAgenda();           // mostra o cache na hora
        loadDayFromCloud(dateStr); // e atualiza com a nuvem em seguida
    }

    function changeDay(delta) {
        const [ano, mes, dia] = selectedDate.split('-');
        const d = new Date(ano, mes - 1, parseInt(dia, 10) + delta);
        setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    function clearCurrentDay() {
        if (!confirm(`Deseja limpar TODOS os exames de ${fmtBR(selectedDate)}?\n(Isso também apaga na nuvem, para todos os computadores.)`)) return;
        (agendaDatabase[selectedDate] || []).forEach(item => enqueueDelete(item, selectedDate));
        agendaDatabase[selectedDate] = [];
        saveLocal();
    }

    // =====================================================================
    // 15. RENDERIZAÇÃO
    // =====================================================================
    function procCount(item) { return Math.max(item.qtdExames || 1, item.pacsQtdExames || 1); }

    // Pacientes únicos + procedimentos de uma lista de linhas
    function dayStats(list) {
        list = list.filter(i => i.status !== 'cancelado'); // cancelado no PACS não conta como paciente/procedimento do dia
        const pac = new Set(list.map(patientKeyOf));
        return { pacientes: pac.size, procedimentos: list.reduce((a, i) => a + procCount(i), 0) };
    }

    function fmtHM(iso) {
        if (!iso) return '--:--';
        const d = new Date(iso);
        return isNaN(d) ? '--:--' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function renderAgenda() {
        const tbM = document.getElementById('tbodyNativeManha');
        const tbT = document.getElementById('tbodyNativeTarde');
        if (!tbM || !tbT) return;
        // não redesenha enquanto o usuário edita uma célula (evita perder digitação)
        const ae = document.activeElement;
        if (ae && ae.classList && ae.classList.contains('editable-cell')) return;

        const list = sortPatientsList(agendaDatabase[selectedDate] || []);
        list.forEach(i => { i.periodo = periodoFromHora(i.hora); });
        const count = s => list.filter(i => i.status === s).length;
        const st = dayStats(list);
        document.getElementById('cntPacientes').innerText = st.pacientes;
        document.getElementById('cntProc').innerText = st.procedimentos;
        // procedimentos por paciente (para o selo ×N)
        currentProcByPatient = {};
        list.forEach(i => { const k = patientKeyOf(i); currentProcByPatient[k] = (currentProcByPatient[k] || 0) + procCount(i); });
        document.getElementById('cntPendente').innerText = count('pendente');
        document.getElementById('cntEsperando').innerText = count('esperando');
        document.getElementById('cntAtendido').innerText = count('atendido');
        document.getElementById('cntFaltou').innerText = count('faltou');
        document.getElementById('cntCancelado').innerText = count('cancelado');

        const m = list.filter(i => i.periodo === 'manha');
        const t = list.filter(i => i.periodo === 'tarde');
        const sm = dayStats(m), stt = dayStats(t);
        document.getElementById('badgeCountManha').innerText = `${sm.pacientes} pacientes · ${sm.procedimentos} proc.`;
        document.getElementById('badgeCountTarde').innerText = `${stt.pacientes} pacientes · ${stt.procedimentos} proc.`;
        tbM.innerHTML = '';
        tbT.innerHTML = '';
        m.forEach(i => tbM.appendChild(createRow(i)));
        t.forEach(i => tbT.appendChild(createRow(i)));
        updateSyncIndicator();
        renderPacsPendentes();
    }

    function createRow(item) {
        const tr = document.createElement('tr');
        let bg = isDarkMode ? '#1e293b' : '#ffffff';
        if (item.status === 'atendido') bg = isDarkMode ? '#064e3b' : '#ecfdf5';
        else if (item.status === 'faltou') bg = isDarkMode ? '#4c0519' : '#fff1f2';
        else if (item.status === 'esperando') bg = isDarkMode ? '#3b2904' : '#fefce8';
        else if (item.status === 'cancelado') { bg = isDarkMode ? '#273142' : '#f1f5f9'; tr.style.opacity = '0.6'; tr.title = item.removidoOrigemEm ? 'Paciente saiu da planilha da Prefeitura (desmarcado/remanejado). Use "Chegou" se ele vier.' : 'Exame cancelado/removido no PACS (ex.: convênio não autorizou). Use "Chegou" se o paciente voltar.'; }
        tr.style.background = bg;

        let bClass = 'badge-conv';
        if (item.tipo === 'Prefeitura') bClass = 'badge-pref';
        else if (item.convenio === 'PARTICULAR') bClass = 'badge-part';
        else if (item.convenio === 'SOCIAL') bClass = 'badge-social';
        else if (item.convenio && String(item.convenio).startsWith('SUS -')) bClass = 'badge-sus-urgente';

        let label = '-', sla = 'sla-normal';
        if (item.status === 'esperando') {
            const w = calcWaitTime(item.chegouEm, null);
            label = `⏳ ${formatMinutes(w)}`;
            sla = urgEfetivo(item) ? 'sla-normal' : getSLAClass(w); // urgência: sem SLA (feita quando o quadro permite)
        } else if (item.status === 'atendido') {
            const w = (item.tempoEsperaMin !== undefined && item.tempoEsperaMin !== null) ? item.tempoEsperaMin : (item.chegouEm ? calcWaitTime(item.chegouEm, item.atendidoEm) : null);
            label = w !== null ? `✓ ${formatMinutes(w)}` : '✓ Atendido';
        } else if (item.status === 'cancelado') {
            label = 'CANCELADO';
            sla = 'sla-normal';
        } else if (item.status === 'faltou') {
            label = 'FALTOU';
            sla = 'sla-vermelho';
        }

        // Linha do tempo (tooltip): ficha / imagem / atendido
        const tl = [];
        if (item.chegouEm) tl.push(`Chegada ${fmtHM(item.chegouEm)} (${item.chegadaFonte === 'pacs' ? 'ficha PACS' : 'clique'})`);
        if (item.imagemEm) tl.push(`Imagens no PACS ${fmtHM(item.imagemEm)}`);
        if (item.atendidoEm) tl.push(`Atendido ${fmtHM(item.atendidoEm)} (${item.atendidoFonte === 'imagem' ? 'pela imagem' : 'clique'})`);
        const tlTitle = escapeHtml(tl.join(' • ') || 'Sem registros de horário');

        const nProc = currentProcByPatient[patientKeyOf(item)] || 1;
        const qtdLinha = procCount(item);
        let badges = '';
        if (nProc > 1) badges += `<span class="badge-base badge-multi" title="${nProc} procedimentos deste paciente no dia${qtdLinha > 1 ? ` (${qtdLinha} nesta linha)` : ''}">×${nProc}</span>`;
        if (ehEncaixe(item)) {
            const sug = sugestaoFusao(item, agendaDatabase[selectedDate] || []);
            const origemTxt = item.origem === 'encaixe_pacs' ? 'Encaixe criado automaticamente a partir do PACS' : 'Encaixe lançado à mão';
            if (sug) badges += `<span class="badge-base badge-enc badge-fusao" data-action="fundir" data-id="${escapeHtml(item.id)}" title="${escapeHtml(`${origemTxt}. Parece ser ${sug.r.paciente} (${normalizeTime(sug.r.hora)}) da agenda — ${Math.round(sug.score * 100)}%. Clique para mesclar.`)}">ENCAIXE 🔗?</span>`;
            else if (item.origem === 'encaixe_pacs') badges += `<span class="badge-base badge-enc" data-action="fundir" data-id="${escapeHtml(item.id)}" style="cursor:pointer;" title="${origemTxt}. Clique para mesclar com uma linha da agenda.">ENCAIXE</span>`;
        }
        if (item.nomeOrigem && normName(item.nomeOrigem) !== normName(item.paciente)) badges += `<span class="badge-base badge-nome" title="Na ${item.origem === 'prefeitura_planilha' ? 'planilha da Prefeitura' : item.origem === 'spdata_pdf' ? 'agenda do SPDATA' : 'origem'} estava: ${escapeHtml(item.nomeOrigem)}">≈</span>`;
        if (item.removidoOrigemEm && item.status !== 'cancelado') badges += `<span class="badge-base badge-saiu" title="Não veio mais na ${item.origem === 'prefeitura_planilha' ? 'planilha da Prefeitura' : 'importação mais recente'} (${fmtBR(String(item.removidoOrigemEm).slice(0, 10))}). Confirme se o paciente foi desmarcado.">⚠ SAIU</span>`;
        if (urgEfetivo(item)) badges += `<span class="badge-base badge-urg" data-action="urg" data-id="${escapeHtml(item.id)}" title="Exame em caráter de urgência (${escapeHtml({ sus: 'regra: SUS hospitalar', pacs: 'marcado no PACS', manual: 'marcado à mão' }[item.urgenteFonte] || 'regra: SUS hospitalar')}). Clique para retirar.">🚨 URG${setorEfetivo(item) ? ' · ' + escapeHtml(setorEfetivo(item)) : ''}</span>`;
        if (item.pacsPacienteId > 0) badges += `<span class="badge-base badge-pacs" data-action="unlink" data-id="${escapeHtml(item.id)}" title="Vinculado ao PACS — ficha ${fmtHM(item.chegouEm)}${item.imagemEm ? ', imagens ' + fmtHM(item.imagemEm) : ''}. Clique para desfazer o vínculo.">🔗 ${fmtHM(item.chegouEm)}</span>`;

        const id = escapeHtml(item.id);
        tr.innerHTML = `
            <td style="text-align:center; font-weight:bold;"><div class="editable-cell" contenteditable="true" data-field="hora" data-id="${id}">${escapeHtml(normalizeTime(item.hora))}</div></td>
            <td><span class="badge-base ${bClass}">${escapeHtml(item.convenio)}</span></td>
            <td style="font-weight:600;"><div class="pac-cell"><div class="editable-cell" contenteditable="true" data-field="paciente" data-id="${id}">${escapeHtml(item.paciente)}</div>${badges}</div></td>
            <td style="color:${isDarkMode ? '#94a3b8' : '#475569'};"><div class="editable-cell" contenteditable="true" data-field="exame" data-id="${id}">${escapeHtml(item.exame)}</div>${item.obs ? `<div class="obs-cell" title="Observação da origem">📝 ${escapeHtml(item.obs)}</div>` : ''}</td>
            <td style="text-align:center;"><span class="badge-base ${sla}" style="font-size:9.5px;" title="${tlTitle}">${label}${item.atendidoFonte === 'imagem' ? ' 🩻' : ''}</span></td>
            <td style="text-align:center;">
                <div style="display:flex; gap:2.5px; justify-content:center; align-items:center;">
                    <button class="btn-act btn-chegou" data-action="chegou" data-id="${id}" title="Marcar chegada">${item.status === 'esperando' ? 'Em Espera' : 'Chegou'}</button>
                    <button class="btn-act btn-atend" data-action="atendido" data-id="${id}" title="Finalizar atendimento">Atend</button>
                    <button class="btn-act btn-falta" data-action="falta" data-id="${id}" title="Marcar falta">Falta</button>
                    <button class="btn-act btn-urg${urgEfetivo(item) ? ' on' : ''}" data-action="urgente" data-id="${id}" title="${urgEfetivo(item) ? 'Retirar urgência' : 'Marcar como urgência'}">🚨</button>
                    <button class="btn-del" data-action="delete" data-id="${id}" title="Excluir">🗑️</button>
                </div>
            </td>`;
        return tr;
    }

    function handleAddEncaixe() {
        const rawHora = document.getElementById('encHora').value.trim();
        const origem = document.getElementById('encOrigem').value;
        const paciente = normText(document.getElementById('encPaciente').value);
        const exame = normText(document.getElementById('encExame').value) || 'NÃO INFORMADO';
        if (!rawHora || !paciente) { alert('Preencha ao menos horário e paciente.'); return; }

        const hora = normalizeTime(rawHora);
        let tipo = 'Hospital/Convênio', convenio = origem.toUpperCase();
        if (origem === 'Prefeitura') { tipo = 'Prefeitura'; convenio = 'PREFEITURA'; }
        else if (origem.startsWith('SUS -')) { tipo = 'SUS Hospitalar'; convenio = origem; }

        const novo = { id: 'l' + Date.now(), hora, tipo, convenio, paciente, exame, status: 'pendente', periodo: periodoFromHora(hora), chegouEm: null, atendidoEm: null, tempoEsperaMin: null, origem: 'encaixe_manual' };
        const urgEl = document.getElementById('encUrg');
        if (urgEl && urgEl.checked) { novo.urgente = true; novo.urgenteFonte = 'manual'; urgEl.checked = false; }
        const list = agendaDatabase[selectedDate] || [];
        if (list.some(i => naturalKey(i) === naturalKey(novo))) { alert('Este paciente já está agendado neste horário para este exame.'); return; }
        list.push(novo);
        agendaDatabase[selectedDate] = list;
        ['encHora', 'encPaciente', 'encExame'].forEach(i => { document.getElementById(i).value = ''; });
        enqueueUpsert(novo, selectedDate);
        saveLocal();
        document.getElementById('encHora').focus();
    }

    // =====================================================================
    // 16. DASHBOARD
    // =====================================================================
    function openDashboard() {
        document.getElementById('modalDashboard').classList.add('open');
        renderDashboardAba(1);
    }

    function renderDashboardAba(n) {
        const b1 = document.getElementById('tabDashHoje'), b2 = document.getElementById('tabDashNuvem');
        const on = b => { b.style.background = '#2563eb'; b.style.color = '#fff'; };
        const off = b => { b.style.background = '#334155'; b.style.color = '#cbd5e1'; };
        if (n === 1) { on(b1); off(b2); renderDashboardHoje(); } else { on(b2); off(b1); renderDashboardNuvemFaltas(); }
    }

    function box(value, label, color) {
        return `<div class="dash-box" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:7px; padding:8px; text-align:center;">
            <div style="font-size:18px; font-weight:bold; color:${color};">${value}</div>
            <div style="font-size:10px; color:#64748b; font-weight:600;">${label}</div></div>`;
    }

    function renderDashboardHoje() {
        const list = agendaDatabase[selectedDate] || [];
        const tot = list.length;
        const atend = list.filter(i => i.status === 'atendido');
        const faltas = list.filter(i => i.status === 'faltou');
        const taxa = tot ? Math.round(faltas.length / tot * 100) : 0;
        // v9.3.4 — urgência (internado/PS) é feita quando o quadro permite: não entra no tempo de espera nem no SLA
        const tempoOk = i => i.tempoEsperaMin !== null && i.tempoEsperaMin !== undefined && !isNaN(i.tempoEsperaMin) && i.tempoEsperaMin >= 0 && i.tempoEsperaMin <= ESPERA_MAX_VALIDA;
        const comTempo = atend.filter(i => !urgEfetivo(i) && tempoOk(i));
        const avg = comTempo.length ? Math.round(comTempo.reduce((a, i) => a + i.tempoEsperaMin, 0) / comTempo.length) : null;
        const urgAtend = atend.filter(i => urgEfetivo(i) && tempoOk(i)).map(i => i.tempoEsperaMin).sort((x, y) => x - y);
        const urgMed = urgAtend.length ? urgAtend[Math.floor((urgAtend.length - 1) / 2)] : null;
        const urgEspera = list.filter(i => i.status === 'esperando' && urgEfetivo(i)).length;
        const waits = list.filter(i => i.status === 'esperando' && !urgEfetivo(i)).map(i => calcWaitTime(i.chegouEm, null) || 0);
        const a = waits.filter(w => w >= 30 && w < 45).length, l = waits.filter(w => w >= 45 && w < 60).length, v = waits.filter(w => w >= 60).length;
        const stDia = dayStats(list), stReal = dayStats(atend);
        const fichaImg = list.filter(i => !urgEfetivo(i) && i.chegadaFonte === 'pacs' && i.chegouEm && i.imagemEm).map(i => calcWaitTime(i.chegouEm, i.imagemEm));
        const avgFI = fichaImg.length ? Math.round(fichaImg.reduce((x, y) => x + y, 0) / fichaImg.length) : null;
        const encPacs = list.filter(i => i.origem === 'encaixe_pacs').length;

        document.getElementById('contentDashboard').innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px;">
                ${box(tot, 'Linhas na agenda', isDarkMode ? '#f1f5f9' : '#0f172a')}
                ${box(atend.length, 'Atendidos', '#059669')}
                ${box(`${faltas.length} (${taxa}%)`, 'Faltas (No-Show)', '#e11d48')}
                ${box(formatMinutes(avg), `Espera média — eletivos (n=${comTempo.length})`, '#2563eb')}
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px;">
                ${box(`${stDia.pacientes} / ${stDia.procedimentos}`, 'Pacientes / Procedimentos (dia)', isDarkMode ? '#f1f5f9' : '#0f172a')}
                ${box(`${stReal.pacientes} / ${stReal.procedimentos}`, 'Realizados (pac. / proc.)', '#059669')}
                ${box(formatMinutes(avgFI), `Ficha → imagem, eletivos (n=${fichaImg.length})`, '#0891b2')}
                ${box(encPacs, 'Encaixes vindos do PACS', '#7c3aed')}
            </div>
            <div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px;">
                <div style="font-weight:bold; font-size:11px; margin-bottom:5px;">🚨 SLA de Espera em Tempo Real</div>
                <div style="display:flex; gap:8px; font-size:10.5px;">
                    <div class="sla-amarelo" style="flex:1; padding:5px 8px; border-radius:5px;"><strong>${a}</strong> alerta (≥ 30 min)</div>
                    <div class="sla-laranja" style="flex:1; padding:5px 8px; border-radius:5px;"><strong>${l}</strong> atenção (≥ 45 min)</div>
                    <div class="sla-vermelho" style="flex:1; padding:5px 8px; border-radius:5px; animation:none;"><strong>${v}</strong> crítico (≥ 60 min)</div>
                </div>
                <div style="font-size:10px; color:#64748b; margin-top:6px;">🚨 Urgências fora do SLA e da média: ${urgEspera} aguardando · ${urgAtend.length} realizada(s)${urgMed != null ? ` · ficha → exame (mediana) ${formatMinutes(urgMed)}` : ''}.</div>
            </div>`;
    }

    function rankingHtml(map, title) {
        const rows = Object.entries(map)
            .map(([k, d]) => ({ k, ...d, pct: d.total ? Math.round(d.faltas / d.total * 100) : 0 }))
            .sort((x, y) => y.pct - x.pct || y.faltas - x.faltas);
        return `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
            <div style="font-weight:bold; font-size:11.5px; margin-bottom:8px;">${title}</div>
            ${rows.map(r => `
                <div style="display:grid; grid-template-columns:170px 1fr 170px; gap:8px; align-items:center; margin-bottom:5px;">
                    <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.k)}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:${r.pct}%; background:${r.pct > 20 ? '#e11d48' : '#0284c7'};"></div></div>
                    <span style="font-weight:700; text-align:right; color:${r.pct > 20 ? '#e11d48' : 'inherit'};">${r.faltas}/${r.total} (${r.pct}%)</span>
                </div>`).join('')}
        </div>`;
    }

    // v9.0 — Analytics calculado no banco (views vw_*): no-show contado por PACIENTE
    // (2 exames do mesmo paciente no dia = 1 falta), convênios padronizados,
    // procedimentos perdidos e tempo de espera. Se as views não existirem
    // (HTTP 404), cai no cálculo antigo feito no navegador.
    function barrasHtml(rows, title, nota) {
        if (!rows.length) return '';
        return `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
            <div style="font-weight:bold; font-size:11.5px; margin-bottom:${nota ? 2 : 8}px;">${title}</div>
            ${nota ? `<div style="font-size:9.5px; color:#94a3b8; margin-bottom:7px;">${nota}</div>` : ''}
            ${rows.map(r => {
                const pct = Math.round(Number(r.pct) || 0), poucos = r.total < 5;
                const cor = poucos ? '#94a3b8' : pct > 25 ? '#e11d48' : pct > 15 ? '#f59e0b' : '#0284c7';
                return `<div style="display:grid; grid-template-columns:170px 1fr 190px; gap:8px; align-items:center; margin-bottom:5px;${poucos ? ' opacity:.65;' : ''}" title="${poucos ? 'Amostra pequena (< 5): percentual pouco confiável' : ''}">
                    <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.k)}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, pct)}%; background:${cor};"></div></div>
                    <span style="font-weight:700; text-align:right; color:${poucos ? 'inherit' : cor};">${r.faltas}/${r.total} (${pct}%)${r.extra ? ` <span style="font-weight:500; color:#94a3b8;">${r.extra}</span>` : ''}</span>
                </div>`;
            }).join('')}
        </div>`;
    }

    async function renderDashboardNuvemFaltas() {
        const content = document.getElementById('contentDashboard');
        if (!getSupabaseConfig()) return renderDashboardNuvemFaltasLegado();
        content.innerHTML = `<div style="text-align:center; padding:30px; color:#60a5fa;">⏳ Carregando Analytics da nuvem...</div>`;
        try {
            await flushOutbox();
            const d = new Date(); d.setDate(d.getDate() - 30);
            const dataMin = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const [conv, hora, dia, espera] = await Promise.all([
                requestSupabase('vw_noshow_convenio_30d?select=*', 'GET'),
                requestSupabase('vw_noshow_horario_30d?select=*', 'GET'),
                requestSupabase('vw_noshow_dia_semana_90d?select=*', 'GET'),
                requestSupabase(`vw_espera_diaria?select=*&data_agenda=gte.${dataMin}`, 'GET')
            ]);
            // v9.3 — urgências (exames realizados), últimos 3 meses; se a view não existir, só não mostra
            const m0 = new Date(); m0.setMonth(m0.getMonth() - 2); m0.setDate(1);
            const mesMin = `${m0.getFullYear()}-${String(m0.getMonth() + 1).padStart(2, '0')}-01`;
            const [urgM, urgS, urgT] = await Promise.all([
                requestSupabase(`vw_urgencias_mes?select=*&mes=gte.${mesMin}&order=mes.desc`, 'GET').catch(() => []),
                requestSupabase(`vw_urgencias_setor?select=*&mes=gte.${mesMin}&order=mes.desc,pacientes.desc`, 'GET').catch(() => []),
                requestSupabase(`vw_espera_urgencia_mes?select=*&mes=gte.${mesMin}&order=mes.desc`, 'GET').catch(() => [])
            ]);
            const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
            const fmtMes = iso => { const [y, m] = String(iso).split('-').map(Number); return `${MES3[m - 1]}/${String(y).slice(2)}`; };
            const FONTE = { sus: 'regra SUS', pacs: 'PACS', manual: 'à mão' };
            const urgHtml = (urgM || []).length ? `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
                    <div style="font-weight:bold; font-size:11.5px; margin-bottom:6px;">🚨 Exames em caráter de urgência (realizados)</div>
                    <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
                        <tr style="color:#64748b; font-size:9.5px; text-transform:uppercase;"><th style="text-align:left; padding:3px 6px;">Mês</th><th style="text-align:right; padding:3px 6px;">Pacientes</th><th style="text-align:right; padding:3px 6px;">Urgências</th><th style="text-align:right; padding:3px 6px;">%</th><th style="text-align:right; padding:3px 6px;">Proc. urgência</th><th style="text-align:left; padding:3px 6px;">Por setor (origem da marcação)</th></tr>
                        ${urgM.map(r => `<tr><td style="padding:3px 6px; font-weight:700;">${fmtMes(r.mes)}</td><td style="padding:3px 6px; text-align:right;">${r.pacientes}</td><td style="padding:3px 6px; text-align:right; color:#dc2626; font-weight:700;">${r.pacientes_urgencia}</td><td style="padding:3px 6px; text-align:right;">${r.pct_pacientes_urgencia ?? 0}%</td><td style="padding:3px 6px; text-align:right;">${r.procedimentos_urgencia}</td>
                            <td style="padding:3px 6px; font-size:9.5px;">${(urgS || []).filter(x => x.mes === r.mes).map(x => `${escapeHtml(x.setor)} (${FONTE[x.fonte] || escapeHtml(x.fonte)}): ${x.pacientes}`).join(' · ') || '—'}</td></tr>`).join('')}
                    </table>
                    ${(urgT || []).length ? `<div style="font-size:10px; margin-top:6px;">⏱ Ficha → exame nas urgências (informativo, fora da média de espera): ${urgT.map(t => `${fmtMes(t.mes)} mediana ${formatMinutes(t.ficha_exame_mediana_min)} (n=${t.com_tempo}, ${t.ate_60min} em até 60 min)`).join(' · ')}</div>` : ''}
                    <div style="font-size:9.5px; color:#94a3b8; margin-top:4px;">SUS hospitalar (PS, internado, UTI, maternidade) conta automaticamente; os demais pela marcação de urgência no PACS ou pelo botão 🚨 da agenda. Inclui o mês corrente.</div></div>` : '';
            if (!Array.isArray(conv) || !conv.length) {
                content.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Nenhum atendimento ou falta registrado nos últimos 30 dias.</div>`;
                return;
            }
            const soma = (arr, c) => arr.reduce((a, r) => a + (Number(r[c]) || 0), 0);
            const pacientes = soma(conv, 'pacientes'), faltas = soma(conv, 'faltas'), perdidos = soma(conv, 'procedimentos_perdidos');
            const taxa = pacientes ? Math.round(faltas / pacientes * 100) : 0;

            // espera: média ponderada pelo nº de atendidos com tempo; % acima de 60 min
            const porTipo = {};
            (espera || []).forEach(r => {
                const t = r.tipo || 'N/I', n = Number(r.atendidos_com_tempo) || 0;
                if (!porTipo[t]) porTipo[t] = { n: 0, soma: 0, acima: 0, max: 0 };
                porTipo[t].n += n;
                porTipo[t].soma += n * (Number(r.espera_media_min) || 0);
                porTipo[t].acima += Number(r.acima_60min) || 0;
                porTipo[t].max = Math.max(porTipo[t].max, Number(r.espera_max_min) || 0);
            });
            const nEsp = Object.values(porTipo).reduce((a, x) => a + x.n, 0);
            const mediaEsp = nEsp ? Math.round(Object.values(porTipo).reduce((a, x) => a + x.soma, 0) / nEsp) : null;
            const acimaEsp = Object.values(porTipo).reduce((a, x) => a + x.acima, 0);

            const rowsConv = conv.map(r => ({ k: r.convenio, faltas: r.faltas, total: r.pacientes, pct: r.taxa_noshow_pct, extra: r.procedimentos_perdidos ? `−${r.procedimentos_perdidos} proc.` : '' }));
            const rowsHora = (hora || []).map(r => ({ k: `${String(r.faixa || '').slice(0, 2)}h (${r.periodo || ''})`, faltas: r.faltas, total: r.agendados, pct: r.taxa_noshow_pct }));
            const rowsDia = (dia || []).map(r => ({ k: r.dia, faltas: r.faltas, total: r.agendados, pct: r.taxa_noshow_pct }));
            const tiposHtml = Object.entries(porTipo).sort((a, b) => b[1].n - a[1].n).map(([t, x]) => `
                <tr><td style="padding:3px 6px; font-weight:700;">${escapeHtml(t)}</td>
                    <td style="padding:3px 6px; text-align:right;">${x.n}</td>
                    <td style="padding:3px 6px; text-align:right;">${x.n ? formatMinutes(Math.round(x.soma / x.n)) : '–'}</td>
                    <td style="padding:3px 6px; text-align:right;">${x.acima} (${x.n ? Math.round(x.acima / x.n * 100) : 0}%)</td>
                    <td style="padding:3px 6px; text-align:right;">${formatMinutes(Math.round(x.max))}</td></tr>`).join('');

            content.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:6px;">
                    ${box(pacientes, 'Pacientes com desfecho (30d)', isDarkMode ? '#f1f5f9' : '#0f172a')}
                    ${box(`${faltas} (${taxa}%)`, 'Faltas (No-Show)', '#e11d48')}
                    ${box(perdidos, 'Procedimentos perdidos', '#f59e0b')}
                    ${box(formatMinutes(mediaEsp), `Espera média eletivos (${acimaEsp} > 60 min)`, '#2563eb')}
                </div>
                <div style="font-size:10px; color:#94a3b8; margin-bottom:10px;">Últimos 30 dias encerrados (até ontem). Falta contada por paciente/dia; cancelados e quem saiu da planilha não entram. Calculado no banco — mesmo resultado nos 3 computadores.</div>
                ${barrasHtml(rowsConv, '📊 No-Show por Convênio / Setor', 'Nomes de convênio padronizados (ex.: variações de SERPRAM somadas). Cinza = menos de 5 pacientes.')}
                ${barrasHtml(rowsHora, '🕒 No-Show por Faixa Horária (30 dias, por exame)')}
                ${barrasHtml(rowsDia, '📅 No-Show por Dia da Semana (90 dias, por exame)')}
                ${tiposHtml ? `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
                    <div style="font-weight:bold; font-size:11.5px; margin-bottom:6px;">⏱ Tempo de espera — eletivos (chegada → atendimento, 30 dias)</div>
                    <div style="font-size:9.5px; color:#94a3b8; margin-bottom:4px;">Urgências (internado/PS, SUS hospitalar, marcadas no PACS ou no 🚨) não entram: são feitas quando o quadro permite. Tempos acima de 12 h são tratados como erro de registro.</div>
                    <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
                        <tr style="color:#64748b; font-size:9.5px; text-transform:uppercase;"><th style="text-align:left; padding:3px 6px;">Tipo</th><th style="text-align:right; padding:3px 6px;">Atendidos</th><th style="text-align:right; padding:3px 6px;">Média</th><th style="text-align:right; padding:3px 6px;">&gt; 60 min</th><th style="text-align:right; padding:3px 6px;">Máximo</th></tr>
                        ${tiposHtml}
                    </table></div>` : ''}
                ${urgHtml}`;
        } catch (err) {
            if (err.status === 404 || err.status === 400) return renderDashboardNuvemFaltasLegado();
            if (err.status !== undefined) reportCloudError(err, 'Analytics', false); // erro HTTP; erro de desenho só aparece aqui
            else console.error('[Agenda Analytics]', err);
            content.innerHTML = `<div style="text-align:center; padding:20px; color:#e11d48;">Erro ao buscar dados na nuvem:<br>${escapeHtml(err.message)}</div>`;
        }
    }

    async function renderDashboardNuvemFaltasLegado() {
        const content = document.getElementById('contentDashboard');
        if (!getSupabaseConfig()) {
            content.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">☁️ <strong>Nuvem não configurada.</strong><br>Clique em ⚙️ API e informe a Project URL e a chave.</div>`;
            return;
        }
        content.innerHTML = `<div style="text-align:center; padding:30px; color:#60a5fa;">⏳ Carregando últimos 30 dias da nuvem...</div>`;
        try {
            await flushOutbox();
            const d = new Date(); d.setDate(d.getDate() - 30);
            const dataMin = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const hoje = getTodayIso();
            // só dias já encerrados/atuais e registros com desfecho definido contam para No-Show
            const rows = await requestSupabase(`${TABLE}?data_agenda=gte.${dataMin}&data_agenda=lte.${hoje}&select=data_agenda,hora,convenio,status&limit=10000`, 'GET');
            if (!Array.isArray(rows) || rows.length === 0) {
                content.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Nenhum exame registrado na nuvem nos últimos 30 dias.</div>`;
                return;
            }
            const finalizados = rows.filter(r => r.status === 'atendido' || r.status === 'faltou');
            const totalFaltas = finalizados.filter(r => r.status === 'faltou').length;
            const totalAtend = finalizados.filter(r => r.status === 'atendido').length;
            const semDesfecho = rows.length - finalizados.length;
            const taxa = finalizados.length ? Math.round(totalFaltas / finalizados.length * 100) : 0;

            const porConv = {}, porFaixa = {}, porDiaSemana = {};
            const diasNome = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            finalizados.forEach(r => {
                const c = r.convenio || 'N/I';
                const h = normalizeTime(r.hora).slice(0, 2) + 'h';
                const [y, mo, da] = r.data_agenda.split('-');
                const ds = diasNome[new Date(y, mo - 1, da).getDay()];
                [[porConv, c], [porFaixa, h], [porDiaSemana, ds]].forEach(([map, k]) => {
                    if (!map[k]) map[k] = { total: 0, faltas: 0 };
                    map[k].total++;
                    if (r.status === 'faltou') map[k].faltas++;
                });
            });

            content.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:6px;">
                    ${box(finalizados.length, 'Exames com desfecho (30d)', isDarkMode ? '#f1f5f9' : '#0f172a')}
                    ${box(totalAtend, 'Atendidos', '#059669')}
                    ${box(`${totalFaltas} (${taxa}%)`, 'Taxa de No-Show', '#e11d48')}
                </div>
                <div style="font-size:10px; color:#94a3b8; margin-bottom:10px;">Base: registros marcados como Atendido ou Falta. ${semDesfecho} registro(s) ainda "pendente/em espera" foram excluídos do cálculo.</div>
                ${rankingHtml(porConv, '📊 No-Show por Convênio / Setor')}
                ${rankingHtml(porFaixa, '🕒 No-Show por Faixa Horária')}
                ${rankingHtml(porDiaSemana, '📅 No-Show por Dia da Semana')}`;
        } catch (err) {
            reportCloudError(err, 'histórico de faltas', false);
            content.innerHTML = `<div style="text-align:center; padding:20px; color:#e11d48;">Erro ao buscar dados na nuvem:<br>${escapeHtml(err.message)}</div>`;
        }
    }

    // =====================================================================
    // 17. IMPRESSÃO
    // =====================================================================
    function printPDF() {
        const list = sortPatientsList([...(agendaDatabase[selectedDate] || [])]);
        const [ano, mes, dia] = selectedDate.split('-');
        const rows = p => list.filter(i => periodoFromHora(i.hora) === p).map(i => `
            <tr><td class="center"><strong>${escapeHtml(normalizeTime(i.hora))}</strong></td><td>${escapeHtml(i.convenio)}</td><td><strong>${escapeHtml(i.paciente)}</strong></td><td>${escapeHtml(i.exame)}</td></tr>`).join('');
        const table = p => `<table><thead><tr><th style="width:10%;" class="center">Hora</th><th style="width:20%;">Convênio / Setor</th><th style="width:38%;">Paciente</th><th style="width:32%;">Procedimento</th></tr></thead><tbody>${rows(p)}</tbody></table>`;
        const win = window.open('', '_blank');
        if (!win) { alert('O navegador bloqueou a janela de impressão. Libere pop-ups para pacs.ladi.org.br.'); return; }
        win.document.write(`<!DOCTYPE html><html><head><title>Agenda Dr. Gabriel Gaspar - ${dia}/${mes}/${ano}</title>
            <style>body{font-family:sans-serif;font-size:9pt;color:#111;margin:10mm}h2{margin:0 0 4px;color:#1e3a8a}.meta{margin-bottom:12px;font-size:8pt;color:#555;border-bottom:1.5px solid #1e3a8a;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{border:1px solid #999;padding:3.5px 6px;text-align:left;font-size:8.5pt}th{background:#f1f5f9}.center{text-align:center}.section-title{background:#1e3a8a;color:#fff;padding:4px 6px;font-weight:bold;font-size:9pt;margin-top:8px;margin-bottom:2px}</style>
            </head><body><h2>Agenda de Exames • Dr. Gabriel Gaspar</h2><div class="meta">Data: <strong>${dia}/${mes}/${ano}</strong> | ${dayStats(list).pacientes} pacientes · ${dayStats(list).procedimentos} procedimentos</div>
            <div class="section-title">PERÍODO DA MANHÃ</div>${table('manha')}<div class="section-title">PERÍODO DA TARDE</div>${table('tarde')}</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 350);
    }

    // =====================================================================
    // 18. OCR — COMPRESSÃO + GEMINI
    // =====================================================================
    function compressImageForOCR(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width, h = img.height;
                    const maxDim = 1600;
                    if (w > maxDim || h > maxDim) {
                        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; } else { w = Math.round(w * maxDim / h); h = maxDim; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve({ base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' });
                };
                img.onerror = () => reject(new Error('Falha ao carregar imagem para compressão.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
            reader.readAsDataURL(file);
        });
    }


    // ---- SPDATA: códigos de 4 letras da coluna "Observacao/Exame(s)" → nome do exame
    const SPDATA_COD = {
        ABBT: 'USG ABDOME TOTAL', ABSP: 'USG ABDOME SUPERIOR', ABIM: 'USG PROSTATA (VIA ABDOMINAL)', ARTC: 'USG ARTICULACAO',
        TRSV: 'USG TRANSVAGINAL', OBST: 'USG OBSTETRICO', ESPP: 'USG PARTES MOLES', MAMA: 'USG MAMAS', ORSU: 'USG TIREOIDE/CERVICAL',
        DAMI: 'DOPPLER ARTERIAL MMII', DVMI: 'DOPPLER VENOSO MMII', DVCA: 'DOPPLER DE CAROTIDAS E VERTEBRAIS'
    };
    const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Regra do serviço: paciente com N horários seguidos no dia = N procedimentos (o SPDATA repete os códigos em cada horário);
    // paciente com 1 horário = nº de códigos daquele horário. Se houver mais códigos distintos que horários, o último horário recebe a diferença.
    function aplicarRegrasSPDATA(itens) {
        const grupos = new Map();
        itens.forEach(x => { const k = x.data + '|' + normText(x.paciente); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(x); });
        const saida = [];
        grupos.forEach(lst => {
            lst.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
            const cods = c => (Array.isArray(c) ? c : String(c || '').split(/[,\s]+/)).map(z => normText(z)).filter(z => /^[A-Z]{4}$/.test(z));
            const todos = [...new Set(lst.flatMap(x => cods(x.codigos)))];
            const n = lst.length, total = n > 1 ? Math.max(n, todos.length) : Math.max(1, cods(lst[0].codigos).length);
            lst.forEach((x, i) => {
                const c = cods(x.codigos).length ? cods(x.codigos) : todos;
                let exame = c.length ? c.map(z => SPDATA_COD[z] || z).join(' + ') : normText(x.exame);
                let obs = normText(x.obs);
                if (!c.length && /OMBRO|QUADRIL|JOELHO|PUNHO|COTOVELO|TORNOZELO|ARTICULA/.test(semAcento(obs))) exame = 'USG ARTICULACAO';
                if (/^(IPSEMG|UNIMED|GUIA|CARTEIRA)\b.*\d/.test(obs) || /^[\d\s\-/.:]*$/.test(obs)) obs = '';
                const ws = (semAcento(obs).match(/[A-Z]+/g) || []).filter(w => !['US', 'USG', 'E', 'DE', 'DA', 'DO', 'EM'].includes(w));
                const exw = new Set((semAcento(exame).match(/[A-Z]+/g) || []).concat(['ARTICULACOES', 'PROSTATA', 'MAMAS', 'DOPPLER', 'ARTERIAS']));
                if (!ws.length || ws.every(w => exw.has(w))) obs = '';
                const q = n > 1 ? (i === n - 1 ? total - (n - 1) : 1) : total;
                saida.push({ ...x, exame: exame || 'NÃO INFORMADO', obs: obs || '', _qtdFixa: q });
            });
        });
        return saida;
    }

    function promptAgendaIA() {
        return `Você é um assistente especializado em transcrever agendas de exames de imagem (ultrassonografia) para dados estruturados.
Você receberá prints e/ou PDFs. Podem conter vários dias.

FORMATOS:
1. Relatório/print do SPDATA ("Sistema de Gerenciamento Hospitalar", agenda de convênios/particular): "tipo" = "Hospital/Convênio"; "convenio" = o convênio da linha (ex.: PARTICULAR, SOCIAL, UNIMED, IPSEMG, CASSI, SERPRAM, MEDIC GLOBAL SAUDE, SPA SAUDE). Se a linha for SUS/Prefeitura dentro do SPDATA, use "tipo": "Prefeitura" e "convenio": "PREFEITURA".
2. Planilha/grade da Prefeitura (PSF, dias da semana SEG/TER/QUA/QUI/SEX): "tipo" = "Prefeitura", "convenio" = "PREFEITURA".

REGRAS:
- "data" de CADA linha no formato YYYY-MM-DD (use o cabeçalho do dia/página). Se não houver data em lugar nenhum, use "${selectedDate}".
- "hora" sempre HH:MM com 2 dígitos (07:45, 09:00, 13:40).
- Transcreva o nome do paciente exatamente como está, em MAIÚSCULAS.
- Uma linha por procedimento: se o mesmo paciente tiver 2 procedimentos no mesmo horário, devolva 2 linhas com a mesma hora (o sistema junta no mesmo bloco).
- Ignore horários vagos, bloqueados, cabeçalhos, rodapés, totais e anotações como "VER E-SUS REGULAÇÃO".
- Ignore linhas marcadas como canceladas/desmarcadas.
- "obs": somente se houver indicação clínica ou observação sobre o exame; senão "".
- Não invente nada. Se um campo estiver ilegível, use o que for legível.
- LISTAGEM DO SPDATA ("Listagem de horarios", "Nome da agenda", linhas "HH:MM - NOME - PRONTUARIO - CONVENIO"): para cada horário devolva também "codigos" = lista dos códigos de 4 letras da coluna Observacao/Exame(s) (ex.: ["ABBT","ABIM"]) e em "obs" o texto livre dessa coluna; "exame" pode ficar vazio. Use a data do cabeçalho "Dia: ...". Repita o horário mesmo que o paciente se repita. NUNCA devolva prontuário nem telefone.

Responda APENAS com JSON, sem texto fora dele:
{"exames":[{"data":"YYYY-MM-DD","hora":"HH:MM","tipo":"Prefeitura|Hospital/Convênio","convenio":"...","paciente":"...","exame":"...","codigos":[],"obs":""}]}`;
    }

    function extrairJSON(raw) {
        const m = String(raw || '').match(/\{[\s\S]*\}/);
        if (!m) throw new Error('A IA não retornou um JSON válido.');
        return JSON.parse(m[0]);
    }

    async function handleMultipleUpload(e) {
        const files = Array.from((e && e.target && e.target.files) || (e && e.files) || []);
        if (e && e.target) e.target.value = ''; // permite reenviar o mesmo arquivo
        if (!files.length) return;
        const imgs = files.filter(f => /^image\//.test(f.type));
        const pdfFiles = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
        if (!imgs.length && !pdfFiles.length) { alert('Envie imagens (prints) ou PDF.'); return; }
        const status = document.getElementById('statusLoadingIA');
        status.style.display = 'block';
        try {
            const imagens = await Promise.all(imgs.map(compressImageForOCR));
            const pdfs = await Promise.all(pdfFiles.map(lerArquivoBase64));
            const { texto, ia } = await chamarIA({ prompt: promptAgendaIA(), imagens, pdfs });
            const parsed = extrairJSON(texto);
            const origem = pdfs.length ? ORIGEM_PDF : 'agenda';
            let brutos = (parsed.exames || []).filter(x => x && x.paciente).map(x => ({ ...x, data: /^\d{4}-\d{2}-\d{2}$/.test(x.data || '') ? x.data : selectedDate, hora: normalizeTime(x.hora) }));
            if (brutos.some(x => Array.isArray(x.codigos) && x.codigos.length)) brutos = aplicarRegrasSPDATA(brutos);
            const linhas = brutos.map(x => {
                const data = /^\d{4}-\d{2}-\d{2}$/.test(x.data || '') ? x.data : selectedDate;
                const prefeitura = x.tipo === 'Prefeitura' || /PREFEITURA/i.test(x.convenio || '');
                const row = toCloudRow({
                    hora: normalizeTime(x.hora),
                    tipo: prefeitura ? 'Prefeitura' : 'Hospital/Convênio',
                    convenio: prefeitura ? 'PREFEITURA' : (normText(x.convenio) || 'NÃO INFORMADO'),
                    paciente: normText(x.paciente), exame: normText(x.exame) || 'NÃO INFORMADO',
                    status: 'pendente', origem, obs: normText(x.obs) || null
                }, data);
                if (x._qtdFixa != null) row._qtdFixa = x._qtdFixa;
                return row;
            });
            if (!linhas.length) throw new Error(`A IA (${ia}) não encontrou agendamentos nos arquivos.`);
            const datas = [...new Set(linhas.map(l => l.data_agenda))].sort();

            if (getSupabaseConfig()) {
                const rel = await sincronizarOrigem(origem, datas[0], datas[datas.length - 1], linhas,
                    { sinalizarAusentes: origem === ORIGEM_PDF, cancelarAusentes: false, datas: new Set(datas) });
                await recarregarAposImportar(datas);
                if (!datas.includes(selectedDate)) setDate(datas[0]);
                alert(relatorioSync(`🤖 ${ia} leu ${files.length} arquivo(s) — ${datas.map(fmtBR).join(', ')}`, rel,
                    origem === ORIGEM_PDF ? '\n\n"Saíram" = estavam no PDF anterior e não vieram neste (ficam com aviso, não são cancelados).' : ''));
            } else {
                // sem nuvem: grava só neste computador
                let n = 0;
                agruparPorHorario(linhas).forEach((r, idx) => {
                    const item = { ...mapCloudRow(r), id: 'l' + Date.now() + '_' + idx };
                    const lst = agendaDatabase[r.data_agenda] || [];
                    if (lst.some(i => naturalKey(i) === naturalKey(item))) return;
                    agendaDatabase[r.data_agenda] = sortPatientsList([...lst, item]); n++;
                });
                persistDb();
                setDate(datas[0]);
                alert(`✅ ${n} novo(s) registro(s) (${ia}). 💾 Somente local (nuvem não configurada).`);
            }
        } catch (err) {
            alert('Erro ao processar: ' + err.message);
        } finally {
            status.style.display = 'none';
        }
    }

    // =====================================================================
    // 19. TIMERS E ATALHOS
    // =====================================================================
    // Atualiza cronômetros de SLA a cada 60 s
    setInterval(() => {
        const d = document.getElementById('agenda-drawer-wrapper');
        if (d && d.classList.contains('open')) renderAgenda();
    }, 60000);

    // Puxa alterações feitas em outros computadores (só com a gaveta aberta):
    // a cada 30 s sem tempo real; a cada 3 min (reserva) com o tempo real ativo.
    setInterval(() => {
        const d = document.getElementById('agenda-drawer-wrapper');
        if (!(d && d.classList.contains('open') && getSupabaseConfig() && !document.hidden)) return;
        const intervalo = rt.status === 'on' ? POLL_RESERVA_MS : POLL_MS;
        if (Date.now() - ultimaLeituraNuvem < intervalo - 2000) return;
        ultimaLeituraNuvem = Date.now();
        loadDayFromCloud(selectedDate, true);
    }, POLL_MS);

    // v9.1 — mantém a sessão viva (renova 5 min antes de vencer), mesmo sem tráfego
    setInterval(() => {
        const s = lerSessao();
        if (s && getSupabaseConfig() && s.expires_at - Date.now() / 1000 < 300) renovarSessao().catch(() => { /* tenta no próximo minuto */ });
    }, 60000);

    // Reenvia fila pendente e reconecta o tempo real quando a internet volta
    window.addEventListener('online', () => { flushOutbox(); if (!rt.ws) rtReconectar(); });
    // aba volta a ficar visível depois de muito tempo (PC dormiu): garante conexão e relê o dia
    document.addEventListener('visibilitychange', () => {
        if (document.hidden || !getSupabaseConfig() || !rtPermitido()) return;
        if (!rt.ws) rtReconectar();
        if (Date.now() - ultimaLeituraNuvem > POLL_MS) { ultimaLeituraNuvem = Date.now(); loadDayFromCloud(selectedDate, true); }
    });

    window.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const modal = document.getElementById('modalDashboard');
        if (modal && modal.classList.contains('open')) modal.classList.remove('open');
        else closeDrawer();
    });

    // Migração silenciosa: corrige URL salva com "/rest/v1" pelas versões anteriores
    (function migrateStoredUrl() {
        const raw = localStorage.getItem(SUPABASE_URL_STORAGE);
        if (raw) {
            const fixed = sanitizeSupabaseUrl(raw);
            if (fixed && fixed !== raw) localStorage.setItem(SUPABASE_URL_STORAGE, fixed);
        }
    })();

    // Leitura automática do PACS (chegada / imagens / encaixes) a cada 60 s, só com o PACS logado
    setInterval(() => { if (pacsToken()) syncPacsToday(); }, PACS_SYNC_MS);
    setTimeout(() => { if (pacsToken()) syncPacsToday(); }, 4000);


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
    })('Agenda', 'https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-agenda.user.js');

    pushLegacyLocalOnce(); // precisa rodar ANTES do initUI (que já lê a nuvem)
    setInterval(initUI, 1500);
    initUI();
    if (outbox.length) flushOutbox();
    // tempo real só na aba principal do PACS (o visualizador de imagens não usa a Agenda)
    setTimeout(rtConectar, 2500);
})();
