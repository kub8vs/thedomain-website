import random, math

MARK = "M0 0 H42 A42 42 0 0 1 42 84 H0 Z M26 22 L26 56.85 L34.61 49.06 L40.35 62.18 L45.68 59.92 L40.14 47.22 L51.42 47.22 Z"
CURSOR = "M0 0 L0 34.85 L8.61 27.06 L14.35 40.18 L19.68 37.92 L14.14 25.22 L25.42 25.22 Z"

DEFS = '''<svg width="0" height="0" style="position: absolute; width: 0; height: 0; overflow: hidden" aria-hidden="true" focusable="false"><defs>
<linearGradient id="tdChrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"></stop><stop offset=".32" stop-color="#8E8D88"></stop><stop offset=".52" stop-color="#F3F2EE"></stop><stop offset=".78" stop-color="#2E2E2C"></stop><stop offset="1" stop-color="#D9D7D0"></stop></linearGradient>
<linearGradient id="tdSide" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6E6D69"></stop><stop offset="1" stop-color="#1A1A19"></stop></linearGradient>
<radialGradient id="tdSky" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#4A4946"></stop><stop offset=".55" stop-color="#1B1B1A"></stop><stop offset="1" stop-color="#080808"></stop></radialGradient>
<linearGradient id="tdStone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3F2EE"></stop><stop offset=".55" stop-color="#A9A7A1"></stop><stop offset="1" stop-color="#3E3D3A"></stop></linearGradient>
<linearGradient id="tdFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0B0B"></stop><stop offset="1" stop-color="#1E1E1D"></stop></linearGradient>
<radialGradient id="tdGlow"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".6"></stop><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop></radialGradient>
<radialGradient id="tdFlame" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#FFFFFF"></stop><stop offset=".6" stop-color="#E9E7E1"></stop><stop offset="1" stop-color="#9C9B96" stop-opacity="0"></stop></radialGradient>
<filter id="tdSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"></feGaussianBlur></filter>
<filter id="tdSoft2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"></feGaussianBlur></filter>
<filter id="tdGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .14 0"></feColorMatrix></filter>
</defs></svg>'''


def svg_open():
    return '<svg viewBox="0 0 340 505" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style="display: block" aria-hidden="true">'


def grain():
    return '<rect width="340" height="505" filter="url(#tdGrain)"></rect>'


def fig1():
    r = random.Random(1)
    s = [svg_open(), '<rect width="340" height="505" fill="url(#tdSky)"></rect>']
    for (cx, cy, rx, ry, o) in [(60, 430, 120, 40, .35), (290, 450, 130, 46, .3), (170, 480, 200, 40, .4), (40, 300, 70, 20, .18), (300, 260, 80, 22, .16)]:
        s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#6E6D69" opacity="{o}" filter="url(#tdSoft)"></ellipse>')
    s.append('<ellipse cx="170" cy="330" rx="120" ry="120" fill="url(#tdGlow)" opacity=".35"></ellipse>')
    s.append('<rect x="118" y="404" width="104" height="34" fill="url(#tdStone)" opacity=".85"></rect><rect x="106" y="436" width="128" height="14" fill="#8E8D88"></rect>')
    s.append(f'<path d="{MARK}" fill="url(#tdStone)" fill-rule="evenodd" transform="translate(103 268) scale(1.62)"></path>')
    for i in range(16):
        t = i / 15
        x = 190 + t * 120 + r.uniform(-18, 18)
        y = 268 - t * 220 + r.uniform(-14, 14)
        sc = .55 - t * .32
        rot = -30 + r.uniform(-25, 25)
        s.append(f'<path d="{CURSOR}" fill="#F3F2EE" opacity="{.95 - t * .55:.2f}" transform="translate({x:.1f} {y:.1f}) rotate({rot:.0f}) scale({sc:.2f})"></path>')
    s.append(grain())
    s.append('</svg>')
    return ''.join(s)


def fig2():
    s = [svg_open(), '<rect width="340" height="505" fill="url(#tdFloor)"></rect>',
         '<polygon points="130,0 210,0 300,505 40,505" fill="#FFFFFF" opacity=".035"></polygon>']
    for r_ in range(8):
        t = r_ / 7
        y = 150 + 300 * (t ** 1.35)
        sc = .35 + .75 * t
        n = 7
        span = 220 + 200 * t
        for i in range(n):
            x = 170 - span / 2 + span * i / (n - 1)
            w, h = 30 * sc, 20 * sc
            special = (r_ == 4 and i == 3)
            if special:
                s.append(f'<ellipse cx="{x:.1f}" cy="{y - h/2:.1f}" rx="{w*1.6:.1f}" ry="{h*1.8:.1f}" fill="url(#tdGlow)"></ellipse>')
            fill = '#F3F2EE' if special else '#232322'
            s.append(f'<rect x="{x - w/2:.1f}" y="{y - h:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{1.5*sc:.1f}" fill="{fill}" stroke="#3A3A38" stroke-width=".6"></rect>')
            s.append(f'<rect x="{x - 1.2*sc:.1f}" y="{y:.1f}" width="{2.4*sc:.1f}" height="{6*sc:.1f}" fill="#2B2B29"></rect>')
            if special:
                s.append(f'<path d="{CURSOR}" fill="#0B0B0B" transform="translate({x - 2:.1f} {y - h + 3:.1f}) scale({.42*sc:.2f})"></path>')
    s.append(grain())
    s.append('</svg>')
    return ''.join(s)


