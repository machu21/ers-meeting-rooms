import cv2
import numpy as np

# Load office map
img = cv2.imread('public/office.jfif')
h, w, _ = img.shape

# Calculate tile size so that when scaled to 1600x900, the tiles are ~64px
# 1600 / 64 = 25 tiles across -> 2092 / 25 = 83.68 -> let's use 84px
tile_size = 84
tile = np.full((tile_size, tile_size, 3), (67, 91, 141), dtype=np.uint8) # Base #8d5b43

# Center diamonds scaled to 84x84
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

# Distance to floor references
# Main open office hallway floor
dist_main = np.linalg.norm(bgr - np.array([178, 192, 210]), axis=2)
# Main hallway alternate tone
dist_main2 = np.linalg.norm(bgr - np.array([180, 196, 212]), axis=2)
# Boardroom floor
dist_board = np.linalg.norm(bgr - np.array([195, 200, 210]), axis=2)
# Boardroom rug area
dist_board_rug = np.linalg.norm(bgr - np.array([215, 220, 225]), axis=2)
# Meeting rooms (Eley & Netflix)
dist_meeting = np.linalg.norm(bgr - np.array([195, 195, 205]), axis=2)
# Executive room floor
dist_exec = np.linalg.norm(bgr - np.array([185, 195, 205]), axis=2)
# Executive room rug area
dist_exec_rug = np.linalg.norm(bgr - np.array([164, 152, 150]), axis=2)
# Manager & Lead walkable floor
dist_office = np.linalg.norm(bgr - np.array([170, 195, 185]), axis=2)
# Restroom floor
dist_rest = np.linalg.norm(bgr - np.array([215, 215, 220]), axis=2)

min_dist = np.minimum.reduce([
    dist_main, dist_main2, dist_board, dist_board_rug, 
    dist_meeting, dist_exec, dist_exec_rug, dist_office, dist_rest
])

# Create soft mask
cand_floor = np.clip((46.0 - min_dist) / 20.0, 0, 1)

# PROTECTIVE MASKS:
# 1. Outer borders and walls
is_wall_or_dark = (hsv[:, :, 2] < 72) | (lab[:, :, 0] < 75)
cand_floor[is_wall_or_dark] = 0

# 2. Desks, chairs, plants, sofa (high saturation)
is_high_sat = (hsv[:, :, 1] > 48)
cand_floor[is_high_sat] = 0

# 3. Very bright papers/screens
is_very_bright = (lab[:, :, 0] > 248)
cand_floor[is_very_bright] = 0

# 4. Printer protection: x: 30..430, y: 560..860
printer_box = np.zeros((h, w), dtype=bool)
printer_box[560:860, 30:430] = True
cand_floor[printer_box] = 0

# 5. Manager & Lead wall & file cabinet protection:
mgr_cabinets = np.zeros((h, w), dtype=bool)
mgr_cabinets[890:1060, 30:670] = True
mgr_cabinets[1240:1410, 30:670] = True
cand_floor[mgr_cabinets] = 0

# 6. Restroom porcelain fixtures protection
restroom_zone = np.zeros((h, w), dtype=bool)
restroom_zone[40:440, 680:1520] = True
cand_floor[restroom_zone & (lab[:, :, 0] > 185) & (hsv[:, :, 1] < 25)] = 0

# 7. Presentation whiteboard / monitor in Boardroom (top wall)
cand_floor[40:240, 1580:2000] = 0

# 8. TVs on walls in Eley & Netflix rooms
cand_floor[740:870, 1600:1980] = 0
cand_floor[1180:1310, 1600:1980] = 0

# 9. Reception counter desk: around x: 1240..1520, y: 1720..2000
cand_floor[1720:2000, 1240:1520] = 0

# 10. Front entrance doors at bottom center: x: 880..1240, y: 1750..2016
cand_floor[1750:2016, 880:1240] = 0

# Smooth the floor mask slightly
cand_floor_u8 = (cand_floor * 255).astype(np.uint8)
cand_floor_u8 = cv2.medianBlur(cand_floor_u8, 5)
cand_floor = cand_floor_u8.astype(np.float32) / 255.0

# Natural ambient shadow factor so tables and chairs cast subtle soft shadows onto the parquet
shadow_factor = np.clip(bgr / 205.0, 0.45, 1.05)
parquet_shaded = np.clip(parquet.astype(np.float32) * shadow_factor, 0, 255)

# Expand mask
mask_3d = np.repeat(cand_floor[:, :, np.newaxis], 3, axis=2)

# Final composite
composite = (parquet_shaded * mask_3d + bgr * (1.0 - mask_3d)).astype(np.uint8)

cv2.imwrite('scratch/composite_v3.jpg', composite)
print("Saved scratch/composite_v3.jpg successfully!")
