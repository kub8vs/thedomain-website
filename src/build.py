import random, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from figs import DEFS, FIGS, MARK, CURSOR, hoodie, hall

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTO = '/_blob/c85fc88a01ec95a2ba14935b05ae2955'


def f(x):
    s = f'{x:.4f}'.rstrip('0').rstrip('.')
    return s if s not in ('', '-0') else '0'


def K(a, b, c=None, d=None, dy=None, dx=None, ds=None, bl=None):
    s = f'--a: {f(a)}; --b: {f(b)}'
    if c is not None:
        s += f'; --c: {f(c)}; --d: {f(d)}'
    if dy is not None:
        s += f'; --dy: {dy}px'
    if dx is not None:
        s += f'; --dx: {dx}px'
    if ds is not None:
        s += f'; --ds: {f(ds)}'
    if bl is not None:
        s += f'; --bl: {bl}px'
    return s


def J(a, b):
    return f'--a: {f(a)}; --b: {f(b)}'


IC = {
    'check': '<path d="M4 8.4 L6.8 11 L12 5.2"></path>',
    'up': '<path d="M8 13 V3 M4 7 L8 3 L12 7"></path>',
    'right': '<path d="M3 8 H13 M9 4 L13 8 L9 12"></path>',
    'out': '<path d="M4 12 L12 4 M6 4 H12 V10"></path>',
    'ig': '<rect x="2.5" y="2.5" width="11" height="11" rx="3.2"></rect><circle cx="8" cy="8" r="2.6"></circle><circle cx="11.4" cy="4.6" r=".5" fill="currentColor"></circle>',
    'mail': '<rect x="2" y="3.5" width="12" height="9" rx="1.5"></rect><path d="M2.5 4.5 L8 9 L13.5 4.5"></path>',
    'target': '<circle cx="8" cy="8" r="5.5"></circle><circle cx="8" cy="8" r="2.2"></circle>',
    'search': '<circle cx="7" cy="7" r="4.2"></circle><path d="M10.2 10.2 L13.5 13.5"></path>',
    'map': '<path d="M2.5 4 L6 2.8 L10 4.2 L13.5 3 V12 L10 13.2 L6 11.8 L2.5 13 Z M6 2.8 V11.8 M10 4.2 V13.2"></path>',
    'pen': '<path d="M3 13 L3.6 10.2 L10.6 3.2 L12.8 5.4 L5.8 12.4 Z"></path>',
    'layout': '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"></rect><path d="M2.5 6 H13.5 M6.5 6 V13.5"></path>',
    'spark': '<path d="M8 2 L9.3 6.7 L14 8 L9.3 9.3 L8 14 L6.7 9.3 L2 8 L6.7 6.7 Z"></path>',
    'code': '<path d="M5.5 4.5 L2 8 L5.5 11.5 M10.5 4.5 L14 8 L10.5 11.5"></path>',
    'bag': '<path d="M3 5.5 H13 L12.2 13.5 H3.8 Z M5.8 5.5 V4.5 A2.2 2.2 0 0 1 10.2 4.5 V5.5"></path>',
    'cal': '<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"></rect><path d="M2.5 6.5 H13.5 M5.5 2 V4.5 M10.5 2 V4.5"></path>',
    'phone': '<rect x="4.5" y="1.8" width="7" height="12.4" rx="1.6"></rect><path d="M7 12 H9"></path>',
    'film': '<rect x="2" y="3" width="12" height="10" rx="1.5"></rect><path d="M2 6 H14 M2 10 H14 M5.5 3 V6 M10.5 3 V6 M5.5 10 V13 M10.5 10 V13"></path>',
    'cam': '<rect x="2" y="4.5" width="9" height="7.5" rx="1.5"></rect><path d="M11 7 L14 5.5 V11 L11 9.5"></path>',
    'user': '<circle cx="8" cy="5.5" r="2.6"></circle><path d="M3 13.5 C3.8 10.6 5.6 9.4 8 9.4 C10.4 9.4 12.2 10.6 13 13.5"></path>',
    'card': '<rect x="2" y="3.5" width="12" height="9" rx="1.5"></rect><path d="M2 6.5 H14 M4.5 10 H7"></path>',
    'bell': '<path d="M4 11 V7.5 A4 4 0 0 1 12 7.5 V11 L13 12 H3 Z M6.6 13.6 A1.6 1.6 0 0 0 9.4 13.6"></path>',
    'zap': '<path d="M9 2 L4 9 H8 L7 14 L12 7 H8 Z"></path>',
    'lock': '<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"></rect><path d="M5.5 7 V5 A2.5 2.5 0 0 1 10.5 5 V7"></path>',
    'plus': '<path d="M8 3 V13 M3 8 H13"></path>',
    'globe': '<circle cx="8" cy="8" r="5.6"></circle><path d="M2.4 8 H13.6 M8 2.4 C10 4.4 10 11.6 8 13.6 C6 11.6 6 4.4 8 2.4"></path>',
}


def ic(name, size=16, sw=1.5, extra=''):
    return f'<svg viewBox="0 0 16 16" width="{size}" height="{size}" fill="none" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{IC[name]}</svg>'


def mark(size, fill='#F3F2EE', extra=''):
    return f'<svg viewBox="0 0 84 84" width="{size}" height="{size}" aria-hidden="true"{extra}><path d="{MARK}" fill="{fill}" fill-rule="evenodd"></path></svg>'


def chrome_mark(size, layers=9, gap=1.3):
    out = [f'<div class="orb-spin" style="position: relative; width: {size}px; height: {size}px">']
    for i in range(layers, -1, -1):
        fill = 'url(#tdChrome)' if i in (0, layers) else 'url(#tdSide)'
        out.append(f'<svg viewBox="0 0 84 84" width="{size}" height="{size}" aria-hidden="true" style="position: absolute; left: 0; top: 0; transform: translateZ({-i * gap:.1f}px)"><path d="{MARK}" fill="{fill}" fill-rule="evenodd"></path></svg>')
    out.append('</div>')
    return ''.join(out)


def checkbox(a, b, size=20):
    return (f'<span class="kc ckf" style="{J(a, b)}; flex: none; width: {size}px; height: {size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0B0B0B">'
            f'{ic("check", size - 6, 2)}</span>')


def words(text, a, step, b_len, c, d, cls_style=''):
    out = []
    ws = text.split(' ')
    for i, w in enumerate(ws):
        aa = a + i * step
        out.append(f'<span class="k" style="{K(aa, aa + b_len, c, d, dy=0, bl=8)}; display: inline-block{cls_style}">{w}</span>')
    return ' '.join(out)


# ---------------------------------------------------------------- sections
S = []
H = []  # section heights for preview


def sec(i, name, h, inner, pinned=True, sid=None):
    i = len(S)
    idattr = f' id="{sid}"' if sid else ''
    if pinned:
        S.append(f'<section class="sc"{idattr} data-sec="{i}" data-name="{name}" aria-label="{name}" style="height: calc(var(--vh) * {h})">\n<div class="stage">\n{inner}\n</div>\n</section>')
    else:
        S.append(inner.replace('@@IDX@@', str(i)))


def cta_w(label, href='https://ig.me/m/aixkuba', size=54, extra=''):
    ext = ' target="_blank" rel="noopener"' if href.startswith('http') else ''
    return (f'<a class="btn btn-w" href="{href}"{ext} style="display: inline-flex; align-items: center; gap: 12px; height: {size}px; padding: 0 {size*0.11:.0f}px 0 22px; box-sizing: border-box; border-radius: 30px; background: #F3F2EE; color: #0B0B0B; text-decoration: none; font-size: 15px; font-weight: 600; white-space: nowrap{extra}">'
            f'{ic("ig", 16)}<span>{label}</span><span style="width: {size-12}px; height: {size-12}px; border-radius: 50%; background: #0B0B0B; color: #F3F2EE; display: flex; align-items: center; justify-content: center">{ic("right", 15, 1.8)}</span></a>')


