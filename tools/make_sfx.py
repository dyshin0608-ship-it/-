#!/usr/bin/env python3
"""
make_sfx.py — 효과음을 직접 합성한다.

외부에서 음원을 받을 수 없는 환경이라 numpy 로 만든다. 정보 영상에서 쓰는
단순한 UI 계열 소리들이라 합성으로 충분하다.

  sfx/<이름>.wav   44100Hz 모노

사용법:
    python tools/make_sfx.py
주파수 선택 기준: 사람 목소리는 300~3400Hz 에 에너지가 몰려 있다. 그 대역에
둔 효과음은 음량을 올려도 말소리에 가려져 들리지 않는다. 중음대 효과음은
그 위(1.5kHz~13kHz)로 올리고, 둥·발소리처럼 무게가 필요한 것만 아래에 둔다.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

SR = 44100
OUT = Path("sfx")


def t(dur):
    return np.linspace(0, dur, int(SR * dur), endpoint=False)


def env(n, attack=0.004, decay=0.12, power=2.0):
    a = int(SR * attack); d = n - a
    e = np.concatenate([np.linspace(0, 1, max(1, a)),
                        np.linspace(1, 0, max(1, d)) ** power])
    return e[:n]


def sine(freq, dur, amp=0.5):
    x = t(dur)
    f = np.asarray(freq, dtype=float)
    if f.ndim == 0:
        y = np.sin(2 * np.pi * f * x)
    else:                                   # 주파수가 변하는 경우
        inst = np.interp(x, np.linspace(0, dur, f.size), f)
        y = np.sin(2 * np.pi * np.cumsum(inst) / SR)
    return amp * y * env(x.size)


def noise(dur, amp=0.5, lo=None, hi=None):
    n = int(SR * dur)
    y = np.random.default_rng(7).standard_normal(n)
    spec = np.fft.rfft(y)
    f = np.fft.rfftfreq(n, 1 / SR)
    if lo: spec[f < lo] = 0
    if hi: spec[f > hi] = 0
    y = np.fft.irfft(spec, n)
    y /= (np.abs(y).max() or 1)
    return amp * y * env(n)


def norm(y, peak=0.9):
    m = np.abs(y).max() or 1
    return (y / m) * peak


def pad(y, head=0.0, tail=0.05):
    return np.concatenate([np.zeros(int(SR * head)), y, np.zeros(int(SR * tail))])


def build():
    s = {}
    # 띡 — 숫자 하나하나 찍을 때
    s["beep_tick"] = norm(sine(2093, 0.09, 0.6) + sine(4186, 0.09, 0.2), 0.8)
    # 뚜-웅 — 값이 내려갈 때
    s["drop"] = norm(sine(np.array([1760, 880, 330]), 0.55, 0.6)
                 + sine(np.array([3520, 1760, 660]), 0.55, 0.25), 0.85)
    # 띠링 — 값이 뛸 때 (코인 느낌)
    s["rise"] = norm(np.concatenate([sine(1568, 0.07, 0.5), sine(2349, 0.22, 0.5)]), 0.85)
    # 종이 넘기는 소리
    s["paper_flip"] = norm(noise(0.18, 0.5, lo=3500, hi=13000), 0.7)
    # 톡 — 칸을 셀 때
    s["tok"] = norm(sine(2637, 0.035, 0.5) + noise(0.035, 0.3, lo=3000), 0.7)
    # 띠리링 — 칸이 올라갈 때
    s["levelup"] = norm(np.concatenate([sine(1047, 0.085, 0.45), sine(1319, 0.085, 0.45),
                                        sine(1568, 0.085, 0.45), sine(2093, 0.3, 0.5)]), 0.9)
    # 발소리
    s["step"] = norm(sine(np.array([150, 80]), 0.1, 0.5) + noise(0.1, 0.3, hi=1600), 0.5)
    # 무전기 치직
    rng = np.random.default_rng(11)
    n = int(SR * 0.42)
    crackle = rng.standard_normal(n) * (rng.random(n) > 0.78)
    body = noise(0.42, 0.5, lo=1200, hi=6500)
    s["radio"] = norm(body + 0.5 * crackle * env(n, decay=0.4), 0.5)
    # 둥 — 무겁게 한 번
    s["boom_low"] = norm(sine(np.array([85, 55]), 1.1, 0.9), 0.8)
    # 탁 — 서류 쌓기
    s["tak"] = norm(noise(0.07, 0.5, lo=2500, hi=11000) + sine(240, 0.07, 0.25), 0.7)
    # 쾅 — 도장
    s["stamp"] = norm(sine(np.array([180, 70]), 0.45, 0.9)
                      + noise(0.45, 0.45, lo=120, hi=3500), 0.95)
    # 카칭 — 금액
    s["kaching"] = norm(np.concatenate([
        noise(0.05, 0.4, lo=2000),
        sine(1568, 0.1, 0.45) + sine(2093, 0.1, 0.3),
        sine(2093, 0.33, 0.4) + sine(2637, 0.33, 0.22)]), 0.85)
    # 휙 — 전환
    s["whoosh"] = norm(noise(0.38, 0.6, lo=300, hi=7000)
                       * np.linspace(0.2, 1.0, int(SR * 0.38)) ** 2, 0.6)
    # 뽁 — 팝업
    s["pop"] = norm(sine(np.array([700, 2400]), 0.1, 0.7), 0.8)

    OUT.mkdir(exist_ok=True)
    import wave
    for name, y in s.items():
        y = pad(y)
        data = (np.clip(y, -1, 1) * 32767).astype("<i2")
        with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(data.tobytes())
        print(f"  {name:12s} {len(y)/SR:5.2f}s")
    print(f"\n{len(s)}개 → {OUT}/")


if __name__ == "__main__":
    build()
