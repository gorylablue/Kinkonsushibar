/*!
 * En El Mapa: aviso de propuesta
 * Un solo archivo. Se pega antes de </body>:
 *
 *   <script src="enelmapa-aviso.js" defer
 *           data-modo="espera"            libre | espera | desliza
 *           data-espera="2"               segundos antes de que la X funcione
 *           data-hermano-nombre="Candy Bar"
 *           data-hermano-url="https://candybar-ponce.netlify.app"
 *           data-sitio="kinkon"                   nombre corto para las estadísticas
 *           data-despues-de="#gate"               (opcional) espera a que la página quite su propia ventana
 *           data-cuando="scroll"                  scroll (por defecto: sale al empezar a bajar) | carga
 *           data-estadisticas="netlify"></script> (opcional) guarda cada visita en Netlify Forms
 *
 * Estadísticas: la página necesita además el formulario oculto "enelmapa-estadisticas"
 * (ver enelmapa-aviso.md). Abrir cualquier página con ?yo=1 excluye ese navegador de los conteos; ?yo=0 lo vuelve a incluir.
 *
 * Vive dentro de un Shadow DOM: el CSS de la página no lo toca y el suyo no toca la página.
 * Mientras está abierto, ningún gesto (rueda, dedo, teclas) llega a la página de atrás.
 * Solo se cierra con la X (o Esc cuando la X ya está activa). Tocar el fondo no lo cierra.
 */