def cta_o(label, href, size=54):
    return f'<a class="btn btn-o" href="{href}" style="display: inline-flex; align-items: center; height: {size}px; padding: 0 22px; box-sizing: border-box; border-radius: 30px; border: 1px solid rgba(243,242,238,.28); color: #F3F2EE; text-decoration: none; font-size: 15px; font-weight: 500; white-space: nowrap">{label}</a>'


# 0 hero ---------------------------------------------------------------
HERO_BUL = ['Strony kodowane ręcznie', 'Motion w każdym detalu', 'Rolki i filmy promo', 'Wycena po rozmowie']
hbul = ''.join(f'<span style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; white-space: nowrap"><span style="width: 17px; height: 17px; border-radius: 50%; background: #F3F2EE; color: #0B0B0B; display: flex; align-items: center; justify-content: center">{ic("check", 11, 2.2)}</span>{t}</span>' for t in HERO_BUL)
hero = f'''<div class="hero-l">
<h1 class="k" style="{K(-1, .001, .03, .42, dy=60)}; margin: 0; font-size: clamp(44px, 5.6vw, 82px); line-height: 1.02; letter-spacing: -.045em; font-weight: 600"><span class="intro" style="display: block">Ty masz pomysł.</span><span class="intro2" style="display: block; font-weight: 400">The Domain buduje resztę.</span></h1>
<div class="k" style="{K(-1, .001, .02, .3, dy=40)}; margin-top: 34px"><div class="intro3 hrow" style="display: flex; flex-wrap: wrap; gap: 10px">{cta_w('Napisz DOMAIN w DM')}{cta_o('Zobacz realizacje', '#realizacje')}</div></div>
<div class="k bul hrow" style="{K(-1, .001, .02, .25, dy=20)}; margin-top: 30px">{hbul}</div>
</div>
<button type="button" class="k btn btn-w" onClick="{{{{playStory}}}}" style="{K(-1, .001, .0, .07, dy=12)}; position: absolute; left: 50%; bottom: 14px; margin-left: -97px; width: 194px; height: 48px; display: flex; align-items: center; gap: 12px; padding: 0 16px 0 6px; box-sizing: border-box; border: 0; border-radius: 26px; background: #F3F2EE; color: #0B0B0B; cursor: pointer; text-align: left">
<span style="flex: none; width: 36px; height: 36px; border-radius: 50%; background: #0B0B0B; color: #F3F2EE; display: flex; align-items: center; justify-content: center"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M5 3.2 L13 8 L5 12.8 Z" fill="currentColor"></path></svg></span>
<span style="display: flex; flex-direction: column; line-height: 1.15"><span style="font-size: 14px; font-weight: 600">Odtwórz historię</span><span style="font-size: 11px; color: #5D5C58">albo przewijaj dalej</span></span>
</button>'''
sec(0, 'Start', 1.6, hero)

# 1 questions ------------------------------------------------------------
QS = [('Twoja strona wygląda', 'jak tysiąc innych?'), ('Klient wychodzi', 'po trzech sekundach?'), ('Stronę robi jedna firma,', 'a rolki druga?'),
      ('Na poprawki czekasz', 'tygodniami?'), ('A gdyby jeden zespół', 'zrobił to wszystko?')]
NQ = len(QS)
qh, qn, qd = [], [], []
for i, (l1, l2) in enumerate(QS):
    a = .03 + i * .155
    c, d = a + .12, a + .14
    n1 = len(l1.split(' '))
    qh.append(f'<h2 style="position: absolute; left: 0; right: 0; top: 0; margin: 0; text-align: center; font-size: clamp(40px, 6vw, 96px); line-height: 1.02; letter-spacing: -.045em; font-weight: 600">'
              f'{words(l1, a, .008, .03, c, d)}<br><span style="font-weight: 400; color: #C9C7C1">{words(l2, a + n1 * .008 + .01, .008, .03, c, d)}</span></h2>')
    qn.append(f'<span class="k" style="{K(a, a + .02, c, d, dy=8)}; position: absolute; left: 0; right: 0; top: 0">Pytanie 0{i + 1} / 0{NQ}</span>')
    qd.append(f'<i class="kc" style="{J(a, a + .03)}; display: block; width: 28px; height: 3px; border-radius: 2px; background: rgba(243,242,238,calc(.18 + .82 * var(--j)))"></i>')
fa = .03 + NQ * .155
questions = f'''<p class="mono" style="position: absolute; left: 0; right: 0; top: 24%; margin: 0; height: 14px; text-align: center; font-size: 10.5px; color: #9C9B96">{''.join(qn)}</p>
<div style="position: absolute; left: 16px; right: 16px; top: 33%; height: 220px">
{''.join(qh)}
<div style="position: absolute; left: 0; right: 0; top: 0; text-align: center">
<h2 style="margin: 0; font-size: clamp(44px, 7vw, 112px); line-height: 1; letter-spacing: -.05em; font-weight: 600">{words('To jest The Domain.', fa, .012, .04, 2, 3)}</h2>
<p class="k" style="{K(fa + .05, fa + .09, dy=16)}; margin: 18px 0 0; font-size: clamp(16px, 1.4vw, 20px); color: #C9C7C1">Strona kodowana ręcznie, motion i wideo. Jeden zespół, jeden kontakt.</p>
<div class="k" style="{K(fa + .07, fa + .11, dy=20)}; margin-top: 28px; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px">{cta_w('Napisz DOMAIN w DM')}{cta_o('Zobacz realizacje', '#realizacje')}</div>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 90px; display: flex; justify-content: center; gap: 6px">{''.join(qd)}</div>'''
sec(1, 'Pytania', 7, questions)

# 4 projects -----------------------------------------------------------------
def tagp(t):
    return f'<span style="font-size: 11.5px; border: 1px solid rgba(243,242,238,.2); border-radius: 20px; padding: 4px 10px; color: #E9E7E1; white-space: nowrap">{t}</span>'


cal = ''.join(f'<span style="height: 26px; border-radius: 6px; background: {"#F3F2EE" if d == 17 else "#1A1A19"}; color: {"#0B0B0B" if d == 17 else ("#5D5C58" if d in (3, 4, 10, 11, 24, 25) else "#C9C7C1")}; font-size: 10.5px; display: flex; align-items: center; justify-content: center{"; animation: td-pulse 1.6s ease-in-out infinite" if d == 17 else ""}">{d}</span>' for d in range(1, 29))
def shot(n, url):
    return (f'<div style="position: absolute; inset: 0; background: #0B0B0B">'
            f'<div style="height: 26px; display: flex; align-items: center; gap: 5px; padding: 0 12px; background: #161616; border-bottom: 1px solid rgba(243,242,238,.08)"><i style="width: 7px; height: 7px; border-radius: 50%; background: #3A3A38"></i><i style="width: 7px; height: 7px; border-radius: 50%; background: #3A3A38"></i><i style="width: 7px; height: 7px; border-radius: 50%; background: #3A3A38"></i><span class="mono" style="margin: 0 auto; font-size: 8.5px; letter-spacing: .04em; text-transform: none; color: #9C9B96">{url}</span><span style="width: 33px"></span></div>'
            f'<img src="@@PROJ{n}@@" alt="Zrzut ekranu projektu {url}" style="display: block; width: 100%; height: calc(100% - 27px); object-fit: cover; object-position: 50% 0"></div>')


VIS = [shot(1, 'Himera · sklep'), shot(2, 'Adriatico · sala weselna'), shot(3, 'Tirenders · rezerwacje')]
PROJ = [('Himera', 'Sklep z merchem · produkty w 3D', ['Design sklepu', 'Modele 3D', 'Kod', 'Motion']),
        ('Adriatico', 'Strona sali weselnej i bankietowej', ['Strona', 'Sale i menu', 'Galeria', 'Kontakt']),
        ('Tirenders', 'System rezerwacji z płatnościami', ['Kalendarz', 'Płatności BLIK i karta', 'PL / EN'])]
