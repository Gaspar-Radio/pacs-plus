// ==UserScript==
// @name         PACS LADI - Cartografia Venosa MMII
// @namespace    hamc-rt
// @version      1.0.0
// @description  Cartografia (desenho) do Doppler venoso de MMII dentro do Laudo Web: botão só nos exames de Doppler venoso de membro inferior com imagem, nome e data puxados do exame, desfazer/refazer, uni ou bilateral, pré-desenho a partir do laudo (API do Claude, opcional) e PDF anexado ao exame.
// @author       Dr. Gabriel Gaspar
// @match        *://pacs.ladi.org.br/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/cartografia-venosa.user.js
// @downloadURL  https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/cartografia-venosa.user.js
// ==/UserScript==

(function () {
  'use strict';
  if (window.__cvMMIILoaded) return;
  window.__cvMMIILoaded = true;

  const VERSAO = '1.0.0';
  const API = '/backend/api';
  const P = 'cvmmii';                       // prefixo de ids/classes
  const PREFIXO_ANEXO = 'Cartografia Venosa MMII';
  const APP_HTML = "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n<title>Cartografia Venosa MMII</title>\n<style>\n:root{--ink:#1e293b;--mut:#64748b;--line:#e2e8f0;--bg:#f1f5f9;--card:#fff;--ind:#3730a3;--ind2:#4f46e5;--blue:#2563eb;--red:#dc2626;--grn:#059669}\n*{box-sizing:border-box}\nhtml,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:13px -apple-system,\"Segoe UI\",Roboto,Arial,sans-serif}\nbutton{font:inherit;cursor:pointer}\ninput,textarea,select{font:inherit}\n#top{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;background:#fff;border-bottom:1px solid var(--line)}\n#top .f{display:flex;align-items:center;gap:4px}\n#top label{font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase}\n#nome{width:260px;padding:5px 7px;border:1px solid var(--line);border-radius:6px;font-weight:600;text-transform:uppercase}\n#data{padding:4px 6px;border:1px solid var(--line);border-radius:6px}\n.seg{display:inline-flex;border:1px solid #c7d2fe;border-radius:7px;overflow:hidden}\n.seg button{border:0;background:#fff;padding:5px 10px;font-weight:700;font-size:12px;color:var(--ind)}\n.seg button+button{border-left:1px solid #c7d2fe}\n.seg button.on{background:var(--ind2);color:#fff}\n.sp{flex:1}\n.b{border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 10px;font-weight:600;font-size:12px;color:var(--ink)}\n.b:hover{background:#f8fafc}\n.b:disabled{opacity:.45;cursor:default}\n.b.pri{background:var(--grn);border-color:var(--grn);color:#fff}\n.b.pri:hover{background:#047857}\n.b.ia{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6}\n#msg{padding:5px 12px;font-size:12px;background:#eef2ff;color:#3730a3;border-bottom:1px solid var(--line);min-height:26px}\n#msg.err{background:#fef2f2;color:#991b1b}\n#msg.ok{background:#ecfdf5;color:#065f46}\n#main{display:flex;gap:10px;padding:10px;align-items:flex-start}\n#side{width:250px;flex:none;display:flex;flex-direction:column;gap:8px}\n.card{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:8px}\n.card h3{margin:0 0 6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}\n.tools{display:flex;flex-wrap:wrap;gap:4px}\n.tool{display:inline-flex;align-items:center;gap:5px;border:2px solid var(--line);background:#fff;border-radius:7px;padding:3px 7px;font-size:11px;font-weight:600}\n.tool.on{border-color:var(--ind2);background:#eef2ff}\n.dot{width:10px;height:10px;border-radius:50%;display:inline-block}\n.bar{width:14px;height:4px;border-radius:2px;display:inline-block}\n.tabs{display:flex;margin-bottom:6px;border-bottom:1px solid var(--line)}\n.tabs button{flex:1;border:0;background:none;padding:4px;font-weight:700;font-size:11px;color:var(--mut);border-bottom:2px solid transparent}\n.tabs button.on{color:var(--ind);border-bottom-color:var(--ind2)}\n.tabs button:disabled{opacity:.35;cursor:default}\n.grp{border:1px solid var(--line);border-radius:7px;padding:5px;margin-bottom:5px}\n.grp b{display:block;font-size:10px;text-transform:uppercase;color:#334155;margin-bottom:4px}\n.g2{display:grid;grid-template-columns:1fr 1fr;gap:3px}\n.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:3px}\n.sc{border:1px solid var(--line);background:#f8fafc;border-radius:5px;padding:3px 2px;font-size:10px;font-weight:600}\n.sc.c{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}\n.sc.i{color:#b91c1c;background:#fef2f2;border-color:#fecaca}\n.sc:hover{filter:brightness(.96)}\n.cal{display:grid;grid-template-columns:1fr 58px;gap:3px 6px;align-items:center;font-size:11px}\n.cal input{width:58px;padding:2px 4px;border:1px solid var(--line);border-radius:5px;text-align:right}\n#obs{width:100%;min-height:54px;border:1px solid var(--line);border-radius:6px;padding:4px;resize:vertical;font-size:12px}\n#maps{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}\n.map{background:#fff;border:1px solid var(--line);border-radius:9px;padding:6px}\n.map h4{margin:0 0 4px;font-size:12px;display:flex;align-items:center;gap:6px}\n.map canvas{width:100%;max-width:1000px;margin:0 auto;height:auto;display:block;cursor:crosshair;touch-action:none;background:#fff}\n.hid{display:none!important}\n.leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:#334155;padding:6px 8px}\n.leg span{display:inline-flex;align-items:center;gap:5px}\n.chk{display:flex;align-items:center;gap:5px;font-size:11px;margin-top:6px;color:#334155}\ninput[type=range]{width:90px}\n</style>\n</head>\n<body>\n<div id=\"top\">\n  <div class=\"f\"><label for=\"nome\">Paciente</label><input id=\"nome\" type=\"text\" placeholder=\"Nome do paciente\" autocomplete=\"off\"></div>\n  <div class=\"f\"><label for=\"data\">Data do exame</label><input id=\"data\" type=\"date\"></div>\n  <div class=\"seg\" id=\"lado\" title=\"Membros examinados\">\n    <button type=\"button\" data-l=\"bilateral\">Bilateral</button><button type=\"button\" data-l=\"MID\">Só MID</button><button type=\"button\" data-l=\"MIE\">Só MIE</button>\n  </div>\n  <span class=\"sp\"></span>\n  <button type=\"button\" class=\"b ia\" id=\"bIA\" title=\"Lê o laudo liberado e monta um desenho pré-pronto para você ajustar\">✨ Pré-desenhar pelo laudo</button>\n  <button type=\"button\" class=\"b\" id=\"bUndo\" title=\"Desfazer (Ctrl+Z)\">↶ Desfazer</button>\n  <button type=\"button\" class=\"b\" id=\"bRedo\" title=\"Refazer (Ctrl+Y)\">↷</button>\n  <button type=\"button\" class=\"b\" id=\"bLimpar\" title=\"Limpar tudo (pode desfazer)\">🗑 Limpar</button>\n  <button type=\"button\" class=\"b\" id=\"bPDF\" title=\"Baixar o PDF neste computador, sem anexar\">⬇ PDF</button>\n  <button type=\"button\" class=\"b pri\" id=\"bSalvar\" title=\"Gera o PDF e anexa no exame do PACS\">📎 Salvar e anexar no PACS</button>\n</div>\n<div id=\"msg\">Carregando…</div>\n<div id=\"main\">\n  <aside id=\"side\">\n    <div class=\"card\">\n      <h3>1 · Estados (clique no segmento)</h3>\n      <div class=\"tools\">\n        <button type=\"button\" class=\"tool\" data-t=\"s_comp\"><i class=\"dot\" style=\"background:#2563eb\"></i>Competente</button>\n        <button type=\"button\" class=\"tool\" data-t=\"s_incomp\"><i class=\"dot\" style=\"background:#dc2626\"></i>Incompetente</button>\n        <button type=\"button\" class=\"tool\" data-t=\"s_ausente\"><i class=\"dot\" style=\"background:#475569\"></i>Ausente/Ñ caract.</button>\n        <button type=\"button\" class=\"tool\" data-t=\"s_thrombo\"><i class=\"dot\" style=\"background:#000\"></i>Trombose</button>\n        <button type=\"button\" class=\"tool\" data-t=\"s_hypo\"><i class=\"dot\" style=\"background:#cbd5e1\"></i>Hipoplásica</button>\n      </div>\n      <h3 style=\"margin-top:8px\">2 · Desenho livre</h3>\n      <div class=\"tools\">\n        <button type=\"button\" class=\"tool\" data-t=\"perfurante\"><i class=\"dot\" style=\"background:#dc2626\"></i>Perfurante</button>\n        <button type=\"button\" class=\"tool\" data-t=\"varizes\"><span style=\"color:#7c3aed;font-weight:800\">~~</span>Varizes</button>\n        <button type=\"button\" class=\"tool\" data-t=\"f_comp\"><i class=\"bar\" style=\"background:#2563eb\"></i>Azul</button>\n        <button type=\"button\" class=\"tool\" data-t=\"f_incomp\"><i class=\"bar\" style=\"background:#dc2626\"></i>Vermelha</button>\n        <button type=\"button\" class=\"tool\" data-t=\"f_cinza\"><i class=\"bar\" style=\"background:#475569\"></i>Cinza</button>\n        <button type=\"button\" class=\"tool\" data-t=\"f_preto\"><i class=\"bar\" style=\"background:#000\"></i>Preta</button>\n        <button type=\"button\" class=\"tool\" data-t=\"texto\">T Texto</button>\n        <button type=\"button\" class=\"tool\" data-t=\"borracha\">⌫ Borracha</button>\n      </div>\n      <div class=\"chk\">Espessura <input id=\"esp\" type=\"range\" min=\"2\" max=\"10\" value=\"4\"></div>\n    </div>\n    <div class=\"card\">\n      <h3>Atalhos</h3>\n      <div class=\"tabs\"><button type=\"button\" data-s=\"MID\">MID</button><button type=\"button\" data-s=\"MIE\">MIE</button></div>\n      <div class=\"grp\"><b>JSF</b><div class=\"g2\"><button type=\"button\" class=\"sc c\" data-a=\"JSF:comp\">Competente</button><button type=\"button\" class=\"sc i\" data-a=\"JSF:incomp\">Incompetente</button></div></div>\n      <div class=\"grp\"><b>Safena magna</b>\n        <div class=\"g2\"><button type=\"button\" class=\"sc c\" data-a=\"VSM:comp\">Toda comp.</button><button type=\"button\" class=\"sc i\" data-a=\"VSM:incomp\">Toda incomp.</button></div>\n        <div class=\"g3\"><button type=\"button\" class=\"sc i\" data-a=\"VSM_CxP:incomp\">Cx prox.</button><button type=\"button\" class=\"sc i\" data-a=\"VSM_CxM:incomp\">Cx média</button><button type=\"button\" class=\"sc i\" data-a=\"VSM_CxD:incomp\">Cx distal</button>\n        <button type=\"button\" class=\"sc i\" data-a=\"VSM_PnP:incomp\">Pn prox.</button><button type=\"button\" class=\"sc i\" data-a=\"VSM_PnM:incomp\">Pn média</button><button type=\"button\" class=\"sc i\" data-a=\"VSM_PnD:incomp\">Pn distal</button></div>\n        <div class=\"g2\" style=\"margin-top:3px\"><button type=\"button\" class=\"sc\" data-a=\"VSM:ausente\">Ausente / safenect.</button><button type=\"button\" class=\"sc\" data-a=\"VSM:null\">Sem marcação</button></div>\n      </div>\n      <div class=\"grp\"><b>JSP</b><div class=\"g2\"><button type=\"button\" class=\"sc c\" data-a=\"JSP:comp\">Competente</button><button type=\"button\" class=\"sc i\" data-a=\"JSP:incomp\">Incompetente</button></div></div>\n      <div class=\"grp\"><b>Safena parva</b>\n        <div class=\"g2\"><button type=\"button\" class=\"sc c\" data-a=\"VSP:comp\">Toda comp.</button><button type=\"button\" class=\"sc i\" data-a=\"VSP:incomp\">Toda incomp.</button></div>\n        <div class=\"g3\"><button type=\"button\" class=\"sc i\" data-a=\"VSP_PnP:incomp\">Prox.</button><button type=\"button\" class=\"sc i\" data-a=\"VSP_PnM:incomp\">Média</button><button type=\"button\" class=\"sc i\" data-a=\"VSP_PnD:incomp\">Distal</button></div>\n        <div class=\"g2\" style=\"margin-top:3px\"><button type=\"button\" class=\"sc\" data-a=\"VSP:ausente\">Ausente / safenect.</button><button type=\"button\" class=\"sc\" data-a=\"VSP:null\">Sem marcação</button></div>\n      </div>\n    </div>\n    <div class=\"card\">\n      <h3>Calibres (mm) — <span id=\"calLado\">MID</span></h3>\n      <div class=\"cal\" id=\"cal\"></div>\n      <label class=\"chk\"><input type=\"checkbox\" id=\"mostrarCal\" checked> Mostrar calibres no desenho</label>\n    </div>\n    <div class=\"card\">\n      <h3>Observações (saem no PDF)</h3>\n      <textarea id=\"obs\" placeholder=\"Opcional\"></textarea>\n    </div>\n  </aside>\n  <section id=\"maps\">\n    <div class=\"map\" id=\"mapMID\"><h4><i class=\"dot\" style=\"background:#4f46e5\"></i>Membro Inferior Direito (MID)</h4><canvas id=\"cMID\"></canvas></div>\n    <div class=\"map\" id=\"mapMIE\"><h4><i class=\"dot\" style=\"background:#0d9488\"></i>Membro Inferior Esquerdo (MIE)</h4><canvas id=\"cMIE\"></canvas></div>\n    <div class=\"map leg\">\n      <span><i class=\"bar\" style=\"background:#2563eb\"></i>Competente</span><span><i class=\"bar\" style=\"background:#dc2626;height:6px\"></i>Incompetente</span>\n      <span><i class=\"bar\" style=\"background:#475569\"></i>Ausente</span><span><i class=\"bar\" style=\"background:#000;height:6px\"></i>Trombose</span>\n      <span><i class=\"bar\" style=\"background:#cbd5e1\"></i>Hipoplásica</span><span><i class=\"dot\" style=\"background:#dc2626\"></i>Perfurante incomp.</span>\n      <span><b style=\"color:#7c3aed\">~~~</b>Varizes</span><span><b>JSF/JSP</b> junções safeno-femoral/poplítea · <b>VSM/VSP</b> safenas magna/parva</span>\n    </div>\n  </section>\n</div>\n<script>\n(function(){\n'use strict';\n// ===================== MODELO =====================\n// Coordenadas: \"lógicas\" 800x460 (o que é salvo). A anatomia é desenhada em escala 1,12 dentro delas.\nconst W = 800, H = 460, K = 1.12, DPR = 2;\nconst COR = { comp:'#2563eb', incomp:'#dc2626', ausente:'#475569', thrombo:'#000000', hypo:'#cbd5e1', vazio:'rgba(203,213,225,.45)',\n  f_comp:'#2563eb', f_incomp:'#dc2626', f_cinza:'#475569', f_preto:'#000000', perfurante:'#dc2626', varizes:'#7c3aed', texto:'#0f172a' };\nconst SEGS = ['JSF','VSM_CxP','VSM_CxM','VSM_CxD','VSM_PnP','VSM_PnM','VSM_PnD','JSP','VSP_PnP','VSP_PnM','VSP_PnD'];\nconst NOME_SEG = { JSF:'JSF', VSM_CxP:'VSM coxa prox.', VSM_CxM:'VSM coxa média', VSM_CxD:'VSM coxa distal', VSM_PnP:'VSM perna prox.', VSM_PnM:'VSM perna média', VSM_PnD:'VSM perna distal',\n  JSP:'JSP', VSP_PnP:'VSP perna prox.', VSP_PnM:'VSP perna média', VSP_PnD:'VSP perna distal' };\n// trajetos (coordenadas da anatomia, antes da escala K); view = centro da vista\nconst SEG_XY = {\n  JSF:{j:1,p:[{v:135,pts:[[-25,60],[-5,63]]},{v:355,pts:[[18,55],[8,58]]}]},\n  VSM_CxP:{p:[{v:135,pts:[[-15,65],[-18,110]]},{v:355,pts:[[18,55],[16,110]]}]},\n  VSM_CxM:{p:[{v:135,pts:[[-18,110],[-21,155]]},{v:355,pts:[[16,110],[20,155]]}]},\n  VSM_CxD:{p:[{v:135,pts:[[-21,155],[-24,200]]},{v:355,pts:[[20,155],[16,200]]}]},\n  VSM_PnP:{p:[{v:135,pts:[[-24,200],[-22,250]]},{v:355,pts:[[16,200],[17,256]]}]},\n  VSM_PnM:{p:[{v:135,pts:[[-22,250],[-23,300]]},{v:355,pts:[[17,256],[20,313]]}]},\n  VSM_PnD:{p:[{v:135,pts:[[-23,300],[-25,350]]},{v:355,pts:[[20,313],[16,370]]}]},\n  JSP:{j:1,p:[{v:575,pts:[[12,185],[-2,200]]}]},\n  VSP_PnP:{p:[{v:575,pts:[[-2,200],[1.5,256]]}]},\n  VSP_PnM:{p:[{v:575,pts:[[1.5,256],[5,313]]}]},\n  VSP_PnD:{p:[{v:575,pts:[[5,313],[2,370]]}]}\n};\nconst vazioSeg = () => Object.fromEntries(SEGS.map(k => [k, null]));\nconst novoEstado = () => ({ v:1, lado:'bilateral', nome:'', data:'', seg:{MID:vazioSeg(),MIE:vazioSeg()}, cal:{MID:{},MIE:{}}, acoes:{MID:[],MIE:[]}, obs:'', mostrarCal:true });\nlet S = novoEstado();\nlet tool = 's_comp', abaAtalho = 'MID';\nlet meta = { exa:null, temLaudo:false, iaOk:false, origem:'' };\nconst flipDe = lado => lado === 'MIE' ? -1 : 1;\nconst $ = id => document.getElementById(id);\nconst canv = { MID:$('cMID'), MIE:$('cMIE') };\nObject.values(canv).forEach(c => { c.width = W*DPR; c.height = H*DPR; });\n\n// ===================== HISTÓRICO (desfazer/refazer únicos para tudo) =====================\nlet pilha = [], refazer = [];\nconst snap = () => JSON.stringify({ seg:S.seg, cal:S.cal, acoes:S.acoes, lado:S.lado, obs:S.obs });\nfunction marco() { pilha.push(snap()); if (pilha.length > 150) pilha.shift(); refazer = []; botoesHist(); rascunho(); }\nfunction aplicaSnap(t) { const o = JSON.parse(t); S.seg = o.seg; S.cal = o.cal; S.acoes = o.acoes; S.lado = o.lado; S.obs = o.obs || ''; sincronizaUI(); }\nfunction desfazer() { if (!pilha.length) return; refazer.push(snap()); aplicaSnap(pilha.pop()); botoesHist(); rascunho(); }\nfunction refaz() { if (!refazer.length) return; pilha.push(snap()); aplicaSnap(refazer.pop()); botoesHist(); rascunho(); }\nfunction botoesHist() { $('bUndo').disabled = !pilha.length; $('bRedo').disabled = !refazer.length; }\n\n// ===================== DESENHO =====================\nfunction ctxDe(lado) { const c = canv[lado].getContext('2d'); c.setTransform(DPR,0,0,DPR,0,0); return c; }\nfunction perna(ctx, x, tipo, f) {\n  const fx = v => x + v*f;\n  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.5; ctx.fillStyle = '#fcfdfd'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();\n  if (tipo === 'perfil') {\n    ctx.moveTo(fx(30),40); ctx.bezierCurveTo(fx(55),70,fx(50),120,fx(40),170); ctx.bezierCurveTo(fx(30),210,fx(40),240,fx(35),270);\n    ctx.bezierCurveTo(fx(30),290,fx(25),340,fx(15),360); ctx.bezierCurveTo(fx(10),365,fx(-5),370,fx(-10),385);\n    ctx.bezierCurveTo(fx(-15),395,fx(-20),400,fx(-40),400); ctx.bezierCurveTo(fx(-65),400,fx(-75),395,fx(-85),385);\n    ctx.bezierCurveTo(fx(-90),370,fx(-60),350,fx(-50),340); ctx.bezierCurveTo(fx(-35),320,fx(-40),280,fx(-35),250);\n    ctx.bezierCurveTo(fx(-30),220,fx(-45),190,fx(-40),160); ctx.bezierCurveTo(fx(-35),130,fx(-35),90,fx(-30),40);\n  } else if (tipo === 'anterior') {\n    ctx.moveTo(fx(-35),40); ctx.bezierCurveTo(fx(-50),100,fx(-45),160,fx(-35),200); ctx.bezierCurveTo(fx(-25),230,fx(-35),280,fx(-30),320);\n    ctx.bezierCurveTo(fx(-25),340,fx(-15),370,fx(-25),385); ctx.bezierCurveTo(fx(-30),395,fx(-35),400,fx(-15),400);\n    ctx.bezierCurveTo(fx(15),400,fx(25),395,fx(30),385); ctx.bezierCurveTo(fx(20),370,fx(25),340,fx(25),320);\n    ctx.bezierCurveTo(fx(25),280,fx(15),230,fx(20),200); ctx.bezierCurveTo(fx(30),160,fx(20),100,fx(25),40);\n  } else {\n    ctx.moveTo(fx(-30),40); ctx.bezierCurveTo(fx(-45),100,fx(-40),160,fx(-30),200); ctx.bezierCurveTo(fx(-20),230,fx(-35),280,fx(-25),320);\n    ctx.bezierCurveTo(fx(-20),345,fx(-15),370,fx(-18),385); ctx.bezierCurveTo(fx(-20),395,fx(-25),400,fx(-10),400);\n    ctx.bezierCurveTo(fx(10),400,fx(15),395,fx(12),385); ctx.bezierCurveTo(fx(10),370,fx(15),345,fx(20),320);\n    ctx.bezierCurveTo(fx(30),280,fx(15),230,fx(25),200); ctx.bezierCurveTo(fx(35),160,fx(30),100,fx(25),40);\n    ctx.closePath(); ctx.fill(); ctx.stroke();\n    ctx.beginPath(); ctx.moveTo(fx(-15),200); ctx.lineTo(fx(12),200); ctx.lineWidth = 1.5; ctx.stroke(); return;\n  }\n  ctx.closePath(); ctx.fill(); ctx.stroke();\n}\nfunction rotulos(ctx, f) {\n  const fx = (b,v) => b + v*f;\n  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;\n  ctx.fillStyle = '#475569'; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = f === 1 ? 'right' : 'left';\n  ctx.fillText('JSF', fx(135,-50), 54); ctx.beginPath(); ctx.moveTo(fx(135,-15),60); ctx.lineTo(fx(135,-45),50); ctx.stroke();\n  ctx.fillText('VSM', fx(135,-50), 214); ctx.beginPath(); ctx.moveTo(fx(135,-22),210); ctx.lineTo(fx(135,-45),210); ctx.stroke();\n  ctx.textAlign = f === 1 ? 'left' : 'right'; ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px Arial, sans-serif';\n  ctx.fillText('JSF', fx(355,42), 59); ctx.beginPath(); ctx.moveTo(fx(355,25),58); ctx.lineTo(fx(355,38),55); ctx.stroke();\n  ctx.fillText('VSM', fx(355,42), 254); ctx.beginPath(); ctx.moveTo(fx(355,23),256); ctx.lineTo(fx(355,38),250); ctx.stroke();\n  ctx.fillStyle = '#475569'; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = f === 1 ? 'left' : 'right';\n  ctx.fillText('JSP', fx(575,35), 184); ctx.beginPath(); ctx.moveTo(fx(575,2),200); ctx.lineTo(fx(575,30),180); ctx.stroke();\n  ctx.fillText('VSP', fx(575,40), 284); ctx.beginPath(); ctx.moveTo(fx(575,5),280); ctx.lineTo(fx(575,35),280); ctx.stroke();\n}\nfunction caminhos(k, lado) { const f = flipDe(lado); return SEG_XY[k].p.map(p => p.pts.map(([x,y]) => [p.v + x*f, y])); }\nfunction segmentos(ctx, lado) {\n  const d = S.seg[lado]; ctx.lineCap = 'round'; ctx.lineJoin = 'round';\n  SEGS.forEach(k => {\n    const st = d[k]; let w = SEG_XY[k].j ? 3.5 : 2.5; if (st === 'incomp' || st === 'thrombo') w += 1.5;\n    ctx.strokeStyle = st ? COR[st] : COR.vazio; ctx.lineWidth = w;\n    caminhos(k, lado).forEach(pts => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); });\n  });\n}\nfunction calibres(ctx, lado) {\n  if (!S.mostrarCal) return;\n  const c = S.cal[lado] || {}, f = flipDe(lado);\n  ctx.font = 'bold 9.5px Arial, sans-serif'; ctx.textBaseline = 'middle';\n  SEGS.forEach(k => {\n    const v = String(c[k] || '').trim(); if (!v) return;\n    const vsp = k === 'JSP' || k.startsWith('VSP');\n    const pts = caminhos(k, lado)[0];\n    const mx = (pts[0][0] + pts[pts.length-1][0]) / 2, my = (pts[0][1] + pts[pts.length-1][1]) / 2;\n    let lx, al;\n    if (vsp) { lx = 525; al = 'right'; } else if (f === 1) { lx = 200; al = 'left'; } else { lx = 70; al = 'right'; }\n    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lx + (al === 'left' ? -3 : 3), my); ctx.stroke();\n    ctx.fillStyle = '#334155'; ctx.textAlign = al;\n    ctx.fillText(v.replace('.', ',') + (/^[\\d.,]+$/.test(v) ? ' mm' : ''), lx, my);\n  });\n  ctx.textBaseline = 'alphabetic';\n}\nfunction varizes(ctx, pts) {\n  if (!pts || pts.length < 2) return;\n  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); let acc = 0;\n  for (let i = 1; i < pts.length; i++) {\n    const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y, d = Math.hypot(dx, dy); if (!d) continue;\n    const nx = -dy/d, ny = dx/d, n = Math.max(1, Math.floor(d/3));\n    for (let j = 1; j <= n; j++) { const t = j/n; acc += d/n; const o = Math.sin(acc*.45)*5.5; ctx.lineTo(pts[i-1].x + dx*t + nx*o, pts[i-1].y + dy*t + ny*o); }\n  }\n  ctx.stroke();\n}\nfunction acao(ctx, a) {\n  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';\n  if (a.t === 'perfurante') {\n    ctx.fillStyle = a.c || COR.perfurante; ctx.beginPath(); ctx.arc(a.x, a.y, (a.w || 4) + 3, 0, 2*Math.PI); ctx.fill();\n    if (a.txt) { ctx.font = 'bold 10px Arial, sans-serif'; ctx.fillStyle = '#7f1d1d'; ctx.textBaseline = 'middle'; ctx.textAlign = a.al || 'right'; ctx.fillText(a.txt, a.x + (ctx.textAlign === 'left' ? 11 : -11), a.y); }\n  } else if (a.t === 'texto') {\n    ctx.font = 'bold 11px Arial, sans-serif'; ctx.fillStyle = COR.texto; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(a.txt || '', a.x, a.y);\n  } else if (a.t === 'varizes') {\n    ctx.strokeStyle = a.c || COR.varizes; ctx.lineWidth = a.w; varizes(ctx, a.pts);\n  } else if (a.pts && a.pts.length) {\n    ctx.strokeStyle = a.c; ctx.lineWidth = (a.t === 'f_incomp' || a.t === 'f_preto') ? a.w + 1.5 : a.w;\n    ctx.beginPath(); ctx.moveTo(a.pts[0].x, a.pts[0].y); a.pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();\n  }\n  ctx.restore();\n}\nfunction desenha(lado) {\n  const ctx = ctxDe(lado), f = flipDe(lado);\n  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);\n  ctx.save(); ctx.scale(K, K);\n  ctx.fillStyle = '#64748b'; ctx.font = 'bold 11px Arial, sans-serif'; ctx.textAlign = 'center';\n  ctx.fillText('VISTA MEDIAL', 135, 20); ctx.fillText('VISTA ANTERIOR', 355, 20); ctx.fillText('VISTA POSTERIOR', 575, 20);\n  perna(ctx, 135, 'perfil', f); perna(ctx, 355, 'anterior', f); perna(ctx, 575, 'posterior', f);\n  rotulos(ctx, f); segmentos(ctx, lado); calibres(ctx, lado);\n  ctx.restore();\n  (S.acoes[lado] || []).forEach(a => acao(ctx, a));\n}\nconst ladosAtivos = () => S.lado === 'bilateral' ? ['MID','MIE'] : [S.lado];\nfunction desenhaTudo() { desenha('MID'); desenha('MIE'); }\n\n// ===================== INTERAÇÃO NO CANVAS =====================\nfunction ponto(e, c) {\n  const r = c.getBoundingClientRect(), t = e.touches ? e.touches[0] : e;\n  return { x: (t.clientX - r.left) * W / r.width, y: (t.clientY - r.top) * H / r.height };\n}\nfunction distSeg(px, py, a, b) {\n  const dx = b[0]-a[0], dy = b[1]-a[1], L = dx*dx + dy*dy;\n  let t = L ? ((px-a[0])*dx + (py-a[1])*dy) / L : 0; t = Math.max(0, Math.min(1, t));\n  return Math.hypot(px - (a[0]+t*dx), py - (a[1]+t*dy));\n}\nfunction segNoPonto(lado, p) {\n  const x = p.x / K, y = p.y / K; let best = null, bd = 11;\n  SEGS.forEach(k => caminhos(k, lado).forEach(pts => { for (let i = 1; i < pts.length; i++) { const d = distSeg(x, y, pts[i-1], pts[i]); if (d < bd) { bd = d; best = k; } } }));\n  return best;\n}\nlet tracando = null; // { lado, a, apagou }\nconst esp = () => parseInt($('esp').value, 10) || 4;\nfunction inicio(e, lado) {\n  if (e.button > 0) return;\n  const p = ponto(e, canv[lado]);\n  if (tool.startsWith('s_')) {\n    const k = segNoPonto(lado, p); if (!k) return;\n    const st = tool.slice(2); marco();\n    S.seg[lado][k] = S.seg[lado][k] === st ? null : st; desenha(lado); return;\n  }\n  e.preventDefault();\n  if (tool === 'borracha') { marco(); tracando = { lado, apagou:false }; apaga(lado, p); return; }\n  if (tool === 'perfurante') { marco(); S.acoes[lado].push({ t:'perfurante', x:r1(p.x), y:r1(p.y), w:esp(), c:COR.perfurante }); desenha(lado); return; }\n  if (tool === 'texto') {\n    const txt = (window.prompt('Texto a inserir no desenho:', '') || '').trim(); if (!txt) return;\n    marco(); S.acoes[lado].push({ t:'texto', x:r1(p.x), y:r1(p.y), txt }); desenha(lado); return;\n  }\n  tracando = { lado, a:{ t:tool, c:COR[tool], w:esp(), pts:[{ x:r1(p.x), y:r1(p.y) }] } };\n}\nfunction move(e, lado) {\n  if (!tracando || tracando.lado !== lado) return;\n  e.preventDefault(); const p = ponto(e, canv[lado]);\n  if (tool === 'borracha') { apaga(lado, p); return; }\n  const a = tracando.a, u = a.pts[a.pts.length-1];\n  if (Math.hypot(p.x-u.x, p.y-u.y) < 1.5) return;\n  a.pts.push({ x:r1(p.x), y:r1(p.y) });\n  const ctx = ctxDe(lado); ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = a.c; ctx.lineWidth = a.w; ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();\n}\nfunction fim() {\n  if (!tracando) return; const t = tracando; tracando = null;\n  if (tool === 'borracha') { if (!t.apagou) { pilha.pop(); botoesHist(); } else rascunho(); return; }\n  if (t.a.pts.length > 1) { marco(); S.acoes[t.lado].push(t.a); }\n  desenha(t.lado);\n}\nfunction apaga(lado, p) {\n  const R = esp() * 3, L = S.acoes[lado]; let n = 0;\n  for (let i = L.length - 1; i >= 0; i--) {\n    const a = L[i]; let hit = false;\n    if (a.t === 'perfurante' || a.t === 'texto') hit = Math.hypot(a.x - p.x, a.y - p.y) <= R + 8;\n    else if (a.pts) hit = a.pts.some(q => Math.hypot(q.x - p.x, q.y - p.y) <= R);\n    if (hit) { L.splice(i, 1); n++; }\n  }\n  if (n) { tracando.apagou = true; desenha(lado); }\n}\nconst r1 = v => Math.round(v * 10) / 10;\n['MID','MIE'].forEach(l => {\n  const c = canv[l];\n  c.addEventListener('mousedown', e => inicio(e, l)); c.addEventListener('mousemove', e => move(e, l));\n  c.addEventListener('touchstart', e => inicio(e, l), { passive:false }); c.addEventListener('touchmove', e => move(e, l), { passive:false });\n});\nwindow.addEventListener('mouseup', fim); window.addEventListener('touchend', fim);\n\n// ===================== ATALHOS =====================\nconst GRUPOS = { VSM:['VSM_CxP','VSM_CxM','VSM_CxD','VSM_PnP','VSM_PnM','VSM_PnD'], VSP:['VSP_PnP','VSP_PnM','VSP_PnD'] };\ndocument.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {\n  const [alvo, st] = b.dataset.a.split(':'), v = st === 'null' ? null : st;\n  marco(); (GRUPOS[alvo] || [alvo]).forEach(k => { S.seg[abaAtalho][k] = v; }); desenha(abaAtalho);\n}));\nfunction aba(l) { if (!ladosAtivos().includes(l)) l = ladosAtivos()[0]; abaAtalho = l;\n  document.querySelectorAll('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.s === l); b.disabled = !ladosAtivos().includes(b.dataset.s); });\n  $('calLado').textContent = l; montaCal(); }\ndocument.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => aba(b.dataset.s)));\nfunction montaCal() {\n  const c = S.cal[abaAtalho] || (S.cal[abaAtalho] = {});\n  $('cal').innerHTML = SEGS.map(k => `<span>${NOME_SEG[k]}</span><input data-k=\"${k}\" inputmode=\"decimal\" value=\"${String(c[k] || '').replace(/\"/g,'')}\">`).join('');\n  $('cal').querySelectorAll('input').forEach(i => {\n    i.addEventListener('focus', () => { i.dataset.antes = i.value; });\n    i.addEventListener('change', () => { const novo = i.value.trim(); S.cal[abaAtalho][i.dataset.k] = i.dataset.antes; marco(); S.cal[abaAtalho][i.dataset.k] = novo; i.dataset.antes = novo; desenha(abaAtalho); rascunho(); });\n  });\n}\n\n// ===================== FERRAMENTAS / TOPO =====================\nfunction selTool(t) { tool = t; document.querySelectorAll('.tool').forEach(b => b.classList.toggle('on', b.dataset.t === t)); }\ndocument.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => selTool(b.dataset.t)));\ndocument.querySelectorAll('#lado button').forEach(b => b.addEventListener('click', () => { if (S.lado === b.dataset.l) return; marco(); S.lado = b.dataset.l; sincronizaUI(); }));\n$('mostrarCal').addEventListener('change', e => { S.mostrarCal = e.target.checked; desenhaTudo(); rascunho(); });\n$('obs').addEventListener('focus', () => { $('obs').dataset.antes = S.obs; });\n$('obs').addEventListener('change', () => { const novo = $('obs').value; S.obs = $('obs').dataset.antes || ''; marco(); S.obs = novo; rascunho(); });\n$('nome').addEventListener('input', () => { S.nome = $('nome').value; rascunho(); });\n$('data').addEventListener('change', () => { S.data = $('data').value; rascunho(); });\n$('bUndo').onclick = desfazer; $('bRedo').onclick = refaz;\n$('bLimpar').onclick = () => { marco(); S.seg = { MID:vazioSeg(), MIE:vazioSeg() }; S.cal = { MID:{}, MIE:{} }; S.acoes = { MID:[], MIE:[] }; S.obs = ''; sincronizaUI(); aviso('Desenho limpo (Desfazer recupera).'); };\ndocument.addEventListener('keydown', e => {\n  if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;\n  const m = e.ctrlKey || e.metaKey; if (!m) return;\n  const k = e.key.toLowerCase();\n  if (k === 'z' && !e.shiftKey) { e.preventDefault(); desfazer(); }\n  else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); refaz(); }\n});\nfunction sincronizaUI() {\n  $('nome').value = S.nome || ''; $('data').value = S.data || ''; $('obs').value = S.obs || ''; $('mostrarCal').checked = S.mostrarCal !== false;\n  document.querySelectorAll('#lado button').forEach(b => b.classList.toggle('on', b.dataset.l === S.lado));\n  $('mapMID').classList.toggle('hid', !ladosAtivos().includes('MID')); $('mapMIE').classList.toggle('hid', !ladosAtivos().includes('MIE'));\n  aba(abaAtalho); desenhaTudo(); botoesHist();\n}\nfunction aviso(t, tipo) { const m = $('msg'); m.textContent = t; m.className = tipo || ''; }\n\n// ===================== COMUNICAÇÃO COM O PACS =====================\nconst pai = (o) => parent.postMessage(Object.assign({ cv:1 }, o), '*');\nlet tRasc = null;\nfunction rascunho() { clearTimeout(tRasc); tRasc = setTimeout(() => pai({ tipo:'rascunho', estado:S }), 800); }\nfunction exportar() {\n  const imgs = {};\n  ladosAtivos().forEach(l => { const c = document.createElement('canvas'); c.width = W*DPR; c.height = H*DPR; const x = c.getContext('2d'); x.drawImage(canv[l], 0, 0); imgs[l] = c.toDataURL('image/png'); });\n  return { estado:JSON.parse(JSON.stringify(S)), imgs };\n}\nfunction validar() {\n  if (!String(S.nome || '').trim()) { aviso('Preencha o nome do paciente.', 'err'); $('nome').focus(); return false; }\n  if (!S.data) { aviso('Preencha a data do exame.', 'err'); $('data').focus(); return false; }\n  return true;\n}\nlet salvando = false;\n$('bSalvar').onclick = () => {\n  if (salvando || !validar()) return;\n  if (!meta.exa) { aviso('Esta cartografia não está ligada a um exame do PACS — use ⬇ PDF.', 'err'); return; }\n  salvando = true; $('bSalvar').disabled = true; aviso('Gerando PDF e anexando no exame…');\n  pai(Object.assign({ tipo:'salvar' }, exportar()));\n};\n$('bPDF').onclick = () => { if (!validar()) return; pai(Object.assign({ tipo:'pdf' }, exportar())); };\n$('bIA').onclick = () => {\n  if (!meta.iaOk) { aviso('Configure a chave da API do Claude em ⚙️ (barra superior) para usar o pré-desenho.', 'err'); return; }\n  if (!meta.temLaudo) { aviso('Este exame ainda não tem laudo salvo no PACS.', 'err'); return; }\n  const tem = ['MID','MIE'].some(l => S.acoes[l].length || SEGS.some(k => S.seg[l][k]));\n  if (tem && !window.confirm('Substituir o desenho atual pelo pré-desenho do laudo? (Desfazer recupera)')) return;\n  $('bIA').disabled = true; aviso('Lendo o laudo e montando o pré-desenho…');\n  pai({ tipo:'ia' });\n};\nwindow.addEventListener('message', e => {\n  if (e.source !== parent) return;\n  const m = e.data; if (!m || !m.cv) return;\n  if (m.tipo === 'carregar') {\n    meta = Object.assign(meta, m.meta || {});\n    const base = novoEstado();\n    S = Object.assign(base, m.estado || {});\n    ['MID','MIE'].forEach(l => { S.seg[l] = Object.assign(vazioSeg(), S.seg[l] || {}); S.cal[l] = S.cal[l] || {}; S.acoes[l] = Array.isArray(S.acoes[l]) ? S.acoes[l] : []; });\n    pilha = []; refazer = []; abaAtalho = ladosAtivos()[0];\n    $('bIA').disabled = !meta.temLaudo; $('bIA').title = meta.temLaudo ? 'Lê o laudo e monta um desenho pré-pronto para ajustar' : 'Disponível quando o exame tiver laudo';\n    $('bSalvar').disabled = !meta.exa;\n    sincronizaUI(); aviso(m.aviso || 'Pronto.', m.avisoTipo || '');\n  }\n  if (m.tipo === 'salvo') { salvando = false; $('bSalvar').disabled = false; aviso(m.msg, m.ok ? 'ok' : 'err'); }\n  if (m.tipo === 'msg') aviso(m.msg, m.ok ? 'ok' : (m.err ? 'err' : ''));\n  if (m.tipo === 'ia') {\n    $('bIA').disabled = false;\n    if (!m.ok) { aviso('Pré-desenho falhou: ' + m.msg, 'err'); return; }\n    try { marco(); aplicaIA(m.dados); sincronizaUI(); aviso('Pré-desenho montado a partir do laudo — confira e ajuste antes de salvar. (Desfazer volta ao anterior)', 'ok'); }\n    catch (err) { aviso('Não consegui interpretar a resposta: ' + err.message, 'err'); }\n  }\n});\n\n// ===================== PRÉ-DESENHO A PARTIR DO LAUDO =====================\n// Escala aproximada (unidades da anatomia por cm): coxa ~4,0; perna ~4,3.\n// Marcos (anatomia): prega inguinal y≈45; prega poplítea y=200; maléolo y≈360; planta y=400.\nfunction yAltura(ref, sentido, cm) {\n  const d = Number(String(cm).replace(',', '.')); if (!isFinite(d)) return null;\n  const s = sentido === 'abaixo' ? 1 : -1;\n  switch (ref) {\n    case 'prega_poplitea': case 'joelho': return 200 + s * d * (s > 0 ? 4.3 : 4.0);\n    case 'maleolo': return 360 + s * d * 4.3;\n    case 'planta': return 400 - d * 4.3;\n    case 'prega_inguinal': return 45 + d * 4.0;\n    default: return null;\n  }\n}\nconst REG_Y = { coxa:[75,185], perna:[215,345] };\nfunction xNaVSM(lado, y) { // x (anatomia) sobre o trajeto da VSM na vista medial\n  let melhor = null;\n  ['VSM_CxP','VSM_CxM','VSM_CxD','VSM_PnP','VSM_PnM','VSM_PnD'].forEach(k => { const p = caminhos(k, lado)[0]; const [a,b] = [p[0], p[p.length-1]];\n    if (y >= Math.min(a[1],b[1]) && y <= Math.max(a[1],b[1])) melhor = a[0] + (b[0]-a[0]) * ((y-a[1]) / ((b[1]-a[1]) || 1)); });\n  return melhor == null ? 135 + flipDe(lado) * -20 : melhor;\n}\nfunction posicao(lado, face, y) { // retorna x (anatomia) e alinhamento do texto\n  const f = flipDe(lado);\n  if (face === 'posterior') return { x: 575 + (y > 200 ? 3 : -10) * f, al: f === 1 ? 'right' : 'left' };\n  if (face === 'lateral') return { x: 355 - 22 * f, al: f === 1 ? 'right' : 'left' };\n  if (face === 'anterior') return { x: 355 + 2 * f, al: f === 1 ? 'right' : 'left' };\n  return { x: xNaVSM(lado, y) + 6 * f, al: f === 1 ? 'right' : 'left' }; // medial\n}\nfunction fmtNum(v) { const n = Number(String(v).replace(',', '.')); return isFinite(n) && n > 0 ? n.toFixed(1).replace('.', ',') : ''; }\nfunction aplicaIA(d) {\n  if (!d || typeof d !== 'object') throw new Error('resposta vazia');\n  if (['bilateral','MID','MIE'].includes(d.lado)) S.lado = d.lado;\n  S.seg = { MID:vazioSeg(), MIE:vazioSeg() }; S.cal = { MID:{}, MIE:{} }; S.acoes = { MID:[], MIE:[] };\n  const obs = [];\n  ['MID','MIE'].forEach(l => {\n    const m = d.membros && d.membros[l]; if (!m) return;\n    SEGS.forEach(k => { const v = m.segmentos && m.segmentos[k]; if (['comp','incomp','ausente','thrombo','hypo'].includes(v)) S.seg[l][k] = v; const c = m.calibres_mm && m.calibres_mm[k]; if (c != null && fmtNum(c)) S.cal[l][k] = fmtNum(c); else if (typeof c === 'string' && /oclu/i.test(c)) S.cal[l][k] = 'ocluída'; });\n    (m.perfurantes || []).forEach(p => {\n      if (p.competente === true) return;\n      let y = yAltura(p.referencia, p.sentido, p.distancia_cm);\n      const faixa = REG_Y[p.regiao] || REG_Y.perna;\n      if (y == null) y = (faixa[0] + faixa[1]) / 2;\n      y = Math.max(50, Math.min(380, y));\n      const pos = posicao(l, p.face, y);\n      const partes = [];\n      if (fmtNum(p.distancia_cm)) partes.push(fmtNum(p.distancia_cm) + ' cm ' + (p.sentido === 'abaixo' ? '↓' : '↑') + ({ prega_poplitea:'PP', joelho:'PP', maleolo:'MM', planta:'planta', prega_inguinal:'PI' }[p.referencia] || ''));\n      if (fmtNum(p.calibre_mm)) partes.push(fmtNum(p.calibre_mm) + ' mm');\n      S.acoes[l].push({ t:'perfurante', x:r1(pos.x * K), y:r1(y * K), w:4, c:COR.perfurante, txt:partes.join(' · '), al:pos.al });\n    });\n    (m.varizes || []).forEach(v => {\n      const fx = REG_Y[v.regiao] || REG_Y.perna, f = flipDe(l), pts = [];\n      for (let y = fx[0]; y <= fx[1]; y += 8) {\n        const x = v.face === 'posterior' ? 575 + 14 * f : v.face === 'lateral' ? 355 - 14 * f : v.face === 'anterior' ? 355 + 4 * f : xNaVSM(l, y) + 13 * f;\n        pts.push({ x:r1(x * K), y:r1(y * K) });\n      }\n      S.acoes[l].push({ t:'varizes', c:COR.varizes, w:3, pts });\n    });\n    if (m.observacao) obs.push((l === 'MID' ? 'MID: ' : 'MIE: ') + String(m.observacao).trim());\n  });\n  if (obs.length) S.obs = obs.join('\\n');\n}\n\n// início\nselTool('s_comp'); botoesHist(); sincronizaUI();\npai({ tipo:'pronto' });\n})();\n</script>\n</body>\n</html>\n";

  // ---------------- configuração (só neste computador) ----------------
  const CFG_KEY = 'cv_cfg';
  const MODELO_PADRAO = 'claude-sonnet-5-5';
  function cfg() { try { return Object.assign({ chave: '', modelo: MODELO_PADRAO, teste: false }, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { return { chave: '', modelo: MODELO_PADRAO, teste: false }; } }
  function salvaCfg(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) { /* sem armazenamento */ } }

  // ---------------- estilos ----------------
  const css = `
  .${P}-btn{display:inline-flex;align-items:center;justify-content:center;margin-right:6px;vertical-align:middle;border:1px solid #7c3aed;background:rgba(15,23,42,.85);color:#c4b5fd;
    border-radius:12px;padding:0 6px;min-width:30px;height:22px;font:700 11px -apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer;white-space:nowrap;line-height:18px}
  .${P}-btn:hover{background:#7c3aed;color:#fff}
  .${P}-btn.ok{border-color:#059669;color:#6ee7b7}
  #${P}-ov{position:fixed;inset:0;z-index:10000010;background:rgba(0,0,0,.65);display:none;align-items:center;justify-content:center}
  #${P}-ov.open{display:flex}
  #${P}-panel{width:min(1280px,98vw);height:96vh;background:#11181d;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.7);position:relative}
  #${P}-bar{display:flex;align-items:center;gap:10px;padding:6px 10px;background:#1e1b4b;color:#e0e7ff;font:600 13px -apple-system,"Segoe UI",Roboto,sans-serif}
  #${P}-bar .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #${P}-bar button{background:#3730a3;color:#fff;border:0;border-radius:6px;padding:5px 12px;font:700 12px -apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer}
  #${P}-bar button:hover{background:#4338ca}
  #${P}-frame{flex:1;border:0;width:100%;background:#f1f5f9}
  #${P}-cfg{position:absolute;top:40px;right:10px;width:360px;background:#fff;color:#1e293b;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.4);padding:12px;display:none;
    font:13px -apple-system,"Segoe UI",Roboto,sans-serif;z-index:2}
  #${P}-cfg.open{display:block}
  #${P}-cfg label{display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin:8px 0 3px}
  #${P}-cfg input[type=text],#${P}-cfg input[type=password]{width:100%;box-sizing:border-box;padding:6px;border:1px solid #cbd5e1;border-radius:6px}
  #${P}-cfg .row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
  #${P}-cfg button{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:5px 12px;font-weight:700;cursor:pointer}
  #${P}-cfg button.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}
  #${P}-cfg p{margin:6px 0 0;font-size:11px;color:#64748b}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------------- acesso ao PACS ----------------
  const H = () => ({ 'x-access-token': localStorage.getItem('lwtoken') || '', 'Content-Type': 'application/json' });
  async function apiGet(path) {
    const r = await fetch(API + path, { headers: H() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  function grid() {
    const t = document.querySelector('.v-main .v-data-table');
    let v = t && t.__vue__;
    for (let i = 0; v && i < 15; i++, v = v.$parent) if (Array.isArray(v.exames)) return v;
    const app = document.querySelector('#app'); const root = app && app.__vue__; if (!root) return null;
    let g = null;
    (function walk(x) { if (!x || g) return; if (x.$options && x.$options.name === 'GridExames') g = x; (x.$children || []).forEach(walk); })(root);
    return g;
  }
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ').trim();
  const mod = e => String(e && e.tipoexame && e.tipoexame.modalidade && e.tipoexame.modalidade.mod_sigla || '').toUpperCase();
  // Doppler venoso de membro inferior (no PACS: "DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR UNILATERAL") — pelo NOME, não pelo código
  function ehDopplerVenosoMMII(e) {
    const d = norm(e && e.tipoexame && e.tipoexame.tpe_descricao);
    return mod(e) === 'US' && /doppler|duplex/.test(d) && /venos/.test(d) && /membros? inferior|mmii|\bmid\b|\bmie\b/.test(d);
  }
  const ehTeste = e => /\bteste\b/.test(norm(e && e.paciente && e.paciente.pac_nome));
  // o código é sempre unilateral (há um por lado) → o botão só aparece no exame que tem IMAGEM
  const elegivel = e => !!(e && e.exa_idnexecutadopacs && (ehDopplerVenosoMMII(e) || (cfg().teste && ehTeste(e) && mod(e) === 'US')));

  // ---------------- anexos ----------------
  async function listaAnexos(exa) {
    const j = await apiGet('/arquivo/exame/' + exa);
    const arr = Array.isArray(j) ? j : (j && Array.isArray(j.rows) ? j.rows : (j && j.arq_codigo ? [j] : []));
    return arr;
  }
  const ehCartografia = a => a && String(a.arq_nomeoriginal || '').startsWith(PREFIXO_ANEXO) && /\.pdf$/i.test(a.arq_nomeoriginal || '');
  async function exameConferido(exa, pac) {
    const ex = await apiGet('/exame/' + exa);
    if (pac && ex.pac_codigo !== pac) throw new Error('paciente do exame não confere — nada foi anexado');
    return ex;
  }
  async function anexarPDF(exa, pac, nome, dataUri) {
    await exameConferido(exa, pac);
    const r = await fetch(API + '/arquivo', { method: 'POST', headers: H(), body: JSON.stringify([{ arq_codigo: 0, arq_blob: dataUri, arq_nomeoriginal: nome, exa_codigo: exa, arq_tipoarquivo: 'ARQUIVO' }]) });
    const txt = await r.text();
    if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 || r.status === 403 ? ' (usuário sem permissão para anexar)' : '') + ' ' + txt.slice(0, 100));
    // confere na releitura
    const lista = await listaAnexos(exa);
    if (!lista.some(a => a.arq_nomeoriginal === nome)) throw new Error('o PACS aceitou o envio, mas o anexo não apareceu na releitura');
  }

  // ---------------- estado embutido no PDF (para reabrir em qualquer computador) ----------------
  // O desenho vai comprimido (deflate) + base64 em chaves extras do dicionário de informações do PDF (/Cv0, /Cv1…).
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  async function comprimir(obj) {
    const dados = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'undefined') return 'J' + b64(dados);
    const buf = await new Response(new Blob([dados]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
    return 'Z' + b64(new Uint8Array(buf));
  }
  async function descomprimir(s) {
    const tipo = s[0], bin = atob(s.slice(1)), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (tipo === 'J') return JSON.parse(new TextDecoder().decode(bytes));
    const txt = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).text();
    return JSON.parse(txt);
  }
  async function estadoDoPDF(dataUri) {
    const m = String(dataUri || '').match(/base64,(.*)$/); if (!m) return null;
    const bin = atob(m[1]);
    const partes = []; const re = /\/Cv(\d+) \(([A-Za-z0-9+/=]+)\)/g; let x;
    while ((x = re.exec(bin))) partes[+x[1]] = x[2];
    if (!partes.length) { const k = bin.match(/CVSTATE1:([A-Za-z0-9+/=]+)/); if (k) partes[0] = k[1]; }
    if (!partes.length || partes.some(p => p == null)) return null;
    return descomprimir(partes.join(''));
  }

  // ---------------- rascunho local (sem nome do paciente) ----------------
  const RASC = exa => 'cv_rasc_' + exa;
  function guardaRascunho(exa, estado) {
    if (!exa) return;
    try { const e = Object.assign({}, estado); delete e.nome; localStorage.setItem(RASC(exa), JSON.stringify({ ts: Date.now(), estado: e })); } catch (err) { /* cheio */ }
  }
  function leRascunho(exa) { try { return JSON.parse(localStorage.getItem(RASC(exa)) || 'null'); } catch (e) { return null; } }
  function limpaRascunhosVelhos() {
    try { Object.keys(localStorage).filter(k => k.startsWith('cv_rasc_')).forEach(k => { const r = JSON.parse(localStorage.getItem(k) || '{}'); if (!r.ts || Date.now() - r.ts > 15 * 864e5) localStorage.removeItem(k); }); } catch (e) { /* ok */ }
  }

  // ---------------- texto do laudo ----------------
  function textoLaudo(ex) {
    const html = ex && ex.laudo && ex.laudo.lau_laudo; if (!html) return '';
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    doc.querySelectorAll('p,br,li,h1,h2,h3,h4,tr,div').forEach(n => n.append('\n'));
    doc.querySelectorAll('td,th').forEach(n => n.append(' | '));
    let t = doc.body.textContent || '';
    // não envia o nome do paciente para fora do PACS
    String(ex.paciente && ex.paciente.pac_nome || '').split(/\s+/).filter(w => w.length > 2).forEach(w => { t = t.split(w).join('[PACIENTE]'); });
    return t.replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
  }

  // ---------------- PDF (jsPDF, A4 vetorial + desenhos) ----------------
  const fmtBR = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const LADO_TXT = { bilateral: 'Bilateral', MID: 'MID', MIE: 'MIE' };
  async function gerarPDF(estado, imgs) {
    const ns = window.jspdf || (typeof jspdf !== 'undefined' ? jspdf : null);
    if (!ns || !ns.jsPDF) throw new Error('biblioteca jsPDF não carregou');
    const doc = new ns.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const PW = 210, PH = 297, M = 12, W = PW - 2 * M, AZUL = [56, 91, 140];
    let y = M;
    // cabeçalho
    [[5, 1.5, 0.7, '#4fd1c5'], [2.5, 2.5, 0.9, '#4fd1c5'], [7.5, 2.5, 0.6, '#4fd1c5'], [1.5, 5, 1.1, '#3b82f6'], [8.5, 5, 0.8, '#4fd1c5'], [2.5, 7.5, 0.7, '#3730a3'], [7.5, 7.5, 0.5, '#3b82f6'], [5, 8.5, 0.9, '#3730a3']]
      .forEach(([cx, cy, r, c]) => { doc.setFillColor(c); doc.circle(M + cx, y + cy, r, 'F'); });
    doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('L A D I', M + 12.5, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(92, 133, 181); doc.text('LAB. ANÁLISES E DIAG. POR IMAGENS', M + 12.5, y + 8.6);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('HOSPITAL ANTÔNIO MOREIRA DA COSTA', PW - M, y + 3, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2);
    doc.text('CNPJ: 24.492.324/0001-52 | Tel: (35) 3473-7200', PW - M, y + 6.2, { align: 'right' });
    doc.text('RUA CEL. JOAQUIM NETO 186, SANTA RITA DO SAPUCAÍ - MG', PW - M, y + 9.2, { align: 'right' });
    y += 12; doc.setDrawColor(...AZUL); doc.setLineWidth(0.6); doc.line(M, y, PW - M, y); y += 5.5;
    // título
    const titulo = estado.lado === 'MID' ? 'ULTRASSONOGRAFIA DOPPLER VENOSO DO MEMBRO INFERIOR DIREITO - CARTOGRAFIA'
      : estado.lado === 'MIE' ? 'ULTRASSONOGRAFIA DOPPLER VENOSO DO MEMBRO INFERIOR ESQUERDO - CARTOGRAFIA'
        : 'ULTRASSONOGRAFIA DOPPLER VENOSO DOS MEMBROS INFERIORES - CARTOGRAFIA';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(30, 41, 59); doc.text(titulo, PW / 2, y, { align: 'center' }); y += 3.5;
    // identificação
    doc.setFillColor(248, 250, 252); doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.25); doc.rect(M, y, W, 7.5, 'FD');
    doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold'); doc.text('NOME:', M + 3, y + 5); doc.setFont('helvetica', 'normal');
    doc.text(String(estado.nome || '').toUpperCase().slice(0, 70), M + 15, y + 5);
    doc.setFont('helvetica', 'bold'); doc.text('DATA:', PW - M - 31, y + 5); doc.setFont('helvetica', 'normal'); doc.text(fmtBR(estado.data), PW - M - 3, y + 5, { align: 'right' });
    y += 11;
    // reservas do rodapé
    const obs = String(estado.obs || '').trim();
    doc.setFontSize(8.2);
    const obsLinhas = obs ? doc.splitTextToSize(obs, W - 6) : [];
    const hObs = obsLinhas.length ? 6 + obsLinhas.length * 3.6 : 0;
    const hLeg = 12, hRod = 25;
    const lados = estado.lado === 'bilateral' ? ['MID', 'MIE'] : [estado.lado];
    const disp = PH - M - hRod - hLeg - hObs - 4 - y;
    const porImg = disp / lados.length - 6;
    let ih = Math.min(porImg, W * 460 / 800), iw = ih * 800 / 460;
    if (iw > W) { iw = W; ih = iw * 460 / 800; }
    lados.forEach(l => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(l === 'MID' ? 'MEMBRO INFERIOR DIREITO (MID)' : 'MEMBRO INFERIOR ESQUERDO (MIE)', M, y + 3);
      doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(M, y + 4.2, PW - M, y + 4.2);
      y += 5.5;
      if (imgs[l]) doc.addImage(imgs[l], 'PNG', M + (W - iw) / 2, y, iw, ih, undefined, 'FAST');
      y += ih + 1;
    });
    // legenda
    y += 2;
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.25); doc.rect(M, y, W, hLeg - 1.5);
    const itens = [['Competente', [37, 99, 235], 0.6], ['Incompetente', [220, 38, 38], 1.2], ['Ausente', [71, 85, 105], 0.6], ['Trombose', [0, 0, 0], 1.2], ['Hipoplásica', [203, 213, 225], 0.6]];
    let x = M + 3; doc.setFontSize(7.5); doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold'); doc.text('PADRÃO VISUAL:', x, y + 4); x += doc.getTextWidth('PADRÃO VISUAL:') + 3; doc.setFont('helvetica', 'normal');
    itens.forEach(([t, c, lw]) => { doc.setDrawColor(...c); doc.setLineWidth(lw); doc.line(x, y + 3.2, x + 5, y + 3.2); doc.text(t, x + 6.2, y + 4); x += 8 + doc.getTextWidth(t) + 3; });
    doc.setFillColor(220, 38, 38); doc.circle(x + 1.2, y + 3.1, 1.1, 'F'); doc.text('Perfurante inc.', x + 3.2, y + 4); x += 5 + doc.getTextWidth('Perfurante inc.') + 3;
    doc.setTextColor(124, 58, 237); doc.setFont('helvetica', 'bold'); doc.text('~~~', x, y + 4); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'normal'); doc.text('Varizes', x + 6, y + 4);
    doc.setFont('helvetica', 'bold'); doc.text('ANATOMIA:', M + 3, y + 8.3); doc.setFont('helvetica', 'normal');
    doc.text('JSF – junção safeno-femoral   ·   JSP – junção safeno-poplítea   ·   VSM – veia safena magna   ·   VSP – veia safena parva', M + 19, y + 8.3);
    y += hLeg;
    if (obsLinhas.length) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.text('OBSERVAÇÕES:', M, y + 3);
      doc.setFont('helvetica', 'normal'); doc.text(obsLinhas, M + 3, y + 6.6, { lineHeightFactor: 1.25 });
      y += hObs;
    }
    // rodapé
    const yr = PH - M - 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
    doc.text('SANTA RITA DO SAPUCAÍ, ' + fmtBR(estado.data), M, yr - 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(100, 116, 139);
    doc.text('Obs: Exame complementar, valorizar mediante correlação com dados clínicos.', M, yr);
    const cx = PW - M - 30;
    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(cx - 30, yr - 9, cx + 30, yr - 9);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('DR. GABRIEL GASPAR', cx, yr - 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('CRM-MG 69042 / RQE 51492', cx, yr - 2.4, { align: 'center' }); doc.text('MÉDICO RADIOLOGISTA', cx, yr + 0.7, { align: 'center' });
    // estado do desenho (para reabrir)
    doc.setProperties({ title: 'Cartografia venosa MMII', creator: 'PACS LADI - Cartografia Venosa ' + VERSAO });
    try {
      const est = Object.assign({}, estado); delete est.nome;
      const s = await comprimir(est);
      const props = doc.__private__ && doc.__private__.getDocumentProperties ? doc.__private__.getDocumentProperties() : null;
      if (props) { for (let i = 0, n = 0; i < s.length; i += 30000, n++) props['cv' + n] = s.slice(i, i + 30000); }
      else doc.setProperties({ keywords: 'CVSTATE1:' + s });
    } catch (e) { console.warn('[Cartografia] estado não embutido', e); }
    return 'data:application/pdf;base64,' + doc.output('datauristring').split('base64,')[1];
  }
  function nomeArquivo(estado) {
    const d = fmtBR(estado.data).replace(/\//g, '-'), a = new Date();
    return `${PREFIXO_ANEXO} ${LADO_TXT[estado.lado] || ''} ${d} ${String(a.getHours()).padStart(2, '0')}${String(a.getMinutes()).padStart(2, '0')}.pdf`.replace(/\s+/g, ' ');
  }
  function baixar(dataUri, nome) {
    const bin = atob(dataUri.split('base64,')[1]), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // ---------------- pré-desenho pelo laudo (API do Claude) ----------------
  const SEGS = ['JSF', 'VSM_CxP', 'VSM_CxM', 'VSM_CxD', 'VSM_PnP', 'VSM_PnM', 'VSM_PnD', 'JSP', 'VSP_PnP', 'VSP_PnM', 'VSP_PnD'];
  const MEMBRO_SCHEMA = {
    type: 'object',
    properties: {
      segmentos: { type: 'object', description: 'Estado de cada segmento superficial. comp=competente/sem refluxo; incomp=refluxo/insuficiente/incompetente; ausente=ausente, safenectomia, ablação ou não caracterizada; thrombo=trombose/tromboflebite/ocluída; hypo=hipoplásica; nd=não descrito.',
        properties: Object.fromEntries(SEGS.map(k => [k, { type: 'string', enum: ['comp', 'incomp', 'ausente', 'thrombo', 'hypo', 'nd'] }])) },
      calibres_mm: { type: 'object', description: 'Calibre em mm (número) de cada segmento, quando informado (ex.: tabela de calibres). Use o texto "ocluído" se a tabela disser ocluído. Omita o que não foi informado.',
        properties: Object.fromEntries(SEGS.map(k => [k, { type: ['number', 'string'] }])) },
      perfurantes: { type: 'array', description: 'Cada veia perfurante descrita individualmente (não incluir frases genéricas como "perfurantes competentes").',
        items: { type: 'object', properties: {
          face: { type: 'string', enum: ['medial', 'lateral', 'anterior', 'posterior'] },
          regiao: { type: 'string', enum: ['coxa', 'perna'] },
          referencia: { type: 'string', enum: ['prega_poplitea', 'maleolo', 'prega_inguinal', 'planta', 'indefinida'] },
          sentido: { type: 'string', enum: ['acima', 'abaixo'] },
          distancia_cm: { type: 'number' }, calibre_mm: { type: 'number' }, competente: { type: 'boolean' }
        }, required: ['regiao', 'competente'] } },
      varizes: { type: 'array', description: 'Varizes/tributárias insuficientes por região e face.',
        items: { type: 'object', properties: { regiao: { type: 'string', enum: ['coxa', 'perna'] }, face: { type: 'string', enum: ['medial', 'lateral', 'anterior', 'posterior'] } }, required: ['regiao'] } },
      observacao: { type: 'string', description: 'Até 140 caracteres, só achados relevantes que NÃO entram no desenho (ex.: TVP, refluxo do sistema profundo). Vazio se nada.' }
    },
    required: ['segmentos']
  };
  const TOOL = {
    name: 'cartografia', description: 'Registra os achados do laudo de Doppler venoso de MMII de forma estruturada para desenhar a cartografia.',
    input_schema: { type: 'object', properties: { lado: { type: 'string', enum: ['bilateral', 'MID', 'MIE'], description: 'Membros descritos no laudo.' }, membros: { type: 'object', properties: { MID: MEMBRO_SCHEMA, MIE: MEMBRO_SCHEMA } } }, required: ['lado', 'membros'] }
  };
  const SISTEMA = `Você extrai dados de laudos de ultrassonografia Doppler venoso de membros inferiores (português do Brasil) para desenhar uma cartografia venosa. Use SOMENTE o que está escrito no laudo; nunca invente.
Segmentos: JSF (junção safeno-femoral); VSM coxa: VSM_CxP (terço proximal), VSM_CxM (médio), VSM_CxD (distal); VSM perna: VSM_PnP, VSM_PnM, VSM_PnD; JSP (junção safeno-poplítea); VSP (safena parva, na perna): VSP_PnP, VSP_PnM, VSP_PnD.
Regras: frase sobre a veia inteira ("competente em toda a extensão", "refluxo em toda a extensão da perna") vale para todos os segmentos citados. "Refluxo no terço proximal da coxa, com preservação dos terços médio e distal" → CxP incomp, CxM e CxD comp. Safenectomia/ablação/ausente → ausente. Trombose ou tromboflebite com oclusão → thrombo. Junção "competente"/"sem refluxo" → comp. Se a tabela de calibres traz só "proximal" e "distal", preencha esses e deixe o médio sem calibre.
Perfurantes: liste cada uma descrita, com face (medial/lateral/anterior/posterior), região (coxa/perna), referência e distância ("10 cm acima da prega poplítea" → prega_poplitea, acima, 10; "acima do maléolo medial" → maleolo; "abaixo da prega inguinal" → prega_inguinal, abaixo), calibre em mm e competente=false se incompetente/com refluxo.
Sistema profundo não é desenhado: resuma achados relevantes dele (TVP, refluxo profundo) em "observacao", curto. Membro não descrito no laudo: não inclua.`;
  async function chamarClaude(texto) {
    const c = cfg(); if (!c.chave) throw new Error('chave da API não configurada (⚙️)');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': c.chave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: c.modelo || MODELO_PADRAO, max_tokens: 4096, system: SISTEMA, tools: [TOOL], tool_choice: { type: 'tool', name: 'cartografia' },
        messages: [{ role: 'user', content: 'Laudo:\n\n' + texto }] })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('API ' + r.status + ' ' + ((j.error && j.error.message) || '').slice(0, 140));
    const blk = (j.content || []).find(b => b.type === 'tool_use');
    if (!blk) throw new Error('a API não devolveu os dados estruturados');
    return blk.input;
  }

  // ---------------- janela ----------------
  let ov, frame, titleEl, cfgEl, atual = null, ready = false, pendente = null;
  function montarOverlay() {
    if (ov) return;
    ov = document.createElement('div'); ov.id = P + '-ov';
    ov.innerHTML = `<div id="${P}-panel"><div id="${P}-bar"><span class="t">Cartografia Venosa — MMII</span>
      <span style="opacity:.6;font-weight:500">v${VERSAO}</span><button type="button" id="${P}-gear" title="Configurações">⚙️</button><button type="button" id="${P}-close">Fechar ✕</button></div>
      <iframe id="${P}-frame" title="Cartografia Venosa MMII"></iframe>
      <div id="${P}-cfg">
        <b>Configurações deste computador</b>
        <label>Chave da API do Claude (pré-desenho pelo laudo)</label><input type="password" id="${P}-chave" placeholder="sk-ant-..." autocomplete="off">
        <label>Modelo</label><input type="text" id="${P}-modelo">
        <label style="text-transform:none;font-weight:600;color:#334155"><input type="checkbox" id="${P}-teste"> Modo teste: mostrar o botão também nos US de pacientes TESTE</label>
        <p>A chave fica só neste navegador. O laudo é enviado à API sem o nome do paciente.</p>
        <div class="row"><button type="button" id="${P}-cfgx">Cancelar</button><button type="button" class="pri" id="${P}-cfgok">Salvar</button></div>
      </div></div>`;
    document.body.appendChild(ov);
    frame = ov.querySelector('#' + P + '-frame'); titleEl = ov.querySelector('.t'); cfgEl = ov.querySelector('#' + P + '-cfg');
    ov.querySelector('#' + P + '-close').onclick = fechar;
    ov.querySelector('#' + P + '-gear').onclick = () => {
      const c = cfg(); ov.querySelector('#' + P + '-chave').value = c.chave; ov.querySelector('#' + P + '-modelo').value = c.modelo; ov.querySelector('#' + P + '-teste').checked = !!c.teste;
      cfgEl.classList.toggle('open');
    };
    ov.querySelector('#' + P + '-cfgx').onclick = () => cfgEl.classList.remove('open');
    ov.querySelector('#' + P + '-cfgok').onclick = () => {
      salvaCfg({ chave: ov.querySelector('#' + P + '-chave').value.trim(), modelo: ov.querySelector('#' + P + '-modelo').value.trim() || MODELO_PADRAO, teste: ov.querySelector('#' + P + '-teste').checked });
      cfgEl.classList.remove('open');
      if (atual) para({ tipo: 'msg', msg: 'Configurações salvas. Reabra a cartografia para aplicar.', ok: true });
    };
  }
  const para = o => { if (frame && frame.contentWindow) frame.contentWindow.postMessage(Object.assign({ cv: 1 }, o), '*'); };
  async function abrir(item) {
    montarOverlay(); limpaRascunhosVelhos();
    atual = { exa: item.exa_codigo, pac: item.pac_codigo, ex: null }; ready = false; pendente = null;
    titleEl.textContent = `Cartografia Venosa — ${item.paciente ? item.paciente.pac_nome : ''} · ${fmtBR(item.exa_data)}`;
    frame.srcdoc = APP_HTML; ov.classList.add('open');
    const exa = item.exa_codigo;
    try {
      const ex = await apiGet('/exame/' + exa);
      if (!atual || atual.exa !== exa) return;
      atual.ex = ex;
      const base = { nome: (ex.paciente && ex.paciente.pac_nome) || '', data: String(ex.exa_data || '').slice(0, 10) };
      let estado = null, aviso = 'Nome e data puxados do exame. Escolha Bilateral / Só MID / Só MIE e desenhe.', tipo = '';
      try {
        const anexos = (await listaAnexos(exa)).filter(ehCartografia).sort((a, b) => String(b.arq_created).localeCompare(String(a.arq_created)) || b.arq_codigo - a.arq_codigo);
        if (anexos[0]) {
          const e = await estadoDoPDF(anexos[0].arq_blob);
          if (e) { estado = e; const q = new Date(anexos[0].arq_created); aviso = `Reaberta a cartografia anexada em ${q.toLocaleDateString('pt-BR')} ${q.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${anexos.length} versão(ões) no exame). Ao salvar, uma nova versão é anexada.`; tipo = 'ok'; }
        }
      } catch (err) { console.warn('[Cartografia] anexos', err); }
      const r = leRascunho(exa);
      if (r && r.estado && (!estado || r.ts > (estado.salvoEm || 0))) { estado = r.estado; aviso = 'Rascunho recuperado deste computador (ainda não anexado).'; tipo = ''; }
      estado = Object.assign({}, estado || {}, { nome: (estado && estado.nome) || base.nome, data: (estado && estado.data) || base.data });
      let temLaudo = textoLaudo(ex).length > 80;
      if (!temLaudo) {
        // laudo pode estar no código do outro lado (mesmo paciente/dia)
        const g = grid(); const irmao = (g && g.exames || []).find(o => o.exa_codigo !== exa && o.pac_codigo === ex.pac_codigo && o.exa_data === ex.exa_data && ehDopplerVenosoMMII(o));
        if (irmao) { try { const ex2 = await apiGet('/exame/' + irmao.exa_codigo); if (textoLaudo(ex2).length > 80) { atual.laudoDe = ex2; temLaudo = true; } } catch (e) { /* ok */ } }
      }
      pendente = { tipo: 'carregar', estado, aviso, avisoTipo: tipo, meta: { exa, temLaudo, iaOk: !!cfg().chave } };
      enviar();
    } catch (err) {
      pendente = { tipo: 'carregar', estado: { nome: (item.paciente && item.paciente.pac_nome) || '', data: String(item.exa_data || '').slice(0, 10) }, aviso: 'Não consegui ler o exame no PACS (' + err.message + '). Dá para desenhar e baixar o PDF.', avisoTipo: 'err', meta: { exa, temLaudo: false, iaOk: false } };
      enviar();
    }
  }
  function enviar() { if (ready && pendente) { para(pendente); pendente = null; } }
  function fechar() { if (!ov) return; ov.classList.remove('open'); cfgEl.classList.remove('open'); frame.srcdoc = ''; atual = null; }
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && ov && ov.classList.contains('open')) { if (cfgEl.classList.contains('open')) cfgEl.classList.remove('open'); else fechar(); } }, true);

  const salvos = new Set();
  window.addEventListener('message', async e => {
    if (!frame || e.source !== frame.contentWindow) return;
    const m = e.data; if (!m || !m.cv) return;
    if (m.tipo === 'pronto') { ready = true; enviar(); return; }
    if (!atual) return;
    if (m.tipo === 'rascunho') { guardaRascunho(atual.exa, m.estado); return; }
    if (m.tipo === 'pdf') {
      try { const uri = await gerarPDF(m.estado, m.imgs || {}); baixar(uri, nomeArquivo(m.estado)); para({ tipo: 'msg', msg: 'PDF baixado neste computador (não foi anexado).', ok: true }); }
      catch (err) { para({ tipo: 'msg', msg: 'Falha ao gerar o PDF: ' + err.message, err: true }); }
      return;
    }
    if (m.tipo === 'salvar') {
      const exa = atual.exa;
      try {
        m.estado.salvoEm = Date.now();
        const nome = nomeArquivo(m.estado);
        const uri = await gerarPDF(m.estado, m.imgs || {});
        await anexarPDF(exa, atual.pac, nome, uri);
        try { localStorage.removeItem(RASC(exa)); } catch (x) { /* ok */ }
        salvos.add(exa);
        para({ tipo: 'salvo', ok: true, msg: `✔ Anexado no exame: "${nome}". A recepção já pode imprimir pelo clipe 📎.` });
        const g = grid(); if (g && typeof g.getExames === 'function') { try { g.getExames(); } catch (x) { /* ok */ } }
      } catch (err) { para({ tipo: 'salvo', ok: false, msg: '✖ Não anexou: ' + err.message + ' — use ⬇ PDF e anexe manualmente.' }); }
      return;
    }
    if (m.tipo === 'ia') {
      try {
        const ex = atual.laudoDe || atual.ex || await apiGet('/exame/' + atual.exa);
        const texto = textoLaudo(ex);
        if (texto.length < 80) throw new Error('laudo vazio');
        const dados = await chamarClaude(texto.slice(0, 20000));
        para({ tipo: 'ia', ok: true, dados });
      } catch (err) { para({ tipo: 'ia', ok: false, msg: err.message }); }
    }
  });

  // ---------------- botão nas linhas da lista ----------------
  const fmtData = iso => fmtBR(iso);
  function botoesLinhas() {
    if (/\/viewer/.test(location.pathname)) return;
    const g = grid(); if (!g || !Array.isArray(g.exames)) return;
    const t = g.$el && g.$el.querySelector('.v-data-table') || document.querySelector('.v-main .v-data-table');
    if (!t) return;
    const ths = [...t.querySelectorAll('thead tr:first-child > th')].map(th => norm(th.innerText));
    const iSit = ths.indexOf('situacao'); if (iSit < 0) return;
    const iData = ths.indexOf('data'), iHora = ths.indexOf('hora');
    const rows = [...t.querySelectorAll('tbody tr')].filter(r => r.children.length === ths.length);
    rows.forEach((r, i) => {
      const item = g.exames[i], cell = r.children[iSit];
      let btn = cell.querySelector('.' + P + '-btn');
      // confere a linha com o item (quando as colunas Data/Hora existem neste computador)
      const okRow = item && rows.length === g.exames.length
        && (iData < 0 || r.children[iData].textContent.trim() === fmtData(item.exa_data))
        && (iHora < 0 || r.children[iHora].textContent.trim().slice(0, 5) === String(item.exa_hora || '').slice(0, 5));
      if (!okRow || !elegivel(item)) { if (btn) btn.remove(); return; }
      if (!btn) {
        btn = document.createElement('button'); btn.type = 'button'; btn.className = P + '-btn';
        btn.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); const gg = grid(); const it = gg && gg.exames.find(x => x.exa_codigo === +btn.dataset.exa); if (it) abrir(it); });
        cell.insertBefore(btn, cell.firstChild);
      }
      btn.dataset.exa = item.exa_codigo;
      const ok = salvos.has(item.exa_codigo);
      btn.classList.toggle('ok', ok);
      btn.textContent = ok ? '🦵 CV ✓' : '🦵 CV';
      btn.title = ok ? 'Cartografia venosa anexada nesta sessão (reabrir para revisar)' : 'Abrir a cartografia venosa (desenho) deste exame';
    });
  }
  // gancho de testes automatizados (sem efeito no uso normal)
  if (window.__CV_TEST__) { window.__CV_TEST__.api = { gerarPDF, estadoDoPDF, textoLaudo, elegivel, ehDopplerVenosoMMII, nomeArquivo, abrir, listaAnexos }; if (window.__CV_TEST__.semTimers) return; }
  setInterval(() => { if (document.body) botoesLinhas(); }, 1200);
})();
