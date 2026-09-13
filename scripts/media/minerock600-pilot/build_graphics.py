"""MINEROCK600 설명형 판매영상 파일럿 — 공통 설명 그래픽 초안 생성기 (WO-O4O-MINEROCK600-VIDEO-PILOT-RESET-AND-ASSET-PREP-V1)

- 직접 그린 도형 + 텍스트만 사용. 제품 사진·외부 저작물 미사용.
- 16:9 (1920x1080) 기준, 핵심 피사체는 중앙 safe area(9:16 파생 대비, x 656~1264)에 둔다.
- 개념도이며 실제 해부·지질·축척을 재현하지 않는다. 제품 효능 표현 없음.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent / "png"
OUT.mkdir(exist_ok=True)
FONT = "C:/Windows/Fonts/malgun.ttf"
BOLD = "C:/Windows/Fonts/malgunbd.ttf"

INK = "#17384A"
SUB = "#4F6B78"
BG = "#F4F9FB"
NA, K, MG, CA = "#0A8FBF", "#D2603A", "#2E8A78", "#7A5FB0"
SEA1, SEA2, SEA3 = "#8FCBE3", "#3F97BF", "#1F5F86"
ROCK, ROCK2 = "#8E8E86", "#5E6058"
MEM = "#BFE0EA"
W, H = 1920, 1080
SAFE = (656, 1264)  # 9:16 파생 safe area


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def canvas(bg=BG):
    im = Image.new("RGBA", (W, H), bg)
    return im, ImageDraw.Draw(im)


def text(d, xy, s, size=40, fill=INK, bold=False, anchor="la"):
    d.text(xy, s, font=font(size, bold), fill=fill, anchor=anchor)


def footer(d, s):
    text(d, (W // 2, H - 44), s, 24, SUB, anchor="mm")


def arrow(d, p1, p2, fill, width=14, head=34):
    d.line([p1, p2], fill=fill, width=width)
    (x1, y1), (x2, y2) = p1, p2
    dx, dy = x2 - x1, y2 - y1
    L = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / L, dy / L
    px, py = -uy, ux
    tip = (x2, y2)
    b = (x2 - ux * head, y2 - uy * head)
    d.polygon([tip, (b[0] + px * head * 0.6, b[1] + py * head * 0.6),
               (b[0] - px * head * 0.6, b[1] - py * head * 0.6)], fill=fill)


def membrane(d, y, x0=0, x1=W, fill=MEM, dot=NA):
    """지질 이중층 단순화 — 머리(원) 두 줄 + 꼬리(선)."""
    d.rectangle([x0, y - 34, x1, y + 34], fill=fill)
    for x in range(x0 + 14, x1, 28):
        d.ellipse([x - 8, y - 34, x + 8, y - 18], fill=dot)
        d.ellipse([x - 8, y + 18, x + 8, y + 34], fill=dot)
        d.line([(x, y - 18), (x, y - 4)], fill=dot, width=3)
        d.line([(x, y + 18), (x, y + 4)], fill=dot, width=3)


def ion(d, x, y, r, fill, label, size=34):
    d.ellipse([x - r, y - r, x + r, y + r], fill=fill)
    text(d, (x, y), label, size, "white", True, "mm")


# ── 1. 미네랄 아이콘 세트 + 개별 아이콘 ────────────────────────────────────
MINERALS = [("Na", "나트륨", NA), ("K", "칼륨", K), ("Mg", "마그네슘", MG), ("Ca", "칼슘", CA)]


def mineral_icon_set():
    im, d = canvas()
    text(d, (W // 2, 120), "Na · K · Mg · Ca", 64, INK, True, "mm")
    text(d, (W // 2, 190), "몸이 함께 쓰는 네 가지 미네랄", 36, SUB, anchor="mm")
    xs = [360, 760, 1160, 1560]
    for (sym, ko, col), x in zip(MINERALS, xs):
        d.ellipse([x - 150, 400 - 150, x + 150, 400 + 150], fill=col)
        text(d, (x, 385), sym, 110, "white", True, "mm")
        text(d, (x, 620), ko, 40, INK, True, "mm")
    # 균형 네트워크 (EP06)
    cx, cy = W // 2, 860
    for x in xs:
        d.line([(x, 560), (cx, cy)], fill="#C9D9E0", width=6)
    d.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=INK)
    text(d, (cx, cy), "균형", 40, "white", True, "mm")
    footer(d, "원소 기호 표기 · 함량이나 효능을 뜻하지 않음 · 공통 재사용 그래픽")
    im.save(OUT / "mineral-icon-set.png")
    for sym, ko, col in MINERALS:
        ic = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        dd = ImageDraw.Draw(ic)
        dd.ellipse([16, 16, 496, 496], fill=col)
        dd.text((256, 236), sym, font=font(190, True), fill="white", anchor="mm")
        dd.text((256, 400), ko, font=font(48, True), fill="white", anchor="mm")
        ic.save(OUT / f"mineral-{sym}.png")


# ── 2. 세포 기본도 ─────────────────────────────────────────────────────────
def cell_base():
    im, d = canvas()
    d.rectangle([0, 560, W, H], fill="#E4F1EA")
    membrane(d, 560, 200, W - 200)
    text(d, (W // 2, 150), "세포 밖", 56, INK, True, "mm")
    text(d, (W // 2, 960), "세포 안", 56, INK, True, "mm")
    text(d, (W - 200, 620), "세포막", 34, SUB, anchor="ra")
    # 밖: Na 많음 / 안: K 많음 (정성 표현)
    for i, (x, y) in enumerate([(700, 300), (860, 420), (1060, 280), (1200, 430), (960, 360)]):
        ion(d, x, y, 34, NA, "Na+", 26)
    for i, (x, y) in enumerate([(720, 760), (900, 860), (1080, 740), (1220, 850), (960, 800)]):
        ion(d, x, y, 34, K, "K+", 26)
    footer(d, "설명용 개념도 · 세포 밖에는 Na+, 안에는 K+ 가 상대적으로 많다는 정성 표현 · 실제 크기·비율 아님")
    im.save(OUT / "cell-base.png")


# ── 3. Na-K 펌프 ───────────────────────────────────────────────────────────
def na_k_pump():
    im, d = canvas()
    d.rectangle([0, 560, W, H], fill="#E4F1EA")
    membrane(d, 560, 120, 760)
    membrane(d, 560, 1160, W - 120)
    text(d, (W // 2, 90), "Na+/K+ 펌프", 64, INK, True, "mm")
    text(d, (250, 200), "세포 밖", 44, INK, True, "la")
    text(d, (250, 900), "세포 안", 44, INK, True, "la")
    # 펌프 몸체
    d.rounded_rectangle([760, 420, 1160, 700], 60, fill=INK)
    text(d, (960, 560), "Na+/K+-ATPase", 34, "white", True, "mm")
    # 3 Na+ out
    arrow(d, (860, 700), (860, 250), NA)
    for i in range(3):
        ion(d, 720 - i * 0, 300 + i * 90, 30, NA, "Na+", 22) if False else None
    ion(d, 700, 240, 30, NA, "Na+", 22); ion(d, 700, 320, 30, NA, "Na+", 22); ion(d, 700, 400, 30, NA, "Na+", 22)
    text(d, (860, 190), "3 Na+ → 세포 밖", 40, NA, True, "mm")
    # 2 K+ in
    arrow(d, (1060, 420), (1060, 870), K)
    ion(d, 1220, 780, 30, K, "K+", 22); ion(d, 1220, 860, 30, K, "K+", 22)
    text(d, (1060, 930), "2 K+ → 세포 안", 40, K, True, "mm")
    # ATP
    d.rounded_rectangle([470, 760, 730, 830], 20, fill="#E8DDF4")
    text(d, (600, 795), "ATP → ADP + Pi", 32, "#5B3E8C", True, "mm")
    d.line([(730, 795), (860, 720)], fill="#5B3E8C", width=6)
    footer(d, "1 ATP 당 Na+ 3개 밖으로 · K+ 2개 안으로 — 순이동 개념도 · 제품 효능과 무관")
    im.save(OUT / "na-k-pump.png")


# ── 4. 물 / 전해질 ─────────────────────────────────────────────────────────
def water_electrolyte():
    im, d = canvas()
    text(d, (W // 2, 100), "물 + 전해질", 64, INK, True, "mm")
    text(d, (W // 2, 170), "체액은 물만이 아니라 녹아 있는 미네랄 이온의 농도로도 조절된다", 32, SUB, anchor="mm")
    # 컵 두 개: 물만 / 물+전해질
    for cx, title, ions in [(660, "물만", []), (1260, "물 + 전해질", [NA, K, MG, CA, NA, K])]:
        d.polygon([(cx - 180, 300), (cx + 180, 300), (cx + 140, 880), (cx - 140, 880)], fill="#DCEFF7", outline=SEA2, width=6)
        d.polygon([(cx - 170, 420), (cx + 170, 420), (cx + 143, 870), (cx - 143, 870)], fill=SEA1)
        text(d, (cx, 940), title, 40, INK, True, "mm")
        pts = [(-80, 500), (60, 560), (-20, 660), (90, 720), (-90, 780), (30, 820)]
        for (ox, oy), col in zip(pts, ions):
            d.ellipse([cx + ox - 22, oy - 22, cx + ox + 22, oy + 22], fill=col)
    footer(d, "삼투·농도 개념 설명용 · 특정 음료의 성분·효능을 표시하지 않음 · 공통 재사용 그래픽")
    im.save(OUT / "water-electrolyte.png")


# ── 5. 신장 기본도 ─────────────────────────────────────────────────────────
def kidney_base():
    im, d = canvas()
    text(d, (W // 2, 100), "신장 — 물과 Na+·K+ 의 조절", 60, INK, True, "mm")
    # 콩팥 두 개 (콩 모양 단순화)
    for cx, flip in [(800, 1), (1120, -1)]:
        d.ellipse([cx - 110, 320, cx + 110, 720], fill="#C9695F")
        d.ellipse([cx + flip * 70 - 70, 420, cx + flip * 70 + 70, 620], fill=BG)  # 콩 홈
        d.ellipse([cx + flip * 70 - 40, 450, cx + flip * 70 + 40, 590], fill="#E8A79F")
    text(d, (960, 520), "신장", 44, INK, True, "mm")
    # 유입: 혈액(물·Na·K) → 신장
    arrow(d, (420, 520), (660, 520), SEA2)
    text(d, (400, 470), "혈액", 32, SUB, anchor="ra")
    ion(d, 330, 560, 26, NA, "Na+", 20); ion(d, 390, 600, 26, K, "K+", 20); ion(d, 270, 610, 26, SEA2, "물", 20)
    # 재흡수(보존) ↑ / 배출 ↓
    arrow(d, (960, 300), (960, 200), MG)
    text(d, (960, 160), "필요한 만큼 보존(재흡수)", 34, MG, True, "mm")
    arrow(d, (960, 740), (960, 860), K)
    text(d, (960, 910), "남는 만큼 배출(소변)", 34, K, True, "mm")
    footer(d, "설명용 개념도 · 실제 해부 구조·비율 아님 · 질환·치료 표현 없음 · 공통 재사용 그래픽")
    im.save(OUT / "kidney-base.png")


# ── 6. 경도 scale (EP03) ────────────────────────────────────────────────────
def hardness_scale():
    im, d = canvas()
    text(d, (W // 2, 110), "물의 경도 (mg/L, CaCO₃ 기준)", 60, INK, True, "mm")
    text(d, (W // 2, 180), "경도 = 물에 녹아 있는 Ca·Mg 의 양을 나타내는 지표", 34, SUB, anchor="mm")
    x0, x1, y = 260, 1660, 520
    maxv = 700
    bands = [(0, 60, "#DCEFF7", "연수"), (60, 120, "#BFE0EA", "약한 경수"), (120, 180, "#8FCBE3", "경수"), (180, 700, "#3F97BF", "강한 경수")]
    for a, b, col, lab in bands:
        xa = x0 + (x1 - x0) * a / maxv
        xb = x0 + (x1 - x0) * b / maxv
        d.rectangle([xa, y - 60, xb, y + 60], fill=col)
        text(d, ((xa + xb) / 2, y + 100), lab, 26, SUB, anchor="mm")
    for v in [0, 100, 200, 300, 400, 500, 600, 700]:
        xv = x0 + (x1 - x0) * v / maxv
        d.line([(xv, y + 60), (xv, y + 72)], fill=INK, width=3)
        text(d, (xv, y + 140), str(v), 26, INK, anchor="mm")
    for v, lab, col in [(300, "300", SUB), (600, "600", NA)]:
        xv = x0 + (x1 - x0) * v / maxv
        d.line([(xv, y - 60), (xv, y - 160)], fill=col, width=8)
        d.ellipse([xv - 46, y - 250, xv + 46, y - 158], fill=col)
        text(d, (xv, y - 204), lab, 34, "white", True, "mm")
    text(d, (W // 2, 820), "같은 '미네랄 함유' 라도 경도 300 과 600 은 녹아 있는 Ca·Mg 의 양이 다르다", 36, INK, True, "mm")
    footer(d, "분류 구간은 일반적인 경도 분류(WHO 등) 참고 · 개념 설명용 · 미네락600 전용")
    im.save(OUT / "hardness-scale.png")


# ── 7. 동해 · 1,050m 암반수 concept (EP01/EP04) ────────────────────────────
def east_sea_bedrock():
    im, d = canvas()
    text(d, (W // 2, 90), "동해 · 1,050m 암반수", 60, INK, True, "mm")
    # 하늘/바다/해저/암반 단면
    d.rectangle([0, 160, W, 300], fill="#EAF6FB")
    d.rectangle([0, 300, W, 460], fill=SEA1)
    d.rectangle([0, 460, W, 600], fill=SEA2)
    d.rectangle([0, 600, W, 700], fill=SEA3)
    d.polygon([(0, 700), (W, 700), (W, H), (0, H)], fill=ROCK)
    d.polygon([(0, 820), (W, 780), (W, 960), (0, 990)], fill=ROCK2)  # 격리 암반층 대역
    text(d, (140, 330), "동해", 40, INK, True, "la")
    text(d, (140, 630), "해수 (조성 변동 가능)", 30, "white", anchor="la")
    text(d, (140, 880), "암반층에 격리된 지하 암반수", 32, "white", True, "la")
    # 취수 파이프 (개념)
    d.rectangle([950, 200, 970, 900], fill="#2A3A44")
    d.rectangle([900, 170, 1020, 210], fill="#2A3A44")
    d.ellipse([930, 880, 990, 930], fill=NA)
    # 깊이 표기
    d.line([(1300, 300), (1300, 905)], fill=INK, width=4)
    d.line([(1285, 300), (1315, 300)], fill=INK, width=4)
    d.line([(1285, 905), (1315, 905)], fill=INK, width=4)
    d.rounded_rectangle([1330, 560, 1600, 650], 24, fill="white")
    text(d, (1465, 605), "1,050m 암반수", 34, NA, True, "mm")
    text(d, (W // 2, H - 44), "기존 공개 상세페이지의 '동해 1,050m 암반수' 문구 기반 개념도 · 실제 지질·취수 경로·축척 아님 · 미네락600 전용", 24, "white", anchor="mm")
    im.save(OUT / "east-sea-bedrock-concept.png")


# ── 8. Na 섭취 경로 (EP05) ─────────────────────────────────────────────────
def sodium_sources():
    im, d = canvas()
    text(d, (W // 2, 100), "소금을 직접 넣지 않아도", 60, INK, True, "mm")
    text(d, (W // 2, 170), "일상 식생활에서 Na 섭취가 늘어날 수 있는 경로", 34, SUB, anchor="mm")
    items = ["가공식품", "외식", "배달", "빵", "시리얼", "통조림"]
    xs = [360, 600, 840, 1080, 1320, 1560]
    for lab, x in zip(items, xs):
        d.rounded_rectangle([x - 90, 330, x + 90, 510], 30, fill="white", outline="#C9D9E0", width=4)
        text(d, (x, 420), lab, 34, INK, True, "mm")
        d.ellipse([x - 12, 470, x + 12, 494], fill=NA)
        arrow(d, (x, 600), (960 + (x - 960) * 0.15, 760), "#C9D9E0", 8, 22)
    d.ellipse([960 - 130, 760, 960 + 130, 1020], fill=NA)
    text(d, (960, 870), "Na ↑", 70, "white", True, "mm")
    footer(d, "식생활 경로 개념도 · 특정 식품·제품의 함량 수치 아님 · 공통 재사용 그래픽")
    im.save(OUT / "sodium-sources-flow.png")


if __name__ == "__main__":
    mineral_icon_set(); cell_base(); na_k_pump(); water_electrolyte()
    kidney_base(); hardness_scale(); east_sea_bedrock(); sodium_sources()
    print(sorted(p.name for p in OUT.iterdir()))
