# -*- coding: utf-8 -*-
# 슬라이드 문단 순서대로의 번역 치환 + KO/대상언어 길이비 측정.
# 언어 선택: 환경변수 OSMU_LANG = en(기본) | zh | ja
#   다른 언어 대조(中=짧아짐 / 日=비슷)로 길이변화에 따른 레이아웃 거동 확인 — IR §10.7 R8.
import sys, os
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass
import re

LANG = os.environ.get('OSMU_LANG', 'en').lower()

# 텍스트 바디 문단 순서대로의 영어 번역 (슬라이드별)
TRANS_EN = {
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

# 중국어(简体) — 한국어보다 짧아지는 경향. 길이 축소 케이스 실증.
TRANS_ZH = {
 1: ["采用乐天Wellfood的口香糖技术制成",
     "这就是木糖醇绿"],
 2: ["美味持久，唾液也自然分泌"],
 3: ["唾液是守护口腔最自然的力量",
     "口干 · 口气护理 · 助消化"],
 4: ["无糖，60%芬兰木糖醇",
     "连成分都讲究干净甜味的口香糖"],
 5: ["设计为不粘假牙和种植牙",
     "连成分都讲究干净甜味的口香糖"],
 6: ["连咀嚼的负担都为你考虑的口感",
     "为舒适咀嚼而设计的口香糖"],
 7: ["咀嚼力",
     "对大脑和耳朵健康也很重要",
     "咀嚼能促进大脑血流",
     "并与耳朵的通气功能相关。咀嚼、认知健康与慢性中耳炎之间的关联",
     "详情请咨询您的药师"],
 8: ["咀嚼的习惯",
     "是健康管理的开始",
     "木糖醇绿",
     "兼顾口干、口气护理，甚至咀嚼锻炼",
     "全部一并考虑的最佳之选"],
 9: ["连咀嚼的负担都为你考虑的口感",
     "做到不粘假牙和种植牙的口香糖"],
 10:["用咀嚼的习惯",
     "一起守护您的健康",
     "木糖醇绿",
     "兼顾口干、口气护理、咀嚼锻炼，甚至大脑健康"],
 11:["在药店、牙科和保健中心",
     "遇见木糖醇绿",
     "木糖醇绿",
     "是您选择的口腔护理口香糖",
     "在药师的建议下选择"],
 12:["木糖醇绿",
     "口干 · 口气护理 · 咀嚼锻炼",
     "全部为你考虑的口香糖",
     "电话订购 1577-2779",
     "ThreeLifeZone有限公司"],
}

# 일본어 — 한국어와 길이 비슷(조사·가나로 약간 길어질 수 있음). 중간 케이스 실증.
TRANS_JA = {
 1: ["ロッテウェルフードのガム技術で作られた",
     "これがキシリトールグリーンです"],
 2: ["おいしさが続くと、唾液も自然にあふれます"],
 3: ["唾液はお口を守る最も自然な力",
     "口の渇き · 口臭ケア · 消化サポート"],
 4: ["シュガーレス、フィンランド産キシリトール60%",
     "成分までこだわった、クリーンな甘さのガム"],
 5: ["入れ歯やインプラントにくっつきにくい設計",
     "成分までこだわった、クリーンな甘さのガム"],
 6: ["噛む負担まで考えた噛みごこち",
     "快適に噛めるよう設計したガム"],
 7: ["噛む力",
     "は脳と耳の健康にも大切です",
     "噛むことは脳の血流を促し",
     "耳の換気機能とも関わります。噛むこと・認知の健康・慢性中耳炎の関連",
     "詳しくは薬剤師にご相談ください"],
 8: ["噛む習慣",
     "は健康ケアの始まり",
     "キシリトールグリーン",
     "口の渇き・口臭ケア・噛む運動まで考えました",
     "すべてを一緒に考えた最良の選択"],
 9: ["噛む負担まで考えた噛みごこち",
     "入れ歯やインプラントにくっつかないガム"],
 10:["噛む習慣で",
     "健康を一緒にケア",
     "キシリトールグリーン",
     "口の渇き・口臭ケア・噛む運動、さらに脳の健康まで考えました"],
 11:["薬局・歯科・保健センターで",
     "キシリトールグリーンに出会う",
     "キシリトールグリーン",
     "あなたが選ぶオーラルケアガム",
     "薬剤師に相談して選ぶ"],
 12:["キシリトールグリーン",
     "口の渇き · 口臭ケア · 噛む運動",
     "すべてを考えたガム",
     "電話注文 1577-2779",
     "ThreeLifeZone株式会社"],
}

TRANS = {'en': TRANS_EN, 'zh': TRANS_ZH, 'ja': TRANS_JA}[LANG]

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
    print(f"slide{n}: paras={ctr['i']} {ok}  KO={ctr['ko']}자 {LANG.upper()}={ctr['en']}자 비율={ratio:.2f}x")

tko = sum(r[2] for r in report); ten = sum(r[3] for r in report)
print(f"\n[LANG={LANG.upper()}] 총계: KO={tko}자 {LANG.upper()}={ten}자  전체 길이비율={ten/tko:.2f}x")
print("DONE")
