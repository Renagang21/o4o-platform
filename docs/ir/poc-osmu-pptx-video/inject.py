# -*- coding: utf-8 -*-
import re

SLIDE_SHAPES = {
    1:  [(3,'text'), (5,'text'), (4,'pic'), (7,'pic')],
    2:  [(3,'text'), (7,'pic')],
    3:  [(3,'text'), (5,'text'), (13,'pic')],
    4:  [(2,'text'), (4,'text'), (6,'pic')],
    5:  [(4,'text'), (6,'text'), (3,'pic'), (8,'pic')],
    6:  [(4,'text'), (6,'text'), (10,'pic')],
    7:  [(6,'text'), (8,'text'), (3,'pic')],
    8:  [(7,'text'), (9,'text'), (3,'pic')],
    9:  [(3,'text'), (5,'text'), (6,'pic')],
    10: [(3,'text'), (5,'text'), (4,'pic')],
    11: [(4,'text'), (6,'text'), (3,'pic')],
    12: [(4,'text'), (6,'text'), (8,'text'), (10,'text'), (5,'pic')],
}

KEY_PIC = {1: 7}   # slide1: 하늘색 자일리톨 그린=id7

# 전환: v1에서 정상 동작 확인된 fade/push 만 사용 (안전)
TRANSITIONS = {
    1: '<p:fade/>', 2: '<p:push dir="l"/>', 3: '<p:fade/>', 4: '<p:push dir="l"/>',
    5: '<p:fade/>', 6: '<p:push dir="l"/>', 7: '<p:fade/>', 8: '<p:push dir="l"/>',
    9: '<p:fade/>', 10: '<p:push dir="l"/>', 11: '<p:fade/>', 12: '<p:fade/>',
}

STAGGER = 1300
TEXT_DUR = 1400
IMG_DUR  = 950
EMPH_DUR = 900
EMPH_SCALE = 112000
READ_TAIL = 3500

# animEffect filter 기반 효과만 사용 (filter 는 문자열이라 스키마 안전).
# name -> (presetID, subtype, filter)
AE = {
    'fade':    (10, 0, 'fade'),
    'wipeL':   (22, 2, 'wipe(left)'),    # 좌→우
    'wipeR':   (22, 4, 'wipe(right)'),   # 우→좌
    'wipeUp':  (22, 1, 'wipe(up)'),      # 아래→위
    'wipeD':   (22, 8, 'wipe(down)'),    # 위→아래
    'box':     (25, 0, 'box(out)'),      # 가운데서 사각 펼치기
    'circle':  (27, 0, 'circle(out)'),   # 가운데서 원형 펼치기
    'wheel':   (26, 0, 'wheel(1)'),      # 시계방향
    'dissolve':( 9, 0, 'dissolve'),      # 흩어지며 나타남
}

# 페이지마다 다른 이미지 등장 (회전)
IMG_PALETTE = ['wipeL', 'box', 'wipeUp', 'wheel', 'circle', 'wipeR', 'dissolve', 'wipeD']

class IdGen:
    def __init__(self, start): self.v = start
    def next(self):
        v = self.v; self.v += 1; return v

def set_visible(spid, g):
    return (f'<p:set><p:cBhvr><p:cTn id="{g.next()}" dur="1" fill="hold">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'
            f'<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:to><p:strVal val="visible"/></p:to></p:set>')

def entr_par(spid, name, g, delay, dur):
    presetID, subtype, filt = AE[name]
    ep = g.next()
    cid = g.next()
    eff = (f'<p:animEffect transition="in" filter="{filt}"><p:cBhvr>'
           f'<p:cTn id="{cid}" dur="{dur}"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'
           f'</p:cBhvr></p:animEffect>')
    return (f'<p:par><p:cTn id="{ep}" presetID="{presetID}" presetClass="entr" presetSubtype="{subtype}" fill="hold" nodeType="afterEffect">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'
            + set_visible(spid, g) + eff +
            '</p:childTnLst></p:cTn></p:par>')

def emph_grow_par(spid, g, delay):
    return (f'<p:par><p:cTn id="{g.next()}" presetID="6" presetClass="emph" presetSubtype="0" fill="hold" nodeType="afterEffect">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'
            f'<p:animScale><p:cBhvr additive="base"><p:cTn id="{g.next()}" dur="{EMPH_DUR}" autoRev="1" fill="hold">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr>'
            f'<p:by x="{EMPH_SCALE}" y="{EMPH_SCALE}"/></p:animScale>'
            f'</p:childTnLst></p:cTn></p:par>')

def build_timing(n, shapes):
    g = IdGen(4)
    pics = [sp for sp, k in shapes if k == 'pic']
    key_pic = KEY_PIC.get(n, pics[0] if pics else None)
    inner = []
    title_done = False
    pic_pos = 0
    for idx, (spid, kind) in enumerate(shapes):
        delay = idx * STAGGER
        grp = g.next()
        effects = []
        if kind == 'text':
            if not title_done:
                title_done = True
                name = 'wipeL' if n % 2 == 1 else 'fade'
            else:
                name = 'wipeL' if (n % 3 == 0) else 'fade'
            effects.append(entr_par(spid, name, g, 0, TEXT_DUR))
        else:
            name = IMG_PALETTE[(n - 1 + pic_pos * 3) % len(IMG_PALETTE)]
            pic_pos += 1
            effects.append(entr_par(spid, name, g, 0, IMG_DUR))
            if spid == key_pic:
                effects.append(emph_grow_par(spid, g, IMG_DUR + 250))
        inner.append(
            f'<p:par><p:cTn id="{grp}" fill="hold">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst>'
            f'<p:childTnLst>' + ''.join(effects) + '</p:childTnLst></p:cTn></p:par>'
        )
    body = ''.join(inner)
    return (
        '<p:timing><p:tnLst>'
        '<p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
        '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        + body +
        '</p:childTnLst></p:cTn></p:par>'
        '</p:childTnLst></p:cTn>'
        '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
        '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
        '</p:seq></p:childTnLst></p:cTn></p:par>'
        '</p:tnLst></p:timing>'
    )

for n in range(1, 13):
    path = f'ppt/slides/slide{n}.xml'
    s = open(path, encoding='utf-8').read()
    s = re.sub(r'<p:transition\b.*?</p:transition>', '', s, flags=re.S)
    s = re.sub(r'<p:transition\b[^>]*/>', '', s, flags=re.S)
    s = re.sub(r'<p:timing\b.*?</p:timing>', '', s, flags=re.S)

    shapes = SLIDE_SHAPES[n]
    adv = len(shapes) * STAGGER + READ_TAIL
    # advClick="1" 명시 (클릭으로도 넘김), advTm 자동진행
    transition = f'<p:transition spd="slow" advClick="1" advTm="{adv}">{TRANSITIONS[n]}</p:transition>'
    s = s.replace('</p:sld>', transition + build_timing(n, shapes) + '</p:sld>')
    open(path, 'w', encoding='utf-8').write(s)
    pics = [sp for sp,k in shapes if k=='pic']
    keyp = KEY_PIC.get(n, pics[0] if pics else None)
    imgfx = [IMG_PALETTE[(n-1+j*3)%len(IMG_PALETTE)] for j in range(len(pics))]
    print(f'slide{n}: key_pic={keyp} img_fx={imgfx} adv={adv}')

print('DONE')
