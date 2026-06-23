# -*- coding: utf-8 -*-
# 같은 열(x겹침) 텍스트 박스를 1개 프레임으로 병합 + 문단간격(spcBef)으로 균일 간격
# + 이미지 밀기/축소. 번역(trans.py) 후 실행.
import sys, os
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass
import re, math

LANG = os.environ.get('OSMU_LANG', 'en').lower()

EMU_PT = 12700
SLIDE_H = 6858000
MARGIN  = 150000
GUTTER  = 120000
# 평균 글자폭(em). 라틴=좁음(0.55), CJK(中/日)=전각이라 1글자≈1em.
#   텍스트 간격은 spcBef 가 정확히 처리하므로 CW 는 이미지 리플로우(R4/R5)·축소 판정에만 영향.
CW      = {'en': 0.55, 'zh': 1.0, 'ja': 1.0}.get(LANG, 0.55)
LH      = 1.2
SPCBEF_PT = 10           # 텍스트 블록 사이 고정 간격(pt) — 모든 슬라이드 동일
FONT_FLOOR = 0.78
IMG_FLOOR  = 0.80

def attr(b, tag):
    return re.search(tag, b)

def block_info(b):
    off = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>', b)
    ext = re.search(r'<a:ext cx="(\d+)" cy="(\d+)"/>', b)
    if not off or not ext: return None
    is_text = '<a:t>' in b
    pid = re.search(r'<p:cNvPr id="(\d+)"', b)
    d = dict(x=int(off.group(1)), y=int(off.group(2)),
             cx=int(ext.group(1)), cy=int(ext.group(2)),
             is_text=is_text, id=(int(pid.group(1)) if pid else 0))
    if is_text:
        body = re.search(r'<p:txBody>(.*?)</p:txBody>', b, re.S).group(1)
        # bodyPr + lstStyle + paras
        pre = re.search(r'^(.*?<a:lstStyle/>)', body, re.S).group(1)
        paras = body[len(pre):]
        d['pre'] = pre
        d['paras'] = paras
        # 문단별 (len, font)
        plist = []
        for p in re.findall(r'<a:p>(.*?)</a:p>', paras, re.S):
            t = ''.join(re.findall(r'<a:t>(.*?)</a:t>', p, re.S)).strip()
            fonts = [int(z)/100 for z in re.findall(r'sz="(\d+)"', p)]
            if t: plist.append((len(t), max(fonts) if fonts else 24))
        d['plist'] = plist
    return d

def overlaps_x(a, b):
    return not (a['x']+a['cx'] <= b['x'] or b['x']+b['cx'] <= a['x'])

def group_height_emu(group, tscale):
    """병합 그룹의 추정 텍스트 높이(EMU)"""
    total_pt = 0.0
    for box in group:
        wpt = box['cx'] / EMU_PT
        for (ln, f) in box['plist']:
            fs = f * tscale
            cpl = max(1, wpt / (fs * CW))
            lines = max(1, math.ceil(ln / cpl))
            total_pt += lines * fs * LH
    total_pt += (len(group) - 1) * SPCBEF_PT      # 박스 경계 간격
    return int(total_pt * EMU_PT)

def add_spcbef(paras):
    """paras 문자열의 첫 <a:p> 에 spcBef 삽입"""
    return paras.replace('<a:p>', f'<a:p><a:pPr><a:spcBef><a:spcPts val="{SPCBEF_PT*100}"/></a:spcBef></a:pPr>', 1)

