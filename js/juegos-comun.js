/* ═══════════════════════════════════════════════
   SODA VANGUARDIA — juegos-comun.js
   Datos y utilidades compartidas por memotest.html y jackpot.html
══════════════════════════════════════════════════ */

window.SV = (() => {

  /* ── CONFIGURACIÓN (tocá acá) ─────────────────── */
  const CONFIG = {
    // Tiempo para completar el memotest (corre desde que se da vuelta la 1ª carta)
    memotestSegundos: 40,

    // Límite por dispositivo y por día (localStorage). 0 = sin límite.
    // Ojo: es una barrera "de cortesía", se puede esquivar (modo incógnito,
    // borrar datos). El control real es el canje: el personal ve el sello.
    memotestPartidasPorDia: 2,   // partidas (se gasta al dar vuelta la 1ª carta); ganar corta el día
    jackpotTirosPorDia: 3,       // tiros; si sale premio, se corta el juego del día

    // Probabilidad de llevarse premio considerando TODOS los tiros del día juntos
    // (la chance de cada tiro se calcula sola a partir de este número).
    jackpotProbTotal: 0.25
  };

  /* ── SABORES ──────────────────────────────────── */
  const SABORES = [
    { id: 'serrana',    nombre: 'Serrana',     color: '#7fc678', fondo: '#f1f8f0', img: 'imgs/serrana-product.jpeg' },
    { id: 'limon',      nombre: 'Limón',       color: '#f8d82d', fondo: '#fffde5', img: 'imgs/limon-product.jpeg' },
    { id: 'agua-gas',   nombre: 'Agua con Gas', color: '#6dcbd7', fondo: '#eaf6fa', img: 'imgs/agua-con-gas-product.jpeg' },
    { id: 'naranja',    nombre: 'Naranja',     color: '#f8951d', fondo: '#fee8d9', img: 'imgs/naranja-product.jpeg' },
    { id: 'agua',       nombre: 'Agua',        color: '#47adcf', fondo: '#ebf7fa', img: 'imgs/agua-product.jpeg' },
    { id: 'pomelo',     nombre: 'Pomelo',      color: '#f37971', fondo: '#fbebe9', img: 'imgs/pomelo-product.jpeg' },
    { id: 'tonica',     nombre: 'Agua Tónica', color: '#f7a39c', fondo: '#fff6f4', img: 'imgs/agua-tonica-product.jpeg' }
  ];

  const porId = id => SABORES.find(s => s.id === id);

  /* ── ALEATORIEDAD ─────────────────────────────── */
  // crypto.getRandomValues cuando existe (mejor que Math.random)
  function azar() {
    if (window.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }
  const entero = n => Math.floor(azar() * n);

  function mezclar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = entero(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Elige un elemento según pesos: [{...item, peso}]
  function elegirPonderado(items) {
    const total = items.reduce((s, it) => s + it.peso, 0);
    let r = azar() * total;
    for (const it of items) {
      r -= it.peso;
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }

  /* ── LÍMITE DIARIO (localStorage, tolerante a fallas) ── */
  function hoy() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  function leerDia(clave) {
    try {
      const raw = JSON.parse(localStorage.getItem(clave) || 'null');
      if (raw && raw.dia === hoy()) return raw;
    } catch (_) { /* sin storage: se juega sin límite */ }
    return { dia: hoy(), usados: 0, premio: null };
  }
  function guardarDia(clave, data) {
    try { localStorage.setItem(clave, JSON.stringify(data)); } catch (_) {}
  }

  /* ── CÓDIGO DE PREMIO ─────────────────────────── */
  // Sin caracteres ambiguos (0/O, 1/I)
  function generarCodigo() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 5; i++) c += abc[entero(abc.length)];
    const d = new Date();
    const fecha = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
    return `SV-${fecha}-${c}`;
  }

  /* ── CANJE DEL PREMIO ─────────────────────────────
     El jugador NO reclama por su cuenta: va con el personal y aprieta
     "Reclamar" delante de ellos. Al confirmar, el premio queda marcado como
     canjeado (con fecha/hora y un reloj en vivo, para que no sirva una captura)
     y no se puede volver a canjear en ese dispositivo.                      */
  let relojSello = null;

  function dosDigitos(n) { return String(n).padStart(2, '0'); }
  function horaCorta(d) { return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`; }
  function horaLarga(d) { return `${horaCorta(d)}:${dosDigitos(d.getSeconds())}`; }

  // Dibuja en `cont` el estado del canje: instrucciones + botón, confirmación o sello.
  // `premio` es el objeto guardado ({sabor, codigo, canjeado?}); `clave` su clave de storage.
  function pintarCanje(cont, clave, premio) {
    clearInterval(relojSello);

    if (premio.canjeado) {
      const f = new Date(premio.canjeado);
      cont.innerHTML = `
        <div class="sello" role="status">
          <strong>✔ PREMIO CANJEADO</strong>
          <span>${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)} · ${horaCorta(f)} hs</span>
          <small>Hora actual: <time data-reloj>${horaLarga(new Date())}</time></small>
        </div>`;
      const reloj = cont.querySelector('[data-reloj]');
      relojSello = setInterval(() => { reloj.textContent = horaLarga(new Date()); }, 1000);
      return;
    }

    cont.innerHTML = `
      <div class="canje">
        <p class="canje__instr"><strong>¿Cómo canjeo mi soda?</strong><br>
          Acercate al <strong>personal de Soda Vanguardia</strong> y apretá
          <strong>“Reclamar”</strong> <u>al lado de ellos</u>.</p>
        <p class="canje__aviso">Se canjea una sola vez: no lo aprietes antes de estar con el personal.</p>
        <button type="button" class="btn btn--canje btn--full" data-reclamar>Reclamar</button>
      </div>`;

    cont.querySelector('[data-reclamar]').addEventListener('click', () => {
      // Paso de confirmación para evitar canjes por un toque accidental
      cont.innerHTML = `
        <div class="canje">
          <p class="canje__instr"><strong>¿Estás con el personal?</strong><br>
            Al confirmar, tu premio queda canjeado y <u>no se puede deshacer</u>.</p>
          <button type="button" class="btn btn--canje btn--full" data-confirmar>Sí, canjear ahora</button>
          <button type="button" class="btn btn--ghost btn--full" data-volver>Volver</button>
        </div>`;
      cont.querySelector('[data-volver]').addEventListener('click', () => pintarCanje(cont, clave, premio));
      cont.querySelector('[data-confirmar]').addEventListener('click', () => {
        premio.canjeado = Date.now();
        const dia = leerDia(clave);
        dia.premio = premio;
        guardarDia(clave, dia);
        pintarCanje(cont, clave, premio);
      });
    });
  }

  /* ── MODAL DE PREMIO ──────────────────────────── */
  // clave: clave de storage del juego (para guardar el canje)
  function mostrarPremio({ sabor, codigo, clave, onCerrar }) {
    const dlg = document.getElementById('premio');
    if (!dlg) return;

    dlg.querySelector('[data-premio-img]').src = sabor.img;
    dlg.querySelector('[data-premio-img]').alt = `Botella de soda ${sabor.nombre}`;
    dlg.querySelector('[data-premio-fondo]').style.background = sabor.fondo;
    dlg.querySelector('[data-premio-sabor]').textContent = sabor.nombre;
    dlg.querySelector('[data-premio-codigo]').textContent = codigo;
    dlg.style.setProperty('--premio-color', sabor.color);

    const premio = leerDia(clave).premio || { sabor: sabor.id, codigo };
    pintarCanje(dlg.querySelector('[data-premio-acciones]'), clave, premio);

    // onCerrar se dispara una sola vez, ya sea con el botón, con Esc o al cerrar el diálogo
    let cerrado = false;
    const fin = () => { if (cerrado) return; cerrado = true; if (onCerrar) onCerrar(); };
    const cerrar = dlg.querySelector('[data-premio-cerrar]');
    cerrar.onclick = () => { if (dlg.open) dlg.close(); fin(); };
    dlg.onclose = fin;

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');

    lanzarBurbujas();
    if (navigator.vibrate) { try { navigator.vibrate([80, 60, 80]); } catch (_) {} }
  }

  // Pantalla "ya jugaste hoy" con el premio guardado (si lo hubo)
  function mostrarYaJugo(contenedor, clave) {
    const guardado = leerDia(clave);
    const sabor = guardado.premio ? porId(guardado.premio.sabor) : null;
    contenedor.hidden = false;
    if (sabor) {
      const canjeado = !!guardado.premio.canjeado;
      contenedor.innerHTML = `
        <h2>${canjeado ? '¡Disfrutá tu soda!' : '¡Ya ganaste hoy!'}</h2>
        <p>Tu premio: <strong>Soda ${sabor.nombre}</strong></p>
        <p class="codigo-chip">${guardado.premio.codigo}</p>
        <div data-acciones></div>`;
      pintarCanje(contenedor.querySelector('[data-acciones]'), clave, guardado.premio);
    } else {
      contenedor.innerHTML = `
        <h2>¡Gracias por jugar!</h2>
        <p>Ya usaste tus intentos de hoy. Volvé mañana a probar suerte.</p>
        <a class="btn btn--primary" href="index.html">Conocé los sabores</a>`;
    }
  }

  /* ── BURBUJAS (celebración) ───────────────────── */
  function lanzarBurbujas() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const capa = document.createElement('div');
    capa.className = 'burbujas-fiesta';
    capa.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 36; i++) {
      const b = document.createElement('span');
      const tam = 8 + entero(26);
      b.style.cssText =
        `left:${entero(100)}%;width:${tam}px;height:${tam}px;` +
        `animation-duration:${2.2 + azar() * 2.2}s;animation-delay:${azar() * 0.8}s;` +
        `background:${SABORES[entero(SABORES.length)].color};`;
      capa.appendChild(b);
    }
    document.body.appendChild(capa);
    setTimeout(() => capa.remove(), 5500);
  }

  return {
    CONFIG, SABORES, porId,
    azar, entero, mezclar, elegirPonderado,
    leerDia, guardarDia, generarCodigo,
    mostrarPremio, mostrarYaJugo
  };
})();
