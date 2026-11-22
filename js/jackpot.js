/* ═══════════════════════════════════════════════
   SODA VANGUARDIA — jackpot.js
   Tragamonedas de 3 rodillos con los 7 sabores.
   El resultado se sortea ANTES de animar; los rodillos solo lo muestran.
══════════════════════════════════════════════════ */

/* ── PROBABILIDADES (tocá acá) ────────────────────
   La chance de premio se define para TODOS los tiros del día juntos
   (CONFIG.jackpotProbTotal en juegos-comun.js, hoy 0.25 = 25 %) y la
   chance de cada tiro se deriva sola:  1 - (1 - total)^(1 / tiros).
   Con 3 tiros y 25 % total => ~9,1 % por tiro.

   PREMIOS: cuando hay premio, qué sabor sale. Los pesos son relativos
   (no hace falta que sumen 100). El de mayor peso es el que más sale:
   la "soda" clásica, Agua con Gas; después los demás. */
const PREMIOS = [
  { id: 'agua-gas', peso: 30 },   // la soda de siempre: el premio más frecuente
  { id: 'serrana',  peso: 20 },
  { id: 'limon',    peso: 15 },
  { id: 'naranja',  peso: 12 },
  { id: 'pomelo',   peso: 10 },
  { id: 'tonica',   peso: 8  },
  { id: 'agua',     peso: 5  }    // el más difícil
];
// De los tiros perdidos, qué fracción muestra 2 iguales ("¡casi!") para dar suspenso
const PROB_CASI = 0.40;

