import cv2
import numpy as np

# Load office map
img = cv2.imread('public/office.jfif')
h, w, _ = img.shape

# Generate high-quality parquet tile pattern (size 64x64)
tile_size = 64
tile = np.full((tile_size, tile_size, 3), (67, 91, 141), dtype=np.uint8) # Base #8d5b43

# Center diamonds matching isometric_parquet.svg
cv2.fillPoly(tile, [np.array([[32, 0], [64, 32], [32, 64], [0, 32]])], (80, 109, 164))
cv2.fillPoly(tile, [np.array([[32, 8], [56, 32], [32, 56], [8, 32]])], (93, 126, 185))
cv2.fillPoly(tile, [np.array([[32, 16], [48, 32], [32, 48], [16, 32]])], (107, 142, 201))
cv2.fillPoly(tile, [np.array([[32, 24], [40, 32], [32, 40], [24, 32]])], (72, 102, 158))

# Diagonal grout lines & borders
cv2.line(tile, (0, 0), (63, 63), (34, 52, 90), 2)
cv2.line(tile, (63, 0), (0, 63), (34, 52, 90), 2)
cv2.rectangle(tile, (0, 0), (63, 63), (26, 42, 74), 1)

# Subtle bevel lines
cv2.line(tile, (0, 0), (63, 0), (121, 157, 212), 1)
cv2.line(tile, (0, 0), (0, 63), (121, 157, 212), 1)
cv2.line(tile, (0, 63), (63, 63), (16, 28, 54), 1)
cv2.line(tile, (63, 0), (63, 63), (16, 28, 54), 1)

reps_y = int(np.ceil(h / tile_size))
reps_x = int(np.ceil(w / tile_size))
parquet = np.tile(tile, (reps_y, reps_x, 1))[:h, :w]

# Let's define the floor color definitions in different zones
# We can create a floor_mask (0 to 255)
floor_mask = np.zeros((h, w), dtype=np.float32)

# Convert img to float LAB and HSV
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
bgr = img.astype(np.float32)

# 1. Main area floor reference (hallways, around cubicles)
# In LAB: L ~ 190-220, a ~ 125-132, b ~ 133-142
# In HSV: S is low (10-45), V is high (175-225)
main_floor_bgr = np.array([178, 192, 210])
dist_main = np.linalg.norm(bgr - main_floor_bgr, axis=2)

# 2. Boardroom floor reference
board_floor_bgr = np.array([195, 200, 210])
dist_board = np.linalg.norm(bgr - board_floor_bgr, axis=2)

# 3. Eley & Netflix room floor reference
meeting_floor_bgr = np.array([195, 195, 205])
dist_meeting = np.linalg.norm(bgr - meeting_floor_bgr, axis=2)

# 4. Executive room floor reference
exec_floor_bgr = np.array([185, 195, 205])
dist_exec = np.linalg.norm(bgr - exec_floor_bgr, axis=2)

# 5. Manager & Lead floor reference (sage green carpet)
office_floor_bgr = np.array([155, 185, 175])
dist_office = np.linalg.norm(bgr - office_floor_bgr, axis=2)

# 6. Printing room floor (light grey tile)
print_floor_bgr = np.array([190, 190, 195])
dist_print = np.linalg.norm(bgr - print_floor_bgr, axis=2)

# 7. Restroom floor
rest_floor_bgr = np.array([215, 215, 220])
dist_rest = np.linalg.norm(bgr - rest_floor_bgr, axis=2)

min_dist = np.minimum.reduce([dist_main, dist_board, dist_meeting, dist_exec, dist_office, dist_print, dist_rest])

# Floor mask candidate: pixels close to any floor reference
# Threshold around 35-45
cand_floor = np.clip((45.0 - min_dist) / 20.0, 0, 1)

# Protection against walls and furniture:
# Walls: dark lines (L < 90 in LAB or V < 80 in HSV)
# Furniture: high saturation (S > 55 in HSV) or very dark (V < 70)
is_wall_or_dark = (hsv[:, :, 2] < 75) | (lab[:, :, 0] < 80)
is_high_sat = (hsv[:, :, 1] > 60) # Desks, chairs, plants, sofa
is_very_bright = (lab[:, :, 0] > 245) # papers, signs

cand_floor[is_wall_or_dark] = 0
cand_floor[is_high_sat] = 0

# Smooth the floor mask slightly
cand_floor_u8 = (cand_floor * 255).astype(np.uint8)
cand_floor_u8 = cv2.medianBlur(cand_floor_u8, 5)
cand_floor = cand_floor_u8.astype(np.float32) / 255.0

# Expand floor mask with 3 channels
mask_3d = np.repeat(cand_floor[:, :, np.newaxis], 3, axis=2)

# Composite: where mask is 1 -> parquet floor, where mask is 0 -> original furniture/walls
# To preserve subtle natural ambient shadows on the floor from furniture:
# shadow factor: (img / floor_ref)
shadow_factor = np.clip(bgr / 200.0, 0.4, 1.1)
parquet_shaded = np.clip(parquet.astype(np.float32) * shadow_factor, 0, 255)

composite = (parquet_shaded * mask_3d + bgr * (1.0 - mask_3d)).astype(np.uint8)

cv2.imwrite('scratch/composite_v1.jpg', composite)
print("Saved scratch/composite_v1.jpg")
