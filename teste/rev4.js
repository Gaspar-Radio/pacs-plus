(function(){
document.getElementById('pp-rev')?.remove();
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ').trim();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'–';
const on=()=>true; const cfg={rev:{modo:'completo',noLiberar:false,opusAuto:true,revisor:'auto'}}; const saveCfg=()=>{};
let st=document.getElementById('pp-rev-css'); if(!st){st=document.createElement('style');st.id='pp-rev-css';document.head.appendChild(st);} st.textContent=`
.document-editor__toolbar > .v-btn.pp-rev-btn { color: #fbbf24 !important; font-weight: 700 !important; }
#pp-rev { position: fixed; right: 16px; width: 430px; max-width: 94vw; max-height: calc(100vh - 110px); overflow: auto; z-index: 10000003; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; box-shadow: 0 16px 40px rgba(0,0,0,.6); font: 12.5px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
#pp-rev .pr-top { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #1e293b; position: sticky; top: 0; background: #0f172a; z-index: 1; }
#pp-rev .pr-top { flex-wrap: wrap; }
#pp-rev .pr-top b { flex: 1; font-size: 13px; }
#pp-rev select { background: #1e293b; color: #f1f5f9; border: 1px solid #475569; border-radius: 5px; padding: 2px 4px; font-size: 12px; }
#pp-rev .pr-x { background: none; border: 0; color: #94a3b8; font-size: 16px; cursor: pointer; }
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
#pp-rev .pr-f.jev { background: #134e4a; color: #99f6e4; } #pp-rev .pr-f.sonnet { background: #7c2d12; color: #fdba74; } #pp-rev .pr-f.opus { background: #581c87; color: #f5d0fe; }`;
    function editorLaudo() {
        const el = document.querySelector('.v-dialog--active .ck-editor__editable, .ck-editor__editable');
        return el && el.ckeditorInstance && !el.ckeditorInstance.isReadOnly ? el.ckeditorInstance : null;
    }
    const REV_LOG_KEY = 'pacsplus_rev_log_v1';
    const REV_PADRAO = { modo: 'completo', noLiberar: false, opusAuto: true, revisor: 'auto' }; // revisor: auto (TC → Sonnet, US → Haiku) | haiku | sonnet
    const revCfg = () => Object.assign({}, REV_PADRAO, cfg.rev || {});
    const CAT_NOME = {
        campo_vazio: 'Campo não preenchido', sexo_anatomia: 'Sexo × anatomia', lateralidade: 'Lateralidade',
        exame_texto: 'Exame × texto', corpo_conclusao: 'Corpo × conclusão', medidas: 'Medidas / unidades',
        classificacao: 'Classificação', redacao_sentido: 'Redação / ditado', critico: 'Resultado crítico', outro: 'Outro'
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
        const crit = [...document.querySelectorAll('.v-dialog__content .v-input')].find(v => norm(v.innerText) === 'resultado critico');
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
    const CRITICOS = ['pneumoperitonio', 'pneumotorax hipertensivo', 'disseccao', 'tromboembolismo pulmonar', 'embolia pulmonar', 'hemorragia subaracnoide', 'hemorragia intraparenquimatosa', 'hematoma subdural', 'hematoma extradural', 'hematoma epidural', 'hemorragia intracraniana', 'torcao testicular', 'torcao ovariana', 'torcao anexial', 'gestacao ectopica', 'gravidez ectopica', 'aneurisma roto', 'ruptura de aneurisma', 'isquemia mesenterica', 'trombose venosa profunda', 'apendicite perfurada', 'herniacao', 'desvio da linha media'];
    function regrasLaudo(c) {
        const t = c.texto, tn = norm(t), ex = norm(c.exame), out = [];
        const add = (categoria, gravidade, idx, explicacao, sugestao) => out.push({ categoria, gravidade, trecho: idx >= 0 ? frase(t, idx) : '', explicacao, sugestao: sugestao || '', fontes: ['regra'] });
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
        // contraste
        if (/sem contraste/.test(ex)) { const i = tl.search(/apos (a )?(injecao|administracao)|contraste (iodado )?(endovenoso|intravenoso)|fases? (arterial|portal|venosa|tardia|de equilibrio|excretora)|realce (pelo|ao|apos o) (meio de )?contraste/); if (i >= 0) add('exame_texto', 'grave', i, 'Exame SEM contraste, mas o texto descreve uso de contraste/fases.', 'Conferir técnica e matriz.'); }
        if (/com contraste/.test(ex)) { const i = tl.search(/sem (a )?(injecao|uso|administracao) (de|do) (meio de )?contraste|\bsem contraste\b/); if (i >= 0) add('exame_texto', 'atencao', i, 'Exame COM contraste, mas o texto diz “sem contraste”.', 'Conferir técnica.'); }
        // unidades implausíveis
        const reU = /(\d+(?:[.,]\d+)?)\s*(mm|cm)\b(?!\s*\/\s*s)/gi; let u;
        while ((u = reU.exec(t))) { const v = numBR(u[1]), un = u[2].toLowerCase(); if ((un === 'cm' && v > 40) || (un === 'mm' && v > 300)) { add('medidas', 'atencao', u.index, `Medida implausível: ${u[0]}.`, 'Conferir a unidade (mm × cm).'); break; } }
        // volume × dimensões
        const reV = /(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b[^.\n]{0,90}?(\d+(?:[.,]\d+)?)\s*(cm³|cm3|ml|cc)/gi; let v;
        while ((v = reV.exec(t))) {
            let [a, b, cc] = [numBR(v[1]), numBR(v[2]), numBR(v[3])]; if (v[4].toLowerCase() === 'mm') { a /= 10; b /= 10; cc /= 10; }
            const vol = numBR(v[5]), err = Math.min(...[0.523, 0.52, 0.71].map(k => Math.abs(a * b * cc * k - vol) / Math.max(vol, 0.01)));
            if (err > 0.1) add('medidas', 'atencao', v.index, `Volume ${v[5]} ${v[6]} não confere com ${v[1]} × ${v[2]} × ${v[3]} ${v[4]} (esperado ≈ ${fmt(a * b * cc * 0.523, 1)} cm³ com 0,523).`, 'Recalcular o volume (🧮 Calc.).');
        }
        if (/doppler/.test(ex) && !/fluxo|doppler|espectr|velocidade|refluxo|\bir\b|\bip\b|resistividade|pulsatilidade|perviedade|pervi[ao]/.test(tl)) add('exame_texto', 'atencao', -1, 'Exame de Doppler sem descrição de fluxo/velocidades no texto.', 'Conferir se a matriz é a de Doppler.');
        if (t.length > 200 && !/impress[aã]o|conclus[aã]o|opini[aã]o/i.test(t)) add('corpo_conclusao', 'atencao', -1, 'Não encontrei Impressão/Conclusão no laudo.', '');
        if (!c.critico) {
            for (const k of CRITICOS) {
                const i = tl.indexOf(k); if (i < 0) continue;
                const antes = tl.slice(Math.max(0, i - 60), i);
                if (/\b(sem|nao|ausencia|afastad|exclu|negativ|descart)\w*[^.]*$/.test(antes)) continue;
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
4. medidas divergentes entre corpo e conclusão, unidade errada (mm × cm), valor implausível, volume que não confere com as dimensões (elipsoide 0,523);
5. classificações (TI-RADS, BI-RADS, O-RADS, Bosniak, LI-RADS, Fleischner, Lung-RADS etc.) incoerentes com a descrição;
6. texto de outra região/exame (matriz errada) ou técnica incompatível com o nome do exame;
7. contradição interna (“sem X” e depois “X presente”), frase truncada ou palavra trocada pelo ditado que muda o sentido;
8. campos de matriz não preenchidos (XX, ___).
Regras: aponte só o que está no texto; NÃO invente achados; "trecho" deve ser cópia LITERAL e curta (até 120 caracteres) do laudo, para localizar; se estiver coerente, devolva lista vazia. Gravidade: "grave" = erro factual ou que pode mudar conduta (lado, sexo, medida, achado omitido na conclusão, técnica errada); "atencao" = provável erro menor ou ambíguo. No máximo 8 itens, mais importantes primeiro. Explicação e sugestão curtas (no máximo 25 palavras cada).`;
    const REV_ESP = {
        US: `Contexto: ULTRASSONOGRAFIA. Atenção especial: órgãos descritos coerentes com a região do exame; Doppler — lado, vasos/segmentos, refluxo/trombose/estenose coerentes com a conclusão, IR/IP e velocidades plausíveis; carótidas — grau de estenose coerente com VPS/VDF/razão (consenso SRU); tireoide — TI-RADS de cada nódulo coerente com composição/ecogenicidade/forma/margens/focos e tamanho; volumes (tireoide, próstata, ovário, útero, bexiga/resíduo) coerentes com as medidas; obstétrico — biometria, idade gestacional e peso coerentes; mama — BI-RADS coerente.`,
        TC: `Contexto: TOMOGRAFIA COMPUTADORIZADA. Atenção especial: técnica (sem/com contraste, fases) coerente com o nome do exame; achados agudos (hemorragia, pneumoperitônio, dissecção, TEP, isquemia, fratura, obstrução) obrigatoriamente na conclusão; níveis vertebrais e segmentos coerentes entre corpo e conclusão; nódulos — medida e conduta (Fleischner/Lung-RADS) coerentes; Bosniak/LI-RADS coerentes; lateralidade de lesões; incidental relevante sem menção na conclusão.`,
        GERAL: `Contexto: exame de imagem.`
    };
    const REV_CATS = ['lateralidade', 'sexo_anatomia', 'corpo_conclusao', 'medidas', 'classificacao', 'exame_texto', 'redacao_sentido', 'campo_vazio', 'outro'];
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
        volume_incoerente: ['medidas', 'atencao', 'Algum volume informado não confere com as três dimensões multiplicadas por cerca de 0,52 (elipsoide).'],
        sexo_anatomia: ['sexo_anatomia', 'grave', 'O laudo descreve órgão incompatível com o sexo do paciente informado.'],
        regiao_errada: ['exame_texto', 'grave', 'O laudo descreve região anatômica ou tipo de exame diferente do nome do exame (provável matriz errada).'],
        contradicao_interna: ['redacao_sentido', 'grave', 'O laudo afirma e nega o mesmo achado em trechos diferentes.'],
        frase_sem_sentido: ['redacao_sentido', 'atencao', 'Há frase truncada, sem sentido ou palavra trocada pelo ditado que altera o significado.'],
        classificacao_incoerente: ['classificacao', 'grave', 'Alguma classificação (TI-RADS, BI-RADS, O-RADS, Bosniak, LI-RADS, Fleischner) é incoerente com a descrição do achado.'],
        campo_vazio: ['campo_vazio', 'grave', 'O laudo contém campo de modelo não preenchido (XX, ___, colchetes vazios).']
    };
    const JEV_ESP = {
        US: { doppler_incoerente: ['exame_texto', 'grave', 'Em exame com Doppler, a conclusão sobre estenose, refluxo ou trombose não é coerente com as velocidades ou achados descritos.'] },
        TC: { tecnica_incoerente: ['exame_texto', 'grave', 'A técnica descrita (com ou sem contraste, fases) é incoerente com o nome do exame.'],
              nivel_incoerente: ['corpo_conclusao', 'grave', 'Níveis vertebrais, segmentos ou lobos citados na conclusão diferem dos descritos no corpo do laudo.'],
              agudo_fora_conclusao: ['corpo_conclusao', 'grave', 'Achado agudo (hemorragia, pneumoperitônio, dissecção, tromboembolismo, fratura, obstrução) descrito no corpo não está na conclusão.'] },
        GERAL: {}
    };
    const JEV_CRITICO = 'O laudo descreve achado agudo ou crítico que exige comunicação imediata ao médico assistente.';
    async function revJev(c) {
        const t0 = performance.now();
        const mapa = Object.assign({}, JEV_COMUNS, JEV_ESP[c.tipo] || {});
        const questions = {};
        Object.entries(mapa).forEach(([k, v]) => { questions[k] = { type: 'noul', instructions: v[2] }; });
        if (!c.critico) questions.critico_presente = { type: 'noul', instructions: JEV_CRITICO };
        const d = await iaProxy({ acao: 'jev', state: revMensagem(c), questions });
        const ans = d.answers || {};
        const achados = [], probs = {};
        Object.entries(ans).forEach(([k, a]) => {
            const p = a && typeof a.noul === 'number' ? a.noul : null;
            if (p == null) return;
            probs[k] = p;
            if (k === 'critico_presente') { if (p >= 0.7) achados.push({ categoria: 'critico', gravidade: 'atencao', trecho: '', explicacao: `Possível achado crítico e “Resultado Crítico” desmarcado (Jev ${fmt(p, 2)}).`, sugestao: 'Conferir e marcar se for o caso.', fontes: ['jev'], prob: p }); return; }
            const m = mapa[k];
            if (!m || p < 0.5) return;
            achados.push({ categoria: m[0], gravidade: p >= 0.85 ? m[1] : 'atencao', trecho: '', explicacao: `${m[2]} (Jev ${fmt(p, 2)})`, sugestao: '', fontes: ['jev'], prob: p });
        });
        const u = d.usage || {};
        return { achados, probs, ms: performance.now() - t0, tin: u.input_tokens || 0, tout: u.output_tokens || 0, modelo: d.model || 'jev' };
    }

    // ---------- Claude (Haiku = revisor; Opus = sênior) ----------
    async function revClaude(c, modelo, esforco, fonte, tentativa = 1) {
        const t0 = performance.now();
        let d;
        try {
            d = await iaProxy({ acao: 'claude_mensagem', modelo, max_tokens: fonte === 'opus' ? 12000 : 6000, thinking: { type: 'adaptive' }, output_config: { effort: esforco },
                system: REV_BASE + '\n' + REV_ESP[c.tipo] + (fonte === 'opus' ? '\nVocê é o REVISOR SÊNIOR: leia o laudo inteiro com atenção redobrada a coerência global, conclusões e condutas.' : '') + '\nResponda SEMPRE chamando a ferramenta "revisao" uma única vez, sem texto adicional.',
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
    async function revGemini(c) {
        const t0 = performance.now();
        const d = await iaProxy({ acao: 'gemini', system: REV_BASE + '\n' + REV_ESP[c.tipo], parts: [{ text: revMensagem(c) }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: REV_SCHEMA_GEMINI, temperature: 0 } });
        let j = null; try { j = JSON.parse(d.texto); } catch (e) { const m = String(d.texto || '').match(/\{[\s\S]*\}/); if (m) { try { j = JSON.parse(m[0]); } catch (x) { /* segue */ } } }
        if (!j || !Array.isArray(j.achados)) throw new Error('resposta sem a lista de achados');
        const u = d.usage || {};
        return { achados: limparAchados(j.achados, 'gemini'), ms: performance.now() - t0, tin: u.promptTokenCount || 0, tout: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), modelo: d.modelo || 'gemini' };
    }
    // junta achados iguais de fontes diferentes (mesmo trecho ou mesma categoria com trechos parecidos)
    const tokensDe = s => new Set(norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 2));
    function parecidos(a, b) {
        const na = norm(a.trecho), nb = norm(b.trecho);
        if (na && nb && (na.includes(nb) || nb.includes(na))) return true;
        const ta = tokensDe(a.trecho + ' ' + (a.categoria === b.categoria ? '' : a.explicacao)), tb = tokensDe(b.trecho);
        if (!ta.size || !tb.size) return a.categoria === b.categoria && !a.trecho && !b.trecho;
        let inter = 0; ta.forEach(w => { if (tb.has(w)) inter++; });
        return inter / Math.min(ta.size, tb.size) >= (a.categoria === b.categoria ? 0.5 : 0.75);
    }
    function juntarAchados(listas) {
        const out = [];
        listas.flat().forEach(a => {
            const igual = out.find(o => parecidos(o, a));
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


    // ---------- tela ----------
    let revAtual = null; // { hash, ctx, regras, haiku, gemini, erroH, erroG, carregando, ignorados:Set, depois:fn }
    const hashTxt = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };
    function revPainel() {
        let p = document.getElementById('pp-rev');
        if (!p) { p = document.createElement('div'); p.id = 'pp-rev'; document.body.appendChild(p); }
        return p;
    }
    function fecharRevisao() { const p = document.getElementById('pp-rev'); if (p) p.remove(); if (revAtual) revAtual.depois = null; }
    function renderRevisao() {
        if (!revAtual) return;
        const p = revPainel(), r = revAtual, rc = revCfg();
        const tb = document.querySelector('.v-dialog__content .document-editor__toolbar');
        p.style.top = Math.round(Math.max(48, Math.min(tb ? tb.getBoundingClientRect().bottom + 8 : 96, window.innerHeight - 320))) + 'px';
        const todos = achadosAtuais(r).filter(a => !r.ignorados.has(norm(a.categoria + a.trecho + a.explicacao)));
        const graves = todos.filter(a => a.gravidade === 'grave').length;
        const st = m => { const x = r.res[m], erro = r.err[m]; return `<span class="pr-st ${erro ? 'err' : x ? 'ok' : 'wait'}" title="${esc(erro || (x ? x.modelo + ' · ' + x.tin + '+' + x.tout + ' tokens' : ''))}">${MOTORES[m].nome} ${erro ? '⚠ erro' : x ? `✓ ${fmt(x.ms / 1000, 1)} s · ${x.achados.length}` : '⏳'}</span>`; };
        const fonteChip = (f, a) => `<span class="pr-f ${f}">${f === 'regra' ? 'Regra' : MOTORES[f] ? MOTORES[f].nome : f}${f === 'jev' && a.prob != null ? ' ' + fmt(a.prob, 2) : ''}</span>`;
        const erros = Object.entries(r.err).filter(([, e]) => e);
        p.innerHTML = `
<div class="pr-top"><b>🛡 Revisão · ${r.ctx.tipo === 'GERAL' ? esc(r.ctx.mod) : r.ctx.tipo}</b>
<select id="pr-modo" title="Motores">${Object.entries(REV_MODOS).map(([k, v]) => `<option value="${k}" ${rc.modo === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select>
<select id="pr-revisor" title="Qual Claude revisa">${Object.entries(REVISORES).map(([k, v]) => `<option value="${k}" ${(rc.revisor || 'auto') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
<button class="pr-x" title="Fechar (Esc)">✕</button></div>
<div class="pr-sts"><span class="pr-st ok">Regras ✓ ${r.regras.length}</span>${r.ativos.map(st).join('')}</div>
${erros.length ? `<div class="pr-err">${erros.map(([m, e]) => MOTORES[m].nome + ': ' + esc(e)).join('<br>')}</div>` : ''}
${r.motivoOpus ? `<div class="pr-info">🎓 Opus chamado: ${esc(r.motivoOpus)}</div>` : ''}
${r.depois ? `<div class="pr-lib ${graves ? 'g' : ''}">${r.carregando ? '⏳ Revisando antes de liberar…' : graves ? `⚠ ${graves} achado(s) grave(s). Revise ou libere mesmo assim.` : '✓ Sem achados graves.'}
<div class="pr-libb"><button class="pr-b" id="pr-lib" ${r.carregando ? 'disabled' : ''}>Liberar ${graves ? 'mesmo assim' : ''}</button><button class="pr-b sec" id="pr-canc">Voltar ao laudo</button></div></div>` : ''}
<div class="pr-lista">${todos.length ? todos.map((a, i) => `
<div class="pr-it ${a.gravidade} ${a.fontes.length > 1 ? 'conc' : ''}" data-i="${i}">
<div class="pr-h"><span class="pr-cat">${a.gravidade === 'grave' ? '●' : '○'} ${esc(CAT_NOME[a.categoria] || a.categoria)}</span>${a.fontes.map(f => fonteChip(f, a)).join('')}</div>
<div class="pr-ex">${esc(a.explicacao)}</div>
${a.trecho ? `<div class="pr-tr">“${esc(a.trecho)}”</div>` : ''}
${a.sugestao ? `<div class="pr-sg">→ ${esc(a.sugestao)}</div>` : ''}
<div class="pr-ac">${a.trecho ? '<button class="pr-b sec" data-loc>Localizar</button>' : ''}<button class="pr-b sec" data-ign>Ignorar</button></div></div>`).join('')
            : `<div class="pr-vazio">${r.carregando ? 'Analisando…' : '✓ Nenhuma incompatibilidade encontrada.'}</div>`}</div>
<div class="pr-rod"><label><input type="checkbox" id="pr-auto" ${rc.noLiberar ? 'checked' : ''}> Revisar ao clicar Liberar</label>
<label title="Chama o Opus 5.5 sozinho em laudo extenso (> ${REV_EXTENSO} caracteres) ou quando as IAs discordam num item grave"><input type="checkbox" id="pr-opus-auto" ${rc.opusAuto ? 'checked' : ''}> Sênior automático</label>
<span style="display:flex;gap:6px;"><button class="pr-b sec" id="pr-opus" ${r.ativos.includes('opus') ? 'disabled' : ''} title="Revisão sênior com Claude Opus 5.5 (mais lento e mais caro)">🎓 Sênior (Opus)</button><button class="pr-b sec" id="pr-de-novo">↻ De novo</button></span>
<div class="pr-log">${esc(revResumoLog())}</div><div class="pr-log">Vermelho = grave · borda dupla = mais de uma fonte · Jev = probabilidade de erro (0–1). A IA pode errar: a decisão é sua.</div></div>`;
        p.querySelector('.pr-x').onclick = fecharRevisao;
        p.querySelector('#pr-modo').onchange = e => { cfg.rev = Object.assign(revCfg(), { modo: e.target.value }); saveCfg(); revisar(true); };
        p.querySelector('#pr-revisor').onchange = e => { cfg.rev = Object.assign(revCfg(), { revisor: e.target.value }); saveCfg(); revisar(true); };
        p.querySelector('#pr-auto').onchange = e => { cfg.rev = Object.assign(revCfg(), { noLiberar: e.target.checked }); saveCfg(); };
        p.querySelector('#pr-opus-auto').onchange = e => { cfg.rev = Object.assign(revCfg(), { opusAuto: e.target.checked }); saveCfg(); };
        p.querySelector('#pr-de-novo').onclick = () => revisar(true);
        p.querySelector('#pr-opus').onclick = () => rodarOpus(r, 'pedido manual');
        p.querySelectorAll('.pr-it').forEach(el => {
            const a = todos[+el.dataset.i];
            const loc = el.querySelector('[data-loc]'); if (loc) loc.onclick = () => { if (!selecionarTrecho(a.trecho)) { loc.textContent = 'Não achei'; setTimeout(() => { loc.textContent = 'Localizar'; }, 1500); } };
            el.querySelector('[data-ign]').onclick = () => { r.ignorados.add(norm(a.categoria + a.trecho + a.explicacao)); r.nIgnorados = (r.nIgnorados || 0) + 1; renderRevisao(); };
        });
        const bl = p.querySelector('#pr-lib'); if (bl) bl.onclick = () => { const f = r.depois; r.depois = null; fecharRevisao(); if (f) f(); };
        const bc = p.querySelector('#pr-canc'); if (bc) bc.onclick = () => { r.depois = null; renderRevisao(); };
    }
    const MOTORES = {
        jev: { nome: 'Jev', fn: c => revJev(c) },
        haiku: { nome: 'Haiku', fn: c => revHaiku(c) },
        sonnet: { nome: 'Sonnet', fn: c => revSonnet(c) },
        gemini: { nome: 'Gemini', fn: c => revGemini(c) },
        opus: { nome: 'Opus', fn: c => revOpus(c) }
    };
    const REV_MODOS = {
        completo: { nome: 'Jev + Claude + Gemini', motores: ['jev', 'claude', 'gemini'] },
        jev_haiku: { nome: 'Jev + Claude', motores: ['jev', 'claude'] },
        haiku_gemini: { nome: 'Claude + Gemini', motores: ['claude', 'gemini'] },
        haiku: { nome: 'Só Claude', motores: ['claude'] }
    };
    const REVISORES = { auto: 'Claude: auto (TC Sonnet · US Haiku)', haiku: 'Claude: Haiku', sonnet: 'Claude: Sonnet' };
    const revisorDe = (rc, c) => rc.revisor === 'haiku' || rc.revisor === 'sonnet' ? rc.revisor : (c.tipo === 'TC' ? 'sonnet' : 'haiku');
    const REV_EXTENSO = 3000; // caracteres: acima disso o sênior entra sozinho (se ligado)
    function achadosAtuais(r) {
        // ordem: regras e LLMs primeiro (têm trecho); Jev por último, junta-se pela categoria
        const listas = [r.regras || []];
        ['haiku', 'sonnet', 'gemini', 'opus'].forEach(m => { if (r.res[m]) listas.push(r.res[m].achados); });
        const base = juntarAchados(listas);
        // Jev confirma itens da mesma categoria (selo com a probabilidade); sozinho só aparece se ≥ 0,7
        if (r.res.jev) r.res.jev.achados.slice().sort((x, y) => y.prob - x.prob).forEach(j => {
            const iguais = base.filter(o => o.categoria === j.categoria);
            if (iguais.length) { iguais.forEach(o => { if (!o.fontes.includes('jev')) o.fontes.push('jev'); o.prob = Math.max(o.prob || 0, j.prob); }); return; }
            if (j.prob >= 0.7) base.push(Object.assign({}, j, { fontes: ['jev'], gravidade: j.prob >= 0.85 ? j.gravidade : 'atencao' }));
        });
        const peso = a => (a.gravidade === 'grave' ? 10 : 0) + a.fontes.length * 3 + (a.fontes.includes('regra') ? 2 : 0);
        return base.sort((x, y) => peso(y) - peso(x));
    }
    function rodarMotor(r, m) {
        if (!r.ativos.includes(m)) r.ativos.push(m);
        delete r.err[m]; r.res[m] = null;
        return MOTORES[m].fn(r.ctx).then(x => { r.res[m] = x; }).catch(e => { r.err[m] = e.message; }).finally(() => { if (revAtual === r) renderRevisao(); });
    }
    async function rodarOpus(r, motivo) {
        if (r.ativos.includes('opus') && (r.res.opus || !r.err.opus)) return;
        r.motivoOpus = motivo;
        r.carregando = true;
        renderRevisao();
        await rodarMotor(r, 'opus');
        r.carregando = false;
        if (revAtual === r) renderRevisao();
    }
    async function revisar(forcar, depois) {
        const c = contextoLaudo();
        if (!c) return null;
        const hash = hashTxt(c.texto + '|' + c.exame + '|' + c.critico);
        const rc = revCfg();
        const modo = REV_MODOS[rc.modo] ? rc.modo : 'completo';
        if (!forcar && revAtual && revAtual.hash === hash && revAtual.modo === modo && revAtual.revisor === revisorDe(rc, c) && !revAtual.carregando) {
            revAtual.depois = depois || null; renderRevisao(); return revAtual;
        }
        const r = revAtual = { hash, ctx: c, modo, regras: regrasLaudo(c), res: {}, err: {}, ativos: [], motivoOpus: '', carregando: true, ignorados: new Set(), depois: depois || null };
        renderRevisao();
        if (c.texto.length >= 30) {
            r.revisor = revisorDe(rc, c);
            const onda = REV_MODOS[modo].motores.map(m => rodarMotor(r, m === 'claude' ? r.revisor : m));
            if (rc.opusAuto && c.texto.length > REV_EXTENSO) { r.motivoOpus = `laudo extenso (${c.texto.length} caracteres)`; onda.push(rodarMotor(r, 'opus')); }
            await Promise.all(onda);
            // discordância: item grave apontado por UMA só IA quando havia duas ou mais rodando
            const ias = r.ativos.filter(m => ['haiku', 'sonnet', 'gemini'].includes(m) && r.res[m]); // discordância só entre LLMs (Jev é checklist)
            if (rc.opusAuto && !r.ativos.includes('opus') && ias.length >= 2) {
                const disc = achadosAtuais(r).find(a => a.gravidade === 'grave' && !a.fontes.includes('regra') && a.fontes.filter(f => ias.includes(f)).length === 1);
                if (disc) { r.motivoOpus = `as IAs discordaram (“${CAT_NOME[disc.categoria] || disc.categoria}”)`; await rodarMotor(r, 'opus'); }
            }
        }
        r.carregando = false;
        const reg = { t: Date.now(), tipo: c.tipo, modo, n: c.texto.length, nR: r.regras.length, erros: Object.keys(r.err).join('') };
        Object.entries(r.res).forEach(([m, x]) => { if (x) Object.assign(reg, { [m + 'Ms']: Math.round(x.ms), [m + 'In']: x.tin, [m + 'Out']: x.tout, [m + 'N']: x.achados.length }); });
        revLog(reg);
        if (revAtual === r) {
            const graves = achadosAtuais(r).filter(a => a.gravidade === 'grave').length;
            // revisão no Liberar sem nada grave → segue sozinho
            if (r.depois && !graves && !Object.keys(r.err).length) { const f = r.depois; r.depois = null; fecharRevisao(); f(); return r; }
            renderRevisao();
        }
        return r;
    }
    function revBtn() {
        const tb = document.querySelector('.v-dialog__content .document-editor__toolbar');
        let b = tb && tb.querySelector(':scope > .pp-rev-btn');
        if (!tb || !on('revisaoIA')) { if (b) b.remove(); if (!tb) fecharRevisao(); return; }
        if (b) return;
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'v-btn v-btn--text theme--dark v-size--small pp-rev-btn';
        b.innerHTML = '<span class="v-btn__content">🛡 Revisar</span>';
        b.title = 'Revisão do laudo: regras fixas + Jev + IA (Haiku / Gemini; Opus como sênior). Nada é alterado no laudo.';
        b.addEventListener('mousedown', e => e.preventDefault());
        b.onclick = e => { e.stopPropagation(); if (document.getElementById('pp-rev') && !(revAtual && revAtual.carregando)) { fecharRevisao(); return; } revisar(false); };
        const calc = tb.querySelector(':scope > .pp-calc-laudo');
        if (calc && calc.nextSibling) tb.insertBefore(b, calc.nextSibling); else tb.insertBefore(b, tb.firstChild);
    }
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


window.__ppRevT={revisar,contextoLaudo,fecharRevisao,achadosAtuais,cfg};
})();