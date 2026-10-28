# PACS LADI — userscripts (Tampermonkey)

Scripts de interface para o PACS Laudo Web. Contêm **apenas código** — nenhum dado de paciente, chave ou credencial
(as credenciais ficam só no navegador de cada computador).

| Script | O que faz | Instalar / atualizar |
|---|---|---|
| PACS Plus | Ajustes visuais, pesquisa rápida, calculadoras, prazos, avisos de urgência e de chegada do 1º paciente de US | https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-plus.user.js |
| Agenda Operacional | Agenda integrada ao PACS, sincronização em nuvem, no-show | https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/pacs-agenda.user.js |
| Cartografia Venosa MMII | Desenho do Doppler venoso de MMII com PDF anexado ao exame | https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/cartografia-venosa.user.js |
| Contador de Anexos | Número de anexos no clipe 📎 da lista de exames | https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/contador-anexos.user.js |
| Anamnese TC (HAMC) | Ficha de anamnese de TC: botão 📋 nas linhas de TC, grava contraste, resumo e PDF no exame | https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/anamnese-tc.user.js |
| WhatsApp Web — Suíte | Reescrever/responder com IA (Gemini), transcrição de áudio, agenda Outlook/Google, lembretes, mensagens apagadas, layout compacto, fixadas extras, privacidade | https://raw.githubusercontent.com/Gaspar-Radio/pacs-plus/main/whatsapp-suite.user.js |

O Tampermonkey verifica novas versões automaticamente (`@updateURL`).

## App da Agenda para iPhone
Pasta `app/` (PWA), servida em https://gaspar-radio.github.io/pacs-plus/app/ — sem dados nem credenciais no código; exige login.
