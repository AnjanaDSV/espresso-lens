#!/usr/bin/env python3
"""
Generate 5 synthetic espresso test images for EspressoLens demo.
Requirements: pip install Pillow numpy

Outputs to:
  ingestion/samples/test_images/
  frontend/public/samples/          (served by Next.js at /samples/*)
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.join(SCRIPT_DIR, "..")

OUTPUT_DIRS = [
    os.path.join(ROOT_DIR, "ingestion", "samples", "test_images"),
    os.path.join(ROOT_DIR, "frontend", "public", "samples"),
]

SIZE = 400
CX, CY = 200, 200
R = 178  # inner circle radius (espresso view)
RIM_W = 7  # metallic portafilter rim width


# ── helpers ─────────────────────────────────────────────────────────────────

def _grid():
    return np.mgrid[0:SIZE, 0:SIZE]   # (Y, X)


def _dist(cy=CY, cx=CX):
    Y, X = _grid()
    return np.sqrt((X - cx) ** 2 + (Y - cy) ** 2).astype(np.float32)


def radial(inner, outer, cx=CX, cy=CY, r=R):
    """Radial gradient: inner color at center → outer color at edge."""
    dist = _dist(cy, cx)
    t = np.clip(dist / r, 0, 1)
    arr = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = inner[c] + (outer[c] - inner[c]) * t
    return np.clip(arr, 0, 255).astype(np.uint8)


def add_noise(arr, strength=6, seed=42):
    rng = np.random.default_rng(seed=seed)
    noise = ((rng.random((SIZE, SIZE, 3)) * 2 - 1) * strength).astype(np.int16)
    return np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)


def apply_mask(arr, cx=CX, cy=CY, r=R, bg=(18, 16, 13)):
    """Pixels outside the circle → dark background."""
    Y, X = _grid()
    outside = (X - cx) ** 2 + (Y - cy) ** 2 > r ** 2
    result = arr.copy()
    for c, v in enumerate(bg):
        result[:, :, c][outside] = v
    return result


def add_rim(arr, cx=CX, cy=CY, r=R, w=RIM_W):
    """Metallic portafilter rim ring."""
    Y, X = _grid()
    dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2).astype(np.float32)
    ring = (dist >= r - w) & (dist <= r + w // 2)
    angle = np.arctan2(Y - cy, X - cx)
    shine = (0.5 + 0.3 * np.sin(angle * 3 + 0.7)).astype(np.float32)
    result = arr.copy().astype(np.float32)
    for c in range(3):
        base = 115 + shine * 45
        result[:, :, c][ring] = base[ring]
    return np.clip(result, 0, 255).astype(np.uint8)


def tiger_stripes(arr, cx=CX, cy=CY, freq=9, strength=18, seed=0):
    """Radial tiger-stripe crema texture."""
    Y, X = _grid()
    angle = np.arctan2(Y - cy, X - cx)
    dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2).astype(np.float32)
    stripe = np.cos(angle * freq + dist * 0.035 + seed) * strength
    result = arr.astype(np.int16) + stripe.astype(np.int16)[:, :, np.newaxis]
    return np.clip(result, 0, 255).astype(np.uint8)


def save_image(arr, filename, blur=0.9):
    img = Image.fromarray(arr)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur))
    for d in OUTPUT_DIRS:
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, filename)
        img.save(path, "JPEG", quality=93)
        print(f"  -> {path}")


# ── generators ───────────────────────────────────────────────────────────────

def gen_perfect_shot():
    """Golden crema, even radial distribution, tiger-stripe texture."""
    arr = radial(inner=(190, 135, 52), outer=(112, 68, 22))
    arr = tiger_stripes(arr, freq=11, strength=22)
    # Bright crema dome highlight at center
    dist = _dist()
    highlight = np.clip((1 - dist / 75) * 35, 0, 35).astype(np.int16)
    arr = np.clip(arr.astype(np.int16) + highlight[:, :, np.newaxis], 0, 255).astype(np.uint8)
    arr = add_noise(arr, strength=5)
    arr = apply_mask(arr)
    arr = add_rim(arr)
    save_image(arr, "perfect_shot.jpg")


def gen_channeling_severe():
    """Dark channels cut through medium-brown espresso base."""
    arr = radial(inner=(145, 88, 32), outer=(102, 60, 18))
    arr = add_noise(arr, strength=7, seed=99)

    img = Image.fromarray(arr)
    draw = ImageDraw.Draw(img)

    # Four dark channel streaks at slightly different angles
    channels = [
        [(152, 15), (148, 390)],
        [(200, 10), (185, 390)],
        [(238, 20), (258, 390)],
        [(268, 40), (300, 390)],
    ]
    for pts in channels:
        draw.line(pts, fill=(22, 9, 3), width=5)       # core channel
        draw.line(pts, fill=(12, 5, 1), width=2)        # darkest center
        edge = [(p[0] + 6, p[1]) for p in pts]
        draw.line(edge, fill=(172, 118, 52), width=2)   # bright water edge

    arr = np.array(img)
    arr = apply_mask(arr)
    arr = add_rim(arr)
    save_image(arr, "channeling_severe.jpg")


def gen_underextracted():
    """Pale blonde color, thin crema, watery appearance."""
    arr = radial(inner=(222, 198, 152), outer=(198, 172, 125))
    # Sparse bright patches — thin, uneven crema
    rng = np.random.default_rng(seed=7)
    patches = (rng.random((SIZE, SIZE)) > 0.78).astype(np.int16) * 18
    arr = np.clip(arr.astype(np.int16) + patches[:, :, np.newaxis], 0, 255).astype(np.uint8)
    arr = add_noise(arr, strength=11, seed=7)  # more noise = watery look
    # Dull, faint flow lines (barely visible)
    arr = tiger_stripes(arr, freq=6, strength=6, seed=1)
    arr = apply_mask(arr)
    arr = add_rim(arr)
    save_image(arr, "underextracted.jpg")


def gen_overextracted():
    """Near-black burnt center, very dark throughout."""
    arr = radial(inner=(20, 9, 3), outer=(58, 30, 10))
    # Slight reddish-brown burnt tint at outer edge
    dist = _dist()
    burnt = np.clip((dist - R * 0.5) / (R * 0.45), 0, 1) * 22
    arr[:, :, 0] = np.clip(arr[:, :, 0].astype(np.float32) + burnt, 0, 255).astype(np.uint8)
    arr = add_noise(arr, strength=4, seed=3)
    arr = apply_mask(arr)
    arr = add_rim(arr)
    save_image(arr, "overextracted.jpg")


def gen_uneven_flow():
    """Left side dark espresso, right side pale blonde — strong asymmetry."""
    Y, X = _grid()
    t_x = X.astype(np.float32) / (SIZE - 1)   # 0 = left, 1 = right
    dark  = np.array([88, 48, 15], dtype=np.float32)
    light = np.array([208, 180, 128], dtype=np.float32)
    arr = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = dark[c] + (light[c] - dark[c]) * t_x
    # Gentle radial edge darkening for depth
    dist = _dist()
    edge_shadow = np.clip(dist / R, 0, 1) * 18
    arr -= edge_shadow[:, :, np.newaxis]
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    arr = add_noise(arr, strength=7, seed=55)
    arr = apply_mask(arr)
    arr = add_rim(arr)
    save_image(arr, "uneven_flow.jpg")


# ── main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("EspressoLens - generating 5 synthetic test images\n")
    gen_perfect_shot()
    print()
    gen_channeling_severe()
    print()
    gen_underextracted()
    print()
    gen_overextracted()
    print()
    gen_uneven_flow()
    print("\nDone. 5 images written to each output directory.")
