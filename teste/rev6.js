(function(){
document.getElementById('pp-rev')?.remove(); document.querySelectorAll('.pp-rev-btn,.pp-zoom-laudo').forEach(x=>x.remove());
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ').trim();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'–';
const on=()=>true; const cfg={rev:{modo:'completo',noLiberar:false,opusAuto:false,revisor:'auto'},zoomLaudo:100}; const saveCfg=()=>{};
function setCss(id, css){let el=document.getElementById(id); if(!el){el=document.createElement('style');el.id=id;document.head.appendChild(el);} if(el.textContent!==css) el.textContent=css;}
setCss('pp-rev-css-t', '.document-editor__toolbar > .v-btn.pp-rev-btn { color: #fbbf24 !important; font-weight: 700 !important; }\n#pp-rev { position: fixed; right: 16px; width: 430px; max-width: 94vw; max-height: calc(100vh - 110px); overflow: auto; z-index: 10000003; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; box-shadow: 0 16px 40px rgba(0,0,0,.6); font: 12.5px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n#pp-rev .pr-top { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #1e293b; position: sticky; top: 0; background: #0f172a; z-index: 1; }\n#pp-rev .pr-top { flex-wrap: wrap; }\n#pp-rev .pr-top b { flex: 1; font-size: 13px; }\n#pp-rev select { background: #1e293b; color: #f1f5f9; border: 1px solid #475569; border-radius: 5px; padding: 2px 4px; font-size: 12px; }\n#pp-rev .pr-x { background: none; border: 0; color: #94a3b8; font-size: 16px; cursor: pointer; }\n#pp-rev .pr-b.cor { background: #4c1d95; border-color: #7c3aed; color: #ede9fe; }\n#pp-rev .pr-b.cor small { opacity: .75; font-weight: 400; margin-left: 3px; }\n#pp-rev .pr-full { padding: 6px 10px 2px; }\n#pp-rev .pr-full > b { font-size: 12px; color: #c4b5fd; }\n#pp-rev .pr-co { margin-top: 6px; padding: 6px 8px; border: 1px solid #4c1d95; border-radius: 6px; background: #1e1b4b; }\n#pp-rev .pr-co.err, #pp-rev .pr-ok.err { color: #fca5a5; }\n#pp-rev .pr-tq { padding: 4px 0; border-bottom: 1px dashed #312e81; }\n#pp-rev .pr-tq:last-of-type { border-bottom: 0; }\n#pp-rev .pr-antes { color: #fca5a5; text-decoration: line-through; text-decoration-color: rgba(252,165,165,.5); }\n#pp-rev .pr-dep { color: #86efac; }\n#pp-rev .pr-tq.ok .pr-antes { opacity: .5; }\n#pp-rev .pr-ok { font-size: 11px; color: #86efac; }\n#pp-rev .pr-obs { font-size: 11.5px; color: #cbd5e1; margin-top: 4px; font-style: italic; }\n#pp-rev .pr-niv { font-size: 10.5px; color: #a5b4fc; margin-left: auto; align-self: center; }\n#pp-rev .pr-sts { display: flex; flex-wrap: wrap; gap: 5px; padding: 7px 10px 2px; }\n#pp-rev .pr-st { padding: 1px 8px; border-radius: 10px; background: #1e293b; border: 1px solid #334155; font-size: 11px; font-weight: 600; }\n#pp-rev .pr-st.ok { color: #34d399; } #pp-rev .pr-st.wait { color: #fbbf24; } #pp-rev .pr-st.err { color: #f87171; border-color: #7f1d1d; cursor: help; }\n#pp-rev .pr-lib { margin: 8px 10px 0; padding: 8px 10px; border-radius: 8px; background: #064e3b; border: 1px solid #10b981; font-weight: 600; }\n#pp-rev .pr-lib.g { background: #450a0a; border-color: #ef4444; }\n#pp-rev .pr-libb { display: flex; gap: 6px; margin-top: 6px; }\n#pp-rev .pr-lista { padding: 6px 10px; display: flex; flex-direction: column; gap: 6px; }\n#pp-rev .pr-it { background: #1e293b; border: 1px solid #334155; border-left: 4px solid #f59e0b; border-radius: 7px; padding: 7px 9px; }\n#pp-rev .pr-it.grave { border-left-color: #ef4444; }\n#pp-rev .pr-it.conc { box-shadow: inset 0 0 0 1px #64748b; }\n#pp-rev .pr-h { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }\n#pp-rev .pr-cat { flex: 1; font-weight: 700; color: #f1f5f9; }\n#pp-rev .pr-it.grave .pr-cat { color: #fca5a5; }\n#pp-rev .pr-f { font-size: 10px; font-weight: 700; padding: 0 6px; border-radius: 8px; background: #334155; color: #cbd5e1; }\n#pp-rev .pr-f.regra { background: #4c1d95; color: #ddd6fe; } #pp-rev .pr-f.haiku { background: #7c2d12; color: #fed7aa; } #pp-rev .pr-f.gemini { background: #1e3a8a; color: #bfdbfe; }\n#pp-rev .pr-tr { margin-top: 3px; color: #cbd5e1; font-style: italic; }\n#pp-rev .pr-sg { margin-top: 3px; color: #93c5fd; }\n#pp-rev .pr-ac { display: flex; gap: 5px; justify-content: flex-end; margin-top: 5px; }\n#pp-rev .pr-b { background: #0f766e; color: #fff; border: 0; border-radius: 5px; padding: 3px 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; }\n#pp-rev .pr-b.sec { background: #334155; }\n#pp-rev .pr-b:disabled { opacity: .5; cursor: default; }\n#pp-rev .pr-vazio { padding: 14px 4px; text-align: center; color: #94a3b8; }\n#pp-rev .pr-rod { border-top: 1px solid #1e293b; padding: 7px 10px 9px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between; }\n#pp-rev .pr-rod label { display: flex; align-items: center; gap: 5px; color: #cbd5e1; font-size: 11.5px; }\n#pp-rev .pr-log { flex-basis: 100%; color: #64748b; font-size: 10.5px; }\n#pp-rev .pr-err { margin: 4px 10px 0; color: #fca5a5; font-size: 11px; }\n#pp-rev .pr-info { margin: 4px 10px 0; color: #c4b5fd; font-size: 11px; }\n#pp-rev .pr-f.jev { background: #134e4a; color: #99f6e4; } #pp-rev .pr-f.sonnet { background: #7c2d12; color: #fdba74; } #pp-rev .pr-f.opus { background: #581c87; color: #f5d0fe; }');
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
        // contraste
        if (/sem contraste/.test(ex)) { const i = tl.search(/apos (a )?(injecao|administracao)|contraste (iodado )?(endovenoso|intravenoso)|fases? (arterial|portal|venosa|tardia|de equilibrio|excretora)|realce (pelo|ao|apos o) (meio de )?contraste/); if (i >= 0) add('exame_texto', 'grave', i, 'Exame SEM contraste, mas o texto descreve uso de contraste/fases.', 'Conferir técnica e matriz.'); }
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
4. medidas divergentes entre corpo e conclusão, unidade errada (mm × cm), valor implausível; grandeza × unidade: linear em mm/cm, ÁREA em mm²/cm² (ex.: nervo mediano em mm²), VOLUME em cm³/mL, velocidade em cm/s — aponte volume com unidade de área/linear e vice-versa; volume elipsoide = D1 × D2 × D3 × 0,52 (ou 0,523) — aceite a diferença explicada pelo arredondamento das medidas a 1 casa decimal (cerca de ±3–5%); outro fator (0,65, 0,71…) é erro;
5. classificações (TI-RADS, BI-RADS, O-RADS, Bosniak, LI-RADS, Fleischner, Lung-RADS etc.) incoerentes com a descrição;
6. texto de outra região/exame (matriz errada) ou técnica incompatível com o nome do exame;
7. contradição interna (“sem X” e depois “X presente”), frase truncada ou palavra trocada pelo ditado que muda o sentido;
8. campos de matriz não preenchidos (XX, ___).
Regras: aponte só o que está no texto; NÃO invente achados; NUNCA aponte medida ausente ou não informada (o médico não mede tudo) — só confira as medidas escritas; "trecho" deve ser cópia LITERAL e curta (até 120 caracteres) do laudo, para localizar; se estiver coerente, devolva lista vazia. Gravidade: "grave" = erro factual ou que pode mudar conduta (lado, sexo, medida, achado omitido na conclusão, técnica errada); "atencao" = provável erro menor ou ambíguo. No máximo 8 itens, mais importantes primeiro. Explicação e sugestão curtas (no máximo 25 palavras cada).`;
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
    const revSistema = (c, extra) => { const rf = refsDoExame(c); return REV_BASE + '\n' + REV_ESP[c.tipo] + (c.tipo !== 'TC' && ehUro(c) ? '\n' + REV_PATCH_URO : '') + (rf ? '\nREFERÊNCIAS APROVADAS PELO SERVIÇO (use para conferir; não cobre o que não foi medido):\n' + rf : '') + (extra || ''); };
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
    const JEV_CRITICO = 'O laudo descreve achado agudo ou crítico que exige comunicação imediata ao médico assistente.';
    async function revJev(c) {
        const t0 = performance.now();
        const mapa = Object.assign({}, JEV_COMUNS, JEV_ESP[c.tipo] || {}, c.tipo !== 'TC' && ehUro(c) ? JEV_ESP.URO : {});
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
    async function revGemini(c) {
        const t0 = performance.now();
        const d = await iaProxy({ acao: 'gemini', system: revSistema(c), parts: [{ text: revMensagem(c) }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: REV_SCHEMA_GEMINI, temperature: 0 } });
        let j = null; try { j = JSON.parse(d.texto); } catch (e) { const m = String(d.texto || '').match(/\{[\s\S]*\}/); if (m) { try { j = JSON.parse(m[0]); } catch (x) { /* segue */ } } }
        if (!j || !Array.isArray(j.achados)) throw new Error('resposta sem a lista de achados');
        const u = d.usage || {};
        return { achados: limparAchados(j.achados, 'gemini'), ms: performance.now() - t0, tin: u.promptTokenCount || 0, tout: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), modelo: d.modelo || 'gemini' };
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
    const CORR_SONNET = ['lateralidade', 'campo_vazio', 'redacao_sentido', 'medidas', 'exame_texto', 'sexo_anatomia'];
    const nivelCorrecao = a => a.fix ? 'calc' : CORR_SONNET.includes(a.categoria) ? 'sonnet' : 'opus';
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
                w.insertText(String(novo), attrs, w.createPositionAt(pos.el, pos.i));
                w.setSelection(w.createRange(w.createPositionAt(pos.el, pos.i), w.createPositionAt(pos.el, pos.i + String(novo).length)));
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
        r.corr[k] = { nivel, carregando: true };
        renderRevisao();
        try {
            const c = contextoLaudo() || r.ctx;
            const lista = completa ? achadosAtuais(r).filter(x => !r.ignorados.has(chaveAchado(x))) : [a];
            const x = await corrigirIA(c, nivel === 'opus' ? 'claude-opus-5-5' : 'claude-sonnet-5-5', lista, completa);
            r.corr[k] = { nivel, trocas: x.trocas, obs: x.obs || (x.trocas.length ? '' : 'Nenhuma troca proposta.'), ms: x.ms };
        } catch (e) { r.corr[k] = { nivel, erro: String(e.message || e).slice(0, 200) }; }
        if (revAtual === r) renderRevisao();
    }
    function htmlCorrecao(cr) {
        if (!cr) return '';
        if (cr.carregando) return `<div class="pr-co">⏳ ${NIVEL_NOME[cr.nivel]} preparando a correção…</div>`;
        if (cr.erro) return `<div class="pr-co err">⚠ ${esc(cr.erro)}</div>`;
        return `<div class="pr-co">${(cr.trocas || []).map((t, j) => `<div class="pr-tq ${t.feito ? 'ok' : ''}" data-j="${j}"><div class="pr-antes">${esc(t.original)}</div><div class="pr-dep">→ ${esc(t.novo)}</div>${t.feito ? '<div class="pr-ok">✓ aplicado (Ctrl+Z desfaz)</div>' : t.falha ? `<div class="pr-ok err">⚠ ${esc(t.falha)}</div>` : ''}</div>`).join('')}
${cr.obs ? `<div class="pr-obs">${esc(cr.obs)}</div>` : ''}
<div class="pr-ac">${(cr.trocas || []).some(t => !t.feito) ? `<button class="pr-b" data-apl>Aplicar${cr.trocas.length > 1 ? ' tudo' : ''}</button>` : ''}<button class="pr-b sec" data-desc>${(cr.trocas || []).every(t => t.feito) && cr.trocas.length ? 'Fechar' : 'Descartar'}</button><span class="pr-niv">${NIVEL_NOME[cr.nivel]}${cr.ms ? ' · ' + fmt(cr.ms / 1000, 1) + ' s' : ''}</span></div></div>`;
    }
    function ligarCorrecao(el, r, k) {
        const cr = r.corr && r.corr[k];
        if (!cr) return;
        const ap = el.querySelector(':scope > .pr-co [data-apl]');
        if (ap) ap.onclick = () => { cr.trocas.forEach(t => { if (t.feito) return; const f = substituirNoLaudo(t.original, t.novo, t.dica); if (f) t.falha = f; else { t.feito = true; t.falha = ''; } }); renderRevisao(); };
        const ds = el.querySelector(':scope > .pr-co [data-desc]');
        if (ds) ds.onclick = () => { delete r.corr[k]; renderRevisao(); };
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
${!r.carregando && r.ctx.texto.length >= 30 ? `<div class="pr-full" data-k="__opus__">${r.corr && r.corr.__opus__ ? '<b>🎓 Revisão completa com correção (Opus)</b>' + htmlCorrecao(r.corr.__opus__) : '<button class="pr-b cor" id="pr-full" title="Opus revisa o laudo inteiro e propõe as correções (antes → depois)">🎓 Revisão completa com correção (Opus)</button>'}</div>` : ''}
<div class="pr-lista">${todos.length ? todos.map((a, i) => `
<div class="pr-it ${a.gravidade} ${a.fontes.length > 1 ? 'conc' : ''}" data-i="${i}">
<div class="pr-h"><span class="pr-cat">${a.gravidade === 'grave' ? '●' : '○'} ${esc(CAT_NOME[a.categoria] || a.categoria)}</span>${a.fontes.map(f => fonteChip(f, a)).join('')}</div>
<div class="pr-ex">${esc(a.explicacao)}</div>
${a.trecho ? `<div class="pr-tr">“${esc(a.trecho)}”</div>` : ''}
${a.sugestao ? `<div class="pr-sg">→ ${esc(a.sugestao)}</div>` : ''}
<div class="pr-ac">${a.trecho ? '<button class="pr-b sec" data-loc>Localizar</button>' : ''}${r.corr && r.corr[chaveAchado(a)] ? '' : `<button class="pr-b cor" data-cor title="Propõe a correção (antes → depois); nada muda sem Aplicar">✍ Corrigir <small>${NIVEL_NOME[nivelCorrecao(a)]}</small></button>`}<button class="pr-b sec" data-ign>Ignorar</button></div>${htmlCorrecao(r.corr && r.corr[chaveAchado(a)])}</div>`).join('')
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
            const cb = el.querySelector('[data-cor]'); if (cb) cb.onclick = () => pedirCorrecao(r, a, false);
            ligarCorrecao(el, r, chaveAchado(a));
        });
        const pf = p.querySelector('#pr-full'); if (pf) pf.onclick = () => pedirCorrecao(r, null, true);
        const fu = p.querySelector('.pr-full'); if (fu) ligarCorrecao(fu, r, '__opus__');
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
    // ---------- Zoom só da folha do laudo (visual; impressão intacta) ----------
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
    function revBtn() {
        const tb = document.querySelector('.v-dialog__content .document-editor__toolbar');
        let b = tb && tb.querySelector(':scope > .pp-rev-btn');
        if (!tb || !on('revisaoIA')) { if (b) b.remove(); if (!tb) fecharRevisao(); return; }
        if (b) return;
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'v-btn v-btn--text theme--dark v-size--small pp-rev-btn';
        b.innerHTML = '<span class="v-btn__content">🛡 Revisar</span>';
        b.title = 'Revisão do laudo: regras fixas + Jev + IA (Haiku/Sonnet, Gemini; Opus como sênior). ✍ Corrigir só altera o laudo ao clicar Aplicar (Ctrl+Z desfaz).';
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

const __orig = contextoLaudo; contextoLaudo = function(){ const c=__orig(); if(c && window.__exameTeste){ c.exame=window.__exameTeste; c.tipo='US'; } return c; };
revBtn();
window.__ppRevT={revisar,fecharRevisao,regrasLaudo,revSistema,contextoLaudo:()=>contextoLaudo(),get r(){return revAtual;}};
})();
