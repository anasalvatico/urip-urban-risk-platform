#!/usr/bin/env python3
"""Monta o PDF único de documentação.  Uso: python3 docs/build/build_pdf.py
Edite docs/build/grupo.json (nomes, RMs e links) e rode novamente para regenerar."""
import asyncio, json, os, html
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
IMG = os.path.join(ROOT, 'docs', 'img'); OUT_PDF = os.path.join(ROOT, 'docs', 'URIP_Documentacao_GS2026.2.pdf')
e = html.escape
def ph(v): return f'<span class="ph">{e(v)}</span>' if v.startswith('[') else e(v)
def link(v): return ph(v) if v.startswith('[') else f'<a href="{e(v)}">{e(v)}</a>'
P = {'A': 'Alta', 'M': 'Média'}

RF = [
 ('RF01', 'O sistema deve ingerir leituras de sensores IoT (nível d’água, pluviômetro, temperatura) via MQTT, com autenticação por dispositivo.', 'A', 'T10, T12'),
 ('RF02', 'O sistema deve consumir bases públicas e APIs de concessionárias (alertas meteorológicos, energia, água, transporte, temperatura de superfície) por API REST, webhook ou lote.', 'A', 'T10, T12'),
 ('RF03', 'O morador deve poder registrar uma ocorrência (tipo, bairro/local, gravidade percebida, descrição, foto opcional) em até 3 etapas, inclusive de forma anônima.', 'A', 'T07, T07b'),
 ('RF04', 'O sistema deve validar e normalizar todo dado recebido (esquema, plausibilidade física, duplicidade, fonte ativa) e rejeitar o inválido registrando o motivo.', 'A', 'T12, T07'),
 ('RF05', 'O sistema deve calcular o nível de confiança (0–100; Alta/Média/Baixa) de cada evento conforme RN-01 e RN-02 e recalculá-lo continuamente (frescor).', 'A', 'T05, T02, T03'),
 ('RF06', 'O sistema deve classificar o nível de risco (Crítico, Alto, Moderado, Baixo) de cada evento conforme RN-03.', 'A', 'T02, T03, T04'),
 ('RF07', 'O sistema deve gerir o ciclo de vida do evento (Reportado → Em validação → Confirmado → Alerta emitido → Em monitoramento → Encerrado/Descartado), bloqueando transições inválidas e mantendo o histórico.', 'A', 'T04, T08'),
 ('RF08', 'O sistema deve emitir alertas e avisos conforme a matriz risco × confiança (RN-04), por push, SMS, e-mail ou in-app, para a audiência da área afetada.', 'A', 'T06, T12'),
 ('RF09', 'O painel deve exibir mapa com camadas por tipo de evento, indicadores-chave e lista de prioridades, atualizando automaticamente.', 'A', 'T02'),
 ('RF10', 'O usuário deve poder listar, filtrar (tipo, nível, estado, busca) e abrir o detalhe de alertas, com recomendações, justificativa do risco, dados de sustentação e histórico.', 'A', 'T03, T04'),
 ('RF11', 'O sistema deve exibir, para cada evento e alerta, a origem de cada dado (fonte, tipo, responsável, protocolo, última leitura) e o nível de confiança com sua decomposição.', 'A', 'T05, T04, T06'),
 ('RF12', 'O usuário deve ter central de notificações com histórico, status de leitura e preferências (canais, nível mínimo, áreas de interesse); alertas críticos não podem ser desativados.', 'A', 'T06'),
 ('RF13', 'O agente deve ter fila de validação priorizada, com prazo (SLA), para confirmar ou descartar (com motivo) os eventos pendentes.', 'A', 'T08'),
 ('RF14', 'O operador e o agente devem monitorar a saúde das fontes (status, intervalo de envio, latência p95, disponibilidade).', 'M', 'T10'),
 ('RF15', 'O sistema deve oferecer análises e indicadores: alertas por período, latência por fonte, temperatura por bairro e qualidade dos alertas.', 'M', 'T09'),
 ('RF16', 'O titular deve poder gerir consentimentos, exportar seus dados, anonimizar relatos, excluir a conta e ver quem acessou seus dados (LGPD, art. 18).', 'A', 'T01, T11'),
 ('RF17', 'O sistema deve controlar o acesso por perfil (morador, agente, operador), exibindo apenas as funções e os dados permitidos.', 'A', 'T01 e menu de todas as telas'),
 ('RF18', 'O morador deve poder corroborar uma ocorrência existente (“também estou vendo isso”), reforçando sua confiança sem duplicar o evento.', 'M', 'T04, T07'),
]
RNF = [
 ('RNF01', 'Eficiência de desempenho › Comportamento temporal <i>(tempo de atualização)</i>', 'Dados de sensores devem aparecer no painel em ≤ 60 s (p95) após a medição. Alertas Críticos devem chegar ao usuário em ≤ 60 s (p95) após o recebimento do dado (meta típica ≤ 10 s). Telas carregam em ≤ 2 s (p95) em 4G.', 'Teste de carga e métrica fim a fim. Protótipo: KPI “Atualização dos dados” (T02), latência p95 (T09) e tempo fonte → notificação no simulador (T12).'),
 ('RNF02', 'Confiabilidade › Disponibilidade', 'Disponibilidade ≥ 99,9% ao mês para ingestão, motor de regras e notificações (≤ 43 min/mês fora do ar). Sem ponto único de falha: ≥ 2 réplicas em zonas distintas e failover ≤ 60 s. RPO ≤ 5 min; RTO ≤ 15 min.', 'Health checks e monitoramento contínuo. Protótipo: status, uptime e latência por fonte (T10).'),
 ('RNF03', 'Confiabilidade › Tolerância a falhas e recuperabilidade', 'Modo degradado: com uma fonte fora do ar, o sistema mantém o último dado com selo de dado antigo, recalcula a confiança e continua alertando com as demais fontes. Mensagens duráveis com reentrega, processamento idempotente, retentativas com backoff e fila de mensagens mortas.', 'Protótipo: “Simular falha” em T10 reduz a confiança em T05.'),
 ('RNF04', 'Eficiência de desempenho › Capacidade <i>(escalabilidade)</i>', 'Suportar 10.000 sensores (≈ 330 msg/s), picos de 10× durante chuvas, 1 milhão de usuários cadastrados e disparo de 50.000 notificações em ≤ 60 s. Escala horizontal automática dos componentes sem estado e particionamento por região (geohash).', 'Arquitetura (seção 8): broker particionado, cache, autoescala; teste de carga.'),
 ('RNF05', 'Usabilidade › Operabilidade, acessibilidade e reconhecibilidade', 'Conformidade WCAG 2.1 AA (contraste ≥ 4,5:1, navegação por teclado, rótulos para leitores de tela). Risco e confiança nunca só por cor (texto + ícone/barras). Alvos de toque ≥ 44 px, interface responsiva. Registrar ocorrência em ≤ 3 etapas e ≤ 60 s. SUS ≥ 80. Linguagem simples nos alertas.', 'Todo o protótipo; registro em 3 etapas (T07); versão móvel (seção 9).'),
 ('RNF06', 'Segurança › Confidencialidade e integridade', 'TLS 1.3 em trânsito; AES-256 em repouso com chaves em KMS. Autenticação OIDC; MFA para agentes e operadores; RBAC com mínimo privilégio. Sensores autenticados (mTLS/token) e mensagens com timestamp (anti-replay). Proteção contra OWASP Top 10 (WAF, validação de entrada).', 'API Gateway e camada de dados (seção 8); perfis em T01.'),
 ('RNF07', 'Segurança › Responsabilização e rastreabilidade', 'Todo acesso a dado pessoal e toda decisão de alerta ficam em log de auditoria imutável (quem, o quê, quando, base legal), com retenção definida pelo encarregado (mínimo de 6 meses).', 'T11 “Quem acessou meus dados”; histórico em T04.'),
 ('RNF08', 'Segurança › Conformidade com a LGPD <i>(proteção de dados pessoais)</i>', 'Minimização (bairro, não GPS contínuo). Consentimento granular, registrado e revogável. Pseudonimização do autor de relatos; remoção de EXIF; localização arredondada (~100 m); retenção de relatos por 90 dias. Direitos do titular atendidos em até 15 dias. Encarregado (DPO) e RIPD. Alertas críticos com base na proteção da vida (art. 7º, VII).', 'T01, T07, T11 e aviso de proteção em T05; Serviço de Privacidade (seção 8).'),
 ('RNF09', 'Manutenibilidade › Modularidade e testabilidade', 'Componentes desacoplados por contratos (OpenAPI e eventos). Pesos, limiares e TTL das regras configuráveis sem novo deploy. Cobertura ≥ 80% nos testes das regras RN-01 a RN-05.', 'Motor de regras isolado em <code>js/engine.js</code> com 16 testes (<code>tests/engine.test.js</code>).'),
 ('RNF10', 'Compatibilidade › Interoperabilidade', 'APIs REST documentadas (OpenAPI), MQTT e formatos abertos: GeoJSON e CAP (Common Alerting Protocol) para troca de alertas com a Defesa Civil.', 'Ingestão e API Gateway (seção 8).'),
]
SHOTS = [
 ('t01-onboarding', 'T01 · Entrada e consentimento', 'RF16, RF17 · RNF05, RNF08'),
 ('t02-painel', 'T02 · Painel de acompanhamento (mapa e prioridades)', 'RF05, RF06, RF09 · RNF01'),
 ('t03-alertas', 'T03 · Lista de alertas com filtros', 'RF10 · RN-09'),
 ('t04-detalhe', 'T04 · Detalhe do alerta (ciclo de vida, justificativa do risco)', 'RF07, RF10, RF11, RF18'),
 ('t05-confianca', 'T05 · Origem e nível de confiança do dado', 'RF05, RF11 · RN-01, RN-02'),
 ('t06-notificacoes', 'T06 · Central de notificações e preferências', 'RF08, RF12 · RN-04'),
 ('t07-registrar', 'T07 · Registro comunitário (etapa 2 de 3)', 'RF03, RF04 · RNF08'),
 ('t07b-registro-ok', 'T07b · Confirmação do registro e efeito sobre o evento', 'RF03, RF18'),
 ('t08-validacao', 'T08 · Fila de validação do agente (SLA)', 'RF13, RF07 · RN-05'),
 ('t09-analises', 'T09 · Análises e indicadores', 'RF15 · RNF01'),
 ('t10-fontes', 'T10 · Fontes de dados: saúde e disponibilidade', 'RF14, RF01, RF02 · RNF02, RNF03'),
 ('t11-privacidade', 'T11 · Privacidade e direitos do titular (LGPD)', 'RF16 · RNF07, RNF08'),
 ('t12-pipeline', 'T12 · Simulador: fluxo de processamento fonte → notificação', 'RF01, RF02, RF04–RF08 · RNF01'),
]
MATRIZ = [
 ('T01 Entrada e consentimento', 'RF16, RF17', 'RNF05, RNF08', 'RN-08', '—', 'Portal do Titular · Serviço de Privacidade'),
 ('T02 Painel', 'RF05, RF06, RF09, RF11', 'RNF01, RNF05', 'RN-01, RN-03, RN-09', 'Seq. 7–9', 'Apresentação · Cache · Motor de Regras'),
 ('T03 Lista de alertas', 'RF05, RF06, RF10, RF11', 'RNF05', 'RN-09', 'Estados (todos)', 'Gestão de Eventos'),
 ('T04 Detalhe do alerta', 'RF06, RF07, RF10, RF11, RF18', 'RNF05', 'RN-03, RN-04, RN-06, RN-07', 'Estados; Seq. 9–12', 'Gestão de Eventos · Motor de Regras'),
 ('T05 Origem e confiança', 'RF05, RF11', 'RNF03, RNF08', 'RN-01, RN-02', 'Seq. 7–8', 'Motor de Regras · Validação · Privacidade'),
 ('T06 Central de notificações', 'RF08, RF11, RF12', 'RNF01, RNF05, RNF08', 'RN-04, RN-08', 'Seq. 10–12; estado Alerta emitido', 'Serviço de Notificação · provedores'),
 ('T07 Registro comunitário', 'RF03, RF04, RF18', 'RNF05, RNF08', 'RN-01, RN-08', 'Seq. 1–6; estado Reportado', 'Ingestão · Validação · Privacidade'),
 ('T08 Validação (agente)', 'RF07, RF13', 'RNF05, RNF07', 'RN-05', 'Estados: Em validação → Confirmado/Descartado', 'Gestão de Eventos · Auditoria'),
 ('T09 Análises', 'RF15', 'RNF01', '—', '—', 'Análises e Observabilidade'),
 ('T10 Fontes de dados', 'RF01, RF02, RF14', 'RNF02, RNF03, RNF04', 'RN-01 (F, Fr)', 'Seq. 3–4', 'Ingestão · Observabilidade'),
 ('T11 Privacidade (LGPD)', 'RF16', 'RNF07, RNF08', 'RN-08', '—', 'Serviço de Privacidade · Auditoria'),
 ('T12 Simulador (fluxo completo)', 'RF01, RF02, RF04–RF08', 'RNF01', 'RN-01…RN-05', 'Seq. 1–13; Estados', 'Ingestão → Notificação'),
]
def build_html():
    g = json.load(open(os.path.join(HERE, 'grupo.json'), encoding='utf-8'))
    t = open(os.path.join(HERE, 'doc.html'), encoding='utf-8').read()
    t = t.replace('{{INTEGRANTES}}', ''.join(f'<tr><td>{ph(i["nome"])}</td><td>{ph(i["rm"])}</td></tr>' for i in g['integrantes']))
    t = t.replace('{{TURMA}}', ph(g['turma'])).replace('{{LINK_PROTOTIPO}}', link(g['link_prototipo'])).replace('{{LINK_REPOSITORIO}}', link(g['link_repositorio'])).replace('{{LINK_VIDEO}}', link(g['link_video']))
    t = t.replace('{{RF}}', ''.join(f'<tr><td class="id">{a}</td><td>{e(b)}</td><td>{P[c]}</td><td>{e(d)}</td></tr>' for a, b, c, d in RF))
    t = t.replace('{{RNF}}', ''.join(f'<tr><td class="id">{a}</td><td>{b}</td><td>{c}</td><td class="sm">{d}</td></tr>' for a, b, c, d in RNF))
    t = t.replace('{{SHOTS}}', ''.join(f'<figure class="fig"><img src="../img/{n}.jpg" alt="{e(c)}"><figcaption><b>{e(c)}</b><br>{e(r)}</figcaption></figure>' for n, c, r in SHOTS))
    t = t.replace('{{MATRIZ}}', ''.join('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in row) + '</tr>' for row in MATRIZ))
    for n in ('sequencia', 'estados', 'arquitetura'):
        svg = open(os.path.join(IMG, n + '.svg'), encoding='utf-8').read()
        svg = svg.replace('width="1240" height="1085"', '').replace('width="1360" height="570"', '').replace('width="1240" height="820"', '')
        t = t.replace('{{SVG:%s}}' % n, svg)
    open(os.path.join(HERE, '_doc_build.html'), 'w', encoding='utf-8').write(t)
    return os.path.join(HERE, '_doc_build.html')
async def main():
    src = build_html()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])
        pg = await b.new_page(); await pg.goto('file://' + src); await pg.wait_for_timeout(600)
        await pg.pdf(path=OUT_PDF, prefer_css_page_size=True, print_background=True, display_header_footer=True,
                     header_template='<span></span>',
                     footer_template='<div style="font-size:7.5px;width:100%;text-align:center;color:#667;font-family:Arial">URIP, Urban Risk Intelligence Platform · Global Solution 2026.2 · página <span class="pageNumber"></span> de <span class="totalPages"></span></div>')
        await b.close()
    print('PDF:', OUT_PDF)
asyncio.run(main())
