// ==UserScript==
// @name         LADI - Abrir no RadiAnt (ponte segura)
// @namespace    ladi.local.radiant
// @version      0.4.0
// @description  Botao por exame (lista e historicos) que aciona a ponte local validada para o RadiAnt. So Windows.
// @match        https://pacs.ladi.org.br/exames*
// @run-at       document-idle
// @grant        unsafeWindow
// @noframes
// @updateURL    https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/ladi-radiant.user.js
// @downloadURL  https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/ladi-radiant.user.js
// ==/UserScript==

// Base: 0.3.1 original (SHA-256 A310AA6B..., igual nos PCs de casa e do hospital).
// Contrato com a ponte Windows (ladi-radiant://, 13 chaves, limites) INALTERADO:
// a ponte AHK 0.3.2_hospital_v1 e a de casa continuam servindo sem mudanca.
//
// 0.4.0 (05/11/2026):
//  - Vinculo linha -> exame: indice de GridExames.exames SO com contagem igual de
//    linhas, conferindo paciente + data (+ hora, se a coluna existir). Sem o
//    fallback por pontuacao (podia pegar outro paciente com mesmo exame/data).
//    Divergencia = bloqueia e avisa na tela; nunca "adivinha".
//  - Clique/duplo clique contidos em captura (o duplo clique nao abre o laudo
//    nem dispara a ponte duas vezes) — vem da candidata 0.3.1.1.
//  - API para o PACS Plus abrir exames do HISTORICO pelo exa_codigo:
//    controller.openExam(itemOuCodigo). Identificadores vem do proprio item ou
//    de GET /backend/api/exame/{id}, conferindo o exa_codigo.
//  - Avisos visiveis (silenciosos) em vez de so console; nada de payload global.
//  - Nao roda no Mac (sem ponte RadiAnt la).

