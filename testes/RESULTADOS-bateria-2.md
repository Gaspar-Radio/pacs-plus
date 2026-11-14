# Bateria 2 — resultados (13/11/2026)

48 laudos fictícios (`bateria-2.js`): 24 com um erro sutil, 24 corretos com armadilhas de falso alarme.
Pedidos gerados do PACS Plus 1.54.1 (`bateria-2-pedidos.txt`), uma rodada, pelo ia-proxy 21, PC Windows de casa.

## Triagem (modelos de decisão, mesmas perguntas)

| Corte | Medida | Jev | Luna | Gemini Decision | Voto 2 de 3 |
|---|---|---|---|---|---|
| 0,5 | erro pego na pergunta certa | 23/24 | 23/24 | 24/24 | 24/24 |
| 0,5 | laudos corretos com alarme | 12/24 | 2/24 | 5/24 | 3/24 (201, 214, 216) |
| 0,7 | erro pego na pergunta certa | 22/24 | 22/24 | 22/24 | 22/24 (perdeu 105, 123) |
| 0,7 | laudos corretos com alarme | 6/24 | 1/24 | 2/24 | 2/24 (201, 214) |
| 0,9 | erro pego na pergunta certa | 20/24 | 22/24 | 21/24 | 21/24 |
| 0,9 | laudos corretos com alarme | 0/24 | 1/24 | 0/24 | 0/24 |
| 0,7 | perguntas extras acesas nos 24 laudos com erro | 50 | 72 | 39 | 50 |

Tempo mediano (máximo): Jev 0,28 s (0,50) · Luna 0,43 s (1,14) · Gemini Decision 1,01 s (1,13).
Falsos alarmes do Jev com corte 0,7: quase todos "achado omitido" (201, 209, 217, 220), como no uso real.

## Parecer do Argon (gemini-4-argon, raciocínio médio, instrução de Master)

- Laudos com erro: 24/24 com o erro plantado apontado (lidos um a um), 26 achados no total (1 por erro; 2 em 119 e 120).
- Laudos corretos: 22/24 sem achado. 215 e 217 receberam 3 observações de nível "atenção", defensáveis
  (ateromatose "bilateral" com placa descrita só à direita; padrão do serviço para resíduo; trabeculação fora da impressão).
- Tempo mediano 6,3 s, máximo 24,9 s. Cerca de 2,2 mil tokens de entrada e 100 de saída por laudo.

## Leitura

- Triagem com corte 0,5 e voto 2 de 3 como porta de entrada: 24/24 laudos com erro acionariam o parecer; 3/24 corretos também,
  e nesses três o Argon não apontou nada. Resultado do conjunto nesta bateria: 24/24 erros, nenhum alarme indevido.
- Os modelos de decisão sozinhos geram muito ruído (39 a 72 perguntas extras); o Argon devolve um achado por erro.
- Limites: uma rodada; laudos escritos para o teste; conferência do Argon feita por leitura, não por regra automática.