cards, nums = [], []
for i, (t, cat, tags) in enumerate(PROJ):
    a = .05 + i * .27
    na = .05 + (i + 1) * .27
    back = f'{J(na, na + .12)}' if i < 2 else '--a: 8; --b: 9'
    cards.append(f'''<div class="k" style="{K(a, a + .12, .93, .99, dy=520, ds=-.04)}; position: absolute; inset: 0; z-index: {i + 1}">
<div class="kc" style="{back}; position: absolute; inset: 0; transform: translateY(calc(var(--j) * -42px)) scale(calc(1 - .07 * var(--j))); transform-origin: 50% 0; filter: brightness(calc(1 - .55 * var(--j)))">
<div class="card" style="position: absolute; inset: 0; overflow: hidden; background: #101010; border-radius: 22px">
<div class="pv" style="position: absolute; left: 0; right: 0; top: 0; height: 300px; border-bottom: 1px solid rgba(243,242,238,.1)">{VIS[i]}</div>
<div class="pt" style="position: absolute; left: 24px; right: 24px; top: 314px">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 12px"><span style="font-size: 21px; font-weight: 600; letter-spacing: -.02em">{t}</span><span class="mono" style="font-size: 9.5px; color: #9C9B96; white-space: nowrap">0{i + 1} · w toku</span></div>
<p style="margin: 3px 0 10px; font-size: 13px; color: #9C9B96">{cat}</p>
<div style="display: flex; flex-wrap: wrap; gap: 6px">{"".join(tagp(x) for x in tags)}</div>
</div></div></div></div>''')
    nums.append(f'<span class="k" style="{K(a + .02, a + .08, (na + .02) if i < 2 else 2, (na + .08) if i < 2 else 3, dy=40, bl=6)}; position: absolute; left: 0; top: 0">0{i + 1}</span>')
projects = f'''<div class="ev-t">
<p class="mono k" style="{K(0, .05, .93, .99, dy=10)}; margin: 0 0 16px; font-size: 10px; color: #9C9B96">Realizacje · 2026</p>
<h2 class="t-st" style="font-size: clamp(36px, 3.7vw, 54px); line-height: 1.04"><span class="k" style="{K(0, .06, .93, .99, dy=24, bl=8)}; display: block">Projekty,</span><span class="k" style="{K(.02, .08, .93, .99, dy=24, bl=8)}; display: block; font-weight: 400">które właśnie</span><span class="k" style="{K(.04, .1, .93, .99, dy=24, bl=8)}; display: block; font-weight: 400">powstają.</span></h2>
<div class="k hide-s" style="{K(.06, .12, .93, .99, dy=20)}; position: relative; margin-top: 28px; height: 110px; font-family: Syne, sans-serif; font-weight: 800; font-size: 108px; line-height: 1; letter-spacing: -.04em; color: transparent; -webkit-text-stroke: 1px rgba(243,242,238,.55)">{''.join(nums)}<span style="position: absolute; left: 150px; top: 18px; font-size: 22px; -webkit-text-stroke: 0; color: #9C9B96; font-family: Geist, sans-serif; font-weight: 400; letter-spacing: 0">/ 03</span></div>
<div class="k" style="{K(.08, .14, .93, .99, dy=14)}; margin-top: 22px">{cta_w('Chcę taki projekt', size=48)}</div>
</div>
<div class="ev-c" style="height: 440px">
{''.join(cards)}
</div>'''
sec(4, 'Realizacje', 4.6, projects, sid='realizacje')


def head(title, sub, tag=None, a=0, out=(.9, .97)):
    t = f'<p class="mono k" style="{K(a, a + .05, out[0], out[1], dy=10)}; margin: 0 0 14px; font-size: 10px; color: #9C9B96">{tag}</p>' if tag else ''
    return (f'<div class="hdr">{t}<h2 class="t-st k" style="{K(a, a + .06, out[0], out[1], dy=26, bl=8)}; font-size: clamp(34px, 3.9vw, 56px)">{title}</h2>'
            f'<p class="t-sub k" style="{K(a + .03, a + .09, out[0], out[1], dy=16)}">{sub}</p></div>')


# 5 brief ---------------------------------------------------------------
brief = head('Dajesz nam brief.', 'Kilka zdań wystarczy. Resztę dopytam na rozmowie.') + f'''
<div class="fit" style="top: 31%">
<div class="card k" style="{K(.04, .12, .9, .97, dy=50)}; position: relative; width: 640px; height: 340px; box-sizing: border-box">
<p class="k" style="{K(-1, .001, .66, .7, dy=8)}; position: absolute; left: 0; right: 0; top: 112px; margin: 0; text-align: center; font-size: 23px; font-weight: 500; letter-spacing: -.02em">Nad czym pracujemy?</p>
<div class="k" style="{K(.68, .74, dy=24)}; position: absolute; right: 22px; top: 24px; max-width: 380px; background: #F3F2EE; color: #0B0B0B; border-radius: 16px 16px 4px 16px; padding: 11px 15px; font-size: 14px; line-height: 1.4">Sklep z dropami streetwear. Ma wyglądać premium i sprzedawać.</div>
<div class="k" style="{K(.76, .82, dy=14)}; position: absolute; left: 22px; top: 106px; display: flex; align-items: center; gap: 10px; font-size: 14px; color: #E9E7E1">{mark(18)}<span>Rozumiem. Planuję pracę</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
<div style="position: absolute; left: 18px; right: 18px; bottom: 18px; height: 104px; border-radius: 16px; background: #141414; border: 1px solid rgba(243,242,238,.12); box-sizing: border-box; padding: 14px 16px">
<span class="kc inv" style="{J(.18, .2)}; position: absolute; left: 16px; top: 14px; font-size: 15px; color: #6E6D69">Opisz projekt…</span>
<div class="k" style="{K(-1, .001, .64, .67, dy=0)}; position: relative; font-size: 15px; line-height: 1.45; color: #F3F2EE"><span class="kc ty" style="{J(.2, .58)}; display: inline-block; white-space: nowrap">Sklep z dropami streetwear. Ma wyglądać premium i sprzedawać.</span></div>
<div style="position: absolute; left: 14px; bottom: 12px; display: flex; gap: 6px">
<span style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: #9C9B96; border: 1px solid rgba(243,242,238,.14); border-radius: 8px; padding: 4px 8px">{ic("plus", 10)}Plik</span>
<span style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: #9C9B96; border: 1px solid rgba(243,242,238,.14); border-radius: 8px; padding: 4px 8px">{ic("layout", 10)}moodboard.pdf</span>
</div>
<span style="position: absolute; right: 12px; bottom: 10px; width: 34px; height: 34px">
<span style="position: absolute; inset: 0; border-radius: 50%; background: #2B2B29; color: #6E6D69; display: flex; align-items: center; justify-content: center">{ic("up", 14, 1.8)}</span>
<span class="kc on" style="{J(.6, .64)}; position: absolute; inset: 0; border-radius: 50%; background: #F3F2EE; color: #0B0B0B; display: flex; align-items: center; justify-content: center">{ic("up", 14, 1.8)}</span>
</span>
</div>
</div>
</div>'''
sec(5, 'Brief', 2.6, brief)

# 6 plan ----------------------------------------------------------------
PLAN = [('Brief i cele', 'Kuba'), ('Analiza konkurencji', 'Strategia'), ('Moodboard i kierunek', 'Design'), ('Makiety: home, produkt, koszyk', 'Design'),
        ('Projekt UI w stylu marki', 'Design'), ('Kod: sklep i animacje', 'Kod'), ('Rolka na start dropu', 'Wideo'), ('Publikacja i analityka', 'Start')]
