#!/usr/bin/env python3
"""Build the 12 self-contained SVG choices and six desktop PNG previews."""
from html import escape
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent
DARK, WHITE, ORANGE, GRAY, PURPLE = '#030D11', '#FFFFFF', '#FF6B00', '#B6B6B6', '#4B00D7'
SANS = 'Manrope, Arial, Helvetica, sans-serif'
MONO = 'Menlo, Consolas, Liberation Mono, monospace'
# Preserve official path elements byte-for-byte. Only uniform scale/translation.
LOGO = re.search(r'<svg\b[^>]*>(.*?)</svg>', (ASSETS / 'brand/darktrace/Darktrace-white.svg').read_text(), re.S)[1].strip()
COPY = {
    'en': {
        'notice': 'Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace.',
        'eyebrow': 'Unofficial MCP.',
        'taglines': ['Bounded investigations.', 'Access under your control.'],
        'operator': ['Preview first.', 'Keep the final say.'],
        'caption': ['INDEPENDENT THIRD-PARTY PROJECT', 'NOT AFFILIATED WITH OR AUTHORIZED BY DARKTRACE'],
        'mobile_caption': ['INDEPENDENT THIRD-PARTY', 'PROJECT', 'NOT AFFILIATED WITH OR', 'AUTHORIZED BY DARKTRACE'],
        'meta': 'STDIO / READ BY DEFAULT',
        'terminal': 'OPERATOR / SYNTHETIC EXAMPLE',
        'confirm': 'same arguments + previewId → confirm: true',
        'prompt': 'darktrace requests your input',
        'accept': 'Accept', 'decline': 'Decline',
    },
    'es': {
        'notice': 'MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace.',
        'eyebrow': 'MCP no oficial.',
        'taglines': ['Investigación acotada.', 'Acceso bajo tu control.'],
        'operator': ['Primero, previsualiza.', 'Tú tienes la última palabra.'],
        'caption': ['PROYECTO INDEPENDIENTE DE UN TERCERO', 'SIN AFILIACIÓN NI AUTORIZACIÓN DE DARKTRACE'],
        'mobile_caption': ['PROYECTO INDEPENDIENTE', 'DE UN TERCERO', 'SIN AFILIACIÓN NI', 'AUTORIZACIÓN DE DARKTRACE'],
        'meta': 'STDIO / LECTURA POR DEFECTO',
        'terminal': 'OPERADOR / EJEMPLO SINTÉTICO',
        'confirm': 'mismos argumentos + previewId → confirm: true',
        'prompt': 'darktrace solicita tu respuesta',
        'accept': 'Aceptar', 'decline': 'Rechazar',
    },
}


def text(x, y, value, size=24, fill=WHITE, mono=False, tracking=None):
    track = '' if tracking is None else f' letter-spacing="{tracking}"'
    return f'<text x="{x}" y="{y}" font-family="{MONO if mono else SANS}" font-size="{size}" font-weight="400" fill="{fill}"{track}>{escape(value)}</text>'


def rect(x, y, w, h, fill=DARK, **attrs):
    extra = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" {extra}/>'


def line(x1, y1, x2, y2, color=GRAY, opacity=1, width=1):
    return f'<path d="M{x1} {y1}H{x2}" stroke="{color}" opacity="{opacity}" stroke-width="{width}"/>' if y1 == y2 else f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{color}" opacity="{opacity}" stroke-width="{width}"/>'


def footer(c, mobile, split=False):
    x = 40 if mobile else (704 if split else 64)
    top = 662 if mobile else 436
    # Solid substrate protects the complete mark and its 30.24-unit clear space.
    out = [rect(0 if mobile else (640 if split else 0), top, 640 if mobile or split else 1280, (900 if mobile else 600)-top)]
    out.append(line(x, top, 600 if mobile else 1216, top, GRAY, .35))
    if mobile:
        for i, value in enumerate(c['mobile_caption']):
            out.append(text(x, 698+i*28, value, 24, GRAY, True))
    else:
        for i, value in enumerate(c['caption']):
            out.append(text(x, 468+i*24, value, 16, GRAY, True))
    y = 832 if mobile else 528
    out.append(f'<g data-official-wordmark="unmodified" transform="translate({x} {y}) scale(0.48)">{LOGO}</g>')
    if not mobile and not split:
        out.append(text(812, 544, c['meta'], 19, GRAY, True))
    return ''.join(out)


