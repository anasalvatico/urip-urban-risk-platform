/* Telas do protótipo (cada função devolve HTML). */
(function (g) {
  'use strict';
  const { E, D, S, esc, ic, ago, clock, ageTxt, calc, isActive, evById, PERSONAS, NAV, NOW } = g.URIP;
  const T = D.TYPES;

  const ROUTE_META = {
    painel:       { label: 'Painel',               icon: 'map' },
    alertas:      { label: 'Alertas',              icon: 'list' },
    alerta:       { label: 'Detalhe do alerta',    icon: 'list' },
    notificacoes: { label: 'Notificações',         icon: 'bell' },
    registrar:    { label: 'Registrar ocorrência', icon: 'plus' },
    confianca:    { label: 'Origem e confiança',   icon: 'layers' },
    validacao:    { label: 'Validação',            icon: 'shield' },
    analises:     { label: 'Análises',             icon: 'chart' },
    fontes:       { label: 'Fontes de dados',      icon: 'antenna' },
    privacidade:  { label: 'Privacidade (LGPD)',   icon: 'lock' }
  };

  /* ---------- componentes ---------- */
  const riskChip = l => `<span class="chip risk-${l.k}"><i class="dot"></i>${l.n}</span>`;
  const stateChip = s => `<span class="chip state">${esc(s)}</span>`;
  const confBadge = (c, long) => {
    const n = c.level.k === 'alta' ? 3 : c.level.k === 'media' ? 2 : 1;
    return `<span class="conf conf-${c.level.k}" title="Nível de confiança do dado (RN-01)"><span class="bars">${[1, 2, 3].map(i => `<b class="${i <= n ? 'on' : ''}"></b>`).join('')}</span>${long ? 'Confiança ' : ''}${c.level.n} · ${c.score}</span>`;
  };
  const KIND = { sensor: ['Sensor', 'antenna'], publica: ['Base pública', 'building'], comunidade: ['Comunidade', 'users'], agente: ['Agente', 'shield'] };
  const srcChips = ev => {
    const cnt = {}; ev.obs.forEach(o => { cnt[o.kind] = (cnt[o.kind] || 0) + (o.kind === 'comunidade' ? (o.count || 1) : 1); });
    return Object.keys(cnt).map(k => `<span class="src src-${k}">${ic(KIND[k][1], 13)}${KIND[k][0]}${cnt[k] > 1 ? ' ×' + cnt[k] : ''}</span>`).join('');
  };
  const tIcon = (type, lvlk) => `<span class="ticon risk-bg-${lvlk || 'baixo'}">${ic(T[type].icon, 20)}</span>`;
  const empty = (t, s) => `<div class="empty">${ic('info', 28)}<strong>${t}</strong><span>${s || ''}</span></div>`;
  const pageHead = (title, sub, right) => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${right ? `<div class="head-actions">${right}</div>` : ''}</div>`;
  const toggle = (id, on, label, act, extra) => `<label class="switch"><input type="checkbox" role="switch" ${on ? 'checked' : ''} data-act="${act}" data-id="${id}" ${extra || ''}><span class="knob"></span><span class="swl">${label}</span></label>`;

  /* ---------- mapa (SVG estilizado, bairros fictícios) ---------- */
  const BASE = `
    <rect width="900" height="560" fill="#EAF0EC"/>
    <path d="M0 0H900V560H0z" fill="url(#grid)"/>
    <ellipse cx="455" cy="262" rx="82" ry="50" fill="#CFE6D2"/><ellipse cx="150" cy="140" rx="60" ry="38" fill="#D5EAD8"/><ellipse cx="740" cy="250" rx="48" ry="34" fill="#D5EAD8"/>
    <g fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".95">
      <path d="M0 215 L900 195"/><path d="M0 430 L900 445"/><path d="M385 0 L405 560"/><path d="M600 0 L585 560"/><path d="M70 560 L540 110 L760 20"/>
    </g>
    <g fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".9"><path d="M0 330 L330 320 L600 300 L900 330"/><path d="M200 0 L215 560"/><path d="M780 0 L800 560"/><path d="M0 110 L400 100 L900 120"/></g>
    <path d="M30 250 C130 268 170 310 215 348 S300 430 335 560" fill="none" stroke="#9CC9E8" stroke-width="12" stroke-linecap="round"/>
    <path d="M830 0 C800 120 850 220 805 300 S775 470 815 560" fill="none" stroke="#9CC9E8" stroke-width="16" stroke-linecap="round"/>
    <g font-size="12" font-weight="700" fill="#5B6B7A" letter-spacing=".08em" text-anchor="middle" style="text-transform:uppercase">
      <text x="225" y="378">Jardim das Águas</text><text x="625" y="118">Vila Aurora</text><text x="455" y="322">Parque Central</text>
      <text x="710" y="452">Vila Nova Esperança</text><text x="415" y="470">Centro</text><text x="300" y="528">Distrito Industrial</text>
    </g>
    <text x="60" y="244" font-size="11" fill="#3B7FAE" font-style="italic" transform="rotate(8 60 244)">Córrego Água Branca</text>
    <text x="838" y="90" font-size="11" fill="#3B7FAE" font-style="italic" transform="rotate(90 838 90)">Rio Tamanduá</text>`;
  const DEFS = `<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#DCE5DF" stroke-width="1"/></pattern>
    <radialGradient id="heat"><stop offset="0" stop-color="#FF7A1A" stop-opacity=".55"/><stop offset="1" stop-color="#FF7A1A" stop-opacity="0"/></radialGradient></defs>`;
  const RC = { critico: '#B3261E', alto: '#C75A00', moderado: '#B07F00', baixo: '#1E7A3C' };

  function mapSVG(o) {
    o = o || {};
    const evs = (o.events || S.events).filter(e => isActive(e) && S.layers[e.type]);
    let under = '', marks = '';
    evs.forEach(e => {
      const c = calc(e);
      if (e.type === 'calor') under += `<circle cx="${e.x}" cy="${e.y}" r="78" fill="url(#heat)"/>`;
      if (e.type === 'alagamento') under += `<circle cx="${e.x}" cy="${e.y}" r="46" fill="#2F80ED" fill-opacity=".18" stroke="#2F80ED" stroke-dasharray="5 4" stroke-opacity=".7"/>`;
      const col = RC[c.risk.level.k], sel = (o.selected || S.mapSel) === e.id;
      marks += `<g class="mk ${sel ? 'sel' : ''} ${c.risk.level.k === 'critico' ? 'pulse' : ''}" transform="translate(${e.x} ${e.y})" tabindex="0" role="button" data-act="mapPick" data-id="${e.id}" aria-label="${esc(e.title)} — risco ${c.risk.level.n}, confiança ${c.conf.level.n}">
        <circle class="halo" r="26" fill="${col}" opacity=".2"/><circle r="17" fill="${col}" stroke="#fff" stroke-width="3"/>
        <g transform="translate(-9 -9) scale(.75)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${svgIconPath(T[e.type].icon)}</g>
        ${sel ? `<circle r="24" fill="none" stroke="#0B2F4E" stroke-width="2.5" stroke-dasharray="4 3"/>` : ''}</g>`;
    });
    let sens = '';
    Object.values(S.sources).filter(s => s.x != null).forEach(s => {
      const col = s.status === 'online' ? '#0B5FA5' : s.status === 'degradado' ? '#B07F00' : '#B3261E';
      sens += `<g transform="translate(${s.x} ${s.y})"><rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" fill="#fff" stroke="${col}" stroke-width="2.5"/><title>${esc(s.name)} — ${s.status}</title></g><text x="${s.x + 11}" y="${s.y + 4}" font-size="10" fill="#34536F" font-weight="600">${s.id}</text>`;
    });
    return `<svg class="map" viewBox="0 0 900 560" role="img" aria-label="Mapa de eventos de risco da cidade (dados simulados)">${DEFS}${BASE}${under}${sens}${marks}</svg>`;
  }
  const svgIconPath = n => { const d = g.URIP.ic(n).match(/<path d="([^"]*)"/); return d ? `<path d="${d[1]}"/>` : ''; };

  /* ---------- shell ---------- */
  function shell(route, body) {
    const p = PERSONAS[S.role], nav = NAV[S.role];
    const unread = notifsFor().filter(n => !n.read).length, pend = S.events.filter(e => e.state === 'Reportado' || e.state === 'Em validação').length;
    const navItem = r => `<a class="nav-i ${route === r || (route === 'alerta' && r === 'alertas') ? 'on' : ''}" href="#${r}" data-nav="${r}">${ic(ROUTE_META[r].icon, 20)}<span>${ROUTE_META[r].label}</span>${r === 'notificacoes' && unread ? `<em class="badge">${unread}</em>` : ''}${r === 'validacao' && pend ? `<em class="badge warn">${pend}</em>` : ''}</a>`;
    const onl = Object.values(S.sources).filter(s => s.id !== 'AGT'), up = onl.filter(s => s.status === 'online').length;
    return `<div class="app">
      <header class="top"><a class="brand" href="#painel" aria-label="URIP — início">${ic('shield', 22)}<span><b>URIP</b><small>Urban Risk Intelligence Platform</small></span></a>
        <div class="top-r">
          <span class="live" id="livePill" title="Tempo desde a última leitura recebida"><i class="pulse-dot"></i><span id="liveTxt">${liveText()}</span></span>
          <span class="live hide-s" title="Fontes de dados com status online">${ic('antenna', 14)} ${up}/${onl.length} fontes online</span>
          <label class="role"><span class="sr">Perfil de uso (simulado)</span>${ic('user', 16)}<select id="roleSel" aria-label="Perfil de uso (simulado)">${Object.values(PERSONAS).map(x => `<option value="${x.key}" ${x.key === S.role ? 'selected' : ''}>${x.short}</option>`).join('')}</select></label>
          <a class="bell" href="#notificacoes" aria-label="Central de notificações${unread ? ', ' + unread + ' não lidas' : ''}">${ic('bell', 22)}${unread ? `<em class="badge">${unread}</em>` : ''}</a>
        </div></header>
      <nav class="side" aria-label="Navegação principal"><div class="who"><span class="avatar">${p.name.split(' ').map(x => x[0]).join('')}</span><div><b>${p.name}</b><small>${p.role}</small></div></div>${nav.map(navItem).join('')}
        <div class="side-foot"><span class="tag-demo">Protótipo acadêmico · dados simulados</span></div></nav>
      <main id="main" tabindex="-1">${body}</main>
      <nav class="tabs" aria-label="Navegação rápida">${nav.filter(r => ['painel', 'alertas', 'registrar', 'notificacoes', 'confianca', 'validacao'].includes(r)).slice(0, 5).map(navItem).join('')}</nav>
    </div>`;
  }
  function liveText() {
    let min = Infinity; S.events.forEach(e => e.obs.forEach(o => { if (o.kind === 'sensor') min = Math.min(min, NOW() - o.ts); }));
    return min === Infinity ? 'Sem leituras' : `Última leitura de sensor: ${min < 10000 ? 'agora' : Math.round(min / 1000) + ' s'}`;
  }
  function notifsFor() {
    const u = S.user, rank = k => E.RISK_LEVELS.length - 1 - E.RISK_LEVELS.findIndex(l => l.k === k);
    return S.notifs.filter(n => {
      if (S.role === 'morador') {
        if (n.audience !== 'moradores') return false;
        const ev = evById(n.ev); if (ev && u.areas.indexOf(ev.bairro) < 0) return false;
        if (n.level !== 'critico' && rank(n.level) < rank(u.minLevel)) return false;
      }
      return true;
    });
  }

  /* ---------- 0. Onboarding + consentimento LGPD ---------- */
  function vInicio() {
    const c = S.user.consents;
    return `<div class="hero"><div class="hero-in">
      <div class="hero-txt"><span class="eyebrow">${ic('shield', 16)} CitizenTech · Global Solution 2026.2</span>
        <h1>Urban Risk Intelligence Platform</h1>
        <p class="lead">Monitoramento e alertas de alagamentos, ilhas de calor e interrupções de energia, água e transporte — sempre mostrando <b>de onde vem cada dado</b> e <b>quanto confiar nele</b>.</p>
        <ul class="ticks"><li>${ic('check', 18)} Dados de sensores, bases públicas e da comunidade em um só lugar</li><li>${ic('check', 18)} Alertas priorizados por nível de risco e nível de confiança</li><li>${ic('check', 18)} Seus dados pessoais protegidos conforme a LGPD</li></ul></div>
      <form class="card start" id="startForm" novalidate>
        <h2>Entrar no protótipo</h2>
        <fieldset class="roles"><legend>Como você vai usar a plataforma?</legend>
          ${Object.values(PERSONAS).map(x => `<label class="role-card"><input type="radio" name="role" value="${x.key}" ${S.role === x.key ? 'checked' : ''}><span><b>${x.short}</b><small>${{ morador: 'Recebo alertas da minha área e registro ocorrências', agente: 'Valido eventos e coordeno a resposta', operador: 'Acompanho serviços essenciais e fontes de dados' }[x.key]}</small></span></label>`).join('')}
        </fieldset>
        <fieldset class="consents"><legend>Privacidade e consentimento (LGPD)</legend>
          <label class="check"><input type="checkbox" id="c_alertas" ${c.alertas ? 'checked' : ''}><span><b>Receber alertas da minha área de interesse</b> <em class="req">obrigatório</em><small>Usamos apenas o bairro que você escolher (não o GPS) para enviar alertas. Base legal: consentimento e proteção da vida.</small></span></label>
          <label class="check"><input type="checkbox" id="c_loc" ${c.localizacao ? 'checked' : ''}><span><b>Usar localização aproximada ao registrar ocorrências</b><small>Opcional. Arredondada para ~100 m e descartada após a validação.</small></span></label>
          <label class="check"><input type="checkbox" id="c_comp" ${c.compartilhar ? 'checked' : ''}><span><b>Compartilhar meus relatos com a Defesa Civil</b><small>Opcional. O nome nunca é exibido a outros moradores.</small></span></label>
        </fieldset>
        <p class="err" id="startErr" role="alert" hidden>Para continuar, aceite o recebimento de alertas da sua área.</p>
        <button class="btn primary lg" type="submit">Entrar ${ic('right', 18)}</button>
        <p class="fine">Você pode rever ou revogar qualquer consentimento em <b>Privacidade (LGPD)</b>. Todos os dados deste protótipo são simulados.</p>
      </form></div></div>`;
  }

  /* ---------- 1. Painel de acompanhamento ---------- */
  function vPainel() {
    const act = S.events.filter(isActive).map(e => ({ e, c: calc(e) })).sort((a, b) => b.c.prio - a.c.prio);
    const emitted = act.filter(x => x.e.state === 'Alerta emitido').length, pend = act.filter(x => x.e.state === 'Reportado' || x.e.state === 'Em validação').length;
    const onl = Object.values(S.sources).filter(s => s.id !== 'AGT'), up = onl.filter(s => s.status === 'online').length;
    const sel = S.mapSel && evById(S.mapSel), sc = sel && calc(sel);
    const kpi = (ico, lab, val, sub, cls) => `<div class="kpi ${cls || ''}">${ic(ico, 22)}<div><span class="kl">${lab}</span><b>${val}</b><small>${sub}</small></div></div>`;
    return pageHead('Painel de acompanhamento', 'Visão geral dos riscos urbanos em tempo real — Cidade Modelo (dados simulados)') + `
      <div class="kpis">${kpi('bell', 'Alertas ativos', emitted, 'enviados ao público', emitted ? 'k-alert' : '')}${kpi('shield', 'Aguardando validação', pend, 'fila de agentes', pend ? 'k-warn' : '')}${kpi('antenna', 'Fontes online', `${up}/${onl.length}`, 'sensores, APIs e comunidade')}${kpi('clock', 'Atualização dos dados', '<span id="kpiFresh">' + liveText().replace('Última leitura de sensor: ', '') + '</span>', 'meta: ingestão ≤ 60 s (p95)')}</div>
      <div class="grid-main">
        <section class="card map-card" aria-label="Mapa de riscos">
          <div class="card-h"><h2>Mapa de riscos</h2><div class="layers" role="group" aria-label="Camadas do mapa">${Object.keys(T).map(k => `<button class="layer ${S.layers[k] ? 'on' : ''}" data-act="layer" data-id="${k}" aria-pressed="${S.layers[k]}">${ic(T[k].icon, 15)}${T[k].short}</button>`).join('')}</div></div>
          <div class="map-wrap">${mapSVG()}</div>
          <div class="legend" aria-label="Legenda">${E.RISK_LEVELS.map(l => `<span class="lg"><i class="sw risk-bg-${l.k}"></i>${l.n}</span>`).join('')}<span class="lg"><i class="sw diamond"></i>Sensor</span><span class="lg lgn">Selecione um ponto para ver o resumo</span></div>
          ${sel ? `<div class="pick"><div class="pick-main">${tIcon(sel.type, sc.risk.level.k)}<div><b>${esc(sel.title)}</b><small>${esc(sel.addr)} · ${ago(sel.created)}</small><div class="chips">${riskChip(sc.risk.level)}${stateChip(sel.state)}${confBadge(sc.conf, true)}</div></div></div>
            <div class="pick-act"><button class="btn" data-act="openConf" data-id="${sel.id}">${ic('layers', 16)} Origem e confiança</button><button class="btn primary" data-act="openEv" data-id="${sel.id}">Ver detalhe ${ic('right', 16)}</button></div></div>` : ''}
        </section>
        <aside class="card side-list"><div class="card-h"><h2>Prioridade agora</h2><a class="lnk" href="#alertas">Ver todos ${ic('right', 14)}</a></div>
          <ol class="plist">${act.slice(0, 5).map(({ e, c }, i) => `<li><button class="prow" data-act="openEv" data-id="${e.id}"><span class="rank">${i + 1}</span>${tIcon(e.type, c.risk.level.k)}<span class="pt"><b>${esc(e.title)}</b><small>${esc(e.bairro)} · ${ago(e.created)}</small><span class="chips">${riskChip(c.risk.level)}${confBadge(c.conf)}</span></span></button></li>`).join('')}</ol>
          <p class="fine">Ordenado por risco (RN-03) e, em caso de empate, por confiança (RN-01).</p></aside>
      </div>
      ${demoCard()}`;
  }
  function demoCard() {
    return `<section class="card demo"><div class="card-h"><div><h2>${ic('play', 18)} Simulador de dados <span class="tag-demo">somente protótipo</span></h2><p class="sub">Dispare uma entrada de dados e acompanhe o fluxo completo: recebimento → validação → classificação → notificação.</p></div></div>
      <div class="demo-btns"><button class="btn" data-act="sim" data-id="sensor">${ic('antenna', 16)} Sensor SNS-033 mede 34 cm na Av. Industrial</button><button class="btn" data-act="sim" data-id="publica">${ic('building', 16)} API Defesa Civil: alerta de calor em Vila Aurora</button><button class="btn" data-act="sim" data-id="comunidade">${ic('users', 16)} Relato anônimo isolado: falta de energia no Centro</button></div></section>`;
  }

  /* ---------- 2. Lista de alertas ---------- */
  function vAlertas() {
    const f = S.filters;
    let list = S.events.map(e => ({ e, c: calc(e) })).filter(({ e, c }) =>
      (!f.tipo || e.type === f.tipo) && (!f.nivel || c.risk.level.k === f.nivel) &&
      (!f.estado || (f.estado === 'ativos' ? isActive(e) : e.state === f.estado)) &&
      (!f.q || (e.title + ' ' + e.bairro + ' ' + e.addr).toLowerCase().indexOf(f.q.toLowerCase()) >= 0));
    list.sort((a, b) => (isActive(b.e) - isActive(a.e)) || (b.c.prio - a.c.prio));
    const sel = (id, opts, v) => `<select data-filter="${id}" aria-label="${id}">${opts.map(o => `<option value="${o[0]}" ${o[0] === v ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    return pageHead('Alertas e eventos', 'Todos os eventos de risco, ordenados por prioridade (risco, depois confiança).') + `
      <div class="filters card">
        <label class="fld"><span>Buscar</span><input type="search" data-filter="q" value="${esc(f.q)}" placeholder="Rua, bairro ou título"></label>
        <label class="fld"><span>Tipo</span>${sel('tipo', [['', 'Todos'], ...Object.keys(T).map(k => [k, T[k].n])], f.tipo)}</label>
        <label class="fld"><span>Nível de risco</span>${sel('nivel', [['', 'Todos'], ...E.RISK_LEVELS.map(l => [l.k, l.n])], f.nivel)}</label>
        <label class="fld"><span>Estado</span>${sel('estado', [['', 'Todos'], ['ativos', 'Apenas ativos'], ...E.STATES.map(s => [s, s])], f.estado)}</label>
      </div>
      <p class="count" aria-live="polite">${list.length} evento(s)</p>
      <div class="rows">${list.length ? list.map(({ e, c }) => `<button class="arow risk-l-${c.risk.level.k} ${isActive(e) ? '' : 'inactive'}" data-act="openEv" data-id="${e.id}">
        ${tIcon(e.type, c.risk.level.k)}<span class="at"><span class="at-h"><b>${esc(e.title)}</b><small>${e.id}</small></span><small>${T[e.type].n} · ${esc(e.addr)}, ${esc(e.bairro)} · ${ago(e.created)}</small><span class="chips">${riskChip(c.risk.level)}${stateChip(e.state)}${confBadge(c.conf)}${srcChips(e)}</span></span>
        <span class="score" title="Pontuação de risco (0–100)"><b>${c.risk.score}</b><small>risco</small></span>${ic('right', 18, 'chev')}</button>`).join('') : empty('Nenhum evento encontrado', 'Ajuste os filtros para ver mais resultados.')}</div>`;
  }

  /* ---------- 3. Detalhe do alerta ---------- */
  function lifecycle(ev) {
    const main = ['Reportado', 'Em validação', 'Confirmado', 'Alerta emitido', 'Em monitoramento', 'Encerrado'];
    const seen = new Set(ev.history.map(h => h.state)), disc = ev.state === 'Descartado';
    const idx = main.indexOf(ev.state), lastSeen = Math.max.apply(null, main.map((s, i) => seen.has(s) ? i : -1));
    const steps = (disc ? ['Reportado', 'Em validação', 'Descartado'] : main).map((s, i) => {
      const cur = s === ev.state, done = seen.has(s) && !cur, skipped = !disc && !seen.has(s) && i < lastSeen;
      return `<li class="${cur ? 'cur' : done ? 'done' : skipped ? 'skip' : ''} ${s === 'Descartado' ? 'disc' : ''}" ${cur ? 'aria-current="step"' : ''}><i>${done ? ic('check', 14) : cur ? '●' : skipped ? '–' : i + 1}</i><span>${s}</span></li>`;
    });
    return `<ol class="steps" aria-label="Ciclo de vida do evento">${steps.join('')}</ol>`;
  }
  function vAlerta() {
    const ev = evById(S.selId) || S.events[0], c = calc(ev), role = S.role;
    const rec = (role === 'morador' ? ev.recs.morador : ev.recs.agente.concat(role === 'operador' ? [] : []));
    const dd = c.pol, st = ev.state;
    const act = [];
    if (role === 'agente') {
      if (st === 'Reportado' || st === 'Em validação') act.push(`<button class="btn ok" data-act="agConfirm" data-id="${ev.id}">${ic('check', 16)} Confirmar evento</button><button class="btn danger" data-act="agDiscard" data-id="${ev.id}">${ic('x', 16)} Descartar</button>`);
      if (st === 'Alerta emitido') act.push(`<button class="btn" data-act="agMonitor" data-id="${ev.id}">${ic('eye', 16)} Iniciar monitoramento</button>`);
      if (st === 'Em monitoramento') act.push(`<button class="btn" data-act="agReassess" data-id="${ev.id}">${ic('gauge', 16)} Reavaliar risco</button><button class="btn" data-act="agClose" data-id="${ev.id}">${ic('check', 16)} Encerrar evento</button>`);
    }
    if (role === 'morador' && isActive(ev)) act.push(S.user.corroborated[ev.id] ? `<span class="chip state">${ic('check', 14)} Você confirmou que também vê esta ocorrência</span>` : `<button class="btn" data-act="corrob" data-id="${ev.id}">${ic('eye', 16)} Também estou vendo isso</button>`);
    act.push(`<button class="btn" data-act="openConf" data-id="${ev.id}">${ic('layers', 16)} Origem e confiança</button>`);
    const bar = (l, v, w) => `<div class="meter"><span>${l}</span><div class="mt"><i style="width:${v}%"></i></div><b>${v}</b><small>peso ${w}</small></div>`;
    return `<a class="back" href="#alertas" data-nav="alertas">${ic('left', 16)} Voltar à lista</a>
      <div class="detail-h risk-l-${c.risk.level.k}">${tIcon(ev.type, c.risk.level.k)}<div class="dh-t"><span class="eyebrow">${T[ev.type].n} · ${ev.id}</span><h1>${esc(ev.title)}</h1><p class="sub">${ic('pin', 14)} ${esc(ev.addr)}, ${esc(ev.bairro)} · iniciado ${ago(ev.created)} · atualizado ${ago(ev.history[ev.history.length - 1].ts)}</p>
        <div class="chips">${riskChip(c.risk.level)}${stateChip(ev.state)}${confBadge(c.conf, true)}${srcChips(ev)}</div></div><div class="score big" title="Pontuação de risco"><b>${c.risk.score}</b><small>risco / 100</small></div></div>
      <div class="actions">${act.join('')}</div>
      <section class="card"><h2>Ciclo de vida do evento</h2>${lifecycle(ev)}</section>
      <div class="grid-2">
        <section class="card"><h2>O que fazer agora</h2>${rec.length ? `<ul class="recs">${rec.map(r => `<li>${ic('check', 16)}<span>${esc(r)}</span></li>`).join('')}</ul>` : '<p class="muted">Sem recomendações — evento encerrado.</p>'}
          <div class="callout">${ic('info', 18)}<span><b>Decisão do sistema (RN-04):</b> risco ${c.risk.level.n} × confiança ${c.conf.level.n} → ${esc(dd.text)}.</span></div></section>
        <section class="card"><h2>Por que este nível de risco?</h2>
          ${bar('Severidade', c.risk.S, '50%')}${bar('Exposição', c.risk.E, '30%')}${bar('Tendência', c.risk.T, '20%')}
          <p class="formula">Risco = 0,5·S + 0,3·E + 0,2·T = <b>${c.risk.score}</b> → <b>${c.risk.level.n}</b></p>
          <p class="muted sm">Exposição: ~${(ev.exposure.pop || 0).toLocaleString('pt-BR')} pessoas em 500 m${ev.exposure.sensiveis ? ` + ${ev.exposure.sensiveis} local(is) sensível(is) (${esc(ev.exposure.nota)})` : ''}. Tendência: ${{ subindo: 'subindo', estavel: 'estável', caindo: 'diminuindo' }[ev.trend]}.</p></section>
      </div>
      <section class="card"><div class="card-h"><h2>Dados que sustentam este alerta</h2><button class="btn sm" data-act="openConf" data-id="${ev.id}">Ver detalhes da origem ${ic('right', 14)}</button></div>
        <div class="obs-list">${ev.obs.map(o => { const s = S.sources[o.src], rel = o.rel != null ? o.rel : s.rel; return `<div class="obs"><span class="src src-${o.kind}">${ic(KIND[o.kind][1], 14)}${KIND[o.kind][0]}</span><div><b>${esc(o.label)}:</b> ${esc(o.value)}<small>${esc(s.name)} · leitura ${ago(o.ts)}</small></div><span class="rel" title="Confiabilidade da fonte">${rel}<small>fonte</small></span></div>`; }).join('')}</div></section>
      <div class="grid-2">
        <section class="card"><h2>Histórico</h2><ol class="timeline">${ev.history.slice().reverse().map(h => `<li><time>${clock(h.ts)}</time><div><b>${esc(h.state)}</b><small>${esc(h.actor)}${h.note ? ' — ' + esc(h.note) : ''}</small></div></li>`).join('')}</ol></section>
        <section class="card"><h2>Localização</h2><div class="map-wrap mini">${mapSVG({ selected: ev.id, events: [ev] })}</div><p class="muted sm">Mapa estilizado. Posição aproximada (~100 m) para proteger a privacidade de quem registrou.</p></section>
      </div>`;
  }

  /* ---------- 4. Origem e nível de confiança do dado ---------- */
  function gauge(c) {
    const L = Math.PI * 80, col = { alta: '#0B6B3A', media: '#946200', baixa: '#A32525' }[c.level.k];
    return `<svg class="gauge" viewBox="0 0 200 120" role="img" aria-label="Confiança ${c.score} de 100, nível ${c.level.n}"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#E3E8ED" stroke-width="16" stroke-linecap="round"/>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(L * c.score / 100).toFixed(1)} ${L.toFixed(1)}"/>
      <text x="100" y="92" text-anchor="middle" font-size="38" font-weight="800" fill="#14202B">${c.score}</text><text x="100" y="112" text-anchor="middle" font-size="13" font-weight="700" fill="${col}">${c.level.n.toUpperCase()}</text>
      <text x="14" y="116" font-size="9" fill="#5B6B7A">0</text><text x="176" y="116" font-size="9" fill="#5B6B7A">100</text></svg>`;
  }
  function vConfianca() {
    const ev = evById(S.confId) || S.events[0], c = calc(ev), k = c.conf;
    const comp = [['F', 'Confiabilidade da fonte', 'Maior confiabilidade entre as fontes do evento', k.F, '35%', 0.35], ['Fr', 'Frescor do dado', `Leitura mais recente há ${ageTxt(NOW() - k.minAge * 60000)}${ev.ttlFactor > 1 ? ' (janela ×3: fenômeno lento)' : ''}`, k.Fr, '25%', 0.25],
      ['Co', 'Corroboração', `${k.groups} origem(ns) independente(s) concordando`, k.Co, '25%', 0.25], ['Q', 'Qualidade / consistência', 'Valores plausíveis e sensores calibrados', k.Q, '15%', 0.15]];
    const opts = S.events.map(e => `<option value="${e.id}" ${e.id === ev.id ? 'selected' : ''}>${e.id} — ${esc(e.title)}${isActive(e) ? '' : ' (' + e.state.toLowerCase() + ')'}</option>`).join('');
    return pageHead('Origem e nível de confiança do dado', 'Saiba de onde vem cada informação, quão recente ela é e por que o sistema confia (ou não) nela.',
      `<label class="fld inline"><span>Evento</span><select id="confSel" aria-label="Selecionar evento">${opts}</select></label>`) + `
      <div class="grid-conf">
        <section class="card gcard"><h2>${esc(ev.title)}</h2>${gauge(k)}<div class="chips ctr">${confBadge(k, true)}${riskChip(c.risk.level)}</div>
          <p class="interp conf-${k.level.k}-bg">${{ alta: 'Dados consistentes, recentes e de fontes confiáveis. Pode orientar decisões e alertas ao público.', media: 'Há evidências, mas ainda faltam corroboração ou dados recentes. Alertas ao público dependem da validação de um agente.', baixa: 'Dado isolado, antigo ou pouco confiável. Não gera alerta ao público; vai para a fila de validação.' }[k.level.k]}</p></section>
        <section class="card"><h2>Como a confiança foi calculada</h2><p class="formula">C = 0,35·F + 0,25·Fr + 0,25·Co + 0,15·Q = <b>${k.score}</b></p>
          <div class="comps">${comp.map(([id, n, d, v, w, wt]) => `<div class="comp"><div class="comp-h"><b>${n}</b><span>${v} × ${w} = <b>${(v * wt).toFixed(1).replace('.', ',')}</b></span></div><div class="mt"><i style="width:${v}%"></i></div><small>${d}</small></div>`).join('')}</div>
          <div class="scale"><span class="conf conf-baixa"><span class="bars"><b class="on"></b><b></b><b></b></span>Baixa &lt; 50</span><span class="conf conf-media"><span class="bars"><b class="on"></b><b class="on"></b><b></b></span>Média 50–74</span><span class="conf conf-alta"><span class="bars"><b class="on"></b><b class="on"></b><b class="on"></b></span>Alta ≥ 75</span></div></section>
      </div>
      <section class="card"><h2>Origem dos dados</h2><p class="sub">Cada linha é uma observação recebida. A origem define o peso da fonte; relatos da comunidade aparecem agregados e sem identificação pessoal.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fonte</th><th>Tipo</th><th>Dado observado</th><th>Última leitura</th><th>Confiab. da fonte</th><th>Qualidade</th><th>Responsável · protocolo</th></tr></thead><tbody>
        ${ev.obs.map(o => { const s = S.sources[o.src], rel = o.rel != null ? o.rel : s.rel; return `<tr><td><b>${esc(s.name)}</b><small>${s.id}</small></td><td><span class="src src-${o.kind}">${ic(KIND[o.kind][1], 14)}${KIND[o.kind][0]}</span></td><td>${esc(o.label)}<small>${esc(o.value)}</small></td><td>${ago(o.ts)}<small>${clock(o.ts)}</small></td><td><span class="num">${rel}</span><small>${esc(s.calib)}</small></td><td><span class="num">${o.quality != null ? o.quality : '—'}</span></td><td>${esc(s.owner)}<small>${esc(s.proto)}</small></td></tr>`; }).join('')}
        </tbody></table></div>
        <div class="lineage" aria-label="Caminho do dado"><span class="ln">${ic('antenna', 16)}Fonte</span><i>→</i><span class="ln">${ic('download', 16)}Ingestão <small>p95 ${Math.max.apply(null, ev.obs.map(o => S.sources[o.src].lat95 || 0)).toString().replace('.', ',')} s</small></span><i>→</i><span class="ln">${ic('check', 16)}Validação</span><i>→</i><span class="ln">${ic('gauge', 16)}Classificação</span><i>→</i><span class="ln">${ic('bell', 16)}Notificação</span></div>
        <div class="callout">${ic('lock', 18)}<span><b>Proteção de dados pessoais:</b> o autor de um relato é pseudonimizado; moradores veem apenas a contagem de relatos. Agentes acessam dados individuais somente para validar a ocorrência, com registro de auditoria.</span></div>
      </section>`;
  }

  /* ---------- 5. Central de notificações ---------- */
  function vNotificacoes() {
    const all = notifsFor(), tab = S.notifTab;
    const list = all.filter(n => tab === 'todas' || (tab === 'nao_lidas' && !n.read) || (tab === 'alertas' && (n.level === 'critico' || n.level === 'alto')) || (tab === 'info' && (n.level === 'moderado' || n.level === 'baixo')));
    const tabs = [['todas', 'Todas', all.length], ['nao_lidas', 'Não lidas', all.filter(n => !n.read).length], ['alertas', 'Alertas', all.filter(n => n.level === 'critico' || n.level === 'alto').length], ['info', 'Informativas', all.filter(n => n.level === 'moderado' || n.level === 'baixo').length]];
    const chIcon = { push: ['phone', 'Push'], sms: ['sms', 'SMS'], email: ['mail', 'E-mail'], app: ['bell', 'No app'], painel: ['layers', 'Painel'] };
    const u = S.user;
    return pageHead('Central de notificações', 'Alertas e avisos enviados a você, com a origem e a confiança de cada um.', `<button class="btn" data-act="readAll">${ic('check', 16)} Marcar todas como lidas</button>`) + `
      <div class="grid-notif"><section>
        <div class="tabs-h" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" aria-selected="${tab === k}" class="tab ${tab === k ? 'on' : ''}" data-act="ntab" data-id="${k}">${l}<em>${n}</em></button>`).join('')}</div>
        <div class="rows">${list.length ? list.map(n => { const ev = evById(n.ev), c = ev && calc(ev); return `<article class="nrow risk-l-${n.level} ${n.read ? 'read' : ''}"><div class="n-top"><span class="chips">${riskChip(E.RISK_LEVELS.find(l => l.k === n.level))}${n.verifying ? '<span class="chip warnc">Em verificação</span>' : ''}${!n.read ? '<span class="newdot" aria-label="Não lida"></span>' : ''}</span><time>${ago(n.ts)} · ${clock(n.ts)}</time></div>
          <h3>${esc(n.title)}</h3><p>${esc(n.body)}</p>
          <div class="n-meta"><span class="n-ch">${n.channels.map(ch => `<span title="${chIcon[ch][1]}">${ic(chIcon[ch][0], 14)}${chIcon[ch][1]}</span>`).join('')}</span><span>${ic('clock', 14)} Entregue em ${String(n.delivSec).replace('.', ',')} s</span>${c ? `<span class="n-src">${srcChips(ev)}${confBadge(c.conf)}</span>` : ''}</div>
          <div class="n-act"><button class="btn sm primary" data-act="openEv" data-id="${n.ev}">Ver alerta</button><button class="btn sm" data-act="openConf" data-id="${n.ev}">Origem e confiança</button>${!n.read ? `<button class="btn sm ghost" data-act="readOne" data-id="${n.id}">Marcar como lida</button>` : ''}</div></article>`; }).join('') : empty('Nenhuma notificação aqui', 'Quando houver um alerta na sua área, ele aparecerá nesta lista.')}</div></section>
        <aside class="card prefs"><h2>Preferências de notificação</h2>
          <fieldset><legend>Canais</legend>${[['push', 'Notificação push'], ['sms', 'SMS (alertas críticos)'], ['email', 'E-mail'], ['app', 'Avisos no aplicativo']].map(([k, l]) => toggle(k, u.channels[k], l, 'chan')).join('')}</fieldset>
          <fieldset><legend>Nível mínimo para notificar</legend><select data-act="minLevel" aria-label="Nível mínimo">${E.RISK_LEVELS.slice().reverse().map(l => `<option value="${l.k}" ${u.minLevel === l.k ? 'selected' : ''}>${l.n} ou acima</option>`).join('')}</select><p class="muted sm">Alertas <b>Críticos</b> são sempre enviados, por segurança.</p></fieldset>
          <fieldset><legend>Áreas de interesse</legend>${Object.keys(D.BAIRROS).map(b => `<label class="check sm"><input type="checkbox" data-act="area" data-id="${esc(b)}" ${u.areas.indexOf(b) >= 0 ? 'checked' : ''}><span>${b}</span></label>`).join('')}</fieldset>
          <p class="muted sm">${ic('lock', 14)} Usamos só o bairro, nunca sua localização em tempo real.</p></aside></div>`;
  }

  /* ---------- 6. Registro comunitário ---------- */
  function vRegistrar() {
    const r = S.reg;
    if (r.done) {
      const d = r.done, ev = d.ev, c = calc(ev);
      return pageHead('Ocorrência registrada', '') + `<section class="card done"><div class="okmark">${ic('check', 32)}</div><h2>Obrigado! Seu relato foi recebido.</h2><p class="proto">Protocolo <b>${d.proto}</b></p>
        <div class="grid-2 tight"><div><span class="kl">O que aconteceu com seu relato</span><p>${d.created ? `Criamos um novo evento (<b>${ev.id}</b>) e ele entrou na fila de validação.` : (d.after > d.before ? `Seu relato foi somado a um evento já em andamento (<b>${ev.id}</b>) e <b>aumentou a confiança</b> de ${d.before} para ${d.after}.` : `Seu relato foi somado a um evento já em andamento (<b>${ev.id}</b>) e reforçou as evidências. A confiança já está em ${d.after}, perto do máximo da escala.`)}</p></div>
        <div><span class="kl">Situação atual</span><div class="chips">${stateChip(ev.state)}${riskChip(c.risk.level)}${confBadge(c.conf, true)}</div></div></div>
        <div class="callout">${ic('lock', 18)}<span>${r.anon ? 'Seu relato é <b>anônimo</b>: nenhum dado de identificação foi guardado' : 'Seu nome <b>não aparece</b> para outros moradores'}. Foto e texto são mantidos por no máximo 90 dias. A localização foi arredondada (~100 m).</span></div>
        <div class="actions"><button class="btn primary" data-act="openEv" data-id="${ev.id}">Acompanhar ocorrência</button><button class="btn" data-act="regReset">Fazer outro registro</button></div></section>`;
    }
    const sevHelp = { alagamento: ['Água na calçada ou no meio-fio', 'Água cobrindo meio pneu / entrando em quintais', 'Água invadindo imóveis ou arrastando veículos'], calor: ['Calor desconfortável', 'Calor intenso, pouca sombra', 'Calor extremo: pessoas passando mal'], energia: ['Poucas casas sem energia', 'Rua ou quadra sem energia', 'Bairro inteiro ou serviço essencial sem energia'], agua: ['Pressão baixa', 'Sem água há algumas horas', 'Sem água há mais de 4 h / serviço essencial'], transporte: ['Atrasos', 'Linha(s) paradas', 'Terminal/via interditados'] };
    const stepper = `<ol class="steps wiz" aria-label="Etapas do registro">${['O que está acontecendo', 'Local e detalhes', 'Revisar e enviar'].map((s, i) => `<li class="${r.step === i + 1 ? 'cur' : r.step > i + 1 ? 'done' : ''}" ${r.step === i + 1 ? 'aria-current="step"' : ''}><i>${r.step > i + 1 ? ic('check', 14) : i + 1}</i><span>${s}</span></li>`).join('')}</ol>`;
    let body = '';
    if (r.step === 1) body = `<h2>O que você está vendo?</h2><div class="type-grid" role="radiogroup" aria-label="Tipo de ocorrência">${Object.keys(T).map(k => `<button class="type-card ${r.type === k ? 'on' : ''}" role="radio" aria-checked="${r.type === k}" data-act="regType" data-id="${k}">${ic(T[k].icon, 28)}<b>${T[k].n}</b></button>`).join('')}</div>`;
    if (r.step === 2) body = `<h2>Onde e como está?</h2>
      <label class="fld"><span>Bairro</span><select id="rBairro"><option value="">Selecione…</option>${Object.keys(D.BAIRROS).map(b => `<option ${r.bairro === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
      <label class="fld"><span>Rua / ponto de referência</span><input id="rAddr" value="${esc(r.addr)}" placeholder="Ex.: Rua do Córrego, em frente ao nº 410"></label>
      <button class="btn sm" type="button" data-act="useLoc">${ic('pin', 16)} Usar minha localização aproximada</button>
      <fieldset class="sev"><legend>Quão grave está? (sua percepção)</legend>${['Leve', 'Moderada', 'Grave'].map((s, i) => `<label class="radio"><input type="radio" name="sev" value="${s}" ${r.sev === s ? 'checked' : ''}><span><b>${s}</b><small>${sevHelp[r.type][i]}</small></span></label>`).join('')}</fieldset>
      <label class="fld"><span>Descrição <em class="opt">opcional · máx. 280 caracteres</em></span><textarea id="rDesc" maxlength="280" rows="3" placeholder="Ex.: a água está subindo rápido na esquina">${esc(r.desc)}</textarea></label>
      <div class="fld"><span>Foto <em class="opt">opcional</em></span><label class="upload">${ic('camera', 20)}<span id="photoName">${r.photo ? esc(r.photo) : 'Anexar foto'}</span><input type="file" accept="image/*" id="rPhoto" class="sr"></label><small class="muted">Removemos automaticamente os metadados (EXIF) da foto, incluindo a localização exata.</small></div>
      <label class="check"><input type="checkbox" id="rAnon" ${r.anon ? 'checked' : ''}><span><b>Enviar como anônimo</b><small>Relatos anônimos têm peso menor no cálculo de confiança, mas nenhum dado de identificação é guardado.</small></span></label>`;
    if (r.step === 3) body = `<h2>Revise antes de enviar</h2><dl class="sum"><dt>Tipo</dt><dd>${ic(T[r.type].icon, 16)} ${T[r.type].n}</dd><dt>Local</dt><dd>${esc(r.addr || '—')}, ${esc(r.bairro)}</dd><dt>Gravidade percebida</dt><dd>${esc(r.sev)}</dd><dt>Descrição</dt><dd>${esc(r.desc) || '—'}</dd><dt>Foto</dt><dd>${r.photo ? esc(r.photo) : 'Sem foto'}</dd><dt>Identificação</dt><dd>${r.anon ? 'Anônimo' : PERSONAS[S.role].name + ' (visível só para agentes autorizados)'}</dd></dl>
      <div class="callout">${ic('lock', 18)}<span><b>Seus dados (LGPD):</b> coletamos somente tipo, local aproximado, texto e foto, para validar a ocorrência e alertar a vizinhança. Retenção: 90 dias. Você pode pedir a exclusão a qualquer momento em Privacidade.</span></div>`;
    return pageHead('Registrar ocorrência', 'Ajude sua comunidade: relatos de moradores somam-se aos sensores e às bases públicas.') + `<section class="card wizard">${stepper}${body}${r.err ? `<p class="err" role="alert">${r.err}</p>` : ''}
      <div class="actions wiz-act">${r.step > 1 ? `<button class="btn" data-act="regBack">${ic('left', 16)} Voltar</button>` : '<span></span>'}${r.step < 3 ? `<button class="btn primary" data-act="regNext">Continuar ${ic('right', 16)}</button>` : `<button class="btn primary" data-act="regSend">${ic('send', 16)} Enviar ocorrência</button>`}</div></section>`;
  }

  /* ---------- 7. Validação (agente) ---------- */
  function vValidacao() {
    const q = S.events.filter(e => e.state === 'Reportado' || e.state === 'Em validação').map(e => ({ e, c: calc(e) })).sort((a, b) => b.c.prio - a.c.prio);
    return pageHead('Fila de validação', 'Eventos que ainda precisam de confirmação humana. Quanto maior o risco, menor o prazo (SLA).') + (q.length ? q.map(({ e, c }) => {
      const sla = E.validationSLA(c.risk.level.k), used = Math.round((NOW() - e.created) / 60000), left = sla - used;
      return `<article class="card vrow risk-l-${c.risk.level.k}"><div class="v-top">${tIcon(e.type, c.risk.level.k)}<div class="v-t"><b>${esc(e.title)}</b><small>${esc(e.addr)}, ${esc(e.bairro)} · ${e.id}</small><div class="chips">${riskChip(c.risk.level)}${stateChip(e.state)}${confBadge(c.conf, true)}${srcChips(e)}</div></div><div class="sla ${left < 0 ? 'late' : ''}"><b>${left >= 0 ? left + ' min' : 'Atrasado ' + (-left) + ' min'}</b><small>SLA ${sla} min</small></div></div>
        <div class="obs-list">${e.obs.map(o => `<div class="obs"><span class="src src-${o.kind}">${ic(KIND[o.kind][1], 14)}${KIND[o.kind][0]}</span><div><b>${esc(o.label)}:</b> ${esc(o.value)}<small>${esc(S.sources[o.src].name)} · ${ago(o.ts)}</small></div></div>`).join('')}</div>
        <p class="muted sm"><b>Por que está aqui:</b> ${c.conf.score < 50 ? 'confiança Baixa — apenas relatos e sem fonte oficial disponível.' : 'confiança Média — falta corroboração para alerta público.'} Política atual: ${esc(c.pol.text)}.</p>
        <div class="actions"><button class="btn ok" data-act="agConfirm" data-id="${e.id}">${ic('check', 16)} Confirmar</button><button class="btn danger" data-act="agDiscard" data-id="${e.id}">${ic('x', 16)} Descartar</button><button class="btn" data-act="openConf" data-id="${e.id}">${ic('layers', 16)} Origem e confiança</button><button class="btn ghost" data-act="openEv" data-id="${e.id}">Abrir evento</button></div></article>`; }).join('') : empty('Fila vazia', 'Nenhum evento aguardando validação.'));
  }

  /* ---------- 8. Análises ---------- */
  function hbar(rows, o) {
    const w = 520, rh = 30, max = o.max, h = rows.length * rh + 24, lx = 150;
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="${esc(o.label)}">${rows.map((r, i) => { const y = i * rh + 4, bw = Math.max(2, (w - lx - 60) * r[1] / max); return `<text x="${lx - 8}" y="${y + 17}" text-anchor="end" font-size="12" fill="#34414D">${esc(r[0])}</text><rect x="${lx}" y="${y + 4}" width="${bw}" height="16" rx="3" fill="${r[2] || '#0B5FA5'}"/><text x="${lx + bw + 6}" y="${y + 17}" font-size="12" font-weight="700" fill="#14202B">${r[1]}${o.unit || ''}</text>`; }).join('')}
      ${o.target != null ? `<line x1="${lx + (w - lx - 60) * o.target / max}" x2="${lx + (w - lx - 60) * o.target / max}" y1="0" y2="${h - 18}" stroke="#B3261E" stroke-dasharray="4 3"/><text x="${lx + (w - lx - 60) * o.target / max}" y="${h - 4}" text-anchor="middle" font-size="11" fill="#B3261E" font-weight="700">${o.targetLabel}</text>` : ''}</svg>`;
  }
  function vbar(vals, labels) {
    const w = 520, h = 190, bw = 44, gap = (w - 40 - vals.length * bw) / (vals.length - 1), max = Math.max.apply(null, vals) + 4;
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Alertas emitidos por dia nos últimos 7 dias">${[0, 10, 20].map(v => `<line x1="30" x2="${w}" y1="${150 - 130 * v / max}" y2="${150 - 130 * v / max}" stroke="#E3E8ED"/><text x="24" y="${154 - 130 * v / max}" text-anchor="end" font-size="10" fill="#5B6B7A">${v}</text>`).join('')}
      ${vals.map((v, i) => { const x = 40 + i * (bw + gap), bh = 130 * v / max; return `<rect x="${x}" y="${150 - bh}" width="${bw}" height="${bh}" rx="4" fill="#0B5FA5"/><text x="${x + bw / 2}" y="${144 - bh}" text-anchor="middle" font-size="12" font-weight="700" fill="#14202B">${v}</text><text x="${x + bw / 2}" y="172" text-anchor="middle" font-size="12" fill="#5B6B7A">${labels[i]}</text>`; }).join('')}</svg>`;
  }
  function vAnalises() {
    const lat = Object.values(S.sources).filter(s => s.lat95 != null).sort((a, b) => b.lat95 - a.lat95).map(s => [s.id, s.lat95, s.lat95 <= 60 ? '#0B5FA5' : '#B3261E']);
    const heat = [['Parque Central', 41], ['Centro', 38.5], ['Distrito Industrial', 38], ['Vila Aurora', 36.5], ['Vila Nova Esperança', 35], ['Jardim das Águas', 33.5]].map(r => [r[0], r[1], r[1] > 40 ? '#B3261E' : r[1] > 36 ? '#C75A00' : '#B07F00']);
    const ev = S.events.length, emit = S.events.filter(e => e.history.some(h => h.state === 'Alerta emitido')).length;
    const kp = (ico, l, v, sub) => `<div class="kpi">${ic(ico, 22)}<div><span class="kl">${l}</span><b>${v}</b><small>${sub}</small></div></div>`;
    return pageHead('Análises e indicadores', 'Tendências e desempenho da plataforma (dados simulados) — apoio a agentes e operadores.') + `
      <div class="kpis k3">${kp('clock', 'Tempo de atualização', '28 s', 'ingestão → painel, p95 · meta ≤ 60 s')}${kp('shield', 'Qualidade dos alertas', '92%', 'alertas procedentes · falsos positivos: 8%')}${kp('user', 'Facilidade de uso', '47 s', 'tempo médio para registrar uma ocorrência · SUS 84')}</div>
      <div class="grid-2"><section class="card"><h2>Alertas emitidos por dia</h2><p class="sub">Últimos 7 dias</p>${vbar([14, 9, 12, 21, 11, 17, Math.max(8, emit + 5)], ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'])}</section>
        <section class="card"><h2>Latência de ingestão por fonte (p95)</h2><p class="sub">Segundos — vermelho = acima da meta de 60 s</p>${hbar(lat, { max: 70, unit: ' s', target: 60, targetLabel: 'meta 60 s', label: 'Latência p95 por fonte' })}</section></div>
      <div class="grid-2"><section class="card"><h2>Temperatura de superfície por bairro</h2><p class="sub">°C · ilhas de calor acima de 36 °C (Alto) e 40 °C (Crítico)</p>${hbar(heat, { max: 45, unit: ' °C', label: 'Temperatura por bairro' })}</section>
        <section class="card"><h2>Distribuição de confiança dos dados</h2><p class="sub">Eventos dos últimos 30 dias</p><div class="stack" role="img" aria-label="Alta 62%, Média 27%, Baixa 11%"><i class="conf-alta-bg" style="width:62%">Alta 62%</i><i class="conf-media-bg" style="width:27%">Média 27%</i><i class="conf-baixa-bg" style="width:11%">11%</i></div>
          <dl class="sum"><dt>Eventos monitorados</dt><dd>${ev}</dd><dt>Eventos descartados (falso positivo)</dt><dd>${S.events.filter(e => e.state === 'Descartado').length}</dd><dt>Tempo médio fonte → notificação</dt><dd>4,8 s</dd><dt>Disponibilidade (30 dias)</dt><dd>99,93%</dd></dl></section></div>`;
  }

  /* ---------- 9. Saúde das fontes ---------- */
  function vFontes() {
    const rows = Object.values(S.sources).filter(s => s.id !== 'AGT');
    const stt = { online: ['Online', 'ok'], degradado: ['Degradado', 'warn'], offline: ['Offline', 'bad'] };
    return pageHead('Fontes de dados', 'Saúde e disponibilidade de cada origem. Uma fonte fora do ar reduz a confiança dos eventos que dependem dela.') + `
      <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fonte</th><th>Tipo</th><th>Status</th><th>Envio a cada</th><th>Latência p95</th><th>Disponib. 30 d</th><th>Ação</th></tr></thead><tbody>
      ${rows.map(s => `<tr><td><b>${esc(s.name)}</b><small>${esc(s.owner)} · ${esc(s.proto)}</small></td><td><span class="src src-${s.kind}">${ic(KIND[s.kind][1], 14)}${KIND[s.kind][0]}</span></td><td><span class="st st-${stt[s.status][1]}"><i></i>${stt[s.status][0]}</span></td><td>${s.interval ? (s.interval >= 60 ? s.interval / 60 + ' min' : s.interval + ' s') : 'sob demanda'}</td><td>${s.lat95 != null ? String(s.lat95).replace('.', ',') + ' s' : '—'}</td><td>${String(s.uptime).replace('.', ',')}%</td>
        <td>${s.id === 'COM' ? '—' : `<button class="btn sm" data-act="srcToggle" data-id="${s.id}">${s.status === 'offline' ? 'Restabelecer (demo)' : 'Simular falha (demo)'}</button>`}</td></tr>`).join('')}</tbody></table></div>
      <div class="callout">${ic('info', 18)}<span><b>Disponibilidade:</b> a ingestão usa fila de mensagens e réplicas. Se uma fonte cai, os últimos dados continuam visíveis com selo de “dado antigo” e a confiança é recalculada automaticamente. Experimente “Simular falha” e veja o efeito em <a href="#confianca" data-nav="confianca">Origem e confiança</a>.</span></div></div>`;
  }

  /* ---------- 10. Privacidade / LGPD ---------- */
  function vPrivacidade() {
    const c = S.user.consents, p = PERSONAS[S.role];
    const cons = [['alertas', 'Receber alertas da minha área de interesse', 'Necessário para o serviço de alertas.', true], ['localizacao', 'Usar localização aproximada ao registrar ocorrências', 'Arredondada a ~100 m; descartada após a validação.'], ['compartilhar', 'Compartilhar meus relatos com a Defesa Civil', 'Seu nome nunca é exibido a outros moradores.'], ['sms', 'Receber SMS em alertas críticos', 'Número de telefone usado apenas para alertas.']];
    return pageHead('Privacidade e proteção de dados (LGPD)', 'Você controla seus dados. Veja o que coletamos, por quê e por quanto tempo.') + `
      <div class="grid-2"><section class="card"><h2>Meus consentimentos</h2>${cons.map(([k, l, d, req]) => `<div class="cons"><div><b>${l}</b><small>${d}</small></div>${toggle(k, c[k], c[k] ? 'Ativo' : 'Inativo', 'consent')}</div>`).join('')}<p class="muted sm">Consentimento registrado em ${new Date(S.user.consentTs).toLocaleString('pt-BR')} · versão 1.0 da política.</p></section>
        <section class="card"><h2>Meus direitos (art. 18)</h2><div class="rights"><button class="btn" data-act="exportData">${ic('download', 16)} Acessar / exportar meus dados</button><button class="btn" data-act="anonymize">${ic('user', 16)} Anonimizar meus relatos</button><button class="btn danger" data-act="deleteAcc">${ic('trash', 16)} Excluir minha conta e dados</button></div>
          <p class="muted sm">Atendimento ao titular em até 15 dias. Encarregado (DPO): <b>dpo@cidademodelo.example</b>.</p></section></div>
      <section class="card"><h2>O que coletamos e por quê</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dado</th><th>Finalidade</th><th>Base legal</th><th>Retenção</th><th>Proteção</th></tr></thead><tbody>
        <tr><td>Bairro de interesse</td><td>Enviar alertas da sua área</td><td>Consentimento</td><td>Enquanto a conta existir</td><td>Criptografia em repouso</td></tr>
        <tr><td>Relato (tipo, texto, foto)</td><td>Validar e alertar a vizinhança</td><td>Proteção da vida / interesse público</td><td>90 dias</td><td>Pseudonimização; EXIF removido</td></tr>
        <tr><td>Localização aproximada</td><td>Posicionar o relato no mapa</td><td>Consentimento</td><td>Descartada após validação</td><td>Arredondamento ~100 m</td></tr>
        <tr><td>Telefone / e-mail</td><td>Canais de notificação</td><td>Consentimento</td><td>Até a revogação</td><td>Criptografia e acesso restrito</td></tr></tbody></table></div></section>
      <section class="card"><h2>Quem acessou meus dados</h2><ul class="audit">${S.audit.slice().reverse().map(a => `<li><time>${new Date(a.ts).toLocaleString('pt-BR')}</time><div><b>${esc(a.who)}</b> — ${esc(a.what)}<small>Base legal: ${esc(a.basis)}</small></div></li>`).join('')}</ul></section>`;
  }

  g.URIP_VIEWS = { shell, vInicio, vPainel, vAlertas, vAlerta, vConfianca, vNotificacoes, vRegistrar, vValidacao, vAnalises, vFontes, vPrivacidade, ROUTE_META, liveText, notifsFor, riskChip, confBadge, stateChip, empty };
})(window);