document.addEventListener('DOMContentLoaded', () => {
  const { CONFIG, SABORES, porId, azar, entero, mezclar, elegirPonderado,
          leerDia, guardarDia, generarCodigo, mostrarPremio, mostrarYaJugo } = window.SV;

  const CLAVE = 'sv_jackpot';
  const maquina  = document.getElementById('maquina');
  const reelsEl  = [...document.querySelectorAll('.reel')];
  const btnGirar = document.getElementById('btnGirar');
  const tirosEl  = document.getElementById('tiros');
  const msgEl    = document.getElementById('mensaje');
  const yaJugo   = document.getElementById('yaJugo');
  const reducir  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DURACIONES = reducir ? [60, 60, 60] : [1900, 2600, 3300];
  const MAX_TIROS = CONFIG.jackpotTirosPorDia;   // 0 = ilimitado

  // Chance de cada tiro para que, entre todos los tiros del día, la probabilidad
  // de ganar al menos una vez sea CONFIG.jackpotProbTotal. (Si los tiros son
  // ilimitados se toma como referencia 3, para no regalar de más.)
  const TIROS_REF = MAX_TIROS > 0 ? MAX_TIROS : 3;
  const PROB_GANAR = 1 - Math.pow(1 - CONFIG.jackpotProbTotal, 1 / TIROS_REF);

  let actuales = [];     // id del sabor visible en cada rodillo
  let girando = false;

  /* ── Decoración ──────────────────────────────── */
  function foquitos() {
    ['focosArriba', 'focosAbajo'].forEach(id => {
      const cont = document.getElementById(id);
      for (let i = 0; i < 13; i++) cont.appendChild(document.createElement('i'));
    });
  }
  function burbujasFondo() {
    const cont = document.getElementById('fondoBurbujas');
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      const t = 10 + entero(36);
      s.style.cssText = `left:${entero(100)}%;width:${t}px;height:${t}px;` +
        `animation-duration:${9 + azar() * 12}s;animation-delay:${-azar() * 14}s;`;
      cont.appendChild(s);
    }
  }
  function listarPremios() {
    document.getElementById('listaPremios').innerHTML = SABORES
      .map(s => `<li style="--c:${s.color}"><i></i>${s.nombre}</li>`).join('');
  }

  /* ── Símbolos y rodillos ─────────────────────── */
  function simboloHTML(s, alto) {
    return `<div class="sym" style="--fondo:${s.fondo};--color:${s.color};flex:none;height:${alto}px">
      <div class="sym__img"><img src="${s.img}" alt="" draggable="false"></div>
      <div class="sym__name">${s.nombre}</div></div>`;
  }

  function pintarReposo(i) {
    const strip = reelsEl[i].querySelector('.reel__strip');
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    strip.classList.remove('is-moving');
    strip.innerHTML = simboloHTML(porId(actuales[i]), reelsEl[i].clientHeight);
  }

  function pintarTodosEnReposo() { reelsEl.forEach((_, i) => pintarReposo(i)); }

  // Devuelve una promesa que se resuelve cuando el rodillo i frena en finalId
  function girarRodillo(i, finalId, duracion) {
    return new Promise(resolve => {
      const strip = reelsEl[i].querySelector('.reel__strip');
      const alto = reelsEl[i].clientHeight;
      const cantidad = reducir ? 3 : 22 + i * 7;

      // Cinta: [visible ahora, ...relleno, resultado]
      // (cada símbolo distinto del anterior, sin bucles que dependan del azar)
      const ids = [actuales[i]];
      let prev = SABORES.findIndex(s => s.id === actuales[i]);
      for (let k = 1; k < cantidad - 1; k++) {
        prev = (prev + 1 + entero(SABORES.length - 1)) % SABORES.length;
        ids.push(SABORES[prev].id);
      }
      ids.push(finalId);

      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = ids.map(id => simboloHTML(porId(id), alto)).join('');
      strip.classList.add('is-moving');
      void strip.offsetHeight; // fuerza el reflow para que arranque la transición

      strip.style.transition = `transform ${duracion}ms cubic-bezier(0.18, 0.7, 0.2, 1)`;
      strip.style.transform = `translateY(-${(cantidad - 1) * alto}px)`;

      // Timer en vez de transitionend: con "reducir movimiento" no hay transición
      setTimeout(() => {
        actuales[i] = finalId;
        pintarReposo(i);
        resolve();
      }, duracion + 40);
    });
  }

  /* ── Sorteo ──────────────────────────────────── */
  function sortear() {
    if (azar() < PROB_GANAR) {
      const premio = elegirPonderado(PREMIOS);
      return { gana: true, sabor: premio.id, simbolos: [premio.id, premio.id, premio.id], casi: false };
    }
    const ids = SABORES.map(s => s.id);
    if (azar() < PROB_CASI) {
      const [a, b] = mezclar(ids);
      const simbolos = [a, a, a];
      simbolos[entero(3)] = b;          // el "intruso" cae en una posición al azar
      return { gana: false, simbolos, casi: true };
    }
    return { gana: false, simbolos: mezclar(ids).slice(0, 3), casi: false };
  }

  /* ── Estado / límites ────────────────────────── */
  function tirosRestantes() {
    if (MAX_TIROS <= 0) return Infinity;
    return Math.max(0, MAX_TIROS - leerDia(CLAVE).usados);
  }
  function pintarTiros() {
    const r = tirosRestantes();
    tirosEl.textContent = r === Infinity ? '∞' : r;
  }
  function mensaje(html) { msgEl.innerHTML = html; }

  function jugadaCerrada() {
    const d = leerDia(CLAVE);
    return !!d.premio || tirosRestantes() === 0;
  }

  function mostrarBloqueo() {
    maquina.hidden = true;
    msgEl.hidden = true;
    mostrarYaJugo(yaJugo, CLAVE);
  }

  /* ── Girar ───────────────────────────────────── */
  async function girar() {
    if (girando || jugadaCerrada()) return;
    girando = true;

    const resultado = sortear();

    // Se registra YA (tiro gastado y premio guardado): recargar la página no sirve de nada
    const dia = leerDia(CLAVE);
    dia.usados += 1;
    let codigo = null;
    if (resultado.gana) {
      codigo = generarCodigo();
      dia.premio = { sabor: resultado.sabor, codigo };
    }
    guardarDia(CLAVE, dia);
    pintarTiros();

    btnGirar.disabled = true;
    maquina.classList.remove('is-win');
    reelsEl.forEach(r => r.classList.remove('is-winner'));
    maquina.classList.add('is-spinning');
    mensaje('Girando…');

    await Promise.all(resultado.simbolos.map((id, i) => girarRodillo(i, id, DURACIONES[i])));

    maquina.classList.remove('is-spinning');
    girando = false;

    if (resultado.gana) {
      const sabor = porId(resultado.sabor);
      maquina.classList.add('is-win');
      reelsEl.forEach(r => r.classList.add('is-winner'));
      mensaje(`¡JACKPOT!<small>Tres ${sabor.nombre} en línea</small>`);
      setTimeout(() => {
        mostrarPremio({ sabor, codigo, clave: CLAVE, onCerrar: mostrarBloqueo });
      }, reducir ? 100 : 1100);
      return;
    }

    const quedan = tirosRestantes();
    const titulo = resultado.casi ? '¡Uy, casi!' : 'Esta vez no…';
    if (quedan === 0) {
      mensaje(`${titulo}<small>Se terminaron tus tiros de hoy. ¡Gracias por jugar!</small>`);
      setTimeout(mostrarBloqueo, 2200);
    } else {
      const txt = quedan === Infinity ? 'Probá de nuevo.' :
        `Te ${quedan === 1 ? 'queda 1 tiro' : `quedan ${quedan} tiros`}.`;
      mensaje(`${titulo}<small>${txt}</small>`);
      btnGirar.disabled = false;
    }
  }

  /* ── Inicio ──────────────────────────────────── */
  foquitos();
  burbujasFondo();
  listarPremios();

  actuales = mezclar(SABORES.map(s => s.id)).slice(0, 3);
  pintarTodosEnReposo();
  pintarTiros();

  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { if (!girando) pintarTodosEnReposo(); }, 150);
  });

  btnGirar.addEventListener('click', girar);

  if (jugadaCerrada()) mostrarBloqueo();
});