pr = []
for i, (t, o) in enumerate(PLAN):
    a = .1 + i * .065
    pr.append(f'''<div class="k" style="{K(a, a + .05, dy=12)}; display: grid; grid-template-columns: 26px minmax(0,1fr) 90px 92px; align-items: center; gap: 10px; min-height: 40px; border-top: 1px solid rgba(243,242,238,.07)">
<span class="mono" style="font-size: 10px; color: #5D5C58">{i+1:02d}</span><span style="font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{t}</span><span class="mono" style="font-size: 9.5px; color: #9C9B96">{o}</span>
<span style="position: relative; height: 22px"><span class="kc inv mono" style="{J(a + .08, a + .1)}; position: absolute; right: 0; top: 5px; font-size: 9.5px; color: #6E6D69">W kolejce</span><span class="kc on" style="{J(a + .08, a + .1)}; position: absolute; right: 0; top: 0; display: flex; align-items: center; gap: 6px"><span class="mono" style="font-size: 9.5px; color: #E9E7E1">Zaplanowane</span>{checkbox(a + .08, a + .1, 18)}</span></span>
</div>''')
plan = head('Planujemy pracę.', 'Każdy krok ma właściciela i termin.') + f'''
<div class="fit" style="top: 31%">
<div class="card k" style="{K(.04, .1, .9, .97, dy=50)}; width: 600px; padding: 18px 22px 10px; box-sizing: border-box">
<div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px"><span style="font-size: 15px; font-weight: 600">Plan · nowy sklep</span><span class="mono" style="font-size: 10px; color: #9C9B96">8 kroków · 1 zespół</span></div>
{''.join(pr)}
</div>
</div>'''
sec(6, 'Plan', 2.6, plan)


# mockup chrome
def browser(url, inner, w=820, h=450):
    return f'''<div class="win" style="width: {w}px; height: {h}px; position: relative">
<div style="height: 36px; display: flex; align-items: center; gap: 6px; padding: 0 14px; border-bottom: 1px solid rgba(243,242,238,.08); background: #141414">
<i style="width: 9px; height: 9px; border-radius: 50%; background: #3A3A38"></i><i style="width: 9px; height: 9px; border-radius: 50%; background: #3A3A38"></i><i style="width: 9px; height: 9px; border-radius: 50%; background: #3A3A38"></i>
<span class="mono" style="margin: 0 auto; display: flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: .04em; text-transform: none; color: #9C9B96; background: #0B0B0B; border-radius: 7px; padding: 4px 12px">{ic("lock", 10)}{url}</span><span style="width: 39px"></span>
</div>
<div style="position: absolute; left: 0; right: 0; top: 37px; bottom: 0">{inner}</div>
</div>'''


def selbox(a, b, c, d, x, y, w, h, label):
    hd = ''.join(f'<i style="position: absolute; {p}; width: 6px; height: 6px; background: #0B0B0B; border: 1px solid #F3F2EE"></i>' for p in ('left: -4px; top: -4px', 'right: -4px; top: -4px', 'left: -4px; bottom: -4px', 'right: -4px; bottom: -4px'))
    return f'<div class="k" style="{K(a, b, c, d, dy=0, ds=.04)}; position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; border: 1px dashed #F3F2EE; pointer-events: none">{hd}<span class="mono" style="position: absolute; left: -1px; top: -19px; font-size: 9px; letter-spacing: .04em; background: #F3F2EE; color: #0B0B0B; padding: 2px 5px">{label}</span></div>'


def cursor(kf, color='#F3F2EE'):
    return f'<div data-kf="{kf}" style="position: absolute; left: 0; top: 0; pointer-events: none; z-index: 5"><svg viewBox="0 0 26 41" width="16" height="25" aria-hidden="true"><path d="{CURSOR}" fill="{color}" stroke="#0B0B0B" stroke-width="1.6"></path></svg></div>'


# 7 build (Himera) -------------------------------------------------------
tiles = []
for i, lab in enumerate(['Koszulka', 'Bluza', 'Czapka', 'Torba']):
    a = .48 + i * .03
    tiles.append(f'<div class="k" style="{K(a, a + .05, dy=16)}; background: #1A1A19; border-radius: 12px; height: 90px; position: relative; overflow: hidden"><svg viewBox="0 0 200 200" width="70" height="70" style="position: absolute; right: 6px; top: 10px; opacity: .8" aria-hidden="true">{hoodie("#3A3A38")}</svg><span style="position: absolute; left: 12px; bottom: 10px; font-size: 12px; color: #E9E7E1">{lab}</span><span class="mono" style="position: absolute; left: 12px; top: 10px; font-size: 8.5px; color: #6E6D69">Drop 01</span></div>')
himera = f'''<div style="position: absolute; inset: 0; background: #0D0D0D">
<div class="k" style="{K(.1, .15, dy=-10)}; position: absolute; left: 28px; right: 28px; top: 16px; display: flex; justify-content: space-between; align-items: center"><span style="font-family: Syne, sans-serif; font-weight: 800; font-size: 15px; letter-spacing: .02em">TWOJA MARKA</span><span style="display: flex; gap: 18px; font-size: 12px; color: #9C9B96"><span>Drop 01</span><span>Kolekcja</span><span>Koszyk (0)</span></span></div>
<p class="mono k" style="{K(.15, .19, dy=8)}; position: absolute; left: 28px; top: 70px; margin: 0; font-size: 10px; color: #9C9B96">Drop 01 · 21.10 · 21:00</p>
<p class="kc ty" style="{J(.18, .3)}; position: absolute; left: 24px; top: 94px; margin: 0; font-family: Syne, sans-serif; font-weight: 800; font-size: 40px; line-height: 1; letter-spacing: -.02em">TWOJA MARKA</p>
<p class="k" style="{K(.27, .32, dy=10)}; position: absolute; left: 28px; top: 184px; margin: 0; font-size: 15px; color: #C9C7C1">Limitowana kolekcja. Tylko online.</p>
<div class="k" style="{K(.4, .46, dy=12)}; position: absolute; left: 28px; top: 228px; display: flex; gap: 8px"><span style="background: #F3F2EE; color: #0B0B0B; border-radius: 22px; padding: 11px 18px; font-size: 13px; font-weight: 600">Powiadom mnie</span><span style="border: 1px solid rgba(243,242,238,.3); border-radius: 22px; padding: 11px 18px; font-size: 13px">Zobacz kolekcję</span></div>
<div class="k" style="{K(.3, .38, dy=20, ds=.06)}; position: absolute; right: 28px; top: 58px; width: 270px; height: 236px; border-radius: 16px; background: radial-gradient(circle at 50% 40%, #2B2B29, #151514); overflow: hidden">
<svg viewBox="0 0 200 200" width="190" height="190" style="position: absolute; left: 40px; top: 24px" aria-hidden="true">{hoodie()}</svg>
<span class="mono" style="position: absolute; left: 12px; top: 12px; font-size: 9px; background: #F3F2EE; color: #0B0B0B; padding: 3px 7px; border-radius: 6px">Wkrótce</span>
<span style="position: absolute; left: 14px; bottom: 12px; font-size: 12px; color: #E9E7E1">Koszulka · czarna</span>
</div>
<div style="position: absolute; left: 28px; right: 28px; top: 308px; display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px">{''.join(tiles)}</div>
{selbox(.18, .2, .3, .32, 18, 82, 360, 100, 'Nagłówek')}
{selbox(.31, .33, .41, .43, 518, 52, 282, 248, 'Produkt')}
{selbox(.41, .43, .5, .52, 20, 220, 300, 56, 'Przyciski')}
{selbox(.51, .53, .63, .65, 20, 300, 780, 106, 'Kolekcja')}
{cursor('0,430,240;.12,420,220;.2,360,170;.32,690,190;.43,250,262;.55,600,370;.7,700,380;.82,760,420')}
<div class="k" style="{K(.7, .76, .93, .98, dy=20)}; position: absolute; right: 16px; bottom: 16px; width: 280px; background: #F3F2EE; color: #0B0B0B; border-radius: 14px; padding: 12px 14px; box-sizing: border-box; display: flex; gap: 10px; align-items: center; box-shadow: 0 20px 40px rgba(0,0,0,.5)">
<span style="flex: none; width: 26px; height: 26px; border-radius: 50%; background: #0B0B0B; color: #F3F2EE; display: flex; align-items: center; justify-content: center">{ic("check", 14, 2)}</span>
<span><span style="display: block; font-size: 13px; font-weight: 600">Wersja testowa gotowa</span><span class="mono" style="display: block; font-size: 9px; letter-spacing: .04em; text-transform: none; color: #5D5C58; margin-top: 2px">twojsklep.pl · podgląd</span></span>
</div>
</div>'''
build = head('Projektujemy i kodujemy.', 'Sklep z limitowanymi dropami, od makiety do kodu.', 'Przykład · sklep internetowy') + f'''
<div class="fit" style="top: 30%"><div class="k" style="{K(.03, .1, .91, .98, dy=60)}">{browser('twojsklep.pl', himera)}</div></div>'''
sec(7, 'Projektujemy', 3, build)

