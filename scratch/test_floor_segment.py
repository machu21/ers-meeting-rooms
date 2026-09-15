import cv2
import numpy as np

# Load original office map
img = cv2.imread('public/office.jfif')
h, w, _ = img.shape
print(f"Loaded office.jfif: {w}x{h}")

# Generate the repeating parquet pattern at full resolution (w, h)
tile_size = 64
tile = np.full((tile_size, tile_size, 3), (67, 91, 141), dtype=np.uint8) # BGR for #8d5b43

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

# Tile across full image
reps_y = int(np.ceil(h / tile_size))
reps_x = int(np.ceil(w / tile_size))
parquet_full = np.tile(tile, (reps_y, reps_x, 1))[:h, :w]
print("Parquet full rendered:", parquet_full.shape)
