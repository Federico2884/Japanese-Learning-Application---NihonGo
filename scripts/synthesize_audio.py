"""Membuat berkas audio bunyi kana memakai Piper TTS.

Dijalankan oleh scripts/build-audio.ts, bukan langsung.

Prasyarat (sekali saja, hanya di mesin pengembang):
    pip install --user piper-tts pyopenjtalk-plus

Model suara diunduh otomatis ke folder cache bila belum ada. Berkas hasilnya
kecil dan ikut disimpan di repo, jadi aplikasi tidak perlu TTS sama sekali.

Suara: Piper "ja_JA-hi_fi_captain-medium", dari dataset Hi-Fi-CAPTAIN (NICT),
lisensi CC BY-NC-SA 4.0 — boleh dipakai dan disebarkan untuk keperluan bukan
komersial, dengan menyebut sumbernya.
"""

import audioop
import json
import sys
import urllib.request
import wave
from pathlib import Path

VOICE_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/ja/ja_JA/hi_fi_captain/medium"
VOICE_FILES = ["ja_JA-hi_fi_captain-medium.onnx", "ja_JA-hi_fi_captain-medium.onnx.json"]

# 16 kHz mono sudah cukup untuk satu suku kata dan memangkas ukuran berkas separuh.
TARGET_RATE = 16000
# Ambang senyap dihitung dari tingkat rata-rata (RMS), bukan dari puncak:
# letupan singkat di awal bisa membuat ambang berbasis puncak terlalu tinggi
# sehingga bunyi vokalnya sendiri ikut terpotong.
SILENCE_FLOOR = 0.12
# Durasi terpendek yang masih enak didengar; kekurangannya diisi keheningan.
MIN_SECONDS = 0.25
# Sisa keheningan yang dibiarkan di kedua ujung, dalam detik.
PAD_SECONDS = 0.06


def unduh_suara(cache: Path) -> tuple[Path, Path]:
    cache.mkdir(parents=True, exist_ok=True)
    hasil = []
    for nama in VOICE_FILES:
        tujuan = cache / nama
        if not tujuan.exists():
            print("mengunduh", nama, "...", flush=True)
            urllib.request.urlretrieve(VOICE_BASE + "/" + nama, tujuan)
        hasil.append(tujuan)
    return hasil[0], hasil[1]


def potong_senyap(data: bytes, width: int, rate: int) -> bytes:
    """Membuang keheningan di awal dan akhir, menyisakan jeda pendek."""
    rms = audioop.rms(data, width)
    if rms == 0:
        return data
    ambang = rms * SILENCE_FLOOR
    langkah = width
    awal, akhir = 0, len(data)

    for i in range(0, len(data) - width, langkah):
        if abs(audioop.getsample(data, width, i // width)) > ambang:
            awal = i
            break
    for i in range(len(data) - width, 0, -langkah):
        if abs(audioop.getsample(data, width, i // width)) > ambang:
            akhir = i + width
            break

    pad = int(PAD_SECONDS * rate) * width
    awal = max(0, awal - pad)
    akhir = min(len(data), akhir + pad)
    dipotong = data[awal:akhir]

    # Bunyi yang sangat singkat diberi keheningan agar tidak terdengar terputus.
    minimal = int(MIN_SECONDS * rate) * width
    if len(dipotong) < minimal:
        dipotong += bytes(minimal - len(dipotong))
    return dipotong


def main() -> int:
    if len(sys.argv) < 3:
        print("pemakaian: synthesize_audio.py <manifest.json> <folder-keluaran>")
        return 1

    manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    keluaran = Path(sys.argv[2])
    keluaran.mkdir(parents=True, exist_ok=True)

    try:
        from piper import PiperVoice
    except ImportError:
        print("piper-tts belum terpasang. Jalankan: pip install --user piper-tts pyopenjtalk-plus")
        return 1

    model, konfigurasi = unduh_suara(Path(sys.argv[3]) if len(sys.argv) > 3 else Path.home() / ".cache" / "nihongo-piper")
    suara = PiperVoice.load(str(model), config_path=str(konfigurasi))

    total = 0
    for entri in manifest:
        berkas = keluaran / (entri["file"] + ".wav")
        sementara = keluaran / (entri["file"] + ".tmp.wav")

        with wave.open(str(sementara), "wb") as w:
            suara.synthesize_wav(entri["text"], w)

        with wave.open(str(sementara)) as r:
            channels, width, rate = r.getnchannels(), r.getsampwidth(), r.getframerate()
            data = r.readframes(r.getnframes())

        if channels > 1:
            data = audioop.tomono(data, width, 0.5, 0.5)
        data, _ = audioop.ratecv(data, width, 1, rate, TARGET_RATE, None)
        data = potong_senyap(data, width, TARGET_RATE)
        # Samakan tingkat kenyaringan supaya tidak ada huruf yang terdengar jauh lebih pelan.
        puncak = audioop.max(data, width)
        if puncak > 0:
            data = audioop.mul(data, width, min(4.0, 26000 / puncak))

        with wave.open(str(berkas), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(width)
            w.setframerate(TARGET_RATE)
            w.writeframes(data)

        sementara.unlink()
        total += berkas.stat().st_size

    print(len(manifest), "berkas,", round(total / 1024), "KB ->", keluaran)
    return 0


if __name__ == "__main__":
    sys.exit(main())
