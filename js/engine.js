/* ============================================================
   Motor de regras da URIP — implementa as regras de negócio
   RN-01 a RN-08 descritas no documento de requisitos.
   Funções puras, sem DOM, para facilitar teste e reuso.
   ============================================================ */
(function (g) {
  'use strict';

  // RN-03: níveis de risco (escala 0-100)
  const RISK_LEVELS = [
    { k: 'critico',  n: 'Crítico',  min: 80 },
    { k: 'alto',     n: 'Alto',     min: 60 },
    { k: 'moderado', n: 'Moderado', min: 40 },
    { k: 'baixo',    n: 'Baixo',    min: 0 }
  ];
  // RN-02: níveis de confiança
  const CONF_LEVELS = [
    { k: 'alta',  n: 'Alta',  min: 75 },
    { k: 'media', n: 'Média', min: 50 },
    { k: 'baixa', n: 'Baixa', min: 0 }
  ];
  const W_CONF = { F: 0.35, Fr: 0.25, Co: 0.25, Q: 0.15 };  // RN-01
  const W_RISK = { S: 0.5, E: 0.3, T: 0.2 };                // RN-03
  const TREND = { subindo: 100, estavel: 50, caindo: 10 };

  // Máquina de estados do evento (espelha o Diagrama de Estados)
  const STATES = ['Reportado', 'Em validação', 'Confirmado', 'Alerta emitido', 'Em monitoramento', 'Encerrado', 'Descartado'];
  const TRANSITIONS = {
    'Reportado':        ['Em validação', 'Descartado'],
    'Em validação':     ['Confirmado', 'Descartado'],
    'Confirmado':       ['Alerta emitido', 'Em monitoramento'],
    'Alerta emitido':   ['Em monitoramento'],
    'Em monitoramento': ['Alerta emitido', 'Encerrado'],
    'Encerrado':        [],
    'Descartado':       []
  };

  const pick = (levels, v) => levels.find(l => v >= l.min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // RN-01 — Frescor do dado (minutos). ttlFactor amplia a janela para fenômenos lentos (calor).
  function freshness(ageMin, factor) {
    const a = ageMin / (factor || 1);
    return a <= 5 ? 100 : a <= 15 ? 80 : a <= 60 ? 50 : a <= 180 ? 25 : 0;
  }
  // RN-01 — Corroboração: nº de origens independentes
  function independentGroups(obs) {
    const set = new Set(); let com = 0;
    obs.forEach(o => { if (o.kind === 'comunidade') com += (o.count || 1); else set.add(o.src); });
    let n = set.size;
    if (com >= 3) n += 2; else if (com >= 1) n += 1;
    return n;
  }
  const corroboration = n => n >= 3 ? 100 : n === 2 ? 65 : n === 1 ? 25 : 0;

  // RN-01 — Confiança C = 0,35·F + 0,25·Fr + 0,25·Co + 0,15·Q
  function computeConfidence(ev, now, sources) {
    const obs = ev.obs;
    if (!obs.length) return { F: 0, Fr: 0, Co: 0, Q: 0, groups: 0, score: 0, level: CONF_LEVELS[2] };
    const rel = o => (o.rel != null ? o.rel : (sources[o.src] ? sources[o.src].rel : 40));
    const F = Math.max.apply(null, obs.map(rel));
    const minAge = Math.min.apply(null, obs.map(o => Math.max(0, (now - o.ts) / 60000)));
    const Fr = freshness(minAge, ev.ttlFactor);
    const groups = independentGroups(obs);
    const Co = corroboration(groups);
    const Q = Math.round(obs.reduce((s, o) => s + (o.quality != null ? o.quality : 70), 0) / obs.length);
    const score = Math.round(W_CONF.F * F + W_CONF.Fr * Fr + W_CONF.Co * Co + W_CONF.Q * Q);
    return { F, Fr, Co, Q, groups, minAge, score, level: pick(CONF_LEVELS, score) };
  }

  // RN-03 — Severidade por tipo de evento (0-100)
  function severity(ev) {
    const m = ev.metric || {};
    switch (ev.type) {
      case 'alagamento': return m.nivelCm > 30 ? 100 : m.nivelCm > 15 ? 70 : m.nivelCm >= 5 ? 40 : 10;
      case 'calor':      return m.tempC > 40 ? 100 : m.tempC > 36 ? 70 : m.tempC >= 32 ? 40 : 10;
      default:
        if (m.servicoCritico) return 100;
        if (m.afetados > 5000 || m.horas > 4) return 75;
        if (m.afetados >= 500 || m.horas >= 1) return 50;
        return 20;
    }
  }
  // RN-03 — Exposição: população no raio de 500 m (/100) + 20 por local sensível
  const exposure = ev => clamp(Math.round((ev.exposure.pop || 0) / 100) + 20 * (ev.exposure.sensiveis || 0), 0, 100);

  function computeRisk(ev) {
    const S = severity(ev), E = exposure(ev), T = TREND[ev.trend] != null ? TREND[ev.trend] : 50;
    const score = Math.round(W_RISK.S * S + W_RISK.E * E + W_RISK.T * T);
    return { S, E, T, score, level: pick(RISK_LEVELS, score) };
  }

  // RN-04 — Matriz de decisão (nível de risco × nível de confiança)
  function policy(riskK, confK) {
    const M = {
      critico: {
        alta:  { id: 'publico_imediato',   text: 'Alerta público imediato (push + SMS)', audience: 'moradores', channels: ['push', 'sms'], sla: 60 },
        media: { id: 'publico_verificacao', text: 'Alerta público com selo “em verificação” + validação prioritária', audience: 'moradores', channels: ['push', 'sms'], sla: 300 },
        baixa: { id: 'agentes',            text: 'Somente agentes — validação prioritária', audience: 'agentes', channels: ['push', 'painel'], sla: 300 }
      },
      alto: {
        alta:  { id: 'publico_imediato',   text: 'Alerta público (push)', audience: 'moradores', channels: ['push'], sla: 120 },
        media: { id: 'agentes',            text: 'Alerta preliminar a agentes; público após confirmação', audience: 'agentes', channels: ['push', 'painel'], sla: 600 },
        baixa: { id: 'fila_validacao',     text: 'Fila de validação', audience: null, channels: [], sla: 1800 }
      },
      moderado: {
        alta:  { id: 'informativo',        text: 'Aviso informativo no aplicativo', audience: 'moradores', channels: ['app'], sla: 600 },
        media: { id: 'fila_validacao',     text: 'Aviso in-app após confirmação', audience: null, channels: [], sla: 1800 },
        baixa: { id: 'fila_validacao',     text: 'Fila de validação', audience: null, channels: [], sla: 1800 }
      },
      baixo: {
        alta:  { id: 'registro',           text: 'Registro no painel (sem notificação)', audience: null, channels: [], sla: 3600 },
        media: { id: 'registro',           text: 'Registro no painel (sem notificação)', audience: null, channels: [], sla: 3600 },
        baixa: { id: 'registro',           text: 'Registro; descarte por TTL se não corroborado', audience: null, channels: [], sla: 3600 }
      }
    };
    return M[riskK][confK];
  }

  // Validação de plausibilidade física (etapa “Validação” do fluxo)
  function plausible(type, value) {
    if (type === 'alagamento') return value >= 0 && value <= 300;
    if (type === 'calor') return value >= -5 && value <= 70;
    return value >= 0;
  }

  // Prazo de validação humana (SLA) por nível de risco — RN-05
  const validationSLA = riskK => ({ critico: 5, alto: 10, moderado: 30, baixo: 60 }[riskK]); // min

  function canTransition(from, to) { return (TRANSITIONS[from] || []).indexOf(to) >= 0; }

  g.URIP_ENGINE = { RISK_LEVELS, CONF_LEVELS, W_CONF, W_RISK, TREND, STATES, TRANSITIONS,
    freshness, independentGroups, corroboration, computeConfidence, severity, exposure,
    computeRisk, policy, plausible, validationSLA, canTransition, pick };
  if (typeof module !== 'undefined') module.exports = g.URIP_ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
