"""MINEROCK600 EP01 1차 합성 (FFmpeg).

Seedance raw clip 3개 + ElevenLabs 내레이션 3개 + 실제 제품 Cutout + 정확 그래픽 + 한글 자막
→ ep01-v1-preview.mp4. 자체 편집기 없음. 모든 원본은 리포 밖(C:/tmp/minerock600-pilot).

  python assemble_ep01.py            # 합성
  python assemble_ep01.py --dry-run  # 입력 존재 확인 + 자막/오버레이 PNG 렌더 + ffmpeg 명령만 출력

입력 규약 (없으면 해당 단계 건너뛰고 보고):
  ep01/clips/cut1.mp4  cut2.mp4  cut3.mp4      Seedance 2.5 raw (16:9)
  ep01/narration/ep01-cut1.mp3 (cut2/cut3)      ElevenLabs
  product/minerock600-product-cutout-provisional.png
  png/east-sea-bedrock-concept.png · hardness-scale.png · mineral-Ca.png · mineral-Mg.png
자막 텍스트는 subtitles-ko.srt 가 아니라 아래 SUBS(같은 내용) 를 PIL 로 PNG 렌더 → overlay.
(ffmpeg drawtext/libass 의 Windows 폰트 경로·이스케이프 문제 회피)
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(os.environ.get("MINEROCK600_ROOT", "C:/tmp/minerock600-pilot"))
EP = ROOT / "ep01"
CLIPS, NARR, OUT = EP / "clips", EP / "narration", EP / "assembly"
PNG, PRODUCT = ROOT / "png", ROOT / "product"
W, H = 1920, 1080
CUTS = [("cut1", 7.0), ("cut2", 10.0), ("cut3", 10.0)]
SUBS = {
    "cut1": "미네락600은 어떤 물일까요?",
    "cut2": "동해 1,050m 암반수 · 해양심층암반수 기반",
    "cut3": "경도 600 · 물처럼 마시는 고미네랄 음료",
}
FONT = "C:/Windows/Fonts/malgun.ttf"
DRY = "--dry-run" in sys.argv
FFMPEG = shutil.which("ffmpeg")


def render_subtitle(cut: str) -> Path:
    """하단 safe area 안 자막 1줄 (9:16 파생 대비 중앙 656~1264 안에 맞춤)."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, 54)
    text = SUBS[cut]
    tw = d.textlength(text, font=font)
    x, y = (W - tw) / 2, H - 170
    d.rounded_rectangle([x - 36, y - 18, x + tw + 36, y + 78], 18, fill=(10, 20, 40, 170))
    d.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    p = OUT / f"sub-{cut}.png"
    img.save(p)
    return p


def cutout_layer(scale_h: int, x: int, y: int) -> Path:
    """실제 제품 Cutout 을 1080p 캔버스에 배치한 레이어(라벨 픽셀 비율 유지·재생성 없음).
    좌측 소프트 알파 밴드 대응: 병 뒤에 밝은 반투명 패널을 깔아 배경 비침을 완화."""
    src = Image.open(PRODUCT / "minerock600-product-cutout-provisional.png").convert("RGBA")
    r = scale_h / src.height
    bottle = src.resize((round(src.width * r), scale_h), Image.LANCZOS)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pad = 40
    d.rounded_rectangle([x - pad, y - pad, x + bottle.width + pad, y + bottle.height + pad], 32,
                        fill=(245, 248, 252, 150))
    layer.alpha_composite(bottle, (x, y))
    p = OUT / f"product-{scale_h}-{x}-{y}.png"
    layer.save(p)
    return p


