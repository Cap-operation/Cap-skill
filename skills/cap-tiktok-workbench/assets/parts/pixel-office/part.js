/* 零件：像素办公室 pixel-office
 * 每个 AI 岗位是一个像素小人：待命时可能去咖啡角闲逛，接到任务走回工位干活，
 * 干完走到老板桌前汇报，再回工位。只读 Workbench 状态，不自己造任务。
 *
 * 家具绘制与角色像素图改编自 Claw-Empire：
 *   Copyright 2026 GreenSheep01201. Licensed under the Apache License, Version 2.0.
 *   https://github.com/GreenSheep01201/claw-empire  (commit 66a24ea7df2435ef897c48c147deb7ec572c01c2)
 *   经船长OPC工作台改写为 Canvas 2D；本零件再改为按任意岗位数自动布局、接统一数据插座。
 *   许可证见同目录 LICENSE；角色图已等比缩小，未改画面内容。
 */
(function () {
  'use strict';

  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/[^/]*$/, '') : 'parts/pixel-office/';
  })();
  var FONT = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  var MONO = '"SF Mono", Consolas, monospace';
  var spriteCache = {};

  function sprite(key, onload) {
    var c = spriteCache[key];
    if (!c) {
      c = spriteCache[key] = { img: new Image(), ready: false, cbs: [] };
      c.img.onload = function () { c.ready = true; c.cbs.forEach(function (f) { f(); }); c.cbs = []; };
      c.img.src = BASE + 'sprites/' + key + '.png';
    }
    if (!c.ready && onload) c.cbs.push(onload);
    return c.ready ? c.img : null;
  }

  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- Claw-Empire 家具（Apache-2.0）+ 迷你场景图 ---------- */
  var K = (function () {
    var TILE = 20, DESK_W = 48, DESK_H = 26;
    var OFFICE_PASTEL = { creamWhite: 0xf8f3ec, creamDeep: 0xebdfcf, softMint: 0xbfded5, softMintDeep: 0x8fbcb0, dustyRose: 0xd5a5ae, dustyRoseDeep: 0xb67d89, warmSand: 0xd6b996, warmWood: 0xb8906d, cocoa: 0x6f4d3a, ink: 0x2f2530, slate: 0x586378 };
    function Container() {
      var self = this;
      this.children = []; this.x = 0; this.y = 0; this.rotation = 0; this.alpha = 1; this.sx = 1; this.sy = 1;
      this.position = { set: function (x, y) { self.x = x; self.y = y; } };
      this.scale = { set: function (x, y) { self.sx = x; self.sy = y == null ? x : y; } };
    }
    Container.prototype.addChild = function (child) { this.children.push(child); return child; };
    function Graphics() { Container.call(this); this.commands = []; }
    Graphics.prototype = Object.create(Container.prototype);
    ['rect', 'roundRect', 'circle', 'ellipse', 'moveTo', 'lineTo', 'quadraticCurveTo', 'star', 'fill', 'stroke'].forEach(function (name) {
      Graphics.prototype[name] = function () { this.commands.push({ name: name, args: Array.prototype.slice.call(arguments) }); return this; };
    });
    function css(value) { return typeof value === 'number' ? '#' + ('000000' + value.toString(16)).slice(-6) : value; }
    function paintNode(node, target) {
      target.save(); target.translate(node.x || 0, node.y || 0); target.rotate(node.rotation || 0); target.scale(node.sx == null ? 1 : node.sx, node.sy == null ? 1 : node.sy); target.globalAlpha *= node.alpha == null ? 1 : node.alpha;
      var newPath = true;
      (node.commands || []).forEach(function (command) {
        var a = command.args, n = command.name;
        if (n === 'fill' || n === 'stroke') {
          var spec = typeof a[0] === 'object' ? a[0] : { color: a[0] };
          target.save(); target.globalAlpha *= spec.alpha == null ? 1 : spec.alpha;
          if (n === 'fill') { target.fillStyle = css(spec.color); target.fill(); }
          else { target.strokeStyle = css(spec.color); target.lineWidth = spec.width || 1; target.lineJoin = 'round'; target.stroke(); }
          target.restore(); newPath = true;
        } else {
          if (newPath || ['rect', 'roundRect', 'circle', 'ellipse', 'star'].indexOf(n) >= 0) { target.beginPath(); newPath = false; }
          if (n === 'rect') target.rect(a[0], a[1], a[2], a[3]);
          else if (n === 'roundRect') { if (target.roundRect) target.roundRect(a[0], a[1], a[2], a[3], Math.min(a[4] || 0, Math.abs(a[2]) / 2, Math.abs(a[3]) / 2)); else target.rect(a[0], a[1], a[2], a[3]); }
          else if (n === 'circle') target.arc(a[0], a[1], Math.max(0, a[2]), 0, Math.PI * 2);
          else if (n === 'ellipse') target.ellipse(a[0], a[1], Math.max(0, a[2]), Math.max(0, a[3]), 0, 0, Math.PI * 2);
          else if (n === 'moveTo') target.moveTo(a[0], a[1]);
          else if (n === 'lineTo') target.lineTo(a[0], a[1]);
          else if (n === 'quadraticCurveTo') target.quadraticCurveTo(a[0], a[1], a[2], a[3]);
          else if (n === 'star') {
            for (var i = 0; i < a[2] * 2; i += 1) {
              var angle = (a[5] || 0) + i * Math.PI / a[2] - Math.PI / 2, radius = i % 2 ? a[4] : a[3];
              var sx = a[0] + Math.cos(angle) * radius, sy = a[1] + Math.sin(angle) * radius;
              if (i) target.lineTo(sx, sy); else target.moveTo(sx, sy);
            }
            target.closePath();
          }
        }
      });
      node.children.forEach(function (child) { paintNode(child, target); }); target.restore();
    }
    function at(parent, x, y, scale, painter) {
      var node = new Container(); node.position.set(x, y); node.scale.set(scale); painter(node); parent.addChild(node); return node;
    }
    // Adapted Apache-2.0 furniture source: drawing-core.ts
    function hashStr(s        )         {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return Math.abs(h);
    }
    
    function blendColor(from        , to        , t        )         {
      const clamped = Math.max(0, Math.min(1, t));
      const fr = (from >> 16) & 0xff;
      const fg = (from >> 8) & 0xff;
      const fb = from & 0xff;
      const tr = (to >> 16) & 0xff;
      const tg = (to >> 8) & 0xff;
      const tb = to & 0xff;
      const r = Math.round(fr + (tr - fr) * clamped);
      const g = Math.round(fg + (tg - fg) * clamped);
      const b = Math.round(fb + (tb - fb) * clamped);
      return (r << 16) | (g << 8) | b;
    }
    
    function isLightColor(color        )          {
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 150;
    }
    
    function contrastTextColor(
      bgColor        ,
      darkColor         = OFFICE_PASTEL.ink,
      lightColor         = 0xffffff,
    )         {
      return isLightColor(bgColor) ? darkColor : lightColor;
    }
    
    function drawBandGradient(
      g          ,
      x        ,
      y        ,
      w        ,
      h        ,
      from        ,
      to        ,
      bands         = 8,
      alpha         = 1,
    )       {
      const safeBands = Math.max(2, bands);
      const bandH = h / safeBands;
      for (let i = 0; i < safeBands; i++) {
        const color = blendColor(from, to, i / (safeBands - 1));
        g.rect(x, y + i * bandH, w, bandH + 0.75).fill({ color, alpha });
      }
    }
    
    function drawBunting(
      parent           ,
      x        ,
      y        ,
      w        ,
      colorA        ,
      colorB        ,
      alpha         = 0.7,
    )       {
      const g = new Graphics();
      g.moveTo(x, y)
        .lineTo(x + w, y)
        .stroke({ width: 1, color: 0x33261a, alpha: 0.6 });
      const flagCount = Math.max(6, Math.floor(w / 24));
      const step = w / flagCount;
      for (let i = 0; i < flagCount; i++) {
        const fx = x + i * step + step / 2;
        const fy = y + (i % 2 === 0 ? 1 : 2.5);
        g.moveTo(fx - 4.2, fy)
          .lineTo(fx + 4.2, fy)
          .lineTo(fx, fy + 6.2)
          .fill({ color: i % 2 === 0 ? colorA : colorB, alpha });
        g.moveTo(fx, fy)
          .lineTo(fx, fy + 1.8)
          .stroke({ width: 0.5, color: 0xffffff, alpha: 0.14 });
      }
      parent.addChild(g);
    }
    
    function drawRoomAtmosphere(
      parent           ,
      x        ,
      y        ,
      w        ,
      h        ,
      wallColor        ,
      accent        ,
    )       {
      const g = new Graphics();
      const topPanelH = Math.max(20, Math.min(34, h * 0.22));
      drawBandGradient(
        g,
        x + 1,
        y + 1,
        w - 2,
        topPanelH,
        blendColor(wallColor, 0xffffff, 0.24),
        blendColor(wallColor, 0xffffff, 0.05),
        7,
        0.75,
      );
      g.rect(x + 1, y + topPanelH + 1, w - 2, 1.2).fill({ color: blendColor(wallColor, 0xffffff, 0.3), alpha: 0.28 });
      g.rect(x + 1, y + h - 14, w - 2, 10).fill({ color: blendColor(wallColor, 0x000000, 0.5), alpha: 0.14 });
      g.rect(x + 3, y + h - 14, w - 6, 1).fill({ color: blendColor(accent, 0xffffff, 0.45), alpha: 0.22 });
      parent.addChild(g);
    }
    
    /* ================================================================== */
    /*  Drawing helpers                                                    */
    /* ================================================================== */
    
    function drawTiledFloor(g, x, y, w, h, c1, c2) {
      for (var ty = 0; ty < h; ty += TILE) for (var tx = 0; tx < w; tx += TILE) {
        var even = ((tx / TILE + ty / TILE) & 1) === 0;
        g.rect(x + tx, y + ty, Math.min(TILE + 1, w - tx), Math.min(TILE + 1, h - ty)).fill(even ? c1 : c2);
      }
    }
    
    /** Draw a soft ambient glow (radial gradient approximation using concentric ellipses) */
    function drawAmbientGlow(
      parent           ,
      cx        ,
      cy        ,
      radius        ,
      color        ,
      alpha         = 0.15,
    ) {
      const g = new Graphics();
      const steps = 6;
      for (let i = steps; i >= 1; i--) {
        const r = radius * (i / steps);
        const a = alpha * (1 - i / (steps + 1));
        g.ellipse(cx, cy, r, r * 0.6).fill({ color, alpha: a });
      }
      parent.addChild(g);
      return g;
    }
    
    /** Draw a small window on the wall with warm sunlight filter and curtains */
    function drawWindow(parent           , x        , y        , w         = 24, h         = 18) {
      const g = new Graphics();
      // Outer frame shadow
      g.roundRect(x + 1.5, y + 1.5, w, h, 2).fill({ color: 0x000000, alpha: 0.12 });
      // Frame (warmer wood-tone)
      g.roundRect(x, y, w, h, 2).fill(0x8a7a68);
      g.roundRect(x, y, w, h, 2).stroke({ width: 0.5, color: 0xa09080, alpha: 0.4 });
      // Glass panes (warm sky gradient tones)
      const pw = (w - 5) / 2,
        ph = (h - 5) / 2;
      g.rect(x + 2, y + 2, pw, ph).fill(0x8abcdd);
      g.rect(x + pw + 3, y + 2, pw, ph).fill(0x9accee);
      g.rect(x + 2, y + ph + 3, pw, ph).fill(0x9accee);
      g.rect(x + pw + 3, y + ph + 3, pw, ph).fill(0x8abcdd);
      // Cloud silhouettes (more puffy)
      g.circle(x + 6, y + 5, 1.5).fill({ color: 0xffffff, alpha: 0.2 });
      g.circle(x + 8, y + 5.5, 2.2).fill({ color: 0xffffff, alpha: 0.18 });
      g.circle(x + 10, y + 5.8, 1.8).fill({ color: 0xffffff, alpha: 0.16 });
      g.circle(x + w - 7, y + h - 7, 1.5).fill({ color: 0xffffff, alpha: 0.14 });
      g.circle(x + w - 9, y + h - 6.5, 1.8).fill({ color: 0xffffff, alpha: 0.12 });
      // Warm sunlight overlay on glass
      g.rect(x + 2, y + 2, w - 4, h - 4).fill({ color: 0xffe8a0, alpha: 0.1 });
      // Grid bars (wooden mullions)
      g.rect(x + w / 2 - 0.6, y + 2, 1.2, h - 4).fill({ color: 0x7a6a58, alpha: 0.4 });
      g.rect(x + 2, y + h / 2 - 0.5, w - 4, 1).fill({ color: 0x7a6a58, alpha: 0.35 });
      // Reflection highlight (brighter, diagonal)
      g.moveTo(x + 3, y + 3)
        .lineTo(x + 8, y + 3)
        .lineTo(x + 3, y + 6.5)
        .fill({ color: 0xffffff, alpha: 0.28 });
      g.rect(x + pw + 4, y + 3, 3, 2).fill({ color: 0xffffff, alpha: 0.12 });
      // Mini curtains (soft dusty rose)
      g.moveTo(x + 1, y + 1)
        .quadraticCurveTo(x + 3, y + h * 0.4, x + 1, y + h - 2)
        .stroke({ width: 1.5, color: 0xd8b0b8, alpha: 0.35 });
      g.moveTo(x + w - 1, y + 1)
        .quadraticCurveTo(x + w - 3, y + h * 0.4, x + w - 1, y + h - 2)
        .stroke({ width: 1.5, color: 0xd8b0b8, alpha: 0.35 });
      // Curtain top valance
      g.roundRect(x, y, w, 2, 1).fill({ color: 0xd8b0b8, alpha: 0.25 });
      // Sill (warmer wood) with tiny plant
      g.rect(x - 2, y + h, w + 4, 3).fill(0x8a7a68);
      g.rect(x - 2, y + h, w + 4, 1.2).fill({ color: 0xa09080, alpha: 0.3 });
      // Tiny windowsill plant
      g.circle(x + w / 2, y + h - 1, 2).fill(0x7cb898);
      g.circle(x + w / 2 - 1, y + h - 2, 1.5).fill(0x92c8aa);
      g.roundRect(x + w / 2 - 1.5, y + h, 3, 2, 0.5).fill(0xd88060);
      // Sunlight beam cast below window (warm ambient glow on floor)
      g.moveTo(x, y + h + 3)
        .lineTo(x + w, y + h + 3)
        .lineTo(x + w + 8, y + h + 22)
        .lineTo(x - 8, y + h + 22)
        .fill({ color: 0xffeebb, alpha: 0.05 });
      g.moveTo(x + 2, y + h + 5)
        .lineTo(x + w - 2, y + h + 5)
        .lineTo(x + w + 4, y + h + 16)
        .lineTo(x - 4, y + h + 16)
        .fill({ color: 0xffeebb, alpha: 0.03 });
      // Warm sunlight streaming through window
      g.rect(x + 1, y + h + 3, w - 2, 12).fill({ color: 0xfff4d0, alpha: 0.05 });
      parent.addChild(g);
      return g;
    }
    
    /** Draw a small wall clock with shadow and detail */
    function drawWallClock(parent           , x        , y        ) {
      const clock = new Container();
      clock.position.set(x, y);
    
      const g = new Graphics();
      // Shadow behind clock
      g.circle(1, 1, 8).fill({ color: 0x000000, alpha: 0.12 });
      // Outer ring (frame)
      g.circle(0, 0, 8).fill(0xdddddd);
      g.circle(0, 0, 8).stroke({ width: 1.8, color: 0x555555 });
      // Inner face
      g.circle(0, 0, 6.5).fill(0xfcfcf8);
      // Hour marks (thicker at 12/3/6/9)
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
        const r = 5.2;
        const isCardinal = i % 3 === 0;
        g.circle(Math.cos(angle) * r, Math.sin(angle) * r, isCardinal ? 0.6 : 0.35).fill(0x333333);
      }
      clock.addChild(g);
    
      const hourHand = new Graphics();
      hourHand.moveTo(0, 0).lineTo(0, -3.5).stroke({ width: 1, color: 0x222222 });
      clock.addChild(hourHand);
    
      const minuteHand = new Graphics();
      minuteHand.moveTo(0, 0).lineTo(0, -5.2).stroke({ width: 0.7, color: 0x444444 });
      clock.addChild(minuteHand);
    
      const secondHand = new Graphics();
      secondHand.moveTo(0, 1.6).lineTo(0, -5.8).stroke({ width: 0.35, color: 0xcc3333 });
      clock.addChild(secondHand);
    
      // Center dot
      const center = new Graphics();
      center.circle(0, 0, 1).fill(0xcc3333);
      center.circle(0, 0, 0.5).fill(0xff5555);
      clock.addChild(center);
    
      const visual                  = { hourHand, minuteHand, secondHand };
      applyWallClockTime(visual, new Date());
    
      parent.addChild(clock);
      return visual;
    }
    
    function applyWallClockTime(clock                 , now      )       {
      const minuteValue = now.getMinutes() + now.getSeconds() / 60;
      const hourValue = (now.getHours() % 12) + minuteValue / 60;
      const secondValue = now.getSeconds() + now.getMilliseconds() / 1000;
      clock.minuteHand.rotation = (minuteValue / 60) * Math.PI * 2;
      clock.hourHand.rotation = (hourValue / 12) * Math.PI * 2;
      clock.secondHand.rotation = (secondValue / 60) * Math.PI * 2;
    }
    
    /** Draw a small picture frame on the wall */
    function drawPictureFrame(parent           , x        , y        ) {
      const g = new Graphics();
      g.roundRect(x, y, 16, 12, 1).fill(0x8b6914);
      g.rect(x + 1.5, y + 1.5, 13, 9).fill(0x445577);
      // Tiny landscape
      g.rect(x + 1.5, y + 7, 13, 3.5).fill(0x448844);
      g.circle(x + 11, y + 4, 1.5).fill(0xffdd44);
      parent.addChild(g);
      return g;
    }
    
    /** Draw a small rug/carpet under desk area */
    function drawRug(parent           , cx        , cy        , w        , h        , color        ) {
      const g = new Graphics();
      g.roundRect(cx - w / 2, cy - h / 2, w, h, 3).fill({ color, alpha: 0.3 });
      // Border pattern
      g.roundRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4, 2).stroke({ width: 0.8, color, alpha: 0.2 });
      // Inner pattern
      g.roundRect(cx - w / 2 + 5, cy - h / 2 + 5, w - 10, h - 10, 1).stroke({ width: 0.4, color: 0xffffff, alpha: 0.06 });
      parent.addChild(g);
      return g;
    }
    
    /** Draw a ceiling light fixture */
    function drawCeilingLight(parent           , x        , y        , color        ) {
      const g = new Graphics();
      // Soft outer glow
      g.ellipse(x, y + 10, 20, 6).fill({ color: 0xfff5dd, alpha: 0.04 });
      // Light cone (downward, warm metal)
      g.rect(x - 2, y, 4, 3).fill(0x908070);
      g.rect(x - 5, y + 3, 10, 2).fill(0xb8a890);
      // Bulb highlight
      g.rect(x - 1, y + 1, 2, 2).fill({ color: 0xffffff, alpha: 0.2 });
      // Warm glow
      g.ellipse(x, y + 8, 16, 5).fill({ color, alpha: 0.06 });
      g.ellipse(x, y + 7, 10, 3.5).fill({ color, alpha: 0.1 });
      g.ellipse(x, y + 6, 5, 2).fill({ color: 0xfff5dd, alpha: 0.08 });
      parent.addChild(g);
      return g;
    }
    
    /** Draw a trash can */
    function drawTrashCan(parent           , x        , y        ) {
      const g = new Graphics();
      // Can body (trapezoid-ish)
      g.roundRect(x - 4, y, 8, 10, 1).fill(0x777788);
      g.roundRect(x - 4.5, y - 1, 9, 2, 1).fill(0x888899);
      // Paper sticking out
      g.roundRect(x - 2, y - 3, 4, 3, 0.5).fill(0xeeeeee);
      parent.addChild(g);
      return g;
    }
    
    /** Draw a water cooler */
    function drawWaterCooler(parent           , x        , y        ) {
      const g = new Graphics();
      // Base
      g.roundRect(x - 5, y + 10, 10, 14, 1).fill(0xdddddd);
      // Water bottle
      g.roundRect(x - 4, y, 8, 12, 3).fill(0x88ccff);
      g.roundRect(x - 4, y, 8, 12, 3).stroke({ width: 0.5, color: 0x66aadd });
      // Water level
      g.rect(x - 3, y + 3, 6, 8).fill({ color: 0x44aaff, alpha: 0.4 });
      // Tap
      g.rect(x + 3, y + 16, 3, 2).fill(0x999999);
      parent.addChild(g);
      return g;
    }
    
    
    // Adapted Apache-2.0 furniture source: drawing-furniture-a.ts
    function drawDesk(parent           , dx        , dy        , working         )           {
      const g = new Graphics();
      // Shadow (softer, multi-layer)
      g.ellipse(dx + DESK_W / 2, dy + DESK_H + 4, DESK_W / 2 + 6, 6).fill({ color: 0x000000, alpha: 0.06 });
      g.ellipse(dx + DESK_W / 2, dy + DESK_H + 3, DESK_W / 2 + 4, 5).fill({ color: 0x000000, alpha: 0.1 });
      g.ellipse(dx + DESK_W / 2, dy + DESK_H + 2, DESK_W / 2 + 2, 3.5).fill({ color: 0x000000, alpha: 0.12 });
      // Desk legs (subtle, peeking below)
      g.roundRect(dx + 3, dy + DESK_H - 2, 3, 6, 1).fill(0xb89060);
      g.roundRect(dx + DESK_W - 6, dy + DESK_H - 2, 3, 6, 1).fill(0xb89060);
      // Desk body (warm wood grain with richer layering)
      g.roundRect(dx, dy, DESK_W, DESK_H, 3).fill(0xbe9860);
      g.roundRect(dx + 1, dy + 1, DESK_W - 2, DESK_H - 2, 2).fill(0xd4b478);
      g.roundRect(dx + 2, dy + 2, DESK_W - 4, DESK_H - 4, 1.5).fill(0xe0c490);
      // Subtle desk-top gradient (warm highlight)
      g.roundRect(dx + 2, dy + 2, DESK_W - 4, 6, 1).fill({ color: 0xf5dca0, alpha: 0.25 });
      // Wood grain lines (warm, varied width)
      for (let i = 0; i < 4; i++) {
        const w = 0.25 + (i % 2) * 0.1;
        g.moveTo(dx + 4, dy + 5 + i * 5.5)
          .lineTo(dx + DESK_W - 4, dy + 5 + i * 5.5)
          .stroke({ width: w, color: 0xc4a060, alpha: 0.2 });
      }
      // Desk edge highlight (warmer, with bottom shadow)
      g.moveTo(dx + 2, dy + 1)
        .lineTo(dx + DESK_W - 2, dy + 1)
        .stroke({ width: 0.6, color: 0xf0d890, alpha: 0.45 });
      g.moveTo(dx + 2, dy + DESK_H - 1)
        .lineTo(dx + DESK_W - 2, dy + DESK_H - 1)
        .stroke({ width: 0.5, color: 0xa88050, alpha: 0.2 });
      // ── Keyboard at TOP (closest to character above) ──
      g.roundRect(dx + DESK_W / 2 - 10, dy + 2, 20, 7, 1.5).fill(0x788498);
      g.roundRect(dx + DESK_W / 2 - 10, dy + 2, 20, 7, 1.5).stroke({ width: 0.3, color: 0x5c6a80, alpha: 0.5 });
      // Keyboard highlight
      g.moveTo(dx + DESK_W / 2 - 8, dy + 2.5)
        .lineTo(dx + DESK_W / 2 + 8, dy + 2.5)
        .stroke({ width: 0.4, color: 0xffffff, alpha: 0.1 });
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 6; c++) {
          g.roundRect(dx + DESK_W / 2 - 8 + c * 2.8, dy + 3.2 + r * 2.6, 2, 1.6, 0.3).fill(0xd4d9e6);
        }
      }
      // Spacebar
      g.roundRect(dx + DESK_W / 2 - 5, dy + 3.2 + 5.2, 10, 1.4, 0.3).fill(0xd4d9e6);
      // Paper stack (left, with slight rotation feel)
      g.ellipse(dx + 7, dy + 14, 6, 2).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.06 });
      g.rect(dx + 3, dy + 3, 9, 10).fill(0xf0e8dc);
      g.rect(dx + 3.5, dy + 2.5, 8.5, 10).fill(0xf4ede3);
      g.rect(dx + 4, dy + 2, 9, 10.5).fill(0xfffbf4);
      // Text lines on paper (more detailed)
      for (let i = 0; i < 4; i++) {
        const lw = 3 + ((i * 1.7) % 4);
        g.moveTo(dx + 5, dy + 4 + i * 2.2)
          .lineTo(dx + 5 + lw, dy + 4 + i * 2.2)
          .stroke({ width: 0.35, color: 0xb0a898, alpha: 0.3 + (i % 2) * 0.1 });
      }
      // Paper clip on paper
      g.moveTo(dx + 11, dy + 3)
        .lineTo(dx + 11, dy + 7)
        .stroke({ width: 0.5, color: 0xaaaaaa, alpha: 0.5 });
      g.moveTo(dx + 11, dy + 3)
        .quadraticCurveTo(dx + 13, dy + 3, dx + 13, dy + 5)
        .stroke({ width: 0.5, color: 0xaaaaaa, alpha: 0.5 });
      // Coffee mug (dusty rose accent, with steam)
      g.ellipse(dx + DESK_W - 8, dy + 8.5, 4.5, 1.8).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.07 });
      g.circle(dx + DESK_W - 8, dy + 7, 4.2).fill(0xf0dee5);
      g.circle(dx + DESK_W - 8, dy + 7, 4.2).stroke({ width: 0.5, color: 0xc5a0b0 });
      g.circle(dx + DESK_W - 8, dy + 7, 2.8).fill(0x8a6248);
      // Mug inner rim highlight
      g.circle(dx + DESK_W - 8, dy + 7, 2.8).stroke({ width: 0.3, color: 0xa07050, alpha: 0.4 });
      // Mug handle
      g.moveTo(dx + DESK_W - 3.8, dy + 5.5)
        .quadraticCurveTo(dx + DESK_W - 1.5, dy + 7, dx + DESK_W - 3.8, dy + 8.5)
        .stroke({ width: 0.9, color: 0xd7c0c9 });
      // Tiny steam wisps above mug
      g.moveTo(dx + DESK_W - 9, dy + 3)
        .quadraticCurveTo(dx + DESK_W - 10, dy + 1, dx + DESK_W - 9, dy - 0.5)
        .stroke({ width: 0.4, color: 0xcccccc, alpha: 0.2 });
      g.moveTo(dx + DESK_W - 7, dy + 3)
        .quadraticCurveTo(dx + DESK_W - 6, dy + 1, dx + DESK_W - 7, dy - 0.5)
        .stroke({ width: 0.4, color: 0xcccccc, alpha: 0.15 });
      // ── Monitor at BOTTOM (character looks down at it) ──
      const mx = dx + DESK_W / 2 - 10;
      const my = dy + DESK_H - 16;
      // Monitor shadow
      g.ellipse(mx + 10, my + 13, 11, 2.5).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.07 });
      // Monitor bezel
      g.roundRect(mx, my, 20, 13, 2).fill(0x3e4858);
      g.roundRect(mx, my, 20, 13, 2).stroke({ width: 0.6, color: 0x5a6678 });
      // Screen
      g.roundRect(mx + 1.5, my + 1, 17, 10, 1).fill(working ? 0x89c8b9 : 0x1e2836);
      if (working) {
        // Code lines on screen (colorful IDE look)
        const codeColors = [0xe1fff8, 0xf8d876, 0xa8d8ea, 0xf0b8c8];
        for (let i = 0; i < 4; i++) {
          const lineW = 3 + ((i * 2.3) % 7);
          const indent = i === 2 ? 2 : 0;
          g.moveTo(mx + 3.5 + indent, my + 2.5 + i * 2.2)
            .lineTo(mx + 3.5 + indent + lineW, my + 2.5 + i * 2.2)
            .stroke({ width: 0.7, color: codeColors[i % codeColors.length], alpha: 0.6 });
        }
        // Cursor blink line
        g.rect(mx + 4, my + 2.5, 0.5, 1.5).fill({ color: 0xffffff, alpha: 0.5 });
        // Screen glow on desk
        g.ellipse(mx + 10, my + 15, 12, 3).fill({ color: 0xa3ded1, alpha: 0.06 });
      } else {
        // Screensaver: tiny stars on dark screen
        g.circle(mx + 5, my + 4, 0.5).fill({ color: 0xffffff, alpha: 0.15 });
        g.circle(mx + 13, my + 6, 0.4).fill({ color: 0xffffff, alpha: 0.12 });
        g.circle(mx + 9, my + 8, 0.3).fill({ color: 0xffffff, alpha: 0.1 });
      }
      // Monitor webcam dot
      g.circle(mx + 10, my + 0.5, 0.6).fill({ color: 0x44dd66, alpha: 0.3 });
      // Monitor stand (slimmer, modern)
      g.rect(mx + 8, my - 2.5, 4, 3).fill(0x4e5a70);
      g.roundRect(mx + 5, my - 4, 10, 2, 1).fill(0x5e6a82);
      g.roundRect(mx + 5, my - 4, 10, 1, 1).fill({ color: 0x7a88a0, alpha: 0.3 });
      // Pencil holder (right of monitor, cuter)
      g.roundRect(dx + DESK_W - 7, dy + DESK_H - 11, 5, 7, 1.5).fill(0x9ab8c8);
      g.roundRect(dx + DESK_W - 7, dy + DESK_H - 11, 5, 7, 1.5).stroke({ width: 0.3, color: 0x7a9aac, alpha: 0.4 });
      // Pencils (varied colors)
      g.rect(dx + DESK_W - 6.5, dy + DESK_H - 15, 1, 5).fill(0xffcb76);
      g.rect(dx + DESK_W - 5.5, dy + DESK_H - 14, 1, 4).fill(0xd5a5ae);
      g.rect(dx + DESK_W - 4.5, dy + DESK_H - 13.5, 1, 3.5).fill(0x8abfd0);
      // Sticky notes near monitor (stack of 2 colors)
      g.roundRect(mx + 15, my + 1, 4, 4, 0.5).fill(0xf8dea8);
      g.roundRect(mx + 15.5, my + 0.5, 3.5, 3.5, 0.5).fill(0xfce8c0);
      g.moveTo(mx + 16, my + 2.5)
        .lineTo(mx + 18, my + 2.5)
        .stroke({ width: 0.3, color: 0xa5804f, alpha: 0.4 });
      g.moveTo(mx + 16, my + 3.5)
        .lineTo(mx + 17.5, my + 3.5)
        .stroke({ width: 0.3, color: 0xa5804f, alpha: 0.3 });
      // Tiny succulent on desk corner
      g.circle(dx + 3, dy + DESK_H - 4, 2.5).fill(0x7cb898);
      g.circle(dx + 2, dy + DESK_H - 5, 1.8).fill(0x92c8aa);
      g.circle(dx + 4, dy + DESK_H - 5, 1.5).fill(0x9dd9c2);
      g.roundRect(dx + 1, dy + DESK_H - 2, 4, 2.5, 0.8).fill(0xd88060);
      parent.addChild(g);
      return g;
    }
    
    function drawChair(parent           , cx        , cy        , color        ) {
      const g = new Graphics();
      const chairBase = blendColor(color, OFFICE_PASTEL.creamWhite, 0.18);
      const chairMid = blendColor(color, OFFICE_PASTEL.creamWhite, 0.08);
      const chairShadow = blendColor(color, OFFICE_PASTEL.ink, 0.22);
      const chairDark = blendColor(color, OFFICE_PASTEL.ink, 0.35);
      // Floor shadow
      g.ellipse(cx, cy + 5, 18, 6).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.08 });
      // Wheel base (star pattern)
      g.circle(cx - 8, cy + 3, 1.5).fill({ color: 0x555555, alpha: 0.3 });
      g.circle(cx + 8, cy + 3, 1.5).fill({ color: 0x555555, alpha: 0.3 });
      g.circle(cx, cy + 4, 1.5).fill({ color: 0x555555, alpha: 0.3 });
      // Seat cushion
      g.ellipse(cx, cy, 16, 10).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.06 });
      g.ellipse(cx, cy, 15, 9).fill(chairBase);
      g.ellipse(cx, cy, 15, 9).stroke({ width: 1, color: chairShadow, alpha: 0.25 });
      // Seat highlight (subtle dome)
      g.ellipse(cx - 1, cy - 1.5, 11, 5.5).fill({ color: 0xffffff, alpha: 0.12 });
      g.ellipse(cx, cy + 3, 10, 3).fill({ color: chairShadow, alpha: 0.08 });
      // Cushion stitch line
      g.ellipse(cx, cy, 10, 6).stroke({ width: 0.3, color: chairShadow, alpha: 0.12 });
      // Armrests (rounded, softer)
      g.roundRect(cx - 17, cy - 5, 5, 13, 2.5).fill(chairMid);
      g.roundRect(cx - 17, cy - 5, 5, 13, 2.5).stroke({ width: 0.5, color: chairShadow, alpha: 0.2 });
      g.roundRect(cx + 12, cy - 5, 5, 13, 2.5).fill(chairMid);
      g.roundRect(cx + 12, cy - 5, 5, 13, 2.5).stroke({ width: 0.5, color: chairShadow, alpha: 0.2 });
      // Armrest top highlight
      g.roundRect(cx - 16, cy - 4.5, 3, 1, 0.5).fill({ color: 0xffffff, alpha: 0.12 });
      g.roundRect(cx + 13, cy - 4.5, 3, 1, 0.5).fill({ color: 0xffffff, alpha: 0.12 });
      // Backrest (ergonomic curve)
      g.roundRect(cx - 14, cy - 13, 28, 7, 4).fill(chairShadow);
      g.roundRect(cx - 14, cy - 13, 28, 7, 4).stroke({ width: 0.8, color: chairDark, alpha: 0.25 });
      // Backrest top highlight
      g.roundRect(cx - 12, cy - 12, 24, 2.5, 2).fill({ color: blendColor(chairBase, 0xffffff, 0.4), alpha: 0.4 });
      // Backrest lumbar support detail
      g.roundRect(cx - 10, cy - 9, 20, 2, 1).fill({ color: chairBase, alpha: 0.3 });
      // Seat cushion center detail
      g.ellipse(cx, cy - 0.5, 9, 3.2).fill({ color: blendColor(chairBase, OFFICE_PASTEL.softMint, 0.22), alpha: 0.5 });
      parent.addChild(g);
    }
    
    function drawPlant(parent           , x        , y        , variant         = 0) {
      const g = new Graphics();
      // Pot shadow (softer, larger)
      g.ellipse(x, y + 8, 8, 3).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.1 });
      g.ellipse(x, y + 7, 7, 2.5).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.07 });
      // Pot body (warm terra cotta with richer shading)
      g.roundRect(x - 5, y, 10, 7, 2).fill(0xd07858);
      g.roundRect(x - 4.5, y + 0.5, 9, 6, 1.5).fill(0xd88060);
      g.roundRect(x - 4, y + 1, 8, 5, 1.5).fill(0xe89070);
      // Pot highlight stripe
      g.roundRect(x - 3, y + 2, 6, 1, 0.5).fill({ color: 0xffffff, alpha: 0.08 });
      // Pot rim (thicker, with detail)
      g.roundRect(x - 6, y - 1.5, 12, 3.5, 1.8).fill(0xe08060);
      g.roundRect(x - 5.5, y - 1, 11, 2, 1.2).fill(0xf0a080);
      g.roundRect(x - 5, y - 1, 10, 1.2, 1).fill({ color: 0xffffff, alpha: 0.12 });
      // Pot decorative band
      g.roundRect(x - 4, y + 4, 8, 1, 0.5).fill({ color: 0xc06848, alpha: 0.3 });
      // Soil (richer)
      g.ellipse(x, y, 4.5, 1.8).fill(0x5e4530);
      g.ellipse(x - 1, y + 0.2, 2.5, 1).fill({ color: 0x7a5840, alpha: 0.5 });
      // Tiny soil pebble
      g.circle(x + 2.5, y - 0.3, 0.7).fill({ color: 0x8a6a50, alpha: 0.4 });
      if (variant % 4 === 0) {
        // Bushy monstera-style plant (soft mint)
        g.rect(x - 0.4, y - 2, 0.8, 3).fill(0x6aaa88);
        g.circle(x, y - 4, 6.5).fill(0x78bfa4);
        g.circle(x - 3, y - 6, 4.5).fill(0x89cfb5);
        g.circle(x + 3, y - 6.5, 4).fill(0x89cfb5);
        g.circle(x, y - 8.5, 4).fill(0x9dd9c2);
        g.circle(x - 2, y - 10, 2.8).fill(0xb7e7d5);
        g.circle(x + 2.5, y - 9.5, 2.2).fill(0xb7e7d5);
        // Leaf veins
        g.moveTo(x, y - 4)
          .lineTo(x, y - 8)
          .stroke({ width: 0.3, color: 0x5e9f7f, alpha: 0.3 });
        g.moveTo(x - 2, y - 6)
          .lineTo(x - 4, y - 8)
          .stroke({ width: 0.2, color: 0x5e9f7f, alpha: 0.2 });
        g.moveTo(x + 2, y - 6)
          .lineTo(x + 4, y - 8)
          .stroke({ width: 0.2, color: 0x5e9f7f, alpha: 0.2 });
        // Highlight leaves
        g.circle(x + 2, y - 7, 1.8).fill({ color: 0xffffff, alpha: 0.18 });
        g.circle(x - 2, y - 9.5, 1.2).fill({ color: 0xffffff, alpha: 0.12 });
      } else if (variant % 4 === 1) {
        // Tall cactus (mint-sage, more detailed)
        g.roundRect(x - 2.5, y - 12, 5, 12, 2.5).fill(0x6eaa88);
        g.roundRect(x - 2, y - 10, 4, 10, 2).fill(0x82bc9a);
        g.roundRect(x - 1.5, y - 9, 3, 8, 1.5).fill(0x92c8aa);
        // Cactus ribs
        g.moveTo(x - 1, y - 11)
          .lineTo(x - 1, y - 1)
          .stroke({ width: 0.25, color: 0x5a9a78, alpha: 0.3 });
        g.moveTo(x + 1, y - 11)
          .lineTo(x + 1, y - 1)
          .stroke({ width: 0.25, color: 0x5a9a78, alpha: 0.3 });
        // Arms (more rounded)
        g.roundRect(x - 7, y - 7, 5, 2.5, 1.2).fill(0x72b090);
        g.roundRect(x - 7, y - 10, 2.5, 5, 1.2).fill(0x82bc9a);
        g.roundRect(x + 2, y - 5, 5, 2.5, 1.2).fill(0x72b090);
        g.roundRect(x + 4.5, y - 8, 2.5, 5, 1.2).fill(0x82bc9a);
        // Spines (tiny dots)
        for (let i = 0; i < 5; i++) {
          g.circle(x + (i % 2 === 0 ? 2.5 : -2.5), y - 2 - i * 2, 0.3).fill({ color: 0xd8d0c0, alpha: 0.4 });
        }
        // Flower on top
        g.circle(x, y - 13, 2).fill(0xe3a8b2);
        g.circle(x - 1.2, y - 13.5, 1.5).fill(0xedb8c2);
        g.circle(x + 1.2, y - 13.5, 1.5).fill(0xedb8c2);
        g.circle(x, y - 13, 1).fill(0xf6d57a);
      } else if (variant % 4 === 2) {
        // Flower pot (mint stem + dusty blossoms, more flowers)
        g.rect(x - 0.5, y - 9, 1, 9).fill(0x6aaa88);
        g.rect(x - 2.5, y - 6, 0.8, 5).fill(0x7ab898);
        g.rect(x + 2, y - 5, 0.8, 4).fill(0x7ab898);
        // Leaves
        g.circle(x, y - 3.5, 5).fill(0x6eaa88);
        g.circle(x - 3.5, y - 5.5, 3.5).fill(0x82bc9a);
        g.circle(x + 3.5, y - 5.5, 3).fill(0x82bc9a);
        g.circle(x, y - 7, 3).fill(0x92c8aa);
        // Flowers (multiple, varied)
        g.circle(x, y - 10, 3).fill(0xe09aaa);
        g.circle(x - 1, y - 10.5, 1.8).fill(0xeaacb8);
        g.circle(x + 1, y - 10.5, 1.8).fill(0xeaacb8);
        g.circle(x, y - 10, 1.5).fill(0xf6d685);
        g.circle(x - 4, y - 8, 2.5).fill(0x9fbede);
        g.circle(x - 4, y - 8, 1.2).fill(0xf8efba);
        g.circle(x + 3.5, y - 8.5, 2).fill(0xf2b28a);
        g.circle(x + 3.5, y - 8.5, 1).fill(0xf7df97);
        // Tiny bud
        g.circle(x + 1.5, y - 12, 1.2).fill(0xe8a0b0);
      } else {
        // Snake plant / sansevieria (tall pointed leaves)
        const leafColors = [0x5e9a78, 0x6eaa88, 0x7cb898, 0x5a9070];
        for (let i = 0; i < 4; i++) {
          const lx = x + (i - 1.5) * 2.5;
          const lh = 10 + (i % 2) * 3;
          g.moveTo(lx, y)
            .lineTo(lx - 1.5, y - lh * 0.6)
            .lineTo(lx, y - lh)
            .lineTo(lx + 1.5, y - lh * 0.6)
            .lineTo(lx, y)
            .fill(leafColors[i]);
          // Leaf highlight stripe
          g.moveTo(lx, y)
            .lineTo(lx, y - lh + 1)
            .stroke({ width: 0.3, color: 0xb8e0c8, alpha: 0.25 });
        }
        // Yellow leaf edge detail
        g.moveTo(x - 2, y - 8)
          .lineTo(x - 3, y - 5)
          .stroke({ width: 0.3, color: 0xc8d8a8, alpha: 0.25 });
      }
      parent.addChild(g);
    }
    
    function drawWhiteboard(parent           , x        , y        ) {
      const g = new Graphics();
      // Shadow behind board (deeper, offset)
      g.roundRect(x + 2, y + 2, 38, 22, 2).fill({ color: 0x000000, alpha: 0.15 });
      g.roundRect(x + 1, y + 1, 38, 22, 2).fill({ color: 0x000000, alpha: 0.08 });
      // Frame (warmer silver)
      g.roundRect(x, y, 38, 22, 2).fill(0xcccccc);
      g.roundRect(x, y, 38, 22, 2).stroke({ width: 0.5, color: 0xaaaaaa });
      // Frame highlight (top edge)
      g.moveTo(x + 2, y + 0.5)
        .lineTo(x + 36, y + 0.5)
        .stroke({ width: 0.5, color: 0xffffff, alpha: 0.15 });
      // White surface
      g.roundRect(x + 2, y + 2, 34, 18, 1).fill(0xfaf8f2);
      // Content: colored lines + shapes
      const cc = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b];
      for (let i = 0; i < 3; i++) {
        g.moveTo(x + 5, y + 5 + i * 5)
          .lineTo(x + 5 + 8 + Math.random() * 16, y + 5 + i * 5)
          .stroke({ width: 1, color: cc[i], alpha: 0.6 });
      }
      // Small sticky notes
      g.rect(x + 26, y + 4, 6, 5).fill({ color: 0xffee88, alpha: 0.8 });
      g.rect(x + 26, y + 11, 6, 5).fill({ color: 0x88eeff, alpha: 0.8 });
      // Marker tray
      g.roundRect(x + 8, y + 21, 22, 3, 1).fill(0x999999);
      // Markers
      g.roundRect(x + 10, y + 20, 2, 3, 0.5).fill(0x3366ff);
      g.roundRect(x + 13, y + 20, 2, 3, 0.5).fill(0xff3333);
      g.roundRect(x + 16, y + 20, 2, 3, 0.5).fill(0x33aa33);
      parent.addChild(g);
    }
    
    
    // Adapted Apache-2.0 furniture source: drawing-furniture-b.ts
    function drawBookshelf(parent           , x        , y        ) {
      const g = new Graphics();
      // Shadow (deeper, offset)
      g.roundRect(x + 2, y + 2, 28, 18, 2).fill({ color: 0x000000, alpha: 0.12 });
      g.roundRect(x + 1, y + 1, 28, 18, 2).fill({ color: 0x000000, alpha: 0.08 });
      // Shelf frame (warmer wood)
      g.roundRect(x, y, 28, 18, 2).fill(0xb89050);
      g.roundRect(x, y, 28, 18, 2).stroke({ width: 0.5, color: 0xa07838 });
      g.rect(x + 1, y + 1, 26, 16).fill(0xa88040);
      // Frame top highlight
      g.moveTo(x + 2, y + 0.5)
        .lineTo(x + 26, y + 0.5)
        .stroke({ width: 0.4, color: 0xd8b060, alpha: 0.4 });
      // Middle shelf
      g.rect(x + 1, y + 8.5, 26, 1.5).fill(0xc09848);
      // Books (warmer pastel tones for charm)
      const colors = [0xdd5555, 0x5588dd, 0x55bb66, 0xddbb44, 0xaa66cc, 0xe88855];
      const widths = [3.5, 4, 3, 4.5, 3.5, 4];
      let bx = x + 2;
      for (let i = 0; i < 5 && bx < x + 25; i++) {
        const w = widths[i % widths.length];
        const h = 5 + (i % 3);
        g.rect(bx, y + 8 - h, w, h).fill(colors[i]);
        // Book spine line
        g.moveTo(bx + w / 2, y + 8 - h + 1)
          .lineTo(bx + w / 2, y + 7)
          .stroke({ width: 0.3, color: 0xffffff, alpha: 0.15 });
        bx += w + 0.8;
      }
      bx = x + 2;
      for (let i = 0; i < 4 && bx < x + 25; i++) {
        const w = widths[(i + 2) % widths.length];
        const h = 4.5 + (i % 2);
        g.rect(bx, y + 17 - h, w, h).fill(colors[(i + 3) % colors.length]);
        bx += w + 1;
      }
      // Tiny trophy/figure on shelf
      g.rect(x + 23, y + 2, 2, 4).fill(0xddaa33);
      g.circle(x + 24, y + 1, 1.5).fill(0xffcc44);
      parent.addChild(g);
    }
    
    function drawCoffeeMachine(parent           , x        , y        ) {
      const g = new Graphics();
      // Shadow
      g.ellipse(x + 10, y + 30, 13, 3.5).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.1 });
      // Body (warmer, more premium feel)
      g.roundRect(x, y, 20, 28, 3).fill(0x7e8898);
      g.roundRect(x + 0.5, y + 0.5, 19, 27, 2.5).fill(0x939daf);
      g.roundRect(x + 1, y + 1, 18, 26, 2).fill(0xa1abc1);
      // Chrome top panel
      g.roundRect(x + 2, y + 2, 16, 5, 1.5).fill(0xc4cdd9);
      g.roundRect(x + 2, y + 2, 16, 2, 1).fill({ color: 0xffffff, alpha: 0.1 });
      // Brand logo (tiny coffee icon)
      g.circle(x + 10, y + 4.5, 1.5).fill(0x8d654c);
      g.circle(x + 10, y + 4.5, 0.8).fill(0xb89070);
      // Buttons (with glow rings)
      g.circle(x + 6, y + 9, 2.5).fill(0xc07080);
      g.circle(x + 6, y + 9, 1.8).fill(0xe28e9f);
      g.circle(x + 6, y + 9, 0.8).fill(0xf3b8c3);
      g.circle(x + 14, y + 9, 2.5).fill(0x70a088);
      g.circle(x + 14, y + 9, 1.8).fill(0x8ebda7);
      g.circle(x + 14, y + 9, 0.8).fill(0xb5dbc7);
      // Display (LED screen with text)
      g.roundRect(x + 3, y + 12, 14, 4, 0.8).fill(0x1e2e40);
      g.roundRect(x + 3, y + 12, 14, 4, 0.8).stroke({ width: 0.3, color: 0x4a5a6a, alpha: 0.5 });
      g.moveTo(x + 4.5, y + 14)
        .lineTo(x + 12, y + 14)
        .stroke({ width: 0.5, color: 0xb8f0de, alpha: 0.6 });
      g.circle(x + 15, y + 14, 0.5).fill({ color: 0x44dd66, alpha: 0.5 });
      // Nozzle / drip area
      g.rect(x + 6, y + 17, 8, 2).fill(0x4b556a);
      g.roundRect(x + 7.5, y + 19, 5, 4, 0.5).fill(0x3a4558);
      // Drip tray
      g.roundRect(x + 4, y + 23, 12, 1.5, 0.5).fill(0x5a6478);
      // Cup with latte art
      g.roundRect(x + 5.5, y + 21, 9, 7, 2).fill(0xfdf8f4);
      g.roundRect(x + 5.5, y + 21, 9, 7, 2).stroke({ width: 0.4, color: 0xd9cfc6 });
      g.ellipse(x + 10, y + 23, 3.5, 1.5).fill(0x8d654c);
      // Latte art heart
      g.circle(x + 9.3, y + 22.8, 0.8).fill(0xf0e0d0);
      g.circle(x + 10.7, y + 22.8, 0.8).fill(0xf0e0d0);
      g.moveTo(x + 8.5, y + 23)
        .lineTo(x + 10, y + 24.2)
        .lineTo(x + 11.5, y + 23)
        .fill({ color: 0xf0e0d0, alpha: 0.8 });
      // Handle
      g.moveTo(x + 14.5, y + 22)
        .quadraticCurveTo(x + 16.5, y + 24.5, x + 14.5, y + 27)
        .stroke({ width: 1, color: 0xf2e9e2 });
      parent.addChild(g);
    }
    
    function drawSofa(parent           , x        , y        , color        ) {
      const g = new Graphics();
      const seatBase = blendColor(color, OFFICE_PASTEL.creamWhite, 0.18);
      const seatFront = blendColor(seatBase, OFFICE_PASTEL.ink, 0.08);
      const seatBack = blendColor(seatBase, OFFICE_PASTEL.ink, 0.18);
      const seatDark = blendColor(seatBase, OFFICE_PASTEL.ink, 0.28);
      // Floor shadow
      g.ellipse(x + 40, y + 20, 44, 5).fill({ color: 0x000000, alpha: 0.06 });
      // Sofa feet (tiny wooden)
      g.roundRect(x + 2, y + 16, 4, 3, 1).fill(0xb89060);
      g.roundRect(x + 74, y + 16, 4, 3, 1).fill(0xb89060);
      // Seat cushion
      g.roundRect(x, y, 80, 18, 5).fill(seatBase);
      g.roundRect(x + 2, y + 2, 76, 14, 4).fill(seatFront);
      // Seat highlight (top edge)
      g.moveTo(x + 6, y + 1.5)
        .lineTo(x + 74, y + 1.5)
        .stroke({ width: 0.6, color: 0xffffff, alpha: 0.14 });
      // Backrest (taller, with detail)
      g.roundRect(x + 3, y - 10, 74, 12, 4).fill(seatBack);
      g.roundRect(x + 3, y - 10, 74, 12, 4).stroke({ width: 0.5, color: seatDark, alpha: 0.15 });
      // Backrest highlight
      g.roundRect(x + 6, y - 9, 68, 3, 2).fill({ color: 0xffffff, alpha: 0.08 });
      // Armrests (rounder, softer)
      g.roundRect(x - 5, y - 8, 9, 24, 4).fill(seatBack);
      g.roundRect(x - 5, y - 8, 9, 24, 4).stroke({ width: 0.5, color: seatDark, alpha: 0.12 });
      g.roundRect(x + 76, y - 8, 9, 24, 4).fill(seatBack);
      g.roundRect(x + 76, y - 8, 9, 24, 4).stroke({ width: 0.5, color: seatDark, alpha: 0.12 });
      // Armrest top highlights
      g.roundRect(x - 3, y - 7, 5, 2, 1).fill({ color: 0xffffff, alpha: 0.1 });
      g.roundRect(x + 78, y - 7, 5, 2, 1).fill({ color: 0xffffff, alpha: 0.1 });
      // Cushion divider lines (softer)
      g.moveTo(x + 27, y + 3)
        .lineTo(x + 27, y + 14)
        .stroke({ width: 0.6, color: 0x000000, alpha: 0.1 });
      g.moveTo(x + 53, y + 3)
        .lineTo(x + 53, y + 14)
        .stroke({ width: 0.6, color: 0x000000, alpha: 0.1 });
      // Cushion puff highlights
      g.ellipse(x + 14, y + 7, 8, 4).fill({ color: 0xffffff, alpha: 0.06 });
      g.ellipse(x + 40, y + 7, 8, 4).fill({ color: 0xffffff, alpha: 0.06 });
      g.ellipse(x + 66, y + 7, 8, 4).fill({ color: 0xffffff, alpha: 0.06 });
      // Decorative throw pillow (cute accent)
      g.roundRect(x + 6, y - 3, 10, 8, 3).fill(blendColor(color, 0xffffff, 0.3));
      g.roundRect(x + 6, y - 3, 10, 8, 3).stroke({ width: 0.4, color: seatDark, alpha: 0.15 });
      // Pillow pattern (tiny star)
      g.star(x + 11, y + 1, 5, 1.5, 0.8, 0).fill({ color: 0xffffff, alpha: 0.15 });
      parent.addChild(g);
    }
    
    function drawCoffeeTable(parent           , x        , y        ) {
      const g = new Graphics();
      // table top (elliptical)
      g.ellipse(x + 18, y + 5, 18, 8).fill(0xb89060);
      g.ellipse(x + 18, y + 5, 16, 6).fill(0xd0a878);
      // legs
      g.rect(x + 6, y + 10, 3, 8).fill(0xa07840);
      g.rect(x + 27, y + 10, 3, 8).fill(0xa07840);
      // coffee cup
      g.roundRect(x + 12, y + 1, 5, 4, 1).fill(0xfffaf6);
      g.rect(x + 13, y + 2, 3, 2).fill(0x8d654c);
      // snack plate
      g.ellipse(x + 24, y + 4, 4, 2.5).fill(0xf4ede6);
      g.circle(x + 23, y + 3.5, 1.5).fill(0xedc27a);
      g.circle(x + 25.5, y + 4, 1.5).fill(0xdba282);
      parent.addChild(g);
    }
    
    function drawHighTable(parent           , x        , y        ) {
      const g = new Graphics();
      // table top
      g.roundRect(x, y, 36, 14, 2).fill(0xb89060);
      g.roundRect(x + 1, y + 1, 34, 12, 1).fill(0xd0a878);
      // legs
      g.rect(x + 4, y + 14, 3, 16).fill(0xa07840);
      g.rect(x + 29, y + 14, 3, 16).fill(0xa07840);
      // crossbar
      g.rect(x + 6, y + 24, 24, 2).fill(0xa07840);
      parent.addChild(g);
    }
    
    function drawVendingMachine(parent           , x        , y        ) {
      const g = new Graphics();
      g.roundRect(x, y, 22, 30, 2).fill(0x7e8da6);
      g.roundRect(x + 1, y + 1, 20, 28, 1).fill(0x98a7c0);
      // display rows of drinks
      const drinkColors = [0xea9ba8, 0x8fb9d8, 0x9fceac, 0xf3c07e, 0xdfafc9, 0xb29ed7];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          g.roundRect(x + 3 + c * 6, y + 3 + r * 7, 4, 5, 1).fill(drinkColors[(r * 3 + c) % drinkColors.length]);
        }
      }
      // dispense slot
      g.roundRect(x + 4, y + 24, 14, 4, 1).fill(0x4f5a72);
      parent.addChild(g);
    }
    
    /* ================================================================== */
    /*  Helpers                                                            */
    /* ================================================================== */
    
    

    return {
      Container: Container, Graphics: Graphics, paintNode: paintNode, at: at, css: css,
      drawDesk: drawDesk, drawChair: drawChair, drawPlant: drawPlant, drawWhiteboard: drawWhiteboard,
      drawBookshelf: drawBookshelf, drawCoffeeMachine: drawCoffeeMachine, drawSofa: drawSofa,
      drawCoffeeTable: drawCoffeeTable, drawWaterCooler: drawWaterCooler, drawWallClock: drawWallClock,
      applyWallClockTime: applyWallClockTime, drawCeilingLight: drawCeilingLight, drawPictureFrame: drawPictureFrame,
      drawRug: drawRug, drawTrashCan: drawTrashCan, drawVendingMachine: drawVendingMachine, drawWindow: drawWindow
    };
  })();

  /* ---------- 零件本体 ---------- */
  var STATUS = { idle: '待命', moving: '前往工位', working: '干活中', reporting: '汇报中' };
  var WALL = 78, CELL_W = 240, CELL_H = 214, MARGIN = 170, CHAR_H = 78, SPEED = 120;

  function cols(n) { return n <= 4 ? n : n <= 6 ? 3 : n <= 8 ? 4 : n <= 10 ? 5 : n <= 12 ? 4 : 5; }

  function mount(host, wb, opts) {
    opts = opts || {};
    var roleMode = opts.mode === 'role';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:default';
    canvas.setAttribute('role', 'img');
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var company = wb.company, roles = company.roles;
    var W = 0, H = 0, LW = 0, LH = 0, S = 1, Z = 1, OX = 0, OY = 0, DPR = 1, MG = MARGIN;
    var bg = null, stations = [], actors = {}, boss = null, aisleX = 0, reportY = 0, decor = [];
    var hits = [], hover = null, raf = 0, last = 0, t = 0, dead = false;
    var bubbles = [], beams = [], offs = [];
    var reduced = !!wb.reducedMotion;

    function color(id) { return wb.roleColor(id) || '#35e0ff'; }
    function cssVar(n, f) { return wb.color(n) || f; }

    /* ---- 布局 ---- */
    function layout() {
      W = Math.max(1, host.clientWidth); H = Math.max(1, host.clientHeight);
      DPR = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      var portrait = W / H < 0.9;
      MG = portrait ? 70 : MARGIN;
      var n = roles.length, c = Math.max(1, portrait ? Math.min(2, n) : cols(n)), r = Math.ceil(n / c);
      var lw0 = MG * 2 + c * CELL_W, gridY = WALL + 262, lh0 = gridY + r * CELL_H + 46;
      var a = W / H;
      if (lw0 / lh0 < a) { LH = lh0; LW = lh0 * a; } else { LW = lw0; LH = lw0 / a; }
      S = W / LW;
      var extra = LH - lh0;
      var gx = (LW - c * CELL_W) / 2, gy = gridY + extra * 0.45;
      boss = { x: LW / 2, feet: WALL + 112 + extra * 0.18 };
      reportY = boss.feet + 122;
      stations = roles.map(function (role, i) {
        var row = Math.floor(i / c), col = i % c, inRow = Math.min(c, n - row * c);
        var x = gx + (col + (c - inRow) / 2) * CELL_W + CELL_W / 2;
        var feet = gy + row * CELL_H + 96;
        return { role: role, i: i, x: x, feet: feet, deskY: feet + 16, aisleY: feet + 92, set: role.sprite || (hash(role.id) % 11) + 1 };
      });
      aisleX = gx + Math.round(c / 2) * CELL_W;
      if (Math.abs(aisleX - LW / 2) > CELL_W * 0.6) aisleX = LW / 2;
      decor = [
        { id: 'coffee', x: MG * 0.42, y: LH - 120, label: '咖啡角' },
        { id: 'board', x: MG * 0.42, y: WALL + 210, label: '白板' },
        { id: 'water', x: LW - MG * 0.4, y: LH - 110, label: '饮水机' },
        { id: 'shelf', x: LW - MG * 0.45, y: WALL + 170, label: '资料架' }
      ];
      // 角色模式：镜头推近该岗位
      Z = 1; OX = 0; OY = 0;
      if (roleMode) {
        var st = stations.find(function (s) { return s.role.id === opts.roleId; });
        if (st) {
          Z = Math.min(2.2, Math.max(1.4, 1.9 * Math.min(LW / lw0, 1.2)));
          var cx = st.x, cy = st.feet - 10;
          OX = W / 2 - cx * S * Z; OY = H * 0.55 - cy * S * Z;
          OX = Math.min(0, Math.max(W - LW * S * Z, OX)); OY = Math.min(0, Math.max(H - LH * S * Z, OY));
        }
      }
      stations.forEach(function (st) {
        var a0 = actors[st.role.id];
        if (!a0) actors[st.role.id] = { st: st, x: st.x, y: st.feet, path: [], facing: 'D', mode: 'seat', wait: 0, wanderAt: t + 8 + (hash(st.role.id) % 20) };
        else { a0.st = st; a0.x = st.x; a0.y = st.feet; a0.path = []; a0.mode = 'seat'; }
      });
      buildBackground();
    }

    function view(target) { target.setTransform(DPR * S * Z, 0, 0, DPR * S * Z, OX * DPR, OY * DPR); }

    /* ---- 静态背景：地板、墙、窗、家具、工位地垫、椅子 ---- */
    function buildBackground() {
      bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
      var g = bg.getContext('2d');
      g.fillStyle = cssVar('bg', '#05070d'); g.fillRect(0, 0, bg.width, bg.height);
      view(g);
      // 地板
      var floor = g.createLinearGradient(0, WALL, 0, LH);
      floor.addColorStop(0, '#232a36'); floor.addColorStop(0.55, '#1d2530'); floor.addColorStop(1, '#151b24');
      g.fillStyle = floor; roundRect(g, 6, 6, LW - 12, LH - 12, 6); g.fill();
      for (var y = WALL + 6; y < LH - 16; y += 46) {
        g.fillStyle = 'rgba(6,12,22,.28)'; g.fillRect(12, y, LW - 24, 1);
        g.fillStyle = 'rgba(190,213,224,.035)'; g.fillRect(12, y + 1, LW - 24, 0.6);
        var off = (Math.round(y / 46) % 2) * 120;
        for (var x = 20 + off; x < LW - 12; x += 240) { g.fillStyle = 'rgba(6,12,22,.22)'; g.fillRect(x, y + 2, 1, 44); }
      }
      // 墙与窗
      var wall = g.createLinearGradient(0, 6, 0, WALL);
      wall.addColorStop(0, '#3f4250'); wall.addColorStop(0.65, '#2a2e39'); wall.addColorStop(1, '#1a212b');
      g.fillStyle = wall; g.fillRect(8, 8, LW - 16, WALL - 10);
      g.fillStyle = '#10161f'; g.fillRect(9, WALL - 4, LW - 18, 3);
      var accent = cssVar('accent', '#35e0ff');
      for (var p = MG + 30; p < LW - MG - 110; p += 140) {
        g.fillStyle = '#151e2b'; g.fillRect(p, 16, 108, 40);
        var glass = g.createLinearGradient(0, 18, 0, 52); glass.addColorStop(0, '#2b3d58'); glass.addColorStop(1, '#6a5a7a');
        g.fillStyle = glass; g.fillRect(p + 3, 19, 102, 33);
        for (var b = 0; b < 7; b++) { var bh = 6 + hash(p + ':' + b) % 16; g.fillStyle = '#1d2738'; g.fillRect(p + 6 + b * 14, 52 - bh, 11, bh);
          if (hash(p + 'w' + b) % 3 === 0) { g.fillStyle = 'rgba(255,225,140,.55)'; g.fillRect(p + 9 + b * 14, 52 - bh + 3, 2, 2); } }
        g.fillStyle = '#3d4a55'; g.fillRect(p + 53, 18, 2, 35); g.fillStyle = '#6e6e6e'; g.fillRect(p, 56, 108, 3);
      }
      // 氛围光
      pool(g, LW / 2, boss.feet + 40, 380, 170, accent, 0.10);
      pool(g, LW / 2, LH * 0.62, LW * 0.45, LH * 0.3, '#97bdb3', 0.06);
      // 老板区地毯 + 走廊
      g.save(); g.globalAlpha = 0.12; g.fillStyle = accent; roundRect(g, LW / 2 - 200, boss.feet - 70, 400, 150, 14); g.fill(); g.restore();
      g.strokeStyle = 'rgba(146,204,195,.12)'; g.lineWidth = 1; g.setLineDash([6, 10]);
      g.beginPath(); g.moveTo(aisleX, boss.feet + 90); g.lineTo(aisleX, LH - 30); g.stroke(); g.setLineDash([]);
      // 工位地垫
      stations.forEach(function (st) {
        var c = color(st.role.id);
        g.save(); g.globalAlpha = 0.16; g.fillStyle = c; roundRect(g, st.x - 92, st.feet - 30, 184, 116, 14); g.fill(); g.restore();
        g.strokeStyle = 'rgba(255,255,255,.05)'; roundRect(g, st.x - 92, st.feet - 30, 184, 116, 14); g.stroke();
        g.fillStyle = c; g.globalAlpha = 0.85; g.fillRect(st.x - 70, st.feet + 82, 140, 2); g.globalAlpha = 1;
        pool(g, st.x, st.feet + 40, 92, 46, c, 0.10);
      });
      // 家具（Claw-Empire）
      var root = new K.Container();
      K.drawCeilingLight(root, LW * 0.3, 10, 0xc0ae83); K.drawCeilingLight(root, LW * 0.7, 10, 0xb7c8b0);
      K.drawWallClock(root, LW - 34, 30);
      K.at(root, decor[1].x - 30, decor[1].y - 40, 1.6, function (n) { K.drawWhiteboard(n, 0, 0); });
      K.at(root, decor[3].x - 26, decor[3].y - 70, 1.4, function (n) { K.drawBookshelf(n, 0, 0); });
      K.at(root, decor[0].x - 18, decor[0].y - 52, 1.5, function (n) { K.drawCoffeeMachine(n, 0, 0); });
      K.at(root, decor[2].x - 8, decor[2].y - 50, 1.5, function (n) { K.drawWaterCooler(n, 0, 0); });
      K.at(root, 30, WALL + 20, 1.4, function (n) { K.drawPlant(n, 0, 0, 1); });
      K.at(root, LW - 34, LH - 60, 1.5, function (n) { K.drawPlant(n, 0, 0, 2); });
      K.at(root, 34, LH - 46, 1.3, function (n) { K.drawPlant(n, 0, 0, 0); });
      K.drawPictureFrame(root, MG * 0.5, 30); K.drawPictureFrame(root, LW - MG * 0.55, 30);
      if (LW > 1100) K.at(root, LW / 2 + 240, boss.feet - 30, 1.2, function (n) { K.drawSofa(n, 0, 0, 0x91bcae); });
      // 椅子
      stations.forEach(function (st) {
        K.at(root, st.x, st.feet - 8, 1.12, function (n) { K.drawChair(n, 0, 0, parseInt(color(st.role.id).replace('#', ''), 16) || 0x638d85); });
      });
      K.at(root, boss.x, boss.feet - 11, 1.45, function (n) { K.drawChair(n, 0, 0, 0x638d85); });
      K.paintNode(root, g);
      // 墙上公司名
      g.font = '800 15px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(0,0,0,.35)'; roundRect(g, 18, 18, Math.min(360, MG + 150), 30, 5); g.fill();
      g.fillStyle = accent; g.fillRect(26, 26, 3, 14);
      g.fillStyle = '#e8e3d6'; g.fillText(trim(g, ((company.company && company.company.name) || 'OPC') + ' · AI 办公室', Math.min(330, MG + 120)), 36, 33);
      // 预制桌子贴片
      stations.forEach(function (st) { st.desk = patch(st.x - 70, st.deskY - 10, 140, 72, function (n) { K.at(n, st.x - 36, st.deskY, 1.5, function (m) { K.drawDesk(m, 0, 0, true); }); }); });
      boss.desk = commandDeskPatch();
    }

    function patch(x, y, w, h, painter) {
      var c = document.createElement('canvas'), k = DPR * S * Z;
      c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k));
      var g = c.getContext('2d'); g.setTransform(k, 0, 0, k, -x * k, -y * k);
      var root = new K.Container(); painter(root); K.paintNode(root, g);
      return { c: c, x: x, y: y, w: w, h: h };
    }

    function commandDeskPatch() {
      var x = boss.x - 150, y = boss.feet + 2, w = 300, h = 74, k = DPR * S * Z;
      var c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
      var g = c.getContext('2d'); g.setTransform(k, 0, 0, k, -x * k, -y * k);
      var accent = cssVar('accent', '#35e0ff'), a2 = cssVar('accent2', '#ff3df2');
      g.fillStyle = 'rgba(0,0,0,.28)'; ellipse(g, boss.x, y + 60, 150, 12); g.fill();
      g.fillStyle = '#2b3946'; roundRect(g, x + 4, y + 14, w - 8, 46, 9); g.fill();
      var top = g.createLinearGradient(0, y + 8, 0, y + 40); top.addColorStop(0, '#5b6d78'); top.addColorStop(1, '#3a4a55');
      g.fillStyle = top; roundRect(g, x, y + 6, w, 34, 9); g.fill();
      g.strokeStyle = accent; g.globalAlpha = 0.6; g.lineWidth = 1.2; roundRect(g, x, y + 6, w, 34, 9); g.stroke(); g.globalAlpha = 1;
      [-92, 0, 92].forEach(function (dx, i) {
        g.fillStyle = '#111a24'; roundRect(g, boss.x + dx - 34, y - 2, 68, 30, 3); g.fill();
        var scr = g.createLinearGradient(0, y, 0, y + 26); scr.addColorStop(0, i === 1 ? accent : a2); scr.addColorStop(1, '#0b1520');
        g.globalAlpha = 0.55; g.fillStyle = scr; roundRect(g, boss.x + dx - 31, y + 1, 62, 24, 2); g.fill(); g.globalAlpha = 1;
        for (var l = 0; l < 3; l++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(boss.x + dx - 24, y + 6 + l * 6, 20 + (hash(i + ':' + l) % 24), 1.5); }
      });
      g.fillStyle = '#1a2530'; roundRect(g, boss.x - 64, y + 44, 128, 16, 3); g.fill();
      g.font = '700 10px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = accent;
      g.fillText('COMMAND · 老板席', boss.x, y + 52);
      return { c: c, x: x, y: y, w: w, h: h };
    }

    function drawPatch(p) { if (p) ctx.drawImage(p.c, p.x, p.y, p.w, p.h); }

    /* ---- 动作：路径与状态 ---- */
    function pathTo(a, tx, ty) {
      var st = a.st, pts = [];
      var ax = a.x, ay = a.y;
      var lane = st.aisleY;
      if (Math.abs(ay - lane) > 4) pts.push({ x: ax, y: lane });
      var targetLane = ty > boss.feet + 60 && ty < reportY + 20 ? null : lane;
      if (tx === st.x && ty === st.feet) { pts.push({ x: st.x, y: lane }); pts.push({ x: st.x, y: st.feet }); }
      else if (targetLane === null) { pts.push({ x: aisleX, y: lane }); pts.push({ x: aisleX, y: ty }); pts.push({ x: tx, y: ty }); }
      else { pts.push({ x: tx, y: lane }); pts.push({ x: tx, y: ty }); }
      // 从别处回工位：先回到走廊再进工位
      if (Math.abs(ay - lane) > 4 && ay < lane - 140) { pts.unshift({ x: aisleX, y: ay }, { x: aisleX, y: lane }); }
      a.path = dedupe(pts);
    }
    function dedupe(pts) { return pts.filter(function (p, i) { var q = pts[i - 1]; return !q || Math.abs(q.x - p.x) > 1 || Math.abs(q.y - p.y) > 1; }); }

    function goSeat(a) { a.mode = 'toSeat'; pathTo(a, a.st.x, a.st.feet); }
    function goReport(a, task) {
      var k = Object.keys(actors).filter(function (id) { return actors[id].mode === 'toReport' || actors[id].mode === 'report'; }).length;
      a.mode = 'toReport'; a.task = task; a.reportX = boss.x + ((k % 3) - 1) * 46;
      if (reduced) { a.x = a.reportX; a.y = reportY; a.path = []; a.mode = 'report'; return; }
      a.path = dedupe([{ x: a.x, y: a.st.aisleY }, { x: aisleX, y: a.st.aisleY }, { x: aisleX, y: reportY + 10 }, { x: a.reportX, y: reportY }]);
    }
    function goWander(a) {
      var d = decor[hash(a.st.role.id + t) % decor.length];
      a.mode = 'toWander'; a.wanderLabel = d.label;
      var side = d.x < LW / 2 ? MG * 0.82 : LW - MG * 0.82;
      a.path = dedupe([{ x: a.x, y: a.st.aisleY }, { x: side, y: a.st.aisleY }, { x: side, y: d.y }, { x: d.x + (d.x < LW / 2 ? 34 : -34), y: d.y + 16 }]);
    }

    function sync() {
      var state = wb.getState();
      stations.forEach(function (st) {
        var a = actors[st.role.id], rs = state.roles[st.role.id];
        if (!a || !rs) return;
        var task = rs.taskId && state.tasks.find(function (x) { return x.id === rs.taskId; });
        if (rs.status === 'reporting') {
          if (a.mode !== 'toReport' && a.mode !== 'report') goReport(a, task);
        } else if (rs.status === 'moving' || rs.status === 'working') {
          if (a.mode === 'report' || a.mode === 'toReport' || a.mode === 'wander' || a.mode === 'toWander') goSeat(a);
          else if (a.mode === 'seat' && rs.status === 'moving' && !a.hopped) { a.hopped = true; a.mode = 'toSeat'; a.path = dedupe([{ x: a.x, y: a.st.aisleY - 30 }, { x: a.st.x, y: a.st.feet }]); }
          if (rs.status === 'working') a.hopped = false;
        } else if (rs.status === 'idle') {
          if (a.mode === 'report' || a.mode === 'toReport') {
            if (a.task && a.task.result) bubble(st.role.id, '老板，' + clip(a.task.title, 14) + ' 交付了 ✓', 2.6, true);
            goSeat(a);
          }
        }
      });
    }

    function update(dt) {
      Object.keys(actors).forEach(function (id) {
        var a = actors[id];
        if (a.path.length) {
          var p = a.path[0], dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy), step = SPEED * dt;
          if (reduced || d <= step) { a.x = p.x; a.y = p.y; a.path.shift(); }
          else { a.x += dx / d * step; a.y += dy / d * step; }
          a.facing = Math.abs(dx) > Math.abs(dy) * 0.55 ? (dx < 0 ? 'L' : 'R') : 'D';
          a.moving = true;
          if (!a.path.length) {
            if (a.mode === 'toSeat') { a.mode = 'seat'; a.facing = 'D'; }
            else if (a.mode === 'toReport') {
              a.mode = 'report'; a.facing = 'D';
              var task = a.task;
              bubble(id, '老板，「' + clip(task ? task.title : '任务', 16) + '」做完了，请过目', 3.4);
            } else if (a.mode === 'toWander') { a.mode = 'wander'; a.until = t + 4 + (hash(id + t) % 5); a.facing = 'D'; }
          }
        } else a.moving = false;
        if (a.mode === 'wander' && t > a.until) goSeat(a);
        var rs = wb.getState().roles[id];
        if (!reduced && a.mode === 'seat' && rs && rs.status === 'idle' && t > a.wanderAt) {
          a.wanderAt = t + 18 + (hash(id + ':' + Math.floor(t)) % 26);
          var busy = Object.keys(actors).filter(function (k) { return actors[k].mode === 'toWander' || actors[k].mode === 'wander'; }).length;
          if (busy < 2) goWander(a);
        }
      });
      bubbles = bubbles.filter(function (b) { return b.until > t; });
      beams = beams.filter(function (b) { return b.until > t; });
    }

    function bubble(roleId, text, dur, ok) { bubbles.push({ roleId: roleId, text: text, until: t + (dur || 3), ok: ok }); }
    function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

    /* ---- 绘制 ---- */
    function frame(now) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      var paused = wb.getState().paused;
      if (!paused) { t += dt; update(dt); }
      draw();
    }

    function draw() {
      if (!bg) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, 0, 0);
      view(ctx);
      var state = wb.getState(), items = [];
      hits = [];
      stations.forEach(function (st) {
        var a = actors[st.role.id];
        items.push({ z: st.deskY + 44, f: function () { drawPatch(st.desk); screen(st); } });
        items.push({ z: a.y, f: function () { person(a, st); } });
        hits.push({ id: st.role.id, x: st.x - 90, y: st.feet - 100, w: 180, h: 190 });
      });
      items.push({ z: boss.feet + 60, f: function () { drawPatch(boss.desk); } });
      items.push({ z: boss.feet, f: drawBoss });
      items.sort(function (p, q) { return p.z - q.z; });
      items.forEach(function (it) { it.f(); });
      beams.forEach(drawBeam);
      // 名牌永远在最上层
      stations.slice().sort(function (p, q) { return actors[p.role.id].y - actors[q.role.id].y; }).forEach(function (st) { header(st, actors[st.role.id], state.roles[st.role.id], state); });
      bubbles.forEach(drawBubble);
      // 底部状态提示
      ctx.font = '500 11px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,210,220,.45)';
      ctx.fillText('像素办公室 · 动画按任务状态播放', LW / 2, LH - 14);
    }

    function screen(st) {
      var rs = wb.getState().roles[st.role.id];
      if (!rs || (rs.status !== 'working' && rs.status !== 'moving')) return;
      var c = color(st.role.id), x = st.x - 14, y = st.deskY - 18;
      ctx.save();
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#0d1620'; roundRect(ctx, x, y, 28, 18, 2); ctx.fill();
      ctx.globalAlpha = 0.65 + 0.3 * Math.sin(t * 6 + st.i); ctx.fillStyle = c; roundRect(ctx, x + 2, y + 2, 24, 13, 1.5); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (var l = 0; l < 3; l++) ctx.fillRect(x + 4, y + 4 + l * 3.5, 6 + ((Math.floor(t * 3) + l + st.i) % 4) * 3.5, 1.2);
      ctx.restore();
      pool(ctx, st.x, st.deskY, 46, 22, c, 0.18);
    }

    function person(a, st) {
      var rs = wb.getState().roles[st.role.id] || {};
      var working = rs.status === 'working';
      var dir = a.moving ? a.facing : 'D';
      var f = dir === 'D' && (a.moving || working) && !reduced ? [1, 2, 1, 3][Math.floor(t * (a.moving ? 7 : 3) + st.i) % 4] : 1;
      var img = sprite(st.set + '-' + dir + '-' + (dir === 'D' ? f : 1)) || sprite(st.set + '-D-1');
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ellipse(ctx, a.x + 2, a.y + 4, a.moving ? 20 : 23, 6); ctx.fill();
      if (hover === st.role.id || wb.getState().selectedRole === st.role.id) {
        ctx.strokeStyle = color(st.role.id); ctx.lineWidth = 2; ellipse(ctx, a.x, a.y + 3, 27, 8); ctx.stroke();
      }
      if (!img) return;
      var h = CHAR_H, w = h * img.width / img.height;
      var bob = reduced ? 0 : a.moving ? Math.sin(t * 13) * 1.4 : working ? Math.sin(t * 7 + st.i) * 0.7 : 0;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, a.x - w / 2, a.y - h + bob, w, h);
      if (a.mode === 'wander' && a.wanderLabel) {
        ctx.font = '600 11px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(222,234,223,.85)';
        ctx.fillText('☕ ' + a.wanderLabel, a.x, a.y + 18);
      }
    }

    function header(st, a, rs, state) {
      if (!rs) return;
      var c = color(st.role.id), name = st.role.name, y = a.y - CHAR_H - 40;
      ctx.font = '700 15px ' + FONT;
      var w = Math.min(176, ctx.measureText(name).width + 28), x = a.x - w / 2;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(ctx, x + 1, y + 2, w, 25, 5); ctx.fill();
      ctx.fillStyle = 'rgba(16,24,34,.92)'; roundRect(ctx, x, y, w, 25, 5); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1; roundRect(ctx, x, y, w, 25, 5); ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(x + 6, y + 7, 3, 11);
      ctx.fillStyle = '#eef2f6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(trim(ctx, name, w - 22), a.x + 3, y + 13);
      var label = STATUS[rs.status] || rs.status;
      if (rs.status === 'working') label += ' ' + Math.round((rs.progress || 0) * 100) + '%';
      ctx.font = '600 11px ' + FONT;
      ctx.fillStyle = rs.status === 'working' ? cssVar('ok', '#3dffa8') : rs.status === 'reporting' ? cssVar('boss', '#ffe14d') : rs.status === 'moving' ? cssVar('accent', '#35e0ff') : 'rgba(200,210,220,.7)';
      ctx.fillText(label, a.x, y + 35);
      if (rs.status === 'working') {
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(a.x - 34, y + 43, 68, 3);
        ctx.fillStyle = c; ctx.fillRect(a.x - 34, y + 43, 68 * (rs.progress || 0), 3);
      }
    }

    function drawBoss() {
      var x = boss.x, y = boss.feet;
      var img = sprite('12-D-1');
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ellipse(ctx, x + 2, y + 4, 26, 7); ctx.fill();
      if (img) { var h = 88, w = h * img.width / img.height; ctx.drawImage(img, x - w / 2, y - h, w, h); }
      // 皇冠
      var gold = cssVar('boss', '#ffe14d'), cy = y - 96;
      ctx.fillStyle = gold; ctx.beginPath();
      ctx.moveTo(x - 13, cy + 10); ctx.lineTo(x - 13, cy); ctx.lineTo(x - 6, cy + 6); ctx.lineTo(x, cy - 3); ctx.lineTo(x + 6, cy + 6); ctx.lineTo(x + 13, cy); ctx.lineTo(x + 13, cy + 10); ctx.closePath(); ctx.fill();
      ctx.font = '800 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var label = '老板';
      var w2 = ctx.measureText(label).width + 26;
      ctx.fillStyle = 'rgba(30,24,6,.9)'; roundRect(ctx, x - w2 / 2, cy - 34, w2, 24, 5); ctx.fill();
      ctx.strokeStyle = gold; ctx.lineWidth = 1; roundRect(ctx, x - w2 / 2, cy - 34, w2, 24, 5); ctx.stroke();
      ctx.fillStyle = gold; ctx.fillText(label, x, cy - 22);
    }

    function drawBeam(b) {
      var st = stations.find(function (s) { return s.role.id === b.roleId; });
      if (!st) return;
      var a = actors[b.roleId], k = 1 - (b.until - t) / b.dur;
      var x0 = boss.x, y0 = boss.feet - 60, x1 = a.x, y1 = a.y - CHAR_H - 10, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 60;
      ctx.save(); ctx.strokeStyle = color(b.roleId); ctx.globalAlpha = 0.55 * (1 - k * 0.6); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke(); ctx.setLineDash([]);
      var q = Math.min(1, k * 1.4), px = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * mx + q * q * x1, py = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * my + q * q * y1;
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.shadowColor = color(b.roleId); ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(px + 8, py); ctx.lineTo(px - 7, py - 5); ctx.lineTo(px - 3, py); ctx.lineTo(px - 7, py + 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function drawBubble(b) {
      var x, y;
      if (b.roleId === '__boss') { x = boss.x; y = boss.feet - 136; }
      else { var a = actors[b.roleId]; if (!a) return; x = a.x; y = a.y - CHAR_H - 58; }
      ctx.font = '600 13px ' + FONT;
      var lines = wrap(b.text, 200), w = Math.min(220, Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; })) + 22), h = lines.length * 18 + 12;
      x = Math.max(w / 2 + 8, Math.min(LW - w / 2 - 8, x));
      var c = b.roleId === '__boss' ? cssVar('boss', '#ffe14d') : b.ok ? cssVar('ok', '#3dffa8') : color(b.roleId);
      ctx.fillStyle = 'rgba(232,240,236,.96)'; roundRect(ctx, x - w / 2, y - h, w, h, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1.5; roundRect(ctx, x - w / 2, y - h, w, h, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, y - 1); ctx.lineTo(x, y + 7); ctx.lineTo(x + 6, y - 1); ctx.closePath(); ctx.fillStyle = 'rgba(232,240,236,.96)'; ctx.fill();
      ctx.fillStyle = '#1f2d2a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach(function (l, i) { ctx.fillText(l, x, y - h + 15 + i * 18); });
    }

    function wrap(text, max) {
      var out = [], line = '';
      Array.from(String(text)).forEach(function (ch) {
        if (line && ctx.measureText(line + ch).width > max) { out.push(line); line = ch; } else line += ch;
      });
      if (line) out.push(line);
      return out.slice(0, 3);
    }

    /* ---- 工具 ---- */
    function roundRect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
    function ellipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); }
    function pool(g, x, y, rx, ry, c, alpha) {
      g.save(); g.translate(x, y); g.scale(1, ry / rx);
      var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = alpha; g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
    }
    function trim(g, s, max) { s = String(s); if (g.measureText(s).width <= max) return s; while (s.length && g.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; }

    /* ---- 交互 ---- */
    function toLogical(e) {
      var r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) - OX) / (S * Z), y: ((e.clientY - r.top) - OY) / (S * Z) };
    }
    function hit(e) {
      var p = toLogical(e), found = null;
      Object.keys(actors).forEach(function (id) {
        var a = actors[id];
        if (Math.abs(p.x - a.x) < 30 && p.y < a.y + 8 && p.y > a.y - CHAR_H - 48) found = id;
      });
      if (!found) hits.forEach(function (h) { if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) found = h.id; });
      return found;
    }
    function onMove(e) { var id = hit(e); if (id !== hover) { hover = id; canvas.style.cursor = id && !roleMode ? 'pointer' : 'default'; } }
    function onClick(e) { var id = hit(e); if (id && !roleMode) wb.open(id); }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);

    /* ---- 订阅状态 ---- */
    offs.push(wb.on('role', sync));
    offs.push(wb.on('dispatch', function (p) {
      bubble('__boss', '交给' + p.role.name + '：' + clip(p.task.title, 18), 3);
      beams.push({ roleId: p.role.id, until: t + 1.6, dur: 1.6 });
    }));

    var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(host);
    // 角色图加载后重画（背景不依赖角色图）
    for (var s = 1; s <= 12; s++) ['D-1', 'D-2', 'D-3', 'L-1', 'R-1'].forEach(function (k) { sprite(s + '-' + k); });

    layout();
    sync();
    canvas.setAttribute('aria-label', '像素办公室：' + roles.map(function (r) { return r.name; }).join('、') + '。点击小人查看岗位。');
    raf = requestAnimationFrame(frame);

    return {
      resize: function () { layout(); },
      destroy: function () {
        dead = true; cancelAnimationFrame(raf);
        offs.forEach(function (off) { off(); });
        if (ro) ro.disconnect();
        canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('click', onClick);
        canvas.remove();
      }
    };
  }

  Workbench.registerPart('pixel-office', { meta: { label: 'PIXEL OFFICE', modes: ['main', 'role'] }, mount: mount });
})();
