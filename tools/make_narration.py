#!/usr/bin/env python3
"""
make_narration.py — 내레이션 원고를 한 줄씩 mp3 로 만든다.

  narration/ep1_script.tsv   원고 (ID <탭> 문장).  이 파일은 건드리지 않는다.
  narration/pronounce.tsv    발음 교정표 (ID <탭> TTS 에 넣을 문장).  선택.
  audio/<ID>.mp3             출력

TTS 는 edge-tts (Microsoft Edge 온라인 음성). 네트워크 연결이 필요하다.

사용법:
    pip install edge-tts
    python tools/make_narration.py                 # 없는 것만 생성
    python tools/make_narration.py --force         # 전부 다시 생성
    python tools/make_narration.py --only C14 E02  # 특정 줄만 다시 생성
    python tools/make_narration.py --check         # 생성하지 않고 점검만
    python tools/make_narration.py --proxy http://127.0.0.1:8080
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

VOICE = "ko-KR-InJoonNeural"
RATE = "+5%"
SCRIPT = Path("narration/ep1_script.tsv")
PRONOUNCE = Path("narration/pronounce.tsv")
OUTDIR = Path("audio")
EXPECTED = 69


def load_tsv(path: Path, allow_comments=False) -> list[tuple[str, str]]:
    rows = []
    if not path.is_file():
        return rows
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        if allow_comments and raw.lstrip().startswith("#"):
            continue
        if "\t" not in raw:
            sys.exit(f"[오류] {path}:{n} 탭이 없습니다 → {raw[:50]}")
        pid, text = raw.split("\t", 1)
        rows.append((pid.strip(), text.strip()))
    return rows


def scan_numbers(rows) -> list[tuple[str, list[str]]]:
    """TTS 가 틀리기 쉬운 숫자/약어가 든 줄을 찾는다."""
    found = []
    for pid, text in rows:
        hits = re.findall(r"\d+(?:[억만천]|년|분기|명|시|일|개월|원)?|[A-Z]{2,}", text)
        if hits:
            found.append((pid, hits))
    return found


async def synth(items, outdir: Path, proxy: str | None):
    import edge_tts

    ok, fail = 0, []
    for i, (pid, spoken) in enumerate(items, 1):
        dest = outdir / f"{pid}.mp3"
        try:
            kw = {"proxy": proxy} if proxy else {}
            await edge_tts.Communicate(spoken, VOICE, rate=RATE, **kw).save(str(dest))
            size = dest.stat().st_size
            if size < 1000:
                raise RuntimeError(f"파일이 너무 작음 ({size} bytes)")
            print(f"  [{i:2d}/{len(items)}] {pid}.mp3  {size // 1024}KB")
            ok += 1
        except Exception as e:
            print(f"  [{i:2d}/{len(items)}] {pid}  실패: {e}")
            dest.unlink(missing_ok=True)
            fail.append(pid)
        await asyncio.sleep(0.25)          # 연속 요청 제한 회피
    return ok, fail


def main():
    ap = argparse.ArgumentParser(description="내레이션 원고를 줄 단위 mp3 로 생성")
    ap.add_argument("--force", action="store_true", help="이미 있는 파일도 다시 생성")
    ap.add_argument("--only", nargs="+", metavar="ID", help="해당 ID 만 생성")
    ap.add_argument("--check", action="store_true", help="생성하지 않고 점검만")
    ap.add_argument("--proxy", default=None, help="HTTP 프록시 (예: http://127.0.0.1:8080)")
    a = ap.parse_args()

    rows = load_tsv(SCRIPT)
    if not rows:
        sys.exit(f"[오류] {SCRIPT} 를 찾을 수 없습니다. 저장소 루트에서 실행하세요.")

    ids = [p for p, _ in rows]
    if len(ids) != len(set(ids)):
        dup = {p for p in ids if ids.count(p) > 1}
        sys.exit(f"[오류] ID 중복: {sorted(dup)}")
    if len(rows) != EXPECTED:
        print(f"  [경고] 원고가 {len(rows)}줄입니다 (예상 {EXPECTED}줄)")

    overrides = dict(load_tsv(PRONOUNCE, allow_comments=True))
    unknown = set(overrides) - set(ids)
    if unknown:
        sys.exit(f"[오류] 발음 교정표에 원고에 없는 ID: {sorted(unknown)}")

    print(f"원고 {len(rows)}줄 / 발음 교정 {len(overrides)}줄 / 음성 {VOICE} / 속도 {RATE}")

    if a.check:
        print("\n숫자·약어가 들어간 줄 (들어보고 이상하면 pronounce.tsv 에 추가):")
        for pid, hits in scan_numbers(rows):
            mark = "교정됨" if pid in overrides else "      "
            print(f"  {mark}  {pid}  {', '.join(hits[:8])}")
        missing = [p for p in ids if not (OUTDIR / f"{p}.mp3").is_file()]
        print(f"\n생성됨 {len(ids) - len(missing)}/{len(ids)}")
        if missing:
            print(f"없음: {' '.join(missing)}")
        return

    OUTDIR.mkdir(parents=True, exist_ok=True)
    todo = []
    for pid, text in rows:
        if a.only and pid not in a.only:
            continue
        dest = OUTDIR / f"{pid}.mp3"
        if dest.is_file() and not a.force and not a.only:
            continue
        todo.append((pid, overrides.get(pid, text)))

    if a.only:
        miss = set(a.only) - set(ids)
        if miss:
            sys.exit(f"[오류] 없는 ID: {sorted(miss)}")
    if not todo:
        print("생성할 것이 없습니다. (--force 로 전부 재생성)")
        return

    print(f"\n{len(todo)}개 생성:")
    ok, fail = asyncio.run(synth(todo, OUTDIR, a.proxy))

    print(f"\n성공 {ok} / 실패 {len(fail)}")
    if fail:
        print(f"실패한 ID: {' '.join(fail)}")
        print(f"다시: python tools/make_narration.py --only {' '.join(fail)}")
        sys.exit(1)
    total = sum(1 for p in ids if (OUTDIR / f"{p}.mp3").is_file())
    print(f"audio/ 에 {total}/{len(ids)}개")


if __name__ == "__main__":
    main()
