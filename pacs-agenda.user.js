// ==UserScript==
// @name         PACS LADI - Agenda Operacional Master
// @namespace    http://tampermonkey.net/
// @version      9.7.1
// @description  Agenda integrada ao PACS (chegada pela hora da ficha, atendimento pela chegada das imagens, encaixe automático, contagem de pacientes/procedimentos), vagas da escala × agenda (com reconstrução do histórico da Prefeitura: planilha × PACS), painel financeiro pela produção, aba de saídas e anotações por paciente, sincronização Supabase blindada (fila offline, URL/chave saneadas, erros visíveis), LOGIN por e-mail/senha (Supabase Auth, sessão renovada sozinha), IA pela nuvem (chaves só no Supabase, com as chaves locais de reserva), TEMPO REAL entre os computadores (Realtime, com polling de reserva), envio forçado de todo o histórico local, Analytics de No-Show e espera pelas views da nuvem, No-Show por convênio e por horário, Dark Mode, Zoom, OCR de prints/PDF com Claude (Gemini reserva), importação automática da planilha da Prefeitura e Consulta de escalas/POPs.
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
        #modalDocs .docs-topo select { font-size: 11px !important; font-weight: 700 !important; border-radius: 4px; padding: 3px 6px !important; background: #ffffff !important; color: #0f172a !important; border: 1px solid #94a3b8 !important; cursor: pointer; -webkit-text-fill-color: #0f172a !important; opacity: 1 !important; }
        #modalDocs .docs-topo select option { background: #ffffff !important; color: #0f172a !important; }
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

        /* v9.6 — anotações (mini-prontuário), saídas, vagas e financeiro */
        .btn-nota { background: transparent; border: 1px solid #cbd5e1; color: #64748b; font-size: 9.5px; padding: 1px 4px; border-radius: 4px; cursor: pointer; line-height: 1.15; }
        .btn-nota.on { background: #fef3c7; border-color: #f59e0b; color: #92400e; font-weight: 800; }
        .nota-cell { font-size: 9.5px; color: #6d28d9; margin-top: 1px; }
        #agenda-drawer-wrapper.dark-mode .btn-nota { border-color: #475569; color: #cbd5e1; }
        #agenda-drawer-wrapper.dark-mode .btn-nota.on { background: #422006; color: #fde68a; border-color: #a16207; }
        #agenda-drawer-wrapper.dark-mode .nota-cell { color: #c4b5fd; }
        #cntSaidasWrap { cursor: pointer; }
        #modalNotas { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 560px; max-width: 95vw; max-height: 88vh; background: #fff; border-radius: 12px; box-shadow: 0 20px 45px rgba(0,0,0,0.7); z-index: 10000008; display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; font-size: 11.5px; }
        #modalNotas.open { display: flex !important; }
        #modalNotas .mn-topo { background: #0f172a; color: #fff; padding: 9px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        #modalNotas .mn-corpo { padding: 10px 12px; overflow-y: auto; flex: 1; }
        #modalNotas .mn-sec { font-weight: 800; font-size: 10px; text-transform: uppercase; color: #64748b; margin: 10px 0 4px; }
        #modalNotas .mn-item { border: 1px solid #e2e8f0; border-radius: 7px; padding: 6px 8px; margin-bottom: 5px; background: #f8fafc; white-space: pre-wrap; }
        #modalNotas .mn-item small { color: #64748b; }
        #modalNotas textarea { width: 100%; box-sizing: border-box; min-height: 64px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font: inherit; resize: vertical; }
        .mn-chip { display: inline-block; border: 1px solid #cbd5e1; background: #fff; color: #334155; border-radius: 999px; padding: 2px 9px; margin: 0 4px 4px 0; font-size: 10.5px; font-weight: 700; cursor: pointer; }
        .mn-chip.on { background: #2563eb; border-color: #2563eb; color: #fff; }
        .mn-chip.saida.on { background: #b45309; border-color: #b45309; }
        .mn-btn { border: none; border-radius: 6px; padding: 6px 12px; font-weight: 800; font-size: 11px; cursor: pointer; }
        #modalNotas.dark-mode, #modalFin.dark-mode { background: #0f172a !important; color: #f1f5f9 !important; border: 1px solid #334155 !important; }
        #modalNotas.dark-mode .mn-item, #modalFin.dark-mode .dash-box { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        #modalNotas.dark-mode textarea { background: #1e293b; color: #f1f5f9; border-color: #475569; }
        #modalNotas.dark-mode .mn-chip:not(.on) { background: #1e293b; color: #cbd5e1; border-color: #475569; }
        #modalFin { position: fixed; inset: 3vh 2.5vw; background: #f8fafc; border-radius: 12px; box-shadow: 0 20px 45px rgba(0,0,0,0.75); z-index: 10000006; display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; font-size: 11.5px; }
        #modalFin.open { display: flex !important; }
        #modalFin .fin-topo { background: #064e3b; color: #fff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
        #modalFin .fin-ctrl { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
        #modalFin .fin-ctrl button { background: #065f46; color: #d1fae5; border: 1px solid #10b981; border-radius: 5px; padding: 3px 9px; font-weight: 800; font-size: 10.5px; cursor: pointer; }
        #modalFin .fin-ctrl button.on { background: #fff; color: #065f46; }
        #modalFin .fin-ctrl select { font-size: 11px !important; font-weight: 700 !important; border-radius: 4px; padding: 3px 6px !important; background: #fff !important; color: #0f172a !important; border: 1px solid #94a3b8 !important; -webkit-text-fill-color: #0f172a !important; }
        #modalFin .fin-corpo { padding: 12px 14px; overflow-y: auto; flex: 1; }
        #modalFin table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        #modalFin th { text-align: right; padding: 3px 6px; color: #64748b; font-size: 9.5px; text-transform: uppercase; }
        #modalFin td { text-align: right; padding: 3px 6px; border-top: 1px solid #f1f5f9; }
        #modalFin th:first-child, #modalFin td:first-child { text-align: left; }
        #modalFin.dark-mode td { border-top-color: #27354a; }
        #modalFin .fin-bar { cursor: default; outline: none; }
        #modalFin .fin-bar:hover > :not(:first-child), #modalFin .fin-bar:focus > :not(:first-child) { opacity: .78; }
        #modalFin .fin-tip { position: absolute; top: 8px; display: none; pointer-events: none; background: #0f172a; color: #f1f5f9; border-radius: 6px; padding: 6px 9px; font-size: 10.5px; line-height: 1.45; box-shadow: 0 6px 16px rgba(0,0,0,.35); min-width: 190px; z-index: 2; }
        #modalFin .fin-tip b { font-variant-numeric: tabular-nums; }
        #modalFin details > summary { cursor: pointer; }
        html[data-ag-viewer] #modalFin, html[data-ag-viewer] #modalNotas { display: none !important; }
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
    let sectionState = { manha: false, tarde: false, saidas: false }; // v9.5: períodos começam recolhidos (abrem no clique); v9.6: saídas
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
            setor: item.setor || null,
            // v9.6 — anotações (mini-prontuário). null = não mexe (o banco mantém o que já existe); [] = apagar.
            notas: Array.isArray(item.notas) ? item.notas : null
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
                    while (outbox.length > 0 && outbox[0].t === 'upsert' && batch.length < 200) {
                        const o = outbox.shift(); confirmadoNaNuvem.delete(o.k);
                        // v9.6 — linha enfileirada pela versão anterior (sem "notas"): o lote do PostgREST exige as mesmas chaves
                        if (o.row && !('notas' in o.row)) o.row = { ...o.row, notas: null };
                        batch.push(o.row);
                    }
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
            setor: r.setor || null,
            notas: Array.isArray(r.notas) && r.notas.length ? r.notas : null
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
            // v9.6 — anotações do encaixe vão para a 1ª linha da agenda do paciente
            if (i === 0 && Array.isArray(enc.notas) && enc.notas.length) n.notas = [...(Array.isArray(a.notas) ? a.notas : []), ...enc.notas];
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
    // v9.5 — Opus 5.5 (esforço médio) é a IA principal; Sonnet 5.5 e Gemini ficam de reserva.
    const CLAUDE_MODEL = 'claude-opus-5-5';
    const CLAUDE_MODELOS = [{ id: 'claude-opus-5-5', nome: 'Claude Opus 5.5' }, { id: 'claude-sonnet-5-5', nome: 'Claude Sonnet 5.5' }];

    function requestClaude(apiKey, content, maxTokens = 16000, modelo = CLAUDE_MODEL) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.anthropic.com/v1/messages',
                headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                data: JSON.stringify(Object.assign({ model: modelo, max_tokens: maxTokens, messages: [{ role: 'user', content }] },
                    modelo === 'claude-opus-5-5' ? { thinking: { type: 'adaptive' }, output_config: { effort: 'medium' } } : {})),
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
                if (ia === 'claude') {
                    // Opus 5.5 (esforço médio) → Sonnet 5.5, pelo proxy da nuvem (mesma chave dos Secrets)
                    for (const m of CLAUDE_MODELOS) {
                        try {
                            const corpo = { acao: 'claude_mensagem', modelo: m.id, max_tokens: 16000, messages: [{ role: 'user', content }] };
                            if (m.id === 'claude-opus-5-5') { corpo.thinking = { type: 'adaptive' }; corpo.output_config = { effort: 'medium' }; }
                            const d = await requestProxyIA(corpo);
                            const texto = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
                            if (!texto) throw new Error('resposta vazia' + (d.stop_reason ? ` (${d.stop_reason})` : ''));
                            iaNuvem.claude = true;
                            return { texto, ia: m.nome + ' ☁️' };
                        } catch (e) {
                            if (e.codigo === 'sem_chave') { iaNuvem.claude = false; break; }
                            erros.push(`${m.nome} (nuvem): ${e.message}`);
                        }
                    }
                } else {
                    try {
                        const d = await requestProxyIA({ acao: 'gemini', parts });
                        iaNuvem.gemini = true;
                        return { texto: d.texto, ia: nome + ' ☁️' };
                    } catch (e) {
                        if (e.codigo === 'sem_chave') iaNuvem.gemini = false;
                        else erros.push(`${nome} (nuvem): ${e.message}`);
                    }
                }
            }
            // 2) chave local deste computador (reserva): Opus → Sonnet
            if (ia === 'claude' && kC) {
                for (const m of CLAUDE_MODELOS) {
                    try { return { texto: await requestClaude(kC, content, 16000, m.id), ia: m.nome }; }
                    catch (e) { erros.push(`${m.nome}: ${e.message}`); }
                }
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
        const mf = document.getElementById('modalFin');
        [drawer, modal, document.getElementById('modalNotas'), mf].forEach(el => el && el.classList.toggle('dark-mode', isDarkMode));
        if (btn) btn.innerHTML = isDarkMode ? '☀️ Claro' : '🌙 Escuro';
        if (mf && mf.classList.contains('open') && typeof finPintar === 'function') finPintar(); // cores do gráfico por tema
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
                <th style="width:150px; text-align:center;">Ações Operacionais</th>
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
                    <button id="btnOpenFin" class="btn-top-action" style="background:#047857; color:#fff;" title="Painel financeiro: repasse pela produção (US e TC) — dia, semana, mês, trimestre, semestre e ano">💰 Financeiro</button>
                    <button id="btnOpenLaudos" class="btn-top-action" style="background:#b45309; color:#fff;" title="Laudos pendentes de US e TC por dia de prazo (enviados pelo PACS Plus)">📝 Laudos</button>
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
                                <label style="font-size:10px; font-weight:700;">🤖 Chave Anthropic (Claude Opus 5.5 · reserva Sonnet 5.5) — IA principal:</label>
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
                        <span id="cntSaidasWrap" title="Saídas: desmarcados, cancelados (PACS/planilha) e quem saiu da planilha sem chegar — clique para ver">🚪 Saídas: <strong id="cntSaidas" style="color:#94a3b8;">0</strong></span>
                    </div>
                </div>

                <div id="statusLoadingIA" style="display:none; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:5px; text-align:center; color:#1d4ed8; font-weight:bold; font-size:10.5px; margin-bottom:6px;">
                    ⏳ A IA está processando os prints e estruturando os horários...
                </div>

                <div class="agenda-card" id="cardManha">
                    <div id="headerManha" style="background:#d97706; color:#fff; padding:5px 8px; font-weight:bold; font-size:10.5px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
                        <span><span id="setaManha" style="display:inline-block; width:12px;">▸</span> ☀️ PERÍODO DA MANHÃ (07:00 – 12:00)</span>
                        <span id="badgeCountManha" style="font-size:9px; background:rgba(0,0,0,0.25); padding:1px 5px; border-radius:6px;">0 pacientes</span>
                    </div>
                    <div id="bodyManha" style="display:none;"><table class="agenda-table">${thead}<tbody id="tbodyNativeManha"></tbody></table></div>
                </div>

                <div class="agenda-card" id="cardTarde">
                    <div id="headerTarde" style="background:#1d4ed8; color:#fff; padding:5px 8px; font-weight:bold; font-size:10.5px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
                        <span><span id="setaTarde" style="display:inline-block; width:12px;">▸</span> 🌤️ PERÍODO DA TARDE (12:00 – 19:00)</span>
                        <span id="badgeCountTarde" style="font-size:9px; background:rgba(0,0,0,0.25); padding:1px 5px; border-radius:6px;">0 pacientes</span>
                    </div>
                    <div id="bodyTarde" style="display:none;"><table class="agenda-table">${thead}<tbody id="tbodyNativeTarde"></tbody></table></div>
                </div>

                <div class="agenda-card" id="cardSaidas" style="display:none;">
                    <div id="headerSaidas" style="background:#64748b; color:#fff; padding:5px 8px; font-weight:bold; font-size:10.5px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;" title="Desmarcados, cancelados (PACS ou planilha) e quem saiu da planilha sem chegar. Se o paciente vier, use “Chegou”: ele volta para a agenda.">
                        <span><span id="setaSaidas" style="display:inline-block; width:12px;">▸</span> 🚪 SAÍDAS — desmarcados, cancelados e “saiu da planilha”</span>
                        <span id="badgeCountSaidas" style="font-size:9px; background:rgba(0,0,0,0.25); padding:1px 5px; border-radius:6px;">0</span>
                    </div>
                    <div id="bodySaidas" style="display:none;"><table class="agenda-table">${thead}<tbody id="tbodyNativeSaidas"></tbody></table></div>
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
                    <span style="font-weight:bold; font-size:12.5px;">📊 Painel Analítico — Faltas, Espera, Produção e Vagas</span>
                    <div style="display:flex; gap:4px;">
                        <button id="tabDashHoje" style="background:#2563eb; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📅 Dia Selecionado</button>
                        <button id="tabDashNuvem" style="background:#334155; color:#cbd5e1; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📊 Analytics (nuvem)</button>
                        <button id="tabDashLaudos" style="background:#334155; color:#cbd5e1; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📝 Laudos pendentes</button>
                        <button id="tabDashProd" style="background:#334155; color:#cbd5e1; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📈 Produção</button>
                        <button id="tabDashVagas" style="background:#334155; color:#cbd5e1; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;" title="Vagas da escala × agendados, encaixes, desfechos e vagas ociosas">🗓️ Vagas</button>
                    </div>
                </div>
                <button id="btnCloseModalDash" style="background:none; border:none; color:#fff; font-size:15px; cursor:pointer;">✕</button>
            </div>
            <div id="contentDashboard" style="padding:14px; overflow-y:auto; font-size:11.5px; flex:1;"></div>`;
        document.body.appendChild(modalDash);

        // v9.6 — anotações por paciente (mini-prontuário)
        const modalNotas = document.createElement('div');
        modalNotas.id = 'modalNotas';
        modalNotas.innerHTML = `<div class="mn-topo"><span id="mnTitulo" style="font-weight:800; font-size:12px;">🗒 Anotações</span><button id="btnFecharNotas" style="background:none; border:none; color:#fff; font-size:15px; cursor:pointer;">✕</button></div><div class="mn-corpo" id="mnCorpo"></div>`;
        document.body.appendChild(modalNotas);

        // v9.6 — 💰 painel financeiro (à parte do Dashboard)
        const modalFin = document.createElement('div');
        modalFin.id = 'modalFin';
        modalFin.innerHTML = `<div class="fin-topo"><span style="font-weight:800; font-size:13px;">💰 Financeiro — repasse pela produção (US e TC)</span>
                <div class="fin-ctrl" id="finCtrl"></div>
                <button id="btnFecharFin" style="background:none; border:none; color:#fff; font-size:16px; cursor:pointer;">✕</button></div>
            <div class="fin-corpo" id="finCorpo"></div>`;
        document.body.appendChild(modalFin);

        // ---- Listeners
        const $ = id => document.getElementById(id);
        $('agenda-close-btn').onclick = closeDrawer;
        $('btnCloseModalDash').onclick = () => modalDash.classList.remove('open');
        $('btnFecharNotas').onclick = fecharNotas;
        $('btnFecharFin').onclick = () => modalFin.classList.remove('open');
        $('btnOpenFin').onclick = abrirFinanceiro;
        $('btnToggleTheme').onclick = toggleTheme;
        $('tabDashHoje').onclick = () => renderDashboardAba(1);
        $('tabDashNuvem').onclick = () => renderDashboardAba(2);
        $('tabDashLaudos').onclick = () => renderDashboardAba(3);
        $('tabDashProd').onclick = () => renderDashboardAba(4);
        $('tabDashVagas').onclick = () => renderDashboardAba(5);
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
        $('headerSaidas').onclick = () => toggleSection('saidas');
        $('cntSaidasWrap').onclick = () => { sectionState.saidas = true; aplicarSecoes(); const c = $('cardSaidas'); if (c && c.style.display !== 'none') c.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
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
        $('btnOpenLaudos').onclick = () => { document.getElementById('modalDashboard').classList.add('open'); renderDashboardAba(3); };
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
            else if (act === 'nota') abrirNotas(id);
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
    // 13B. ANOTAÇÕES POR PACIENTE (v9.6) — mini-prontuário da linha
    // ---------------------------------------------------------------------
    // Lista na própria linha (coluna notas): sincroniza com os outros PCs e o iPhone e nunca entra
    // em relatório (o PDF da agenda mostra só o MOTIVO das saídas, nunca o texto livre). "Saída" registra o motivo e tira o paciente da agenda do período (vai para 🚪 Saídas,
    // status cancelado = vaga liberada). "Voltar para a agenda" desfaz.
    // =====================================================================
    const NOTA_TAGS = ['Intercorrência', 'Saída', 'Preparo', 'Contato', 'Pendência', 'Outra'];
    const SAIDA_MOTIVOS = ['Desmarcou', 'Remanejado', 'Convênio não autorizou', 'Desistiu / foi embora', 'Sem preparo', 'Exame não indicado', 'Duplicado', 'Sem expediente', 'Outro'];
    let notaAtual = { id: null, tag: 'Intercorrência', motivo: null, histHtml: '' };
    const pcRotulo = () => localStorage.getItem('agenda_pc_nome') || ({ MacIntel: 'Mac', Win32: 'PC Windows' }[navigator.platform] || String(navigator.platform || 'PC')).slice(0, 30);
    function fmtNotaData(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return isNaN(d) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${fmtHM(iso)}`;
    }
    const itemPorId = id => (agendaDatabase[selectedDate] || []).find(i => String(i.id) === String(id));

    function abrirNotas(id) {
        const item = itemPorId(id); if (!item) return;
        notaAtual = { id, tag: ehSaida(item) ? 'Saída' : 'Intercorrência', motivo: null, histHtml: getSupabaseConfig() ? 'Carregando…' : 'Nuvem não configurada.' };
        document.getElementById('modalNotas').classList.add('open');
        applyTheme();
        pintarNotas();
        carregarHistoricoNotas(item);
    }
    function fecharNotas() { const m = document.getElementById('modalNotas'); if (m) m.classList.remove('open'); notaAtual.id = null; }

    function pintarNotas() {
        const item = itemPorId(notaAtual.id), corpo = document.getElementById('mnCorpo');
        if (!item || !corpo) { fecharNotas(); return; }
        const txtAntes = (document.getElementById('mnTexto') || {}).value || '';
        document.getElementById('mnTitulo').textContent = `🗒 ${item.paciente}`;
        const notas = notasDe(item), saida = ehSaida(item), ehTagSaida = notaAtual.tag === 'Saída';
        const st = { pendente: 'pendente', esperando: 'em espera', atendido: 'atendido', faltou: 'faltou', cancelado: 'cancelado / desmarcado' }[item.status] || item.status || 'pendente';
        corpo.innerHTML = `
            <div style="color:#64748b;">${escapeHtml(normalizeTime(item.hora))} · ${escapeHtml(item.convenio)} · ${escapeHtml(item.exame)} · <b>${escapeHtml(st)}</b>${saida ? ' · <b style="color:#b45309;">🚪 nas Saídas</b>' : ''}</div>
            <div class="mn-sec">Anotações desta linha (${notas.length})</div>
            ${notas.length ? notas.map((n, k) => `<div class="mn-item"><button data-del="${k}" title="Apagar esta anotação" style="float:right; background:none; border:none; cursor:pointer; color:#94a3b8; font-size:11px;">✕</button><small>${escapeHtml(fmtNotaData(n.em))}${n.por ? ' · ' + escapeHtml(n.por) : ''}</small> <b>${escapeHtml(n.tag || 'Nota')}${n.motivo ? ': ' + escapeHtml(n.motivo) : ''}</b>${n.txt ? `<br>${escapeHtml(n.txt)}` : ''}</div>`).join('') : '<div style="color:#94a3b8;">Nenhuma anotação.</div>'}
            <div class="mn-sec">Nova anotação</div>
            <div>${NOTA_TAGS.map(t => `<span class="mn-chip${t === 'Saída' ? ' saida' : ''}${t === notaAtual.tag ? ' on' : ''}" data-tag="${t}">${t === 'Saída' ? '🚪 ' : ''}${t}</span>`).join('')}</div>
            ${ehTagSaida ? `<div style="margin-top:2px;"><span style="font-size:10px; color:#64748b; margin-right:4px;">Motivo:</span>${SAIDA_MOTIVOS.map(m => `<span class="mn-chip saida${m === notaAtual.motivo ? ' on' : ''}" data-motivo="${m}">${m}</span>`).join('')}</div>` : ''}
            <textarea id="mnTexto" maxlength="1000" placeholder="${ehTagSaida ? 'Detalhe (opcional): quem avisou, nova data…' : 'Ex.: passou mal na espera; trouxe exame anterior; aguardando autorização…'}"></textarea>
            <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; align-items:center;">
                <button class="mn-btn" id="mnSalvar" style="background:${ehTagSaida ? '#b45309' : '#2563eb'}; color:#fff;">${ehTagSaida ? (saida || item.status === 'atendido' ? 'Salvar motivo' : '🚪 Registrar saída') : 'Salvar anotação'}</button>
                ${saida ? '<button class="mn-btn" id="mnVoltar" style="background:#16a34a; color:#fff;" title="Volta para a agenda do período (pendente, ou em espera se já tinha chegado)">↩ Voltar para a agenda</button>' : ''}
                <button class="mn-btn" id="mnFechar" style="background:#e2e8f0; color:#0f172a; margin-left:auto;">Fechar</button>
            </div>
            ${ehTagSaida && !saida && item.status === 'atendido' ? '<div style="color:#b45309; margin-top:4px;">Paciente já atendido: o motivo fica só como anotação (não sai da agenda).</div>' : ''}
            <div class="mn-sec">Outras linhas e dias deste paciente</div>
            <div id="mnHist" style="color:#94a3b8;">${notaAtual.histHtml}</div>
            <div style="color:#94a3b8; font-size:10px; margin-top:8px;">Fica na nuvem (só com login) e aparece nos computadores e no iPhone. Não entra em relatórios; no PDF da agenda sai só o motivo da saída (sem o texto).</div>`;
        const tx = document.getElementById('mnTexto'); tx.value = txtAntes;
        corpo.querySelectorAll('[data-tag]').forEach(c => { c.onclick = () => { notaAtual.tag = c.dataset.tag; if (notaAtual.tag !== 'Saída') notaAtual.motivo = null; pintarNotas(); }; });
        corpo.querySelectorAll('[data-motivo]').forEach(c => { c.onclick = () => { notaAtual.motivo = c.dataset.motivo; pintarNotas(); }; });
        corpo.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => apagarNota(Number(b.dataset.del)); });
        document.getElementById('mnSalvar').onclick = salvarNota;
        const v = document.getElementById('mnVoltar'); if (v) v.onclick = voltarParaAgenda;
        document.getElementById('mnFechar').onclick = fecharNotas;
    }

    function salvarNota() {
        const item = itemPorId(notaAtual.id); if (!item) return;
        const tx = document.getElementById('mnTexto');
        const txt = String((tx && tx.value) || '').replace(/\s+$/g, '').trim().slice(0, 1000);
        const tag = notaAtual.tag, motivo = tag === 'Saída' ? notaAtual.motivo : null;
        if (tag === 'Saída' && !motivo) { alert('Escolha o motivo da saída.'); return; }
        if (tag !== 'Saída' && !txt) { alert('Escreva a anotação.'); return; }
        const entrada = { em: new Date().toISOString(), tag, por: pcRotulo() };
        if (motivo) entrada.motivo = motivo;
        if (txt) entrada.txt = txt;
        updateItem(notaAtual.id, i => {
            const n = { ...i, notas: [...notasDe(i), entrada] };
            // saída de quem não foi atendido: libera a vaga (status cancelado) e vai para 🚪 Saídas
            if (tag === 'Saída' && i.status !== 'atendido') n.status = 'cancelado';
            return n;
        });
        if (tx) tx.value = '';
        notaAtual.tag = 'Intercorrência'; notaAtual.motivo = null;
        pintarNotas();
    }

    function apagarNota(k) {
        if (!confirm('Apagar esta anotação?')) return;
        updateItem(notaAtual.id, i => ({ ...i, notas: notasDe(i).filter((_, j) => j !== k) }));
        pintarNotas();
    }

    function voltarParaAgenda() {
        const entrada = { em: new Date().toISOString(), tag: 'Retorno', txt: 'voltou para a agenda', por: pcRotulo() };
        updateItem(notaAtual.id, i => ({ ...i, status: i.chegouEm ? 'esperando' : 'pendente', removidoOrigemEm: null, notas: [...notasDe(i), entrada] }));
        pintarNotas();
    }

    async function carregarHistoricoNotas(item) {
        if (!getSupabaseConfig()) return;
        const idAberto = notaAtual.id;
        try {
            const nome = normText(item.paciente).replace(/"/g, '');
            const filtro = item.pacsPacienteId > 0 ? `or=${encodeURIComponent(`(pacs_paciente_id.eq.${Number(item.pacsPacienteId)},paciente.eq."${nome}")`)}` : `paciente=eq.${encodeURIComponent(nome)}`;
            const rows = await requestSupabase(`${TABLE}?${filtro}&notas=not.is.null&select=data_agenda,hora,exame,status,notas&order=data_agenda.desc,hora.asc&limit=40`, 'GET');
            const outros = (rows || []).filter(r => Array.isArray(r.notas) && r.notas.length && !(r.data_agenda === selectedDate && normalizeTime(r.hora) === normalizeTime(item.hora) && normText(r.exame) === normText(item.exame)));
            notaAtual.histHtml = outros.length ? outros.map(r => `<div class="mn-item" style="color:inherit;"><small>${fmtBR(r.data_agenda)} ${escapeHtml(normalizeTime(r.hora))} · ${escapeHtml(r.exame)}</small>${r.notas.map(n => `<br><b>${escapeHtml(n.tag || 'Nota')}${n.motivo ? ': ' + escapeHtml(n.motivo) : ''}</b>${n.txt ? ' — ' + escapeHtml(n.txt) : ''}`).join('')}</div>`).join('') : 'Nenhuma anotação em outras linhas ou dias.';
        } catch (e) { notaAtual.histHtml = 'Não consegui ler o histórico: ' + escapeHtml(e.message || String(e)); }
        if (notaAtual.id !== idAberto) return;
        const el = document.getElementById('mnHist'); if (el) el.innerHTML = notaAtual.histHtml;
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
        aplicarSecoes();
    }
    function aplicarSecoes() {
        const ids = { manha: ['bodyManha', 'setaManha'], tarde: ['bodyTarde', 'setaTarde'], saidas: ['bodySaidas', 'setaSaidas'] };
        Object.entries(ids).forEach(([p, [bid, sid]]) => {
            const b = document.getElementById(bid), s = document.getElementById(sid);
            if (b) b.style.display = sectionState[p] ? 'block' : 'none';
            if (s) s.textContent = sectionState[p] ? '▾' : '▸';
        });
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

    // v9.6 — "Saídas": desmarcado/cancelado (PACS, planilha da Prefeitura ou à mão) ou que saiu da origem
    // (planilha/PDF) sem ter chegado. Ficam numa seção própria, recolhida. Se o paciente vier, "Chegou"
    // muda o status e ele volta para a agenda do período.
    const ehSaida = i => i.status === 'cancelado' || (!!i.removidoOrigemEm && (!i.status || i.status === 'pendente'));
    const notasDe = i => (Array.isArray(i && i.notas) ? i.notas : []);

    function renderAgenda() {
        const tbM = document.getElementById('tbodyNativeManha');
        const tbT = document.getElementById('tbodyNativeTarde');
        if (!tbM || !tbT) return;
        // não redesenha enquanto o usuário edita uma célula (evita perder digitação)
        const ae = document.activeElement;
        if (ae && ae.classList && ae.classList.contains('editable-cell')) return;

        const list = sortPatientsList(agendaDatabase[selectedDate] || []);
        list.forEach(i => { i.periodo = periodoFromHora(i.hora); });
        const ativos = list.filter(i => !ehSaida(i)), saidas = list.filter(ehSaida);
        const count = s => ativos.filter(i => i.status === s).length;
        const st = dayStats(ativos);
        document.getElementById('cntPacientes').innerText = st.pacientes;
        document.getElementById('cntProc').innerText = st.procedimentos;
        // procedimentos por paciente (para o selo ×N) — só quem está na agenda
        currentProcByPatient = {};
        ativos.forEach(i => { const k = patientKeyOf(i); currentProcByPatient[k] = (currentProcByPatient[k] || 0) + procCount(i); });
        document.getElementById('cntPendente').innerText = count('pendente');
        document.getElementById('cntEsperando').innerText = count('esperando');
        document.getElementById('cntAtendido').innerText = count('atendido');
        document.getElementById('cntFaltou').innerText = count('faltou');
        document.getElementById('cntSaidas').innerText = saidas.length;

        const m = ativos.filter(i => i.periodo === 'manha');
        const t = ativos.filter(i => i.periodo === 'tarde');
        const sm = dayStats(m), stt = dayStats(t);
        document.getElementById('badgeCountManha').innerText = `${sm.pacientes} pacientes · ${sm.procedimentos} proc.`;
        document.getElementById('badgeCountTarde').innerText = `${stt.pacientes} pacientes · ${stt.procedimentos} proc.`;
        tbM.innerHTML = '';
        tbT.innerHTML = '';
        m.forEach(i => tbM.appendChild(createRow(i)));
        t.forEach(i => tbT.appendChild(createRow(i)));
        const tbS = document.getElementById('tbodyNativeSaidas'), cardS = document.getElementById('cardSaidas'), bS = document.getElementById('badgeCountSaidas');
        if (tbS) { tbS.innerHTML = ''; saidas.forEach(i => tbS.appendChild(createRow(i))); }
        if (cardS) cardS.style.display = saidas.length ? '' : 'none';
        if (bS) bS.innerText = `${new Set(saidas.map(patientKeyOf)).size} paciente(s) · ${saidas.length} linha(s)`;
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
            label = notasDe(item).some(n => n.tag === 'Saída') ? 'DESMARCADO' : 'CANCELADO';
            sla = 'sla-normal';
        } else if (ehSaida(item)) {
            label = 'SAIU';
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
        // v9.6 — anotações: botão discreto 🗒 (destacado quando há nota); na seção Saídas, o motivo aparece sob o exame
        const notas = notasDe(item), ultNota = notas[notas.length - 1];
        const notaTit = ultNota ? `${fmtNotaData(ultNota.em)} · ${ultNota.tag || 'Nota'}${ultNota.motivo ? ': ' + ultNota.motivo : ''}${ultNota.txt ? ' — ' + ultNota.txt : ''}${notas.length > 1 ? ` (+${notas.length - 1})` : ''}` : 'Anotações do paciente: intercorrência, motivo da saída, preparo, contato…';
        const saidaNota = ehSaida(item) ? [...notas].reverse().find(n => n.tag === 'Saída') : null;
        tr.innerHTML = `
            <td style="text-align:center; font-weight:bold;"><div class="editable-cell" contenteditable="true" data-field="hora" data-id="${id}">${escapeHtml(normalizeTime(item.hora))}</div></td>
            <td><span class="badge-base ${bClass}">${escapeHtml(item.convenio)}</span></td>
            <td style="font-weight:600;"><div class="pac-cell"><div class="editable-cell" contenteditable="true" data-field="paciente" data-id="${id}">${escapeHtml(item.paciente)}</div>${badges}</div></td>
            <td style="color:${isDarkMode ? '#94a3b8' : '#475569'};"><div class="editable-cell" contenteditable="true" data-field="exame" data-id="${id}">${escapeHtml(item.exame)}</div>${item.obs ? `<div class="obs-cell" title="Observação da origem">📝 ${escapeHtml(item.obs)}</div>` : ''}${saidaNota ? `<div class="nota-cell" title="Motivo registrado em ${escapeHtml(fmtNotaData(saidaNota.em))}">🚪 ${escapeHtml([saidaNota.motivo, saidaNota.txt].filter(Boolean).join(' — '))}</div>` : ''}</td>
            <td style="text-align:center;"><span class="badge-base ${sla}" style="font-size:9.5px;" title="${tlTitle}">${label}${item.atendidoFonte === 'imagem' ? ' 🩻' : ''}</span></td>
            <td style="text-align:center;">
                <div style="display:flex; gap:2.5px; justify-content:center; align-items:center;">
                    <button class="btn-act btn-chegou" data-action="chegou" data-id="${id}" title="Marcar chegada">${item.status === 'esperando' ? 'Em Espera' : 'Chegou'}</button>
                    <button class="btn-act btn-atend" data-action="atendido" data-id="${id}" title="Finalizar atendimento">Atend</button>
                    <button class="btn-act btn-falta" data-action="falta" data-id="${id}" title="Marcar falta">Falta</button>
                    <button class="btn-act btn-urg${urgEfetivo(item) ? ' on' : ''}" data-action="urgente" data-id="${id}" title="${urgEfetivo(item) ? 'Retirar urgência' : 'Marcar como urgência'}">🚨</button>
                    <button class="btn-nota${notas.length ? ' on' : ''}" data-action="nota" data-id="${id}" title="${escapeHtml(notaTit)}">🗒${notas.length ? notas.length : ''}</button>
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
        const bs = ['tabDashHoje', 'tabDashNuvem', 'tabDashLaudos', 'tabDashProd', 'tabDashVagas'].map(i => document.getElementById(i));
        const on = b => { b.style.background = '#2563eb'; b.style.color = '#fff'; };
        const off = b => { b.style.background = '#334155'; b.style.color = '#cbd5e1'; };
        bs.forEach((b, i) => b && (i === n - 1 ? on(b) : off(b)));
        if (n === 1) renderDashboardHoje(); else if (n === 2) renderDashboardNuvemFaltas(); else if (n === 3) renderLaudosPendentes(); else if (n === 4) renderProducao(); else renderVagas();
    }

    // v9.4 — 📝 Laudos pendentes (US e TC) — tabela laudos_pendentes, alimentada pelo PACS Plus 1.37+ (só números/datas)
    async function renderLaudosPendentes() {
        const content = document.getElementById('contentDashboard');
        if (!getSupabaseConfig()) { content.innerHTML = '<div style="padding:20px; color:#f59e0b;">Configure a nuvem (⚙️ API) e faça login para ver os laudos pendentes.</div>'; return; }
        content.innerHTML = '<div style="text-align:center; padding:30px; color:#60a5fa;">⏳ Carregando laudos pendentes...</div>';
        try {
            const rows = await requestSupabase('laudos_pendentes?select=*', 'GET');
            const dm = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : '—'; };
            const sem = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(+m[1], m[2] - 1, +m[3]).getDay()] : ''; };
            const hojeK = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
            const bloco = m => {
                const r = (rows || []).find(x => x.modalidade === m), nome = m === 'US' ? '🔊 Ultrassom' : '🩻 Tomografia';
                if (!r) return `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;"><b>${nome}</b><div style="color:#64748b; margin-top:6px;">Sem dados ainda — abra o PACS com o PACS Plus 1.37+ em algum computador.</div></div>`;
                const idade = Math.round((Date.now() - new Date(r.atualizado_em).getTime()) / 60000);
                const linhas = (r.por_dia || []).map(e => {
                    const venc = e.venc || e.prazo < hojeK, hoje = !venc && e.prazo === hojeK;
                    return `<tr style="${venc ? 'background:#fee2e2; color:#991b1b; font-weight:bold;' : hoje ? 'background:#fef3c7; color:#92400e; font-weight:bold;' : ''}"><td style="padding:3px 6px;">${venc ? '⚠ venceu' : hoje ? 'vence HOJE' : 'vence'} ${sem(e.prazo)} ${dm(e.prazo)}</td><td style="padding:3px 6px; text-align:right;">${e.n}</td><td style="padding:3px 6px; text-align:right; color:#64748b;">${e.rev || 0} / ${e.dig || 0}</td><td style="padding:3px 6px; color:#64748b;">${dm(e.d0)}${e.d1 && e.d1 !== e.d0 ? '–' + dm(e.d1) : ''}</td></tr>`;
                }).join('');
                return `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
                    <div style="display:flex; gap:10px; align-items:baseline; margin-bottom:6px;"><b style="font-size:12.5px;">${nome}</b><span style="font-size:18px; font-weight:bold;">${r.total}</span><span style="color:#64748b;">pendente(s)</span>${r.vencidos ? `<span style="color:#dc2626; font-weight:bold;">⚠ ${r.vencidos} vencido(s)</span>` : ''}${r.hoje ? `<span style="color:#d97706; font-weight:bold;">${r.hoje} vence(m) hoje</span>` : ''}<span style="margin-left:auto; color:${idade > 30 ? '#dc2626' : '#94a3b8'}; font-size:10px;">atualizado há ${idade < 1 ? 'menos de 1' : idade} min${r.pc ? ' · ' + escapeHtml(r.pc) : ''}</span></div>
                    ${linhas ? `<table style="width:100%; border-collapse:collapse; font-size:10.5px;"><tr style="color:#64748b; font-size:9.5px; text-transform:uppercase;"><th style="text-align:left; padding:3px 6px;">Prazo</th><th style="text-align:right; padding:3px 6px;">Laudos</th><th style="text-align:right; padding:3px 6px;">Revisar / Digitado</th><th style="text-align:left; padding:3px 6px;">Data dos exames</th></tr>${linhas}</table>` : '<div style="color:#16a34a;">Nenhum laudo pendente ✓</div>'}</div>`;
            };
            content.innerHTML = bloco('US') + bloco('CT') + '<div style="color:#94a3b8; font-size:10px;">Revisar + Digitado · eletivos (sem urgentes) · prazo US 3 / TC 5 dias úteis · atualiza a cada 10 min enquanto algum computador estiver com o PACS aberto · para filtrar, use 📝 na barra do PACS.</div>';
        } catch (err) {
            content.innerHTML = `<div style="padding:20px; color:#dc2626;">Não consegui ler os laudos pendentes: ${escapeHtml(err.message || String(err))}</div>`;
        }
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

    // =====================================================================
    // 16B. ANALYTICS POR PERÍODO (v9.5) — função analytics_periodo do banco
    // ---------------------------------------------------------------------
    // Mês a mês (para a direção), últimos 30 ou 90 dias. Faltas = só pacientes AGENDADOS
    // (encaixe e SUS/urgência não "faltam"). Espera por categoria; SUS hospitalar/urgência
    // sempre em conta à parte (feito quando o quadro permite, fora do SLA dos eletivos).
    // =====================================================================
    const CAT_NOME = { convenio_particular: 'Convênio / Particular / Social', prefeitura: 'Prefeitura (agendados)', encaixe: 'Encaixes (fora da agenda)', sus_urgencia: 'SUS hospitalar / urgência' };
    const MES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    let anPeriodo = '30d', anUltimo = null, anIA = null;
    const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const mesNomeAno = m => { const [y, mo] = m.split('-').map(Number); return `${MES_NOME[mo - 1]}/${y}`; };
    function mesesRecentes(n) {
        const out = [], d = new Date(); d.setDate(1);
        for (let i = 0; i < n; i++) { out.push(isoDe(d).slice(0, 7)); d.setMonth(d.getMonth() - 1); }
        return out;
    }
    function periodoDatas(p) {
        const hoje = new Date(), ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
        if (p === '30d' || p === '90d') {
            const n = p === '30d' ? 30 : 90, ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);
            return { ini: isoDe(ini), fim: isoDe(ontem), rotulo: `últimos ${n} dias (${fmtBR(isoDe(ini))} a ${fmtBR(isoDe(ontem))})`, curto: `${n} dias` };
        }
        const [y, m] = p.split('-').map(Number), ult = new Date(y, m, 0);
        const fim = ult < ontem ? ult : ontem, emCurso = ult >= ontem;
        return { ini: `${p}-01`, fim: isoDe(fim), rotulo: `${mesNomeAno(p)}${emCurso ? ` (até ${fmtBR(isoDe(fim))}, mês em curso)` : ''}`, curto: mesNomeAno(p) };
    }
    function anSeletor(id, atual) {
        const ops = [['30d', 'Últimos 30 dias'], ['90d', 'Últimos 90 dias'], ...mesesRecentes(12).map(m => [m, `Mês: ${mesNomeAno(m)}`])];
        return `<select id="${id}" style="font-size:11px; font-weight:700; padding:3px 6px; border-radius:4px; border:1px solid #94a3b8; background:#fff; color:#0f172a;">${ops.map(([v, t]) => `<option value="${v}" ${v === atual ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    }
    const espLinha = e => e ? `<td style="padding:3px 6px; text-align:right;">${e.atendidos}</td><td style="padding:3px 6px; text-align:right;">${e.com_tempo}</td><td style="padding:3px 6px; text-align:right;">${formatMinutes(e.media)}</td><td style="padding:3px 6px; text-align:right; font-weight:700;">${formatMinutes(e.mediana)}</td><td style="padding:3px 6px; text-align:right;">${formatMinutes(e.p90)}</td><td style="padding:3px 6px; text-align:right;">${e.acima_60}${e.com_tempo ? ` (${Math.round(e.acima_60 / e.com_tempo * 100)}%)` : ''}</td>`
        : '<td colspan="6" style="padding:3px 6px; color:#94a3b8;">sem atendimentos no período</td>';
    function anEletivos(r) { // média ponderada das duas categorias agendadas
        const es = (r.espera || []).filter(e => e.cat === 'convenio_particular' || e.cat === 'prefeitura');
        const n = es.reduce((a, e) => a + (e.com_tempo || 0), 0);
        return { n, media: n ? Math.round(es.reduce((a, e) => a + (e.media || 0) * (e.com_tempo || 0), 0) / n) : null, acima: es.reduce((a, e) => a + (e.acima_60 || 0), 0) };
    }

    async function renderDashboardNuvemFaltas() {
        const content = document.getElementById('contentDashboard');
        if (!getSupabaseConfig()) return renderDashboardNuvemFaltasLegado();
        content.innerHTML = `<div style="text-align:center; padding:30px; color:#60a5fa;">⏳ Carregando Analytics da nuvem...</div>`;
        const per = periodoDatas(anPeriodo);
        try {
            await flushOutbox();
            const r = await requestSupabase('rpc/analytics_periodo', 'POST', { p_ini: per.ini, p_fim: per.fim });
            const m0 = new Date(); m0.setMonth(m0.getMonth() - 5); m0.setDate(1);
            const urgM = await requestSupabase(`vw_urgencias_mes?select=*&mes=gte.${isoDe(m0)}&order=mes.desc`, 'GET').catch(() => []);
            if (anUltimo && anUltimo.periodo !== anPeriodo) anIA = null;
            anUltimo = { r, per, periodo: anPeriodo, urgM };
            const el = anEletivos(r);
            const espMap = Object.fromEntries((r.espera || []).map(e => [e.cat, e]));
            const rowsCat = (r.por_categoria || []).map(c => ({ k: CAT_NOME[c.cat] || c.cat, faltas: c.faltas, total: c.pacientes, pct: c.taxa }));
            const rowsConv = (r.noshow_convenio || []).map(c => ({ k: c.convenio, faltas: c.faltas, total: c.pacientes, pct: c.taxa, extra: c.perdidos ? `−${c.perdidos} proc.` : '' }));
            const rowsHora = (r.noshow_horario || []).map(c => ({ k: `${String(c.faixa || '').slice(0, 2)}h (${c.periodo || ''})`, faltas: c.faltas, total: c.agendados, pct: c.taxa }));
            const rowsDia = (r.noshow_dia || []).map(c => ({ k: c.dia, faltas: c.faltas, total: c.agendados, pct: c.taxa }));
            const pctUrg = r.atendidos_pacientes ? Math.round(r.urgencias_pacientes / r.atendidos_pacientes * 1000) / 10 : 0;
            const sus = espMap.sus_urgencia;
            content.innerHTML = `
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                    <b style="font-size:11.5px;">Período:</b> ${anSeletor('anPeriodoSel', anPeriodo)}
                    <span style="color:#64748b; font-size:10.5px;">${escapeHtml(per.rotulo)}</span>
                    <span style="margin-left:auto; display:flex; gap:6px;">
                        <button id="btnAnIA" class="btn-top-action" style="background:#7c3aed; color:#fff;" title="Resumo e sugestões de ações com o Claude Opus 5.5 (só números agregados, sem pacientes)">🧠 Análise (Opus)</button>
                        <button id="btnAnRel" class="btn-top-action" style="background:#0284c7; color:#fff;" title="Relatório do período para imprimir/salvar em PDF (direção)">🖨️ Relatório</button>
                    </span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:6px;">
                    ${box(r.agendados, 'Pacientes agendados com desfecho', isDarkMode ? '#f1f5f9' : '#0f172a')}
                    ${box(`${r.faltas} (${r.taxa ?? 0}%)`, 'Faltas (No-Show)', '#e11d48')}
                    ${box(r.perdidos, 'Procedimentos perdidos', '#f59e0b')}
                    ${box(formatMinutes(el.media), `Espera média — agendados (${el.acima} > 60 min)`, '#2563eb')}
                </div>
                <div style="font-size:10px; color:#94a3b8; margin-bottom:10px;">Faltas contadas por paciente/dia, só entre <b>agendados</b> (encaixes e SUS/urgência não entram). ${r.pendentes_sem_desfecho ? `⚠ ${r.pendentes_sem_desfecho} linha(s) do período ainda sem desfecho (pendente/em espera) ficaram fora. ` : ''}Calculado no banco — mesmo resultado nos 3 computadores e no iPhone.</div>
                <div id="anIABox">${anIA ? anIAHtml(anIA) : ''}</div>
                ${barrasHtml(rowsCat, '📊 Faltas por categoria')}
                ${barrasHtml(rowsConv, '📊 Faltas por convênio / setor', 'Nomes padronizados. Cinza = menos de 5 pacientes.')}
                ${barrasHtml(rowsHora, '🕒 Faltas por faixa horária (por exame)')}
                ${barrasHtml(rowsDia, '📅 Faltas por dia da semana (por exame)')}
                <div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
                    <div style="font-weight:bold; font-size:11.5px; margin-bottom:4px;">⏱ Tempo de espera por categoria (chegada → atendimento)</div>
                    <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
                        <tr style="color:#64748b; font-size:9.5px; text-transform:uppercase;"><th style="text-align:left; padding:3px 6px;">Categoria</th><th style="text-align:right; padding:3px 6px;">Atendidos</th><th style="text-align:right; padding:3px 6px;">Com tempo</th><th style="text-align:right; padding:3px 6px;">Média</th><th style="text-align:right; padding:3px 6px;">Mediana</th><th style="text-align:right; padding:3px 6px;">90% até</th><th style="text-align:right; padding:3px 6px;">&gt; 60 min</th></tr>
                        ${['convenio_particular', 'prefeitura', 'encaixe'].map(c => `<tr><td style="padding:3px 6px; font-weight:700;">${CAT_NOME[c]}</td>${espLinha(espMap[c])}</tr>`).join('')}
                        <tr><td colspan="7" style="padding:6px 6px 2px; font-size:9.5px; color:#94a3b8; text-transform:uppercase;">Conta à parte — não entra na média nem no SLA</td></tr>
                        <tr style="color:#7c3aed;"><td style="padding:3px 6px; font-weight:700;">🚨 ${CAT_NOME.sus_urgencia} <span style="font-weight:400;">(ficha → exame)</span></td>${espLinha(sus)}</tr>
                    </table>
                    <div style="font-size:9.5px; color:#94a3b8; margin-top:4px;">Mediana = metade dos pacientes esperou até esse tempo (menos sensível a casos extremos). Tempos acima de 12 h (24 h no SUS/urgência) são erro de registro e ficam fora.</div>
                </div>
                <div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
                    <div style="font-weight:bold; font-size:11.5px; margin-bottom:4px;">🚨 Urgências (exames realizados no período)</div>
                    <div style="font-size:11px;"><b>${r.urgencias_pacientes}</b> de ${r.atendidos_pacientes} pacientes atendidos (<b>${pctUrg}%</b>) · ${r.urgencias_procedimentos} procedimento(s)</div>
                    <div style="font-size:10px; color:#475569; margin-top:4px;">${(r.urgencias_setor || []).map(x => `${escapeHtml(x.setor)}: <b>${x.pacientes}</b>`).join(' · ') || '—'}</div>
                    ${(urgM || []).length ? `<div style="font-size:10px; color:#64748b; margin-top:6px;">Por mês: ${urgM.map(u => `${mesNomeAno(String(u.mes).slice(0, 7))} ${u.pacientes_urgencia}/${u.pacientes} (${u.pct_pacientes_urgencia ?? 0}%)`).join(' · ')}</div>` : ''}
                </div>`;
            document.getElementById('anPeriodoSel').onchange = e => { anPeriodo = e.target.value; anIA = null; renderDashboardNuvemFaltas(); };
            document.getElementById('btnAnRel').onclick = relatorioAnalytics;
            document.getElementById('btnAnIA').onclick = analiseIAAnalytics;
        } catch (err) {
            if (err.status === 404 || err.status === 400) return renderDashboardNuvemFaltasLegado();
            if (err.status !== undefined) reportCloudError(err, 'Analytics', false);
            else console.error('[Agenda Analytics]', err);
            content.innerHTML = `<div style="text-align:center; padding:20px; color:#e11d48;">Erro ao buscar dados na nuvem:<br>${escapeHtml(err.message)}</div>`;
        }
    }

    function anIAHtml(txt) {
        return `<div class="dash-box" style="background:#f5f3ff; border:1px solid #c4b5fd; border-radius:7px; padding:10px; margin-bottom:10px; white-space:pre-wrap; font-size:11px; color:#1e1b4b;"><b>🧠 Análise (Claude Opus 5.5)</b>\n${escapeHtml(txt)}</div>`;
    }
    function anResumoParaIA(a) { // SÓ números agregados — sem nome, data de nascimento ou prontuário
        const r = a.r;
        return JSON.stringify({ periodo: a.per.rotulo, agendados: r.agendados, faltas: r.faltas, taxa_faltas_pct: r.taxa, procedimentos_perdidos: r.perdidos,
            faltas_por_categoria: r.por_categoria, faltas_por_convenio: (r.noshow_convenio || []).slice(0, 15), faltas_por_faixa_horaria: r.noshow_horario,
            faltas_por_dia_semana: r.noshow_dia, espera_por_categoria_min: r.espera, urgencias: { pacientes: r.urgencias_pacientes, de_atendidos: r.atendidos_pacientes, por_setor: r.urgencias_setor } });
    }
    async function analiseIAAnalytics() {
        if (!anUltimo) return;
        const box = document.getElementById('anIABox'), btn = document.getElementById('btnAnIA');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Analisando…'; }
        try {
            const prompt = `Você é consultor de gestão de um serviço de ultrassonografia hospitalar (HAMC/LADI, Santa Rita do Sapucaí-MG). ` +
                `Abaixo, indicadores agregados do período (JSON). Escreva em português do Brasil, sem markdown, no máximo 220 palavras, para apresentar à direção:\n` +
                `1) Resumo (3 frases) com os números principais (taxa de faltas, procedimentos perdidos, espera dos agendados; urgências à parte).\n` +
                `2) Onde estão as faltas (convênio/categoria, faixa horária, dia) — só o que os números sustentam; amostras < 5 não valem conclusão.\n` +
                `3) 3 a 5 ações práticas e mensuráveis (ex.: confirmação ativa na véspera, overbooking controlado em faixas com mais faltas, lista de espera).\n` +
                `Não invente dados.\n\nDADOS:\n${anResumoParaIA(anUltimo)}`;
            const { texto, ia } = await chamarIA({ prompt });
            anIA = `${texto.trim()}\n\n— ${ia}`;
            if (box) box.innerHTML = anIAHtml(anIA);
        } catch (e) { alert('Não consegui gerar a análise:\n' + e.message); }
        finally { if (btn) { btn.disabled = false; btn.textContent = '🧠 Análise (Opus)'; } }
    }

    function janelaRelatorio(titulo, corpo) {
        const win = window.open('', '_blank');
        if (!win) { alert('O navegador bloqueou a janela do relatório. Libere pop-ups para pacs.ladi.org.br.'); return; }
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>
            <style>body{font-family:Arial,sans-serif;font-size:9.5pt;color:#111;margin:12mm}h1{font-size:15pt;margin:0 0 2px;color:#1e3a8a}h2{font-size:11pt;margin:14px 0 4px;color:#1e3a8a;border-bottom:1.5px solid #1e3a8a;padding-bottom:2px}
            .meta{font-size:8.5pt;color:#555;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin:4px 0 8px}th,td{border:1px solid #bbb;padding:3px 6px;font-size:8.8pt;text-align:left}th{background:#f1f5f9}td.n,th.n{text-align:right}
            .kpis{display:flex;gap:8px;margin:6px 0}.kpi{flex:1;border:1px solid #bbb;border-radius:6px;padding:6px;text-align:center}.kpi b{display:block;font-size:13pt}.ia{white-space:pre-wrap;border:1px solid #c4b5fd;background:#f5f3ff;padding:8px;border-radius:6px}
            .rod{margin-top:14px;font-size:7.5pt;color:#777;border-top:1px solid #ccc;padding-top:4px}</style></head><body>${corpo}
            <div class="rod">Dr. Gabriel Gaspar · CRM-MG 69.042 · RQE 51.492 · Responsável Técnico — Serviço de Diagnóstico por Imagem HAMC/LADI · gerado em ${new Date().toLocaleString('pt-BR')} · números agregados, sem identificação de pacientes</div></body></html>`);
        win.document.close(); win.focus(); setTimeout(() => win.print(), 400);
    }
    function relatorioAnalytics() {
        if (!anUltimo) return;
        const { r, per } = anUltimo, el = anEletivos(r);
        const tab = (head, rows) => `<table><tr>${head.map((h, i) => `<th class="${i ? 'n' : ''}">${h}</th>`).join('')}</tr>${rows.map(l => `<tr>${l.map((c, i) => `<td class="${i ? 'n' : ''}">${escapeHtml(String(c ?? '—'))}</td>`).join('')}</tr>`).join('')}</table>`;
        const espMap = Object.fromEntries((r.espera || []).map(e => [e.cat, e]));
        const espRow = c => { const e = espMap[c]; return [CAT_NOME[c], e ? e.atendidos : 0, e ? e.com_tempo : 0, formatMinutes(e && e.media), formatMinutes(e && e.mediana), formatMinutes(e && e.p90), e ? e.acima_60 : 0]; };
        const corpo = `<h1>Ultrassonografia — Faltas, espera e urgências</h1><div class="meta">Período: <b>${escapeHtml(per.rotulo)}</b> · HAMC/LADI</div>
            <div class="kpis"><div class="kpi"><b>${r.agendados}</b>agendados com desfecho</div><div class="kpi"><b>${r.faltas} (${r.taxa ?? 0}%)</b>faltas</div><div class="kpi"><b>${r.perdidos}</b>procedimentos perdidos</div><div class="kpi"><b>${formatMinutes(el.media)}</b>espera média (agendados)</div><div class="kpi"><b>${r.urgencias_pacientes}</b>urgências realizadas</div></div>
            ${anIA ? `<h2>Análise e ações sugeridas</h2><div class="ia">${escapeHtml(anIA)}</div>` : ''}
            <h2>Faltas por categoria</h2>${tab(['Categoria', 'Pacientes', 'Faltas', '%'], (r.por_categoria || []).map(c => [CAT_NOME[c.cat] || c.cat, c.pacientes, c.faltas, `${c.taxa ?? 0}%`]))}
            <h2>Faltas por convênio / setor</h2>${tab(['Convênio', 'Pacientes', 'Faltas', '%', 'Proc. perdidos'], (r.noshow_convenio || []).map(c => [c.convenio, c.pacientes, c.faltas, `${c.taxa ?? 0}%`, c.perdidos]))}
            <h2>Faltas por faixa horária</h2>${tab(['Faixa', 'Agendados', 'Faltas', '%'], (r.noshow_horario || []).map(c => [`${String(c.faixa).slice(0, 2)}h (${c.periodo})`, c.agendados, c.faltas, `${c.taxa ?? 0}%`]))}
            <h2>Faltas por dia da semana</h2>${tab(['Dia', 'Agendados', 'Faltas', '%'], (r.noshow_dia || []).map(c => [c.dia, c.agendados, c.faltas, `${c.taxa ?? 0}%`]))}
            <h2>Tempo de espera (chegada → atendimento)</h2>${tab(['Categoria', 'Atendidos', 'Com tempo', 'Média', 'Mediana', '90% até', '> 60 min'], ['convenio_particular', 'prefeitura', 'encaixe', 'sus_urgencia'].map(espRow))}
            <div class="meta">SUS hospitalar / urgência: conta à parte (ficha → exame), feito quando o quadro clínico permite — não entra na média dos agendados.</div>
            <h2>Urgências realizadas</h2><div>${r.urgencias_pacientes} de ${r.atendidos_pacientes} pacientes atendidos (${r.atendidos_pacientes ? Math.round(r.urgencias_pacientes / r.atendidos_pacientes * 1000) / 10 : 0}%) · ${r.urgencias_procedimentos} procedimentos</div>
            ${tab(['Setor', 'Pacientes'], (r.urgencias_setor || []).map(x => [x.setor, x.pacientes]))}
            <div class="meta">Faltas: contadas por paciente/dia, somente entre pacientes agendados (encaixes e SUS/urgência não entram). Fonte: Agenda US (Supabase), mesma base do iPhone e dos 3 computadores.</div>`;
        janelaRelatorio(`Faltas e espera US — ${per.curto}`, corpo);
    }

    // =====================================================================
    // 16C. 📈 PRODUÇÃO MENSAL (v9.5) — US e TC lidos do PACS
    // ---------------------------------------------------------------------
    // Mês = data do exame (igual ao filtro do relatório do PACS). Meus = usu_codigo_radiologista
    // do exame igual ao usuário logado no PACS (token). Pendentes "meus": não liberados e
    // (atribuídos a mim, ou sem radiologista em situação de laudo: US qualquer; TC fora de ABERTO).
    // Tempo exame → laudo: imagem no PACS (ou ficha) → última atualização do exame liberado
    // (exa_updated — a API não expõe a hora exata da liberação; é uma boa aproximação).
    // Nuvem: tabela producao_mensal — SÓ números agregados (nada de nome, prontuário ou código de exame).
    // =====================================================================
    const PROD_MOD = { US: 35, CT: 7 }, PROD_NOME = { US: '🔊 Ultrassom', CT: '🩻 Tomografia' };
    const PROD_CATS = ['SUS', 'Prefeitura', 'Convênio', 'Particular', 'Social', 'Não informado'];
    let prodMes = isoDe(new Date()).slice(0, 7), prodDados = {}, prodLendo = false, prodErro = '';
    function prodCategoria(desc) {
        const d = normName(desc);
        if (!d || d.startsWith('SEM CONV') || d.startsWith('NAO INFORM')) return 'Não informado';
        if (/^SUS\b/.test(d)) return 'SUS';
        if (d.includes('PREFEITURA')) return 'Prefeitura';
        if (d === 'SOCIAL' || /\bSOCIAL\b/.test(d)) return 'Social';
        if (d.includes('PARTICULAR') || d.includes('CARTAO DESCONTO') || d.includes('CARNE')) return 'Particular';
        return 'Convênio';
    }
    function prodMeuUsuario() {
        try { const p = pacsToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(p + '==='.slice((p.length + 3) % 4))).usu_codigo; }
        catch (e) { return null; }
    }
    function diaHoraLocal(d, h) {
        const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null;
        const [hh, mi, ss] = String(h || '00:00:00').split(':').map(Number);
        const dt = new Date(+m[1], m[2] - 1, +m[3], hh || 0, mi || 0, ss || 0); return isNaN(dt) ? null : dt;
    }
    function prazoUteis(d, n) { // manhã (07:00) do N-ésimo dia útil seguinte (seg–sex; feriados não descontados)
        const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 0, 0); let c = 0;
        while (c < n) { x.setDate(x.getDate() + 1); const w = x.getDay(); if (w > 0 && w < 6) c++; }
        return x;
    }
    function estat(v) {
        if (!v.length) return { n: 0, med: null, media: null, p90: null };
        const s = [...v].sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
        return { n: s.length, med: Math.round(q(0.5) * 10) / 10, media: Math.round(s.reduce((a, b) => a + b, 0) / s.length * 10) / 10, p90: Math.round(q(0.9) * 10) / 10 };
    }
    async function prodBuscar(mes, cod) {
        const tok = pacsToken(), [y, m] = mes.split('-').map(Number), fim = isoDe(new Date(y, m, 0)), rows = [];
        for (let off = 0; off < 9000; off += 300) {
            const q = new URLSearchParams({ offset: off, limit: 300, tela: 'EXAMES', pac_nome: '', pac_pacs_codigo: '', data_codigo: 1, data_inicial: `${mes}-01`, data_final: fim, exa_idnsomenteassinador: false, exa_dataparam: '$exame.exa_data$' });
            q.append('mod_codigo[]', cod);
            const r = await fetch(`${location.origin}/backend/api/exame?${q}`, { headers: { 'x-access-token': tok } });
            if (r.status === 401 || r.status === 403) throw new Error('sessão do PACS expirada — faça login de novo');
            if (!r.ok) throw new Error('PACS HTTP ' + r.status);
            const j = await r.json(), lote = Array.isArray(j) ? j : (j.rows || []);
            rows.push(...lote);
            if (lote.length < 300) break;
        }
        return rows;
    }
    // exame "meu" no mês: null = não conta; senão { lib, sit }. Liberado = radiologista do exame sou eu;
    // pendente = precisa de laudo e (é meu, ou sem radiologista: US qualquer; TC fora de ABERTO). TESTE fora.
    // v9.6.2 — ABERTO há mais de 10 dias = "aberto antigo": não é laudo a fazer (2º código de laudo conjunto não liberado,
    // não realizado, cancelado não excluído) → fora do "a laudar" e do valor; vai para a auditoria do 💰 Financeiro.
    // v9.7.1 — regra do Dr. Gabriel (02/11/2026): ABERTO a partir do DIA SEGUINTE ao exame não é laudo a fazer → categoria "aberto"
    // (fora do valor e do a laudar), conferida pelo comentário do exame no PACS. Até out/2026 = "baixa" (competência já conferida: ignorado).
    const ABERTO_ANTIGO_DIAS = 1, ABERTO_DESDE = '2026-11-01';
    function prodSituacao(x, mod, me, mes) {
        if (!x || String(x.exa_data || '').slice(0, 7) !== mes) return null;
        if (normName(x.paciente && x.paciente.pac_nome).startsWith('TESTE')) return null; // pacientes de teste fora
        const sit = String(x.exa_situacao || '').toUpperCase(), rad = x.usu_codigo_radiologista, lib = sit === 'LIBERADO';
        const meu = lib ? (rad != null && rad === me) : (x.exa_idnnecessitalaudo !== false && (rad === me || (rad == null && (mod === 'US' || sit !== 'ABERTO'))));
        if (!meu) return null;
        const d = diaHoraLocal(x.exa_data, '00:00:00');
        const dia = String(x.exa_data || '').slice(0, 10);
        const antigo = !lib && sit === 'ABERTO' && !!d && dia < getTodayIso();
        return { lib, sit, antigo, baixa: antigo && dia < ABERTO_DESDE };
    }
    // paciente+dia com exame liberado na mesma lista (para marcar o aberto antigo que parece 2º código de laudo conjunto)
    const prodChavePacDia = x => `${(x.paciente && (x.paciente.pac_codigo || x.paciente.pac_pacs_codigo)) || ''}|${String(x.exa_data || '').slice(0, 10)}`;
    const prodLibPacDia = rows => new Set(rows.filter(x => String(x.exa_situacao || '').toUpperCase() === 'LIBERADO').map(prodChavePacDia));
    // v9.6 — produção do mês agregada por dia × convênio × exame × situação (base do 💰 Financeiro). Só contagens.
    const SIT_REVISAR = ['REVISAR', 'DIGITADO', 'ASSINAR', 'PRELAUDO'];
    function prodItens(rows, mod, me, mes) {
        const acc = new Map(), libPD = prodLibPacDia(rows);
        rows.forEach(x => {
            const s = prodSituacao(x, mod, me, mes); if (!s) return;
            const it = { dia: String(x.exa_data).slice(0, 10), conv: normConvenio(x.convenio && x.convenio.conv_descricao),
                exame: cleanExamDesc(x.tipoexame && x.tipoexame.tpe_descricao) || 'NÃO INFORMADO',
                estado: s.lib ? 'liberado' : SIT_REVISAR.includes(s.sit) ? 'revisar' : s.baixa ? 'baixa' : s.antigo ? 'aberto' : 'pendente', urg: !!x.exa_idnurgente, int: x.exa_tipo === 'I' };
            if (it.estado === 'aberto') it.par = libPD.has(prodChavePacDia(x));
            const k = [it.dia, it.conv, it.exame, it.estado, it.urg, it.int, !!it.par].join('|');
            const e = acc.get(k); if (e) e.n++; else acc.set(k, Object.assign(it, { n: 1 }));
        });
        return [...acc.values()];
    }
    function prodResumir(rows, mod, me, mes) {
        const out = { liberados: 0, pendentes: 0, por_situacao: {}, por_categoria: {}, urgentes: { lib: 0, pend: 0 }, internados: { lib: 0, pend: 0 } };
        const exames = {}, tEl = [], tUr = []; let noPrazo = 0, comPrazo = 0, ate2h = 0;
        PROD_CATS.forEach(c => { out.por_categoria[c] = { lib: 0, pend: 0 }; });
        out.abertos_antigos = 0;
        rows.forEach(x => {
            const s = prodSituacao(x, mod, me, mes); if (!s) return;
            if (s.antigo) { if (!s.baixa) out.abertos_antigos++; return; } // baixa (até out/2026) some da conta // fora da conta (auditoria no 💰 Financeiro)
            const { lib, sit } = s;
            const k = lib ? 'lib' : 'pend';
            if (lib) out.liberados++; else { out.pendentes++; out.por_situacao[sit] = (out.por_situacao[sit] || 0) + 1; }
            const cat = prodCategoria(x.convenio && x.convenio.conv_descricao);
            out.por_categoria[cat][k]++;
            if (x.exa_idnurgente) out.urgentes[k]++;
            if (x.exa_tipo === 'I') out.internados[k]++;
            const ex = cleanExamDesc(x.tipoexame && x.tipoexame.tpe_descricao) || 'NÃO INFORMADO';
            const e = exames[ex] || (exames[ex] = { exame: ex, lib: 0, pend: 0 }); e[k]++;
            if (lib) {
                const ini = (x.exa_pacs_data && x.exa_pacs_hora) ? diaHoraLocal(x.exa_pacs_data, x.exa_pacs_hora) : diaHoraLocal(x.exa_data, x.exa_hora);
                const fimT = x.exa_updated ? new Date(x.exa_updated) : null;
                if (ini && fimT && !isNaN(fimT)) {
                    const h = (fimT - ini) / 36e5;
                    if (h > 0 && h <= 24 * 30) {
                        if (x.exa_idnurgente) { tUr.push(h); if (h <= 2) ate2h++; }
                        else { tEl.push(h); comPrazo++; if (fimT <= prazoUteis(diaHoraLocal(x.exa_data, '00:00:00'), mod === 'US' ? 3 : 5)) noPrazo++; }
                    }
                }
            }
        });
        const lista = Object.values(exames).sort((a, b) => (b.lib + b.pend) - (a.lib + a.pend));
        out.por_exame = lista.slice(0, 30);
        if (lista.length > 30) out.por_exame.push(lista.slice(30).reduce((a, e) => { a.lib += e.lib; a.pend += e.pend; return a; }, { exame: `OUTROS (${lista.length - 30} tipos)`, lib: 0, pend: 0 }));
        out.tat = { eletivo: Object.assign(estat(tEl), { no_prazo: noPrazo, com_prazo: comPrazo }), urgente: Object.assign(estat(tUr), { ate2h }) };
        out.total = out.liberados + out.pendentes;
        return out;
    }
    async function prodLerPacs(mes) {
        if (prodLendo) return;
        if (!pacsToken()) throw new Error('PACS sem login nesta aba');
        const me = prodMeuUsuario(); if (me == null) throw new Error('não consegui identificar o usuário do PACS');
        prodLendo = true;
        try {
            const agora = new Date().toISOString(), linhas = [], lotes = [], pc = String(navigator.platform || '').slice(0, 30);
            for (const [mod, cod] of Object.entries(PROD_MOD)) {
                const rows = await prodBuscar(mes, cod);
                const dados = Object.assign(prodResumir(rows, mod, me, mes), { lido_em: agora });
                prodDados[`${mes}|${mod}`] = { dados, atualizado_em: agora };
                linhas.push({ mes, modalidade: mod, dados, atualizado_em: agora, pc });
                lotes.push({ mes, modalidade: mod, itens: prodItens(rows, mod, me, mes), lido_em: agora, pc });
            }
            if (getSupabaseConfig()) {
                try { await requestSupabase('producao_mensal?on_conflict=mes,modalidade', 'POST', linhas, { Prefer: 'resolution=merge-duplicates,return=minimal' }); }
                catch (e) { console.warn('[Agenda Produção] nuvem', e); }
                // v9.6 — base do 💰 Financeiro (a leitura nova substitui a anterior do mês)
                try { await requestSupabase('producao_lote?on_conflict=mes,modalidade', 'POST', lotes, { Prefer: 'resolution=merge-duplicates,return=minimal' }); prodErroLote = ''; }
                catch (e) { prodErroLote = e.message || String(e); console.warn('[Agenda Produção] lote do financeiro', e); }
            }
        } finally { prodLendo = false; }
    }
    let prodErroLote = '';
    async function prodCarregarNuvem(mes) {
        if (!getSupabaseConfig()) return;
        const rows = await requestSupabase(`producao_mensal?mes=eq.${mes}&select=*`, 'GET').catch(() => []);
        (rows || []).forEach(r => { prodDados[`${r.mes}|${r.modalidade}`] = { dados: r.dados, atualizado_em: r.atualizado_em }; });
    }
    function diasUteisMes(mes) { // [úteis até hoje, úteis no mês] (seg–sex)
        const [y, m] = mes.split('-').map(Number), ult = new Date(y, m, 0).getDate(), hoje = new Date(); let ate = 0, tot = 0;
        for (let d = 1; d <= ult; d++) { const w = new Date(y, m - 1, d).getDay(); if (w > 0 && w < 6) { tot++; if (new Date(y, m - 1, d) <= hoje) ate++; } }
        return [ate, tot];
    }
    const fmtH = h => h == null ? '—' : h < 24 ? `${String(h).replace('.', ',')} h` : `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
    const pct = (a, b) => b ? `${Math.round(a / b * 1000) / 10}%` : '—';
    function prodBlocoHtml(mod, reg, mes) {
        if (!reg) return `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;"><b>${PROD_NOME[mod]}</b><div style="color:#64748b; margin-top:6px;">Sem leitura deste mês ainda — clique em 🔄 Ler do PACS (com o PACS logado nesta aba).</div></div>`;
        const d = reg.dados, [ate, tot] = diasUteisMes(mes), emCurso = mes === isoDe(new Date()).slice(0, 7);
        const proj = emCurso && ate ? Math.round(d.total / ate * tot) : null;
        const cats = PROD_CATS.filter(c => d.por_categoria[c] && (d.por_categoria[c].lib + d.por_categoria[c].pend));
        const th = 'style="text-align:right; padding:3px 6px;"', td = 'style="text-align:right; padding:3px 6px;"';
        const te = d.tat.eletivo, tu = d.tat.urgente;
        return `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;">
            <div style="display:flex; gap:12px; align-items:baseline; flex-wrap:wrap; margin-bottom:6px;"><b style="font-size:13px;">${PROD_NOME[mod]}</b>
                <span><b style="font-size:18px; color:#059669;">${d.liberados}</b> liberados</span>
                <span><b style="font-size:18px; color:#d97706;">${d.pendentes}</b> pendentes meus</span>
                <span><b style="font-size:18px;">${d.total}</b> no mês${proj && proj > d.total ? ` · projeção ≈ <b>${proj}</b> (${ate}/${tot} dias úteis)` : ''}</span>
                <span style="margin-left:auto; font-size:10px; color:#94a3b8;">lido do PACS ${new Date(d.lido_em || reg.atualizado_em).toLocaleString('pt-BR')}</span></div>
            <div style="display:grid; grid-template-columns:1fr 1.4fr; gap:12px;">
              <div>
                <table style="width:100%; border-collapse:collapse; font-size:10.5px;"><tr style="color:#64748b; font-size:9.5px; text-transform:uppercase;"><th style="text-align:left; padding:3px 6px;">Categoria</th><th ${th}>Lib.</th><th ${th}>Pend.</th><th ${th}>Total</th><th ${th}>%</th></tr>
                ${cats.map(c => { const v = d.por_categoria[c], t = v.lib + v.pend; return `<tr><td style="padding:3px 6px; font-weight:700;">${c}</td><td ${td}>${v.lib}</td><td ${td}>${v.pend}</td><td ${td}><b>${t}</b></td><td ${td}>${pct(t, d.total)}</td></tr>`; }).join('')}</table>
                <div style="font-size:10px; color:#475569; margin-top:6px;">🚨 Urgentes: <b>${d.urgentes.lib + d.urgentes.pend}</b> (${pct(d.urgentes.lib + d.urgentes.pend, d.total)}) · 🏥 Internados: <b>${d.internados.lib + d.internados.pend}</b>${d.pendentes ? ` · pendentes: ${Object.entries(d.por_situacao).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(', ')}` : ''}${d.abertos_antigos ? ` · <span title="Em ABERTO desde o dia seguinte ao exame: fora da conta, conferido pelo comentário do PACS (💰 Financeiro › Em ABERTO)">${d.abertos_antigos} em aberto fora da conta</span>` : ''}</div>
                <div style="font-size:10.5px; margin-top:8px; padding:6px 8px; background:#f8fafc; border-radius:6px;">⏱ <b>Exame → laudo liberado</b><br>
                  Eletivos: mediana <b>${fmtH(te.med)}</b> · média ${fmtH(te.media)} · 90% até ${fmtH(te.p90)} · no prazo (${mod === 'US' ? 3 : 5} dias úteis): <b>${pct(te.no_prazo, te.com_prazo)}</b> (n=${te.n})<br>
                  Urgentes: mediana <b>${fmtH(tu.med)}</b> · 90% até ${fmtH(tu.p90)}${mod === 'CT' ? ` · até 2 h: <b>${pct(tu.ate2h, tu.n)}</b>` : ''} (n=${tu.n})</div>
              </div>
              <div style="max-height:260px; overflow:auto;"><table style="width:100%; border-collapse:collapse; font-size:10px;"><tr style="color:#64748b; font-size:9.5px; text-transform:uppercase; position:sticky; top:0; background:#fff;"><th style="text-align:left; padding:3px 6px;">Exame</th><th ${th}>Lib.</th><th ${th}>Pend.</th><th ${th}>Total</th><th ${th}>%</th></tr>
                ${d.por_exame.map(e => `<tr><td style="padding:2px 6px;">${escapeHtml(e.exame)}</td><td ${td}>${e.lib}</td><td ${td}>${e.pend}</td><td ${td}><b>${e.lib + e.pend}</b></td><td ${td}>${pct(e.lib + e.pend, d.total)}</td></tr>`).join('')}</table></div>
            </div></div>`;
    }
    async function renderProducao(forcarLeitura) {
        const content = document.getElementById('contentDashboard');
        const temPacs = !!pacsToken();
        content.innerHTML = `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                <b style="font-size:11.5px;">Mês:</b> <select id="prodMesSel" style="font-size:11px; font-weight:700; padding:3px 6px; border-radius:4px; border:1px solid #94a3b8; background:#fff; color:#0f172a;">${mesesRecentes(12).map(m => `<option value="${m}" ${m === prodMes ? 'selected' : ''}>${mesNomeAno(m)}</option>`).join('')}</select>
                <button id="btnProdLer" class="btn-top-action" style="background:#16a34a; color:#fff;" ${temPacs ? '' : 'disabled title="Abra o PACS logado nesta aba"'}>🔄 Ler do PACS</button>
                <span id="prodStatus" style="font-size:10.5px; color:#64748b;"></span>
                <button id="btnProdRel" class="btn-top-action" style="background:#0284c7; color:#fff; margin-left:auto;">🖨️ Relatório</button></div>
            <div id="prodCorpo"><div style="text-align:center; padding:30px; color:#60a5fa;">⏳ Carregando produção...</div></div>`;
        const st = document.getElementById('prodStatus'), corpo = document.getElementById('prodCorpo');
        document.getElementById('prodMesSel').onchange = e => { prodMes = e.target.value; renderProducao(); };
        document.getElementById('btnProdLer').onclick = () => renderProducao(true);
        document.getElementById('btnProdRel').onclick = relatorioProducao;
        const pintar = () => {
            const rUS = prodDados[`${prodMes}|US`], rCT = prodDados[`${prodMes}|CT`];
            const tot = (rUS ? rUS.dados.total : 0) + (rCT ? rCT.dados.total : 0), lib = (rUS ? rUS.dados.liberados : 0) + (rCT ? rCT.dados.liberados : 0);
            corpo.innerHTML = `<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px;">
                    ${box(lib, `Laudos liberados — ${mesNomeAno(prodMes)}`, '#059669')}${box(tot - lib, 'Pendentes atribuídos a mim', '#d97706')}${box(tot, 'Total do mês (US + TC)', isDarkMode ? '#f1f5f9' : '#0f172a')}</div>
                ${prodBlocoHtml('US', rUS, prodMes)}${prodBlocoHtml('CT', rCT, prodMes)}
                <div style="font-size:10px; color:#94a3b8;">Mês = data do exame (mesmo critério do filtro do PACS: período + liberados) · meus = radiologista do exame = usuário logado no PACS · pacientes TESTE fora · tempo de liberação aproximado pela última atualização do exame (a API não dá a hora exata) · prazo sem descontar feriados · na nuvem ficam só números.</div>`;
        };
        try {
            await prodCarregarNuvem(prodMes);
            const reg = prodDados[`${prodMes}|US`], idade = reg ? Date.now() - new Date(reg.atualizado_em).getTime() : Infinity;
            const recente = prodMes >= isoDe(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7);
            pintar();
            if (temPacs && (forcarLeitura || (recente && idade > 30 * 60000) || !reg)) {
                st.textContent = '⏳ lendo o PACS (US e TC)…';
                await prodLerPacs(prodMes);
                st.textContent = '✓ atualizado agora';
                pintar();
            } else if (reg) st.textContent = '';
        } catch (e) { st.textContent = '⚠ ' + e.message; st.style.color = '#dc2626'; }
    }
    function relatorioProducao() {
        const rUS = prodDados[`${prodMes}|US`], rCT = prodDados[`${prodMes}|CT`];
        if (!rUS && !rCT) { alert('Sem dados deste mês. Clique em 🔄 Ler do PACS primeiro.'); return; }
        const tab = (head, rows) => `<table><tr>${head.map((h, i) => `<th class="${i ? 'n' : ''}">${h}</th>`).join('')}</tr>${rows.map(l => `<tr>${l.map((c, i) => `<td class="${i ? 'n' : ''}">${escapeHtml(String(c ?? '—'))}</td>`).join('')}</tr>`).join('')}</table>`;
        const sec = (mod, reg) => {
            if (!reg) return `<h2>${PROD_NOME[mod].slice(2)}</h2><div>Sem leitura.</div>`;
            const d = reg.dados, te = d.tat.eletivo, tu = d.tat.urgente;
            return `<h2>${PROD_NOME[mod].slice(2)} — ${d.total} exames (${d.liberados} liberados + ${d.pendentes} pendentes)</h2>
                ${tab(['Categoria', 'Liberados', 'Pendentes', 'Total', '%'], PROD_CATS.filter(c => d.por_categoria[c].lib + d.por_categoria[c].pend).map(c => { const v = d.por_categoria[c]; return [c, v.lib, v.pend, v.lib + v.pend, pct(v.lib + v.pend, d.total)]; }))}
                <div class="meta">Urgentes: ${d.urgentes.lib + d.urgentes.pend} · Internados: ${d.internados.lib + d.internados.pend} · Exame → laudo (eletivos): mediana ${fmtH(te.med)}, 90% até ${fmtH(te.p90)}, no prazo ${pct(te.no_prazo, te.com_prazo)} · urgentes: mediana ${fmtH(tu.med)}${mod === 'CT' ? `, até 2 h ${pct(tu.ate2h, tu.n)}` : ''}</div>
                ${tab(['Exame', 'Liberados', 'Pendentes', 'Total', '%'], d.por_exame.map(e => [e.exame, e.lib, e.pend, e.lib + e.pend, pct(e.lib + e.pend, d.total)]))}`;
        };
        const tot = (rUS ? rUS.dados.total : 0) + (rCT ? rCT.dados.total : 0);
        janelaRelatorio(`Produção ${mesNomeAno(prodMes)}`, `<h1>Produção de laudos — ${mesNomeAno(prodMes)}</h1>
            <div class="meta">Dr. Gabriel Gaspar · Ultrassom e Tomografia · mês pela data do exame · lido do PACS em ${new Date(((rUS || rCT).dados.lido_em) || Date.now()).toLocaleString('pt-BR')}</div>
            <div class="kpis"><div class="kpi"><b>${rUS ? rUS.dados.total : '—'}</b>ultrassons</div><div class="kpi"><b>${rCT ? rCT.dados.total : '—'}</b>tomografias</div><div class="kpi"><b>${tot}</b>total</div></div>
            ${sec('US', rUS)}${sec('CT', rCT)}
            <div class="meta">Para conferir com o relatório do PACS: filtro por período (data do exame) do mês, situação Liberado, modalidade US/CT. Pendentes = ainda não liberados atribuídos ao Dr. Gabriel.</div>`);
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
    // 16D. 🗓️ VAGAS (v9.6) — escala ofertada × agendados × encaixes × desfechos × ociosas
    // ---------------------------------------------------------------------
    // Vagas = escala mensal enviada (tabela agenda_vagas: Prefeitura e Convênio/Particular/LADI, por
    // dia/período/bloco). 1 paciente num horário = 1 vaga (2 exames juntos = 1 vaga). Saída (desmarcou,
    // cancelado, saiu da planilha sem chegar) devolve a vaga. Encaixe e SUS/urgência = vagas ADICIONAIS
    // (fora da escala). Ociosa = vaga de dia que já passou sem paciente; livre = de hoje em diante.
    // Cálculo no banco (vagas_periodo) — o mesmo número nos 3 computadores e no iPhone.
    // Dia sem expediente (férias, curso): vagas do dia = 0 (🚫 na lista dia a dia; ↺ desfaz).
    // =====================================================================
    const VG_TIPO = { prefeitura: 'Prefeitura', convenio_particular: 'Convênio / Particular / LADI' };
    const VG_TIPO_CURTO = { prefeitura: 'Pref.', convenio_particular: 'Conv.' };
    const VG_BLOCO = { us_geral: 'US geral', pescoco: 'Pescoço (carótidas / tireoide)', doppler_membro: 'Doppler de membros', proprio: 'Horários próprios', exclusivo: 'Horários exclusivos' };
    // v9.7 — de onde veio a escala (agenda_vagas.regra)
    const VG_REGRA = { email: 'e-mail à Prefeitura', planilha: 'estimada pela planilha', 'v6-out': 'regra v6', 'v6-nov': 'regra v6' };
    function vgFontesTxt(r) {
        const g = {};
        (r.escala_fontes || []).forEach(x => { const rg = VG_REGRA[x.regra] || x.regra, k = `${x.tipo}|${rg}`; (g[k] = g[k] || { tipo: x.tipo, rg, meses: new Set() }).meses.add(x.mes); });
        const v = Object.values(g);
        if (!v.length || v.every(x => x.rg === 'regra v6')) return '';
        return v.sort((a, b) => (a.tipo < b.tipo ? 1 : a.tipo > b.tipo ? -1 : [...a.meses].sort()[0] < [...b.meses].sort()[0] ? -1 : 1))
            .map(x => { const ms = [...x.meses].sort(); return `${VG_TIPO_CURTO[x.tipo] || x.tipo} ${x.rg} (${ms.length > 1 ? `${mesNomeAno(ms[0])} a ${mesNomeAno(ms[ms.length - 1])}` : mesNomeAno(ms[0])})`; }).join(' · ');
    }
    const DOW_ISO = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const VG_INICIO = '2026-10'; // 1ª escala cadastrada (Drive › Agenda Mensal)
    const VG_K = ['ofertadas', 'ocupadas', 'atendidos', 'faltas', 'pendentes', 'saidas', 'ociosas', 'livres', 'acima', 'ofertadas_passadas', 'ocupadas_passadas'];
    let vgPeriodo = isoDe(new Date()).slice(0, 7), vgUltimo = null, vgIA = null;
    const dIso = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
    const vgRegraDe = d => (String(d) >= '2026-11-01' ? 'v6-nov' : 'v6-out');
    const perTxt = p => (p === 'manha' ? 'manhã' : 'tarde');
    const pctBR = (a, b) => (b ? `${(a / b * 100).toFixed(1).replace('.', ',').replace(',0', '')}%` : '—');
    const vgPreench = x => x.ofertadas - x.ociosas - x.livres;
    const cinzaN = n => `<span style="color:#94a3b8;">${n}</span>`;
    const cartaoHtml = (titulo, corpo, nota) => `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:10px; margin-bottom:10px;"><div style="font-weight:bold; font-size:11.5px; margin-bottom:${nota ? 2 : 6}px;">${titulo}</div>${nota ? `<div style="font-size:9.5px; color:#94a3b8; margin-bottom:6px;">${nota}</div>` : ''}${corpo}</div>`;
    // tabela compacta do Dashboard — células já em HTML (texto vindo do banco passa por escapeHtml antes)
    function tabelaHtml(head, rows, nEsq = 1) {
        const al = i => (i < nEsq ? 'left' : 'right');
        return `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:10.5px; font-variant-numeric:tabular-nums;"><tr style="color:#64748b; font-size:9.5px; text-transform:uppercase;">${head.map((h, i) => `<th style="text-align:${al(i)}; padding:3px 6px; white-space:nowrap;">${h}</th>`).join('')}</tr>${rows.map(r => {
            const c = Array.isArray(r) ? r : r.c;
            return `<tr${r.estilo ? ` style="${r.estilo}"` : ''}>${c.map((v, i) => `<td style="text-align:${al(i)}; padding:3px 6px; border-top:1px solid rgba(148,163,184,.22);${i < nEsq ? '' : ' white-space:nowrap;'}">${v}</td>`).join('')}</tr>`;
        }).join('')}</table></div>`;
    }
    // tabela dos relatórios impressos — texto puro (escapado aqui)
    const tabRel = (head, rows) => `<table><tr>${head.map((h, i) => `<th class="${i ? 'n' : ''}">${h}</th>`).join('')}</tr>${rows.map(l => `<tr>${l.map((c, i) => `<td class="${i ? 'n' : ''}">${escapeHtml(String(c ?? '—'))}</td>`).join('')}</tr>`).join('')}</table>`;

    function vgOpcoes() {
        const out = [], h = new Date();
        for (let i = 3; i >= -12; i--) {
            const m = isoDe(new Date(h.getFullYear(), h.getMonth() + i, 1)).slice(0, 7);
            out.push([m, `${mesNomeAno(m)}${i === 0 ? ' (atual)' : i > 0 ? ' · futuro' : ''}`]);
        }
        return [...out, ['3m', 'Últimos 3 meses'], ['6m', 'Últimos 6 meses'], ['12m', 'Últimos 12 meses'], [String(h.getFullYear()), `Ano de ${h.getFullYear()}`], [String(h.getFullYear() - 1), `Ano de ${h.getFullYear() - 1}`]];
    }
    function vgDatas(p) {
        if (/^\d{4}$/.test(p)) return { ini: `${p}-01-01`, fim: `${p}-12-31`, meses: 12, rotulo: `Ano de ${p}`, curto: p };
        const n = { '3m': 3, '6m': 6, '12m': 12 }[p], h = new Date();
        if (n) {
            const ini = isoDe(new Date(h.getFullYear(), h.getMonth() - n + 1, 1)), fim = isoDe(new Date(h.getFullYear(), h.getMonth() + 1, 0));
            return { ini, fim, meses: n, rotulo: `${mesNomeAno(ini.slice(0, 7))} a ${mesNomeAno(fim.slice(0, 7))}`, curto: `${n} meses` };
        }
        const [y, m] = p.split('-').map(Number);
        return { ini: `${p}-01`, fim: isoDe(new Date(y, m, 0)), meses: 1, mes: p, rotulo: mesNomeAno(p), curto: mesNomeAno(p) };
    }
    function vgCalc(r) {
        const zero = () => Object.fromEntries(VG_K.map(k => [k, 0]));
        const res = { prefeitura: zero(), convenio_particular: zero() }, tot = zero();
        (r.resumo || []).forEach(x => { res[x.tipo] = Object.assign(zero(), x); });
        Object.values(res).forEach(x => VG_K.forEach(k => { tot[k] += +x[k] || 0; }));
        const ad0 = () => ({ n: 0, atendidos: 0, faltas: 0, pendentes: 0 }), ad = { encaixe: ad0(), sus: ad0() };
        (r.adicionais || []).forEach(x => { ad[x.tipo] = Object.assign(ad0(), x); });
        const dias = r.por_dia || [], pass = dias.filter(d => d.escala && d.data < r.hoje);
        return {
            res, tot, ad,
            ofPass: pass.reduce((a, d) => a + d.pref_of + d.conv_of, 0), atPass: pass.reduce((a, d) => a + d.atendidos, 0),
            pendPass: dias.filter(d => d.data < r.hoje).reduce((a, d) => a + d.pendentes, 0)
        };
    }
    // v9.7 — mês a mês: escala × agenda (só dias com escala do tipo) + fora da escala + fonte da escala
    function vgMeses(r) {
        const pm = {}, reg = m => (pm[m] = pm[m] || { mes: m, esc: false, enc: 0, sus: 0, fonte: '', s: { ofertadas: 0, ocupadas: 0, atendidos: 0, faltas: 0, ociosas: 0, livres: 0 }, fora: { ocupadas: 0, atendidos: 0, faltas: 0 } });
        (r.por_mes || []).forEach(x => { const g = reg(x.mes); g.esc = true; Object.keys(g.s).forEach(k => { g.s[k] += x[k] || 0; }); });
        (r.adicionais_mes || []).forEach(x => { reg(x.mes)[x.tipo === 'sus' ? 'sus' : 'enc'] += x.n; });
        (r.sem_escala_mes || []).forEach(x => { const g = reg(x.mes); ['ocupadas', 'atendidos', 'faltas'].forEach(k => { g.fora[k] += x[k] || 0; }); });
        const fs = {};
        (r.escala_fontes || []).forEach(x => { (fs[x.mes] = fs[x.mes] || new Set()).add(VG_REGRA[x.regra] || x.regra); });
        Object.values(pm).forEach(g => { g.fonte = fs[g.mes] ? [...fs[g.mes]].join(' + ') : ''; });
        return Object.values(pm).sort((a, b) => (a.mes < b.mes ? -1 : 1));
    }
    // leituras automáticas (regras simples, só sobre os números agregados)
    function vgSugestoes(r, C) {
        const s = [], T = C.tot, E = C.ad.encaixe, S = C.ad.sus, semEsc = r.dias_sem_escala || [], se = r.sem_escala || [];
        const dm = d => fmtBR(String(d).slice(0, 10)).slice(0, 5);
        const fontes = vgFontesTxt(r);
        if (fontes) s.push(`📑 Escala usada: ${escapeHtml(fontes)}. A estimada conta 1 horário aberto na planilha = 1 vaga (meses sem a escala do e-mail).`);
        if (se.length) s.push(`🗂 <b>Fora da comparação</b> (dias sem escala do tipo): ${se.map(x => `${VG_TIPO_CURTO[x.tipo] || escapeHtml(x.tipo)} ${x.ocupadas} agendado(s) em ${x.dias} dia(s) — ${x.atendidos} atendidos, ${x.faltas} faltas (${pctBR(x.faltas, x.atendidos + x.faltas)})`).join('; ')}.${semEsc.some(d => String(d) >= `${VG_INICIO}-01`) ? ' Cadastre a escala pelo ＋ na lista dia a dia.' : ' Escala de Convênio/Particular cadastrada só a partir de out/2026.'}`);
        else if (semEsc.length) s.push(`🗂 ${semEsc.length} dia(s) com pacientes mas <b>sem escala cadastrada</b> (${semEsc.slice(0, 6).map(dm).join(', ')}${semEsc.length > 6 ? '…' : ''}) — ficaram fora da comparação.`);
        if (C.pendPass) s.push(`✍️ ${C.pendPass} agendamento(s) em dias que já passaram estão <b>sem desfecho</b> (nem Atendido nem Falta) — marque para fechar o mês com números certos.`);
        if (T.ociosas) {
            const bl = [...(r.por_bloco || [])].filter(b => b.ociosas).sort((a, b) => b.ociosas - a.ociosas).slice(0, 2).map(b => `${VG_TIPO_CURTO[b.tipo] || ''} ${escapeHtml(VG_BLOCO[b.bloco] || b.bloco)}: ${b.ociosas}`).join('; ');
            const dw = [...(r.por_dia_semana || [])].filter(b => b.ociosas).sort((a, b) => b.ociosas - a.ociosas).slice(0, 2).map(b => `${DOW_ISO[b.dow]} ${perTxt(b.periodo)} (${VG_TIPO_CURTO[b.tipo] || ''}): ${b.ociosas}`).join('; ');
            s.push(`📉 <b>${T.ociosas} vaga(s) ociosa(s)</b> = ${pctBR(T.ociosas, T.ofertadas_passadas)} da oferta dos dias que passaram. Onde: ${bl || '—'}${dw ? ` · ${dw}` : ''}. Devolver à Prefeitura com antecedência ou abrir para encaixe / lista de espera.`);
        } else if (T.ofertadas_passadas) s.push('✅ Nenhuma vaga ociosa nos dias que já passaram.');
        // overbooking pelas faltas: com taxa f, agendar k/(1−f) para atender ~k → extra = k·f/(1−f), arredondado para baixo
        const ob = (r.por_dia_semana || []).map(x => { const d = x.atendidos + x.faltas, f = d ? x.faltas / d : 0, k = x.dias ? x.ofertadas / x.dias : 0; return { x, d, f, extra: f < 0.9 ? Math.floor(k * f / (1 - f)) : 0 }; })
            .filter(o => o.d >= 10 && o.f >= 0.12 && o.extra >= 1).sort((a, b) => b.f - a.f).slice(0, 3);
        if (ob.length) s.push(`📈 Faltas altas: ${ob.map(o => `${DOW_ISO[o.x.dow]} ${perTxt(o.x.periodo)} ${VG_TIPO_CURTO[o.x.tipo] || ''} ${Math.round(o.f * 100)}% (cabe +${o.extra} por período)`).join('; ')}. Antes do overbooking: confirmação ativa na véspera nesses horários.`);
        if (T.livres) {
            const prox = (r.por_dia || []).filter(d => d.escala && d.data >= r.hoje && d.sobra > 0).slice(0, 6).map(d => `${dm(d.data)} (${d.sobra})`).join(', ');
            s.push(`🟦 <b>${T.livres} vaga(s) livre(s)</b> de hoje em diante${prox ? `: ${prox}` : ''} — oferecer à Prefeitura, aos convênios ou à lista de espera.`);
        }
        if (T.saidas) s.push(`🚪 ${T.saidas} saída(s) (desmarcou / cancelado) devolveram vaga — com lista de espera dá para reaproveitar parte delas.`);
        const adic = E.n + S.n;
        if (adic) s.push(`➕ ${adic} atendimento(s) <b>além da escala</b> (${E.n} encaixes + ${S.n} SUS/urgência) = +${pctBR(adic, T.ofertadas)} sobre as vagas ofertadas — mostra a demanda real e a capacidade usada além do combinado.`);
        if (T.acima) s.push(`⚠️ ${T.acima} paciente(s) <b>acima da escala</b> (mais pacientes que vagas no mesmo período e tipo) — conferir se a escala do mês está atualizada ou se foi overbooking intencional.`);
        return s;
    }
    // barra segmentada "para onde foram as vagas" (rótulo dentro só quando cabe; legenda na ordem dos blocos)
    function vgBarraHtml(T, adic) {
        const partes = [['Atendidos', T.atendidos, '#059669', '#fff'], ['Sem desfecho', T.pendentes, '#d97706', '#0b0b0b'], ['Faltas', T.faltas, '#e11d48', '#fff'],
            ['Ociosas', T.ociosas, isDarkMode ? '#64748b' : '#94a3b8', isDarkMode ? '#fff' : '#0b0b0b'], ['Livres', T.livres, '#0284c7', '#fff'], ['Adicionais (encaixe + SUS)', adic, '#7c3aed', '#fff']].filter(p => p[1] > 0);
        const tot = partes.reduce((a, p) => a + p[1], 0);
        if (!tot) return '<div style="color:#94a3b8;">Sem dados no período.</div>';
        return `<div style="display:flex; gap:2px; height:26px;">${partes.map(([t, v, c, ink]) => { const w = v / tot * 100, rot = `${t}: ${v} (${Math.round(w)}%)`; return `<div role="img" aria-label="${rot}" title="${rot}" style="flex:${v} 1 0; min-width:3px; background:${c}; border-radius:4px; color:${ink}; font-size:10.5px; font-weight:700; line-height:26px; padding-left:${w >= 5 ? 6 : 0}px; white-space:nowrap;">${w >= 5 ? v : ''}</div>`; }).join('')}</div>
            <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:6px; font-size:10px; color:#64748b;">${partes.map(([t, , c]) => `<span><i style="display:inline-block; width:9px; height:9px; border-radius:2px; background:${c}; margin-right:4px; vertical-align:-1px;"></i>${t}</span>`).join('')}</div>`;
    }
    function vgHtml(r, per) {
        const C = vgCalc(r), T = C.tot, P = C.res.prefeitura, V = C.res.convenio_particular, E = C.ad.encaixe, S = C.ad.sus;
        const cor = isDarkMode ? '#f1f5f9' : '#0f172a', adic = E.n + S.n, realizados = T.atendidos + E.atendidos + S.atendidos, hojeIso = getTodayIso();
        const semEsc = r.dias_sem_escala || [], podeGerar = per.meses === 1 && per.mes >= VG_INICIO && (!r.dias_escala || semEsc.length > 0);
        const topo = `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                <b style="font-size:11.5px;">Período:</b> <select id="vgPeriodoSel" style="font-size:11px; font-weight:700; padding:3px 6px; border-radius:4px; border:1px solid #94a3b8; background:#fff; color:#0f172a;">${vgOpcoes().map(([v, t]) => `<option value="${v}" ${v === vgPeriodo ? 'selected' : ''}>${t}</option>`).join('')}</select>
                <span style="color:#64748b; font-size:10.5px;">${escapeHtml(per.rotulo)} · ${r.dias_escala} dia(s) com escala</span>
                <span style="margin-left:auto; display:flex; gap:6px;">
                    ${podeGerar ? '<button id="btnVgGerar" class="btn-top-action" style="background:#0f766e; color:#fff;" title="Cadastra as vagas dos dias úteis SEM escala pela regra padrão (não mexe nos dias já cadastrados nem nos marcados sem expediente)">＋ Gerar escala pela regra</button>' : ''}
                    <button id="btnVgIA" class="btn-top-action" style="background:#7c3aed; color:#fff;" title="Leitura e sugestões com o Claude Opus 5.5 (só números agregados, sem pacientes)">🧠 Sugestões (Opus)</button>
                    <button id="btnVgRel" class="btn-top-action" style="background:#0284c7; color:#fff;" title="Relatório do período para imprimir/salvar em PDF (direção / Prefeitura)">🖨️ Relatório</button>
                </span></div>`;
        if (!r.dias_escala && !(r.por_dia || []).length) {
            return topo + `<div style="padding:24px; text-align:center; color:#64748b;">Sem escala cadastrada e sem agendamentos em ${escapeHtml(per.rotulo)}.${podeGerar ? '<br>Use <b>＋ Gerar escala pela regra</b> para cadastrar as vagas ofertadas do mês.' : per.ini < `${VG_INICIO}-01` ? '<br>Meses anteriores ao controle: use <b>🧩 Meses anteriores</b> abaixo (planilha da Prefeitura × PACS).' : ''}</div>`;
        }
        const kpis = `<div style="display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:8px;">
                ${box(T.ofertadas, `Vagas ofertadas (Pref. ${P.ofertadas} · Conv. ${V.ofertadas})`, cor)}
                ${box(`${vgPreench(T)} <span style="font-size:12px;">(${pctBR(vgPreench(T), T.ofertadas)})</span>`, 'Vagas preenchidas', cor)}
                ${box(`+${adic}`, `Adicionais: ${E.n} encaixe(s) · ${S.n} SUS/urg.`, cor)}
                ${box(T.ociosas, 'Ociosas (dias que passaram)', T.ociosas ? '#dc2626' : cor)}
                ${box(T.livres, 'Livres (hoje em diante)', cor)}
            </div>
            <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:6px;">
                ${box(T.ocupadas, `Agendados${T.acima ? ` (${T.acima} acima da escala)` : ''}`, cor)}
                ${box(T.atendidos, 'Atendidos', cor)}
                ${box(`${T.faltas} <span style="font-size:12px;">(${pctBR(T.faltas, T.atendidos + T.faltas)})</span>`, 'Faltas', T.faltas ? '#e11d48' : cor)}
                ${box(T.pendentes, 'Sem desfecho ainda', cor)}
                ${box(T.saidas, 'Saídas (vaga devolvida)', cor)}
            </div>
            <div style="font-size:10.5px; margin:4px 0 10px;">Realizados no período: <b>${realizados}</b> (${T.atendidos} agendados + ${E.atendidos} encaixes + ${S.atendidos} SUS/urg.) · aproveitamento da escala nos dias que passaram: <b>${pctBR(C.atPass, C.ofPass)}</b> das vagas viraram exame.</div>`;
        const linhaTipo = (nome, x, neg) => ({ estilo: neg ? 'font-weight:800;' : '', c: [nome, x.ofertadas, x.ocupadas, pctBR(vgPreench(x), x.ofertadas), x.acima || '—', x.atendidos, `${x.faltas} ${cinzaN(`(${pctBR(x.faltas, x.atendidos + x.faltas)})`)}`, x.pendentes || '—', x.saidas || '—', x.ociosas || '—', x.livres || '—'] });
        const linhaAd = (nome, a) => ({ estilo: 'color:#7c3aed;', c: [nome, '—', a.n, '—', '—', a.atendidos, a.faltas || '—', a.pendentes || '—', '—', '—', '—'] });
        const tTipo = tabelaHtml(['Tipo', 'Ofertadas', 'Agendados', 'Ocupação', 'Acima', 'Atendidos', 'Faltas', 'Sem desf.', 'Saídas', 'Ociosas', 'Livres'],
            [linhaTipo(VG_TIPO.prefeitura, P), linhaTipo(VG_TIPO.convenio_particular, V), linhaTipo('Total da escala', T, true), linhaAd('➕ Encaixes (adicionais)', E), linhaAd('➕ SUS hospitalar / urgência', S)]);
        const tBloco = tabelaHtml(['Bloco', 'Dias', 'Ofertadas', 'Agendados', 'Ocupação', 'Ociosas', 'Livres', 'Acima', 'Faltas'],
            (r.por_bloco || []).map(b => [`${VG_TIPO_CURTO[b.tipo] || escapeHtml(b.tipo)} · ${escapeHtml(VG_BLOCO[b.bloco] || b.bloco)}`, b.dias, b.ofertadas, b.ocupadas, pctBR(b.ofertadas - b.ociosas - b.livres, b.ofertadas), b.ociosas || '—', b.livres || '—', b.acima || '—', `${b.faltas} ${cinzaN(`(${pctBR(b.faltas, b.atendidos + b.faltas)})`)}`]));
        const dsw = {}, z0 = { dias: 0, ofertadas: 0, ocupadas: 0, atendidos: 0, faltas: 0, ociosas: 0, livres: 0 };
        (r.por_dia_semana || []).forEach(x => { const k = `${x.dow}|${x.periodo}`; (dsw[k] = dsw[k] || { dow: x.dow, periodo: x.periodo })[x.tipo] = x; });
        const tDsw = tabelaHtml(['Dia / período', 'Dias', 'Pref. agend./vagas', 'Pref. ociosas', 'Conv. agend./vagas', 'Conv. ociosas', 'Faltas'],
            Object.values(dsw).sort((a, b) => a.dow - b.dow || (a.periodo === 'manha' ? -1 : 1)).map(g => {
                const p = g.prefeitura || z0, v = g.convenio_particular || z0, at = p.atendidos + v.atendidos, fa = p.faltas + v.faltas;
                return [`${DOW_ISO[g.dow]} ${perTxt(g.periodo)}`, Math.max(p.dias, v.dias), p.ofertadas || p.ocupadas ? `${p.ocupadas}/${p.ofertadas}` : '—', p.ociosas || '—', v.ofertadas || v.ocupadas ? `${v.ocupadas}/${v.ofertadas}` : '—', v.ociosas || '—', `${fa} ${cinzaN(`(${pctBR(fa, at + fa)})`)}`];
            }));
        let tMes = '';
        if (per.meses > 1) {
            const pm = vgMeses(r);
            const comLivres = pm.some(g => g.s.livres), fora = g => (g.fora.ocupadas ? `${g.fora.ocupadas} ${cinzaN(`(${g.fora.faltas} f.)`)}` : '—');
            tMes = cartaoHtml('📆 Mês a mês', tabelaHtml(['Mês', 'Escala', 'Ofertadas', 'Agendados', 'Ocupação', 'Atendidos', 'Faltas', 'Ociosas', ...(comLivres ? ['Livres'] : []), 'Adicionais', 'Fora da escala'],
                pm.map(g => (g.esc
                    ? [mesNomeAno(g.mes), cinzaN(escapeHtml(g.fonte)), g.s.ofertadas, g.s.ocupadas, pctBR(g.s.ofertadas - g.s.ociosas - g.s.livres, g.s.ofertadas), g.s.atendidos, `${g.s.faltas} ${cinzaN(`(${pctBR(g.s.faltas, g.s.atendidos + g.s.faltas)})`)}`, g.s.ociosas || '—', ...(comLivres ? [g.s.livres || '—'] : []), (g.enc + g.sus) || '—', fora(g)]
                    : [mesNomeAno(g.mes), cinzaN('sem escala'), '—', '—', '—', '—', '—', '—', ...(comLivres ? ['—'] : []), (g.enc + g.sus) || '—', fora(g)]))),
                'Ofertadas, agendados, faltas e ociosas só nos dias em que o tipo tem escala. Adicionais = encaixes + SUS/urgência. Fora da escala = agendados em dias sem escala do tipo (ex.: Convênio antes de out/2026), com as faltas entre parênteses.');
        }
        const btnMini = 'background:none; border:1px solid #94a3b8; border-radius:4px; cursor:pointer; font-size:10px; padding:0 4px; margin-left:4px;';
        const tDia = tabelaHtml(['Dia', 'Pref.', 'Conv.', 'Sobra', 'Acima', 'Enc.', 'SUS', 'Atend.', 'Faltas', 'Saídas', ''],
            (r.por_dia || []).map(d => {
                const w = dIso(d.data).getDay(), fechado = d.escala && !d.pref_of && !d.conv_of;
                const util = w > 0 && w < 6 && !d.feriado && d.data >= `${VG_INICIO}-01`;
                const acao = d.escala && !fechado ? `<button data-vg-fechar="${d.data}" title="Marcar sem expediente (férias, curso…): vagas do dia = 0" style="${btnMini}">🚫</button>`
                    : util ? `<button data-vg-abrir="${d.data}" title="${fechado ? 'Reabrir: volta as vagas da regra' : 'Cadastrar a escala deste dia pela regra'}" style="${btnMini}">${fechado ? '↺' : '＋'}</button>` : '';
                const flag = d.feriado ? `🎌 ${escapeHtml(d.feriado)}` : !d.escala ? 'sem escala' : fechado ? 'sem expediente' : /planilha/.test(d.regra || '') ? 'escala estimada' : /email/.test(d.regra || '') ? 'escala do e-mail' : '';
                const fr = (oc, of) => (d.escala && of ? `${oc}/${of}` : oc || '—');
                return {
                    estilo: d.data === hojeIso ? 'background:rgba(37,99,235,.10); font-weight:700;' : d.data > hojeIso ? 'color:#64748b;' : '',
                    c: [`${DOW_ISO[((w + 6) % 7) + 1]} ${fmtBR(d.data).slice(0, 5)}`, fr(d.pref_oc, d.pref_of), fr(d.conv_oc, d.conv_of),
                        d.sobra ? `<b style="color:${d.data < r.hoje ? '#dc2626' : '#0284c7'};">${d.sobra}</b>` : '—', d.acima || '—', d.encaixes || '—', d.sus || '—', d.atendidos || '—', d.faltas || '—', d.saidas || '—',
                        `<span style="color:#94a3b8; font-size:9.5px;">${flag}</span>${acao}`]
                };
            }));
        const sug = vgSugestoes(r, C);
        return topo + kpis
            + cartaoHtml('🧭 Para onde foram as vagas', vgBarraHtml(T, adic), `${T.ofertadas} vagas da escala${adic ? ` + ${adic} adicionais` : ''}${T.acima ? ` · ${T.acima} agendado(s) acima da escala entram em atendidos / faltas / sem desfecho` : ''}`)
            + cartaoHtml('💡 Leituras e sugestões', `<ul style="margin:0; padding-left:16px; font-size:10.5px; line-height:1.55;">${sug.length ? sug.map(x => `<li>${x}</li>`).join('') : '<li>Sem observações.</li>'}</ul>`)
            + `<div id="vgIABox">${vgIA ? anIAHtml(vgIA) : ''}</div>`
            + cartaoHtml('📋 Escala × agenda por tipo de vaga', tTipo, 'Ocupação = vagas da escala com paciente. Faltas (%) sobre os agendados com desfecho.')
            + tMes
            + cartaoHtml('🧩 Por bloco da escala', tBloco, 'Ociosas, livres e acima contadas dentro de cada bloco.')
            + cartaoHtml('📅 Por dia da semana e período', tDsw)
            + `<details class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:8px 10px; margin-bottom:10px;"><summary style="font-weight:bold; font-size:11.5px; cursor:pointer;">🗒 Dia a dia (${(r.por_dia || []).length} dias) — sobra vermelha = ociosa · azul = livre · 🚫 marca dia sem expediente</summary>${tDia}</details>`
            + `<div style="font-size:9.5px; color:#94a3b8; line-height:1.5;">Como contamos: 1 paciente num horário = 1 vaga (2 exames juntos contam 1). Saída (desmarcou, cancelado, saiu da planilha sem chegar) devolve a vaga. Encaixe e SUS/urgência são adicionais (fora da escala). Ociosa = vaga de dia que já passou sem paciente; livre = de hoje em diante. Acima = mais pacientes que vagas no mesmo período e tipo (não compensa ociosas de outro período). Comparação só nos dias em que o tipo tem escala: regra v6 desde out/2026; antes, Prefeitura pela escala dos e-mails (ago–set/2026) ou estimada pelos horários da planilha (🧩 abaixo). Calculado no banco — igual nos 3 computadores e no iPhone.</div>`;
    }
    async function renderVagas() {
        const content = document.getElementById('contentDashboard');
        if (!getSupabaseConfig()) { content.innerHTML = '<div style="padding:20px; color:#f59e0b;">Configure a nuvem (⚙️ API) e faça login para ver as vagas.</div>'; return; }
        content.innerHTML = '<div style="text-align:center; padding:30px; color:#60a5fa;">⏳ Carregando vagas × agenda...</div>';
        const per = vgDatas(vgPeriodo);
        try {
            await flushOutbox();
            const r = await requestSupabase('rpc/vagas_periodo', 'POST', { p_ini: per.ini, p_fim: per.fim });
            if (vgUltimo && vgUltimo.periodo !== vgPeriodo) vgIA = null;
            vgUltimo = { r, per, periodo: vgPeriodo };
            content.innerHTML = vgHtml(r, per) + histCardHtml();
            histLigar();
            const $c = id => document.getElementById(id);
            $c('vgPeriodoSel').onchange = e => { vgPeriodo = e.target.value; vgIA = null; renderVagas(); };
            $c('btnVgRel').onclick = relatorioVagas;
            $c('btnVgIA').onclick = analiseIAVagas;
            if ($c('btnVgGerar')) $c('btnVgGerar').onclick = () => vgGerarMes(per);
            content.querySelectorAll('[data-vg-fechar]').forEach(b => { b.onclick = () => vgFecharDia(b.dataset.vgFechar); });
            content.querySelectorAll('[data-vg-abrir]').forEach(b => { b.onclick = () => vgAbrirDia(b.dataset.vgAbrir); });
        } catch (err) {
            if (err.status !== undefined && err.status !== 404) reportCloudError(err, 'Vagas', false);
            content.innerHTML = `<div style="text-align:center; padding:20px; color:#e11d48;">${err.status === 404 ? 'A função de vagas (vagas_periodo) não existe neste banco.' : 'Erro ao buscar as vagas:'}<br>${escapeHtml(err.message)}</div>`;
        }
    }
    async function vgGerarMes(per) {
        const regra = vgRegraDe(per.ini);
        if (!confirm(`Cadastrar as vagas de ${per.rotulo} pela regra ${regra} (escala padrão)?\n\nSó entram os dias úteis SEM escala (feriados ficam de fora). Dias já cadastrados ou marcados sem expediente não mudam.\nSe a escala enviada à Prefeitura for diferente, ajuste dia a dia (🚫 / ↺).`)) return;
        try {
            const n = await requestSupabase('rpc/vagas_gerar', 'POST', { p_ini: per.ini, p_fim: per.fim, p_regra: regra, p_fonte: `regra ${regra} (gerada na Agenda em ${fmtBR(getTodayIso())})`, p_fechados: [], p_substituir: false });
            alert(`✓ ${n} linha(s) de vagas cadastrada(s).`);
            renderVagas();
        } catch (e) { alert('Não consegui gerar as vagas:\n' + e.message); }
    }
    async function vgFecharDia(d) {
        if (!confirm(`Marcar ${fmtBR(d)} como SEM EXPEDIENTE (férias, curso, ausência)?\n\nAs vagas do dia passam a 0 e deixam de contar como ociosas. Pacientes agendados nesse dia aparecem como "acima da escala". Dá para desfazer com ↺.`)) return;
        try {
            await requestSupabase(`agenda_vagas?data=eq.${d}`, 'PATCH', { vagas: 0, fonte: `sem expediente (marcado na Agenda em ${fmtBR(getTodayIso())})` }, { Prefer: 'return=minimal' });
            renderVagas();
        } catch (e) { alert('Não consegui alterar:\n' + e.message); }
    }
    async function vgAbrirDia(d) {
        const regra = vgRegraDe(d), dow = ((dIso(d).getDay() + 6) % 7) + 1;
        try {
            const regras = await requestSupabase('rpc/vagas_regra', 'POST', { p_regra: regra });
            const linhas = (Array.isArray(regras) ? regras : []).filter(x => x.dow === dow)
                .map(x => ({ data: d, periodo: x.periodo, tipo: x.tipo, bloco: x.bloco, vagas: x.vagas, regra, fonte: `regra ${regra} (cadastrada na Agenda em ${fmtBR(getTodayIso())})` }));
            if (!linhas.length) { alert('A regra não tem vagas para esse dia da semana.'); return; }
            if (!confirm(`Cadastrar / reabrir a escala de ${fmtBR(d)} pela regra ${regra}? (${linhas.reduce((a, x) => a + x.vagas, 0)} vagas)`)) return;
            await requestSupabase('agenda_vagas?on_conflict=data,periodo,tipo,bloco', 'POST', linhas, { Prefer: 'resolution=merge-duplicates,return=minimal' });
            renderVagas();
        } catch (e) { alert('Não consegui cadastrar:\n' + e.message); }
    }
    function relatorioVagas() {
        if (!vgUltimo) return;
        const { r, per } = vgUltimo, C = vgCalc(r), T = C.tot, P = C.res.prefeitura, V = C.res.convenio_particular, E = C.ad.encaixe, S = C.ad.sus;
        const lt = (nome, x) => [nome, x.ofertadas, x.ocupadas, pctBR(vgPreench(x), x.ofertadas), x.atendidos, `${x.faltas} (${pctBR(x.faltas, x.atendidos + x.faltas)})`, x.pendentes, x.saidas, x.ociosas, x.livres, x.acima];
        const la = (nome, a) => [nome, '—', a.n, '—', a.atendidos, a.faltas, a.pendentes, '—', '—', '—', '—'];
        const dsw = {}, z0 = { dias: 0, ofertadas: 0, ocupadas: 0, atendidos: 0, faltas: 0, ociosas: 0, livres: 0 };
        (r.por_dia_semana || []).forEach(x => { const k = `${x.dow}|${x.periodo}`; (dsw[k] = dsw[k] || { dow: x.dow, periodo: x.periodo })[x.tipo] = x; });
        const pm = vgMeses(r), fontes = vgFontesTxt(r);
        const corpo = `<h1>Ultrassonografia — Vagas ofertadas × agenda</h1><div class="meta">Período: <b>${escapeHtml(per.rotulo)}</b> · ${r.dias_escala} dia(s) com escala · HAMC/LADI</div>
            <div class="kpis"><div class="kpi"><b>${T.ofertadas}</b>vagas ofertadas</div><div class="kpi"><b>${vgPreench(T)} (${pctBR(vgPreench(T), T.ofertadas)})</b>vagas preenchidas</div><div class="kpi"><b>+${E.n + S.n}</b>adicionais (encaixe + SUS)</div><div class="kpi"><b>${T.atendidos + E.atendidos + S.atendidos}</b>exames realizados</div><div class="kpi"><b>${T.faltas} (${pctBR(T.faltas, T.atendidos + T.faltas)})</b>faltas</div><div class="kpi"><b>${T.ociosas}</b>vagas ociosas</div></div>
            ${vgIA ? `<h2>Análise e sugestões</h2><div class="ia">${escapeHtml(vgIA)}</div>` : ''}
            <h2>Por tipo de vaga</h2>${tabRel(['Tipo', 'Ofertadas', 'Agendados', 'Ocupação', 'Atendidos', 'Faltas', 'Sem desfecho', 'Saídas', 'Ociosas', 'Livres', 'Acima da escala'], [lt(VG_TIPO.prefeitura, P), lt(VG_TIPO.convenio_particular, V), lt('Total da escala', T), la('Encaixes (adicionais)', E), la('SUS hospitalar / urgência (adicionais)', S)])}
            ${per.meses > 1 ? `<h2>Mês a mês</h2>${tabRel(['Mês', 'Escala', 'Ofertadas', 'Agendados', 'Ocupação', 'Encaixes', 'Atendidos', 'Faltas', 'Ociosas', 'Livres', 'Fora da escala'], pm.map(g => (g.esc ? [mesNomeAno(g.mes), g.fonte, g.s.ofertadas, g.s.ocupadas, pctBR(g.s.ofertadas - g.s.ociosas - g.s.livres, g.s.ofertadas), g.enc, g.s.atendidos, `${g.s.faltas} (${pctBR(g.s.faltas, g.s.atendidos + g.s.faltas)})`, g.s.ociosas, g.s.livres, g.fora.ocupadas || '—'] : [mesNomeAno(g.mes), 'sem escala', '—', '—', '—', g.enc, '—', '—', '—', '—', g.fora.ocupadas || '—'])))}` : ''}
            ${fontes ? `<div class="meta">Escala usada: ${escapeHtml(fontes)}. Estimada = 1 horário aberto na planilha da Prefeitura = 1 vaga (meses sem a escala do e-mail).</div>` : ''}
            <h2>Por bloco da escala</h2>${tabRel(['Bloco', 'Dias', 'Ofertadas', 'Agendados', 'Ocupação', 'Ociosas', 'Livres', 'Acima', 'Faltas'], (r.por_bloco || []).map(b => [`${VG_TIPO[b.tipo] || b.tipo} — ${VG_BLOCO[b.bloco] || b.bloco}`, b.dias, b.ofertadas, b.ocupadas, pctBR(b.ofertadas - b.ociosas - b.livres, b.ofertadas), b.ociosas, b.livres, b.acima, b.faltas]))}
            <h2>Por dia da semana e período</h2>${tabRel(['Dia / período', 'Prefeitura (agend./vagas)', 'Ociosas Pref.', 'Convênio (agend./vagas)', 'Ociosas Conv.', 'Faltas'], Object.values(dsw).sort((a, b) => a.dow - b.dow || (a.periodo === 'manha' ? -1 : 1)).map(g => { const p = g.prefeitura || z0, v = g.convenio_particular || z0; return [`${DOW_ISO[g.dow]} ${perTxt(g.periodo)}`, `${p.ocupadas}/${p.ofertadas}`, p.ociosas, `${v.ocupadas}/${v.ofertadas}`, v.ociosas, p.faltas + v.faltas]; }))}
            <h2>Leituras</h2><ul>${vgSugestoes(r, C).map(s => `<li>${s}</li>`).join('')}</ul>
            <div class="meta">Como contamos: 1 paciente num horário = 1 vaga (2 exames juntos contam 1). Saída (desmarcou, cancelado) devolve a vaga. Encaixes e SUS/urgência são atendimentos adicionais, fora da escala. Ociosa = vaga de dia que já passou sem paciente; livre = de hoje em diante. Fonte: escala mensal de vagas × Agenda US (Supabase).</div>`;
        janelaRelatorio(`Vagas US — ${per.curto}`, corpo);
    }
    async function analiseIAVagas() {
        if (!vgUltimo) return;
        const btn = document.getElementById('btnVgIA'), boxIA = document.getElementById('vgIABox');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Analisando…'; }
        try {
            const { r, per } = vgUltimo, C = vgCalc(r);
            const dados = JSON.stringify({ periodo: per.rotulo, dias_com_escala: r.dias_escala, fonte_da_escala: vgFontesTxt(r) || 'regra v6', por_tipo: r.resumo, adicionais: r.adicionais, fora_da_escala: r.sem_escala, por_bloco: r.por_bloco, por_dia_semana: r.por_dia_semana, por_mes: per.meses > 1 ? r.por_mes : undefined, fora_da_escala_por_mes: per.meses > 1 ? r.sem_escala_mes : undefined, aproveitamento_dias_passados: { atendidos: C.atPass, vagas: C.ofPass } });
            const prompt = 'Você é consultor de gestão de um serviço de ultrassonografia hospitalar (HAMC/LADI, Santa Rita do Sapucaí-MG). ' +
                'Abaixo, a escala de vagas ofertadas (Prefeitura e Convênio/Particular) comparada com a agenda real, em JSON agregado (sem pacientes). ' +
                'Definições: 1 paciente num horário = 1 vaga; ofertadas = vagas da escala; ocupadas = agendados que não saíram; ociosas = vagas de dias passados sem paciente; ' +
                'livres = de hoje em diante; acima = agendados além das vagas; adicionais = encaixes e SUS/urgência fora da escala; saídas = desmarcações/cancelamentos (devolvem a vaga); ' +
                'fora_da_escala = agendados em dias sem escala do tipo (não entram na comparação); escala estimada = horários abertos na planilha da Prefeitura (meses antigos, menos precisa).\n' +
                'Escreva em português do Brasil, sem markdown, no máximo 220 palavras:\n1) resumo com os números principais (oferta, ocupação, faltas, ociosas, adicionais);\n' +
                '2) onde está a ineficiência (bloco, dia/período) — só o que os números sustentam; amostras pequenas não valem conclusão;\n' +
                '3) 3 a 5 ações práticas e mensuráveis (redistribuir vagas entre blocos/dias, devolver vagas à Prefeitura com antecedência, overbooking controlado onde há mais faltas, confirmação na véspera, lista de espera para saídas).\n' +
                `Não invente dados.\n\nDADOS:\n${dados}`;
            const { texto, ia } = await chamarIA({ prompt });
            vgIA = `${texto.trim()}\n\n— ${ia}`;
            if (boxIA) boxIA.innerHTML = anIAHtml(vgIA);
        } catch (e) { alert('Não consegui gerar a análise:\n' + e.message); }
        finally { if (btn) { btn.disabled = false; btn.textContent = '🧠 Sugestões (Opus)'; } }
    }

    // =====================================================================
    // 16F. 🧩 HISTÓRICO DA PREFEITURA (v9.7) — meses sem controle: planilha × PACS
    // ---------------------------------------------------------------------
    // Só para dias SEM agenda da Prefeitura no banco (antes de 20/08/2026 e buracos). Por dia:
    //  • agendados = linhas com paciente das abas USG HAMC e USG HAMC MUTIRAO (Doppler de sábado);
    //  • atendido = o paciente tem exame de US no PACS no MESMO dia: nome ≥ 0,88, ou 0,72–0,88 com data de
    //    nascimento igual ou exame da mesma família; nascimento diferente exige nome ≥ 0,97;
    //  • falta = agendado sem exame no dia (exame até 10 dias antes/depois → anotação "exame em dd/mm");
    //  • período sem NENHUM exame de US no PACS = sem expediente: agendados → cancelado (saída), não falta;
    //  • horário "VER E-SUS" (regulação, sem nome) recebe paciente da Prefeitura do PACS fora da planilha;
    //    o restante da Prefeitura no PACS vira encaixe (origem encaixe_historico);
    //  • escala: dia sem escala recebe a estimativa pelos horários da planilha (1 horário = 1 vaga, regra
    //    'planilha'); dia com escala (e-mail) e período sem expediente → vagas 0.
    // Simular primeiro (não grava nada); Gravar refaz a conta e grava. Na tela e no banco, só números.
    // =====================================================================
    // >>> HIST-NUCLEO (sem rede e sem tela)
    const HIST_ORIGENS = ['historico_planilha', 'historico_mutirao', 'encaixe_historico'];
    const HIST_JANELA_DIAS = 10;
    const HIST_NOTA_RE = /^(FERIAD|BLOQUE|F[EÉ]RIAS|SEM (ATEND|EXPED|AGENDA|M[EÉ]DICO)|CANCELAD|DESMARC|N[AÃ]O AGEND|LIVRE|VAG[OA]\b|RESERVAD|PONTO FACULT|RECESSO|CURSO|CONGRESSO|FECHAD|SUSPENS)/;
    function histPascoa(y) {
        const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        const x = h + l - 7 * m + 114;
        return new Date(y, Math.floor(x / 31) - 1, (x % 31) + 1);
    }
    // feriado nacional (mesma regra da função feriado() do banco, sem os extras municipais)
    function histFeriado(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        if (['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].includes(iso.slice(5))) return true;
        return [-48, -47, -2, 60].includes(Math.round((new Date(y, m - 1, d) - histPascoa(y)) / 864e5));
    }
    function histDN(s) { // data de nascimento → AAAA-MM-DD (planilha "dd/mm/aaaa"; PACS ISO); CNS e lixo → null
        const t = String(s == null ? '' : s).trim();
        let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/);
        if (!m) return null;
        let y = +m[3]; if (y < 100) y += y > (new Date().getFullYear() % 100) ? 1900 : 2000;
        return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    // famílias de exame — desempate quando o nome é só parecido
    function histFamilias(txt) {
        const t = ` ${normName(txt)} `, f = new Set();
        if (/DOPP?LER|DUPLEX/.test(t)) {
            f.add('doppler');
            if (/CAROTID|VERTEBR/.test(t)) f.add('pescoco');
            else if (/MEMBR|MMII|MMSS| MI[DE] | MS[DE] |VENOS|ARTERIA|VARIZ|PERNA|BRACO/.test(t)) f.add('membro');
        }
        if (/TIREOID|TIROID|CERVICAL|PESCO|CAROTID/.test(t)) f.add('pescoco');
        if (/ABDOM/.test(t)) f.add('abdome');
        if (/ RINS |RENA|URINAR|BEXIGA/.test(t)) f.add('urinario');
        if (/PROSTAT/.test(t)) f.add('prostata');
        if (/MAMA/.test(t)) f.add('mama');
        if (/PELV|TRANSVAG|ENDOVAG|USTV| TV |UTER|OVARI/.test(t)) f.add('pelve');
        if (/OBSTET|GESTA|MORFOL/.test(t)) f.add('obstetrica');
        if (/ARTIC|ARTC|OMBRO|JOELH|PUNHO|COTOVEL|TORNOZ|QUADRIL| MAO | PE |TEND|MUSC|PARTES MOLES/.test(t)) f.add('msk');
        if (/BOLSA|TESTIC|ESCROT/.test(t)) f.add('bolsa');
        return f;
    }
    const histCompat = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };
    function histBloco(exames) { // bloco da escala estimada: maioria (≥ 60%) Doppler de membro / pescoço; senão US geral
        if (!exames.length) return 'us_geral';
        const fs = exames.map(histFamilias), n = exames.length;
        if (fs.filter(f => f.has('membro')).length / n >= 0.6) return 'doppler_membro';
        if (fs.filter(f => f.has('pescoco')).length / n >= 0.6) return 'pescoco';
        return 'us_geral';
    }
    function histClasse(l) { // linha da planilha: agendado | esus (regulação, sem nome) | vazio | nota (bloqueio/aviso)
        if (/VER\s*E\s*-?\s*SUS|\bE-?SUS\b|REGULA/.test(l.pac)) return 'esus';
        if (!l.pac) return 'vazio';
        if (HIST_NOTA_RE.test(l.pac) || l.pac.split(' ').filter(w => w.length > 1).length < 2) return 'nota';
        return 'agendado';
    }
    // CSV da planilha (colunas A data · B hora · D paciente · E nasc./CNS · H procedimento · I observação) → linhas do período
    function histLerPlanilha(csv, aba, ini, fim, out) {
        parseCSV(csv).forEach(c => {
            const m = String(c[0] || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (!m) return;
            const data = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            if (data < ini || data > fim || !/\d/.test(String(c[1] || ''))) return;
            out.push({ aba, data, hora: normalizeTime(c[1]), pac: normText(c[3]), dn: String(c[4] || '').trim(), proc: normText(c[7]), obs: aba === 'pref' ? obsDaPlanilha(c[8]) : null });
        });
        return out;
    }
    function histFechar(r) { // exame no PACS sem imagem registrada: atendido pela ficha (sem tempo de espera)
        if (r.status === 'esperando') { r.status = 'atendido'; r.atendidoEm = r.chegouEm || null; r.atendidoFonte = 'ficha'; r.tempoEsperaMin = null; }
        return r;
    }
    // núcleo: dias do período (antes de hoje) → linhas da agenda, vagas estimadas, vagas a zerar e resumo por mês
    function histProcessar({ plan, pacs, ini, fim, hoje, controlados, reconstruidos, refazer = false, vagasExist, estimarEscala = true, marcarSemExpediente = true, agoraIso }) {
        const porDiaPlan = new Map(), porDiaPacs = new Map(), gruposDia = new Map();
        plan.forEach(l => { l.cls = histClasse(l); if (!porDiaPlan.has(l.data)) porDiaPlan.set(l.data, []); porDiaPlan.get(l.data).push(l); });
        pacs.forEach(x => {
            if (!x || !x.paciente || String(x.exa_situacao || '').toUpperCase() === 'CANCELADO') return;
            if (normName(x.paciente.pac_nome).startsWith('TESTE')) return;
            const d = String(x.exa_data || '').slice(0, 10); if (!d) return;
            if (!porDiaPacs.has(d)) porDiaPacs.set(d, []); porDiaPacs.get(d).push(x);
        });
        const grupos = d => {
            if (!gruposDia.has(d)) gruposDia.set(d, groupPacsExams(porDiaPacs.get(d) || []).map(g => Object.assign(g, {
                dn: histDN(g.exames[0].paciente && g.exames[0].paciente.pac_dtnasc), fam: histFamilias(g.examDescs.join(' ')),
                pref: convenioFromPacs(g.convenioDesc).tipo === 'Prefeitura' })));
            return gruposDia.get(d);
        };
        const pontua = (p, g) => {
            let sc = nameScore(p.nome, g.nome);
            if (sc < 0.5) return 0;
            if (p.dn && g.dn) { if (p.dn === g.dn) { if (sc >= 0.6) sc = Math.max(sc, 0.96); } else if (sc < 0.97) sc = Math.min(sc, 0.7); }
            return sc;
        };
        const outroDia = (p, d0) => { // exame do mesmo paciente até HIST_JANELA_DIAS antes/depois
            for (let k = 1; k <= HIST_JANELA_DIAS; k++) for (const s of [k, -k]) {
                const t = dIso(d0); t.setDate(t.getDate() + s); const dd = isoDe(t);
                if (porDiaPacs.has(dd) && grupos(dd).some(g => pontua(p, g) >= PACS_LINK_AUTO)) return dd;
            }
            return null;
        };
        const nota = (txt, saida) => (saida ? { em: agoraIso, tag: 'Saída', motivo: 'Sem expediente', txt, por: 'Histórico' } : { em: agoraIso, tag: 'Outra', txt, por: 'Histórico' });
        const origemAba = a => (a === 'mut' ? 'historico_mutirao' : 'historico_planilha');
        const out = { linhas: [], vagas: [], zerar: [] }, mesRes = {};
        const M = m => (mesRes[m] = mesRes[m] || { mes: m, dias: 0, controlados: 0, ja: 0, horarios: 0, agendados: 0, pacientes: 0, atendidos: 0, faltas: 0, cancelados: 0, remarcados: 0, esus: 0, esus_ok: 0, encaixes: 0, duvidosos: 0, notas_planilha: 0, sem_exped: 0, vagas_est: 0, vagas_zeradas: 0, pacs_us: 0 });
        for (let t = dIso(ini); isoDe(t) <= fim && isoDe(t) < hoje; t.setDate(t.getDate() + 1)) {
            const d = isoDe(t), r = M(d.slice(0, 7)), lp = porDiaPlan.get(d) || [], gs = grupos(d), exD = porDiaPacs.get(d) || [];
            if (controlados.has(d)) { if (lp.length || gs.length) r.controlados++; continue; }
            if (reconstruidos.has(d) && !refazer) { r.ja++; continue; }
            if (!lp.length && !gs.some(g => g.pref)) continue; // nada da Prefeitura no dia
            r.dias++; r.pacs_us += exD.length;
            const aberto = { manha: exD.some(x => periodoFromHora(x.exa_hora) === 'manha'), tarde: exD.some(x => periodoFromHora(x.exa_hora) === 'tarde') };
            r.horarios += lp.filter(l => l.cls !== 'nota').length; r.notas_planilha += lp.filter(l => l.cls === 'nota').length;
            // agendados: 1 horário + paciente = 1 vaga (procedimentos do mesmo horário juntos)
            const slots = new Map();
            lp.filter(l => l.cls === 'agendado').forEach(l => {
                const k = `${l.hora}|${normName(l.pac)}`;
                if (!slots.has(k)) slots.set(k, { hora: l.hora, pac: l.pac, dn: histDN(l.dn), partes: [], obs: l.obs || null, aba: l.aba });
                const s = slots.get(k);
                (exameDaPlanilha(l.proc, d, l.hora) || '').split(' + ').forEach(p => { if (p && !s.partes.includes(p)) s.partes.push(p); });
                if (!s.dn) s.dn = histDN(l.dn);
            });
            const pacientes = new Map();
            slots.forEach(s => { const k = normName(s.pac); if (!pacientes.has(k)) pacientes.set(k, { nome: s.pac, dn: s.dn, slots: [] }); const p = pacientes.get(k); p.slots.push(s); if (!p.dn) p.dn = s.dn; });
            r.agendados += slots.size; r.pacientes += pacientes.size;
            // vínculo com o PACS do mesmo dia: maiores notas primeiro, cada exame do PACS serve a 1 paciente
            const pares = [];
            pacientes.forEach((p, kp) => {
                const famP = histFamilias(p.slots.map(s => s.partes.join(' ')).join(' '));
                gs.forEach((g, gi) => { const sc = pontua(p, g); if (sc >= PACS_LINK_AUTO || (sc >= PACS_LINK_ASK && histCompat(famP, g.fam))) pares.push({ kp, gi, sc }); });
            });
            pares.sort((a, b) => b.sc - a.sc);
            const casP = new Map(), casG = new Set();
            pares.forEach(x => { if (!casP.has(x.kp) && !casG.has(x.gi)) { casP.set(x.kp, x); casG.add(x.gi); } });
            pacientes.forEach((p, kp) => {
                const base = p.slots.map(s => ({ hora: s.hora, tipo: 'Prefeitura', convenio: 'PREFEITURA', paciente: p.nome, exame: s.partes.join(' + ') || 'USG NÃO INFORMADO', qtdExames: Math.max(1, s.partes.length), status: 'pendente', obs: s.obs, origem: origemAba(s.aba), notas: null }));
                const cas = casP.get(kp);
                if (cas) {
                    linkGroupToRows(gs[cas.gi], base).forEach(row => out.linhas.push(toCloudRow(histFechar(row), d)));
                    r.atendidos += base.length; if (cas.sc < PACS_LINK_AUTO) r.duvidosos++;
                    return;
                }
                let outro;
                base.forEach(row => {
                    if (!aberto[periodoFromHora(row.hora)]) { row.status = 'cancelado'; row.notas = [nota('nenhum exame de US no PACS no período (histórico)', true)]; r.cancelados++; }
                    else {
                        row.status = 'faltou'; r.faltas++;
                        if (outro === undefined) { outro = outroDia(p, d); if (outro) r.remarcados++; }
                        if (outro) row.notas = [nota(`exame de US no PACS em ${fmtBR(outro).slice(0, 5)} (fora do dia agendado) — histórico`)];
                    }
                    out.linhas.push(toCloudRow(row, d));
                });
            });
            // regulação (VER E-SUS): horário sem nome recebe paciente da Prefeitura do PACS que não estava na planilha
            const sobra = gs.filter((g, gi) => g.pref && !casG.has(gi)), usados = new Set();
            const esus = lp.filter(l => l.cls === 'esus').sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
            r.esus += esus.length;
            esus.forEach(l => {
                const g = sobra.find(x => !usados.has(x) && periodoFromHora(x.horaFicha) === periodoFromHora(l.hora)); if (!g) return;
                usados.add(g); r.esus_ok++;
                const row = { hora: l.hora, tipo: 'Prefeitura', convenio: 'PREFEITURA', paciente: g.nome, exame: g.examDescs[0] || 'NÃO INFORMADO', status: 'pendente', obs: 'REGULAÇÃO E-SUS (HORÁRIO SEM NOME NA PLANILHA)', origem: origemAba(l.aba) };
                out.linhas.push(toCloudRow(histFechar(applyPacsToRow(row, g, g.examIds)), d));
            });
            sobra.filter(g => !usados.has(g)).forEach(g => { const e = newEncaixeFromPacs(g); e.origem = 'encaixe_historico'; out.linhas.push(toCloudRow(histFechar(e), d)); r.encaixes++; });
            // escala do dia
            ['manha', 'tarde'].forEach(per => {
                const ex = vagasExist.get(d);
                if (ex) {
                    const pos = ex.filter(v => v.periodo === per && v.vagas > 0), antes = pos.reduce((a, v) => a + v.vagas, 0);
                    if (antes && !aberto[per] && marcarSemExpediente) { out.zerar.push({ data: d, periodo: per, antes }); r.sem_exped++; r.vagas_zeradas += antes; }
                    return;
                }
                const rs = lp.filter(l => l.cls !== 'nota' && periodoFromHora(l.hora) === per);
                if (!estimarEscala || !rs.length || (histFeriado(d) && !aberto[per])) return;
                const porBloco = {};
                ['pref', 'mut'].forEach(aba => {
                    const ra = rs.filter(l => l.aba === aba); if (!ra.length) return;
                    const n = new Set(ra.map((l, i) => (l.cls === 'agendado' ? `${l.hora}|${normName(l.pac)}` : `v${i}`))).size;
                    const bloco = aba === 'mut' ? 'doppler_membro' : histBloco(ra.filter(l => l.cls === 'agendado').map(l => l.proc));
                    (porBloco[bloco] = porBloco[bloco] || { n: 0, mut: false }).n += n; if (aba === 'mut') porBloco[bloco].mut = true;
                });
                Object.entries(porBloco).forEach(([bloco, b]) => {
                    const fechado = !aberto[per];
                    out.vagas.push({ data: d, periodo: per, tipo: 'prefeitura', bloco, vagas: fechado ? 0 : b.n, regra: 'planilha',
                        fonte: fechado ? `sem expediente — ${b.n} horário(s) na planilha e nenhum exame de US no PACS no período (histórico)`
                            : `estimada: ${b.n} horário(s) abertos na planilha da Prefeitura${b.mut ? ' (aba Mutirão)' : ''} (histórico)` });
                    if (fechado) r.sem_exped++; else r.vagas_est += b.n;
                });
            });
        }
        out.resumo = Object.values(mesRes).sort((a, b) => (a.mes < b.mes ? -1 : 1));
        return out;
    }
    // <<< HIST-NUCLEO
    let histUltimo = null, histRodando = false;
    function histResHtml(h) {
        if (h.erro) return `<div style="font-size:10.5px; color:#e11d48; margin:4px 0;">⚠️ Não consegui reconstruir: ${escapeHtml(h.erro)}</div>`;
        const K = ['dias', 'horarios', 'agendados', 'atendidos', 'faltas', 'remarcados', 'cancelados', 'esus', 'esus_ok', 'encaixes', 'duvidosos', 'vagas_est', 'sem_exped', 'vagas_zeradas', 'controlados', 'ja'];
        const T = Object.fromEntries(K.map(k => [k, h.resumo.reduce((a, x) => a + (x[k] || 0), 0)]));
        const lin = (nome, x, neg) => ({ estilo: neg ? 'font-weight:800;' : '', c: [nome, x.dias, x.horarios, x.agendados, x.atendidos, `${x.faltas} ${cinzaN(`(${pctBR(x.faltas, x.atendidos + x.faltas)})`)}`, x.cancelados || '—', x.esus ? `${x.esus_ok}/${x.esus}` : '—', x.encaixes || '—', x.vagas_est || '—', x.sem_exped ? `${x.sem_exped}${x.vagas_zeradas ? ` (−${x.vagas_zeradas})` : ''}` : '—'] });
        const st = h.simulado ? `🔎 Simulação de ${fmtBR(h.ini)} a ${fmtBR(h.fim)} — <b>nada foi gravado</b>. Confira e clique em 💾 Gravar.`
            : `✓ Gravado em ${new Date(h.em).toLocaleString('pt-BR')}: ${h.linhas.length} linha(s) na agenda, ${h.vagas.length} linha(s) de escala estimada${h.zerar.length ? `, ${h.zerar.length} período(s) marcado(s) sem expediente` : ''}.`;
        return `<div style="font-size:10.5px; margin:4px 0 6px;">${st}</div>` + tabelaHtml(['Mês', 'Dias', 'Horários', 'Agendados', 'Atendidos', 'Faltas', 'Sem exped.', 'e-SUS', 'Encaixes', 'Escala estimada', 'Períodos fechados'],
            [...h.resumo.filter(x => x.dias || x.controlados || x.ja).map(x => lin(mesNomeAno(x.mes), x)), lin('Total', T, true)])
            + `<div style="font-size:10.5px; margin-top:4px;">Faltas que fizeram o exame em outro dia (até ${HIST_JANELA_DIAS} dias): <b>${T.remarcados}</b> · vínculos por nome parecido (aceitos por exame ou nascimento): <b>${T.duvidosos}</b> · dias pulados (já tinham agenda no banco): <b>${T.controlados + T.ja}</b></div>`
            + `<div style="font-size:9.5px; color:#94a3b8; margin-top:4px; line-height:1.5;">Horários = linhas da planilha (vazias e e-SUS incluídas). Faltas (%) sobre agendados com desfecho. Sem exped. = agendados de período sem nenhum exame de US no PACS (viram saída, não falta). e-SUS = horários de regulação preenchidos com paciente da Prefeitura do PACS / total. Períodos fechados = sem nenhum exame no PACS (escala estimada 0; escala do e-mail zerada, entre parênteses).</div>`;
    }
    function histCardHtml() {
        const h = new Date(), ops = [];
        for (let i = 1; i <= 30; i++) ops.push(isoDe(new Date(h.getFullYear(), h.getMonth() - i, 1)).slice(0, 7));
        const de = histUltimo ? histUltimo.ini.slice(0, 7) : `${h.getFullYear()}-01`, ate = histUltimo ? histUltimo.fim.slice(0, 7) : ops[0];
        const sel = (id, v) => `<select id="${id}" style="font-size:11px; font-weight:700; padding:2px 5px; border-radius:4px; border:1px solid #94a3b8; background:#fff; color:#0f172a;">${ops.map(m => `<option value="${m}" ${m === v ? 'selected' : ''}>${mesNomeAno(m)}</option>`).join('')}</select>`;
        return `<details id="histBox" class="dash-box" ${histUltimo ? 'open' : ''} style="background:#fff; border:1px solid #e2e8f0; border-radius:7px; padding:8px 10px; margin-bottom:10px;">
            <summary style="font-weight:bold; font-size:11.5px; cursor:pointer;">🧩 Meses anteriores ao controle — reconstruir a Prefeitura (planilha × PACS)</summary>
            <div style="font-size:10.5px; color:#64748b; margin:6px 0; line-height:1.5;">Só nos dias <b>sem agenda da Prefeitura no banco</b>: agendados da planilha (aba USG HAMC e, se marcada, a aba do Mutirão) × exames de US do PACS do mesmo dia → atendido ou falta. Período sem nenhum exame de US no PACS = sem expediente (vira saída, não falta). Paciente da Prefeitura no PACS fora da planilha preenche horário "VER E-SUS" ou vira encaixe. Dia sem escala cadastrada recebe a escala estimada pelos horários da planilha. Os nomes não saem do computador — só para o banco, como na agenda do dia.</div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:11px;">De ${sel('histDe', de)} até ${sel('histAte', ate)}
                <label><input type="checkbox" id="histMut" checked> aba Mutirão</label>
                <label><input type="checkbox" id="histEsc" checked> estimar a escala pela planilha</label>
                <label title="Apaga e refaz só o que esta ferramenta gravou nesses dias (agenda histórica e escala estimada)"><input type="checkbox" id="histRefazer"> refazer dias já reconstruídos</label>
                <button id="btnHistSim" class="btn-top-action" style="background:#0f766e; color:#fff;">🔎 Simular</button>
                <button id="btnHistGravar" class="btn-top-action" style="background:#b45309; color:#fff;" ${histUltimo && histUltimo.simulado && !histUltimo.erro ? '' : 'disabled'} title="Refaz a conta e grava (simule antes)">💾 Gravar</button>
                <span id="histStatus" style="font-size:10.5px; color:#64748b;"></span></div>
            <div id="histRes" style="margin-top:6px;">${histUltimo ? histResHtml(histUltimo) : ''}</div></details>`;
    }
    function histLigar() {
        const b1 = document.getElementById('btnHistSim'), b2 = document.getElementById('btnHistGravar');
        if (b1) b1.onclick = () => histExecutar(false);
        if (b2) b2.onclick = () => histExecutar(true);
    }
    async function histExecutar(gravar) {
        if (histRodando) return;
        const $h = id => document.getElementById(id), st = $h('histStatus'), msg = t => { if (st) st.textContent = t; };
        const de = $h('histDe').value, ate = $h('histAte').value, mut = $h('histMut').checked, est = $h('histEsc').checked, refazer = $h('histRefazer').checked;
        const ini = `${de}-01`, [ya, ma] = ate.split('-').map(Number), fim = isoDe(new Date(ya, ma, 0)), hoje = getTodayIso();
        histRodando = true; ['btnHistSim', 'btnHistGravar'].forEach(i => { if ($h(i)) $h(i).disabled = true; });
        try {
            if (!getSupabaseConfig()) throw new Error('configure a nuvem (⚙️ API) e faça login');
            if (!pacsToken()) throw new Error('PACS sem login nesta aba');
            if (ini > fim) throw new Error('o mês inicial é depois do final');
            msg('⏳ Baixando a planilha da Prefeitura…');
            const id = await configNuvem('prefeitura_planilha_id'), gid = await configNuvem('prefeitura_planilha_gid'), gidM = mut ? await configNuvem('prefeitura_mutirao_gid') : null;
            if (!id || !gid) throw new Error('planilha da Prefeitura não configurada (agenda_config)');
            const url = g => `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=csv&gid=${encodeURIComponent(g)}`;
            const plan = histLerPlanilha(await baixarTexto(url(gid)), 'pref', ini, fim, []);
            if (gidM) histLerPlanilha(await baixarTexto(url(gidM)), 'mut', ini, fim, plan);
            msg('⏳ Lendo a agenda e a escala do banco…');
            const ag = await requestSupabase(`${TABLE}?data_agenda=gte.${ini}&data_agenda=lte.${fim}&tipo=eq.Prefeitura&select=data_agenda,origem&limit=50000`, 'GET');
            const controlados = new Set(), reconstruidos = new Set();
            (Array.isArray(ag) ? ag : []).forEach(x => (HIST_ORIGENS.includes(x.origem) ? reconstruidos : controlados).add(x.data_agenda));
            controlados.forEach(d => reconstruidos.delete(d));
            const vg = await requestSupabase(`agenda_vagas?data=gte.${ini}&data=lte.${fim}&tipo=eq.prefeitura&select=data,periodo,bloco,vagas,regra&limit=20000`, 'GET');
            const refazerDias = refazer ? [...reconstruidos] : [];
            const vagasExist = new Map();
            (Array.isArray(vg) ? vg : []).forEach(v => { if (refazer && v.regra === 'planilha' && reconstruidos.has(v.data)) return; if (!vagasExist.has(v.data)) vagasExist.set(v.data, []); vagasExist.get(v.data).push(v); });
            // PACS: do mês anterior ao início até o mês seguinte ao fim (janela do "exame em outro dia")
            const meses = [], t = new Date(+de.slice(0, 4), +de.slice(5, 7) - 2, 1), ultimo = isoDe(new Date(ya, ma, 1)).slice(0, 7);
            for (let m = isoDe(t).slice(0, 7); m <= ultimo && m <= hoje.slice(0, 7); t.setMonth(t.getMonth() + 1), m = isoDe(t).slice(0, 7)) meses.push(m);
            const pacs = [];
            for (const m of meses) { msg(`⏳ PACS: exames de US de ${mesNomeAno(m)}…`); pacs.push(...await prodBuscar(m, PROD_MOD.US)); }
            msg('⏳ Cruzando planilha × PACS…');
            const out = histProcessar({ plan, pacs, ini, fim, hoje, controlados, reconstruidos, refazer, vagasExist, estimarEscala: est, marcarSemExpediente: true, agoraIso: new Date().toISOString() });
            histUltimo = Object.assign(out, { ini, fim, simulado: !gravar, em: new Date().toISOString() });
            if (gravar) {
                for (let i = 0; i < refazerDias.length; i += 50) {
                    const lote = refazerDias.slice(i, i + 50).join(',');
                    msg('⏳ Apagando a reconstrução anterior desses dias…');
                    await requestSupabase(`${TABLE}?data_agenda=in.(${lote})&origem=in.(${HIST_ORIGENS.join(',')})`, 'DELETE', null, { Prefer: 'return=minimal' });
                    await requestSupabase(`agenda_vagas?data=in.(${lote})&regra=eq.planilha`, 'DELETE', null, { Prefer: 'return=minimal' });
                }
                for (let i = 0; i < out.linhas.length; i += 200) {
                    msg(`⏳ Gravando a agenda histórica… ${Math.min(i + 200, out.linhas.length)}/${out.linhas.length}`);
                    await requestSupabase(`${TABLE}?on_conflict=${CONFLICT_COLS}`, 'POST', out.linhas.slice(i, i + 200), { Prefer: 'resolution=ignore-duplicates,return=minimal' });
                }
                for (let i = 0; i < out.vagas.length; i += 300) await requestSupabase('agenda_vagas?on_conflict=data,periodo,tipo,bloco', 'POST', out.vagas.slice(i, i + 300), { Prefer: 'resolution=ignore-duplicates,return=minimal' });
                for (const z of out.zerar) await requestSupabase(`agenda_vagas?data=eq.${z.data}&periodo=eq.${z.periodo}&tipo=eq.prefeitura&vagas=gt.0`, 'PATCH', { vagas: 0, fonte: `sem expediente (histórico: nenhum exame de US no PACS no período; a escala tinha ${z.antes})` }, { Prefer: 'return=minimal' });
                await requestSupabase('agenda_config?on_conflict=chave', 'POST', [{ chave: 'historico_resumo', valor: JSON.stringify({ em: histUltimo.em, ini, fim, pc: String(navigator.platform || '').slice(0, 30), linhas: out.linhas.length, vagas: out.vagas.length, zerar: out.zerar.length, resumo: out.resumo }) }], { Prefer: 'resolution=merge-duplicates,return=minimal' });
                msg('');
                renderVagas();
                return;
            }
            msg('');
            const res = $h('histRes'); if (res) res.innerHTML = histResHtml(histUltimo);
        } catch (e) {
            histUltimo = { erro: e.message || String(e), resumo: [], ini, fim, simulado: true, linhas: [], vagas: [], zerar: [] };
            const res = $h('histRes'); if (res) res.innerHTML = histResHtml(histUltimo);
            msg('');
        } finally {
            histRodando = false;
            if ($h('btnHistSim')) $h('btnHistSim').disabled = false;
            if ($h('btnHistGravar')) $h('btnHistGravar').disabled = !(histUltimo && histUltimo.simulado && !histUltimo.erro);
        }
    }

    // =====================================================================
    // 16E. 💰 FINANCEIRO (v9.6) — repasse estimado pela produção (US e TC)
    // ---------------------------------------------------------------------
    // Produção: producao_lote (contagens dia × convênio × exame × situação, lidas do PACS pela
    // Produção — prodLerPacs) × tarifas PRIVADAS do banco (fin_tarifa / fin_pagador / fin_exame /
    // fin_fixo) na função financeiro_periodo. NENHUM valor fica neste arquivo (ele é público).
    // Situações: liberado · em revisão (REVISAR/DIGITADO/ASSINAR/PRELAUDO) · a laudar (sem laudo).
    // Valor: conferido (tabela oficial) · estimado (aproximação) · sem tarifa (fica FORA do total,
    // com estimativa à parte pelo ticket médio de convênio US). RT = fixo mensal, à parte.
    // Sempre atualizado: a cada ~15 min um computador com o PACS logado relê o mês corrente (seção 19).
    // =====================================================================
    const FIN_UN = { dia: 'Dia', semana: 'Semana', mes: 'Mês', tri: 'Trimestre', sem: 'Semestre', ano: 'Ano' };
    const FIN_MESES_UN = { mes: 1, tri: 3, sem: 6, ano: 12 };
    const DSEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    let finUn = 'mes', finRef = new Date(), finMod = 'todos', finUltimo = null, finLendo = false, finAutoTentou = '';
    const brl = v => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    const nBR = v => Number(v || 0).toLocaleString('pt-BR');
    const segundaDe = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    const finGrupoNome = g => g || 'Sem classificação';
    const finTagMod = m => (finMod === 'todos' ? `<span style="color:#94a3b8; font-size:9.5px;">${m === 'CT' ? 'TC' : 'US'}</span> ` : '');
    const finTab = (head, rows) => `<div style="overflow-x:auto;"><table style="font-variant-numeric:tabular-nums;"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(l => `<tr${l.estilo ? ` style="${l.estilo}"` : ''}>${(l.c || l).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
    const cartaoFin = (t, c, nota) => `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-bottom:10px; min-width:0;"><div style="font-weight:800; font-size:12px; margin-bottom:${nota ? 2 : 6}px;">${t}</div>${nota ? `<div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">${nota}</div>` : ''}${c}</div>`;
    function finPeriodo(un, ref) {
        const y = ref.getFullYear(), m = ref.getMonth(), d = ref.getDate();
        let ini, fim, rotulo;
        if (un === 'dia') { ini = fim = new Date(y, m, d); rotulo = `${DSEM[ini.getDay()]} ${fmtBR(isoDe(ini))}`; }
        else if (un === 'semana') { ini = segundaDe(ref); fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6); rotulo = `semana ${fmtBR(isoDe(ini)).slice(0, 5)} a ${fmtBR(isoDe(fim))}`; }
        else if (un === 'mes') { ini = new Date(y, m, 1); fim = new Date(y, m + 1, 0); rotulo = mesNomeAno(isoDe(ini).slice(0, 7)); }
        else if (un === 'tri') { const q = Math.floor(m / 3); ini = new Date(y, q * 3, 1); fim = new Date(y, q * 3 + 3, 0); rotulo = `${q + 1}º trimestre de ${y}`; }
        else if (un === 'sem') { const s = m < 6 ? 0 : 1; ini = new Date(y, s * 6, 1); fim = new Date(y, s * 6 + 6, 0); rotulo = `${s + 1}º semestre de ${y}`; }
        else { ini = new Date(y, 0, 1); fim = new Date(y, 11, 31); rotulo = `ano de ${y}`; }
        return { ini: isoDe(ini), fim: isoDe(fim), rotulo };
    }
    function finDeslocar(un, ref, n) {
        if (un === 'dia') return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + n);
        if (un === 'semana') return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 7 * n);
        return new Date(ref.getFullYear(), ref.getMonth() + n * FIN_MESES_UN[un], 1);
    }
    function diasUteisEntre(ini, fim) { // seg–sex (feriados não descontados)
        let n = 0;
        for (let d = dIso(ini); isoDe(d) <= fim; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w > 0 && w < 6) n++; }
        return n;
    }
    function finAgrega(r) {
        const F = arr => (arr || []).filter(x => finMod === 'todos' || x.mod === finMod);
        const novo = () => ({ liberado: { n: 0, v: 0 }, revisar: { n: 0, v: 0 }, pendente: { n: 0, v: 0 }, est: 0, semN: 0, semEst: 0, urgN: 0, urgV: 0, intN: 0 });
        const A = novo(), porMod = {};
        F(r.totais).forEach(x => {
            const m = porMod[x.mod] = porMod[x.mod] || novo();
            [A, m].forEach(o => {
                const e = o[x.estado] || o.pendente; e.n += +x.n || 0; e.v += +x.valor || 0;
                o.est += +x.estimado || 0; o.semN += +x.sem_n || 0; o.semEst += +x.sem_est || 0; o.urgN += +x.urg_n || 0; o.urgV += +x.urg_valor || 0; o.intN += +x.int_n || 0;
            });
        });
        const n = A.liberado.n + A.revisar.n + A.pendente.n, v = A.liberado.v + A.revisar.v + A.pendente.v;
        return Object.assign(A, { porMod, n, v, ticket: n - A.semN > 0 ? v / (n - A.semN) : null, F });
    }
    function finBuckets(r, per, F) {
        if (finUn === 'dia') return [];
        const porMes = finUn === 'sem' || finUn === 'ano', porSem = finUn === 'tri';
        const chave = s => (porMes ? s.slice(0, 7) : porSem ? isoDe(segundaDe(dIso(s))) : s.slice(0, 10));
        const mapa = new Map();
        for (let d = dIso(per.ini); isoDe(d) <= per.fim; d.setDate(d.getDate() + 1)) {
            const k = chave(isoDe(d));
            if (mapa.has(k)) continue;
            mapa.set(k, {
                k, us: 0, ct: 0, pend: 0, n: 0,
                rot: porMes ? MES_NOME[+k.slice(5, 7) - 1].slice(0, 3) : porSem ? fmtBR(k).slice(0, 5) : finUn === 'semana' ? `${DSEM[d.getDay()]} ${k.slice(8, 10)}` : k.slice(8, 10),
                tit: porMes ? mesNomeAno(k) : porSem ? `semana de ${fmtBR(k)}` : `${DSEM[d.getDay()]} ${fmtBR(k)}`
            });
        }
        F(r.serie).forEach(x => {
            const e = mapa.get(chave(String(x.dia))); if (!e) return;
            if (x.mod === 'CT') e.ct += +x.lib_valor || 0; else e.us += +x.lib_valor || 0;
            e.pend += +x.pend_valor || 0; e.n += (+x.lib_n || 0) + (+x.pend_n || 0);
        });
        return [...mapa.values()];
    }
    function finPasso(x) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1)))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
    const finEixo = (v, max) => (max >= 10000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : Math.round(v).toLocaleString('pt-BR'));
    // colunas empilhadas (≤ 26 de largura, topo arredondado 4, vão de 2 entre segmentos, grade fina); dica por coluna
    function finGraficoHtml(bk, series) {
        const C = { us: '#059669', ct: isDarkMode ? '#3b82f6' : '#2563eb', pend: '#d97706' };
        const caixa = document.getElementById('finCorpo'); // desenha na largura real (1 unidade = 1 px): colunas ≤ 22 px, texto no tamanho certo
        const W = Math.max(560, Math.round(((caixa && caixa.clientWidth) || 1000) - 54)), H = 210, L = 64, R = 8, base = H - 22, topo = 10;
        const somaB = x => series.reduce((a, [k]) => a + x[k], 0);
        const max = Math.max(1, ...bk.map(somaB)), passo = finPasso(max / 4), yMax = Math.ceil(max / passo) * passo;
        const y = v => base - (base - topo) * v / yMax;
        const slot = (W - L - R) / bk.length, bw = Math.min(slot * 0.7, 22), grade = isDarkMode ? '#334155' : '#e2e8f0', tinta = '#94a3b8';
        let g = '';
        for (let v = 0; v <= yMax + 1e-6; v += passo) g += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${grade}" stroke-width="1"/><text x="${L - 6}" y="${(y(v) + 3.5).toFixed(1)}" font-size="10.5" text-anchor="end" fill="${tinta}">${finEixo(v, yMax)}</text>`;
        const cadaRot = Math.ceil(bk.length / 16);
        const barras = bk.map((x, i) => {
            const cx = L + slot * (i + 0.5), X = cx - bw / 2, partes = series.filter(([k]) => x[k] > 0);
            let acc = 0;
            const segs = partes.map(([k], j) => {
                const y0 = y(acc), y1 = y(acc + x[k]); acc += x[k];
                if (j < partes.length - 1) { const h = y0 - y1 - 2; return h > 0.5 ? `<rect x="${X.toFixed(1)}" y="${(y1 + 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${C[k]}"/>` : ''; }
                const rr = Math.min(4, (y0 - y1) / 2, bw / 2);
                return `<path d="M${X.toFixed(1)},${y0.toFixed(1)}V${(y1 + rr).toFixed(1)}Q${X.toFixed(1)},${y1.toFixed(1)} ${(X + rr).toFixed(1)},${y1.toFixed(1)}H${(X + bw - rr).toFixed(1)}Q${(X + bw).toFixed(1)},${y1.toFixed(1)} ${(X + bw).toFixed(1)},${(y1 + rr).toFixed(1)}V${y0.toFixed(1)}Z" fill="${C[k]}"/>`;
            }).join('');
            const dica = [x.tit, ...series.map(([k, t]) => `${brl(x[k])}~${t}`), `${nBR(x.n)} exame(s)`].join('|');
            const rot = i % cadaRot === 0 ? `<text x="${cx.toFixed(1)}" y="${H - 6}" font-size="10" text-anchor="middle" fill="${tinta}">${x.rot}</text>` : '';
            return `<g class="fin-bar" tabindex="0" data-tip="${escapeHtml(dica)}" aria-label="${escapeHtml(dica.replace(/~/g, ' ').replace(/\|/g, ' · '))}"><rect x="${(cx - slot / 2).toFixed(1)}" y="${topo}" width="${slot.toFixed(1)}" height="${(base - topo).toFixed(1)}" fill="transparent"/>${segs}${rot}</g>`;
        }).join('');
        const leg = `<div style="display:flex; gap:14px; flex-wrap:wrap; font-size:10.5px; color:#64748b; margin-top:4px;">${series.map(([k, t]) => `<span><i style="display:inline-block; width:10px; height:10px; border-radius:2px; background:${C[k]}; margin-right:4px; vertical-align:-1px;"></i>${t}</span>`).join('')}</div>`;
        return `<div class="fin-graf" style="position:relative;"><svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;" role="img" aria-label="Produção em reais por período">${g}<line x1="${L}" x2="${W - R}" y1="${base}" y2="${base}" stroke="${tinta}" stroke-width="1"/>${barras}</svg><div class="fin-tip"></div></div>${leg}`;
    }
    function finLigarDicas(raiz) {
        raiz.querySelectorAll('.fin-graf').forEach(gr => {
            const tip = gr.querySelector('.fin-tip');
            const mostrar = el => {
                const [tit, ...linhas] = String(el.dataset.tip || '').split('|');
                tip.textContent = '';
                const t = document.createElement('div'); t.style.cssText = 'color:#94a3b8; margin-bottom:2px;'; t.textContent = tit; tip.appendChild(t);
                linhas.forEach(l => {
                    const [val, nome] = l.split('~'), d = document.createElement('div'), b = document.createElement('b');
                    b.textContent = val; d.appendChild(b);
                    if (nome) { const s = document.createElement('span'); s.style.color = '#cbd5e1'; s.textContent = ` ${nome}`; d.appendChild(s); }
                    tip.appendChild(d);
                });
                tip.style.display = 'block';
                const rg = gr.getBoundingClientRect(), re = el.getBoundingClientRect();
                let x = re.left - rg.left + re.width / 2 + 12;
                if (x + tip.offsetWidth > rg.width) x = re.left - rg.left + re.width / 2 - tip.offsetWidth - 12;
                tip.style.left = `${Math.max(0, x)}px`;
            };
            const esconder = () => { tip.style.display = 'none'; };
            gr.querySelectorAll('.fin-bar').forEach(el => {
                el.addEventListener('pointerenter', () => mostrar(el)); el.addEventListener('focus', () => mostrar(el));
                el.addEventListener('pointerleave', esconder); el.addEventListener('blur', esconder);
            });
        });
    }
    function abrirFinanceiro() {
        const m = document.getElementById('modalFin'); if (!m) return;
        m.classList.toggle('dark-mode', isDarkMode);
        m.classList.add('open');
        renderFinanceiro();
    }
    async function renderFinanceiro() {
        const ctrl = document.getElementById('finCtrl'), corpo = document.getElementById('finCorpo');
        if (!ctrl || !corpo) return;
        const per = finPeriodo(finUn, finRef), hoje = getTodayIso(), atual = per.ini <= hoje && hoje <= per.fim;
        const bt = (attr, v, t, on, tit) => `<button ${attr}="${v}" class="${on ? 'on' : ''}"${tit ? ` title="${tit}"` : ''}>${t}</button>`;
        ctrl.innerHTML = Object.entries(FIN_UN).map(([k, t]) => bt('data-un', k, t, k === finUn)).join('')
            + `<span style="width:6px;"></span>${bt('data-nav', -1, '◀', false, 'Período anterior')}<b style="min-width:170px; text-align:center; font-size:11.5px;">${escapeHtml(per.rotulo)}</b>${bt('data-nav', 1, '▶', false, 'Próximo período')}${atual ? '' : bt('data-nav', 0, 'Hoje', false, 'Voltar ao período atual')}`
            + `<span style="width:6px;"></span>${[['todos', 'US + TC'], ['US', '🔊 US'], ['CT', '🩻 TC']].map(([k, t]) => bt('data-mod', k, t, k === finMod)).join('')}`
            + '<span style="width:6px;"></span><button id="btnFinLer" title="Lê do PACS (logado nesta aba) os meses do período e grava na nuvem">🔄 Ler do PACS</button><button id="btnFinRel" title="Relatório interno para imprimir/salvar em PDF">🖨️ Relatório</button>';
        ctrl.querySelectorAll('[data-un]').forEach(b => { b.onclick = () => { finUn = b.dataset.un; renderFinanceiro(); }; });
        ctrl.querySelectorAll('[data-nav]').forEach(b => { b.onclick = () => { const n = +b.dataset.nav; finRef = n ? finDeslocar(finUn, finRef, n) : new Date(); renderFinanceiro(); }; });
        ctrl.querySelectorAll('[data-mod]').forEach(b => { b.onclick = () => { finMod = b.dataset.mod; ctrl.querySelectorAll('[data-mod]').forEach(o => o.classList.toggle('on', o === b)); finPintar(); }; });
        document.getElementById('btnFinLer').onclick = finLerPeriodo;
        document.getElementById('btnFinRel').onclick = relatorioFinanceiro;
        if (!getSupabaseConfig() || !lerSessao()) {
            corpo.innerHTML = '<div style="padding:24px; color:#d97706; font-size:12px;">Configure a nuvem (⚙️ API) e faça login para ver o financeiro — as tarifas ficam só no banco privado.</div>';
            return;
        }
        if (finUltimo) corpo.style.opacity = '.5'; else corpo.innerHTML = '<div style="text-align:center; padding:30px; color:#10b981;">⏳ Calculando a produção…</div>';
        try {
            const ant = finPeriodo(finUn, finDeslocar(finUn, finRef, -1));
            if (atual) { // período em curso: compara com o MESMO ponto do período anterior
                const dias = Math.round((dIso(hoje) - dIso(per.ini)) / 864e5), lim = dIso(ant.ini); lim.setDate(lim.getDate() + dias);
                if (isoDe(lim) < ant.fim) ant.fim = isoDe(lim);
            }
            const [r, ra] = await Promise.all([
                requestSupabase('rpc/financeiro_periodo', 'POST', { p_ini: per.ini, p_fim: per.fim }),
                requestSupabase('rpc/financeiro_periodo', 'POST', { p_ini: ant.ini, p_fim: ant.fim }).catch(() => null)
            ]);
            finUltimo = { r, ra, per, ant, atual };
            corpo.style.opacity = '';
            finPintar();
            // sempre atualizado: período com o mês corrente e leitura com mais de 15 min → relê do PACS em 2º plano e repinta
            const mesAtual = hoje.slice(0, 7), m = (r.meses || []).find(x => x.mes === mesAtual), chave = `${mesAtual}|${Math.floor(Date.now() / 9e5)}`;
            const lido = m && m.lido ? Math.min(...['US', 'CT'].map(k => (m.lido[k] ? new Date(m.lido[k]).getTime() : 0))) : 0;
            if (m && pacsToken() && !prodLendo && !finLendo && finAutoTentou !== chave && Date.now() - lido > 15 * 60000) {
                finAutoTentou = chave;
                const st = document.getElementById('finStatus'); if (st) st.textContent = '⏳ atualizando o mês corrente do PACS…';
                prodLerPacs(mesAtual).then(() => {
                    const mf = document.getElementById('modalFin');
                    if (mf && mf.classList.contains('open')) renderFinanceiro();
                }).catch(e => { const s2 = document.getElementById('finStatus'); if (s2) s2.textContent = `⚠ ${e.message}`; });
            }
        } catch (err) {
            corpo.style.opacity = '';
            if (err.status !== undefined && err.status !== 404) reportCloudError(err, 'Financeiro', false);
            corpo.innerHTML = `<div style="padding:20px; color:#dc2626;">${err.status === 404 ? 'A função financeiro_periodo não existe neste banco.' : 'Não consegui calcular o financeiro:'}<br>${escapeHtml(err.message)}</div>`;
        }
    }
    function finPintar() {
        const corpo = document.getElementById('finCorpo'); if (!corpo || !finUltimo) return;
        const { r, ra, per, ant, atual } = finUltimo, A = finAgrega(r), B = ra ? finAgrega(ra) : null, F = A.F;
        const hoje = getTodayIso(), cor = isDarkMode ? '#f1f5f9' : '#0f172a';
        const mesesPass = (r.meses || []).filter(m => m.mes <= hoje.slice(0, 7));
        const falta = mesesPass.filter(m => !m.lido || !m.lido.US || !m.lido.CT);
        const idade = iso => { if (!iso) return 'sem leitura'; const mi = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return mi < 60 ? `há ${Math.max(mi, 0)} min` : mi < 1440 ? `há ${Math.round(mi / 60)} h` : `em ${new Date(iso).toLocaleDateString('pt-BR')}`; };
        const frescor = mesesPass.length <= 2 ? `lido do PACS — ${mesesPass.map(m => `${mesNomeAno(m.mes)}: US ${idade(m.lido && m.lido.US)} · TC ${idade(m.lido && m.lido.CT)}`).join(' — ')}` : `${mesesPass.length - falta.length} de ${mesesPass.length} meses lidos do PACS`;
        let aviso = falta.length ? `<div style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:6px; padding:6px 9px; margin-bottom:8px; font-size:10.5px;">⚠ Sem leitura do PACS: <b>${falta.map(m => mesNomeAno(m.mes)).join(', ')}</b> — esses dias ficam zerados. Clique em <b>🔄 Ler do PACS</b> (com o PACS logado nesta aba) para completar.</div>` : '';
        // exames sem tarifa ficam FORA do total: com ≥ 3% da produção, avisa no topo (para nunca parecer "mês zerado" sem explicação)
        if (A.n && A.semN / A.n >= 0.03) aviso += `<div style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:6px; padding:6px 9px; margin-bottom:8px; font-size:10.5px;">⚠ <b>${nBR(A.semN)} exame(s) (${pctBR(A.semN, A.n)}) sem tarifa</b> no período — ficaram FORA do total. Veja o quadro "Sem tarifa" abaixo (falta a tabela desse convênio/exame no banco).</div>`;
        let delta = '';
        if (B && B.n) {
            const d = B.v ? (A.v - B.v) / B.v * 100 : 0;
            delta = `<span style="color:${d >= 0 ? '#059669' : '#dc2626'}; font-weight:700;">${d >= 0 ? '▲ +' : '▼ −'}${Math.abs(d).toFixed(1).replace('.', ',')}%</span> vs ${atual ? 'o mesmo ponto de ' : ''}${escapeHtml(ant.rotulo)} (${brl(B.v)})`;
        } else if (ra) delta = `sem produção lida em ${escapeHtml(ant.rotulo)} para comparar`;
        let proj = null;
        if (atual && FIN_MESES_UN[finUn] && !falta.length) { const ate = diasUteisEntre(per.ini, hoje), tot = diasUteisEntre(per.ini, per.fim); if (ate && A.v) proj = { v: A.v / ate * tot, ate, tot }; }
        const rt = r.fixos && r.fixos.RT, nM = FIN_MESES_UN[finUn] || 0;
        const tile = (rot, val, sub) => `<div class="dash-box" style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:9px 10px; min-width:0;"><div style="font-size:10.5px; font-weight:700; color:#64748b;">${rot}</div><div style="font-size:19px; font-weight:700; color:${cor}; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${val}</div>${sub ? `<div style="font-size:10px; color:#94a3b8; margin-top:1px;">${sub}</div>` : ''}</div>`;
        const tiles = `<div style="display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-bottom:8px;">
                ${tile('✅ Liberado', brl(A.liberado.v), `${nBR(A.liberado.n)} laudo(s)`)}
                ${tile('📝 Em revisão', brl(A.revisar.v), `${nBR(A.revisar.n)} exame(s) — revisar, digitado, assinar`)}
                ${tile('⏳ A laudar', brl(A.pendente.v), `${nBR(A.pendente.n)} exame(s) sem laudo`)}
                ${tile('Σ Produção do período', brl(A.v), `${nBR(A.n)} exames${A.semN ? ` · ${nBR(A.semN)} sem tarifa (fora)` : ''}`)}
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-bottom:6px;">
                ${tile('Ticket médio por exame', brl(A.ticket), A.est ? `inclui ${brl(A.est)} estimado (≈)` : 'só valores conferidos')}
                ${tile('🚨 Urgências', `${nBR(A.urgN)} · ${brl(A.urgV)}`, `${nBR(A.intN)} exame(s) de internados`)}
                ${tile('📈 Projeção do período', proj ? brl(proj.v) : '—', proj ? `no ritmo de ${proj.ate} de ${proj.tot} dias úteis` : atual ? (falta.length ? 'complete a leitura dos meses' : 'em mês, trimestre, semestre ou ano') : 'período encerrado')}
                ${tile('RT — fixo mensal (à parte)', rt ? brl(rt.valor) : '—', rt ? `${nM > 1 ? `${nM} meses = ${brl(rt.valor * nM)}` : 'não entra na produção'}${rt.status && rt.status !== 'conferido' ? ` · ${escapeHtml(rt.status)}` : ''}` : 'não cadastrado')}
            </div>
            <div style="font-size:10.5px; color:#64748b; margin-bottom:10px;">${delta}${delta ? ' · ' : ''}<span id="finStatus">${escapeHtml(frescor)}</span></div>`;
        const bk = finBuckets(r, per, F);
        const series = (finMod === 'CT' ? [['ct', 'TC liberado']] : finMod === 'US' ? [['us', 'US liberado']] : [['us', 'US liberado'], ['ct', 'TC liberado']]).concat([['pend', 'Não liberado (revisão + a laudar)']]);
        const unTxt = finUn === 'sem' || finUn === 'ano' ? 'por mês' : finUn === 'tri' ? 'por semana' : 'por dia';
        const grafico = bk.length > 1 ? cartaoFin(`📊 Produção ${unTxt} (R$)`, finGraficoHtml(bk, series)
            + `<details style="margin-top:6px;"><summary style="font-size:10.5px; color:#64748b;">Ver os valores em tabela</summary>${finTab(['Período', ...series.map(s => s[1]), 'Exames'], bk.map(x => [x.tit, ...series.map(([k]) => brl(x[k])), nBR(x.n)]))}</details>`) : '';
        const linhaMod = (nome, m, neg) => ({ estilo: neg ? 'font-weight:800;' : '', c: [nome, `${nBR(m.liberado.n)} · ${brl(m.liberado.v)}`, `${nBR(m.revisar.n)} · ${brl(m.revisar.v)}`, `${nBR(m.pendente.n)} · ${brl(m.pendente.v)}`, `${nBR(m.liberado.n + m.revisar.n + m.pendente.n)} · <b>${brl(m.liberado.v + m.revisar.v + m.pendente.v)}</b>`, nBR(m.urgN), nBR(m.intN), m.semN ? `⚠ ${nBR(m.semN)}` : '—'] });
        const mods = ['US', 'CT'].filter(k => A.porMod[k]);
        const tMod = finTab(['Modalidade', 'Liberado', 'Em revisão', 'A laudar', 'Total', 'Urgentes', 'Internados', 'Sem tarifa'],
            [...mods.map(k => linhaMod(k === 'US' ? '🔊 Ultrassom' : '🩻 Tomografia', A.porMod[k])), ...(mods.length > 1 ? [linhaMod('Total', A, true)] : [])]);
        const junta = (arr, chave, campos) => { const mp = new Map(); arr.forEach(x => { const k = chave(x), e = mp.get(k); if (!e) mp.set(k, Object.assign({}, x)); else campos.forEach(c => { e[c] = (+e[c] || 0) + (+x[c] || 0); }); }); return [...mp.values()]; };
        const tick = (v, n, semN) => brl(n - semN > 0 ? v / (n - semN) : null);
        const cats = junta(F(r.por_categoria), x => x.cat, ['n', 'valor', 'lib_valor', 'lib_n', 'sem_n']).sort((a, b) => b.valor - a.valor);
        const tCat = finTab(['Categoria', 'Exames', 'Valor', '% do total', 'Liberado'], cats.map(c => [escapeHtml(c.cat), nBR(c.n), brl(+c.valor), pctBR(+c.valor, A.v), brl(+c.lib_valor)]));
        const grupos = [...F(r.por_grupo)].sort((a, b) => b.valor - a.valor);
        const tGrupo = finTab(['Tipo de procedimento', 'Exames', 'Valor', 'Ticket', '% do total'], grupos.map(g => [`${finTagMod(g.mod)}${escapeHtml(finGrupoNome(g.grupo))}`, nBR(g.n), brl(+g.valor), tick(+g.valor, g.n, g.sem_n), pctBR(+g.valor, A.v)]));
        const convs = junta(F(r.por_convenio), x => x.conv, ['n', 'valor', 'lib_valor', 'lib_n', 'sem_n', 'est_n']).sort((a, b) => b.valor - a.valor || b.n - a.n);
        const tConv = finTab(['Convênio', 'Categoria', 'Exames', 'Valor', 'Ticket', '% do total', 'Liberado', ''],
            convs.map(c => [`${escapeHtml(c.conv)}${c.pagador && normName(c.pagador) !== normName(c.conv) ? ` <span style="color:#94a3b8; font-size:9.5px;">tabela ${escapeHtml(c.pagador)}</span>` : ''}`, escapeHtml(c.cat || ''), nBR(c.n), brl(+c.valor), tick(+c.valor, c.n, c.sem_n), pctBR(+c.valor, A.v), brl(+c.lib_valor),
                `${c.est_n ? `<span title="valor estimado (sem tabela conferida)">≈${nBR(c.est_n)}</span>` : ''}${c.sem_n ? ` <span title="sem tarifa: fora do total" style="color:#d97706;">⚠${nBR(c.sem_n)}</span>` : ''}`]));
        const tEx = finTab(['Exame', 'Tipo', 'Exames', 'Ticket', 'Valor'], F(r.por_exame).slice(0, 40).map(e => [`${finTagMod(e.mod)}${escapeHtml(e.exame)}`, escapeHtml(finGrupoNome(e.grupo)), `${nBR(e.n)}${e.sem_n ? ` <span style="color:#d97706;" title="sem tarifa">⚠${nBR(e.sem_n)}</span>` : ''}`, brl(e.ticket), brl(+e.valor)]));
        const sem = F(r.sem_tarifa), semTot = sem.reduce((a, s) => a + s.n, 0);
        const cSem = sem.length ? cartaoFin(`⚠ Sem tarifa — fora do total (${nBR(semTot)} exame(s))`, finTab(['Convênio', 'Exame', 'Exames', 'Estimativa*'], sem.slice(0, 40).map(s => [escapeHtml(s.conv), `${finTagMod(s.mod)}${escapeHtml(s.exame)}`, nBR(s.n), +s.est ? brl(+s.est) : '—'])),
            `*pelo ticket médio de convênio no US (${brl(r.ticket_conv_us)}), só como referência — falta a tabela desse convênio/exame no banco.`) : cartaoFin('✓ Tarifas', '<div style="color:#059669;">Todos os exames do período têm tarifa.</div>');
        // v9.7.1 — exames em ABERTO (desde nov/2026, a partir do dia seguinte): fora do valor; conferência do comentário do PACS pela IA
        const ab = F(r.abertos), abTot = ab.reduce((a, x) => a + (+x.n || 0), 0), bx = F(r.baixas).reduce((a, x) => a + (+x.n || 0), 0);
        const rv = F(r.revisao_abertos), rvN = k => rv.filter(x => x.situacao === k).reduce((a, x) => a + x.n, 0), semJ = rvN('sem_justificativa') + rvN('sem_comentario');
        if (semJ) aviso += `<div style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; border-radius:6px; padding:6px 9px; margin-bottom:8px; font-size:10.5px;">🗂 <b>${nBR(semJ)} exame(s) em ABERTO sem justificativa no comentário do PACS</b> — risco de laudo esquecido. Veja o quadro "Em ABERTO" abaixo.</div>`;
        let cAb = '';
        if (abTot || rv.length) {
            const pm = {};
            ab.forEach(x => { const g = pm[x.mes] = pm[x.mes] || { US: 0, CT: 0, par: 0 }; g[x.mod] = (g[x.mod] || 0) + (+x.n || 0); g.par += +x.par_n || 0; });
            const ult = rv.map(x => x.ultima).sort().pop();
            cAb = cartaoFin(`🗂 Em ABERTO — fora do valor (${nBR(abTot)})`,
                finTab(['Mês', 'US', 'TC', '2º código*'], Object.keys(pm).sort().map(m => [mesNomeAno(m), pm[m].US || '—', pm[m].CT || '—', pm[m].par || '—']))
                + `<div style="font-size:10.5px; margin-top:6px;">Conferência do comentário: <b style="color:#059669;">${nBR(rvN('justificado'))} justificado(s)</b> · <b style="color:${semJ ? '#dc2626' : 'inherit'};">${nBR(rvN('sem_justificativa'))} comentário sem justificativa · ${nBR(rvN('sem_comentario'))} sem comentário</b>${ult ? ` · última conferência ${new Date(ult).toLocaleString('pt-BR')}` : ' · ainda não conferido'}</div>`
                + `<div style="margin-top:6px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;"><button id="btnFinAbertos" style="background:#334155; color:#fff; border:none; border-radius:5px; padding:4px 10px; font-weight:700; font-size:10.5px; cursor:pointer;">🔎 Listar e conferir comentários (Opus)</button><span style="font-size:10px; color:#94a3b8;">lê o PACS ao vivo; no banco fica só nº do exame, situação e motivo curto (sem nome) · roda sozinho 1×/semana</span></div><div id="finAbertosLista" style="margin-top:6px;"></div>`,
                'ABERTO a partir do dia seguinte ao exame não é laudo a fazer (lançamento errado, paciente chamado que não respondeu, 2º código de laudo conjunto…) — o motivo fica no comentário do exame no PACS. Sem comentário que explique = conferir: pode ser laudo esquecido. *2º código: outro exame do mesmo paciente liberado no dia.'
                + (bx ? ` Até out/2026: ${nBR(bx)} em ABERTO dados como baixa (competência conferida, sem pendência).` : ''));
        } else if (bx) cAb = `<div style="font-size:10px; color:#94a3b8; margin-bottom:8px;">🗂 Nenhum exame em ABERTO a conferir no período. Até out/2026: ${nBR(bx)} em ABERTO dados como baixa (sem pendência).</div>`;
        corpo.innerHTML = aviso + tiles + grafico
            + cartaoFin('🧾 Por modalidade e situação', tMod, 'Liberado = laudo liberado · Em revisão = revisar / digitado / assinar / pré-laudo · A laudar = sem laudo ainda (meus ou sem radiologista)')
            + `<div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.3fr); gap:10px;">${cartaoFin('🏷 Por categoria', tCat)}${cartaoFin('🧩 Por tipo de procedimento', tGrupo)}</div>`
            + cartaoFin('🏥 Por convênio', tConv, '≈ = valor estimado (sem tabela conferida) · ⚠ = sem tarifa (fora do total) · "tabela" = qual tabela de valores foi usada')
            + `<div style="display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); gap:10px;">${cartaoFin('🔬 Exames (maiores valores)', tEx)}${cSem}</div>`
            + cAb
            + '<div style="font-size:10px; color:#94a3b8; line-height:1.5;">Base: produção lida do PACS pela data do exame ("meus" = radiologista do exame = Dr. Gabriel; pendentes sem radiologista: US todos, TC fora de ABERTO; pacientes TESTE fora) × tabela de tarifas privada do banco (versão corrigida: % do acordo aplicado uma única vez). Repasse estimado — o pagamento real depende do fechamento e de glosas do hospital. Nenhum valor fica no código e nenhum dado de paciente vai para a nuvem (só contagens).</div>';
        finLigarDicas(corpo);
        const bAb = document.getElementById('btnFinAbertos'); if (bAb) bAb.onclick = finAbertosListar;
    }
    // v9.7.1 — exames em ABERTO (desde nov/2026, do dia seguinte em diante) × comentário do PACS, classificado pela IA.
    // No banco (aberto_revisao) só nº do exame, dia, modalidade, situação e motivo curto — nunca nome nem o texto do comentário.
    async function abertosColetar(ini, fim, mods) {
        const me = prodMeuUsuario(); if (me == null) throw new Error('não consegui identificar o usuário do PACS');
        const atualM = getTodayIso().slice(0, 7), [y0, m0] = ini.split('-').map(Number), meses = [], linhas = [];
        for (let i = 0; i < 13; i++) { const m = isoDe(new Date(y0, m0 - 1 + i, 1)).slice(0, 7); if (m > fim.slice(0, 7) || m > atualM) break; if (m >= ABERTO_DESDE.slice(0, 7)) meses.push(m); }
        for (const mes of meses) for (const [mod, cod] of Object.entries(PROD_MOD)) {
            if (!mods.includes(mod)) continue;
            const rows = await prodBuscar(mes, cod), libPD = prodLibPacDia(rows);
            rows.forEach(x => {
                const s = prodSituacao(x, mod, me, mes); if (!s || !s.antigo || s.baixa) return;
                const dia = String(x.exa_data).slice(0, 10); if (dia < ini || dia > fim) return;
                linhas.push({ dia, cod: x.exa_codigo, mod, exame: cleanExamDesc(x.tipoexame && x.tipoexame.tpe_descricao) || '—', conv: normConvenio(x.convenio && x.convenio.conv_descricao), par: libPD.has(prodChavePacDia(x)) });
            });
        }
        return linhas.sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : a.mod < b.mod ? -1 : 1));
    }
    async function abertosConferir(linhas) {
        const tok = pacsToken();
        for (const l of linhas) {
            try {
                const r = await fetch(`${location.origin}/backend/api/exame/${l.cod}/comentario`, { headers: { 'x-access-token': tok } });
                const j = r.ok ? await r.json() : { rows: [] };
                l.coments = (j.rows || []).map(c => String(c.acao_comentario || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
            } catch (e) { l.coments = []; }
        }
        const comTexto = linhas.filter(l => l.coments.length);
        const res = new Map();
        if (comTexto.length) {
            const prompt = 'Você confere, para um radiologista, exames que ficaram em ABERTO (sem laudo) no PACS depois do dia do exame. ' +
                'Para cada exame há o tipo de exame, se outro exame do mesmo paciente foi liberado no mesmo dia (par) e os comentários deixados no exame. ' +
                'Diga se os comentários JUSTIFICAM não haver laudo (ex.: lançamento errado/duplicado, paciente chamado que não respondeu ou não compareceu, exame não realizado, ' +
                'laudado junto com outro código, cancelado, convênio não autorizou). Comentário sobre o exame em si, pendência, "aguardando", "laudar depois" ou dúvida = NÃO justifica. ' +
                'Responda SÓ com JSON: [{"cod": número, "justificado": true|false, "motivo": "até 6 palavras, sem nomes"}].\n\nEXAMES:\n' +
                JSON.stringify(comTexto.map(l => ({ cod: l.cod, exame: l.exame, par: l.par, comentarios: l.coments.map(c => c.slice(0, 400)) })));
            const { texto } = await chamarIA({ prompt });
            const m = String(texto).match(/\[[\s\S]*\]/);
            (m ? JSON.parse(m[0]) : []).forEach(x => res.set(Number(x.cod), x));
        }
        const agora = new Date().toISOString(), pc = String(navigator.platform || '').slice(0, 30);
        linhas.forEach(l => {
            const x = res.get(Number(l.cod));
            l.situacao = !l.coments.length ? 'sem_comentario' : x && x.justificado ? 'justificado' : 'sem_justificativa';
            l.motivo = !l.coments.length ? null : String((x && x.motivo) || (x ? '' : 'não classificado pela IA')).slice(0, 80) || null;
        });
        if (linhas.length && getSupabaseConfig()) await requestSupabase('aberto_revisao?on_conflict=exa_codigo', 'POST',
            linhas.map(l => ({ exa_codigo: Number(l.cod), dia: l.dia, modalidade: l.mod, situacao: l.situacao, motivo: l.motivo, n_comentarios: l.coments.length, revisado_em: agora, por: pc })),
            { Prefer: 'resolution=merge-duplicates,return=minimal' });
        try { localStorage.setItem('agenda_abertos_conferido_em', agora); } catch (e) { /* ok */ }
        return linhas;
    }
    async function finAbertosListar() {
        const box = document.getElementById('finAbertosLista'); if (!box || !finUltimo) return;
        if (!pacsToken()) { box.innerHTML = '<div style="color:#d97706;">Abra o PACS logado nesta aba para conferir.</div>'; return; }
        const per = finUltimo.per;
        let linhas;
        try {
            box.innerHTML = '<div style="color:#64748b;">⏳ consultando o PACS…</div>';
            linhas = await abertosColetar(per.ini, per.fim, finMod === 'todos' ? ['US', 'CT'] : [finMod]);
            box.innerHTML = `<div style="color:#64748b;">⏳ lendo os comentários de ${linhas.length} exame(s) e conferindo com a IA…</div>`;
            linhas = await abertosConferir(linhas);
        } catch (e) { box.innerHTML = `<div style="color:#dc2626;">${escapeHtml(e.message || String(e))}</div>`; return; }
        const rot = { justificado: '<span style="color:#059669;">✓ justificado</span>', sem_justificativa: '<b style="color:#dc2626;">⚠ comentário não justifica</b>', sem_comentario: '<b style="color:#dc2626;">⚠ sem comentário</b>' };
        const ruins = linhas.filter(l => l.situacao !== 'justificado').length;
        box.innerHTML = linhas.length ? `<div style="font-size:10.5px; margin-bottom:4px;"><b>${linhas.length}</b> exame(s) em ABERTO · <b style="color:${ruins ? '#dc2626' : '#059669'};">${ruins} a conferir</b> (sem comentário ou comentário que não explica — pode ser laudo esquecido).</div><div style="max-height:320px; overflow:auto;">`
            + finTab(['Data', 'Nº do exame', 'Mod.', 'Exame', 'Convênio', 'Conferência', 'Motivo'], linhas.map(l => [fmtBR(l.dia), `#${l.cod}`, l.mod === 'CT' ? 'TC' : 'US', escapeHtml(l.exame), escapeHtml(l.conv), rot[l.situacao], escapeHtml(l.motivo || (l.par ? '2º código? (outro exame liberado no dia)' : '—'))]))
            + '</div>' : '<div style="color:#059669;">Nenhum exame em ABERTO no período ✓</div>';
    }
    // conferência automática semanal (mês corrente e anterior), só na aba principal com PACS e nuvem logados
    async function abertosAutoSemanal() {
        try {
            if (!rtPermitido() || document.hidden || !pacsToken() || !getSupabaseConfig() || !lerSessao()) return;
            const ult = +new Date(localStorage.getItem('agenda_abertos_conferido_em') || 0);
            if (Date.now() - ult < 7 * 864e5) return;
            const rv = await requestSupabase('aberto_revisao?select=revisado_em&order=revisado_em.desc&limit=1', 'GET').catch(() => null);
            if (Array.isArray(rv) && rv[0] && Date.now() - new Date(rv[0].revisado_em) < 7 * 864e5) { localStorage.setItem('agenda_abertos_conferido_em', rv[0].revisado_em); return; }
            const h = new Date(), ini = isoDe(new Date(h.getFullYear(), h.getMonth() - 1, 1)), fim = isoDe(new Date(h.getTime() - 864e5));
            const linhas = await abertosColetar(ini < ABERTO_DESDE ? ABERTO_DESDE : ini, fim, ['US', 'CT']);
            if (linhas.length) await abertosConferir(linhas); else localStorage.setItem('agenda_abertos_conferido_em', new Date().toISOString());
        } catch (e) { console.warn('[Agenda] conferência semanal dos abertos', e); }
    }
    setInterval(abertosAutoSemanal, 6 * 3600000);
    setTimeout(abertosAutoSemanal, 5 * 60000);
    async function finLerPeriodo() {
        if (finLendo) return;
        if (!pacsToken()) { alert('Abra o PACS logado nesta aba para ler a produção.'); return; }
        if (!getSupabaseConfig() || !lerSessao()) { alert('Faça login na nuvem (⚙️ API) para gravar a produção.'); return; }
        const per = finPeriodo(finUn, finRef), atualM = getTodayIso().slice(0, 7), meses = [], [y0, m0] = per.ini.split('-').map(Number);
        for (let i = 0; i < 13; i++) { const m = isoDe(new Date(y0, m0 - 1 + i, 1)).slice(0, 7); if (m > per.fim.slice(0, 7) || m > atualM) break; meses.push(m); }
        if (!meses.length) { alert('Período no futuro: nada para ler.'); return; }
        if (meses.length > 2 && !confirm(`Ler ${meses.length} meses do PACS (US e TC)? Pode levar alguns minutos — deixe esta aba aberta.`)) return;
        finLendo = true;
        try {
            for (let i = 0; i < meses.length; i++) {
                const st = document.getElementById('finStatus');
                if (st) st.textContent = `⏳ lendo o PACS: ${mesNomeAno(meses[i])} (${i + 1} de ${meses.length})…`;
                while (prodLendo) await new Promise(res => setTimeout(res, 500)); // espera leitura automática em curso
                await prodLerPacs(meses[i]);
                if (prodErroLote) throw new Error(`não consegui gravar na nuvem: ${prodErroLote}`);
            }
        } catch (e) { alert(`Leitura interrompida:\n${e.message}`); }
        finally { finLendo = false; }
        renderFinanceiro();
    }
    function relatorioFinanceiro() {
        if (!finUltimo) { alert('Abra um período primeiro.'); return; }
        const { r, per } = finUltimo, A = finAgrega(r), F = A.F, rt = r.fixos && r.fixos.RT;
        const modTxt = finMod === 'todos' ? 'Ultrassom + Tomografia' : finMod === 'US' ? 'Ultrassom' : 'Tomografia';
        const lm = (nome, m) => [nome, `${m.liberado.n} · ${brl(m.liberado.v)}`, `${m.revisar.n} · ${brl(m.revisar.v)}`, `${m.pendente.n} · ${brl(m.pendente.v)}`, `${m.liberado.n + m.revisar.n + m.pendente.n} · ${brl(m.liberado.v + m.revisar.v + m.pendente.v)}`, m.urgN, m.semN];
        const mods = ['US', 'CT'].filter(k => A.porMod[k]);
        const junta = (arr, chave, campos) => { const mp = new Map(); arr.forEach(x => { const k = chave(x), e = mp.get(k); if (!e) mp.set(k, Object.assign({}, x)); else campos.forEach(c => { e[c] = (+e[c] || 0) + (+x[c] || 0); }); }); return [...mp.values()]; };
        const convs = junta(F(r.por_convenio), x => x.conv, ['n', 'valor', 'lib_valor', 'sem_n', 'est_n']).sort((a, b) => b.valor - a.valor);
        const cats = junta(F(r.por_categoria), x => x.cat, ['n', 'valor', 'lib_valor']).sort((a, b) => b.valor - a.valor);
        const corpo = `<h1>Produção e repasse estimado — ${escapeHtml(per.rotulo)}</h1><div class="meta">USO INTERNO · Dr. Gabriel Gaspar · ${modTxt} · produção pela data do exame · tarifas do banco privado (versão corrigida)</div>
            <div class="kpis"><div class="kpi"><b>${brl(A.liberado.v)}</b>liberado (${A.liberado.n})</div><div class="kpi"><b>${brl(A.revisar.v)}</b>em revisão (${A.revisar.n})</div><div class="kpi"><b>${brl(A.pendente.v)}</b>a laudar (${A.pendente.n})</div><div class="kpi"><b>${brl(A.v)}</b>produção total (${A.n})</div><div class="kpi"><b>${brl(A.ticket)}</b>ticket médio</div></div>
            ${rt ? `<div class="meta">RT (responsabilidade técnica): ${brl(rt.valor)}/mês — fixo, à parte da produção.</div>` : ''}
            <h2>Por modalidade e situação</h2>${tabRel(['Modalidade', 'Liberado', 'Em revisão', 'A laudar', 'Total', 'Urgentes', 'Sem tarifa'], [...mods.map(k => lm(k === 'US' ? 'Ultrassom' : 'Tomografia', A.porMod[k])), ...(mods.length > 1 ? [lm('Total', A)] : [])])}
            <h2>Por categoria</h2>${tabRel(['Categoria', 'Exames', 'Valor', '% do total', 'Liberado'], cats.map(c => [c.cat, c.n, brl(+c.valor), pctBR(+c.valor, A.v), brl(+c.lib_valor)]))}
            <h2>Por convênio</h2>${tabRel(['Convênio', 'Categoria', 'Exames', 'Valor', 'Liberado', 'Estimados', 'Sem tarifa'], convs.map(c => [c.conv, c.cat, c.n, brl(+c.valor), brl(+c.lib_valor), c.est_n || '', c.sem_n || '']))}
            <h2>Por tipo de procedimento</h2>${tabRel(['Tipo', 'Modalidade', 'Exames', 'Valor'], [...F(r.por_grupo)].sort((a, b) => b.valor - a.valor).map(g => [finGrupoNome(g.grupo), g.mod === 'CT' ? 'TC' : 'US', g.n, brl(+g.valor)]))}
            <h2>Exames (maiores valores)</h2>${tabRel(['Exame', 'Modalidade', 'Exames', 'Ticket', 'Valor'], F(r.por_exame).slice(0, 40).map(e => [e.exame, e.mod === 'CT' ? 'TC' : 'US', e.n, brl(e.ticket), brl(+e.valor)]))}
            ${F(r.abertos).length ? `<div class="meta">Em ABERTO desde o dia seguinte ao exame (fora do valor, conferidos pelo comentário do PACS): ${F(r.abertos).reduce((a, x) => a + (+x.n || 0), 0)} exame(s).</div>` : ''}
            ${F(r.sem_tarifa).length ? `<h2>Sem tarifa (fora do total)</h2>${tabRel(['Convênio', 'Exame', 'Exames', 'Estimativa pelo ticket'], F(r.sem_tarifa).map(s => [s.conv, s.exame, s.n, brl(+s.est)]))}` : ''}
            <div class="meta">Liberado = laudo liberado · Em revisão = revisar/digitado/assinar/pré-laudo · A laudar = sem laudo. Estimado = sem tabela conferida. Repasse estimado: o pagamento real depende do fechamento e de glosas do hospital.</div>`;
        janelaRelatorio(`Financeiro — ${per.rotulo}`, corpo);
    }

    // =====================================================================
    // 17. IMPRESSÃO
    // =====================================================================
    function printPDF() {
        // v9.6 — saídas (desmarcados / cancelados) saem da lista principal e vão para um bloco no fim, com o motivo
        const todos = sortPatientsList([...(agendaDatabase[selectedDate] || [])]);
        const list = todos.filter(i => !ehSaida(i)), saidas = todos.filter(ehSaida);
        const [ano, mes, dia] = selectedDate.split('-');
        const rows = p => list.filter(i => periodoFromHora(i.hora) === p).map(i => `
            <tr><td class="center"><strong>${escapeHtml(normalizeTime(i.hora))}</strong></td><td>${escapeHtml(i.convenio)}</td><td><strong>${escapeHtml(i.paciente)}</strong></td><td>${escapeHtml(i.exame)}</td></tr>`).join('');
        const table = p => `<table><thead><tr><th style="width:10%;" class="center">Hora</th><th style="width:20%;">Convênio / Setor</th><th style="width:38%;">Paciente</th><th style="width:32%;">Procedimento</th></tr></thead><tbody>${rows(p)}</tbody></table>`;
        const motivoSaida = i => { const n = [...notasDe(i)].reverse().find(x => x.tag === 'Saída'); return n && n.motivo ? n.motivo : (i.status === 'cancelado' ? 'cancelado' : 'saiu da planilha / PACS'); }; // só o motivo (o texto livre não sai no papel)
        const blocoSaidas = saidas.length ? `<div class="section-title" style="background:#64748b;">SAÍDAS (${saidas.length}) — desmarcados / cancelados</div><table><thead><tr><th style="width:10%;" class="center">Hora</th><th style="width:20%;">Convênio / Setor</th><th style="width:30%;">Paciente</th><th style="width:20%;">Procedimento</th><th style="width:20%;">Motivo</th></tr></thead><tbody>${saidas.map(i => `<tr style="color:#555;"><td class="center">${escapeHtml(normalizeTime(i.hora))}</td><td>${escapeHtml(i.convenio)}</td><td>${escapeHtml(i.paciente)}</td><td>${escapeHtml(i.exame)}</td><td>${escapeHtml(motivoSaida(i))}</td></tr>`).join('')}</tbody></table>` : '';
        const win = window.open('', '_blank');
        if (!win) { alert('O navegador bloqueou a janela de impressão. Libere pop-ups para pacs.ladi.org.br.'); return; }
        win.document.write(`<!DOCTYPE html><html><head><title>Agenda Dr. Gabriel Gaspar - ${dia}/${mes}/${ano}</title>
            <style>body{font-family:sans-serif;font-size:9pt;color:#111;margin:10mm}h2{margin:0 0 4px;color:#1e3a8a}.meta{margin-bottom:12px;font-size:8pt;color:#555;border-bottom:1.5px solid #1e3a8a;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{border:1px solid #999;padding:3.5px 6px;text-align:left;font-size:8.5pt}th{background:#f1f5f9}.center{text-align:center}.section-title{background:#1e3a8a;color:#fff;padding:4px 6px;font-weight:bold;font-size:9pt;margin-top:8px;margin-bottom:2px}</style>
            </head><body><h2>Agenda de Exames • Dr. Gabriel Gaspar</h2><div class="meta">Data: <strong>${dia}/${mes}/${ano}</strong> | ${dayStats(list).pacientes} pacientes · ${dayStats(list).procedimentos} procedimentos</div>
            <div class="section-title">PERÍODO DA MANHÃ</div>${table('manha')}<div class="section-title">PERÍODO DA TARDE</div>${table('tarde')}${blocoSaidas}</body></html>`);
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
        const modal = document.getElementById('modalDashboard'), mn = document.getElementById('modalNotas'), mf = document.getElementById('modalFin');
        if (mn && mn.classList.contains('open')) fecharNotas();
        else if (mf && mf.classList.contains('open')) mf.classList.remove('open');
        else if (modal && modal.classList.contains('open')) modal.classList.remove('open');
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

    // v9.6 — 💰 Financeiro / 📈 Produção sempre atualizados: com o PACS logado (aba principal) e login na nuvem,
    // relê do PACS o mês corrente quando a última leitura (de qualquer computador) passou de 30 min, e o mês
    // anterior 1×/dia nos 10 primeiros dias (laudos liberados com atraso contam no mês do exame).
    // Trava entre abas do mesmo navegador por localStorage; entre computadores, pelo lido_em da nuvem.
    async function finAutoAtualizar() {
        try {
            if (!rtPermitido() || document.hidden || !pacsToken() || !getSupabaseConfig() || !lerSessao() || prodLendo || finLendo) return;
            const agora = Date.now();
            try {
                if (agora - (+localStorage.getItem('agenda_prod_auto_lock') || 0) < 10 * 60000) return;
                localStorage.setItem('agenda_prod_auto_lock', String(agora));
            } catch (e) { /* sem localStorage: segue */ }
            const h = new Date(), atual = isoDe(h).slice(0, 7), ant = isoDe(new Date(h.getFullYear(), h.getMonth() - 1, 1)).slice(0, 7);
            const meses = h.getDate() <= 10 ? [atual, ant] : [atual];
            const lidos = await requestSupabase(`producao_lote?select=mes,modalidade,lido_em&mes=gte.${meses[meses.length - 1]}&mes=lte.${atual}`, 'GET').catch(() => null);
            if (!Array.isArray(lidos)) return;
            for (const mes of meses) {
                const l = lidos.filter(x => x.mes === mes);
                const velho = l.length < 2 ? Infinity : agora - Math.min(...l.map(x => new Date(x.lido_em).getTime()));
                if (velho > (mes === atual ? 30 * 60000 : 20 * 3600000)) await prodLerPacs(mes);
            }
        } catch (e) { console.warn('[Agenda Financeiro] atualização automática', e); }
    }
    setInterval(finAutoAtualizar, 15 * 60000);
    setTimeout(finAutoAtualizar, 2 * 60000);


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
