/*
# Editor de texto de las justificaciones (La red de conexiones)
  Mismo editor del recurso "Pistas y analogías".
  Convierte cada .rc-rte-area (contenteditable) en un campo con barra de formato:
  negrilla, cursiva, subrayado, resaltado, color, enlace, listas, alineación y
  limpiar formato. Además traduce lo escrito a un "modelo" (párrafos con tramos
  de estilo) que se usa para el resumen final y para el PDF, así el formato se
  ve igual en los tres lugares.
*/
window.RCEditor = (function () {
  "use strict";

  var MAX = 400;
  var HIGHLIGHTS = [
    { name: "Amarillo", c: "#fff176" }, { name: "Verde", c: "#b9f6ca" },
    { name: "Celeste", c: "#b3e5fc" }, { name: "Rosado", c: "#f8bbd0" },
    { name: "Naranja", c: "#ffd8a8" }
  ];
  var COLORS = [
    { name: "Rojo", c: "#d23a52" }, { name: "Azul oscuro", c: "#000087" },
    { name: "Azul", c: "#2f5ee0" }, { name: "Verde", c: "#12936a" },
    { name: "Naranja", c: "#d9661f" }, { name: "Morado", c: "#8224d3" }
  ];
  var ALIGNS = [
    { cmd: "justifyLeft", icon: "text-left", name: "Alinear a la izquierda" },
    { cmd: "justifyCenter", icon: "text-center", name: "Centrar" },
    { cmd: "justifyRight", icon: "text-right", name: "Alinear a la derecha" },
    { cmd: "justifyFull", icon: "justify", name: "Justificar" }
  ];

  function btn(attrs, inner) {
    var b = document.createElement("button");
    b.type = "button";
    Object.keys(attrs).forEach(function (k) { b.setAttribute(k, attrs[k]); });
    b.innerHTML = inner;
    return b;
  }

  function len(area) { return area.textContent.length; }

  /* ---------- Barra de herramientas ---------- */
  function init(area, onChange) {
    var box = area.closest(".rc-rte-box");
    var bar = document.createElement("div");
    bar.className = "rc-rte-bar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Formato del texto");
    var saved = null;
    var lastHl = HIGHLIGHTS[0].c, lastColor = COLORS[0].c;

    function saveSel() {
      var s = window.getSelection();
      if (s.rangeCount && area.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange();
    }
    function restoreSel() {
      area.focus({ preventScroll: true });
      if (!saved) return;
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(saved);
    }
    function exec(cmd, val) {
      restoreSel();
      document.execCommand("styleWithCSS", false, cmd === "hiliteColor" || cmd === "foreColor");
      document.execCommand(cmd, false, val == null ? null : val);
      saveSel();
      refresh();
      onChange();
    }

    var simple = [
      { cmd: "bold", icon: "type-bold", name: "Negrilla (Ctrl+B)" },
      { cmd: "italic", icon: "type-italic", name: "Cursiva (Ctrl+I)" },
      { cmd: "underline", icon: "type-underline", name: "Subrayado (Ctrl+U)" }
    ];
    simple.forEach(function (o) {
      var b = btn({ "class": "rc-rte-btn", "data-cmd": o.cmd, title: o.name, "aria-label": o.name, "aria-pressed": "false" },
        '<i class="bi bi-' + o.icon + '"></i>');
      b.addEventListener("click", function () { exec(o.cmd); });
      bar.appendChild(b);
    });

    // Botón partido: aplica el último color y abre la paleta con la flecha
    function split(kind, label, faceHtml, palette, getLast, setLast, cmd, clearVal) {
      var wrap = document.createElement("div");
      wrap.className = "rc-rte-split";
      var main = btn({ "class": "rc-rte-btn rc-rte-" + kind, title: label, "aria-label": label }, faceHtml);
      var more = btn({ "class": "rc-rte-btn rc-rte-more", title: "Elegir " + label.toLowerCase(),
        "aria-label": "Elegir " + label.toLowerCase(), "aria-haspopup": "true", "aria-expanded": "false" },
        '<i class="bi bi-chevron-down"></i>');
      var menu = document.createElement("div");
      menu.className = "rc-rte-menu rc-rte-swatches";
      menu.hidden = true;
      palette.forEach(function (p) {
        var s = btn({ "class": "rc-rte-swatch", title: p.name, "aria-label": p.name }, "");
        s.style.background = p.c;
        s.addEventListener("click", function () { setLast(p.c); paint(); closeMenus(); exec(cmd, p.c); });
        menu.appendChild(s);
      });
      var none = btn({ "class": "rc-rte-swatch rc-rte-none", title: "Quitar", "aria-label": "Quitar " + label.toLowerCase() }, '<i class="bi bi-x"></i>');
      none.addEventListener("click", function () { closeMenus(); exec(cmd, clearVal()); });
      menu.appendChild(none);
      function paint() { main.querySelector(".rc-rte-bar-color").style.background = getLast(); }
      main.addEventListener("click", function () { exec(cmd, getLast()); });
      more.addEventListener("click", function () { toggleMenu(menu, more); });
      wrap.appendChild(main); wrap.appendChild(more); wrap.appendChild(menu);
      bar.appendChild(wrap);
      paint();
    }

    split("hl", "Resaltar", '<i class="bi bi-highlighter"></i><span class="rc-rte-bar-color"></span>', HIGHLIGHTS,
      function () { return lastHl; }, function (c) { lastHl = c; }, "hiliteColor", function () { return "transparent"; });
    split("color", "Color del texto", '<span class="rc-rte-a">A</span><span class="rc-rte-bar-color"></span>', COLORS,
      function () { return lastColor; }, function (c) { lastColor = c; }, "foreColor",
      function () { return getComputedStyle(area).color; });

    // Enlace
    var linkWrap = document.createElement("div");
    linkWrap.className = "rc-rte-split";
    var linkBtn = btn({ "class": "rc-rte-btn", title: "Insertar enlace", "aria-label": "Insertar enlace", "aria-haspopup": "true", "aria-expanded": "false" },
      '<i class="bi bi-link-45deg"></i>');
    var linkMenu = document.createElement("div");
    linkMenu.className = "rc-rte-menu rc-rte-link";
    linkMenu.hidden = true;
    linkMenu.innerHTML = '<input type="url" placeholder="https://..." aria-label="Dirección del enlace">' +
      '<button type="button" class="rc-rte-apply">Aplicar</button>';
    var linkInput = linkMenu.querySelector("input");
    function applyLink() {
      var url = linkInput.value.trim();
      closeMenus();
      if (!url) { exec("unlink"); return; }
      if (!/^(https?:|mailto:)/i.test(url)) url = "https://" + url;
      restoreSel();
      var sel = window.getSelection();
      if (sel.isCollapsed) {
        if (len(area) + url.length > MAX) return;
        document.execCommand("insertText", false, url);
        var r = sel.getRangeAt(0);
        r.setStart(r.endContainer, Math.max(0, r.endOffset - url.length));
        sel.removeAllRanges(); sel.addRange(r);
      }
      document.execCommand("createLink", false, url);
      area.querySelectorAll("a").forEach(function (a) { a.target = "_blank"; a.rel = "noopener"; });
      sel.collapseToEnd();
      saveSel(); onChange();
    }
    linkMenu.querySelector(".rc-rte-apply").addEventListener("click", applyLink);
    linkInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applyLink(); }
      if (e.key === "Escape") { closeMenus(); restoreSel(); }
    });
    linkBtn.addEventListener("click", function () {
      var a = saved && (saved.startContainer.nodeType === 1 ? saved.startContainer : saved.startContainer.parentNode).closest("a");
      linkInput.value = a ? a.getAttribute("href") : "";
      toggleMenu(linkMenu, linkBtn);
      if (!linkMenu.hidden) linkInput.focus();
    });
    linkWrap.appendChild(linkBtn); linkWrap.appendChild(linkMenu);
    bar.appendChild(linkWrap);

    var sep = document.createElement("span");
    sep.className = "rc-rte-sep";
    bar.appendChild(sep);

    [{ cmd: "insertUnorderedList", icon: "list-ul", name: "Lista con viñetas" },
     { cmd: "insertOrderedList", icon: "list-ol", name: "Lista numerada" }].forEach(function (o) {
      var b = btn({ "class": "rc-rte-btn", "data-cmd": o.cmd, title: o.name, "aria-label": o.name, "aria-pressed": "false" },
        '<i class="bi bi-' + o.icon + '"></i>');
      b.addEventListener("click", function () { exec(o.cmd); });
      bar.appendChild(b);
    });

    // Alineación
    var alWrap = document.createElement("div");
    alWrap.className = "rc-rte-split";
    var alBtn = btn({ "class": "rc-rte-btn rc-rte-align", title: "Alineación", "aria-label": "Alineación", "aria-haspopup": "true", "aria-expanded": "false" },
      '<i class="bi bi-text-left"></i><i class="bi bi-chevron-down rc-rte-caret"></i>');
    var alMenu = document.createElement("div");
    alMenu.className = "rc-rte-menu rc-rte-list";
    alMenu.hidden = true;
    ALIGNS.forEach(function (o) {
      var b = btn({ "class": "rc-rte-item", title: o.name }, '<i class="bi bi-' + o.icon + '"></i> ' + o.name);
      b.addEventListener("click", function () {
        closeMenus();
        alBtn.firstChild.className = "bi bi-" + o.icon;
        exec(o.cmd);
      });
      alMenu.appendChild(b);
    });
    alBtn.addEventListener("click", function () { toggleMenu(alMenu, alBtn); });
    alWrap.appendChild(alBtn); alWrap.appendChild(alMenu);
    bar.appendChild(alWrap);

    var clear = btn({ "class": "rc-rte-btn", title: "Quitar formato", "aria-label": "Quitar formato" }, '<i class="bi bi-eraser"></i>');
    clear.addEventListener("click", function () {
      exec("removeFormat");
      exec("unlink");
      exec("hiliteColor", "transparent");
    });
    bar.appendChild(clear);

    function closeMenus() {
      bar.querySelectorAll(".rc-rte-menu").forEach(function (m) { m.hidden = true; });
      bar.querySelectorAll("[aria-expanded]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    }
    function toggleMenu(menu, opener) {
      var open = menu.hidden;
      closeMenus();
      menu.hidden = !open;
      opener.setAttribute("aria-expanded", open ? "true" : "false");
    }
    document.addEventListener("click", function (e) { if (!bar.contains(e.target)) closeMenus(); });
    bar.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenus(); restoreSel(); } });
    // Evita que la barra le quite la selección al texto
    bar.addEventListener("mousedown", function (e) { if (e.target.tagName !== "INPUT") e.preventDefault(); });

    function refresh() {
      var inside = document.activeElement === area;
      bar.querySelectorAll("[data-cmd]").forEach(function (b) {
        var on = false;
        try { on = inside && document.queryCommandState(b.getAttribute("data-cmd")); } catch (err) { on = false; }
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    document.addEventListener("selectionchange", function () {
      if (document.activeElement === area) { saveSel(); refresh(); }
    });

    box.insertBefore(bar, box.firstChild);

    /* ---------- Límite de caracteres y pegado como texto ---------- */
    area.addEventListener("beforeinput", function (e) {
      var data = e.data || "";
      if (/^insert(Text|ReplacementText|CompositionText)$/.test(e.inputType)) {
        var selLen = window.getSelection().toString().length;
        if (len(area) - selLen + data.length > MAX) e.preventDefault();
      }
    });
    area.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
      var room = MAX - len(area) + window.getSelection().toString().length;
      if (room <= 0) return;
      document.execCommand("insertText", false, text.slice(0, room));
    });
    area.addEventListener("drop", function (e) { e.preventDefault(); });
    area.addEventListener("input", function () {
      area.classList.toggle("is-empty", isEmpty(area));
      onChange();
    });
    area.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && /^[biu]$/i.test(e.key)) setTimeout(refresh, 0);
    });
    var label = document.getElementById(area.getAttribute("aria-labelledby"));
    if (label) label.addEventListener("click", function () { area.focus(); });
    area.classList.add("is-empty");
  }

  function isEmpty(area) {
    return area.textContent.trim() === "" && !area.querySelector("li");
  }

  function reset(area) {
    area.innerHTML = "";
    area.classList.add("is-empty");
  }

  /* ---------- Modelo: párrafos y tramos con estilo ---------- */
  function parseColor(c) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || "");
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])];
  }
  function same(a, b) { return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

  function toModel(area) {
    var base = parseColor(getComputedStyle(area).color);
    var blocks = [];
    var cur = null;
    var BLOCK = /^(DIV|P|LI|UL|OL|H\d|BLOCKQUOTE)$/;

    function newBlock(el) {
      var li = el && el.closest ? el.closest("li") : null;
      var host = el && el.nodeType === 1 ? el : area;
      var align = getComputedStyle(host).textAlign;
      if (align === "start") align = "left";
      if (align === "end") align = "right";
      cur = { align: align || "left", list: null, n: 0, runs: [] };
      if (li && area.contains(li)) {
        var listEl = li.parentElement;
        cur.list = listEl.tagName === "OL" ? "ol" : "ul";
        cur.n = Array.prototype.indexOf.call(listEl.children, li) + 1;
      }
      blocks.push(cur);
    }

    function styleOf(node) {
      var el = node.parentElement;
      var cs = getComputedStyle(el);
      var o = {
        b: parseInt(cs.fontWeight, 10) >= 600,
        i: cs.fontStyle === "italic" || cs.fontStyle === "oblique",
        u: false, bg: null, color: null, href: null
      };
      var col = parseColor(cs.color);
      if (col && !same(col, base)) o.color = col;
      for (var p = el; p && p !== area; p = p.parentElement) {
        var ps = getComputedStyle(p);
        if (!o.u && /underline/.test(ps.textDecorationLine)) o.u = true;
        if (!o.bg) o.bg = parseColor(ps.backgroundColor);
        if (!o.href && p.tagName === "A") o.href = p.getAttribute("href");
      }
      if (o.href) o.u = true;
      return o;
    }

    function walk(node) {
      for (var ch = node.firstChild; ch; ch = ch.nextSibling) {
        if (ch.nodeType === 3) {
          if (!ch.nodeValue) continue;
          if (!cur) newBlock(ch.parentElement);
          var st = styleOf(ch);
          st.text = ch.nodeValue.replace(/\u00a0/g, " ");
          cur.runs.push(st);
        } else if (ch.nodeType === 1) {
          if (ch.tagName === "BR") {
            // Un <br> cierra la línea; dos seguidos dejan una línea en blanco
            if (cur) cur = null; else newBlock(node);
            continue;
          }
          if (BLOCK.test(ch.tagName)) {
            // El párrafo se crea cuando aparece texto, así un contenedor
            // vacío (por ejemplo un <div> que envuelve una lista) no suma líneas
            cur = null;
            walk(ch);
            cur = null;
          } else {
            walk(ch);
          }
        }
      }
    }
    walk(area);

    // Quita bloques vacíos al final y une tramos iguales seguidos
    blocks = blocks.filter(function (b, i) {
      return b.list || b.runs.some(function (r) { return r.text.trim(); }) || i < blocks.length - 1;
    });
    while (blocks.length && !blocks[blocks.length - 1].list &&
      !blocks[blocks.length - 1].runs.some(function (r) { return r.text.trim(); })) blocks.pop();
    blocks.forEach(function (b) {
      var out = [];
      b.runs.forEach(function (r) {
        var p = out[out.length - 1];
        if (p && p.b === r.b && p.i === r.i && p.u === r.u && p.href === r.href &&
          String(p.bg) === String(r.bg) && String(p.color) === String(r.color)) p.text += r.text;
        else out.push(r);
      });
      b.runs = out;
    });
    return blocks;
  }

  /* ---------- Modelo → HTML limpio (resumen) ---------- */
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function rgb(c) { return "rgb(" + c.join(",") + ")"; }

  function toHtml(blocks, prefixHtml) {
    var html = "", openList = null, usedPrefix = false;
    blocks.forEach(function (b) {
      if (openList && b.list !== openList) { html += "</" + openList + ">"; openList = null; }
      if (b.list && !openList) { html += "<" + b.list + ">"; openList = b.list; }
      var inner = b.runs.map(function (r) {
        var css = [];
        if (r.b) css.push("font-weight:700");
        if (r.i) css.push("font-style:italic");
        if (r.u) css.push("text-decoration:underline");
        if (r.color) css.push("color:" + rgb(r.color));
        if (r.bg) css.push("background-color:" + rgb(r.bg) + ";color:" + (r.color ? rgb(r.color) : "#1b1b1b"));
        var span = css.length ? '<span style="' + css.join(";") + '">' + esc(r.text) + "</span>" : esc(r.text);
        return r.href ? '<a href="' + esc(r.href) + '" target="_blank" rel="noopener">' + span + "</a>" : span;
      }).join("");
      if (!usedPrefix && !b.list && prefixHtml) { inner = prefixHtml + inner; usedPrefix = true; }
      var align = b.align && b.align !== "left" ? ' style="text-align:' + b.align + '"' : "";
      html += b.list ? "<li" + align + ">" + (inner || "<br>") + "</li>" : "<p" + align + ">" + (inner || "<br>") + "</p>";
    });
    if (openList) html += "</" + openList + ">";
    if (!usedPrefix && prefixHtml) html = "<p>" + prefixHtml + "</p>" + html;
    return html;
  }

  function plainLength(blocks) {
    return blocks.reduce(function (n, b) {
      return n + b.runs.reduce(function (m, r) { return m + r.text.trim().length; }, 0);
    }, 0);
  }

  return { init: init, reset: reset, toModel: toModel, toHtml: toHtml, plainLength: plainLength, MAX: MAX };
})();