def pip(name: str, scale: float, corner: str) -> Path:
    """정확 그래픽(1920×1080 원본)을 PIP 카드로 축소 배치."""
    src = Image.open(PNG / name).convert("RGBA")
    card = src.resize((round(W * scale), round(H * scale)), Image.LANCZOS)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    m = 60
    pos = {"br": (W - card.width - m, H - card.height - m - 130), "tr": (W - card.width - m, m)}[corner]
    ImageDraw.Draw(layer).rounded_rectangle([pos[0] - 6, pos[1] - 6, pos[0] + card.width + 6, pos[1] + card.height + 6], 14,
                                            fill=(255, 255, 255, 230))
    layer.alpha_composite(card, pos)
    p = OUT / f"pip-{Path(name).stem}.png"
    layer.save(p)
    return p


def icons_layer() -> Path:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x = 120
    for n in ("mineral-Ca.png", "mineral-Mg.png"):
        ic = Image.open(PNG / n).convert("RGBA").resize((200, 200), Image.LANCZOS)
        layer.alpha_composite(ic, (x, H - 420))
        x += 230
    p = OUT / "icons-ca-mg.png"
    layer.save(p)
    return p


def build_cut(cut: str, dur: float) -> Path | None:
    clip = CLIPS / f"{cut}.mp4"
    narr = NARR / f"ep01-{cut}.mp3"
    if not clip.exists():
        print(f"[{cut}] raw clip 없음: {clip} — 건너뜀")
        return None
    overlays: list[tuple[Path, str]] = []  # (png, enable expr)
    if cut == "cut1":
        overlays.append((cutout_layer(820, 260, 150), "gte(t,0.6)"))
    if cut == "cut2":
        overlays.append((pip("east-sea-bedrock-concept.png", 0.42, "br"), "gte(t,2.0)"))
    if cut == "cut3":
        overlays.append((cutout_layer(760, 820, 170), "gte(t,0.4)"))
        overlays.append((pip("hardness-scale.png", 0.36, "tr"), "gte(t,2.5)"))
        overlays.append((icons_layer(), "gte(t,5.0)"))
    overlays.append((render_subtitle(cut), "between(t,0.3,%.1f)" % (dur - 0.2)))

    inputs = ["-i", str(clip)]
    for p, _ in overlays:
        inputs += ["-loop", "1", "-i", str(p)]
    fc = [f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=30,trim=0:{dur},setpts=PTS-STARTPTS[v0]"]
    prev = "v0"
    for i, (_, en) in enumerate(overlays, start=1):
        fc.append(f"[{prev}][{i}:v]overlay=0:0:enable='{en}':format=auto[v{i}]")
        prev = f"v{i}"
    fc.append(f"[{prev}]format=yuv420p[vout]")
    args = ["-y", *inputs]
    if narr.exists():
        args += ["-i", str(narr)]
        fc.append(f"[{len(overlays) + 1}:a]apad,atrim=0:{dur},asetpts=PTS-STARTPTS[aout]")
        maps = ["-map", "[vout]", "-map", "[aout]"]
    else:
        print(f"[{cut}] 내레이션 없음: {narr} — 무음으로 진행")
        fc.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{dur}[aout]")
        maps = ["-map", "[vout]", "-map", "[aout]"]
    out = OUT / f"{cut}-composited.mp4"
    cmd = [FFMPEG or "ffmpeg", *args, "-filter_complex", ";".join(fc), *maps, "-t", str(dur),
           "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out)]
    print(f"[{cut}] " + " ".join(cmd))
    if not DRY:
        subprocess.run(cmd, check=True)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not FFMPEG:
        print("ffmpeg 없음 — PATH 에 ffmpeg 필요 (winget install Gyan.FFmpeg). dry-run 모드로 전환")
    parts = [p for cut, dur in CUTS if (p := build_cut(cut, dur))]
    if len(parts) < 3:
        print(f"합성 가능한 CUT {len(parts)}/3 — 최종 concat 생략")
        return
    lst = OUT / "concat.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    final = OUT / "ep01-v1-preview.mp4"
    cmd = [FFMPEG or "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(final)]
    print("[final] " + " ".join(cmd))
    if not DRY and FFMPEG:
        subprocess.run(cmd, check=True)
        print("EP01 1차 preview:", final)


if __name__ == "__main__":
    main()
