/* Núcleo do protótipo: estado, helpers, pipeline de ingestão e máquina de estados. */
(function (g) {
  'use strict';
  const E = g.URIP_ENGINE, D = g.URIP_DATA;
  const NOW = () => Date.now();

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICONS = {
    map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
    plus: 'M12 5v14M5 12h14',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
    chart: 'M3 3v18h18 M7 15l4-4 3 3 5-6',
    antenna: 'M4.9 19.1a10 10 0 0 1 0-14.2 M7.8 16.2a6 6 0 0 1 0-8.4 M16.2 7.8a6 6 0 0 1 0 8.4 M19.1 4.9a10 10 0 0 1 0 14.2 M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
    layers: 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
    check: 'M20 6 9 17l-5-5',
    x: 'M18 6 6 18M6 6l12 12',
    warn: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
    waves: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
    thermo: 'M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z',
    zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
    drop: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
    bus: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10H4z M4 12h16 M8 20v-4 M16 20v-4 M7.5 8h.01 M16.5 8h.01',
    right: 'M9 18l6-6-6-6', left: 'M15 18l-6-6 6-6',
    play: 'M6 4l14 8-14 8z',
    camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    send: 'M22 2 11 13 M22 2l-7 20-4-9-9-4z',
    sms: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6',
    phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M11 18h2',
    pin: 'M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 16v-4 M12 8h.01',
    gauge: 'M12 14l4-4 M3.3 19a10 10 0 1 1 17.4 0',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
    trash: 'M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    sat: 'M13 7 9 3 5 7l4 4 M17 11l4 4-4 4-4-4 M8 12l4 4 M16 8l3-3 M9 21a12 12 0 0 1-6-6',
    building: 'M4 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18 M16 10h2a2 2 0 0 1 2 2v10 M8 6h4 M8 10h4 M8 14h4 M8 18h4 M2 22h20'
  };
  const ic = (n, s, cls) => `<svg class="ic ${cls || ''}" width="${s || 20}" height="${s || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n] || ICONS.info}"/></svg>`;

  function ago(ts) {
    const s = Math.max(0, Math.round((NOW() - ts) / 1000));
    if (s < 10) return 'agora';
    if (s < 60) return `há ${s} s`;
    const m = Math.round(s / 60); if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60); if (h < 24) return `há ${h} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
    return `há ${Math.floor(h / 24)} d`;
  }
  const clock = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ageTxt = ts => { const s = (NOW() - ts) / 1000; return s < 90 ? `${Math.max(1, Math.round(s))} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1).replace('.', ',')} h`; };

  /* ---------- estado ---------- */
  const PERSONAS = {
    morador:  { key: 'morador',  name: 'Ana Souza',      role: 'Moradora — Jardim das Águas', short: 'Morador' },
    agente:   { key: 'agente',   name: 'Carlos Menezes', role: 'Agente da Defesa Civil',       short: 'Agente da Defesa Civil' },
    operador: { key: 'operador', name: 'Marina Lopes',   role: 'Operadora de serviço público', short: 'Operador de serviço público' }
  };
  const NAV = {
    morador:  ['painel', 'alertas', 'notificacoes', 'registrar', 'confianca', 'privacidade'],
    agente:   ['painel', 'alertas', 'validacao', 'notificacoes', 'registrar', 'confianca', 'analises', 'fontes', 'privacidade'],
    operador: ['painel', 'alertas', 'notificacoes', 'confianca', 'analises', 'fontes', 'privacidade']
  };
  const S = {
    role: 'morador', onboarded: false, route: 'inicio',
    events: D.EVENTS, sources: D.SOURCES, notifs: D.NOTIFS.slice(),
    selId: 'E-1042', confId: 'E-1042', mapSel: null,
    layers: { alagamento: true, calor: true, energia: true, agua: true, transporte: true },
    filters: { tipo: '', nivel: '', estado: '', q: '' },
    notifTab: 'todas',
    user: { areas: ['Jardim das Águas', 'Vila Aurora', 'Parque Central'], channels: { push: true, sms: true, email: false, app: true }, minLevel: 'moderado',
      consents: { alertas: true, localizacao: false, compartilhar: true, sms: true }, consentTs: NOW(), corroborated: {}, myReports: [] },
    reg: { step: 1, type: '', bairro: '', addr: '', sev: '', desc: '', anon: false, photo: '', done: null, err: '' },
    audit: [
      { ts: NOW() - 3600e3 * 3, who: 'Sistema de alertas', what: 'Leitura da área de interesse (bairro) para envio de alerta', basis: 'Execução de política pública / consentimento' },
      { ts: NOW() - 3600e3 * 26, who: 'Agente Carlos M.', what: 'Consulta ao relato E-1029 (pseudonimizado)', basis: 'Validação de ocorrência' }
    ],
    nextEv: 1047, nextNotif: 9006, nextProto: 4812
  };

  /* ---------- cálculo derivado ---------- */
  function calc(ev) {
    const conf = E.computeConfidence(ev, NOW(), S.sources), risk = E.computeRisk(ev);
    return { conf, risk, pol: E.policy(risk.level.k, conf.level.k), prio: risk.score * 1000 + conf.score };
  }
  const isActive = ev => ev.state !== 'Encerrado' && ev.state !== 'Descartado';
  const evById = id => S.events.find(e => e.id === id);
  const rankOf = k => E.RISK_LEVELS.length - 1 - E.RISK_LEVELS.findIndex(l => l.k === k); // baixo=0 … crítico=3

  /* ---------- máquina de estados ---------- */
  function transition(ev, to, actor, note) {
    if (!E.canTransition(ev.state, to)) throw new Error(`Transição inválida: ${ev.state} → ${to}`);
    ev.state = to;
    ev.history.push({ ts: NOW(), state: to, actor, note: note || '' });
  }

  function notify(ev, pol, c, opts) {
    opts = opts || {};
    const lvl = c.risk.level, tipo = D.TYPES[ev.type].n;
    const n = {
      id: 'N-' + (S.nextNotif++), ev: ev.id, level: lvl.k, audience: pol.audience, channels: pol.channels.slice(),
      title: pol.id === 'informativo' ? `Aviso — ${ev.title}` : `${lvl.k === 'critico' ? 'ALERTA CRÍTICO' : 'ALERTA'} — ${ev.title}`,
      body: opts.body || (ev.recs.morador[0] || `${tipo}: acompanhe as orientações no aplicativo.`), ts: NOW(),
      delivSec: +(1.2 + Math.random() * 3.8).toFixed(1), read: false, verifying: pol.id === 'publico_verificacao'
    };
    if (pol.audience === 'agentes') n.title = `Triagem — ${ev.title}`;
    S.notifs.unshift(n);
    return n;
  }

  /** Avança o evento conforme as regras RN-02…RN-05. Retorna o log (passos) para exibição. */
  function advance(ev, actor, log) {
    log = log || [];
    let c = calc(ev), guard = 0;
    while (guard++ < 6) {
      c = calc(ev);
      if (ev.state === 'Reportado') {
        transition(ev, 'Em validação', actor || 'Sistema', 'Dado normalizado e deduplicado');
        log.push(`Estado: Reportado → Em validação`); continue;
      }
      if (ev.state === 'Em validação') {
        const crit = c.risk.level.k === 'critico';
        if (c.conf.score >= 75 || (crit && c.conf.score >= 60)) {
          transition(ev, 'Confirmado', 'Sistema', `Confiança ${c.conf.score} (${c.conf.level.n})${crit && c.conf.score < 75 ? ' — risco Crítico: confirmação provisória, validação prioritária' : ' ≥ 75 — confirmação automática'}`);
          log.push(`Estado: Em validação → Confirmado (confiança ${c.conf.score})`); continue;
        }
        if (c.pol.id === 'agentes' && !ev.agentNotified) {
          ev.agentNotified = true; const n = notify(ev, c.pol, c);
          log.push(`Notificação preliminar enviada aos agentes (${n.channels.join(' + ')})`);
        }
        break;
      }
      if (ev.state === 'Confirmado') {
        if (c.pol.audience === 'moradores' && c.pol.id !== 'informativo') {
          transition(ev, 'Alerta emitido', 'Sistema', `${c.risk.level.n} + confiança ${c.conf.level.n} → ${c.pol.text}`);
          ev.lastAlertLevel = c.risk.level.k;
          const n = notify(ev, c.pol, c); log.push(`Estado: Confirmado → Alerta emitido`, `Notificação ${n.channels.join(' + ')} enviada aos moradores da área`);
          scheduleMonitoring(ev); break;
        }
        if (c.pol.id === 'informativo') {
          const n = notify(ev, c.pol, c); ev.lastAlertLevel = c.risk.level.k;
          transition(ev, 'Em monitoramento', 'Sistema', 'Aviso informativo enviado; acompanhamento ativo');
          log.push('Aviso informativo no aplicativo', 'Estado: Confirmado → Em monitoramento'); break;
        }
        transition(ev, 'Em monitoramento', 'Sistema', 'Sem notificação necessária (RN-04); acompanhamento ativo');
        log.push('Estado: Confirmado → Em monitoramento (sem notificação ao público)'); break;
      }
      if (ev.state === 'Em monitoramento') {
        if (rankOf(c.risk.level.k) > rankOf(ev.lastAlertLevel || 'baixo') && c.pol.audience === 'moradores' && c.pol.id !== 'informativo') {
          transition(ev, 'Alerta emitido', 'Sistema', `Escalonado: risco subiu para ${c.risk.level.n}`);
          ev.lastAlertLevel = c.risk.level.k; const n = notify(ev, c.pol, c);
          log.push('Estado: Em monitoramento → Alerta emitido (escalonamento)', `Notificação ${n.channels.join(' + ')} enviada`); scheduleMonitoring(ev);
        }
        break;
      }
      break;
    }
    return log;
  }
  function scheduleMonitoring(ev) {
    setTimeout(() => {
      if (ev.state === 'Alerta emitido' && g.URIP_APP && ev.autoMon) { transition(ev, 'Em monitoramento', 'Sistema', 'Entrega concluída; acompanhamento ativo'); g.URIP_APP.refresh(); }
    }, 9000);
    ev.autoMon = true;
  }

  /* ---------- pipeline de ingestão (espelha o Diagrama de Sequência) ---------- */
  function ingest(p) {
    const t0 = performance.now(), steps = [];
    const src = S.sources[p.src];
    const j = (a, b) => Math.round(a + Math.random() * (b - a));
    const lat = { sensor: [28, 70], publica: [90, 220], comunidade: [60, 140], agente: [20, 40] }[src.kind] || [50, 100];
    steps.push({ name: 'Dado recebido', who: 'Gateway de Ingestão', ms: j(lat[0], lat[1]), ok: true,
      detail: `${src.name} via ${src.proto}${p.anonymous ? ' · autor anonimizado' : ''}` });

    // Validação
    let ok = true, why = [];
    const val = p.metricValue;
    if (val != null && !E.plausible(p.type, val)) { ok = false; why.push('valor fora do intervalo físico plausível'); }
    if (src.status === 'offline') { ok = false; why.push('fonte offline'); }
    steps.push({ name: 'Validação', who: 'Serviço de Validação', ms: j(18, 45), ok,
      detail: ok ? 'Esquema OK · timestamp OK · valor plausível · sem duplicidade' : 'Rejeitado: ' + why.join(', ') });
    if (!ok) return { steps, rejected: true };

    // Correlação / evento
    let ev = S.events.find(e => isActive(e) && e.type === p.type && e.bairro === p.bairro);
    let created = false, before = null;
    if (!ev) {
      created = true;
      ev = { id: 'E-' + (S.nextEv++), type: p.type, title: p.title, bairro: p.bairro, addr: p.addr || p.bairro, x: D.BAIRROS[p.bairro].x + j(-30, 30), y: D.BAIRROS[p.bairro].y + j(-25, 25),
        state: 'Reportado', created: NOW(), metric: Object.assign({}, p.metric), exposure: p.exposure || { pop: 3000, sensiveis: 0, nota: '' }, trend: p.trend || 'estavel',
        ttlFactor: p.type === 'calor' ? 3 : 1, lastAlertLevel: null, obs: [], history: [{ ts: NOW(), state: 'Reportado', actor: src.name, note: 'Primeiro dado recebido' }],
        recs: p.recs || { morador: ['Acompanhe as orientações oficiais e evite a área até a confirmação.'], agente: ['Validar o relato e, se necessário, enviar equipe.'] } };
      S.events.unshift(ev);
    } else {
      before = calc(ev);
      if (p.metric) Object.keys(p.metric).forEach(k => { if (p.metric[k] > (ev.metric[k] || 0) || typeof p.metric[k] === 'boolean') ev.metric[k] = p.metric[k]; });
      if (p.trend) ev.trend = p.trend;
    }
    // observação
    if (p.kind === 'comunidade') {
      const o = ev.obs.find(x => x.kind === 'comunidade');
      if (o) { o.count = (o.count || 1) + 1; o.ts = NOW(); o.value = `${o.count} relatos de usuários distintos`; o.quality = Math.min(85, (o.quality || 55) + 5); if (p.rel != null && o.rel != null) o.rel = Math.max(o.rel, p.rel); }
      else ev.obs.push({ src: 'COM', kind: 'comunidade', label: 'Relato de morador', value: p.value, ts: NOW(), quality: p.quality, count: 1, rel: p.rel });
    } else ev.obs.push({ src: p.src, kind: src.kind, label: p.label, value: p.value, ts: NOW(), quality: p.quality });

    const c = calc(ev);
    steps.push({ name: 'Classificação de risco', who: 'Motor de Risco', ms: j(40, 90), ok: true,
      detail: `Severidade ${c.risk.S} · Exposição ${c.risk.E} · Tendência ${c.risk.T} → risco ${c.risk.score} (${c.risk.level.n}); confiança ${c.conf.score} (${c.conf.level.n})` });

    const log = advance(ev, 'Sistema');
    const after = calc(ev);
    steps.push({ name: 'Decisão e estado do evento', who: 'Gestão de Eventos', ms: j(20, 50), ok: true,
      detail: (created ? `Evento ${ev.id} criado. ` : `Evento ${ev.id} atualizado${before ? ` (confiança ${before.conf.score} → ${after.conf.score})` : ''}. `) + (log.length ? log.join(' · ') : `Permanece em “${ev.state}” — ${after.pol.text}`) });
    const notif = S.notifs.filter(n => n.ev === ev.id && NOW() - n.ts < 3000);
    steps.push({ name: 'Notificação', who: 'Serviço de Notificação', ms: notif.length ? Math.round(notif[0].delivSec * 1000) : 0, ok: true, skipped: !notif.length,
      detail: notif.length ? `${notif.length} notificação(ões) · ${notif[0].channels.join(' + ')} · audiência: ${notif[0].audience}` : 'Nenhuma notificação para esta combinação risco × confiança (RN-04)' });
    const total = steps.reduce((s, x) => s + x.ms, 0);
    return { steps, ev, created, total, c: after };
  }

  g.URIP = { E, D, S, esc, ic, ago, clock, ageTxt, calc, isActive, evById, rankOf, transition, advance, notify, ingest, PERSONAS, NAV, NOW };
})(window);
