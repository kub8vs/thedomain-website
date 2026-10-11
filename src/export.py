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
<script src="assets/runtime.js"></script>
<script>{js}
window.__mount(document.getElementById('tpl'), document.getElementById('root'), Component);
</script>
</body>
</html>
'''
open(os.path.join(ROOT, 'index.html'), 'w').write(html)
print('index.html', len(html))
