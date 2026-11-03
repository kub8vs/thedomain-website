"""Builds the static site: python3 src/export.py -> index.html (repo root)."""
import os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

tmp = os.path.join(tempfile.mkdtemp(), 'page.dc.html')
subprocess.run([sys.executable, os.path.join(HERE, 'build.py'), tmp], check=True, stdout=subprocess.DEVNULL)
src = open(tmp).read()

helmet = re.search(r'<helmet>(.*?)</helmet>', src, re.S).group(1)
body = re.search(r'<x-dc>(.*?)</x-dc>', src, re.S).group(1)
body = re.sub(r'<helmet>.*?</helmet>', '', body, flags=re.S)
js = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', src, re.S).group(1)
body = re.sub(r'@@PROJ(\d)@@', r'assets/img/proj\1.jpg', body)
helmet = re.sub(r'<title>.*?</title>', '', helmet, flags=re.S)
assert '@@' not in body and '/_blob/' not in body

meta = ('<title>The Domain · strony, wideo i automatyzacje</title>'
        '<meta name="description" content="The Domain: szybkie, kodowane od zera strony z motion designem, rolki i wideo promocyjne oraz automatyzacje dla firm.">'
        '<meta name="theme-color" content="#0B0B0B">')
IDS = {'Pytania': 'pytania', 'Brief': 'proces', 'Plan': 'plan', 'Projektujemy': 'strony', 'Wideo': 'wideo', 'Automatyzacje': 'automatyzacje', 'Efekty': 'efekty', 'Współpraca': 'wspolpraca', 'Kontakt': 'kontakt'}
for name, sid in IDS.items():
    body, n = re.subn(r'<section class="sc" data-sec="(\d+)" data-name="' + name + '"', r'<section class="sc" id="' + sid + r'" data-sec="\1" data-name="' + name + '"', body)
    assert n == 1, name
SLOTS = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30']
CHIPS = ['Strona', 'Sklep online', 'Rolki i wideo', 'Automatyzacje', 'Branding']
bk = open(os.path.join(HERE, 'booking.html')).read()
bk = bk.replace('@@SLOTS@@', ''.join(f'<button type="button" class="gc-t" data-time="{t}">{t}</button>' for t in SLOTS))
bk = bk.replace('@@CHIPS@@', ''.join(f'<label><input type="checkbox" name="potrzeby" value="{c}"><span>{c}</span></label>' for c in CHIPS))
site_js = open(os.path.join(HERE, 'site.js')).read()
html = f'''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
{meta}
{helmet}
</head>
<body>
<template id="tpl">{body}</template>
<div id="root"></div>
{bk}
<script src="assets/runtime.js"></script>
<script>{js}
window.__mount(document.getElementById('tpl'), document.getElementById('root'), Component);
</script>
<script>{site_js}</script>
</body>
</html>
'''
open(os.path.join(ROOT, 'index.html'), 'w').write(html)
print('index.html', len(html))
