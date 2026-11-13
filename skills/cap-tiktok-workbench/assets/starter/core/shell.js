/* 工作台外壳：顶栏 KPI、岗位名册、主场景、任务流、日志、派活栏、岗位抽屉。
 * 外壳不画炫酷效果，炫酷效果全部由 parts/ 里的零件负责。 */
(function () {
  'use strict';
  var WB = window.Workbench;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var STATUS = { idle: '待命', moving: '前往工位', working: '干活中', reporting: '汇报中' };
  var TASK = { queued: '排队', working: '进行中', done: '已完成' };

  function hhmm(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  function fmt(k, v) {
    var n = Number(v) || 0;
    var s;
    if (k.format === 'pct') s = (n * 100).toFixed(k.decimals != null ? k.decimals : 1) + '%';
    else if (k.format === 'money' || Math.abs(n) >= 10000) {
      s = Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : n.toLocaleString('en-US', { maximumFractionDigits: k.decimals != null ? k.decimals : (Math.abs(n) < 1000 ? 2 : 0) });
    } else s = n.toLocaleString('en-US', { maximumFractionDigits: k.decimals != null ? k.decimals : 2 });
    return (k.prefix || '') + s;
  }

  function boot() {
    var cfg = window.WB_COMPANY;
    var root = $('#wb');
    try { WB.init(cfg); } catch (e) {
      root.innerHTML = '<div class="stage-empty">' + esc(e.message) + '</div>';
      return;
    }
    var c = WB.company;
    var theme = c.theme || {};
    document.documentElement.setAttribute('data-palette', theme.palette || 'cyber');
    var FX = window.WorkbenchFX;
    if (FX) { FX.applyBrand(theme); FX.background(theme); }
    document.title = (c.company && c.company.name ? c.company.name + ' · ' : '') + 'OPC 工作台';

    renderFrame(root, c);
    renderKpis(c);
    renderRoster(c);
    mountStage(c, theme.main_scene);
    bindCommand(c);
    bindDrawer(c);
    bindTools();

    var feedDirty = true;
    WB.on('task', function () { feedDirty = true; });
    WB.on('role', function () { feedDirty = true; });
    WB.on('log', function () { feedDirty = true; });
    WB.on('kpi', function (p) { updateKpi(c, p.key); });
    var toasted = {};
    WB.on('task', function (t) {
      if (t.status === 'done' && t.origin === 'boss' && !toasted[t.id]) {
        toasted[t.id] = true; toast(t);
        if (FX) { var r = $('#wb-stage').getBoundingClientRect(); FX.celebrate(theme.celebrate || 'fireworks', r.left + r.width / 2, r.top + r.height * 0.4); }
      }
    });
    setInterval(function () {
      $('#wb-clock').textContent = new Date().toTimeString().slice(0, 8);
      if (feedDirty) { feedDirty = false; updateRoster(c); renderTasks(c); renderLogs(c); updateBadge(); }
    }, 400);

    var sim = WB.source('sim');
    if (FX && theme.opening && theme.opening !== 'none') { WB.setPaused(true); FX.opening(theme.opening, c, function () { WB.setPaused(false); }); }
    if (sim) sim(WB).start();
    if (c.live && c.live.enabled && WB.source('live-json')) WB.source('live-json')(WB).start();
  }

  function renderFrame(root, c) {
    var co = c.company || {};
    var mark = co.mark || (co.name || 'O').slice(0, 1);
    root.innerHTML =
      '<header class="wb-top">' +
        '<div class="wb-brand"><div class="wb-mark">' + esc(mark) + '</div><div><div class="wb-name">' + esc(co.name || '我的 OPC 公司') + '</div>' +
        '<div class="wb-slogan">' + esc(co.slogan || '一个人，就是一家公司') + '</div></div></div>' +
        '<div class="wb-kpis" id="wb-kpis"></div>' +
        '<div class="wb-tools"><span class="wb-clock mono" id="wb-clock"></span><span class="badge sim" id="wb-badge">模拟数据</span>' +
        '<button class="tbtn" id="wb-big" title="只看主场景">大屏</button><button class="tbtn" id="wb-pause">暂停</button></div>' +
      '</header>' +
      '<main class="wb-main">' +
        '<section class="panel side-l"><div class="panel-h"><b>团队岗位</b><span id="wb-headcount"></span></div><div class="panel-b" id="wb-roster"></div></section>' +
        '<section class="panel stage"><div class="stage-label" id="wb-stage-label"></div><div class="stage-host" id="wb-stage"></div></section>' +
        '<section class="split side-r">' +
          '<div class="panel"><div class="panel-h"><b>任务流</b><span id="wb-taskcount"></span></div><div class="panel-b" id="wb-tasks"></div></div>' +
          '<div class="panel"><div class="panel-h"><b>实时日志</b><span>LIVE</span></div><div class="panel-b logs mono" id="wb-logs"></div></div>' +
        '</section>' +
      '</main>' +
      '<footer class="wb-cmd"><span class="wb-cmd-label">老板下令 ›</span>' +
        '<input id="wb-input" placeholder="' + esc((c.commands && c.commands.placeholder) || '一句话给团队派活，比如：找 5 个马来西亚的爆品') + '" maxlength="120" />' +
        '<div class="chips" id="wb-presets"></div><button class="go" id="wb-go">派活</button></footer>' +
      '<div class="chooser" id="wb-chooser"></div>' +
      '<div class="drawer-mask" id="wb-mask"></div>' +
      '<aside class="drawer" id="wb-drawer" aria-hidden="true"></aside>' +
      '<div class="toast-host" id="wb-toasts"></div>';
    $('#wb-headcount').textContent = c.roles.length + ' 个 AI 岗位';
  }

  function renderKpis(c) {
    $('#wb-kpis').innerHTML = c.kpis.map(function (k, i) {
      var color = k.color || 'var(--c' + ((i % 6) + 1) + ')';
      return '<div class="kpi" id="kpi-' + esc(k.key) + '" style="--k:' + color + '">' +
        '<div class="kpi-label">' + esc(k.label) + '<span class="kpi-src mono" data-src>模拟</span></div><div class="kpi-value mono"><span data-v></span><small>' + esc(k.unit || '') + '</small></div></div>';
    }).join('');
    c.kpis.forEach(function (k) { updateKpi(c, k.key, true); });
  }

  function updateKpi(c, key, quiet) {
    var k = c.kpis.find(function (x) { return x.key === key; });
    var el = document.getElementById('kpi-' + key);
    if (!k || !el) return;
    var s = WB.getState().kpis[key];
    el.querySelector('[data-v]').textContent = fmt(k, s.value);
    var src = el.querySelector('[data-src]');
    src.textContent = s.source === 'live' ? '已接通' : '模拟';
    src.className = 'kpi-src mono' + (s.source === 'live' ? ' live' : '');
    if (!quiet) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }

  function updateBadge() {
    var modes = WB.getState().sourceMode;
    var keys = Object.keys(modes);
    var live = keys.filter(function (k) { return modes[k] === 'live'; }).length;
    var b = $('#wb-badge');
    if (!live) { b.className = 'badge sim'; b.textContent = '模拟数据'; }
    else if (live < keys.length) { b.className = 'badge live'; b.textContent = '部分接通 ' + live + '/' + keys.length; }
    else { b.className = 'badge live'; b.textContent = '数据已接通'; }
  }

  function avatar(r, i) {
    return '<div class="role-av" style="--rc:' + WB.roleColor(r.id) + '">' + esc(r.mark || r.name.slice(0, 1)) + '</div>';
  }

  function renderRoster(c) {
    $('#wb-roster').innerHTML = c.roles.map(function (r, i) {
      return '<div class="role" data-id="' + esc(r.id) + '" style="--rc:' + WB.roleColor(r.id) + '">' + avatar(r, i) +
        '<div style="min-width:0"><div class="role-name">' + esc(r.name) + '<span data-st></span></div>' +
        '<div class="role-task" data-task></div><div class="bar"><i data-bar style="width:0"></i></div></div></div>';
    }).join('');
    $('#wb-roster').addEventListener('click', function (e) {
      var el = e.target.closest('.role');
      if (el) WB.open(el.getAttribute('data-id'));
    });
    updateRoster(c);
  }

  function updateRoster(c) {
    var st = WB.getState();
    c.roles.forEach(function (r) {
      var el = document.querySelector('.role[data-id="' + r.id + '"]');
      if (!el) return;
      var rs = st.roles[r.id];
      var t = rs.taskId && st.tasks.find(function (x) { return x.id === rs.taskId; });
      el.setAttribute('data-s', rs.status);
      el.classList.toggle('sel', st.selectedRole === r.id);
      el.querySelector('[data-st]').textContent = STATUS[rs.status] || rs.status;
      el.querySelector('[data-task]').textContent = t ? t.title : (r.title || (r.duties && r.duties[0]) || '');
      el.querySelector('[data-bar]').style.width = Math.round((rs.progress || 0) * 100) + '%';
    });
  }

  function renderTasks(c) {
    var st = WB.getState();
    var list = st.tasks.slice(0, 24);
    var active = st.tasks.filter(function (t) { return t.status !== 'done'; }).length;
    $('#wb-taskcount').textContent = active + ' 进行中';
    $('#wb-tasks').innerHTML = list.map(function (t) {
      var r = WB.roleById(t.roleId) || { name: '?' };
      return '<div class="task" data-origin="' + t.origin + '" style="--rc:' + WB.roleColor(t.roleId) + '">' +
        '<div class="task-top"><b>' + (t.origin === 'boss' ? '老板派' : esc(r.name)) + '</b><span>' + esc(r.name) + ' · ' + (t.waiting && t.status === 'queued' ? '等待真实执行' : (TASK[t.status] || t.status)) +
        ' <span class="tag ' + (t.source === 'live' ? 'live">已接通' : 'sim">模拟') + '</span></span></div>' +
        '<div class="task-title">' + esc(t.title) + '</div>' +
        (t.status !== 'done' ? '<div class="bar"><i style="width:' + Math.round(t.progress * 100) + '%"></i></div>' : '') +
        (t.result ? '<div class="task-result">✓ ' + esc(t.result) + '</div>' : '') +
        (t.error ? '<div class="task-result" style="color:var(--bad)">' + esc(t.error) + '</div>' : '') + '</div>';
    }).join('') || '<div class="stage-empty" style="position:static">还没有任务，试试在下面给团队派活</div>';
  }

  function renderLogs(c) {
    $('#wb-logs').innerHTML = WB.getState().logs.slice(0, 40).map(function (l) {
      var r = l.roleId ? WB.roleById(l.roleId) : null;
      return '<div class="log" data-l="' + l.level + '" style="--lc:' + (r ? WB.roleColor(r.id) : 'var(--accent)') + '"><time>' + hhmm(l.t) + '</time>' +
        '<span>' + (r ? '<b>' + esc(r.name) + '</b>' : '') + esc(l.text) + '</span></div>';
    }).join('');
  }

  var stageInst = null;
  function mountStage(c, id) {
    var host = $('#wb-stage');
    var part = WB.part(id);
    if (!part) {
      host.innerHTML = '<div class="stage-empty">主场景零件「' + esc(id) + '」没有加载。<br>已加载：' + esc(WB.partIds().join('、') || '无') + '</div>';
      return;
    }
    $('#wb-stage-label').textContent = (part.meta && part.meta.label ? part.meta.label : id).toUpperCase();
    stageInst = part.mount(host, WB, { mode: 'main' }) || {};
    window.addEventListener('resize', function () { if (stageInst.resize) stageInst.resize(); });
  }

  function bindCommand(c) {
    var input = $('#wb-input');
    var presets = (c.commands && c.commands.presets) || [];
    $('#wb-presets').innerHTML = presets.map(function (p) { return '<button class="chip">' + esc(p) + '</button>'; }).join('');
    $('#wb-presets').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (b) { input.value = b.textContent; send(); }
    });
    $('#wb-go').addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) send(); });
    var chooser = $('#wb-chooser');

    function send() {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      var res = WB.dispatch(text);
      if (res.ok) { input.value = ''; chooser.classList.remove('show'); WB.select(res.role.id); return; }
      chooser.innerHTML = '<span style="color:var(--boss)">这件事交给谁？</span>' + c.roles.map(function (r) {
        return '<button class="chip" data-id="' + esc(r.id) + '">' + esc(r.name) + '</button>';
      }).join('') + '<button class="chip" data-x>取消</button>';
      chooser.classList.add('show');
    }
    chooser.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      if (b.hasAttribute('data-id')) {
        var res = WB.dispatch(input.value.trim(), b.getAttribute('data-id'));
        if (res.ok) { input.value = ''; WB.select(res.role.id); }
      }
      chooser.classList.remove('show');
    });
  }

  var drawerInst = null;
  function bindDrawer(c) {
    var drawer = $('#wb-drawer'), mask = $('#wb-mask');
    function close() {
      drawer.classList.remove('show'); mask.classList.remove('show'); drawer.setAttribute('aria-hidden', 'true');
      if (drawerInst && drawerInst.destroy) drawerInst.destroy();
      drawerInst = null;
    }
    mask.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    WB.on('open', function (id) {
      var r = WB.roleById(id);
      if (!r) return;
      var i = c.roles.indexOf(r);
      var src = r.source && r.source.type && r.source.type !== 'sim';
      drawer.innerHTML =
        '<div class="drawer-h">' + avatar(r, i) + '<div><div class="drawer-title">' + esc(r.name) + '</div>' +
        '<div class="drawer-sub">' + esc(r.title || '') + '</div></div><button class="tbtn drawer-x">关闭 ✕</button></div>' +
        '<div class="drawer-b"><div class="drawer-stage"><div class="stage-host" id="wb-role-stage"></div></div>' +
        '<div class="drawer-side">' +
          '<h4>每天负责</h4><ul>' + (r.duties || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
          '<h4>交付成果</h4><ul>' + (r.outputs || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
          '<h4>数据插座</h4><div class="socket">现在：<b>' + (src ? '已接通' : '模拟数据') + '</b><br>' +
          (r.socket ? '以后接：' + esc(r.socket) : '以后可接真实后台；先把画面调满意再接') + '</div>' +
          '<h4>执行插座</h4><div class="socket">现在：<b>' + (WB.isConnected(r) ? '已接通 · 老板派的活交给 ' + esc((r.executor && r.executor.skill) || '真实执行') : '模拟干活') + '</b><br>' +
          (r.executor && r.executor.skill ? '以后由 <b>' + esc(r.executor.skill) + '</b> 真的去做' : '以后可交给对应的船长大师真的去做') + '</div>' +
          '<h4>最近任务</h4><div id="wb-role-tasks"></div>' +
        '</div></div>';
      drawer.querySelector('.drawer-x').addEventListener('click', close);
      var tasks = WB.getState().tasks.filter(function (t) { return t.roleId === id; }).slice(0, 8);
      drawer.querySelector('#wb-role-tasks').innerHTML = tasks.map(function (t) {
        return '<div class="task"><div class="task-top"><b>' + (TASK[t.status] || t.status) + '</b><span>' + hhmm(t.createdAt) + '</span></div><div class="task-title">' + esc(t.title) + '</div>' +
          (t.result ? '<div class="task-result">✓ ' + esc(t.result) + '</div>' : '') + '</div>';
      }).join('') || '<div class="drawer-sub">暂无</div>';
      drawer.classList.add('show'); mask.classList.add('show'); drawer.setAttribute('aria-hidden', 'false');
      var part = WB.part(r.module) || WB.part((c.theme && c.theme.role_default) || '');
      var host = drawer.querySelector('#wb-role-stage');
      if (part) setTimeout(function () { drawerInst = part.mount(host, WB, { mode: 'role', roleId: id }) || {}; }, 60);
      else host.innerHTML = '<div class="stage-empty">这个岗位还没有配模块零件（role.module）。</div>';
    });
  }

  function bindTools() {
    $('#wb-big').addEventListener('click', function () {
      $('#wb').classList.toggle('big');
      setTimeout(function () { if (stageInst && stageInst.resize) stageInst.resize(); }, 50);
      if (document.fullscreenElement == null && document.documentElement.requestFullscreen && $('#wb').classList.contains('big')) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else if (document.fullscreenElement && !$('#wb').classList.contains('big')) document.exitFullscreen();
    });
    $('#wb-pause').addEventListener('click', function (e) {
      var p = !WB.getState().paused;
      WB.setPaused(p);
      e.target.textContent = p ? '继续' : '暂停';
    });
  }

  function toast(t) {
    var r = WB.roleById(t.roleId);
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<b>' + esc(r ? r.name : '') + ' 完成了老板的任务</b><div>' + esc(t.result || t.title) + '</div><small>' + (t.source === 'live' ? '真实执行结果' : '模拟成果 · 执行插座接通后换成真实产出') + '</small>';
    $('#wb-toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, 5200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
