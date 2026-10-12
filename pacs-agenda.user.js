// ==UserScript==
// @name         PACS LADI - Agenda Operacional Master
// @namespace    http://tampermonkey.net/
// @version      8.5.3
// @description  Agenda integrada ao PACS (chegada pela hora da ficha, atendimento pela chegada das imagens, encaixe automático, contagem de pacientes/procedimentos), sincronização Supabase blindada (fila offline, URL/chave saneadas, erros visíveis), envio forçado de todo o histórico local, auto-refresh entre máquinas, No-Show por convênio e por horário, Dark Mode, Zoom e OCR Gemini.
// @author       Dr. Gabriel Gaspar
// @match        *://pacs.ladi.org.br/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @connect      supabase.co
// @connect      *.supabase.co
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
        #btn-agenda-flutuante { position: fixed !important; top: 10px !important; left: 140px !important; z-index: 9999999 !important; background: #2563eb !important; color: #fff !important; border: 1.5px solid #60a5fa !important; border-radius: 7px !important; padding: 5px 12px !important; font-size: 12px !important; font-weight: 700 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; cursor: pointer !important; box-shadow: 0 3px 10px rgba(0,0,0,0.45) !important; display: flex !important; align-items: center !important; gap: 5px !important; transition: all 0.15s ease !important; }
        html[data-ag-viewer] #btn-agenda-flutuante, html[data-ag-viewer] #agenda-drawer-wrapper, html[data-ag-viewer] #agenda-bg-backdrop { display: none !important; }
        #btn-agenda-flutuante:hover { background: #1d4ed8 !important; transform: translateY(-1px) !important; }
        #agenda-drawer-wrapper { position: fixed !important; top: 0 !important; right: -1100px !important; width: 920px; max-width: 98vw !important; height: 100vh !important; background: #f8fafc; box-shadow: -12px 0 35px rgba(0,0,0,0.75) !important; z-index: 10000000 !important; transition: right 0.26s cubic-bezier(0.4,0,0.2,1), width 0.2s ease !important; display: flex !important; flex-direction: column !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; color: #1e293b; }
        #agenda-drawer-wrapper.open { right: 0 !important; }
        #agenda-top-bar { background: #0f172a !important; color: #fff !important; padding: 7px 12px !important; display: flex !important; justify-content: space-between !important; align-items: center !important; border-bottom: 1px solid #334155 !important; flex-shrink: 0 !important; gap: 6px; }
        .btn-top-action { border: none !important; border-radius: 5px !important; padding: 4px 8px !important; font-size: 10.5px !important; font-weight: 700 !important; cursor: pointer !important; transition: opacity 0.15s !important; display: inline-flex !important; align-items: center !important; gap: 4px !important; }
        .btn-top-action:hover { opacity: 0.88; }
        .zoom-control-group { display: inline-flex; align-items: center; background: #1e293b; border: 1px solid #475569; border-radius: 5px; overflow: hidden; }
        .btn-zoom { background: transparent; color: #f8fafc; border: none; padding: 3px 6px; font-size: 10px; font-weight: bold; cursor: pointer; line-height: 1; }
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
    const POLL_MS = 30000; // auto-refresh da nuvem com a gaveta aberta
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
    function requestSupabase(endpoint, method, payload, extraHeaders = {}) {
        return new Promise((resolve, reject) => {
            const config = getSupabaseConfig();
            if (!config) return reject(new Error('Supabase não configurado (⚙️ API).'));

            const headers = {
                'apikey': config.key,
                'Content-Type': 'application/json',
                ...extraHeaders
            };
            // Chave legada (JWT "eyJ...") vai também no Authorization.
            // Chave nova "sb_publishable_..." NÃO pode ir como Bearer (gera 401).
            if (config.key.startsWith('eyJ')) headers['Authorization'] = `Bearer ${config.key}`;

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
        } else {
            el.innerHTML = '☁️ Nuvem OK';
            el.style.color = '#34d399';
            el.title = 'Sincronizado com o Supabase.';
        }
    }

    // =====================================================================
    // 6. FILA OFFLINE (OUTBOX) — nada se perde se a nuvem falhar
    // =====================================================================
    function toCloudRow(item, dateStr) {
        return {
            data_agenda: dateStr,
            hora: normalizeTime(item.hora),
            tipo: item.tipo || 'Hospital/Convênio',
            convenio: item.convenio || 'NÃO INFORMADO',
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
            atendido_fonte: item.atendidoFonte || null
        };
    }

    function enqueueUpsert(item, dateStr) {
        if (!getSupabaseConfig()) return;
        const row = toCloudRow(item, dateStr);
        const k = `${dateStr}|${naturalKey(row)}`;
        // Coalescer: mantém só a última versão do mesmo registro na fila
        outbox = outbox.filter(op => !(op.k === k));
        outbox.push({ t: 'upsert', k, date: dateStr, row });
        persistOutbox();
        flushOutbox();
    }

    function enqueueDelete(item, dateStr) {
        if (!getSupabaseConfig()) return;
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
                    while (outbox.length > 0 && outbox[0].t === 'upsert' && batch.length < 200) batch.push(outbox.shift().row);
                    try {
                        await requestSupabase(`${TABLE}?on_conflict=${CONFLICT_COLS}`, 'POST', batch, {
                            'Prefer': 'resolution=merge-duplicates,return=minimal'
                        });
                    } catch (err) {
                        // devolve o lote para a frente da fila
                        outbox = batch.map(row => ({ t: 'upsert', k: `${row.data_agenda}|${naturalKey(row)}`, date: row.data_agenda, row })).concat(outbox);
                        throw err;
                    }
                } else {
                    await requestSupabase(deleteEndpoint(op.row), 'DELETE', null, { 'Prefer': 'return=minimal' });
                    outbox.shift();
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
            atendidoFonte: r.atendido_fonte || null
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
        try {
            const rows = await requestSupabase(`${TABLE}?data_agenda=eq.${dateStr}&select=*&order=hora.asc`, 'GET');
            if (Array.isArray(rows)) {
                const local = agendaDatabase[dateStr] || [];
                // PROTEÇÃO: nuvem vazia + dia local com pacientes nunca sincronizados
                // => NÃO apaga o local; envia o local para a nuvem.
                if (rows.length === 0 && local.length > 0 && !syncedDates[dateStr]) {
                    local.forEach(item => enqueueUpsert(item, dateStr));
                } else {
                    agendaDatabase[dateStr] = sortPatientsList(rows.map(mapCloudRow));
                    persistDb();
                    markSynced(dateStr);
                }
                clearCloudError();
            }
        } catch (err) {
            reportCloudError(err, 'leitura da agenda', false);
        }
        if (dateStr === selectedDate) renderAgenda();
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
        if (tx.length >= 2 && ty.length >= 2 && tx[0] === ty[0]) {
            const [menor, maior] = tx.length <= ty.length ? [tx, ty] : [ty, tx];
            const contidos = menor.filter(t => maior.includes(t)).length;
            // um nome contém o outro: automático só com 3+ palavras em comum (2 palavras => pede confirmação)
            if (contidos === menor.length) tok = menor.length >= 3 ? 0.95 : 0.85;
            else if (contidos / menor.length >= 0.67) tok = 0.8;
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
            return g;
        }).sort((a, b) => String(a.fichaEm).localeCompare(String(b.fichaEm)));
    }

    function patientKeyOf(item) {
        return item.pacsPacienteId > 0 ? `p${item.pacsPacienteId}` : `n${normName(item.paciente)}`;
    }

    // Aplica os dados do PACS a uma linha da agenda. Retorna a nova linha.
    function applyPacsToRow(row, g, examIds) {
        const r = { ...row };
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
        return r;
    }

    const PACS_FIELDS = ['status', 'chegouEm', 'atendidoEm', 'tempoEsperaMin', 'pacsPacienteId', 'pacsExameIds', 'pacsAtendimento', 'pacsQtdExames', 'chegadaFonte', 'imagemEm', 'atendidoFonte', 'origem'];
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
                updates.forEach(({ old, neu }) => { byId.set(String(old.id), neu); enqueueUpsert(neu, today); });
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
        persistPacsDecisions();
        updateItem(id, i => ({
            ...i, pacsPacienteId: -pacId, pacsExameIds: null, pacsAtendimento: null, pacsQtdExames: null,
            status: i.origem === 'encaixe_pacs' ? i.status : 'pendente',
            chegouEm: null, chegadaFonte: null, imagemEm: null, atendidoEm: null, atendidoFonte: null, tempoEsperaMin: null
        }));
        syncPacsToday();
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
                url: `${endpointUrl}?key=${encodeURIComponent(apiKey)}`,
                headers: { 'Content-Type': 'application/json' },
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
    // 12. INTERFACE
    // =====================================================================
    // Visualizador de imagens (/viewer): a Agenda fica oculta (só aparece na lista de exames).
    const agEhViewer = () => location.pathname.startsWith('/viewer');
    function agMarcarViewer() { const v = agEhViewer(); if (v !== document.documentElement.hasAttribute('data-ag-viewer')) document.documentElement.toggleAttribute('data-ag-viewer', v); }
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
                    <button id="btnPrintPDF" class="btn-top-action" style="background:#0284c7; color:#fff;">🖨️ Imprimir</button>
                    <button id="btnUploadPrints" class="btn-top-action" style="background:#3b82f6; color:#fff;">📷 Subir Prints</button>
                    <input type="file" id="nativeFileInput" multiple accept="image/*" style="display:none;">
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
                        <div>
                            <label style="font-size:10px; font-weight:700;">🔑 Chave Google Gemini API:</label>
                            <input type="password" id="inputApiKey" placeholder="AIzaSy..." style="width:100%; padding:3px 7px; border-radius:4px; border:1px solid #d97706; font-size:10.5px; box-sizing:border-box;">
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
                    <div style="display:grid; grid-template-columns:60px 145px 1.2fr 1.2fr 30px; gap:4px;">
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
                        <button id="tabDashNuvem" style="background:#334155; color:#cbd5e1; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📈 No-Show 30 dias</button>
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
            $('inputSupabaseKey').value = localStorage.getItem(SUPABASE_KEY_STORAGE) || '';
        };

        $('btnSaveConfig').onclick = () => {
            const gemKey = $('inputApiKey').value.trim();
            const subUrl = sanitizeSupabaseUrl($('inputSupabaseUrl').value);
            const subKey = sanitizeKey($('inputSupabaseKey').value);
            if (gemKey) localStorage.setItem(API_KEY_STORAGE, gemKey);
            if (subUrl) { localStorage.setItem(SUPABASE_URL_STORAGE, subUrl); $('inputSupabaseUrl').value = subUrl; }
            if (subKey) localStorage.setItem(SUPABASE_KEY_STORAGE, subKey);
            pushLegacyLocalOnce();
            errorAlertShown = false;
            alert(`Configurações salvas.\nURL gravada: ${subUrl || '(vazia)'}\n\nAgora clique em 🧪 Testar Conexão.`);
            updateSyncIndicator();
            loadDayFromCloud(selectedDate);
        };

        $('btnTestSupabase').onclick = testSupabaseConnection;
        $('btnPushAllToCloud').onclick = pushAllLocalToCloud;
        $('btnPrevDay').onclick = () => changeDay(-1);
        $('btnNextDay').onclick = () => changeDay(1);
        $('btnToday').onclick = () => setDate(getTodayIso());
        $('nativeDatePicker').onchange = e => { if (e.target.value) setDate(e.target.value); };
        $('btnClearDay').onclick = clearCurrentDay;
        $('headerManha').onclick = () => toggleSection('manha');
        $('headerTarde').onclick = () => toggleSection('tarde');
        $('btnUploadPrints').onclick = () => $('nativeFileInput').click();
        $('nativeFileInput').onchange = handleMultipleUpload;
        $('btnSalvarEncaixe').onclick = handleAddEncaixe;
        ['encHora', 'encPaciente', 'encExame'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleAddEncaixe(); }));
        $('btnOpenDashboard').onclick = openDashboard;
        $('btnPrintPDF').onclick = printPDF;

        const bodyScroll = $('agenda-body-scroll');
        bodyScroll.addEventListener('click', e => {
            const pacsBadge = e.target.closest('[data-action="unlink"]');
            if (pacsBadge) { unlinkPacs(pacsBadge.dataset.id); return; }
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.pacs) { resolvePendente(btn.dataset.pacid, btn.dataset.pacs); return; }
            const act = btn.dataset.action, id = btn.dataset.id;
            if (!act || !id) return;
            if (act === 'chegou') markChegou(id);
            else if (act === 'atendido') markAtendido(id);
            else if (act === 'falta') markFalta(id);
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
    function procCount(item) { return item.pacsQtdExames > 1 ? item.pacsQtdExames : 1; }

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
        else if (item.status === 'cancelado') { bg = isDarkMode ? '#273142' : '#f1f5f9'; tr.style.opacity = '0.6'; tr.title = 'Exame cancelado/removido no PACS (ex.: convênio não autorizou). Use "Chegou" se o paciente voltar.'; }
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
            sla = getSLAClass(w);
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
        if (item.origem === 'encaixe_pacs') badges += `<span class="badge-base badge-enc" title="Encaixe criado automaticamente a partir do PACS">ENCAIXE</span>`;
        if (item.pacsPacienteId > 0) badges += `<span class="badge-base badge-pacs" data-action="unlink" data-id="${escapeHtml(item.id)}" title="Vinculado ao PACS — ficha ${fmtHM(item.chegouEm)}${item.imagemEm ? ', imagens ' + fmtHM(item.imagemEm) : ''}. Clique para desfazer o vínculo.">🔗 ${fmtHM(item.chegouEm)}</span>`;

        const id = escapeHtml(item.id);
        tr.innerHTML = `
            <td style="text-align:center; font-weight:bold;"><div class="editable-cell" contenteditable="true" data-field="hora" data-id="${id}">${escapeHtml(normalizeTime(item.hora))}</div></td>
            <td><span class="badge-base ${bClass}">${escapeHtml(item.convenio)}</span></td>
            <td style="font-weight:600;"><div class="pac-cell"><div class="editable-cell" contenteditable="true" data-field="paciente" data-id="${id}">${escapeHtml(item.paciente)}</div>${badges}</div></td>
            <td style="color:${isDarkMode ? '#94a3b8' : '#475569'};"><div class="editable-cell" contenteditable="true" data-field="exame" data-id="${id}">${escapeHtml(item.exame)}</div></td>
            <td style="text-align:center;"><span class="badge-base ${sla}" style="font-size:9.5px;" title="${tlTitle}">${label}${item.atendidoFonte === 'imagem' ? ' 🩻' : ''}</span></td>
            <td style="text-align:center;">
                <div style="display:flex; gap:2.5px; justify-content:center; align-items:center;">
                    <button class="btn-act btn-chegou" data-action="chegou" data-id="${id}" title="Marcar chegada">${item.status === 'esperando' ? 'Em Espera' : 'Chegou'}</button>
                    <button class="btn-act btn-atend" data-action="atendido" data-id="${id}" title="Finalizar atendimento">Atend</button>
                    <button class="btn-act btn-falta" data-action="falta" data-id="${id}" title="Marcar falta">Falta</button>
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
        const comTempo = atend.filter(i => i.tempoEsperaMin !== null && i.tempoEsperaMin !== undefined && !isNaN(i.tempoEsperaMin));
        const avg = comTempo.length ? Math.round(comTempo.reduce((a, i) => a + i.tempoEsperaMin, 0) / comTempo.length) : null;
        const waits = list.filter(i => i.status === 'esperando').map(i => calcWaitTime(i.chegouEm, null) || 0);
        const a = waits.filter(w => w >= 30 && w < 45).length, l = waits.filter(w => w >= 45 && w < 60).length, v = waits.filter(w => w >= 60).length;
        const stDia = dayStats(list), stReal = dayStats(atend);
        const fichaImg = list.filter(i => i.chegadaFonte === 'pacs' && i.chegouEm && i.imagemEm).map(i => calcWaitTime(i.chegouEm, i.imagemEm));
        const avgFI = fichaImg.length ? Math.round(fichaImg.reduce((x, y) => x + y, 0) / fichaImg.length) : null;
        const encPacs = list.filter(i => i.origem === 'encaixe_pacs').length;

        document.getElementById('contentDashboard').innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px;">
                ${box(tot, 'Linhas na agenda', isDarkMode ? '#f1f5f9' : '#0f172a')}
                ${box(atend.length, 'Atendidos', '#059669')}
                ${box(`${faltas.length} (${taxa}%)`, 'Faltas (No-Show)', '#e11d48')}
                ${box(formatMinutes(avg), 'Tempo Médio Espera', '#2563eb')}
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px;">
                ${box(`${stDia.pacientes} / ${stDia.procedimentos}`, 'Pacientes / Procedimentos (dia)', isDarkMode ? '#f1f5f9' : '#0f172a')}
                ${box(`${stReal.pacientes} / ${stReal.procedimentos}`, 'Realizados (pac. / proc.)', '#059669')}
                ${box(formatMinutes(avgFI), `Ficha → imagem (média, n=${fichaImg.length})`, '#0891b2')}
                ${box(encPacs, 'Encaixes vindos do PACS', '#7c3aed')}
            </div>
            <div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px;">
                <div style="font-weight:bold; font-size:11px; margin-bottom:5px;">🚨 SLA de Espera em Tempo Real</div>
                <div style="display:flex; gap:8px; font-size:10.5px;">
                    <div class="sla-amarelo" style="flex:1; padding:5px 8px; border-radius:5px;"><strong>${a}</strong> alerta (≥ 30 min)</div>
                    <div class="sla-laranja" style="flex:1; padding:5px 8px; border-radius:5px;"><strong>${l}</strong> atenção (≥ 45 min)</div>
                    <div class="sla-vermelho" style="flex:1; padding:5px 8px; border-radius:5px; animation:none;"><strong>${v}</strong> crítico (≥ 60 min)</div>
                </div>
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

    async function renderDashboardNuvemFaltas() {
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

    async function handleMultipleUpload(e) {
        const files = Array.from(e.target.files || []);
        e.target.value = ''; // permite reenviar o mesmo arquivo
        if (!files.length) return;
        const apiKey = localStorage.getItem(API_KEY_STORAGE);
        if (!apiKey) { alert('Clique em ⚙️ API e insira a chave do Gemini primeiro.'); return; }

        const status = document.getElementById('statusLoadingIA');
        status.style.display = 'block';

        const prompt = `Você é um assistente especializado em processar agendas médicas.
REGRA DE INTERPRETAÇÃO:
1. Se o print tem cabeçalho "Sistema de Gerenciamento Hospitalar" / "SPDATA", "tipo": "Hospital/Convênio", e "convenio" é a coluna de convênio (ex: SOCIAL, PARTICULAR, IPSEMG, CASSI, UNIMED SUL MINEIRA, SERPRAM, MEDIC GLOBAL SAUDE, SPA SAUDE).
2. QUALQUER OUTRA TABELA (Planilha Excel, PSF, dias da semana QUA/QUI/SEX/SAB) é "tipo": "Prefeitura" e "convenio": "PREFEITURA".
3. Identifique a data YYYY-MM-DD do print. Se não houver, use "${selectedDate}".
4. OBRIGATÓRIO: Formate o horário SEMPRE com 2 dígitos na hora (formato HH:MM, ex: "07:45", "08:50", "09:00", "09:30", "13:40").
5. EXTRAIA TODAS AS LINHAS. Se o mesmo paciente tiver mais de uma linha (ex.: Abdome Total + Transvaginal), EXTRAIA CADA LINHA SEPARADAMENTE.
6. IGNORE anotações como "VER E-SUS REGULAÇÃO" e foque no nome do paciente e no nome do exame.
7. "periodo": "manha" se hora < 12:00, e "tarde" se hora >= 12:00.

Retorne APENAS um objeto JSON no formato exato:
{
  "data": "YYYY-MM-DD",
  "exames": [
    { "hora": "HH:MM", "tipo": "Prefeitura" ou "Hospital/Convênio", "convenio": "PREFEITURA" ou nome do convênio, "paciente": "NOME DO PACIENTE", "exame": "PROCEDIMENTO", "status": "pendente", "periodo": "manha" ou "tarde" }
  ]
}`;

        try {
            const images = await Promise.all(files.map(compressImageForOCR));
            const payload = { contents: [{ parts: [{ text: prompt }, ...images.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.base64 } }))] }] };
            const data = await callGeminiVision(apiKey, payload);
            const raw = data.candidates[0].content.parts[0].text;
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('A IA não retornou um JSON válido.');
            const parsed = JSON.parse(jsonMatch[0]);

            const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.data || '') ? parsed.data : selectedDate;
            const stamp = Date.now();
            const novos = (parsed.exames || []).filter(x => x && x.paciente).map((x, idx) => ({
                id: 'l' + stamp + '_' + idx,
                hora: normalizeTime(x.hora),
                tipo: x.tipo === 'Prefeitura' ? 'Prefeitura' : 'Hospital/Convênio',
                convenio: normText(x.convenio) || (x.tipo === 'Prefeitura' ? 'PREFEITURA' : 'NÃO INFORMADO'),
                paciente: normText(x.paciente),
                exame: normText(x.exame) || 'NÃO INFORMADO',
                status: 'pendente',
                periodo: periodoFromHora(x.hora),
                chegouEm: null, atendidoEm: null, tempoEsperaMin: null
            }));

            // Dedup por Hora + Paciente + Exame (nunca só por paciente). Existentes preservam status.
            const existing = agendaDatabase[targetDate] || [];
            const seen = new Set(existing.map(naturalKey));
            const added = [];
            novos.forEach(n => { const k = naturalKey(n); if (!seen.has(k)) { seen.add(k); added.push(n); } });
            agendaDatabase[targetDate] = sortPatientsList([...existing, ...added]);
            persistDb();
            added.forEach(n => enqueueUpsert(n, targetDate));

            setDate(targetDate);
            const ok = getSupabaseConfig() ? await flushOutbox(true) : true;
            alert(`✅ ${added.length} novo(s) registro(s) para ${fmtBR(targetDate)} (${novos.length - added.length} já existiam).` +
                (getSupabaseConfig() ? (ok ? '\n☁️ Gravados na nuvem.' : '\n⚠️ Ficaram na fila local — veja o aviso vermelho.') : '\n💾 Somente local (nuvem não configurada).'));
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

    // Puxa alterações feitas em outros computadores a cada 30 s (só com a gaveta aberta)
    setInterval(() => {
        const d = document.getElementById('agenda-drawer-wrapper');
        if (d && d.classList.contains('open') && getSupabaseConfig() && !document.hidden) loadDayFromCloud(selectedDate, true);
    }, POLL_MS);

    // Reenvia fila pendente quando a internet volta
    window.addEventListener('online', () => flushOutbox());

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

    pushLegacyLocalOnce(); // precisa rodar ANTES do initUI (que já lê a nuvem)
    setInterval(initUI, 1500);
    initUI();
    if (outbox.length) flushOutbox();
})();
