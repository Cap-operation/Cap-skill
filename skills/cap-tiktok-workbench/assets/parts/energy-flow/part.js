/* 零件：能量流体 energy-flow（方向 G 移植，船长自有设计）
 * 真·桑基图：竖向发光柱 + 宽度按任务数的能量带（模糊辉光层 + 闪光层 + 分段渐变）
 * + 带内纤维流 + 底部红色“排队回流”环。
 *   主场景：任务来源（老板指令 / 自动排程）→ 每个岗位 → 状态（已完成 / 汇报中 / 进行中 / 排队）
 *   岗位模式：来源 → 该岗位 → 流水线阶段（无流水线时按职责）→ 状态
 * 只通过 wb.getState() / wb.on() / wb.company 取数据，不造任务、不改 KPI。 */
(function () {
  'use strict';
  var ID = 'energy-flow';
  var WB = window.Workbench;
  if (!WB || typeof WB.registerPart !== 'function') return;

  var NS = 'http://www.w3.org/2000/svg';
  var WINDOW = 40;                 // 只看最近 40 个任务
  var MONO = '"SF Mono","JetBrains Mono","Cascadia Mono",Menlo,Consolas,monospace';
  var FB = ['#22D3EE', '#8B5CF6', '#EC4899', '#FB923C', '#34D399', '#FACC15'];
  var C = {
    boss: 'var(--boss, #FACC15)', auto: 'var(--accent, #22D3EE)', live: 'var(--accent2, #EC4899)',
    done: 'var(--ok, #34D399)', report: 'var(--boss, #FACC15)', work: 'var(--accent2, #EC4899)', queued: 'var(--bad, #FB7185)'
  };
  var STATUS = { idle: '', moving: '就位中', working: '干活中', reporting: '汇报中' };
  var seq = 0;

  var CSS = [
    '.energy-flow-root{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;isolation:isolate;color:var(--text,#E7ECF8);-webkit-user-select:none;user-select:none;',
    'background:radial-gradient(ellipse at 30% 40%,rgba(34,211,238,.08),transparent 55%),radial-gradient(ellipse at 75% 60%,rgba(236,72,153,.08),transparent 55%);',
    'background:radial-gradient(ellipse at 30% 40%,color-mix(in srgb,var(--accent,#22D3EE) 10%,transparent),transparent 55%),radial-gradient(ellipse at 75% 60%,color-mix(in srgb,var(--accent2,#EC4899) 10%,transparent),transparent 55%)}',
    '.energy-flow-svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
    '.energy-flow-shine{animation:energy-flow-shine 3s ease-in-out infinite}',
    '@keyframes energy-flow-shine{50%{opacity:.78}}',
    '.energy-flow-band{transition:opacity .3s}',
    '.energy-flow-ghost{opacity:.35}',
    '.energy-flow-hl .energy-flow-band:not(.energy-flow-on){opacity:.14}',
    '.energy-flow-fa{stroke:#fff;stroke-opacity:.32;animation:energy-flow-fib 4s linear infinite}',
    '.energy-flow-fb{stroke:#fff;stroke-opacity:.75;animation:energy-flow-fib 2.4s linear infinite}',
    '@keyframes energy-flow-fib{to{stroke-dashoffset:-600}}',
    '.energy-flow-hl .energy-flow-fa,.energy-flow-hl .energy-flow-fb{stroke-opacity:.15}',
    '.energy-flow-loop{stroke:var(--bad,#FB7185)}',
    '.energy-flow-loopflow{stroke:#FFE4E8;stroke:color-mix(in srgb,var(--bad,#FB7185) 22%,#fff);stroke-opacity:1}',
    '.energy-flow-layer{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none}',
    '.energy-flow-bar{position:absolute;border-radius:4px;background:var(--efc);box-shadow:0 0 18px var(--efc),0 0 40px var(--efc);animation:energy-flow-bar 2.2s ease-in-out infinite}',
    '@keyframes energy-flow-bar{50%{filter:brightness(1.45)}}',
    '.energy-flow-bar[data-s="idle"]{box-shadow:0 0 8px var(--efc),0 0 20px var(--efc);filter:brightness(.82);animation:none}',
    '.energy-flow-bar[data-s="working"]{animation-duration:1.1s}',
    '.energy-flow-bar[data-s="reporting"]{animation:energy-flow-blink .8s steps(2) infinite}',
    '@keyframes energy-flow-blink{50%{opacity:.45}}',
    '.energy-flow-bar[data-role],.energy-flow-lab[data-role]{pointer-events:auto;cursor:pointer}',
    '.energy-flow-lab{position:absolute;white-space:nowrap;line-height:1.25}',
    '.energy-flow-lb{display:inline-block;box-sizing:border-box;max-width:100%;padding:3px 8px;border-radius:6px;vertical-align:top;overflow:hidden;text-overflow:ellipsis;',
    'background:rgba(6,10,24,.72);background:color-mix(in srgb,var(--panel-solid,#060A18) 74%,transparent)}',
    '.energy-flow-n{display:block;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis}',
    '.energy-flow-v{display:block;font-family:' + MONO + ';font-size:11px;color:var(--efc);overflow:hidden;text-overflow:ellipsis}',
    '.energy-flow-one .energy-flow-n,.energy-flow-one .energy-flow-v{display:inline}',
    '.energy-flow-one .energy-flow-v{margin-left:6px}',
    '.energy-flow-lab[data-role]:hover .energy-flow-lb{box-shadow:0 0 0 1px var(--efc)}',
    '.energy-flow-head{position:absolute;left:14px;right:14px;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:4px 18px;pointer-events:none;z-index:2}',
    '.energy-flow-ht{min-width:0;max-width:100%}',
    '.energy-flow-kick{font-family:' + MONO + ';font-size:11px;letter-spacing:.16em;color:var(--muted,#9AA6C4);margin-bottom:2px;white-space:nowrap}',
    '.energy-flow-title{font-weight:900;letter-spacing:.03em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--accent,#22D3EE);',
    'background:linear-gradient(90deg,var(--accent,#22D3EE),var(--c5,#8B5CF6) 40%,var(--accent2,#EC4899) 70%,var(--boss,#FACC15));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}',
    '.energy-flow-sub{font-family:' + MONO + ';font-size:11px;letter-spacing:.08em;color:var(--muted,#9AA6C4);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.energy-flow-stats{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;font-family:' + MONO + ';font-size:11px;color:var(--muted,#9AA6C4)}',
    '.energy-flow-stats b{font-size:15px;margin-left:5px;color:var(--text,#fff)}',
    '.energy-flow-looplab{position:absolute;font-size:12px;white-space:nowrap;transform:translateX(-50%);pointer-events:none;color:#FDA4AF;color:color-mix(in srgb,var(--bad,#FB7185) 70%,#fff)}',
    '.energy-flow-looplab.energy-flow-quiet{opacity:.5}',
    '.energy-flow-empty{position:absolute;transform:translate(-50%,-50%);display:none;padding:6px 14px;border-radius:99px;font-size:12px;white-space:nowrap;pointer-events:none;color:var(--muted,#9AA6C4);',
    'border:1px dashed var(--line-strong,rgba(120,200,255,.32));background:rgba(6,10,24,.7);background:color-mix(in srgb,var(--panel-solid,#060A18) 70%,transparent)}',
    '.energy-flow-still,.energy-flow-still *{animation:none!important;transition:none!important}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('part-' + ID + '-css')) return;
    var st = document.createElement('style');
    st.id = 'part-' + ID + '-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function lcg(seed) {   // 原设计同款 LCG，保证纤维抖动稳定、不随刷新跳动
    var s = (seed >>> 0) || 59;
    return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }
  function find(arr, fn) { for (var i = 0; i < (arr || []).length; i++) if (fn(arr[i], i)) return arr[i]; return null; }
  function hEl(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function sEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function setText(el, t) { if (el && el._t !== t) { el._t = t; el.textContent = t; } }
  function pal(i) { var k = ((i % 6) + 6) % 6; return 'var(--c' + (k + 1) + ', ' + FB[k] + ')'; }
  function band(sx, sy, tx, ty, w) {   // 与原设计相同的带形：两条三次贝塞尔围成的封闭带
    var mx = (sx + tx) / 2;
    return 'M' + f1(sx) + ' ' + f1(sy) + 'C' + f1(mx) + ' ' + f1(sy) + ' ' + f1(mx) + ' ' + f1(ty) + ' ' + f1(tx) + ' ' + f1(ty) +
      'L' + f1(tx) + ' ' + f1(ty + w) + 'C' + f1(mx) + ' ' + f1(ty + w) + ' ' + f1(mx) + ' ' + f1(sy + w) + ' ' + f1(sx) + ' ' + f1(sy + w) + 'Z';
  }

  WB.registerPart(ID, {
    meta: { label: 'ENERGY FLOW', modes: ['main', 'role'] },
    mount: function (host, wb, opts) {
      opts = opts || {};
      injectCss();
      var uid = 'ef' + (++seq) + '_';
      var isMain = opts.mode !== 'role';
      var focus = !isMain && opts.roleId ? wb.roleById(opts.roleId) : null;
      var still = !!wb.reducedMotion;
      var dead = false;

      var root = hEl('div', 'energy-flow-root' + (still ? ' energy-flow-still' : ''), host);
      var svg = sEl('svg', { 'class': 'energy-flow-svg', 'aria-hidden': 'true', width: 1, height: 1 }, root);
      var defs = sEl('defs', {}, svg);
      var blur = sEl('filter', { id: uid + 'blur', filterUnits: 'userSpaceOnUse', x: -40, y: -40, width: 100, height: 100 }, defs);
      var blurFe = sEl('feGaussianBlur', { stdDeviation: 10 }, blur);
      var gGlow = sEl('g', { filter: 'url(#' + uid + 'blur)', opacity: '0.55' }, svg);
      var gShine = sEl('g', { 'class': 'energy-flow-shine', opacity: '0.5' }, svg);
      var loopBase = sEl('path', { 'class': 'energy-flow-loop', fill: 'none', 'stroke-linecap': 'round', d: 'M0 0' }, svg);
      var loopFlow = sEl('path', { 'class': 'energy-flow-loopflow energy-flow-fb', fill: 'none', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-dasharray': '8 52', d: 'M0 0' }, svg);
      var fibA = sEl('path', { 'class': 'energy-flow-fa', fill: 'none', 'stroke-width': '1.2', 'stroke-dasharray': '22 38', d: 'M0 0' }, svg);
      var fibB = sEl('path', { 'class': 'energy-flow-fb', fill: 'none', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-dasharray': '6 54', d: 'M0 0' }, svg);
      var layer = hEl('div', 'energy-flow-layer', root);
      var loopLab = hEl('div', 'energy-flow-looplab', root);
      var empty = hEl('div', 'energy-flow-empty', root);
      var head = hEl('div', 'energy-flow-head', root);
      var headTop = isMain ? 14 : 12;   // 外壳的 stage-label 在右下角，左上角留给标题
      head.style.top = headTop + 'px';

      var links = {}, nodes = {}, cur = {}, loopInfo = null;
      var anim = null, raf = 0, rzRaf = 0, gseq = 0;
      var lastSig = '', headHtml = '', lastBuild = 0, dirty = true, statusDirty = false;
      var hlId = null;

      /* ---------- 数据 → 模型 ---------- */
      function originOf(t) { return t.origin === 'boss' ? 'boss' : t.origin === 'live' ? 'live' : 'auto'; }
      function outcomeOf(t, rs) {
        if (t.status === 'done') return 'done';
        if (t.status === 'queued') return 'queued';
        var r = rs[t.roleId];
        if ((r && r.status === 'reporting' && r.taskId === t.id) || t.progress >= 1) return 'report';
        return 'work';
      }
      function roleCol(id, i) {
        var c = '';
        try { c = wb.roleColor(id); } catch (e) { c = ''; }
        return c || FB[(i < 0 ? 0 : i) % FB.length];
      }
      function node(key, name, color, kind) { return { key: key, name: name, color: color, kind: kind, count: 0, cin: 0, cout: 0 }; }

      function midNodes(role, ri, list) {
        var flows = (wb.company && wb.company.flows) || [];
        var flow = role.flow ? find(flows, function (f) { return f && f.id === role.flow; }) : null;
        if (!flow) {
          var t0 = find(list, function (t) { return !!t.flowId; });
          if (t0) flow = find(flows, function (f) { return f && f.id === t0.flowId; });
        }
        if (flow && flow.stages && flow.stages.length) {
          var n = flow.stages.length;
          return {
            label: flow.name || '流水线阶段',
            nodes: flow.stages.map(function (s, i) { return node('m:s' + i, s, pal(ri + i + 1), 'mid'); }),
            keyOf: function (t) { return 'm:s' + (t.flowId === flow.id ? clamp(t.stage | 0, 0, n - 1) : 0); }
          };
        }
        var duties = (role.duties || []).slice(0, 8);
        if (!duties.length) return null;
        function dutyIdx(t) {
          var title = String(t.title || '');
          for (var i = 0; i < duties.length; i++) if (title === duties[i]) return i;
          for (var j = 0; j < duties.length; j++) if (duties[j] && title.indexOf(duties[j]) !== -1) return j;
          return -1;
        }
        var ns = duties.map(function (d, i) { return node('m:d' + i, d, pal(ri + i + 1), 'mid'); });
        ns.push(node('m:other', '专项任务', C.boss, 'mid'));
        return { label: '职责', nodes: ns, keyOf: function (t) { var i = dutyIdx(t); return i < 0 ? 'm:other' : 'm:d' + i; } };
      }

      function buildModel() {
        var co = wb.company || {}, st = wb.getState() || {};
        var roles = co.roles || [], rs = st.roles || {};
        var list = (st.tasks || []).filter(function (t) {
          return t && (focus ? t.roleId === focus.id : !!wb.roleById(t.roleId));
        }).slice(0, WINDOW);
        var cols = [], lk = {}, order = [];
        function add(a, b, roleId) {
          var k = a + '>' + b;
          if (!lk[k]) { lk[k] = { key: k, from: a, to: b, count: 0, roles: roleId ? [roleId] : [] }; order.push(k); }
          lk[k].count++;
        }
        var oc = { boss: 0, auto: 0, live: 0 }, xc = { done: 0, report: 0, work: 0, queued: 0 };
        list.forEach(function (t) { oc[originOf(t)]++; xc[outcomeOf(t, rs)]++; });

        var origins = [node('o:boss', '老板指令', C.boss, 'origin'), node('o:auto', '自动排程', C.auto, 'origin')];
        if (oc.live || (co.live && co.live.enabled)) origins.push(node('o:live', '实时接入', C.live, 'origin'));
        cols.push(origins);
        var outs = [node('x:done', '已完成', C.done, 'out'), node('x:report', '汇报中', C.report, 'out'),
          node('x:work', '进行中', C.work, 'out'), node('x:queued', '排队', C.queued, 'out')];
        var midLabel = '';

        if (!focus) {
          cols.push(roles.map(function (r, i) {
            var n = node('r:' + r.id, r.name || r.id, roleCol(r.id, i), 'role');
            n.roleId = r.id;
            return n;
          }));
          cols.push(outs);
          list.forEach(function (t) {
            var rk = 'r:' + t.roleId;
            add('o:' + originOf(t), rk, t.roleId);
            add(rk, 'x:' + outcomeOf(t, rs), t.roleId);
          });
        } else {
          var ri = roles.indexOf(focus);
          var hub = node('h:' + focus.id, focus.name || focus.id, roleCol(focus.id, ri), 'hub');
          hub.roleId = focus.id;
          cols.push([hub]);
          var mid = midNodes(focus, ri, list);
          if (mid) { cols.push(mid.nodes); midLabel = mid.label; }
          cols.push(outs);
          list.forEach(function (t) {
            add('o:' + originOf(t), hub.key, focus.id);
            var ok = 'x:' + outcomeOf(t, rs);
            if (mid) { var mk = mid.keyOf(t); add(hub.key, mk, focus.id); add(mk, ok, focus.id); }
            else add(hub.key, ok, focus.id);
          });
        }

        var byKey = {};
        cols.forEach(function (c) { c.forEach(function (n) { byKey[n.key] = n; }); });
        var arr = order.map(function (k) { return lk[k]; }).filter(function (l) { return byKey[l.from] && byKey[l.to]; });
        arr.forEach(function (l) { byKey[l.from].cout += l.count; byKey[l.to].cin += l.count; });
        cols.forEach(function (c) { c.forEach(function (n) { n.count = Math.max(n.cin, n.cout); }); });
        // 中间列计数为 0 的节点：画一根很细的“空闲通道”，保证图不塌
        for (var ci = 1; ci < cols.length - 1; ci++) {
          var src = ci === 1 ? byKey['o:boss'] : cols[ci - 1][0];
          cols[ci].forEach(function (n) {
            if (!n.count && src) arr.push({ key: 'g:' + src.key + '>' + n.key, from: src.key, to: n.key, count: 0, ghost: true, roles: n.roleId ? [n.roleId] : [] });
          });
        }
        return { cols: cols, links: arr, total: list.length, oc: oc, xc: xc, midLabel: midLabel };
      }

      /* ---------- 模型 → 几何（目标值） ---------- */
      function spread(items, lh, minY, maxY) {
        var prev = minY - 2;
        items.forEach(function (it) { it.top = Math.max(it.top, prev + 2); prev = it.top + lh; });
        var lim = maxY;
        for (var i = items.length - 1; i >= 0; i--) {
          if (items[i].top + lh > lim) items[i].top = lim - lh;
          lim = items[i].top - 2;
        }
      }

      function layout(model, W, H, top) {
        var cols = model.cols, nc = cols.length;
        var barW = W < 760 ? 12 : 16;
        var lab = clamp(Math.round(W * 0.13), 76, 150);
        var x0 = 10 + lab, xN = W - 10 - lab - barW;
        if (xN < x0 + 40) xN = x0 + 40;
        var loopH = clamp(Math.round(H * 0.1), 36, 60);
        var avail = Math.max(50, H - top - loopH);
        var maxN = 1;
        cols.forEach(function (c) { maxN = Math.max(maxN, c.length); });
        var minNode = clamp(avail / (maxN * 5), 3, 8);
        var gaps = cols.map(function (c) { return c.length > 1 ? clamp(avail * 0.28 / (c.length - 1), 3, 30) : 0; });
        var k = Infinity;
        cols.forEach(function (c, ci) {
          var a = avail - gaps[ci] * (c.length - 1) - minNode * c.length * 0.6;
          k = Math.min(k, a / Math.max(model.total, 10));
        });
        k = clamp(k, 0.3, 60);
        var colX = [];
        var byKey = {};
        cols.forEach(function (c, ci) {
          var x = Math.round(nc === 1 ? x0 : x0 + (xN - x0) * ci / (nc - 1));
          colX.push(x);
          var hs = c.map(function (n) { return Math.max(minNode, n.count * k); });
          var sum = hs.reduce(function (a, b) { return a + b; }, 0);
          var gap = gaps[ci];
          if (c.length > 1 && sum + gap * (c.length - 1) > avail) gap = Math.max(1, (avail - sum) / (c.length - 1));
          var tot = sum + gap * (c.length - 1);
          var y = top + Math.max(0, (avail - tot) / 2);
          c.forEach(function (n, i) { n.x = x; n.y = y; n.h = hs[i]; n.ci = ci; n.idx = i; byKey[n.key] = n; y += hs[i] + gap; });
        });

        var vals = {}, lmeta = {}, nmeta = {};
        var real = model.links.filter(function (l) { return !l.ghost; });
        real.forEach(function (l) { l.w = Math.max(1.2, l.count * k); });
        Object.keys(byKey).forEach(function (key) {   // 出/入带按对端顺序堆叠，避免交叉
          var n = byKey[key];
          var outs = real.filter(function (l) { return l.from === key; }).sort(function (a, b) { return byKey[a.to].idx - byKey[b.to].idx; });
          var ow = outs.reduce(function (a, l) { return a + l.w; }, 0), oy = n.y + Math.max(0, (n.h - ow) / 2);
          outs.forEach(function (l) { l.sy = oy; oy += l.w; });
          var ins = real.filter(function (l) { return l.to === key; }).sort(function (a, b) { return byKey[a.from].idx - byKey[b.from].idx; });
          var iw = ins.reduce(function (a, l) { return a + l.w; }, 0), iy = n.y + Math.max(0, (n.h - iw) / 2);
          ins.forEach(function (l) { l.ty = iy; iy += l.w; });
        });
        model.links.forEach(function (l) {
          var a = byKey[l.from], b = byKey[l.to];
          if (l.ghost) { l.w = 1.4; l.sy = a.y + a.h / 2 - 0.7; l.ty = b.y + b.h / 2 - 0.7; }
          lmeta[l.key] = { sx: a.x + barW, tx: b.x, c0: a.color, c1: b.color, ghost: !!l.ghost, roles: l.roles || [] };
          vals[l.key + '|w'] = l.w; vals[l.key + '|sy'] = l.sy; vals[l.key + '|ty'] = l.ty;
        });

        cols.forEach(function (c, ci) {
          var side = ci === 0 ? 'L' : ci === nc - 1 ? 'R' : 'M';
          var two = avail / c.length >= 40 && W >= 520;
          var lh = two ? 38 : 22;
          var gapX = nc > 1 ? (colX[1] - colX[0] - barW) : 200;
          var labW = side === 'M' ? Math.round(clamp(gapX * 0.62, 70, 180)) : lab - 4;
          var items = c.map(function (n) {
            var cy = (side === 'M' && n.h >= lh + 10) ? n.y + 3 + lh / 2 : n.y + n.h / 2;
            return { n: n, top: cy - lh / 2 };
          });
          spread(items, lh, top - 8, H - loopH * 0.55);
          items.forEach(function (it, i) {
            var n = it.n;
            var labLeft = side === 'L' ? n.x - 8 - labW : side === 'R' ? n.x + barW + 8 : n.x + barW + 6;
            nmeta[n.key] = {
              x: n.x, barW: barW, color: n.color, side: side, labLeft: Math.round(labLeft), labW: labW, two: two,
              name: n.name, count: n.count, kind: n.kind, roleId: n.roleId || null,
              pct: model.total ? Math.round(n.count * 100 / model.total) : 0, delay: (ci * 0.3 + i * 0.2).toFixed(2)
            };
            vals[n.key + '|y'] = n.y; vals[n.key + '|h'] = n.h; vals[n.key + '|ly'] = it.top;
          });
        });

        var last = cols[nc - 1], q = find(last, function (n) { return n.key === 'x:queued'; });
        var endNode = focus ? cols[1][0] : cols[0][cols[0].length - 1];
        var by = H - loopH * 0.45, r = clamp(lab * 0.5, 30, 70);
        var qn = model.xc.queued;
        loopInfo = q && endNode ? {
          q: q.key, e: endNode.key, sx: q.x + barW, ex: endNode.x + barW / 2, by: by, r: r,
          w: qn ? clamp(qn * k * 0.8, 5, 14) : 3, active: qn > 0
        } : null;
        if (loopInfo) {
          var r2 = 82;
          loopLab.style.left = Math.round((loopInfo.ex + r2 + loopInfo.sx) / 2) + 'px';
          loopLab.style.top = Math.round(by - 22 - loopInfo.w / 2) + 'px';
          setText(loopLab, qn ? '排队回流 → 重新派发 · ' + qn + ' 个任务等待' : '排队回流 · 暂无积压');
          loopLab.className = 'energy-flow-looplab' + (qn ? '' : ' energy-flow-quiet');
        }
        empty.style.display = model.total ? 'none' : 'block';
        empty.style.left = Math.round(W / 2) + 'px';
        empty.style.top = Math.round(top + avail / 2) + 'px';
        setText(empty, focus ? '这个岗位最近还没有任务' : '还没有任务流过 · 给团队派活后这里会流动起来');
        return { vals: vals, links: lmeta, nodes: nmeta };
      }

      /* ---------- DOM 维护 ---------- */
      function createLink(key, tm) {
        var gid = uid + 'g' + (++gseq);
        var grad = sEl('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
        var m = {
          key: key, gid: gid, grad: grad,
          s0: sEl('stop', { offset: '0' }, grad), s1: sEl('stop', { offset: '1' }, grad),
          g: sEl('path', { 'class': 'energy-flow-band', d: 'M0 0' }, gGlow),
          s: sEl('path', { 'class': 'energy-flow-band', d: 'M0 0' }, gShine),
          jit: [], pick: [], d: ''
        };
        var rnd = lcg(hash(key));
        for (var i = 0; i < 8; i++) { m.jit.push(rnd()); m.pick.push(rnd()); }
        updateLink(m, tm);
        return m;
      }
      function updateLink(m, tm) {
        m.sx = tm.sx; m.tx = tm.tx; m.ghost = tm.ghost; m.roles = tm.roles;
        m.grad.setAttribute('x1', tm.sx); m.grad.setAttribute('x2', tm.tx);
        m.s0.setAttribute('style', 'stop-color:' + tm.c0);
        m.s1.setAttribute('style', 'stop-color:' + tm.c1);
        var fill = 'url(#' + m.gid + ')';
        m.g.setAttribute('fill', fill); m.s.setAttribute('fill', fill);
        var cls = 'energy-flow-band' + (tm.ghost ? ' energy-flow-ghost' : '');
        m.g.setAttribute('class', cls); m.s.setAttribute('class', cls);
        if (tm.ghost) m.g.setAttribute('d', 'M0 0');
        m.d = '';
      }
      function dropLink(key) {
        var m = links[key];
        if (!m) return;
        [m.grad, m.g, m.s].forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
        delete links[key];
        ['w', 'sy', 'ty'].forEach(function (f) { delete cur[key + '|' + f]; });
      }

      function createNode(key, tm) {
        var bar = hEl('div', 'energy-flow-bar', layer);
        var lab = hEl('div', 'energy-flow-lab', layer);
        var lb = hEl('span', 'energy-flow-lb', lab);
        var m = { key: key, bar: bar, lab: lab, nEl: hEl('span', 'energy-flow-n', lb), vEl: hEl('span', 'energy-flow-v', lb), s: '' };
        if (isMain && tm.roleId) {
          bar.setAttribute('data-role', tm.roleId);
          lab.setAttribute('data-role', tm.roleId);
          lab.title = '点击查看岗位';
        }
        updateNode(m, tm);
        return m;
      }
      function updateNode(m, tm) {
        for (var k in tm) if (Object.prototype.hasOwnProperty.call(tm, k)) m[k] = tm[k];
        m.bar.style.setProperty('--efc', tm.color);
        m.bar.style.left = tm.x + 'px';
        m.bar.style.width = tm.barW + 'px';
        m.bar.style.animationDelay = tm.delay + 's';
        m.lab.style.setProperty('--efc', tm.color);
        m.lab.style.left = tm.labLeft + 'px';
        m.lab.style.width = tm.labW + 'px';
        m.lab.style.textAlign = tm.side === 'L' ? 'right' : 'left';
        m.lab.className = 'energy-flow-lab' + (tm.two ? '' : ' energy-flow-one');
        setText(m.nEl, tm.name);
        setText(m.vEl, valText(m));
      }
      function dropNode(key) {
        var m = nodes[key];
        if (!m) return;
        [m.bar, m.lab].forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
        delete nodes[key];
        ['y', 'h', 'ly'].forEach(function (f) { delete cur[key + '|' + f]; });
      }
      function roleStatus(id) {
        var st = wb.getState() || {}, r = (st.roles || {})[id];
        return (r && r.status) || 'idle';
      }
      function valText(m) {
        if (m.kind === 'role' || m.kind === 'hub') {
          var s = STATUS[roleStatus(m.roleId)];
          return m.count + ' 任务' + (s ? ' · ' + s : '');
        }
        if (m.kind === 'mid') return m.count + ' 个';
        return m.count + (m.count ? ' · ' + m.pct + '%' : '');
      }

      /* ---------- 补间动画：宽度/位置平滑过渡 ---------- */
      function parse(k) { var i = k.lastIndexOf('|'); return [k.slice(0, i), k.slice(i + 1)]; }
      function birth(k, v) {
        var p = parse(k), id = p[0], f = p[1];
        if (f === 'w' || f === 'h') return 0;
        if (f === 'sy' || f === 'ty') return v[k] + (v[id + '|w'] || 0) / 2;
        if (f === 'y') return v[k] + (v[id + '|h'] || 0) / 2;
        return v[k];
      }
      function death(k, v) { return birth(k, v); }

      function apply(t, instant) {
        Object.keys(t.links).forEach(function (key) {
          if (!links[key]) links[key] = createLink(key, t.links[key]);
          else updateLink(links[key], t.links[key]);
          links[key].dead = false;
        });
        Object.keys(links).forEach(function (key) { if (!t.links[key]) links[key].dead = true; });
        Object.keys(t.nodes).forEach(function (key) {
          if (!nodes[key]) nodes[key] = createNode(key, t.nodes[key]);
          else updateNode(nodes[key], t.nodes[key]);
          nodes[key].dead = false;
        });
        Object.keys(nodes).forEach(function (key) { if (!t.nodes[key]) nodes[key].dead = true; });
        statusPass();
        applyHl();

        var from = {}, to = {};
        Object.keys(t.vals).forEach(function (k) {
          to[k] = t.vals[k];
          from[k] = Object.prototype.hasOwnProperty.call(cur, k) ? cur[k] : birth(k, t.vals);
        });
        Object.keys(cur).forEach(function (k) {
          if (!Object.prototype.hasOwnProperty.call(t.vals, k)) { from[k] = cur[k]; to[k] = death(k, cur); }
        });
        if (instant || still) {
          cur = to; anim = null;
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          cleanup(); render();
          return;
        }
        cur = from;
        anim = { from: from, to: to, t0: 0, dur: 750 };
        if (!raf) raf = requestAnimationFrame(step);
      }
      function step(ts) {
        raf = 0;
        if (dead || !anim) return;
        if (!anim.t0) anim.t0 = ts;
        var p = clamp((ts - anim.t0) / anim.dur, 0, 1);
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var fr = anim.from, to = anim.to;
        for (var k in to) cur[k] = fr[k] + (to[k] - fr[k]) * e;
        render();
        if (p < 1) raf = requestAnimationFrame(step);
        else { anim = null; cleanup(); }
      }
      function cleanup() {
        Object.keys(links).forEach(function (k) { if (links[k].dead) dropLink(k); });
        Object.keys(nodes).forEach(function (k) { if (nodes[k].dead) dropNode(k); });
      }

      function render() {
        var fa = [], fb = [];
        Object.keys(links).forEach(function (key) {
          var m = links[key];
          var w = cur[key + '|w'] || 0, sy = cur[key + '|sy'] || 0, ty = cur[key + '|ty'] || 0;
          var d = w > 0.3 ? band(m.sx, sy, m.tx, ty, w) : 'M0 0';
          if (d !== m.d) {
            m.d = d;
            m.s.setAttribute('d', d);
            if (!m.ghost) m.g.setAttribute('d', d);
          }
          if (!m.ghost && w >= 2.4) {
            var n = clamp(Math.round(w / 9), 1, 8), mx = (m.sx + m.tx) / 2, amp = Math.min(4, w * 0.18);
            for (var i = 0; i < n; i++) {
              var fr = (i + 0.5) / n, j = (m.jit[i] - 0.5) * amp;
              var ys = sy + fr * w + j, yt = ty + fr * w + j;
              (m.pick[i] < 0.62 ? fa : fb).push('M' + f1(m.sx) + ' ' + f1(ys) + 'C' + f1(mx) + ' ' + f1(ys) + ' ' + f1(mx) + ' ' + f1(yt) + ' ' + f1(m.tx) + ' ' + f1(yt));
            }
          }
        });
        fibA.setAttribute('d', fa.join('') || 'M0 0');
        fibB.setAttribute('d', fb.join('') || 'M0 0');
        Object.keys(nodes).forEach(function (key) {
          var m = nodes[key];
          var hh = Math.max(0, cur[key + '|h'] || 0);
          m.bar.style.top = f1(cur[key + '|y'] || 0) + 'px';
          m.bar.style.height = f1(hh) + 'px';
          m.lab.style.top = f1(cur[key + '|ly'] || 0) + 'px';
          m.lab.style.opacity = hh > 0.5 ? '' : '0';
        });
        renderLoop();
      }

      function renderLoop() {
        var L = loopInfo;
        if (!L || cur[L.q + '|y'] == null || cur[L.e + '|y'] == null) {
          loopBase.setAttribute('d', 'M0 0'); loopFlow.setAttribute('d', 'M0 0');
          return;
        }
        var sy = cur[L.q + '|y'] + (cur[L.q + '|h'] || 0) / 2;
        var endY = Math.min(cur[L.e + '|y'] + (cur[L.e + '|h'] || 0) + 3, L.by - 12);
        var r2 = clamp(L.by - endY, 20, 82);
        var d = 'M' + f1(L.sx) + ' ' + f1(sy) + ' C' + f1(L.sx + L.r) + ' ' + f1(sy) + ' ' + f1(L.sx + L.r) + ' ' + f1(L.by) + ' ' + f1(L.sx - 6) + ' ' + f1(L.by) +
          ' L' + f1(L.ex + r2) + ' ' + f1(L.by) + ' C' + f1(L.ex) + ' ' + f1(L.by) + ' ' + f1(L.ex) + ' ' + f1((L.by + endY) / 2) + ' ' + f1(L.ex) + ' ' + f1(endY);
        loopBase.setAttribute('d', d);
        loopBase.setAttribute('stroke-width', f1(L.w));
        loopBase.setAttribute('stroke-opacity', L.active ? '0.38' : '0.14');
        loopFlow.setAttribute('d', L.active ? d : 'M0 0');
      }

      /* ---------- 状态 / 表头 / 高亮 ---------- */
      function statusPass() {
        Object.keys(nodes).forEach(function (key) {
          var m = nodes[key];
          if (!m.roleId) return;
          var s = roleStatus(m.roleId);
          if (m.s !== s) { m.s = s; m.bar.setAttribute('data-s', s); }
          setText(m.vEl, valText(m));
        });
      }

      function updateHead(model, W) {
        var total = model.total, xc = model.xc;
        var pDone = total ? Math.round(xc.done * 100 / total) : 0;
        var tsize = clamp(Math.round(W / 52), 16, 26);
        var kick = isMain ? '' : '<div class="energy-flow-kick">ENERGY FLOW // 岗位能量流</div>';
        var title = focus ? esc(focus.name || focus.id) + ' · 任务流向' : '任务能量流向图';
        var path = focus ? '来源 → 岗位 → ' + (model.midLabel ? esc(model.midLabel) + ' → ' : '') + '状态' : '来源 → 岗位 → 状态';
        var sub = '近 ' + total + ' 个任务 · ' + path;
        var stats = W >= 600 ? '<div class="energy-flow-stats">' +
          '<span>老板派<b style="color:' + C.boss + '">' + model.oc.boss + '</b></span>' +
          '<span>已完成<b style="color:' + C.done + '">' + pDone + '%</b></span>' +
          '<span>进行中<b style="color:' + C.work + '">' + (xc.work + xc.report) + '</b></span>' +
          '<span>排队<b style="color:' + C.queued + '">' + xc.queued + '</b></span></div>' : '';
        var html = '<div class="energy-flow-ht">' + kick + '<div class="energy-flow-title" style="font-size:' + tsize + 'px">' + title + '</div>' +
          '<div class="energy-flow-sub">' + sub + '</div></div>' + stats;
        if (html !== headHtml) { headHtml = html; head.innerHTML = html; }
      }

      function applyHl() {
        root.classList.toggle('energy-flow-hl', !!hlId);
        Object.keys(links).forEach(function (key) {
          var m = links[key], on = !!hlId && m.roles.indexOf(hlId) !== -1;
          m.g.classList.toggle('energy-flow-on', on);
          m.s.classList.toggle('energy-flow-on', on);
        });
      }
      function roleTarget(e) {
        var t = e.target;
        while (t && t !== root) {
          if (t.getAttribute && t.getAttribute('data-role')) return t.getAttribute('data-role');
          t = t.parentNode;
        }
        return null;
      }
      if (isMain) {
        root.addEventListener('mouseover', function (e) { var id = roleTarget(e); if (id !== hlId) { hlId = id; applyHl(); } });
        root.addEventListener('mouseleave', function () { if (hlId) { hlId = null; applyHl(); } });
        root.addEventListener('click', function (e) { var id = roleTarget(e); if (id) wb.open(id); });
      }

      /* ---------- 重建（节流 ~1 次/秒） ---------- */
      function rebuild(instant) {
        if (dead) return;
        lastBuild = Date.now();
        var W = host.clientWidth, H = host.clientHeight;
        if (W < 40 || H < 40) return;   // 容器还没尺寸：等 resize / ResizeObserver
        var model = buildModel();
        updateHead(model, W);
        var top = headTop + head.offsetHeight + 14;
        var sig = W + 'x' + H + '|' + top + '|' + model.links.map(function (l) { return l.key + ':' + l.count; }).join(',') + '|' + model.cols.map(function (c) { return c.length; }).join('.');
        if (sig === lastSig) { statusPass(); return; }
        lastSig = sig;
        svg.setAttribute('width', W); svg.setAttribute('height', H);
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        blur.setAttribute('width', W + 80); blur.setAttribute('height', H + 80);
        blurFe.setAttribute('stdDeviation', f1(clamp(H / 64, 4, 12)));
        apply(layout(model, W, H, top), instant);
      }

      var offs = [
        wb.on('task', function () { dirty = true; }),
        wb.on('role', function () { dirty = true; statusDirty = true; })
      ];
      var timer = setInterval(function () {
        if (dead) return;
        if (!lastSig && Date.now() - lastBuild >= 600) { rebuild(false); return; }   // 挂载时容器还是 0 尺寸
        if (dirty && Date.now() - lastBuild >= 900) { dirty = false; statusDirty = false; rebuild(false); }
        else if (statusDirty) { statusDirty = false; statusPass(); }
      }, 300);

      function scheduleResize() {
        if (rzRaf || dead) return;
        rzRaf = requestAnimationFrame(function () { rzRaf = 0; rebuild(true); });
      }
      var ro = null;
      if (typeof window.ResizeObserver === 'function') {
        ro = new window.ResizeObserver(scheduleResize);
        ro.observe(host);
      }

      rebuild(false);   // 首帧：能量带从中线“长”出来（降低动效时直接到位）

      return {
        resize: function () { lastSig = ''; rebuild(true); },
        destroy: function () {
          dead = true;
          clearInterval(timer);
          if (raf) cancelAnimationFrame(raf);
          if (rzRaf) cancelAnimationFrame(rzRaf);
          raf = rzRaf = 0;
          offs.forEach(function (off) { try { off(); } catch (e) { /* ignore */ } });
          offs = [];
          if (ro) { ro.disconnect(); ro = null; }
          if (root.parentNode) root.parentNode.removeChild(root);
          links = {}; nodes = {}; cur = {};
        }
      };
    }
  });
})();
