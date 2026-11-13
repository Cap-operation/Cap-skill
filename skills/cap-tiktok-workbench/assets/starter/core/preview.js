/* 看图挑选（pick.html）用：地址带 ?preview=1 时，用地址里的参数临时覆盖视觉设置，不改配置文件。
 * 只接受白名单里的值；只听父页面（pick.html）发来的“放一次庆祝 / 派一个活”消息。 */
(function () {
  var q = new URLSearchParams(location.search);
  if (!q.has('preview') || !window.WB_COMPANY) return;
  var th = window.WB_COMPANY.theme = window.WB_COMPANY.theme || {};
  var ok = {
    palette: ['cyber', 'neon', 'aurora', 'amber', 'jade', 'ice'],
    motion: ['calm', 'normal', 'wild'],
    celebrate: ['fireworks', 'confetti', 'comet', 'none'],
    opening: ['boot', 'reveal', 'none']
  };
  Object.keys(ok).forEach(function (k) { var v = q.get(k); if (v && ok[k].indexOf(v) !== -1) th[k] = v; });
  var sc = q.get('scene');
  if (sc && /^[a-z0-9-]{2,40}$/.test(sc)) th.main_scene = sc;
  if (q.has('fx')) {
    th.fx = (q.get('fx') || '').split(',').filter(function (v) { return ['grid', 'stars', 'rain', 'aurora', 'bokeh', 'scan'].indexOf(v) !== -1; });
  }
  if (q.has('accent')) {
    var acc = q.get('accent');
    if (/^#[0-9a-fA-F]{6}$/.test(acc)) th.accent = acc; else delete th.accent;
  }
  document.documentElement.classList.add('wb-preview');
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var d = e.data || {};
    if (d.wb === 'celebrate' && window.WorkbenchFX && ok.celebrate.indexOf(d.kind) !== -1 && d.kind !== 'none') {
      var s = document.querySelector('.stage'), b = s ? s.getBoundingClientRect() : null;
      window.WorkbenchFX.celebrate(d.kind, b ? b.left + b.width / 2 : innerWidth / 2, b ? b.top + b.height / 2 : innerHeight / 2);
    }
  });
})();
