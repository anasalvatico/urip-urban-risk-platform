/* Roteamento, ações e ciclo de vida da aplicação. */
(function (g) {
  'use strict';
  const U = g.URIP, V = g.URIP_VIEWS, { E, D, S, esc, ic, calc, evById, isActive, NAV, PERSONAS, NOW } = U;
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const FORMS = ['inicio', 'registrar', 'privacidade'];

  /* ---------- toast / modal ---------- */
  function toast(msg, kind) {
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.setAttribute('role', 'status');
    t.innerHTML = `${ic(kind === 'bad' ? 'warn' : 'check', 18)}<span>${msg}</span>`;
    $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 4200); setTimeout(() => t.remove(), 4800);
  }
  let lastFocus = null;
  function modal(html, cls) {
    lastFocus = document.activeElement;
    const m = $('#modal'); m.innerHTML = `<div class="dlg ${cls || ''}" role="dialog" aria-modal="true" aria-labelledby="dlgT">${html}</div>`; m.hidden = false;
    const f = m.querySelector('[autofocus],button'); if (f) f.focus();
  }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  /* ---------- render ---------- */
  function route() { let r = (location.hash || '').replace('#', '') || (S.onboarded ? 'painel' : 'inicio'); if (!S.onboarded) r = 'inicio'; else if (r === 'inicio') r = 'painel'; if (r !== 'alerta' && !NAV[S.role].includes(r) && r !== 'inicio') r = 'painel'; return r; }
  const MAP = { inicio: 'vInicio', painel: 'vPainel', alertas: 'vAlertas', alerta: 'vAlerta', confianca: 'vConfianca', notificacoes: 'vNotificacoes', registrar: 'vRegistrar', validacao: 'vValidacao', analises: 'vAnalises', fontes: 'vFontes', privacidade: 'vPrivacidade' };
  function render(opts) {
    opts = opts || {};
    const r = route(), y = window.scrollY; S.route = r;
    app.innerHTML = r === 'inicio' ? V.vInicio() : V.shell(r, V[MAP[r]]());
    document.title = (r === 'inicio' ? '' : (V.ROUTE_META[r] ? V.ROUTE_META[r].label + ' · ' : '')) + 'URIP — Urban Risk Intelligence Platform';
    if (opts.keepScroll) window.scrollTo(0, y); else { window.scrollTo(0, 0); const m = $('#main'); if (m && opts.focus !== false) m.focus({ preventScroll: true }); }
  }
  function go(r) { if (location.hash === '#' + r) render(); else location.hash = r; }
  function refresh() { const a = document.activeElement; if (!$('#modal').hidden || FORMS.includes(S.route) || (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) { const p = $('#livePill'); return; } render({ keepScroll: true, focus: false }); }
  window.addEventListener('hashchange', () => render());

  /* ---------- simulador / pipeline ---------- */
  const SCEN = {
    sensor: { name: 'Sensor SNS-033 → 34 cm na Av. Industrial', p: { type: 'alagamento', bairro: 'Distrito Industrial', src: 'SNS-033', kind: 'sensor', label: 'Nível d’água', value: '34 cm (limiar de atenção: 30 cm)', metric: { nivelCm: 34 }, metricValue: 34, quality: 90, trend: 'subindo', title: 'Alagamento na passagem inferior da Av. Industrial' } },
    publica: { name: 'API Defesa Civil → alerta de calor em Vila Aurora', p: { type: 'calor', bairro: 'Vila Aurora', src: 'API-DC', kind: 'publica', label: 'Alerta de calor extremo', value: 'Índice de calor 39 °C — válido até 18h', metric: { tempC: 39 }, metricValue: 39, quality: 95, trend: 'subindo', exposure: { pop: 9600, sensiveis: 0, nota: 'Área residencial' }, title: 'Calor extremo em Vila Aurora', recs: { morador: ['Hidrate-se e evite sol direto entre 11h e 16h.', 'Cuide de idosos, crianças e animais.'], agente: ['Abrir pontos de hidratação.'] } } },
    comunidade: { name: 'Relato anônimo isolado → falta de energia no Centro', p: { type: 'energia', bairro: 'Centro', src: 'COM', kind: 'comunidade', anonymous: true, label: 'Relato de morador', value: '1 relato (anônimo): “sem luz na rua”', metric: { afetados: 80, horas: 0.5 }, metricValue: 80, quality: 50, rel: 35, exposure: { pop: 4000, sensiveis: 0, nota: '' }, title: 'Possível falta de energia no Centro' } }
  };
  function runSim(key) {
    const sc = SCEN[key]; if (!sc) return;
    const res = U.ingest(Object.assign({}, sc.p));
    const rows = res.steps.map((s, i) => `<li class="pstep ${s.ok ? '' : 'rej'} ${s.skipped ? 'skip' : ''}" data-i="${i}"><i>${s.ok ? (s.skipped ? '–' : ic('check', 14)) : ic('x', 14)}</i><div><b>${s.name}</b><em>${s.who}</em><small>${esc(s.detail)}</small></div><span class="ms">${s.ms ? s.ms + ' ms' : ''}</span></li>`).join('');
    const tot = res.total ? `${(res.total / 1000).toFixed(1).replace('.', ',')} s` : '';
    modal(`<div class="dlg-h"><h2 id="dlgT">Fluxo de processamento</h2><button class="x" data-act="closeModal" aria-label="Fechar">${ic('x', 20)}</button></div><p class="sub">${esc(sc.name)}</p>
      <ol class="pipe">${rows}</ol>
      ${res.rejected ? '<p class="err">O dado foi rejeitado na validação e não gerou evento.</p>' : `<div class="callout ${res.total ? '' : ''}">${ic('clock', 18)}<span><b>Tempo fonte → notificação: ${tot}</b> (meta: ≤ 60 s). Resultado: <b>${esc(res.ev.state)}</b> · risco ${res.c.risk.level.n} · confiança ${res.c.conf.level.n} (${res.c.conf.score}).</span></div>`}
      <div class="actions">${res.ev ? `<button class="btn primary" data-act="openEv" data-id="${res.ev.id}" autofocus>Ver evento ${res.ev.id}</button>` : ''}<button class="btn" data-act="closeModal">Fechar</button></div>`, 'wide');
    const items = document.querySelectorAll('.pstep'); items.forEach((el, i) => setTimeout(() => el.classList.add('on'), 250 + i * 380));
    render({ keepScroll: true, focus: false });
  }

  /* ---------- registro comunitário ---------- */
  function regSend() {
    const r = S.reg, c = S.user.consents;
    const lvl = { Leve: 0, Moderada: 1, Grave: 2 }[r.sev];
    const metricV = { alagamento: [8, 20, 35], calor: [33, 37, 41], energia: [100, 800, 6000], agua: [100, 800, 6000], transporte: [100, 800, 6000] }[r.type][lvl];
    const metric = r.type === 'alagamento' ? { nivelCm: metricV } : r.type === 'calor' ? { tempC: metricV } : { afetados: metricV, horas: [0.5, 1.5, 4.5][lvl] };
    const ex = S.events.find(e => isActive(e) && e.type === r.type && e.bairro === r.bairro), before = ex ? calc(ex).conf.score : null;
    const res = U.ingest({ type: r.type, bairro: r.bairro, addr: r.addr, src: 'COM', kind: 'comunidade', anonymous: r.anon, label: 'Relato de morador', value: (r.anon ? '1 relato (anônimo)' : '1 relato') + (r.desc ? ': “' + r.desc.slice(0, 80) + '”' : ''),
      metric, metricValue: metricV, quality: r.photo ? 72 : 55, rel: r.anon ? 35 : 55, trend: 'estavel', title: `${D.TYPES[r.type].n} — ${r.addr || r.bairro}`, exposure: { pop: 3000, sensiveis: 0, nota: '' } });
    const proto = 'OC-2026-' + (S.nextProto++);
    S.user.myReports.push({ proto, ev: res.ev.id, type: r.type, bairro: r.bairro, anon: r.anon, ts: NOW() });
    S.reg.done = { proto, ev: res.ev, created: res.created, before, after: calc(res.ev).conf.score };
    toast('Ocorrência registrada — protocolo ' + proto);
  }
  function regValidate() {
    const r = S.reg; r.err = '';
    if (r.step === 1 && !r.type) r.err = 'Escolha o tipo de ocorrência para continuar.';
    if (r.step === 2) { if (!r.bairro) r.err = 'Selecione o bairro.'; else if (!r.sev) r.err = 'Indique a gravidade percebida.'; }
    return !r.err;
  }
  const regReset = () => { S.reg = { step: 1, type: '', bairro: '', addr: '', sev: '', desc: '', anon: false, photo: '', done: null, err: '' }; };

  /* ---------- ações ---------- */
  const A = {
    closeModal, mapPick(id) { S.mapSel = S.mapSel === id ? null : id; render({ keepScroll: true, focus: false }); },
    layer(id) { S.layers[id] = !S.layers[id]; render({ keepScroll: true, focus: false }); },
    openEv(id) { closeModal(); S.selId = id; go('alerta'); },
    openConf(id) { closeModal(); S.confId = id; go('confianca'); },
    sim(id) { runSim(id); },
    agConfirm(id) {
      const ev = evById(id); if (!ev) return;
      ev.obs.push({ src: 'AGT', kind: 'agente', label: 'Verificação de agente', value: 'Confirmado por agente da Defesa Civil', ts: NOW(), quality: 100 });
      if (ev.state === 'Reportado') U.transition(ev, 'Em validação', 'Sistema', 'Dado normalizado');
      U.transition(ev, 'Confirmado', 'Agente Carlos M.', 'Validação humana: confirmado');
      const log = U.advance(ev, 'Sistema'); toast(`${ev.id} confirmado. ${log.filter(x => /Notific|Aviso/.test(x)).join(' · ') || 'Em monitoramento, sem notificação ao público.'}`);
      render({ keepScroll: true, focus: false });
    },
    agDiscard(id) {
      const ev = evById(id);
      modal(`<div class="dlg-h"><h2 id="dlgT">Descartar ${esc(ev.id)}?</h2><button class="x" data-act="closeModal" aria-label="Fechar">${ic('x', 20)}</button></div><p>${esc(ev.title)}</p>
        <label class="fld"><span>Motivo do descarte</span><select id="discWhy"><option>Sensor/base oficial contradiz o relato</option><option>Relato duplicado</option><option>Informação antiga ou fora do local</option><option>Sem evidências após contato</option></select></label>
        <div class="actions"><button class="btn danger" data-act="agDiscardOk" data-id="${id}" autofocus>Descartar evento</button><button class="btn" data-act="closeModal">Cancelar</button></div>`);
    },
    agDiscardOk(id) { const ev = evById(id), why = $('#discWhy').value; U.transition(ev, 'Descartado', 'Agente Carlos M.', why); closeModal(); toast(`${ev.id} descartado: ${esc(why)}.`); render({ keepScroll: true, focus: false }); },
    agMonitor(id) { const ev = evById(id); ev.autoMon = false; U.transition(ev, 'Em monitoramento', 'Agente Carlos M.', 'Entrega confirmada; monitoramento iniciado'); toast(ev.id + ' em monitoramento.'); render({ keepScroll: true, focus: false }); },
    agClose(id) { const ev = evById(id); U.transition(ev, 'Encerrado', 'Agente Carlos M.', 'Condições normalizadas'); toast(ev.id + ' encerrado.'); render({ keepScroll: true, focus: false }); },
    agReassess(id) { const ev = evById(id), before = ev.state, log = U.advance(ev, 'Sistema'), c = calc(ev); toast(log.length ? log.join(' · ') : `Reavaliado: risco ${c.risk.level.n} (${c.risk.score}), confiança ${c.conf.level.n} (${c.conf.score}). Sem mudança de estado.`); render({ keepScroll: true, focus: false }); },
    corrob(id) {
      const ev = evById(id), before = calc(ev).conf.score;
      const res = U.ingest({ type: ev.type, bairro: ev.bairro, src: 'COM', kind: 'comunidade', label: 'Relato de morador', value: '1 relato', metricValue: null, quality: 60, rel: 55, title: ev.title });
      S.user.corroborated[id] = true; toast(`Obrigado! Confiança do evento: ${before} → ${calc(ev).conf.score}.`); render({ keepScroll: true, focus: false });
    },
    ntab(id) { S.notifTab = id; render({ keepScroll: true, focus: false }); },
    readAll() { V.notifsFor().forEach(n => n.read = true); render({ keepScroll: true, focus: false }); toast('Todas as notificações marcadas como lidas.'); },
    readOne(id) { const n = S.notifs.find(x => x.id === id); if (n) n.read = true; render({ keepScroll: true, focus: false }); },
    regType(id) { S.reg.type = id; S.reg.sev = ''; S.reg.err = ''; render({ keepScroll: true, focus: false }); },
    regNext() { if (regValidate()) S.reg.step++; render({ keepScroll: false, focus: false }); },
    regBack() { S.reg.step--; S.reg.err = ''; render({ focus: false }); },
    regSend() { if (!S.reg.done) regSend(); render({ focus: false }); },
    regReset() { regReset(); render({ focus: false }); },
    useLoc() { if (!S.user.consents.localizacao) { toast('Ative “Usar localização aproximada” em Privacidade para usar este recurso.', 'bad'); return; } S.reg.bairro = 'Jardim das Águas'; S.reg.addr = S.reg.addr || 'Localização aproximada (~100 m)'; render({ keepScroll: true, focus: false }); toast('Localização aproximada aplicada (simulada).'); },
    srcToggle(id) {
      const s = S.sources[id];
      if (s.status === 'offline') { s.status = 'online'; toast(`${s.id} restabelecida. Dados voltam a ser atualizados.`); }
      else { s.status = 'offline'; S.events.forEach(e => e.obs.forEach(o => { if (o.src === id) o.ts = Math.min(o.ts, NOW() - 40 * 60000); })); toast(`${s.id} fora do ar: os dados ficam antigos e a confiança dos eventos cai.`, 'bad'); }
      render({ keepScroll: true, focus: false });
    },
    exportData() {
      const data = { titular: PERSONAS[S.role].name, perfil: S.role, consentimentos: S.user.consents, consentimento_em: new Date(S.user.consentTs).toISOString(), areas_de_interesse: S.user.areas, canais: S.user.channels, relatos: S.user.myReports, acessos_ao_meu_dado: S.audit.map(a => ({ em: new Date(a.ts).toISOString(), quem: a.who, o_que: a.what, base_legal: a.basis })) };
      modal(`<div class="dlg-h"><h2 id="dlgT">Meus dados (exportação)</h2><button class="x" data-act="closeModal" aria-label="Fechar">${ic('x', 20)}</button></div><p class="sub">Formato estruturado e de uso comum (JSON), conforme o direito à portabilidade.</p><textarea id="expTxt" class="code" readonly rows="14">${esc(JSON.stringify(data, null, 2))}</textarea><div class="actions"><button class="btn primary" data-act="copyExp" autofocus>Copiar</button><button class="btn" data-act="closeModal">Fechar</button></div>`, 'wide');
    },
    copyExp() { const t = $('#expTxt'); t.select(); try { navigator.clipboard.writeText(t.value).then(() => toast('Dados copiados.'), () => toast('Selecione o texto e copie manualmente.')); } catch (e) { toast('Selecione o texto e copie manualmente.'); } },
    anonymize() { S.user.myReports.forEach(r => r.anon = true); toast('Seus relatos foram anonimizados. A contagem nos eventos foi mantida.'); },
    deleteAcc() {
      modal(`<div class="dlg-h"><h2 id="dlgT">Excluir conta e dados?</h2><button class="x" data-act="closeModal" aria-label="Fechar">${ic('x', 20)}</button></div><p>Vamos apagar seus consentimentos, preferências e relatos identificados. Relatos já agregados em eventos permanecem de forma <b>anonimizada</b>. Esta ação não pode ser desfeita.</p><div class="actions"><button class="btn danger" data-act="deleteOk">Sim, excluir</button><button class="btn" data-act="closeModal" autofocus>Cancelar</button></div>`);
    },
    deleteOk() { closeModal(); S.user.myReports = []; S.user.consents = { alertas: false, localizacao: false, compartilhar: false, sms: false }; S.onboarded = false; S.audit.push({ ts: NOW(), who: 'Sistema', what: 'Conta e dados pessoais excluídos a pedido do titular', basis: 'Art. 18, VI — LGPD' }); go('inicio'); toast('Conta excluída. Seus dados pessoais foram apagados.'); }
  };

  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]'); if (nav && !nav.hasAttribute('data-act')) { /* hash nav handles it */ }
    const el = e.target.closest('[data-act]'); if (!el || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    if (el.tagName === 'A') e.preventDefault();
    const fn = A[el.dataset.act]; if (fn) fn(el.dataset.id);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    const mk = e.target.closest && e.target.closest('.mk'); if (mk && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); A.mapPick(mk.dataset.id); }
  });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

  document.addEventListener('change', e => {
    const t = e.target, act = t.dataset && t.dataset.act;
    if (t.id === 'roleSel') { S.role = t.value; S.notifTab = 'todas'; render(); toast('Perfil alterado para ' + PERSONAS[S.role].short + ' (simulação).'); return; }
    if (t.id === 'confSel') { S.confId = t.value; render({ keepScroll: true, focus: false }); return; }
    if (t.dataset && t.dataset.filter) { S.filters[t.dataset.filter] = t.value; render({ keepScroll: true, focus: false }); return; }
    if (act === 'chan') { S.user.channels[t.dataset.id] = t.checked; toast('Canal ' + (t.checked ? 'ativado' : 'desativado') + '.'); return; }
    if (act === 'minLevel') { S.user.minLevel = t.value; render({ keepScroll: true, focus: false }); return; }
    if (act === 'area') { const a = S.user.areas, i = a.indexOf(t.dataset.id); if (t.checked && i < 0) a.push(t.dataset.id); if (!t.checked && i >= 0) a.splice(i, 1); render({ keepScroll: true, focus: false }); return; }
    if (act === 'consent') { const k = t.dataset.id; if (k === 'alertas' && !t.checked) { t.checked = true; toast('O recebimento de alertas é necessário para o serviço. Para sair, use “Excluir minha conta”.', 'bad'); return; } S.user.consents[k] = t.checked; S.user.consentTs = NOW(); render({ keepScroll: true, focus: false }); toast('Consentimento ' + (t.checked ? 'concedido' : 'revogado') + ' e registrado.'); return; }
    if (t.id === 'rBairro') S.reg.bairro = t.value; if (t.id === 'rAnon') S.reg.anon = t.checked; if (t.name === 'sev') S.reg.sev = t.value;
    if (t.id === 'rPhoto') { S.reg.photo = t.files[0] ? t.files[0].name : ''; const pn = $('#photoName'); if (pn) pn.textContent = S.reg.photo || 'Anexar foto'; }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.filter === 'q') { S.filters.q = t.value; const pos = t.selectionStart; render({ keepScroll: true, focus: false }); const n = document.querySelector('[data-filter="q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
    if (t.id === 'rAddr') S.reg.addr = t.value; if (t.id === 'rDesc') S.reg.desc = t.value;
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'startForm') return; e.preventDefault();
    const f = e.target, c = S.user.consents; c.alertas = $('#c_alertas').checked; c.localizacao = $('#c_loc').checked; c.compartilhar = $('#c_comp').checked;
    if (!c.alertas) { $('#startErr').hidden = false; $('#c_alertas').focus(); return; }
    S.role = f.role.value; S.user.consentTs = NOW(); S.onboarded = true; go('painel'); toast('Bem-vindo(a)! Consentimentos registrados.');
  });

  /* ---------- relógio e heartbeat ---------- */
  function heartbeat() {
    S.events.forEach(e => { if (!isActive(e)) return; e.obs.forEach(o => {
      const s = S.sources[o.src]; if (!s || !s.interval || s.status === 'offline' || (o.kind !== 'sensor' && o.kind !== 'publica')) return;
      const age = (NOW() - o.ts) / 1000, lag = s.status === 'degradado' ? 40 + Math.random() * 60 : Math.random() * s.interval * 0.4;
      if (age > s.interval) o.ts = NOW() - lag * 1000; }); });
    refresh();
  }
  setInterval(() => { const a = $('#liveTxt'); if (a) a.textContent = V.liveText(); const b = $('#kpiFresh'); if (b) b.textContent = V.liveText().replace('Última leitura de sensor: ', ''); }, 1000);
  setInterval(heartbeat, 15000);

  g.URIP_APP = { refresh, render, go, toast };
  if (!location.hash) location.hash = 'inicio';
  render();
})(window);
