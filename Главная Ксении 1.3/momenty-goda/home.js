/* Моменты года · главная страница: появление при прокрутке, карта в первом экране, примеры вопросов. */
(function () {
  "use strict";
  var M = window.Momenty, SITE = window.SITE || {};
  if (!M) return;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Появление при прокрутке и рисованные линии ----------
  var targets = document.querySelectorAll("[data-reveal], .hd, .hero-visual, .trace");
  if (!("IntersectionObserver" in window) || reduce) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  var examples = (SITE.examples || []).filter(function (id) { return M.cards[id]; });
  if (!examples.length) examples = Object.keys(M.cards).slice(0, 6).map(Number);

  // Лицо карты меняем, только пока оно скрыто, а рубашку только когда видно лицо.
  // Так при перевороте ничего не «прыгает».
  function setFace(cardEl, id) {
    var c = M.cards[id], face = cardEl.querySelector(".card-face");
    M.fillFace(c, face.querySelector(".face-icon.top"), face.querySelector(".face-text"), face.querySelector(".face-icon.bot"), cardEl);
    return c;
  }
  function setBack(cardEl, id) { cardEl.querySelector(".card-back img").src = "img/back-" + M.cards[id].deck + ".svg"; }
  var FLIP = reduce ? 0 : 700;

  // ---------- Карта в первом экране: лежит вопросом вверх, без переворота ----------
  var hero = $("hero-card");
  if (hero) setFace(hero, examples[Math.floor(Math.random() * examples.length)]);

  // ---------- Созвездия: олень, кролик, сердце ----------
  var SHAPES = {
    heart: "M50 90L31 73L15 56L8 38L13 21L27 12L41 15L50 28L59 15L73 12L87 21L92 38L85 56L69 73Z",
    rabbit: "M40 42L33 22L38 4M60 42L67 22L62 4M40 42L29 56L35 73L50 80L65 73L71 56L60 42Z",
    deer: "M43 42L33 27L25 9M33 27L16 24M29 18L37 6M57 42L67 27L75 9M67 27L84 24M71 18L63 6M43 42L38 58L45 75L50 88L55 75L62 58L57 42Z",
    moon: "M60 6L40 12L26 28L22 50L28 70L44 86L66 92L54 78L46 62L44 44L48 26L60 6",
    cassiopeia: "M6 34L28 66L50 40L72 70L94 30",
    star: "M50 8L57 42L92 50L57 58L50 92L43 58L8 50L43 42Z"
  };
  var EXTRA = { heart: [[50, 52], [30, 36], [70, 34], [4, 84], [96, 6], [100, 70]], moon: [[84, 30], [76, 64]], cassiopeia: [[40, 86], [86, 90]], star: [[20, 16], [82, 84]], rabbit: [[43, 58], [57, 58], [88, 84], [10, 90]], deer: [[44, 56], [56, 56], [8, 70], [92, 76]] };
  var NS = "http://www.w3.org/2000/svg";
  Array.prototype.forEach.call(document.querySelectorAll(".constellation"), function (svg) {
    var key = svg.getAttribute("data-shape"), d = SHAPES[key];
    if (!d) return;
    svg.setAttribute("viewBox", "-6 -6 112 112");
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", d); path.setAttribute("pathLength", "1"); path.setAttribute("class", "c-line");
    svg.appendChild(path);
    var pts = [], seen = {};
    d.replace(/(\d+) (\d+)/g, function (m, x, y) { if (!seen[m]) { seen[m] = 1; pts.push([+x, +y]); } });
    pts = pts.concat(EXTRA[key] || []);
    pts.forEach(function (p, i) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]);
      c.setAttribute("r", i % 5 === 0 ? 2.6 : i % 2 ? 1.6 : 2);
      c.setAttribute("class", "c-star" + (i % 3 === 0 ? " tw" : ""));
      c.style.setProperty("--d", (0.3 + i / pts.length * 1.8).toFixed(2) + "s");
      c.style.animationDelay = (i * 0.37 % 3).toFixed(2) + "s";
      svg.appendChild(c);
    });
    // созвездие прорисовывается целиком, когда его видно, и не зависит от того, где остановилась прокрутка
    if (reduce || !("IntersectionObserver" in window)) { svg.classList.add("is-drawn"); return; }
    var co = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { svg.classList.add("is-drawn"); co.disconnect(); } }, { threshold: 0.6 });
    co.observe(svg);
  });

  // ---------- Карты в разделах «О проекте» и «Колоды» ----------
  Array.prototype.forEach.call(document.querySelectorAll(".card[data-card]"), function (el) {
    var id = +el.getAttribute("data-card");
    if (!M.cards[id]) return;
    var face = el.querySelector(".card-face");
    M.fillFace(M.cards[id], face.querySelector(".face-icon.top"), face.querySelector(".face-text"), face.querySelector(".face-icon.bot"), el);
  });

  // ---------- Меню для телефона ----------
  var burger = $("burger"), menu = $("menu");
  function setMenu(open) {
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("menu-open", open);
    // пока меню открыто, Tab ходит только по меню
    Array.prototype.forEach.call(document.querySelectorAll("main, #site-footer"), function (el) {
      if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    });
    if (open) { var first = menu.querySelector("a"); if (first) first.focus(); }
  }
  burger.addEventListener("click", function () { setMenu(menu.hidden); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  // Tab с последнего пункта меню возвращается к кнопке меню
  menu.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var links = menu.querySelectorAll("a"), last = links[links.length - 1];
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); burger.focus(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); burger.focus(); } });
  window.addEventListener("resize", function () { if (window.innerWidth >= 1000 && !menu.hidden) setMenu(false); });
  document.addEventListener("screenchange", function () { if (!menu.hidden) setMenu(false); });

  // ---------- Якоря внутри главной: плавная прокрутка без смены экрана ----------
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[data-scroll]");
    if (!link || $("screen-home").hidden) return;
    var target = $(link.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    if (target.tagName === "DETAILS") target.open = true;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    history.replaceState(null, "", link.getAttribute("href"));
  });

  // ---------- Подсветка текущего раздела в навигации ----------
  var navLinks = document.querySelectorAll(".nav a");
  if ("IntersectionObserver" in window && navLinks.length) {
    var byId = {};
    Array.prototype.forEach.call(navLinks, function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Array.prototype.forEach.call(navLinks, function (a) { a.classList.remove("active"); });
        if (byId[e.target.id]) byId[e.target.id].classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { var el = $(id); if (el) spy.observe(el); });
  }


  // ================= Фактура и «моменты» =================
  var fine = window.matchMedia && matchMedia("(pointer: fine)").matches;

  // Фраза-момент проступает по словам
  Array.prototype.forEach.call(document.querySelectorAll("[data-words]"), function (el) {
    var words = el.textContent.split(" ");
    el.textContent = "";
    words.forEach(function (w, i) {
      var sp = document.createElement("span");
      sp.className = "w"; sp.textContent = w; sp.style.transitionDelay = (i * 0.18) + "s";
      el.appendChild(sp);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    if (reduce || !("IntersectionObserver" in window)) { el.classList.add("is-on"); return; }
    var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { el.classList.add("is-on"); o.disconnect(); } }); }, { threshold: 0.5 });
    o.observe(el);
  });

  if (!reduce) (function effects() {
  // Пыль на тёмных секциях: медленные светлые частицы, часть мерцает
  Array.prototype.forEach.call(document.querySelectorAll("[data-dust]"), function (sec) {
    var cv = document.createElement("canvas"); cv.className = "dust"; cv.setAttribute("aria-hidden", "true");
    sec.insertBefore(cv, sec.firstChild);
    var ctx = cv.getContext("2d"), parts = [], w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), run = false, raf = 0;
    function size() {
      w = sec.offsetWidth; h = sec.offsetHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(90, w * h / 9000));
      parts = [];
      for (var i = 0; i < n; i++) parts.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + .3, a: Math.random() * .5 + .1, vy: -(Math.random() * .18 + .04), ph: Math.random() * 6.28, tw: Math.random() < .25, g: Math.random() < .22 });
    }
    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy; p.x += Math.sin(t / 3000 + p.ph) * .12;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        var a = p.tw ? p.a * (.5 + .5 * Math.sin(t / 700 + p.ph)) : p.a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = (p.g ? "rgba(202,187,144," : "rgba(244,240,230,") + a.toFixed(3) + ")"; ctx.fill();
      }
      if (run) raf = requestAnimationFrame(frame);
    }
    size(); window.addEventListener("resize", size);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !run) { run = true; raf = requestAnimationFrame(frame); }
        else if (!e.isIntersecting) { run = false; cancelAnimationFrame(raf); }
      });
    }).observe(sec);

    // Звёздочки под курсором и от касания
    var last = 0;
    function spark(x, y, n) {
      var r = sec.getBoundingClientRect();
      for (var i = 0; i < n; i++) {
        var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        s.setAttribute("class", "spark" + (Math.random() < .35 ? " gold" : ""));
        var u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", "#i-star"); s.appendChild(u);
        var ang = Math.random() * 6.283, dist = 20 + Math.random() * 40;
        s.style.left = (x - r.left - 6) + "px"; s.style.top = (y - r.top - 6) + "px";
        s.style.setProperty("--s", (8 + Math.random() * 10) + "px");
        s.style.setProperty("--dx", Math.cos(ang) * dist + "px"); s.style.setProperty("--dy", (Math.sin(ang) * dist - 20) + "px");
        sec.appendChild(s);
        setTimeout(function (el) { return function () { el.remove(); }; }(s), 1200);
      }
    }
    sec.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var now = Date.now(); if (now - last < 90) return; last = now; spark(e.clientX, e.clientY, 1);
    });
    sec.addEventListener("pointerdown", function (e) { if (e.target.closest("a,button")) return; spark(e.clientX, e.clientY, 6); });
  });

  // Фигурки чуть смещаются при прокрутке (глубина)
  var figs = document.querySelectorAll(".fig"), ticking = false;
  var orbit = document.querySelector(".orbit"), heroSec = document.querySelector(".hero");
  var stars = document.querySelectorAll(".constellation");
  function parallax() {
    var vh = window.innerHeight;
    // солнце уходит вниз, луна поднимается: чем ниже, тем ближе ночь
    if (orbit && heroSec) {
      var hp = Math.min(1, Math.max(0, window.scrollY / (heroSec.offsetHeight * 0.9)));
      orbit.style.setProperty("--orb", (hp * 180).toFixed(1) + "deg");
    }
    Array.prototype.forEach.call(figs, function (f, i) {
      var r = f.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
      var k = (i % 3 + 1) * 0.06;
      f.style.translate = "0 " + ((r.top - vh / 2) * -k).toFixed(1) + "px";
    });
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
  parallax();

  // Карты наклоняются за курсором
  if (fine) Array.prototype.forEach.call(document.querySelectorAll(".tilt"), function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty("--ry", (x * 14).toFixed(1) + "deg"); el.style.setProperty("--rx", (-y * 12).toFixed(1) + "deg");
    });
    el.addEventListener("pointerleave", function () { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
  });
  })();

  // ---------- Звёздное небо: мелкие звёзды и тонкие созвездия по краям блока ----------
  // Созвездия: наши символы (сердце, кролик) и настоящие (ковш Большой Медведицы, Кассиопея).
  var SKY_SHAPES = {
    heart: SHAPES.heart,
    dipper: "M4 38L24 32L42 40L56 52L60 76L86 82L90 56L56 52",
    cassiopeia: "M6 34L28 66L50 40L72 70L94 30",
    cygnus: "M50 4L50 50L52 96M12 36L50 50L88 40"
  };
  // где стоят созвездия: доля ширины и высоты блока, размер в px (компьютер / телефон)
  var SKY = {
    try: { wide: [["heart", .86, .2, 150], ["dipper", .06, .74, 170], ["cassiopeia", .42, .08, 120], ["cygnus", .92, .8, 90]],
           narrow: [["heart", .8, .05, 78], ["cassiopeia", .06, .06, 74], ["dipper", .04, .9, 96]] },
    moment: { wide: [["dipper", .82, .14, 150], ["cygnus", .1, .72, 100], ["cassiopeia", .08, .14, 110]],
              narrow: [["cassiopeia", .06, .06, 70], ["dipper", .94, .04, 90]] }
  };
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function drawSky(svg) {
    var sec = svg.parentNode, w = sec.offsetWidth, h = sec.offsetHeight;
    if (!w || !h) return;
    var conf = SKY[svg.getAttribute("data-sky")], set = w >= 760 ? conf.wide : conf.narrow;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var r = rnd(w >= 760 ? 97 : 41), n = Math.round(w * h / 5200), i, c;
    var bg = document.createElementNS(NS, "g"); bg.setAttribute("class", "sky-dots");
    for (i = 0; i < n; i++) {
      c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", (r() * w).toFixed(1)); c.setAttribute("cy", (r() * h).toFixed(1));
      c.setAttribute("r", (0.4 + r() * r() * 1.2).toFixed(2));
      c.setAttribute("opacity", (0.2 + r() * 0.6).toFixed(2));
      if (r() < 0.12) c.setAttribute("class", "gold");
      bg.appendChild(c);
    }
    svg.appendChild(bg);
    set.forEach(function (it, k) {
      var size = it[3], x = it[1] * w, y = it[2] * h;
      x = Math.min(Math.max(8, x - size / 2), w - size - 8); y = Math.min(Math.max(8, y - size / 2), h - size - 8);
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "sky-c");
      g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + (size / 100).toFixed(3) + ")");
      g.style.setProperty("--d", (k * 0.5) + "s");
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", SKY_SHAPES[it[0]]); path.setAttribute("pathLength", "1"); path.setAttribute("class", "sky-line");
      g.appendChild(path);
      var seen = {};
      SKY_SHAPES[it[0]].replace(/(\d+) (\d+)/g, function (m, px, py) {
        if (seen[m]) return; seen[m] = 1;
        var st = document.createElementNS(NS, "circle");
        st.setAttribute("cx", px); st.setAttribute("cy", py);
        st.setAttribute("r", (r() < .3 ? 2.6 : 1.8) * 100 / size * (w >= 760 ? 1 : .8));
        st.setAttribute("class", "sky-star");
        g.appendChild(st);
      });
      svg.appendChild(g);
    });
  }
  var skies = document.querySelectorAll(".skymap");
  Array.prototype.forEach.call(skies, function (svg) {
    drawSky(svg);
    if (reduce || !("IntersectionObserver" in window)) { svg.classList.add("is-drawn"); return; }
    var so = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { svg.classList.add("is-drawn"); so.disconnect(); } }, { threshold: 0.3 });
    so.observe(svg);
  });
  window.addEventListener("load", function () { Array.prototype.forEach.call(skies, drawSky); }); // после загрузки шрифтов высота блока точная
  var skyW = window.innerWidth, skyT = 0;
  window.addEventListener("resize", function () {
    if (Math.abs(window.innerWidth - skyW) < 40) return; // на телефоне высота меняется от панели браузера, не перерисовываем
    skyW = window.innerWidth; clearTimeout(skyT);
    skyT = setTimeout(function () { Array.prototype.forEach.call(skies, drawSky); }, 200);
  });

  // ---------- Одна колода раскрывается на три раздела ----------
  var table = document.querySelector(".table");
  if (table) {
    if (reduce || !("IntersectionObserver" in window)) table.classList.add("is-split");
    else {
      table.classList.add("will-split");
      var so = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { setTimeout(function () { table.classList.add("is-split"); }, 350); so.disconnect(); }
      }, { threshold: 0.35 });
      so.observe(table);
    }
  }

  // ---------- Выберите карту: расклад на главной ----------
  var tSpread = $("try-spread"), tCard = $("try-card"), tBusy = false;
  var tMin = M.minute($("try-minute"));
  // на главной только витрина: те же пять вопросов, что на картах выше, чтобы не раскрыть всю пробную колоду
  var pool = examples.slice();
  function five() {
    var a = pool.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, 5);
  }
  function tryPick(i, btn, id) {
    if (tBusy) return; tBusy = true;
    var c = setFace(tCard, id); setBack(tCard, id);
    tCard.classList.remove("is-flipped");
    tCard.hidden = false;
    btn.classList.add("picked");
    tSpread.classList.add("is-away");
    M.flyFrom(tCard, btn, function () {
      tCard.classList.add("is-flipped");
      $("try-deck").textContent = "Раздел: " + M.deckById(c.deck).title.toLowerCase();
      setTimeout(function () {
        tSpread.hidden = true;
        $("try-actions").hidden = false;
        $("try-more").hidden = false;
        tMin.start();
        tBusy = false;
      }, FLIP);
    });
  }
  function dealTry(hold) {
    tCard.hidden = true; tCard.classList.remove("is-flipped");
    tSpread.hidden = false;
    $("try-actions").hidden = true;
    $("try-more").hidden = true;
    $("try-deck").textContent = "";
    tMin.stop();
    M.buildSpread(tSpread, five(), tryPick, hold);
  }
  if (tSpread) {
    dealTry(!reduce && "IntersectionObserver" in window);
    if (!reduce && "IntersectionObserver" in window) {
      var to = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { tSpread.classList.add("is-dealt"); to.disconnect(); }
      }, { threshold: 0.3 });
      to.observe(tSpread);
    }
    $("try-again").addEventListener("click", function () {
      if (tBusy) return; tBusy = true;
      tCard.classList.add("leave");
      setTimeout(function () { tCard.classList.remove("leave"); dealTry(false); tBusy = false; }, reduce ? 0 : 300);
    });
  }
})();
