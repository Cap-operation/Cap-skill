/* 零件：神经星河 neural-galaxy
 * 来源：船长 JEV 设计画布「方向 E · 神经星河」（船长电商自有作品），只移植中间那块大舞台。
 * 数据怎么变成画面：
 *   - 中央星核 = 公司（名字取 company.company.name，副标 = 进行中任务数 · 累计完成数）。
 *   - 每个 AI 岗位 = 一颗发光星球，颜色 wb.roleColor(id)；越忙越大（干活 > 前往 > 待命，老板派的活再放大一圈并加金色虚线环）。
 *   - 星核与岗位之间是一束抖动的贝塞尔星丝，分快点 / 慢点 / 彗星三组流动；岗位越忙星丝越多。
 *   - 岗位“汇报中”时向星核射出亮彗星；该岗位有新日志时星球闪一下。
 *   - role 模式：该岗位居中放大，公司与其它岗位退到外圈并变暗，上方小卫星是它最近的任务。
 * 规则：只读 Workbench 状态，不造任务、不改 KPI；颜色只取 wb.roleColor() 与 CSS 变量（原作色值仅作兜底）。 */
(function () {
  'use strict';
  var WB = window.Workbench;
  if (!WB || typeof WB.registerPart !== 'function') return;

  var ID = 'neural-galaxy';
  var P = ID + '-';
  var FONT = '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  var MONO = '"SF Mono",Consolas,monospace';
  var NS = 'http://www.w3.org/2000/svg';
  var STATUS = { idle: '待命', moving: '前往工位', working: '干活中', reporting: '汇报中' };
  // 每根星丝归入哪组动画：慢点 / 快点 / 彗星（比例接近原作 45% / 35% / 20%）
  var GROUPS = ['slow', 'fast', 'comet', 'fast', 'slow', 'fast', 'slow', 'comet', 'fast', 'slow', 'fast'];
  var MAXS = GROUPS.length;
  var instSeq = 0;

  var CSS = [
    '.§root{position:absolute;inset:0;overflow:hidden;contain:layout paint;font-family:' + FONT + ';color:var(--text);-webkit-user-select:none;user-select:none}',
    '.§svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
    '.§fa{animation:§fa 2.2s linear infinite}',
    '.§fb{animation:§fb 4s linear infinite}',
    '.§fc{animation:§fc 3s linear infinite}',
    '@keyframes §fa{to{stroke-dashoffset:-350}}',
    '@keyframes §fb{to{stroke-dashoffset:-470}}',
    '@keyframes §fc{to{stroke-dashoffset:-560}}',
    '.§tw1{animation:§tw 3s ease-in-out infinite}',
    '.§tw2{animation:§tw 4.2s ease-in-out 1s infinite}',
    '.§tw3{animation:§tw 2.4s ease-in-out .5s infinite}',
    '@keyframes §tw{50%{opacity:.15}}',
    '.§edge{transition:opacity .6s}',
    '.§edge[data-s=idle]{opacity:.45}',
    '.§edge[data-s=idle] .§fa{animation-duration:3.6s}',
    '.§edge[data-s=idle] .§fb{animation-duration:6.4s}',
    '.§edge[data-s=moving] .§fa{animation-duration:1.4s}',
    '.§edge.is-dim{opacity:.24}',
    '.§rep{display:none}',
    '.§edge[data-s=reporting] .§rep{display:inline;animation:§rep 1.6s linear infinite}',
    '.§edge[data-s=reporting] .§rep2{animation-delay:-.8s}',
    '@keyframes §rep{from{stroke-dashoffset:0}to{stroke-dashoffset:-100}}',
    '.§node{position:absolute;width:0;height:0;z-index:2;transition:opacity .5s}',
    '.§node.is-dim{opacity:.42}',
    '.§node.is-dim:hover{opacity:.9}',
    '.§body{position:absolute;border-radius:50%;outline:none;transition:transform .7s cubic-bezier(.2,.8,.2,1)}',
    '.§node[data-role] .§body,.§node[data-role] .§label{cursor:pointer}',
    '.§halo{position:absolute;border-radius:50%;pointer-events:none;animation:§breath 3.2s ease-in-out infinite}',
    '.§node[data-s=idle] .§halo{animation-duration:5.2s;opacity:.6}',
    '.§node[data-s=working] .§halo{animation-duration:2.4s}',
    '.§node[data-s=reporting] .§halo{animation-duration:1.3s}',
    '@keyframes §breath{50%{transform:scale(1.25);opacity:.55}}',
    '.§ripple{position:absolute;inset:-4px;border-radius:50%;border:1px solid;opacity:0;pointer-events:none}',
    '.§node[data-s=moving] .§ripple,.§node[data-s=working] .§ripple,.§core .§ripple{animation:§ripple 2.6s ease-out infinite}',
    '.§node[data-s=reporting] .§ripple{animation:§ripple 1.1s ease-out infinite;border-color:var(--boss) !important}',
    '@keyframes §ripple{from{transform:scale(1);opacity:.9}to{transform:scale(1.9);opacity:0}}',
    '.§orb{position:absolute;inset:0;border-radius:50%;transition:filter .3s}',
    '.§node[data-role]:hover .§orb,.§body:focus-visible .§orb{filter:brightness(1.3)}',
    '.§ring{position:absolute;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .4s}',
    '.§boss{inset:-9px;border:1.5px dashed var(--boss)}',
    '.§node.is-boss .§boss{opacity:.95;animation:§spin 9s linear infinite}',
    '.§sel{inset:-15px;border:1px solid var(--text)}',
    '.§node.is-sel .§sel{opacity:.5}',
    '.§ping{inset:-2px;border:2px solid var(--text)}',
    '@keyframes §spin{to{transform:rotate(360deg)}}',
    '.§label{position:absolute;text-align:center;line-height:1.3}',
    '.§name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.§node.is-boss .§name{color:var(--boss)}',
    '.§sub{margin-top:1px;font:11px/1.35 ' + MONO + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.75}',
    '.§task{margin-top:1px;font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.88}',
    '.§moon{position:absolute;border-radius:50%;transform:translate(-50%,-50%);z-index:3}',
    '.§moon[data-p=done]{opacity:.4}',
    '.§moon[data-p=active]{animation:§moon 1.4s ease-in-out infinite}',
    '@keyframes §moon{50%{transform:translate(-50%,-50%) scale(1.45)}}',
    '.§hint{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:12px;color:var(--muted);pointer-events:none}',
    '.§paused *{animation-play-state:paused !important}',
    '.§still,.§still *{animation:none !important;transition:none !important}',
    '.§still .§rep{stroke-dasharray:none;stroke-opacity:.55}'
  ].join('\n').replace(/§/g, P);

  function injectCss() {
    if (document.getElementById('part-' + ID + '-css')) return;
    var s = document.createElement('style');
    s.id = 'part-' + ID + '-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---------- 小工具 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fx(n) { return n.toFixed(1); }
  function lcg(seed) { // 与原作同一个线性同余随机数（固定种子，画面每次一样）
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hash(str) {
    var h = 2166136261; str = String(str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function setText(e, s) { if (e && e.textContent !== s) e.textContent = s; }
  function setAttr(e, k, v) { if (e && e.getAttribute(k) !== v) e.setAttribute(k, v); }
  function toggle(e, c, on) { if (e && e.classList.contains(c) !== !!on) e.classList.toggle(c, !!on); }
  function textW(s, fs) { var w = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2e7f ? fs : fs * 0.6; return w; }
  function ellPerim(a, b) { return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); }

  /* ---------- 颜色：把 CSS 变量 / 岗位色换算成 rgb，方便做发光渐变 ---------- */
  var probe = null;
  function hexRgb(s) {
    var m = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (m) {
      var h = m[1];
      if (h.length < 6) h = h.replace(/./g, '$&$&');
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
    return m ? [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])] : null;
  }
  function toRgb(str, fallback) {
    var s = String(str == null ? '' : str).trim();
    var v = /^var\(\s*(--[\w-]+)/.exec(s);
    if (v) { try { s = getComputedStyle(document.documentElement).getPropertyValue(v[1]).trim(); } catch (e) { s = ''; } }
    var c = s ? hexRgb(s) : null;
    if (c) return c;
    if (s) {
      try {
        probe = probe || document.createElement('canvas').getContext('2d');
        probe.fillStyle = '#010203';
        probe.fillStyle = s;
        var out = String(probe.fillStyle);
        if (out !== '#010203') { c = hexRgb(out); if (c) return c; }
      } catch (e) { /* 换算失败用兜底色 */ }
    }
    return hexRgb(fallback || '#888888') || [136, 136, 136];
  }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function readPalette(wb) {
    function v(name, fb) { var s = ''; try { s = wb.color(name); } catch (e) { /* ignore */ } return toRgb(s, fb); }
    // 兜底色取自原作：深紫底、青、紫、粉、金
    return {
      bg: v('bg', '#04020c'), text: v('text', '#ede9fe'), muted: v('muted', '#a5a1c8'),
      accent: v('accent', '#22d3ee'), accent2: v('accent2', '#a78bfa'), boss: v('boss', '#fbbf24'), ok: v('ok', '#34d399')
    };
  }

  /* 一根抖动的贝塞尔星丝（原作公式：两控制点沿法线随机偏移） */
  function strandD(a, b, j1, j2) {
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1, px = -dy / L, py = dx / L;
    var amp = Math.min(110, L * 0.38), k1 = (j1 - 0.5) * amp, k2 = (j2 - 0.5) * amp;
    return 'M' + fx(a.x) + ' ' + fx(a.y) +
      'C' + fx(a.x + dx * 0.35 + px * k1) + ' ' + fx(a.y + dy * 0.35 + py * k1) + ' ' +
      fx(a.x + dx * 0.65 + px * k2) + ' ' + fx(a.y + dy * 0.65 + py * k2) + ' ' + fx(b.x) + ' ' + fx(b.y) + ' ';
  }

  function statusOf(rs) { return rs && STATUS[rs.status] ? rs.status : 'idle'; }
  function loadOf(status, p, boss, q) {
    var l = status === 'working' ? 0.55 + 0.35 * clamp(p || 0, 0, 1) : status === 'reporting' ? 0.95 : status === 'moving' ? 0.4 : 0.1;
    if (boss) l += 0.25;
    return l + Math.min(0.2, q * 0.08);
  }
  function strandCount(status, p, boss, q) {
    var c = status === 'working' ? 3 + Math.ceil(clamp(p || 0, 0, 1) * 3) : status === 'reporting' ? 6 : status === 'moving' ? 3 : 2;
    if (boss) c += 2;
    return Math.min(MAXS, c + Math.min(2, q));
  }
  function subText(status, rs, q, mode) {
    var s = status === 'working' ? '干活中 ' + Math.round(clamp((rs && rs.progress) || 0, 0, 1) * 100) + '%' : STATUS[status];
    if (mode === 'short') return s;
    return s + ' · 完成 ' + ((rs && rs.done) || 0) + (q ? ' · 排队 ' + q : '');
  }

  function mount(host, wb, opts) {
    opts = opts || {};
    injectCss();
    var uid = ++instSeq;
    var company = wb.company || {};
    var coName = (company.company && company.company.name) || '我的公司';
    var roles = (company.roles || []).filter(function (r) { return r && r.id; });
    var focusId = null;
    if (opts.mode === 'role' && opts.roleId) roles.forEach(function (r) { if (r.id === opts.roleId) focusId = r.id; });
    var still = !!wb.reducedMotion;

    var root = el('div', P + 'root' + (still ? ' ' + P + 'still' : ''), host);
    root.setAttribute('data-mode', focusId ? 'role' : 'main');

    var alive = true;
    var wasConnected = !!host.isConnected;
    var G = null;
    var offs = [];
    var flushTimer = null, buildTimer = null, lastFlush = 0;
    var paletteDirty = false;
    var ro = null, mo = null;
    var colorCache = {};

    function roleOf(id) { for (var i = 0; i < roles.length; i++) if (roles[i].id === id) return roles[i]; return null; }
    function roleRgb(id) {
      if (!colorCache[id]) {
        var c = '';
        try { c = wb.roleColor(id); } catch (e) { /* ignore */ }
        colorCache[id] = toRgb(c, '#a78bfa');
      }
      return colorCache[id];
    }
    function nameOf(item) {
      if (item.kind === 'core') return coName;
      var r = roleOf(item.id);
      return r ? (r.name || r.id) : item.id;
    }

    /* ---------- 布局：中心 + 外圈椭圆；标签放不下时逐级精简 ---------- */
    function layout(W, H) {
      var ring = [], center;
      if (focusId) {
        center = { kind: 'role', id: focusId };
        ring.push({ kind: 'core' });
        roles.forEach(function (r) { if (r.id !== focusId) ring.push({ kind: 'role', id: r.id }); });
      } else {
        center = { kind: 'core' };
        roles.forEach(function (r) { ring.push({ kind: 'role', id: r.id }); });
      }
      var n = ring.length;
      var k = clamp(Math.min(W / 1200, H / 620), 0.5, 1.3);
      var topPad = focusId ? 10 : 28; // main 模式左上角有外壳的场景标题
      var nameFs = k >= 0.85 ? 14 : (k >= 0.62 ? 13 : 12);
      var cFs = nameFs + 2, subFs = 11;
      var rx0 = Math.max(60, W / 2 - 80), ry0 = Math.max(40, (H - topPad) / 2 - 56);
      var spacing = n ? ellPerim(rx0, ry0) / n : 400;
      var LW = Math.round(clamp(spacing * 0.9, 68, 156));
      var nodeR = Math.round(clamp(Math.min(26 * k, spacing * 0.2), 9, 32));
      var centerR = Math.round(clamp((focusId ? 34 : 40) * k, 20, 50));
      var cLW = Math.round(clamp(W * 0.3, 140, 260));
      var names = ring.map(nameOf);
      var cName = nameOf(center);
      var sample = { full: '前往工位 · 完成 99', short: '前往工位', none: '' };
      var configs = [['full', 0], ['short', 0], ['none', 0], ['none', 0.24]];
      var res = null;
      for (var c = 0; c < configs.length; c++) {
        res = place(configs[c][0], configs[c][1]);
        if (!res.hit) break;
      }
      return res;

      function place(subMode, stagger) {
        var lineS = Math.ceil(subFs * 1.35) + 1;
        var labelH = Math.ceil(nameFs * 1.3) + (subMode !== 'none' ? lineS : 0);
        var cLabelH = Math.ceil(cFs * 1.3) + lineS + (focusId ? Math.ceil(12 * 1.35) + 1 : 0);
        var halo = Math.max(14, nodeR * 0.85);
        var mX = Math.max(LW / 2, nodeR + halo * 0.6) + 8;
        var mT = topPad + nodeR + halo * 0.5;
        var mB = nodeR + 6 + labelH + 6;
        var rx = Math.max(30, W / 2 - mX);
        var ry = Math.max(24, (H - mT - mB) / 2);
        var cx = W / 2, cy = mT + ry;
        var pts = [];
        var step = n ? 360 / n : 0;
        var start = n >= 2 ? -90 + 180 / n : 180; // 偶数个时左右对称，正上方不放星球
        for (var i = 0; i < n; i++) {
          var a = (start + i * step) * Math.PI / 180;
          var f = stagger && (i % 2) ? 1 - stagger : 1;
          var it = ring[i];
          pts.push({ item: it, name: names[i], x: cx + rx * f * Math.cos(a), y: cy + ry * f * Math.sin(a), r: it.kind === 'core' ? Math.round(nodeR * 1.15) : nodeR });
        }
        var cpt = { item: center, name: cName, x: cx, y: cy, r: centerR };
        var boxes = pts.map(function (p) {
          return boxOf(p, Math.min(LW, Math.max(textW(p.name, nameFs), textW(sample[subMode], subFs)) + 6), labelH);
        });
        boxes.push(boxOf(cpt, Math.min(cLW, Math.max(textW(cName, cFs), 120)), cLabelH));
        var hit = false;
        for (var x = 0; x < boxes.length && !hit; x++) {
          for (var y = x + 1; y < boxes.length && !hit; y++) if (boxHit(boxes[x], boxes[y])) hit = true;
        }
        return { cx: cx, cy: cy, rx: rx, ry: ry, pts: pts, center: cpt, LW: LW, cLW: cLW, nodeR: nodeR, centerR: centerR, nameFs: nameFs, cFs: cFs, subMode: subMode, hit: hit };
      }
    }
    function boxOf(p, lw, lh) {
      return [[p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r], [p.x - lw / 2, p.y + p.r + 6, p.x + lw / 2, p.y + p.r + 6 + lh]];
    }
    function boxHit(A, B) {
      for (var i = 0; i < A.length; i++) for (var j = 0; j < B.length; j++) {
        var a = A[i], b = B[j];
        if (a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1) return true;
      }
      return false;
    }

    /* ---------- 星丝束 ---------- */
    function makeEdge(g, ed, gBase, gFlow) {
      var rnd = lcg(hash(ed.key) ^ 0x9e3779b9);
      ed.jit = [];
      for (var i = 0; i < MAXS; i++) ed.jit.push([rnd(), rnd()]);
      var light = mix(ed.rgb, g.pal.text, 0.45);
      ed.base = sv('path', { d: '', stroke: rgb(ed.rgb), 'stroke-opacity': ed.dim ? 0.1 : 0.22, 'stroke-width': 1 }, gBase);
      ed.g = sv('g', { 'class': P + 'edge' + (ed.dim ? ' is-dim' : ''), 'data-s': 'idle' }, gFlow);
      ed.fast = sv('path', { 'class': P + 'fa', d: '', stroke: rgb(light), 'stroke-width': 2.8, 'stroke-dasharray': '1 34' }, ed.g);
      ed.slow = sv('path', { 'class': P + 'fb', d: '', stroke: rgb(ed.rgb), 'stroke-width': 2.2, 'stroke-dasharray': '1 46' }, ed.g);
      ed.comet = sv('path', { 'class': P + 'fc', d: '', stroke: rgb(ed.rgb), 'stroke-opacity': 0.85, 'stroke-width': 2, 'stroke-dasharray': '40 520' }, ed.g);
      if (ed.rep) { // 汇报彗星：从岗位飞向公司星核
        var r2 = lcg(hash(ed.key + '#rep'));
        sv('path', {
          'class': P + 'rep', d: strandD(ed.rep.from, ed.rep.to, 0.3 + r2() * 0.4, 0.3 + r2() * 0.4), pathLength: 100,
          stroke: rgb(mix(ed.rgb, g.pal.text, 0.6)), 'stroke-width': 3.2, 'stroke-dasharray': '14 86'
        }, ed.g);
        sv('path', {
          'class': P + 'rep ' + P + 'rep2', d: strandD(ed.rep.from, ed.rep.to, 0.25 + r2() * 0.5, 0.25 + r2() * 0.5), pathLength: 100,
          stroke: rgb(g.pal.boss), 'stroke-width': 2.4, 'stroke-dasharray': '10 90'
        }, ed.g);
      }
      ed.count = -1;
      g.edges.push(ed);
      (g.edgesBy[ed.roleId] = g.edgesBy[ed.roleId] || []).push(ed);
    }
    function setEdgeCount(ed, c) {
      ed.count = c;
      var all = '', d = { fast: '', slow: '', comet: '' };
      for (var i = 0; i < c; i++) {
        var s = strandD(ed.from, ed.to, ed.jit[i][0], ed.jit[i][1]);
        all += s;
        d[GROUPS[i]] += s;
      }
      ed.base.setAttribute('d', all);
      ed.fast.setAttribute('d', d.fast);
      ed.slow.setAttribute('d', d.slow);
      ed.comet.setAttribute('d', d.comet);
    }

    /* ---------- 星球（HTML：光晕 + 涟漪 + 渐变球 + 标签） ---------- */
    function makeNode(g, pt, o) {
      var R = pt.r;
      var n = el('div', P + 'node' + (o.isCore ? ' ' + P + 'core' : '') + (o.dim ? ' is-dim' : ''), root);
      n.style.left = fx(pt.x) + 'px';
      n.style.top = fx(pt.y) + 'px';
      var clickable = o.roleId && o.roleId !== focusId;
      if (clickable) n.setAttribute('data-role', o.roleId);
      var body = el('div', P + 'body', n);
      body.style.cssText = 'left:' + (-R) + 'px;top:' + (-R) + 'px;width:' + (2 * R) + 'px;height:' + (2 * R) + 'px;transform:scale(' + (o.isCore ? 1 : 0.6) + ')';
      if (clickable) { body.setAttribute('role', 'button'); body.tabIndex = 0; body.setAttribute('aria-label', '打开 ' + o.name); }
      var hs = Math.round(Math.max(14, R * 0.85));
      var halo = el('div', P + 'halo', body);
      halo.style.cssText = 'top:' + (-hs) + 'px;left:' + (-hs) + 'px;right:' + (-hs) + 'px;bottom:' + (-hs) + 'px;' +
        'background:radial-gradient(circle,' + rgba(o.rgb, 0.45) + ' 0%,transparent 68%);animation-delay:' + o.delay + 's';
      var rp = el('div', P + 'ripple', body);
      rp.style.borderColor = rgb(o.rgb);
      rp.style.animationDelay = o.delay + 's';
      el('div', P + 'ring ' + P + 'sel', body);
      el('div', P + 'ring ' + P + 'boss', body);
      var ping = el('div', P + 'ring ' + P + 'ping', body);
      var orb = el('div', P + 'orb', body);
      orb.style.background = 'radial-gradient(circle at 35% 32%,' + rgb(g.pal.text) + ' 0%,' + rgb(o.rgb) + ' 38%,' + rgb(mix(o.rgb, g.pal.bg, 0.72)) + ' 100%)';
      orb.style.boxShadow = '0 0 ' + Math.round(R * 0.55 + 8) + 'px ' + rgb(o.rgb) + ',0 0 ' + Math.round(R * 1.5 + 14) + 'px ' + rgba(o.rgb, 0.45);
      var lab = el('div', P + 'label', n);
      var lw = o.lw;
      var left = clamp(pt.x - lw / 2, 4, Math.max(4, g.W - 4 - lw)) - pt.x;
      lab.style.cssText = 'left:' + fx(left) + 'px;top:' + (R + 6) + 'px;width:' + lw + 'px';
      var nm = el('div', P + 'name', lab);
      nm.style.fontSize = o.fs + 'px';
      nm.style.textShadow = '0 0 10px ' + rgb(o.rgb);
      nm.textContent = o.name;
      var sub = o.subMode !== 'none' ? el('div', P + 'sub', lab) : null;
      var task = o.center && focusId ? el('div', P + 'task', lab) : null;
      return { el: n, body: body, sub: sub, task: task, ping: ping, subMode: o.subMode, scale: null, tip: '' };
    }

    /* ---------- 整体重建（只在尺寸 / 调色板变化时） ---------- */
    function build() {
      if (!alive) return;
      var W = Math.floor(host.clientWidth || 0), H = Math.floor(host.clientHeight || 0);
      root.innerHTML = '';
      root.style.background = '';
      G = null;
      colorCache = {};
      if (W < 80 || H < 80) return; // 容器还没尺寸：等 resize / 下一次 tick
      var pal = readPalette(wb);
      var L = layout(W, H);
      var coreRgb = mix(pal.accent, pal.accent2, 0.5);
      var centerRgb = focusId ? roleRgb(focusId) : coreRgb;
      var tint = mix(centerRgb, pal.bg, 0.76);
      root.style.background = 'radial-gradient(ellipse ' + Math.round(W * 0.66) + 'px ' + Math.round(H * 0.72) + 'px at 50% ' +
        (L.cy / H * 100).toFixed(1) + '%,' + rgba(tint, 0.85) + ' 0%,' + rgba(mix(tint, pal.bg, 0.55), 0.5) + ' 50%,transparent 100%)';

      var g = { W: W, H: H, L: L, pal: pal, nodes: {}, coreNode: null, edges: [], edgesBy: {}, moonBox: null, moonSig: '' };

      var svg = sv('svg', { 'class': P + 'svg', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, root);
      var defs = sv('defs', null, svg);
      var glowId = P + 'glow-' + uid;
      var flt = sv('filter', { id: glowId, x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
      sv('feGaussianBlur', { stdDeviation: '2.4', result: 'b' }, flt);
      var fm = sv('feMerge', null, flt);
      sv('feMergeNode', { 'in': 'b' }, fm);
      sv('feMergeNode', { 'in': 'SourceGraphic' }, fm);

      // 闪烁星空（三组不同节奏）
      var rnd = lcg(23);
      var nStars = Math.round(clamp(W * H / 3840, 40, 320));
      var sd = ['', '', ''];
      for (var i = 0; i < nStars; i++) sd[i % 3] += 'M' + fx(rnd() * W) + ' ' + fx(rnd() * H) + ' h0.01 ';
      var starCols = [pal.text, mix(pal.accent2, pal.text, 0.55), mix(pal.accent, pal.text, 0.55)];
      [1.6, 1.4, 1.2].forEach(function (w, j) {
        sv('path', { 'class': P + 'tw' + (j + 1), d: sd[j], stroke: rgb(starCols[j]), 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none', opacity: j ? 0.8 : 0.9 }, svg);
      });

      var gBase = sv('g', { fill: 'none' }, svg);
      var gFlow = sv('g', { fill: 'none', 'stroke-linecap': 'round', filter: 'url(#' + glowId + ')' }, svg);
      var cpt = L.center;
      L.pts.forEach(function (p) {
        if (!focusId) {
          makeEdge(g, { key: p.item.id, roleId: p.item.id, rgb: roleRgb(p.item.id), from: cpt, to: p, dim: false, rep: { from: p, to: cpt } }, gBase, gFlow);
        } else if (p.item.kind === 'core') {
          makeEdge(g, { key: '__core>' + focusId, roleId: focusId, rgb: roleRgb(focusId), from: p, to: cpt, dim: false, rep: { from: cpt, to: p } }, gBase, gFlow);
        } else {
          makeEdge(g, { key: focusId + '>' + p.item.id, roleId: p.item.id, rgb: roleRgb(p.item.id), from: cpt, to: p, dim: true }, gBase, gFlow);
        }
      });

      var di = 0;
      function nextDelay() { return ((di++) * 0.37 % 2.6).toFixed(2); }
      L.pts.forEach(function (p) {
        var isCore = p.item.kind === 'core';
        var nd = makeNode(g, p, {
          roleId: isCore ? null : p.item.id, isCore: isCore, rgb: isCore ? coreRgb : roleRgb(p.item.id), name: p.name,
          fs: L.nameFs, lw: L.LW, subMode: L.subMode, dim: !!focusId && !isCore, center: false, delay: nextDelay()
        });
        if (isCore) g.coreNode = nd; else g.nodes[p.item.id] = nd;
      });
      var cn = makeNode(g, cpt, {
        roleId: focusId, isCore: !focusId, rgb: centerRgb, name: cpt.name, fs: L.cFs, lw: L.cLW, subMode: 'full', dim: false, center: true, delay: nextDelay()
      });
      if (focusId) { g.nodes[focusId] = cn; g.moonBox = el('div', null, root); } else g.coreNode = cn;
      if (!roles.length) el('div', P + 'hint', root).textContent = '公司配置里还没有岗位（roles），先在 data/company.js 里加岗位';

      G = g;
      update();
    }

    /* ---------- 轻量更新：只改属性 / 文字；星丝数变化时只重画该岗位那一束 ---------- */
    function update() {
      if (!G) return;
      var st = wb.getState ? wb.getState() : null;
      if (!st) return;
      var tasks = st.tasks || [];
      var stRoles = st.roles || {};
      var byId = {}, queued = {}, active = 0, i;
      for (i = 0; i < tasks.length; i++) {
        var t = tasks[i];
        if (!t) continue;
        byId[t.id] = t;
        if (t.status === 'queued') queued[t.roleId] = (queued[t.roleId] || 0) + 1;
        if (t.status !== 'done') active++;
      }
      var doneSum = 0;
      roles.forEach(function (r) {
        var rs = stRoles[r.id] || {};
        doneSum += rs.done || 0;
        var status = statusOf(rs);
        var task = rs.taskId ? byId[rs.taskId] : null;
        var q = queued[r.id] || 0;
        var boss = !!(task && task.origin === 'boss');
        var nd = G.nodes[r.id];
        if (nd) {
          setAttr(nd.el, 'data-s', status);
          toggle(nd.el, 'is-boss', boss);
          toggle(nd.el, 'is-sel', !focusId && st.selectedRole === r.id);
          var sc = (0.55 + 0.45 * Math.min(1, loadOf(status, rs.progress, boss, q) / 1.15)).toFixed(3);
          if (nd.scale !== sc) { nd.scale = sc; nd.body.style.transform = 'scale(' + sc + ')'; }
          var full = subText(status, rs, q, 'full');
          if (nd.sub) setText(nd.sub, nd.subMode === 'short' ? subText(status, rs, q, 'short') : full);
          if (nd.task) setText(nd.task, task ? (boss ? '老板派：' : '当前：') + (task.title || task.id) : (q ? '排队 ' + q + ' 项' : '暂无任务'));
          var tip = (r.name || r.id) + ' · ' + full + (task ? ' · ' + (task.title || '') : '');
          if (nd.tip !== tip) { nd.tip = tip; nd.el.title = tip; }
        }
        (G.edgesBy[r.id] || []).forEach(function (ed) {
          setAttr(ed.g, 'data-s', status);
          var c = strandCount(status, rs.progress, boss, q);
          if (ed.dim) c = Math.min(2, c);
          if (c !== ed.count) setEdgeCount(ed, c);
        });
      });
      if (G.coreNode && G.coreNode.sub) setText(G.coreNode.sub, '进行中 ' + active + ' · 完成 ' + doneSum);
      if (focusId) updateMoons(tasks);
    }

    /* role 模式：焦点岗位上方的小卫星 = 它最近的任务（实心亮 = 进行中，空心 = 排队，暗 = 已完成） */
    function updateMoons(tasks) {
      var box = G.moonBox;
      if (!box) return;
      var mine = [];
      for (var i = 0; i < tasks.length && mine.length < 8; i++) if (tasks[i] && tasks[i].roleId === focusId) mine.push(tasks[i]);
      var sig = mine.map(function (t) { return t.id + ':' + t.status + ':' + Math.floor((t.progress || 0) * 10); }).join('|');
      if (sig === G.moonSig) return;
      G.moonSig = sig;
      box.innerHTML = '';
      var c = G.L.center, col = rgb(roleRgb(focusId));
      var mr = c.r + Math.max(16, c.r * 0.55);
      mine.forEach(function (t, j) {
        var deg = mine.length === 1 ? 270 : 205 + 130 * j / (mine.length - 1);
        var a = deg * Math.PI / 180;
        var ph = t.status === 'done' ? 'done' : (t.status === 'queued' ? 'queued' : 'active');
        var sz = ph === 'active' ? 11 : (ph === 'queued' ? 9 : 7);
        var m = el('div', P + 'moon', box);
        m.setAttribute('data-p', ph);
        m.style.cssText = 'left:' + fx(c.x + mr * Math.cos(a)) + 'px;top:' + fx(c.y + mr * Math.sin(a)) + 'px;width:' + sz + 'px;height:' + sz + 'px;box-sizing:border-box;' +
          (ph === 'queued' ? 'border:1.5px solid ' + col : 'background:' + col + ';box-shadow:0 0 10px ' + col);
        m.title = (t.title || t.id) + ' · ' + (ph === 'done' ? '已完成' : ph === 'queued' ? '排队' : '进行中 ' + Math.round(clamp(t.progress || 0, 0, 1) * 100) + '%');
      });
    }

    /* 新日志 → 对应星球闪一下 */
    function onLog(entry) {
      markDirty();
      if (!G || still || !entry || !entry.roleId) return;
      var nd = G.nodes[entry.roleId];
      if (!nd || !nd.ping || typeof nd.ping.animate !== 'function') return;
      nd.ping.style.borderColor = entry.level === 'ok' ? 'var(--ok)' : entry.level === 'boss' ? 'var(--boss)' : 'var(--text)';
      try {
        nd.ping.animate([{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.4)' }], { duration: 900, easing: 'ease-out' });
      } catch (e) { /* ignore */ }
    }

    /* ---------- 节流：最多每 250ms 刷新一次 ---------- */
    function markDirty() {
      if (!alive || flushTimer) return;
      flushTimer = setTimeout(flush, Math.max(0, 250 - (Date.now() - lastFlush)));
    }
    function flush() {
      flushTimer = null;
      if (!alive) return;
      if (host.isConnected) wasConnected = true;
      else if (wasConnected) { api.destroy(); return; } // 宿主已被移出页面（例如抽屉换了岗位）：自我清理
      lastFlush = Date.now();
      if (!G) { scheduleBuild(); return; }
      update();
    }
    function scheduleBuild() {
      if (!alive || buildTimer) return;
      buildTimer = setTimeout(function () {
        buildTimer = null;
        if (!alive) return;
        var W = Math.floor(host.clientWidth || 0), H = Math.floor(host.clientHeight || 0);
        if (G && W === G.W && H === G.H && !paletteDirty) return;
        paletteDirty = false;
        build();
      }, 90);
    }
    function onPause(p) { toggle(root, P + 'paused', !!p); }

    function onClick(e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-role]') : null;
      if (!t || !root.contains(t)) return;
      var id = t.getAttribute('data-role');
      if (id && id !== focusId && typeof wb.open === 'function') wb.open(id);
    }
    function onKey(e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains(P + 'body')) {
        e.preventDefault();
        onClick(e);
      }
    }
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);

    var api = {
      resize: function () { scheduleBuild(); },
      destroy: function () {
        if (!alive) return;
        alive = false;
        offs.forEach(function (off) { try { off(); } catch (e) { /* ignore */ } });
        offs = [];
        clearTimeout(flushTimer);
        clearTimeout(buildTimer);
        flushTimer = buildTimer = null;
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
        root.removeEventListener('click', onClick);
        root.removeEventListener('keydown', onKey);
        if (root.parentNode) root.parentNode.removeChild(root);
        G = null;
      }
    };

    build();
    if (typeof wb.on === 'function') {
      ['role', 'task', 'tick', 'select', 'live', 'dispatch'].forEach(function (evt) { offs.push(wb.on(evt, markDirty)); });
      offs.push(wb.on('log', onLog));
      offs.push(wb.on('pause', onPause));
    }
    var st0 = wb.getState ? wb.getState() : null;
    onPause(st0 && st0.paused);
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { scheduleBuild(); });
      ro.observe(host);
    }
    if (window.MutationObserver) { // 换调色板时重新取色
      mo = new MutationObserver(function () { paletteDirty = true; scheduleBuild(); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'style'] });
    }
    return api;
  }

  WB.registerPart(ID, {
    meta: { label: 'NEURAL GALAXY', modes: ['main', 'role'] },
    mount: mount
  });
})();
