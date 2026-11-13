/* 零件：信号总线 SIGNAL BUS（id: node-matrix）
 * 左列是输入（老板指令 + 每个顶栏数字的实时值），中间一条彩虹“状态总线”，右边每个 AI 岗位一张卡。
 * 光纤从总线接到每个岗位：岗位干活时光纤变亮、光点流动；老板最新派活的岗位有一条热路径。
 * 只读 Workbench 状态，不造任务、不改数字；画面上的每个数字都来自 wb.getState()。
 * 视觉抽取自自有作品「内容矩阵中枢 · 总览路由图」，已去掉品牌、示例数字和固定节点。 */
(function () {
  'use strict';
  var WB = window.Workbench;
  if (!WB || typeof WB.registerPart !== 'function') return;

  var ID = 'node-matrix';
  var P = ID + '-';
  var MONO = '"SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
  var STATUS = { idle: '待命', moving: '前往工位', working: '干活中', reporting: '汇报中' };
  /* 霓虹色：优先用调色板变量，十六进制只是兜底 */
  var NEON = ['var(--c1, #FF2E88)', 'var(--c2, #FF7A1A)', 'var(--c3, #FFD60A)', 'var(--c4, #7CFF4F)', 'var(--c5, #2BFFC6)',
    'var(--c6, #22D3FF)', 'var(--accent, #4F7CFF)', 'var(--accent2, #A55CFF)', 'var(--boss, #FF4FD8)'];
  var FALL = ['#22D3FF', '#FF2E88', '#7CFF4F', '#FF7A1A', '#A55CFF', '#FFD60A', '#2BFFC6', '#4F7CFF', '#FF4FD8'];
  var BUS = 'var(--accent, #22D3FF)';
  var BOSS = 'var(--boss, #FFE14D)';
  var RAINBOW = ['var(--c1, #22D3FF)', 'var(--c5, #4F7CFF)', 'var(--c2, #FF2E88)', 'var(--c6, #FF7A1A)', 'var(--c4, #FFD60A)', 'var(--c3, #7CFF4F)', 'var(--c1, #22D3FF)'];
  var seq = 0;

  var CSS = [
    '.$-root{position:absolute;inset:0;overflow:hidden;color:var(--text,#e6f1ff);-webkit-user-select:none;user-select:none;',
    'background:radial-gradient(40% 36% at 14% 24%,color-mix(in srgb,var(--accent2,#ff3df2) 7%,transparent),transparent 70%),',
    'radial-gradient(44% 40% at 50% 74%,color-mix(in srgb,var(--accent,#35e0ff) 7%,transparent),transparent 70%),',
    'radial-gradient(40% 40% at 86% 26%,color-mix(in srgb,var(--c5,#8b7bff) 8%,transparent),transparent 70%)}',
    '.$-svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
    '.$-amb{will-change:filter;animation:$-hue 14s linear infinite}',
    '@keyframes $-hue{from{filter:hue-rotate(0deg) saturate(1.2)}to{filter:hue-rotate(360deg) saturate(1.2)}}',
    '.$-fh{fill:none;stroke-width:7;stroke-opacity:.13}',
    '.$-fc{fill:none;stroke-width:1.2;stroke-opacity:.62;transition:stroke-opacity .5s,stroke-width .5s}',
    '.$-ag.$-hit .$-fc{stroke-opacity:1;stroke-width:1.9;transition:none}',
    '.$-pulse{fill:none;stroke:#fff;stroke-opacity:.42;stroke-width:1.5;stroke-linecap:round;stroke-dasharray:24 216;animation:$-pulse 3.2s linear infinite}',
    '@keyframes $-pulse{to{stroke-dashoffset:-480}}',
    '.$-rf .$-fh{stroke-opacity:.05;transition:stroke-opacity .5s}',
    '.$-rf .$-fc{stroke-opacity:.2}',
    '.$-rf[data-s="moving"] .$-fc{stroke-opacity:.5}',
    '.$-rf[data-s="working"] .$-fh{stroke-opacity:.22}',
    '.$-rf[data-s="working"] .$-fc{stroke-opacity:.95;stroke-width:1.6}',
    '.$-rf[data-s="reporting"] .$-fh{stroke-opacity:.14}',
    '.$-rf[data-s="reporting"] .$-fc{stroke-opacity:.7}',
    '.$-p{fill:none;stroke-linecap:round;display:none}',
    '.$-rf[data-s="working"] .$-pa,.$-rf[data-s="working"] .$-pb,.$-rf[data-s="moving"] .$-pa,.$-rf[data-s="reporting"] .$-pr{display:inline}',
    '.$-ph{stroke-width:8;stroke-opacity:.32}',
    '.$-pc{stroke-width:2.6}',
    '.$-pa{stroke-dasharray:.1 59.9;animation:$-la 3s linear infinite}',
    '.$-pb{stroke-dasharray:.1 47.9;animation:$-lb 2.2s linear infinite}',
    '.$-pr{stroke-dasharray:.1 43.9;animation:$-lr 2.4s linear infinite}',
    '@keyframes $-la{to{stroke-dashoffset:-240}}',
    '@keyframes $-lb{to{stroke-dashoffset:-192}}',
    '@keyframes $-lr{to{stroke-dashoffset:176}}',
    '.$-spk{animation:$-spk 2.4s ease-in-out infinite}',
    '@keyframes $-spk{0%,100%{opacity:.05}50%{opacity:1}}',
    '.$-glint{transform-box:fill-box;transform-origin:center;animation:$-glint 3s ease-in-out infinite}',
    '@keyframes $-glint{0%,100%{opacity:0;transform:scale(.2) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(45deg)}}',
    '.$-port{filter:drop-shadow(0 0 4px rgba(255,255,255,.5))}',
    '.$-comet{transform-box:view-box}',
    '.$-c1{animation:$-cd 2.6s cubic-bezier(.45,0,.55,1) infinite}',
    '.$-c2{animation:$-cu 3.4s cubic-bezier(.45,0,.55,1) infinite;animation-delay:-1.3s;opacity:.75}',
    '@keyframes $-cd{from{transform:translateY(-20px);opacity:0}12%{opacity:1}88%{opacity:1}to{transform:translateY(var(--bl,400px));opacity:0}}',
    '@keyframes $-cu{from{transform:translateY(var(--bl,400px));opacity:0}12%{opacity:.9}88%{opacity:.9}to{transform:translateY(-20px);opacity:0}}',
    '.$-hotg path{fill:none;stroke-linecap:round}',
    '.$-hg{stroke:' + BOSS + ';filter:drop-shadow(0 0 3px ' + BOSS + ')}',
    '.$-hf{stroke:#fff;stroke-width:2.6;stroke-dasharray:3 47;animation:$-hf 1.1s linear infinite}',
    '@keyframes $-hf{to{stroke-dashoffset:-100}}',
    '.$-busname{position:absolute;writing-mode:vertical-rl;font:11px/1 ' + MONO + ';letter-spacing:.14em;color:var(--muted,#7d8aa5);pointer-events:none;white-space:nowrap}',
    '.$-sum{position:absolute;right:12px;top:8px;display:flex;gap:10px;font-size:11.5px;color:var(--muted,#7d8aa5);white-space:nowrap;pointer-events:none}',
    '.$-sum b{font-family:' + MONO + ';font-weight:700;margin-left:3px;color:var(--text,#e6f1ff)}',
    '.$-sum .w b{color:var(--ok,#3dffa8)}.$-sum .r b{color:' + BOSS + '}.$-sum .q b{color:var(--warn,#ffb03d)}',
    '.$-empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--muted,#7d8aa5);font-size:13px;text-align:center;padding:20px}',
    /* 卡片 */
    '.$-card{position:absolute;display:flex;flex-direction:column;box-sizing:border-box;background:color-mix(in srgb,var(--panel-solid,#0c1220) 94%,transparent);',
    'border:1px solid var(--line-strong,rgba(120,200,255,.32));border-radius:6px;overflow:hidden;font-size:11px;line-height:1.3;',
    'box-shadow:0 8px 22px rgba(0,0,0,.38);transition:border-color .35s,box-shadow .35s}',
    '.$-h{position:relative;flex:none;height:24px;display:flex;align-items:center;gap:6px;padding:0 8px;color:#fff;font-size:12px;font-weight:700;white-space:nowrap;',
    'background:color-mix(in srgb,var(--rc) 42%,var(--panel-solid,#0c1220))}',
    '.$-h::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,0) 80%)}',
    '.$-mk{flex:none;width:16px;height:16px;border-radius:4px;display:grid;place-items:center;background:var(--rc);color:var(--bg,#05070d);font-size:11px;font-weight:800}',
    '.$-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.$-sub{flex:none;font-weight:500;font-size:11px;opacity:.92}',
    '.$-hv{display:none;flex:none;font-family:' + MONO + ';font-weight:700;color:var(--rc)}',
    '.$-badge{display:none;flex:none;padding:0 5px;border-radius:3px;background:' + BOSS + ';color:var(--bg,#05070d);font-size:11px;font-weight:800;line-height:16px}',
    '.$-hot .$-badge{display:inline-block}',
    '.$-line{position:absolute;left:0;bottom:0;height:2px;width:0;background:var(--rc);box-shadow:0 0 6px var(--rc);transition:width .6s;display:none}',
    '.$-task,.$-last{flex:none;padding:5px 8px 0;font-size:11px;color:var(--muted,#7d8aa5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-last b{color:' + BOSS + ';font-weight:600}',
    '.$-rows{display:flex;flex-direction:column;gap:3px;padding:5px 8px}',
    '.$-row{display:flex;align-items:center;gap:6px;height:16px;font-family:' + MONO + '}',
    '.$-k{flex:none;width:36px;color:var(--muted,#7d8aa5);white-space:nowrap;overflow:hidden;font-family:inherit}',
    '.$-bar{flex:1;min-width:16px;height:7px;background:rgba(255,255,255,.07);border-radius:1px;overflow:hidden}',
    '.$-bar i{display:block;height:100%;width:0;background:var(--rc);box-shadow:0 0 8px var(--rc);transition:width .6s}',
    '.$-v{flex:none;min-width:30px;text-align:right;white-space:nowrap}',
    '.$-chg{animation:$-chg 1.1s ease-out}',
    '@keyframes $-chg{from{color:' + BOSS + ';text-shadow:0 0 8px ' + BOSS + '}}',
    '.$-kv{flex:none;display:flex;align-items:baseline;gap:5px;padding:5px 8px 0;font-family:' + MONO + ';white-space:nowrap;overflow:hidden}',
    '.$-big{font-size:18px;font-weight:700;color:var(--rc);text-shadow:0 0 12px color-mix(in srgb,var(--rc) 45%,transparent);font-variant-numeric:tabular-nums}',
    '.$-kv small{font-size:11px;color:var(--muted,#7d8aa5)}',
    '.$-d{margin-left:auto;font-style:normal;font-size:11px;color:var(--muted,#7d8aa5)}.$-d.up{color:var(--ok,#3dffa8)}.$-d.dn{color:var(--bad,#ff4d6d)}',
    '.$-spark{display:block;flex:none;margin:3px 8px 0;width:calc(100% - 16px);height:18px;overflow:visible}',
    '.$-spark path{fill:none;stroke:var(--rc);stroke-width:1.5;stroke-linejoin:round;filter:drop-shadow(0 0 3px var(--rc))}',
    /* 尺寸档位：full / norm / comp / mini */
    '.$-card[data-l="norm"] .$-task,.$-card[data-l="norm"] .$-last,.$-card[data-l="norm"] .$-spark{display:none}',
    '.$-card[data-l="comp"] .$-task,.$-card[data-l="comp"] .$-last,.$-card[data-l="comp"] .$-spark,.$-card[data-l="comp"] .$-row+.$-row{display:none}',
    '.$-card[data-l="mini"] .$-task,.$-card[data-l="mini"] .$-last,.$-card[data-l="mini"] .$-rows,.$-card[data-l="mini"] .$-kv,.$-card[data-l="mini"] .$-spark{display:none}',
    '.$-card[data-l="mini"] .$-h{height:100%}',
    '.$-card[data-l="mini"] .$-line{display:block}',
    '.$-in[data-l="mini"] .$-hv{display:inline}.$-in[data-l="mini"] .$-sub{display:none}',
    '.$-role[data-l="mini"] .$-sub{font-size:11px}',
    /* 岗位状态 */
    '.$-role{cursor:pointer}',
    '.$-role:hover{border-color:var(--rc)}',
    '.$-role:focus-visible{outline:2px solid var(--rc);outline-offset:2px}',
    '.$-role[data-s="moving"]{border-color:color-mix(in srgb,var(--rc) 60%,transparent)}',
    '.$-role[data-s="working"]{border-color:var(--rc);animation:$-glow 1.6s ease-in-out infinite;box-shadow:0 0 0 1px var(--rc),0 0 24px color-mix(in srgb,var(--rc) 38%,transparent)}',
    '.$-role[data-s="working"] .$-sub{animation:$-blink 1s steps(2) infinite}',
    '.$-role[data-s="reporting"]{border-color:' + BOSS + ';box-shadow:0 0 0 1px ' + BOSS + ',0 0 22px color-mix(in srgb,' + BOSS + ' 35%,transparent)}',
    '.$-role[data-s="reporting"] .$-sub{color:' + BOSS + '}',
    '@keyframes $-glow{0%,100%{box-shadow:0 0 0 1px var(--rc),0 0 18px color-mix(in srgb,var(--rc) 30%,transparent)}50%{box-shadow:0 0 0 1px var(--rc),0 0 38px color-mix(in srgb,var(--rc) 60%,transparent)}}',
    '@keyframes $-blink{50%{opacity:.35}}',
    '.$-in.$-hit{border-color:var(--rc);box-shadow:0 0 0 1px var(--rc),0 0 22px color-mix(in srgb,var(--rc) 40%,transparent)}',
    /* 岗位模式：放大的岗位卡 + 任务行 */
    '.$-bigc .$-h{height:34px;font-size:14px;gap:8px}',
    '.$-bigc .$-mk{width:24px;height:24px;font-size:13px;border-radius:6px}',
    '.$-bigc .$-sub{font-size:12px}',
    '.$-bb{display:flex;flex-direction:column;gap:6px;padding:8px 10px;min-height:0}',
    '.$-bt{font-size:12px;color:var(--muted,#7d8aa5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-bp{display:flex;align-items:center;gap:10px}',
    '.$-pct{flex:none;min-width:58px;font:700 26px/1 ' + MONO + ';color:var(--rc);text-shadow:0 0 14px color-mix(in srgb,var(--rc) 50%,transparent)}',
    '.$-bp .$-bar{height:10px;border-radius:3px}',
    '.$-bigc .$-task{padding:0;font-size:12px;color:var(--text,#e6f1ff)}',
    '.$-bigc .$-rows{padding:0;gap:4px}',
    '.$-bigc .$-k{width:64px}',
    '.$-bigc[data-l="bigs"] .$-bt,.$-bigc[data-l="bigs"] .$-rows{display:none}',
    '.$-slot{position:absolute;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 10px 2px;border-radius:6px;font-size:12px;',
    'border:1px solid var(--line-strong,rgba(120,200,255,.32));background:color-mix(in srgb,var(--panel-solid,#0c1220) 92%,transparent);overflow:hidden;transition:border-color .35s,box-shadow .35s,opacity .35s}',
    '.$-slot[data-s="empty"]{border-style:dashed;border-color:var(--line,rgba(120,200,255,.14));background:transparent;opacity:.6}',
    '.$-slot[data-s="empty"]>*{visibility:hidden}',
    '.$-slot[data-s="working"]{border-color:var(--rc);box-shadow:0 0 16px color-mix(in srgb,var(--rc) 30%,transparent)}',
    '.$-slot[data-s="reporting"]{border-color:' + BOSS + '}',
    '.$-slot[data-s="done"]{opacity:.78}',
    '.$-chip{flex:none;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;color:var(--muted,#7d8aa5);background:rgba(255,255,255,.06);white-space:nowrap}',
    '.$-slot[data-s="working"] .$-chip{color:var(--rc);background:color-mix(in srgb,var(--rc) 16%,transparent)}',
    '.$-slot[data-s="reporting"] .$-chip{color:' + BOSS + ';background:color-mix(in srgb,' + BOSS + ' 16%,transparent)}',
    '.$-slot[data-s="done"] .$-chip{color:var(--ok,#3dffa8);background:color-mix(in srgb,var(--ok,#3dffa8) 13%,transparent)}',
    '.$-slot[data-s="queued"] .$-chip{color:var(--warn,#ffb03d)}',
    '.$-st{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-org{flex:none;font-size:11px;color:var(--muted,#7d8aa5);white-space:nowrap}',
    '.$-org.boss{color:' + BOSS + ';font-weight:700}',
    '.$-sv{flex:none;min-width:34px;text-align:right;font-family:' + MONO + ';font-size:11px;color:var(--text,#e6f1ff)}',
    '.$-slot[data-s="done"] .$-sv{color:var(--ok,#3dffa8)}',
    '.$-sbar{position:absolute;left:10px;right:10px;bottom:3px;height:2px;border-radius:2px;overflow:hidden;background:rgba(255,255,255,.05)}',
    '.$-sbar i{display:block;height:100%;width:0;background:var(--rc);box-shadow:0 0 6px var(--rc);transition:width .6s}',
    '.$-slot[data-s="done"] .$-sbar{display:none}',
    /* 不要动效 */
    '.$-still *,.$-still{animation:none!important}',
    '.$-still .$-p{display:none!important}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('part-' + ID + '-css')) return;
    var s = document.createElement('style');
    s.id = 'part-' + ID + '-css';
    s.textContent = CSS.replace(/\$-/g, P);
    document.head.appendChild(s);
  }

  /* ---------- 小工具 ---------- */
  function T(s) { return s.replace(/\$-/g, P); }
  function tpl(s, v) { return T(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : ''; }); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 和外壳顶栏同一套数字格式 */
  function fmtKpi(k, v) {
    var n = Number(v) || 0, d = k.decimals, s;
    if (k.format === 'pct') s = (n * 100).toFixed(d != null ? d : 1) + '%';
    else if (k.format === 'money' || Math.abs(n) >= 10000) {
      s = Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e4 ? (n / 1e3).toFixed(1) + 'k'
        : n.toLocaleString('en-US', { maximumFractionDigits: d != null ? d : 0 });
    } else s = n.toLocaleString('en-US', { maximumFractionDigits: d != null ? d : 2 });
    return (k.prefix || '') + s;
  }
  function q(el, name) { return el ? el.querySelector('.' + P + name) : null; }
  function setT(el, v) { if (el && el.textContent !== v) el.textContent = v; }
  function setA(el, k, v) { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); }
  function setW(el, r) {
    if (!el) return;
    var w = (clamp(r || 0, 0, 1) * 100).toFixed(1) + '%';
    if (el.style.width !== w) el.style.width = w;
  }
  function cubic(s) {
    return 'M' + f1(s.x1) + ' ' + f1(s.y1) + 'C' + f1(s.c1x) + ' ' + f1(s.c1y) + ' ' + f1(s.c2x) + ' ' + f1(s.c2y) + ' ' + f1(s.x2) + ' ' + f1(s.y2);
  }
  function bez(s, t) {
    var u = 1 - t;
    return [u * u * u * s.x1 + 3 * u * u * t * s.c1x + 3 * u * t * t * s.c2x + t * t * t * s.x2,
      u * u * u * s.y1 + 3 * u * u * t * s.c1y + 3 * u * t * t * s.c2y + t * t * t * s.y2];
  }
  function stops(list) {
    return list.map(function (c, i) {
      return '<stop offset="' + (list.length === 1 ? 0 : (i / (list.length - 1)).toFixed(3)) + '" style="stop-color:' + c + '"/>';
    }).join('');
  }
  function portsOf(c) {
    var n = c.h >= 70 ? 3 : 2, out = [];
    for (var j = 0; j < n; j++) out.push(c.y + c.h * (0.3 + j * (0.45 / (n - 1))));
    return out;
  }
  function dotAt(x, y) { return 'M' + f1(x - 3) + ' ' + f1(y) + 'a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'; }

  WB.registerPart(ID, {
    meta: { label: 'SIGNAL BUS', modes: ['main', 'role'] },
    mount: function (host, wb, opts) {
      injectCss();
      opts = opts || {};
      var company = wb.company || {};
      var allRoles = (company.roles || []).slice(0, 14);
      var kpis = (company.kpis || []).slice(0, 6);
      var mode = opts.mode === 'role' && opts.roleId && wb.roleById(opts.roleId) ? 'role' : 'main';
      var focusId = mode === 'role' ? opts.roleId : null;
      var roles = mode === 'role' ? allRoles.filter(function (r) { return r.id === focusId; }) : allRoles;
      if (mode === 'role' && !roles.length) roles = [wb.roleById(focusId)];
      var reduced = !!wb.reducedMotion;
      var uid = P + (++seq);
      var destroyed = false;

      var root = document.createElement('div');
      root.className = P + 'root' + (reduced ? ' ' + P + 'still' : '');
      host.appendChild(root);

      var colorOf = {};
      allRoles.forEach(function (r, i) { colorOf[r.id] = wb.roleColor(r.id) || FALL[i % FALL.length]; });
      function rc(id) { return colorOf[id] || FALL[0]; }
      function kpiColor(k) {
        var i = (company.kpis || []).indexOf(k);
        return k.color || 'var(--c' + ((Math.max(0, i) % 6) + 1) + ', ' + FALL[Math.max(0, i) % FALL.length] + ')';
      }
      /* 岗位模式左列：老板指令 + 和这个岗位相关的数字（配置里写明每完成一个任务会加的） */
      var inKpis = mode === 'role' ? kpis.filter(function (k) {
        var s = k.sim || {};
        return s.perTask && (!s.roles || s.roles.indexOf(focusId) !== -1);
      }).slice(0, 3) : kpis;

      /* 运行中积累的记录（只来自状态） */
      var bossSeen = {}, bossDone = {}, hist = {}, cu = {}, cuRaf = 0;
      var V = null, W0 = 0, H0 = 0, pending = 0, ro = null, roRaf = 0;
      var flashT = {}, offs = [];

      /* ---------- 布局 ---------- */
      function gridFor(n, aw, ah) {
        var best = null;
        for (var c = 1; c <= Math.min(n, 5); c++) {
          var r = Math.ceil(n / c);
          var gx = clamp(aw * 0.06, 18, 90), gy = clamp(ah * 0.035, 6, 22);
          var cw = (aw - (c - 1) * gx) / c, ch = (ah - (r - 1) * gy) / r;
          if (cw < 112 && c > 1) continue;
          var s = Math.min(cw / 230, ch / 112);
          if (!best || s > best.s + 0.02) best = { c: c, r: r, cw: cw, ch: ch, s: s };
        }
        return best;
      }
      function lvlRole(h) { return h >= 108 ? 'full' : h >= 88 ? 'norm' : h >= 50 ? 'comp' : 'mini'; }
      function lvlBoss(h) { return h >= 106 ? 'full' : h >= 88 ? 'norm' : h >= 54 ? 'comp' : 'mini'; }
      function lvlKpi(h) { return h >= 80 ? 'full' : h >= 56 ? 'norm' : 'mini'; }

      function layout(w, h) {
        var pad = 12, top = mode === 'main' ? (h < 320 ? 30 : 36) : 12, bot = 12;
        var narrow = w < 760;
        var inW = mode === 'role' ? (narrow ? clamp(w * 0.22, 108, 160) : clamp(w * 0.2, 120, 200))
          : (narrow ? clamp(w * 0.2, 104, 150) : clamp(w * 0.16, 130, 230));
        var busX = pad + inW + (mode === 'role' ? clamp(w * 0.06, 28, 80) : clamp(w * 0.07, 30, 110));
        var x0 = busX + (mode === 'role' ? clamp(w * 0.07, 34, 120) : clamp(w * 0.09, 34, 200));
        var x1 = w - pad, aw = Math.max(80, x1 - x0), ah = Math.max(40, h - top - bot);
        var L = { w: w, h: h, top: top, bot: h - bot, busX: busX, busTop: top - 4, busBot: h - bot + 4, inputs: [], roles: [], slots: [], big: null };

        var ins = [{ kind: 'boss', color: BOSS }].concat(inKpis.map(function (k) { return { kind: 'kpi', k: k, color: kpiColor(k) }; }));
        var n = ins.length;
        var ih = Math.min(mode === 'role' ? 104 : 110, (ah - (n - 1) * 6) / n);
        var islot = mode === 'role' ? Math.min(ah / n, ih + 18) : ah / n;
        ins.forEach(function (c, i) {
          c.x = pad; c.w = inW; c.h = ih;
          c.y = top + (i + 0.5) * islot - ih / 2;
          c.l = c.kind === 'boss' ? lvlBoss(ih) : lvlKpi(ih);
          L.inputs.push(c);
        });

        if (mode === 'main') {
          var g = roles.length ? gridFor(roles.length, aw, ah) : null;
          if (g) {
            var cols = Math.ceil(roles.length / g.r);
            var cwid = Math.min(g.cw, 280), chei = Math.min(g.ch, 150);
            roles.forEach(function (r, i) {
              var col = Math.floor(i / g.r), row = i % g.r;
              var inCol = Math.min(g.r, roles.length - col * g.r);
              var cx = x0 + (col + 0.5) * aw / cols;
              var sl = ah / inCol;
              L.roles.push({ id: r.id, r: r, col: col, x: cx - cwid / 2, y: top + (row + 0.5) * sl - chei / 2, w: cwid, h: chei, l: lvlRole(chei), color: rc(r.id) });
            });
            L.cols = cols;
          }
        } else {
          var r0 = roles[0];
          var bh = h < 420 ? clamp(h * 0.36, 96, 150) : clamp(h * 0.3, 120, 210);
          var bw = Math.min(aw, 640);
          L.big = { id: r0.id, r: r0, x: x0, y: top, w: bw, h: bh, l: bh >= 150 ? 'big' : 'bigs', color: rc(r0.id) };
          L.roles.push(L.big);
          var rowH = h < 520 ? 34 : 42, gap = 6, y0 = top + bh + clamp(h * 0.04, 12, 28);
          var cnt = clamp(Math.floor((L.bot - y0 + gap) / (rowH + gap)), 0, 12);
          for (var s = 0; s < cnt; s++) L.slots.push({ i: s, x: x0 + 14, y: y0 + s * (rowH + gap), w: Math.max(60, aw - 14), h: rowH, color: rc(r0.id) });
        }
        return L;
      }

      /* ---------- 光纤（固定种子，尺寸变了才重算） ---------- */
      function fibers(L) {
        var R = rng(11 + roles.length * 7 + inKpis.length);
        var sy = clamp(L.h / 700, 0.45, 1.4);
        var y0 = L.busTop + 10, y1 = L.busBot - 10;
        var amb = [], all = [], groups = {}, roleSegs = {};
        function curve(x1, yA, x2, yB) {
          var dx = Math.max(30, (x2 - x1) * (0.35 + R() * 0.3));
          var s = { x1: x1, y1: yA, c1x: x1 + dx, c1y: yA + (R() - 0.5) * 60 * sy, c2x: x2 - dx, c2y: yB + (R() - 0.5) * 60 * sy, x2: x2, y2: yB };
          s.d = cubic(s) + ' ';
          all.push(s);
          return s;
        }
        function busY() { return y0 + R() * Math.max(1, y1 - y0); }
        function grp(key, from, hue, to, x1, x2, cls, attr) {
          var g = groups[key] || (groups[key] = { key: key, from: from, hue: hue, to: to, x1: x1, x2: x2, d: '', cls: cls, attr: attr });
          g.x1 = Math.min(g.x1, x1); g.x2 = Math.max(g.x2, x2);
          return g;
        }
        /* 输入 → 总线 */
        var perIn = clamp(Math.round(54 / Math.max(1, L.inputs.length * 3)), 1, 3);
        L.inputs.forEach(function (c, ci) {
          var hues = [Math.floor(R() * NEON.length), Math.floor(R() * NEON.length)];
          c.ports = portsOf(c);
          c.ports.forEach(function (py) {
            for (var i = 0; i < perIn; i++) {
              var hi = hues[i % 2];
              var s = curve(c.x + c.w, py, L.busX, busY());
              grp('in' + ci + '-' + hi, c.color, NEON[hi], BUS, s.x1, s.x2, 'ag', 'data-in="' + ci + '"').d += s.d;
              amb.push(s);
            }
          });
        });
        /* 总线 → 岗位卡 / 任务行 */
        var targets = L.roles.concat(L.slots.map(function (s) { return { id: 'slot' + s.i, x: s.x, y: s.y, w: s.w, h: s.h, color: s.color, slot: true }; }));
        var portTotal = 0;
        targets.forEach(function (c) { c.ports = c.slot ? [c.y + c.h / 2] : (c === L.big ? [0.22, 0.38, 0.54, 0.7, 0.86].map(function (k) { return c.y + c.h * k; }) : portsOf(c)); portTotal += c.ports.length; });
        var perPort = clamp(Math.round(150 / Math.max(1, portTotal)), 1, 4);
        targets.forEach(function (c) {
          var hues = [Math.floor(R() * NEON.length), Math.floor(R() * NEON.length)];
          var list = roleSegs[c.id] = { c: c, d: '', groups: [] };
          c.ports.forEach(function (py) {
            var k = c.slot ? 2 : perPort;
            for (var i = 0; i < k; i++) {
              var s = curve(L.busX, busY(), c.x, py);
              list.d += s.d;
              var hi = hues[i % 2], key = 'r' + c.id + '-' + hi;
              var g = groups[key];
              if (!g) { g = grp(key, BUS, NEON[hi], c.color, s.x1, s.x2, 'rg', ''); g.role = c.id; list.groups.push(g); }
              g.d += s.d;
            }
          });
        });
        /* 岗位列与列之间的协作线（装饰） */
        if (mode === 'main' && L.cols > 1) {
          for (var col = 0; col < L.cols - 1; col++) {
            var A = L.roles.filter(function (c) { return c.col === col; });
            var B = L.roles.filter(function (c) { return c.col === col + 1; });
            if (!B.length) continue;
            A.forEach(function (a, ai) {
              var h1 = Math.floor(R() * NEON.length), h2 = Math.floor(R() * NEON.length);
              a.outPorts = portsOf(a);
              a.outPorts.forEach(function (py) {
                var t = B[Math.floor(R() * B.length)];
                var tp = portsOf(t);
                var s = curve(a.x + a.w, py, t.x, tp[Math.floor(R() * tp.length)]);
                grp('x' + col + '-' + ai, a.color, NEON[h1], NEON[h2], s.x1, s.x2, 'ag', '').d += s.d;
                amb.push(s);
              });
            });
          }
        }
        /* 白色光脉冲 + 星点 */
        var pulse = '';
        amb.forEach(function (s) { if (R() < 0.35) pulse += s.d; });
        var spk = '';
        if (all.length) {
          var nS = clamp(Math.round(L.w * L.h / 5200), 30, 170), nG = Math.round(nS / 7);
          for (var i = 0; i < nS; i++) {
            var s1 = all[Math.floor(R() * all.length)], p1 = bez(s1, 0.06 + R() * 0.88);
            var c1 = R() < 0.3 ? '#FFFFFF' : NEON[Math.floor(R() * NEON.length)];
            spk += '<circle class="' + P + 'spk" cx="' + f1(p1[0]) + '" cy="' + f1(p1[1]) + '" r="' + (0.8 + R() * 1.4).toFixed(2) +
              '" style="fill:' + c1 + ';animation-duration:' + (1.2 + R() * 2.4).toFixed(2) + 's;animation-delay:-' + (R() * 4).toFixed(2) + 's"/>';
          }
          for (var j = 0; j < nG; j++) {
            var s2 = all[Math.floor(R() * all.length)], p2 = bez(s2, 0.1 + R() * 0.8);
            var k2 = 3 + R() * 4, w2 = k2 * 0.22, x = p2[0], y = p2[1];
            var c2 = R() < 0.4 ? '#FFFFFF' : NEON[Math.floor(R() * NEON.length)];
            spk += '<path class="' + P + 'glint" d="M' + f1(x) + ' ' + f1(y - k2) + 'L' + f1(x + w2) + ' ' + f1(y - w2) + 'L' + f1(x + k2) + ' ' + f1(y) + 'L' + f1(x + w2) + ' ' + f1(y + w2) +
              'L' + f1(x) + ' ' + f1(y + k2) + 'L' + f1(x - w2) + ' ' + f1(y + w2) + 'L' + f1(x - k2) + ' ' + f1(y) + 'L' + f1(x - w2) + ' ' + f1(y - w2) + 'Z" style="fill:' + c2 +
              ';animation-duration:' + (1.8 + R() * 2.6).toFixed(2) + 's;animation-delay:-' + (R() * 4).toFixed(2) + 's"/>';
          }
        }
        return { groups: groups, roleSegs: roleSegs, pulse: pulse, spk: spk, targets: targets };
      }

      /* ---------- 画出来 ---------- */
      function cardHTML(c) {
        if (c.kind === 'boss') {
          return tpl('<div class="$-card $-in $-boss" data-l="{l}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--rc:{rc}">' +
            '<div class="$-h"><span class="$-t">老板指令</span><span class="$-sub">{sub}</span><b class="$-hv"></b></div>' +
            '<div class="$-last"></div>' +
            '<div class="$-rows">' +
              '<div class="$-row"><span class="$-k">进行中</span><span class="$-bar"><i></i></span><span class="$-v" data-v="a"></span></div>' +
              '<div class="$-row"><span class="$-k">已完成</span><span class="$-bar"><i></i></span><span class="$-v" data-v="d"></span></div>' +
              '<div class="$-row"><span class="$-k">已派活</span><span class="$-bar"><i></i></span><span class="$-v" data-v="n"></span></div>' +
            '</div><i class="$-line"></i></div>',
          { l: c.l, x: f1(c.x), y: f1(c.y), w: f1(c.w), h: f1(c.h), rc: BOSS, sub: mode === 'role' ? '派给本岗' : 'BOSS' });
        }
        return tpl('<div class="$-card $-in $-kpi" data-l="{l}" data-k="{key}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--rc:{rc}">' +
          '<div class="$-h"><span class="$-t" title="{label}">{label}</span><span class="$-sub"></span><b class="$-hv"></b></div>' +
          '<div class="$-kv"><b class="$-big"></b><small>{unit}</small><em class="$-d"></em></div>' +
          '<svg class="$-spark" preserveAspectRatio="none"><path/></svg><i class="$-line"></i></div>',
        { l: c.l, key: esc(c.k.key), x: f1(c.x), y: f1(c.y), w: f1(c.w), h: f1(c.h), rc: c.color, label: esc(c.k.label || c.k.key), unit: esc(c.k.unit || '') });
      }
      function roleHTML(c) {
        var r = c.r, mk = esc(r.mark || String(r.name || '?').slice(0, 1));
        if (c === V.L.big) {
          return tpl('<div class="$-card $-role $-bigc" data-id="{id}" data-l="{l}" data-s="idle" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--rc:{rc}">' +
            '<div class="$-h"><span class="$-mk">{mk}</span><span class="$-t">{name}</span><span class="$-badge">老板派</span><span class="$-sub"></span></div>' +
            '<div class="$-bb"><div class="$-bt" title="{title}">{title}</div>' +
              '<div class="$-bp"><b class="$-pct">0%</b><span class="$-bar"><i></i></span></div>' +
              '<div class="$-task"></div>' +
              '<div class="$-rows">' +
                '<div class="$-row"><span class="$-k">已完成</span><span class="$-bar"><i></i></span><span class="$-v" data-v="d"></span></div>' +
                '<div class="$-row"><span class="$-k">排队</span><span class="$-bar"><i></i></span><span class="$-v" data-v="q"></span></div>' +
                '<div class="$-row"><span class="$-k">老板派活</span><span class="$-bar"><i></i></span><span class="$-v" data-v="b"></span></div>' +
              '</div></div></div>',
          { id: esc(c.id), l: c.l, x: f1(c.x), y: f1(c.y), w: f1(c.w), h: f1(c.h), rc: c.color, mk: mk, name: esc(r.name || c.id), title: esc(r.title || '') });
        }
        return tpl('<div class="$-card $-role" role="button" tabindex="0" data-id="{id}" data-l="{l}" data-s="idle" title="{tip}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--rc:{rc}">' +
          '<div class="$-h"><span class="$-mk">{mk}</span><span class="$-t">{name}</span><span class="$-badge">老板派</span><span class="$-sub"></span></div>' +
          '<div class="$-task"></div>' +
          '<div class="$-rows">' +
            '<div class="$-row"><span class="$-k">进度</span><span class="$-bar"><i></i></span><span class="$-v" data-v="p"></span></div>' +
            '<div class="$-row"><span class="$-k">完成</span><span class="$-bar"><i></i></span><span class="$-v" data-v="d"></span></div>' +
            '<div class="$-row"><span class="$-k">排队</span><span class="$-bar"><i></i></span><span class="$-v" data-v="q"></span></div>' +
          '</div><i class="$-line"></i></div>',
        { id: esc(c.id), l: c.l, x: f1(c.x), y: f1(c.y), w: f1(c.w), h: f1(c.h), rc: c.color, mk: mk, name: esc(r.name || c.id),
          tip: esc((r.name || '') + (r.title ? ' · ' + r.title : '') + ' — 点击查看岗位') });
      }
      function slotHTML(s) {
        return tpl('<div class="$-slot" data-i="{i}" data-s="empty" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--rc:{rc}">' +
          '<span class="$-chip"></span><span class="$-st"></span><span class="$-org"></span><span class="$-sv"></span><span class="$-sbar"><i></i></span></div>',
        { i: s.i, x: f1(s.x), y: f1(s.y), w: f1(s.w), h: f1(s.h), rc: s.color });
      }

      function render(L) {
        var F = fibers(L), id = function (s) { return uid + '-' + s; };
        var defsA = '', bodyA = '', defsR = '', bodyR = '', gi = 0;
        Object.keys(F.groups).forEach(function (k) {
          var g = F.groups[k];
          if (!g.d) return;
          var gid = id('g' + (gi++));
          var grad = '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + f1(g.x1) + '" y1="0" x2="' + f1(Math.max(g.x2, g.x1 + 1)) + '" y2="0">' + stops([g.from, g.hue, g.to]) + '</linearGradient>';
          var paths = '<path class="' + P + 'fh" d="' + g.d + '" stroke="url(#' + gid + ')"/><path class="' + P + 'fc" d="' + g.d + '" stroke="url(#' + gid + ')"/>';
          if (g.cls === 'ag') { defsA += grad; bodyA += '<g class="' + P + 'ag" ' + g.attr + '>' + paths + '</g>'; }
          else { defsR += grad; g.html = paths; }
        });
        Object.keys(F.roleSegs).forEach(function (rid) {
          var rs = F.roleSegs[rid], col = rs.c.color;
          bodyR += '<g class="' + P + 'rf" data-r="' + esc(rid) + '" data-s="idle">' + rs.groups.map(function (g) { return g.html || ''; }).join('') +
            '<path class="' + P + 'p ' + P + 'pa ' + P + 'ph" d="' + rs.d + '" style="stroke:' + col + '"/>' +
            '<path class="' + P + 'p ' + P + 'pa ' + P + 'pc" d="' + rs.d + '" style="stroke:#fff"/>' +
            '<path class="' + P + 'p ' + P + 'pb ' + P + 'ph" d="' + rs.d + '" style="stroke:' + col + '"/>' +
            '<path class="' + P + 'p ' + P + 'pb ' + P + 'pc" d="' + rs.d + '" style="stroke:' + col + '"/>' +
            '<path class="' + P + 'p ' + P + 'pr ' + P + 'ph" d="' + rs.d + '" style="stroke:' + BOSS + '"/>' +
            '<path class="' + P + 'p ' + P + 'pr ' + P + 'pc" d="' + rs.d + '" style="stroke:' + BOSS + '"/></g>';
        });
        var bx = f1(L.busX), bt = L.busTop, bb = L.busBot, blen = bb - bt, cl = Math.min(130, blen * 0.25);
        var tick = '';
        for (var y = bt + 4; y <= bb - 4; y += 16) tick += 'M' + f1(L.busX - 7) + ' ' + f1(y) + 'L' + f1(L.busX + 7) + ' ' + f1(y);
        var ports = '';
        L.inputs.forEach(function (c) { var d = ''; c.ports.forEach(function (py) { d += dotAt(c.x + c.w, py); }); ports += '<path class="' + P + 'port" d="' + d + '" style="fill:' + c.color + '"/>'; });
        F.targets.forEach(function (c) {
          var d = '';
          c.ports.forEach(function (py) { d += dotAt(c.x, py); });
          (c.outPorts || []).forEach(function (py) { d += dotAt(c.x + c.w, py); });
          ports += '<path class="' + P + 'port" d="' + d + '" style="fill:' + c.color + '"/>';
        });
        var flowAnim = reduced ? '' : '<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="0 240" dur="3.2s" repeatCount="indefinite"/>';
        var svgA = '<svg class="' + P + 'svg ' + P + 'amb" width="' + L.w + '" height="' + L.h + '" viewBox="0 0 ' + L.w + ' ' + L.h + '" aria-hidden="true"><defs>' + defsA +
          '<linearGradient id="' + id('bg') + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + bt + '" x2="0" y2="' + bb + '">' + stops(RAINBOW) + '</linearGradient>' +
          '<filter id="' + id('blur') + '" x="-200%" y="-5%" width="500%" height="110%"><feGaussianBlur stdDeviation="7"/></filter></defs>' + bodyA +
          '<line x1="' + bx + '" y1="' + bt + '" x2="' + bx + '" y2="' + bb + '" stroke="url(#' + id('bg') + ')" stroke-width="22" stroke-opacity=".5" stroke-linecap="round" filter="url(#' + id('blur') + ')"/></svg>';
        var svgB = '<svg class="' + P + 'svg ' + P + 'fx" width="' + L.w + '" height="' + L.h + '" viewBox="0 0 ' + L.w + ' ' + L.h + '" aria-hidden="true"><defs>' + defsR +
          '<linearGradient id="' + id('bf') + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="240" spreadMethod="repeat">' + stops(RAINBOW) + flowAnim + '</linearGradient>' +
          '<linearGradient id="' + id('cd') + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + bt + '" x2="0" y2="' + f1(bt + cl) + '"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".75" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
          '<linearGradient id="' + id('cu') + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + bt + '" x2="0" y2="' + f1(bt + cl) + '"><stop offset="0" style="stop-color:' + BOSS + ';stop-opacity:0"/><stop offset=".25" style="stop-color:' + BOSS + ';stop-opacity:.95"/><stop offset="1" style="stop-color:' + BOSS + ';stop-opacity:0"/></linearGradient></defs>' +
          '<g class="' + P + 'rfs">' + bodyR + '</g>' +
          (F.pulse ? '<path class="' + P + 'pulse" d="' + F.pulse + '"/>' : '') +
          '<g>' + F.spk + '</g>' +
          '<path d="' + tick + '" fill="none" stroke="var(--muted, #AFC3D6)" stroke-opacity=".3" stroke-width="1"/>' +
          '<line x1="' + bx + '" y1="' + bt + '" x2="' + bx + '" y2="' + bb + '" stroke="var(--bg, #06080C)" stroke-opacity=".9" stroke-width="11" stroke-linecap="round"/>' +
          '<line x1="' + bx + '" y1="' + bt + '" x2="' + bx + '" y2="' + bb + '" stroke="url(#' + id('bf') + ')" stroke-width="6" stroke-linecap="round"/>' +
          '<line x1="' + bx + '" y1="' + (bt + 2) + '" x2="' + bx + '" y2="' + (bb - 2) + '" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>' +
          (reduced ? '' :
            '<line class="' + P + 'comet ' + P + 'c1" x1="' + bx + '" y1="' + bt + '" x2="' + bx + '" y2="' + f1(bt + cl) + '" stroke="url(#' + id('cd') + ')" stroke-width="4" stroke-linecap="round" style="--bl:' + f1(blen - cl) + 'px"/>' +
            '<line class="' + P + 'comet ' + P + 'c2" x1="' + bx + '" y1="' + bt + '" x2="' + bx + '" y2="' + f1(bt + cl) + '" stroke="url(#' + id('cu') + ')" stroke-width="4" stroke-linecap="round" style="--bl:' + f1(blen - cl) + 'px"/>') +
          '<g class="' + P + 'hotg"></g>' + ports + '</svg>';

        V = { L: L, hotKey: null, inputs: [], roles: [], slots: [] };
        var cards = L.inputs.map(cardHTML).join('') + L.roles.map(roleHTML).join('') + L.slots.map(slotHTML).join('');
        root.innerHTML = svgA + svgB + cards +
          '<div class="' + P + 'busname" style="left:' + f1(L.busX - 24) + 'px;top:' + f1(L.busTop + 6) + 'px">状态总线 · STATE BUS</div>' +
          (mode === 'main' ? '<div class="' + P + 'sum"></div>' : '') +
          (roles.length ? '' : '<div class="' + P + 'empty">还没有配置 AI 岗位（company.roles）</div>');

        V.hot = root.querySelector('.' + P + 'hotg');
        V.sum = q(root, 'sum');
        var agBy = {}, rfBy = {};
        Array.prototype.forEach.call(root.querySelectorAll('.' + P + 'ag[data-in]'), function (el) { (agBy[el.getAttribute('data-in')] = agBy[el.getAttribute('data-in')] || []).push(el); });
        Array.prototype.forEach.call(root.querySelectorAll('.' + P + 'rf'), function (el) { rfBy[el.getAttribute('data-r')] = el; });
        var inEls = root.querySelectorAll('.' + P + 'in'), roleEls = root.querySelectorAll('.' + P + 'role'), slotEls = root.querySelectorAll('.' + P + 'slot');
        L.inputs.forEach(function (c, i) {
          var el = inEls[i];
          V.inputs.push({ c: c, el: el, sub: q(el, 'sub'), hv: q(el, 'hv'), big: q(el, 'big'), d: q(el, 'd'), last: q(el, 'last'), line: q(el, 'line'),
            spark: el.querySelector('svg path'), sparkSvg: el.querySelector('svg'), vals: el.querySelectorAll('.' + P + 'v'), bars: el.querySelectorAll('.' + P + 'bar i'),
            fib: agBy[String(i)] || [] });
        });
        L.roles.forEach(function (c, i) {
          var el = roleEls[i];
          V.roles.push({ c: c, el: el, sub: q(el, 'sub'), task: q(el, 'task'), pct: q(el, 'pct'), line: q(el, 'line'),
            vals: el.querySelectorAll('.' + P + 'v'), bars: el.querySelectorAll('.' + P + 'bar i'), fib: rfBy[c.id] || null });
        });
        L.slots.forEach(function (s, i) {
          var el = slotEls[i];
          V.slots.push({ s: s, el: el, chip: q(el, 'chip'), st: q(el, 'st'), org: q(el, 'org'), sv: q(el, 'sv'), bar: el.querySelector('.' + P + 'sbar i'),
            fib: rfBy['slot' + s.i] || null });
        });
      }

      /* ---------- 热路径：老板指令 → 总线 → 最近收到老板任务的岗位 ---------- */
      function hotPath(target) {
        var b = V.L.inputs[0], L = V.L;
        if (!b || !target) return '';
        var x1 = b.x + b.w, y1 = b.y + b.h / 2, xb = L.busX, x2 = target.x, y2 = target.y + target.h / 2;
        var d1 = Math.max(16, (xb - x1) * 0.5), d2 = Math.max(16, (x2 - xb) * 0.5);
        return 'M' + f1(x1) + ' ' + f1(y1) + 'C' + f1(x1 + d1) + ' ' + f1(y1) + ' ' + f1(xb - d1) + ' ' + f1(y1) + ' ' + f1(xb) + ' ' + f1(y1) +
          'C' + f1(xb + d2) + ' ' + f1(y1) + ' ' + f1(x2 - d2) + ' ' + f1(y2) + ' ' + f1(x2) + ' ' + f1(y2);
      }
      function renderHot(list) {
        var html = '';
        for (var i = list.length - 1; i >= 0; i--) {
          var h = list[i], c = null;
          V.L.roles.forEach(function (x) { if (x.id === h.roleId) c = x; });
          var d = hotPath(c);
          if (!d) continue;
          var cur = i === 0 && h.active;
          var op = i === 0 ? (h.active ? 1 : 0.55) : 0.3;
          html += '<path class="' + P + 'hg" d="' + d + '" stroke-opacity="' + (cur ? 0.28 : 0.1) + '" stroke-width="7"/>' +
            '<path class="' + P + 'hg" d="' + d + '" stroke-opacity="' + op + '" stroke-width="1.8"/>' +
            (cur && !reduced ? '<path class="' + P + 'hf" d="' + d + '"/>' : '');
        }
        V.hot.innerHTML = html;
      }

      /* ---------- 数字滚动（来自自有作品 fx.js 的写法） ---------- */
      function countUp(key, el, to, fmt) {
        var a = cu[key];
        if (!a) { cu[key] = { el: el, v: to, from: to, to: to, t0: 0, f: fmt }; el.textContent = fmt(to); return; }
        a.f = fmt;
        if (a.el !== el) { a.el = el; el.textContent = fmt(a.v); }
        if (a.to === to) return;
        if (reduced) { a.v = a.from = a.to = to; el.textContent = fmt(to); return; }
        a.from = a.v; a.to = to; a.t0 = performance.now();
        if (!cuRaf) cuRaf = requestAnimationFrame(cuFrame);
      }
      function cuFrame(now) {
        cuRaf = 0;
        if (destroyed) return;
        var live = false;
        Object.keys(cu).forEach(function (k) {
          var a = cu[k];
          if (a.v === a.to) return;
          var t = Math.min(1, (now - a.t0) / 900), e = 1 - Math.pow(1 - t, 3);
          a.v = t >= 1 ? a.to : a.from + (a.to - a.from) * e;
          if (a.el && a.el.isConnected) a.el.textContent = a.f(a.v);
          if (t < 1) live = true;
        });
        if (live) cuRaf = requestAnimationFrame(cuFrame);
      }
      function val(el, text) {
        if (!el || el.textContent === text) return;
        var had = el.textContent !== '';
        el.textContent = text;
        if (had && !reduced) { el.classList.remove(P + 'chg'); void el.offsetWidth; el.classList.add(P + 'chg'); }
      }
      function flash(i) {
        var v = V && V.inputs[i];
        if (!v || reduced) return;
        [v.el].concat(v.fib).forEach(function (el) { if (el) el.classList.add(P + 'hit'); });
        clearTimeout(flashT[i]);
        flashT[i] = setTimeout(function () {
          if (!V || !V.inputs[i]) return;
          [V.inputs[i].el].concat(V.inputs[i].fib).forEach(function (el) { if (el) el.classList.remove(P + 'hit'); });
        }, 900);
      }
      function spark(v, key, value) {
        var hs = hist[key] || (hist[key] = []);
        if (!hs.length || hs[hs.length - 1] !== value) { hs.push(value); if (hs.length > 40) hs.shift(); }
        if (!v.spark || v.c.l !== 'full') return;
        var w = Math.max(10, v.c.w - 16), h = 18;
        var mn = Math.min.apply(null, hs), mx = Math.max.apply(null, hs);
        var d = hs.map(function (x, i) {
          var px = hs.length === 1 ? (i ? w : 0) : i / (hs.length - 1) * w;
          var py = mx === mn ? h / 2 : h - 1 - (x - mn) / (mx - mn) * (h - 2);
          return (i ? 'L' : 'M') + f1(px) + ' ' + f1(py);
        }).join('');
        if (hs.length === 1) d += 'L' + f1(w) + ' ' + f1(h / 2);
        setA(v.sparkSvg, 'viewBox', '0 0 ' + f1(w) + ' ' + h);
        setA(v.spark, 'd', d);
      }

      /* ---------- 实时刷新（几次/秒） ---------- */
      function update() {
        pending = 0;
        if (destroyed || !V) return;
        var st = wb.getState();
        if (!st) return;
        var tasks = st.tasks || [], sr = st.roles || {};
        var queued = {}, bossAct = {}, bossList = [];
        tasks.forEach(function (t) {
          if (t.status === 'queued') queued[t.roleId] = (queued[t.roleId] || 0) + 1;
          if (t.origin === 'boss') {
            if (!focusId || t.roleId === focusId) {
              bossSeen[t.id] = 1;
              if (t.status === 'done') bossDone[t.id] = 1;
              bossList.push(t);
            }
            if (t.status !== 'done') bossAct[t.roleId] = (bossAct[t.roleId] || 0) + 1;
          }
        });

        /* 岗位卡 */
        var doneMax = 1, qMax = 1;
        V.roles.forEach(function (v) {
          var s = sr[v.c.id] || {};
          doneMax = Math.max(doneMax, s.done || 0);
          qMax = Math.max(qMax, queued[v.c.id] || 0);
        });
        var cnt = { working: 0, reporting: 0, moving: 0, idle: 0 }, qTotal = 0;
        allRoles.forEach(function (r) {
          var s = sr[r.id] || {};
          cnt[s.status || 'idle'] = (cnt[s.status || 'idle'] || 0) + 1;
          qTotal += queued[r.id] || 0;
        });
        V.roles.forEach(function (v) {
          var s = sr[v.c.id] || {}, status = s.status || 'idle', p = clamp(Number(s.progress) || 0, 0, 1);
          var task = s.taskId ? tasks.find(function (t) { return t.id === s.taskId; }) : null;
          setA(v.el, 'data-s', status);
          if (v.fib) setA(v.fib, 'data-s', status);
          setT(v.sub, STATUS[status] || String(status));
          v.el.classList.toggle(P + 'hot', !!bossAct[v.c.id]);
          var done = s.done || 0, qn = queued[v.c.id] || 0;
          if (v.c === V.L.big) {
            setT(v.pct, Math.round(p * 100) + '%');
            setW(v.el.querySelector('.' + P + 'bp .' + P + 'bar i'), p);
            setT(v.task, task ? '当前：' + task.title : '当前没有任务，等待派活');
            v.task.title = task ? task.title : '';
            var mine = tasks.filter(function (t) { return t.roleId === v.c.id; });
            var tot = Math.max(1, done + qn + (task ? 1 : 0));
            val(v.vals[0], String(done)); setW(v.bars[1], done / tot);
            val(v.vals[1], String(qn)); setW(v.bars[2], qn / tot);
            var bAct = bossAct[v.c.id] || 0, bAll = mine.filter(function (t) { return t.origin === 'boss'; }).length;
            val(v.vals[2], bAll ? bAct + '/' + bAll : '0'); setW(v.bars[3], bAll ? bAct / bAll : 0);
          } else {
            setT(v.task, task ? task.title : (v.c.r.title || ''));
            val(v.vals[0], Math.round(p * 100) + '%'); setW(v.bars[0], p);
            val(v.vals[1], String(done)); setW(v.bars[1], done / doneMax);
            val(v.vals[2], String(qn)); setW(v.bars[2], qn / qMax);
            setW(v.line, p);
          }
        });

        /* 任务行（岗位模式） */
        if (V.slots.length) {
          var rs = sr[focusId] || {};
          var rank = function (t) { return t.status === 'working' ? 0 : t.status === 'queued' ? 1 : 2; };
          var mineT = tasks.filter(function (t) { return t.roleId === focusId; }).map(function (t, i) { return { t: t, i: i }; });
          mineT.sort(function (a, b) { return rank(a.t) - rank(b.t) || a.i - b.i; });
          V.slots.forEach(function (v, i) {
            var t = mineT[i] && mineT[i].t;
            var s = 'empty';
            if (t) {
              s = t.status === 'done' ? 'done' : t.status === 'queued' ? 'queued' : 'working';
              if (s === 'working' && rs.taskId === t.id && rs.status === 'reporting') s = 'reporting';
              if (s === 'working' && rs.taskId === t.id && rs.status === 'moving') s = 'moving';
            }
            setA(v.el, 'data-s', s === 'moving' ? 'working' : s);
            if (v.fib) setA(v.fib, 'data-s', s === 'empty' || s === 'queued' || s === 'done' ? 'idle' : s);
            if (!t) return;
            setT(v.chip, { queued: '排队', working: '进行中', moving: '准备中', reporting: '汇报', done: '已完成' }[s]);
            setT(v.st, t.title || '');
            v.st.title = (t.title || '') + (t.result ? '\n✓ ' + t.result : '');
            setT(v.org, t.origin === 'boss' ? '老板派' : t.origin === 'live' ? '已接通' : '日常');
            v.org.className = P + 'org' + (t.origin === 'boss' ? ' boss' : '');
            setT(v.sv, t.status === 'done' ? '✓' : t.status === 'queued' ? '' : Math.round(clamp(t.progress || 0, 0, 1) * 100) + '%');
            setW(v.bar, t.progress || 0);
          });
        }

        /* 左列：老板指令 + 数字 */
        V.inputs.forEach(function (v, i) {
          if (v.c.kind === 'boss') {
            var n = Object.keys(bossSeen).length, dn = Object.keys(bossDone).length;
            var act = bossList.filter(function (t) { return t.status !== 'done'; }).length;
            val(v.vals[0], String(act)); setW(v.bars[0], n ? act / n : 0);
            val(v.vals[1], String(dn)); setW(v.bars[1], n ? dn / n : 0);
            val(v.vals[2], String(n)); setW(v.bars[2], n ? 1 : 0);
            setT(v.hv, act + ' 进行中');
            setW(v.line, n ? act / n : 0);
            var last = bossList[0];
            var html = last ? '<b>最新</b> ' + esc(last.title) : '还没有派活';
            if (v.last.innerHTML !== html) v.last.innerHTML = html;
            v.last.title = last ? last.title : '';
            return;
          }
          var k = v.c.k, ks = (st.kpis || {})[k.key] || { value: 0, delta: 0, source: 'sim' };
          var value = Number(ks.value) || 0;
          countUp(uid + k.key, v.big, value, function (x) { return fmtKpi(k, x); });
          setT(v.hv, fmtKpi(k, value) + (k.unit || ''));
          setT(v.sub, ks.source === 'live' ? '已接通' : '模拟');
          var dl = Number(ks.delta) || 0;
          setT(v.d, dl ? (dl > 0 ? '▲ ' : '▼ ') + fmtKpi(k, Math.abs(dl)) : '');
          v.d.className = P + 'd' + (dl > 0 ? ' up' : dl < 0 ? ' dn' : '');
          spark(v, k.key, value);
        });

        /* 热路径 */
        var hot = [], seenR = {};
        bossList.forEach(function (t) {
          if (hot.length >= 3 || seenR[t.roleId]) return;
          if (!V.L.roles.some(function (c) { return c.id === t.roleId; })) return;
          seenR[t.roleId] = 1;
          hot.push({ roleId: t.roleId, taskId: t.id, active: t.status !== 'done' });
        });
        var key = hot.map(function (h) { return h.roleId + ':' + h.taskId + ':' + (h.active ? 1 : 0); }).join('|');
        if (key !== V.hotKey) { V.hotKey = key; renderHot(hot); }

        /* 顶部小结 */
        if (V.sum) {
          var html2 = '<span>岗位<b>' + allRoles.length + '</b></span><span class="w">干活中<b>' + (cnt.working + cnt.moving) + '</b></span>' +
            '<span class="r">汇报中<b>' + cnt.reporting + '</b></span><span class="q">排队任务<b>' + qTotal + '</b></span>';
          if (V.sum.innerHTML !== html2) V.sum.innerHTML = html2;
          V.sum.style.display = V.L.w < 560 ? 'none' : '';
        }
      }
      function schedule() { if (!pending && !destroyed) pending = setTimeout(update, 200); }

      function build() {
        if (destroyed) return;
        var w = host.clientWidth, h = host.clientHeight;
        if (w < 60 || h < 60) { root.innerHTML = ''; V = null; W0 = w; H0 = h; return; }
        W0 = w; H0 = h;
        render(layout(w, h));
        update();
      }

      /* ---------- 事件 ---------- */
      ['tick', 'role', 'task'].forEach(function (e) { offs.push(wb.on(e, schedule)); });
      offs.push(wb.on('kpi', function (p) {
        schedule();
        if (!V || !p || !p.kpi || !p.kpi.delta) return;
        V.inputs.forEach(function (v, i) { if (v.c.k && v.c.k.key === p.key) flash(i); });
      }));
      offs.push(wb.on('task', function (t) {
        if (V && t && t.origin === 'boss' && t.status === 'queued' && (!focusId || t.roleId === focusId)) flash(0);
      }));
      function onClick(e) {
        var el = e.target.closest && e.target.closest('.' + P + 'role[data-id]');
        if (el && mode === 'main') wb.open(el.getAttribute('data-id'));
      }
      function onKey(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var el = e.target.closest && e.target.closest('.' + P + 'role[data-id]');
        if (el && mode === 'main') { e.preventDefault(); wb.open(el.getAttribute('data-id')); }
      }
      root.addEventListener('click', onClick);
      root.addEventListener('keydown', onKey);
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(function () {
          if (roRaf) return;
          roRaf = requestAnimationFrame(function () { roRaf = 0; resize(); });
        });
        ro.observe(host);
      }
      function resize() {
        if (destroyed) return;
        var w = host.clientWidth, h = host.clientHeight;
        if (Math.abs(w - W0) < 2 && Math.abs(h - H0) < 2 && (V || w < 60 || h < 60)) return;
        build();
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
          Object.keys(flashT).forEach(function (k) { clearTimeout(flashT[k]); });
          if (cuRaf) cancelAnimationFrame(cuRaf);
          if (roRaf) cancelAnimationFrame(roRaf);
          if (ro) ro.disconnect();
          root.removeEventListener('click', onClick);
          root.removeEventListener('keydown', onKey);
          if (root.parentNode) root.parentNode.removeChild(root);
          V = null;
        }
      };
    }
  });
})();