for n in range(1, 13):
    path = f'ppt/slides/slide{n}.xml'
    s = open(path, encoding='utf-8').read()
    blocks = []
    for m in re.finditer(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>', s, re.S):
        info = block_info(m.group(0))
        if info:
            info['start'], info['end'], info['raw'] = m.start(), m.end(), m.group(0)
            blocks.append(info)

    texts = [b for b in blocks if b['is_text']]
    pics  = [b for b in blocks if not b['is_text']]

    # --- 텍스트 x겹침 그룹핑 (y순) ---
    groups = []
    for t in sorted(texts, key=lambda b: b['y']):
        placed = False
        for g in groups:
            if any(overlaps_x(t, x) for x in g):
                g.append(t); placed = True; break
        if not placed:
            groups.append([t])

    # --- 부담분담: tscale 1.0부터, 넘치면 축소 ---
    def layout(tscale):
        gh = {}
        for g in groups:
            top = min(g, key=lambda b: b['y'])
            gh[id(g)] = (top, top['y'] + group_height_emu(g, tscale))
        # 이미지 위치
        img = {}
        overflow = 0
        for p in pics:
            ny = p['y']
            for g in groups:
                top, bottom = gh[id(g)]
                if overlaps_x(top, p) and top['y'] <= p['y'] + 1:
                    ny = max(ny, bottom + GUTTER)
            ncx, ncy, nx = p['cx'], p['cy'], p['x']
            if ny + ncy > SLIDE_H - MARGIN:
                avail = (SLIDE_H - MARGIN) - ny
                f = avail / p['cy']
                if f < IMG_FLOOR:
                    overflow = max(overflow, (ny+ncy)-(SLIDE_H-MARGIN)); f = IMG_FLOOR
                ncx, ncy = int(p['cx']*f), int(p['cy']*f); nx = p['x'] + (p['cx']-ncx)//2
            img[p['id']] = (nx, ny, ncx, ncy)
        for g in groups:
            top, bottom = gh[id(g)]
            overflow = max(overflow, bottom - (SLIDE_H - MARGIN))
        return gh, img, overflow

    tscale = 1.0
    while True:
        gh, img, ov = layout(tscale)
        if ov <= 0 or tscale <= FONT_FLOOR: break
        tscale = round(tscale - 0.04, 2)

    # --- 슬라이드 재구성 (뒤에서부터) ---
    del_ids = set()
    for g in groups:
        if len(g) > 1:
            for child in sorted(g, key=lambda b: b['y'])[1:]:
                del_ids.add(child['id'])

    for b in sorted(blocks, key=lambda b: b['start'], reverse=True):
        if b['is_text'] and b['id'] in del_ids:
            s = s[:b['start']] + s[b['end']:]      # 병합되어 삭제
            continue
        nb = b['raw']
        if b['is_text']:
            # 이 박스가 그룹의 top 이면 병합
            g = next(g for g in groups if b in g)
            top = min(g, key=lambda x: x['y'])
            if b['id'] == top['id'] and len(g) > 1:
                merged_paras = top['paras']
                for child in sorted(g, key=lambda x: x['y'])[1:]:
                    merged_paras += add_spcbef(child['paras'])
                new_body = top['pre'] + merged_paras
                nb = re.sub(r'<p:txBody>.*?</p:txBody>', '<p:txBody>'+new_body+'</p:txBody>', nb, flags=re.S)
            # autofit: 축소 필요시 normAutofit, 아니면 spAutoFit 유지
            if tscale < 1.0:
                _, bottom = gh[id(g)]
                fs = int(round(tscale*100000)); lnr = 10000
                af = f'<a:normAutofit fontScale="{fs}" lnSpcReduction="{lnr}"/>'
                nb = nb.replace('<a:spAutoFit/>', af)
        else:
            nx, ny, ncx, ncy = img[b['id']]
            nb = re.sub(r'<a:off x="-?\d+" y="-?\d+"/>', f'<a:off x="{nx}" y="{ny}"/>', nb, count=1)
            nb = re.sub(r'<a:ext cx="\d+" cy="\d+"/>', f'<a:ext cx="{ncx}" cy="{ncy}"/>', nb, count=1)
        s = s[:b['start']] + nb + s[b['end']:]

    open(path, 'w', encoding='utf-8').write(s)
    print(f"slide{n}: groups={[len(g) for g in groups]} merged_del={sorted(del_ids)} tscale={tscale}")

print("DONE")
