import cv2
import numpy as np
from PIL import Image

# 1. Load original map
img = cv2.imread('public/office.jfif')
h, w = img.shape[:2]

# 2. Render / tile the parquet texture to match the exact dimensions of office.jfif (w, h)
# Let's create the parquet tile from the colors / pattern of isometric_parquet.svg
# Or load svg / draw it with cv2 / PIL
tile_size = 64
parquet_tile = Image.open('public/isometric_parquet.svg') # wait, PIL can't directly open SVG without librsvg or cairosvg
print('Checking SVG support...')
