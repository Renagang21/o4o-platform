# -*- coding: utf-8 -*-
import sys
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass
import re

# 텍스트 바디 문단 순서대로의 영어 번역 (슬라이드별)
TRANS = {
 1: ["Made with Lotte Wellfood's gum technology",
     "This is Xylitol Green"],
 2: ["When a good flavor lasts, saliva flows naturally too"],
 3: ["Saliva is the most natural force that protects your mouth",
     "Dry mouth · Bad breath care · Digestion support"],
 4: ["Sugar-free, 60% Finnish xylitol",
     "A gum crafted for clean sweetness down to its ingredients"],
 5: ["Designed not to stick to dentures and implants",
     "A gum crafted for clean sweetness down to its ingredients"],
 6: ["A feel that considers even the effort of chewing",
     "A gum designed for comfortable chewing"],
 7: ["Chewing power",
     "is also important for brain and ear health",
     "Chewing stimulates cerebral blood flow",
     "and is linked to the ear's ventilation function. The link between chewing, cognitive health and chronic otitis media",
     "please ask your pharmacist for more details"],
 8: ["A chewing habit",
     "is the start of health care",
     "Xylitol Green",
     "considers dry mouth, bad breath care and even chewing exercise",
     "the best choice that thinks of them all together"],
 9: ["A feel that considers even the effort of chewing",
     "A gum made not to stick to dentures and implants"],
 10:["With a chewing habit",
     "take care of your health together",
     "Xylitol Green",
     "considers dry mouth, bad breath care, chewing exercise and even brain health"],
 11:["At pharmacies, dental clinics and health centers",
     "meet Xylitol Green",
     "Xylitol Green",
     "is an oral-care gum you choose",
     "in consultation with your pharmacist"],
 12:["Xylitol Green",
     "Dry mouth · Bad breath care · Chewing exercise",
     "A gum that thinks of them all",
     "Phone orders 1577-2779",
     "ThreeLifeZone Co., Ltd."],
}

report = []
for n in range(1, 13):
    s = open(f'ppt/slides/slide{n}.xml', encoding='utf-8').read()
    tl = TRANS[n]
    ctr = {'i': 0, 'ko': 0, 'en': 0}

    def repl_para(m):
        block = m.group(1)
        ts = re.findall(r'<a:t>(.*?)</a:t>', block, re.S)
        ko = ''.join(ts)
        if not ko.strip():
            return m.group(0)
        k = ctr['i']; ctr['i'] += 1
        en = tl[k] if k < len(tl) else ko
        ctr['ko'] += len(ko.strip()); ctr['en'] += len(en.strip())
        first = {'f': True}
        def repl_t(mt):
            if first['f']:
                first['f'] = False
                return '<a:t>' + en + '</a:t>'
            return '<a:t></a:t>'
        return '<a:p>' + re.sub(r'<a:t>.*?</a:t>', repl_t, block, flags=re.S) + '</a:p>'

    s2 = re.sub(r'<a:p>(.*?)</a:p>', repl_para, s, flags=re.S)
    open(f'ppt/slides/slide{n}.xml', 'w', encoding='utf-8').write(s2)
    ratio = (ctr['en'] / ctr['ko']) if ctr['ko'] else 0
    report.append((n, ctr['i'], ctr['ko'], ctr['en'], ratio))
    ok = '✓' if ctr['i'] == len(tl) else f'!! para={ctr["i"]} vs trans={len(tl)}'
    print(f"slide{n}: paras={ctr['i']} {ok}  KO={ctr['ko']}자 EN={ctr['en']}자 비율={ratio:.2f}x")

tko = sum(r[2] for r in report); ten = sum(r[3] for r in report)
print(f"\n총계: KO={tko}자 EN={ten}자  전체 길이비율={ten/tko:.2f}x")
print("DONE")
