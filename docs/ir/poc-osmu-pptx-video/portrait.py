# -*- coding: utf-8 -*-
# portrait.py — 16:9 가로 → 9:16 세로 변환 (IR §8.2 비율 선택 / §10.3 배경 크롭 우선)
#   1) presentation.xml sldSz 를 세로(6858000 x 12192000)로
#   2) 배경(<p:bg> blipFill) 를 중앙 크롭(<a:srcRect>) — 별도 이미지 제작 없이 9:16 채움(§10.3)
#   3) 전경 리플로우 — 상단 텍스트(풀폭) + 하단 제품이미지 세로 스택
#   대원칙: 최대한 자동 배치, 미세조정은 사용자 몫(§10.7).
#   파이프라인: trans → merge → portrait → inject_dyn → repack
import sys, os, re, math
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass

LANG = os.environ.get('OSMU_LANG', 'en').lower()
CW = {'en': 0.55, 'zh': 1.0, 'ja': 1.0, 'vi': 0.55, 'id': 0.55, 'th': 0.55}.get(LANG, 0.55)

EMU_PT = 12700
PW, PH = 6858000, 12192000          # 9:16 세로 (7.5in x 13.333in)
MARGIN = 411480                     # 0.45in 좌우 여백
CONTENT_W = PW - 2 * MARGIN         # 전경 폭
TOPM = 520000                       # 상단 여백
BOTM = 460000                       # 하단 여백
GAP  = 230000                       # 블록 사이 간격
IMG_MAX_UP = 1.5                    # 이미지 업스케일 상한(원본 대비)
LH = 1.2

# 배경 중앙 크롭: 16:9(1.778) 소스 → 9:16(0.5625) 프레임 cover.
# 유지 폭비 = 0.5625/1.778 = 0.3164 → 좌우 각 (1-0.3164)/2 = 34.18% 크롭. 단위 1000=1%.
SRC_CROP = 34180

def eff_width(t):
    w = 0.0
    for ch in t:
        o = ord(ch)
        full = (0x2E80 <= o <= 0x9FFF or 0xAC00 <= o <= 0xD7A3 or
                0xF900 <= o <= 0xFAFF or 0x3000 <= o <= 0x30FF or 0xFF00 <= o <= 0xFFEF)
        w += 1.0 if full else 0.55
    return w

def est_text_h(raw, width_emu):
    """주어진 폭에서 텍스트 프레임의 추정 높이(EMU)."""
    body = re.search(r'<p:txBody>(.*?)</p:txBody>', raw, re.S)
    if not body:
        return 600000
    wpt = width_emu / EMU_PT - 14.4   # 좌우 inset
    total_pt = 0.0
    for p in re.findall(r'<a:p>(.*?)</a:p>', body.group(1), re.S):
        if '<a:t>' not in p:
            continue
        szs = re.findall(r'sz="(\d+)"', p)
        fs = max(int(z) / 100 for z in szs) if szs else 24
        cpl = max(1.0, wpt / (fs * CW))
        lines = 0
        for sg in re.split(r'<a:br\b.*?</a:br>|<a:br\b[^>]*/>', p, flags=re.S):
            st = ''.join(re.findall(r'<a:t>(.*?)</a:t>', sg, re.S)).strip()
            if not st:
                continue
            lines += max(1, math.ceil(eff_width(st) / cpl))
        if lines == 0:
            lines = 1
        spcb = re.search(r'<a:spcBef>.*?val="(\d+)"', p, re.S)
        sb = (int(spcb.group(1)) / 100) if spcb else 0
        total_pt += sb + lines * fs * LH
    total_pt += 7.2   # body 상하 inset
    return int(total_pt * EMU_PT)

def set_geo(raw, x, y, cx, cy):
    raw = re.sub(r'<a:off x="-?\d+" y="-?\d+"/>', f'<a:off x="{int(x)}" y="{int(y)}"/>', raw, count=1)
    raw = re.sub(r'<a:ext cx="\d+" cy="\d+"/>', f'<a:ext cx="{int(cx)}" cy="{int(cy)}"/>', raw, count=1)
    return raw

