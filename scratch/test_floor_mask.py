import cv2
import numpy as np

img = cv2.imread('public/office.jfif')
h, w, _ = img.shape

# Convert to HSV and LAB
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Find edges to prevent leaking into furniture
# Sobel or Canny edges
edges = cv2.Canny(gray, 20, 60)
# Dilate edges slightly to form strong boundary barriers
kernel = np.ones((3, 3), np.uint8)
edge_barrier = cv2.dilate(edges, kernel, iterations=1)

# Let's inspect where the walls are:
# Walls are very dark lines (L < 70, or V < 70)
wall_mask = (lab[:, :, 0] < 80) | (edge_barrier > 0)

# Let's write a script to test floodfill or color range per room
print("Ready to test room segmentation.")
