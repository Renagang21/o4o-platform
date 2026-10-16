r"""
MINEROCK600 EP01 — CUT1 TTS A/B 테스트 (WO-O4O-AUTOMATION-TTS-NARROW-ENDPOINT-V1 production smoke)

O4O 서버의 narrow TTS endpoint(POST /api/v1/platform/automation/tts) 를 호출한다.
- provider 키는 서버에 있는 것을 그대로 사용한다. 이 PC 로 API key 를 가져오지 않고, 출력·기록하지 않는다.
- 로그인 자격은 docs/local/TEST-ACCOUNTS.local.md(git 미추적) 에서만 읽고, 토큰·비밀번호를 출력하지 않는다.
  '용도 | 아이디 | 비밀번호' 표에서 용도가 super_admin 인 행 하나만 쓴다. 관리자가 Google 전용이라 그런 행이 없으면
  O4O_ACCESS_TOKEN 환경변수로 이미 발급된 Bearer token 을 넘긴다(이 값이 있으면 파일을 읽지 않는다).
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
ACCOUNTS = Path(os.environ.get("O4O_TEST_ACCOUNTS_FILE") or REPO / "docs/local/TEST-ACCOUNTS.local.md")  # worktree 에서는 env 로 메인 체크아웃 경로 지정
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


class AccountsError(Exception):
    """메시지에는 위치·개수만 담는다. 계정·비밀번호 값은 넣지 않는다."""


def _cells(line: str) -> list:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _unquote(value: str) -> str:
    return value[1:-1].strip() if len(value) >= 2 and value[0] == value[-1] == "`" else value


SUPER_ADMIN = re.compile(r"(?<![A-Za-z0-9_])super_admin(?![A-Za-z0-9_])")


def super_admin_credentials(text: str):
    """TEST-ACCOUNTS.local.md 의 '용도 | 아이디 | 비밀번호 | …' 표에서 용도가 super_admin 인 행 하나만 고른다.

    비밀번호 열이 없는 표(Google 전용 계정)는 대상이 아니다. 해당 행이 없거나 여러 개면 실패하며,
    임의의 첫 계정이나 다른 파일로 대체하지 않는다.
    """
    lines = text.splitlines()
    tables = 0
    matches = []
    for i, line in enumerate(lines):
        if not line.lstrip().startswith("|") or i + 1 >= len(lines):
            continue
        header = _cells(line)
        if not re.fullmatch(r"\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?", lines[i + 1].strip()):
            continue
        if not {"용도", "아이디", "비밀번호"} <= set(header):
            continue
        tables += 1
        col = {name: header.index(name) for name in ("용도", "아이디", "비밀번호")}
        for n, row in enumerate(lines[i + 2:], start=i + 3):
            if not row.lstrip().startswith("|"):
                break
            cells = _cells(row)
            if len(cells) != len(header):
                raise AccountsError(f"계정 표 {n}행의 열 수가 머리글과 다름")
            if SUPER_ADMIN.search(cells[col["용도"]]):
                matches.append((n, _unquote(cells[col["아이디"]]), _unquote(cells[col["비밀번호"]])))
    if not tables:
        raise AccountsError("'용도 | 아이디 | 비밀번호' 계정 표 없음")
    if not matches:
        raise AccountsError("비밀번호 로그인 super_admin 행 없음 (관리자가 Google 전용이면 O4O_ACCESS_TOKEN 사용)")
    if len(matches) > 1:
        raise AccountsError(f"super_admin 행이 {len(matches)}개 — 하나만 남길 것")
    n, email, password = matches[0]
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise AccountsError(f"{n}행 super_admin 아이디가 비었거나 이메일 형식이 아님")
    if not password or password in {"-", "—"} or re.search(r"\s", password):
        raise AccountsError(f"{n}행 super_admin 비밀번호가 비었거나 공백을 포함함")
    return email, password


def login(api: str) -> str:
    tok = os.environ.get("O4O_ACCESS_TOKEN", "")
    if tok:
        return tok
    try:
        email, password = super_admin_credentials(ACCOUNTS.read_text(encoding="utf-8"))
    except (AccountsError, OSError) as e:
        sys.exit(f"{ACCOUNTS.name}: {e if isinstance(e, AccountsError) else '파일을 읽지 못함'}")
    st, data, _ = post(f"{api}/auth/login",
                       {}, {"email": email, "password": password, "serviceKey": "neture", "includeLegacyTokens": True})
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
