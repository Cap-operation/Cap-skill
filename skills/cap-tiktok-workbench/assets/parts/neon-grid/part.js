/* 零件：霓虹赛博 neon-grid（方向 F 移植，船长自有设计）
 * 合成波风格：透视网格地面滚动 + 发光地平线 + 数字雨 + 故障字标题 + 霓虹方框（内外发光）
 * + 直角电路走线与奔跑的脉冲 + ACTIVE 高亮框 + CURRENT TASK 面板 + 扫描线与暗角。
 *   方框：老板指令(INPUT) → 统筹/调度(CORE) → 其余岗位(AGENT，自动排成列/网格) → 成果(OUTPUT)
 *   岗位 working = 黄色 ACTIVE 并点亮整条链路；reporting = 闪烁；idle = 暗。
 *   有流水线时，地平线上方一排阶段胶囊显示当前阶段。
 * 只通过 wb.getState() / wb.on() / wb.company 取数据，不造任务、不改 KPI。 */
(function () {
  'use strict';
  var ID = 'neon-grid';
  var WB = window.Workbench;
  if (!WB || typeof WB.registerPart !== 'function') return;

  var NS = 'http://www.w3.org/2000/svg';
  var MONO = '"SF Mono","JetBrains Mono","Cascadia Mono",Menlo,Consolas,monospace';
  var SANS = '-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  var DISPLAY = '"Avenir Next Condensed","Avenir Next","Futura","Eurostile","DIN Alternate","Bahnschrift",' + SANS;
  var FB = ['#00F0FF', '#FF2E97', '#3DFFA8', '#FFB03D', '#8B7BFF', '#FF6B6B'];
  var CORE_RE = /统筹|调度|总管|总控|中枢/;
  var CORE_ID = /^(chief|coord|coordinator|dispatch|dispatcher|hub)$/i;
  var TASK = { queued: '排队中', working: '进行中', done: '已完成' };
  var seq = 0;

  var CSS = [
    '.neon-grid-root{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;isolation:isolate;color:var(--text,#F5E9FF);background:#07000F;-webkit-user-select:none;user-select:none;font-family:' + SANS + '}',
    '.neon-grid-floor{position:absolute;transform-origin:50% 0;opacity:.75;pointer-events:none;',
    'background-image:linear-gradient(var(--accent2,#FF2E97) 2px,transparent 2px),linear-gradient(90deg,var(--accent2,#FF2E97) 2px,transparent 2px)}',
    '.neon-grid-haze{position:absolute;left:0;right:0;pointer-events:none;background:linear-gradient(#3A0A4A,rgba(10,0,20,0));',
    'background:linear-gradient(color-mix(in srgb,var(--accent2,#FF2E97) 24%,var(--bg,#05000C)),transparent)}',
    '.neon-grid-horizon{position:absolute;left:0;right:0;height:3px;pointer-events:none;background:var(--accent2,#FF2E97);',
    'box-shadow:0 0 22px 6px rgba(255,46,151,.7);box-shadow:0 0 22px 6px color-mix(in srgb,var(--accent2,#FF2E97) 70%,transparent)}',
    '.neon-grid-svg{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}',
    '.neon-grid-rain{stroke:var(--accent,#00F0FF);stroke-opacity:.3;animation:neon-grid-rain 1.8s linear infinite}',
    '@keyframes neon-grid-rain{to{stroke-dashoffset:64}}',
    '.neon-grid-ridge{stroke:var(--c5,#7B2FF7);stroke-opacity:.8}',
    '.neon-grid-base{stroke:var(--accent,#00F0FF);stroke-opacity:.72}',
    '.neon-grid-busl{stroke:var(--accent2,#FF2E97)}',
    '.neon-grid-act{stroke:var(--boss,#FFE600)}',
    '.neon-grid-pulse{stroke:#fff;animation:neon-grid-pf 2.6s linear infinite}',
    '.neon-grid-pulsey{stroke:#fff;animation:neon-grid-py 1.4s linear infinite}',
    '.neon-grid-buspulse{stroke:#FFC2E2;stroke:color-mix(in srgb,var(--accent2,#FF2E97) 30%,#fff);animation:neon-grid-pf 2.6s linear infinite}',
    '@keyframes neon-grid-pf{to{stroke-dashoffset:-240}}',
    '@keyframes neon-grid-py{to{stroke-dashoffset:-160}}',
    /* 霓虹方框 */
    '.neon-grid-box{--ngc:var(--ngr,#00F0FF);position:absolute;z-index:1;box-sizing:border-box;padding:4px 10px;display:flex;flex-direction:column;justify-content:center;',
    'border:1.5px solid var(--ngc);border-radius:3px;background:rgba(5,0,15,.78);background:color-mix(in srgb,var(--bg,#05000F) 80%,transparent);',
    'box-shadow:0 0 14px var(--ngc);box-shadow:0 0 14px var(--ngc),inset 0 0 14px color-mix(in srgb,var(--ngc) 30%,transparent);overflow:hidden;transition:opacity .35s,border-color .35s,box-shadow .35s}',
    '.neon-grid-bh{font-family:' + MONO + ';font-size:11px;line-height:1.35;color:var(--ngc);color:color-mix(in srgb,var(--ngc) 55%,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.neon-grid-bn{font-weight:700;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 8px var(--ngc)}',
    '.neon-grid-compact{padding:2px 8px}',
    '.neon-grid-compact .neon-grid-bh{display:none}',
    '.neon-grid-box[data-role]{cursor:pointer}',
    '.neon-grid-box[data-role]:hover{filter:brightness(1.3)}',
    '.neon-grid-box[data-s="idle"]{opacity:.6;box-shadow:0 0 6px var(--ngc);box-shadow:0 0 6px var(--ngc),inset 0 0 8px color-mix(in srgb,var(--ngc) 18%,transparent)}',
    '.neon-grid-box[data-s="moving"]{animation:neon-grid-boot 1.2s steps(2) infinite}',
    '@keyframes neon-grid-boot{50%{opacity:.68}}',
    '.neon-grid-box[data-s="reporting"]{animation:neon-grid-flick 2.8s steps(1) infinite}',
    '@keyframes neon-grid-flick{0%,100%{opacity:1}8%{opacity:.35}10%{opacity:1}52%{opacity:.6}54%{opacity:1}}',
    '.neon-grid-box[data-s="working"],.neon-grid-out{--ngc:var(--boss,#FFE600);border-width:2px;background:rgba(20,16,0,.8);background:color-mix(in srgb,var(--boss,#FFE600) 8%,rgba(5,0,15,.86));',
    'box-shadow:0 0 22px var(--ngc);box-shadow:0 0 22px var(--ngc),inset 0 0 16px color-mix(in srgb,var(--ngc) 35%,transparent)}',
    '.neon-grid-box[data-s="working"] .neon-grid-bn,.neon-grid-out .neon-grid-bn{color:#FFFBD1;color:color-mix(in srgb,var(--boss,#FFE600) 22%,#fff);text-shadow:0 0 10px var(--ngc)}',
    '.neon-grid-hot{box-shadow:0 0 22px var(--ngc);box-shadow:0 0 22px var(--ngc),inset 0 0 18px color-mix(in srgb,var(--ngc) 40%,transparent)}',
    '.neon-grid-cold{opacity:.72}',
    '.neon-grid-ping{animation:neon-grid-ping 1.2s ease-out}',
    '@keyframes neon-grid-ping{0%{filter:brightness(2.2)}100%{filter:none}}',
    '.neon-grid-sel{outline:1px solid var(--ngc);outline-offset:3px}',
    '.neon-grid-focus{opacity:1!important;outline:1px dashed var(--ngc);outline-offset:5px}',
    '.neon-grid-dim{opacity:.34!important}',
    /* 阶段胶囊 */
    '.neon-grid-pill{position:absolute;z-index:1;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 8px;border:1px solid var(--accent2,#FF2E97);border-radius:16px;',
    'background:rgba(5,0,15,.85);background:color-mix(in srgb,var(--bg,#05000F) 85%,transparent);box-shadow:0 0 10px var(--accent2,#FF2E97);font-size:12.5px;white-space:nowrap;overflow:hidden;transition:opacity .35s,box-shadow .35s,border-color .35s}',
    '.neon-grid-pill i{font-style:normal;font-family:' + MONO + ';font-size:11px;opacity:.7}',
    '.neon-grid-pill[data-s="next"]{opacity:.5;box-shadow:0 0 4px var(--accent2,#FF2E97)}',
    '.neon-grid-pill[data-s="on"]{border-color:var(--boss,#FFE600);box-shadow:0 0 16px var(--boss,#FFE600);color:#FFFBD1;color:color-mix(in srgb,var(--boss,#FFE600) 22%,#fff)}',
    '.neon-grid-flowlab{position:absolute;z-index:1;font-family:' + MONO + ';font-size:11px;letter-spacing:.1em;color:var(--accent2,#FF2E97);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
    /* 标题 / 顶部状态 */
    '.neon-grid-title{position:absolute;z-index:2;pointer-events:none;min-width:0}',
    '.neon-grid-kick{font-family:' + MONO + ';font-size:11px;letter-spacing:.16em;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#C9A8E8;color:color-mix(in srgb,var(--accent2,#FF2E97) 35%,var(--text,#fff))}',
    '.neon-grid-name{font-family:' + DISPLAY + ';font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#fff;line-height:1.25;padding:0 6px 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
    'text-shadow:2px 0 var(--accent2,#FF2E97),-2px 0 var(--accent,#00F0FF);animation:neon-grid-glitch 3.5s steps(1) infinite}',
    '@keyframes neon-grid-glitch{0%,100%{text-shadow:2px 0 var(--accent2,#FF2E97),-2px 0 var(--accent,#00F0FF);transform:none}',
    '91%{text-shadow:5px 0 var(--accent2,#FF2E97),-5px 0 var(--accent,#00F0FF);transform:translateX(2px)}',
    '93%{text-shadow:-3px 0 var(--accent2,#FF2E97),3px 0 var(--accent,#00F0FF);transform:translateX(-2px)}}',
    '.neon-grid-chips{position:absolute;z-index:2;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px 16px;max-width:44%;font-family:' + MONO + ';font-size:12px;pointer-events:none;',
    'color:#C9A8E8;color:color-mix(in srgb,var(--accent2,#FF2E97) 35%,var(--text,#fff))}',
    '.neon-grid-chips span{white-space:nowrap}',
    '.neon-grid-chips b{margin-left:5px;font-weight:600;color:var(--text,#fff)}',
    /* CURRENT TASK 面板 */
    '.neon-grid-panel{position:absolute;z-index:3;box-sizing:border-box;padding:12px 14px;border:1px solid var(--accent,#00F0FF);font-family:' + MONO + ';font-size:11.5px;',
    'background:rgba(5,0,15,.82);background:color-mix(in srgb,var(--bg,#05000F) 84%,transparent);',
    'box-shadow:0 0 14px rgba(0,240,255,.5);box-shadow:0 0 14px color-mix(in srgb,var(--accent,#00F0FF) 50%,transparent)}',
    '.neon-grid-pk{display:flex;justify-content:space-between;align-items:center;gap:8px;letter-spacing:.12em;color:#8FEFFF;color:color-mix(in srgb,var(--accent,#00F0FF) 55%,#fff)}',
    '.neon-grid-pk span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.neon-grid-tag{flex-shrink:0;letter-spacing:0;padding:0 7px;border:1px solid currentColor;border-radius:99px;font-size:11px;line-height:16px}',
    '.neon-grid-tag:empty{display:none}',
    '.neon-grid-tag[data-o="boss"]{color:var(--boss,#FFE600)}',
    '.neon-grid-pt{margin-top:6px;font-family:' + SANS + ';font-size:15px;font-weight:700;line-height:1.3;color:var(--text,#fff);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '.neon-grid-pb{margin-top:8px;height:6px;background:#1E0B33;background:color-mix(in srgb,var(--accent2,#FF2E97) 14%,var(--bg,#05000F))}',
    '.neon-grid-pb i{display:block;height:100%;width:0;background:var(--boss,#FFE600);box-shadow:0 0 10px var(--boss,#FFE600);transition:width .5s}',
    '.neon-grid-pfoot{margin-top:6px;display:flex;justify-content:space-between;gap:8px;color:#E3C9F5;color:color-mix(in srgb,var(--accent2,#FF2E97) 18%,var(--text,#fff))}',
    '.neon-grid-pfoot span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.neon-grid-plist{margin-top:8px;padding-top:6px;display:grid;gap:3px;border-top:1px dashed rgba(0,240,255,.3);border-top:1px dashed color-mix(in srgb,var(--accent,#00F0FF) 30%,transparent)}',
    '.neon-grid-plist:empty{display:none}',
    '.neon-grid-plist div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted,#C9A8E8);font-family:' + SANS + ';font-size:12px}',
    /* 扫描线 + 暗角 */
    '.neon-grid-scan{position:absolute;left:0;top:0;right:0;bottom:0;z-index:4;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px)}',
    '.neon-grid-vig{position:absolute;left:0;top:0;right:0;bottom:0;z-index:4;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55) 100%)}',
    '.neon-grid-still,.neon-grid-still *{animation:none!important;transition:none!important}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('part-' + ID + '-css')) return;
    var st = document.createElement('style');
    st.id = 'part-' + ID + '-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function find(arr, fn) { for (var i = 0; i < (arr || []).length; i++) if (fn(arr[i], i)) return arr[i]; return null; }
  function lcg(seed) {   // 原设计同款 LCG（种子 41），数字雨与山脊每次一致
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }
  function hEl(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function sEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function setText(el, t) { t = String(t); if (el && el._t !== t) { el._t = t; el.textContent = t; } }
  function setAttr(el, k, v) { var key = '_a_' + k; if (el && el[key] !== v) { el[key] = v; el.setAttribute(k, v); } }
  function setD(el, d) { d = d || 'M0 0'; if (el._d !== d) { el._d = d; el.setAttribute('d', d); } }
  function r1(n) { return Math.round(n * 2) / 2; }
  function textW(s, fs) {   // 粗估文字宽度：中文≈1em，其余≈0.62em（等宽/西文）
    var w = 0;
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2e80 ? fs : fs * 0.62;
    return w;
  }

  WB.registerPart(ID, {
    meta: { label: 'NEON GRID', modes: ['main', 'role'] },
    mount: function (host, wb, opts) {
      opts = opts || {};
      injectCss();
      var uid = 'ng' + (++seq) + '_';
      var isMain = opts.mode !== 'role';
      var focus = !isMain && opts.roleId ? wb.roleById(opts.roleId) : null;
      var still = !!wb.reducedMotion;
      var dead = false;

      var root = hEl('div', 'neon-grid-root' + (still ? ' neon-grid-still' : ''), host);
      var floor = hEl('div', 'neon-grid-floor', root);
      var haze = hEl('div', 'neon-grid-haze', root);
      var horizon = hEl('div', 'neon-grid-horizon', root);
      var svg = sEl('svg', { 'class': 'neon-grid-svg', 'aria-hidden': 'true', width: 1, height: 1 }, root);
      var defs = sEl('defs', {}, svg);
      var glow = sEl('filter', { id: uid + 'glow', x: '-10%', y: '-20%', width: '120%', height: '140%' }, defs);
      sEl('feGaussianBlur', { stdDeviation: 3, result: 'b' }, glow);
      var merge = sEl('feMerge', {}, glow);
      sEl('feMergeNode', { 'in': 'b' }, merge); sEl('feMergeNode', { 'in': 'b' }, merge); sEl('feMergeNode', { 'in': 'SourceGraphic' }, merge);
      var rain = sEl('path', { 'class': 'neon-grid-rain', fill: 'none', 'stroke-width': '1.2', 'stroke-dasharray': '2 30', d: 'M0 0' }, svg);
      var ridge = sEl('polyline', { 'class': 'neon-grid-ridge', fill: 'none', 'stroke-width': '1.5', points: '0,0' }, svg);
      var gC = sEl('g', { filter: 'url(#' + uid + 'glow)', fill: 'none', 'stroke-linecap': 'square', 'stroke-linejoin': 'miter' }, svg);
      var pBase = sEl('path', { 'class': 'neon-grid-base', 'stroke-width': '2', d: 'M0 0' }, gC);
      var pBus = sEl('path', { 'class': 'neon-grid-busl', 'stroke-width': '1.6', d: 'M0 0' }, gC);
      var pAct = sEl('path', { 'class': 'neon-grid-act', 'stroke-width': '2.6', d: 'M0 0' }, gC);
      var pPulse = sEl('path', { 'class': 'neon-grid-pulse', 'stroke-width': '3.5', 'stroke-dasharray': '10 110', d: 'M0 0' }, gC);
      var pBusPulse = sEl('path', { 'class': 'neon-grid-buspulse', 'stroke-width': '3', 'stroke-dasharray': '6 74', d: 'M0 0' }, gC);
      var pPulseY = sEl('path', { 'class': 'neon-grid-pulsey', 'stroke-width': '4', 'stroke-dasharray': '16 64', d: 'M0 0' }, gC);
      var boxLayer = hEl('div', '', root);
      var pillLayer = hEl('div', '', root);

      var title = hEl('div', 'neon-grid-title', root);
      var kick = hEl('div', 'neon-grid-kick', title);
      kick.textContent = 'NEON GRID // ' + (focus ? '岗位 · ' + (focus.name || focus.id) : 'AI 岗位矩阵');
      var titleName = hEl('div', 'neon-grid-name', title);
      var co0 = (wb.company && wb.company.company) || {};
      titleName.textContent = co0.name || 'OPC 工作台';

      var chips = hEl('div', 'neon-grid-chips', root);
      chips.innerHTML = '<span>SYS<b data-k="sys"></b></span><span>AGENTS<b data-k="ag"></b></span><span>ACTIVE<b data-k="act"></b></span><span>QUEUE<b data-k="q"></b></span>';
      var chipEl = {};
      Array.prototype.forEach.call(chips.querySelectorAll('b[data-k]'), function (b) { chipEl[b.getAttribute('data-k')] = b; });

      var panel = hEl('div', 'neon-grid-panel', root);
      var pk = hEl('div', 'neon-grid-pk', panel);
      var pkLabel = hEl('span', '', pk);
      var pTag = hEl('span', 'neon-grid-tag', pk);
      var pTitle = hEl('div', 'neon-grid-pt', panel);
      var pBar = hEl('i', '', hEl('div', 'neon-grid-pb', panel));
      var pFoot = hEl('div', 'neon-grid-pfoot', panel);
      var pLeft = hEl('span', '', pFoot), pPct = hEl('span', '', pFoot);
      var pList = hEl('div', 'neon-grid-plist', panel);
      setText(pkLabel, focus ? 'CURRENT TASK // ' + (focus.name || focus.id) : 'CURRENT TASK');

      hEl('div', 'neon-grid-scan', root);
      hEl('div', 'neon-grid-vig', root);

      var boxes = [], routes = { inp: '', core: {}, out: {} }, pills = [], busD = '';
      var sized = false, laidFlow = null, lastLayout = 0, lastDone = -1, listSig = '', floorAnim = null;
      var dirty = true, rzRaf = 0;

      /* ---------- 数据工具 ---------- */
      function roleCol(id, i) {
        var c = '';
        try { c = wb.roleColor(id); } catch (e) { c = ''; }
        return c || FB[(i < 0 ? 0 : i) % FB.length];
      }
      function findCore(roles) {
        var named = find(roles, function (r) { return CORE_RE.test(r.name || '') || (r.keywords || []).indexOf('统筹') !== -1; }) ||
          find(roles, function (r) { return CORE_ID.test(r.id || ''); });
        return named || null;   // 没有统筹类岗位 → 用“调度中枢”虚拟核心
      }
      function flowsList() {
        return ((wb.company && wb.company.flows) || []).filter(function (f) { return f && f.id && f.stages && f.stages.length; });
      }
      function pickFlow() {
        var flows = flowsList();
        if (!flows.length) return null;
        if (focus) return focus.flow ? find(flows, function (f) { return f.id === focus.flow; }) : null;
        var st = wb.getState() || {};
        var t = find(st.tasks, function (x) { return x.status === 'working' && x.flowId; });
        return (t && find(flows, function (f) { return f.id === t.flowId; })) || flows[0];
      }
      function pickTask(st) {
        var tasks = (st.tasks || []).filter(function (t) { return t && wb.roleById(t.roleId); });
        if (focus) {
          var rs = (st.roles || {})[focus.id] || {};
          var mine = tasks.filter(function (t) { return t.roleId === focus.id; });
          var curT = (rs.taskId && find(mine, function (t) { return t.id === rs.taskId; })) ||
            find(mine, function (t) { return t.status !== 'done'; }) || mine[0] || null;
          return { task: curT, list: mine.filter(function (t) { return t !== curT; }).slice(0, 3) };
        }
        var t = find(tasks, function (x) { return x.origin === 'boss' && x.status === 'working'; }) ||
          find(tasks, function (x) { return x.origin === 'boss' && x.status === 'queued'; }) ||
          find(tasks, function (x) { return x.status === 'working'; }) ||
          find(tasks, function (x) { return x.status === 'queued'; });
        return { task: t || null, list: [] };
      }

      /* ---------- 布局（只在尺寸 / 流水线变化时重建） ---------- */
      function layout() {
        if (dead) return;
        var W = host.clientWidth, H = host.clientHeight;
        if (W < 40 || H < 40) { sized = false; return; }
        sized = true;
        lastLayout = Date.now();
        var pad = clamp(Math.round(W * 0.028), 12, 40);
        var hy = Math.round(H * 0.69);

        // 天空：深色 → 地平线处染上 accent2 的晚霞（随调色板变化）
        var sky0 = 'linear-gradient(180deg,#05000C 0px,#14002A ' + Math.round(H * 0.55) + 'px,#3A0A4A ' + hy + 'px,#0A0014 ' + hy + 'px)';
        var sky1 = 'linear-gradient(180deg,color-mix(in srgb,var(--bg,#05000C) 85%,#000) 0px,' +
          'color-mix(in srgb,var(--accent2,#FF2E97) 9%,var(--bg,#05000C)) ' + Math.round(H * 0.55) + 'px,' +
          'color-mix(in srgb,var(--accent2,#FF2E97) 24%,var(--bg,#05000C)) ' + hy + 'px,' +
          'color-mix(in srgb,var(--bg,#05000C) 72%,#000) ' + hy + 'px)';
        root.style.background = sky0;
        root.style.background = sky1;   // 不支持 color-mix 时这句被忽略，保留上一句

        // 透视网格地面：按原设计 perspective(600px) rotateX(58deg)，随尺寸缩放并保证铺到底部
        var Y = Math.max(20, H - hy);
        var p = Math.max(600 * W / 1440, Y * 2.6, 240);
        var den = p * 0.5299 - Y * 0.848;
        var fh = clamp(den > 0 ? Y * p / den * 1.12 : Y * 9, 120, Y * 9);
        var cell = clamp(Math.round(W / 18), 34, 96);
        floor.style.left = Math.round(-0.22 * W) + 'px';
        floor.style.top = hy + 'px';
        floor.style.width = Math.round(1.44 * W) + 'px';
        floor.style.height = Math.round(fh) + 'px';
        floor.style.transform = 'perspective(' + Math.round(p) + 'px) rotateX(58deg)';
        floor.style.backgroundSize = cell + 'px ' + cell + 'px,' + cell + 'px ' + cell + 'px';
        animateFloor(cell);
        haze.style.top = hy + 'px';
        haze.style.height = Math.round(H * 0.14) + 'px';
        horizon.style.top = (hy - 2) + 'px';

        svg.setAttribute('width', W); svg.setAttribute('height', H);
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

        // 数字雨 + 远山（种子 41，与原设计同一套随机）
        var rnd = lcg(41), rd = [], nR = Math.round(W / 16);
        for (var i = 0; i < nR; i++) {
          var x = Math.round(rnd() * W), y0 = Math.round(rnd() * H * 0.31), y1 = y0 + Math.round(H * 0.125 + rnd() * H * 0.34);
          if (y0 < hy - 20) rd.push('M' + x + ' ' + y0 + ' V' + Math.min(hy - 8, y1));
        }
        setD(rain, rd.join(' '));
        var pts = [], nP = 16;
        for (var j = 0; j <= nP; j++) {
          var px = Math.round(W * j / nP + (j > 0 && j < nP ? (rnd() - 0.5) * W / nP * 0.4 : 0));
          var dy = j % 2 ? (0.05 + rnd() * 0.05) * H : (0.004 + rnd() * 0.035) * H;
          pts.push(px + ',' + Math.round(hy - dy));
        }
        ridge.setAttribute('points', pts.join(' '));

        // 标题 + 顶部状态
        var tTop = isMain ? 14 : 12;   // 外壳的 stage-label 在右下角
        var showChips = W >= 760;
        title.style.left = pad + 'px';
        title.style.top = tTop + 'px';
        title.style.maxWidth = Math.round(showChips ? W * 0.54 : W - 2 * pad) + 'px';
        titleName.style.fontSize = clamp(Math.round(W / 48), 16, 30) + 'px';
        chips.style.display = showChips ? 'flex' : 'none';
        chips.style.right = pad + 'px';
        chips.style.top = (tTop + 18) + 'px';
        var regionTop = tTop + title.offsetHeight + 14;

        // 方框网格：老板 → 核心 → 岗位(m 列 × r 行) → 成果
        var co = wb.company || {}, roles = co.roles || [];
        var coreRole = findCore(roles);
        var agents = roles.filter(function (r) { return r !== coreRole; });
        var nA = agents.length;
        var flow = pickFlow();
        laidFlow = flow ? flow.id : null;
        var availW = W - 2 * pad;
        var nSt = flow ? flow.stages.length : 0;
        var wantPills = !!flow && H >= 460 && nSt * 60 + (nSt - 1) * 14 <= availW;
        var rTop = regionTop, rBot = hy - (wantPills ? 76 : 16);
        if (rBot - rTop < 100) rBot = Math.min(H - 10, rTop + 100);
        var availH = rBot - rTop;

        var best = null, maxM = Math.max(1, Math.min(4, nA));
        for (var m = 1; m <= maxM; m++) {
          var rows = Math.max(1, Math.ceil(nA / m)), cols = m + 3;
          var bw = Math.min(180, availW / (cols + (cols - 1) * 0.42));
          var bh = Math.min(58, availH / (rows + (rows - 1) * 0.42));
          var sc = Math.min(bw / 170, bh / 56) - (m - 1) * 0.03;
          if (!best || sc > best.sc) best = { m: m, rows: rows, bw: bw, bh: bh, sc: sc };
        }
        var M = best.m, R = best.rows, BW = Math.floor(best.bw), BH = Math.floor(best.bh);
        var NC = M + 3;
        var gapX = clamp((availW - NC * BW) / (NC - 1), 18, 140);
        var totalW = NC * BW + (NC - 1) * gapX;
        var left0 = pad + Math.max(0, (availW - totalW) / 2);
        var colX = [];
        for (var c = 0; c < NC; c++) colX.push(Math.round(left0 + c * (BW + gapX)));
        var gapY = R > 1 ? clamp((availH - R * BH) / (R - 1), BH * 0.3, BH * 0.9) : 0;
        var gridH = R * BH + (R - 1) * gapY;
        var gridTop = rTop + (availH - gridH) / 2;
        var midY = Math.round(rTop + availH / 2);
        var ioH = Math.round(clamp(Math.max(BH, Math.min(58, availH * 0.3)), 24, 58));
        var gut = Math.max(gapY / 2, 8);

        boxLayer.innerHTML = '';
        boxes = [];
        function addBox(b) {
          var el = hEl('div', 'neon-grid-box neon-grid-' + b.kind, boxLayer);
          el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
          el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
          el.style.setProperty('--ngr', b.color);
          if (b.h < 42) el.classList.add('neon-grid-compact');
          b.el = el;
          b.hEl = hEl('div', 'neon-grid-bh', el);
          b.nEl = hEl('div', 'neon-grid-bn', el);
          b.fs = clamp(Math.round(b.h * 0.27), 12, 15);
          b.nEl.style.fontSize = b.fs + 'px';
          if (b.roleId) {
            if (isMain) { el.setAttribute('data-role', b.roleId); el.title = '点击查看岗位'; }
            if (focus && focus.id === b.roleId) el.classList.add('neon-grid-focus');
            else if (focus && b.kind === 'agent') el.classList.add('neon-grid-dim');
          }
          b.s = '';
          boxes.push(b);
          return b;
        }
        var inB = addBox({ kind: 'in', x: colX[0], y: midY - Math.round(ioH / 2), w: BW, h: ioH, color: 'var(--accent, #00F0FF)' });
        var coreB = addBox({
          kind: 'core', x: colX[1], y: midY - Math.round(ioH / 2), w: BW, h: ioH, roleId: coreRole ? coreRole.id : null,
          color: 'var(--accent2, #FF2E97)'
        });
        var outB = addBox({ kind: 'out', x: colX[NC - 1], y: midY - Math.round(ioH / 2), w: BW, h: ioH, color: 'var(--boss, #FFE600)' });

        // 岗位按列排（列优先），列里不足 R 个时均匀散开，保持对齐以便走线穿过行间缝
        var base = Math.floor(nA / M), extra = nA % M, k = 0, laid = [], occ = {};
        for (var cj = 0; cj < M; cj++) {
          var cnt = base + (cj < extra ? 1 : 0);
          for (var q = 0; q < cnt; q++) {
            var row = cnt === R ? q : cnt === 1 ? Math.floor((R - 1) / 2) : Math.round(q * (R - 1) / (cnt - 1));
            var role = agents[k], ri = roles.indexOf(role);
            k++;
            occ[cj + ':' + row] = true;
            laid.push(addBox({
              kind: 'agent', col: cj, row: row, roleId: role.id, color: roleCol(role.id, ri),
              x: colX[2 + cj], y: Math.round(gridTop + row * (BH + gapY)), w: BW, h: BH
            }));
          }
        }

        // 直角电路走线
        var coreR = coreB.x + BW;
        var busX1 = Math.round(coreR + (colX[2] - coreR) / 2);
        var lastR = colX[NC - 2] + BW;
        var busX2 = Math.round(lastR + (outB.x - lastR) / 2);
        routes = { inp: 'M' + (inB.x + BW) + ' ' + midY + ' H' + coreB.x, core: {}, out: {} };
        laid.forEach(function (a) {
          var acy = Math.round(a.y + a.h / 2), cr, oc;
          if (a.col === 0) cr = 'M' + coreR + ' ' + midY + ' H' + busX1 + ' V' + acy + ' H' + a.x;
          else {
            var gy = r1(a.y - gut), ex = Math.round(a.x + a.w * 0.35);
            cr = 'M' + coreR + ' ' + midY + ' H' + busX1 + ' V' + gy + ' H' + ex + ' V' + a.y;
          }
          var clear = true;
          for (var cc = a.col + 1; cc < M; cc++) if (occ[cc + ':' + a.row]) clear = false;
          if (clear) oc = 'M' + (a.x + a.w) + ' ' + acy + ' H' + busX2 + ' V' + midY + ' H' + outB.x;
          else {
            var gy2 = r1(a.y + a.h + gut), ox = Math.round(a.x + a.w * 0.65);
            oc = 'M' + ox + ' ' + (a.y + a.h) + ' V' + gy2 + ' H' + busX2 + ' V' + midY + ' H' + outB.x;
          }
          routes.core[a.roleId] = cr;
          routes.out[a.roleId] = oc;
        });
        if (!laid.length) routes.out._core = 'M' + coreR + ' ' + midY + ' H' + outB.x;
        var allPaths = [routes.inp];
        Object.keys(routes.core).forEach(function (id) { allPaths.push(routes.core[id], routes.out[id]); });
        if (routes.out._core) allPaths.push(routes.out._core);
        setD(pBase, allPaths.join(' '));

        // 流水线阶段胶囊（原设计的“技能”总线）
        pillLayer.innerHTML = '';
        pills = []; busD = '';
        var bus = [];
        if (wantPills) {
          var gap = 14, pw = clamp((availW - (nSt - 1) * gap) / nSt, 60, 120), ph = 30;
          var tot = nSt * pw + (nSt - 1) * gap;
          var gx = (colX[2] + lastR) / 2;
          var px0 = clamp(gx - tot / 2, pad, W - pad - tot);
          var py = hy - 50, by = py - 18;
          var cxs = [];
          flow.stages.forEach(function (sn, si) {
            var x = Math.round(px0 + si * (pw + gap));
            var el = hEl('div', 'neon-grid-pill', pillLayer);
            el.style.left = x + 'px'; el.style.top = py + 'px'; el.style.width = Math.round(pw) + 'px'; el.style.height = ph + 'px';
            el.innerHTML = '<i></i><span></span>';
            el.firstChild.textContent = (si < 9 ? '0' : '') + (si + 1);
            el.lastChild.textContent = sn;
            pills.push(el);
            cxs.push(Math.round(x + pw / 2));
          });
          var minX = cxs[0], maxX = cxs[cxs.length - 1];
          var owner = find(roles, function (r) { return r.flow === flow.id; });
          var ob = owner ? find(boxes, function (b) { return b.roleId === owner.id; }) : null;
          if (ob && ob.kind === 'agent' && find(laid, function (o) { return o.col === ob.col && o.row > ob.row; })) ob = null;
          if (ob) {
            var oxc = Math.round(ob.x + ob.w / 2);
            bus.push('M' + oxc + ' ' + (ob.y + ob.h) + ' V' + by);
            minX = Math.min(minX, oxc); maxX = Math.max(maxX, oxc);
          }
          bus.push('M' + minX + ' ' + by + ' H' + maxX);
          cxs.forEach(function (cx) { bus.push('M' + cx + ' ' + by + ' V' + py); });
          busD = bus.join(' ');
          if (px0 - pad >= 96) {
            var fl = hEl('div', 'neon-grid-flowlab', pillLayer);
            fl.style.left = pad + 'px'; fl.style.width = Math.round(px0 - pad - 12) + 'px';
            fl.style.top = (py + 7) + 'px';
            fl.textContent = (flow.name || '流水线') + ' //';
          }
        }
        setD(pBus, busD);

        // CURRENT TASK 面板：落在地平线下的地面上
        var pw2 = focus ? clamp(Math.round(W * 0.3), 220, 320) : clamp(Math.round(W * 0.22), 200, 300);
        panel.style.right = pad + 'px';
        panel.style.width = Math.min(pw2, W - 2 * pad) + 'px';
        panel.style.bottom = clamp(Math.round((H - hy) * 0.28), 10, 80) + 'px';

        lastDone = -1;
        refresh();
      }

      function animateFloor(cell) {
        if (floorAnim) { try { floorAnim.cancel(); } catch (e) { /* ignore */ } floorAnim = null; }
        if (still || typeof floor.animate !== 'function') return;
        try {
          floorAnim = floor.animate(
            [{ backgroundPosition: '0px 0px, 0px 0px' }, { backgroundPosition: '0px ' + cell + 'px, 0px 0px' }],
            { duration: 900, iterations: Infinity, easing: 'linear' });
        } catch (e) { floorAnim = null; }
      }

      /* ---------- 状态刷新（≤4 次/秒，只改文字、类名和几条 path） ---------- */
      function refresh() {
        if (dead || !sized) return;
        var st = wb.getState() || {}, rs = st.roles || {}, tasks = st.tasks || [];
        if (!focus && Date.now() - lastLayout > 2000) {
          var f = pickFlow();
          if ((f ? f.id : null) !== laidFlow) { layout(); return; }
        }
        var act = [], pulse = [], doneTotal = 0, nActive = 0, anyWorking = false, coreWorking = false;
        boxes.forEach(function (b) {
          if (!b.roleId) return;
          var r = rs[b.roleId] || {}, s = r.status || 'idle';
          var role = wb.roleById(b.roleId) || {};
          doneTotal += r.done || 0;
          if (s !== 'idle') nActive++;
          if (b.s !== s) { b.s = s; b.el.setAttribute('data-s', s); }
          b.el.classList.toggle('neon-grid-sel', isMain && st.selectedRole === b.roleId);
          var pct = Math.round((r.progress || 0) * 100);
          var tag = b.kind === 'core' ? 'CORE' : ({ working: 'ACTIVE', moving: 'BOOT', reporting: 'REPORT' })[s] || 'AGENT';
          var tail = s === 'working' ? ' · ' + pct + '%' : s === 'idle' ? ' · ✓' + (r.done || 0) : '';
          var headFull = tag + ' // ' + b.roleId + tail;
          setText(b.hEl, textW(headFull, 11) <= b.w - 22 ? headFull : tag + tail);
          var compact = b.h < 42;
          var nm = role.name || b.roleId;
          var suffix = s === 'working' ? (compact ? ' ' + pct + '%' : ' · 运行中') : compact ? '' : s === 'reporting' ? ' · 汇报中' : s === 'moving' ? ' · 就位中' : '';
          if (suffix && textW(nm + suffix, b.fs) > b.w - 22) suffix = s === 'working' ? ' ' + pct + '%' : '';
          setText(b.nEl, nm + suffix);
          if (b.kind === 'core') { if (s === 'working') coreWorking = true; return; }
          var focused = !!focus && focus.id === b.roleId;
          if (s !== 'idle' || focused) pulse.push(routes.core[b.roleId], routes.out[b.roleId]);
          if (s === 'working') { anyWorking = true; act.push(routes.core[b.roleId], routes.out[b.roleId]); }
        });

        var coreB = find(boxes, function (b) { return b.kind === 'core'; });
        if (coreB && !coreB.roleId) {
          setText(coreB.hEl, 'CORE // dispatch · ' + nActive);
          setText(coreB.nEl, '调度中枢');
          coreB.el.classList.toggle('neon-grid-hot', nActive > 0);
        }
        var bossPending = tasks.filter(function (t) { return t && t.origin === 'boss' && t.status !== 'done'; }).length;
        var queued = tasks.filter(function (t) { return t && t.status === 'queued'; }).length;
        var inB = find(boxes, function (b) { return b.kind === 'in'; });
        if (inB) {
          setText(inB.hEl, 'INPUT // boss · ' + bossPending);
          setText(inB.nEl, '老板指令');
          inB.el.classList.toggle('neon-grid-hot', bossPending > 0);
          inB.el.classList.toggle('neon-grid-cold', !bossPending && !nActive);
        }
        if (bossPending || anyWorking || coreWorking) { act.push(routes.inp); pulse.push(routes.inp); }
        if (focus && coreB && coreB.roleId === focus.id) pulse.push(routes.inp);
        var outB = find(boxes, function (b) { return b.kind === 'out'; });
        if (outB) {
          setText(outB.hEl, 'OUTPUT // ✓' + doneTotal);
          setText(outB.nEl, '成果交付');
          if (lastDone >= 0 && doneTotal > lastDone && !still) {
            outB.el.classList.remove('neon-grid-ping');
            void outB.el.offsetWidth;
            outB.el.classList.add('neon-grid-ping');
          }
          lastDone = doneTotal;
        }
        if (routes.out._core && (nActive || bossPending)) { act.push(routes.out._core); pulse.push(routes.out._core); }
        var actD = act.filter(Boolean).join(' ');
        setD(pAct, actD);
        setD(pPulseY, actD);
        setD(pPulse, pulse.filter(Boolean).join(' '));

        // 顶部状态
        setText(chipEl.sys, st.paused ? 'PAUSED' : 'ONLINE');
        setText(chipEl.ag, ((wb.company && wb.company.roles) || []).length);
        setText(chipEl.act, nActive);
        setText(chipEl.q, queued);

        // 阶段胶囊
        if (pills.length && laidFlow) {
          var ft = find(tasks, function (t) { return t && t.flowId === laidFlow && t.status === 'working' && (!focus || t.roleId === focus.id); });
          var idx = ft ? clamp(ft.stage | 0, 0, pills.length - 1) : -1;
          pills.forEach(function (el, i) { setAttr(el, 'data-s', idx < 0 ? '' : i < idx ? 'done' : i === idx ? 'on' : 'next'); });
          setD(pBusPulse, idx >= 0 ? busD : '');
        } else setD(pBusPulse, '');

        updatePanel(st);
      }

      function stageText(t) {
        var flow = t.flowId && find(flowsList(), function (f) { return f.id === t.flowId; });
        if (flow) {
          var n = flow.stages.length, i = clamp(t.stage | 0, 0, n - 1);
          if (t.status === 'done') return flow.stages[n - 1] + ' → 交付';
          return flow.stages[i] + ' → ' + (i < n - 1 ? flow.stages[i + 1] : '交付');
        }
        if (t.status === 'working') {
          var r = ((wb.getState() || {}).roles || {})[t.roleId];
          if (r && r.status === 'reporting' && r.taskId === t.id) return '汇报中';
        }
        return TASK[t.status] || t.status || '';
      }

      function updatePanel(st) {
        var pick = pickTask(st), t = pick.task;
        if (t) {
          var role = wb.roleById(t.roleId) || {};
          var pct = t.status === 'done' ? 100 : Math.round(clamp(t.progress || 0, 0, 1) * 100);
          setText(pTitle, (t.id ? t.id + ' · ' : '') + (t.title || ''));
          setText(pTag, t.origin === 'boss' ? '老板派' : t.origin === 'live' ? '已接通' : '自动');
          setAttr(pTag, 'data-o', t.origin || 'auto');
          pBar.style.width = pct + '%';
          setText(pLeft, (focus ? '' : (role.name || t.roleId) + ' · ') + stageText(t));
          setText(pPct, pct + '%');
        } else {
          setText(pTitle, focus ? '这个岗位暂时没有任务' : '全员待命 · 暂无进行中的任务');
          setText(pTag, '');
          pBar.style.width = '0%';
          setText(pLeft, focus ? '等待派活' : '等待老板派活');
          setText(pPct, '—');
        }
        if (focus) {
          var sig = pick.list.map(function (x) { return x.id + x.status + Math.round((x.progress || 0) * 10); }).join('|');
          if (sig !== listSig) {
            listSig = sig;
            pList.innerHTML = '';
            pick.list.forEach(function (x) {
              var d = hEl('div', '', pList);
              var mark = x.status === 'done' ? '✓ ' : x.status === 'queued' ? '… ' : '▸ ';
              var tail = x.status === 'working' ? ' · ' + Math.round((x.progress || 0) * 100) + '%' : ' · ' + (TASK[x.status] || x.status || '');
              d.textContent = mark + (x.title || x.id) + tail;
            });
          }
        }
      }

      /* ---------- 事件 / 计时 / 尺寸 ---------- */
      if (isMain) {
        root.addEventListener('click', function (e) {
          var t = e.target;
          while (t && t !== root) {
            if (t.getAttribute && t.getAttribute('data-role')) { wb.open(t.getAttribute('data-role')); return; }
            t = t.parentNode;
          }
        });
      }
      function mark() { dirty = true; }
      var offs = [wb.on('role', mark), wb.on('task', mark), wb.on('pause', mark), wb.on('select', mark)];
      var timer = setInterval(function () {
        if (dead) return;
        if (!sized) { layout(); return; }
        if (dirty) { dirty = false; refresh(); }
      }, 250);

      function scheduleResize() {
        if (rzRaf || dead) return;
        rzRaf = requestAnimationFrame(function () {
          rzRaf = 0;
          var W = host.clientWidth, H = host.clientHeight;
          if (W !== root._w || H !== root._h) { root._w = W; root._h = H; layout(); }
        });
      }
      var ro = null;
      if (typeof window.ResizeObserver === 'function') {
        ro = new window.ResizeObserver(scheduleResize);
        ro.observe(host);
      }

      root._w = host.clientWidth; root._h = host.clientHeight;
      layout();

      return {
        resize: function () { root._w = host.clientWidth; root._h = host.clientHeight; layout(); },
        destroy: function () {
          dead = true;
          clearInterval(timer);
          if (rzRaf) cancelAnimationFrame(rzRaf);
          rzRaf = 0;
          if (floorAnim) { try { floorAnim.cancel(); } catch (e) { /* ignore */ } floorAnim = null; }
          offs.forEach(function (off) { try { off(); } catch (e) { /* ignore */ } });
          offs = [];
          if (ro) { ro.disconnect(); ro = null; }
          if (root.parentNode) root.parentNode.removeChild(root);
          boxes = []; pills = [];
        }
      };
    }
  });
})();