# 8 video editor ----------------------------------------------------------
rv = random.Random(8)
v1 = []
x = 60
for i in range(6):
    w = rv.randint(90, 140)
    a = .12 + i * .035
    v1.append(f'<div class="k" style="{K(a, a + .05, dy=0, dx=rv.choice([-60, 60]))}; position: absolute; left: {x}px; top: 0; width: {w - 3}px; height: 34px; border-radius: 5px; background: linear-gradient(90deg, #3A3A38, #2B2B29); border: 1px solid #5D5C58; overflow: hidden"><span class="mono" style="position: absolute; left: 6px; top: 4px; font-size: 8px; letter-spacing: .04em; color: #D9D7D0">C{i+1:02d}</span><i style="position: absolute; right: 4px; bottom: 4px; width: 22px; height: 14px; border-radius: 2px; background: #6E6D69"></i></div>')
    x += w
v2 = []
for i, (xx, w, t) in enumerate([(60, 130, 'TWOJA MARKA'), (250, 110, 'DROP 01'), (420, 170, '21.10 · 21:00'), (640, 120, 'Logo D')]):
    a = .2 + i * .04
    v2.append(f'<div class="k" style="{K(a, a + .05, dy=0, dx=60)}; position: absolute; left: {xx}px; top: 0; width: {w}px; height: 24px; border-radius: 5px; background: #D9D7D0; color: #0B0B0B; font-size: 10px; font-weight: 600; display: flex; align-items: center; padding: 0 8px; box-sizing: border-box">{t}</div>')
bars = []
for i in range(150):
    hgt = 4 + abs(rv.gauss(0, 1)) * 9 * (1 + .6 * (i % 23 < 4))
    bars.append(f'<i style="position: absolute; left: {60 + i * 5}px; top: {14 - min(13, hgt/2):.0f}px; width: 3px; height: {min(26, hgt):.0f}px; background: #9C9B96; border-radius: 1px"></i>')
ticks = ''.join(f'<i style="position: absolute; left: {60 + i * 37.5:.1f}px; top: 0; width: 1px; height: {8 if i % 4 == 0 else 4}px; background: #5D5C58"></i>' + (f'<span class="mono" style="position: absolute; left: {64 + i * 37.5:.1f}px; top: 0; font-size: 8px; color: #6E6D69">00:{i//4*4:02d}</span>' if i % 4 == 0 else '') for i in range(21))
shots = [
    (.08, .12, .33, .36, '<span style="font-family: Syne, sans-serif; font-weight: 800; font-size: 15px; letter-spacing: .02em; text-align: center; line-height: 1.1">TWOJA<br>MARKA</span>'),
    (.33, .36, .52, .55, f'<svg viewBox="0 0 200 200" width="96" height="96" aria-hidden="true">{hoodie()}</svg>'),
    (.52, .55, .72, .75, '<span class="mono" style="font-size: 11px; text-align: center; line-height: 1.6">Drop 01<br>21.10 · 21:00</span>'),
    (.72, .75, 2, 3, mark(44)),
]
sh = ''.join(f'<div class="k" style="{K(a, b, c, d, dy=0, ds=.15)}; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center">{h}</div>' for a, b, c, d, h in shots)
editor = f'''<div class="win" style="width: 860px; height: 470px; position: relative; background: #0D0D0D">
<div style="height: 40px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-bottom: 1px solid rgba(243,242,238,.08); background: #141414">
<span style="display: flex; align-items: center; gap: 10px"><span style="font-size: 13px; font-weight: 600">Montaż</span><span class="mono" style="font-size: 9.5px; color: #9C9B96">Rolka_drop01</span></span>
<span style="display: flex; gap: 8px; align-items: center"><span class="mono" style="font-size: 9.5px; color: #9C9B96">9:16 · 1080×1920</span><span style="background: #F3F2EE; color: #0B0B0B; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 600">Eksport</span></span>
</div>
<div style="position: absolute; left: 14px; top: 54px; width: 170px; display: flex; flex-direction: column; gap: 8px">
<span class="mono" style="font-size: 9px; color: #6E6D69">Materiały</span>
<div style="height: 56px; border-radius: 8px; background: linear-gradient(135deg, #2B2B29, #151514); position: relative"><span style="position: absolute; left: 8px; bottom: 6px; font-size: 10px; color: #C9C7C1">sesja_hoodie.mov</span></div>
<div style="height: 56px; border-radius: 8px; background: linear-gradient(135deg, #3A3A38, #1A1A19); position: relative"><span style="position: absolute; left: 8px; bottom: 6px; font-size: 10px; color: #C9C7C1">ulica_noc.mov</span></div>
<div style="height: 56px; border-radius: 8px; background: linear-gradient(135deg, #222221, #0B0B0B); position: relative"><span style="position: absolute; left: 8px; bottom: 6px; font-size: 10px; color: #C9C7C1">logo_D.svg</span></div>
</div>
<div style="position: absolute; left: 200px; top: 52px; width: 460px; height: 208px; background: #070707; border-radius: 10px">
<div style="position: absolute; left: 50%; top: 10px; width: 106px; height: 188px; margin-left: -53px; background: #111110; border: 1px solid #3A3A38; overflow: hidden">{sh}</div>
</div>
<div style="position: absolute; right: 14px; top: 54px; width: 172px; display: flex; flex-direction: column; gap: 0">
<span class="mono" style="font-size: 9px; color: #6E6D69; margin-bottom: 6px">Ustawienia</span>
{''.join(f'<div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 7px 0; border-top: 1px solid rgba(243,242,238,.07)"><span style="color: #9C9B96">{a}</span><span>{b}</span></div>' for a, b in [('Format', '9:16'), ('Rozdzielczość', '1080×1920'), ('Klatki', '30 kl./s'), ('Napisy', 'PL'), ('Muzyka', 'licencja')])}
</div>
<div style="position: absolute; left: 0; right: 0; top: 276px; bottom: 0; border-top: 1px solid rgba(243,242,238,.08)">
<div style="position: absolute; left: 0; right: 0; top: 8px; height: 14px">{ticks}</div>
<span class="mono" style="position: absolute; left: 16px; top: 38px; font-size: 9px; color: #6E6D69">T1</span><div style="position: absolute; left: 0; right: 0; top: 34px; height: 24px">{''.join(v2)}</div>
<span class="mono" style="position: absolute; left: 16px; top: 78px; font-size: 9px; color: #6E6D69">V1</span><div style="position: absolute; left: 0; right: 0; top: 68px; height: 34px">{''.join(v1)}</div>
<span class="mono" style="position: absolute; left: 16px; top: 124px; font-size: 9px; color: #6E6D69">A1</span><div class="k" style="{K(.16, .26, dy=0)}; position: absolute; left: 0; right: 0; top: 114px; height: 28px">{''.join(bars)}</div>
<div data-kf="0,60,0;.3,60,0;.72,800,0" style="position: absolute; left: 0; top: 2px; bottom: 6px; width: 1px; background: #F3F2EE"><i style="position: absolute; left: -5px; top: 0; width: 11px; height: 9px; background: #F3F2EE; clip-path: polygon(0 0, 100% 0, 50% 100%)"></i></div>
</div>
<div class="k" style="{K(.73, .78, .94, .99, dy=24, ds=.06)}; position: absolute; left: 50%; top: 120px; margin-left: -170px; width: 340px; background: #161616; border: 1px solid rgba(243,242,238,.18); border-radius: 16px; padding: 18px; box-sizing: border-box; box-shadow: 0 30px 70px rgba(0,0,0,.7)">
<div style="display: flex; justify-content: space-between; align-items: center"><span style="font-size: 15px; font-weight: 600">Eksport</span><span class="mono" style="font-size: 9.5px; color: #9C9B96"><span data-ct data-from="0" data-to="100" data-a=".77" data-b=".89">0</span>%</span></div>
<p style="margin: 12px 0 2px; font-size: 13px">Rolka_drop01.mp4</p>
<p class="mono" style="margin: 0; font-size: 9px; color: #9C9B96">1080 × 1920 · 9:16 · 30 kl./s</p>
<div style="margin-top: 14px; height: 4px; border-radius: 2px; background: #2B2B29; overflow: hidden"><div class="kc wf" style="{J(.77, .89)}; height: 100%; background: #F3F2EE"></div></div>
<div class="k" style="{K(.89, .91, dy=6)}; margin-top: 12px; display: flex; align-items: center; gap: 8px; font-size: 12.5px">{checkbox(.89, .91, 18)}Gotowe. Wersja 16:9 w kolejce.</div>
</div>
</div>'''
video = head('Montujemy film na start.', 'Rolka 9:16 i wersja 16:9 z tego samego materiału.') + f'''
<div class="fit" style="top: 29%"><div class="k" style="{K(.03, .1, .93, .99, dy=60)}">{editor}</div></div>'''
sec(8, 'Wideo', 3, video)

