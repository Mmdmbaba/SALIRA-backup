#!/usr/bin/env python3
"""Compare geometric reconstruction of SALIRA S mark vs original bitmap."""
from PIL import Image, ImageDraw
import numpy as np

# Polyline model (in original image coordinates)
PATH_A = [(147,132),(139,152),(182,153),(193,124),(159,109),(172,76),(233,76),(226,99)]
PATH_B = [(188,80),(180,104),(214,118),(201,152),(191,153),(204,122),(168,105),(181,76)]

def render(paths, scale, size, origin, width, color=(66,64,63), bg=(255,248,238)):
    img = Image.new('RGB', size, bg)
    d = ImageDraw.Draw(img)
    for p in paths:
        pts = [((x-origin[0])*scale, (y-origin[1])*scale) for x,y in p]
        d.line(pts, fill=color, width=width, joint='curve')
    return img

# Original crop of mark area
orig = Image.open('upload/pasted_image_1794422333674.png').convert('RGB')
orig_mark = orig.crop((130, 66, 244, 163))

# Model render, same region
model = render([PATH_A, PATH_B], scale=4, size=(114*4, 97*4), origin=(130,66), width=6)

# Side by side
combo = Image.new('RGB', (orig_mark.width*4*2 + 40, orig_mark.height*4), (255,255,255))
combo.paste(orig_mark.resize((orig_mark.width*4, orig_mark.height*4), Image.LANCZOS), (0,0))
combo.paste(model, (orig_mark.width*4 + 40, 0))
combo.save('/tmp/compare1.png')
print('saved /tmp/compare1.png')
