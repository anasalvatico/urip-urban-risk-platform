#!/usr/bin/env python3
"""Gera os diagramas UML (Sequência, Estados) e a visão de arquitetura em SVG."""
import html, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'img')
FONT = "font-family=\"Inter, Arial, Helvetica, sans-serif\""
e = html.escape

def wrap(text, n):
    words, lines, cur = text.split(), [], ''
    for w in words:
        if len(cur) + len(w) + 1 > n and cur: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    if cur: lines.append(cur)
    return lines

def tspans(x, y, lines, size=12, lh=15, anchor='middle', weight='400', fill='#14202B'):
    return ''.join(f'<text x="{x}" y="{y + i*lh}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{fill}" {FONT}>{e(l)}</text>' for i, l in enumerate(lines))

# ============================================================ SEQUÊNCIA
def sequence():
    W, H = 1240, 1085
    P = [('Fonte de dados', 'sensor · API · comunidade', '#F1ECFA', '#6B4FBB'),
         ('Gateway de Ingestão', 'adaptadores MQTT / REST', '#EAF6EF', '#2E7D4F'),
         ('Serviço de Validação', 'esquema · plausibilidade', '#EAF6EF', '#2E7D4F'),
         ('Motor de Regras', 'confiança + risco (RN-01…04)', '#EAF6EF', '#2E7D4F'),
         ('Gestão de Eventos', 'máquina de estados', '#EAF6EF', '#2E7D4F'),
         ('Repositório de Dados', 'relacional · séries temporais', '#FFF3E0', '#B26A00'),
         ('Serviço de Notificação', 'push · SMS · e-mail · in-app', '#EAF6EF', '#2E7D4F'),
         ('Usuário', 'morador / agente', '#E6F0FA', '#0B5FA5')]
    xs = [100 + i * 148 for i in range(len(P))]
    top, bw, bh = 16, 130, 56
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Diagrama de Sequência — fluxo de recebimento e disparo de um alerta">',
         '<defs><marker id="sf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#14202B"/></marker>'
         '<marker id="so" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="#14202B" stroke-width="1.6"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="#fff"/>']
    for (n, sub, bg, st), x in zip(P, xs):
        s.append(f'<rect x="{x-bw/2}" y="{top}" width="{bw}" height="{bh}" rx="8" fill="{bg}" stroke="{st}" stroke-width="1.5"/>')
        s.append(tspans(x, top + 23 if len(wrap(n, 16)) > 1 else top + 33, wrap(n, 16), 12.5, 15, weight='700'))
        s.append(f'<text x="{x}" y="{top+bh+14}" text-anchor="middle" font-size="9.5" fill="#556574" {FONT}>{e(sub)}</text>')
        s.append(f'<line x1="{x}" y1="{top+bh+22}" x2="{x}" y2="{H-24}" stroke="#8FA1B2" stroke-width="1.2" stroke-dasharray="6 5"/>')
    X = lambda i: xs[i]
    HALO = 'paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round"'
    def txt(x, y, t, size=11.5, anchor='middle', fill='#14202B', style='', weight='400'):
        s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" fill="{fill}" font-weight="{weight}" {style} {HALO} {FONT}>{e(t)}</text>')
    def msg(a, b, label, yy, kind='sync', num=None):
        x1, x2 = X(a), X(b); d = 1 if x2 > x1 else -1
        x1 += 5 * d; x2 -= 5 * d
        dash = ' stroke-dasharray="6 4"' if kind == 'ret' else ''
        mk = 'so' if kind in ('async', 'ret') else 'sf'
        s.append(f'<line x1="{x1}" y1="{yy}" x2="{x2}" y2="{yy}" stroke="#14202B" stroke-width="1.5"{dash} marker-end="url(#{mk})"/>')
        txt((x1 + x2) / 2, yy - 6, (f'{num}. ' if num else '') + label)
    def selfmsg(a, label, yy, num=None, w=40, h=22):
        x = X(a) + 5
        s.append(f'<path d="M{x} {yy} h{w} v{h} h-{w-4}" fill="none" stroke="#14202B" stroke-width="1.5" marker-end="url(#sf)"/>')
        txt(x + w + 8, yy + h / 2 + 4, (f'{num}. ' if num else '') + label, anchor='start')
    def act(a, y1, y2):
        s.append(f'<rect x="{X(a)-5}" y="{y1}" width="10" height="{y2-y1}" fill="#fff" stroke="#14202B" stroke-width="1.3"/>')
    def frame(x1, y1, x2, y2, cond):
        s.append(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" fill="none" stroke="#556574" stroke-width="1.4"/>')
        s.append(f'<path d="M{x1} {y1} h46 v14 l-8 8 h-38z" fill="#EEF2F6" stroke="#556574" stroke-width="1.2"/>')
        s.append(f'<text x="{x1+7}" y="{y1+15}" font-size="11.5" font-weight="700" fill="#14202B" {FONT}>alt</text>')
        txt(x1 + 56, y1 + 15, cond, anchor='start', style='font-style="italic"')
    def sep(x1, x2, yy, cond):
        s.append(f'<line x1="{x1}" y1="{yy}" x2="{x2}" y2="{yy}" stroke="#556574" stroke-width="1.3" stroke-dasharray="7 5"/>')
        txt(x1 + 8, yy + 15, cond, anchor='start', style='font-style="italic"')
    def note(x, yy, w, lines, fill='#FFF8DB', st='#C9A400'):
        h = 10 + 14 * len(lines)
        s.append(f'<path d="M{x} {yy} h{w-10} l10 10 v{h-10} h-{w}z" fill="{fill}" stroke="{st}" stroke-width="1.2"/>')
        s.append(tspans(x + 8, yy + 16, lines, 10.5, 14, 'start'))

    y = 120
    msg(0, 1, 'enviarDado(payload, origem, timestamp)', y, 'async', 1); act(1, y, y + 112)
    selfmsg(1, 'autenticar fonte · normalizar', y + 14, 2)
    y += 62
    msg(1, 2, 'validar(dadoNormalizado)', y, 'sync', 3); act(2, y, y + 66)
    selfmsg(2, 'checar esquema, plausibilidade, duplicidade', y + 12, 4)
    # ===== alt externo: validade do dado
    ay = y + 54
    OUT_END = 1050
    frame(36, ay, 1204, OUT_END, '[dado inválido]')
    msg(2, 1, 'rejeitado(motivo)', ay + 52, 'ret')
    txt(X(1) + 14, ay + 74, 'registra rejeição em log; a fonte pode ser sinalizada (RF14)', 10.5, 'start', '#556574')
    sy = ay + 96
    sep(36, 1204, sy, '[dado válido]')
    y = sy + 44
    msg(2, 4, 'correlacionarEvento(dado)', y, 'sync', 5); act(4, y, y + 232)
    y += 32; msg(4, 5, 'salvarObservação · obterEvento()', y, 'sync', 6); act(5, y, y + 26)
    y += 26; msg(5, 4, 'evento (observações, histórico)', y, 'ret')
    y += 36; msg(4, 3, 'classificar(evento)', y, 'sync', 7); act(3, y, y + 52)
    selfmsg(3, 'calcular C e R', y + 10, 8, 32, 20)
    y += 52; msg(3, 4, '{risco, confiança, decisão RN-04}', y, 'ret')
    y += 24; selfmsg(4, 'transição → Em validação → Confirmado', y, 9, 32, 20)
    note(1000, y - 18, 204, ['Confirma sozinho se C ≥ 75', '(Crítico: C ≥ 60, provisório).', 'Senão aguarda agente (RN-05).'])
    # ===== alt interno: decisão
    iy = y + 46
    IN_END = OUT_END - 22
    frame(70, iy, 1170, IN_END, '[risco ≥ Alto e confiança Alta — ou Crítico com C ≥ 60]')
    y = iy + 44
    msg(4, 6, 'emitirAlerta(evento, audiência, canais)', y, 'async', 10); act(6, y, y + 154)
    y += 28; msg(6, 5, 'obterDestinatários(área, preferências, consentimento)', y, 'sync', 11)
    y += 26; msg(5, 6, 'lista pseudonimizada', y, 'ret')
    y += 36; msg(6, 7, 'notificar: alerta + origem + confiança', y, 'async', 12); act(7, y, y + 28)
    y += 40; msg(7, 6, 'entregue / lido', y, 'ret')
    y += 34; msg(6, 4, 'entrega concluída (tempo medido)', y, 'ret')
    txt(X(4) + 12, y + 22, 'Alerta emitido → Em monitoramento', 10.5, 'start', '#556574')
    y += 46
    sep(70, 1170, y, '[risco ≥ Alto e confiança Média]')
    y += 40; msg(4, 6, 'notificarAgentes(alertaPreliminar)', y, 'async', 13)
    txt(X(6) + 12, y + 18, 'agente valida na fila (RF13) e confirma → passos 10–12', 10.5, 'start', '#556574')
    y += 44
    sep(70, 1170, y, '[confiança Baixa, ou risco Baixo/Moderado sem confirmação]')
    txt(X(4) + 12, y + 38, 'evento permanece Em validação na fila; nenhuma notificação ao público', 10.5, 'start', '#556574')
    note(86, IN_END - 52, 410, ['Meta (RNF01): do passo 1 ao 12 em ≤ 60 s (p95).', 'Medido no protótipo (simulador): ≈ 1–3 s.'], '#E6F4EA', '#2E7D4F')
    s.append('</svg>')
    open(os.path.join(OUT, 'sequencia.svg'), 'w').write('\n'.join(s))

# ============================================================ ESTADOS
def states():
    W, H = 1360, 660
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 90 {W} {H-90}" width="{W}" height="{H-90}" role="img" aria-label="Diagrama de Estados — ciclo de vida de um evento de risco">',
         '<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0L10 5L0 10z" fill="#14202B"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="#fff"/>']
    BW, BH = 156, 76
    S = {
        'Reportado':        (130, 170, '#E6F0FA', '#0B5FA5', 'entry / normalizar e deduplicar'),
        'Em validação':     (430, 170, '#FFF6D6', '#B07F00', 'do / calcular confiança (RN-01)'),
        'Confirmado':       (730, 170, '#E6F4EA', '#1E7A3C', 'entry / aplicarPolítica (RN-04)'),
        'Alerta emitido':   (1030, 170, '#FDECEA', '#B3261E', 'entry / notificar(público)'),
        'Em monitoramento': (1030, 370, '#EEF2F6', '#33414E', 'do / reavaliar a cada ciclo'),
        'Encerrado':        (1030, 530, '#EEF2F6', '#33414E', 'entry / arquivar e consolidar'),
        'Descartado':       (430, 400, '#F3E8E8', '#A32525', 'entry / registrar motivo'),
    }
    for name, (cx, cy, fill, st, comp) in S.items():
        x, y = cx - BW/2, cy - BH/2
        s.append(f'<rect x="{x}" y="{y}" width="{BW}" height="{BH}" rx="16" fill="{fill}" stroke="{st}" stroke-width="2"/>')
        s.append(f'<line x1="{x}" y1="{y+30}" x2="{x+BW}" y2="{y+30}" stroke="{st}" stroke-width="1"/>')
        s.append(f'<text x="{cx}" y="{y+21}" text-anchor="middle" font-size="14" font-weight="700" fill="#14202B" {FONT}>{e(name)}</text>')
        s.append(tspans(cx, y + 48, wrap(comp, 26), 10.5, 13, fill='#33414E'))
    def arrow(d, lines=None, lx=0, ly=0, anchor='middle'):
        s.append(f'<path d="{d}" fill="none" stroke="#14202B" stroke-width="1.7" marker-end="url(#a)"/>')
        if lines: s.append(tspans(lx, ly, lines, 11, 13.5, anchor))
    s.append('<circle cx="34" cy="170" r="9" fill="#14202B"/>')
    s.append('<path d="M43 170 H50" stroke="#14202B" stroke-width="1.7" marker-end="url(#a)"/>')
    arrow('M208 170 H352', ['dadoRecebido', '[válido]', '/ correlacionar'], 280, 118)
    arrow('M508 170 H652', ['confirmar', '[C ≥ 75 ou agente', 'confirma]'], 580, 118)
    arrow('M808 170 H952', ['emitirAlerta', '[política exige', 'alerta público]'], 880, 118)
    arrow('M1000 208 V332', ['entregaConcluída', '/ acompanhar'], 990, 262, 'end')
    arrow('M1080 332 C1165 300 1165 240 1080 208', ['riscoEscalou', '[nível > último', 'alertado]', '/ reemitir alerta'], 1150, 262, 'start')
    arrow('M730 208 V370 H952', ['semAlertaPúblico', '[RN-04: informativo', 'ou registro]', '/ aviso in-app opcional'], 740, 300, 'start')
    arrow('M1030 408 V492', ['normalizou [indicadores < limiar', 'por 3 ciclos] ou agente encerra'], 1042, 446, 'start')
    arrow('M430 208 V362', ['descartar', '[agente rejeita · duplicado', '· C < 30 após 30 min]'], 442, 270, 'start')
    arrow('M130 208 V400 H352', ['dadoInválido / spam'], 142, 424, 'start')
    s.append('<circle cx="430" cy="540" r="11" fill="none" stroke="#14202B" stroke-width="2"/><circle cx="430" cy="540" r="6" fill="#14202B"/>')
    s.append('<path d="M430 438 V527" stroke="#14202B" stroke-width="1.7" marker-end="url(#a)"/>')
    s.append('<circle cx="1030" cy="618" r="11" fill="none" stroke="#14202B" stroke-width="2"/><circle cx="1030" cy="618" r="6" fill="#14202B"/>')
    s.append('<path d="M1030 568 V605" stroke="#14202B" stroke-width="1.7" marker-end="url(#a)"/>')
    lg = ['Notação: evento [condição] / ação', 'C = confiança (0–100); R = risco (0–100).', 'Estados finais: Encerrado e Descartado.', 'Transições não listadas são inválidas', '(bloqueadas pelo sistema).']
    s.append('<rect x="30" y="480" width="290" height="120" rx="8" fill="#F7F9FB" stroke="#D8E0E8"/>')
    s.append(tspans(46, 505, lg, 11.5, 19, 'start', fill='#33414E'))
    s.append('</svg>')
    open(os.path.join(OUT, 'estados.svg'), 'w').write('\n'.join(s))