# 9 automation graph ------------------------------------------------------
NODES = [(40, 150, 'Wybór terminu', 'Klient', 'cal'), (262, 70, 'Wolny termin?', 'Kalendarz', 'search'), (484, 70, 'Płatność online', 'Płatności', 'card'),
         (650, 190, 'Potwierdzenie', 'E-mail', 'mail'), (484, 250, 'Inny termin', 'Gdy zajęte', 'cal'), (650, 300, 'Przypomnienie 24 h', 'SMS i e-mail', 'bell')]
EDGES = [(0, 1), (1, 2), (2, 3), (1, 4), (3, 5)]
NW, NH = 168, 58
nh, eh = [], []
for i, (xx, yy, t, s_, icn) in enumerate(NODES):
    a = .1 + i * .07
    tst = .62 + i * .025
    nh.append(f'''<div class="k" style="{K(a, a + .05, dy=10, ds=.08)}; position: absolute; left: {xx}px; top: {yy}px; width: {NW}px; height: {NH}px; border-radius: 12px; background: #161616; border: 1px solid rgba(243,242,238,.16); display: flex; align-items: center; gap: 10px; padding: 0 10px; box-sizing: border-box">
<span style="flex: none; width: 30px; height: 30px; border-radius: 9px; background: #232322; display: flex; align-items: center; justify-content: center; color: #F3F2EE">{ic(icn, 15)}</span>
<span style="min-width: 0"><span class="mono" style="display: block; font-size: 8.5px; color: #9C9B96">{s_}</span><span style="display: block; font-size: 12.5px; font-weight: 600; white-space: nowrap">{t}</span></span>
<span style="position: absolute; right: -7px; top: -7px">{checkbox(tst, tst + .02, 16)}</span>
</div>''')
for j, (u, v) in enumerate(EDGES):
    x1, y1 = NODES[u][0] + NW, NODES[u][1] + NH / 2
    x2, y2 = NODES[v][0], NODES[v][1] + NH / 2
    if u == 3:
        x1, y1 = NODES[u][0] + NW / 2, NODES[u][1] + NH
        x2, y2 = NODES[v][0] + NW / 2, NODES[v][1]
        d = f'M{x1} {y1} C {x1} {y1 + 30}, {x2} {y2 - 30}, {x2} {y2}'
    else:
        mx = (x1 + x2) / 2
        d = f'M{x1} {y1} C {mx} {y1}, {mx} {y2}, {x2} {y2}'
    a = .16 + j * .07
    eh.append(f'<path class="kc dr" pathLength="1" style="{J(a, a + .08)}" d="{d}" fill="none" stroke="#F3F2EE" stroke-opacity=".55" stroke-width="1.4"></path>')
auto_inner = f'''<div class="win" style="width: 860px; height: 420px; position: relative; background: #0D0D0D">
<div style="height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-bottom: 1px solid rgba(243,242,238,.08); background: #141414">
<span style="display: flex; align-items: center; gap: 10px"><span style="font-size: 13px; font-weight: 600">Automatyzacja</span><span class="mono" style="font-size: 9.5px; color: #9C9B96">Rezerwacje</span></span>
<span style="display: flex; align-items: center; gap: 10px; font-size: 12px">
<span style="display: flex; align-items: center; gap: 6px; border: 1px solid rgba(243,242,238,.2); border-radius: 8px; padding: 4px 9px"><i style="width: 6px; height: 6px; border-radius: 50%; background: #F3F2EE"></i>Test</span>
<span style="color: #9C9B96">Zapisz szablon</span>
<span class="kc" style="{J(.82, .86)}; display: flex; align-items: center; gap: 8px"><span style="position: relative; width: 66px; height: 16px"><span class="inv" style="position: absolute; right: 0; top: 0; color: #9C9B96">Wyłączona</span><span class="on" style="position: absolute; right: 0; top: 0">Włączona</span></span>
<span style="position: relative; width: 34px; height: 20px; border-radius: 10px; background: #2B2B29"><span class="on" style="position: absolute; inset: 0; border-radius: 10px; background: #F3F2EE"></span><i style="position: absolute; top: 3px; left: calc(3px + 14px * var(--j)); width: 14px; height: 14px; border-radius: 50%; background: #6E6D69"></i></span></span>
</span>
</div>
<div class="grid-bg" style="position: absolute; left: 0; right: 0; top: 45px; bottom: 0">
<svg viewBox="0 0 860 375" width="860" height="375" style="position: absolute; left: 0; top: 0" aria-hidden="true">{''.join(eh)}</svg>
{''.join(nh)}
<div class="k" style="{K(.78, .82, .94, .99, dy=14)}; position: absolute; left: 40px; bottom: 16px; display: flex; align-items: center; gap: 8px; background: #F3F2EE; color: #0B0B0B; border-radius: 10px; padding: 8px 12px; font-size: 12.5px; font-weight: 600">{ic("zap", 14)}Test przeszedł: 6 z 6 kroków. Włączone.</div>
</div>
</div>'''
auto = head('Podpinamy rezerwacje i płatności.', 'Przetestowane, potem włączone.', 'Przykład · rezerwacje i płatności') + f'''
<div class="fit" style="top: 33%"><div class="k" style="{K(.03, .1, .93, .99, dy=60)}">{auto_inner}</div></div>'''
sec(9, 'Automatyzacje', 3, auto)



# 11 results --------------------------------------------------------------
rr2 = random.Random(3)
pts = [(i * 26, 120 - (40 + 50 * (i / 30) + 14 * __import__('math').sin(i * .7) + rr2.uniform(-8, 8))) for i in range(31)]
line = 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in pts)
area = line + ' L780 140 L0 140 Z'
mini = []
for i, (l, v) in enumerate([('Zapytania', 46), ('Rezerwacje', 12), ('Drop: zapisy', 214), ('Wyświetlenia rolek', 18400)]):
    a = .48 + i * .04
    sp = 'M' + ' L'.join(f'{j * 12} {20 - 14 * abs(__import__("math").sin(j * (.5 + i * .2))) - j * .6:.0f}' for j in range(11))
    mini.append(f'<div class="k" style="{K(a, a + .05, dy=14)}; background: #151514; border: 1px solid rgba(243,242,238,.08); border-radius: 12px; padding: 12px; position: relative; overflow: hidden"><span class="mono" style="display: block; font-size: 8.5px; color: #9C9B96">{l}</span><span data-ct data-from="0" data-to="{v}" data-a="{a}" data-b="{a + .14}" style="display: block; margin-top: 6px; font-size: 20px; font-weight: 600">0</span><svg viewBox="0 0 120 24" width="96" height="20" style="position: absolute; right: 10px; bottom: 12px" aria-hidden="true"><path d="{sp}" fill="none" stroke="#9C9B96" stroke-width="1.3"></path></svg></div>')
