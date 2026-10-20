/*--------------------------------------------------------------
# La red de conexiones — Unidad 4 · El gran banquete del aprendizaje
# Pantalla 1: Introducción
# Pantalla 2: Lienzo de conexión (se repite)
# Pantalla 3: Confirmación de conexión (en el centro del lienzo)
# Pantalla 4: Cierre (al llegar a 4 conexiones)
#
# Reglas del guion:
#  - 8 nodos fijos, 2 por unidad, agrupados en 4 zonas.
#  - Solo se conectan nodos de zonas distintas (si no, aviso sin penalizar).
#  - La justificación no puede quedar vacía; no hay respuestas "correctas".
#  - La actividad se cumple con 4 conexiones válidas; se puede seguir tejiendo.
#  - El progreso no se guarda: al recargar la página el recurso empieza de cero.
--------------------------------------------------------------*/
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var modoLista = window.matchMedia("(max-width: 991px)");
  var META = 4;

  /* ---------- Zonas (personaje / unidad) ---------- */
  var ZONAS = {
    // mini: retrato neutro (sin carta ni pulgar) que se usa en los nodos del lienzo
    tobias: { nombre: "Tobías", unidad: "Unidad 1", color: "#2f6fe0", mini: "assets/img/tobias-mini.svg" },
    leo: { nombre: "Leo", unidad: "Unidad 2", color: "#12a39a", mini: "assets/img/leo-mini.svg" },
    sofia: { nombre: "Sofía", unidad: "Unidad 3", color: "#8224d3", mini: "assets/img/sofia-mini.svg" },
    banquete: { nombre: "Banquete", unidad: "Unidad 4", color: "#e0a106", mini: "assets/img/banquete.svg" }
  };

  /* ---------- Banco de conceptos (editable) ----------
     x, y: centro del nodo en el lienzo (% del ancho y del alto). Cada unidad ocupa una esquina. */
  var CONCEPTOS = [
    { id: "t1", zona: "tobias", x: 13, y: 36, titulo: "Modo enfocado", def: "El estado de concentración sostenida que usamos para ejecutar lo que ya sabemos hacer." },
    { id: "t2", zona: "tobias", x: 31, y: 12.5, titulo: "Daño por facilidad", def: "La tendencia a abandonar lo difícil por algo más cómodo, aunque enseñe menos." },
    { id: "l1", zona: "leo", x: 69, y: 12.5, titulo: "Atragantamiento cognitivo", def: "Saturar el espacio de trabajo neuronal estudiando todo de una sola sentada." },
    { id: "l2", zona: "leo", x: 87, y: 36, titulo: "Intercalado", def: "Alternar entre temas o técnicas distintas en vez de repetir una sola cosa seguida." },
    { id: "s1", zona: "sofia", x: 87, y: 64, titulo: "Error", def: "La señal que usa el cerebro predictivo para corregir lo que creía saber." },
    { id: "s2", zona: "sofia", x: 69, y: 87.5, titulo: "Acceso consciente", def: "El momento en que una información entra al espacio de trabajo neuronal y se vuelve reportable." },
    { id: "b1", zona: "banquete", x: 31, y: 87.5, titulo: "Granularidad emocional", def: "La capacidad de distinguir con precisión qué se sintió durante el aprendizaje, no solo \"bien\" o \"mal\"." },
    { id: "b2", zona: "banquete", x: 13, y: 64, titulo: "Nivel de certidumbre", def: "Qué tan anclada está una idea nueva en algo que el estudiante ya conocía antes." }
  ];
  var POR_ID = {};
  CONCEPTOS.forEach(function (c) { POR_ID[c.id] = c; });

  /* ---------- Estado ---------- */
  var estado = { hilos: [], completo: false };
  var sel = null;          // primer nodo elegido
  var par = null;          // [a, b] mientras se escribe la justificación
  var nuevo = -1;          // índice del hilo recién tejido (para animarlo)
  var resaltado = -1;
  var pasoActual = 1;
  var pasoMax = 1;         // hasta dónde ha llegado (el menú se va mostrando)
  var timerPanel = null, timerAviso = null;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ==================================================================
     NODOS
     ================================================================== */
  function pintarNodos(cont, interactivo) {
    var orden = ["tobias", "leo", "sofia", "banquete"];
    var html = "";
    var vistas = {};
    orden.forEach(function (z) {
      CONCEPTOS.filter(function (c) { return c.zona === z; }).forEach(function (c) {
        var zona = ZONAS[c.zona];
        var x = c.x, y = c.y;
        var tag = interactivo ? "button" : "div";
        var inicio = vistas[z] ? "" : " data-zona-inicio";
        vistas[z] = true;
        html +=
          "<" + tag + (interactivo ? ' type="button" aria-pressed="false"' : "") +
          ' class="rc-nodo" data-id="' + c.id + '" data-zona="' + c.zona + '"' + inicio +
          ' style="--z:' + zona.color + ";left:" + x.toFixed(2) + "%;top:" + y.toFixed(2) + '%">' +
          '<span class="rc-nodo__zona"><img src="' + zona.mini + '" alt="" aria-hidden="true">' +
          '<span class="rc-nodo__unidad">' + zona.unidad + " · " + zona.nombre + "</span></span>" +
          '<span class="rc-nodo__titulo">' + esc(c.titulo) + "</span>" +
          '<span class="rc-nodo__def">' + esc(c.def) + "</span>" +
          '<span class="rc-nodo__usos" aria-hidden="true"></span>' +
          "</" + tag + ">";
      });
    });
    cont.innerHTML = html;
  }

  function actualizarUsos(cont) {
    $$(".rc-nodo", cont).forEach(function (n) {
      var id = n.dataset.id;
      var usos = estado.hilos.filter(function (h) { return h.a === id || h.b === id; }).length;
      $(".rc-nodo__usos", n).textContent = usos ? usos : "";
      if (n.tagName === "BUTTON") {
        var c = POR_ID[id], z = ZONAS[c.zona];
        n.setAttribute("aria-label", c.titulo + ". " + z.unidad + ", " + z.nombre + ". " + c.def +
          (usos ? " Conectada en " + usos + (usos === 1 ? " hilo." : " hilos.") : ""));
      }
    });
  }

  /* ==================================================================
     HILOS (SVG)
     ================================================================== */
  function anclas(lienzo) {
    var r = lienzo.getBoundingClientRect();
    var lista = modoLista.matches;
    var out = {};
    $$(".rc-nodo", lienzo).forEach(function (n) {
      var b = n.getBoundingClientRect();
      out[n.dataset.id] = lista
        ? { x: b.right - r.left + 2, y: b.top - r.top + b.height / 2 }
        : { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 };
    });
    return { puntos: out, w: r.width, h: r.height, lista: lista };
  }

  function camino(A, B, geo) {
    if (geo.lista) {
      // Arco por el margen derecho: más alto cuanto más lejos están las ideas
      var k = Math.min(geo.w * 0.12 + 20, 24 + Math.abs(B.y - A.y) * 0.18);
      return "M" + A.x + " " + A.y + " C" + (A.x + k) + " " + A.y + " " + (B.x + k) + " " + B.y + " " + B.x + " " + B.y;
    }
    // Cuerda del anillo que se curva levemente hacia el centro
    var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    var cx = mx + (geo.w / 2 - mx) * 0.3, cy = my + (geo.h / 2 - my) * 0.3;
    return "M" + A.x + " " + A.y + " Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + B.x + " " + B.y;
  }

  function pintarHilos(lienzo, conProvisional) {
    var svg = $(".rc-hilos", lienzo);
    if (!svg || !lienzo.offsetWidth) return;
    var geo = anclas(lienzo);
    svg.setAttribute("viewBox", "0 0 " + geo.w + " " + geo.h);
    var pref = lienzo.id || "rc";
    var defs = "", cuerpo = "";

    estado.hilos.forEach(function (h, i) {
      var A = geo.puntos[h.a], B = geo.puntos[h.b];
      if (!A || !B) return;
      var ca = ZONAS[POR_ID[h.a].zona].color, cb = ZONAS[POR_ID[h.b].zona].color;
      var gid = pref + "-g" + i;
      defs += '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '">' +
        '<stop offset="0" stop-color="' + ca + '"/><stop offset=".5" stop-color="#bfeaff"/><stop offset="1" stop-color="' + cb + '"/></linearGradient>';
      var d = camino(A, B, geo);
      var clases = "rc-hilo-g" + (i === nuevo ? " rc-hilo--nuevo" : "") + (i === resaltado ? " rc-hilo--resaltado" : "");
      cuerpo += '<g class="' + clases + '" data-hilo="' + i + '">' +
        '<path class="rc-hilo rc-hilo__halo" d="' + d + '" stroke="url(#' + gid + ')"/>' +
        '<path class="rc-hilo rc-hilo__linea" d="' + d + '" stroke="url(#' + gid + ')"/>';
      if (!reduceMotion) {
        var dur = (2.6 + (i % 3) * 0.5).toFixed(1);
        cuerpo += '<circle r="4.5" fill="#ffffff" opacity=".95"><animateMotion dur="' + dur + 's" begin="' + (-i * 0.7).toFixed(1) +
          's" repeatCount="indefinite" path="' + d + '"/></circle>';
      }
      cuerpo += "</g>";
    });

    if (conProvisional && par) {
      var P = geo.puntos[par[0]], Q = geo.puntos[par[1]];
      if (P && Q) cuerpo += '<path class="rc-hilo rc-hilo--provisional" d="' + camino(P, Q, geo) + '"/>';
    }

    svg.innerHTML = "<defs>" + defs + "</defs>" + cuerpo;

    // Longitud real para el trazo animado del hilo recién tejido
    $$(".rc-hilo--nuevo path", svg).forEach(function (p) {
      p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + "px");
    });
  }

  /* ==================================================================
     LISTA DE HILOS
     ================================================================== */
  function pintarLista(ol, interactiva) {
    ol.innerHTML = estado.hilos.map(function (h, i) {
      var A = POR_ID[h.a], B = POR_ID[h.b];
      var ca = ZONAS[A.zona].color, cb = ZONAS[B.zona].color;
      return '<li class="rc-tejido" data-hilo="' + i + '" style="--za:' + ca + ";--zb:" + cb + '"' + (interactiva ? ' tabindex="0"' : "") + ">" +
        '<span class="rc-tejido__num">Hilo ' + (i + 1) + "</span>" +
        '<div class="rc-tejido__par"><span class="rc-chip" style="--c:' + ca + '">' + esc(A.titulo) + "</span>" +
        '<i class="bi bi-arrow-left-right" aria-label="conectada con"></i>' +
        '<span class="rc-chip" style="--c:' + cb + '">' + esc(B.titulo) + "</span></div>" +
        '<div class="rc-tejido__texto">' + (h.modelo ? window.RCEditor.toHtml(h.modelo) : "<p>" + esc(h.texto) + "</p>") + "</div></li>";
    }).join("");
  }

  /* ==================================================================
     CONTADOR, PASOS Y BOTONES
     ================================================================== */
  function actualizarProgreso() {
    var n = estado.hilos.length;
    $("#rcContadorN").textContent = n;
    $$(".rc-contador__hilos i").forEach(function (i, k) { i.classList.toggle("is-on", k < n); });
    var cont = $("#rcContador");
    cont.classList.toggle("is-meta", n >= META);
    $(".rc-contador__texto", cont).innerHTML = n >= META
      ? "Meta cumplida: <b id=\"rcContadorN\">" + n + "</b> " + (n === 1 ? "hilo" : "hilos")
      : "<b id=\"rcContadorN\">" + n + "</b> de " + META + " hilos";

    var ver = $("#rcVerRed");
    ver.disabled = n < META;
    ver.innerHTML = n < META
      ? '<i class="bi bi-lock-fill" aria-hidden="true"></i> Ver mi red (faltan ' + (META - n) + ")"
      : '<i class="bi bi-diagram-3" aria-hidden="true"></i> Ver mi red';

    $("#rcVacio").hidden = n > 0;
    $("#rcHilosN").textContent = n;
    $('.rc-steps li[data-step="3"] button').disabled = n < META;
  }

  function irA(paso, sinScroll) {
    if (paso === 3 && estado.hilos.length < META) return;
    pasoActual = paso;
    pasoMax = Math.max(pasoMax, paso);

    // Cabezote: solo en la introducción; al tejer, el lienzo ocupa la pantalla
    var hero = $("#seccion1");
    hero.hidden = paso !== 1;
    if (paso > 1) document.body.classList.add("rc-iniciado");
    document.body.classList.toggle("rc-pantalla-completa", paso > 1);
    // "Teje la red" se abre a pantalla completa, por encima del menú
    document.body.classList.toggle("rc-modo-inmersivo", paso === 2);
    if (paso !== 2) {
      abrirCajon(false);
      salirDePantallaCompleta();
    }

    // Menú de navegación: cada opción aparece al llegar a su paso
    $$("#navmenu [data-nav]").forEach(function (li) {
      var k = +li.dataset.nav;
      var antes = li.hidden;
      li.hidden = k > pasoMax;
      if (antes && !li.hidden) li.classList.add("rc-nav-nuevo");
      $("a", li).classList.toggle("is-activo", k === paso);
      if (k === paso) $("a", li).setAttribute("aria-current", "page"); else $("a", li).removeAttribute("aria-current");
    });
    $$(".rc-screen").forEach(function (s) { s.classList.toggle("is-active", +s.dataset.screen === paso); });
    $$(".rc-steps li").forEach(function (li) {
      var k = +li.dataset.step;
      li.classList.toggle("is-current", k === paso);
      li.classList.toggle("is-done", k < paso);
      var b = $("button", li);
      if (k === paso) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    limpiarSeleccion();
    cerrarComposer(true);

    if (paso === 2) requestAnimationFrame(function () { pintarHilos($("#rcLienzo"), false); });
    if (paso === 3) pintarFinal();

    if (!sinScroll) {
      var header = $("#header");
      var alto = header ? header.offsetHeight : 0;
      document.documentElement.style.setProperty("--rc-header", alto + "px");
      if (paso === 2) {
        $(".rc-inmersivo").scrollTop = 0;
      } else {
        var top = $("#rcSteps").getBoundingClientRect().top + window.scrollY - alto - 24;
        window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      }
    }
  }

  /* ==================================================================
     MODO INMERSIVO: cajón de hilos y pantalla completa del navegador
     ================================================================== */
  function abrirCajon(abrir) {
    var cajon = $("#rcCajon"), btn = $("#rcAbrirHilos");
    if (!cajon) return;
    cajon.classList.toggle("is-open", abrir);
    cajon.setAttribute("aria-hidden", abrir ? "false" : "true");
    btn.setAttribute("aria-expanded", abrir ? "true" : "false");
    if (abrir) $("#rcCerrarHilos").focus({ preventScroll: true });
  }

  function enPantallaCompleta() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function salirDePantallaCompleta() {
    if (!enPantallaCompleta()) return;
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }

  function alternarPantallaCompleta() {
    if (enPantallaCompleta()) { salirDePantallaCompleta(); return; }
    var el = document.documentElement;
    var pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (pedir) { try { var r = pedir.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) { /* no permitido */ } }
  }

  function actualizarBotonPantalla() {
    var b = $("#rcPantalla");
    var on = enPantallaCompleta();
    b.innerHTML = '<i class="bi ' + (on ? "bi-fullscreen-exit" : "bi-arrows-fullscreen") + '" aria-hidden="true"></i>';
    b.setAttribute("aria-label", on ? "Salir de pantalla completa" : "Ver en pantalla completa");
    b.title = on ? "Salir de pantalla completa" : "Pantalla completa";
  }

  /* ==================================================================
     PANEL CENTRAL
     ================================================================== */
  function panel(nombre) {
    clearTimeout(timerPanel);
    $$("#rcCentro .rc-centro__panel").forEach(function (p) { p.classList.toggle("is-active", p.dataset.panel === nombre); });
    $("#rcLienzo").classList.toggle("is-bloqueado", nombre === "justificar" || nombre === "meta");
    document.body.classList.toggle("rc-hoja", nombre !== "guia");
  }

  function guia(texto) {
    $("#rcGuia").innerHTML = texto;
    panel("guia");
  }

  function aviso(texto) {
    var a = $("#rcAviso");
    $("p", a).textContent = texto;
    a.hidden = false;
    // reinicia la animación de entrada
    a.style.animation = "none"; void a.offsetWidth; a.style.animation = "";
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { a.hidden = true; }, 3200);
  }

  /* ==================================================================
     INTERACCIÓN DEL LIENZO
     ================================================================== */
  function limpiarSeleccion() {
    sel = null;
    var lienzo = $("#rcLienzo");
    lienzo.classList.remove("has-sel");
    $$(".rc-nodo", lienzo).forEach(function (n) {
      n.classList.remove("is-sel", "is-misma");
      n.setAttribute("aria-pressed", "false");
    });
    guia("Elige una primera idea.");
  }

  function elegir(nodo) {
    var lienzo = $("#rcLienzo");
    if (lienzo.classList.contains("is-bloqueado")) return;
    var id = nodo.dataset.id;
    $("#rcAviso").hidden = true;

    if (!sel) {
      sel = id;
      lienzo.classList.add("has-sel");
      nodo.classList.add("is-sel");
      nodo.setAttribute("aria-pressed", "true");
      $$(".rc-nodo", lienzo).forEach(function (n) {
        if (n !== nodo && n.dataset.zona === nodo.dataset.zona) n.classList.add("is-misma");
      });
      guia("Ahora elige una idea de otra unidad para conectarla con <b>" + esc(POR_ID[id].titulo) + "</b>.");
      return;
    }

    if (sel === id) { limpiarSeleccion(); return; }

    if (POR_ID[sel].zona === POR_ID[id].zona) {
      nodo.classList.remove("is-error"); void nodo.offsetWidth; nodo.classList.add("is-error");
      aviso("Busca una idea de otra unidad para conectar con esta.");
      return;
    }

    var repetido = estado.hilos.some(function (h) {
      return (h.a === sel && h.b === id) || (h.a === id && h.b === sel);
    });
    if (repetido) {
      nodo.classList.remove("is-error"); void nodo.offsetWidth; nodo.classList.add("is-error");
      aviso("Ya tejiste un hilo entre estas dos ideas. Elige otra pareja.");
      return;
    }

    par = [sel, id];
    nodo.classList.add("is-sel");
    nodo.setAttribute("aria-pressed", "true");
    abrirComposer();
  }

  function abrirComposer() {
    var A = POR_ID[par[0]], B = POR_ID[par[1]];
    var form = $("#rcForm");
    form.style.setProperty("--rc-za", ZONAS[A.zona].color);
    form.style.setProperty("--rc-zb", ZONAS[B.zona].color);
    $("#rcPregunta").innerHTML = "Elegiste <b>" + esc(A.titulo) + "</b> y <b>" + esc(B.titulo) + "</b>. Cuéntanos, en una o dos frases, cómo se conectan.";
    var ta = $("#rcJustificacion");
    window.RCEditor.reset(ta);
    ta.closest(".rc-rte-box").classList.remove("is-invalida");
    $("#rcCount").textContent = "0/" + window.RCEditor.MAX;
    $("#rcFormError").textContent = "";
    panel("justificar");
    pintarHilos($("#rcLienzo"), true);
    setTimeout(function () { ta.focus({ preventScroll: !modoLista.matches }); }, 60);
  }

  function cerrarComposer(silencioso) {
    par = null;
    if (!silencioso) {
      limpiarSeleccion();
      pintarHilos($("#rcLienzo"), false);
    }
  }

  function guardarHilo(e) {
    e.preventDefault();
    if (!par) return;
    var ta = $("#rcJustificacion");
    var modelo = window.RCEditor.toModel(ta);
    var texto = ta.textContent.trim();
    if (!texto || !window.RCEditor.plainLength(modelo)) {
      ta.closest(".rc-rte-box").classList.add("is-invalida");
      $("#rcFormError").textContent = "Escribe por qué se conectan antes de guardar.";
      ta.focus();
      return;
    }
    estado.hilos.push({ a: par[0], b: par[1], texto: texto, modelo: modelo });
    nuevo = estado.hilos.length - 1;
    var primeraMeta = estado.hilos.length === META && !estado.completo;
    if (estado.hilos.length >= META) estado.completo = true;

    par = null;
    sel = null;
    var lienzo = $("#rcLienzo");
    lienzo.classList.remove("has-sel");
    $$(".rc-nodo", lienzo).forEach(function (n) {
      n.classList.remove("is-sel", "is-misma");
      n.setAttribute("aria-pressed", "false");
    });

    pintarHilos(lienzo, false);
    actualizarUsos(lienzo);
    pintarLista($("#rcLista"), true);
    actualizarProgreso();
    setTimeout(function () { nuevo = -1; }, 1300);

    var n = estado.hilos.length;
    if (primeraMeta) {
      panel("meta");
      confeti($("#rcContador"));
      setTimeout(function () { var b = $('#rcCentro [data-panel="meta"] .rc-btn:not(.rc-btn--ghost)'); if (b) b.focus({ preventScroll: true }); }, 200);
      return;
    }
    $("#rcOkTexto").textContent = n < META
      ? "Llevas " + n + " de " + META + " hilos tejidos."
      : "Llevas " + n + " hilos tejidos. Tu insignia ya está asegurada.";
    panel("confirmar");
    timerPanel = setTimeout(function () { guia("Elige una primera idea."); }, 2600);
    var foco = $('#rcNodos .rc-nodo[data-id="' + estado.hilos[n - 1].b + '"]');
    if (foco) foco.focus({ preventScroll: true });
  }

  /* ==================================================================
     PANTALLA 4 · RETRATO FINAL
     ================================================================== */
  function pintarFinal() {
    var lienzo = $("#rcLienzoFinal");
    pintarNodos($(".rc-nodos", lienzo), false);
    actualizarUsos(lienzo);
    pintarLista($("#rcListaFinal"), false);
    var n = estado.hilos.length;
    var usadas = {};
    estado.hilos.forEach(function (h) { usadas[h.a] = 1; usadas[h.b] = 1; });
    $("#rcResumen").textContent = n + " hilos tejidos entre " + Object.keys(usadas).length + " de las 8 ideas.";
    requestAnimationFrame(function () { pintarHilos(lienzo, false); });
  }

  function reiniciar() {
    if (!window.confirm("Se borrarán todos los hilos que tejiste. ¿Quieres empezar de nuevo?")) return;
    estado = { hilos: [], completo: false };
    pasoMax = 1;
    actualizarUsos($("#rcLienzo"));
    pintarLista($("#rcLista"), true);
    actualizarProgreso();
    $("#rcNotaDescarga").textContent = "";
    irA(1);
  }

  /* ==================================================================
     PDF CON LA PLANTILLA "APRENDER A APRENDER"
     ================================================================== */
  function hoy() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function pdfTexto(t) {
    return String(t)
      .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\u2026/g, "...")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x00-\xFF]/g, "");
  }

  // Imagen de la red para el PDF (se dibuja aparte, sin capturar la pantalla)
  function imagenRed() {
    var W = 1400, H = 1000;
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#061c5c"); g.addColorStop(1, "#020c2e");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(190,220,255,.14)";
    for (var gx = 13; gx < W; gx += 30) for (var gy = 13; gy < H; gy += 30) x.fillRect(gx, gy, 2, 2);

    var pos = {};
    CONCEPTOS.forEach(function (k) {
      pos[k.id] = { x: W * k.x / 100, y: H * k.y / 100 };
    });

    estado.hilos.forEach(function (h) {
      var A = pos[h.a], B = pos[h.b];
      var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      var cx = mx + (W / 2 - mx) * 0.3, cy = my + (H / 2 - my) * 0.3;
      var lg = x.createLinearGradient(A.x, A.y, B.x, B.y);
      lg.addColorStop(0, ZONAS[POR_ID[h.a].zona].color);
      lg.addColorStop(0.5, "#bfeaff");
      lg.addColorStop(1, ZONAS[POR_ID[h.b].zona].color);
      x.strokeStyle = lg;
      x.lineCap = "round";
      x.globalAlpha = 0.25; x.lineWidth = 16;
      x.beginPath(); x.moveTo(A.x, A.y); x.quadraticCurveTo(cx, cy, B.x, B.y); x.stroke();
      x.globalAlpha = 1; x.lineWidth = 5;
      x.beginPath(); x.moveTo(A.x, A.y); x.quadraticCurveTo(cx, cy, B.x, B.y); x.stroke();
    });

    var cw = 300, ch = 120;
    CONCEPTOS.forEach(function (k) {
      var p = pos[k.id], z = ZONAS[k.zona];
      var x0 = p.x - cw / 2, y0 = p.y - ch / 2;
      x.fillStyle = "#ffffff";
      redondeado(x, x0, y0, cw, ch, 16); x.fill();
      x.fillStyle = z.color;
      x.save(); redondeado(x, x0, y0, cw, ch, 16); x.clip(); x.fillRect(x0, y0, cw, 10); x.restore();
      x.fillStyle = z.color;
      x.font = "600 20px Poppins, Arial, sans-serif";
      x.fillText(z.unidad + " - " + z.nombre, x0 + 18, y0 + 40);
      x.fillStyle = "#000087";
      x.font = "700 27px Poppins, Arial, sans-serif";
      partir(x, k.titulo, cw - 36).forEach(function (l, i) { x.fillText(l, x0 + 18, y0 + 76 + i * 30); });
    });
    return c.toDataURL("image/png");
  }

  function redondeado(x, a, b, w, h, r) {
    x.beginPath();
    x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r);
    x.lineTo(a + w, b + h - r); x.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r);
    x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath();
  }

  function partir(x, texto, max) {
    var palabras = texto.split(" "), lineas = [""];
    palabras.forEach(function (p) {
      var prueba = (lineas[lineas.length - 1] + " " + p).trim();
      if (x.measureText(prueba).width > max && lineas[lineas.length - 1]) lineas.push(p);
      else lineas[lineas.length - 1] = prueba;
    });
    return lineas;
  }

  function descargarPdf() {
    var nota = $("#rcNotaDescarga");
    var tpl = window.PA_PLANTILLA_PDF;
    if (!window.jspdf || !tpl) {
      nota.textContent = "No se pudo generar el PDF. Revisa tu conexión a internet e inténtalo de nuevo.";
      return;
    }
    nota.textContent = "Generando tu documento…";

    var NAVY = [0, 0, 135], PURPLE = [130, 36, 211], TEXT = [27, 27, 27], GREY = [68, 68, 68], LINE = [213, 221, 251];
    var doc = new window.jspdf.jsPDF({ unit: "pt", format: "letter" });
    var W = doc.internal.pageSize.getWidth();
    var H = doc.internal.pageSize.getHeight();
    var M = 85;
    var headH = W * tpl.header.h / tpl.header.w;
    var footH = W * tpl.footer.h / tpl.footer.w;
    var top = headH + 34, bottom = H - footH - 30, y;

    function decorar() {
      doc.addImage(tpl.header.data, "JPEG", 0, 0, W, headH, "rc-head");
      doc.addImage(tpl.footer.data, "JPEG", 0, H - footH, W, footH, "rc-foot");
      y = top;
    }
    function asegurar(h) { if (y + h > bottom) { doc.addPage(); decorar(); } }
    function font(o) {
      doc.setFont("helvetica", (o.b && o.i) ? "bolditalic" : o.b ? "bold" : o.i ? "italic" : "normal");
      doc.setFontSize(o.size || 11.5);
      doc.setTextColor.apply(doc, o.color || TEXT);
    }

    // Párrafo con tramos de distinto estilo que se ajustan al ancho.
    // Cada tramo puede llevar negrilla (b), cursiva (i), subrayado (u), color,
    // resaltado (bg) y enlace (href). opts: { align, indent, marker }.
    function rich(parts, size, after, opts) {
      size = size || 11.5;
      opts = opts || {};
      var lh = size * 1.45;
      var indent = opts.indent || 0;
      var maxW = W - M * 2 - indent;
      var lines = [[]], lineW = 0;
      parts.forEach(function (part) {
        part.size = size;
        font(part);
        // Cada salto de línea escrito por la persona abre una línea nueva
        pdfTexto(part.text).split(/\r?\n/).forEach(function (row, r) {
          if (r > 0) {
            trimEnd(lines[lines.length - 1]);
            lines.push([]);
            lineW = 0;
          }
          row.split(/([ \t]+)/).forEach(addWord);
        });

        function addWord(word) {
          if (!word) return;
          var ww = doc.getTextWidth(word);
          if (/^\s+$/.test(word)) {
            if (lineW === 0) return;
            ww = doc.getTextWidth(" ");
            word = " ";
          } else if (lineW + ww > maxW && lineW > 0) {
            lineW -= trimEnd(lines[lines.length - 1]);
            lines.push([]);
            lineW = 0;
          }
          lines[lines.length - 1].push({ t: word, w: ww, o: part });
          lineW += ww;
        }
      });
      trimEnd(lines[lines.length - 1]);

      lines.forEach(function (line, li) {
        asegurar(lh);
        var used = line.reduce(function (a, t) { return a + t.w; }, 0);
        var spaces = line.filter(function (t) { return t.t === " "; }).length;
        var extra = 0, x = M + indent;
        if (opts.align === "center") x += (maxW - used) / 2;
        else if (opts.align === "right") x += maxW - used;
        else if (opts.align === "justify" && li < lines.length - 1 && spaces) extra = (maxW - used) / spaces;
        if (li === 0 && opts.marker) drawMarker(opts.marker, size);
        line.forEach(function (tok) {
          var w = tok.w + (tok.t === " " ? extra : 0);
          var o = tok.o;
          if (o.bg) {
            doc.setFillColor.apply(doc, o.bg);
            doc.rect(x, y + size * 0.12, w + 0.4, size * 1.16, "F");
          }
          font(o);
          if (tok.t !== " ") doc.text(tok.t, x, y + size);
          if (o.u) {
            doc.setDrawColor.apply(doc, o.color || TEXT);
            doc.setLineWidth(size / 18);
            doc.line(x, y + size + 1.6, x + w, y + size + 1.6);
          }
          if (o.href) doc.link(x, y, w, lh, { url: o.href });
          x += w;
        });
        y += lh;
      });
      y += after == null ? 6 : after;

      function trimEnd(line) {
        var cut = 0;
        while (line.length && line[line.length - 1].t === " ") cut += line.pop().w;
        return cut;
      }
      function drawMarker(m, sz) {
        var mx = M + indent;
        if (m === "•") {
          doc.setFillColor.apply(doc, TEXT);
          doc.circle(mx - 9, y + sz * 0.66, sz / 7, "F");
        } else {
          font({ size: sz });
          doc.text(m, mx - 5, y + sz, { align: "right" });
        }
      }
    }

    function texto(partes, size, despues) { rich(partes, size, despues); }

    // Justificación con el formato que le dio la persona en el editor
    function justificacion(h) {
      var etiqueta = { text: "Por qué se conectan: ", b: true, color: PURPLE };
      var bloques = h.modelo && h.modelo.length ? h.modelo : [{ runs: [{ text: h.texto }], align: "left" }];
      if (bloques[0].list) rich([etiqueta], null, 2);
      bloques.forEach(function (bl, k) {
        var partes = bl.runs.map(function (r) {
          return { text: r.text, b: r.b, i: r.i, u: r.u, color: r.color, bg: r.bg, href: r.href };
        });
        if (k === 0 && !bl.list) partes.unshift(etiqueta);
        var ultimo = k === bloques.length - 1;
        if (!partes.some(function (p) { return p.text.trim(); })) { asegurar(11.5 * 1.45); y += 11.5 * 1.45; return; }
        rich(partes, null, ultimo ? 4 : (bl.list ? 2 : 5), {
          align: bl.align, indent: bl.list ? 22 : 0,
          marker: bl.list ? (bl.list === "ol" ? bl.n + "." : "•") : null
        });
      });
    }

    decorar();
    texto([{ text: "Unidad 4", b: true, color: NAVY }], 20, 4);
    texto([{ text: "Experto temático: Mateo Muñetones Rico.", b: true, color: PURPLE }], 16, 14);
    texto([{ text: "La red de conexiones: mi red", b: true, color: NAVY }], 16, 2);
    texto([{ text: "Fecha: " + hoy(), color: GREY }], 11, 6);
    texto([{ text: "Insignia obtenida: ", b: true, color: PURPLE }, { text: "La Red" }], 11.5, 12);

    var img = imagenRed();
    var iw = W - M * 2, ih = iw * 1000 / 1400;
    asegurar(ih + 10);
    doc.addImage(img, "PNG", M, y, iw, ih, "rc-red");
    y += ih + 18;

    estado.hilos.forEach(function (h, i) {
      var A = POR_ID[h.a], B = POR_ID[h.b];
      asegurar(80);
      texto([{ text: "Hilo " + (i + 1) + ": " + A.titulo + " - " + B.titulo, b: true, color: NAVY }], 13, 3);
      texto([{ text: "Unidades: ", b: true, color: PURPLE }, { text: ZONAS[A.zona].unidad + " (" + ZONAS[A.zona].nombre + ") y " + ZONAS[B.zona].unidad + " (" + ZONAS[B.zona].nombre + ")" }], 11, 2);
      justificacion(h);
      if (i < estado.hilos.length - 1) {
        asegurar(24);
        y += 8;
        doc.setDrawColor.apply(doc, LINE);
        doc.setLineWidth(1);
        doc.line(M, y, W - M, y);
        doc.setFillColor(95, 208, 255);
        doc.circle(W / 2, y, 2.5, "F");
        y += 12;
      }
    });

    try {
      doc.save("Mi_red_de_conexiones_Aprender_a_aprender.pdf");
      nota.textContent = "¡Listo! Tu documento se descargó.";
      confeti($("#rcDescargar"));
    } catch (e) {
      nota.textContent = "No se pudo generar el PDF. Inténtalo de nuevo.";
    }
  }

  /* ==================================================================
     CONFETI
     ================================================================== */
  function confeti(origen) {
    if (reduceMotion || !origen) return;
    var canvas = document.createElement("canvas");
    canvas.className = "rc-confetti";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colores = ["#000087", "#5882f8", "#5fd0ff", "#2f6fe0", "#12a39a", "#e8576a", "#e0a106", "#f5b81c"];
    var r = origen.getBoundingClientRect();
    var ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    var piezas = [];
    for (var i = 0; i < 140; i++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      var v = 7 + Math.random() * 9;
      piezas.push({ x: ox, y: oy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35, c: colores[i % colores.length], redondo: Math.random() < 0.3 });
    }
    var inicio = null, DUR = 2600;
    function cuadro(t) {
      if (!inicio) inicio = t;
      var e = t - inicio;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = e > DUR - 600 ? Math.max(0, (DUR - e) / 600) : 1;
      piezas.forEach(function (p) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.redondo) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (e < DUR) requestAnimationFrame(cuadro); else canvas.remove();
    }
    requestAnimationFrame(cuadro);
  }

  /* ==================================================================
     INICIO
     ================================================================== */
  document.addEventListener("DOMContentLoaded", function () {

    var lienzo = $("#rcLienzo");
    pintarNodos($("#rcNodos"), true);
    actualizarUsos(lienzo);
    pintarLista($("#rcLista"), true);
    actualizarProgreso();
    irA(1, true);

    $("#rcNodos").addEventListener("click", function (e) {
      var n = e.target.closest(".rc-nodo");
      if (n) elegir(n);
    });

    $("#rcForm").addEventListener("submit", guardarHilo);
    $("#rcCancelar").addEventListener("click", function () { cerrarComposer(false); });
    var editor = $("#rcJustificacion");
    window.RCEditor.init(editor, function () {
      editor.closest(".rc-rte-box").classList.remove("is-invalida");
      $("#rcFormError").textContent = "";
      $("#rcCount").textContent = editor.textContent.length + "/" + window.RCEditor.MAX;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || pasoActual !== 2) return;
      // Si hay un menú del editor abierto (colores, enlace, alineación), Esc solo lo cierra
      var menu = document.querySelector(".rc-rte-menu:not([hidden])");
      if (menu || (e.target.closest && e.target.closest(".rc-rte-bar"))) {
        $$(".rc-rte-menu").forEach(function (m) { m.hidden = true; });
        $$(".rc-rte-bar [aria-expanded]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
        return;
      }
      if ($("#rcCajon").classList.contains("is-open")) { abrirCajon(false); $("#rcAbrirHilos").focus({ preventScroll: true }); }
      else if (par) cerrarComposer(false);
      else if (sel) limpiarSeleccion();
    });

    $("#rcSeguir").addEventListener("click", function () { guia("Elige una primera idea."); });

    // Cajón de hilos tejidos
    $("#rcAbrirHilos").addEventListener("click", function () {
      abrirCajon(!$("#rcCajon").classList.contains("is-open"));
    });
    $("#rcCerrarHilos").addEventListener("click", function () {
      abrirCajon(false);
      $("#rcAbrirHilos").focus({ preventScroll: true });
    });

    // Pantalla completa del navegador (solo si el navegador o el LMS lo permiten)
    if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
      $("#rcPantalla").hidden = false;
      $("#rcPantalla").addEventListener("click", alternarPantallaCompleta);
      document.addEventListener("fullscreenchange", actualizarBotonPantalla);
      document.addEventListener("webkitfullscreenchange", actualizarBotonPantalla);
    }

    // Resaltar un hilo desde la lista
    var lista = $("#rcLista");
    function marcar(e) {
      var li = e.target.closest(".rc-tejido");
      var i = li ? +li.dataset.hilo : -1;
      if (i === resaltado) return;
      resaltado = i;
      $$("#rcHilos .rc-hilo-g").forEach(function (g) { g.classList.toggle("rc-hilo--resaltado", +g.dataset.hilo === i); });
    }
    lista.addEventListener("mouseover", marcar);
    lista.addEventListener("focusin", marcar);
    lista.addEventListener("mouseleave", function () { marcar({ target: document.body }); });
    lista.addEventListener("focusout", function () { marcar({ target: document.body }); });

    // Navegación entre pasos
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-goto]");
      if (b && !b.disabled) irA(+b.dataset.goto);
    });
    $$("#navmenu .rc-nav").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        irA(+a.dataset.paso);
      });
    });
    $$(".rc-steps li").forEach(function (li) {
      $("button", li).addEventListener("click", function () { irA(+li.dataset.step); });
    });

    $("#rcDescargar").addEventListener("click", descargarPdf);
    $("#rcReiniciar").addEventListener("click", reiniciar);

    // Los hilos se recalculan si cambia el tamaño del lienzo (ventana, A+/A-, modo lista)
    var repintar = function () {
      if (pasoActual === 2) pintarHilos(lienzo, !!par);
      if (pasoActual === 3) pintarHilos($("#rcLienzoFinal"), false);
    };
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { requestAnimationFrame(repintar); });
      ro.observe(lienzo);
      ro.observe($("#rcLienzoFinal"));
      $$(".rc-nodo", lienzo).forEach(function (n) { ro.observe(n); });
    } else {
      window.addEventListener("resize", repintar);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(repintar);
  });
})();
