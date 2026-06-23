# -*- coding: utf-8 -*-
# 슬라이드 문단 순서대로의 번역 치환 + KO/대상언어 길이비 측정.
# 언어 선택: 환경변수 OSMU_LANG = en(기본) | zh | ja
#   다른 언어 대조(中=짧아짐 / 日=비슷)로 길이변화에 따른 레이아웃 거동 확인 — IR §10.7 R8.
#
# 의미 단위 줄바꿈 (2026-06-23):
#   원본 PPTX 는 이미 <a:br> 로 디자이너가 의미 단위 줄바꿈을 해두었으나, 단순 치환은 이를 버려
#   PowerPoint 자동 줄바꿈(CJK 1글자 orphan)에 맡겨버림. → 번역을 "의미 단위로 끊은 줄 목록"으로
#   주면(AI 가 언어·폭에 맞게 결정) <a:br> 로 명시적 줄바꿈해 orphan 제거 + 자연스러운 끊김.
#   각 문단 값: str = 한 줄 / list = 여러 줄(<a:br> 로 연결). 짧은 문단은 str, 넘치는 제목/긴 부제만 list.
#   폰트/색(rPr)은 원본 첫 run 것을 보존. font-shrink(merge.deorphan)는 폴백.
import sys, os
try: sys.stdout.reconfigure(encoding="utf-8")
except: pass
import re

LANG = os.environ.get('OSMU_LANG', 'en').lower()

# 한국어 = 원본 언어 → 번역 생략(원본 한국어 텍스트·디자이너 줄바꿈 유지).
# 이후 merge(병합·간격표준화)·inject_dyn(애니)·portrait(세로) 는 동일 적용.
if LANG == 'ko':
    print("[LANG=KO] 원본 한국어 유지 — 번역 생략 (merge/portrait 만 적용)")
    print("DONE")
    raise SystemExit(0)

# 영어 — 단어 경계 자동 줄바꿈이라 orphan 문제 없음 → str 유지(세그먼트 불요).
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

