/* Dados SIMULADOS para fins acadêmicos. Bairros, sensores e ocorrências são fictícios. */
(function (g) {
  'use strict';
  const MIN = 60000, now = Date.now();
  const t = m => now - m * MIN;

  const TYPES = {
    alagamento:  { n: 'Alagamento',               icon: 'waves',  short: 'Alagamento' },
    calor:       { n: 'Ilha de calor',            icon: 'thermo', short: 'Calor' },
    energia:     { n: 'Interrupção de energia',   icon: 'zap',    short: 'Energia' },
    agua:        { n: 'Interrupção de água',      icon: 'drop',   short: 'Água' },
    transporte:  { n: 'Interrupção de transporte', icon: 'bus',   short: 'Transporte' }
  };

  const BAIRROS = {
    'Jardim das Águas':     { x: 225, y: 335 },
    'Vila Aurora':          { x: 625, y: 160 },
    'Parque Central':       { x: 455, y: 255 },
    'Vila Nova Esperança':  { x: 710, y: 405 },
    'Centro':               { x: 415, y: 425 },
    'Distrito Industrial':  { x: 300, y: 485 }
  };

  // Fontes de dados (origem). rel = confiabilidade intrínseca da fonte (0-100), RN-01
  const SOURCES = {
    'SNS-021': { id: 'SNS-021', name: 'Sensor de nível d’água SNS-021', kind: 'sensor', owner: 'Prefeitura — rede IoT municipal', proto: 'MQTT/TLS', rel: 92, interval: 30, lat95: 1.8, uptime: 99.7, status: 'online', calib: 'Calibrado em 12/10/2026', x: 245, y: 322 },
    'SNS-033': { id: 'SNS-033', name: 'Sensor de nível d’água SNS-033', kind: 'sensor', owner: 'Prefeitura — rede IoT municipal', proto: 'MQTT/TLS', rel: 90, interval: 30, lat95: 14.2, uptime: 96.1, status: 'degradado', calib: 'Calibrado em 03/09/2026', x: 335, y: 462 },
    'PLV-114': { id: 'PLV-114', name: 'Pluviômetro PLV-114',            kind: 'sensor', owner: 'Prefeitura — rede IoT municipal', proto: 'LoRaWAN → MQTT', rel: 90, interval: 60, lat95: 3.4, uptime: 99.2, status: 'online', calib: 'Calibrado em 28/09/2026', x: 190, y: 295 },
    'EST-07':  { id: 'EST-07',  name: 'Estação meteorológica EST-07',   kind: 'sensor', owner: 'Prefeitura — rede IoT municipal', proto: 'MQTT/TLS', rel: 88, interval: 60, lat95: 2.9, uptime: 99.5, status: 'online', calib: 'Calibrado em 05/10/2026', x: 440, y: 238 },
    'SAT-LST': { id: 'SAT-LST', name: 'Temperatura de superfície (satélite)', kind: 'publica', owner: 'Base pública de sensoriamento remoto', proto: 'API REST (lote)', rel: 80, interval: 900, lat95: 42, uptime: 98.9, status: 'online', calib: 'Resolução 30 m', x: null, y: null },
    'API-DC':  { id: 'API-DC',  name: 'API Defesa Civil — alertas meteorológicos', kind: 'publica', owner: 'Defesa Civil (base pública)', proto: 'API REST + webhook', rel: 95, interval: 120, lat95: 6.5, uptime: 99.8, status: 'online', calib: 'Fonte oficial', x: null, y: null },
    'API-ENE': { id: 'API-ENE', name: 'API concessionária de energia',  kind: 'publica', owner: 'Concessionária de energia', proto: 'API REST', rel: 90, interval: 120, lat95: 9.8, uptime: 99.1, status: 'online', calib: 'Fonte oficial', x: null, y: null },
    'API-AGU': { id: 'API-AGU', name: 'API concessionária de água',     kind: 'publica', owner: 'Companhia de saneamento', proto: 'API REST', rel: 88, interval: 300, lat95: 21.0, uptime: 97.4, status: 'online', calib: 'Fonte oficial', x: null, y: null },
    'API-TRN': { id: 'API-TRN', name: 'API operadora de transporte',    kind: 'publica', owner: 'Operadora de transporte público', proto: 'API REST', rel: 85, interval: 120, lat95: null, uptime: 91.3, status: 'offline', calib: 'Fonte oficial', x: null, y: null },
    'COM':     { id: 'COM',     name: 'Registros comunitários (app/web)', kind: 'comunidade', owner: 'Moradores cadastrados', proto: 'HTTPS (app/web)', rel: 55, interval: null, lat95: 1.2, uptime: 99.9, status: 'online', calib: 'Reputação do usuário', x: null, y: null },
    'AGT':     { id: 'AGT',     name: 'Verificação de agente local',   kind: 'agente', owner: 'Defesa Civil / agentes credenciados', proto: 'Painel do agente', rel: 100, interval: null, lat95: null, uptime: 100, status: 'online', calib: 'Validação humana', x: null, y: null }
  };

  const mk = (o) => Object.assign({ ttlFactor: 1, history: [], notified: null }, o);
  const H = (m, state, actor, note) => ({ ts: t(m), state, actor, note });

  const EVENTS = [
    mk({ id: 'E-1042', type: 'alagamento', title: 'Alagamento na Rua do Córrego', bairro: 'Jardim das Águas', addr: 'Rua do Córrego, altura do nº 410', x: 240, y: 340,
      state: 'Alerta emitido', created: t(38), metric: { nivelCm: 38, chuvaMmH: 62 }, exposure: { pop: 6200, sensiveis: 1, nota: '1 escola municipal' }, trend: 'subindo',
      lastAlertLevel: 'critico',
      obs: [
        { src: 'SNS-021', kind: 'sensor', label: 'Nível d’água', value: '38 cm (limiar de atenção: 30 cm)', ts: t(0.5), quality: 96 },
        { src: 'PLV-114', kind: 'sensor', label: 'Chuva acumulada', value: '62 mm/h', ts: t(2), quality: 94 },
        { src: 'API-DC',  kind: 'publica', label: 'Alerta meteorológico', value: 'Chuva forte — válido até 15h30', ts: t(6), quality: 100 },
        { src: 'COM',     kind: 'comunidade', label: 'Relatos de moradores', value: '7 relatos de usuários distintos (2 com foto)', ts: t(4), quality: 72, count: 7 }
      ],
      history: [H(38, 'Reportado', 'Sensor SNS-021', 'Leitura acima do limiar (31 cm)'), H(37, 'Em validação', 'Sistema', 'Dado normalizado e deduplicado'),
        H(36, 'Confirmado', 'Sistema', 'Confiança 97 (Alta) ≥ 75 — confirmação automática'), H(35, 'Alerta emitido', 'Sistema', 'Risco Alto + confiança Alta → push para moradores'),
        H(12, 'Alerta emitido', 'Sistema', 'Escalonado: risco subiu de Alto para Crítico (push + SMS)')],
      recs: { morador: ['Evite a Rua do Córrego e a Av. Ribeirinha.', 'Não atravesse áreas alagadas a pé ou de carro.', 'Se possível, desligue a energia de imóveis em risco e procure local elevado.'], agente: ['Enviar equipe ao ponto indicado e confirmar a cota da água.', 'Acionar a escola municipal para plano de contingência.', 'Revisar status a cada 5 min enquanto o nível subir.'] } }),

    mk({ id: 'E-1041', type: 'energia', title: 'Falta de energia próxima à UPA Parque Central', bairro: 'Parque Central', addr: 'Rua das Acácias e entorno', x: 500, y: 290,
      state: 'Alerta emitido', created: t(55), metric: { afetados: 2100, horas: 1.5, servicoCritico: true }, exposure: { pop: 3400, sensiveis: 2, nota: 'UPA 24h + creche' }, trend: 'estavel',
      lastAlertLevel: 'alto',
      obs: [
        { src: 'API-ENE', kind: 'publica', label: 'Interrupção informada', value: '2.100 clientes sem energia há 1h30', ts: t(3), quality: 92 },
        { src: 'COM', kind: 'comunidade', label: 'Relatos de moradores', value: '5 relatos de usuários distintos', ts: t(9), quality: 70, count: 5 }
      ],
      history: [H(55, 'Reportado', 'API concessionária', 'Chamado de interrupção aberto'), H(54, 'Em validação', 'Sistema', 'Dado normalizado'), H(52, 'Confirmado', 'Sistema', 'Confiança 94 (Alta)'), H(51, 'Alerta emitido', 'Sistema', 'Serviço crítico afetado → push para moradores')],
      recs: { morador: ['Pessoas que usam equipamentos elétricos de saúde: procure a UPA ou ligue 192.', 'Evite abrir geladeiras e congeladores.', 'Use lanternas, não velas.'], agente: ['Acionar a concessionária para priorizar o restabelecimento da UPA.', 'Confirmar operação do gerador da UPA.', 'Avaliar ponto de apoio com recarga de equipamentos.'] } }),

    mk({ id: 'E-1038', type: 'calor', title: 'Ilha de calor — Av. Brasil e Parque Central', bairro: 'Parque Central', addr: 'Av. Brasil (trecho com pouca arborização)', x: 455, y: 255, ttlFactor: 3,
      state: 'Em monitoramento', created: t(190), metric: { tempC: 41 }, exposure: { pop: 2500, sensiveis: 0, nota: 'Área comercial' }, trend: 'estavel',
      lastAlertLevel: 'alto',
      obs: [
        { src: 'SAT-LST', kind: 'publica', label: 'Temperatura de superfície', value: '41 °C (média da quadra); +7 °C vs. entorno arborizado', ts: t(40), quality: 88 },
        { src: 'EST-07', kind: 'sensor', label: 'Temperatura do ar', value: '35 °C, umidade 31%', ts: t(8), quality: 92 }
      ],
      history: [H(190, 'Reportado', 'Satélite (lote)', 'Superfície > 38 °C'), H(188, 'Em validação', 'Sistema', 'Cruzando com estação EST-07'), H(185, 'Confirmado', 'Sistema', 'Confiança 86 (Alta)'), H(184, 'Alerta emitido', 'Sistema', 'Risco Alto + confiança Alta'), H(120, 'Em monitoramento', 'Sistema', 'Notificações entregues; acompanhamento ativo')],
      recs: { morador: ['Prefira sombra e hidrate-se entre 11h e 16h.', 'Idosos e crianças: evite exposição prolongada.', 'Procure os pontos de resfriamento indicados no mapa.'], agente: ['Abrir ponto de hidratação na Praça Central.', 'Reavaliar às 17h; encerrar se a temperatura de superfície ficar < 36 °C.'] } }),

    mk({ id: 'E-1040', type: 'energia', title: 'Falta de energia em Vila Aurora', bairro: 'Vila Aurora', addr: 'Quadras 3 a 9', x: 625, y: 165,
      state: 'Em monitoramento', created: t(130), metric: { afetados: 3200, horas: 2 }, exposure: { pop: 9600, sensiveis: 0, nota: 'Área residencial' }, trend: 'caindo',
      lastAlertLevel: 'moderado',
      obs: [
        { src: 'API-ENE', kind: 'publica', label: 'Interrupção informada', value: '3.200 clientes — religação em andamento', ts: t(4), quality: 90 },
        { src: 'COM', kind: 'comunidade', label: 'Relatos de moradores', value: '12 relatos de usuários distintos', ts: t(11), quality: 68, count: 12 }
      ],
      history: [H(130, 'Reportado', 'Registro comunitário', '3 relatos'), H(128, 'Em validação', 'Sistema', 'Aguardando API da concessionária'), H(124, 'Confirmado', 'Sistema', 'Confiança 93 (Alta)'), H(123, 'Alerta emitido', 'Sistema', 'Aviso informativo (risco Moderado)'), H(60, 'Em monitoramento', 'Sistema', 'Religação iniciada')],
      recs: { morador: ['Religação estimada em até 40 min.', 'Desligue aparelhos sensíveis para evitar danos na volta da energia.'], agente: ['Acompanhar religação com a concessionária.'] } }),

    mk({ id: 'E-1044', type: 'agua', title: 'Falta de água em Vila Nova Esperança', bairro: 'Vila Nova Esperança', addr: 'Setores 2 e 3', x: 710, y: 410,
      state: 'Confirmado', created: t(75), metric: { afetados: 1800, horas: 3 }, exposure: { pop: 5200, sensiveis: 0, nota: 'Área residencial' }, trend: 'estavel',
      lastAlertLevel: null,
      obs: [
        { src: 'API-AGU', kind: 'publica', label: 'Manutenção emergencial', value: 'Rompimento de adutora; previsão 18h', ts: t(22), quality: 85 },
        { src: 'COM', kind: 'comunidade', label: 'Relatos de moradores', value: '4 relatos de usuários distintos', ts: t(18), quality: 62, count: 4 }
      ],
      history: [H(75, 'Reportado', 'Registro comunitário', '2 relatos'), H(73, 'Em validação', 'Sistema', 'Dado normalizado'), H(60, 'Confirmado', 'Agente (validação)', 'Confirmado com a companhia de saneamento')],
      recs: { morador: ['Estoque de água potável: caminhões-pipa no setor 2 (previsão 15h).', 'Priorize água para consumo e higiene.'], agente: ['Coordenar caminhões-pipa e priorizar creches e idosos.'] } }),

    mk({ id: 'E-1045', type: 'transporte', title: 'Linhas de ônibus interrompidas — Terminal Central', bairro: 'Centro', addr: 'Terminal Central, plataformas B e C', x: 420, y: 430,
      state: 'Em validação', created: t(40), metric: { afetados: 1500, horas: 0.7 }, exposure: { pop: 4100, sensiveis: 0, nota: 'Terminal de integração' }, trend: 'estavel',
      lastAlertLevel: null,
      obs: [
        { src: 'COM', kind: 'comunidade', label: 'Relatos de moradores', value: '2 relatos: “ônibus não saem do terminal”', ts: t(40), quality: 58, count: 2 }
      ],
      history: [H(40, 'Reportado', 'Registro comunitário', 'Relato inicial'), H(39, 'Em validação', 'Sistema', 'API da operadora indisponível — apenas relatos (confiança Baixa)')],
      recs: { morador: ['Aguarde confirmação oficial antes de alterar seu trajeto.', 'Consulte rotas alternativas no aplicativo da operadora.'], agente: ['Contato telefônico com a operadora para confirmar.', 'Fonte API-TRN está offline: validar manualmente.'] } }),

    mk({ id: 'E-1046', type: 'alagamento', title: 'Alagamento na passagem inferior da Av. Industrial', bairro: 'Distrito Industrial', addr: 'Passagem inferior, Av. Industrial', x: 330, y: 475,
      state: 'Reportado', created: t(3), metric: { nivelCm: 20 }, exposure: { pop: 1800, sensiveis: 0, nota: 'Via de tráfego intenso' }, trend: 'subindo',
      lastAlertLevel: null,
      obs: [
        { src: 'COM', kind: 'comunidade', label: 'Relato de morador', value: '1 relato (anônimo): “água cobrindo meio pneu”', ts: t(3), quality: 55, count: 1, rel: 35 }
      ],
      history: [H(3, 'Reportado', 'Registro comunitário', 'Relato anônimo recebido')],
      recs: { morador: ['Evite a passagem inferior; use a Av. Paralela.'], agente: ['Aguardar leitura do sensor SNS-033 (degradado) ou enviar equipe.'] } }),

    mk({ id: 'E-1030', type: 'calor', title: 'Ilha de calor — Centro', bairro: 'Centro', addr: 'Calçadão e Praça da Matriz', x: 400, y: 385, ttlFactor: 3,
      state: 'Encerrado', created: t(1500), metric: { tempC: 37 }, exposure: { pop: 3000, sensiveis: 0, nota: '' }, trend: 'caindo', lastAlertLevel: 'moderado',
      obs: [{ src: 'SAT-LST', kind: 'publica', label: 'Temperatura de superfície', value: '37 °C', ts: t(1480), quality: 85 }],
      history: [H(1500, 'Reportado', 'Satélite (lote)', ''), H(1495, 'Em validação', 'Sistema', ''), H(1490, 'Confirmado', 'Sistema', ''), H(1489, 'Alerta emitido', 'Sistema', 'Aviso informativo'), H(1300, 'Em monitoramento', 'Sistema', ''), H(1000, 'Encerrado', 'Sistema', 'Superfície < 36 °C por 3 ciclos')],
      recs: { morador: [], agente: [] } }),

    mk({ id: 'E-1029', type: 'alagamento', title: 'Relato de alagamento na Praça da Matriz', bairro: 'Centro', addr: 'Praça da Matriz', x: 380, y: 400,
      state: 'Descartado', created: t(1700), metric: { nivelCm: 12 }, exposure: { pop: 3000, sensiveis: 0, nota: '' }, trend: 'caindo', lastAlertLevel: null,
      obs: [{ src: 'COM', kind: 'comunidade', label: 'Relato de morador', value: '1 relato anônimo', ts: t(1700), quality: 40, count: 1, rel: 35 }],
      history: [H(1700, 'Reportado', 'Registro comunitário', ''), H(1699, 'Em validação', 'Sistema', ''), H(1670, 'Descartado', 'Agente (validação)', 'Pluviômetro sem chuva no local; foto antiga (EXIF)')],
      recs: { morador: [], agente: [] } })
  ];

  // Notificações iniciais (geradas pelo mesmo mecanismo do motor)
  const NOTIFS = [
    { id: 'N-9001', ev: 'E-1042', level: 'critico', title: 'ALERTA CRÍTICO — Alagamento na Rua do Córrego', body: 'Nível da água em 38 cm e subindo. Evite a região e procure local elevado.', channels: ['push', 'sms'], audience: 'moradores', ts: t(12), delivSec: 4.1, read: false, verifying: false },
    { id: 'N-9002', ev: 'E-1041', level: 'alto', title: 'ALERTA — Falta de energia próxima à UPA Parque Central', body: '2.100 clientes sem energia. Quem depende de equipamentos de saúde: procure a UPA ou ligue 192.', channels: ['push'], audience: 'moradores', ts: t(51), delivSec: 5.6, read: false, verifying: false },
    { id: 'N-9003', ev: 'E-1038', level: 'alto', title: 'ALERTA — Ilha de calor no Parque Central', body: 'Superfície a 41 °C. Hidrate-se e prefira locais com sombra entre 11h e 16h.', channels: ['push'], audience: 'moradores', ts: t(184), delivSec: 6.3, read: true, verifying: false },
    { id: 'N-9004', ev: 'E-1040', level: 'moderado', title: 'Aviso — Falta de energia em Vila Aurora', body: '3.200 clientes afetados. Religação estimada em até 40 min.', channels: ['app'], audience: 'moradores', ts: t(123), delivSec: 2.2, read: true, verifying: false },
    { id: 'N-9005', ev: 'E-1045', level: 'moderado', title: 'Triagem — Interrupção de transporte no Terminal Central', body: 'Relatos pendentes de validação. Fonte oficial da operadora está offline.', channels: ['painel'], audience: 'agentes', ts: t(38), delivSec: 1.1, read: false, verifying: true }
  ];

  g.URIP_DATA = { TYPES, BAIRROS, SOURCES, EVENTS, NOTIFS, NOW: now };
})(window === undefined ? globalThis : window);
