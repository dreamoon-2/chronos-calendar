"""生成 Chronos Calendar 的 PWA 图标（真实 PNG）。"""
import os
from PIL import Image, ImageDraw

BRAND = (91, 75, 227, 255)  # #5b4be3
WHITE = (255, 255, 255, 255)


def make_icon(size: int, path: str) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 背景圆角方块
    d.rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=BRAND
    )

    # 白色日历页
    m = int(size * 0.16)
    top = int(size * 0.20)
    d.rounded_rectangle(
        [m, top, size - m, size - m], radius=int(size * 0.08), fill=WHITE
    )

    # 日历页顶部品牌色横条
    header_h = int(size * 0.14)
    d.rectangle([m, top, size - m, top + header_h], fill=BRAND)

    # 顶部两个“装订环”
    ring_r = int(size * 0.045)
    ring_y = top - int(size * 0.04)
    for cx in (int(size * 0.36), int(size * 0.64)):
        d.ellipse(
            [cx - ring_r, ring_y - ring_r, cx + ring_r, ring_y + ring_r],
            fill=WHITE,
        )

    # 网格点（日程示例）
    dot_r = int(size * 0.028)
    dot_color = BRAND
    rows = [0.52, 0.66, 0.80]
    for ry in rows:
        y = int(size * ry)
        d.ellipse([m + m // 2, y - dot_r, m + m // 2 + dot_r * 2, y + dot_r], fill=dot_color)
        d.ellipse(
            [int(size * 0.38), y - dot_r, int(size * 0.38) + dot_r * 2, y + dot_r],
            fill=dot_color,
        )
        d.ellipse(
            [int(size * 0.58), y - dot_r, int(size * 0.58) + dot_r * 2, y + dot_r],
            fill=dot_color,
        )

    img.save(path, "PNG")
    print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    make_icon(192, os.path.join(out_dir, "icon-192.png"))
    make_icon(512, os.path.join(out_dir, "icon-512.png"))
    # 1024 作为 Tauri `tauri icon` 的源图（桌面/移动图标集）
    make_icon(1024, os.path.join(out_dir, "icon-1024.png"))