(() => {
  'use strict';
  const me = document.currentScript;
  const cfg = Object.assign({
    modo: 'espera', espera: 2, hermanoNombre: '', hermanoUrl: '', hermanoTexto: '', sitio: '', estadisticas: '', despuesDe: '', cuando: 'scroll', umbral: 60
  }, window.EnElMapaAviso || {});
  if (me && me.dataset) {
    const d = me.dataset;
    if (d.modo) cfg.modo = d.modo;
    if (d.espera) cfg.espera = parseFloat(d.espera);
    if (d.hermanoNombre) cfg.hermanoNombre = d.hermanoNombre;
    if (d.hermanoUrl) cfg.hermanoUrl = d.hermanoUrl;
    if (d.hermanoTexto) cfg.hermanoTexto = d.hermanoTexto;
    if (d.sitio) cfg.sitio = d.sitio;
    if (d.estadisticas) cfg.estadisticas = d.estadisticas;
    if (d.despuesDe) cfg.despuesDe = d.despuesDe;
    if (d.cuando) cfg.cuando = d.cuando;
    if (d.umbral) cfg.umbral = parseFloat(d.umbral);
  }
  const qs = new URLSearchParams(location.search);
  if (qs.get('modo')) cfg.modo = qs.get('modo');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Las fuentes van en el documento (las @font-face no funcionan dentro del shadow).
  if (!document.querySelector('link[data-eem-fonts]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.dataset.eemFonts = '';
    l.href = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..100,500..900&family=IBM+Plex+Mono:wght@500;600&display=swap';
    document.head.appendChild(l);
  }

  /* ---------- Estadísticas (Netlify Forms) ----------
   * Un envío por visita, al salir de la página (o al cambiar de app), con lo que pasó.
   * Si la persona vuelve y hace algo más, se reenvía el resumen con el mismo número de visita:
   * al contar se toma el último de cada visita. Sin data-estadisticas no se envía nada. */
  const sitio = (cfg.sitio || location.hostname.split('.')[0] || 'pagina').toLowerCase();
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const STATS = cfg.estadisticas === 'netlify' && qs.get('aviso') !== 'no';
  let noContar = false, visitante = 'sin-guardar', nueva = '1';
  try {
    if (qs.get('yo') === '1') localStorage.setItem('eem-no-contar', '1');
    if (qs.get('yo') === '0') localStorage.removeItem('eem-no-contar');
    noContar = localStorage.getItem('eem-no-contar') === '1';
    visitante = localStorage.getItem('eem-visitante') || '';
    if (visitante) nueva = '0'; else { visitante = rid(); localStorage.setItem('eem-visitante', visitante); }
  } catch (e) {}
  const ua = navigator.userAgent;
  const aparato = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
    : /iPhone|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Android tableta') : 'Computadora';
  const datos = { visita: rid(), visitante, nuevo: nueva, sitio, aparato, vio: 0, cerro: 0, llamar: 0, instagram: 0, otra_propuesta: 0 };
  const t0 = Date.now(); let firma = '';
  function enviarStats() {
    if (!STATS || noContar) return;
    const f = JSON.stringify(datos);
    if (f === firma) return;                       // nada nuevo desde el último envío
    firma = f;
    const body = new URLSearchParams(Object.assign({ 'form-name': 'enelmapa-estadisticas' }, datos, { segundos: Math.round((Date.now() - t0) / 1000) }));
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon('/', body)))
        fetch('/', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).catch(() => {});
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarStats(); });
  addEventListener('pagehide', enviarStats);
  const CAMPO = { 'aviso-visto': 'vio', 'aviso-cerrado': 'cerro', 'llamar': 'llamar', 'instagram': 'instagram', 'otra-propuesta': 'otra_propuesta' };
  function track(nombre) {
    try { document.dispatchEvent(new CustomEvent('enelmapa:evento', { detail: { sitio, nombre } })); } catch (e) {}
    const c = CAMPO[nombre]; if (!c) return;
    datos[c] = (c === 'vio' || c === 'cerro') ? 1 : datos[c] + 1;
  }
  window.EnElMapaAviso = Object.assign(window.EnElMapaAviso || {}, { _stats: () => Object.assign({}, datos, { contar: STATS && !noContar }) });

  const ICON = {
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s7-6.6 7-12.2A7 7 0 0 0 5 9.8C5 15.4 12 22 12 22z"/><circle cx="12" cy="9.6" r="2.6" fill="#F1F2EC"/></svg>'
  };

  const CSS = `
:host{all:initial}
*{box-sizing:border-box;margin:0;padding:0}
.velo{position:fixed;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;padding:24px;
  background:rgba(17,19,16,.42);
  touch-action:none;-webkit-tap-highlight-color:transparent;
  font-family:Archivo,"Avenir Next Condensed","Arial Narrow",system-ui,sans-serif;color:#111310;
  opacity:0;transition:opacity .5s cubic-bezier(.22,.8,.2,1)}
.abierto .velo{opacity:1}
.cerrando .velo{opacity:0;transition-duration:.35s}

.hoja{position:relative;width:min(100%,600px);max-height:calc(100svh - 48px);display:flex;flex-direction:column;
  background:#F1F2EC;border-radius:30px;overflow:hidden;
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 50px 100px -30px rgba(0,0,0,.6);
  transform:translateY(40px) scale(.96);opacity:0;
  transition:transform .8s cubic-bezier(.16,1.12,.3,1),opacity .45s ease}
.abierto .hoja{transform:none;opacity:1;transition-delay:.08s}
.cerrando .hoja{transform:translateY(24px) scale(.97);opacity:0;transition:transform .35s ease,opacity .3s ease}
.hoja:focus{outline:none}
.hoja.toque{animation:toque .5s cubic-bezier(.3,.7,.3,1)}
@keyframes toque{30%{transform:scale(.985)}100%{transform:none}}

/* --- banda superior --- */
.banda{position:relative;flex:none;background:#A3B18A;min-height:80px;padding:0 88px 0 28px;display:flex;align-items:center;gap:14px;
  font-family:"IBM Plex Mono",ui-monospace,monospace;font-weight:600;font-size:12.5px;letter-spacing:.14em;white-space:nowrap}
.banda .ln{flex:1;height:1.5px;background:#111310;opacity:.85;transform-origin:left;transform:scaleX(0);transition:transform .9s .45s cubic-bezier(.22,.8,.2,1)}
.abierto .banda .ln{transform:none}
.banda .pin{width:18px;height:18px;flex:none;color:#111310;transform:translateY(-14px);opacity:0}
.abierto .banda .pin{animation:cae .7s 1.15s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes cae{to{transform:none;opacity:1}}
.banda .pin svg{width:100%;height:100%;display:block}

/* --- X --- */
.x{position:absolute;right:20px;top:50%;width:48px;height:48px;margin-top:-24px;border:0;border-radius:50%;cursor:pointer;
  background:#111310;color:#F1F2EC;display:grid;place-items:center;z-index:2;
  box-shadow:0 10px 24px -10px rgba(0,0,0,.6);transition:transform .35s cubic-bezier(.22,.8,.2,1),background .3s}
.x svg.cruz{width:20px;height:20px;display:block;transition:opacity .3s,transform .4s cubic-bezier(.3,1.5,.5,1)}
.x .anillo{position:absolute;inset:-5px;width:58px;height:58px;transform:rotate(-90deg);pointer-events:none}
.x .anillo circle{fill:none;stroke-width:3.5;stroke-linecap:round}
.x .anillo .fondo{stroke:rgba(17,19,16,.16)}
.x .anillo .lleno{stroke:#111310;stroke-dasharray:207.3;stroke-dashoffset:207.3}
.x[aria-disabled="true"]{cursor:default;background:rgba(17,19,16,.55)}
.x[aria-disabled="true"] svg.cruz{opacity:.4;transform:scale(.82)}
.x[aria-disabled="false"]:hover{transform:rotate(90deg) scale(1.06)}
.x[aria-disabled="false"]:active{transform:scale(.92)}
.x.lista{animation:lista .6s cubic-bezier(.3,1.5,.5,1)}
@keyframes lista{40%{transform:scale(1.14)}}
.x.nudge{animation:nudge .55s cubic-bezier(.3,1.5,.5,1)}
@keyframes nudge{20%{transform:translateX(-5px)}45%{transform:translateX(5px)}70%{transform:translateX(-3px)}}
.x:focus-visible,.cta:focus-visible,.hermano:focus-visible,.riel:focus-visible{outline:3px solid #111310;outline-offset:4px}
.x:focus{outline:none}.x:focus-visible{outline:3px solid #F1F2EC;box-shadow:0 0 0 6px #111310}

/* --- cuerpo --- */
.cuerpo{overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:34px 30px 30px}
h2{font-family:Archivo,"Avenir Next Condensed","Arial Narrow",sans-serif;font-stretch:62%;font-variation-settings:"wdth" 62;font-weight:900;
  text-transform:uppercase;font-size:clamp(46px,9.4vw,74px);line-height:.88;letter-spacing:-.005em;text-wrap:balance}
h2 .l{display:block;overflow:hidden;clip-path:inset(-0.1em -100vw -0.12em -100vw)}
h2 .l b{display:block;font-weight:inherit;transform:translateY(105%)}
.abierto h2 .l b{transform:none;transition:transform 1s cubic-bezier(.16,1,.3,1)}
.abierto h2 .l:nth-child(2) b{transition-delay:.08s}.abierto h2 .l:nth-child(3) b{transition-delay:.16s}
h2 mark{background:none;color:inherit;position:relative;z-index:0;-webkit-box-decoration-break:clone;box-decoration-break:clone}
h2 mark::before{content:"";position:absolute;left:-.06em;right:-.06em;bottom:.04em;height:.42em;background:#A3B18A;z-index:-1;
  transform:scaleX(0);transform-origin:left;transition:transform .7s 1s cubic-bezier(.22,.8,.2,1)}
.abierto h2 mark::before{transform:none}
p.txt{margin-top:18px;font-family:Archivo,system-ui,sans-serif;font-stretch:100%;font-weight:500;font-size:clamp(18px,2.4vw,20px);line-height:1.45;color:#2A2D27;max-width:30em;
  opacity:0;transform:translateY(10px);transition:opacity .7s .35s,transform .7s .35s cubic-bezier(.22,.8,.2,1)}
p.txt strong{font-weight:800;color:#111310}
.abierto p.txt{opacity:1;transform:none}

.ctas{margin-top:24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;opacity:0;transform:translateY(10px);transition:opacity .7s .5s,transform .7s .5s cubic-bezier(.22,.8,.2,1)}
.abierto .ctas{opacity:1;transform:none}
.cta{display:flex;align-items:center;gap:12px;min-height:72px;padding:12px 18px;border-radius:20px;text-decoration:none;color:#111310;
  background:#fff;box-shadow:inset 0 0 0 1.5px rgba(17,19,16,.14);transition:transform .3s cubic-bezier(.22,.8,.2,1),background .3s,color .3s}
.cta:hover{transform:translateY(-2px)}
.cta:active{transform:scale(.97)}
.cta i{width:42px;height:42px;flex:none;border-radius:50%;display:grid;place-items:center;background:#111310;color:#F1F2EC}
.cta i svg{width:19px;height:19px;display:block}
.cta span{display:flex;flex-direction:column;min-width:0}
.cta small{font-family:"IBM Plex Mono",monospace;font-size:10.5px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;opacity:.65}
.cta b{font-size:19px;font-weight:800;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cta.tel{background:#111310;color:#F1F2EC;box-shadow:none}
.cta.tel i{background:#A3B18A;color:#111310}
.cta.tel small{opacity:.7}

.hermano{margin-top:12px;display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:20px;text-decoration:none;color:#111310;
  background:#A3B18A;opacity:0;transform:translateY(10px);transition:opacity .7s .62s,transform .7s .62s cubic-bezier(.22,.8,.2,1)}
.abierto .hermano{opacity:1;transform:none}
.hermano span{flex:1;display:flex;flex-direction:column;gap:2px}
.hermano small{font-family:"IBM Plex Mono",monospace;font-size:10.5px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;opacity:.75}
.hermano b{font-size:18px;font-weight:800;line-height:1.2}
.hermano em{font-style:normal;font-weight:500;font-size:15px;line-height:1.35;opacity:.85}
.hermano > svg{width:26px;height:26px;flex:none;transition:transform .35s cubic-bezier(.22,.8,.2,1)}
.hermano:hover > svg{transform:translateX(4px)}

/* --- deslizar --- */
.riel{position:relative;margin-top:16px;height:64px;border-radius:999px;background:#111310;color:#F1F2EC;overflow:hidden;
  user-select:none;-webkit-user-select:none;touch-action:none;
  opacity:0;transform:translateY(10px);transition:opacity .7s .7s,transform .7s .7s cubic-bezier(.22,.8,.2,1)}
.abierto .riel{opacity:1;transform:none}
.riel .fill{position:absolute;inset:0 auto 0 0;width:64px;border-radius:999px;background:#A3B18A}
.riel .rotulo{position:absolute;inset:0;display:grid;place-items:center;padding-left:56px;font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:13px;letter-spacing:.18em;text-transform:uppercase;
  background:linear-gradient(90deg,rgba(241,242,236,.45) 0%,#F1F2EC 45%,rgba(241,242,236,.45) 90%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:brillo 2.6s linear infinite}
@keyframes brillo{from{background-position:150% 0}to{background-position:-50% 0}}
.riel .bola{position:absolute;left:4px;top:4px;width:56px;height:56px;border-radius:50%;background:#F1F2EC;color:#111310;display:grid;place-items:center;cursor:grab;box-shadow:0 6px 14px -6px rgba(0,0,0,.6)}
.riel .bola svg{width:24px;height:24px;display:block}
.riel.arrastra .bola{cursor:grabbing}

.pie{margin-top:18px;font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;letter-spacing:.24em;color:#111310;opacity:.55;text-align:right}

/* --- teléfono: hoja que sube desde abajo --- */
@media (max-width:640px){
  .velo{align-items:flex-end;padding:0}
  .hoja{width:100%;max-height:94svh;border-radius:28px 28px 0 0;transform:translateY(100%);opacity:1;
    transition:transform .75s cubic-bezier(.16,1,.3,1)}
  .abierto .hoja{transform:none}
  .cerrando .hoja{transform:translateY(100%);opacity:1;transition:transform .4s cubic-bezier(.5,0,.75,0)}
  .banda{min-height:72px;padding:0 78px 0 22px;font-size:11.5px;letter-spacing:.12em}
  .x{right:16px;width:46px;height:46px;margin-top:-23px}
  .x .anillo{inset:-5px;width:56px;height:56px}
  .cuerpo{padding:22px 18px calc(18px + env(safe-area-inset-bottom))}
  h2{font-size:clamp(40px,11.6vw,54px)}
  p.txt{margin-top:12px;font-size:16.5px;line-height:1.4}
  .ctas{margin-top:16px;gap:8px}
  .cta{min-height:64px;padding:10px 14px;border-radius:18px}
  .cta i{display:none}
  .cta small{font-size:10px;letter-spacing:.16em}
  .cta b{font-size:clamp(15px,4.4vw,18px);overflow:visible}
  .hermano{margin-top:8px;padding:13px 16px;border-radius:18px}
  .hermano b{font-size:16.5px}.hermano em{display:none}
  .riel{margin-top:10px;height:58px}.riel .bola{width:50px;height:50px}.riel .fill{width:58px}
}
@media (max-width:640px) and (max-height:600px){ h2{font-size:42px} .cuerpo{padding-top:22px} }
@media (min-width:641px) and (max-height:640px){ h2{font-size:52px} .cuerpo{padding:26px 28px 24px} .ctas{margin-top:18px} }
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{transition-duration:.01ms!important;transition-delay:0s!important;animation-duration:.01ms!important;animation-delay:0s!important}
}`;

  function crear(cfg) {
  if (!['libre', 'espera', 'desliza'].includes(cfg.modo)) cfg.modo = 'espera';
  const ESPERA = cfg.modo === 'libre' ? 0 : Math.max(0, cfg.espera) * 1000;
  const viejo = document.getElementById('enelmapa-aviso'); if (viejo) viejo.remove();
  const hermano = cfg.hermanoUrl && cfg.hermanoNombre ? `
      <a class="hermano" href="${cfg.hermanoUrl}">
        <span><small>Somos vecinos</small><b>Mira la propuesta de ${cfg.hermanoNombre}</b>${cfg.hermanoTexto ? `<em>${cfg.hermanoTexto}</em>` : ''}</span>
        ${ICON.flecha}
      </a>` : '';

  const riel = cfg.modo === 'desliza' ? `
      <div class="riel" role="slider" tabindex="0" aria-label="Desliza para ver la página" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="fill"></span><span class="rotulo">Desliza para ver la página</span>
        <span class="bola" aria-hidden="true">${ICON.flecha}</span>
      </div>` : '';

  const HTML = `
<div class="velo" part="velo">
  <div class="hoja" role="dialog" aria-modal="true" aria-labelledby="eem-t" aria-describedby="eem-d" tabindex="-1">
    <div class="banda" aria-hidden="false">
      <span aria-label="En El Mapa">E N &nbsp;E L &nbsp;M A P A</span><span class="ln" aria-hidden="true"></span><span class="pin" aria-hidden="true">${ICON.pin}</span>
      <button class="x" type="button" aria-label="Cerrar anuncio" aria-disabled="${ESPERA ? 'true' : 'false'}">
        ${ESPERA ? '<svg class="anillo" viewBox="0 0 72 72" aria-hidden="true"><circle class="fondo" cx="36" cy="36" r="33"/><circle class="lleno" cx="36" cy="36" r="33"/></svg>' : ''}
        <svg class="cruz" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="cuerpo">
      <h2 id="eem-t"><span class="l"><b>¿Te gusta</b></span><span class="l"><b>esta página para</b></span><span class="l"><b><mark>tu negocio?</mark></b></span></h2>
      <p class="txt" id="eem-d">Si estás buscando una página web como esta para llevar la presencia digital de tu negocio al próximo nivel, <strong>comunícate con En El Mapa.</strong></p>
      <div class="ctas">
        <a class="cta tel" href="tel:+17879204400"><i>${ICON.tel}</i><span><small>Llámanos</small><b>787-920-4400</b></span></a>
        <a class="cta ig" href="https://instagram.com/enelmapapr" target="_blank" rel="noopener"><i>${ICON.ig}</i><span><small>Instagram</small><b>@enelmapapr</b></span></a>
      </div>${hermano}${riel}
    </div>
  </div>
</div>`;

  function montar() {
    const host = document.createElement('div');
    host.id = 'enelmapa-aviso';
    host.setAttribute('style', 'position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;pointer-events:auto!important');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style><div class="raiz">${HTML}</div>`;
    document.body.appendChild(host);

    const $ = (s) => root.querySelector(s);
    const velo = $('.velo'), hoja = $('.hoja'), x = $('.x'), lleno = $('.lleno');
    const scroller = $('.cuerpo');
    const antes = document.activeElement;
    let activa = !ESPERA, cerrado = false;

    const rootWrap = root.querySelector('.raiz');
    track('aviso-visto');
    const tel = root.querySelector('.cta.tel'), ig = root.querySelector('.cta.ig'), herm = root.querySelector('.hermano');
    tel.addEventListener('click', () => track('llamar'));
    ig.addEventListener('click', () => track('instagram'));
    if (herm) herm.addEventListener('click', () => track('otra-propuesta'));   // el envío sale en pagehide
    setTimeout(() => hoja.focus({ preventScroll: true }), 60);

    // --- cuenta regresiva de la X ---
    if (ESPERA) {
      const t0 = performance.now();
      const tick = (now) => {
        if (cerrado) return;
        const k = Math.min(1, (now - t0) / ESPERA);
        lleno.style.strokeDashoffset = (207.3 * (1 - k)).toFixed(1);
        if (k < 1) requestAnimationFrame(tick); else activar();
      };
      requestAnimationFrame(tick);
    }
    function activar() {
      if (activa) return;
      activa = true;
      x.setAttribute('aria-disabled', 'false');
      x.classList.remove('lista'); void x.offsetWidth; x.classList.add('lista');
    }

    // --- cerrar ---
    function cerrar() {
      if (cerrado) return;
      cerrado = true;
      rootWrap.classList.remove('abierto'); rootWrap.classList.add('cerrando');
      quitarBloqueo();
      const fin = () => { host.remove(); if (antes && antes.focus && document.contains(antes)) try { antes.focus({ preventScroll: true }); } catch (e) {} };
      setTimeout(fin, reduce ? 0 : 450);
      document.dispatchEvent(new CustomEvent('enelmapa:aviso-cerrado'));
      track('aviso-cerrado');
    }
    x.addEventListener('click', (e) => {
      e.preventDefault();
      if (activa) cerrar(); else { x.classList.remove('nudge'); void x.offsetWidth; x.classList.add('nudge'); }
    });

    // --- tocar el fondo: no cierra; la hoja hace un pequeño rebote y la X se mueve para mostrar dónde cerrar ---
    velo.addEventListener('click', (e) => {
      if (e.target !== velo) return;
      hoja.classList.remove('toque'); void hoja.offsetWidth; hoja.classList.add('toque');
      x.classList.remove('nudge'); void x.offsetWidth; x.classList.add('nudge');
    });

    // --- deslizar ---
    const r = $('.riel');
    if (r) {
      const bola = r.querySelector('.bola'), fill = r.querySelector('.fill');
      let x0 = 0, p = 0, drag = false, id = null;
      const B = () => bola.offsetWidth + 8;
      const max = () => r.clientWidth - B();
      const poner = (v, anim) => {
        p = Math.max(0, Math.min(1, v));
        const px = p * max();
        bola.style.transition = fill.style.transition = anim ? 'transform .45s cubic-bezier(.3,1.4,.5,1), width .45s cubic-bezier(.3,1.4,.5,1)' : 'none';
        bola.style.transform = `translateX(${px}px)`; fill.style.width = (B() + px) + 'px';
        r.setAttribute('aria-valuenow', Math.round(p * 100));
      };
      r.addEventListener('pointerdown', (e) => {
        drag = true; id = e.pointerId; r.setPointerCapture(id); r.classList.add('arrastra');
        x0 = e.clientX - p * max();
      });
      r.addEventListener('pointermove', (e) => { if (drag && e.pointerId === id) poner((e.clientX - x0) / max(), false); });
      const soltar = (e) => {
        if (!drag || (e && e.pointerId !== id)) return;
        drag = false; r.classList.remove('arrastra');
        if (p > .86) { poner(1, true); setTimeout(cerrar, 160); } else poner(0, true);
      };
      r.addEventListener('pointerup', soltar); r.addEventListener('pointercancel', soltar);
      r.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'End') { e.preventDefault(); poner(e.key === 'End' ? 1 : p + .25, true); if (p >= 1) setTimeout(cerrar, 200); }
        if (e.key === 'ArrowLeft' || e.key === 'Home') { e.preventDefault(); poner(e.key === 'Home' ? 0 : p - .25, true); }
      });
    }

    // --- foco atrapado y teclado ---
    const focos = () => [...root.querySelectorAll('a[href],button,[tabindex="0"]')];
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); if (activa) cerrar(); else x.classList.add('nudge'); return; }
      if (e.key === 'Tab') {
        const f = focos(); if (!f.length) return;
        const i = f.indexOf(root.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });

    // --- bloquear la página de atrás ---
    // Los eventos que nacen dentro del aviso no suben a window/document,
    // así las intros de las páginas (Clavell, Campioni) no se disparan por debajo.
    const parar = (e) => e.stopPropagation();
    const puedeScroll = (dy) => scroller.scrollHeight > scroller.clientHeight + 1 &&
      !((dy < 0 && scroller.scrollTop <= 0) || (dy > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1));
    const enScroller = (e) => e.composedPath().includes(scroller);
    let ty = 0;
    const onWheel = (e) => { e.stopPropagation(); if (!(enScroller(e) && puedeScroll(e.deltaY))) e.preventDefault(); };
    const onTS = (e) => { e.stopPropagation(); ty = e.touches[0] ? e.touches[0].clientY : 0; };
    const onTM = (e) => {
      e.stopPropagation();
      const t = e.touches[0]; const dy = t ? ty - t.clientY : 0;
      if (!(enScroller(e) && puedeScroll(dy)) && e.cancelable) e.preventDefault();
    };
    const TECLAS = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'];
    const onKey = (e) => {
      e.stopPropagation();
      const t = e.composedPath()[0];
      const esBoton = t && (t.tagName === 'BUTTON' || t.tagName === 'A');
      if (TECLAS.includes(e.key) && !(esBoton && (e.key === ' ' || e.key === 'Spacebar')) && !(t && t.classList && t.classList.contains('riel'))) e.preventDefault();
    };
    // Teclas que llegan cuando el foco se escapó a la página (raro): se frenan en window en fase de captura.
    const onKeyWin = (e) => { if (!host.contains(e.target) && e.target !== host) { if (e.key === 'Tab') return; e.stopImmediatePropagation(); if (TECLAS.includes(e.key)) e.preventDefault(); hoja.focus({ preventScroll: true }); } };
    host.addEventListener('wheel', onWheel, { passive: false });
    host.addEventListener('touchstart', onTS, { passive: true });
    host.addEventListener('touchmove', onTM, { passive: false });
    ['touchend', 'touchcancel', 'pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'click', 'keyup', 'scroll'].forEach(t => host.addEventListener(t, parar));
    host.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onKeyWin, true);
    function quitarBloqueo() { window.removeEventListener('keydown', onKeyWin, true); }
    // Al cerrar, el host desaparece y con él sus listeners.

    requestAnimationFrame(() => requestAnimationFrame(() => rootWrap.classList.add('abierto')));
  }

  montar();
  }

  // API: EnElMapaAviso.mostrar({modo, espera, hermanoNombre, hermanoUrl}) vuelve a abrirlo (para demos).
  window.EnElMapaAviso = Object.assign(window.EnElMapaAviso || {}, {
    mostrar: (extra) => crear(Object.assign({}, cfg, extra || {}))
  });
  if (cfg.manual || qs.get('aviso') === 'no') return;   // ?aviso=no: sin aviso (capturas)
  const abrir = (ms) => setTimeout(() => crear(Object.assign({}, cfg)), reduce ? 0 : ms);
  // data-cuando="scroll": el aviso sale cuando la persona empieza a bajar (cuenta desde donde abrió la página).
  const cuandoBaje = (ms) => {
    if (cfg.cuando === 'carga') return abrir(ms);
    const y0 = scrollY, umbral = Math.max(20, cfg.umbral || 60);
    let hecho = false;
    const chk = () => {
      if (hecho || Math.abs(scrollY - y0) < umbral) return;
      hecho = true; removeEventListener('scroll', chk);
      abrir(120);
    };
    addEventListener('scroll', chk, { passive: true });
  };
  // data-despues-de="#gate": si la página tiene su propia ventana (p. ej. la de edad), el aviso espera a que se quite.
  const tapado = (el) => {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && cs.pointerEvents !== 'none';
  };
  const iniciar = () => {
    const sel = cfg.despuesDe, el = sel ? document.querySelector(sel) : null;
    if (!tapado(el)) return cuandoBaje(700);
    const listo = () => { if (tapado(el)) return; mo.disconnect(); clearInterval(t); cuandoBaje(650); };
    const mo = new MutationObserver(listo);
    mo.observe(el, { attributes: true }); mo.observe(document.body, { childList: true, subtree: false, attributes: true });
    const t = setInterval(listo, 400);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
