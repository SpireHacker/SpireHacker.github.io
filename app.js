/* ============================================================
   SPIRE — site interactions
   ============================================================ */
(function () {
  'use strict';

  // 不做 prefers-reduced-motion 降级：系统关掉动画效果时浏览器会报 reduce，
  // 跟着降级整站就静止了，用户要的就是动效。
  var reduceMotion = false;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------------------------------------------------------
     1. 语言切换
     --------------------------------------------------------- */
  var LANG_KEY = 'spire.lang';
  var langBtn = document.getElementById('langBtn');
  var langLabel = document.getElementById('langLabel');
  var mainEl = document.querySelector('main');

  document.querySelectorAll('[data-en]').forEach(function (el) {
    el.dataset.zh = el.textContent.trim();
  });
  document.querySelectorAll('[data-en-html]').forEach(function (el) {
    el.dataset.zhHtml = el.innerHTML;
  });

  function applyLang(lang) {
    var en = lang === 'en';
    document.documentElement.lang = en ? 'en' : 'zh-CN';

    document.querySelectorAll('[data-en]').forEach(function (el) {
      el.textContent = en ? el.dataset.en : el.dataset.zh;
    });
    document.querySelectorAll('[data-en-html]').forEach(function (el) {
      el.innerHTML = en ? el.dataset.enHtml : el.dataset.zhHtml;
    });

    if (langLabel) langLabel.textContent = en ? '中文' : 'EN';
    if (langBtn) langBtn.setAttribute('aria-label', en ? 'Switch to Chinese' : '切换到英文');

    if (mainEl && !reduceMotion) {
      mainEl.classList.remove('lang-fade');
      void mainEl.offsetWidth;
      mainEl.classList.add('lang-fade');
    }

    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    requestAnimationFrame(function () { movePill(false); });
  }

  var savedLang = 'zh';
  try { savedLang = localStorage.getItem(LANG_KEY) || 'zh'; } catch (e) {}
  if (savedLang === 'en') applyLang('en');

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      var next = document.documentElement.lang === 'en' ? 'zh' : 'en';
      applyLang(next);
      langBtn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(.93)' }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)' }
      );
    });
  }

  /* ---------------------------------------------------------
     2. 导航
     --------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  function closeMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  function syncScrollMargin() {
    var h = (nav ? nav.offsetHeight : 72) + 18;
    document.querySelectorAll('section[id], main[id]').forEach(function (s) {
      s.style.scrollMarginTop = h + 'px';
    });
  }
  syncScrollMargin();
  window.addEventListener('resize', syncScrollMargin);

  /* ---------------------------------------------------------
     3. 滚动：进度条 / 导航收缩 / 锚点高亮 / 展示区视差
     --------------------------------------------------------- */
  var scrollBar = document.getElementById('scrollBar');
  var showcase = document.getElementById('showcase');
  var navAnchors = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );
  var spySections = navAnchors.map(function (a) {
    return document.querySelector(a.getAttribute('href'));
  });

  var ticking = false;

  function onScrollFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;

    if (nav) nav.classList.toggle('scrolled', y > 24);

    if (scrollBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.setProperty('--p', max > 0 ? Math.min(y / max, 1) : 0);
    }

    if (!reduceMotion && showcase) {
      var r = showcase.getBoundingClientRect();
      var center = r.top + r.height / 2 - window.innerHeight / 2;
      var par = Math.max(-16, Math.min(16, -center * 0.035));
      showcase.style.setProperty('--par', par.toFixed(2) + 'px');
    }

    // 当前所在区块
    var probe = y + (nav ? nav.offsetHeight : 72) + 120;
    var current = -1;
    for (var i = 0; i < spySections.length; i++) {
      var s = spySections[i];
      if (s && s.offsetTop <= probe) current = i;
    }
    navAnchors.forEach(function (a, idx) {
      a.classList.toggle('active', idx === current);
    });
  }

  function requestScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScrollFrame);
  }

  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);
  onScrollFrame();

  /* ---------------------------------------------------------
     4. 滚动揭示
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------------------------------------------------
     5. 数字滚动
     --------------------------------------------------------- */
  function countUp(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var suffix = el.dataset.suffix || '';
    var host = el.parentElement;

    if (reduceMotion) { el.textContent = target + suffix; return; }

    var start = performance.now();
    var dur = 1400;

    function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) {
        requestAnimationFrame(step);
      } else if (host) {
        host.classList.add('bump');
        setTimeout(function () { host.classList.remove('bump'); }, 320);
      }
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          countUp(e.target);
          cio.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = el.dataset.count + (el.dataset.suffix || '');
    });
  }

  /* ---------------------------------------------------------
     6. 模块 Tab + 滑动药丸
     --------------------------------------------------------- */
  var tabsEl = document.querySelector('.tabs');
  var pill = tabsEl ? tabsEl.querySelector('.tab-pill') : null;
  var tabs = document.querySelectorAll('.tab');
  var panels = document.querySelectorAll('.panel');

  function movePill(animate) {
    if (!tabsEl || !pill) return;
    var active = tabsEl.querySelector('.tab.active');
    if (!active) return;

    if (!animate) pill.style.transition = 'none';
    pill.style.left = active.offsetLeft + 'px';
    pill.style.top = active.offsetTop + 'px';
    pill.style.width = active.offsetWidth + 'px';
    pill.style.height = active.offsetHeight + 'px';
    if (!animate) {
      void pill.offsetWidth;
      pill.style.transition = '';
    }
    pill.classList.add('ready');
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.dataset.tab;
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      panels.forEach(function (p) {
        p.classList.toggle('active', p.dataset.panel === key);
      });
      movePill(true);
    });
  });

  movePill(false);
  window.addEventListener('resize', function () { movePill(false); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { movePill(false); });
  }

  /* ---------------------------------------------------------
     7. 卡片：跟随光斑 + 3D 倾斜
     --------------------------------------------------------- */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (ev) {
        var r = card.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width;
        var py = (ev.clientY - r.top) / r.height;

        card.style.setProperty('--px', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--py', (py * 100).toFixed(1) + '%');
        card.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2) + 'deg');
        card.classList.add('tilting');
      });

      card.addEventListener('pointerleave', function () {
        card.classList.remove('tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------------------------------------------------------
     8. 磁性按钮（大按钮向光标轻微偏移）
     --------------------------------------------------------- */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll('.btn-lg').forEach(function (btn) {
      btn.addEventListener('pointermove', function (ev) {
        var r = btn.getBoundingClientRect();
        var dx = (ev.clientX - r.left - r.width / 2) / (r.width / 2);
        var dy = (ev.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.setProperty('--mgx', (dx * 4).toFixed(2) + 'px');
        btn.style.setProperty('--mgy', (dy * 3).toFixed(2) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mgx', '0px');
        btn.style.setProperty('--mgy', '0px');
      });
    });
  }

  /* ---------------------------------------------------------
     9. 鼠标光晕
     --------------------------------------------------------- */
  var glow = document.getElementById('cursorGlow');
  if (glow && !reduceMotion && finePointer) {
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    var tx = gx, ty = gy;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      glow.style.opacity = '1';
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      glow.style.opacity = '0';
    });

    (function loop() {
      gx += (tx - gx) * 0.09;
      gy += (ty - gy) * 0.09;
      glow.style.transform = 'translate(' + (gx - 310) + 'px,' + (gy - 310) + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------------------------------------------------
     10. 星空粒子
     --------------------------------------------------------- */
  var canvas = document.getElementById('stars');
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var dots = [];

    function resize() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var density = Math.min(120, Math.max(38, Math.round(W * H / 18000)));
      dots = [];
      for (var i = 0; i < density; i++) {
        dots.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.5 + 0.4,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          a: Math.random() * 0.42 + 0.22,
          hue: Math.random() > 0.55 ? '167,139,250' : '34,211,238'
        });
      }
    }

    var LINK = 118;
    function frame() {
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < -20) d.x = W + 20;
        if (d.x > W + 20) d.x = -20;
        if (d.y < -20) d.y = H + 20;
        if (d.y > H + 20) d.y = -20;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + d.hue + ',' + d.a + ')';
        ctx.fill();
      }

      for (var a = 0; a < dots.length; a++) {
        for (var b = a + 1; b < dots.length; b++) {
          var dx = dots[a].x - dots[b].x;
          var dy = dots[a].y - dots[b].y;
          var dist2 = dx * dx + dy * dy;
          if (dist2 < LINK * LINK) {
            var o = (1 - Math.sqrt(dist2) / LINK) * 0.16;
            ctx.beginPath();
            ctx.moveTo(dots[a].x, dots[a].y);
            ctx.lineTo(dots[b].x, dots[b].y);
            ctx.strokeStyle = 'rgba(167,139,250,' + o + ')';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     11. ClickGUI 预览
     --------------------------------------------------------- */
  // 点标题展开 / 收起。和客户端一致：高度 500ms easeInOutCubic，标题 200ms 滑到居中，
  // 展开的栏盖住下面的栏（绝对定位，不挤开别的）。左列同时只开一个，免得整列被糊住。
  var colFrames = Array.prototype.slice.call(document.querySelectorAll('.cg-col .cg-frame'));

  document.querySelectorAll('.cg-frame').forEach(function (frame) {
    var head = frame.querySelector('.cg-head');
    if (!head) return;
    head.addEventListener('click', function () {
      var willOpen = !frame.classList.contains('opened');
      if (willOpen && colFrames.indexOf(frame) >= 0) {
        colFrames.forEach(function (other) {
          if (other !== frame) other.classList.remove('opened');
        });
      }
      frame.classList.toggle('opened', willOpen);
    });
  });

  // 点行切换开关
  document.querySelectorAll('.cg-e').forEach(function (row) {
    row.addEventListener('click', function () {
      row.classList.toggle('on');
    });
  });

  /* ---------------------------------------------------------
     12. 左下角开发者名逐字揭示（ClickGui.onRenderTick 同款）
     --------------------------------------------------------- */
  var devEl = document.getElementById('cgDev');
  if (devEl && !reduceMotion) {
    var DEV_TEXT = 'dev, spireRF';
    var devStart = performance.now();

    var devTick = setInterval(function () {
      var n = Math.floor((performance.now() - devStart) / 200);
      if (n >= DEV_TEXT.length) {
        devEl.textContent = DEV_TEXT;
        clearInterval(devTick);
        return;
      }
      var out = '';
      for (var i = 0; i < DEV_TEXT.length; i++) {
        out += i < n ? DEV_TEXT.charAt(i)
                     : String.fromCharCode(97 + Math.floor(Math.random() * 26));
      }
      devEl.textContent = out;
    }, 70);
  }

  /* ---------------------------------------------------------
     13. 路径树：进入视野后逐行点亮
     --------------------------------------------------------- */
  var pathCard = document.querySelector('.path-card');
  if (pathCard) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            pathCard.classList.add('seq');
            pio.unobserve(pathCard);
          }
        });
      }, { threshold: 0.4 });
      pio.observe(pathCard);
    } else {
      pathCard.classList.add('seq');
    }
  }

  /* ---------------------------------------------------------
     14. FAQ：高度展开/收起动画，同时只留一项
     --------------------------------------------------------- */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq details'));

  function setOpenInstant(d, open) {
    d.open = open;
  }

  function expand(d) {
    if (d.dataset.anim === '1') return;
    d.dataset.anim = '1';
    var h0 = d.offsetHeight;
    d.open = true;
    var h1 = d.offsetHeight;
    d.style.overflow = 'hidden';
    var anim = d.animate(
      [{ height: h0 + 'px' }, { height: h1 + 'px' }],
      { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)' }
    );
    anim.onfinish = anim.oncancel = function () {
      d.style.overflow = '';
      delete d.dataset.anim;
    };
  }

  function collapse(d) {
    if (d.dataset.anim === '1' || !d.open) return;
    d.dataset.anim = '1';
    var h1 = d.offsetHeight;
    d.style.overflow = 'hidden';
    var anim = d.animate(
      [{ height: h1 + 'px' }, { height: '0px' }],
      { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' }
    );
    anim.onfinish = anim.oncancel = function () {
      d.open = false;
      d.style.overflow = '';
      delete d.dataset.anim;
    };
  }

  faqItems.forEach(function (d) {
    var sum = d.querySelector('summary');
    if (!sum) return;
    sum.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (reduceMotion) { setOpenInstant(d, !d.open); return; }

      if (d.open) {
        collapse(d);
        return;
      }
      faqItems.forEach(function (other) {
        if (other !== d && other.open) collapse(other);
      });
      expand(d);
    });
  });
})();