dash = f'''<div class="card zm" style="width: 820px; padding: 22px 22px 20px; box-sizing: border-box; border-radius: 18px; background: #0F0F0F">
<div style="display: flex; justify-content: space-between; align-items: flex-start">
<div><p style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -.02em">Cześć, Kuba</p><p class="mono" style="margin: 4px 0 0; font-size: 9px; color: #9C9B96">Twój sklep · ostatnie 7 dni</p></div>
<span class="mono" style="font-size: 9px; border: 1px solid rgba(243,242,238,.25); border-radius: 7px; padding: 5px 8px; color: #C9C7C1">Podgląd · dane przykładowe</span>
</div>
<div style="display: flex; align-items: flex-end; gap: 40px; margin-top: 18px">
<div><span class="mono" style="display: block; font-size: 9px; color: #9C9B96">Odwiedziny</span><span style="display: flex; align-items: baseline; gap: 12px"><span data-ct data-from="0" data-to="12840" data-a=".1" data-b=".4" style="font-size: 54px; font-weight: 600; letter-spacing: -.04em">0</span><span class="k" style="{K(.38, .42, dy=6)}; font-size: 12px; background: #F3F2EE; color: #0B0B0B; border-radius: 6px; padding: 2px 6px; font-weight: 600">+38%</span></span></div>
<div style="padding-bottom: 10px"><span class="mono" style="display: block; font-size: 9px; color: #9C9B96">Konwersja</span><span data-ct data-from="0" data-to="3.4" data-dec="1" data-suf="%" data-a=".14" data-b=".42" style="font-size: 20px; font-weight: 600">0</span></div>
<div style="padding-bottom: 10px"><span class="mono" style="display: block; font-size: 9px; color: #9C9B96">Śr. czas na stronie</span><span style="font-size: 20px; font-weight: 600">1:48</span></div>
</div>
<svg viewBox="0 0 780 140" width="776" height="140" style="display: block; margin-top: 8px" aria-hidden="true">
<path class="k" style="{K(.5, .62, dy=0)}" d="{area}" fill="rgba(243,242,238,.06)"></path>
<path class="kc dr" pathLength="1" style="{J(.18, .6)}" d="{line}" fill="none" stroke="#F3F2EE" stroke-width="1.6"></path>
</svg>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-top: 12px">{''.join(mini)}</div>
</div>'''
results = head('Widzisz efekty.', 'Każde zapytanie i każda sprzedaż w jednym widoku.') + f'''
<div class="fit" style="top: 29%"><div class="k" style="{K(.03, .1, .93, .99, dy=60)}">{dash}</div></div>'''
sec(11, 'Efekty', 2.6, results)



# 13 start card -----------------------------------------------------------
ICONS12 = ['target', 'search', 'map', 'pen', 'layout', 'spark', 'code', 'bag', 'cal', 'phone', 'film', 'cam']
igrid = ''.join(f'<span style="width: 26px; height: 26px; border-radius: 7px; border: 1px solid rgba(243,242,238,.14); display: flex; align-items: center; justify-content: center; color: #C9C7C1">{ic(n, 13)}</span>' for n in ICONS12)
STATS = [('0', 'Gotowych szablonów'), ('12', 'Usług w zespole'), ('1', 'Osoba kontaktowa'), ('PL · EN', 'Wersje językowe'), ('100%', 'Kodu dla Ciebie'), ('9:16 · 16:9', 'Formaty wideo')]
stats = ''.join(f'<div style="padding: 10px 0; border-top: 1px solid rgba(243,242,238,.08)"><span style="display: block; font-size: 19px; font-weight: 600; letter-spacing: -.02em">{v}</span><span class="mono" style="display: block; margin-top: 3px; font-size: 8.5px; color: #9C9B96">{l}</span></div>' for v, l in STATS)
brk = lambda p: f'<i style="position: absolute; {p}; width: 12px; height: 12px"></i>'
corners = ''.join(f'<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" style="position: absolute; {p}"><path d="{d}" fill="none" stroke="#9C9B96"></path></svg>' for p, d in [('left: -22px; top: -22px', 'M0 12 V0 H12'), ('right: -22px; top: -22px', 'M0 0 H12 V12'), ('left: -22px; bottom: -22px', 'M0 0 V12 H12'), ('right: -22px; bottom: -22px', 'M0 12 H12 V0')])
start = f'''<div class="st-t"><h2 class="t-st"><span class="k" style="{K(.08, .16, .86, .95, dy=26, bl=8)}; display: block">Zacznij teraz.</span><span class="k" style="{K(.12, .2, .86, .95, dy=26, bl=8)}; display: block; font-weight: 400">Rośnij szybciej.</span></h2></div>
<div class="st-c"><div class="k" style="{K(.02, .14, .84, .98, dy=90)}; position: relative">{corners}
<div class="card" style="width: 370px; padding: 22px 22px 16px; box-sizing: border-box; background: #101010">
<div style="display: flex; justify-content: space-between; align-items: center"><span style="font-size: 17px; font-weight: 600">The Domain</span><span class="mono" style="font-size: 9px; border: 1px solid rgba(243,242,238,.3); border-radius: 12px; padding: 5px 9px">Terminy 2026</span></div>
<div style="display: flex; align-items: flex-start; gap: 12px; margin: 14px 0 6px">{mark(78)}<span class="mono" style="font-size: 9.5px; line-height: 1.6; color: #C9C7C1; padding-top: 10px">/ projekt<br>Wycena po rozmowie<br>bez gotowych pakietów</span></div>
<div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px">{stats}</div>
<p class="mono" style="margin: 12px 0 8px; font-size: 8.5px; color: #9C9B96">W projekcie</p>
<div style="display: grid; grid-template-columns: repeat(6, 26px); gap: 6px 8px">{igrid}</div>
<a class="btn btn-w" href="https://ig.me/m/aixkuba" target="_blank" rel="noopener" style="margin-top: 18px; height: 50px; border-radius: 26px; background: #F3F2EE; color: #0B0B0B; text-decoration: none; display: flex; align-items: center; justify-content: space-between; padding: 0 6px 0 20px; font-size: 15px; font-weight: 600">Napisz DOMAIN w DM<span style="width: 38px; height: 38px; border-radius: 50%; background: #0B0B0B; color: #F3F2EE; display: flex; align-items: center; justify-content: center">{ic("right", 15, 1.8)}</span></a>
<p class="mono" style="margin: 12px 0 0; text-align: center; font-size: 8px; color: #6E6D69">Odpisuję osobiście · strona + wideo · PL / EN</p>
</div></div></div>'''
sec(13, 'Współpraca', 2.6, start)

