/* 零件：数据漩涡 data-vortex
 * 来源：船长 JEV 设计画布「方向 H · 数据漩涡」（船长电商自有作品），只移植中间那块大舞台。
 * 数据怎么变成画面：
 *   - 核心 = 公司（role 模式 = 该岗位），副标 = 在轨任务数 · 已坠入（完成）数。
 *   - 轨道 = 任务阶段，由外向内：排队 → 前往工位 → 执行中 → 汇报；
 *     若范围内岗位都走同一条流水线（role.flow），中间几圈换成流水线的各阶段（如 素材/脚本/制作…）。
 *   - 光点 = 进行中的任务：所在圈 = 阶段，角度 = 进度（每个岗位一个起始方位，进度越高转得越远），颜色 = 岗位色。
 *     最要紧的几个光点带引线标签（老板派的优先），点光点或标签打开该岗位。
 *   - 任务完成 → 光点沿螺旋坠入核心，核心闪一下。
 *   - 右下角滚动条 = 最新 state.logs；左上角（或底部一行）= 每圈任务数。
 *   - role 模式只显示该岗位的任务和日志。
 * 规则：只读 Workbench 状态，不造任务、不改 KPI；颜色只取 wb.roleColor() 与 CSS 变量（原作色值仅作兜底）。 */