def fig3():
    s = [svg_open(), '<rect width="340" height="505" fill="url(#tdSky)"></rect>']
    vx, vy = 170, 250
    for i in range(-8, 9):
        s.append(f'<line x1="{vx}" y1="{vy}" x2="{170 + i * 60}" y2="505" stroke="#3A3A38" stroke-width=".7"></line>')
    y = 330
    gap = 8
    while y < 505:
        s.append(f'<line x1="0" y1="{y:.1f}" x2="340" y2="{y:.1f}" stroke="#3A3A38" stroke-width=".7"></line>')
        gap *= 1.35
        y += gap
    s.append('<rect x="0" y="250" width="340" height="80" fill="#0B0B0B" opacity=".5" filter="url(#tdSoft)"></rect>')
    s.append('<ellipse cx="170" cy="250" rx="130" ry="150" fill="url(#tdGlow)" opacity=".55"></ellipse>')
    s.append('<ellipse cx="172" cy="424" rx="70" ry="10" fill="#000000" opacity=".7" filter="url(#tdSoft2)"></ellipse>')
    king = ('M118 420 H222 V406 Q222 398 213 396 H127 Q118 398 118 406 Z '
            'M131 396 Q139 380 148 372 Q151 332 146 302 H194 Q189 332 192 372 Q201 380 209 396 Z '
            'M139 302 H201 V290 H139 Z '
            'M149 290 Q139 252 158 238 H182 Q201 252 191 290 Z '
            'M165 238 V206 H156 V197 H165 V186 H175 V197 H184 V206 H175 V238 Z')
    s.append(f'<path d="{king}" fill="url(#tdStone)"></path>')
    s.append(grain())
    s.append('</svg>')
    return ''.join(s)


def fig4():
    r = random.Random(4)
    s = [svg_open(), '<rect width="340" height="505" fill="url(#tdSky)"></rect>',
         '<ellipse cx="240" cy="110" rx="90" ry="90" fill="url(#tdGlow)" opacity=".4"></ellipse>',
         '<path d="M150 330 C 150 250, 200 200, 236 132" fill="none" stroke="#F3F2EE" stroke-opacity=".5" stroke-width="1" stroke-dasharray="2 6"></path>']
    heads = []
    for row in range(9):
        t = row / 8
        y = 330 + 175 * (t ** 1.2)
        rad = 6 + 10 * t
        n = int(14 - 5 * t)
        for i in range(n + 1):
            x = -10 + (360 / n) * i + r.uniform(-8, 8)
            heads.append((y, x, rad))
    for (y, x, rad) in sorted(heads):
        c = r.choice(['#1B1B1A', '#222221', '#2A2A28', '#191918'])
        s.append(f'<ellipse cx="{x:.1f}" cy="{y + rad*2.1:.1f}" rx="{rad*1.9:.1f}" ry="{rad*1.3:.1f}" fill="{c}" stroke="#3A3A38" stroke-width=".5"></ellipse>')
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rad:.1f}" fill="{c}" stroke="#3A3A38" stroke-width=".5"></circle>')
    s.append('<g transform="translate(222 112) rotate(-18) scale(1.1)"><path d="M0 0 L62 19 L0 36 L12 19 Z" fill="#F3F2EE"></path><path d="M12 19 L62 19 L4 26 Z" fill="#A9A7A1"></path></g>')
    s.append(grain())
    s.append('</svg>')
    return ''.join(s)


def fig5():
    r = random.Random(5)
    s = [svg_open(), '<rect width="340" height="505" fill="url(#tdFloor)"></rect>',
         '<ellipse cx="160" cy="240" rx="120" ry="110" fill="url(#tdGlow)" opacity=".22"></ellipse>']
    # floating mails / invoices
    for i in range(9):
        x, y = r.uniform(20, 280), r.uniform(40, 260)
        rot = r.uniform(-30, 30)
        if i % 2:
            s.append(f'<g transform="translate({x:.0f} {y:.0f}) rotate({rot:.0f})" opacity="{r.uniform(.25,.6):.2f}"><rect width="34" height="22" rx="2" fill="none" stroke="#F3F2EE"></rect><path d="M0 1 L17 12 L34 1" fill="none" stroke="#F3F2EE"></path></g>')
        else:
            s.append(f'<g transform="translate({x:.0f} {y:.0f}) rotate({rot:.0f})" opacity="{r.uniform(.25,.55):.2f}"><rect width="24" height="32" rx="2" fill="none" stroke="#F3F2EE"></rect><path d="M5 9 H19 M5 15 H19 M5 21 H14" stroke="#F3F2EE"></path></g>')
    s.append('<g transform="translate(140 300) rotate(28) scale(1.15)"><path d="M0 0 L62 19 L0 36 L12 19 Z" fill="#F3F2EE"></path><path d="M12 19 L62 19 L4 26 Z" fill="#A9A7A1"></path></g>')
    for i in range(70):
        y0 = r.uniform(260, 520)
        pts = [(x, y0 + r.uniform(-60, 60)) for x in (-20, 90, 200, 360)]
        d = f'M{pts[0][0]} {pts[0][1]:.0f} C {pts[1][0]} {pts[1][1]:.0f}, {pts[2][0]} {pts[2][1]:.0f}, {pts[3][0]} {pts[3][1]:.0f}'
        s.append(f'<path d="{d}" fill="none" stroke="#F3F2EE" stroke-opacity="{r.uniform(.05,.28):.2f}" stroke-width="{r.uniform(.5,1.3):.1f}"></path>')
    s.append(grain())
    s.append('</svg>')
    return ''.join(s)


