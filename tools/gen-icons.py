# 골프총무 PWA 아이콘 생성기 (의존성: Pillow)
# 에메랄드(#059669) 배경 + 흰색 골프 깃발/공을 직접 그려 PNG 세트 생성.
# 이모지 폰트 의존성을 피하려고 도형으로 직접 그림.
# 실행: python tools/gen-icons.py  →  frontend/icons/*.png
import os
from PIL import Image, ImageDraw

EMERALD = (5, 150, 105, 255)   # #059669
EMERALD_DK = (4, 120, 87, 255) # #047857 (살짝 어두운 그라데이션 느낌용 그림자)
WHITE = (255, 255, 255, 255)
OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "icons")
os.makedirs(OUT, exist_ok=True)

def draw_icon(size, maskable=False):
    # 4배 슈퍼샘플링 후 축소 → 안티앨리어싱
    S = size * 4
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 배경: maskable이면 꽉 찬 정사각(OS가 둥글게 마스킹), 아니면 라운드 사각
    if maskable:
        d.rectangle([0, 0, S, S], fill=EMERALD)
        cz = 0.66  # content zone (안전영역 안에 콘텐츠)
    else:
        r = int(S * 0.22)
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=EMERALD)
        cz = 0.78

    # 콘텐츠 영역 좌표 헬퍼
    m = (1 - cz) / 2  # 여백 비율
    def X(t): return int((m + t * cz) * S)
    def Y(t): return int((m + t * cz) * S)

    # 그라운드(퍼팅 그린) — 하단 흰색 타원
    d.ellipse([X(0.10), Y(0.78), X(0.90), Y(0.98)], fill=(255, 255, 255, 60))

    # 깃대 (pole)
    pole_w = int(0.045 * cz * S)
    px = X(0.62)
    d.rounded_rectangle([px, Y(0.12), px + pole_w, Y(0.90)], radius=pole_w // 2, fill=WHITE)

    # 깃발 (pennant) — 깃대 상단에서 왼쪽으로 펄럭이는 삼각형
    top = Y(0.14)
    flag = [
        (px, top),
        (px, Y(0.40)),
        (X(0.18), Y(0.27)),
    ]
    d.polygon(flag, fill=WHITE)

    # 홀컵 (깃대 밑동 어두운 타원)
    d.ellipse([px - pole_w * 2, Y(0.86), px + pole_w * 3, Y(0.92)], fill=EMERALD_DK)

    # 골프공 — 왼쪽 아래 흰 원 + 음영
    bx, by, br = X(0.30), Y(0.80), int(0.11 * cz * S)
    d.ellipse([bx - br, by - br, bx + br, by + br], fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)

targets = [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-maskable-512.png", 512, True),
    ("apple-touch-icon-180.png", 180, True),
    ("favicon-32.png", 32, False),
]
for name, size, mask in targets:
    p = os.path.join(OUT, name)
    draw_icon(size, mask).save(p)
    print("wrote", os.path.relpath(p))
print("done")
