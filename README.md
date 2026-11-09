# URIP — Urban Risk Intelligence Platform

Protótipo funcional da **Global Solution 2026.2 · Engenharia de Software (CitizenTech)**.
Plataforma de monitoramento e alerta de riscos urbanos (alagamentos, ilhas de calor e interrupções de energia, água e transporte) que mostra, em todas as telas, **a origem e o nível de confiança de cada dado**.

> Todos os dados são **simulados** (bairros, sensores e ocorrências fictícios).

## Integrantes
| Nome completo | RM |
|---|---|
| Ana Clara Silveira Salvatico | 555389 |
| Fernanda Pereira Molina Teixeira | 552587 |
| Vinicius Eiki Franca | 555150 |

## Links
- Protótipo (deploy): <https://anasalvatico.github.io/urip-urban-risk-platform/>
- Repositório: <https://github.com/anasalvatico/urip-urban-risk-platform>
- Vídeo de demonstração: <https://youtu.be/0Vn2jyf10r8>
- Documentação: [`docs/URIP_Documentacao_GS2026.2.pdf`](docs/URIP_Documentacao_GS2026.2.pdf)

## Como executar
Não há instalação nem build. Opções:
1. Abrir `index.html` no navegador; **ou**
2. Na pasta do projeto: `python3 -m http.server 8000` e acessar <http://localhost:8000>.

**Deploy no GitHub Pages:** Settings → Pages → Branch `main`, pasta `/ (root)`.

## Telas (12)
T01 Entrada e consentimento LGPD · T02 Painel (mapa) · T03 Lista de alertas · T04 Detalhe do alerta · T05 **Origem e nível de confiança** · T06 Central de notificações · T07 Registro comunitário (3 etapas + confirmação) · T08 Fila de validação (agente) · T09 Análises · T10 Fontes de dados · T11 Privacidade (LGPD) · T12 Simulador de fluxo (fonte → notificação).

## Roteiro de demonstração
1. Entrar como **Morador** e aceitar o consentimento.
2. No **Painel**, clicar no ponto vermelho (alagamento) → **Ver detalhe** → **Origem e confiança**.
3. Abrir **Notificações** e **Registrar ocorrência** (3 etapas).
4. Trocar para **Agente** (seletor no topo) → **Validação** → Confirmar um evento.
5. No **Painel**, usar o **Simulador de dados** e acompanhar o fluxo com tempos.
6. Em **Fontes**, clicar em “Simular falha” e ver a confiança cair em **Origem e confiança**.

## Regras de negócio (resumo)
- Confiança `C = 0,35·F + 0,25·Fr + 0,25·Co + 0,15·Q` (Alta ≥ 75 · Média 50–74 · Baixa < 50)
- Risco `R = 0,5·S + 0,3·E + 0,2·T` (Crítico ≥ 80 · Alto 60–79 · Moderado 40–59 · Baixo < 40)
- A matriz risco × confiança decide quem é notificado (ver documentação, seção 5).

## Estrutura
```
index.html          # aplicação
css/styles.css
js/engine.js        # regras de negócio (funções puras)
js/data.js          # dados simulados
js/core.js          # estado, pipeline de ingestão, máquina de estados
js/views.js         # telas
js/main.js          # roteamento e ações
tests/engine.test.js
docs/               # PDF, diagramas (SVG) e scripts de geração
```

## Testes
`node tests/engine.test.js` — 16 testes das regras RN-01 a RN-05 e da máquina de estados.

## Regenerar a documentação
Edite `docs/build/grupo.json` (nomes, RMs, links) e rode `python3 docs/build/build_pdf.py` (requer Python, Playwright e Chrome).
