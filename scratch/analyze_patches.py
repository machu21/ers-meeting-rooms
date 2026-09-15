import cv2
import numpy as np

img = cv2.imread('public/office.jfif')
h, w, _ = img.shape

# Let's inspect small patches that are 100% floor in each zone
patches = {
    'main_hall_1': img[800:850, 720:760],
    'main_hall_2': img[1000:1050, 720:760],
    'main_hall_3': img[600:650, 1340:1380],
    'board_room': img[650:700, 1600:1650],
    'eley_room': img[1050:1100, 1600:1650],
    'netflix_room': img[1450:1500, 1600:1650],
    'executive_room': img[350:400, 150:200],
    'manager_room': img[1100:1150, 150:200],
    'lead_room': img[1450:1500, 150:200],
    'printing_room': img[800:850, 450:500],
    'restroom_m': img[250:300, 750:800],
}

for name, patch in patches.items():
    mean = np.mean(patch, axis=(0, 1))
    std = np.std(patch, axis=(0, 1))
    print(f"{name:15s}: mean BGR={mean.astype(int)}, std={std.astype(int)}")
