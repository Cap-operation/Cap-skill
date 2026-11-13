/* 零件：全球市场 GLOBAL（id: globe）
 * 点阵世界地图：从出发地（company.company.origin，默认 CN）向每个目标市场（company.company.markets）拉一条光弧。
 * 每完成一个任务，就有一颗彗星沿光弧飞向市场，市场闪一下。
 * 市场旁的数字 = 本次打开后、任务标题里写了这个市场名的已完成任务数（只按状态里的任务算，不编数）。
 * 地图是手工简化的大陆轮廓，离线可用，不依赖外部地图数据。
 * 视觉抽取自自有作品「全球大屏」，已去掉工厂名、品牌、固定国家和示例数字。 */
(function () {
  'use strict';
  var WB = window.Workbench;
  if (!WB || typeof WB.registerPart !== 'function') return;

  var ID = 'globe';
  var P = ID + '-';
  var MONO = '"SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
  var FALL = ['#35E0FF', '#FF3DF2', '#3DFFA8', '#FFB03D', '#8B7BFF', '#FF6B6B'];
  var W = 1200, LON0 = -170, LAT0 = 80, K = W / 360, H = Math.round((80 + 58) * K);
  function px(lon, lat) { return [(lon - LON0) * K, (LAT0 - lat) * K]; }

  /* 手工简化的大陆轮廓（经度,纬度） */
  var LAND_SRC = [
    // 北美
    '-168,66 -162,70 -156,71.5 -140,70 -128,70.5 -115,68 -95,72 -82,73 -80,64 -94,59 -92,57 -82,55 -79,51.5 -77,60 -70,61 -64,60 -61,56 -56,52 -59,48 -66,45 -70,43 -70,41.5 -74,40.5 -76,37 -75.5,35 -81,31 -80.5,25.5 -82,26.5 -83,29.5 -89,30.2 -94,29.5 -97,27.5 -97.5,22 -95,18.5 -91,18.5 -90.5,21 -87,21.5 -88,16 -84,15.5 -83.5,11 -79.5,9 -77.5,8 -80,7.5 -82.5,8.2 -86,11.5 -88,13.2 -92,14.5 -95,16 -100,17 -105.5,20 -105.5,23 -109,26 -112.5,29.5 -114.5,31.5 -112.5,27 -110,23 -112,25 -114,28 -115.5,30 -117,32.5 -120.5,34.5 -122.5,37.5 -124,40.5 -124,46 -124.5,48.5 -128,51 -133,54.5 -137,58.5 -142,60 -150,61 -154,58 -158,57 -164,55 -158,58.5 -162,60 -165,62.5 -165,64.5',
    // 北极群岛 / 格陵兰 / 冰岛
    '-120,71 -100,69 -95,74 -90,76 -80,79 -65,82 -90,82 -110,78 -120,74',
    '-73,78 -60,82 -35,83.5 -20,82 -18,77 -22,70 -32,68 -40,65 -44,60 -50,62 -53,66 -55,70 -58,75.5 -66,76.5',
    '-24,64 -22,66.4 -14,66.4 -13.5,65 -18,63.4',
    // 古巴
    '-85,21.8 -82,23.1 -77,21 -74.2,20.2 -77.7,19.9 -81,21.6',
    // 南美
    '-77.5,8 -72,11.8 -64,10.6 -60,8.5 -52,5 -50,0 -44,-2.5 -35,-5.5 -35,-9 -39,-13.5 -39,-17.5 -41,-22 -44.5,-23 -48.5,-26 -48.5,-28.5 -53,-33.5 -56,-35 -57.5,-38 -62,-39 -65,-41 -63.5,-42.5 -67.5,-46.5 -66,-48 -69,-51 -68.5,-53.5 -72,-53.5 -75,-50 -74,-44 -73.5,-37 -71.5,-30 -70.5,-23 -70.3,-18 -75,-15.5 -77.5,-12 -81,-6 -80.5,-2 -80,1 -78,2.5',
    // 欧亚
    '-9.5,37 -9,43 -1.5,43.5 -1.5,46.5 -4.5,48.5 -1.5,49.5 2,51 4.5,52.5 8,54 8.5,57 10.5,57.7 10.5,54.5 12,54.2 14,54 19,54.5 21,57 24,57.5 23.5,59.5 29,60 23,60 21.5,61.5 21.5,63 25,65 21.5,65.8 17.5,62.5 18.5,60 16.5,57 12.5,56 11,58.5 8,58 5.5,59 5,62 10,64 14,67.5 19,70 26,71 31,70 40,67.5 41,66.5 33,66.5 40,64.5 44,66 53,68.5 60,69 68,68.5 73,72.5 80,72.5 87,74 100,76.5 113,73.5 130,71 141,72.5 160,70 170,70 180,69 190,66 180,65 178,62.5 173,61 163,60 162,56.5 156.5,51 156,57 160,61.5 155,59.2 143,59.3 137,54 141,52 141,48 135,43 130,42.5 129.5,40 126.5,37.5 126.5,34.5 129,35 129.5,37.5 127.5,39.5 124.5,40 121.5,39 121.8,40.8 118,39 119,37 122.5,37 119.5,35 121,32 122,30 119.5,26 116.5,23 113.5,22.2 110.5,21 108,21.5 106,19 108.5,16 109,12 106.5,10.5 105,8.6 103,10.5 100,13.5 99.5,10 100.5,7 103.5,4.5 103.5,1.5 101,2.8 98.5,7.8 98.5,12 97.5,16.5 94.5,16 94,19 92,21.5 90.5,22 87,21.5 86.5,20 84,18 80,15.5 80,10 77.5,8 76,10 74.5,15 72.8,19 72.5,21.5 69,22.5 67,24.8 61.5,25.2 57,25.8 56.3,27 54,26.7 51.5,27.8 50,30 48,30 48.5,28 50,26 51.5,24.5 54,24.2 56,26 56.5,24 59.8,22.5 58.5,20.5 55.5,17.5 52,16 48.5,14 45,12.8 43.3,12.7 42.7,15.5 40.5,19.5 39,21.5 37.5,24.5 35,28 34.5,29.5 32.5,30 35,33 36,35.8 32.5,36.8 28,36.7 26.5,38 26.5,40.2 28.5,41 29,41.2 32,42 36,41.7 41.5,41.5 41.5,42.6 38,44.6 34.5,45.2 33,44.5 30,45.5 28.5,44 27.5,42.5 26,40.8 23.5,40.2 22.5,37 21.5,37.3 19.5,40.3 19.5,42 16,43.5 13.5,45.6 12.3,44.5 14,42 16,40 16,38 15.6,38 15.5,40 12.5,41.5 10.5,43 8.5,44.3 6.5,43.1 3.2,43.3 3,42 0.8,41 -0.5,39.4 0,38.7 -2,36.8 -5.5,36 -6.5,36.8 -7.5,37.2 -9,37',
    // 英国 / 爱尔兰
    '-5.5,50 1.5,51 1.5,53 -0.5,54.5 -2,56 -1.7,57.5 -4,58.6 -5.8,58.2 -6.2,56.5 -4.8,55 -3,54 -4.5,53 -5,51.7',
    '-10,51.5 -6,52 -6,54 -7.5,55.3 -10,54',
    // 非洲 / 马达加斯加
    '-17,21 -17,14.7 -15,11 -13,8 -11,6.5 -7.5,4.4 -3,5 2,6.3 6,4.3 8.5,4.5 9.5,3 9.5,-1 11.8,-5 13,-8.5 13.5,-12 11.8,-17 14.5,-22.5 15,-27 17,-29 18.5,-34 20,-34.8 25.5,-34 28,-32.5 32.5,-28.5 32.8,-26 35.5,-24 35.5,-21.5 34.8,-19.8 36.8,-18 40.5,-15 40.5,-10.5 39.5,-6.5 39,-4.5 41.5,-1.5 46,2 51,10.5 51.2,12 48.5,11.2 44,10.5 43.2,11.5 42.5,13 39.5,15.5 37.5,18.5 37,21 35.5,23.5 35,26 33.7,27.5 32.5,29.8 32.3,31.3 30,31.3 25,31.8 20,30.8 19.5,30.3 15.5,31.5 11,33 10.5,35.5 11,37 9.5,37.3 3,36.8 -1,35.4 -5.5,35.8 -6.2,35.5 -9.8,31.5 -9.5,29.5 -13,27.5',
    '44,-25 47,-25 50.5,-15.5 49.5,-12 47.5,-14 44,-17 43.5,-22',
    // 日本 / 菲律宾 / 印尼 / 新几内亚
    '130,31 131.5,34.5 135,35.5 139.5,38 141.5,41 141,43.5 145.5,44 145,42.8 141.8,39.5 141,36 139.5,34.8 136.5,34 133,33.8 131,31',
    '120,18.5 122.5,18.3 122,14 124,12.5 126.5,7 125.5,6 122,7 121.8,11 120.5,14.5',
    '109,1.5 111.5,2.8 116,7 119,5 118,1 116.5,-3.5 114,-3.8 110,-2.5',
    '95.2,5.5 98,4.2 104,-1 106,-5.8 102,-4 98.5,0',
    '105.5,-6.8 114.5,-7.8 114.5,-8.8 106,-7.8',
    '131,-1 141,-2.6 147.5,-6 150.5,-10.5 146,-8.5 141,-9 137.5,-5 133,-4',
    // 澳洲 / 新西兰
    '113.5,-22 114,-26.5 115,-34 117.5,-35 123,-34 126,-32.3 131,-31.5 135,-34.8 138,-35.5 139.5,-37.5 144,-38.3 146.5,-39 150,-37.5 153,-31 153.5,-28 153,-25 149.5,-22 146.5,-19 145.5,-14.8 143.5,-14 142.5,-10.7 141.5,-13 141.5,-17 140,-17.5 136.5,-15 136.8,-12.2 132.5,-11.5 130,-13 129.5,-15 126,-14 123,-16.5 121.5,-19 117,-20.6',
    '172.5,-34.5 178.5,-37.7 176.8,-39.5 174.5,-41.5 171.5,-41.7 168,-46.5 166.5,-46 170.5,-43 173,-41 174.5,-39'
  ];

  /* 常见市场：代码 → [中文名, 经度, 纬度, 别名…]（点位取主要商业城市附近，便于连线） */
  var MK = {
    MY: ['马来西亚', 101.69, 3.14, '大马'], TH: ['泰国', 100.5, 13.75], PH: ['菲律宾', 121.0, 14.6], VN: ['越南', 106.7, 10.8],
    SG: ['新加坡', 103.82, 1.35], ID: ['印度尼西亚', 106.85, -6.2, '印尼'], MM: ['缅甸', 96.16, 16.8], KH: ['柬埔寨', 104.92, 11.56],
    CN: ['中国', 113.6, 23.1], HK: ['中国香港', 114.17, 22.32, '香港'], TW: ['中国台湾', 121.56, 25.04, '台湾'], JP: ['日本', 139.69, 35.69], KR: ['韩国', 126.98, 37.57],
    IN: ['印度', 77.2, 28.6], PK: ['巴基斯坦', 67.0, 24.86], BD: ['孟加拉国', 90.41, 23.81, '孟加拉'], LK: ['斯里兰卡', 79.86, 6.93],
    KZ: ['哈萨克斯坦', 76.9, 43.24], UZ: ['乌兹别克斯坦', 69.24, 41.3],
    AE: ['阿联酋', 55.27, 25.2, '迪拜'], SA: ['沙特阿拉伯', 46.68, 24.71, '沙特'], QA: ['卡塔尔', 51.53, 25.29], KW: ['科威特', 47.98, 29.37],
    IL: ['以色列', 34.78, 32.08], TR: ['土耳其', 28.98, 41.0], EG: ['埃及', 31.24, 30.04],
    GB: ['英国', -0.13, 51.51], IE: ['爱尔兰', -6.26, 53.35], FR: ['法国', 2.35, 48.86], DE: ['德国', 10.0, 51.0], NL: ['荷兰', 4.9, 52.37],
    BE: ['比利时', 4.35, 50.85], ES: ['西班牙', -3.7, 40.42], PT: ['葡萄牙', -9.14, 38.72], IT: ['意大利', 12.5, 41.9], CH: ['瑞士', 8.54, 47.37],
    AT: ['奥地利', 16.37, 48.21], PL: ['波兰', 21.01, 52.23], CZ: ['捷克', 14.42, 50.08], SE: ['瑞典', 18.07, 59.33], NO: ['挪威', 10.75, 59.91],
    DK: ['丹麦', 12.57, 55.68], FI: ['芬兰', 24.94, 60.17], GR: ['希腊', 23.73, 37.98], RO: ['罗马尼亚', 26.1, 44.43], HU: ['匈牙利', 19.04, 47.5],
    UA: ['乌克兰', 30.52, 50.45], RU: ['俄罗斯', 37.62, 55.76],
    US: ['美国', -97.0, 38.5], CA: ['加拿大', -79.38, 43.65], MX: ['墨西哥', -99.13, 19.43],
    BR: ['巴西', -46.63, -23.55], AR: ['阿根廷', -58.38, -34.6], CL: ['智利', -70.65, -33.45], CO: ['哥伦比亚', -74.07, 4.71], PE: ['秘鲁', -77.04, -12.05],
    AU: ['澳大利亚', 151.21, -33.87, '澳洲'], NZ: ['新西兰', 174.76, -36.85],
    ZA: ['南非', 28.05, -26.2], NG: ['尼日利亚', 3.38, 6.52], KE: ['肯尼亚', 36.82, -1.29], MA: ['摩洛哥', -7.59, 33.57]
  };
  var CODE_ALIAS = { UK: 'GB' };
  /* 标题里直接写代码时：这些常见站点代码单独出现就算；其它代码要跟着“站 / 区 / 市场 / 店”才算，免得误认 */
  var CODE_PLAIN = { MY: 1, TH: 1, PH: 1, VN: 1, SG: 1, US: 1, UK: 1, GB: 1, JP: 1, KR: 1, AU: 1, NZ: 1, MX: 1, BR: 1, AE: 1, SA: 1, FR: 1, ES: 1, HK: 1, TW: 1 };
  var ALIAS = [];
  Object.keys(MK).forEach(function (cc) { var m = MK[cc]; [m[0]].concat(m.slice(3)).forEach(function (a) { ALIAS.push([a, cc]); }); });
  ALIAS.sort(function (a, b) { return b[0].length - a[0].length; });

  var CSS = [
    '.$-root{position:absolute;inset:0;overflow:hidden;color:var(--text,#e6f1ff);font-size:12px;line-height:1.35}',
    '.$-svg{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.$-dots{fill:color-mix(in srgb,var(--dim,#4a5670) 75%,transparent)}',
    '.$-hotd{fill:color-mix(in srgb,var(--accent,#35e0ff) 42%,var(--dim,#4a5670))}',
    '.$-tw{fill:var(--accent,#35e0ff);animation:$-tw 2.8s ease-in-out infinite alternate}',
    '@keyframes $-tw{from{opacity:.1}to{opacity:.75}}',
    '.$-grid{fill:none;stroke:var(--line,rgba(120,200,255,.14));stroke-width:1}',
    '.$-arc{fill:none;stroke-opacity:.55;stroke-width:1.4}',
    '.$-flow{fill:none;stroke:var(--accent,#35e0ff);stroke-width:2.4;stroke-linecap:round;stroke-dasharray:.1 36;animation:$-flow 3s linear infinite}',
    '@keyframes $-flow{to{stroke-dashoffset:-72}}',
    '.$-city{fill:var(--ok,#3dffa8)}',
    '.$-ring{fill:none;stroke:var(--ok,#3dffa8);stroke-width:1.5;transform-box:fill-box;transform-origin:center;animation:$-ring 2.4s ease-out infinite}',
    '.$-origin{fill:var(--accent2,#ff3df2)}',
    '.$-oring{fill:none;stroke:var(--accent2,#ff3df2);stroke-width:1.5;transform-box:fill-box;transform-origin:center;animation:$-ring 2.4s ease-out infinite}',
    '.$-oring.r2{animation-delay:1.2s}',
    '@keyframes $-ring{from{transform:scale(1);opacity:.9}to{transform:scale(5);opacity:0}}',
    '.$-comet{fill:none;stroke-width:3.2;stroke-linecap:round;filter:drop-shadow(0 0 5px rgba(255,255,255,.75))}',
    '.$-pulse{fill:none;stroke-width:2.5;transform-box:fill-box;transform-origin:center;animation:$-pulse 1.5s ease-out forwards}',
    '@keyframes $-pulse{from{transform:scale(1);opacity:1}to{transform:scale(7);opacity:0}}',
    '.$-lead{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}',
    '.$-lead path{fill:none;stroke:var(--line-strong,rgba(120,200,255,.32));stroke-width:1}',
    /* 市场标签 */
    '.$-mk{position:absolute;display:flex;align-items:center;gap:5px;height:22px;padding:0 7px;box-sizing:border-box;border-radius:5px;white-space:nowrap;',
    'background:color-mix(in srgb,var(--panel-solid,#0c1220) 86%,transparent);border:1px solid var(--line-strong,rgba(120,200,255,.32));',
    'border-top:2px solid color-mix(in srgb,var(--ok,#3dffa8) 60%,transparent);box-shadow:0 6px 18px rgba(0,0,0,.4);font-size:12px;transition:border-color .4s,box-shadow .4s}',
    '.$-mk b{font:700 11px/1 ' + MONO + ';color:var(--ok,#3dffa8)}',
    '.$-mk em{font-style:normal;font:700 12px/1 ' + MONO + ';color:var(--text,#e6f1ff);min-width:8px;text-align:right}',
    '.$-mk em.zero{color:var(--dim,#4a5670)}',
    '.$-mk.flash{animation:$-flash 1.4s ease-out}',
    '.$-still .$-mk.flash{border-color:var(--ok,#3dffa8)}',
    '@keyframes $-flash{from{border-color:var(--ok,#3dffa8);box-shadow:0 0 22px color-mix(in srgb,var(--ok,#3dffa8) 55%,transparent)}}',
    '.$-ol{position:absolute;height:22px;display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:12px;padding:0 4px}',
    '.$-ol b{color:var(--accent2,#ff3df2)}',
    '.$-ol span{color:var(--muted,#7d8aa5);font-size:11px}',
    /* 左上角信息 */
    '.$-hud{position:absolute;left:12px;top:12px;max-width:min(320px,60%);padding:8px 12px;border-radius:8px;box-sizing:border-box;',
    'background:linear-gradient(90deg,color-mix(in srgb,var(--accent,#35e0ff) 10%,transparent),color-mix(in srgb,var(--panel-solid,#0c1220) 88%,transparent));',
    'border-left:3px solid var(--accent,#35e0ff);pointer-events:none}',
    '.$-main .$-hud{top:32px}',
    '.$-eb{font:11px/1.2 ' + MONO + ';letter-spacing:.14em;color:var(--muted,#7d8aa5)}',
    '.$-main .$-eb{display:none}',
    '.$-tt{display:block;font-size:16px;font-weight:800;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-sub{font-size:11.5px;color:var(--muted,#7d8aa5);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.$-stats{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px}',
    '.$-stats span{display:flex;flex-direction:column;font-size:11px;color:var(--muted,#7d8aa5)}',
    '.$-stats b{font:700 20px/1.1 ' + MONO + ';color:var(--text,#e6f1ff);font-variant-numeric:tabular-nums}',
    '.$-stats .ok b{color:var(--ok,#3dffa8);text-shadow:0 0 14px color-mix(in srgb,var(--ok,#3dffa8) 40%,transparent)}',
    '.$-stats .w b{color:var(--accent,#35e0ff)}',
    '.$-note{margin-top:4px;font-size:11px;color:var(--warn,#ffb03d)}',
    '.$-hud.small .$-eb,.$-hud.small .$-sub{display:none}',
    '.$-hud.small .$-stats b{font-size:16px}',
    /* 左下角：最近完成 */
    '.$-tick{position:absolute;left:12px;bottom:12px;width:min(360px,52%);display:flex;flex-direction:column;gap:4px;pointer-events:auto}',
    '.$-tk{padding:4px 10px;border-radius:4px;background:color-mix(in srgb,var(--panel-solid,#0c1220) 86%,transparent);border-left:2px solid var(--rc,var(--ok,#3dffa8));',
    'font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default}',
    '.$-main .$-tk{cursor:pointer}',
    '.$-tk span{font:11px ' + MONO + ';color:var(--muted,#7d8aa5);margin-right:6px}',
    '.$-tk b{color:var(--rc);font-weight:700;margin-right:4px}',
    '.$-tk i{font-style:normal;color:var(--ok,#3dffa8);margin-left:4px}',
    '.$-tk:first-child{animation:$-fresh 1.6s ease-out}',
    '@keyframes $-fresh{from{background:color-mix(in srgb,var(--ok,#3dffa8) 20%,transparent)}}',
    '.$-still,.$-still *{animation:none!important}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('part-' + ID + '-css')) return;
    var s = document.createElement('style');
    s.id = 'part-' + ID + '-css';
    s.textContent = CSS.replace(/\$-/g, P);
    document.head.appendChild(s);
  }
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
  function hhmm(t) { var d = new Date(t || Date.now()); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function inPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  /* 陆地点阵只算一次，所有实例共用 */
  var LANDPTS = null;
  function landPoints() {
    if (LANDPTS) return LANDPTS;
    var polys = LAND_SRC.map(function (s) { return s.split(' ').map(function (p) { return p.split(',').map(Number); }); });
    var boxes = polys.map(function (pl) {
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      pl.forEach(function (p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); });
      return b;
    });
    LANDPTS = [];
    for (var lat = 79; lat >= -57; lat -= 2) {
      for (var lon = -169; lon < 190; lon += 2) {
        var hit = false;
        for (var i = 0; i < polys.length && !hit; i++) {
          var b = boxes[i];
          if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
          hit = inPoly(lon, lat, polys[i]);
        }
        if (hit) { var xy = px(lon, lat); LANDPTS.push([lon, lat, xy[0], xy[1]]); }
      }
    }
    return LANDPTS;
  }
  /* 从任务标题里认出写到的市场（只认已配置的市场） */
  function attribute(title, allowed) {
    var s = String(title || ''), found = [];
    ALIAS.forEach(function (pair) {
      var a = pair[0], i = s.indexOf(a);
      if (i === -1) return;
      while (i !== -1) { s = s.slice(0, i) + new Array(a.length + 1).join(' ') + s.slice(i + a.length); i = s.indexOf(a); }
      if (allowed[pair[1]] && found.indexOf(pair[1]) === -1) found.push(pair[1]);
    });
    var rx = /(^|[^A-Za-z])([A-Z]{2})(?=([^A-Za-z]|$))/g, m;
    while ((m = rx.exec(s))) {
      var code = CODE_ALIAS[m[2]] || m[2];
      if (!allowed[code] || found.indexOf(code) !== -1) continue;
      var after = s.slice(m.index + m[0].length, m.index + m[0].length + 2);
      if (CODE_PLAIN[m[2]] || /^(站|区|市场|店)/.test(after)) found.push(code);
    }
    return found;
  }

  WB.registerPart(ID, {
    meta: { label: 'GLOBAL', modes: ['main', 'role'] },
    mount: function (host, wb, opts) {
      injectCss();
      opts = opts || {};
      var company = wb.company || {};
      var co = company.company || {};
      var roles = company.roles || [];
      var mode = opts.mode === 'role' && opts.roleId && wb.roleById(opts.roleId) ? 'role' : 'main';
      var focusId = mode === 'role' ? opts.roleId : null;
      var focusRole = focusId ? wb.roleById(focusId) : null;
      var reduced = !!wb.reducedMotion;
      var uid = P + 'i' + (Math.random() * 1e9).toFixed(0);
      var destroyed = false;

      var root = document.createElement('div');
      root.className = P + 'root' + (mode === 'main' ? ' ' + P + 'main' : '') + (reduced ? ' ' + P + 'still' : '');
      host.appendChild(root);

      var colorOf = {};
      roles.forEach(function (r, i) { colorOf[r.id] = wb.roleColor(r.id) || FALL[i % FALL.length]; });
      function rc(id) { return colorOf[id] || 'var(--ok, #3dffa8)'; }

      /* 出发地与市场 */
      var oCode = String(co.origin || 'CN').toUpperCase();
      oCode = CODE_ALIAS[oCode] || oCode;
      var originUnknown = !MK[oCode];
      if (originUnknown) oCode = 'CN';
      var unknown = originUnknown ? [String(co.origin)] : [];
      var markets = [], allowed = {};
      (Array.isArray(co.markets) ? co.markets : []).forEach(function (raw) {
        var c = String(raw || '').trim().toUpperCase();
        c = CODE_ALIAS[c] || c;
        if (!c) return;
        if (!MK[c]) { if (unknown.indexOf(String(raw)) === -1) unknown.push(String(raw)); return; }
        if (allowed[c] || markets.length >= 24) return;
        allowed[c] = 1;
        markets.push(c);
      });

      /* 只来自状态的计数 */
      var doneSeen = {}, mktCount = {}, attributed = 0, doneCount = 0, ticker = [];
      markets.forEach(function (c) { mktCount[c] = 0; });
      var M = null, W0 = 0, H0 = 0, pending = 0, ro = null, roRaf = 0, offs = [], timers = [], comets = 0;

      /* ---------- 地图几何（尺寸变了才重算） ---------- */
      function geo(w, h) {
        var o = px(MK[oCode][1], MK[oCode][2]);
        var pts = [o], arcs = {};
        markets.forEach(function (c) {
          var p = px(MK[c][1], MK[c][2]);
          pts.push(p);
          var dist = Math.hypot(p[0] - o[0], p[1] - o[1]);
          if (dist < 2) { arcs[c] = { x: p[0], y: p[1], d: null }; return; }
          var cx = (o[0] + p[0]) / 2, cy = Math.min(o[1], p[1]) - dist * 0.28;
          arcs[c] = { x: p[0], y: p[1], cx: cx, cy: cy, d: 'M' + f1(o[0]) + ' ' + f1(o[1]) + ' Q' + f1(cx) + ' ' + f1(cy) + ' ' + f1(p[0]) + ' ' + f1(p[1]) };
          pts.push([(o[0] + 2 * cx + p[0]) / 4, (o[1] + 2 * cy + p[1]) / 4]);
        });
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
        var padX = 90, padY = 70;
        x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
        var A = w / h;
        var minW = Math.max(420, w / 2.6);
        var vw = Math.max(x1 - x0, minW), vh = vw / A;
        if (vh < y1 - y0) { vh = y1 - y0; vw = vh * A; }
        if (vw > W) { vw = W; }
        if (vh > H) { vh = H; }
        var cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2;
        var vx = clamp(cxm - vw / 2, 0, W - vw), vy = clamp(cym - vh / 2, 0, H - vh);
        var s = Math.min(w / vw, h / vh);
        var ox = (w - vw * s) / 2 - vx * s, oy = (h - vh * s) / 2 - vy * s;
        return { w: w, h: h, o: o, arcs: arcs, vb: [vx, vy, vw, vh], s: s, ox: ox, oy: oy, toHost: function (p) { return [p[0] * s + ox, p[1] * s + oy]; } };
      }

      function render() {
        var w = host.clientWidth, h = host.clientHeight;
        W0 = w; H0 = h;
        if (w < 80 || h < 80) { root.innerHTML = ''; M = null; return; }
        var g = geo(w, h), id = function (k) { return uid + '-' + k; };
        var R = rng(42), near = [g.o].concat(markets.map(function (c) { return [g.arcs[c].x, g.arcs[c].y]; }));
        var dots = '', hot = '', tw = '', nearR = 7 * K;
        landPoints().forEach(function (p) {
          var d = 'M' + f1(p[2] - 1.5) + ' ' + f1(p[3] - 1.5) + 'h3v3h-3z';
          var isHot = near.some(function (n) { return Math.hypot(n[0] - p[2], n[1] - p[3]) < nearR; });
          if (isHot) hot += d; else if (R() < 0.06) tw += d; else dots += d;
        });
        var grid = '';
        for (var lat = 60; lat >= -40; lat -= 20) grid += 'M0 ' + f1(px(0, lat)[1]) + 'H' + W;
        for (var lon = -150; lon < 190; lon += 30) grid += 'M' + f1(px(lon, 0)[0]) + ' 0V' + H;
        var grads = '', arcs = '', flows = '', cities = '', rings = '';
        markets.forEach(function (c, i) {
          var a = g.arcs[c];
          if (a.d) {
            grads += '<linearGradient id="' + id('a' + i) + '" gradientUnits="userSpaceOnUse" x1="' + f1(g.o[0]) + '" y1="' + f1(g.o[1]) + '" x2="' + f1(a.x) + '" y2="' + f1(a.y) + '">' +
              '<stop offset="0" style="stop-color:var(--accent2,#FF5C9A)"/><stop offset=".5" style="stop-color:var(--accent,#5FF2D6)"/><stop offset="1" style="stop-color:var(--ok,#C8F542)"/></linearGradient>';
            arcs += '<path class="' + P + 'arc" d="' + a.d + '" stroke="url(#' + id('a' + i) + ')"/>';
            flows += '<path class="' + P + 'flow" d="' + a.d + '" style="animation-delay:-' + (R() * 3).toFixed(2) + 's"/>';
          }
          cities += '<circle class="' + P + 'city" cx="' + f1(a.x) + '" cy="' + f1(a.y) + '" r="4"/>';
          rings += '<circle class="' + P + 'ring" cx="' + f1(a.x) + '" cy="' + f1(a.y) + '" r="4" style="animation-delay:-' + (R() * 2.4).toFixed(2) + 's"/>';
        });
        var vb = g.vb.map(f1).join(' ');
        var sweep = reduced ? '' : '<rect x="' + f1(g.vb[0] - 160) + '" y="0" width="160" height="' + H + '" fill="url(#' + id('sw') + ')">' +
          '<animate attributeName="x" from="' + f1(g.vb[0] - 160) + '" to="' + f1(g.vb[0] + g.vb[2]) + '" dur="8s" repeatCount="indefinite"/></rect>';
        var svg = '<svg class="' + P + 'svg" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" aria-label="全球市场地图"><defs>' +
          '<radialGradient id="' + id('bg') + '" cx="62%" cy="40%" r="70%"><stop offset="0" style="stop-color:var(--accent,#35e0ff);stop-opacity:.12"/><stop offset="1" style="stop-color:var(--accent,#35e0ff);stop-opacity:0"/></radialGradient>' +
          '<filter id="' + id('gl') + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
          '<linearGradient id="' + id('sw') + '" x1="0" x2="1"><stop offset="0" style="stop-color:var(--accent,#5FF2D6);stop-opacity:0"/><stop offset=".85" style="stop-color:var(--accent,#5FF2D6);stop-opacity:.1"/><stop offset="1" style="stop-color:var(--accent,#5FF2D6);stop-opacity:.35"/></linearGradient>' +
          grads + '</defs>' +
          '<rect width="' + W + '" height="' + H + '" fill="url(#' + id('bg') + ')"/>' +
          '<path class="' + P + 'grid" d="' + grid + '"/>' +
          '<path class="' + P + 'dots" d="' + dots + '"/>' +
          (tw ? '<path class="' + P + 'tw" d="' + tw + '"/>' : '') + sweep +
          (hot ? '<path class="' + P + 'hotd" d="' + hot + '"/>' : '') +
          '<g filter="url(#' + id('gl') + ')">' + arcs + cities +
            '<circle class="' + P + 'origin" cx="' + f1(g.o[0]) + '" cy="' + f1(g.o[1]) + '" r="7"/></g>' +
          flows + rings +
          '<circle class="' + P + 'oring" cx="' + f1(g.o[0]) + '" cy="' + f1(g.o[1]) + '" r="7"/><circle class="' + P + 'oring r2" cx="' + f1(g.o[0]) + '" cy="' + f1(g.o[1]) + '" r="7"/>' +
          '<g class="' + P + 'comets"></g><g class="' + P + 'pulses"></g></svg>';

        var small = w < 620 || h < 380;
        var hud = '<div class="' + P + 'hud' + (small ? ' small' : '') + '"><div class="' + P + 'eb">GLOBAL MARKETS</div>' +
          '<b class="' + P + 'tt">' + esc(focusRole ? (focusRole.name || focusRole.id) + ' · 全球市场' : '全球市场') + '</b>' +
          '<div class="' + P + 'sub">出发地 ' + esc(MK[oCode][0]) + ' → ' + (markets.length ? markets.length + ' 个目标市场' : '还没有设置目标市场') + '</div>' +
          '<div class="' + P + 'stats"><span class="ok" title="打开页面以来完成的任务">已完成<b data-k="done">0</b></span>' +
            '<span class="w" title="正在做的任务">进行中<b data-k="work">0</b></span>' +
            (markets.length ? '<span title="任务标题里写了目标市场名的已完成任务">标明市场<b data-k="attr">0</b></span>' : '') + '</div>' +
          (unknown.length ? '<div class="' + P + 'note">没认出的市场：' + esc(unknown.join('、')) + '</div>' : '') + '</div>';
        var showTick = h >= 300 && w >= 520;
        root.innerHTML = svg + '<svg class="' + P + 'lead" aria-hidden="true"></svg>' + hud + (showTick ? '<div class="' + P + 'tick"></div>' : '');

        M = { g: g, comets: root.querySelector('.' + P + 'comets'), pulses: root.querySelector('.' + P + 'pulses'), lead: root.querySelector('.' + P + 'lead'),
          hud: root.querySelector('.' + P + 'hud'), tick: root.querySelector('.' + P + 'tick'), labels: {}, tickMax: h >= 520 ? 4 : 2, tickKey: '' };
        M.stat = {};
        Array.prototype.forEach.call(M.hud.querySelectorAll('b[data-k]'), function (b) { M.stat[b.getAttribute('data-k')] = b; });
        placeLabels();
        update();
      }

      /* ---------- 标签避让：先放出发地，再按顺序给每个市场找不重叠的位置 ---------- */
      function placeLabels() {
        var g = M.g, w = g.w, h = g.h, placed = [], lead = '';
        var hr = M.hud.getBoundingClientRect(), rr = root.getBoundingClientRect();
        var avoid = [[hr.left - rr.left - 4, hr.top - rr.top - 4, hr.width + 8, hr.height + 8]];
        if (M.tick) avoid.push([8, h - 12 - M.tickMax * 26 - 4, Math.min(360, w * 0.52) + 8, M.tickMax * 26 + 8]);
        function hits(r) {
          if (r[0] < 4 || r[1] < 4 || r[0] + r[2] > w - 4 || r[1] + r[3] > h - 4) return true;
          return placed.concat(avoid).some(function (b) { return r[0] < b[0] + b[2] && r[0] + r[2] > b[0] && r[1] < b[1] + b[3] && r[1] + r[3] > b[1]; });
        }
        function put(pt, lw, lh) {
          var dirs = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 1], [-1, -1], [-1, 1]];
          for (var ring = 1; ring <= 4; ring++) {
            var dist = ring === 1 ? 9 : 9 + (ring - 1) * 22;
            for (var i = 0; i < dirs.length; i++) {
              var dx = dirs[i][0], dy = dirs[i][1];
              var x = dx > 0 ? pt[0] + dist : dx < 0 ? pt[0] - dist - lw : pt[0] - lw / 2;
              var y = dy > 0 ? pt[1] + dist : dy < 0 ? pt[1] - dist - lh : pt[1] - lh / 2;
              var r = [x, y, lw, lh];
              if (!hits(r)) return { r: r, far: ring > 1 };
            }
          }
          return { r: [clamp(pt[0] + 9, 4, w - lw - 4), clamp(pt[1] - lh / 2, 4, h - lh - 4), lw, lh], far: false };
        }
        root.querySelectorAll('.' + P + 'mk,.' + P + 'ol').forEach(function (el) { el.parentNode.removeChild(el); });
        var o = g.toHost(g.o);
        var ow = 30 + MK[oCode][0].length * 12 + 34;
        var op = put(o, ow, 22);
        placed.push(op.r);
        var ol = document.createElement('div');
        ol.className = P + 'ol';
        ol.style.left = f1(op.r[0]) + 'px'; ol.style.top = f1(op.r[1]) + 'px';
        ol.innerHTML = '<span>出发地</span><b>' + esc(MK[oCode][0]) + '</b>';
        root.appendChild(ol);
        markets.forEach(function (c) {
          var a = g.arcs[c], pt = g.toHost([a.x, a.y]);
          var lw = 7 + 18 + 5 + MK[c][0].length * 12 + 5 + 24 + 7, lh = 22;
          var res = put(pt, lw, lh);
          placed.push(res.r);
          var el = document.createElement('div');
          el.className = P + 'mk';
          el.setAttribute('data-cc', c);
          el.title = MK[c][0] + '：标题里写了这个市场的已完成任务数';
          el.style.left = f1(res.r[0]) + 'px'; el.style.top = f1(res.r[1]) + 'px';
          el.innerHTML = '<b>' + c + '</b><span>' + esc(MK[c][0]) + '</span><em class="zero">0</em>';
          root.insertBefore(el, M.hud);
          M.labels[c] = { el: el, n: el.querySelector('em') };
          if (res.far) {
            var cx = clamp(pt[0], res.r[0], res.r[0] + lw), cy = clamp(pt[1], res.r[1], res.r[1] + lh);
            lead += 'M' + f1(pt[0]) + ' ' + f1(pt[1]) + 'L' + f1(cx) + ' ' + f1(cy);
          }
        });
        M.lead.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        M.lead.innerHTML = lead ? '<path d="' + lead + '"/>' : '';
      }

      /* ---------- 彗星与闪光 ---------- */
      function comet(c, color) {
        if (!M || reduced || comets > 12) { flashLabel(c); return; }
        var a = M.g.arcs[c];
        if (!a || !a.d) { pulse(c, color); return; }
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', a.d);
        p.setAttribute('class', P + 'comet');
        p.style.stroke = color;
        M.comets.appendChild(p);
        comets++;
        var L = p.getTotalLength ? p.getTotalLength() : 600;
        p.style.strokeDasharray = '60 ' + f1(L + 60);
        p.style.strokeDashoffset = '60';
        var fin = function () { comets = Math.max(0, comets - 1); if (p.parentNode) p.parentNode.removeChild(p); pulse(c, color); };
        if (p.animate) {
          var an = p.animate([{ strokeDashoffset: '60px' }, { strokeDashoffset: f1(-L) + 'px' }], { duration: 1800, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
          an.onfinish = fin;
        } else {
          p.getBoundingClientRect();
          p.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.5,0,.3,1)';
          p.style.strokeDashoffset = String(-L);
          timers.push(setTimeout(fin, 1800));
        }
      }
      function pulse(c, color) {
        if (!M || destroyed) return;
        var a = c ? M.g.arcs[c] : null, x = a ? a.x : M.g.o[0], y = a ? a.y : M.g.o[1];
        if (!reduced) {
          var ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ci.setAttribute('cx', f1(x)); ci.setAttribute('cy', f1(y)); ci.setAttribute('r', '6');
          ci.setAttribute('class', P + 'pulse');
          ci.style.stroke = color;
          M.pulses.appendChild(ci);
          timers.push(setTimeout(function () { if (ci.parentNode) ci.parentNode.removeChild(ci); }, 1600));
        }
        flashLabel(c);
      }
      function flashLabel(c) {
        var l = M && c && M.labels[c];
        if (!l) return;
        l.el.classList.remove('flash');
        void l.el.offsetWidth;
        l.el.classList.add('flash');
        if (reduced) timers.push(setTimeout(function () { l.el.classList.remove('flash'); }, 1500));
      }

      /* ---------- 完成记录 ---------- */
      function onDone(t, live) {
        if (!t || !t.id || doneSeen[t.id]) return;
        doneSeen[t.id] = 1;
        if (focusId && t.roleId !== focusId) return;
        doneCount++;
        var ccs = attribute(t.title, allowed);
        ccs.forEach(function (c) { mktCount[c] = (mktCount[c] || 0) + 1; });
        if (ccs.length) attributed++;
        var r = wb.roleById(t.roleId);
        ticker.unshift({ t: t.updatedAt || Date.now(), roleId: t.roleId, name: r ? r.name : (t.roleId || ''), title: t.title || '', ccs: ccs });
        if (ticker.length > 12) ticker.length = 12;
        if (live && M) {
          var color = rc(t.roleId);
          var targets = ccs.length ? ccs.slice(0, 3) : (markets.length ? [markets[Math.floor(Math.random() * markets.length)]] : [null]);
          targets.forEach(function (c, i) {
            if (c == null) { pulse(null, color); return; }
            if (i === 0) comet(c, color);
            else timers.push(setTimeout(function () { if (!destroyed) comet(c, color); }, i * 260));
          });
        }
        schedule();
      }

      /* ---------- 实时刷新 ---------- */
      function update() {
        pending = 0;
        if (destroyed || !M) return;
        var st = wb.getState();
        if (!st) return;
        var sr = st.roles || {}, tasks = st.tasks || [];
        var sumDone = 0;
        Object.keys(sr).forEach(function (id) { if (!focusId || id === focusId) sumDone += Number(sr[id].done) || 0; });
        var total = Math.max(sumDone, doneCount);
        var work = tasks.filter(function (t) { return t.status === 'working' && (!focusId || t.roleId === focusId); }).length;
        if (M.stat.done) M.stat.done.textContent = String(total);
        if (M.stat.work) M.stat.work.textContent = String(work);
        if (M.stat.attr) M.stat.attr.textContent = String(attributed);
        markets.forEach(function (c) {
          var l = M.labels[c];
          if (!l) return;
          var n = String(mktCount[c] || 0);
          if (l.n.textContent !== n) l.n.textContent = n;
          l.n.className = mktCount[c] ? '' : 'zero';
        });
        if (M.tick) {
          var list = ticker.slice(0, M.tickMax);
          var key = list.map(function (x) { return x.t + x.title; }).join('|');
          if (key !== M.tickKey) {
            M.tickKey = key;
            M.tick.innerHTML = list.map(function (x) {
              return '<div class="' + P + 'tk" data-r="' + esc(x.roleId) + '" style="--rc:' + rc(x.roleId) + '" title="' + esc(x.title) + '"><span>' + hhmm(x.t) + '</span><b>' + esc(x.name) + '</b>完成 ' + esc(x.title) +
                (x.ccs.length ? '<i>→ ' + esc(x.ccs.map(function (c) { return MK[c][0]; }).join('、')) + '</i>' : '') + '</div>';
            }).join('');
          }
        }
      }
      function schedule() { if (!pending && !destroyed) pending = setTimeout(update, 250); }

      /* 打开前已经完成的任务（状态里还留着的）先记上，但不放彗星 */
      (wb.getState() && wb.getState().tasks || []).slice().reverse().forEach(function (t) { if (t.status === 'done') onDone(t, false); });

      offs.push(wb.on('task', function (t) { if (t && t.status === 'done') onDone(t, true); else schedule(); }));
      offs.push(wb.on('role', schedule));
      offs.push(wb.on('tick', schedule));
      function onClick(e) {
        var tk = e.target.closest && e.target.closest('.' + P + 'tk');
        if (tk && mode === 'main' && wb.roleById(tk.getAttribute('data-r'))) wb.open(tk.getAttribute('data-r'));
      }
      root.addEventListener('click', onClick);
      function resize() {
        if (destroyed) return;
        var w = host.clientWidth, h = host.clientHeight;
        if (Math.abs(w - W0) < 2 && Math.abs(h - H0) < 2 && (M || w < 80 || h < 80)) return;
        render();
      }
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(function () {
          if (roRaf) return;
          roRaf = requestAnimationFrame(function () { roRaf = 0; resize(); });
        });
        ro.observe(host);
      }

      render();

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
          M = null;
        }
      };
    }
  });
})();
