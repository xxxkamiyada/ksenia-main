/* Моменты года · логика онлайн-колоды.
   Ничего не отправляет на сервер. Ход игры хранится в localStorage этого браузера. */
(function () {
  "use strict";

  var STORE_KEY = "momenty-game-v1";
  var DECKS = window.DECKS || [];
  var SITE = window.SITE || {};

  // ---------- Типограф: неразрывные пробелы после коротких слов и перед последним словом ----------
  var SHORT = "а|в|и|к|о|с|у|я|во|да|до|за|из|ко|на|не|ни|но|об|от|по|со|то|для|без|при|про|под|над|что|как|это|или|мы|вы|он|она|они|их|её|его|уже|ещё|все|всё|чем|где|кто";
  var reShort = new RegExp("(^|[\\s(«\"])(" + SHORT + ")\\s+", "gi");
  var reAfter = /\s+(же|ли|бы|ль)(?=[\s.,!?:;»)]|$)/gi;
  var reNum = /(\d)\s+(?=[а-яё×%])/gi;
  function typo(str) {
    if (!str) return str;
    var t = str.replace(reShort, "$1$2\u00A0").replace(reShort, "$1$2\u00A0");
    t = t.replace(reAfter, "\u00A0$1").replace(reNum, "$1\u00A0");
    // последнее слово не остаётся одно на строке
    t = t.replace(/\s+(\S{1,12})\s*$/, "\u00A0$1");
    return t;
  }
  window.typo = typo;
  function typoTree(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var blocks = "P,LI,H3,CITE,SUMMARY,FIGCAPTION,SPAN,A,BUTTON,LABEL"; // H1, H2 короткие и крупные: им нужен перенос
    var n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode;
      if (!p || /SCRIPT|STYLE/.test(p.nodeName) || !n.nodeValue.trim()) continue;
      var v = n.nodeValue.replace(reShort, "$1$2\u00A0").replace(reShort, "$1$2\u00A0").replace(reAfter, "\u00A0$1").replace(reNum, "$1\u00A0");
      // склеиваем последнее слово, если это последний текст в блоке
      if (blocks.indexOf(p.nodeName) >= 0 && !n.nextSibling && !/^H[12]$/.test(p.parentNode && p.parentNode.nodeName || "")) v = v.replace(/\s+(\S{1,12})\s*$/, "\u00A0$1");
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  }
  typoTree(document.body);

  // id карты -> { id, text, deck }
  var gameCards = {};
  DECKS.forEach(function (d) {
    d.cards.forEach(function (c) { gameCards[c[0]] = { id: c[0], text: c[1], deck: d.id }; });
  });
  var CARDS = Object.assign({}, gameCards, SITE.previewOnly);
  function deckById(id) { return DECKS.filter(function (d) { return d.id === id; })[0]; }

  var $ = function (id) { return document.getElementById(id); };
  var screens = { home: $("screen-home"), play: $("screen-play"), game: $("screen-game"), rules: $("screen-rules") };

  // ---------- Хранилище (браузер может его запрещать) ----------
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!s || !Array.isArray(s.order)) return null;
      // В старых партиях оставляем № 61 на месте прежней семейной карты № 60.
      s.order = s.order.map(function (id) { return id === 60 ? 61 : id; })
        .filter(function (id) { return gameCards[id]; });
      if (!s.order.length) return null;
      s.pos = Math.min(Math.max(0, s.pos | 0), s.order.length);
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* без сохранения */ }
  }
  function clear() { try { localStorage.removeItem(STORE_KEY); } catch (e) {} }

  // ---------- Перемешивание ----------
  function rand(n) {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = rand(i + 1); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function newGame(deckIds) {
    var ids = [];
    deckIds.forEach(function (d) { deckById(d).cards.forEach(function (c) { ids.push(c[0]); }); });
    state = { decks: deckIds, order: shuffle(ids), pos: 0, flipped: false, intro: true };
    save();
  }

  var state = load();

  // ---------- Склонение ----------
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function cards(n) { return n + " " + plural(n, "карта", "карты", "карт"); }

  // ---------- Старт ----------
  var form = $("deck-form"), optsBox = $("deck-options");
  DECKS.forEach(function (d) {
    var label = document.createElement("label");
    label.className = "deck-option";
    label.innerHTML =
      '<img src="img/back-' + d.id + '.svg" alt="">' +
      '<span><span class="t"></span><span class="n"></span></span>' +
      '<input type="checkbox" name="deck">' +
      '<span class="check" aria-hidden="true"></span>';
    label.querySelector(".t").textContent = d.title + " · " + d.cards.length + " из " + d.total;
    label.querySelector(".n").textContent = d.note;
    var input = label.querySelector("input");
    input.value = d.id;
    input.checked = state ? state.decks.indexOf(d.id) >= 0 : !!d.defaultOn;
    optsBox.appendChild(label);
  });
  function chosen() {
    return Array.prototype.slice.call(form.querySelectorAll("input:checked")).map(function (i) { return i.value; });
  }
  function syncStart() {
    var none = chosen().length === 0;
    $("btn-start").disabled = none;
    $("deck-hint").classList.toggle("show", none);
    var total = chosen().reduce(function (s, id) { return s + deckById(id).cards.length; }, 0);
    var label = $("resume").hidden ? "Начать игру" : "Начать новую игру";
    $("btn-start").textContent = none ? label : label + " · " + cards(total);
  }
  form.addEventListener("change", syncStart);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = chosen();
    if (!d.length) return;
    newGame(d);
    go("game");
  });
  $("btn-resume").addEventListener("click", function () { go("game"); });

  function renderStart() {
    var s = state;
    var left = s ? s.order.length - s.pos : 0;
    $("resume").hidden = !(s && left > 0);
    if (s && left > 0) {
      var names = s.decks.map(function (id) { return deckById(id).title.toLowerCase(); }).join(", ");
      $("resume-text").textContent = typo("Есть начатая игра (" + names + "): " + (s.flipped ? "открыта карта " + (s.pos + 1) : "следующая карта " + (s.pos + 1)) + " из " + s.order.length + ".");
      $("btn-start").classList.remove("btn-primary"); $("btn-start").classList.add("btn-ghost");
    } else {
      $("btn-start").classList.add("btn-primary"); $("btn-start").classList.remove("btn-ghost");
    }
    syncStart();
  }

  if ($("print-link")) {
    // пока адреса нет, кнопки нет: остаётся фраза «Ссылка на покупку появится здесь»
    if (SITE.printUrl) { $("print-link").href = SITE.printUrl; $("print-link").hidden = false; $("print-soon").hidden = true; }
  }

  // ---------- Карта ----------
  var cardEl = $("card"), busy = false;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fillFace(card, top, text, bot, holder) {
    holder.setAttribute("data-deck", card.deck);
    top.src = "img/" + card.deck + "-top.svg";
    bot.src = "img/" + card.deck + "-bot.svg";
    text.textContent = "";
    card.text.split("\n").forEach(function (part) {
      var p = document.createElement("span");
      p.className = "p";
      p.textContent = typo(part);
      text.appendChild(p);
    });
    var len = card.text.length;
    text.classList.toggle("long", len > 95 && len <= 125);
    text.classList.toggle("xlong", len > 125);
  }

  // ---------- Расклад: карты лежат рубашкой вверх, человек выбирает одну ----------
  var JIT = [-3, 4, -2, 5, -4, 2, -5, 3];
  function buildSpread(box, ids, onPick, hold) {
    box.textContent = "";
    box.classList.remove("is-dealt", "is-away");
    var n = ids.length;
    ids.forEach(function (id, i) {
      var c = CARDS[id], t = i - (n - 1) / 2, rot = t * 7 + JIT[i % JIT.length];
      var b = document.createElement("button");
      b.type = "button"; b.className = "sp-card";
      b.style.setProperty("--t", t);
      b.style.setProperty("--rot", rot + "deg");
      b.style.setProperty("--dl", (i * 80) + "ms");
      b.style.setProperty("--k", Math.abs(t));
      b.setAttribute("data-rot", rot);
      b.setAttribute("aria-label", "Карта " + (i + 1) + " из " + n + ", раздел «" + deckById(c.deck).title.toLowerCase() + "»");
      var img = document.createElement("img"); img.src = "img/back-" + c.deck + ".svg"; img.alt = "";
      b.appendChild(img);
      b.addEventListener("click", function () { onPick(i, b, id); });
      box.appendChild(b);
    });
    void box.offsetWidth;
    if (!hold) requestAnimationFrame(function () { box.classList.add("is-dealt"); });
  }

  // большая карта вылетает с места маленькой
  function flyFrom(cardEl, fromEl, done) {
    if (reduce || !cardEl.animate) { done(); return; }
    var a = fromEl.getBoundingClientRect(), b = cardEl.getBoundingClientRect();
    var dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    var s = a.width / b.width, r = +fromEl.getAttribute("data-rot") || 0;
    cardEl.animate([
      { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ") rotate(" + r + "deg)" },
      { transform: "none" }
    ], { duration: 520, easing: "cubic-bezier(.2,.7,.2,1)" });
    // переворот начинается в последней трети полёта: весь жест около 0,85 секунды
    setTimeout(done, 340);
  }

  // минута на размышление: солнце обходит круг и к концу становится луной
  var MINUTE_HTML =
    '<span class="minute-dial" aria-hidden="true">' +
      '<svg class="minute-ring" viewBox="0 0 48 48"><circle class="track" cx="24" cy="24" r="20"/><circle class="run" cx="24" cy="24" r="20" pathLength="1"/></svg>' +
      '<span class="minute-arm"><svg class="ico ico-sun"><use href="#i-sun"/></svg><svg class="ico ico-moon"><use href="#i-moon"/></svg></span>' +
    '</span><span class="minute-text">Минута, чтобы подумать</span>';
  function minute(el) {
    var tm = 0;
    if (el) el.innerHTML = MINUTE_HTML;
    return {
      start: function () {
        if (!el) return;
        el.hidden = false; el.classList.remove("run", "done"); void el.offsetWidth; el.classList.add("run");
        clearTimeout(tm); tm = setTimeout(function () { el.classList.add("done"); }, 60000);
      },
      stop: function () { if (!el) return; clearTimeout(tm); el.hidden = true; el.classList.remove("run", "done"); }
    };
  }
  var gMinute = minute($("g-minute")), gSpread = $("g-spread");

  function renderGame() {
    if (!state) { go("play"); return; }
    var done = state.pos >= state.order.length;
    var intro = !!state.intro && !done;
    $("intro").hidden = !intro;
    gMinute.stop();
    if (intro) {
      cardEl.hidden = true; gSpread.hidden = true; $("deck-end").hidden = true; $("controls").hidden = true;
      $("btn-reshuffle").hidden = true; $("tap-hint").hidden = true;
      $("counter").textContent = "Перед началом";
      return;
    }
    $("deck-end").hidden = !done;
    $("controls").hidden = done;
    $("btn-reshuffle").hidden = done;
    $("counter").textContent = done ? "" : "Карта " + (state.pos + 1) + " из " + state.order.length;
    if (done) {
      cardEl.hidden = true; gSpread.hidden = true; $("tap-hint").hidden = true;
      var n = state.order.length;
      $("end-offer-text").textContent = typo("Вы прошли " + n + " " + plural(n, "вопрос", "вопроса", "вопросов") + " пробной версии. В печатной колоде их 78.");
      return;
    }
    $("btn-prev").disabled = state.pos === 0;
    if (state.flipped) showOpen(true); else showSpread();
  }

  function fillBig(card) {
    fillFace(card, $("face-top"), $("face-text"), $("face-bot"), cardEl);
    $("card-back-img").src = "img/back-" + card.deck + ".svg";
    $("card-back-img").alt = "Рубашка раздела «" + deckById(card.deck).title + "»";
  }

  // открытая карта
  function showOpen(instant) {
    fillBig(CARDS[state.order[state.pos]]);
    cardEl.hidden = false; gSpread.hidden = true;
    setFlipped(true, instant);
    $("tap-hint").hidden = true;
    $("btn-next").hidden = false;
    $("btn-next").textContent = state.pos === state.order.length - 1 ? "Завершить" : "Следующая карта";
    $("controls").classList.remove("solo");
    gMinute.start();
  }

  // расклад: до пяти следующих карт
  function showSpread() {
    cardEl.hidden = true; gSpread.hidden = false;
    $("tap-hint").hidden = false;
    $("tap-hint").textContent = "Выберите любую карту";
    $("btn-next").hidden = true;
    $("controls").classList.add("solo");
    buildSpread(gSpread, state.order.slice(state.pos, state.pos + 5), pick);
  }

  function pick(i, btn) {
    if (busy) return;
    busy = true;
    var k = state.pos + i, t = state.order[k];
    state.order[k] = state.order[state.pos]; state.order[state.pos] = t;
    fillBig(CARDS[t]);
    cardEl.hidden = false;
    setFlipped(false, true);
    btn.classList.add("picked");
    gSpread.classList.add("is-away");
    $("tap-hint").hidden = true;
    flyFrom(cardEl, btn, function () {
      state.flipped = true; save();
      setTimeout(function () {
        showOpen(false);
        setTimeout(function () {
          busy = false;
          // фокус на вопрос, чтобы скринридер прочитал его, а Tab дальше вёл к управлению
          try { $("face-text").focus({ preventScroll: true }); } catch (e) { $("face-text").focus(); }
        }, reduce ? 0 : 520);
      }, reduce ? 0 : 60);
    });
  }

  function setFlipped(f, instant) {
    var inner = $("card-inner");
    if (instant) { inner.style.transition = "none"; }
    cardEl.classList.toggle("is-flipped", f);
    inner.setAttribute("aria-label", f ? "Вопрос открыт" : "Карта");
    $("face-text").setAttribute("aria-live", f ? "polite" : "off");
    if (instant) { void inner.offsetWidth; inner.style.transition = ""; }
  }

  function step(dir) {
    if (busy || !state) return;
    if (dir > 0 && !state.flipped) return; // сначала нужно выбрать карту
    var next = state.pos + dir;
    if (next < 0 || next > state.order.length) return;
    var apply = function () {
      state.pos = next;
      state.flipped = dir < 0; // назад возвращаемся к уже открытой карте
      save(); renderGame();
    };
    if (reduce || cardEl.hidden) { apply(); return; }
    busy = true;
    var out = dir > 0 ? "leave" : "leave-back";
    cardEl.classList.add(out);
    setTimeout(function () {
      cardEl.classList.remove(out);
      apply();
      if (dir < 0) { cardEl.classList.add("enter-back"); setTimeout(function () { cardEl.classList.remove("enter-back"); busy = false; }, 340); }
      else busy = false;
    }, 280);
  }
  $("btn-next").addEventListener("click", function () { step(1); });
  $("btn-prev").addEventListener("click", function () { step(-1); });

  // свайп влево = следующая, вправо = назад
  (function () {
    var x0 = null, y0 = null;
    $("stage").addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    $("stage").addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  // клавиатура: → следующая, ← назад, пробел/Enter открыть
  document.addEventListener("keydown", function (e) {
    if (screens.game.hidden || !$("overlay").hidden) return;
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  });

  function reshuffle() {
    if (!state) return;
    newGame(state.decks);
    state.intro = false; save(); // правила уже видели
    renderGame();
  }
  $("btn-reshuffle").addEventListener("click", function () {
    // свежий расклад перемешиваем сразу; если карта уже открыта, спрашиваем
    if ((state.pos === 0 && !state.flipped) || confirmReshuffle()) reshuffle();
  });
  // без window.confirm: второй тап в течение 3 секунд подтверждает
  var pending = null;
  function confirmReshuffle() {
    var b = $("btn-reshuffle");
    if (pending) { clearTimeout(pending); pending = null; b.textContent = "Перемешать"; return true; }
    b.textContent = "Начать заново?"; // второе нажатие подтверждает
    pending = setTimeout(function () { pending = null; b.textContent = "Перемешать"; }, 3000);
    return false;
  }
  $("btn-again").addEventListener("click", reshuffle);
  $("btn-intro").addEventListener("click", function () { state.intro = false; save(); renderGame(); });
  $("btn-choose").addEventListener("click", function () { clear(); state = null; go("play"); });
  $("btn-to-start").addEventListener("click", function () { go("play"); });

  // ---------- Список вопросов ----------
  (function buildList() {
    var box = $("list");
    if (!box) return; // список всех вопросов на сайте не публикуется
    DECKS.forEach(function (d) {
      var g = document.createElement("section");
      g.className = "list-group";
      var h = document.createElement("h2");
      h.innerHTML = '<img src="img/' + d.id + '-top.svg" alt="">';
      h.appendChild(document.createTextNode(d.title + " · " + d.cards.length));
      g.appendChild(h);
      var ol = document.createElement("ol");
      d.cards.forEach(function (c) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.type = "button"; b.className = "q";
        b.innerHTML = '<span class="num"></span><span class="tx"></span>';
        b.querySelector(".num").textContent = c[0];
        b.querySelector(".tx").textContent = c[1];
        b.addEventListener("click", function () { openOverlay(c[0], b); });
        li.appendChild(b); ol.appendChild(li);
      });
      g.appendChild(ol);
      box.appendChild(g);
    });
  })();

  var lastFocus = null;
  function openOverlay(id, from) {
    var card = CARDS[id], ov = $("overlay");
    fillFace(card, $("ov-top"), $("ov-text"), $("ov-bot"), ov.querySelector(".overlay-card"));
    lastFocus = from;
    ov.hidden = false;
    $("ov-close").focus();
  }
  function closeOverlay() {
    $("overlay").hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  $("ov-close").addEventListener("click", closeOverlay);
  $("overlay").addEventListener("click", function (e) { if (e.target === this) closeOverlay(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("overlay").hidden) closeOverlay(); });

  window.Momenty = { cards: CARDS, deckById: deckById, fillFace: fillFace, buildSpread: buildSpread, flyFrom: flyFrom, minute: minute };

  // ---------- Навигация по адресу ----------
  function go(name) {
    var hash = name === "home" ? "" : "#" + name;
    if (location.hash !== hash) {
      history.pushState(null, "", hash || location.pathname + location.search);
    }
    route();
  }
  function route() {
    var raw = (location.hash || "").replace("#", "");
    var name = raw || "home";
    // якорь внутри главной (#print-deck, #author...) показывает главную и прокручивает к разделу
    var anchor = null;
    if (!screens[name]) { anchor = document.getElementById(raw); name = "home"; }
    if (name === "game" && !state) name = "play";
    var changed = current !== name;
    current = name;
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    $("site-header").hidden = name === "game";
    $("site-footer").hidden = name === "game";
    $("overlay").hidden = true;
    if (name === "play") renderStart();
    if (name === "game") renderGame();
    // из правил можно вернуться в начатую игру
    if (name === "rules") $("rules-to-game").hidden = !(state && state.pos < state.order.length);
    // «Правила полностью» на главной: блок открывается сам
    if (anchor && anchor.tagName === "DETAILS") anchor.open = true;
    document.dispatchEvent(new CustomEvent("screenchange", { detail: name }));
    if (anchor) anchor.scrollIntoView();
    else if (changed || raw === "") window.scrollTo(0, 0);
  }
  var current = null;
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  route();

  // ---------- Работа без интернета ----------
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
