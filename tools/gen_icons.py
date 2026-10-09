import struct
import zlib
import os
import pathlib

SIZE = 81
ROOT = pathlib.Path(__file__).resolve().parent.parent / 'miniprogram' / 'images'
ROOT.mkdir(parents=True, exist_ok=True)

def png_write(path, w, h, pixels):
    raw = b''
    for y in range(h):
        raw += b'\x00'
        for x in range(w):
            r, g, b, a = pixels[y][x]
            raw += bytes((r, g, b, a))
    def chunk(t, data):
        c = t + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    path.write_bytes(png)

def new_canvas():
    return [[(0, 0, 0, 0) for _ in range(SIZE)] for _ in range(SIZE)]

def put(pixels, x, y, c):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        pixels[y][x] = c

def fill_rect(pixels, x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(SIZE, y1 + 1)):
        for x in range(max(0, x0), min(SIZE, x1 + 1)):
            put(pixels, x, y, c)

def fill_round_rect(pixels, x0, y0, x1, y1, r, c):
    for y in range(max(0, y0), min(SIZE, y1 + 1)):
        for x in range(max(0, x0), min(SIZE, x1 + 1)):
            cx = max(x0 + r, min(x1 - r, x))
            cy = max(y0 + r, min(y1 - r, y))
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(pixels, x, y, c)
            elif x0 + r <= x <= x1 - r or y0 + r <= y <= y1 - r:
                put(pixels, x, y, c)

def fill_circle(pixels, cx, cy, r, c):
    for y in range(max(0, cy - r), min(SIZE, cy + r + 1)):
        for x in range(max(0, cx - r), min(SIZE, cx + r + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(pixels, x, y, c)

def fill_triangle(pixels, p0, p1, p2, c):
    x0, y0 = p0; x1, y1 = p1; x2, y2 = p2
    minx, maxx = max(0, min(x0, x1, x2)), min(SIZE - 1, max(x0, x1, x2))
    miny, maxy = max(0, min(y0, y1, y2)), min(SIZE - 1, max(y0, y1, y2))
    def area(ax, ay, bx, by, cx, cy):
        return (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    a = area(x0, y0, x1, y1, x2, y2)
    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            s1 = area(x, y, x1, y1, x2, y2)
            s2 = area(x0, y0, x, y, x2, y2)
            s3 = area(x0, y0, x1, y1, x, y)
            neg = (s1 < 0) or (s2 < 0) or (s3 < 0)
            pos = (s1 > 0) or (s2 > 0) or (s3 > 0)
            if not (neg and pos):
                put(pixels, x, y, c)

def icon_goods(c):
    p = new_canvas()
    fill_round_rect(p, 14, 14, 37, 37, 6, c)
    fill_round_rect(p, 44, 14, 67, 37, 6, c)
    fill_round_rect(p, 14, 44, 37, 67, 6, c)
    fill_round_rect(p, 44, 44, 67, 67, 6, c)
    return p

def icon_chat(c):
    p = new_canvas()
    fill_round_rect(p, 10, 16, 71, 58, 14, c)
    fill_triangle(p, (26, 56), (26, 71), (44, 56), c)
    fill_round_rect(p, 24, 33, 34, 42, 4, c)
    fill_round_rect(p, 39, 33, 49, 42, 4, c)
    fill_round_rect(p, 54, 33, 64, 42, 4, c)
    return p

def icon_mine(c):
    p = new_canvas()
    fill_circle(p, 40, 26, 14, c)
    fill_round_rect(p, 16, 52, 64, 74, 14, c)
    return p

GRAY = (154, 160, 166, 255)
ACTIVE = (79, 70, 229, 255)

for name, fn in (('goods', icon_goods), ('chat', icon_chat), ('mine', icon_mine)):
    png_write(ROOT / ('tab-%s.png' % name), SIZE, SIZE, fn(GRAY))
    png_write(ROOT / ('tab-%s-active.png' % name), SIZE, SIZE, fn(ACTIVE))

print('icons generated:', len(list(ROOT.glob('*.png'))))