def network(mobile):
    out = ['<g aria-hidden="true">']
    # Original decorative graph; not an appliance topology or an official Trace.
    if mobile:
        out.append('<g transform="translate(128 418) scale(0.62)">')
    else:
        out.append('<g transform="translate(645 0)">')
    out.append('<defs><radialGradient id="network-glow"><stop stop-color="#4B00D7" stop-opacity=".46"/><stop offset="1" stop-color="#4B00D7" stop-opacity="0"/></radialGradient></defs>')
    out.append('<ellipse cx="310" cy="210" rx="320" ry="245" fill="url(#network-glow)"/>')
    for radius in (85, 145, 210, 275):
        out.append(f'<circle cx="310" cy="210" r="{radius}" fill="none" stroke="{PURPLE}" stroke-width="2" opacity=".65" stroke-dasharray="{radius*2} 18 4 14"/>')
    points = [(50, 110), (185, 70), (345, 58), (510, 125), (548, 275), (410, 356), (245, 326), (95, 268), (310, 210)]
    for a, b in [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,0),(1,8),(3,8),(5,8),(7,8),(2,8),(6,8)]:
        x,y=points[a]; xx,yy=points[b]
        out.append(line(x,y,xx,yy,WHITE,.17,1.5))
    for i,(x,y) in enumerate(points):
        color = ORANGE if i == 8 else WHITE
        out.append(f'<circle cx="{x}" cy="{y}" r="{8 if i==8 else 4}" fill="{color}" opacity="{1 if i==8 else .72}"/>')
        out.append(f'<circle cx="{x}" cy="{y}" r="{20 if i==8 else 12}" fill="none" stroke="{color}" opacity=".26"/>')
    out.append('</g></g>')
    return ''.join(out)


def terminal(c, mobile):
    x,y,w,h = (32,270,576,372) if mobile else (560,42,656,376)
    out = [rect(x,y,w,h,DARK,rx=12,stroke=GRAY,stroke_opacity='.5')]
    out.append(line(x,y+44,x+w,y+44,GRAY,.3))
    out.append(rect(x+20,y+19,7,7,ORANGE))
    out.append(text(x+40,y+28,c['terminal'],18 if mobile else 16,GRAY,True))
    code = [
        '> darktrace_antigena_action',
        '{ "operation": "post_antigena",',
        '  "dryRun": true,',
        '  "body": { "codeid": 1,',
        '    "activate": true, "duration": 60,',
        '    "reason": "demo" } }',
    ]
    size = 23 if mobile else 22
    for i,s in enumerate(code):
        out.append(text(x+22,y+78+i*27,s,size,ORANGE if i==0 else WHITE,True))
    out.append(line(x+22,y+232,x+w-22,y+232,GRAY,.28))
    if mobile:
        bridge = 'mismos argumentos + previewId' if c is COPY['es'] else 'same arguments + previewId'
        out.append(text(x+22,y+258,bridge,21,GRAY,True))
        out.append(text(x+22,y+283,'→ confirm: true',21,ORANGE,True))
        out.append(text(x+22,y+314,c['prompt'],23,WHITE,True))
        by=y+343
    else:
        out.append(text(x+22,y+264,c['confirm'],20,GRAY,True))
        out.append(text(x+22,y+301,c['prompt'],23,WHITE,True))
        by=y+341
    out.append(text(x+22,by,f'[ {c["accept"]} ]',23,GRAY,True))
    out.append(rect(x+207,by-25,190,35,ORANGE,rx=3))
    out.append(text(x+222,by,f'> {c["decline"]}',23,DARK,True))
    return ''.join(out)