# 14 final ---------------------------------------------------------------
final = f'''<section class="sc" data-sec="@@IDX@@" data-name="Kontakt" aria-label="Kontakt" style="min-height: var(--vh); padding: calc(var(--vh) * .18) 16px 130px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center">
<h2 class="k" style="{K(.2, .7, dy=40, bl=10)}; margin: 0; text-align: center; font-size: clamp(44px, 6.2vw, 96px); line-height: 1; letter-spacing: -.045em; font-weight: 600">Skup się na pomysłach.<br><span style="font-weight: 400">Your domain. Built to grow.</span></h2>
<div class="k" style="{K(.35, .8, dy=20)}; margin-top: 28px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 18px">
<a class="btn btn-w" href="https://ig.me/m/aixkuba" target="_blank" rel="noopener" style="display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 22px; background: #F3F2EE; color: #0B0B0B; text-decoration: none; font-size: 13px; font-weight: 600">{ic("ig", 15)}Napisz na IG</a>
<a class="btn btn-o" href="mailto:kub.mktg@gmail.com?subject=Rozmowa%20o%20projekcie" style="display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px; border-radius: 22px; border: 1px solid rgba(243,242,238,.22); color: #F3F2EE; text-decoration: none; font-size: 13px; font-weight: 500">Umów rozmowę {ic("right", 13)}</a>
<span style="display: flex; align-items: center; gap: 7px; font-size: 13px; color: #9C9B96"><svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M5 3.2 L13 8 L5 12.8 Z" fill="currentColor"></path></svg>Showreel · wkrótce</span>
<button type="button" onClick="{{{{replay}}}}" style="background: transparent; border: 0; color: #F3F2EE; font-size: 13px; cursor: pointer; padding: 10px 4px">Odtwórz historię</button>
</div>
<p class="mono" style="margin: 16px 0 0; font-size: 10.5px; color: #C9C7C1; text-align: center">Strony kodowane ręcznie · motion design · rolki i filmy promo</p>
<div class="cols3" style="margin-top: calc(var(--vh) * .12); width: min(780px, 100%)">
{''.join(f'<div style="border-top: 1px solid rgba(243,242,238,.14); padding-top: 14px; display: flex; gap: 8px; font-size: 14px; font-weight: 600"><i style="flex: none; margin-top: 7px; width: 5px; height: 5px; border-radius: 50%; background: #F3F2EE"></i>{t}</div>' for t in ['Kod należy do Ciebie.', 'Jeden kontakt od briefu do startu.', 'Strony po polsku i angielsku.'])}
</div>
<footer style="margin-top: calc(var(--vh) * .1); width: min(780px, 100%); font-size: 13px; color: #C9C7C1; line-height: 1.6; background: rgba(11,11,11,.82); border: 1px solid rgba(243,242,238,.1); border-radius: 18px; padding: 20px 22px; box-sizing: border-box">
<p style="margin: 0; color: #F3F2EE; font-weight: 600">© 2026 The Domain · CEO Jakub (aixkuba)</p>
<p style="margin: 6px 0 0">Projekty oznaczone „w toku” są w budowie. Liczby na wykresach to przykładowe dane, nie wyniki klientów.</p>
<div class="foot" style="margin-top: 16px; align-items: center; font-size: 13.5px">
<span style="display: flex; flex-wrap: wrap; gap: 16px"><a href="https://instagram.com/aixkuba" target="_blank" rel="noopener" style="color: #F3F2EE">Instagram @aixkuba</a><a href="mailto:kub.mktg@gmail.com" style="color: #F3F2EE">E-mail</a><span>Regulamin · wkrótce</span><span>Prywatność · wkrótce</span></span>
<span style="display: flex; align-items: center; gap: 10px"><span style="color: #F3F2EE">kub.mktg@gmail.com</span><button type="button" onClick="{{{{copyMail}}}}" style="font-size: 12px; font-weight: 600; background: #F3F2EE; color: #0B0B0B; border: 0; border-radius: 14px; padding: 6px 12px; cursor: pointer">{{{{copyLabel}}}}</button></span>
</div>
</footer>
</section>'''
sec(14, 'Kontakt', 1, final, pinned=False)

# ---------------------------------------------------------------- page chrome
HERO_BUL = ['Strony kodowane ręcznie', 'Motion w każdym detalu', 'Rolki i filmy promo', 'Wycena po rozmowie']
bul = ''.join(f'<span style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; white-space: nowrap"><span style="width: 17px; height: 17px; border-radius: 50%; background: #F3F2EE; color: #0B0B0B; display: flex; align-items: center; justify-content: center">{ic("check", 11, 2.2)}</span>{t}</span>' for t in HERO_BUL)

chrome = f'''{DEFS}
<canvas ref="{{{{cv}}}}" aria-hidden="true" style="position: fixed; left: 0; top: 0; width: 100%; height: 100vh; display: block; pointer-events: none; z-index: 0"></canvas>
<div ref="{{{{orbRef}}}}" class="orb" aria-hidden="true" style="position: fixed; left: 0; top: 0; width: 76px; height: 76px; z-index: 3; pointer-events: none; opacity: 0; will-change: transform, opacity">
<div style="position: absolute; inset: -30px; border-radius: 50%; background: radial-gradient(circle, rgba(243,242,238,.18), transparent 65%)"></div>
<div class="orb-bob">{chrome_mark(76)}</div>
</div>
<header class="topbar" style="position: fixed; left: 0; right: 0; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; padding: 18px clamp(16px, 1.8vw, 26px); pointer-events: none">
<a href="#start" aria-label="The Domain, na początek" style="pointer-events: auto; display: flex; align-items: center; gap: 8px; color: #F3F2EE; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: -.02em; white-space: nowrap">{mark(19)}The Domain.</a>
<span style="pointer-events: auto; display: flex; gap: 8px">
<a class="btn btn-w" href="https://ig.me/m/aixkuba" target="_blank" rel="noopener" style="display: flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 20px; background: #F3F2EE; color: #0B0B0B; text-decoration: none; font-size: 13px; font-weight: 600">{ic("ig", 14)}<span style="white-space: nowrap">Napisz na IG</span></a>
<a class="btn btn-o hide-s" href="mailto:kub.mktg@gmail.com?subject=Rozmowa%20o%20projekcie" style="display: flex; align-items: center; height: 36px; padding: 0 14px; border-radius: 20px; border: 1px solid rgba(243,242,238,.22); color: #F3F2EE; text-decoration: none; font-size: 13px; font-weight: 500">Umów rozmowę</a>
</span>
</header>

<div ref="{{{{plRef}}}}" role="region" aria-label="Odtwarzacz historii" style="position: fixed; left: 50%; bottom: 14px; z-index: 45; width: 264px; margin-left: -132px; height: 50px; box-sizing: border-box; border-radius: 26px; background: rgba(22,22,22,.88); border: 1px solid rgba(243,242,238,.14); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); display: flex; align-items: center; gap: 10px; padding: 0 8px 0 7px; opacity: max(min(1, calc(var(--hp) * 10 - .6)), var(--pl)); pointer-events: none">
<span style="flex: none; width: 36px; height: 36px; border-radius: 10px; background: #1C1C1B; display: flex; align-items: center; justify-content: center; perspective: 200px">{chrome_mark(24, 5, .8)}</span>
<span style="flex: 1; min-width: 0; position: relative; height: 36px">
<span style="display: block; font-size: 13px; font-weight: 600; line-height: 1.25; padding-top: 2px">The Domain</span>
<span style="display: block; font-size: 11px; color: #9C9B96; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{sceneName}}}}</span>
<span style="position: absolute; left: 0; right: 4px; bottom: 0; height: 2px; background: rgba(243,242,238,.14); border-radius: 1px; overflow: hidden"><span ref="{{{{barRef}}}}" style="display: block; height: 100%; background: #F3F2EE; transform-origin: 0 50%; transform: scaleX(0)"></span></span>
</span>
<button type="button" onClick="{{{{togglePlay}}}}" aria-label="{{{{playAria}}}}" style="flex: none; width: 34px; height: 34px; border: 0; border-radius: 50%; background: transparent; color: #F3F2EE; cursor: pointer; display: flex; align-items: center; justify-content: center">
<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" style="display: {{{{playDisp}}}}"><path d="M4.5 3 L13 8 L4.5 13 Z" fill="currentColor"></path></svg>
<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" style="display: {{{{pauseDisp}}}}"><rect x="4" y="3" width="2.8" height="10" rx=".6" fill="currentColor"></rect><rect x="9.2" y="3" width="2.8" height="10" rx=".6" fill="currentColor"></rect></svg>
</button>

</div>'''

css = open(os.path.join(HERE, 'style.css')).read()
js = open(os.path.join(HERE, 'logic.js')).read()

total_vh = 1.6 + 9 + 5 + 3 + 3 + 2.6 + 2.6 + 3 + 3 + 3 + 3 + 2.6 + 2.4 + 2.6 + 1.6
print('screens', total_vh, 'px@900', total_vh * 900, file=sys.stderr)

page = f'''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>The Domain · historia</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&amp;family=Geist+Mono:wght@400;500&amp;family=Instrument+Serif:ital@0;1&amp;family=Syne:wght@700;800&amp;display=swap">
<style>
{css}</style>
</helmet>
<div id="start" style="position: relative; background: #0B0B0B; color: #F3F2EE; font-family: Geist, ui-sans-serif, system-ui, sans-serif; overflow-x: clip">
{chrome}
<main style="position: relative; z-index: 1">
{chr(10).join(S)}
</main>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":8000}}}}'>
{js}</script>
</body>
</html>
'''
import json
fu = os.path.join(HERE, 'figurls.json')
if os.path.exists(fu):
    for k, v in json.load(open(fu)).items():
        page = page.replace('@@' + k + '@@', v)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'design-portfolio', 'project', 'Story.dc.html')
open(out, 'w').write(page)
print('wrote', out, len(page), file=sys.stderr)
