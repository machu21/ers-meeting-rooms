import cv2
import numpy as np

# Load office map
img = cv2.imread('public/office.jfif')
h, w, _ = img.shape

# Tile size 84px matches the 64px on 1600-wide canvas
tile_size = 84
tile = np.full((tile_size, tile_size, 3), (67, 91, 141), dtype=np.uint8)

half = tile_size // 2
q1 = tile_size // 8
q2 = tile_size // 4
q3 = (tile_size * 3) // 8

cv2.fillPoly(tile, [np.array([[half, 0], [tile_size, half], [half, tile_size], [0, half]])], (80, 109, 164))
cv2.fillPoly(tile, [np.array([[half, q1], [tile_size - q1, half], [half, tile_size - q1], [q1, half]])], (93, 126, 185))
cv2.fillPoly(tile, [np.array([[half, q2], [tile_size - q2, half], [half, tile_size - q2], [q2, half]])], (107, 142, 201))
cv2.fillPoly(tile, [np.array([[half, q3], [tile_size - q3, half], [half, tile_size - q3], [q3, half]])], (72, 102, 158))

# Diagonal grout lines & borders
cv2.line(tile, (0, 0), (tile_size - 1, tile_size - 1), (34, 52, 90), 2)
cv2.line(tile, (tile_size - 1, 0), (0, tile_size - 1), (34, 52, 90), 2)
cv2.rectangle(tile, (0, 0), (tile_size - 1, tile_size - 1), (26, 42, 74), 1)

# Subtle bevel lines
cv2.line(tile, (0, 0), (tile_size - 1, 0), (121, 157, 212), 1)
cv2.line(tile, (0, 0), (0, tile_size - 1), (121, 157, 212), 1)
cv2.line(tile, (0, tile_size - 1), (tile_size - 1, tile_size - 1), (16, 28, 54), 1)
cv2.line(tile, (tile_size - 1, 0), (tile_size - 1, tile_size - 1), (16, 28, 54), 1)

reps_y = int(np.ceil(h / tile_size))
reps_x = int(np.ceil(w / tile_size))
parquet = np.tile(tile, (reps_y, reps_x, 1))[:h, :w]

# Color conversions
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
bgr = img.astype(np.float32)

# Floor references
dist_main = np.linalg.norm(bgr - np.array([178, 192, 210]), axis=2)
dist_main2 = np.linalg.norm(bgr - np.array([180, 196, 212]), axis=2)
dist_board = np.linalg.norm(bgr - np.array([195, 200, 210]), axis=2)
dist_board_rug = np.linalg.norm(bgr - np.array([215, 220, 225]), axis=2)
dist_meeting = np.linalg.norm(bgr - np.array([195, 195, 205]), axis=2)
dist_exec = np.linalg.norm(bgr - np.array([185, 195, 205]), axis=2)
dist_exec_rug = np.linalg.norm(bgr - np.array([164, 152, 150]), axis=2)
dist_office = np.linalg.norm(bgr - np.array([170, 195, 185]), axis=2)
dist_rest = np.linalg.norm(bgr - np.array([215, 215, 220]), axis=2)

min_dist = np.minimum.reduce([
    dist_main, dist_main2, dist_board, dist_board_rug, 
    dist_meeting, dist_exec, dist_exec_rug, dist_office, dist_rest
])

cand_floor = np.clip((46.0 - min_dist) / 20.0, 0, 1)

# PROTECTIVE MASKS:
# 1. Outer borders and dark wall lines
is_wall_or_dark = (hsv[:, :, 2] < 75) | (lab[:, :, 0] < 78)
cand_floor[is_wall_or_dark] = 0

# 2. Desks, chairs, plants, sofa (high saturation)
is_high_sat = (hsv[:, :, 1] > 45)
cand_floor[is_high_sat] = 0

# 3. Very bright papers/screens
is_very_bright = (lab[:, :, 0] > 246)
cand_floor[is_very_bright] = 0

# 4. Printer protection: x: 30..430, y: 560..860
cand_floor[560:860, 30:430] = 0

# 5. Manager & Lead wall & file cabinet protection
cand_floor[890:1060, 30:670] = 0
cand_floor[1240:1410, 30:670] = 0

# 6. Executive room top wall & window (y: 0..250, x: 30..680)
cand_floor[0:240, 30:680] = 0
# Executive desk area (desk is at x: 270..650, y: 220..420)
cand_floor[220:420, 270:650] = 0

# 7. Restroom porcelain fixtures protection
restroom_zone = np.zeros((h, w), dtype=bool)
restroom_zone[40:440, 680:1520] = True
cand_floor[restroom_zone & (lab[:, :, 0] > 185) & (hsv[:, :, 1] < 25)] = 0

# 8. Presentation whiteboard / monitor in Boardroom (top wall)
cand_floor[0:250, 1540:2020] = 0
# Boardroom table footprint (x: 1700..1940, y: 280..780)
cand_floor[280:780, 1700:1940] = 0

# 9. TVs on walls in Eley & Netflix rooms
cand_floor[740:880, 1600:1980] = 0
cand_floor[1180:1320, 1600:1980] = 0
# Conference tables in Eley & Netflix
cand_floor[900:1080, 1680:1940] = 0
cand_floor[1340:1520, 1680:1940] = 0

# 10. Cubicle Desk Pods Footprint (protect dividers and desks):
# Pod 1: y: 560..820, x: 890..1280
# Pod 2: y: 840..1100, x: 890..1280
# Pod 3: y: 1120..1380, x: 890..1280
# Pod 4: y: 1400..1660, x: 890..1280
desk_pods = [
    (560, 825, 890, 1275),
    (840, 1105, 890, 1275),
    (1120, 1385, 890, 1275),
    (1400, 1665, 890, 1275),
]
for y1, y2, x1, x2 in desk_pods:
    cand_floor[y1:y2, x1:x2] = 0

# 11. Reception desk (x: 1250..1520, y: 1720..2000)
cand_floor[1720:2000, 1250:1520] = 0
# Front entrance doors (x: 880..1240, y: 1750..2016)
cand_floor[1750:2016, 880:1240] = 0

# Smooth the floor mask
cand_floor_u8 = (cand_floor * 255).astype(np.uint8)
cand_floor_u8 = cv2.medianBlur(cand_floor_u8, 5)
cand_floor = cand_floor_u8.astype(np.float32) / 255.0

# Natural ambient shadow factor
shadow_factor = np.clip(bgr / 205.0, 0.45, 1.05)
parquet_shaded = np.clip(parquet.astype(np.float32) * shadow_factor, 0, 255)

# Expand mask
mask_3d = np.repeat(cand_floor[:, :, np.newaxis], 3, axis=2)

# Final composite
composite = (parquet_shaded * mask_3d + bgr * (1.0 - mask_3d)).astype(np.uint8)

# Save to public directory as office-retro.png
cv2.imwrite('public/office-retro.png', composite)
print("Saved public/office-retro.png successfully!")
