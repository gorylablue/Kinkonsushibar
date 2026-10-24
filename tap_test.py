# Prueba con toques REALES (por coordenadas), no con .click() de JavaScript.
# Para cada botón revisa qué elemento queda encima en ese punto y luego lo toca.
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8811/index.html'
SIZES=[('iphone',390,844,True),('ipad',820,1180,True),('laptop',1440,900,False),('grande',1920,1080,False)]
async def tapea(pg, sel, touch):
    el = pg.locator(sel).filter(visible=True).first
    try: await el.scroll_into_view_if_needed(timeout=3000)
    except Exception: return 'no aparece'
    await pg.wait_for_timeout(350)
    box = await el.bounding_box()
    x, y = box['x'] + box['width']/2, box['y'] + box['height']/2
    top = await pg.evaluate(f'(() => {{ const e = document.elementFromPoint({x},{y}); const t = document.querySelector({sel!r}); return e && ([...document.querySelectorAll({sel!r})].some(b => b === e || b.contains(e))) ? "ok" : (e ? e.className || e.tagName : "nada"); }})()')
    if touch: await pg.touchscreen.tap(x, y)
    else: await pg.mouse.click(x, y)
    return top
async def main():
  fallos = 0
  async with async_playwright() as p:
    b = await p.chromium.launch()
    for name,w,h,touch in SIZES:
      ctx = await b.new_context(viewport={'width':w,'height':h}, has_touch=touch, is_mobile=touch)
      pg = await ctx.new_page(); errs = []
      pg.on('pageerror', lambda e: errs.append(str(e)))
      popups = []; ctx.on('page', lambda np: popups.append(np.url))
      await pg.goto(URL); await pg.wait_for_timeout(1500)
      res = {}
      # 1) idioma EN y regreso a ES
      res['EN'] = await tapea(pg, '#lang-en', touch); await pg.wait_for_timeout(300)
      res['EN cambia'] = 'ok' if (await pg.evaluate('document.documentElement.lang')) == 'en' else 'NO'
      res['ES'] = await tapea(pg, '#lang-es', touch); await pg.wait_for_timeout(300)
      res['ES cambia'] = 'ok' if (await pg.evaluate('document.documentElement.lang')) == 'es' else 'NO'
      # 2) Ver el menú (portada) abre y cierra
      res['Ver menú'] = await tapea(pg, '.hero-pie [data-menu]', touch); await pg.wait_for_timeout(700)
      res['menú abre'] = 'ok' if await pg.evaluate('!document.getElementById("menu").hidden') else 'NO'
      res['pestaña'] = await tapea(pg, '#menuTabs [data-ir="cocteles"]', touch); await pg.wait_for_timeout(700)
      res['cerrar'] = await tapea(pg, '.menu-x', touch); await pg.wait_for_timeout(700)
      res['menú cierra'] = 'ok' if await pg.evaluate('document.getElementById("menu").hidden') else 'NO'
      # 3) DoorDash de la portada abre pestaña nueva
      res['DoorDash'] = await tapea(pg, '.hero-pie .link-dd', touch); await pg.wait_for_timeout(900)
      res['DoorDash abre'] = 'ok' if popups else 'NO'
      # 4) Ver el menú en la carta y plato de la banda
      res['Ver menú carta'] = await tapea(pg, '#carta button.btn[data-menu]', touch); await pg.wait_for_timeout(700)
      res['carta abre'] = 'ok' if await pg.evaluate('!document.getElementById("menu").hidden') else 'NO'
      await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
      # 5) nav y barra inferior
      if w > 640: res['Ordenar nav'] = await tapea(pg, '.nav .btn-sol', touch)
      else:
          await pg.evaluate('scrollTo(0, innerHeight)'); await pg.wait_for_timeout(600)
          res['Ordenar barra'] = await tapea(pg, '#barra .btn-sol', touch)
      malos = {k:v for k,v in res.items() if v != 'ok'}
      fallos += len(malos) + len(errs)
      print(f"{name:7} {'TODO BIEN' if not malos and not errs else 'FALLAN: ' + str(malos)} {errs or ''}")
      await ctx.close()
    await b.close()
  print('RESULTADO:', 'PASA' if fallos == 0 else f'{fallos} FALLOS')
asyncio.run(main())