# ── 1) presentation.xml: 슬라이드 크기 세로 ──
pp = open('ppt/presentation.xml', encoding='utf-8').read()
pp = re.sub(r'<p:sldSz[^/]*/>', f'<p:sldSz cx="{PW}" cy="{PH}"/>', pp)
open('ppt/presentation.xml', 'w', encoding='utf-8').write(pp)

for n in range(1, 13):
    path = f'ppt/slides/slide{n}.xml'
    s = open(path, encoding='utf-8').read()

    # ── 2) 배경 중앙 크롭 (빈 <a:srcRect/> → 크롭) ──
    s = re.sub(r'<p:bg>.*?</p:bg>',
               lambda m: m.group(0).replace('<a:srcRect/>', f'<a:srcRect l="{SRC_CROP}" r="{SRC_CROP}"/>'),
               s, flags=re.S)

    # ── 3) 전경 수집 ──
    blocks = []
    for m in re.finditer(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>', s, re.S):
        b = m.group(0)
        off = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>', b)
        ext = re.search(r'<a:ext cx="(\d+)" cy="(\d+)"/>', b)
        if not off or not ext:
            continue
        blocks.append(dict(start=m.start(), end=m.end(), raw=b,
                           x=int(off.group(1)), y=int(off.group(2)),
                           cx=int(ext.group(1)), cy=int(ext.group(2)),
                           is_text=('<a:t>' in b)))
    if not blocks:
        open(path, 'w', encoding='utf-8').write(s)
        continue
    blocks.sort(key=lambda d: d['y'])   # 읽기 순서(위→아래)

    texts = [b for b in blocks if b['is_text']]
    pics  = [b for b in blocks if not b['is_text']]

    # ── 세로 흐름 배치: 상단 텍스트(풀폭) → 하단 이미지 스택 ──
    # 1차: 각 블록 목표 크기 산정
    layout = []   # (block, x, cx, h)
    for b in texts:
        h = est_text_h(b['raw'], CONTENT_W)
        layout.append([b, MARGIN, CONTENT_W, h])
    img_specs = []
    for b in pics:
        scale = CONTENT_W / b['cx']
        scale = min(scale, IMG_MAX_UP)          # 과도 업스케일 방지
        ncx = int(b['cx'] * scale); ncy = int(b['cy'] * scale)
        nx = MARGIN + (CONTENT_W - ncx) // 2     # 가로 중앙
        img_specs.append([b, nx, ncx, ncy])

    # 2차: 총 높이 점검 → 이미지 과다 시 축소
    text_h = sum(l[3] for l in layout)
    img_h  = sum(sp[3] for sp in img_specs)
    n_blocks = len(layout) + len(img_specs)
    avail = PH - TOPM - BOTM - max(0, n_blocks - 1) * GAP
    if text_h + img_h > avail and img_h > 0:
        f = max(0.45, (avail - text_h) / img_h)   # 이미지만 축소(텍스트 보존), 하한 45%
        for sp in img_specs:
            sp[2] = int(sp[2] * f); sp[3] = int(sp[3] * f)
            sp[1] = MARGIN + (CONTENT_W - sp[2]) // 2

    # 3차: y 커서로 순차 배치(텍스트 먼저, 이미지 그 아래)
    new_pos = {}   # id(block) -> (x,y,cx,cy)
    cur = TOPM
    for (b, x, cx, h) in layout:
        new_pos[id(b)] = (x, cur, cx, h)
        cur += h + GAP
    for (b, x, cx, cy) in img_specs:
        new_pos[id(b)] = (x, cur, cx, cy)
        cur += cy + GAP

    # ── 4) 슬라이드 재기록(뒤에서부터) ──
    for b in sorted(blocks, key=lambda d: d['start'], reverse=True):
        x, y, cx, cy = new_pos[id(b)]
        nb = b['raw']
        if b['is_text']:
            # 폭만 새로 지정(높이는 spAutoFit 유지 → 위치/폭만 강제). off+ext 둘 다 설정.
            nb = set_geo(nb, x, y, cx, cy)
        else:
            nb = set_geo(nb, x, y, cx, cy)
        s = s[:b['start']] + nb + s[b['end']:]

    open(path, 'w', encoding='utf-8').write(s)
    print(f"slide{n}: texts={len(texts)} pics={len(pics)} bottom={cur/914400:.1f}in (<=13.3)")

print("DONE portrait 9:16")
