# -*- coding: utf-8 -*-
import sys
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass
import re, math

EMU_PER_PT = 12700

def analyze(n):
    s = open(f'ppt/slides/slide{n}.xml', encoding='utf-8').read()
    rows = []
    # 텍스트 박스(p:sp 중 txBody 보유)만
    for sp in re.findall(r'<p:sp>.*?</p:sp>', s, re.S):
        if '<a:t>' not in sp: continue
        cx = re.search(r'<a:ext cx="(\d+)" cy="(\d+)"/>', sp)
        sz = re.search(r'sz="(\d+)"', sp)
        if not cx or not sz: continue
        width_pt = int(cx.group(1)) / EMU_PER_PT
        font_pt = int(sz.group(1)) / 100
        autofit = 'spAutoFit' if '<a:spAutoFit/>' in sp else ('normAutofit' if 'normAutofit' in sp else 'none')
        # 문단별 영어 텍스트
        for para in re.findall(r'<a:p>(.*?)</a:p>', sp, re.S):
            txt = ''.join(re.findall(r'<a:t>(.*?)</a:t>', para, re.S)).strip()
            if not txt: continue
            # 영어: 평균 글자폭 ≈ 0.50 em
            chars_per_line = max(1, width_pt / (font_pt * 0.50))
            en_lines = math.ceil(len(txt) / chars_per_line)
            rows.append((font_pt, round(width_pt), autofit, en_lines, len(txt), txt))
    return rows

print(f"{'슬':>2} {'pt':>4} {'폭pt':>5} {'autofit':>10} {'EN줄':>4} {'길이':>4}  텍스트")
print("-"*100)
risky = 0
for n in range(1,13):
    for font_pt, w, af, lines, ln, txt in analyze(n):
        flag = '  ⚠️' if lines >= 2 else ''
        if lines >= 2: risky += 1
        t = txt if len(txt) <= 52 else txt[:49]+'...'
        print(f"{n:>2} {font_pt:>4.0f} {w:>5} {af:>10} {lines:>4} {ln:>4}  {t}{flag}")
print("-"*100)
print(f"2줄 이상으로 넘칠 가능성 있는 텍스트 박스: {risky}개")
