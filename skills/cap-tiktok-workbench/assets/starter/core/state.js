/* 工作台运行核心：公司配置 + 运行状态 + 事件 + 零件/插座注册。
 * 所有零件只通过这里拿数据，不自己造数据；数据从哪来由“插座”(sources/) 决定。
 * 字段说明见 Skill 的 references/state-contract.md。 */
(function () {
  'use strict';

  var parts = {};
  var sources = {};
  var listeners = {};
  var company = null;
  var state = null;
  var seq = 0;
  var session = Date.now().toString(36).slice(-4).toUpperCase(); // 每次打开页面不同，避免和任务箱里旧任务撞号

  function emit(evt, payload) {
    (listeners[evt] || []).slice().forEach(function (fn) {
      try { fn(payload, state); } catch (e) { console.error('[workbench] listener', evt, e); }
    });
  }

  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function off() {
      listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; });
    };
  }

  function roleById(id) {
    return company.roles.find(function (r) { return r.id === id; }) || null;
  }

  function init(cfg) {
    if (!cfg || cfg.schema !== 'cap-workbench/1') {
      throw new Error('公司配置缺失或 schema 不是 cap-workbench/1（检查 data/company.js）');
    }
    company = cfg;
    company.roles = company.roles || [];
    company.kpis = company.kpis || [];
    company.flows = company.flows || [];
    state = {
      startedAt: Date.now(),
      now: Date.now(),
      paused: false,
      kpis: {},
      roles: {},
      tasks: [],
      logs: [],
      selectedRole: null,
      sourceMode: {}
    };
    company.kpis.forEach(function (k) {
      var sim = k.sim || {};
      state.kpis[k.key] = { value: sim.start != null ? sim.start : 0, delta: 0, source: 'sim' };
      state.sourceMode[k.key] = 'sim';
    });
    company.roles.forEach(function (r, i) {
      state.roles[r.id] = {
        status: 'idle', taskId: null, progress: 0, done: 0,
        seat: i, lastActive: Date.now() - Math.random() * 20000
      };
    });
    return api;
  }

  function newTask(opts) {
    var role = roleById(opts.roleId);
    var task = {
      id: session + '-' + String(++seq).padStart(3, '0'),
      title: opts.title,
      roleId: opts.roleId,
      flowId: opts.flowId || (role && role.flow) || null,
      stage: 0,
      progress: 0,
      status: 'queued',
      origin: opts.origin || 'auto',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      result: null,
      source: opts.source || 'sim'
    };
    state.tasks.unshift(task);
    if (state.tasks.length > 60) state.tasks.length = 60;
    emit('task', task);
    return task;
  }

  function updateTask(id, patch) {
    var t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return null;
    Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
    t.updatedAt = Date.now();
    emit('task', t);
    return t;
  }

  function setRole(id, patch) {
    var r = state.roles[id];
    if (!r) return;
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
    emit('role', { id: id, role: r });
  }

  function setKpi(key, value, source) {
    var k = state.kpis[key];
    if (!k) return;
    k.delta = value - k.value;
    k.value = value;
    if (source) { k.source = source; state.sourceMode[key] = source; }
    emit('kpi', { key: key, kpi: k });
  }

  function log(roleId, text, level) {
    var entry = { t: Date.now(), roleId: roleId || null, text: text, level: level || 'info' };
    state.logs.unshift(entry);
    if (state.logs.length > 120) state.logs.length = 120;
    emit('log', entry);
    return entry;
  }

  /* 老板下令 → 路由到岗位 → 建任务。roleId 不传时按关键词匹配。 */
  function route(text) {
    var q = String(text || '').toLowerCase();
    var best = null, bestScore = 0;
    company.roles.forEach(function (r) {
      var words = [r.name].concat(r.keywords || [], r.duties || []);
      var score = 0;
      words.forEach(function (w) {
        String(w || '').toLowerCase().split(/[\s,，、/]+/).forEach(function (piece) {
          if (piece.length >= 2 && q.indexOf(piece) !== -1) score += piece.length;
        });
      });
      if (score > bestScore) { bestScore = score; best = r; }
    });
    return best;
  }

  function dispatch(text, roleId) {
    var role = roleId ? roleById(roleId) : route(text);
    if (!role) return { ok: false, reason: 'no-match', candidates: company.roles.map(function (r) { return r.id; }) };
    var task = newTask({ title: text, roleId: role.id, origin: 'boss' });
    log(role.id, '收到老板任务：' + text, 'boss');
    emit('dispatch', { task: task, role: role });
    return { ok: true, task: task, role: role };
  }

  function select(roleId) {
    state.selectedRole = roleId;
    emit('select', roleId);
  }

  function open(roleId) {
    state.selectedRole = roleId;
    emit('open', roleId);
  }

  function setPaused(p) {
    state.paused = !!p;
    emit('pause', state.paused);
  }

  var reducedMotion = false;
  try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }

  var api = {
    version: 1,
    init: init,
    on: on,
    emit: emit,
    get company() { return company; },
    getState: function () { return state; },
    roleById: roleById,
    newTask: newTask,
    updateTask: updateTask,
    setRole: setRole,
    setKpi: setKpi,
    log: log,
    route: route,
    dispatch: dispatch,
    select: select,
    open: open,
    setPaused: setPaused,
    reducedMotion: reducedMotion,
    /* 执行插座：该岗位的活是否交给真实执行（接口阶段，见 state-contract.md §5） */
    isConnected: function (role) {
      role = typeof role === 'string' ? roleById(role) : role;
      var live = company.live || {};
      return !!(role && live.enabled && live.outbox && role.executor && role.executor.connected === true);
    },
    registerPart: function (id, def) { parts[id] = def; },
    registerSource: function (id, factory) { sources[id] = factory; },
    part: function (id) { return parts[id] || null; },
    partIds: function () { return Object.keys(parts); },
    source: function (id) { return sources[id] || null; },
    color: function (name) {
      return getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    },
    roleColor: function (roleId) {
      var i = company.roles.findIndex(function (r) { return r.id === roleId; });
      var r = company.roles[i];
      if (r && r.color) return r.color;
      var pal = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'];
      return getComputedStyle(document.documentElement).getPropertyValue(pal[(i < 0 ? 0 : i) % pal.length]).trim();
    }
  };

  window.Workbench = api;
})();
