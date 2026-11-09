// Testes das regras de negócio (RN-01 a RN-05) e da máquina de estados.  Execução: node tests/engine.test.js
const assert = require('assert');
global.window = global;
const E = require('../js/engine.js');
const now = Date.now(), min = m => now - m * 60000;
const SRC = { S: { rel: 92 }, A: { rel: 95 }, COM: { rel: 55 } };
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓', name); };

console.log('RN-01/02 — confiança');
t('exemplo E-1042 → C=97 (Alta)', () => {
  const ev = { ttlFactor: 1, obs: [
    { src: 'S', kind: 'sensor', ts: min(0.5), quality: 96 }, { src: 'S', kind: 'sensor', ts: min(2), quality: 94, rel: 90 },
    { src: 'A', kind: 'publica', ts: min(6), quality: 100 }, { src: 'COM', kind: 'comunidade', ts: min(4), quality: 72, count: 7 }] };
  const c = E.computeConfidence(ev, now, SRC);
  assert.strictEqual(c.F, 95); assert.strictEqual(c.Fr, 100); assert.strictEqual(c.Co, 100); assert.strictEqual(c.Q, 91);
  assert.strictEqual(c.score, 97); assert.strictEqual(c.level.k, 'alta');
});
t('um único relato anônimo antigo → confiança Baixa', () => {
  const ev = { ttlFactor: 1, obs: [{ src: 'COM', kind: 'comunidade', ts: min(200), quality: 40, count: 1, rel: 35 }] };
  assert.strictEqual(E.computeConfidence(ev, now, SRC).level.k, 'baixa');
});
t('frescor: ≤5 min=100, ≤15=80, ≤60=50, ≤180=25, >180=0; janela ×3 para calor', () => {
  assert.deepStrictEqual([3, 10, 40, 120, 300].map(a => E.freshness(a, 1)), [100, 80, 50, 25, 0]);
  assert.strictEqual(E.freshness(40, 3), 80);
});
t('corroboração: 1→25, 2→65, ≥3→100; ≥3 relatos contam 2 origens', () => {
  assert.deepStrictEqual([0, 1, 2, 3, 5].map(E.corroboration), [0, 25, 65, 100, 100]);
  assert.strictEqual(E.independentGroups([{ src: 'S', kind: 'sensor' }, { src: 'COM', kind: 'comunidade', count: 3 }]), 3);
});
t('limites dos níveis de confiança: 49→Baixa, 50→Média, 74→Média, 75→Alta', () => {
  assert.deepStrictEqual([49, 50, 74, 75].map(v => E.pick(E.CONF_LEVELS, v).k), ['baixa', 'media', 'media', 'alta']);
});

console.log('RN-03 — risco');
t('exemplo E-1042 → R=95 (Crítico)', () => {
  const r = E.computeRisk({ type: 'alagamento', metric: { nivelCm: 38 }, exposure: { pop: 6200, sensiveis: 1 }, trend: 'subindo' });
  assert.deepStrictEqual([r.S, r.E, r.T, r.score, r.level.k], [100, 82, 100, 95, 'critico']);
});
t('severidade por tipo (alagamento, calor, serviço)', () => {
  assert.deepStrictEqual([3, 10, 20, 38].map(v => E.severity({ type: 'alagamento', metric: { nivelCm: v } })), [10, 40, 70, 100]);
  assert.deepStrictEqual([30, 34, 38, 41].map(v => E.severity({ type: 'calor', metric: { tempC: v } })), [10, 40, 70, 100]);
  assert.strictEqual(E.severity({ type: 'energia', metric: { afetados: 100, horas: 0.2 } }), 20);
  assert.strictEqual(E.severity({ type: 'energia', metric: { afetados: 100, horas: 0.2, servicoCritico: true } }), 100);
});
t('limites dos níveis de risco: 39→Baixo, 40→Moderado, 60→Alto, 80→Crítico', () => {
  assert.deepStrictEqual([39, 40, 59, 60, 79, 80].map(v => E.pick(E.RISK_LEVELS, v).k), ['baixo', 'moderado', 'moderado', 'alto', 'alto', 'critico']);
});

console.log('RN-04 — matriz de decisão');
t('Crítico × Alta → alerta público imediato (push + SMS)', () => { const p = E.policy('critico', 'alta'); assert.strictEqual(p.id, 'publico_imediato'); assert.deepStrictEqual(p.channels, ['push', 'sms']); });
t('Crítico × Média → alerta público com selo “em verificação”', () => assert.strictEqual(E.policy('critico', 'media').id, 'publico_verificacao'));
t('Alto × Média → somente agentes; Alto × Baixa → fila', () => { assert.strictEqual(E.policy('alto', 'media').audience, 'agentes'); assert.strictEqual(E.policy('alto', 'baixa').id, 'fila_validacao'); });
t('Baixo nunca notifica o público', () => ['alta', 'media', 'baixa'].forEach(c => assert.strictEqual(E.policy('baixo', c).audience, null)));
t('SLA de validação: 5/10/30/60 min', () => assert.deepStrictEqual(['critico', 'alto', 'moderado', 'baixo'].map(E.validationSLA), [5, 10, 30, 60]));

console.log('Máquina de estados');
t('transições válidas', () => {
  [['Reportado', 'Em validação'], ['Em validação', 'Confirmado'], ['Confirmado', 'Alerta emitido'], ['Alerta emitido', 'Em monitoramento'], ['Em monitoramento', 'Alerta emitido'], ['Em monitoramento', 'Encerrado'], ['Em validação', 'Descartado'], ['Reportado', 'Descartado'], ['Confirmado', 'Em monitoramento']]
    .forEach(([a, b]) => assert.ok(E.canTransition(a, b), a + ' → ' + b));
});
t('transições inválidas são bloqueadas; estados finais não saem', () => {
  [['Reportado', 'Confirmado'], ['Reportado', 'Alerta emitido'], ['Alerta emitido', 'Encerrado'], ['Encerrado', 'Reportado'], ['Descartado', 'Em validação']]
    .forEach(([a, b]) => assert.ok(!E.canTransition(a, b), a + ' → ' + b));
});
t('plausibilidade física rejeita valores absurdos', () => { assert.ok(!E.plausible('alagamento', 900)); assert.ok(!E.plausible('calor', 120)); assert.ok(E.plausible('alagamento', 34)); });
console.log(`\n${n} testes passaram.`);
