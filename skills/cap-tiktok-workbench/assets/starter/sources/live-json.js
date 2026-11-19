/* 真实数据插座（接数据以后才打开）。
 * 页面只读一份“标准格式”的 JSON：真实后台（Shopify、TikTok Shop、广告、表格…）的数据
 * 由单独的连接脚本整理成这个格式写入 data/live.json，或由本机接口返回。
 * 页面和零件都不用改：哪个数字/岗位出现在 live 数据里，就从“模拟”切换成“已接通”。
 *
 * 标准格式（全部字段可选）：
 * {
 *   "updatedAt": "2026-11-10T09:00:00+08:00",
 *   "kpis":  { "gmv": 1234.5, "orders": 18 },
 *   "roles": { "ads": { "status": "working", "progress": 0.4 } },
 *   "tasks": [ { "id": "L1", "title": "…", "roleId": "ads", "status": "working", "progress": 0.4, "result": null } ],
 *   "logs":  [ { "id": "log-1", "roleId": "ads", "text": "…", "level": "info" } ]
 * }
 * 字段规则见 Skill 的 references/state-contract.md。 */
(function () {
  'use strict';
  var WB = window.Workbench;

  WB.registerSource('live-json', function (wb) {
    var cfg = wb.company.live || {};
    var timer = null;
    var seenLogs = {};

    function apply(data) {
      if (!data || typeof data !== 'object') return;
      var kpis = data.kpis || {};
      Object.keys(kpis).forEach(function (key) {
        if (typeof kpis[key] === 'number' && isFinite(kpis[key])) wb.setKpi(key, kpis[key], 'live');
      });
      var roles = data.roles || {};
      Object.keys(roles).forEach(function (id) {
        var role = wb.roleById(id);
        if (!role) return;
        role.source = { type: 'live-json' };
        wb.setRole(id, roles[id]);
      });
      (data.tasks || []).forEach(function (t) {
        if (!t || !t.id || !wb.roleById(t.roleId)) return;
        var exists = wb.getState().tasks.find(function (x) { return x.id === t.id; });
        if (exists) {
          var before = exists.status;
          wb.updateTask(t.id, Object.assign({}, t, { source: 'live', waiting: t.status !== 'done' && t.status !== 'working' && exists.waiting }));
          // 执行插座接通的岗位：按真实任务状态驱动小人（干活 → 汇报 → 待命）
          if (wb.isConnected(t.roleId)) {
            if (t.status === 'working') wb.setRole(t.roleId, { status: 'working', taskId: t.id, progress: t.progress != null ? t.progress : 0.5 });
            if (t.status === 'done' && before !== 'done') {
              wb.setRole(t.roleId, { status: 'reporting', taskId: t.id, progress: 1 });
              setTimeout(function () { var st = wb.getState().roles[t.roleId]; wb.setRole(t.roleId, { status: 'idle', taskId: null, progress: 0, done: (st.done || 0) + 1 }); }, 3500);
            }
          }
        }
        else {
          var created = wb.newTask({ title: t.title || t.id, roleId: t.roleId, origin: 'live', source: 'live' });
          created.id = t.id;
          wb.updateTask(t.id, Object.assign({}, t, { source: 'live' }));
        }
      });
      (data.logs || []).forEach(function (l) {
        var key = l.id || (l.roleId + '|' + l.text);
        if (seenLogs[key]) return;
        seenLogs[key] = true;
        wb.log(l.roleId, l.text, l.level || 'info');
      });
      wb.getState().liveUpdatedAt = data.updatedAt || new Date().toISOString();
      wb.emit('live', data);
    }

    function poll() {
      fetch(cfg.url + (cfg.url.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) { wb.getState().liveError = null; apply(data); })
        .catch(function (e) {
          wb.getState().liveError = String(e.message || e);
          wb.emit('live-error', wb.getState().liveError);
        });
    }

    // 执行插座：老板派给“已接通”岗位的活，投递到本机任务箱（start_workbench.py 的 /api/outbox）
    wb.on('dispatch', function (p) {
      if (!wb.isConnected(p.role)) return;
      var body = { id: p.task.id, title: p.task.title, roleId: p.role.id, roleName: p.role.name,
        skill: p.role.executor.skill || null, createdAt: new Date(p.task.createdAt).toISOString() };
      fetch(cfg.outbox, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          wb.updateTask(p.task.id, { source: 'live', waiting: true });
          wb.log(p.role.id, '已交给真实执行：' + p.task.title, 'info');
        })
        .catch(function (e) {
          wb.updateTask(p.task.id, { source: 'live', waiting: true, error: '没送到任务箱（' + (e.message || e) + '）' });
          wb.log(p.role.id, '任务箱连不上：请用「启动工作台」打开页面', 'warn');
        });
    });

    return {
      start: function () {
        if (!cfg.enabled || !cfg.url || timer) return;
        poll();
        timer = setInterval(poll, Math.max(3000, cfg.interval || 10000));
      },
      stop: function () { clearInterval(timer); timer = null; }
    };
  });
})();
