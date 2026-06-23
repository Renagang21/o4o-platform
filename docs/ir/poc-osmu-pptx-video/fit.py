# -*- coding: utf-8 -*-
import sys
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass
import re, math

EMU_PT = 12700
SLIDE_H = 6858000
MARGIN  = 150000
GUTTER  = 120000          # 텍스트↔이미지 간격
EN_CW   = 0.55            # 영어 평균 글자폭(실측 캘리브레이션: slide6=3줄/slide11=3줄 일치)
LH      = 1.2
GAP_TEXT = 120000         # 텍스트 블록 사이 "정의된 고정 간격"(≈9.4pt) — 고르게
FONT_FLOOR = 0.78
IMG_FLOOR  = 0.80

def parse_block(b):
    off = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>', b)
    ext = re.search(r'<a:ext cx="(\d+)" cy="(\d+)"/>', b)
    if not off or not ext: return None
    fonts = [int(z)/100 for z in re.findall(r'sz="(\d+)"', b)]
    paras = []
    for p in re.findall(r'<a:p>(.*?)</a:p>', b, re.S):
        t = ''.join(re.findall(r'<a:t>(.*?)</a:t>', p, re.S)).strip()
        if t: paras.append(len(t))
    return dict(x=int(off.group(1)), y=int(off.group(2)),
                cx=int(ext.group(1)), cy=int(ext.group(2)),
                is_text='<a:t>' in b, font=(max(fonts) if fonts else 0), paras=paras)

def text_h_emu(cx, font, paras):
    w_pt = cx / EMU_PT
    cpl = max(1, w_pt / (font * EN_CW))
    lines = sum(max(1, math.ceil(n / cpl)) for n in paras)
    return int(lines * font * LH * EMU_PT), lines

def overlaps_x(a, b):
    return not (a['x']+a['cx'] <= b['x'] or b['x']+b['cx'] <= a['x'])

def layout_slide(spans, tscale):
    """tscale: 슬라이드 전체 텍스트 폰트 배율. 반환: 최대 하단 초과량(>0이면 슬라이드 넘침)"""
    texts = sorted([g for g in spans if g['is_text'] and g['font'] > 0], key=lambda g: g['y'])
    for g in spans:                      # 원위치 복원
        g['ny'], g['nx'], g['ncx'], g['ncy'] = g['y'], g['x'], g['cx'], g['cy']
    processed = []
    for T in texts:
        f = T['font'] * tscale
        # R9: 위에서 x겹치는 텍스트의 실제 끝 + 간격 아래로 흐름 배치
        cands = [p for p in processed if overlaps_x(p, T)]
        anchor = T['y']
        for p in cands:
            anchor = max(anchor, p['ny'] + p['_h'] + GAP_TEXT)   # 모든 텍스트 블록 동일 간격
        T['ny'] = anchor
        T['_h'], T['_lines'] = text_h_emu(T['cx'], f, T['paras'])
        T['_scale'] = tscale
        processed.append(T)
    # 이미지: 위에서 x겹치는 텍스트 끝 아래로 밀기 + 슬라이드 벗어나면 축소
    overflow = 0
    for g in spans:
        if g['is_text']: continue
        above = [t for t in texts if overlaps_x(t, g) and t['ny'] <= g['y'] + 1]
        if above:
            req = max(t['ny'] + t['_h'] for t in above) + GUTTER
            if g['ny'] < req: g['ny'] = req
        bottom = g['ny'] + g['ncy']
        if bottom > SLIDE_H - MARGIN:
            avail = (SLIDE_H - MARGIN) - g['ny']
            f = avail / g['ncy']
            if f < IMG_FLOOR:
                overflow = max(overflow, bottom - (SLIDE_H - MARGIN)); f = IMG_FLOOR
            nc_x = int(g['ncx'] * f); nc_y = int(g['ncy'] * f)
            g['nx'] += (g['ncx'] - nc_x)//2
            g['ncx'], g['ncy'] = nc_x, nc_y
    # 텍스트 자체가 슬라이드 넘치는지
    for t in texts:
        overflow = max(overflow, (t['ny'] + t['_h']) - (SLIDE_H - MARGIN))
    return overflow

for n in range(1, 13):
    path = f'ppt/slides/slide{n}.xml'
    s = open(path, encoding='utf-8').read()
    spans = []
    for m in re.finditer(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>', s, re.S):
        g = parse_block(m.group(0))
        if g:
            g['start'], g['end'] = m.start(), m.end()
            spans.append(g)

    # 부담 분담: 텍스트 1.0부터, 넘치면 단계 축소(이미지는 매번 축소 시도됨)
    tscale = 1.0
    while True:
        ov = layout_slide(spans, tscale)
        if ov <= 0 or tscale <= FONT_FLOOR: break
        tscale = round(tscale - 0.04, 2)

    for g in sorted(spans, key=lambda g: g['start'], reverse=True):
        b = s[g['start']:g['end']]; nb = b
        nb = re.sub(r'<a:off x="-?\d+" y="-?\d+"/>', f'<a:off x="{g["nx"]}" y="{g["ny"]}"/>', nb, count=1)
        if g['is_text'] and g['font'] > 0:
            ncy = int(g['_h'] * 1.12)
            nb = re.sub(r'<a:ext cx="\d+" cy="\d+"/>', f'<a:ext cx="{g["cx"]}" cy="{ncy}"/>', nb, count=1)
            fs = int(round(g['_scale'] * 100000))
            lnr = 10000 if g['_scale'] < 0.9 else 0
            af = f'<a:normAutofit fontScale="{fs}" lnSpcReduction="{lnr}"/>'
            if '<a:spAutoFit/>' in nb: nb = nb.replace('<a:spAutoFit/>', af)
            elif '<a:normAutofit' in nb: nb = re.sub(r'<a:normAutofit[^/]*/>', af, nb)
        else:
            nb = re.sub(r'<a:ext cx="\d+" cy="\d+"/>', f'<a:ext cx="{g["ncx"]}" cy="{g["ncy"]}"/>', nb, count=1)
        s = s[:g['start']] + nb + s[g['end']:]

    open(path, 'w', encoding='utf-8').write(s)
    texts = [g for g in spans if g['is_text'] and g['font']>0]
    print(f"slide{n}: tscale={tscale} 제목줄수={[t.get('_lines') for t in sorted(texts,key=lambda x:x['y'])]}")

print("DONE")