def build(variant, lang, mobile):
    c = COPY[lang]
    width,height = (640,900) if mobile else (1280,600)
    motif = ({'a':'Minimal typographic composition.', 'b':'Original decorative node-link graph and radar rings.', 'c':'Illustrative synthetic MCP tool call, followed by confirmation and a human input prompt; not a screenshot or executed request.'} if lang == 'en' else {'a':'Composición tipográfica mínima.', 'b':'Grafo decorativo original con nodos, enlaces y anillos de radar.', 'c':'Ejemplo sintético de una llamada MCP, seguida de confirmación y una solicitud de aprobación humana; no es una captura ni una petición ejecutada.'})[variant]
    logo_notice = 'The official wordmark identifies the integrated product only; no endorsement or official status is implied.' if lang == 'en' else 'El logotipo oficial solo identifica el producto integrado; no implica respaldo ni carácter oficial.'
    label = 'Variant' if lang == 'en' else 'Variante'
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title description" xml:lang="{lang}">',
           f'<title id="title">Darktrace MCP — {escape(c["eyebrow"])} {label} {variant.upper()}</title>',
           f'<desc id="description">{escape(c["notice"])} {motif} {logo_notice}</desc>',
           rect(0,0,width,height)]
    x = 40 if mobile else 64
    if variant == 'a':
        out.append(text(x,82 if mobile else 84,c['eyebrow'],26 if mobile else 22,ORANGE,True))
        if mobile:
            out += [text(x,220,'Darktrace',100,tracking=-4),text(x,350,'MCP.',136,tracking=-5.44)]
            out.append(line(x,400,600,400,ORANGE,1,2))
            for i,s in enumerate(c['taglines']):out.append(text(x,474+i*46,s,34,tracking=-.68))
            out.append(text(x,600,c['meta'],22,GRAY,True))
        else:
            out.append(text(x,250,'Darktrace MCP.',126,tracking=-5.04))
            out.append(line(x,296,1216,296,ORANGE,1,2))
            out.append(text(x,367,' '.join(c['taglines']),36,tracking=-.72))
        out.append(footer(c,mobile))
    elif variant == 'b':
        out.append(network(mobile))
        out.append(rect(0,0,640,430 if mobile else 600,WHITE))
        out.append(rect(x,56 if mobile else 62,8,8,ORANGE))
        out.append(text(x+22,66 if mobile else 73,c['eyebrow'],24 if mobile else 22,DARK,True))
        out.append(text(x,162 if mobile else 183,'Darktrace',90 if mobile else 96,DARK,tracking=-3.84))
        out.append(text(x,266 if mobile else 300,'MCP.',112 if mobile else 126,DARK,tracking=-4.8))
        for i,s in enumerate(c['taglines']):out.append(text(x,336+i*39 if mobile else 365+i*39,s,31,DARK,tracking=-.62))
        if not mobile:
            out.append(line(x,436,576,436,GRAY,.7))
            out.append(text(x,544,c['meta'],20,DARK,True))
        out.append(footer(c,mobile,split=True))
    else:
        out.append(text(x,66 if mobile else 75,c['eyebrow'],24 if mobile else 22,ORANGE,True))
        if mobile:
            out.append(text(x,151,'Darktrace MCP.',62,tracking=-2.48))
            out.append(text(x,212,c['operator'][0],32,GRAY,tracking=-.64))
        else:
            out += [text(x,183,'Darktrace',80,tracking=-3.2),text(x,277,'MCP.',110,tracking=-4.4)]
            for i,s in enumerate(c['operator']):out.append(text(x,347+i*38,s,28,GRAY,tracking=-.56))
        out.append(terminal(c,mobile))
        out.append(footer(c,mobile))
    out.append('</svg>')
    return '\n'.join(out)+'\n'


def main():
    for variant in 'abc':
        for lang in COPY:
            for mobile in (False,True):
                name = f'readme-banner-{lang}{"-mobile" if mobile else ""}.svg'
                path=HERE/variant/name
                svg=build(variant,lang,mobile)
                ET.fromstring(svg)
                assert LOGO in svg
                assert len(svg.encode()) <= 150_000
                path.write_text(svg)
                if not mobile:
                    subprocess.run(['rsvg-convert','-o',str(HERE/'preview'/f'{variant}-{lang}.png'),str(path)],check=True)
    print('Generated 12 SVGs and 6 desktop PNG previews.')


if __name__ == '__main__':
    main()
