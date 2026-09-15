import cv2
import numpy as np

# Load original
img = cv2.imread('public/office.jfif')
h, w = img.shape[:2]

# Let's generate parquet tile
tile_size = 48  # or 64
tile = np.full((tile_size, tile_size, 3), (67, 91, 141), dtype=np.uint8)
cv2.fillPoly(tile, [np.array([[24, 0], [48, 24], [24, 48], [0, 24]])], (80, 109, 164))
cv2.fillPoly(tile, [np.array([[24, 6], [42, 24], [24, 42], [6, 24]])], (93, 126, 185))
cv2.fillPoly(tile, [np.array([[24, 12], [36, 24], [24, 36], [12, 24]])], (107, 142, 201))
cv2.line(tile, (0, 0), (47, 47), (34, 52, 90), 1)
cv2.line(tile, (47, 0), (0, 47), (34, 52, 90), 1)
cv2.rectangle(tile, (0, 0), (47, 47), (26, 42, 74), 1)

reps_y = int(np.ceil(h / tile_size))
reps_x = int(np.ceil(w / tile_size))
parquet = np.tile(tile, (reps_y, reps_x, 1))[:h, :w]

# Let's test blend modes:
# 1. Luminosity / Multiply blend
# The original floor is light beige/grey (~190-220).
# The walls, desks, chairs, plants are darker or have strong distinct hues.
# If we do Multiply or Soft Light:
# parquet * (img / 255.0)
blended_multiply = (parquet.astype(float) * (img.astype(float) / 210.0)).clip(0, 255).astype(np.uint8)

# 2. Overlay blend
# 3. Floor replacement via mask
# Let's check how blended_multiply looks:
cv2.imwrite('scratch/blend_multiply.jpg', blended_multiply)
print("Saved scratch/blend_multiply.jpg")
