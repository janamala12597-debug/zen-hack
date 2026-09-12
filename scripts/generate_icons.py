import zlib
import struct
import math
import os

def create_png(width, height, draw_fn, output_path):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    # width (4), height (4), bit depth (1), color type (1: 6=RGBA), compression (1), filter (1), interlace (1)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png += struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data
    png += struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data))

    # Raw image data: height scanlines, each scanline starts with filter byte 0
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type None
        for x in range(width):
            r, g, b, a = draw_fn(x, y, width, height)
            raw_data.extend([r, g, b, a])

    # IDAT chunk
    compressed_data = zlib.compress(bytes(raw_data), 9)
    png += struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data
    png += struct.pack('>I', zlib.crc32(b'IDAT' + compressed_data))

    # IEND chunk
    png += struct.pack('>I', 0) + b'IEND'
    png += struct.pack('>I', zlib.crc32(b'IEND'))

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(png)
    print(f"Generated: {output_path} ({width}x{height})")

def agri_icon(x, y, w, h, maskable=False):
    # Center and normalized coords (-1 to 1)
    nx = (x / w) * 2 - 1
    ny = (y / h) * 2 - 1
    dist = math.sqrt(nx*nx + ny*ny)

    # Base emerald background
    # Gradient from rich emerald #059669 to deep forest #166534
    factor = (ny + 1) / 2.0
    r_bg = int(5 + factor * (22 - 5))
    g_bg = int(150 + factor * (101 - 150))
    b_bg = int(105 + factor * (52 - 105))

    # Shield outline shape
    # Shield shape formula: y >= -0.65 and inside shield bounds
    in_shield = False
    scale = 0.55 if maskable else 0.7
    sx = nx / scale
    sy = ny / scale

    if sy >= -0.75 and sy <= 0.85 and abs(sx) <= 0.85:
        if sy <= 0.2:
            in_shield = True
        else:
            # tapered curve to bottom point
            curve = 0.85 * (1.0 - ((sy - 0.2) / 0.65) ** 1.8)
            if abs(sx) <= curve:
                in_shield = True

    # Sprout / plant in center
    in_plant = False
    # Stem
    if in_shield:
        if abs(sx) <= 0.06 and -0.2 <= sy <= 0.45:
            in_plant = True
        # Left leaf
        dx_l = sx + 0.22
        dy_l = sy - 0.05
        if dx_l*dx_l + dy_l*dy_l <= 0.04 and sx < 0:
            in_plant = True
        # Right leaf
        dx_r = sx - 0.22
        dy_r = sy + 0.1
        if dx_r*dx_r + dy_r*dy_r <= 0.04 and sx > 0:
            in_plant = True
        # Top sprout drop
        dx_t = sx
        dy_t = sy + 0.35
        if dx_t*dx_t + dy_t*dy_t <= 0.025:
            in_plant = True

    if not maskable and dist > 0.95:
        # Rounded corners for non-maskable
        return (0, 0, 0, 0)

    if in_plant:
        # Golden amber/amber-yellow sprout
        return (251, 191, 36, 255)
    elif in_shield:
        # Bright shield fill
        return (16, 185, 129, 255)
    else:
        return (r_bg, g_bg, b_bg, 255)

if __name__ == '__main__':
    create_png(192, 192, lambda x,y,w,h: agri_icon(x,y,w,h,False), 'public/pwa-192x192.png')
    create_png(512, 512, lambda x,y,w,h: agri_icon(x,y,w,h,False), 'public/pwa-512x512.png')
    create_png(512, 512, lambda x,y,w,h: agri_icon(x,y,w,h,True), 'public/pwa-maskable-512x512.png')
    create_png(180, 180, lambda x,y,w,h: agri_icon(x,y,w,h,False), 'public/apple-touch-icon.png')