def fig6():
    r = random.Random(6)
    s = [svg_open(), '<rect width="340" height="505" fill="#070707"></rect>',
         '<ellipse cx="190" cy="215" rx="150" ry="150" fill="url(#tdGlow)" opacity=".45"></ellipse>']
    for i in range(5):
        x0 = 186 + r.uniform(-6, 6)
        d = f'M{x0:.0f} 170 C {x0-30:.0f} 130, {x0+30:.0f} 90, {x0-10:.0f} 40 S {x0+20:.0f} -10, {x0:.0f} -30'
        s.append(f'<path d="{d}" fill="none" stroke="#F3F2EE" stroke-opacity="{r.uniform(.06,.16):.2f}" stroke-width="{r.uniform(1,3):.1f}" filter="url(#tdSoft2)"></path>')
    s.append('<g transform="translate(186 236) rotate(24)"><rect x="-5" y="0" width="10" height="290" rx="2" fill="#8E8D88"></rect><rect x="-5" y="0" width="4" height="290" fill="#B5B3AD"></rect><ellipse cx="0" cy="2" rx="9" ry="13" fill="#2B2B29"></ellipse></g>')
    s.append('<path d="M186 228 C 160 200, 172 168, 186 138 C 200 168, 214 200, 186 228 Z" fill="url(#tdFlame)"></path>')
    s.append('<path d="M186 226 C 176 210, 180 194, 186 180 C 192 194, 196 210, 186 226 Z" fill="#FFFFFF"></path>')
    s.append(grain())
    s.append('</svg>')
    return ''.join(s)


FIGS = [fig1, fig2, fig3, fig4, fig5, fig6]


def hoodie(fill='url(#tdStone)'):
    return (f'<path d="M70 30 Q100 18 130 30 L168 48 Q178 54 182 66 L196 128 L170 136 L160 96 L160 190 Q100 200 40 190 L40 96 L30 136 L4 128 L18 66 Q22 54 32 48 Z" fill="{fill}"></path>'
            '<path d="M76 30 Q100 58 124 30" fill="none" stroke="#3E3D3A" stroke-width="3"></path>'
            '<path d="M70 120 H130 V150 H70 Z" fill="none" stroke="#3E3D3A" stroke-width="2"></path>')


def hall():
    r = random.Random(9)
    s = ['<svg viewBox="0 0 470 414" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style="display: block" aria-hidden="true">',
         '<rect width="470" height="414" fill="url(#tdFloor)"></rect>']
    for i, x in enumerate((40, 175, 310)):
        s.append(f'<path d="M{x} 300 V120 A60 60 0 0 1 {x+120} 120 V300" fill="#141413" stroke="#3A3A38" stroke-width="1.2"></path>')
        s.append(f'<path d="M{x+14} 300 V124 A46 46 0 0 1 {x+106} 124 V300" fill="none" stroke="#2B2B29"></path>')
    for x in (100, 235, 370):
        s.append(f'<line x1="{x}" y1="0" x2="{x}" y2="70" stroke="#5D5C58"></line>')
        s.append(f'<ellipse cx="{x}" cy="86" rx="46" ry="46" fill="url(#tdGlow)" opacity=".7"></ellipse>')
        for k in range(7):
            a = k / 6 * math.pi
            s.append(f'<circle cx="{x + 26*math.cos(a):.1f}" cy="{80 + 10*math.sin(a):.1f}" r="2.2" fill="#FFFFFF"></circle>')
        s.append(f'<path d="M{x-28} 80 Q{x} 104 {x+28} 80" fill="none" stroke="#D9D7D0" stroke-width="1"></path>')
    for row in range(4):
        t = row / 3
        y = 300 + 95 * t
        n = 4 + row
        for i in range(n):
            x = 470 * (i + .5) / n
            rx = 22 + 18 * t
            s.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx:.0f}" ry="{rx*.32:.0f}" fill="#E9E7E1" opacity="{.12 + .2*t:.2f}"></ellipse>')
    s.append('<rect width="470" height="414" fill="url(#tdFloor)" opacity=".25"></rect>')
    s.append('<rect width="470" height="414" filter="url(#tdGrain)"></rect>')
    s.append('</svg>')
    return ''.join(s)