# ============================================================ ARQUITETURA
def architecture():
    W, H = 1240, 820
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Arquitetura em camadas da Urban Risk Intelligence Platform">',
         '<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#33414E"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="#fff"/>']
    def band(x, y, w, h, title, fill, st):
        s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{st}" stroke-width="1.6"/>')
        s.append(f'<text x="{x+16}" y="{y+24}" font-size="14" font-weight="800" fill="{st}" letter-spacing=".04em" {FONT}>{e(title)}</text>')
    def comp(x, y, w, h, name, sub='', lock=False, fill='#fff', st='#556574'):
        s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{st}" stroke-width="1.4"/>')
        ln = wrap(name, max(10, int(w / 7.6)))
        s.append(tspans(x + w/2, y + 21, ln, 12.5, 15, weight='700'))
        if sub: s.append(tspans(x + w/2, y + 21 + 15 * len(ln) + 3, wrap(sub, max(12, int(w / 6.1))), 10.2, 12.5, fill='#556574'))
        if lock:
            s.append(f'<circle cx="{x+w-14}" cy="{y+14}" r="10" fill="#C99A00"/><path d="M{x+w-18} {y+14} h8 v6 h-8z M{x+w-17} {y+14} v-2.5 a3 3 0 0 1 6 0 v2.5" fill="none" stroke="#fff" stroke-width="1.6"/>')
    def arrow(d, dash=False):
        s.append(f'<path d="{d}" fill="none" stroke="#33414E" stroke-width="1.6"{" stroke-dasharray=\"6 4\"" if dash else ""} marker-end="url(#a)"/>')
    LOCK = '#FFF6D6'; LST = '#C99A00'
    # colunas laterais (esquerda)
    band(14, 176, 196, 164, 'FONTES EXTERNAS', '#F1ECFA', '#6B4FBB')
    comp(26, 206, 172, 40, 'Sensores IoT (MQTT / LoRaWAN)')
    comp(26, 252, 172, 34, 'APIs e bases públicas')
    comp(26, 292, 172, 36, 'Comunidade (app / web)')
    band(14, 360, 196, 150, 'PROVEDORES DE ENVIO', '#EEF2F6', '#33414E')
    comp(26, 386, 172, 34, 'Push (FCM / APNs)')
    comp(26, 426, 172, 34, 'Gateway de SMS')
    comp(26, 466, 172, 34, 'E-mail transacional')
    # Apresentação
    band(236, 14, 990, 132, 'CAMADA DE APRESENTAÇÃO', '#E6F0FA', '#0B5FA5')
    comp(254, 44, 300, 86, 'App Web / PWA do Morador', 'Painel · alertas · notificações · registro comunitário · origem e confiança', False)
    comp(572, 44, 330, 86, 'Painel de Agentes e Operadores', 'Validação · análises · saúde das fontes · detalhe e ciclo de vida', False)
    comp(920, 44, 288, 86, 'Portal do Titular (LGPD)', 'Consentimentos · exportação · anonimização · exclusão · log de acessos', True, LOCK, LST)
    # Aplicação
    band(236, 170, 990, 384, 'CAMADA DE APLICAÇÃO / NEGÓCIO', '#EAF6EF', '#2E7D4F')
    comp(254, 198, 954, 38, 'API Gateway · Autenticação (OIDC, MFA p/ agentes) · RBAC · WAF · rate limit · TLS 1.3', '', True, LOCK, LST)
    # Linha A
    comp(254, 252, 285, 74, 'Ingestão e Normalização', 'adaptadores MQTT, REST/webhook, lote; autentica fonte (mTLS/token); remove identificação do autor', True, LOCK, LST)
    comp(559, 252, 285, 74, 'Validação de Dados', 'esquema, plausibilidade física, duplicidade, calibração, EXIF removido')
    comp(864, 252, 344, 74, 'Processamento de Eventos (stream)', 'broker de mensagens durável (at-least-once), idempotência, DLQ, particionamento por região')
    # Linha B (fluxo da direita para a esquerda)
    comp(864, 346, 344, 78, 'Motor de Regras', 'confiança C (RN-01/02), risco R (RN-03), matriz de decisão (RN-04); parâmetros sem deploy')
    comp(559, 346, 285, 78, 'Gestão de Eventos', 'máquina de estados, correlação, histórico, SLA de validação (RN-05/06/07)')
    comp(254, 346, 285, 78, 'Serviço de Notificação', 'seleciona audiência por área e consentimento; push, SMS, e-mail, in-app; mede tempo de entrega')
    # Linha C
    comp(254, 440, 285, 100, 'Serviço de Privacidade (LGPD)', 'consentimento granular, pseudonimização, retenção 90 dias, direitos do titular, trilha de auditoria', True, LOCK, LST)
    comp(559, 440, 285, 100, 'Análises e Relatórios', 'indicadores de atualização, qualidade dos alertas, tendências, ilhas de calor')
    comp(864, 440, 344, 100, 'Observabilidade e Saúde das Fontes', 'métricas, logs, tracing, health checks, alarmes de disponibilidade; autoescala horizontal')
    # Dados
    band(236, 578, 990, 142, 'CAMADA DE DADOS', '#FFF3E0', '#B26A00')
    comp(254, 606, 305, 46, 'Séries temporais (leituras de sensores)', '')
    comp(572, 606, 305, 46, 'Relacional + geoespacial (eventos, usuários)', '', True, LOCK, LST)
    comp(890, 606, 318, 46, 'Armazenamento de objetos (fotos sem EXIF)', '', True, LOCK, LST)
    comp(254, 662, 305, 46, 'Cache em memória (painel, últimos dados)', '')
    comp(572, 662, 305, 46, 'Log de auditoria imutável', '', True, LOCK, LST)
    comp(890, 662, 318, 46, 'Cofre de chaves (KMS) · backups criptografados', '', True, LOCK, LST)
    # Segurança transversal
    s.append(f'<rect x="14" y="740" width="1212" height="66" rx="12" fill="#FFF6D6" stroke="#C99A00" stroke-width="1.8"/>')
    s.append(f'<text x="30" y="764" font-size="13" font-weight="800" fill="#7A5800" {FONT}>SEGURANÇA E PROTEÇÃO DE DADOS PESSOAIS (LGPD) — TRANSVERSAL</text>')
    s.append(tspans(30, 784, ['Em trânsito: TLS 1.3 · Em repouso: AES-256 com chaves em KMS · Minimização e consentimento granular · Pseudonimização do autor de relatos · Localização arredondada (~100 m) · Retenção de 90 dias', 'Perfis com mínimo privilégio (RBAC) · MFA para agentes · Auditoria imutável de acesso a dado pessoal · Encarregado (DPO) e RIPD · Dados de sensores e bases públicas não contêm dados pessoais'], 10.8, 15, 'start', fill='#4A3A00'))
    # legenda cadeado
    s.append(f'<circle cx="1198" cy="760" r="9" fill="#C99A00"/><path d="M1194 760 h8 v6 h-8z M1195 760 v-2.5 a3 3 0 0 1 6 0 v2.5" fill="none" stroke="#fff" stroke-width="1.5"/>')
    s.append(f'<text x="1186" y="764" text-anchor="end" font-size="10.5" fill="#4A3A00" {FONT}>= controle de dados pessoais</text>')
    # setas
    arrow('M198 268 H226 L254 289')          # fontes -> ingestão
    arrow('M539 289 H559'); arrow('M844 289 H864')   # ingestão -> validação -> stream
    arrow('M1036 326 V346')                  # stream -> motor
    arrow('M864 385 H844'); arrow('M559 385 H539')   # motor -> gestão -> notificação
    arrow('M254 403 H198')         # notificação -> provedores (via esquerda)
    arrow('M404 236 V252'); arrow('M730 236 V252', False)      # gateway -> serviços
    arrow('M404 130 V198', True); arrow('M737 130 V198', True); arrow('M1064 130 V198', True)  # apresentação <-> gateway
    arrow('M404 540 V606', True); arrow('M720 540 V606', True); arrow('M1036 540 V606', True)   # aplicação -> dados
    s.append(f'<text x="420" y="572" font-size="10.5" fill="#7A4A00" {FONT}>persistência, consulta e criptografia em repouso</text>')
    s.append(f'<text x="640" y="162" font-size="10.5" fill="#0B3F6E" {FONT}>HTTPS · WebSocket / SSE para atualização em tempo real</text>')
    s.append(f'<text x="14" y="526" font-size="10.5" fill="#556574" {FONT}>entregam o alerta ao usuário</text>')
    s.append('</svg>')
    open(os.path.join(OUT, 'arquitetura.svg'), 'w').write('\n'.join(s))

if __name__ == '__main__':
    sequence(); states(); architecture(); print('ok')
