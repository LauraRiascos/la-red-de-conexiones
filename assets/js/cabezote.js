/*--------------------------------------------------------------
# Cabezote — Unidad 4 · El gran banquete del aprendizaje
# 1) Red neuronal tenue (misma animación de los cabezotes de las
#    unidades 1 a 3, en cian).
# 2) Hilos de luz: sobre la imagen del globo se tejen conexiones
#    nuevas entre sus nodos luminosos; cada hilo crece, lo recorre
#    una chispa, se sostiene y se desvanece. Los nodos titilan.
--------------------------------------------------------------*/
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PASO = 1000 / 40; // ~40 cuadros por segundo

  // Chispa precalculada una sola vez
  function crearChispa(r, g, b) {
    var c = document.createElement("canvas");
    c.width = c.height = 48;
    var x = c.getContext("2d");
    var gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, "rgba(235,250,255,1)");
    gr.addColorStop(0.3, "rgba(" + r + "," + g + "," + b + ",.85)");
    gr.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 48, 48);
    return c;
  }
  var chispa = crearChispa(95, 208, 255);

  /* ================= 1) Red neuronal tenue ================= */
  function initNeural() {
    var canvas = document.getElementById("rcNeural");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var nodes = [], pulses = [];
    var w = 0, h = 0, dpr = 1, ultimo = 0;
    var LINK = 130, LINK2 = LINK * LINK;
    var hero = canvas.closest(".rc-hero");
    var running = false, visible = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      var nw = canvas.offsetWidth, nh = canvas.offsetHeight;
      if (nw === w && nh === h) return;
      w = nw; h = nh;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(40, (w * h) / 24000));
      nodes = []; pulses = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w * 0.6, // se concentra a la izquierda: a la derecha ya está el globo
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.4 + 0.7
        });
      }
      if (reduceMotion) draw();
    }

    function spawnPulse() {
      if (!nodes.length) return;
      var a = nodes[Math.floor(Math.random() * nodes.length)];
      var best = null, bd = Infinity;
      nodes.forEach(function (b) {
        if (b === a) return;
        var dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
        if (d < LINK2 && d < bd) { bd = d; best = b; }
      });
      if (best) pulses.push({ a: a, b: best, t: 0 });
    }

    function draw(t) {
      if (!reduceMotion) {
        if (!visible || document.hidden) { running = false; return; }
        requestAnimationFrame(draw);
        if (t - ultimo < PASO) return;
        ultimo = t;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgb(140,205,255)";
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!reduceMotion) {
          n.x += n.vx * 1.5; n.y += n.vy * 1.5;
          if (n.x < 0 || n.x > w * 0.65) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK2) {
            ctx.globalAlpha = 0.18 * (1 - Math.sqrt(d2) / LINK);
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(200,235,255,.6)";
      ctx.beginPath();
      for (var q = 0; q < nodes.length; q++) {
        var o = nodes[q];
        ctx.moveTo(o.x + o.r, o.y);
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      }
      ctx.fill();
      for (var k = pulses.length - 1; k >= 0; k--) {
        var p = pulses[k];
        p.t += 0.027;
        if (p.t >= 1) { pulses.splice(k, 1); continue; }
        var x = p.a.x + (p.b.x - p.a.x) * p.t;
        var y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.drawImage(chispa, x - 9, y - 9, 18, 18);
      }
      if (!reduceMotion && Math.random() < 0.06 && pulses.length < 8) spawnPulse();
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      requestAnimationFrame(draw);
    }

    resize();
    if (reduceMotion) draw(); else start();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (hero) hero.classList.toggle("rc-pausa", !visible);
        if (visible) start();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
  }

  /* ================= 2) Hilos de luz sobre el globo ================= */
  // Nodos luminosos de la imagen (porcentaje del ancho y del alto),
  // detectados sobre la propia ilustración del globo y sus órbitas.
  var PUNTOS = [[48.92,46.85],[97.39,56.23],[94.58,31.23],[87.92,58.83],[59.78,20.56],[77.58,75.0],[97.53,31.85],[65.47,42.72],[80.28,71.85],[81.06,81.91],[99.14,32.35],[58.78,58.52],[78.64,65.37],[78.33,67.78],[69.0,98.46],[91.0,21.05],[82.78,59.57],[72.67,66.17],[74.28,70.62],[94.17,76.6],[78.0,78.58],[76.56,85.49],[51.61,50.31],[55.0,65.19],[76.72,73.02],[85.81,65.8],[86.47,46.05],[87.89,49.2],[71.42,82.1],[79.03,82.47],[89.22,83.15],[74.42,86.67],[71.58,92.41],[97.36,38.09],[90.81,61.42],[75.42,63.4],[75.94,76.05],[80.97,76.79],[79.25,86.11],[97.36,20.8],[93.69,37.16],[94.67,48.02],[97.78,50.43],[92.03,58.09],[73.58,64.38],[82.44,70.12],[72.47,73.02],[83.47,80.56],[75.56,82.78],[74.39,83.77],[73.69,21.17],[79.44,46.79],[76.61,50.31],[83.92,42.72],[88.81,33.21],[79.03,61.36],[77.33,47.59],[79.06,49.2],[82.5,41.05],[68.64,85.06],[73.86,54.57],[91.11,33.15],[81.17,50.43],[78.25,51.73],[73.14,58.09],[96.42,32.65],[75.56,80.06],[82.03,38.7],[77.86,60.37],[79.72,43.58],[78.72,58.46],[77.47,80.74],[87.64,37.84],[77.56,54.69],[81.61,55.0],[80.56,56.85],[69.03,79.69],[82.83,51.54],[77.89,63.33],[70.06,69.94],[68.75,82.53],[64.17,14.26],[61.25,34.44],[68.17,38.33],[50.0,85.19],[68.75,16.67],[81.5,13.0],[90.0,12.9]];

  function initHilos() {
    var canvas = document.getElementById("rcHeroNet");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var hero = canvas.closest(".rc-hero");
    var w = 0, h = 0, dpr = 1, ultimo = 0;
    var nodos = [], hilos = [], ondas = [];
    var running = false, visible = true;
    var MAX_HILOS = 7;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var nw = canvas.offsetWidth, nh = canvas.offsetHeight;
      if (!nw || !nh || (nw === w && nh === h)) return;
      w = nw; h = nh;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodos = PUNTOS.map(function (p) {
        return { x: p[0] / 100 * w, y: p[1] / 100 * h, fase: Math.random() * Math.PI * 2, vel: 0.6 + Math.random() * 1.2 };
      });
      hilos = []; ondas = [];
      if (reduceMotion) { for (var i = 0; i < 6; i++) nuevoHilo(true); dibujar(0); }
    }

    function nuevoHilo(fijo) {
      if (nodos.length < 2) return;
      var esc = w / 1200; // distancias pensadas para un ancho de referencia de 1200 px
      for (var intento = 0; intento < 20; intento++) {
        var a = nodos[Math.floor(Math.random() * nodos.length)];
        var b = nodos[Math.floor(Math.random() * nodos.length)];
        if (a === b) continue;
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 70 * esc || d > 330 * esc) continue;
        // punto de control perpendicular: los hilos se curvan como las órbitas
        var curva = (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.22) * d;
        hilos.push({
          a: a, b: b,
          cx: (a.x + b.x) / 2 - dy / d * curva,
          cy: (a.y + b.y) / 2 + dx / d * curva,
          t: fijo ? 1.6 : 0,
          crecer: 0.9 + Math.random() * 0.6,   // segundos
          sostener: 1.2 + Math.random() * 1.6,
          desvanecer: 0.9
        });
        return;
      }
    }

    function punto(hl, t) {
      var u = 1 - t;
      return {
        x: u * u * hl.a.x + 2 * u * t * hl.cx + t * t * hl.b.x,
        y: u * u * hl.a.y + 2 * u * t * hl.cy + t * t * hl.b.y
      };
    }

    function trazo(hl, hasta, alfa) {
      var pasos = 24;
      ctx.beginPath();
      ctx.moveTo(hl.a.x, hl.a.y);
      for (var i = 1; i <= pasos; i++) {
        var p = punto(hl, hasta * i / pasos);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(95,208,255," + (alfa * 0.22) + ")";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(200,240,255," + (alfa * 0.85) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    function dibujar(dt) {
      ctx.clearRect(0, 0, w, h);
      var tiempo = performance.now() / 1000;

      // nodos que titilan
      for (var i = 0; i < nodos.length; i++) {
        var n = nodos[i];
        var s = (Math.sin(tiempo * n.vel + n.fase) + 1) / 2;
        if (s < 0.55) continue;
        var tam = 8 + (s - 0.55) * 30;
        ctx.globalAlpha = (s - 0.55) * 1.8;
        ctx.drawImage(chispa, n.x - tam / 2, n.y - tam / 2, tam, tam);
      }
      ctx.globalAlpha = 1;

      // hilos de luz
      for (var k = hilos.length - 1; k >= 0; k--) {
        var hl = hilos[k];
        hl.t += dt;
        var total = hl.crecer + hl.sostener + hl.desvanecer;
        if (hl.t >= total) {
          if (Math.random() < 0.5) ondas.push({ x: hl.b.x, y: hl.b.y, t: 0 });
          hilos.splice(k, 1);
          continue;
        }
        var avance = Math.min(1, hl.t / hl.crecer);
        avance = 1 - Math.pow(1 - avance, 2);
        var alfa = hl.t > hl.crecer + hl.sostener ? 1 - (hl.t - hl.crecer - hl.sostener) / hl.desvanecer : 1;
        trazo(hl, avance, alfa);
        // chispa: en la punta mientras crece; luego recorre el hilo una vez
        var pos = hl.t < hl.crecer ? avance : Math.min(1, (hl.t - hl.crecer) / hl.sostener);
        var p = punto(hl, pos);
        ctx.globalAlpha = alfa;
        ctx.drawImage(chispa, p.x - 11, p.y - 11, 22, 22);
        ctx.drawImage(chispa, hl.a.x - 7, hl.a.y - 7, 14, 14);
        if (avance >= 1) ctx.drawImage(chispa, hl.b.x - 9, hl.b.y - 9, 18, 18);
        ctx.globalAlpha = 1;
      }

      // ondas al llegar a un nodo
      for (var o = ondas.length - 1; o >= 0; o--) {
        var on = ondas[o];
        on.t += dt;
        if (on.t > 1.2) { ondas.splice(o, 1); continue; }
        ctx.beginPath();
        ctx.arc(on.x, on.y, 4 + on.t * 22, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(150,225,255," + (0.6 * (1 - on.t / 1.2)) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (!reduceMotion && hilos.length < MAX_HILOS && Math.random() < 0.06) nuevoHilo();
    }

    function loop(t) {
      if (!visible || document.hidden) { running = false; return; }
      requestAnimationFrame(loop);
      if (t - ultimo < PASO) return;
      var dt = ultimo ? Math.min(0.1, (t - ultimo) / 1000) : PASO / 1000;
      ultimo = t;
      dibujar(dt);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      ultimo = 0;
      requestAnimationFrame(loop);
    }

    resize();
    if (!reduceMotion) { for (var i = 0; i < 3; i++) nuevoHilo(); start(); }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (hero) hero.classList.toggle("rc-pausa", !visible);
        if (visible) start();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
  }

  function initCta() {
    var cta = document.getElementById("rcHeroCta");
    var destino = document.getElementById("seccion2");
    if (!cta || !destino) return;
    cta.addEventListener("click", function () {
      // Una vez iniciado el recorrido, el botón ya no hace falta
      document.body.classList.add("rc-iniciado");
      var header = document.getElementById("header");
      var offset = header ? header.offsetHeight : 0;
      var top = destino.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNeural();
    initHilos();
    initCta();
  });
})();
