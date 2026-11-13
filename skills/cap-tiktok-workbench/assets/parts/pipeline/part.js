/* 零件：流水线 PIPELINE（id: pipeline）
 * 每一列是一道工序（company.flows 里的 stages；没有流水线时按任务状态：排队 / 进行中 / 汇报 / 已完成），
 * 每张卡是一个任务，放在它当前所在的工序里，按岗位上色、带进度条。
 * 老板最新派的、还没做完的任务所在那一列高亮，其它列变暗；发光连线把各列串起来，新任务滑入。
 * 只读 Workbench 状态，不造任务；画面上的数字都来自 wb.getState()。
 * 视觉抽取自自有作品「案例回放」五列工序板，已去掉案例内容、讲解字幕和示例数据。 */
(function () {
  'use strict';
  var WB = window.Workbench;
  if (!WB || typeof WB.registerPart !== 'function') return;

  var ID = 'pipeline';
  var P = ID + '-';
  var MONO = '"SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
  var FALL = ['#2EC4B6', '#8B7CF6', '#F08A4B', '#FF5C9A', '#C8F542', '#5B8CFF'];
  var BOSS = 'var(--boss, #FFE14D)';
  var STATUS_COLS = [
    { key: 'queued', name: '排队', tip: '等岗位腾出手', color: 'var(--warn, #FFB03D)' },
    { key: 'working', name: '进行中', tip: '岗位正在做', color: 'var(--accent, #35E0FF)' },
    { key: 'reporting', name: '汇报', tip: '做完了，正在交给老板', color: BOSS },
    { key: 'done', name: '已完成', tip: '已交付', color: 'var(--ok, #3DFFA8)' }
  ];
  var seq = 0;

  var CSS = [
    '.$-root{position:absolute;inset:0;overflow:hidden;color:var(--text,#e6f1ff);font-size:12px;line-height:1.35}',
    '.$-head{position:absolute;left:0;right:0;top:0;height:34px;display:flex;align-items:center;gap:10px;padding:4px 12px 0;box-sizing:border-box;white-space:nowrap;min-width:0}',
    '.$-main .$-head{padding-left:118px}',
    '.$-title{flex:none;max-width:40%;overflow:hidden;text-overflow:ellipsis;font-size:14px;font-weight:800;letter-spacing:.02em}',
    '.$-tabs{display:flex;gap:4px;min-width:0;overflow:hidden}',
    '.$-tab{flex:none;padding:2px 10px;border-radius:999px;border:1px solid var(--line-strong,rgba(120,200,255,.32));background:transparent;color:var(--muted,#7d8aa5);font:inherit;font-size:11.5px;cursor:pointer}',
    '.$-tab:hover{color:var(--accent,#35e0ff);border-color:var(--accent,#35e0ff)}',
    '.$-tab.on{color:var(--bg,#05070d);background:var(--accent,#35e0ff);border-color:var(--accent,#35e0ff);font-weight:700}',
    '.$-cnt{margin-left:auto;flex:none;display:flex;gap:10px;font-size:11.5px;color:var(--muted,#7d8aa5)}',
    '.$-cnt b{margin-left:3px;font-family:' + MONO + ';color:var(--text,#e6f1ff)}',
    '.$-cnt .w b{color:var(--accent,#35e0ff)}.$-cnt .q b{color:var(--warn,#ffb03d)}.$-cnt .d b{color:var(--ok,#3dffa8)}',
    '.$-scroll{position:absolute;left:0;right:0;top:38px;bottom:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:var(--line-strong,rgba(120,200,255,.32)) transparent}',
    '.$-inner{position:relative}',
    /* 顶部进度轨 */
    '.$-track{position:absolute;height:20px}',
    '.$-track::before{content:"";position:absolute;left:0;right:0;top:9px;height:3px;border-radius:3px;background:var(--line,rgba(120,200,255,.14))}',
    '.$-tf{position:absolute;left:0;top:9px;width:0;height:3px;border-radius:3px;box-shadow:0 0 10px color-mix(in srgb,var(--accent,#35e0ff) 45%,transparent);transition:width .8s ease}',
    '.$-tv{position:absolute;top:2px;left:0;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#fff,color-mix(in srgb,var(--tc,#fff) 60%,#ddd) 72%);',
    'box-shadow:0 0 0 2px var(--tc,var(--accent,#35e0ff)),0 0 14px var(--tc,var(--accent,#35e0ff));transition:left .8s ease,opacity .4s;opacity:0}',
    '.$-tv.on{opacity:1}',
    /* 列 */
    '.$-col{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;border-radius:10px;border:1px solid var(--line,rgba(120,200,255,.14));',
    'background:var(--panel,rgba(12,18,32,.78));transition:border-color .45s,box-shadow .45s,opacity .45s,filter .45s}',
    '.$-col[data-f="dim"]{opacity:.36;filter:saturate(.45)}',
    '.$-col[data-f="on"]{border-color:var(--sc);box-shadow:0 0 0 1px var(--sc),0 0 34px color-mix(in srgb,var(--sc) 30%,transparent)}',
    '.$-ch{flex:none;display:flex;align-items:center;gap:8px;padding:0 9px;border-bottom:1px solid var(--line,rgba(120,200,255,.14));min-width:0}',
    '.$-cn{flex:none;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:var(--sc);color:var(--bg,#05070d);font:800 13px/1 ' + MONO + '}',
    '.$-chx{flex:1;min-width:0}',
    '.$-chx b{display:block;font-size:13.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-chx em{display:block;font-style:normal;font-size:11px;color:var(--muted,#7d8aa5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-cc{flex:none;min-width:22px;padding:1px 7px;border-radius:999px;border:1px solid var(--line-strong,rgba(120,200,255,.32));font:700 11px/1.5 ' + MONO + ';color:var(--muted,#7d8aa5);text-align:center}',
    '.$-cc.live{color:var(--sc);border-color:var(--sc);box-shadow:0 0 12px color-mix(in srgb,var(--sc) 35%,transparent)}',
    '.$-cc.live::before{content:"";display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:var(--sc);vertical-align:1px;animation:$-blink 1s steps(2) infinite}',
    '@keyframes $-blink{50%{opacity:.35}}',
    '.$-body{flex:none;display:flex;flex-direction:column;gap:6px;padding:6px 7px 0}',
    '.$-empty{flex:none;margin:6px 7px;display:grid;place-items:center;min-height:44px;border:1.5px dashed var(--line-strong,rgba(120,200,255,.32));border-radius:8px;color:var(--muted,#7d8aa5);font-size:11.5px;text-align:center;padding:6px}',
    '.$-col[data-f="on"] .$-empty{border-color:var(--sc);color:var(--text,#e6f1ff)}',
    '.$-more{flex:none;margin:6px 7px 0;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.04);color:var(--muted,#7d8aa5);font-size:11px;text-align:center;white-space:nowrap}',
    /* 任务卡 */
    '.$-card{position:relative;flex:none;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:0 8px 0 10px;border-radius:7px;',
    'border:1px solid var(--line-strong,rgba(120,200,255,.32));background:color-mix(in srgb,var(--panel-solid,#0c1220) 90%,transparent);overflow:hidden;cursor:default;',
    'transition:border-color .3s,background .3s,opacity .4s,box-shadow .3s}',
    '.$-main .$-card{cursor:pointer}',
    '.$-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--rc);box-shadow:0 0 8px var(--rc)}',
    '.$-card:hover{border-color:var(--rc)}',
    '.$-card[data-s="working"]{border-color:color-mix(in srgb,var(--rc) 75%,transparent);background:color-mix(in srgb,var(--rc) 10%,var(--panel-solid,#0c1220));box-shadow:0 0 16px color-mix(in srgb,var(--rc) 22%,transparent)}',
    '.$-card[data-s="reporting"]{border-color:' + BOSS + ';box-shadow:0 0 16px color-mix(in srgb,' + BOSS + ' 28%,transparent)}',
    '.$-card[data-s="queued"]{opacity:.82}',
    '.$-card[data-s="done"]{opacity:.7}',
    '.$-card.$-boss{border-color:color-mix(in srgb,' + BOSS + ' 55%,transparent)}',
    '.$-ct{display:flex;align-items:center;gap:6px;min-width:0;font-size:12.5px;font-weight:600}',
    '.$-ct span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-mk{flex:none;width:17px;height:17px;display:grid;place-items:center;border-radius:4px;background:var(--rc);color:var(--bg,#05070d);font-size:11px;font-weight:800}',
    '.$-cv{flex:none;font:600 11px/1 ' + MONO + ';color:var(--muted,#7d8aa5)}',
    '.$-card[data-s="working"] .$-cv{color:var(--rc)}',
    '.$-card[data-s="done"] .$-cv{color:var(--ok,#3dffa8)}',
    '.$-card[data-s="reporting"] .$-cv{color:' + BOSS + '}',
    '.$-cm{display:flex;align-items:center;gap:6px;min-width:0;font-size:11px;color:var(--muted,#7d8aa5);white-space:nowrap}',
    '.$-rn{min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.$-org{flex:none;padding:0 5px;border-radius:3px;font-size:11px;line-height:15px;background:rgba(255,255,255,.06)}',
    '.$-org.boss{background:' + BOSS + ';color:var(--bg,#05070d);font-weight:800}',
    '.$-cs{margin-left:auto;flex:none}',
    '.$-cb{position:absolute;left:10px;right:8px;bottom:4px;height:2px;border-radius:2px;overflow:hidden;background:rgba(255,255,255,.06)}',
    '.$-cb i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--rc),color-mix(in srgb,var(--rc) 40%,#fff));transition:width .6s}',
    '.$-card[data-s="done"] .$-cb,.$-card[data-s="queued"] .$-cb{display:none}',
    '.$-card[data-s="working"] .$-cb i{background-size:250% 100%;background-image:linear-gradient(100deg,var(--rc) 30%,#fff 50%,var(--rc) 70%);animation:$-shim 1.4s linear infinite}',
    '@keyframes $-shim{from{background-position:120% 0}to{background-position:-120% 0}}',
    '.$-in{animation:$-in .55s cubic-bezier(.2,.8,.2,1) backwards}',
    '@keyframes $-in{from{opacity:0;transform:translateY(10px) scale(.94)}to{opacity:1;transform:none}}',
    '.$-rev{animation:$-rev .5s ease-out backwards}',
    '@keyframes $-rev{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    /* 连线 */
    '.$-lines{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:3}',
    '.$-ln path{fill:none}',
    '.$-ln .g{stroke:var(--cc);stroke-width:8;opacity:0;filter:blur(3px);transition:opacity .5s}',
    '.$-ln .c{stroke:var(--cc);stroke-width:2.4;stroke-linecap:round;stroke-dasharray:1 1;stroke-dashoffset:1;opacity:0;transition:stroke-dashoffset 1s ease-out,opacity .3s}',
    '.$-ln .f{stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-dasharray:2 14;opacity:0;animation:$-lf .9s linear infinite;transition:opacity .5s}',
    '.$-ln .d{fill:var(--cc);opacity:0;transition:opacity .4s}',
    '@keyframes $-lf{to{stroke-dashoffset:-16}}',
    '.$-ln[data-s="on"] .c{opacity:1;stroke-dashoffset:0}',
    '.$-ln.route[data-s="on"] .g{opacity:.55}',
    '.$-ln.route[data-s="on"] .f{opacity:.9}',
    '.$-ln.route[data-s="on"] .d{opacity:1}',
    '.$-ln.act .c{stroke-width:1.5}',
    '.$-ln.act[data-s="on"] .c{opacity:.5}',
    '.$-ln.act[data-s="on"] .g{opacity:.18}',
    '.$-ln.act[data-s="on"] .f{opacity:.55;animation-duration:1.4s}',
    '.$-ln.act[data-s="on"] .d{opacity:.7}',
    '.$-ln.base .c{stroke-width:1.4;stroke-dasharray:4 5;stroke-dashoffset:0;opacity:.55;transition:none}',
    '.$-ln.base .d{opacity:.7}',
    '.$-still,.$-still *{animation:none!important;transition:none!important}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('part-' + ID + '-css')) return;
    var s = document.createElement('style');
    s.id = 'part-' + ID + '-css';
    s.textContent = CSS.replace(/\$-/g, P);
    document.head.appendChild(s);
  }
  function T(s) { return s.replace(/\$-/g, P); }
  function tpl(s, v) { return T(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : ''; }); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  function setT(el, v) { if (el && el.textContent !== v) el.textContent = v; }
  function setA(el, k, v) { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); }
  function setW(el, r) {
    if (!el) return;
    var w = (clamp(r || 0, 0, 1) * 100).toFixed(1) + '%';
    if (el.style.width !== w) el.style.width = w;
  }
  function q(el, name) { return el ? el.querySelector('.' + P + name) : null; }
  function svgEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

  WB.registerPart(ID, {
    meta: { label: 'PIPELINE', modes: ['main', 'role'] },
    mount: function (host, wb, opts) {
      injectCss();
      opts = opts || {};
      var company = wb.company || {};
      var roles = company.roles || [];
      var flows = (company.flows || []).filter(function (f) { return f && f.id && Array.isArray(f.stages) && f.stages.length; });
      var mode = opts.mode === 'role' && opts.roleId && wb.roleById(opts.roleId) ? 'role' : 'main';
      var role = mode === 'role' ? wb.roleById(opts.roleId) : null;
      var reduced = !!wb.reducedMotion;
      var destroyed = false;

      var root = document.createElement('div');
      root.className = P + 'root' + (mode === 'main' ? ' ' + P + 'main' : '') + (reduced ? ' ' + P + 'still' : '');
      host.appendChild(root);

      var colorOf = {};
      roles.forEach(function (r, i) { colorOf[r.id] = wb.roleColor(r.id) || FALL[i % FALL.length]; });
      function rc(id) { return colorOf[id] || 'var(--accent, #35e0ff)'; }

      /* 看板有哪几种：每条流水线一种 + 「全部任务」按状态；岗位模式只看这个岗位 */
      var views = [];
      if (mode === 'role') {
        var rf = role.flow ? flows.find(function (f) { return f.id === role.flow; }) : null;
        views.push(rf ? { type: 'flow', flow: rf } : { type: 'status' });
      } else {
        flows.forEach(function (f) { views.push({ type: 'flow', flow: f }); });
        views.push({ type: 'status' });
      }
      var vi = 0;
      function view() { return views[vi] || views[0]; }
      function columns() {
        var v = view();
        if (v.type === 'flow') {
          return v.flow.stages.map(function (s, i) {
            return { name: String(s), tip: '', color: 'var(--c' + ((i % 6) + 1) + ', ' + FALL[i % FALL.length] + ')' };
          });
        }
        return STATUS_COLS;
      }
      function inScope(t) {
        if (!t) return false;
        if (mode === 'role') return t.roleId === role.id;
        var v = view();
        return v.type === 'flow' ? t.flowId === v.flow.id : true;
      }
      function phase(t, st) {
        if (t.status === 'done') return 'done';
        if (t.status === 'queued') return 'queued';
        var rs = (st.roles || {})[t.roleId] || {};
        if ((rs.taskId === t.id && rs.status === 'reporting') || (t.status === 'working' && (t.progress || 0) >= 1)) return 'reporting';
        return 'working';
      }
      function colOf(t, ph, n) {
        if (view().type === 'flow') return ph === 'done' ? n - 1 : clamp(Math.floor(Number(t.stage) || 0), 0, n - 1);
        return { queued: 0, working: 1, reporting: 2, done: 3 }[ph];
      }

      var G = null, W0 = 0, H0 = 0, pending = 0, ro = null, roRaf = 0;
      var cards = {}, lines = {}, offs = [], timers = [], firstPaint = true;

      /* ---------- 头部 ---------- */
      function headHTML() {
        var v = view();
        var title = mode === 'role' ? (role.name || role.id) + ' · ' + (v.type === 'flow' ? v.flow.name || v.flow.id : '任务状态')
          : (v.type === 'flow' ? (v.flow.name || v.flow.id) : '全部任务');
        var tabs = mode === 'main' && views.length > 1 ? views.map(function (x, i) {
          return '<button class="' + P + 'tab' + (i === vi ? ' on' : '') + '" data-v="' + i + '">' + esc(x.type === 'flow' ? (x.flow.name || x.flow.id) : '全部任务') + '</button>';
        }).join('') : '';
        return '<b class="' + P + 'title" title="' + esc(title) + '">' + esc(title) + '</b><span class="' + P + 'tabs">' + tabs + '</span><span class="' + P + 'cnt"></span>';
      }

      /* ---------- 布局（尺寸或看板变了才重算） ---------- */
      function build() {
        if (destroyed) return;
        var w = host.clientWidth, h = host.clientHeight;
        W0 = w; H0 = h;
        cards = {}; lines = {};
        if (w < 80 || h < 80) { root.innerHTML = ''; G = null; return; }
        var cols = columns(), n = cols.length;
        var pad = 12, gut = clamp(w * 0.028, 14, 34);
        var avail = w - 2 * pad - (n - 1) * gut;
        var colW = avail / n, scrollX = false;
        if (colW < 96) { colW = 96; scrollX = true; }
        var innerW = scrollX ? 2 * pad + n * colW + (n - 1) * gut : w;
        var sh = h - 38 - (scrollX ? 10 : 0);
        var trackH = sh >= 300 ? 20 : 0;
        var colTop = trackH ? trackH + 8 : 4, colH = Math.max(60, sh - colTop - 6);
        var hh = colW < 120 ? 38 : 44;
        var compact = colW < 132 || colH < 220;
        var ch = compact ? 40 : 54, gap = 6;
        var bodyH = colH - hh - 10;
        var maxCards = Math.max(1, Math.floor((bodyH + gap) / (ch + gap)));
        G = { w: w, h: h, n: n, cols: cols, pad: pad, gut: gut, colW: colW, colTop: colTop, colH: colH, hh: hh, ch: ch, compact: compact, maxCards: maxCards, innerW: innerW, innerH: sh, trackH: trackH, colEls: [] };

        var colHTML = cols.map(function (c, i) {
          var x = pad + i * (colW + gut);
          return tpl('<section class="$-col" data-c="{i}" data-f="" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--sc:{sc}">' +
            '<div class="$-ch" style="height:{hh}px"><b class="$-cn">{num}</b><div class="$-chx"><b title="{name}">{name}</b><em></em></div><span class="$-cc">0</span></div>' +
            '<div class="$-body"></div><div class="$-empty">{ph}</div><div class="$-more"></div></section>',
          { i: i, x: f1(x), y: f1(colTop), w: f1(colW), h: f1(colH), sc: c.color, hh: hh, num: i + 1, name: esc(c.name), ph: c.tip ? esc(c.tip) : '暂无任务' });
        }).join('');
        var trackBg = 'linear-gradient(90deg,' + cols.map(function (c) { return c.color; }).join(',') + ')';
        root.innerHTML = '<div class="' + P + 'head">' + headHTML() + '</div>' +
          '<div class="' + P + 'scroll"><div class="' + P + 'inner" style="width:' + f1(innerW) + 'px;height:' + f1(sh) + 'px">' +
          (trackH ? '<div class="' + P + 'track" style="left:' + f1(pad + colW / 2) + 'px;width:' + f1(Math.max(0, innerW - 2 * pad - colW)) + 'px;top:2px">' +
            '<i class="' + P + 'tf" style="background:' + trackBg + ';background-size:' + f1(Math.max(1, innerW - 2 * pad - colW)) + 'px 100%"></i><i class="' + P + 'tv"></i></div>' : '') +
          colHTML + '</div></div>';
        var inner = q(root, 'inner');
        var svg = svgEl('svg');
        svg.setAttribute('class', P + 'lines');
        svg.setAttribute('width', f1(innerW)); svg.setAttribute('height', f1(sh));
        svg.setAttribute('viewBox', '0 0 ' + f1(innerW) + ' ' + f1(sh));
        svg.setAttribute('aria-hidden', 'true');
        inner.appendChild(svg);
        G.svg = svg; G.cnt = q(root, 'cnt'); G.tf = q(root, 'tf'); G.tv = q(root, 'tv');
        Array.prototype.forEach.call(root.querySelectorAll('.' + P + 'col'), function (el, i) {
          G.colEls.push({ el: el, x: pad + i * (colW + gut), body: q(el, 'body'), empty: q(el, 'empty'), more: q(el, 'more'), cc: q(el, 'cc'), em: el.querySelector('.' + P + 'chx em') });
          if (firstPaint && !reduced) { el.classList.add(P + 'rev'); el.style.animationDelay = (i * 0.08).toFixed(2) + 's'; }
        });
        /* 列与列之间的底线（虚线 + 终点圆点） */
        for (var j = 0; j < n - 1; j++) {
          var y = colTop + hh / 2, xa = pad + j * (colW + gut) + colW, xb = xa + gut;
          var g = lineG('base', cols[j + 1].color);
          setPath(g, 'M' + f1(xa + 2) + ' ' + f1(y) + 'L' + f1(xb - 4) + ' ' + f1(y), xb - 4, y);
          svg.appendChild(g);
        }
        update(true);
        firstPaint = false;
      }

      /* ---------- 连线（原作的 glow / core / flow / dot 四层画法） ---------- */
      function lineG(cls, color) {
        var g = svgEl('g');
        g.setAttribute('class', P + 'ln ' + cls);
        g.setAttribute('data-s', cls === 'base' ? 'on' : 'hide');
        g.style.setProperty('--cc', color);
        g.innerHTML = '<path class="g"/><path class="c"' + (cls === 'base' ? '' : ' pathLength="1"') + '/><path class="f"/><circle class="d" r="3.5"/>';
        return g;
      }
      function setPath(g, d, x, y) {
        Array.prototype.forEach.call(g.querySelectorAll('path'), function (p) { if (p.getAttribute('d') !== d) p.setAttribute('d', d); });
        var c = g.querySelector('circle');
        setA(c, 'cx', f1(x)); setA(c, 'cy', f1(y));
      }
      function curve(x1, y1, x2, y2) {
        var dx = Math.max(10, (x2 - x1) * 0.5);
        return 'M' + f1(x1) + ' ' + f1(y1) + 'C' + f1(x1 + dx) + ' ' + f1(y1) + ' ' + f1(x2 - dx) + ' ' + f1(y2) + ' ' + f1(x2) + ' ' + f1(y2);
      }
      function syncLines(want) {
        var seen = {};
        want.forEach(function (w) {
          seen[w.id] = 1;
          var l = lines[w.id];
          if (!l) {
            l = lines[w.id] = { g: lineG(w.cls, w.color) };
            G.svg.appendChild(l.g);
            if (reduced) setA(l.g, 'data-s', 'on');
            else requestAnimationFrame(function () { if (!destroyed) setA(l.g, 'data-s', 'on'); });
          }
          if (l.color !== w.color) { l.color = w.color; l.g.style.setProperty('--cc', w.color); }
          setPath(l.g, w.d, w.ex, w.ey);
        });
        Object.keys(lines).forEach(function (id) {
          if (!seen[id]) { if (lines[id].g.parentNode) lines[id].g.parentNode.removeChild(lines[id].g); delete lines[id]; }
        });
      }

      /* ---------- 任务卡 ---------- */
      function makeCard(t) {
        var r = wb.roleById(t.roleId) || { name: t.roleId || '?' };
        var el = document.createElement('div');
        el.className = P + 'card' + (t.origin === 'boss' ? ' ' + P + 'boss' : '');
        el.setAttribute('data-id', t.id);
        el.setAttribute('data-r', t.roleId || '');
        el.style.height = G.ch + 'px';
        el.style.setProperty('--rc', rc(t.roleId));
        var mk = esc(r.mark || String(r.name || '?').slice(0, 1));
        el.innerHTML = G.compact
          ? tpl('<div class="$-ct"><b class="$-mk">{mk}</b><span></span><b class="$-cv"></b></div><i class="$-cb"><i></i></i>', { mk: mk })
          : tpl('<div class="$-ct"><span></span><b class="$-cv"></b></div><div class="$-cm"><b class="$-mk">{mk}</b><span class="$-rn">{rn}</span>' +
            '<span class="$-org{ob}">{org}</span><span class="$-cs"></span></div><i class="$-cb"><i></i></i>',
          { mk: mk, rn: esc(r.name || ''), ob: t.origin === 'boss' ? ' boss' : '', org: t.origin === 'boss' ? '老板派' : t.origin === 'live' ? '已接通' : '日常' });
        return { el: el, title: el.querySelector('.' + P + 'ct span'), cv: q(el, 'cv'), cs: q(el, 'cs'), bar: el.querySelector('.' + P + 'cb i'), col: null };
      }
      var PH_TXT = { queued: '排队', working: '进行中', reporting: '汇报中', done: '已完成' };
      function fillCard(c, t, ph) {
        setA(c.el, 'data-s', ph);
        setT(c.title, t.title || '');
        var tip = (t.title || '') + (t.result ? '\n✓ ' + t.result : '');
        if (c.el.title !== tip) c.el.title = tip;
        var p = clamp(Number(t.progress) || 0, 0, 1);
        setT(c.cv, ph === 'done' ? '✓' : ph === 'queued' ? (G.compact ? '排队' : '') : Math.round(p * 100) + '%');
        if (c.cs) setT(c.cs, PH_TXT[ph] || '');
        setW(c.bar, p);
      }

      /* ---------- 实时刷新 ---------- */
      function update(force) {
        pending = 0;
        if (destroyed || !G) return;
        var st = wb.getState();
        if (!st) return;
        var tasks = (st.tasks || []).filter(inScope);
        var n = G.n, buckets = [], i;
        for (i = 0; i < n; i++) buckets.push([]);
        var cnt = { queued: 0, working: 0, reporting: 0, done: 0 }, where = {};
        tasks.forEach(function (t, idx) {
          var ph = phase(t, st), c = colOf(t, ph, n);
          cnt[ph]++;
          if (c == null || c < 0 || c >= n) return;
          where[t.id] = c;
          buckets[c].push({ t: t, ph: ph, idx: idx });
        });
        var rank = { working: 0, reporting: 0, queued: 1, done: 2 };
        buckets.forEach(function (b) { b.sort(function (a, z) { return rank[a.ph] - rank[z.ph] || a.idx - z.idx; }); });

        /* 焦点：老板最新派的、还没做完的任务；没有就用最新在做的任务画路线，但不压暗 */
        var focus = null, route = null;
        tasks.some(function (t) { if (t.origin === 'boss' && t.status !== 'done') { focus = t; return true; } return false; });
        route = focus;
        if (!route) tasks.some(function (t) { if (t.status === 'working') { route = t; return true; } return false; });

        /* 先记下旧位置，做“换列”的滑动动画 */
        var first = {};
        if (!reduced && !force) Object.keys(cards).forEach(function (id) { first[id] = cards[id].el.getBoundingClientRect(); });
        var keep = {}, placed = {};
        buckets.forEach(function (b, ci) {
          var ce = G.colEls[ci];
          var vis = b.length > G.maxCards ? b.slice(0, G.maxCards - 1) : b;
          var prev = null;
          vis.forEach(function (x) {
            var t = x.t, c = cards[t.id], isNew = !c;
            if (!c) c = cards[t.id] = makeCard(t);
            keep[t.id] = 1;
            var next = prev ? prev.nextSibling : ce.body.firstChild;
            if (c.el !== next) ce.body.insertBefore(c.el, next);
            prev = c.el;
            c.moved = c.col != null && c.col !== ci;
            c.col = ci;
            fillCard(c, t, x.ph);
            placed[t.id] = { ci: ci, c: c };
            if (isNew && !force && !reduced) {
              c.el.classList.add(P + 'in');
              c.el.addEventListener('animationend', function done(e) {
                if (e.target !== c.el) return;
                c.el.classList.remove(P + 'in');
                c.el.removeEventListener('animationend', done);
              });
            }
          });
          var more = b.length - vis.length;
          setT(ce.more, more > 0 ? '还有 ' + more + ' 个任务' : '');
          ce.more.style.display = more > 0 ? '' : 'none';
          ce.empty.style.display = b.length ? 'none' : '';
          var w = 0, qd = 0, dn = 0;
          b.forEach(function (x) { if (x.ph === 'working' || x.ph === 'reporting') w++; else if (x.ph === 'queued') qd++; else dn++; });
          setT(ce.cc, String(b.length));
          ce.cc.className = P + 'cc' + (w ? ' live' : '');
          var parts = [];
          if (w) parts.push('进行中 ' + w);
          if (qd) parts.push('排队 ' + qd);
          if (dn) parts.push('完成 ' + dn);
          setT(ce.em, parts.join(' · ') || (G.cols[ci].tip || '空闲'));
        });
        Object.keys(cards).forEach(function (id) {
          if (!keep[id]) { if (cards[id].el.parentNode) cards[id].el.parentNode.removeChild(cards[id].el); delete cards[id]; }
        });
        /* FLIP：换了列的卡从旧位置滑过去 */
        if (!reduced && !force) {
          Object.keys(first).forEach(function (id) {
            var c = cards[id];
            if (!c || !c.moved) return;
            var a = first[id], b2 = c.el.getBoundingClientRect();
            var dx = a.left - b2.left, dy = a.top - b2.top;
            if (Math.abs(dx) + Math.abs(dy) < 2) return;
            c.el.style.transition = 'none';
            c.el.style.transform = 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px)';
            c.el.style.zIndex = '5';
            requestAnimationFrame(function () {
              if (destroyed) return;
              c.el.style.transition = 'transform .65s cubic-bezier(.2,.8,.2,1), border-color .3s, background .3s, opacity .4s';
              c.el.style.transform = '';
              timers.push(setTimeout(function () { c.el.style.zIndex = ''; c.el.style.transition = ''; }, 700));
            });
          });
          if (timers.length > 40) timers = timers.slice(-20);
        }

        /* 列高亮 / 变暗 */
        var fCol = focus && where[focus.id] != null ? where[focus.id] : -1;
        G.colEls.forEach(function (ce, ci) { setA(ce.el, 'data-f', fCol < 0 ? '' : ci === fCol ? 'on' : 'dim'); });

        /* 连线：路线（焦点任务从第 1 列一路亮到它所在的卡）+ 其它在做的任务的入线 */
        var want = [], railY = G.colTop + G.hh / 2;
        function colR(ci) { return G.colEls[ci].x + G.colW; }
        function cardY(c) { return G.colTop + 1 + c.el.offsetTop + c.el.offsetHeight / 2; }
        var rp = route && placed[route.id];
        if (rp) {
          var color = rc(route.roleId);
          for (var j = 0; j < rp.ci; j++) {
            var last = j === rp.ci - 1;
            var x1 = colR(j), x2 = G.colEls[j + 1].x, y2 = last ? cardY(rp.c) : railY;
            want.push({ id: 'r:' + route.id + ':' + j, cls: 'route', color: color, d: curve(x1, railY, x2, y2), ex: x2, ey: y2 });
          }
        }
        var acts = 0;
        Object.keys(placed).forEach(function (id) {
          var p = placed[id];
          if (acts >= 10 || (route && id === route.id) || p.ci === 0) return;
          var ph = p.c.el.getAttribute('data-s');
          if (ph !== 'working' && ph !== 'reporting') return;
          acts++;
          var x1 = colR(p.ci - 1), x2 = G.colEls[p.ci].x, y2 = cardY(p.c);
          want.push({ id: 'a:' + id, cls: 'act', color: rc(p.c.el.getAttribute('data-r')), d: curve(x1, railY, x2, y2), ex: x2, ey: y2 });
        });
        syncLines(want);

        /* 顶部进度轨 */
        if (G.tf) {
          var tCol = rp ? rp.ci : -1;
          var span = Math.max(1, G.innerW - 2 * G.pad - G.colW);
          var pos = tCol < 0 ? 0 : (tCol * (G.colW + G.gut)) / span;
          G.tf.style.width = (clamp(pos, 0, 1) * 100).toFixed(1) + '%';
          G.tv.style.left = (clamp(pos, 0, 1) * 100).toFixed(1) + '%';
          G.tv.classList.toggle('on', tCol >= 0);
          if (rp) G.tv.style.setProperty('--tc', rc(route.roleId));
        }

        /* 头部计数 */
        var html = '<span class="w">进行中<b>' + (cnt.working + cnt.reporting) + '</b></span><span class="q">排队<b>' + cnt.queued + '</b></span><span class="d">已完成<b>' + cnt.done + '</b></span>';
        if (G.cnt.innerHTML !== html) G.cnt.innerHTML = html;
        G.cnt.style.display = G.w < 600 && mode === 'main' && views.length > 1 ? 'none' : '';
      }
      function schedule() { if (!pending && !destroyed) pending = setTimeout(update, 220); }

      ['tick', 'role', 'task'].forEach(function (e) { offs.push(wb.on(e, schedule)); });
      function onClick(e) {
        var tab = e.target.closest && e.target.closest('.' + P + 'tab');
        if (tab) { var k = Number(tab.getAttribute('data-v')); if (k !== vi && views[k]) { vi = k; firstPaint = true; build(); } return; }
        var card = e.target.closest && e.target.closest('.' + P + 'card');
        if (card && mode === 'main' && card.getAttribute('data-r') && wb.roleById(card.getAttribute('data-r'))) wb.open(card.getAttribute('data-r'));
      }
      root.addEventListener('click', onClick);
      function resize() {
        if (destroyed) return;
        var w = host.clientWidth, h = host.clientHeight;
        if (Math.abs(w - W0) < 2 && Math.abs(h - H0) < 2 && (G || w < 80 || h < 80)) return;
        build();
      }
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(function () {
          if (roRaf) return;
          roRaf = requestAnimationFrame(function () { roRaf = 0; resize(); });
        });
        ro.observe(host);
      }

      build();

      return {
        resize: resize,
        destroy: function () {
          if (destroyed) return;
          destroyed = true;
          offs.forEach(function (off) { try { off(); } catch (e) { /* 已退订 */ } });
          offs = [];
          clearTimeout(pending);
          timers.forEach(clearTimeout);
          if (roRaf) cancelAnimationFrame(roRaf);
          if (ro) ro.disconnect();
          root.removeEventListener('click', onClick);
          if (root.parentNode) root.parentNode.removeChild(root);
          G = null; cards = {}; lines = {};
        }
      };
    }
  });
})();
