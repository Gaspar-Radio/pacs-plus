// ==UserScript==
// @name         WhatsApp Web - Reescrever (Gaspar)
// @namespace    gaspar.rad
// @version      1.7.0
// @description  Reescreve o rascunho com Gemini usando o contexto da conversa (Alt+R) e transcreve áudios com botão em cada mensagem (Alt+T = último tocado). Também: barra de conversas ajustável (largura/zoom/ocultar), limpeza de botões, fixados ilimitados, esconder elementos (ex.: Blueticks) e modo privacidade (Alt+S). Nunca envia sozinho.
// @match        https://web.whatsapp.com/*
// @updateURL    https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/whatsapp-suite.user.js
// @downloadURL  https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/whatsapp-suite.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @grant        GM_addValueChangeListener
// @connect      generativelanguage.googleapis.com
// @connect      outlook.live.com
// @connect      outlook.office365.com
// @connect      outlook.office.com
// @connect      calendar.google.com
// @connect      docs.google.com
// @connect      googleusercontent.com
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // =====================================================================
  // 1. CAPTURA DE ÁUDIO (roda antes do WhatsApp carregar)
  // Ao dar play, o WhatsApp descriptografa o áudio e cria um "blob" local.
  // Associamos esse blob à mensagem (balão) em que você clicou.
  // =====================================================================
  const urlBlobs = new Map();          // blob: URL -> Blob de áudio
  const audios = new Map();            // id da mensagem -> {blob, at, transcript, model, summary, busy}
  let lastAudioId = null;              // último áudio tocado (para Alt+T)
  let lastClick = { id: null, at: 0 }; // último balão clicado

  document.addEventListener('pointerdown', e => {
    const row = e.target && e.target.closest && e.target.closest('#main [data-id]');
    if (row && !(e.target.closest('.gz-tr'))) lastClick = { id: row.getAttribute('data-id'), at: Date.now() };
  }, true);

  function registerAudio(blob, viaPlay) {
    // já conhecido?
    for (const [id, a] of audios) if (a.blob === blob) { lastAudioId = id; return; }
    const recent = lastClick.id && Date.now() - lastClick.at < (viaPlay ? 6000 : 4000);
    const id = recent ? lastClick.id : 'audio_' + Date.now();
    const prev = audios.get(id);
    if (prev && prev.blob === blob) { lastAudioId = id; return; }
    audios.set(id, { blob, at: Date.now(), transcript: null });
    lastAudioId = id;
    setTimeout(() => { decorateAll(); showAudioChip(); }, 0);
  }

  try {
    const W = unsafeWindow;
    const origCreate = W.URL.createObjectURL;
    W.URL.createObjectURL = function (obj) {
      const url = origCreate.apply(this, arguments);
      try {
        if (obj && typeof obj.type === 'string' && obj.type.startsWith('audio') && obj.size > 1000) {
          urlBlobs.set(url, obj);
          if (urlBlobs.size > 80) urlBlobs.delete(urlBlobs.keys().next().value);
          // só registra aqui se veio logo após um clique (o play abaixo confirma/corrige)
          if (Date.now() - lastClick.at < 4000) registerAudio(obj, false);
        }
      } catch (_) {}
      return url;
    };
    const origPlay = W.HTMLMediaElement.prototype.play;
    W.HTMLMediaElement.prototype.play = function () {
      try {
        const b = urlBlobs.get(this.currentSrc || this.src);
        if (b) registerAudio(b, true);
      } catch (_) {}
      return origPlay.apply(this, arguments);
    };
  } catch (e) { console.warn('[Reescrever] hook de áudio falhou', e); }

  // =====================================================================
  // 2. CONFIG E PROMPTS
  // =====================================================================
  const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  const N_CONTEXTO = 10;

  const BASE = `Você reescreve mensagens de WhatsApp do Dr. Gabriel Gaspar, médico radiologista brasileiro (US, Doppler, TC), que conversa principalmente com colegas médicos.
Regras obrigatórias:
- Responda SOMENTE com o texto final pronto para enviar. Sem aspas, sem comentários, sem alternativas, sem explicações.
- Português do Brasil.
- Reescreva apenas o RASCUNHO. O CONTEXTO (quando houver) serve só para entender o assunto, o interlocutor e o tom: não responda às mensagens do contexto além do que o rascunho já responde e não acrescente informações vindas dele.
- Preserve integralmente o sentido e todos os dados do rascunho: números, medidas, unidades, datas, horários, nomes, lateralidade e segmentos anatômicos.
- Nunca invente achados, medidas, diagnósticos, condutas ou informações.
- Não acrescente saudações, despedidas ou assinatura que não existam no rascunho.
- Mantenha extensão próxima do original, salvo instrução em contrário.
- Estilo WhatsApp: frases diretas, quebras de linha quando ajudarem; sem títulos/markdown. Use *negrito* só se já existir no rascunho.`;

  const N_CONVERSA = 30;
  const RESP_BASE = `Você redige mensagens de WhatsApp em nome do Dr. Gabriel Gaspar, médico radiologista brasileiro (US, Doppler, TC), responsável técnico do serviço de imagem, que conversa com colegas médicos, técnicos, recepção, gestão hospitalar e pacientes.
Regras obrigatórias:
- Responda SOMENTE com o texto da mensagem pronta para enviar. Sem aspas, sem comentários, sem alternativas.
- Português do Brasil, natural, como ele mesmo escreveria no WhatsApp: direto, cordial, sem rebuscamento.
- Baseie-se apenas na conversa fornecida (incluindo áudios transcritos). Não invente fatos, horários, datas, compromissos, condutas, achados ou decisões.
- Se a resposta depender de algo que só o Dr. sabe (horário, decisão, dado), deixe um marcador entre colchetes para ele completar, ex.: [horário].
- Diferencie achado de hipótese diagnóstica quando falar de exames.
- Não repita tudo o que a pessoa disse; responda ao que precisa de resposta.
- Sem markdown nem títulos.`;

  const TONS = [
    { k: '1', nome: 'Médico-técnico', desc: 'para colega', inst: 'Tom técnico e cordial, para colega médico, terminologia precisa.' },
    { k: '2', nome: 'Curto e direto', desc: '1–2 frases', inst: 'Bem curta e direta, no máximo 2 frases.' },
    { k: '3', nome: 'Formal / cordial', desc: 'direção, gestão', inst: 'Tom formal, cordial e institucional (direção hospitalar, gestão, Prefeitura, convênio).' },
    { k: '4', nome: 'Para paciente', desc: 'linguagem leiga', inst: 'Linguagem simples e acolhedora para paciente leigo, sem jargão e sem alarmismo.' },
    { k: '5', nome: 'Eu digo o quê…', desc: 'você dá a ideia', inst: null },
  ];

  const TRANSCRICAO = `Transcreva fielmente este áudio de WhatsApp em português do Brasil.
- Texto corrido, com pontuação e parágrafos curtos; sem comentários, sem cabeçalho.
- Preserve termos médicos, nomes de exames, medidas, números, nomes próprios e lateralidade exatamente como falados.
- Remova apenas vícios de fala óbvios ("é...", "né né"), sem alterar o conteúdo.
- Trechos incompreensíveis: [inaudível]. Não invente nada.`;

  const MODOS = [
    { k: '1', nome: 'Médico-técnico', desc: 'para colega médico',
      inst: 'Reescreva para um colega médico, com terminologia médica e radiológica precisa e natural (ex.: "sem sinais de", "aspecto sugestivo de", "achado inespecífico", "a critério clínico", "sugiro correlação clínico-laboratorial", "controle evolutivo"). Diferencie claramente achado de hipótese diagnóstica. Tom cordial, objetivo e profissional, sem rebuscamento.' },
    { k: '2', nome: 'Só corrigir', desc: 'gramática e pontuação',
      inst: 'Corrija apenas ortografia, gramática, acentuação, concordância e pontuação. Não altere estilo nem troque palavras além do estritamente necessário.' },
    { k: '3', nome: 'Mais conciso', desc: 'enxugar',
      inst: 'Deixe mais curto e direto, removendo redundâncias e rodeios, mantendo toda a informação clínica.' },
    { k: '4', nome: 'Formal / cordial', desc: 'direção, gestão, convênio',
      inst: 'Reescreva em tom formal, cordial e institucional, adequado a direção hospitalar, Secretaria de Saúde, regulação ou convênio.' },
    { k: '5', nome: 'Para paciente', desc: 'linguagem leiga',
      inst: 'Reescreva para paciente leigo: linguagem simples e acolhedora, sem jargão, sem alarmismo e sem antecipar diagnóstico que não esteja no texto. Quando pertinente, oriente levar o resultado ao médico solicitante.' },
    { k: '6', nome: 'Instrução livre…', desc: 'você escreve o pedido', inst: null },
  ];

  // =====================================================================
  // 3. ESTILO
  // =====================================================================
  GM_addStyle(`
    #gz-fab{position:fixed;right:22px;bottom:78px;z-index:99999;width:38px;height:38px;border-radius:50%;
      border:none;background:#00a884;color:#fff;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35);opacity:.85}
    #gz-fab:hover{opacity:1}
    #gz-panel,.gz-toast{position:fixed;right:22px;bottom:158px;z-index:100000;width:460px;max-width:calc(100vw - 32px);
      background:#1f2c33;color:#e9edef;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.5);
      font:14px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:12px;box-sizing:border-box}
    .gz-toast{width:auto;max-width:420px;font-size:13px}
    #gz-panel .gz-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600}
    #gz-panel .gz-sub{font-weight:400;font-size:12px;color:#8696a0}
    #gz-panel .gz-x{background:none;border:none;color:#8696a0;font-size:18px;cursor:pointer}
    #gz-panel .gz-modes{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    #gz-panel .gz-m{text-align:left;background:#2a3942;border:1px solid #33444d;color:#e9edef;border-radius:8px;padding:7px 9px;cursor:pointer}
    #gz-panel .gz-m:hover{border-color:#00a884}
    #gz-panel .gz-m b{color:#00a884;margin-right:4px}
    #gz-panel .gz-m small{display:block;color:#8696a0;font-size:11px}
    #gz-panel textarea{width:100%;box-sizing:border-box;min-height:120px;max-height:62vh;resize:vertical;overflow-y:auto;background:#111b21;color:#e9edef;
      border:1px solid #33444d;border-radius:8px;padding:8px;font-size:14px;line-height:1.45;font-family:inherit}
    #gz-panel .gz-orig{font-size:12px;color:#8696a0;max-height:60px;overflow:auto;margin:6px 0;white-space:pre-wrap;border-left:2px solid #33444d;padding-left:8px}
    #gz-panel .gz-row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
    #gz-panel .gz-b{flex:1;background:#2a3942;border:1px solid #33444d;color:#e9edef;border-radius:8px;padding:7px;cursor:pointer;font-size:13px}
    #gz-panel .gz-b.pri{background:#00a884;border-color:#00a884;color:#111b21;font-weight:600}
    #gz-panel .gz-msg{font-size:13px;color:#8696a0;padding:6px 0}
    #gz-panel .gz-err{color:#f15c6d;white-space:pre-wrap}
    #gz-panel .gz-ctx{display:flex;align-items:center;gap:6px;font-size:12px;color:#8696a0;margin-top:8px;cursor:pointer;user-select:none}
    #gz-chip{position:fixed;right:70px;bottom:80px;z-index:99999;background:#1f2c33;color:#e9edef;border:1px solid #00a884;
      border-radius:18px;padding:7px 12px;font:13px -apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}
    #gz-chip:hover{background:#2a3942}
    .gz-tr{display:block;flex-basis:100%;box-sizing:border-box;max-width:min(560px,75%);margin:2px 16px 8px 16px;padding:6px 10px;
      background:rgba(0,168,132,.12);border-left:3px solid #00a884;border-radius:6px;font:13.5px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;
      color:inherit;white-space:pre-wrap;user-select:text}
    .gz-tr.out{margin-left:auto}
    .gz-tr .gz-tr-h{font-size:11.5px;opacity:.75;margin-bottom:3px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .gz-tr button{background:none;border:none;color:#00a884;cursor:pointer;font-size:12px;padding:0;text-decoration:underline}
    .gz-tr .gz-tr-sum{margin-top:6px;padding-top:6px;border-top:1px dashed rgba(134,150,160,.5)}
    .gz-tr-btn{display:inline-block;flex-basis:100%;margin:2px 16px 6px 16px;background:#1f2c33;color:#e9edef;border:1px solid #00a884;
      border-radius:14px;padding:3px 10px;font:12px -apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;width:max-content}
    .gz-tr-btn.out{margin-left:auto}
  `);

  // =====================================================================
  // 4. UTILITÁRIOS
  // =====================================================================
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = t => (t || '').replace(/\p{Extended_Pictographic}|️|‍/gu, '').replace(/\s+/g, ' ').trim();

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'text') e.textContent = v;
      else if (k === 'cls') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    kids.flat().forEach(c => c != null && e.append(c));
    e.setAttribute('translate', 'no'); e.classList.add('notranslate');
    return e;
  }

  function getComposer() {
    const ae = document.activeElement;
    if (ae && ae.isContentEditable && ae.closest('footer')) return ae;
    return document.querySelector('#main footer [contenteditable="true"]');
  }

  function getKey() {
    let k = GM_getValue('gemini_key', '');
    if (!k) {
      k = (prompt('Cole sua chave da API Gemini (fica salva só neste navegador):') || '').trim();
      if (k) GM_setValue('gemini_key', k);
    }
    return k;
  }
  GM_registerMenuCommand('Definir/alterar chave Gemini', () => {
    const k = (prompt('Nova chave da API Gemini:', '') || '').trim();
    if (k) { GM_setValue('gemini_key', k); alert('Chave salva.'); }
  });

  function toast(t, ms = 2600) {
    if (!document.body) return;
    const d = el('div', { cls: 'gz-toast', text: t });
    document.body.append(d);
    setTimeout(() => d.remove(), ms);
  }

  function copy(t) { navigator.clipboard.writeText(t).then(() => toast('Copiado.'), () => toast('Não consegui copiar.')); }

  // =====================================================================
  // 5. CONTEXTO DA CONVERSA (últimas N mensagens)
  // =====================================================================
  function msgRows() {
    return [...document.querySelectorAll('#main [data-id]')].filter(r => !r.parentElement.closest('[data-id]'));
  }

  function getContext(n = N_CONTEXTO) {
    const linhas = [];
    for (const r of msgRows().slice(-n)) {
      const id = r.getAttribute('data-id') || '';
      const out = id.startsWith('true_');
      let who = out ? 'Eu (Dr. Gaspar)' : 'Interlocutor';
      const pre = r.querySelector('[data-pre-plain-text]');
      if (pre && !out) {
        const m = (pre.getAttribute('data-pre-plain-text') || '').match(/\]\s*([^:]+):/);
        if (m) who = m[1].trim();
      }
      let txt = '';
      const a = audios.get(id);
      if (a && a.transcript) txt = '[áudio transcrito] ' + a.transcript;
      else {
        const t = r.querySelector('.selectable-text') || pre;
        txt = t ? (t.innerText || '').trim() : '';
        if (!txt) txt = r.querySelector('audio, [data-icon*="ptt"], [data-icon*="audio"], [aria-label*="eproduzir"], [aria-label*="lay"]') ? '[áudio sem transcrição]' : '[mídia]';
      }
      if (txt.length > 600) txt = txt.slice(0, 600) + '…';
      linhas.push(`${who}: ${txt}`);
    }
    return linhas.join('\n');
  }

  // =====================================================================
  // 6. CAPTURA DO RASCUNHO E SUBSTITUIÇÃO
  // O editor do WhatsApp só "enxerga" a seleção alguns milissegundos depois;
  // por isso selecionamos, esperamos, colamos e conferimos o resultado.
  // =====================================================================
  let ctx = null; // {comp, range, scope, text, contexto}

  function capture() {
    const comp = getComposer();
    if (!comp) return null;
    const sel = window.getSelection();
    let c;
    if (sel.rangeCount && !sel.isCollapsed && comp.contains(sel.anchorNode) && comp.contains(sel.focusNode)) {
      c = { comp, range: sel.getRangeAt(0).cloneRange(), scope: 'sel', text: sel.toString().trim() };
    } else {
      c = { comp, range: null, scope: 'all', text: (comp.innerText || '').trim() };
    }
    try { c.contexto = getContext(); } catch (_) { c.contexto = ''; }
    return c;
  }

  function pasteInto(comp, text) {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    comp.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }

  async function replaceText(c, newText) {
    const comp = c.comp && c.comp.isConnected ? c.comp : getComposer();
    if (!comp) { copy(newText); return false; }
    const sel = window.getSelection();
    const selectAll = () => { const r = document.createRange(); r.selectNodeContents(comp); sel.removeAllRanges(); sel.addRange(r); };
    const partial = c.scope === 'sel' && c.range && c.range.startContainer.isConnected && c.range.endContainer.isConnected;
    const alvo = norm(newText);
    const ok = () => partial ? norm(comp.innerText).includes(alvo) : norm(comp.innerText) === alvo;

    comp.focus(); await sleep(40);
    if (partial) { sel.removeAllRanges(); sel.addRange(c.range); } else selectAll();
    await sleep(90);
    pasteInto(comp, newText);
    await sleep(180);
    if (ok()) return true;

    if (!partial) {
      // tentativa 2: apaga tudo e cola de novo
      selectAll(); await sleep(90);
      document.execCommand('delete'); await sleep(90);
      pasteInto(comp, newText); await sleep(180);
      if (ok()) return true;
      // tentativa 3: digitação simulada
      selectAll(); await sleep(90);
      document.execCommand('insertText', false, newText); await sleep(180);
      if (ok()) return true;
      selectAll();
    } else {
      sel.removeAllRanges(); sel.addRange(c.range);
    }
    // plano B seguro: deixa selecionado e copiado
    try { await navigator.clipboard.writeText(newText); } catch (_) {}
    toast('Não consegui trocar sozinho. O texto novo foi copiado e o trecho está selecionado: aperte Ctrl+V (Mac: Cmd+V).', 7000);
    return false;
  }

  // =====================================================================
  // 7. GEMINI
  // =====================================================================
  function gemini(system, parts, cb, i = 0) {
    const key = getKey();
    if (!key) return cb('Sem chave Gemini configurada.');
    const model = MODELS[i];
    const next = () => gemini(system, parts, cb, i + 1);
    GM_xmlhttpRequest({
      method: 'POST',
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      timeout: 90000,
      data: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2 },
      }),
      onload: r => {
        if (r.status >= 200 && r.status < 300) {
          try {
            const j = JSON.parse(r.responseText);
            const out = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
            return out ? cb(null, out, model) : cb('Resposta vazia do modelo.');
          } catch (e) { return cb('Falha ao ler resposta: ' + e.message); }
        }
        if (i + 1 < MODELS.length && [404, 429, 500, 503].includes(r.status)) return next();
        let msg = '';
        try { msg = JSON.parse(r.responseText).error.message; } catch (_) { msg = (r.responseText || '').slice(0, 200); }
        cb(`Erro ${r.status} (${model}): ${msg}`);
      },
      onerror: () => (i + 1 < MODELS.length ? next() : cb('Falha de rede.')),
      ontimeout: () => (i + 1 < MODELS.length ? next() : cb('Tempo esgotado.')),
    });
  }

  function rewrite(c, inst, usarCtx, cb) {
    let prompt = kbBlock();
    if (usarCtx && c.contexto) prompt += `CONTEXTO (últimas mensagens da conversa, da mais antiga para a mais recente):\n${c.contexto}\n\n`;
    prompt += `INSTRUÇÃO: ${inst}\n\nRASCUNHO A REESCREVER:\n<<<\n${c.text}\n>>>`;
    gemini(BASE, [{ text: prompt }], (err, out, model) => {
      if (err) return cb(err);
      out = out.replace(/^<<<\s*|\s*>>>$/g, '').replace(/^["“](.*)["”]$/s, '$1').trim();
      cb(null, out, model);
    });
  }

  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  // =====================================================================
  // 8. TRANSCRIÇÃO — botão e texto dentro do próprio balão do áudio
  // =====================================================================
  function rowOf(id) {
    try { return document.querySelector(`#main [data-id="${CSS.escape(id)}"]`); } catch (_) { return null; }
  }

  function decorate(id) {
    const a = audios.get(id);
    const row = a && rowOf(id);
    if (!row) return;
    const out = id.startsWith('true_');
    let box = row.querySelector(':scope > .gz-tr, :scope > .gz-tr-btn');
    const want = a.transcript ? 'tr' : 'btn';
    if (box && box.dataset.kind === want && box.dataset.v === String(a.v || 0)) return;
    if (box) box.remove();

    if (!a.transcript) {
      box = el('button', { cls: 'gz-tr-btn' + (out ? ' out' : ''), text: a.busy ? '⏳ Transcrevendo…' : '📝 Transcrever este áudio' });
      box.dataset.kind = 'btn'; box.dataset.v = String(a.v || 0);
      box.addEventListener('mousedown', e => e.preventDefault());
      box.addEventListener('click', e => { e.stopPropagation(); transcribe(id); });
    } else {
      box = el('div', { cls: 'gz-tr' + (out ? ' out' : '') },
        el('div', { cls: 'gz-tr-h' },
          el('span', { text: '📝 Transcrição' }),
          el('button', { text: 'Copiar', onclick: e => { e.stopPropagation(); copy(a.transcript); } }),
          el('button', { text: 'Responder', onclick: e => { e.stopPropagation(); ctx = capture(); openReply(a.transcript); } }),
          el('button', { text: a.summary ? (a.showSum ? 'Ocultar resumo' : 'Ver resumo') : (a.busy ? 'Resumindo…' : 'Resumir'), onclick: e => { e.stopPropagation(); toggleSummary(id); } })),
        el('div', { text: a.transcript }),
        a.summary && a.showSum ? el('div', { cls: 'gz-tr-sum', text: a.summary }) : null);
      box.dataset.kind = 'tr'; box.dataset.v = String(a.v || 0);
    }
    row.append(box);
  }

  function decorateAll() { for (const id of audios.keys()) decorate(id); }
  function bump(id) { const a = audios.get(id); if (a) { a.v = (a.v || 0) + 1; decorate(id); } }

  async function transcribe(id = lastAudioId) {
    const a = id && audios.get(id);
    if (!a) return toast('Dê play no áudio que você quer transcrever (pode pausar logo) e clique em "📝 Transcrever este áudio" embaixo dele.', 6000);
    if (a.busy) return;
    if (a.transcript) {
      const row = rowOf(id);
      if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' }); else showTranscriptPanel(a);
      return;
    }
    a.busy = true; bump(id);
    let b64;
    try { b64 = await blobToBase64(a.blob); } catch (e) { a.busy = false; bump(id); return toast('Não consegui ler o áudio: ' + e.message, 5000); }
    const mime = (a.blob.type || 'audio/ogg').split(';')[0];
    gemini(TRANSCRICAO, [{ text: 'Transcreva o áudio.' }, { inline_data: { mime_type: mime, data: b64 } }], (err, out, model) => {
      a.busy = false;
      if (err) { bump(id); return toast(err, 7000); }
      a.transcript = out; a.model = model;
      bump(id);
      if (!rowOf(id)) showTranscriptPanel(a); // áudio sem balão identificado
    });
  }

  function toggleSummary(id) {
    const a = audios.get(id);
    if (!a || a.busy) return;
    if (a.summary) { a.showSum = !a.showSum; bump(id); return; }
    a.busy = true; bump(id);
    rewrite({ text: a.transcript, contexto: '' },
      'Resuma em até 5 tópicos curtos (iniciados por "• "): o que a pessoa pede ou informa, dados clínicos relevantes, prazos e o que precisa ser respondido. Sem introdução.',
      false, (err, out) => {
        a.busy = false;
        if (err) { bump(id); return toast(err, 7000); }
        a.summary = out; a.showSum = true; bump(id);
      });
  }

  function showTranscriptPanel(a) {
    stage = 'result';
    const ta = el('textarea'); ta.value = a.transcript || '';
    shell('· transcrição do último áudio', ta,
      el('div', { cls: 'gz-row' },
        el('button', { cls: 'gz-b pri', text: 'Copiar', onclick: () => copy(ta.value) })));
  }

  function showAudioChip() {
    if (!document.body) return;
    let c = document.getElementById('gz-chip');
    if (!c) {
      c = el('div', { id: 'gz-chip', title: 'Transcreve o último áudio tocado (Alt+T)' });
      c.addEventListener('mousedown', e => e.preventDefault());
      c.addEventListener('click', () => { c.remove(); transcribe(); });
      document.body.append(c);
    }
    c.textContent = '🎙️ Transcrever o áudio que está tocando (Alt+T)';
    clearTimeout(showAudioChip._t);
    showAudioChip._t = setTimeout(() => c.remove(), 15000);
  }

  // =====================================================================
  // 9. PAINEL DE REESCRITA
  // =====================================================================
  let panel = null, stage = 'closed';

  function close() { if (panel) panel.remove(); panel = null; stage = 'closed'; }

  function shell(sub, ...body) {
    if (panel) panel.remove();
    panel = el('div', { id: 'gz-panel' },
      el('div', { cls: 'gz-h' },
        el('span', {}, '✨ Reescrever ', el('span', { cls: 'gz-sub', text: sub })),
        el('button', { cls: 'gz-x', text: '×', title: 'Fechar (Esc)', onclick: close })),
      ...body);
    panel.addEventListener('keydown', e => e.stopPropagation());
    document.body.append(panel); placePanel();
  }

  const usarCtx = () => GM_getValue('use_ctx', true);

  function outsideSelection() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return '';
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (!node || !node.closest('#main') || node.closest('footer') || node.closest('#gz-panel')) return '';
    return sel.toString().trim();
  }

  function openMenu() {
    const quote = outsideSelection();
    ctx = capture();
    if (!ctx) return toast('Abra uma conversa primeiro.');
    if (quote) return openReply(quote);
    if (!ctx.text) return openReply('');
    stage = 'menu';
    const nCtx = ctx.contexto ? ctx.contexto.split('\n').length : 0;
    const cb = el('input', { type: 'checkbox' });
    cb.checked = usarCtx();
    cb.addEventListener('change', () => GM_setValue('use_ctx', cb.checked));
    shell(ctx.scope === 'sel' ? '· trecho selecionado' : '· mensagem inteira',
      el('div', { cls: 'gz-modes' },
        MODOS.map(m => el('button', { cls: 'gz-m', onmousedown: e => e.preventDefault(), onclick: () => choose(m) },
          el('b', { text: m.k }), m.nome, el('small', { text: m.desc })))),
      el('label', { cls: 'gz-ctx' }, cb, `Usar contexto da conversa (${nCtx} últimas mensagens) — tecla C`),
      el('div', { cls: 'gz-row' }, el('button', { cls: 'gz-b', text: '💬 Sugerir resposta nova (tecla S)', onmousedown: e => e.preventDefault(), onclick: () => openReply('') })),
      el('div', { cls: 'gz-msg', text: 'Teclas 1–6 · Esc fecha · nada é enviado sem você apertar Enter no WhatsApp' }));
  }

  // ---------- RESPONDER: sugere resposta a partir da conversa (com áudios transcritos) ----------
  let rctx = null; // {comp ctx, quote, draft}

  function openReply(quote) {
    if (!ctx) ctx = capture();
    if (!ctx) return toast('Abra uma conversa primeiro.');
    const prevNote = rctx && rctx.quote === (quote || '') ? rctx.note : '';
    rctx = { c: ctx, quote: quote || '', draft: ctx.text || '', note: prevNote || '' };
    stage = 'rmenu';
    try { loadKb(); } catch (_) {}
    const nota = el('textarea', { placeholder: 'Contexto para a IA (opcional): o que você quer dizer, fatos que só você sabe, decisão tomada… Ex.: "já falei com a direção; equipamento só para urgência; priorizar extremidades".' });
    nota.value = rctx.note; nota.style.minHeight = '58px'; nota.style.marginBottom = '6px';
    nota.addEventListener('input', () => { rctx.note = nota.value; });
    const n = (getContext(N_CONVERSA) || '').split('\n').filter(Boolean).length;
    const nAud = [...audios.values()].filter(a => a.transcript).length;
    const sub = quote ? '· responder ao trecho selecionado' : '· sugerir resposta à conversa';
    shell(sub,
      quote ? el('div', { cls: 'gz-orig', text: quote }) : null,
      nota,
      el('div', { cls: 'gz-modes' },
        TONS.map(t => el('button', { cls: 'gz-m', onmousedown: e => e.preventDefault(), onclick: () => chooseTone(t) },
          el('b', { text: t.k }), t.nome, el('small', { text: t.desc })))),
      el('div', { cls: 'gz-msg', text: `Lê as últimas ${n} mensagens${nAud ? ` + áudios transcritos` : ''}${rctx.draft ? ' e usa seu rascunho como base' : ''}. Áudio só entra se tiver sido transcrito (📝).` }),
      el('div', { cls: 'gz-msg', text: 'Escreva o contexto (opcional) e escolha o tom · teclas 1–5 fora do campo · Esc fecha · nada é enviado sozinho' }));
    panel.querySelector('.gz-h span').firstChild.textContent = '💬 Responder ';
  }

  function chooseTone(t) {
    if (t.inst) return runReply(t.inst, t.nome, (rctx.note || '').trim());
    stage = 'rfree';
    const ta = el('textarea', { placeholder: 'Ex.: confirmar que vou reforçar com a direção que o portátil é só para urgência; agradecer o retorno' });
    ta.value = rctx.note || '';
    ta.style.minHeight = '70px';
    const go = () => { const v = ta.value.trim(); if (!v) return; runReply('Tom técnico e cordial.', 'Sua ideia', v); };
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } });
    shell('· o que você quer responder', ta,
      el('div', { cls: 'gz-row' },
        el('button', { cls: 'gz-b', text: 'Voltar', onclick: () => openReply(rctx.quote) }),
        el('button', { cls: 'gz-b pri', text: 'Gerar (Ctrl+Enter)', onclick: go })));
    panel.querySelector('.gz-h span').firstChild.textContent = '💬 Responder ';
    ta.focus();
  }

  function runReply(tom, nome, ideia) {
    const r = rctx;
    stage = 'loading';
    shell(`· ${nome}`, el('div', { cls: 'gz-msg', text: 'Lendo a conversa e preparando a resposta…' }));
    panel.querySelector('.gz-h span').firstChild.textContent = '💬 Responder ';
    let prompt = kbBlock() + `CONVERSA (da mais antiga para a mais recente; "Eu (Dr. Gaspar)" sou eu):\n${getContext(N_CONVERSA) || '(sem mensagens visíveis)'}\n\n`;
    if (r.quote) prompt += `RESPONDA PRINCIPALMENTE A ESTE TRECHO:\n<<<\n${r.quote}\n>>>\n\n`;
    else prompt += 'TAREFA: escreva minha próxima mensagem, respondendo ao que o interlocutor disse/perguntou mais recentemente e ainda não foi respondido por mim.\n\n';
    if (r.draft) prompt += `MEU RASCUNHO (use como base do conteúdo):\n<<<\n${r.draft}\n>>>\n\n`;
    if (ideia) prompt += `O QUE EU QUERO DIZER: ${ideia}\n\n`;
    prompt += `TOM: ${tom}`;
    gemini(RESP_BASE, [{ text: prompt }], (err, out, model) => {
      if (stage === 'closed') return;
      if (err) {
        stage = 'error';
        return shell(`· ${nome}`, el('div', { cls: 'gz-msg gz-err', text: err }),
          el('div', { cls: 'gz-row' },
            el('button', { cls: 'gz-b', text: 'Voltar', onclick: () => openReply(r.quote) }),
            el('button', { cls: 'gz-b pri', text: 'Tentar de novo', onclick: () => runReply(tom, nome, ideia) })));
      }
      out = out.replace(/^<<<\s*|\s*>>>$/g, '').replace(/^["“](.*)["”]$/s, '$1').trim();
      stage = 'result';
      const ta = el('textarea'); ta.value = out;
      const apply = async () => { const txt = ta.value; close(); await replaceText(r.c, txt); };
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); apply(); } });
      shell(`· ${nome} · ${model}`,
        r.quote ? el('div', { cls: 'gz-orig', text: r.quote }) : null,
        ta,
        el('div', { cls: 'gz-msg', text: 'Revise os [colchetes] antes de enviar.' }),
        orientRow(v => { r.note = [ideia, v].filter(Boolean).join(' | '); runReply(tom, nome, r.note); }),
        el('div', { cls: 'gz-row' },
          el('button', { cls: 'gz-b', text: 'Voltar', onclick: () => openReply(r.quote) }),
          el('button', { cls: 'gz-b', text: 'Refazer', onclick: () => runReply(tom, nome, ideia) }),
          el('button', { cls: 'gz-b', text: 'Copiar', onclick: () => copy(ta.value) }),
          el('button', { cls: 'gz-b pri', text: (r.draft ? 'Substituir' : 'Inserir') + ' (Ctrl+Enter)', onclick: apply })));
      panel.querySelector('.gz-h span').firstChild.textContent = '💬 Responder ';
      ta.focus();
    });
  }

  function choose(m) {
    if (m.inst) return run(m.inst, m.nome);
    stage = 'free';
    const ta = el('textarea', { placeholder: 'Ex.: responda à última mensagem agradecendo e dizendo que o laudo sai hoje à tarde, tom técnico' });
    ta.value = GM_getValue('last_free', '');
    ta.style.minHeight = '70px';
    const go = () => { const v = ta.value.trim(); if (!v) return; GM_setValue('last_free', v); run(v, 'Livre'); };
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } });
    shell('· instrução livre', ta,
      el('div', { cls: 'gz-row' },
        el('button', { cls: 'gz-b', text: 'Voltar', onclick: backToMenu }),
        el('button', { cls: 'gz-b pri', text: 'Reescrever (Ctrl+Enter)', onclick: go })));
    ta.focus();
  }

  function backToMenu() { const keep = ctx; openMenu(); if (!ctx || !ctx.text) { ctx = keep; } }

  function run(inst, nome) {
    stage = 'loading';
    const comCtx = usarCtx() && !!ctx.contexto;
    shell(`· ${nome}`, el('div', { cls: 'gz-msg', text: comCtx ? 'Lendo a conversa e reescrevendo…' : 'Reescrevendo…' }));
    const myCtx = ctx;
    rewrite(myCtx, inst, comCtx, (err, out, model) => {
      if (stage === 'closed') return;
      if (err) {
        stage = 'error';
        return shell(`· ${nome}`, el('div', { cls: 'gz-msg gz-err', text: err }),
          el('div', { cls: 'gz-row' },
            el('button', { cls: 'gz-b', text: 'Voltar', onclick: backToMenu }),
            el('button', { cls: 'gz-b pri', text: 'Tentar de novo', onclick: () => run(inst, nome) })));
      }
      stage = 'result';
      const ta = el('textarea');
      ta.value = out;
      const apply = async () => { const txt = ta.value; close(); await replaceText(myCtx, txt); };
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); apply(); } });
      shell(`· ${nome}${comCtx ? ' · com contexto' : ''} · ${model}`,
        el('div', { cls: 'gz-orig', text: myCtx.text }),
        ta,
        orientRow(v => run(inst + ' Orientação adicional do Dr. Gaspar: ' + v, nome)),
        el('div', { cls: 'gz-row' },
          el('button', { cls: 'gz-b', text: 'Voltar', onclick: backToMenu }),
          el('button', { cls: 'gz-b', text: 'Refazer', onclick: () => run(inst, nome) }),
          el('button', { cls: 'gz-b', text: 'Copiar', onclick: () => copy(ta.value) }),
          el('button', { cls: 'gz-b pri', text: 'Substituir (Ctrl+Enter)', onclick: apply })));
      ta.focus();
    });
  }

  // =====================================================================
  // 10. ATALHOS E BOTÃO
  // =====================================================================
  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR') {
      e.preventDefault(); e.stopPropagation();
      return stage === 'closed' ? openMenu() : close();
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyT') {
      e.preventDefault(); e.stopPropagation();
      return transcribe();
    }
    if (stage === 'closed') return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return close(); }
    if (e.target && e.target.closest && e.target.closest('#gz-panel') && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (stage === 'rmenu' && /^[1-5]$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); return chooseTone(TONS[+e.key - 1]); }
    if (stage === 'menu' && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopPropagation(); return openReply(''); }
    if (stage === 'menu') {
      if (/^[1-6]$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); return choose(MODOS[+e.key - 1]); }
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault(); e.stopPropagation();
        const cb = panel && panel.querySelector('.gz-ctx input');
        if (cb) { cb.checked = !cb.checked; GM_setValue('use_ctx', cb.checked); }
      }
    }
  }, true);

  function ensureFab() {
    if (document.getElementById('gz-fab') || !document.body) return;
    const b = el('button', { id: 'gz-fab', text: '✨', title: 'Reescrever mensagem (Alt+R · Mac: Option+R)' });
    b.addEventListener('mousedown', e => e.preventDefault()); // mantém a seleção do texto
    b.addEventListener('click', () => { if (b.dataset.moved) return; stage === 'closed' ? openMenu() : close(); });
    b.title += ' · arraste para mover';
    document.body.append(b);
    const p = GM_getValue('fab_pos', null);
    if (p) Object.assign(b.style, { left: Math.max(0, Math.min(innerWidth - 40, p.x)) + 'px', top: Math.max(0, Math.min(innerHeight - 40, p.y)) + 'px', right: 'auto', bottom: 'auto' });
    makeDraggable(b, 'fab_pos');
  }

  setInterval(() => {
    ensureFab();
    const fab = document.getElementById('gz-fab');
    if (fab) fab.style.display = document.querySelector('#main footer') && !GM_getValue('hide_fab', false) ? '' : 'none';
    decorateAll(); // a lista de mensagens é redesenhada ao rolar; recoloca botões/transcrições
  }, 1200);

  // =====================================================================
  // 11. LAYOUT, LIMPEZA, FIXADOS EXTRAS E PRIVACIDADE  (v1.4)
  //   Alt+S ajustes · Alt+B ocultar/mostrar barra · Alt+P privacidade
  // =====================================================================
  const UI_DEF = {
    layoutOn: true, sideW: 340, sideZoom: 100, sideHidden: false,
    headZoom: 100, headMain: false, hideTitle: false, railZoom: 100,
    railHide: ['chamadas', 'ligações', 'calls', 'status', 'canais', 'channels', 'comunidades', 'communities', 'anunciar', 'advertise'],
    hiddenSel: [], fixTop: true, privacy: false, pins: [], hideBt: true,
  };
  let ui = Object.assign({}, UI_DEF, GM_getValue('ui_cfg', {}));
  const saveUi = () => GM_setValue('ui_cfg', ui);
  const comp = {}; // compensação de zoom por alvo
  const IS_TOP = window.top === window;

  GM_addStyle(`
    #gz-pinsec{flex:0 0 auto;max-height:45%;overflow:auto;border-bottom:1px solid rgba(134,150,160,.25)}
    #gz-pinsec .gz-pinhead{display:flex;align-items:center;gap:4px;padding:3px 12px;font:11.5px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#8696a0}
    #gz-pinsec .gz-sp{flex:1}
    #gz-pinsec .gz-act{background:none;border:none;color:#8696a0;cursor:pointer;font-size:13px;padding:1px 4px}
    #gz-pinsec .gz-act:hover{color:#00a884}
    #gz-pinsec .gz-prow{position:relative;cursor:pointer;overflow:hidden}
    #gz-pinsec .gz-prow:hover{background:rgba(134,150,160,.12)}
    #gz-pinsec .gz-prow.active{background:rgba(134,150,160,.22)}
    #gz-pinsec .gz-prow.ph{display:flex;align-items:center;gap:12px;height:64px;padding:0 14px;font:15px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:inherit}
    #gz-pinsec .gz-av{width:44px;height:44px;border-radius:50%;background:#2a3942;color:#e9edef;display:flex;align-items:center;justify-content:center;font-weight:600;flex:0 0 auto}
    #gz-pinsec .gz-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #gz-rowpin{position:fixed;z-index:99997;width:24px;height:24px;border-radius:50%;border:1px solid rgba(134,150,160,.5);background:#202c33;
      color:#e9edef;font-size:12px;line-height:22px;text-align:center;padding:0;cursor:pointer;opacity:.85;display:none;filter:grayscale(1)}
    #gz-rowpin:hover{opacity:1;filter:none;border-color:#00a884}
    #gz-rowpin.on{filter:none;border-color:#00a884}
    #gz-gear{position:fixed;right:28px;bottom:124px;z-index:99999;width:26px;height:26px;border-radius:50%;border:none;background:#2a3942;
      color:#8696a0;font-size:14px;cursor:pointer;opacity:.75;box-shadow:0 1px 4px rgba(0,0,0,.35)}
    #gz-gear:hover{opacity:1;color:#00a884}
    #gz-handle{position:fixed;z-index:99998;width:7px;cursor:ew-resize;background:transparent}
    #gz-handle:hover,#gz-handle.drag{background:rgba(0,168,132,.55)}
    #gz-showside{position:fixed;left:0;top:45%;z-index:99999;background:#00a884;color:#111b21;border:none;border-radius:0 8px 8px 0;
      padding:10px 5px;cursor:pointer;font-weight:700;opacity:.75}
    #gz-showside:hover{opacity:1}
    #gz-pick{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #f15c6d;background:rgba(241,92,109,.15);box-sizing:border-box}
    #gz-pick::after{content:attr(data-info);position:absolute;left:0;top:-22px;background:#f15c6d;color:#fff;font:12px Arial;padding:2px 6px;border-radius:4px;white-space:nowrap}
    #gz-panel.gz-wide{max-height:82vh;overflow:auto}
    #gz-panel .gz-sec{margin:12px 0 5px;font-weight:600;color:#00a884;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em}
    #gz-panel .gz-line{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:13px}
    #gz-panel .gz-line input[type=range]{flex:1;accent-color:#00a884}
    #gz-panel .gz-k{width:92px;color:#8696a0}
    #gz-panel .gz-v{width:52px;text-align:right}
    #gz-panel .gz-chk{display:flex;align-items:center;gap:7px;font-size:13px;margin:3px 0;cursor:pointer}
    #gz-panel .gz-chk input{accent-color:#00a884}
    #gz-panel .gz-grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
    #gz-panel .gz-item{display:flex;justify-content:space-between;align-items:center;gap:6px;background:#2a3942;border-radius:6px;padding:4px 8px;
      font-size:12px;margin:3px 0;word-break:break-all}
    #gz-panel .gz-item button{background:none;border:none;color:#f15c6d;cursor:pointer;font-size:13px;flex:0 0 auto}
    #gz-panel .gz-note{font-size:11.5px;color:#8696a0;margin:2px 0}
  `);

  const uiStyle = document.createElement('style');
  uiStyle.id = 'gz-ui-style';
  (document.head || document.documentElement).append(uiStyle);

  // sincroniza ajustes entre abas/molduras
  if (typeof GM_addValueChangeListener === 'function') {
    GM_addValueChangeListener('ui_cfg', (k, o, n, remote) => {
      if (remote && n) { ui = Object.assign({}, UI_DEF, n); renderUiCss(); try { applyRail(); renderPinSec(true); } catch (_) {} }
    });
  }

  // ---------- localizar as áreas do WhatsApp ----------
  function findPane() {
    const side = document.getElementById('side');
    if (!side) return null;
    const tagged = document.querySelector('[data-gz-side]');
    if (tagged && tagged.contains(side)) return tagged;
    if (tagged) tagged.removeAttribute('data-gz-side');
    let p = null;
    try { p = document.querySelector('div.two > div:has(> #side)'); } catch (_) {}
    if (!p) {
      p = side;
      while (p.parentElement && p.parentElement !== document.body) {
        const w = p.getBoundingClientRect().width, pw = p.parentElement.getBoundingClientRect().width;
        if (w > 0 && pw - w > 150) break;
        p = p.parentElement;
      }
    }
    if (!p || p.id === 'app' || p === document.body) return null;
    if (!p.contains(document.getElementById('pane-side')) || p.contains(document.getElementById('main'))) return null;
    p.setAttribute('data-gz-side', '');
    return p;
  }

  const RAIL_KEYS = '[aria-label="Configurações"],[aria-label="Settings"],[aria-label="Conversas"],[aria-label="Chats"]';
  function findSideHead() {
    let best = null;
    for (const h of document.querySelectorAll('header[data-testid="chatlist-header"], [data-gz-head]')) {
      if (h.querySelector(RAIL_KEYS)) continue;                       // é o menu lateral de ícones, não o cabeçalho
      if (!h.querySelector('[data-testid="drawer-title-body"], [data-testid="wa-wordmark"], h1, h2')) continue;
      const r = h.getBoundingClientRect();
      if (r.left < 30 && r.height > 300) continue;
      if (!best || best.contains(h)) best = h;                        // o mais interno
    }
    for (const h of document.querySelectorAll('[data-gz-head]')) if (h !== best) h.removeAttribute('data-gz-head');
    if (!best) return null;
    best.setAttribute('data-gz-head', '');
    const t = best.querySelector('[data-testid="drawer-title-body"]') || best.querySelector('[data-testid="wa-wordmark"]');
    if (t) t.setAttribute('data-gz-title', '');
    return best;
  }

  function findRail() {
    const side0 = document.getElementById('side');
    for (const h of document.querySelectorAll('header')) {
      if (side0 && h.contains(side0)) continue;
      if (h.querySelector('[aria-label="Conversas"],[aria-label="Chats"]') && h.querySelector('[aria-label="Configurações"],[aria-label="Settings"]')) {
        for (const o of document.querySelectorAll('[data-gz-rail]')) if (o !== h) o.removeAttribute('data-gz-rail');
        h.setAttribute('data-gz-rail', '');
        return h;
      }
    }
    const ex = document.querySelector('[data-gz-rail]');
    if (ex && ex.isConnected) {
      if (ex.getBoundingClientRect().width < 160) return ex;
      ex.removeAttribute('data-gz-rail');
    }
    const pane = findPane();
    for (const b of document.querySelectorAll('#app button[aria-label], #app [role="button"][aria-label]')) {
      if (b.closest('#main, #side, [data-gz-side], [data-gz-hidden]')) continue;
      const r = b.getBoundingClientRect();
      if (!(r.width > 15 && r.width < 100 && r.left < 100)) continue;
      let e = b;
      while (e.parentElement && e.parentElement !== document.body && !e.parentElement.contains(pane || document.getElementById('side'))
             && e.parentElement.getBoundingClientRect().width < 130) e = e.parentElement;
      const er = e.getBoundingClientRect();
      if (er.height > innerHeight * 0.5 && er.width < 130 && er.left < 30) { e.setAttribute('data-gz-rail', ''); return e; }
    }
    return null;
  }

  function checkComp(key, elx, dim) {
    if (!elx || !elx.parentElement) return;
    const pr = elx.parentElement.getBoundingClientRect()[dim];
    if (pr < 30) return;
    const ratio = elx.getBoundingClientRect()[dim] / pr;
    if (!comp[key] && ratio < 0.95) { comp[key] = true; renderUiCss(); }
    else if (comp[key] && ratio > 1.05) { comp[key] = false; renderUiCss(); }
  }

  function renderUiCss() {
    const z = ui.sideZoom / 100, hz = ui.headZoom / 100, rz = ui.railZoom / 100;
    const pct = f => (100 / f).toFixed(3) + '%';
    let css = '[data-gz-hidden]{display:none !important;}';
    if (ui.layoutOn) {
      const w = ui.sideW;
      css += `[data-gz-side]{flex:0 0 ${w}px !important;width:${w}px !important;min-width:${w}px !important;max-width:${w}px !important;}`;
      if (z !== 1) css += `#side{zoom:${z};}` + (comp.side ? `#side{width:${pct(z)} !important;height:${pct(z)} !important;}` : '');
      if (hz !== 1) {
        css += `[data-gz-head]{zoom:${hz};}` + (comp.head ? `[data-gz-head]{width:${pct(hz)} !important;}` : '');
        if (ui.headMain) css += `#main > header, header[data-testid="conversation-header"]{zoom:${hz};}` + (comp.mainhead ? `#main > header, header[data-testid="conversation-header"]{width:${pct(hz)} !important;}` : '');
      }
      if (rz !== 1) css += `[data-gz-rail]{zoom:${rz};}` + (comp.rail ? `[data-gz-rail]{height:${pct(rz)} !important;}` : '');
    }
    if (ui.hideBt) css += '#top-header{display:none !important;} div.two{padding-top:0 !important;} #maintenance-popup{top:0 !important;}';
    if (ui.hideTitle) css += '[data-gz-title],[data-testid="wa-wordmark"]{display:none !important;}';
    if (ui.sideHidden) css += '[data-gz-side]{display:none !important;}';
    for (const s of ui.hiddenSel) css += `${s}:not([id^="gz-"]):not([id^="gz-"] *){display:none !important;}\n`;
    if (ui.privacy) {
      css += `#pane-side [role="listitem"]:not(:hover),#pane-side [role="row"]:not(:hover),#gz-pinsec .gz-prow:not(:hover),
        #main [data-id]:not(:hover),#main header:not(:hover) span,#main header:not(:hover) img{filter:blur(6px) !important;transition:filter .1s}`;
    }
    uiStyle.textContent = css;
  }

  function zoomChecks() {
    if (!ui.layoutOn || ui.sideHidden) return;
    if (ui.sideZoom !== 100) { const s = document.getElementById('side'); if (s && s.parentElement) checkComp('side', s, 'width'); }
    if (ui.headZoom !== 100) {
      checkComp('head', findSideHead(), 'width');
      if (ui.headMain) checkComp('mainhead', document.querySelector('header[data-testid="conversation-header"], #main > header'), 'width');
    }
    if (ui.railZoom !== 100) checkComp('rail', findRail(), 'height');
  }

  // ---------- alça de largura / ocultar barra ----------
  let handle = null, dragging = false;
  function placeHandle() {
    if (!document.body || !IS_TOP && !document.getElementById('side')) { if (handle) handle.style.display = 'none'; }
    if (!document.body) return;
    if (!handle) {
      handle = el('div', { id: 'gz-handle', title: 'Arraste para ajustar a largura · duplo clique = padrão' });
      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        const pane = findPane();
        if (!pane) return;
        const left = pane.getBoundingClientRect().left;
        dragging = true; handle.classList.add('drag'); document.body.style.cursor = 'ew-resize';
        const mv = ev => {
          ui.sideW = Math.max(200, Math.min(Math.round(innerWidth * 0.75), Math.round(ev.clientX - left)));
          renderUiCss(); placeHandle();
        };
        const up = () => {
          document.removeEventListener('mousemove', mv, true); document.removeEventListener('mouseup', up, true);
          dragging = false; handle.classList.remove('drag'); document.body.style.cursor = ''; saveUi();
        };
        document.addEventListener('mousemove', mv, true); document.addEventListener('mouseup', up, true);
      });
      handle.addEventListener('dblclick', () => { ui.sideW = 340; saveUi(); renderUiCss(); });
      document.body.append(handle);
    }
    const pane = findPane();
    if (!(ui.layoutOn && !ui.sideHidden && pane)) { handle.style.display = 'none'; return; }
    const r = pane.getBoundingClientRect();
    if (r.width < 50) { handle.style.display = 'none'; return; }
    Object.assign(handle.style, { display: '', left: (r.right - 4) + 'px', top: r.top + 'px', height: r.height + 'px' });
  }

  function toggleSide(force) {
    ui.sideHidden = typeof force === 'boolean' ? force : !ui.sideHidden;
    saveUi(); renderUiCss(); placeHandle(); updateFloating();
    toast(ui.sideHidden ? 'Barra de conversas oculta (Alt+B ou » para mostrar).' : 'Barra de conversas visível.', 1800);
  }

  function updateFloating() {
    if (!document.body) return;
    const hasWA = !!document.getElementById('side');
    const railOk = placeRailbar();
    let b = document.getElementById('gz-showside');
    if (ui.sideHidden && hasWA && !railOk) {
      if (!b) {
        b = el('button', { id: 'gz-showside', text: '»', title: 'Mostrar conversas (Alt+B)' });
        b.addEventListener('click', () => toggleSide(false));
        document.body.append(b);
      }
    } else if (b) b.remove();
    let g = document.getElementById('gz-gear');
    if (railOk && g) { g.remove(); g = null; }
    if (hasWA && !railOk && !g) {
      g = el('button', { id: 'gz-gear', text: '⚙', title: 'Ajustes do WhatsApp (Alt+S)' });
      g.addEventListener('click', () => (stage === 'settings' ? close() : openSettings()));
      document.body.append(g);
    } else if ((!hasWA || railOk) && g) g.remove();
  }

  // ---------- atalhos próprios no menu lateral esquerdo ----------
  GM_addStyle(`
    #gz-railbar{position:fixed;z-index:99996;display:flex;flex-direction:column;gap:6px;align-items:center}
    #gz-railbar button{border:none;border-radius:50%;background:transparent;color:#aebac1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
    #gz-railbar button:hover{background:rgba(134,150,160,.18);color:#e9edef}
    #gz-railbar button.on{color:#00a884;background:rgba(0,168,132,.15)}
    #gz-railbar .sep{width:60%;height:1px;background:rgba(134,150,160,.3);margin:2px 0}
    #gz-railbar svg{width:58%;height:58%}
  `);
  const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    resp: SVG('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>'),
    side: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/>'),
    priv: SVG('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
    pin: SVG('<path d="M12 17v5"/><path d="M9 3h6l-1 6 4 4H6l4-4z"/>'),
    agenda: SVG('<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>'),
    cfg: SVG('<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="7" cy="18" r="2" fill="currentColor"/>'),
  };

  function placeRailbar() {
    const rail = findRail();
    let bar = document.getElementById('gz-railbar');
    if (!rail || !document.getElementById('side')) { if (bar) bar.style.display = 'none'; return false; }
    if (!bar) {
      bar = el('div', { id: 'gz-railbar' });
      const mk = (id, title, fn) => {
        const b = el('button', { id, title });
        b.innerHTML = ICON[id.replace('gz-rb-', '')];
        b.addEventListener('mousedown', e => e.preventDefault()); // mantém seleção de texto
        b.addEventListener('click', e => { e.stopPropagation(); fn(); });
        return b;
      };
      bar.append(
        mk('gz-rb-resp', 'Reescrever / Responder (Alt+R)', () => (stage === 'closed' ? openMenu() : close())),
        mk('gz-rb-agenda', 'Agenda · Lembretes · Apagadas', () => (stage === 'agenda' ? close() : openAgenda())),
        mk('gz-rb-pin', 'Fixar/desafixar a conversa aberta', () => { const n = currentChatName(); n ? togglePin(n) : toast('Abra uma conversa.'); }),
        mk('gz-rb-priv', 'Privacidade: desfocar (Alt+P)', () => { ui.privacy = !ui.privacy; saveUi(); renderUiCss(); placeRailbar(); toast(ui.privacy ? '🔒 Privacidade ligada.' : 'Privacidade desligada.', 1500); }),
        mk('gz-rb-side', 'Ocultar/mostrar conversas (Alt+B)', () => toggleSide()),
        el('div', { cls: 'sep' }),
        mk('gz-rb-cfg', 'Ajustes (Alt+S)', () => (stage === 'settings' ? close() : openSettings())));
      document.body.append(bar);
    }
    const rz = ui.layoutOn ? ui.railZoom / 100 : 1;
    const sz = Math.round(36 * rz);
    for (const b of bar.querySelectorAll('button')) { b.style.width = sz + 'px'; b.style.height = sz + 'px'; }
    bar.querySelector('#gz-rb-priv').classList.toggle('on', !!ui.privacy);
    bar.querySelector('#gz-rb-side').classList.toggle('on', !!ui.sideHidden);
    const n = currentChatName();
    bar.querySelector('#gz-rb-pin').classList.toggle('on', !!n && ui.pins.includes(n));
    const r = rail.getBoundingClientRect();
    let lowTop = r.bottom - 8;
    for (const b of rail.querySelectorAll('button, [role="button"]')) {
      const br = b.getBoundingClientRect();
      if (br.height > 0 && br.top > r.top + r.height * 0.5) lowTop = Math.min(lowTop, br.top);
    }
    bar.style.display = 'flex';
    bar.style.left = Math.round(r.left + r.width / 2 - sz / 2) + 'px';
    bar.style.top = Math.max(r.top + r.height * 0.3, lowTop - bar.offsetHeight - 12) + 'px';
    return true;
  }

  // ---------- botões do menu lateral ----------
  const railSeen = new Map();
  const lab = b => (b.getAttribute('aria-label') || b.getAttribute('title') || '').trim();
  const railMatch = l => { const s = l.toLowerCase(); return ui.railHide.some(k => s === k || s.includes(k)); };

  function wrapOf(b) {
    let e = b;
    while (e.parentElement && e.parentElement.children.length === 1 && !e.parentElement.matches('header,nav,#app,[data-gz-rail]')) {
      if (e.parentElement.getBoundingClientRect().width > 110) break;
      e = e.parentElement;
    }
    return e;
  }

  function applyRail() {
    const cands = document.querySelectorAll('#app button[aria-label], #app [role="button"][aria-label], #app [role="button"][title], #app a[aria-label]');
    for (const b of cands) {
      if (b.closest('#main, #side, [data-gz-hidden], [id^="gz-"]')) continue;
      const r = b.getBoundingClientRect();
      if (!(r.width > 10 && r.width < 100 && r.left < 100)) continue;
      const l = lab(b);
      if (!l) continue;
      railSeen.set(l, b);
      if (railMatch(l)) { const w = wrapOf(b); w.setAttribute('data-gz-hidden', ''); w.setAttribute('data-gz-label', l); }
    }
    for (const h of document.querySelectorAll('[data-gz-hidden][data-gz-label]')) {
      const l = h.getAttribute('data-gz-label');
      railSeen.set(l, h);
      if (!railMatch(l)) { h.removeAttribute('data-gz-hidden'); h.removeAttribute('data-gz-label'); }
    }
  }

  function setRailHidden(label, hide) {
    const s = label.toLowerCase();
    if (hide) { if (!railMatch(label)) ui.railHide.push(s); }
    else ui.railHide = ui.railHide.filter(k => !(s === k || s.includes(k)));
    saveUi(); applyRail();
  }

  // ---------- fixados extras com aparência nativa ----------
  function currentChatName() {
    const h = document.querySelector('#main header');
    if (!h) return '';
    const s = h.querySelector('span[dir="auto"][title]') || h.querySelector('span[title]') || h.querySelector('span[dir="auto"]');
    return s ? (s.getAttribute('title') || s.textContent || '').trim() : '';
  }
  const rowName = row => { const s = row.querySelector('span[title]'); return s ? s.getAttribute('title').trim() : ''; };
  const ROWS = '#pane-side [role="listitem"], #pane-side [role="row"]';

  function clickRow(row) {
    const o = { bubbles: true, cancelable: true, view: window };
    row.dispatchEvent(new MouseEvent('mousedown', o));
    row.dispatchEvent(new MouseEvent('mouseup', o));
    row.dispatchEvent(new MouseEvent('click', o));
  }

  function findChatRow(name) {
    for (const s of document.querySelectorAll('#pane-side span[title]')) {
      if (s.getAttribute('title').trim() === name)
        return s.closest('[role="listitem"],[role="row"],[role="gridcell"]') || s;
    }
    return null;
  }

  function setSearch(box, v) {
    box.focus();
    if (box.isContentEditable) {
      document.execCommand('selectAll');
      if (v) document.execCommand('insertText', false, v); else document.execCommand('delete');
    } else {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(box, v);
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function openChat(name) {
    if (currentChatName() === name) return;
    let row = findChatRow(name);
    if (row) return clickRow(row);
    const box = document.querySelector('#side [contenteditable="true"], #side input[type="text"], #side input[role="textbox"], #side input');
    if (!box) return toast('Não achei o campo de pesquisa do WhatsApp.');
    setSearch(box, name);
    for (let i = 0; i < 20 && !row; i++) { await sleep(200); row = findChatRow(name); }
    if (!row) { toast(`Não encontrei "${name}". O nome do contato pode ter mudado.`, 4000); return; }
    clickRow(row);
    await sleep(400);
    setSearch(box, '');
    if (document.activeElement === box) box.blur();
  }

  function togglePin(name) {
    if (!name) return;
    if (ui.pins.includes(name)) { ui.pins = ui.pins.filter(p => p !== name); toast(`"${name}" desafixada.`, 1500); }
    else { ui.pins.push(name); toast(`📌 "${name}" fixada no topo.`, 1500); }
    saveUi(); cacheRows(); renderPinSec(true);
    if (rowPin) rowPin.style.display = 'none';
  }
  function pinCurrent() {
    const n = currentChatName();
    if (!n) return toast('Abra a conversa que você quer fixar.');
    if (!ui.pins.includes(n)) togglePin(n); else toast('Já está fixada.');
  }

  // cópia fiel das linhas (mesmo visual do WhatsApp), atualizada sempre que a conversa aparece na lista
  const rowCache = new Map();
  let cacheVer = 0, pinSig = '';
  function cacheRows() {
    if (!ui.pins.length) return;
    for (const row of document.querySelectorAll(ROWS)) {
      const n = rowName(row);
      if (!n || !ui.pins.includes(n)) continue;
      const h = row.innerHTML;
      if (rowCache.get(n) !== h) { rowCache.set(n, h); cacheVer++; }
    }
  }

  function renderPinSec(force) {
    const ps = document.getElementById('pane-side');
    let sec = document.getElementById('gz-pinsec');
    if (!ps || !ps.parentElement || !ui.pins.length) { if (sec) sec.remove(); pinSig = ''; return; }
    const active = currentChatName();
    const sig = JSON.stringify(ui.pins) + '|' + active + '|' + cacheVer;
    if (!force && sec && sec.nextElementSibling === ps && sig === pinSig) return;
    pinSig = sig;
    const scroll = sec ? sec.scrollTop : 0;
    if (!sec) sec = el('div', { id: 'gz-pinsec' });
    if (sec.nextElementSibling !== ps) ps.parentElement.insertBefore(sec, ps);
    sec.textContent = '';
    sec.append(el('div', { cls: 'gz-pinhead' },
      el('span', { text: `📌 Fixadas extras (${ui.pins.length})` }), el('span', { cls: 'gz-sp' }),
      el('button', { cls: 'gz-act', text: '⇤', title: 'Ocultar barra (Alt+B)', onclick: () => toggleSide(true) })));
    for (const n of ui.pins) {
      const row = el('div', { cls: 'gz-prow' + (n === active ? ' active' : '') });
      row.dataset.gzName = n;
      const h = rowCache.get(n);
      if (h) {
        row.innerHTML = h;
        row.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
        row.querySelectorAll('[tabindex]').forEach(x => x.removeAttribute('tabindex'));
      } else {
        row.classList.add('ph');
        row.append(el('div', { cls: 'gz-av', text: ((n.match(/[\p{L}\p{N}]/u) || ['?'])[0]).toUpperCase() }), el('div', { cls: 'gz-nm', text: n }));
      }
      row.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openChat(n); }, true);
      row.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); }, true);
      sec.append(row);
    }
    sec.scrollTop = scroll;
  }

  // alfinete que aparece ao passar o mouse em qualquer conversa
  let rowPin = null, rowPinName = '';
  function ensureRowPin() {
    if (rowPin || !document.body) return;
    rowPin = el('button', { id: 'gz-rowpin' });
    rowPin.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    rowPin.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); togglePin(rowPinName); });
    document.body.append(rowPin);
  }
  document.addEventListener('mouseover', e => {
    if (picking) return;
    const t = e.target;
    if (!t || !t.closest || t.closest('#gz-rowpin')) return;
    const row = t.closest('#pane-side [role="listitem"], #pane-side [role="row"], #gz-pinsec .gz-prow');
    if (!row) { if (rowPin && !t.closest('#pane-side, #gz-pinsec')) rowPin.style.display = 'none'; return; }
    const name = row.dataset.gzName || rowName(row);
    if (!name) return;
    ensureRowPin();
    rowPinName = name;
    const r = row.getBoundingClientRect();
    const on = ui.pins.includes(name);
    rowPin.textContent = '📌';
    rowPin.classList.toggle('on', on);
    rowPin.title = on ? 'Desafixar do topo' : 'Fixar no topo (sem limite de 3)';
    Object.assign(rowPin.style, { display: 'block', left: (r.right - 32) + 'px', top: (r.top + r.height / 2 - 12) + 'px' });
  }, true);
  document.addEventListener('scroll', () => { if (rowPin) rowPin.style.display = 'none'; }, true);

  // ---------- seletor manual de elementos ----------
  let picking = false, pickTarget = null, pickBox = null;

  function cssPath(node) {
    const parts = [];
    let e = node;
    while (e && e.nodeType === 1 && e !== document.documentElement) {
      if (e === document.body) { parts.unshift('body'); break; }
      if (e.id && /^[A-Za-z][\w-]*$/.test(e.id) && !/\d{4,}/.test(e.id) && !e.id.startsWith('gz-')) { parts.unshift('#' + e.id); break; }
      let s = e.tagName.toLowerCase();
      const cls = [...e.classList].filter(c => /^[A-Za-z][\w-]{2,}$/.test(c) && /[-_]/.test(c) && !/\d{3,}/.test(c)).slice(0, 2);
      if (cls.length) s += '.' + cls.map(c => CSS.escape(c)).join('.');
      else {
        const da = [...e.attributes].find(a => a.name.startsWith('data-') && !a.name.startsWith('data-gz') && a.value && a.value.length < 40 && !/\d{4,}/.test(a.value) && !/["\\]/.test(a.value));
        if (da) s += `[${da.name}="${da.value}"]`;
      }
      const p = e.parentElement;
      if (p) {
        let uniq = false;
        try { uniq = p.querySelectorAll(':scope > ' + s).length === 1; } catch (_) {}
        if (!uniq) {
          const same = [...p.children].filter(c => c.tagName === e.tagName);
          if (same.length > 1) s += `:nth-of-type(${same.indexOf(e) + 1})`;
        }
      }
      parts.unshift(s);
      e = p;
    }
    return parts.join(' > ');
  }

  function drawPick() {
    if (!pickTarget || !pickBox) return;
    const r = pickTarget.getBoundingClientRect();
    Object.assign(pickBox.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    pickBox.dataset.info = `${pickTarget.tagName.toLowerCase()} · ${Math.round(r.width)}×${Math.round(r.height)} · clique = esconder · ↑ bloco maior · Esc sai`;
  }
  function startPicker() {
    close();
    picking = true;
    pickBox = el('div', { id: 'gz-pick' });
    document.body.append(pickBox);
    toast('Passe o mouse sobre o que quer esconder e clique. ↑ seleciona o bloco maior. Esc cancela.', 6000);
  }
  function stopPicker() { picking = false; pickTarget = null; if (pickBox) pickBox.remove(); pickBox = null; }

  document.addEventListener('mouseover', e => {
    if (!picking || !e.target || e.target.closest('.gz-toast, [id^="gz-"]')) return;
    pickTarget = e.target; drawPick();
  }, true);
  for (const t of ['mousedown', 'mouseup', 'pointerdown', 'pointerup']) {
    document.addEventListener(t, e => { if (picking) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } }, true);
  }
  document.addEventListener('click', e => {
    if (!picking) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const t = pickTarget;
    if (!t || t === document.body || t === document.documentElement || t.id === 'app' ||
        t.querySelector('#main, #side') || t.closest('#main footer')) {
      return toast('Esse bloco é grande demais (contém a conversa). Escolha um menor.', 3500);
    }
    const sel = cssPath(t);
    if (!ui.hiddenSel.includes(sel)) ui.hiddenSel.push(sel);
    saveUi(); renderUiCss(); stopPicker();
    toast('Escondido. Para desfazer: Alt+S → Limpeza.', 3500);
  }, true);

  // ---------- remoção automática de barras no topo (Blueticks etc.) ----------
  function bigFrame() {
    let best = null, area = 0;
    for (const f of document.querySelectorAll('iframe')) {
      const r = f.getBoundingClientRect(), a = r.width * r.height;
      if (a > area) { area = a; best = f; }
    }
    return area > innerWidth * innerHeight * 0.4 ? best : null;
  }
  const topAnchor = () => findPane() || document.getElementById('app') || bigFrame();
  const rootAnchor = () => document.getElementById('app') || bigFrame();

  function findTopBars() {
    const anc = topAnchor();
    if (!anc) return [];
    const ancTop = anc.getBoundingClientRect().top;
    const ys = [];
    for (let y = 1; y < Math.min(ancTop, 220); y += 6) ys.push(y);
    const res = new Set();
    for (const y of ys) for (const x of [8, innerWidth * 0.25, innerWidth * 0.5, innerWidth * 0.75, innerWidth - 8]) {
      for (const e of document.elementsFromPoint(x, y)) {
        if (e === document.documentElement || e === document.body || e.closest('[id^="gz-"], .gz-toast')) continue;
        if (e.contains(anc) || anc.contains(e)) continue;
        let t = e;
        while (t.parentElement && t.parentElement !== document.body && !t.parentElement.contains(anc)) t = t.parentElement;
        const r = t.getBoundingClientRect();
        if (r.height > 0 && r.height < 220 && r.bottom <= ancTop + 4 && !t.querySelector('#main, #side')) res.add(t);
      }
    }
    return [...res];
  }

  function autoCleanTop() {
    let n = 0;
    for (let i = 0; i < 3; i++) {
      const bars = findTopBars();
      if (!bars.length) break;
      for (const b of bars) {
        const sel = cssPath(b);
        if (!ui.hiddenSel.includes(sel)) { ui.hiddenSel.push(sel); n++; }
        b.style.setProperty('display', 'none', 'important');
      }
      renderUiCss();
    }
    if (n) { ui.fixTop = true; saveUi(); }
    fixTopGap(true);
    return n;
  }

  function fixTopGap(force) {
    if (!ui.fixTop || (!ui.hiddenSel.length && !force)) return;
    const pane = findPane();
    const root = rootAnchor();
    const app = document.getElementById('app');
    if (pane && app && app.contains(pane) && pane.getBoundingClientRect().top > 2) {
      let e = pane.parentElement;
      while (e && e !== app) {
        const cs = getComputedStyle(e);
        if (parseFloat(cs.paddingTop) > 20) e.style.setProperty('padding-top', '0px', 'important');
        e = e.parentElement;
      }
    }
    if (!root) return;
    const r0 = root.getBoundingClientRect();
    if (r0.top > 2) {
      let e = root;
      while (e) {
        const cs = getComputedStyle(e);
        for (const p of ['margin-top', 'padding-top']) if (parseFloat(cs.getPropertyValue(p)) > 0) e.style.setProperty(p, '0px', 'important');
        if (cs.position !== 'static' && parseFloat(cs.top) > 0) e.style.setProperty('top', '0px', 'important');
        e = e.parentElement;
      }
    }
    const r = root.getBoundingClientRect();
    if (r.top <= 2 && r.height < innerHeight - 4) root.style.setProperty('height', '100vh', 'important');
  }

  // impede que uma exclusão manual esconda botões do próprio script
  function sanitizeSel() {
    let ch = false;
    ui.hiddenSel = ui.hiddenSel.filter(sel => {
      try {
        for (const e of document.querySelectorAll(sel)) if (e.closest('[id^="gz-"]')) { ch = true; return false; }
      } catch (_) { ch = true; return false; }
      return true;
    });
    if (ch) { saveUi(); renderUiCss(); }
  }

  function diagTop() {
    const desc = e => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return {
        tag: e.tagName.toLowerCase(), id: e.id || undefined,
        cls: (typeof e.className === 'string' ? e.className : '').slice(0, 90) || undefined,
        rect: [r.left, r.top, r.width, r.height].map(Math.round),
        pos: s.position, top: s.top, mt: s.marginTop, pt: s.paddingTop, h: s.height, z: s.zIndex,
        tr: s.transform !== 'none' ? s.transform : undefined, shadow: e.shadowRoot ? true : undefined,
      };
    };
    const d = { frame: IS_TOP ? 'top' : 'iframe', vw: innerWidth, vh: innerHeight };
    d.html = desc(document.documentElement); d.body = desc(document.body);
    d.bodyChildren = [...document.body.children].slice(0, 30).map(desc);
    const app = document.getElementById('app');
    d.app = app ? desc(app) : null;
    d.appChain = []; let e = app && app.parentElement; while (e) { d.appChain.push(desc(e)); e = e.parentElement; }
    d.iframes = [...document.querySelectorAll('iframe')].slice(0, 10).map(f => ({ ...desc(f), src: (f.getAttribute('src') || '').slice(0, 80) }));
    d.atTop = [];
    for (const y of [2, 15, 30, 50, 70]) {
      const seen = new Set();
      for (const x of [10, innerWidth / 2, innerWidth - 40]) for (const el2 of document.elementsFromPoint(x, y).slice(0, 6)) {
        if (seen.has(el2)) continue; seen.add(el2); d.atTop.push({ y, x: Math.round(x), ...desc(el2) });
      }
    }
    d.hiddenSel = ui.hiddenSel;
    d.version = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '?';
    d.cfg = Object.assign({}, ui, { pins: ui.pins.length });
    d.tags = {};
    for (const a of ['data-gz-side', 'data-gz-rail', 'data-gz-head', 'data-gz-title']) d.tags[a] = [...document.querySelectorAll('[' + a + ']')].slice(0, 3).map(desc);
    d.hiddenRail = [...document.querySelectorAll('[data-gz-hidden]')].map(h => h.getAttribute('data-gz-label'));
    d.railSeen = [...railSeen.keys()];
    d.side = document.getElementById('side') ? desc(document.getElementById('side')) : null;
    d.main = document.getElementById('main') ? desc(document.getElementById('main')) : null;
    d.sideChain = []; let q = document.getElementById('side'); while (q && q.id !== 'app' && d.sideChain.length < 12) { d.sideChain.push(desc(q)); q = q.parentElement; }
    d.errors = gzErrors.slice();
    d.styleLen = uiStyle.textContent.length;
    return d;
  }

  // comunicação com a moldura de cima (caso o Blueticks coloque o WhatsApp dentro de um iframe)
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object' || !e.data.gzCmd || !e.source) return;
    if (e.data.gzCmd === 'cleanTop') e.source.postMessage({ gzRes: 'cleanTop', v: autoCleanTop() }, e.origin);
    if (e.data.gzCmd === 'diag') e.source.postMessage({ gzRes: 'diag', v: diagTop() }, e.origin);
  });
  function askTop(cmd, fallback) {
    return new Promise(res => {
      if (IS_TOP) return res(fallback);
      const h = e => { if (e.origin === location.origin && e.data && e.data.gzRes === cmd) { window.removeEventListener('message', h); res(e.data.v); } };
      window.addEventListener('message', h);
      try { window.top.postMessage({ gzCmd: cmd }, location.origin); } catch (_) { res(fallback); }
      setTimeout(() => { window.removeEventListener('message', h); res(fallback); }, 1500);
    });
  }

  async function runCleanTop() {
    close();
    const n = autoCleanTop() + (await askTop('cleanTop', 0));
    toast(n ? `Removi ${n} elemento(s) do topo. Para desfazer: Alt+S → Limpeza.`
            : 'Não achei barra para remover. Use "📋 Copiar diagnóstico" e cole na conversa com o Claude.', 6000);
  }
  async function copyDiag() {
    const d = { self: diagTop(), top: await askTop('diag', null) };
    try { await navigator.clipboard.writeText(JSON.stringify(d)); toast('Diagnóstico copiado (só estrutura da tela, sem mensagens). Cole na conversa com o Claude.', 6000); }
    catch (_) { toast('Não consegui copiar. Tente de novo.', 3000); }
  }

  // ---------- painel de ajustes ----------
  function openSettings() {
    const prevScroll = panel && panel.classList.contains('gz-wide') ? panel.scrollTop : 0;
    if (panel) panel.remove();
    stage = 'settings';
    const sec = t => el('div', { cls: 'gz-sec', text: t });
    const chk = (txt, get, set) => {
      const c = el('input', { type: 'checkbox' }); c.checked = get();
      c.addEventListener('change', () => set(c.checked));
      return el('label', { cls: 'gz-chk' }, c, txt);
    };
    const slider = (label, k, min, max, step, unit) => {
      const v = el('span', { cls: 'gz-v', text: ui[k] + unit });
      const r = el('input', { type: 'range', min: String(min), max: String(max), step: String(step) });
      r.value = ui[k];
      r.addEventListener('input', () => { ui[k] = +r.value; v.textContent = ui[k] + unit; renderUiCss(); placeHandle(); });
      r.addEventListener('change', () => { saveUi(); setTimeout(zoomChecks, 50); });
      return el('div', { cls: 'gz-line' }, el('span', { cls: 'gz-k', text: label }), r, v);
    };
    const btn = (t, f, pri) => el('button', { cls: 'gz-b' + (pri ? ' pri' : ''), text: t, onclick: f });
    const preset = (w, z, h, rz) => {
      Object.assign(ui, { sideW: w, sideZoom: z, headZoom: h, railZoom: rz, layoutOn: true, sideHidden: false });
      saveUi(); renderUiCss(); setTimeout(zoomChecks, 50); openSettings();
    };

    applyRail();
    const labels = [...railSeen.keys()].sort((a, b) => a.localeCompare(b));
    const railBox = el('div', { cls: 'gz-grid2' },
      labels.length ? labels.map(l => chk(l, () => railMatch(l), v => setRailHidden(l, v)))
                    : el('div', { cls: 'gz-note', text: 'Nenhum botão encontrado ainda.' }));

    const pinsBox = el('div', {},
      ui.pins.length ? ui.pins.map((p, i) => el('div', { cls: 'gz-item' }, el('span', { text: `${i + 1}. ${p}` }),
        el('span', {},
          i > 0 ? el('button', { text: '↑', title: 'Subir', style: 'color:#8696a0', onclick: () => { [ui.pins[i - 1], ui.pins[i]] = [ui.pins[i], ui.pins[i - 1]]; saveUi(); renderPinSec(true); openSettings(); } }) : null,
          el('button', { text: '×', title: 'Remover', onclick: () => { ui.pins.splice(i, 1); saveUi(); renderPinSec(true); openSettings(); } }))))
        : el('div', { cls: 'gz-note', text: 'Nenhuma. Passe o mouse numa conversa e clique no 📌.' }));

    const selBox = el('div', {},
      ui.hiddenSel.length ? ui.hiddenSel.map((s, i) => el('div', { cls: 'gz-item' }, el('span', { text: s }),
        el('button', { text: 'restaurar', onclick: () => { ui.hiddenSel.splice(i, 1); saveUi(); renderUiCss(); toast('Restaurado. Recarregue a página se não voltar.', 3000); openSettings(); } })))
        : el('div', { cls: 'gz-note', text: 'Nada escondido manualmente.' }));

    panel = el('div', { id: 'gz-panel', cls: 'gz-wide' },
      el('div', { cls: 'gz-h' },
        el('span', {}, '⚙ Ajustes do WhatsApp ', el('span', { cls: 'gz-sub', text: '· Alt+S' })),
        el('button', { cls: 'gz-x', text: '×', title: 'Fechar (Esc)', onclick: close })),

      sec('Tamanho da tela'),
      el('div', { cls: 'gz-row' },
        btn('Compacta', () => preset(270, 85, 70, 80)),
        btn('Média', () => preset(310, 90, 85, 90)),
        btn('Padrão', () => preset(340, 100, 100, 100))),
      chk('Ativar ajustes de largura e zoom', () => ui.layoutOn, v => { ui.layoutOn = v; saveUi(); renderUiCss(); placeHandle(); }),
      slider('Largura barra', 'sideW', 200, 700, 10, ' px'),
      slider('Zoom barra', 'sideZoom', 60, 110, 5, '%'),
      slider('Cabeçalho', 'headZoom', 50, 100, 5, '%'),
      slider('Menu lateral', 'railZoom', 60, 100, 5, '%'),
      chk('Esconder o título "WhatsApp"', () => ui.hideTitle, v => { ui.hideTitle = v; saveUi(); renderUiCss(); }),
      chk('Aplicar o zoom do cabeçalho também no topo da conversa aberta', () => ui.headMain, v => { ui.headMain = v; saveUi(); renderUiCss(); setTimeout(zoomChecks, 50); }),
      el('div', { cls: 'gz-note', text: 'A borda direita da barra também pode ser arrastada (duplo clique = padrão).' }),
      el('div', { cls: 'gz-row' }, btn(ui.sideHidden ? 'Mostrar barra de conversas' : 'Ocultar barra de conversas (Alt+B)', () => { toggleSide(); openSettings(); })),

      sec('Botões do menu lateral (marcado = escondido)'),
      railBox,

      sec('Fixadas extras (sem limite de 3)'),
      pinsBox,
      el('div', { cls: 'gz-row' }, btn('📌 Fixar conversa aberta', () => { pinCurrent(); openSettings(); })),

      sec('Limpeza da tela'),
      chk('Esconder a barra azul do Blueticks no topo', () => ui.hideBt, v => { ui.hideBt = v; saveUi(); renderUiCss(); }),
      el('div', { cls: 'gz-row' }, btn('Aplicar limpeza padrão do menu', () => {
        ui.railHide = UI_DEF.railHide.slice(); ui.hideBt = true; saveUi(); renderUiCss(); applyRail(); openSettings();
      })),
      el('div', { cls: 'gz-row' },
        btn('🔎 Remover barra do topo (Blueticks)', runCleanTop, true),
        btn('🧹 Escolher elemento', startPicker)),
      el('div', { cls: 'gz-row' }, btn('📋 Copiar diagnóstico do topo', copyDiag)),
      selBox,
      chk('Recolher espaço vazio que sobrar no topo', () => ui.fixTop, v => { ui.fixTop = v; saveUi(); }),

      sec('Privacidade'),
      chk('Recuperar mensagens apagadas (só na memória da aba)', () => ui.antiDelete !== false, v => { ui.antiDelete = v; saveUi(); }),
      chk('Desfocar conversas e mensagens (passe o mouse para ver) · Alt+P', () => ui.privacy, v => { ui.privacy = v; saveUi(); renderUiCss(); }),

      sec('Base de referência (protocolos, respostas padrão)'),
      kbSettingsBox(),

      sec('Botões flutuantes'),
      chk('Mostrar o botão flutuante ✨ (o ✦ do menu lateral continua)', () => !GM_getValue('hide_fab', false), v => GM_setValue('hide_fab', !v)),
      el('div', { cls: 'gz-row' }, btn('Voltar ✨ e painéis à posição padrão', () => {
        GM_setValue('fab_pos', null); GM_setValue('panel_pos', null);
        const f = document.getElementById('gz-fab'); if (f) f.remove();
        toast('Posições restauradas.', 1500); openSettings();
      })),
      el('div', { cls: 'gz-note', text: 'Arraste o ✨ para onde quiser. Os painéis se movem arrastando pelo título (duplo clique no título = posição padrão).' }),

      sec('Gemini'),
      el('div', { cls: 'gz-row' }, btn('Alterar chave da API', () => {
        const k = (prompt('Nova chave da API Gemini:', '') || '').trim();
        if (k) { GM_setValue('gemini_key', k); toast('Chave salva.'); }
      })),
      el('div', { cls: 'gz-note', text: 'Atalhos: Alt+R reescrever · Alt+T transcrever · Alt+B barra · Alt+P privacidade · Alt+S ajustes (Mac: Option).' }));
    panel.addEventListener('keydown', e => e.stopPropagation());
    document.body.append(panel); placePanel();
    panel.scrollTop = prevScroll;
  }

  GM_registerMenuCommand('Ajustes (Alt+S)', () => openSettings());
  GM_registerMenuCommand('Remover barra do topo (Blueticks)', () => runCleanTop());
  GM_registerMenuCommand('Copiar diagnóstico', () => copyDiag());
  GM_registerMenuCommand('Modo seguro: desligar ajustes de tamanho', () => {
    ui.layoutOn = false; ui.sideHidden = false; saveUi(); renderUiCss();
    toast('Ajustes de tamanho desligados. Recarregue a página.', 4000);
  });
  GM_registerMenuCommand('Restaurar tudo que foi escondido', () => {
    ui.hiddenSel = []; ui.railHide = []; ui.sideHidden = false; saveUi(); renderUiCss(); applyRail(); updateFloating();
    toast('Tudo restaurado. Recarregue a página para concluir.', 4000);
  });

  // ---------- atalhos ----------
  document.addEventListener('keydown', e => {
    if (picking) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stopPicker(); toast('Seleção cancelada.', 1500); }
      else if (e.key === 'ArrowUp' && pickTarget && pickTarget.parentElement && pickTarget.parentElement !== document.body) {
        e.preventDefault(); e.stopPropagation(); pickTarget = pickTarget.parentElement; drawPick();
      }
      return;
    }
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyB') { e.preventDefault(); e.stopPropagation(); toggleSide(); }
    else if (e.code === 'KeyP') {
      e.preventDefault(); e.stopPropagation();
      ui.privacy = !ui.privacy; saveUi(); renderUiCss(); toast(ui.privacy ? '🔒 Privacidade ligada.' : 'Privacidade desligada.', 1500);
    }
    else if (e.code === 'KeyS') { e.preventDefault(); e.stopPropagation(); stage === 'settings' ? close() : openSettings(); }
  }, true);

  // ---------- ciclo ----------
  const gzErrors = [];
  const safe = (nome, f) => { try { return f(); } catch (e) { if (gzErrors.length < 30) gzErrors.push(nome + ': ' + (e && e.message)); } };
  safe('render', renderUiCss);
  setInterval(() => {
    if (!document.body) return;
    safe('pane', findPane); safe('head', findSideHead); safe('rail', findRail);
    if (!dragging) safe('handle', placeHandle);
    safe('zoom', zoomChecks);
    safe('railHide', applyRail);
    safe('cache', cacheRows);
    safe('pins', () => renderPinSec());
    safe('sanitize', sanitizeSel);
    safe('floating', updateFloating);
    safe('topgap', () => fixTopGap());
  }, 800);
  window.addEventListener('resize', () => placeHandle());


  // =====================================================================
  // 12. AGENDA (Outlook/Google via ICS), EVENTOS, LEMBRETES E APAGADAS  (v1.6)
  // =====================================================================
  GM_addStyle(`
    #gz-panel .gz-tabs{display:flex;gap:4px;margin-bottom:8px}
    #gz-panel .gz-tab{flex:1;background:#2a3942;border:1px solid #33444d;color:#aebac1;border-radius:8px;padding:5px;cursor:pointer;font-size:12.5px}
    #gz-panel .gz-tab.on{border-color:#00a884;color:#e9edef}
    #gz-panel .gz-day{margin:10px 0 4px;font-size:12px;font-weight:600;color:#00a884;text-transform:capitalize}
    #gz-panel .gz-ev{display:flex;gap:8px;padding:5px 8px;border-radius:6px;background:#202c33;margin:3px 0;font-size:13px}
    #gz-panel .gz-ev.now{outline:1px solid #00a884}
    #gz-panel .gz-ev .t{flex:0 0 86px;color:#8696a0;font-variant-numeric:tabular-nums}
    #gz-panel .gz-ev .d{flex:1;min-width:0}
    #gz-panel .gz-ev .d small{display:block;color:#8696a0}
    #gz-panel .gz-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}
    #gz-panel .gz-form{display:grid;grid-template-columns:92px 1fr;gap:6px 8px;align-items:center;font-size:13px}
    #gz-panel .gz-form input,#gz-panel .gz-form select,#gz-panel .gz-in{background:#111b21;color:#e9edef;border:1px solid #33444d;border-radius:6px;padding:5px 7px;font:inherit;font-size:13px;width:100%;box-sizing:border-box;color-scheme:dark}
    #gz-panel .gz-del-i{background:#202c33;border-radius:6px;padding:6px 8px;margin:4px 0;font-size:13px}
    #gz-panel .gz-del-i small{color:#8696a0;display:block;margin-bottom:2px}
    .gz-rem{position:fixed;top:16px;right:16px;z-index:100001;width:340px;background:#1f2c33;color:#e9edef;border:1px solid #00a884;border-radius:12px;
      padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.5);font:14px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif}
    .gz-rem .gz-row{display:flex;gap:6px;margin-top:8px}
    .gz-rem button{flex:1;background:#2a3942;border:1px solid #33444d;color:#e9edef;border-radius:8px;padding:6px;cursor:pointer;font-size:12.5px}
    .gz-rem button.pri{background:#00a884;color:#111b21;border-color:#00a884;font-weight:600}
    .gz-del{border-left-color:#f15c6d !important;background:rgba(241,92,109,.10) !important}
  `);
  if (ui.antiDelete === undefined) ui.antiDelete = true;

  const pad2 = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const hm = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const COLORS = ['#00a884', '#53bdeb', '#ffb703', '#f15c6d', '#a78bfa', '#06d6a0'];

  // ---------- fontes de calendário (links ICS ficam fora do diagnóstico) ----------
  const getSources = () => GM_getValue('cal_sources', []);
  const setSources = v => GM_setValue('cal_sources', v);

  function icsDate(v) {
    const m = String(v).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
    if (!m) return new Date(NaN);
    const [, Y, M, D, h = '0', mi = '0', s = '0', z] = m;
    return z ? new Date(Date.UTC(+Y, +M - 1, +D, +h, +mi, +s)) : new Date(+Y, +M - 1, +D, +h, +mi, +s);
  }
  const unesc = s => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');

  function icsParse(txt) {
    const lines = txt.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const evs = []; let cur = null;
    for (const ln of lines) {
      if (ln === 'BEGIN:VEVENT') { cur = { exdates: [] }; continue; }
      if (ln === 'END:VEVENT') { if (cur && cur.start && !isNaN(cur.start)) evs.push(cur); cur = null; continue; }
      if (!cur) continue;
      const i = ln.indexOf(':'); if (i < 0) continue;
      const left = ln.slice(0, i), val = ln.slice(i + 1);
      const name = left.split(';')[0];
      if (name === 'DTSTART') { cur.start = icsDate(val); cur.allDay = /VALUE=DATE(?!-)/.test(left) || /^\d{8}$/.test(val); }
      else if (name === 'DTEND') cur.end = icsDate(val);
      else if (name === 'SUMMARY') cur.title = unesc(val);
      else if (name === 'LOCATION') cur.loc = unesc(val);
      else if (name === 'RRULE') cur.rrule = Object.fromEntries(val.split(';').map(x => x.split('=')));
      else if (name === 'EXDATE') val.split(',').forEach(v => cur.exdates.push(icsDate(v).getTime()));
      else if (name === 'RECURRENCE-ID') cur.recId = icsDate(val).getTime();
      else if (name === 'UID') cur.uid = val;
      else if (name === 'STATUS') cur.status = val;
    }
    return evs;
  }

  function expandEvents(evs, from, to) {
    const out = [];
    const overrides = new Set(evs.filter(e => e.recId).map(e => e.uid + '|' + e.recId));
    const sow = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()).getTime();
    const push = (e, t, dur) => { if (t < to && t + dur > from) out.push({ title: e.title || '(sem título)', loc: e.loc, allDay: e.allDay, start: new Date(t), end: new Date(t + dur), src: e.src }); };
    for (const e of evs) {
      if (e.status === 'CANCELLED') continue;
      const dur = e.end && !isNaN(e.end) ? e.end - e.start : (e.allDay ? 864e5 : 36e5);
      if (e.recId || !e.rrule) { push(e, e.start.getTime(), dur); continue; }
      const r = e.rrule, iv = +(r.INTERVAL || 1), until = r.UNTIL ? icsDate(r.UNTIL) : null, count = r.COUNT ? +r.COUNT : Infinity;
      const days = r.BYDAY && r.FREQ === 'WEEKLY' ? r.BYDAY.split(',').map(x => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(x.slice(-2))) : null;
      const d = new Date(e.start); let n = 0, guard = 0;
      while (guard++ < 20000) {
        if ((until && d > until) || n >= count || d >= to) break;
        let ok = true;
        if (days) ok = days.includes(d.getDay()) && Math.round((sow(d) - sow(e.start)) / 6048e5) % iv === 0;
        if (ok) {
          n++;
          const t = d.getTime();
          if (!e.exdates.includes(t) && !overrides.has(e.uid + '|' + t)) push(e, t, dur);
        }
        if (r.FREQ === 'DAILY') d.setDate(d.getDate() + iv);
        else if (r.FREQ === 'WEEKLY') d.setDate(d.getDate() + (days ? 1 : 7 * iv));
        else if (r.FREQ === 'MONTHLY') d.setMonth(d.getMonth() + iv);
        else if (r.FREQ === 'YEARLY') d.setFullYear(d.getFullYear() + iv);
        else break;
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  let calCache = { at: 0, events: [], errors: [] };
  function fetchIcs(url) {
    return new Promise(res => {
      GM_xmlhttpRequest({
        method: 'GET', url: url.replace(/^webcal:\/\//i, 'https://'), timeout: 30000,
        onload: r => res(r.status >= 200 && r.status < 300 && /BEGIN:VCALENDAR/.test(r.responseText) ? { ok: true, txt: r.responseText } : { ok: false, err: 'HTTP ' + r.status }),
        onerror: () => res({ ok: false, err: 'falha de rede' }), ontimeout: () => res({ ok: false, err: 'tempo esgotado' }),
      });
    });
  }
  async function loadCalendars(force) {
    if (!force && Date.now() - calCache.at < 10 * 60e3) return calCache;
    const srcs = getSources();
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 8 * 864e5);
    const events = [], errors = [];
    await Promise.all(srcs.map(async (s, i) => {
      const r = await fetchIcs(s.url);
      if (!r.ok) { errors.push(`${s.name}: ${r.err}`); return; }
      const evs = icsParse(r.txt); evs.forEach(e => (e.src = i));
      events.push(...expandEvents(evs, from.getTime(), to.getTime()));
    }));
    events.sort((a, b) => a.start - b.start);
    calCache = { at: Date.now(), events, errors };
    return calCache;
  }

  // ---------- lembretes locais (silenciosos) ----------
  const getRem = () => GM_getValue('reminders', []);
  const setRem = v => GM_setValue('reminders', v);
  function addReminder(at, text, chat) {
    const l = getRem(); l.push({ id: Date.now() + '' + Math.random().toString(36).slice(2, 6), at, text, chat, fired: false });
    setRem(l.sort((a, b) => a.at - b.at));
  }
  function checkReminders() {
    const l = getRem(); let ch = false;
    for (const r of l) {
      if (!r.fired && r.at <= Date.now()) { r.fired = true; ch = true; showReminder(r); }
    }
    const keep = l.filter(r => !r.fired || Date.now() - r.at < 864e5);
    if (ch || keep.length !== l.length) setRem(keep);
  }
  function showReminder(r) {
    if (!document.body) return;
    const box = el('div', { cls: 'gz-rem' },
      el('div', { style: 'font-weight:600;margin-bottom:4px', text: '⏰ Lembrete · ' + hm(new Date(r.at)) }),
      el('div', { text: r.text }),
      r.chat ? el('div', { style: 'color:#8696a0;font-size:12px;margin-top:2px', text: 'Conversa: ' + r.chat }) : null,
      el('div', { cls: 'gz-row' },
        r.chat ? el('button', { cls: 'pri', text: 'Abrir conversa', onclick: () => { openChat(r.chat); box.remove(); } }) : null,
        el('button', { text: 'Adiar 10 min', onclick: () => { addReminder(Date.now() + 10 * 60e3, r.text, r.chat); box.remove(); } }),
        el('button', { text: 'OK', onclick: () => box.remove() })));
    document.body.append(box);
  }

  // ---------- mensagens apagadas (cache só na memória da aba) ----------
  const msgCache = new Map();
  const prevCache = new Map();
  const deletedLog = [];
  const DEL_RE = /(esta mensagem foi apagada|mensagem apagada|você apagou esta mensagem|this message was deleted|you deleted this message)/i;
  function logDeleted(item) {
    if (deletedLog.some(d => d.chat === item.chat && d.text === item.text)) return;
    deletedLog.unshift(item); if (deletedLog.length > 100) deletedLog.pop();
  }
  function whoOf(r) {
    const id = r.getAttribute('data-id') || '';
    if (id.startsWith('true_')) return 'Eu';
    const pre = r.querySelector('[data-pre-plain-text]');
    const m = pre && (pre.getAttribute('data-pre-plain-text') || '').match(/\]\s*([^:]+):/);
    return m ? m[1].trim() : '';
  }
  function scanMessages() {
    if (!ui.antiDelete) return;
    const chat = currentChatName();
    for (const r of msgRows()) {
      const id = r.getAttribute('data-id'); if (!id) continue;
      const t = r.querySelector('.selectable-text');
      const isDel = !!r.querySelector('[data-icon="recalled"], [data-icon*="revoked"]') || (!t && DEL_RE.test((r.innerText || '').slice(0, 160)));
      if (!isDel) {
        const txt = t ? (t.innerText || '').trim() : '';
        if (txt && (!msgCache.has(id) || msgCache.get(id).text !== txt)) msgCache.set(id, { text: txt, who: whoOf(r), chat, at: Date.now() });
      } else {
        const c = msgCache.get(id);
        if (c && !r.querySelector(':scope > .gz-del')) {
          r.append(el('div', { cls: 'gz-tr gz-del' + (id.startsWith('true_') ? ' out' : '') },
            el('div', { cls: 'gz-tr-h' }, el('span', { text: '🗑️ Mensagem apagada — texto original' })),
            el('div', { text: c.text })));
          logDeleted({ chat: c.chat, who: c.who, text: c.text, at: Date.now() });
        }
      }
    }
    if (msgCache.size > 4000) { const k = [...msgCache.keys()].slice(0, 1000); k.forEach(x => msgCache.delete(x)); }
    for (const row of document.querySelectorAll(ROWS)) {
      const sp = [...row.querySelectorAll('span[title]')];
      if (sp.length < 2) continue;
      const name = sp[0].getAttribute('title').trim();
      const pv = sp[sp.length - 1].getAttribute('title').trim();
      if (!pv || pv === name) continue;
      if (DEL_RE.test(pv)) {
        const old = prevCache.get(name);
        if (old && !DEL_RE.test(old)) { logDeleted({ chat: name, who: '', text: old, at: Date.now(), preview: true }); prevCache.set(name, pv); }
      } else prevCache.set(name, pv);
    }
  }

  // ---------- painel Agenda / Lembretes / Apagadas ----------
  let agTab = 'agenda', agQuote = '';
  function openAgenda(tab) {
    if (tab) agTab = tab;
    const q = outsideSelection(); if (q) agQuote = q;
    if (panel) panel.remove();
    stage = 'agenda';
    const tabs = el('div', { cls: 'gz-tabs' },
      [['agenda', '📅 Agenda'], ['rem', '⏰ Lembretes'], ['del', '🗑️ Apagadas']].map(([k, t]) =>
        el('button', { cls: 'gz-tab' + (agTab === k ? ' on' : ''), text: t, onmousedown: e => e.preventDefault(), onclick: () => openAgenda(k) })));
    const body = el('div', {});
    panel = el('div', { id: 'gz-panel', cls: 'gz-wide' },
      el('div', { cls: 'gz-h' },
        el('span', {}, '📅 Agenda ', el('span', { cls: 'gz-sub', text: '· Outlook + Google' })),
        el('button', { cls: 'gz-x', text: '×', title: 'Fechar (Esc)', onclick: close })),
      tabs, body);
    panel.addEventListener('keydown', e => e.stopPropagation());
    document.body.append(panel); placePanel();
    if (agTab === 'agenda') renderAgendaTab(body);
    else if (agTab === 'rem') renderRemTab(body);
    else renderDelTab(body);
  }

  async function renderAgendaTab(body, force) {
    const srcs = getSources();
    body.textContent = '';
    body.append(el('div', { cls: 'gz-row' },
      el('button', { cls: 'gz-b pri', text: '＋ Evento a partir da conversa', onmousedown: e => e.preventDefault(), onclick: () => eventFromChat(agQuote) }),
      el('button', { cls: 'gz-b', text: '↻ Atualizar', onclick: () => renderAgendaTab(body, true) })));
    if (agQuote) body.append(el('div', { cls: 'gz-note', text: 'Usando o trecho selecionado: "' + agQuote.slice(0, 80) + (agQuote.length > 80 ? '…' : '') + '"' }));
    if (!srcs.length) {
      body.append(el('div', { cls: 'gz-note', style: 'margin-top:10px', text: 'Nenhum calendário conectado. Adicione abaixo o link ICS do Outlook e/ou do Google.' }));
      body.append(calSourcesBox(body));
      return;
    }
    const wait = el('div', { cls: 'gz-msg', text: 'Carregando calendários…' });
    body.append(wait);
    const c = await loadCalendars(force);
    wait.remove();
    for (const er of c.errors) body.append(el('div', { cls: 'gz-msg gz-err', text: '⚠️ ' + er }));
    const now = Date.now();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d0 = new Date(today.getTime() + i * 864e5), d1 = new Date(d0.getTime() + 864e5);
      const evs = c.events.filter(e => e.start < d1 && e.end > d0);
      const lbl = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d0.toLocaleDateString('pt-BR', { weekday: 'long' });
      body.append(el('div', { cls: 'gz-day', text: `${lbl} · ${d0.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` }));
      if (!evs.length) { body.append(el('div', { cls: 'gz-note', text: 'Livre' })); continue; }
      for (const e of evs) {
        const s = srcs[e.src] || {};
        body.append(el('div', { cls: 'gz-ev' + (e.start <= now && e.end > now ? ' now' : '') },
          el('span', { cls: 't', text: e.allDay ? 'dia todo' : `${hm(e.start)}–${hm(e.end)}` }),
          el('span', { cls: 'd' },
            el('span', { cls: 'gz-dot', style: 'background:' + COLORS[e.src % COLORS.length], title: s.name || '' }), e.title,
            e.loc ? el('small', { text: '📍 ' + e.loc }) : null)));
      }
    }
    body.append(el('div', { cls: 'gz-note', style: 'margin-top:8px', text: `Atualizado às ${hm(new Date(c.at))} · atualiza sozinho a cada 10 min.` }));
    const det = el('details', { style: 'margin-top:8px' }, el('summary', { style: 'cursor:pointer;color:#8696a0;font-size:12.5px', text: 'Calendários conectados (' + srcs.length + ')' }));
    det.append(calSourcesBox(body));
    body.append(det);
  }

  function calSourcesBox(body) {
    const box = el('div', {});
    const srcs = getSources();
    srcs.forEach((s, i) => box.append(el('div', { cls: 'gz-item' },
      el('span', {}, el('span', { cls: 'gz-dot', style: 'background:' + COLORS[i % COLORS.length] }), s.name + ' · ' + s.url.replace(/^(https?:\/\/[^/]+).*/, '$1/…')),
      el('button', { text: 'remover', onclick: () => { const l = getSources(); l.splice(i, 1); setSources(l); calCache.at = 0; renderAgendaTab(body, true); } }))));
    const nm = el('input', { cls: 'gz-in', placeholder: 'Nome (ex.: Outlook, Google)' });
    const url = el('input', { cls: 'gz-in', placeholder: 'Link ICS (https://… .ics) — fica salvo só neste navegador' });
    box.append(el('div', { style: 'display:grid;gap:6px;margin-top:6px' }, nm, url,
      el('button', { cls: 'gz-b pri', text: 'Adicionar calendário', onclick: () => {
        const u = url.value.trim();
        if (!/^(https?|webcal):\/\//i.test(u)) return toast('Cole o link completo (começa com https:// ou webcal://).');
        const l = getSources(); l.push({ name: nm.value.trim() || ('Calendário ' + (l.length + 1)), url: u }); setSources(l);
        calCache.at = 0; renderAgendaTab(body, true);
      } })),
      el('div', { cls: 'gz-note', text: 'Outlook: outlook.live.com › Configurações › Calendário › Calendários compartilhados › Publicar um calendário › "Pode exibir todos os detalhes" › Publicar › copie o link ICS.' }),
      el('div', { cls: 'gz-note', text: 'Google: calendar.google.com › Configurações › (seu calendário) › Integrar agenda › "Endereço secreto no formato iCal".' }));
    return box;
  }

  function renderRemTab(body) {
    body.textContent = '';
    const l = getRem().filter(r => !r.fired);
    if (!l.length) body.append(el('div', { cls: 'gz-note', text: 'Nenhum lembrete pendente. Crie pelo "＋ Evento a partir da conversa".' }));
    for (const r of l) body.append(el('div', { cls: 'gz-item' },
      el('span', { text: `${new Date(r.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${r.text}${r.chat ? ' · ' + r.chat : ''}` }),
      el('button', { text: 'remover', onclick: () => { setRem(getRem().filter(x => x.id !== r.id)); renderRemTab(body); } })));
  }

  function renderDelTab(body) {
    body.textContent = '';
    body.append(chkInline('Guardar mensagens para recuperar apagadas', () => ui.antiDelete, v => { ui.antiDelete = v; saveUi(); }));
    body.append(el('div', { cls: 'gz-note', text: 'Funciona com mensagens que apareceram na tela (conversa aberta ou prévia na lista) enquanto esta aba estava aberta. Nada é gravado no disco: fechou a aba, apagou.' }));
    if (!deletedLog.length) body.append(el('div', { cls: 'gz-note', style: 'margin-top:8px', text: 'Nenhuma mensagem apagada detectada nesta sessão.' }));
    for (const d of deletedLog) body.append(el('div', { cls: 'gz-del-i' },
      el('small', { text: `${hm(new Date(d.at))} · ${d.chat || '?'}${d.who ? ' · ' + d.who : ''}${d.preview ? ' · (pela prévia da lista)' : ''}` }),
      el('div', { text: d.text }),
      d.chat ? el('button', { cls: 'gz-b', style: 'margin-top:4px', text: 'Abrir conversa', onclick: () => { close(); openChat(d.chat); } }) : null));
  }
  function chkInline(txt, get, set) {
    const c = el('input', { type: 'checkbox' }); c.checked = get();
    c.addEventListener('change', () => set(c.checked));
    return el('label', { cls: 'gz-chk' }, c, txt);
  }

  // ---------- criar evento a partir da conversa ----------
  function eventFromChat(quote) {
    const chat = currentChatName();
    stage = 'loading';
    shell('· lendo a conversa', el('div', { cls: 'gz-msg', text: 'Identificando data, hora e assunto…' }));
    panel.querySelector('.gz-h span').firstChild.textContent = '📅 Novo evento ';
    const now = new Date();
    const base = quote ? `TRECHO:\n${quote}` : `CONVERSA (últimas mensagens):\n${getContext(15) || '(vazia)'}`;
    const sys = 'Você extrai compromissos de conversas de WhatsApp de um médico radiologista brasileiro. Responda SOMENTE com JSON válido, sem texto extra.';
    const prompt = `Agora: ${now.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (fuso America/Sao_Paulo).
${base}

Extraia o compromisso mais provável mencionado (o mais recente). JSON:
{"titulo":"curto, até 60 caracteres","data":"AAAA-MM-DD","hora":"HH:MM ou vazio se não houver","duracao_min":número (padrão 60),"local":"ou vazio","notas":"1 frase de contexto, sem dados sensíveis desnecessários"}
Se a data for relativa (amanhã, sexta), converta. Se não houver data, use a data de amanhã e deixe hora vazia.`;
    gemini(sys, [{ text: prompt }], (err, out) => {
      if (stage === 'closed') return;
      let ev = { titulo: chat ? 'Retorno: ' + chat : 'Compromisso', data: ymd(new Date(now.getTime() + 864e5)), hora: '', duracao_min: 60, local: '', notas: '' };
      if (!err) { try { Object.assign(ev, JSON.parse((out.match(/\{[\s\S]*\}/) || ['{}'])[0])); } catch (_) {} }
      eventForm(ev, chat, err);
    });
  }

  function eventForm(ev, chat, err) {
    stage = 'result';
    const titulo = el('input', { value: ev.titulo || '' });
    const data = el('input', { type: 'date', value: ev.data || ymd(new Date()) });
    const hora = el('input', { type: 'time', value: ev.hora || '' });
    const dur = el('select', {}, [['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 h'], ['90', '1 h 30'], ['120', '2 h'], ['240', '4 h'], ['dia', 'Dia inteiro']]
      .map(([v, t]) => el('option', { value: v, text: t })));
    dur.value = ev.hora ? (['15', '30', '45', '60', '90', '120', '240'].includes(String(ev.duracao_min)) ? String(ev.duracao_min) : '60') : 'dia';
    const local = el('input', { value: ev.local || '' });
    const notas = el('input', { value: ev.notas || '' });
    const lemb = el('select', {}, [['none', 'Sem lembrete'], ['0', 'Na hora'], ['10', '10 min antes'], ['30', '30 min antes'], ['60', '1 h antes'], ['1440', '1 dia antes']]
      .map(([v, t]) => el('option', { value: v, text: t })));
    lemb.value = 'none';
    const read = () => {
      const allDay = dur.value === 'dia' || !hora.value;
      const [Y, M, D] = data.value.split('-').map(Number);
      const [h, mi] = (hora.value || '08:00').split(':').map(Number);
      const s = new Date(Y, M - 1, D, allDay ? 0 : h, allDay ? 0 : mi);
      const e = allDay ? new Date(Y, M - 1, D + 1) : new Date(s.getTime() + (+dur.value || 60) * 60e3);
      return { allDay, s, e, t: titulo.value.trim() || 'Compromisso', loc: local.value.trim(), notes: notas.value.trim() };
    };
    const iso = d => `${ymd(d)}T${hm(d)}:00`;
    const gfmt = (d, allDay) => allDay ? ymd(d).replace(/-/g, '') : `${ymd(d).replace(/-/g, '')}T${hm(d).replace(':', '')}00`;
    let remDone = false;
    const doRem = x => {
      if (lemb.value === 'none' || remDone) return;
      remDone = true;
      const base = x.allDay ? new Date(x.s.getTime() + 8 * 36e5) : x.s;
      addReminder(base.getTime() - (+lemb.value) * 60e3, x.t, chat);
      toast('⏰ Lembrete criado no WhatsApp.', 1800);
    };
    const outlook = () => {
      const x = read();
      const p = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: x.t, startdt: x.allDay ? ymd(x.s) : iso(x.s), enddt: x.allDay ? ymd(x.e) : iso(x.e), location: x.loc, body: x.notes });
      if (x.allDay) p.set('allday', 'true');
      window.open('https://outlook.live.com/calendar/0/deeplink/compose?' + p.toString(), '_blank');
      doRem(x);
    };
    const google = () => {
      const x = read();
      const p = new URLSearchParams({ action: 'TEMPLATE', text: x.t, dates: `${gfmt(x.s, x.allDay)}/${gfmt(x.e, x.allDay)}`, ctz: 'America/Sao_Paulo', location: x.loc, details: x.notes });
      window.open('https://calendar.google.com/calendar/render?' + p.toString(), '_blank');
      doRem(x);
    };
    shell('· confira e escolha onde salvar',
      err ? el('div', { cls: 'gz-msg gz-err', text: 'Não consegui ler a conversa (' + err + '). Preencha manualmente.' }) : null,
      el('div', { cls: 'gz-form' },
        el('span', { text: 'Título' }), titulo,
        el('span', { text: 'Data' }), data,
        el('span', { text: 'Hora' }), hora,
        el('span', { text: 'Duração' }), dur,
        el('span', { text: 'Local' }), local,
        el('span', { text: 'Notas' }), notas,
        el('span', { text: 'Lembrete aqui' }), lemb),
      el('div', { cls: 'gz-note', style: 'margin-top:6px', text: 'Outlook/Google abrem com o evento preenchido: confira e clique em Salvar lá.' }),
      el('div', { cls: 'gz-row' },
        el('button', { cls: 'gz-b pri', text: 'Abrir no Outlook', onclick: outlook }),
        el('button', { cls: 'gz-b pri', text: 'Abrir no Google', onclick: google })),
      el('div', { cls: 'gz-row' },
        el('button', { cls: 'gz-b', text: 'Só lembrete aqui', onclick: () => { if (lemb.value === 'none') lemb.value = '0'; doRem(read()); close(); } }),
        el('button', { cls: 'gz-b', text: 'Voltar à agenda', onclick: () => openAgenda('agenda') })));
    panel.querySelector('.gz-h span').firstChild.textContent = '📅 Novo evento ';
    titulo.focus();
  }

  GM_registerMenuCommand('Agenda / Lembretes / Apagadas', () => openAgenda());
  setInterval(() => {
    if (!document.body) return;
    safe('lembretes', checkReminders);
    safe('apagadas', scanMessages);
  }, 2000);
  setInterval(() => { if (getSources().length) loadCalendars(false).catch(() => {}); }, 10 * 60e3);


  // =====================================================================
  // 13. BASE DE REFERÊNCIA, ORIENTAÇÃO DA IA E ELEMENTOS MÓVEIS  (v1.7)
  // =====================================================================
  function makeDraggable(node, key) {
    node.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const st = { x: e.clientX, y: e.clientY, r: node.getBoundingClientRect() };
      let moved = false;
      const mv = ev => {
        const dx = ev.clientX - st.x, dy = ev.clientY - st.y;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        Object.assign(node.style, {
          left: Math.max(0, Math.min(innerWidth - st.r.width, st.r.left + dx)) + 'px',
          top: Math.max(0, Math.min(innerHeight - st.r.height, st.r.top + dy)) + 'px', right: 'auto', bottom: 'auto' });
      };
      const up = () => {
        document.removeEventListener('mousemove', mv, true); document.removeEventListener('mouseup', up, true);
        if (moved) { const r = node.getBoundingClientRect(); GM_setValue(key, { x: r.left, y: r.top }); node.dataset.moved = '1'; setTimeout(() => delete node.dataset.moved, 60); }
      };
      document.addEventListener('mousemove', mv, true); document.addEventListener('mouseup', up, true);
    });
  }

  // caixas de texto crescem sozinhas conforme o conteúdo
  function autoGrow(ta) {
    if (!ta || !ta.isConnected) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 4, innerHeight * 0.62) + 'px';
  }
  document.addEventListener('input', e => { if (e.target && e.target.matches && e.target.matches('#gz-panel textarea')) autoGrow(e.target); }, true);

  function placePanel() {
    if (!panel) return;
    panel.querySelectorAll('textarea').forEach(t => { autoGrow(t); requestAnimationFrame(() => autoGrow(t)); });
    const p = GM_getValue('panel_pos', null);
    if (p) {
      const w = panel.offsetWidth;
      Object.assign(panel.style, { left: Math.max(0, Math.min(innerWidth - w, p.x)) + 'px', top: Math.max(0, Math.min(innerHeight - 120, p.y)) + 'px', right: 'auto', bottom: 'auto', maxHeight: (innerHeight - Math.max(0, p.y) - 10) + 'px', overflow: 'auto' });
    }
    const h = panel.querySelector('.gz-h');
    if (!h || h.dataset.drag) return;
    h.dataset.drag = '1'; h.style.cursor = 'move'; h.title = 'Arraste para mover · duplo clique = posição padrão';
    h.addEventListener('mousedown', e => {
      if (e.target.closest('button') || e.button !== 0) return;
      e.preventDefault();
      const r = panel.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      const mv = ev => Object.assign(panel.style, {
        left: Math.max(0, Math.min(innerWidth - r.width, ev.clientX - ox)) + 'px',
        top: Math.max(0, Math.min(innerHeight - 60, ev.clientY - oy)) + 'px', right: 'auto', bottom: 'auto' });
      const up = () => {
        document.removeEventListener('mousemove', mv, true); document.removeEventListener('mouseup', up, true);
        const rr = panel.getBoundingClientRect(); GM_setValue('panel_pos', { x: rr.left, y: rr.top });
      };
      document.addEventListener('mousemove', mv, true); document.addEventListener('mouseup', up, true);
    });
    h.addEventListener('dblclick', e => {
      if (e.target.closest('button')) return;
      GM_setValue('panel_pos', null);
      Object.assign(panel.style, { left: '', top: '', right: '', bottom: '', maxHeight: '', overflow: '' });
    });
  }

  // linha "orientar a IA e refazer" nos resultados
  function orientRow(onGo) {
    const inp = el('input', { cls: 'gz-in', placeholder: 'Orientar a IA e refazer — ex.: "mais curto", "diga que vejo amanhã cedo", "não cite nomes"' });
    const go = () => { const v = inp.value.trim(); if (v) onGo(v); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    return el('div', { style: 'display:flex;gap:6px;margin-top:8px' }, inp,
      el('button', { cls: 'gz-b', style: 'flex:0 0 auto', text: '↻ Refazer', onclick: go }));
  }

  // ---------- base de referência (Google Docs / qualquer link de texto) ----------
  const getKb = () => GM_getValue('kb_sources', []);
  const setKb = v => GM_setValue('kb_sources', v);
  let kbCache = { at: 0, text: '', errors: [], loading: null };
  function kbUrl(u) {
    const m = u.match(/docs\.google\.com\/document\/d\/(?!e\/)([\w-]+)/);
    if (m) return `https://docs.google.com/document/d/${m[1]}/export?format=txt`;
    const g = u.match(/docs\.google\.com\/spreadsheets\/d\/(?!e\/)([\w-]+)/);
    if (g) return `https://docs.google.com/spreadsheets/d/${g[1]}/export?format=csv`;
    return u.replace(/^webcal:/i, 'https:');
  }
  function fetchText(url) {
    return new Promise(res => GM_xmlhttpRequest({
      method: 'GET', url, timeout: 30000,
      onload: r => {
        if (r.status < 200 || r.status >= 300) return res({ ok: false, err: 'HTTP ' + r.status + (r.status === 401 || r.status === 403 ? ' (o link precisa estar como "Qualquer pessoa com o link")' : '') });
        let t = r.responseText || '';
        if (/<html[\s>]/i.test(t.slice(0, 2000))) {
          if (/accounts\.google\.com|ServiceLogin/i.test(t)) return res({ ok: false, err: 'pediu login: compartilhe como "Qualquer pessoa com o link: Leitor"' });
          const d = new DOMParser().parseFromString(t, 'text/html');
          d.querySelectorAll('script,style').forEach(x => x.remove());
          d.querySelectorAll('p,div,li,h1,h2,h3,h4,tr,br').forEach(x => x.append('\n'));
          t = (d.body ? d.body.textContent : t).replace(/\n{3,}/g, '\n\n');
        }
        res({ ok: true, txt: t.trim() });
      },
      onerror: () => res({ ok: false, err: 'falha de rede' }), ontimeout: () => res({ ok: false, err: 'tempo esgotado' }),
    }));
  }
  function loadKb(force) {
    const srcs = getKb();
    if (!srcs.length) { kbCache = { at: Date.now(), text: '', errors: [], loading: null }; return Promise.resolve(kbCache); }
    if (!force && Date.now() - kbCache.at < 30 * 60e3) return Promise.resolve(kbCache);
    if (kbCache.loading) return kbCache.loading;
    kbCache.loading = (async () => {
      const parts = [], errors = [];
      await Promise.all(srcs.map(async s => {
        const r = await fetchText(kbUrl(s.url));
        if (!r.ok) errors.push(`${s.name}: ${r.err}`); else parts.push(`### ${s.name}\n${r.txt}`);
      }));
      kbCache = { at: Date.now(), text: parts.join('\n\n').slice(0, 80000), errors, loading: null };
      return kbCache;
    })();
    return kbCache.loading;
  }
  function kbBlock() {
    if (GM_getValue('kb_off', false) || !kbCache.text) return '';
    return `BASE DE REFERÊNCIA DO DR. GASPAR (protocolos, rotinas e respostas padrão do serviço). Use apenas o que for pertinente à conversa; prefira estas informações e redações; não invente além delas:\n<<<\n${kbCache.text}\n>>>\n\n`;
  }
  function kbSettingsBox() {
    const box = el('div', {});
    const draw = () => {
      box.textContent = '';
      box.append(chkInline('Usar a base de referência ao reescrever e responder', () => !GM_getValue('kb_off', false), v => GM_setValue('kb_off', !v)));
      const srcs = getKb();
      srcs.forEach((s, i) => box.append(el('div', { cls: 'gz-item' },
        el('span', { text: s.name + ' · ' + s.url.replace(/^(https?:\/\/[^/]+\/[^/]+\/[^/]+\/).*/, '$1…') }),
        el('button', { text: 'remover', onclick: () => { const l = getKb(); l.splice(i, 1); setKb(l); loadKb(true).then(draw); } }))));
      const st = el('div', { cls: 'gz-note', text: srcs.length ? (kbCache.text ? `Carregada: ${kbCache.text.length.toLocaleString('pt-BR')} caracteres · ${hm(new Date(kbCache.at))}` : 'Ainda não carregada.') : 'Nenhuma fonte. Recomendado: um Google Docs com seus protocolos e respostas padrão.' });
      box.append(st);
      kbCache.errors.forEach(er => box.append(el('div', { cls: 'gz-msg gz-err', text: '⚠️ ' + er })));
      const nm = el('input', { cls: 'gz-in', placeholder: 'Nome (ex.: Protocolos TC, Respostas padrão)' });
      const url = el('input', { cls: 'gz-in', placeholder: 'Link do Google Docs/Planilhas (compartilhado: "Qualquer pessoa com o link: Leitor")' });
      box.append(el('div', { style: 'display:grid;gap:6px;margin-top:6px' }, nm, url,
        el('div', { cls: 'gz-row', style: 'margin-top:0' },
          el('button', { cls: 'gz-b pri', text: 'Adicionar fonte', onclick: () => {
            const u = url.value.trim();
            if (!/^https?:\/\//i.test(u)) return toast('Cole o link completo (https://…).');
            const l = getKb(); l.push({ name: nm.value.trim() || ('Fonte ' + (l.length + 1)), url: u }); setKb(l);
            st.textContent = 'Carregando…'; loadKb(true).then(draw);
          } }),
          el('button', { cls: 'gz-b', text: '↻ Recarregar', onclick: () => { st.textContent = 'Carregando…'; loadKb(true).then(draw); } }))),
        el('div', { cls: 'gz-note', text: 'Edite o documento em qualquer computador: os 3 PCs leem a mesma fonte (recarrega a cada 30 min ou no ↻). Não coloque dados de pacientes no documento.' }));
    };
    draw();
    return box;
  }
  setTimeout(() => { try { loadKb(); } catch (_) {} }, 4000);
  setInterval(() => { try { loadKb(); } catch (_) {} }, 30 * 60e3);

})();
