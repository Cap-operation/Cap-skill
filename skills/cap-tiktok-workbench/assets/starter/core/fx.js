/* 视觉层：背景氛围、开场动画、完成任务的庆祝特效、动感强度、品牌色。
 * 全部由公司配置 theme 里的字段控制（见 references/state-contract.md），零件不用改。
 *   theme.fx        背景氛围：grid | stars | rain | aurora | bokeh | scan | none（可写成数组叠加）
 *   theme.motion    动感强度：calm | normal | wild
 *   theme.celebrate 老板任务完成时：fireworks | confetti | comet | none
 *   theme.opening   开场：boot（开机自检）| reveal（Logo 亮相）| none
 *   theme.accent / accent2  品牌色（覆盖配色的主色）
 */
(function () {
  'use strict';
  var WB = window.Workbench;
  var FX = window.WorkbenchFX = {};
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }

  function css(name, fb) { return getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || fb; }
  function rgba(hex, a) {
    var h = String(hex || '#35e0ff').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  FX.motion = function () { var m = (WB.company && WB.company.theme && WB.company.theme.motion) || 'normal'; return m; };
  FX.motionFactor = function () { return { calm: 0.65, normal: 1, wild: 1.6 }[FX.motion()] || 1; };

  /* ---------- 品牌色 ---------- */
  FX.applyBrand = function (theme) {
    var root = document.documentElement.style;
    if (theme.accent) { root.setProperty('--accent', theme.accent); root.setProperty('--c1', theme.accent); root.setProperty('--glow', '0 0 18px ' + rgba(theme.accent, 0.4)); }
    if (theme.accent2) { root.setProperty('--accent2', theme.accent2); root.setProperty('--c2', theme.accent2); }
    document.documentElement.setAttribute('data-motion', FX.motion());
  };

  /* ---------- 背景氛围 ---------- */
  var bg = null;
  FX.background = function (theme) {
    var list = theme.fx == null ? ['grid'] : [].concat(theme.fx);
    document.body.classList.toggle('fx-nogrid', list.indexOf('grid') === -1);
    document.body.classList.toggle('fx-scan', list.indexOf('scan') !== -1);
    document.body.classList.toggle('fx-on', list.length > 0); // 面板变毛玻璃，让背景透出来
    var drawers = list.filter(function (k) { return ['stars', 'rain', 'aurora', 'bokeh'].indexOf(k) !== -1; });
    if (bg) { cancelAnimationFrame(bg.raf); bg.canvas.remove(); bg = null; }
    if (!drawers.length) return;
    var c = document.createElement('canvas');
    c.className = 'fx-bg';
    document.body.insertBefore(c, document.body.firstChild);
    var g = c.getContext('2d'), W = 0, H = 0, D = Math.min(2, window.devicePixelRatio || 1);
    var stars = [], drops = [], blobs = [], dots = [], shoot = null, t = 0, last = 0;
    function size() {
      W = innerWidth; H = innerHeight; c.width = W * D; c.height = H * D; g.setTransform(D, 0, 0, D, 0, 0);
      stars = []; for (var i = 0; i < Math.round(W * H / 5200); i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + 0.6, p: Math.random() * 6 });
      drops = []; for (var j = 0; j < Math.round(W / 22); j++) drops.push({ x: j * 22 + 6, y: Math.random() * H, v: 40 + Math.random() * 90, len: 8 + Math.floor(Math.random() * 16) });
      blobs = [0, 1, 2].map(function (k) { return { k: k, ph: Math.random() * 6 }; });
      dots = []; for (var d = 0; d < 26; d++) dots.push({ x: Math.random() * W, y: Math.random() * H, r: 6 + Math.random() * 26, v: 6 + Math.random() * 14, a: 0.04 + Math.random() * 0.08 });
    }
    var chars = '01アイウエオカキクケコABCDEF$%#';
    function frame(now) {
      bg.raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      var k = reduced ? 0 : FX.motionFactor(); t += dt * k;
      if (reduced && t > 0.01) return;
      g.clearRect(0, 0, W, H);
      var acc = css('accent', '#35e0ff'), acc2 = css('accent2', '#ff3df2');
      if (drawers.indexOf('aurora') !== -1) {
        blobs.forEach(function (b) {
          var x = W * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.08 + b.ph + b.k * 2))), y = H * (0.2 + 0.25 * b.k + 0.08 * Math.sin(t * 0.11 + b.ph));
          var r = Math.max(W, H) * 0.42, gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, rgba(b.k === 1 ? acc2 : acc, 0.28)); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
        });
      }
      if (drawers.indexOf('stars') !== -1) {
        stars.forEach(function (s) { g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.9 + s.p)); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.r, s.r); });
        g.globalAlpha = 1;
        if (!shoot && Math.random() < 0.004 * k) shoot = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.4, life: 0 };
        if (shoot) {
          shoot.life += dt * 1.4; var sx = shoot.x + shoot.life * 520, sy = shoot.y + shoot.life * 220;
          var lg = g.createLinearGradient(sx - 120, sy - 50, sx, sy); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(255,255,255,.9)');
          g.strokeStyle = lg; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx - 120, sy - 50); g.lineTo(sx, sy); g.stroke();
          if (shoot.life > 1.2) shoot = null;
        }
      }
      if (drawers.indexOf('rain') !== -1) {
        g.font = '13px "SF Mono", Consolas, monospace';
        drops.forEach(function (d) {
          d.y += d.v * dt * k; if (d.y - d.len * 15 > H) d.y = -20;
          for (var i = 0; i < d.len; i++) {
            g.fillStyle = i === 0 ? rgba(acc, 0.9) : rgba(acc, 0.42 * (1 - i / d.len));
            g.fillText(chars[(Math.floor(t * 8) + i * 7 + d.x) % chars.length], d.x, d.y - i * 15);
          }
        });
      }
      if (drawers.indexOf('bokeh') !== -1) {
        dots.forEach(function (d) {
          d.y -= d.v * dt * k; if (d.y < -40) { d.y = H + 40; d.x = Math.random() * W; }
          var gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r); gr.addColorStop(0, rgba(d.r > 20 ? acc2 : acc, d.a * 3.6)); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
        });
      }
    }
    size(); addEventListener('resize', size);
    bg = { canvas: c, raf: requestAnimationFrame(frame) };
  };

  /* ---------- 庆祝特效（老板派的任务完成时） ---------- */
  var top = null;
  function overlay() {
    if (top) return top;
    var c = document.createElement('canvas'); c.className = 'fx-top'; document.body.appendChild(c);
    var g = c.getContext('2d'), D = Math.min(2, window.devicePixelRatio || 1), parts = [], raf = 0;
    function size() { c.width = innerWidth * D; c.height = innerHeight * D; g.setTransform(D, 0, 0, D, 0, 0); }
    size(); addEventListener('resize', size);
    function loop() {
      g.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(function (p) { return p.life < p.max; });
      parts.forEach(function (p) {
        p.life += 1 / 60; p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        var a = Math.max(0, 1 - p.life / p.max);
        g.save(); g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color;
        if (p.kind === 'paper') g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        else if (p.kind === 'trail') { g.shadowColor = p.color; g.shadowBlur = 16; g.fillRect(-p.s * 6, -1, p.s * 6, 2); }
        else { g.shadowColor = p.color; g.shadowBlur = 10; g.beginPath(); g.arc(0, 0, p.s, 0, Math.PI * 2); g.fill(); }
        g.restore();
      });
      raf = parts.length ? requestAnimationFrame(loop) : 0;
    }
    top = { add: function (arr) { parts = parts.concat(arr); if (!raf) raf = requestAnimationFrame(loop); } };
    return top;
  }
  function palette() { return [css('accent', '#35e0ff'), css('accent2', '#ff3df2'), css('ok', '#3dffa8'), css('boss', '#ffe14d'), css('c5', '#8b7bff')]; }
  FX.celebrate = function (kind, x, y) {
    if (reduced || !kind || kind === 'none') return;
    var o = overlay(), cols = palette(), arr = [], k = FX.motionFactor();
    x = x == null ? innerWidth / 2 : x; y = y == null ? innerHeight * 0.4 : y;
    if (kind === 'fireworks') {
      [0, 1, 2].forEach(function (b) {
        var bx = x + (b - 1) * innerWidth * 0.18, by = y - 40 + Math.random() * 80, col = cols[b % cols.length];
        for (var i = 0; i < Math.round(46 * k); i++) {
          var ang = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
          arr.push({ kind: 'spark', x: bx, y: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, grav: 0.06, drag: 0.975, rot: 0, vr: 0, s: 1.6 + Math.random() * 1.6, color: col, life: -b * 0.25, max: 1.5 });
        }
      });
    } else if (kind === 'confetti') {
      for (var i = 0; i < Math.round(130 * k); i++) {
        arr.push({ kind: 'paper', x: Math.random() * innerWidth, y: -20 - Math.random() * 160, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, grav: 0.04, drag: 0.99, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 7 + Math.random() * 6, color: cols[i % cols.length], life: 0, max: 3.2 });
      }
    } else if (kind === 'comet') {
      for (var c2 = 0; c2 < Math.round(5 * k); c2++) {
        var sy = innerHeight * (0.15 + Math.random() * 0.5);
        arr.push({ kind: 'trail', x: -40 - c2 * 90, y: sy, vx: 16 + Math.random() * 6, vy: -1 - Math.random(), grav: 0, drag: 1, rot: -0.07, vr: 0, s: 6, color: cols[c2 % cols.length], life: 0, max: 1.6 });
      }
    }
    o.add(arr);
  };

  /* ---------- 开场动画 ---------- */
  FX.opening = function (kind, company, done) {
    if (reduced || !kind || kind === 'none') { if (done) done(); return; }
    var co = company.company || {}, roles = company.roles || [];
    var el = document.createElement('div');
    el.className = 'fx-open fx-open-' + kind;
    var mark = co.mark || (co.name || 'O').slice(0, 1);
    el.innerHTML = '<div class="fx-open-in"><div class="fx-open-mark">' + mark + '</div><div class="fx-open-name"></div>' +
      '<div class="fx-open-sub">' + (co.slogan || '一个人，就是一家公司') + '</div><div class="fx-open-log mono"></div><div class="fx-open-skip">点击任意处跳过</div></div>';
    document.body.appendChild(el);
    var name = co.name || '我的 OPC 公司', nameEl = el.querySelector('.fx-open-name'), logEl = el.querySelector('.fx-open-log');
    var i = 0, timers = [], finished = false;
    function finish() {
      if (finished) return; finished = true;
      timers.forEach(clearTimeout); el.classList.add('out');
      setTimeout(function () { el.remove(); if (done) done(); }, 600);
    }
    el.addEventListener('click', finish);
    (function type() { nameEl.textContent = name.slice(0, ++i); if (i < name.length) timers.push(setTimeout(type, 70)); })();
    if (kind === 'boot') {
      var lines = ['> 唤醒 AI 团队 …'].concat(roles.map(function (r) { return '> ' + r.name + ' · 上线 ✓'; })).concat(['> 全员到岗 ' + roles.length + '/' + roles.length + '，等待老板下令']);
      lines.forEach(function (l, k) { timers.push(setTimeout(function () { var d = document.createElement('div'); d.textContent = l; logEl.appendChild(d); }, 500 + k * 230)); });
      timers.push(setTimeout(finish, 900 + lines.length * 230 + 700));
    } else {
      timers.push(setTimeout(finish, 2600));
    }
  };
})();