(function () {
  'use strict';
  var WB = window.Workbench;
  if (!WB || typeof WB.registerPart !== 'function') return;

  var ID = 'data-vortex';
  var P = ID + '-';
  var FONT = '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  var MONO = '"SF Mono",Consolas,monospace';
  var NS = 'http://www.w3.org/2000/svg';
  var PH_RANK = { reporting: 400, working: 300, moving: 250, queued: 100 };
  var FEED_N = 6;
  // 原作 7 道轨道的样式（由外到内）：旋转方向/速度、细线、粗虚线；t = 由深到浅的取色位置
  var PRESETS = [
    { spin: 'spS', a: { w: 2, op: 0.7, dash: [2, 10], t: 0 }, b: { w: 7, dash: [6, 120], t: 0.2 } },
    { spin: 'spL', a: { w: 1.4, op: 1, t: 0.1 }, b: { w: 8, dash: [40, 200, 10, 80], t: 0.35 } },
    { spin: 'spR', a: { w: 1.4, op: 0.8, dash: [1, 6], t: 0.3 }, b: { w: 6, dash: [4, 30], t: 0.45 } },
    { spin: 'spL', a: { w: 1.6, op: 1, t: 0.35 }, b: { w: 10, dash: [80, 120, 20, 60], t: 0.6 } },
    { spin: 'spF', a: { w: 1.4, op: 0.8, dash: [3, 7], t: 0.5 }, b: { w: 5, dash: [10, 50], t: 0.7 } },
    { spin: 'spR', a: { w: 2, op: 1, t: 0.55 }, b: { w: 9, dash: [30, 60], t: 0.85 } },
    { spin: 'spF', a: { w: 2, op: 1, dash: [2, 5], t: 0.9 } }
  ];
  var instSeq = 0;

  var CSS = [
    '.§root{position:absolute;inset:0;overflow:hidden;contain:layout paint;font-family:' + FONT + ';color:var(--text);-webkit-user-select:none;user-select:none}',
    '.§svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
    '.§spL{animation:§spin 26s linear infinite}',
    '.§spR{animation:§spin 18s linear infinite reverse}',
    '.§spF{animation:§spin 9s linear infinite}',
    '.§spS{animation:§spin 44s linear infinite reverse}',
    '@keyframes §spin{to{transform:rotate(360deg)}}',
    '.§inV{animation:§inV 3.4s linear infinite}',
    '@keyframes §inV{to{stroke-dashoffset:-480}}',
    '.§core{transform-box:fill-box;transform-origin:center;animation:§core 2.4s ease-in-out infinite}',
    '@keyframes §core{50%{opacity:.6;transform:scale(1.12)}}',
    '.§beam{animation:§beam 3s ease-in-out infinite}',
    '@keyframes §beam{50%{opacity:.45}}',
    '.§tw{animation:§tw 3.6s ease-in-out infinite}',
    '@keyframes §tw{50%{opacity:.2}}',
    '.§hot{transform-box:fill-box;transform-origin:center}',
    '.§ringlab{font:11px ' + MONO + ';fill:var(--muted);paint-order:stroke;stroke-width:3px;stroke-linejoin:round}',
    '.§layer{position:absolute;inset:0;pointer-events:none}',
    '.§dot{position:absolute;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;z-index:3;pointer-events:auto;cursor:pointer;will-change:transform}',
    '.§dot i{position:absolute;left:4px;top:4px;width:10px;height:10px;box-sizing:border-box;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}',
    '.§dot[data-p=working] i,.§dot[data-p=moving] i{animation:§blink 1.6s ease-in-out infinite}',
    '.§dot[data-p=queued] i{background:transparent;border:1.5px solid currentColor;box-shadow:none}',
    '.§dot b{position:absolute;inset:0;border-radius:50%;border:1.5px solid var(--boss);opacity:0}',
    '.§dot[data-p=reporting] b{animation:§ping 1.1s ease-out infinite}',
    '.§dot.is-boss i{box-shadow:0 0 0 2px var(--boss),0 0 14px currentColor}',
    '.§dot.is-dying{pointer-events:none}',
    '@keyframes §blink{50%{transform:scale(1.8);opacity:.25}}',
    '@keyframes §ping{from{opacity:.9;transform:scale(.8)}to{opacity:0;transform:scale(2)}}',
    '.§lab{position:absolute;left:0;top:0;z-index:2;box-sizing:border-box;padding:5px 9px;border:1px solid;border-radius:4px;background:var(--§labbg);box-shadow:0 0 12px var(--§labglow);pointer-events:auto;cursor:pointer;outline:none;will-change:transform;line-height:1.35}',
    '.§lab:hover,.§lab:focus-visible{box-shadow:0 0 16px var(--§labglow),0 0 0 1px currentColor}',
    '.§lab b{display:block;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.§lab.is-boss b::before{content:"老板 ";color:var(--boss)}',
    '.§lab span{display:block;font:11px/1.35 ' + MONO + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.§corelab{position:absolute;text-align:center;pointer-events:none;line-height:1.35}',
    '.§corelab b{display:block;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.§corelab span{display:block;font:11px/1.4 ' + MONO + ';color:var(--muted);white-space:nowrap}',
    '.§box{position:absolute;box-sizing:border-box;padding:9px 12px;border:1px solid var(--line-strong);border-radius:6px;background:var(--§labbg);font:11px/1.4 ' + MONO + ';pointer-events:none}',
    '.§box h6{margin:0 0 6px;font:inherit;font-weight:400;letter-spacing:.14em;color:var(--muted)}',
    '.§grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px}',
    '.§grid span:nth-child(odd){color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.§strip{position:absolute;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:11px/18px ' + MONO + ';color:var(--muted);pointer-events:none}',
    '.§strip b{color:var(--text);font-weight:600;margin:0 9px 0 3px}',
    '.§feed{overflow:hidden}',
    '.§mq{animation:§mq var(--§mqdur,15s) linear infinite}',
    '@keyframes §mq{to{transform:translateY(-50%)}}',
    '.§row{height:20px;display:flex;gap:6px;align-items:center;font:12px/20px ' + FONT + ';white-space:nowrap;overflow:hidden}',
    '.§row time{flex:none;font:11px ' + MONO + ';color:var(--dim)}',
    '.§row b{flex:none;font-weight:600}',
    '.§row span{min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.§paused *{animation-play-state:paused !important}',
    '.§still,.§still *{animation:none !important;transition:none !important}'
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
  function hms(t) {
    var d = new Date(t || Date.now());
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return (n < 10 ? '0' : '') + n; }).join(':');
  }
  function removeEl(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }

  /* ---------- 颜色：把 CSS 变量 / 岗位色换算成 rgb ---------- */
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
    // 兜底色取自原作：深海蓝底、天蓝、青
    return {
      bg: v('bg', '#01060d'), panel: v('panel-solid', '#03101c'), text: v('text', '#e0f2fe'),
      accent: v('accent', '#38bdf8'), accent2: v('accent2', '#22d3ee'), boss: v('boss', '#fbbf24'), ok: v('ok', '#34d399')
    };
  }

  function mount(host, wb, opts) {
    opts = opts || {};
    injectCss();
    var uid = ++instSeq;
    var company = wb.company || {};
    var coName = (company.company && company.company.name) || '我的公司';
    var roles = (company.roles || []).filter(function (r) { return r && r.id; });
    var flows = (company.flows || []).filter(function (f) { return f && f.id && f.stages && f.stages.length; });
    var focusId = null;
    if (opts.mode === 'role' && opts.roleId) roles.forEach(function (r) { if (r.id === opts.roleId) focusId = r.id; });
    var still = !!wb.reducedMotion;
    var seatOf = {};
    roles.forEach(function (r, i) { seatOf[r.id] = i; });

    var root = el('div', P + 'root' + (still ? ' ' + P + 'still' : ''), host);
    root.setAttribute('data-mode', focusId ? 'role' : 'main');

    var alive = true;
    var wasConnected = !!host.isConnected;
    var G = null;
    var markers = {};
    var dying = [];
    var raf = 0, lastT = 0;
    var offs = [];
    var flushTimer = null, buildTimer = null, lastFlush = 0;
    var paletteDirty = false;
    var ro = null, mo = null;
    var colorCache = {};

    function roleOf(id) { for (var i = 0; i < roles.length; i++) if (roles[i].id === id) return roles[i]; return null; }
    function roleName(id) { var r = roleOf(id); return r ? (r.name || r.id) : String(id || ''); }
    function roleRgb(id) {
      if (!colorCache[id]) {
        var c = '';
        try { c = wb.roleColor(id); } catch (e) { /* ignore */ }
        colorCache[id] = toRgb(c, '#38bdf8');
      }
      return colorCache[id];
    }
    function flowOf(id) { for (var i = 0; i < flows.length; i++) if (flows[i].id === id) return flows[i]; return null; }

    /* 轨道定义：范围内岗位都走同一条流水线时用流水线阶段，否则用任务状态 */
    function ringDefs() {
      var scope = focusId ? [roleOf(focusId)] : roles;
      var ids = {};
      scope.forEach(function (r) { ids[(r && r.flow) || ''] = true; });
      var keys = Object.keys(ids);
      var flow = keys.length === 1 && keys[0] ? flowOf(keys[0]) : null;
      var rings = [{ name: '排队' }];
      if (flow) flow.stages.slice(0, 10).forEach(function (s) { rings.push({ name: String(s) }); });
      else { rings.push({ name: '前往工位' }); rings.push({ name: '执行中' }); }
      rings.push({ name: '汇报' });
      return { flow: flow, rings: rings };
    }

    /* ---------- 整体重建（只在尺寸 / 调色板变化时） ---------- */
    function build() {
      if (!alive) return;
      var W = Math.floor(host.clientWidth || 0), H = Math.floor(host.clientHeight || 0);
      if (raf) cancelAnimationFrame(raf);
      raf = 0; lastT = 0;
      dying = [];
      markers = {};
      root.innerHTML = '';
      root.style.background = '';
      G = null;
      colorCache = {};
      if (W < 80 || H < 80) return; // 容器还没尺寸：等 resize / 下一次 tick
      var pal = readPalette(wb);
      var main = !focusId;
      var topPad = main ? 28 : 10; // main 模式左上角有外壳的场景标题
      var big = W >= 720 && H >= 400;
      var tiny = W < 520 || H < 280;
      var SQ = clamp(0.42 * (H / W) / (640 / 1440), 0.38, 0.6); // 透视压扁比例：宽屏更扁，方屏更圆
      var availH = H - topPad;
      var cx = W / 2, cy = topPad + availH * 0.53;
      var rOut = Math.max(40, Math.min(W * 0.43, availH * 0.37 / SQ));
      var s = clamp(rOut / 520, 0.45, 1.4);
      var coreR = clamp(rOut * 0.135, 22, 80);
      var RD = ringDefs();
      var nR = RD.rings.length;
      var rA = rOut * 0.88, rB = Math.max(rOut * 0.24, coreR * 1.25);
      var ringR = [];
      for (var i = 0; i < nR; i++) ringR.push(rA - (rA - rB) * i / Math.max(1, nR - 1));
      var dR = (rA - rB) / Math.max(1, nR - 1);
      var coreCol = focusId ? roleRgb(focusId) : pal.accent;
      function colorAt(t) { return t < 0.4 ? mix(pal.accent, pal.bg, (0.4 - t) * 1.1) : mix(pal.accent, pal.text, (t - 0.4) * 1.1); }
      function dashS(arr, k) { return arr.map(function (x) { return fx(x * k); }).join(' '); }

      var tint = mix(pal.accent, pal.bg, 0.8);
      root.style.background = 'radial-gradient(ellipse ' + Math.round(rOut * 1.25) + 'px ' + Math.round(Math.max(rOut * SQ * 1.9, availH * 0.6)) + 'px at 50% ' +
        (cy / H * 100).toFixed(1) + '%,' + rgba(tint, 0.85) + ' 0%,' + rgba(mix(tint, pal.bg, 0.55), 0.5) + ' 45%,transparent 100%)';
      root.style.setProperty('--' + P + 'labbg', rgba(pal.panel, 0.84));
      root.style.setProperty('--' + P + 'labglow', rgba(pal.accent, 0.22));

      var g = {
        W: W, H: H, cx: cx, cy: cy, SQ: SQ, rOut: rOut, ringR: ringR, dR: dR, rings: RD.rings, flow: RD.flow, coreR: coreR, pal: pal,
        ringLabs: [], panelCounts: [], panelDone: null, stripCounts: [], stripDone: null, feedRows: null, feedSig: null, leaderD: ''
      };

      /* SVG：星空、光柱、轨道、螺旋臂、核心、引线 */
      var svg = sv('svg', { 'class': P + 'svg', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, root);
      var defs = sv('defs', null, svg);
      var gid = P + uid;
      var pale = mix(pal.accent, pal.text, 0.35);
      var lg = sv('linearGradient', { id: gid + '-beam', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
      sv('stop', { offset: 0, 'stop-color': rgb(pale), 'stop-opacity': 0.75 }, lg);
      sv('stop', { offset: 1, 'stop-color': rgb(pale), 'stop-opacity': 0 }, lg);
      var rg = sv('radialGradient', { id: gid + '-core' }, defs);
      sv('stop', { offset: 0, 'stop-color': rgb(pal.text) }, rg);
      sv('stop', { offset: 0.35, 'stop-color': rgb(mix(coreCol, pal.text, 0.25)) }, rg);
      sv('stop', { offset: 1, 'stop-color': rgb(mix(coreCol, pal.bg, 0.5)), 'stop-opacity': 0 }, rg);
      var flt = sv('filter', { id: gid + '-glow', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
      sv('feGaussianBlur', { stdDeviation: fx(2.2 * clamp(s, 0.7, 1.2)), result: 'b' }, flt);
      var fm = sv('feMerge', null, flt);
      sv('feMergeNode', { 'in': 'b' }, fm);
      sv('feMergeNode', { 'in': 'SourceGraphic' }, fm);

      var rnd = lcg(73);
      var nStars = Math.round(clamp(W * H / 5760, 30, 260));
      var sd = '';
      for (i = 0; i < nStars; i++) sd += 'M' + fx(rnd() * W) + ' ' + fx(rnd() * H) + ' h0.01 ';
      sv('path', { 'class': P + 'tw', d: sd, stroke: rgb(mix(pal.accent, pal.text, 0.7)), 'stroke-width': 1.4, 'stroke-linecap': 'round', fill: 'none' }, svg);

      var bw = coreR * 0.86;
      sv('rect', { 'class': P + 'beam', x: fx(cx - bw / 2), y: 0, width: fx(bw), height: fx(cy), fill: 'url(#' + gid + '-beam)' }, svg);

      var gr = sv('g', { transform: 'translate(' + fx(cx) + ' ' + fx(cy) + ') scale(1 ' + SQ.toFixed(3) + ')', filter: 'url(#' + gid + '-glow)', fill: 'none' }, svg);
      function ring(r, p) {
        var gg = sv('g', { 'class': P + p.spin }, gr);
        sv('circle', {
          r: fx(r), stroke: rgb(colorAt(p.a.t)), 'stroke-opacity': p.a.op, 'stroke-width': fx(p.a.w * Math.max(0.7, s)),
          'stroke-dasharray': p.a.dash ? dashS(p.a.dash, s) : null
        }, gg);
        if (p.b) sv('circle', { r: fx(r), stroke: rgb(colorAt(p.b.t)), 'stroke-width': fx(p.b.w * s), 'stroke-dasharray': dashS(p.b.dash, s) }, gg);
      }
      ring(rOut, PRESETS[0]); // 最外装饰圈
      for (i = 0; i < nR; i++) ring(ringR[i], nR <= 5 ? PRESETS[1 + Math.round(i * 4 / Math.max(1, nR - 1))] : PRESETS[1 + (i % 5)]);
      if (rB * 0.62 > coreR * 0.9) ring(rB * 0.62, PRESETS[6]); // 最内装饰圈

      var sp = '';
      for (var a = 0; a < 6; a++) {
        var off = a * Math.PI / 3;
        for (var q = 0; q <= 90; q++) {
          var t = q / 90, th = off + t * Math.PI * 3.2, rr = rOut * (1.04 - 0.865 * t);
          sp += (q ? 'L' : 'M') + fx(rr * Math.cos(th)) + ' ' + fx(rr * Math.sin(th)) + ' ';
        }
      }
      var gs = sv('g', { 'class': P + 'spS' }, gr);
      sv('path', { d: sp, stroke: rgb(pal.accent), 'stroke-opacity': 0.22, 'stroke-width': 2 }, gs);
      sv('path', { 'class': P + 'inV', d: sp, stroke: rgb(mix(pal.text, pal.accent, 0.12)), 'stroke-width': fx(5 * clamp(s, 0.6, 1.2)), 'stroke-linecap': 'round', 'stroke-dasharray': '2 46' }, gs);
      sv('path', { 'class': P + 'inV', d: sp, stroke: rgb(mix(pal.accent, pal.text, 0.25)), 'stroke-width': fx(3 * clamp(s, 0.6, 1.2)), 'stroke-linecap': 'round', 'stroke-dasharray': '30 450' }, gs);

      var gc = sv('g', { 'class': P + 'core' }, svg);
      sv('circle', { cx: fx(cx), cy: fx(cy), r: fx(coreR), fill: 'url(#' + gid + '-core)' }, gc);
      g.hot = sv('circle', { 'class': P + 'hot', cx: fx(cx), cy: fx(cy), r: fx(coreR * 0.31), fill: rgb(pal.text) }, svg);

      // 圈名（左右交替放在圈的两端，放不下就只在面板里显示）
      var maxNameW = 0;
      RD.rings.forEach(function (rd) { maxNameW = Math.max(maxNameW, textW(rd.name + ' 00', 11)); });
      if (2 * dR >= maxNameW + 10 && dR >= 16) {
        RD.rings.forEach(function (rd, j) {
          var x = cx + (j % 2 ? ringR[j] : -ringR[j]);
          g.ringLabs.push(sv('text', { 'class': P + 'ringlab', x: fx(x), y: fx(cy + 4), 'text-anchor': 'middle', stroke: rgba(pal.bg, 0.9) }, svg));
        });
      }
      g.leader = sv('path', { d: '', fill: 'none', stroke: rgb(mix(pal.accent, pal.text, 0.4)), 'stroke-opacity': 0.7, 'stroke-width': 1 }, svg);

      /* HTML 层：核心标签、轨道面板、动态滚动条、任务光点与标签 */
      var layer = el('div', P + 'layer', root);
      g.layer = layer;
      var clW = Math.round(clamp(coreR * 3, 150, 240));
      var cl = el('div', P + 'corelab', layer);
      cl.style.cssText = 'left:' + fx(cx - clW / 2) + 'px;top:' + fx(cy + coreR * 0.5) + 'px;width:' + clW + 'px';
      var cln = el('b', null, cl);
      cln.style.fontSize = (W < 700 ? 14 : 15) + 'px';
      cln.style.textShadow = '0 0 10px ' + rgb(coreCol);
      cln.textContent = main ? coName : roleName(focusId);
      g.coreSub = el('span', null, cl);
      g.coreZone = [cx - clW / 2 - 6, cy - coreR * 0.9, cx + clW / 2 + 6, cy + coreR * 0.5 + 40];

      g.leftMin = topPad + 6; g.leftMax = H - 8; g.rightMin = topPad + 6; g.rightMax = H - 8;
      var fw = 0;
      if (!tiny) {
        fw = big ? Math.round(clamp(W * 0.17, 220, 280)) : 200;
        var rows = big ? 4 : 3;
        var fb = el('div', P + 'box', layer);
        fb.style.cssText = 'right:14px;bottom:12px;width:' + fw + 'px';
        el('h6', null, fb).textContent = focusId ? '岗位动态 LIVE' : '实时动态 LIVE';
        var fv = el('div', P + 'feed', fb);
        fv.style.height = rows * 20 + 'px';
        g.feedVisible = rows;
        g.feedMq = el('div', null, fv);
        g.feedRows = [];
        for (i = 0; i < FEED_N * 2; i++) {
          var row = el('div', P + 'row', g.feedMq);
          g.feedRows.push({ el: row, time: el('time', null, row), who: el('b', null, row), text: el('span', null, row) });
        }
        g.rightMax = H - 12 - fb.offsetHeight - 8;
      }
      if (big) {
        var pn = el('div', P + 'box', layer);
        pn.style.cssText = 'left:14px;top:' + (topPad + 6) + 'px;width:184px';
        el('h6', null, pn).textContent = '轨道状态 ORBIT';
        var grid = el('div', P + 'grid', pn);
        RD.rings.forEach(function (rd, j) {
          el('span', null, grid).textContent = (j === 0 ? '外圈 · ' : j === nR - 1 ? '内圈 · ' : '') + rd.name;
          g.panelCounts.push(el('span', null, grid));
        });
        el('span', null, grid).textContent = '已坠入核心';
        g.panelDone = el('span', null, grid);
        g.panelDone.style.color = 'var(--ok)';
        g.leftMin = topPad + 6 + pn.offsetHeight + 10;
      } else {
        var stp = el('div', P + 'strip', layer);
        stp.style.cssText = 'left:12px;bottom:8px;max-width:' + Math.max(80, W - 24 - (fw ? fw + 20 : 0)) + 'px';
        RD.rings.forEach(function (rd) {
          stp.appendChild(document.createTextNode(rd.name));
          g.stripCounts.push(el('b', null, stp));
        });
        stp.appendChild(document.createTextNode('坠入'));
        g.stripDone = el('b', null, stp);
        g.leftMax = H - 32;
      }

      // 任务标签尺寸
      g.LH = H < 420 ? 42 : 46;
      g.titleFs = H < 420 ? 12 : 13;
      g.LW = Math.round(Math.min(clamp(W * 0.2, 140, 190), W / 2 - 16));
      g.noLabels = g.LW < 96;

      G = g;
      update(true);
    }

    /* ---------- 任务 → 阶段 / 轨道 / 角度 ---------- */
    function phaseOf(t, stRoles) {
      if (t.status === 'queued') return 'queued';
      var rs = stRoles[t.roleId];
      if (rs && rs.taskId === t.id && (rs.status === 'moving' || rs.status === 'reporting')) return rs.status;
      return 'working';
    }
    function ringOf(t, ph) {
      var n = G.rings.length;
      var p = clamp(+t.progress || 0, 0, 1);
      if (ph === 'queued') return { i: 0, f: 0.5 };
      if (ph === 'reporting') return { i: n - 1, f: 0.5 };
      if (G.flow) {
        var ns = G.flow.stages.slice(0, 10).length;
        if (ph === 'moving') return { i: 1, f: 0.1 };
        var si = t.flowId === G.flow.id && typeof t.stage === 'number' ? clamp(Math.floor(t.stage), 0, ns - 1) : Math.min(ns - 1, Math.floor(p * ns));
        return { i: 1 + si, f: clamp(p * ns - si, 0, 1) };
      }
      if (ph === 'moving') return { i: 1, f: 0.5 };
      return { i: 2, f: p };
    }
    function stageText(t, ph) {
      var pct = Math.round(clamp(+t.progress || 0, 0, 1) * 100) + '%';
      if (ph === 'queued') return '排队中';
      if (ph === 'moving') return '前往工位';
      if (ph === 'reporting') return '汇报中';
      var f = t.flowId ? flowOf(t.flowId) : null;
      var name = f && f.stages[clamp(Math.floor(+t.stage || 0), 0, f.stages.length - 1)];
      return (name || '执行中') + ' ' + pct;
    }
    function baseDeg(roleId) { return -90 + (focusId ? 0 : (seatOf[roleId] || 0) * 360 / Math.max(1, roles.length)); }

    function makeMarker(t, rad, deg, instant) {
      var c = roleRgb(t.roleId);
      var dot = el('div', P + 'dot', G.layer);
      dot.style.color = rgb(c);
      el('i', null, dot);
      el('b', null, dot);
      var lab = el('div', P + 'lab', G.layer);
      lab.style.borderColor = rgb(c);
      lab.style.color = rgb(c);
      lab.style.width = G.LW + 'px';
      lab.style.display = 'none';
      if (t.roleId !== focusId) {
        dot.setAttribute('data-role', t.roleId);
        lab.setAttribute('data-role', t.roleId);
        lab.setAttribute('role', 'button');
        lab.tabIndex = 0;
      } else {
        dot.style.cursor = lab.style.cursor = 'default';
      }
      var tb = el('b', null, lab);
      tb.style.fontSize = G.titleFs + 'px';
      tb.style.color = 'var(--text)';
      var sb = el('span', null, lab);
      sb.style.color = rgb(mix(c, G.pal.text, 0.25));
      var th = deg * Math.PI / 180;
      return {
        id: t.id, dot: dot, lab: lab, titleEl: tb, subEl: sb,
        r: instant ? rad : G.rOut * 1.08, th: th, tr: rad, tth: th,
        lx: 0, ly: 0, tlx: 0, tly: 0, hasLab: false, want: false, side: null, tf: '', lf: ''
      };
    }
    function removeMarker(m) { removeEl(m.dot); removeEl(m.lab); }

    /* ---------- 轻量更新：最多每 250ms 一次，只改属性 / 文字 / 目标位置 ---------- */
    function update(instant) {
      if (!G) return;
      var st = wb.getState ? wb.getState() : null;
      if (!st) return;
      var tasks = st.tasks || [];
      var stRoles = st.roles || {};
      var counts = G.rings.map(function () { return 0; });
      var seen = {}, list = [], qIdx = {}, wIdx = {}, byId = {};
      for (var i = tasks.length - 1; i >= 0; i--) { // 旧任务在后：倒序遍历得到排队先后
        var t = tasks[i];
        if (!t || !t.id) continue;
        byId[t.id] = t;
        if (t.status === 'done' || (focusId && t.roleId !== focusId)) continue;
        var ph = phaseOf(t, stRoles);
        var ri = ringOf(t, ph);
        counts[ri.i]++;
        var p = clamp(+t.progress || 0, 0, 1);
        var deg = baseDeg(t.roleId);
        if (ph === 'queued') { qIdx[t.roleId] = (qIdx[t.roleId] || 0) + 1; deg -= 16 * qIdx[t.roleId]; }
        else { wIdx[t.roleId] = (wIdx[t.roleId] || 0) + 1; deg += (ph === 'reporting' ? 1 : p) * 300 + (wIdx[t.roleId] - 1) * 12; }
        var rad = G.ringR[ri.i] + (0.5 - ri.f) * G.dR * 0.6;
        seen[t.id] = true;
        var m = markers[t.id];
        if (!m) m = markers[t.id] = makeMarker(t, rad, deg, instant || still);
        m.tr = rad;
        m.tth = deg * Math.PI / 180;
        m.prio = (t.origin === 'boss' ? 1000 : 0) + PH_RANK[ph] + p * 100 + (!focusId && st.selectedRole === t.roleId ? 300 : 0);
        setAttr(m.dot, 'data-p', ph);
        toggle(m.dot, 'is-boss', t.origin === 'boss');
        toggle(m.lab, 'is-boss', t.origin === 'boss');
        var sub = (focusId ? '' : roleName(t.roleId) + ' · ') + stageText(t, ph);
        setText(m.titleEl, String(t.title || t.id));
        setText(m.subEl, sub);
        var tip = roleName(t.roleId) + ' · ' + (t.title || t.id) + ' · ' + stageText(t, ph);
        if (m.tip !== tip) { m.tip = tip; m.dot.title = tip; m.lab.title = tip; }
        list.push(m);
      }
      Object.keys(markers).forEach(function (id) {
        if (seen[id]) return;
        var m = markers[id];
        delete markers[id];
        var t = byId[id];
        if (t && t.status === 'done' && !still && !instant) startDying(m); else removeMarker(m);
      });
      layoutLabels(list);

      var doneN = 0;
      if (focusId) doneN = (stRoles[focusId] && stRoles[focusId].done) || 0;
      else roles.forEach(function (r) { doneN += (stRoles[r.id] && stRoles[r.id].done) || 0; });
      setText(G.coreSub, list.length ? '在轨 ' + list.length + ' · 已坠入 ' + doneN : '暂无在轨任务 · 已坠入 ' + doneN);
      G.ringLabs.forEach(function (e, j) { setText(e, G.rings[j].name + ' ' + counts[j]); });
      G.panelCounts.forEach(function (e, j) { setText(e, String(counts[j])); });
      G.stripCounts.forEach(function (e, j) { setText(e, String(counts[j])); });
      if (G.panelDone) setText(G.panelDone, String(doneN));
      if (G.stripDone) setText(G.stripDone, String(doneN));
      updateFeed(st);

      if (instant || still) { snapAll(); render(performance.now()); } else kick();
    }

    /* 标签排版：左右两列，各自按高度排开不重叠；放不下的只留光点 */
    function layoutLabels(list) {
      list.sort(function (a, b) { return b.prio - a.prio; });
      var LH = G.LH, LW = G.LW, gap = 6;
      var capL = G.noLabels ? 0 : Math.max(0, Math.floor((G.leftMax - G.leftMin + gap) / (LH + gap)));
      var capR = G.noLabels ? 0 : Math.max(0, Math.floor((G.rightMax - G.rightMin + gap) / (LH + gap)));
      var total = Math.min(12, capL + capR);
      var sides = { L: [], R: [] }, shown = 0;
      list.forEach(function (m) {
        m.tx = G.cx + m.tr * Math.cos(m.tth);
        m.ty = G.cy + m.tr * G.SQ * Math.sin(m.tth);
        var side = m.tx >= G.cx ? 'R' : 'L';
        if (m.side && m.side !== side && Math.abs(m.tx - G.cx) < G.rOut * 0.2) side = m.side; // 防止在中线附近来回跳
        var cap = side === 'L' ? capL : capR;
        if (shown < total && sides[side].length < cap) { sides[side].push(m); m.side = side; m.want = true; shown++; }
        else m.want = false;
      });
      ['L', 'R'].forEach(function (sd) {
        var arr = sides[sd];
        if (!arr.length) return;
        var lo = sd === 'L' ? G.leftMin : G.rightMin, hi = (sd === 'L' ? G.leftMax : G.rightMax) - LH;
        arr.sort(function (a, b) { return a.ty - b.ty; });
        var k;
        for (k = 0; k < arr.length; k++) {
          var y = clamp(arr[k].ty - LH - 12, lo, Math.max(lo, hi));
          if (k) y = Math.max(y, arr[k - 1].tly + LH + gap);
          arr[k].tly = y;
        }
        for (k = arr.length - 1; k >= 0; k--) {
          var lim = k === arr.length - 1 ? hi : arr[k + 1].tly - LH - gap;
          if (arr[k].tly > lim) arr[k].tly = lim;
          if (arr[k].tly < lo) arr[k].tly = lo;
        }
        var z = G.coreZone; // 核心名字那块不让标签压住：同一高度的标签往外让
        arr.forEach(function (m) {
          m.tlx = sd === 'R' ? clamp(m.tx + 26, G.cx + 8, Math.max(G.cx + 8, G.W - LW - 8)) : clamp(m.tx - 26 - LW, 8, Math.max(8, G.cx - LW - 8));
          if (m.tly < z[3] && m.tly + LH > z[1]) {
            if (sd === 'R' && m.tlx < z[2]) m.tlx = Math.max(m.tlx, Math.min(z[2], G.W - LW - 8));
            if (sd === 'L' && m.tlx + LW > z[0]) m.tlx = Math.min(m.tlx, Math.max(z[0] - LW, 8));
          }
        });
      });
      list.forEach(function (m) {
        if (m.want === m.hasLab) return;
        m.hasLab = m.want;
        m.lab.style.display = m.want ? '' : 'none';
        if (m.want) { m.lx = m.tlx; m.ly = m.tly; m.lf = ''; }
      });
    }

    function snapAll() {
      Object.keys(markers).forEach(function (id) {
        var m = markers[id];
        m.r = m.tr; m.th = m.tth;
        if (m.hasLab) { m.lx = m.tlx; m.ly = m.tly; }
      });
    }

    /* 画一帧：光点、标签、引线；坠入核心的光点走螺旋 */
    function render(now) {
      var d = '';
      Object.keys(markers).forEach(function (id) {
        var m = markers[id];
        var x = G.cx + m.r * Math.cos(m.th), y = G.cy + m.r * G.SQ * Math.sin(m.th);
        var tf = 'translate3d(' + fx(x) + 'px,' + fx(y) + 'px,0)';
        if (tf !== m.tf) { m.tf = tf; m.dot.style.transform = tf; }
        if (!m.hasLab) return;
        var lf = 'translate3d(' + fx(m.lx) + 'px,' + fx(m.ly) + 'px,0)';
        if (lf !== m.lf) { m.lf = lf; m.lab.style.transform = lf; }
        var ax = m.lx + G.LW / 2 >= x ? m.lx : m.lx + G.LW;
        var ay = m.ly + G.LH / 2 < y ? m.ly + G.LH - 4 : m.ly + 4;
        d += 'M' + fx(x) + ' ' + fx(y) + 'L' + fx(ax) + ' ' + fx(ay);
      });
      for (var i = dying.length - 1; i >= 0; i--) {
        var dd = dying[i];
        var t = (now - dd.t0) / dd.dur;
        if (t >= 1) { removeEl(dd.m.dot); dying.splice(i, 1); flashCore(); continue; }
        var e = t * t;
        var r = dd.r0 * (1 - e), th = dd.th0 + t * Math.PI * 1.5;
        dd.m.dot.style.transform = 'translate3d(' + fx(G.cx + r * Math.cos(th)) + 'px,' + fx(G.cy + r * G.SQ * Math.sin(th)) + 'px,0) scale(' + (1 - 0.6 * t).toFixed(2) + ')';
        dd.m.dot.style.opacity = (1 - t * t * t).toFixed(2);
      }
      if (d !== G.leaderD) { G.leaderD = d; G.leader.setAttribute('d', d); }
    }
    function startDying(m) {
      removeEl(m.lab);
      m.dot.classList.add('is-dying');
      m.dot.setAttribute('data-p', 'done');
      dying.push({ m: m, t0: performance.now(), r0: m.r, th0: m.th, dur: 1700 });
      kick();
    }
    function flashCore() {
      var h = G && G.hot;
      if (!h || typeof h.animate !== 'function') return;
      try { h.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.8)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 700, easing: 'ease-out' }); } catch (e) { /* ignore */ }
    }
    function frame(now) {
      raf = 0;
      if (!alive || !G) return;
      if (!host.isConnected && wasConnected) { api.destroy(); return; }
      var dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 1 / 60;
      lastT = now;
      var k = 1 - Math.exp(-dt * 4.5);
      var busy = dying.length > 0;
      Object.keys(markers).forEach(function (id) {
        var m = markers[id];
        var dr = m.tr - m.r, dth = m.tth - m.th;
        if (Math.abs(dr) > 0.2 || Math.abs(dth) > 0.001) { m.r += dr * k; m.th += dth * k; busy = true; } else { m.r = m.tr; m.th = m.tth; }
        if (m.hasLab) {
          var dx = m.tlx - m.lx, dy = m.tly - m.ly;
          if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) { m.lx += dx * k; m.ly += dy * k; busy = true; } else { m.lx = m.tlx; m.ly = m.tly; }
        }
      });
      render(now);
      if (busy) raf = requestAnimationFrame(frame); else lastT = 0;
    }
    function kick() { if (!raf && alive && G && !still) raf = requestAnimationFrame(frame); }

    /* 右下角动态：最新日志，超过可见行数就循环滚动（原作的跑马灯） */
    function updateFeed(st) {
      if (!G.feedRows) return;
      var logs = st.logs || [];
      var pick = [];
      for (var i = 0; i < logs.length && pick.length < FEED_N; i++) {
        var l = logs[i];
        if (!l || (focusId && l.roleId !== focusId)) continue;
        pick.push(l);
      }
      var sig = pick.map(function (l) { return l.t + '|' + l.roleId + '|' + l.text; }).join('\n');
      if (sig === G.feedSig) return;
      G.feedSig = sig;
      var scroll = !still && pick.length > G.feedVisible;
      toggle(G.feedMq, P + 'mq', scroll);
      if (scroll) G.feedMq.style.setProperty('--' + P + 'mqdur', (pick.length * 2.6).toFixed(1) + 's');
      var used = scroll ? pick.length * 2 : Math.max(1, Math.min(pick.length, G.feedVisible));
      G.feedRows.forEach(function (row, idx) {
        if (idx >= used) { row.el.style.display = 'none'; return; }
        row.el.style.display = '';
        var lg = pick.length ? pick[idx % pick.length] : null;
        if (!lg) {
          setText(row.time, '');
          setText(row.who, '');
          setText(row.text, '等待第一条动态…');
          row.text.style.color = 'var(--muted)';
          return;
        }
        var r = lg.roleId ? roleOf(lg.roleId) : null;
        setText(row.time, hms(lg.t));
        setText(row.who, r ? (r.name || r.id) : '');
        row.who.style.color = r ? rgb(roleRgb(r.id)) : '';
        setText(row.text, String(lg.text || ''));
        row.text.style.color = lg.level === 'ok' ? 'var(--ok)' : lg.level === 'boss' ? 'var(--boss)' : lg.level === 'warn' ? 'var(--warn)' : '';
      });
    }

    /* ---------- 节流与生命周期 ---------- */
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
      update(false);
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
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains(P + 'lab')) {
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
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
        root.removeEventListener('click', onClick);
        root.removeEventListener('keydown', onKey);
        removeEl(root);
        markers = {};
        dying = [];
        G = null;
      }
    };

    build();
    if (typeof wb.on === 'function') {
      ['role', 'task', 'tick', 'log', 'select', 'live', 'dispatch'].forEach(function (evt) { offs.push(wb.on(evt, markDirty)); });
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
    meta: { label: 'DATA VORTEX', modes: ['main', 'role'] },
    mount: mount
  });
})();
