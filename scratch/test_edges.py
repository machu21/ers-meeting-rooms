import cv2
import numpy as np

img = cv2.imread('public/office.jfif')
h, w = img.shape[:2]

# Let's inspect different color spaces and edge detectors
# Floor characteristics:
# 1. Main hallway / central area: carpet texture with light beige color (around RGB 215, 200, 185)
# 2. Board room / Eley / Netflix: light greyish blue (around RGB 205, 210, 215)
# 3. Manager / Lead: light sage green (around RGB 190, 210, 185)
# 4. Executive: light blue (around RGB 195, 205, 215)
# 5. Restrooms: checkered tile
# 6. Printing room: light grey tile

# Let's see what the walls, desks, chairs look like:
# Walls: dark grey outlines (thickness ~12-20px), fill is dark grey or white with grey stroke
# Desks: orange/brown wood, blue cubicle dividers, black monitors, black keyboards, colored chairs
# Plants: green leaves with dark pots
# Sofa: dark blue
# Conference tables: light wood oval / rectangle with dark grey chairs

# Let's test a simple color distance / gradient approach
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 30, 100)

print(f"Edges non-zero: {np.count_nonzero(edges)}")
