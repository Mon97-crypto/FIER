#!/usr/bin/env python3
"""Cut a t-shirt out of a studio product photo (plain grey/white backdrop).

Usage: python3 scripts/make-cutout.py input.webp output.webp [--width 720]

How it works: backdrop pixels are low-saturation greys. Starting from the image
border, we flood-fill through low-saturation pixels; everything reached is
background. The garment's coloured fabric stops the fill, so white/grey parts of
the print inside the shirt are kept. The mask is then eroded 1px and feathered.
Needs only Pillow + numpy.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter


def cutout(src, dst, width=720, sat_max=34, min_light=70):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    mx, mn = a.max(axis=2), a.min(axis=2)
    candidate = ((mx - mn) <= sat_max) & (mx >= min_light)
    bg = np.zeros_like(candidate)
    bg[0, :], bg[-1, :], bg[:, 0], bg[:, -1] = candidate[0, :], candidate[-1, :], candidate[:, 0], candidate[:, -1]
    # flood fill = repeated 4-neighbour dilation constrained to background candidates
    while True:
        grown = bg.copy()
        grown[1:, :] |= bg[:-1, :]
        grown[:-1, :] |= bg[1:, :]
        grown[:, 1:] |= bg[:, :-1]
        grown[:, :-1] |= bg[:, 1:]
        grown &= candidate
        if (grown == bg).all():
            break
        bg = grown
    # keep only the garment: the foreground region connected to the image centre
    fgm = ~bg
    keep = np.zeros_like(fgm)
    h, w = fgm.shape
    cy, cx = h // 2, w // 2
    keep[cy - 5:cy + 5, cx - 5:cx + 5] = fgm[cy - 5:cy + 5, cx - 5:cx + 5]
    while True:
        grown = keep.copy()
        grown[1:, :] |= keep[:-1, :]
        grown[:-1, :] |= keep[1:, :]
        grown[:, 1:] |= keep[:, :-1]
        grown[:, :-1] |= keep[:, 1:]
        grown &= fgm
        if (grown == keep).all():
            break
        keep = grown
    fg = Image.fromarray((keep * 255).astype(np.uint8))
    # fill pin-holes, pull the edge in 1px to drop grey fringe, then feather
    fg = fg.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MinFilter(3))
    fg = fg.filter(ImageFilter.GaussianBlur(1.1))
    out = im.convert('RGBA')
    out.putalpha(fg)
    out = out.crop(out.getbbox())
    if out.width > width:
        out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
    out.save(dst, 'WEBP', quality=88, method=6)
    return out.size


if __name__ == '__main__':
    args = sys.argv[1:]
    w = 720
    if '--width' in args:
        i = args.index('--width'); w = int(args[i + 1]); del args[i:i + 2]
    print(cutout(args[0], args[1], w))
