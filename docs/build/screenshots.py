#!/usr/bin/env python3
"""Captura as telas do protótipo para o documento (requer playwright + chrome)."""
import asyncio, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'img')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1360, 'height': 1000})
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        async def shot(n, h=None):
            await pg.evaluate("document.getElementById('toasts').innerHTML=''")
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'{OUT}/{n}.jpg', type='jpeg', quality=82)
        await pg.goto('file://' + ROOT + '/index.html'); await pg.wait_for_timeout(300)
        await shot('t01-onboarding')
        await pg.click('button[type=submit]'); await pg.wait_for_timeout(300)
        await pg.click('.mk[data-id="E-1042"]', force=True); await pg.set_viewport_size({'width': 1360, 'height': 1180}); await shot('t02-painel'); await pg.set_viewport_size({'width': 1360, 'height': 1000})
        await pg.click('a[data-nav=alertas]'); await shot('t03-alertas')
        await pg.click('.arow >> nth=0'); await pg.set_viewport_size({'width': 1360, 'height': 1250}); await shot('t04-detalhe'); await pg.set_viewport_size({'width': 1360, 'height': 1000})
        await pg.click('button:has-text("Origem e confiança") >> nth=0'); await pg.set_viewport_size({'width': 1360, 'height': 1400}); await shot('t05-confianca'); await pg.set_viewport_size({'width': 1360, 'height': 1000})
        await pg.click('a[data-nav=notificacoes]'); await shot('t06-notificacoes')
        await pg.click('a[data-nav=registrar]'); await pg.click('.type-card >> nth=0'); await pg.click('button[data-act=regNext]')
        await pg.select_option('#rBairro', 'Jardim das Águas'); await pg.fill('#rAddr', 'Rua do Córrego, 380'); await pg.check('input[name=sev][value=Grave]'); await pg.fill('#rDesc', 'Água entrando nas casas')
        await pg.set_viewport_size({'width': 1360, 'height': 1250}); await shot('t07-registrar'); await pg.set_viewport_size({'width': 1360, 'height': 1000})
        await pg.click('button[data-act=regNext]'); await pg.click('button[data-act=regSend]'); await shot('t07b-registro-ok')
        await pg.select_option('#roleSel', 'agente'); await pg.wait_for_timeout(300)
        await pg.click('a[data-nav=validacao]'); await pg.set_viewport_size({'width': 1360, 'height': 1250}); await shot('t08-validacao'); await pg.set_viewport_size({'width': 1360, 'height': 1000})
        await pg.click('a[data-nav=analises]'); await shot('t09-analises')
        await pg.click('a[data-nav=fontes]'); await shot('t10-fontes')
        await pg.click('a[data-nav=privacidade]'); await pg.set_viewport_size({'width': 1360, 'height': 1250}); await shot('t11-privacidade'); await pg.set_viewport_size({'width': 1360, 'height': 1000})
        await pg.click('a[data-nav=painel]'); await pg.click('button[data-act=sim][data-id=publica]'); await pg.wait_for_timeout(2800); await shot('t12-pipeline')
        m = await b.new_context(viewport={'width': 390, 'height': 800}, device_scale_factor=2); mp = await m.new_page()
        await mp.goto('file://' + ROOT + '/index.html'); await mp.click('button[type=submit]'); await mp.wait_for_timeout(300)
        async def mshot(n):
            await mp.evaluate("document.getElementById('toasts').innerHTML=''"); await mp.wait_for_timeout(250)
            await mp.screenshot(path=f'{OUT}/{n}.jpg', type='jpeg', quality=80)
        await mshot('m1-painel')
        await mp.evaluate("location.hash='registrar'"); await mp.click('.type-card >> nth=0'); await mshot('m2-registrar')
        await mp.evaluate("location.hash='confianca'"); await mp.wait_for_timeout(300); await mshot('m3-confianca')
        print('errors:', errs)
        await b.close()
asyncio.run(main())
