r"""
MINEROCK600 EP01 — CUT1 TTS A/B 테스트 (WO-O4O-AUTOMATION-TTS-NARROW-ENDPOINT-V1 production smoke)

O4O 서버의 narrow TTS endpoint(POST /api/v1/platform/automation/tts) 를 호출한다.
- provider 키는 서버에 있는 것을 그대로 사용한다. 이 PC 로 API key 를 가져오지 않고, 출력·기록하지 않는다.
- 로그인 자격은 docs/local/TEST-ACCOUNTS.local.md(git 미추적) 에서만 읽고, 토큰·비밀번호를 출력하지 않는다.
  (또는 O4O_ACCESS_TOKEN 환경변수로 이미 발급된 Bearer token 을 넘길 수 있다.)
- narration-ko.txt 의 [CUT1] 블록만 생성. 음성 속도 변경·후처리 없음. Gemini 는 서버가 WAV 로 돌려주며
  청취 편의용 mp3 사본만 ffmpeg 로 만든다(원본 wav 보존).
- 출력: C:\tmp\minerock600-pilot\ep01\narration-test\cut1-openai.mp3 / cut1-gemini.wav (+ cut1-gemini.mp3)
- 보고 항목: provider · model · voice · format · duration · HTTP status · 성공 여부 (key/token 없음)

사용: PYTHONUTF8=1 python tts_ab_cut1.py [--only openai|gemini] [--openai-voice nova] [--gemini-voice Kore]
                                      [--api https://api.neture.co.kr/api/v1] [--cut 2] [--out <dir>] [--stem ep01-cut2]
EP01 채택(2026-09-15): Gemini gemini-3.1-flash-tts-preview · voice Kore · 동일 STYLE. CUT2/3 는
  python tts_ab_cut1.py --only gemini --cut 2 --out C:\tmp\minerock600-pilot\ep01\narration --stem ep01-cut2
"""
import argparse, json, os, re, subprocess, sys, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
OUT = Path(r"C:\tmp\minerock600-pilot\ep01\narration-test")
ACCOUNTS = REPO / "docs/local/TEST-ACCOUNTS.local.md"
STYLE = ("30~40대 한국 여성 약사가 손님에게 설명하는 톤. 차분하고 신뢰감 있게, 광고 성우처럼 과장하지 않고, "
         "자연스러운 속도로. 고유명사 '미네락 육백' 은 또박또박.")


def cut_text(n: int) -> str:
    txt = (HERE / "narration-ko.txt").read_text(encoding="utf-8")
    m = re.search(rf"\[CUT{n}\]\s*(.*?)(?=\n\[CUT|\Z)", txt, re.S)
    return "\n".join(l for l in m.group(1).strip().splitlines() if l.strip())


def post(url, headers, body, timeout=180):
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={**headers, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def login(api: str) -> str:
    tok = os.environ.get("O4O_ACCESS_TOKEN", "")
    if tok:
        return tok
    acct = ACCOUNTS.read_text(encoding="utf-8")
    m = re.search(r"admin\.neture\.co\.kr 관리자 \(super_admin\)\s*\n아이디\s*:\s*(\S+)\s*\n페스워드\s*:\s*(\S+)", acct)
    if not m:
        sys.exit("TEST-ACCOUNTS.local.md 에서 super_admin 항목을 찾지 못함")
    st, data, _ = post(f"{api}/auth/login",
                       {}, {"email": m.group(1), "password": m.group(2), "serviceKey": "neture", "includeLegacyTokens": True})
    if st != 200:
        sys.exit(f"login HTTP {st}")
    d = json.loads(data).get("data", {})
    tok = d.get("accessToken") or d.get("tokens", {}).get("accessToken")
    if not tok:
        sys.exit("login 응답에 accessToken 없음")
    return tok


def find_tool(name):
    from shutil import which
    p = which(name)
    if p:
        return p
    for base in [Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/WinGet/Links",
                 Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/WinGet/Packages"]:
        for c in base.rglob(f"{name}.exe"):
            return str(c)
    return name


def duration(path):
    r = subprocess.run([find_tool("ffprobe"), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    return round(float(r.stdout.strip()), 2) if r.returncode == 0 and r.stdout.strip() else None


def run(api: str, token: str, provider: str, text: str, voice: str, fmt: str, out_dir: Path, stem: str):
    st, data, headers = post(f"{api}/platform/automation/tts", {"Authorization": f"Bearer {token}"},
                             {"provider": provider, "text": text, "voice": voice, "style": STYLE, "format": fmt})
    rep = {"provider": provider, "http": st, "ok": st == 200}
    if st != 200:
        try:
            j = json.loads(data)
            rep["code"] = j.get("code"); rep["error"] = j.get("error")
        except Exception:
            rep["error"] = data[:200].decode("utf-8", "replace")
        return rep
    h = {k.lower(): v for k, v in headers.items()}
    rep.update({"model": h.get("x-tts-model"), "voice": h.get("x-tts-voice"), "format": h.get("x-tts-format"),
                "content_type": h.get("content-type"), "bytes": len(data)})
    out = out_dir / f"{stem}.{fmt}"
    out.write_bytes(data)
    rep["file"] = str(out); rep["duration"] = duration(out)
    if fmt == "wav":
        mp3 = out.with_suffix(".mp3")
        r = subprocess.run([find_tool("ffmpeg"), "-y", "-loglevel", "error", "-i", str(out), "-codec:a", "libmp3lame", "-q:a", "2", str(mp3)],
                           capture_output=True, text=True)
        rep["mp3_copy"] = str(mp3) if r.returncode == 0 else f"ffmpeg 실패: {r.stderr[:200]}"
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["openai", "gemini"])
    ap.add_argument("--openai-voice", default="nova")
    ap.add_argument("--gemini-voice", default="Kore")
    ap.add_argument("--api", default="https://api.neture.co.kr/api/v1")
    ap.add_argument("--cut", type=int, default=1, help="narration-ko.txt 의 [CUTn] 블록 (기본 1)")
    ap.add_argument("--out", help="출력 폴더 (기본 narration-test)")
    ap.add_argument("--stem", help="출력 파일 stem (기본 cut{n}-{provider})")
    a = ap.parse_args()
    out_dir = Path(a.out) if a.out else OUT
    out_dir.mkdir(parents=True, exist_ok=True)
    text = cut_text(a.cut)
    print(f"CUT{a.cut} text:", text)
    token = login(a.api)
    print("login: ok")
    results = []
    if a.only in (None, "openai"):
        results.append(run(a.api, token, "openai", text, a.openai_voice, "mp3", out_dir, a.stem or f"cut{a.cut}-openai"))
    if a.only in (None, "gemini"):
        results.append(run(a.api, token, "gemini", text, a.gemini_voice, "wav", out_dir, a.stem or f"cut{a.cut}-gemini"))
    print(json.dumps(results, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