# 중국어(简体) — 한국어보다 짧음. 제목/긴 부제는 의미 단위 줄목록(list)으로 끊어 orphan 방지.
TRANS_ZH = {
 1: [["采用乐天Wellfood的", "口香糖技术制成"],
     "这就是木糖醇绿"],
 2: [["美味持久，", "唾液也自然分泌"]],
 3: [["唾液是守护口腔", "最自然的力量"],
     "口干 · 口气护理 · 助消化"],
 4: ["无糖，60%芬兰木糖醇",
     ["连成分都讲究", "干净甜味的口香糖"]],
 5: [["设计为不粘", "假牙和种植牙"],
     ["连成分都讲究", "干净甜味的口香糖"]],
 6: [["连咀嚼的负担", "都为你考虑的口感"],
     "为舒适咀嚼而设计的口香糖"],
 7: ["咀嚼力",
     ["对大脑和耳朵", "健康也很重要"],
     "咀嚼能促进大脑血流",
     ["并与耳朵的通气功能相关。", "咀嚼、认知健康与", "慢性中耳炎之间的关联"],
     "详情请咨询您的药师"],
 8: ["咀嚼的习惯",
     "是健康管理的开始",
     "木糖醇绿",
     ["兼顾口干、口气护理，", "甚至咀嚼锻炼"],
     "全部一并考虑的最佳之选"],
 9: [["连咀嚼的负担", "都为你考虑的口感"],
     "做到不粘假牙和种植牙的口香糖"],
 10:["用咀嚼的习惯",
     "一起守护您的健康",
     "木糖醇绿",
     ["兼顾口干、口气护理、", "咀嚼锻炼，甚至大脑健康"]],
 11:[["在药店、牙科", "和保健中心"],
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

# 일본어 — 한국어와 길이 비슷. 제목/긴 부제는 의미 단위 줄목록.
TRANS_JA = {
 1: [["ロッテウェルフードの", "ガム技術で作られた"],
     ["これがキシリトール", "グリーンです"]],
 2: [["おいしさが続くと、", "唾液も自然にあふれます"]],
 3: [["唾液はお口を守る", "最も自然な力"],
     "口の渇き · 口臭ケア · 消化サポート"],
 4: [["シュガーレス、", "フィンランド産キシリトール60%"],
     "成分までこだわった、クリーンな甘さのガム"],
 5: [["入れ歯やインプラントに", "くっつきにくい設計"],
     "成分までこだわった、クリーンな甘さのガム"],
 6: [["噛む負担まで考えた", "噛みごこち"],
     "快適に噛めるよう設計したガム"],
 7: ["噛む力",
     ["は脳と耳の健康にも", "大切です"],
     "噛むことは脳の血流を促し",
     ["耳の換気機能とも関わります。", "噛むこと・認知の健康・", "慢性中耳炎の関連"],
     "詳しくは薬剤師にご相談ください"],
 8: ["噛む習慣",
     "は健康ケアの始まり",
     "キシリトールグリーン",
     ["口の渇き・口臭ケア・噛む運動", "まで考えました"],
     "すべてを一緒に考えた最良の選択"],
 9: [["噛む負担まで考えた", "噛みごこち"],
     "入れ歯やインプラントにくっつかないガム"],
 10:["噛む習慣で",
     "健康を一緒にケア",
     "キシリトールグリーン",
     ["口の渇き・口臭ケア・噛む運動、", "さらに脳の健康まで考えました"]],
 11:[["薬局・歯科・", "保健センターで"],
     ["キシリトールグリーンに", "出会う"],
     "キシリトールグリーン",
     "あなたが選ぶオーラルケアガム",
     "薬剤師に相談して選ぶ"],
 12:["キシリトールグリーン",
     "口の渇き · 口臭ケア · 噛む運動",
     "すべてを考えたガム",
     "電話注文 1577-2779",
     "ThreeLifeZone株式会社"],
}

# 베트남어 — 라틴+띄어쓰기 → 단어 단위 자동 줄바꿈(str). 길이 EN 와 비슷.
TRANS_VI = {
 1: ["Được làm bằng công nghệ kẹo cao su của Lotte Wellfood",
     "Đây là Xylitol Green"],
 2: ["Khi hương vị thơm ngon kéo dài, nước bọt cũng tiết ra tự nhiên"],
 3: ["Nước bọt là sức mạnh tự nhiên nhất bảo vệ khoang miệng",
     "Khô miệng · Chăm sóc hơi thở · Hỗ trợ tiêu hóa"],
 4: ["Không đường, 60% xylitol Phần Lan",
     "Kẹo cao su chăm chút vị ngọt sạch đến từng thành phần"],
 5: ["Thiết kế không dính răng giả và implant",
     "Kẹo cao su chăm chút vị ngọt sạch đến từng thành phần"],
 6: ["Cảm giác nhai quan tâm đến cả công sức khi nhai",
     "Kẹo cao su được thiết kế để nhai thoải mái"],
 7: ["Lực nhai",
     "cũng quan trọng cho sức khỏe não và tai",
     "Nhai kích thích lưu lượng máu não",
     "và liên quan đến chức năng thông khí của tai. Mối liên hệ giữa nhai, sức khỏe nhận thức và viêm tai giữa mạn tính",
     "vui lòng hỏi dược sĩ để biết thêm chi tiết"],
 8: ["Thói quen nhai",
     "là khởi đầu của chăm sóc sức khỏe",
     "Xylitol Green",
     "quan tâm đến khô miệng, chăm sóc hơi thở và cả bài tập nhai",
     "lựa chọn tốt nhất nghĩ đến tất cả"],
 9: ["Cảm giác nhai quan tâm đến cả công sức khi nhai",
     "Kẹo cao su làm ra để không dính răng giả và implant"],
 10:["Với thói quen nhai",
     "hãy cùng chăm sóc sức khỏe",
     "Xylitol Green",
     "quan tâm đến khô miệng, hơi thở, bài tập nhai và cả sức khỏe não"],
 11:["Tại nhà thuốc, phòng khám nha khoa và trung tâm y tế",
     "gặp gỡ Xylitol Green",
     "Xylitol Green",
     "là kẹo cao su chăm sóc răng miệng bạn chọn",
     "khi tham khảo ý kiến dược sĩ"],
 12:["Xylitol Green",
     "Khô miệng · Chăm sóc hơi thở · Bài tập nhai",
     "Kẹo cao su nghĩ đến tất cả",
     "Đặt hàng qua điện thoại 1577-2779",
     "Công ty TNHH ThreeLifeZone"],
}

# 인도네시아어 — 라틴+띄어쓰기 → 단어 단위 자동 줄바꿈(str).
TRANS_ID = {
 1: ["Dibuat dengan teknologi permen karet Lotte Wellfood",
     "Inilah Xylitol Green"],
 2: ["Saat rasa lezat bertahan lama, air liur pun mengalir alami"],
 3: ["Air liur adalah kekuatan paling alami yang melindungi mulut",
     "Mulut kering · Perawatan napas · Bantuan pencernaan"],
 4: ["Bebas gula, 60% xylitol Finlandia",
     "Permen karet yang dirancang untuk manis bersih hingga ke bahannya"],
 5: ["Dirancang agar tidak lengket pada gigi palsu dan implan",
     "Permen karet yang dirancang untuk manis bersih hingga ke bahannya"],
 6: ["Sensasi yang mempertimbangkan usaha mengunyah",
     "Permen karet yang dirancang untuk dikunyah dengan nyaman"],
 7: ["Kekuatan mengunyah",
     "juga penting untuk kesehatan otak dan telinga",
     "Mengunyah merangsang aliran darah otak",
     "dan berkaitan dengan fungsi ventilasi telinga. Kaitan antara mengunyah, kesehatan kognitif, dan otitis media kronis",
     "silakan tanyakan kepada apoteker untuk detail"],
 8: ["Kebiasaan mengunyah",
     "adalah awal perawatan kesehatan",
     "Xylitol Green",
     "mempertimbangkan mulut kering, perawatan napas, hingga latihan mengunyah",
     "pilihan terbaik yang memikirkan semuanya"],
 9: ["Sensasi yang mempertimbangkan usaha mengunyah",
     "Permen karet yang dibuat agar tidak lengket pada gigi palsu dan implan"],
 10:["Dengan kebiasaan mengunyah",
     "jaga kesehatan bersama",
     "Xylitol Green",
     "mempertimbangkan mulut kering, perawatan napas, latihan mengunyah, hingga kesehatan otak"],
 11:["Di apotek, klinik gigi, dan pusat kesehatan",
     "temui Xylitol Green",
     "Xylitol Green",
     "adalah permen karet perawatan mulut pilihan Anda",
     "atas saran apoteker"],
 12:["Xylitol Green",
     "Mulut kering · Perawatan napas · Latihan mengunyah",
     "Permen karet yang memikirkan semuanya",
     "Pesan via telepon 1577-2779",
     "ThreeLifeZone Co., Ltd."],
}

# 태국어 — 공백 없음 → PowerPoint 태국어 줄바꿈 엔진 사용(str). 구/문장 사이 공백만.
TRANS_TH = {
 1: ["ผลิตด้วยเทคโนโลยีหมากฝรั่งของ Lotte Wellfood",
     "นี่คือ Xylitol Green"],
 2: ["เมื่อรสชาติอร่อยคงอยู่นาน น้ำลายก็หลั่งออกมาอย่างเป็นธรรมชาติ"],
 3: ["น้ำลายคือพลังธรรมชาติที่ปกป้องช่องปากได้ดีที่สุด",
     "ปากแห้ง · ดูแลกลิ่นปาก · ช่วยย่อยอาหาร"],
 4: ["ปราศจากน้ำตาล ไซลิทอลฟินแลนด์ 60%",
     "หมากฝรั่งที่ใส่ใจความหวานสะอาดถึงส่วนผสม"],
 5: ["ออกแบบไม่ให้ติดฟันปลอมและรากฟันเทียม",
     "หมากฝรั่งที่ใส่ใจความหวานสะอาดถึงส่วนผสม"],
 6: ["สัมผัสที่ใส่ใจแม้แต่แรงในการเคี้ยว",
     "หมากฝรั่งที่ออกแบบให้เคี้ยวสบาย"],
 7: ["พลังการเคี้ยว",
     "สำคัญต่อสุขภาพสมองและหูด้วย",
     "การเคี้ยวกระตุ้นการไหลเวียนเลือดในสมอง",
     "และเกี่ยวข้องกับการระบายอากาศของหู ความเชื่อมโยงระหว่างการเคี้ยว สุขภาพการรับรู้ และหูชั้นกลางอักเสบเรื้อรัง",
     "สอบถามเภสัชกรเพื่อรายละเอียดเพิ่มเติม"],
 8: ["นิสัยการเคี้ยว",
     "คือจุดเริ่มต้นของการดูแลสุขภาพ",
     "Xylitol Green",
     "ใส่ใจปากแห้ง ดูแลกลิ่นปาก ไปจนถึงการบริหารการเคี้ยว",
     "ตัวเลือกที่ดีที่สุดที่คิดถึงทุกอย่าง"],
 9: ["สัมผัสที่ใส่ใจแม้แต่แรงในการเคี้ยว",
     "หมากฝรั่งที่ทำให้ไม่ติดฟันปลอมและรากฟันเทียม"],
 10:["ด้วยนิสัยการเคี้ยว",
     "มาดูแลสุขภาพไปด้วยกัน",
     "Xylitol Green",
     "ใส่ใจปากแห้ง กลิ่นปาก การบริหารการเคี้ยว ไปจนถึงสุขภาพสมอง"],
 11:["ที่ร้านยา คลินิกทันตกรรม และศูนย์สุขภาพ",
     "พบกับ Xylitol Green",
     "Xylitol Green",
     "คือหมากฝรั่งดูแลช่องปากที่คุณเลือก",
     "โดยปรึกษาเภสัชกร"],
 12:["Xylitol Green",
     "ปากแห้ง · ดูแลกลิ่นปาก · บริหารการเคี้ยว",
     "หมากฝรั่งที่คิดถึงทุกอย่าง",
     "สั่งซื้อทางโทรศัพท์ 1577-2779",
     "บริษัท ThreeLifeZone จำกัด"],
}

TRANS = {'en': TRANS_EN, 'zh': TRANS_ZH, 'ja': TRANS_JA,
         'vi': TRANS_VI, 'id': TRANS_ID, 'th': TRANS_TH}[LANG]

report = []
for n in range(1, 13):
    s = open(f'ppt/slides/slide{n}.xml', encoding='utf-8').read()
    tl = TRANS[n]
    ctr = {'i': 0, 'ko': 0, 'en': 0, 'br': 0}

    def repl_para(m):
        inner = m.group(1)
        ts = re.findall(r'<a:t>(.*?)</a:t>', inner, re.S)
        ko = ''.join(ts)
        if not ko.strip():
            return m.group(0)
        k = ctr['i']; ctr['i'] += 1
        tr = tl[k] if k < len(tl) else ko
        segs = tr if isinstance(tr, list) else [tr]
        # 원본 첫 run 의 rPr(폰트/크기/색/굵기) 보존
        rm = re.search(r'<a:r>\s*(<a:rPr.*?</a:rPr>|<a:rPr[^>]*/>)', inner, re.S)
        rpr = rm.group(1) if rm else '<a:rPr lang="en-US" dirty="0"/>'
        # stale 교정 메타데이터 제거 — 한국어 run 의 맞춤법 플래그(err/dirty/smtClean/noProof)가
        # 번역 텍스트에 남으면 PowerPoint 가 "복구 필요"로 플래그함. 새 저장본처럼 깨끗하게.
        rpr = re.sub(r'\s+(?:err|dirty|smtClean|noProof)="[^"]*"', '', rpr)
        # 선두 pPr / 말미 endParaRPr 보존
        ppr = ''
        pm = re.match(r'\s*(<a:pPr.*?</a:pPr>|<a:pPr[^>]*/>)', inner, re.S)
        if pm: ppr = pm.group(1)
        epr = ''
        em = re.search(r'(<a:endParaRPr.*?</a:endParaRPr>|<a:endParaRPr[^>]*/>)\s*$', inner, re.S)
        if em: epr = em.group(1)
        br = f'<a:br>{rpr}</a:br>'
        runs = br.join(f'<a:r>{rpr}<a:t>{seg}</a:t></a:r>' for seg in segs)
        ctr['ko'] += len(ko.strip())
        ctr['en'] += sum(len(x.strip()) for x in segs)
        ctr['br'] += len(segs) - 1
        return '<a:p>' + ppr + runs + epr + '</a:p>'

    s2 = re.sub(r'<a:p>(.*?)</a:p>', repl_para, s, flags=re.S)
    open(f'ppt/slides/slide{n}.xml', 'w', encoding='utf-8').write(s2)
    ratio = (ctr['en'] / ctr['ko']) if ctr['ko'] else 0
    report.append((n, ctr['i'], ctr['ko'], ctr['en'], ratio))
    ok = '✓' if ctr['i'] == len(tl) else f'!! para={ctr["i"]} vs trans={len(tl)}'
    print(f"slide{n}: paras={ctr['i']} {ok}  KO={ctr['ko']}자 {LANG.upper()}={ctr['en']}자 줄바꿈+{ctr['br']} 비율={ratio:.2f}x")

tko = sum(r[2] for r in report); ten = sum(r[3] for r in report)
print(f"\n[LANG={LANG.upper()}] 총계: KO={tko}자 {LANG.upper()}={ten}자  전체 길이비율={ten/tko:.2f}x")
print("DONE")
