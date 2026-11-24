/* ═══════════════════════════════════════════════
   SODA VANGUARDIA — memotest.js
   14 cartas (7 sabores x 2) y cuenta regresiva (CONFIG.memotestSegundos).
   Si se completa a tiempo: premio con sabor al azar.
   Si se acaba el tiempo: se puede volver a intentar (no gasta nada).
══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const { CONFIG, SABORES, porId, mezclar, entero, leerDia, guardarDia,
          generarCodigo, mostrarPremio, mostrarYaJugo } = window.SV;

  const CLAVE = 'sv_memotest';
  const LIMITE_MS = CONFIG.memotestSegundos * 1000;
  const URGENTE_S = 10;   // desde acá el reloj se pone rojo

  const tablero      = document.getElementById('tablero');
  const stPares      = document.getElementById('stPares');
  const stMov        = document.getElementById('stMov');
  const stTiempo     = document.getElementById('stTiempo');
  const statTiempo   = document.getElementById('statTiempo');
  const barraWrap    = document.querySelector('.memo__barra');
  const barra        = document.getElementById('barraTiempo');
  const estado       = document.getElementById('estado');
  const yaJugo       = document.getElementById('yaJugo');
  const notaPartidas = document.getElementById('notaPartidas');
  const dlgFin      = document.getElementById('finTiempo');
  const finTexto     = document.getElementById('finTexto');
  const btnReintentar = document.getElementById('btnReintentar');

  document.getElementById('subSegundos').textContent = CONFIG.memotestSegundos;

  const TOTAL_PARES = SABORES.length;
  const logoSrc = 'imgs/logocirular.jpeg';

  let abiertas = [];      // cartas dadas vuelta y aún sin resolver (máx. 2)
  let bloqueado = false;  // mientras se muestra un fallo
  let terminado = false;  // partida cerrada (ganada o sin tiempo)
  let pares = 0;
  let intentos = 0;
  let timer = null;
  let limiteHasta = 0;    // Date.now() en que vence el tiempo

  /* ── Límite diario ───────────────────────────────
     Una partida se gasta al dar vuelta la 1ª carta (se guarda ya mismo:
     recargar la página no devuelve el intento). Ganar corta el día.      */
  const MAX_PARTIDAS = CONFIG.memotestPartidasPorDia;   // 0 = ilimitado

  function partidasRestantes() {
    if (MAX_PARTIDAS <= 0) return Infinity;
    return Math.max(0, MAX_PARTIDAS - leerDia(CLAVE).usados);
  }
  function limiteAlcanzado() {
    return !!leerDia(CLAVE).premio || partidasRestantes() === 0;
  }

  function pintarNotaPartidas() {
    const r = partidasRestantes();
    notaPartidas.textContent = r === Infinity ? '' :
      ` Tenés ${MAX_PARTIDAS} partidas por día: te ${r === 1 ? 'queda 1' : `quedan ${r}`}.`;
  }

  function mostrarBloqueo() {
    tablero.hidden = true;
    document.querySelector('.memo__stats').hidden = true;
    barraWrap.hidden = true;
    mostrarYaJugo(yaJugo, CLAVE);
  }

  /* ── Tablero ─────────────────────────────────── */
  function crearCarta(sabor, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mt-card';
    b.dataset.id = sabor.id;
    b.dataset.n = i + 1;
    b.style.setProperty('--color', sabor.color);
    b.style.setProperty('--fondo', sabor.fondo);
    b.setAttribute('aria-label', `Carta ${i + 1}, boca abajo`);
    b.innerHTML = `
      <span class="mt-card__inner">
        <span class="mt-face mt-face--back" aria-hidden="true">
          <img src="${logoSrc}" alt="" draggable="false" />
        </span>
        <span class="mt-face mt-face--front" aria-hidden="true">
          <span class="mt-img"><img src="${sabor.img}" alt="" draggable="false" /></span>
          <span class="mt-name">${sabor.nombre}</span>
        </span>
      </span>`;
    b.addEventListener('click', () => darVuelta(b, i));
    return b;
  }

  function crearCentro() {
    const d = document.createElement('div');
    d.className = 'mt-centro';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = `<img src="${logoSrc}" alt="" draggable="false" />`;
    return d;
  }

  function nuevaPartida() {
    if (dlgFin.open) dlgFin.close();
    clearInterval(timer);
    timer = null;
    abiertas = [];
    bloqueado = false;
    terminado = false;
    pares = 0; intentos = 0;
    tablero.classList.remove('is-fin');
    pintarReloj(LIMITE_MS);
    pintarStats();
    tablero.innerHTML = '';
    mezclar([...SABORES, ...SABORES]).forEach((s, i) => {
      // En celular la grilla es de 5x3 = 15: el logo ocupa el casillero del medio
      if (i === TOTAL_PARES) tablero.appendChild(crearCentro());
      tablero.appendChild(crearCarta(s, i));
    });
    pintarNotaPartidas();
    estado.textContent = `Partida nueva. Tenés ${CONFIG.memotestSegundos} segundos desde la primera carta.`;
  }

  function pintarStats() {
    stPares.textContent = `${pares}/${TOTAL_PARES}`;
    stMov.textContent = intentos;
  }

  /* ── Cuenta regresiva ────────────────────────── */
  function pintarReloj(msRestantes) {
    const s = Math.max(0, Math.ceil(msRestantes / 1000));
    stTiempo.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    barra.style.transform = `scaleX(${Math.max(0, msRestantes) / LIMITE_MS})`;
    const urgente = s <= URGENTE_S && msRestantes > 0 && timer !== null;
    statTiempo.classList.toggle('is-urgente', urgente);
    barraWrap.classList.toggle('is-urgente', urgente);
  }

  function iniciarReloj() {
    if (timer) return;
    // Se gasta la partida YA (recargar no devuelve el intento)
    const dia = leerDia(CLAVE);
    dia.usados += 1;
    guardarDia(CLAVE, dia);
    limiteHasta = Date.now() + LIMITE_MS;
    // 200 ms: la cuenta se calcula contra la hora real, no suma ticks
    timer = setInterval(() => {
      const ms = limiteHasta - Date.now();
      pintarReloj(ms);
      if (ms <= 0) sinTiempo();
    }, 200);
  }

  function detenerReloj() {
    clearInterval(timer);
    timer = null;
    statTiempo.classList.remove('is-urgente');
    barraWrap.classList.remove('is-urgente');
  }

  /* ── Jugada ──────────────────────────────────── */
  function darVuelta(carta, i) {
    if (bloqueado || terminado) return;
    if (carta.classList.contains('is-flipped') || carta.classList.contains('is-matched')) return;

    iniciarReloj();
    carta.classList.add('is-flipped');
    const sabor = porId(carta.dataset.id);
    carta.setAttribute('aria-label', `Carta ${i + 1}: ${sabor.nombre}`);
    abiertas.push(carta);

    if (abiertas.length < 2) return;

    intentos++;
    pintarStats();
    const [a, b] = abiertas;

    if (a.dataset.id === b.dataset.id) {
      [a, b].forEach(c => {
        c.classList.remove('is-flipped');
        c.classList.add('is-matched');
        c.disabled = true;
      });
      abiertas = [];
      pares++;
      pintarStats();
      estado.textContent = `¡Par de ${sabor.nombre}! Llevás ${pares} de ${TOTAL_PARES}.`;
      if (pares === TOTAL_PARES) {
        // Se frena el reloj YA: lo que dure la animación no puede costarte la victoria
        terminado = true;
        detenerReloj();
        setTimeout(ganar, 700);
      }
    } else {
      bloqueado = true;
      estado.textContent = `${porId(a.dataset.id).nombre} y ${porId(b.dataset.id).nombre} no son pareja.`;
      setTimeout(() => {
        if (terminado) return;   // si se acabó el tiempo, el tablero queda como está
        [a, b].forEach(c => {
          c.classList.remove('is-flipped');
          c.setAttribute('aria-label', `Carta ${c.dataset.n}, boca abajo`);
        });
        abiertas = [];
        bloqueado = false;
      }, 900);
    }
  }

  /* ── Se acabó el tiempo ──────────────────────── */
  function sinTiempo() {
    if (terminado) return;
    terminado = true;
    detenerReloj();
    pintarReloj(0);
    tablero.classList.add('is-fin');
    const r = partidasRestantes();
    finTexto.textContent = `Encontraste ${pares} de ${TOTAL_PARES} pares. ` + (r > 0
      ? `¡Probá de nuevo! ${r === Infinity ? '' : (r === 1 ? 'Te queda 1 partida hoy.' : `Te quedan ${r} partidas hoy.`)}`
      : 'Se terminaron tus partidas de hoy. ¡Gracias por jugar, volvé mañana!');
    btnReintentar.textContent = r > 0 ? 'Intentar de nuevo' : 'Listo';
    estado.textContent = `Se acabó el tiempo. Encontraste ${pares} de ${TOTAL_PARES} pares.`;
    if (typeof dlgFin.showModal === 'function') dlgFin.showModal();
    else dlgFin.setAttribute('open', '');
  }

  /* ── Victoria: sabor al azar (todos con la misma chance) ── */
  function ganar() {
    const sabor = SABORES[entero(SABORES.length)];
    const codigo = generarCodigo();

    const dia = leerDia(CLAVE);
    dia.premio = { sabor: sabor.id, codigo };
    guardarDia(CLAVE, dia);

    estado.textContent = `¡Ganaste! Tu premio es una soda ${sabor.nombre}. Código ${codigo}.`;

    mostrarPremio({
      sabor, codigo, clave: CLAVE,
      onCerrar: () => { if (limiteAlcanzado()) mostrarBloqueo(); }
    });
  }

  /* ── Inicio ──────────────────────────────────── */
  btnReintentar.addEventListener('click', () => {
    if (limiteAlcanzado()) { if (dlgFin.open) dlgFin.close(); mostrarBloqueo(); }
    else nuevaPartida();
  });
  // Esc no puede cerrar el cartel: dejaría el tablero congelado
  dlgFin.addEventListener('cancel', e => e.preventDefault());

  if (limiteAlcanzado()) mostrarBloqueo();
  else nuevaPartida();
});
