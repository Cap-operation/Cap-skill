/* 模拟插座：没有接真实接口时，让小人有活干、数字会动。
 * 规则：只按公司配置里的岗位、职责、产出来编排，不编造经营数字的来源；
 * 所有模拟成果都标 source:'sim'，界面会显示“模拟”。 */
(function () {
  'use strict';
  var WB = window.Workbench;

  WB.registerSource('sim', function (wb) {
    var company = wb.company;
    var sim = company.sim || {};
    var speed = (sim.speed || 1) * (window.WorkbenchFX ? window.WorkbenchFX.motionFactor() : 1);
    var timer = null;
    var phaseUntil = {};

    function pick(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function fill(tpl, ctx) {
      return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; });
    }

    var genericLogs = [
      '正在{duty}', '整理资料：{task}', '对照要求检查第 {n} 项', '{duty}，进度 {p}%',
      '发现一个可以优化的地方，已记录', '同步给统筹：{task}'
    ];

    function startTask(role, task) {
      var st = wb.getState().roles[role.id];
      wb.setRole(role.id, { status: 'moving', taskId: task.id, progress: 0, lastActive: Date.now() });
      wb.updateTask(task.id, { status: 'working', progress: 0 });
      phaseUntil[role.id] = Date.now() + rand(1500, 3000) / speed;
      wb.log(role.id, fill('开始处理：{task}', { task: task.title }), 'info');
      return st;
    }

    function finishTask(role, task) {
      var output = pick(role.outputs) || '工作成果';
      var result = fill(pick(role.results) || '已交付《{output}》', { output: output, task: task.title });
      wb.updateTask(task.id, { status: 'done', progress: 1, result: result });
      var st = wb.getState().roles[role.id];
      wb.setRole(role.id, { status: 'idle', taskId: null, progress: 0, done: st.done + 1, lastActive: Date.now() });
      wb.log(role.id, result + '（模拟成果）', 'ok');
      company.kpis.forEach(function (k) {
        var s = k.sim || {};
        if (s.perTask && (!s.roles || s.roles.indexOf(role.id) !== -1)) {
          var cur = wb.getState().kpis[k.key];
          if (cur && cur.source === 'sim') wb.setKpi(k.key, round(cur.value + s.perTask, k), 'sim');
        }
      });
    }

    function round(v, k) {
      var d = k.decimals != null ? k.decimals : (Math.abs(v) < 10 ? 2 : 0);
      var f = Math.pow(10, d);
      return Math.round(v * f) / f;
    }

    function stepRole(role, now) {
      var state = wb.getState();
      var st = state.roles[role.id];
      var task = st.taskId ? state.tasks.find(function (t) { return t.id === st.taskId; }) : null;
      if (st.taskId && !task) { wb.setRole(role.id, { status: 'idle', taskId: null, progress: 0 }); return; }

      if (!task) {
        var queued = state.tasks.filter(function (t) { return t.roleId === role.id && t.status === 'queued'; }).pop();
        if (queued) { startTask(role, queued); return; }
        var autoGap = (sim.autoGap || 14000) / speed;
        if (sim.autoTasks !== false && now - st.lastActive > autoGap * rand(0.6, 1.6)) {
          var duty = pick(role.duties) || role.name + '日常工作';
          var t = wb.newTask({ title: duty, roleId: role.id, origin: 'auto' });
          startTask(role, t);
        }
        return;
      }

      if (st.status === 'moving') {
        if (now >= phaseUntil[role.id]) wb.setRole(role.id, { status: 'working' });
        return;
      }
      if (st.status === 'working') {
        var dur = (task.origin === 'boss' ? rand(9000, 16000) : rand(12000, 26000)) / speed;
        var inc = 500 / dur;
        var p = Math.min(1, task.progress + inc * rand(0.5, 1.5));
        var flow = task.flowId && company.flows.find(function (f) { return f.id === task.flowId; });
        var stage = flow ? Math.min(flow.stages.length - 1, Math.floor(p * flow.stages.length)) : 0;
        wb.updateTask(task.id, { progress: p, stage: stage });
        wb.setRole(role.id, { progress: p, lastActive: now });
        if (Math.random() < 0.06 * speed) {
          wb.log(role.id, fill(pick(role.logs) || pick(genericLogs), {
            duty: pick(role.duties) || role.name, task: task.title,
            p: Math.round(p * 100), n: 1 + Math.floor(Math.random() * 5)
          }));
        }
        if (p >= 1) {
          wb.setRole(role.id, { status: 'reporting' });
          phaseUntil[role.id] = now + rand(2200, 3400) / speed;
          wb.log(role.id, '去向老板汇报：' + task.title);
        }
        return;
      }
      if (st.status === 'reporting' && now >= phaseUntil[role.id]) {
        finishTask(role, task);
      }
    }

    function driftKpis() {
      company.kpis.forEach(function (k) {
        var s = k.sim || {};
        var cur = wb.getState().kpis[k.key];
        if (!cur || cur.source !== 'sim' || !s.step) return;
        if (Math.random() > 0.35) return;
        var v = cur.value + (Math.random() - 0.5 + (s.trend || 0)) * s.step;
        if (s.min != null) v = Math.max(s.min, v);
        if (s.max != null) v = Math.min(s.max, v);
        wb.setKpi(k.key, round(v, k), 'sim');
      });
    }

    function tick() {
      var state = wb.getState();
      if (state.paused) return;
      var now = Date.now();
      state.now = now;
      company.roles.forEach(function (r) {
        if (r.source && r.source.type && r.source.type !== 'sim') return;
        if (wb.isConnected(r)) return; // 执行插座已接通：只由真实结果驱动
        stepRole(r, now);
      });
      driftKpis();
      wb.emit('tick', now);
    }

    return {
      start: function () {
        if (timer) return;
        (sim.seedTasks || []).forEach(function (s) {
          if (wb.roleById(s.roleId) && !wb.isConnected(s.roleId)) wb.newTask({ title: s.title, roleId: s.roleId, origin: s.origin || 'auto' });
        });
        timer = setInterval(tick, 500);
        tick();
      },
      stop: function () { clearInterval(timer); timer = null; }
    };
  });
})();