(function () {
  "use strict";

  const VERSION = "0.4.0";
  const PREFIX = "[LADI-RADIANT]";
  const DEBUG = false;
  const BRIDGE_ENABLED = true;
  const MAX_PAYLOAD_BYTES = 8192;
  const PROTOCOL_PREFIX = "ladi-radiant://open?payload=";
  const PAYLOAD_KEYS = Object.freeze([
    "version",
    "source",
    "patientName",
    "patientId",
    "accessionNumber",
    "studyInstanceUID",
    "internalExamId",
    "examDescription",
    "studyDate",
    "studyTime",
    "modality",
    "rowKey",
  ]);
  const BUTTON_ATTRIBUTE = "data-ladi-radiant-button";
  const BUTTON_SELECTOR = `[${BUTTON_ATTRIBUTE}="true"]`;
  const BUTTON_CLASS = "ladi-radiant-button";
  const PAGE = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
  const DOC = PAGE.document;
  const TEST = PAGE.__LADI_RADIANT_TEST__ || null;

  if (
    PAGE.location.origin !== "https://pacs.ladi.org.br" ||
    PAGE.location.pathname !== "/exames"
  ) {
    return;
  }
  // Mac: sem ponte RadiAnt (la o visualizador e o Horos). Nao insere nada.
  const platform = String((PAGE.navigator && (PAGE.navigator.userAgentData?.platform || PAGE.navigator.platform)) || "");
  if (/mac/i.test(platform) && !TEST) return;

  const previousController = PAGE.__LADI_RADIANT_USERSCRIPT_CONTROLLER__;
  if (previousController && typeof previousController.uninstall === "function") {
    try {
      previousController.uninstall();
    } catch (_error) {
      // Uma versao anterior defeituosa nao deve impedir uma instalacao limpa.
    }
  }

  let observer = null;
  let scanTimer = 0;
  let installed = false;
  let lastLaunch = 0;

  function debug(message, details) {
    if (!DEBUG) return;
    if (details === undefined) PAGE.console.debug(PREFIX, message);
    else PAGE.console.debug(PREFIX, message, details);
  }

  function normalizeSpace(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizeKey(value) {
    return normalizeSpace(value)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function getPath(object, path) {
    let current = object;
    for (const key of path.split(".")) {
      if (!current || typeof current !== "object") return undefined;
      current = current[key];
    }
    return current;
  }

  function firstValue(object, paths) {
    for (const path of paths) {
      const value = getPath(object, path);
      if (value !== undefined && value !== null && normalizeSpace(value) !== "") {
        return normalizeSpace(value);
      }
    }
    return "";
  }

  function normalizeDate(value) {
    const text = normalizeSpace(value);
    if (!text) return "";

    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;

    match = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;

    return "";
  }

  function normalizeTime(value) {
    const text = normalizeSpace(value);
    if (!text) return "";
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return "";
    return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] || "00"}`;
  }

  function normalizeStudyUID(value) {
    const text = normalizeSpace(value);
    if (!/^\d+(?:\.\d+)+$/.test(text) || text.length > 64) return "";
    return text;
  }

  function sanitizeIdentifier(value) {
    const text = normalizeSpace(value);
    return /^[A-Za-z0-9._/-]{1,64}$/.test(text) ? text : "";
  }

  function validatePayload(candidate) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error("PAYLOAD_NAO_OBJETO");
    }

    const keys = Object.keys(candidate);
    if (
      keys.length !== PAYLOAD_KEYS.length ||
      !keys.every((key) => PAYLOAD_KEYS.includes(key))
    ) {
      throw new Error("PAYLOAD_CHAVES_INVALIDAS");
    }
    if (candidate.version !== 1 || candidate.source !== "LADI_AM2") {
      throw new Error("PAYLOAD_VERSAO_OU_ORIGEM_INVALIDA");
    }

    const limits = Object.freeze({
      source: 16,
      patientName: 160,
      patientId: 64,
      accessionNumber: 64,
      studyInstanceUID: 64,
      internalExamId: 64,
      examDescription: 256,
      studyDate: 10,
      studyTime: 8,
      modality: 16,
      rowKey: 512,
    });
    const canonical = {};
    for (const key of PAYLOAD_KEYS) {
      const value = candidate[key];
      if (key === "version") {
        if (!Number.isInteger(value)) throw new Error("PAYLOAD_TIPO_INVALIDO");
        canonical[key] = value;
        continue;
      }
      if (typeof value !== "string" || value.length > limits[key]) {
        throw new Error("PAYLOAD_TIPO_OU_TAMANHO_INVALIDO");
      }
      if (/[\u0000-\u001f]/.test(value)) {
        throw new Error("PAYLOAD_CONTROLE_INVALIDO");
      }
      canonical[key] = value;
    }

    canonical.patientName = normalizeSpace(canonical.patientName);
    canonical.examDescription = normalizeSpace(canonical.examDescription);
    canonical.modality = normalizeSpace(canonical.modality).toUpperCase();
    if (!canonical.patientName) throw new Error("PACIENTE_AUSENTE");

    const identifierPattern = /^[A-Za-z0-9._/-]+$/;
    for (const key of ["patientId", "accessionNumber", "internalExamId"]) {
      if (canonical[key] && !identifierPattern.test(canonical[key])) {
        throw new Error("IDENTIFICADOR_INVALIDO");
      }
    }
    if (
      canonical.studyInstanceUID &&
      !/^\d+(?:\.\d+)+$/.test(canonical.studyInstanceUID)
    ) {
      throw new Error("STUDY_UID_INVALIDO");
    }
    if (canonical.modality && !/^[A-Z0-9]{1,16}$/.test(canonical.modality)) {
      throw new Error("MODALIDADE_INVALIDA");
    }
    if (canonical.studyDate && !/^\d{4}-\d{2}-\d{2}$/.test(canonical.studyDate)) {
      throw new Error("DATA_INVALIDA");
    }
    if (canonical.studyTime) {
      const time = canonical.studyTime.match(/^(\d{2}):(\d{2}):(\d{2})$/);
      if (!time || Number(time[1]) > 23 || Number(time[2]) > 59 || Number(time[3]) > 59) {
        throw new Error("HORA_INVALIDA");
      }
    }
    if (!/^(study|accession|exam|fallback):/i.test(canonical.rowKey)) {
      throw new Error("ROW_KEY_INVALIDA");
    }
    if (
      !canonical.studyInstanceUID &&
      !canonical.accessionNumber &&
      !canonical.internalExamId
    ) {
      throw new Error("IDENTIFICADOR_FORTE_AUSENTE");
    }
    return canonical;
  }

  function base64UrlUtf8(text) {
    const bytes = new TextEncoder().encode(text);
    if (!bytes.length || bytes.length > MAX_PAYLOAD_BYTES) {
      throw new Error("PAYLOAD_EXCEDE_LIMITE");
    }

    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 4096) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 4096));
    }
    return PAGE.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function buildProtocolUri(payload) {
    const canonical = validatePayload(payload);
    return PROTOCOL_PREFIX + base64UrlUtf8(JSON.stringify(canonical));
  }

  function launchProtocolUri(uri) {
    if (!BRIDGE_ENABLED) throw new Error("PONTE_DESATIVADA");
    if (!/^ladi-radiant:\/\/open\?payload=[A-Za-z0-9_-]+$/.test(uri)) {
      throw new Error("URI_LOCAL_INVALIDA");
    }

    const anchor = DOC.createElement("a");
    anchor.href = uri;
    anchor.hidden = true;
    anchor.setAttribute("aria-hidden", "true");
    (DOC.body || DOC.documentElement).appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
    }
  }

  // ---------- aviso visivel, silencioso (sem som), sem nome de paciente ----------
  function toast(text, kind) {
    try {
      let box = DOC.getElementById("ladi-radiant-toast");
      if (!box) {
        box = DOC.createElement("div");
        box.id = "ladi-radiant-toast";
        box.setAttribute("role", "status");
        box.style.cssText =
          "position:fixed;z-index:2147483600;left:50%;bottom:24px;transform:translateX(-50%);" +
          "max-width:min(560px,calc(100vw - 32px));padding:9px 14px;border-radius:8px;" +
          "font:13px/1.35 Roboto,Arial,sans-serif;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.45);pointer-events:none";
        (DOC.body || DOC.documentElement).appendChild(box);
      }
      box.style.background = kind === "erro" ? "#b91c1c" : "#1e3a5f";
      box.textContent = "RadiAnt: " + text;
      box.hidden = false;
      PAGE.clearTimeout(toast._t);
      toast._t = PAGE.setTimeout(() => { box.hidden = true; }, kind === "erro" ? 6000 : 2500);
    } catch (_e) { /* aviso e opcional */ }
  }

  const MOTIVOS = Object.freeze({
    LINHA_DE_EXAME_NAO_IDENTIFICADA: "linha da lista nao reconhecida.",
    LISTA_NAO_ENCONTRADA: "lista do PACS nao encontrada — atualize a pagina.",
    LISTA_EM_ATUALIZACAO: "a lista esta se atualizando — tente de novo em 1 segundo.",
    LINHA_E_EXAME_DIVERGENTES: "nao confirmei o exame desta linha com seguranca — atualize a lista e tente de novo.",
    IDENTIFICADOR_PACS_AUSENTE: "este exame ainda nao tem estudo (imagem) no PACS.",
    EXAME_NAO_ENCONTRADO: "exame nao encontrado no PACS.",
    EXAME_DIVERGENTE: "o PACS devolveu outro exame — abertura bloqueada.",
    PACS_SEM_LOGIN: "PACS sem login — entre de novo.",
  });
  function motivoDe(error) {
    const code = String(error?.message || "");
    return MOTIVOS[code] || (/^PACS_HTTP_/.test(code) ? "o PACS nao respondeu (" + code.slice(10) + ")." : "falha ao montar o pedido (" + (code || "erro") + ").");
  }

  // ---------- tabela da lista ----------
  function headersFor(table) {
    return [...table.querySelectorAll("thead th")].map((header) =>
      normalizeKey(header.innerText || header.textContent)
    );
  }

  function isExamTable(table) {
    const headers = headersFor(table);
    const required = [
      "paciente",
      "idade",
      "exame",
      "data",
      "hora",
      "convenio",
      "situacao",
      "acoes",
    ];
    return required.every((header) => headers.includes(header));
  }

  function findExamTables() {
    return [...DOC.querySelectorAll("table")].filter(isExamTable);
  }

  function dataRowsFor(table) {
    const minimumCells = headersFor(table).length;
    return [...table.querySelectorAll("tbody tr")].filter(
      (row) => row.children.length >= minimumCells
    );
  }

  function actionCellFor(row, table) {
    const headers = headersFor(table);
    const actionIndex = headers.indexOf("acoes");
    if (actionIndex < 0) return null;
    return row.children[actionIndex] || null;
  }

  function findDotsAnchor(actionCell) {
    const dotsIcon = actionCell.querySelector(
      ".mdi-dots-vertical, .mdi-dots-horizontal"
    );
    if (!dotsIcon) return null;

    let anchor = dotsIcon.closest("button, [role='button'], .v-btn") || dotsIcon;
    while (anchor.parentElement && anchor.parentElement !== actionCell) {
      if (!actionCell.contains(anchor.parentElement)) return null;
      anchor = anchor.parentElement;
    }
    return anchor.parentElement === actionCell ? anchor : null;
  }

  function createButton() {
    const button = DOC.createElement("button");
    button.type = "button";
    button.className = [
      "v-btn",
      "v-btn--icon",
      "v-btn--round",
      "theme--dark",
      "v-size--small",
      BUTTON_CLASS,
    ].join(" ");
    button.setAttribute(BUTTON_ATTRIBUTE, "true");
    button.setAttribute("aria-label", "Abrir no RadiAnt");
    button.setAttribute("title", "Abrir no RadiAnt");
    button.innerHTML =
      '<span class="v-btn__content">' +
      '<i aria-hidden="true" class="v-icon notranslate mdi mdi-open-in-new theme--dark"></i>' +
      "</span>";
    return button;
  }

  function scanRows() {
    let inserted = 0;

    for (const table of findExamTables()) {
      for (const row of dataRowsFor(table)) {
        const actionCell = actionCellFor(row, table);
        if (!actionCell || actionCell.querySelector(BUTTON_SELECTOR)) continue;

        const dotsAnchor = findDotsAnchor(actionCell);
        if (!dotsAnchor) continue;

        actionCell.insertBefore(createButton(), dotsAnchor);
        inserted += 1;
      }
    }

    if (inserted) debug(`Botoes inseridos: ${inserted}`);
    return inserted;
  }

  function scheduleScan() {
    if (scanTimer) PAGE.clearTimeout(scanTimer);
    scanTimer = PAGE.setTimeout(() => {
      scanTimer = 0;
      scanRows();
    }, 120);
  }

  function observeTable() {
    if (observer || !DOC.body) return observer;
    observer = new PAGE.MutationObserver(scheduleScan);
    observer.observe(DOC.body, { childList: true, subtree: true });
    return observer;
  }

  function domFieldsFor(row, table) {
    const headers = headersFor(table);
    const cells = [...row.children];

    const textByHeader = (predicate) => {
      const index = headers.findIndex(predicate);
      if (index < 0 || !cells[index]) return "";
      return normalizeSpace(cells[index].innerText || cells[index].textContent);
    };

    return {
      patientName: textByHeader((header) => header === "paciente"),
      examDescription: textByHeader((header) => header === "exame"),
      studyDate: normalizeDate(textByHeader((header) => header === "data")),
      studyTime: normalizeTime(textByHeader((header) => header === "hora")),
      modality: textByHeader((header) => header.startsWith("mod")),
    };
  }

  // A lista do PACS e um v-simple-table do componente GridExames: as linhas saem
  // na MESMA ordem de grid.exames (licao 16 do mapa do PACS). Nao ha v-data-table.
  function gridFor(table) {
    let component = table.closest(".v-data-table")?.__vue__ || table.__vue__ || null;
    for (let level = 0; component && level < 20; level += 1) {
      if (Array.isArray(component.exames)) return component;
      component = component.$parent;
    }
    // reserva: a partir do botao nativo do visualizador (caminho da 0.3.1)
    const viewer = table.querySelector('button[title="Abrir Visualizador"]') ||
      [...table.querySelectorAll(".mdi-eye")].map((i) => i.closest("button")).find(Boolean);
    component = viewer?.__vue__ || null;
    for (let level = 0; component && level < 25; level += 1) {
      if (Array.isArray(component.exames)) return component;
      component = component.$parent;
    }
    return null;
  }

  // Confere a linha visivel com o item: paciente e data sempre; hora se a coluna existir.
  // O nome do exame NAO entra: o PACS Plus abrevia o texto na tela (SC/CC, "ARTICULAR"...).
  function rowMatchesItem(domFields, item) {
    const name = firstValue(item, ["paciente.pac_nome"]);
    if (!name || !domFields.patientName || normalizeKey(name) !== normalizeKey(domFields.patientName)) return false;
    const dates = [normalizeDate(firstValue(item, ["exa_data"])), normalizeDate(firstValue(item, ["exa_pacs_data"]))].filter(Boolean);
    if (!domFields.studyDate || !dates.includes(domFields.studyDate)) return false;
    if (domFields.studyTime) {
      const times = [normalizeTime(firstValue(item, ["exa_hora"])), normalizeTime(firstValue(item, ["exa_pacs_hora"]))]
        .filter(Boolean).map((t) => t.slice(0, 5));
      if (!times.includes(domFields.studyTime.slice(0, 5))) return false;
    }
    return true;
  }

  function itemForRow(row, table) {
    const grid = gridFor(table);
    if (!grid || !Array.isArray(grid.exames)) throw new Error("LISTA_NAO_ENCONTRADA");
    const rows = dataRowsFor(table);
    const index = rows.indexOf(row);
    if (index < 0) throw new Error("LINHA_DE_EXAME_NAO_IDENTIFICADA");
    if (rows.length !== grid.exames.length) throw new Error("LISTA_EM_ATUALIZACAO");
    const item = grid.exames[index];
    if (!item || !rowMatchesItem(domFieldsFor(row, table), item)) throw new Error("LINHA_E_EXAME_DIVERGENTES");
    return item;
  }

  function makeRowKey(payload) {
    if (payload.studyInstanceUID) return `study:${payload.studyInstanceUID}`;
    if (payload.accessionNumber) return `accession:${payload.accessionNumber}`;
    if (payload.internalExamId) return `exam:${payload.internalExamId}`;
    return [
      "fallback",
      payload.patientId || normalizeKey(payload.patientName),
      payload.studyDate,
      payload.studyTime,
      payload.modality,
      normalizeKey(payload.examDescription),
    ].join(":");
  }

  function hasPacsStudy(item) {
    return !!(normalizeStudyUID(firstValue(item, ["exa_pacs_iuid"])) ||
      sanitizeIdentifier(firstValue(item, ["exa_pacs_codigo"])));
  }

  // Monta o payload SO a partir do objeto do exame (mesmos campos da 0.3.1).
  function payloadFromItem(item, fallbackName) {
    if (!hasPacsStudy(item)) throw new Error("IDENTIFICADOR_PACS_AUSENTE");
    const payload = {
      version: 1,
      source: "LADI_AM2",
      patientName: firstValue(item, ["paciente.pac_nome"]) || normalizeSpace(fallbackName),
      // Campos auxiliares podem trazer pontuacao de apresentacao: descartamos so o
      // campo auxiliar que nao pode ir com seguranca ao processo local.
      patientId: sanitizeIdentifier(firstValue(item, [
        "paciente.pac_pacs_codigo",
        "paciente.pac_his_prontuario",
        "paciente.pac_codigo",
        "pac_codigo",
      ])),
      accessionNumber: sanitizeIdentifier(firstValue(item, ["exa_pacs_codigo"])),
      studyInstanceUID: normalizeStudyUID(firstValue(item, ["exa_pacs_iuid"])),
      internalExamId: sanitizeIdentifier(firstValue(item, ["exa_codigo"])),
      examDescription: firstValue(item, ["tipoexame.tpe_descricao"]),
      studyDate: normalizeDate(firstValue(item, ["exa_pacs_data", "exa_data"])),
      studyTime: normalizeTime(firstValue(item, ["exa_pacs_hora", "exa_hora"])),
      modality: firstValue(item, [
        "tipoexame.modalidade.mod_sigla",
        "tipoexame.modalidade.mod_descricao",
      ]).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16),
      rowKey: "",
    };
    payload.rowKey = makeRowKey(payload);
    return validatePayload(payload);
  }

  function extractRowData(row) {
    const table = row?.closest("table");
    if (!table || !isExamTable(table)) {
      throw new Error("LINHA_DE_EXAME_NAO_IDENTIFICADA");
    }
    return payloadFromItem(itemForRow(row, table));
  }

  function launchPayload(payload) {
    const now = Date.now();
    if (now - lastLaunch < 900) return false; // segundo clique rapido: ignora
    lastLaunch = now;
    if (BRIDGE_ENABLED) launchProtocolUri(buildProtocolUri(payload));
    else debug("Payload validado; ponte local desativada");
    return true;
  }

  // ---------- historico: abrir pelo exa_codigo ----------
  async function fetchExam(code) {
    const token = PAGE.localStorage.getItem("lwtoken");
    if (!token) throw new Error("PACS_SEM_LOGIN");
    const response = await PAGE.fetch("/backend/api/exame/" + encodeURIComponent(code), {
      headers: { "x-access-token": token },
    });
    if (response.status === 404) throw new Error("EXAME_NAO_ENCONTRADO");
    if (!response.ok) throw new Error("PACS_HTTP_" + response.status);
    const data = await response.json();
    return data && data.exame && typeof data.exame === "object" ? data.exame : data;
  }

  // itemOrCode: objeto do exame (historico do laudo / painel 🕘) ou exa_codigo.
  // Retorna { ok, motivo } — nunca lanca para quem chama.
  async function openExam(itemOrCode, options) {
    try {
      const given = itemOrCode && typeof itemOrCode === "object" ? itemOrCode : null;
      const code = Number(given ? given.exa_codigo : itemOrCode);
      if (!Number.isInteger(code) || code <= 0) throw new Error("EXAME_NAO_ENCONTRADO");
      let item = given;
      if (!item || !hasPacsStudy(item) || !firstValue(item, ["paciente.pac_nome"])) {
        const fetched = await fetchExam(code);
        if (!fetched || Number(fetched.exa_codigo) !== code) throw new Error("EXAME_DIVERGENTE");
        // nome do paciente: do exame buscado, senao do item recebido, senao do chamador
        item = fetched;
        if (!firstValue(item, ["paciente.pac_nome"]) && given) {
          item = Object.assign({}, fetched, { paciente: Object.assign({}, given.paciente || {}, fetched.paciente || {}) });
        }
      }
      const payload = payloadFromItem(item, options && options.patientName);
      if (launchPayload(payload)) toast("abrindo o exame…");
      return { ok: true };
    } catch (error) {
      const motivo = motivoDe(error);
      toast(motivo, "erro");
      PAGE.console.warn(PREFIX, "Abertura bloqueada:", String(error?.message || error));
      return { ok: false, motivo };
    }
  }

  // ---------- clique no botao da lista ----------
  function handleRadiantClick(event) {
    const button = event.target?.closest?.(BUTTON_SELECTOR);
    if (!button || !DOC.contains(button)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    // O segundo click e o dblclick nao podem abrir a linha/laudo nem repetir a ponte.
    if (event.type === "dblclick" || event.detail > 1) return;

    try {
      const payload = extractRowData(button.closest("tr"));
      if (launchPayload(payload)) toast("abrindo o exame…");
    } catch (error) {
      toast(motivoDe(error), "erro");
      PAGE.console.warn(PREFIX, "Abertura bloqueada:", String(error?.message || error));
    }
  }

  function install() {
    if (installed) return controller;
    installed = true;

    PAGE.__LADI_RADIANT_USERSCRIPT_VERSION__ = VERSION;
    DOC.addEventListener("click", handleRadiantClick, true);
    DOC.addEventListener("dblclick", handleRadiantClick, true);
    scanRows();
    observeTable();
    try { PAGE.dispatchEvent(new PAGE.CustomEvent("ladi-radiant:pronto", { detail: { version: VERSION } })); } catch (_e) { /* ok */ }
    debug(`Userscript ${VERSION} instalado`);
    return controller;
  }

  function uninstall() {
    if (scanTimer) {
      PAGE.clearTimeout(scanTimer);
      scanTimer = 0;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    DOC.removeEventListener("click", handleRadiantClick, true);
    DOC.removeEventListener("dblclick", handleRadiantClick, true);
    for (const button of DOC.querySelectorAll(BUTTON_SELECTOR)) button.remove();

    if (PAGE.__LADI_RADIANT_USERSCRIPT_CONTROLLER__ === controller) {
      delete PAGE.__LADI_RADIANT_USERSCRIPT_CONTROLLER__;
      delete PAGE.__LADI_RADIANT_USERSCRIPT_VERSION__;
    }
    delete PAGE.__LADI_RADIANT_LAST_PAYLOAD__;
    installed = false;
  }

  const controller = Object.freeze({
    version: VERSION,
    bridgeEnabled: BRIDGE_ENABLED,
    install,
    uninstall,
    scanRows,
    createButton,
    extractRowData,
    validatePayload,
    sanitizeIdentifier,
    base64UrlUtf8,
    buildProtocolUri,
    launchProtocolUri,
    handleRadiantClick,
    observeTable,
    openExam,
    payloadFromItem,
  });

  PAGE.__LADI_RADIANT_USERSCRIPT_CONTROLLER__ = controller;
  if (TEST) TEST.controller = controller;
  install();
})();
