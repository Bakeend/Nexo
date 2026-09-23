"""Generate the short, original key sound used by the optional typing effect."""

import math
import random
import struct
import wave
from pathlib import Path


sample_rate = 24_000
duration = 0.055
random_source = random.Random(37)
output = Path(__file__).resolve().parents[1] / "assets" / "sounds" / "typing-key.wav"

samples = []
for index in range(int(sample_rate * duration)):
    time = index / sample_rate
    click = random_source.uniform(-1, 1) * math.exp(-time * 180)
    key_body = math.sin(2 * math.pi * 530 * time) * math.exp(-time * 85)
    low_thump = math.sin(2 * math.pi * 170 * time) * math.exp(-time * 70)
    value = 0.28 * click + 0.13 * key_body + 0.11 * low_thump
    samples.append(struct.pack("<h", round(max(-1, min(1, value)) * 32767)))

with wave.open(str(output), "wb") as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(sample_rate)
    audio.writeframes(b"".join(samples))
