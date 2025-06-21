import cv2
import mediapipe as mp
import numpy as np
import time
from collections import deque
import math

mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

hands = mp_hands.Hands(max_num_hands=8, min_detection_confidence=0.2, min_tracking_confidence=0.2, model_complexity=1)
pose = mp_pose.Pose(min_detection_confidence=0.3, min_tracking_confidence=0.3, model_complexity=2)

cap = cv2.VideoCapture(0)

candidate_arm = None
gesture_start_time = None
winner = None

# Buffer pentru stabilitatea detectării
referee_history = deque(maxlen=10)

def detect_all_persons(image):
    """Detectează toate persoanele din imagine folosind pose detection"""
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Încercăm detectarea pe imaginea originală și cea îmbunătățită
    results_original = pose.process(image_rgb)
    
    persons = []
    h, w, _ = image.shape
    
    # Procesăm rezultatele de la imaginea originală
    if results_original.pose_landmarks:
        person = extract_person_info(results_original.pose_landmarks, image, "original")
        if person:
            persons.append(person)
    
    return persons

def extract_person_info(pose_landmarks, image, source=""):
    """Extrage informații despre o persoană detectată"""
    landmarks = pose_landmarks.landmark
    h, w, _ = image.shape
    
    # Verificăm dacă avem suficiente landmark-uri vizibile
    visible_landmarks = sum(1 for lm in landmarks if lm.visibility > 0.5)
    if visible_landmarks < 5:
        return None
    
    # Calculăm bounding box
    visible_x = [lm.x for lm in landmarks if lm.visibility > 0.5]
    visible_y = [lm.y for lm in landmarks if lm.visibility > 0.5]
    
    if not visible_x or not visible_y:
        return None
    
    x1 = int(min(visible_x) * w)
    x2 = int(max(visible_x) * w)
    y1 = int(min(visible_y) * h)
    y2 = int(max(visible_y) * h)
    
    # Expandăm bounding box-ul pentru a include mai mult context
    padding_x = int((x2 - x1) * 0.2)
    padding_y = int((y2 - y1) * 0.1)
    
    x1 = max(0, x1 - padding_x)
    x2 = min(w, x2 + padding_x)
    y1 = max(0, y1 - padding_y)
    y2 = min(h, y2 + padding_y)
    
    area = (x2 - x1) * (y2 - y1)
    
    # Calculăm centrul
    nose = landmarks[mp_pose.PoseLandmark.NOSE]
    center_x = nose.x * w if nose.visibility > 0.5 else (x1 + x2) / 2
    center_y = nose.y * h if nose.visibility > 0.5 else (y1 + y2) / 2
    
    return {
        "bbox": (x1, y1, x2, y2),
        "center_x": center_x,
        "center_y": center_y,
        "area": area,
        "pose_landmarks": pose_landmarks,
        "visibility_score": visible_landmarks,
        "source": source
    }

def enhanced_color_detection(image, bbox):
    """Detectare îmbunătățită a culorii roșii"""
    x1, y1, x2, y2 = bbox
    roi = image[y1:y2, x1:x2]
    
    if roi.size == 0:
        return 0.0
    
    # Convertim în multiple spații de culoare pentru o detectare mai robustă
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
    
    # Detectare roșu în HSV (mai multe intervale)
    red_masks_hsv = []
    red_ranges = [
        ([0, 50, 20], [10, 255, 255]),      # Roșu deschis
        ([160, 50, 20], [180, 255, 255]),   # Roșu închis
        ([0, 30, 30], [15, 255, 255]),      # Roșu foarte deschis
        ([165, 30, 30], [180, 255, 255])    # Roșu foarte închis
    ]
    
    for lower, upper in red_ranges:
        mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
        red_masks_hsv.append(mask)
    
    hsv_mask = cv2.bitwise_or(red_masks_hsv[0], red_masks_hsv[1])
    for mask in red_masks_hsv[2:]:
        hsv_mask = cv2.bitwise_or(hsv_mask, mask)
    
    # Detectare roșu în LAB
    a_channel = lab[:, :, 1]
    lab_mask = cv2.threshold(a_channel, 130, 255, cv2.THRESH_BINARY)[1]
    
    # Combinăm măștile
    combined_mask = cv2.bitwise_or(hsv_mask, lab_mask)
    
    # Curățăm masca
    kernel = np.ones((3, 3), np.uint8)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
    
    red_ratio = np.sum(combined_mask > 0) / combined_mask.size
    return red_ratio

def calculate_referee_score(person, image_width, image_height):
    """Calculează scorul pentru a determina dacă persoana este arbitrul"""
    score = 0.0
    
    # Scor pentru poziția centrală (0-40 puncte)
    center_offset = abs(person["center_x"] - image_width / 2) / (image_width / 2)
    center_score = max(0, 40 * (1 - center_offset))
    score += center_score
    
    # Scor pentru dimensiune relativă (0-20 puncte)
    image_area = image_width * image_height
    size_ratio = person["area"] / image_area
    size_score = min(20, size_ratio * 1000)  # Normalizat
    score += size_score
    
    # Scor pentru detectarea culorii roșii (0-30 puncte)
    red_ratio = enhanced_color_detection(cv2.cvtColor(cv2.cvtColor(image, cv2.COLOR_BGR2RGB), cv2.COLOR_RGB2BGR), person["bbox"])
    red_score = min(30, red_ratio * 75)  # Amplificat pentru culoarea roșie
    score += red_score
    
    # Scor pentru vizibilitatea pose-ului (0-10 puncte)
    visibility_score = min(10, person["visibility_score"] / 2)
    score += visibility_score
    
    return {
        "total_score": score,
        "center_score": center_score,
        "size_score": size_score,
        "red_score": red_score,
        "visibility_score": visibility_score,
        "red_ratio": red_ratio
    }

def find_referee_advanced(image):
    """Funcție avansată pentru găsirea arbitrului"""
    persons = detect_all_persons(image)
    
    if not persons:
        return None
    
    h, w, _ = image.shape
    best_referee = None
    best_score = 0
    
    # Calculăm scorul pentru fiecare persoană
    for person in persons:
        scores = calculate_referee_score(person, w, h)
        
        if scores["total_score"] > best_score and scores["total_score"] > 20:  # Prag minim
            best_score = scores["total_score"]
            best_referee = {
                **person,
                "scores": scores
            }
    
    # Folosim istoricul pentru stabilitate
    if best_referee:
        referee_history.append(best_referee)
        
        # Verificăm consistența în ultimele frame-uri
        if len(referee_history) >= 3:
            recent_centers = [ref["center_x"] for ref in list(referee_history)[-3:]]
            center_variance = np.var(recent_centers)
            
            # Dacă variația este prea mare, nu avem un arbitru stabil
            if center_variance > (w * 0.1) ** 2:
                return None
    
    return best_referee

def calculate_arm_angle(shoulder, elbow, wrist):
    """Calculează unghiul brațului față de orizontală"""
    # Vector de la umăr la coate
    upper_arm = np.array([elbow.x - shoulder.x, elbow.y - shoulder.y])
    # Vector de la coate la încheietura mâinii
    forearm = np.array([wrist.x - elbow.x, wrist.y - elbow.y])
    
    # Calculăm unghiul total al brațului (de la umăr la încheietura mâinii)
    full_arm = np.array([wrist.x - shoulder.x, wrist.y - shoulder.y])
    
    # Unghiul față de orizontală (în grade)
    angle_rad = math.atan2(-full_arm[1], full_arm[0])  # -y pentru că y crește în jos
    angle_deg = math.degrees(angle_rad)
    
    # Normalizăm unghiul între -180 și 180
    if angle_deg > 180:
        angle_deg -= 360
    elif angle_deg < -180:
        angle_deg += 360
    
    return angle_deg

def detect_raised_arms(referee):
    """Detectează brațele ridicate bazându-ne pe poziția landmark-urilor de pose"""
    if not referee or not referee["pose_landmarks"]:
        return []
    
    landmarks = referee["pose_landmarks"].landmark
    raised_arms = []
    
    # Definim landmark-urile necesare
    left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
    right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
    left_elbow = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW]
    right_elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW]
    left_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST]
    right_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]
    
    # Verificăm brațul stâng
    if (left_shoulder.visibility > 0.5 and left_elbow.visibility > 0.5 and left_wrist.visibility > 0.5):
        left_angle = calculate_arm_angle(left_shoulder, left_elbow, left_wrist)
        
        # Condiții pentru braț ridicat (ajustabile)
        conditions_left = [
            # Unghiul să fie în intervalul pentru braț ridicat (între 45 și 135 grade)
            45 <= left_angle <= 135,
            
            # Încheietura mâinii să fie deasupra umărului
            left_wrist.y < left_shoulder.y,
            
            # Cotul să fie deasupra sau la același nivel cu umărul
            left_elbow.y <= left_shoulder.y + 0.1,  # Marjă mică pentru toleranță
            
            # Verificare suplimentară: încheietura să fie semnificativ deasupra umărului
            (left_shoulder.y - left_wrist.y) > 0.05,  # Diferență minimă de 5% din înălțimea imaginii
        ]
        
        # Condiții mai relaxate pentru detectare la distanță
        relaxed_conditions_left = [
            # Unghiul mai permisiv
            30 <= left_angle <= 150,
            
            # Încheietura mâinii să fie deasupra umărului (condiție principală)
            left_wrist.y < left_shoulder.y,
            
            # Cotul să nu fie prea jos
            left_elbow.y < left_shoulder.y + 0.15,
        ]
        
        if sum(conditions_left) >= 3 or sum(relaxed_conditions_left) >= 2:
            raised_arms.append("Left")
    
    # Verificăm brațul drept
    if (right_shoulder.visibility > 0.5 and right_elbow.visibility > 0.5 and right_wrist.visibility > 0.5):
        right_angle = calculate_arm_angle(right_shoulder, right_elbow, right_wrist)
        
        # Pentru brațul drept, unghiul va fi între 45 și 135 grade (oglindă)
        conditions_right = [
            # Unghiul să fie în intervalul pentru braț ridicat
            45 <= right_angle <= 135,
            
            # Încheietura mâinii să fie deasupra umărului
            right_wrist.y < right_shoulder.y,
            
            # Cotul să fie deasupra sau la același nivel cu umărul
            right_elbow.y <= right_shoulder.y + 0.1,
            
            # Verificare suplimentară
            (right_shoulder.y - right_wrist.y) > 0.05,
        ]
        
        relaxed_conditions_right = [
            30 <= right_angle <= 150,
            right_wrist.y < right_shoulder.y,
            right_elbow.y < right_shoulder.y + 0.15,
        ]
        
        if sum(conditions_right) >= 3 or sum(relaxed_conditions_right) >= 2:
            raised_arms.append("Right")
    
    return raised_arms

def draw_visual_feedback(image, referee, raised_arms, candidate_arm, gesture_start_time, winner):
    """Funcție pentru tot feedback-ul vizual cu informații despre brațe"""
    if referee is None:
        cv2.putText(image, "Cautam arbitrul...", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        return
    
    # Desenăm informații despre arbitru
    x1, y1, x2, y2 = referee["bbox"]
    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
    
    scores = referee["scores"]
    info_text = f"Scor: {scores['total_score']:.1f} | Rosu: {scores['red_ratio']:.2f}"
    cv2.putText(image, info_text, (x1, y1-30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    cv2.putText(image, "ARBITRU", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    
    # Desenăm pose landmarks pentru arbitru
    if referee["pose_landmarks"]:
        mp_drawing.draw_landmarks(
            image,
            referee["pose_landmarks"],
            mp_pose.POSE_CONNECTIONS,
            mp_drawing_styles.get_default_pose_landmarks_style())
        
        # Desenăm informații despre unghiurile brațelor
        landmarks = referee["pose_landmarks"].landmark
        h, w, _ = image.shape
        
        # Informații pentru brațul stâng
        if (landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].visibility > 0.5 and 
            landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].visibility > 0.5 and 
            landmarks[mp_pose.PoseLandmark.LEFT_WRIST].visibility > 0.5):
            
            left_angle = calculate_arm_angle(
                landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER],
                landmarks[mp_pose.PoseLandmark.LEFT_ELBOW],
                landmarks[mp_pose.PoseLandmark.LEFT_WRIST]
            )
            
            wrist_pos = landmarks[mp_pose.PoseLandmark.LEFT_WRIST]
            cv2.putText(image, f"L: {left_angle:.1f}°", 
                       (int(wrist_pos.x * w), int(wrist_pos.y * h - 10)),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
        
        # Informații pentru brațul drept
        if (landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].visibility > 0.5 and 
            landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].visibility > 0.5 and 
            landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].visibility > 0.5):
            
            right_angle = calculate_arm_angle(
                landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER],
                landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW],
                landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]
            )
            
            wrist_pos = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]
            cv2.putText(image, f"R: {right_angle:.1f}°", 
                       (int(wrist_pos.x * w), int(wrist_pos.y * h - 10)),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
    
    # Evidențiem brațele ridicate
    if raised_arms:
        for arm in raised_arms:
            color = (0, 255, 255)  # Galben pentru brațe ridicate
            if arm == "Left":
                cv2.putText(image, "BRAT STANG RIDICAT", (10, 160), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            else:
                cv2.putText(image, "BRAT DREPT RIDICAT", (10, 180), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    # Afișăm statusul
    if winner:
        status_text = f"Winner: {winner}!"
        cv2.putText(image, status_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
    else:
        status_text = "Ridica un brat pentru a decide castigatorul"
        cv2.putText(image, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Debug info pentru brațele detectate
        if raised_arms:
            arms_text = f"Brate detectate: {', '.join(raised_arms)}"
            cv2.putText(image, arms_text, (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
        
        if candidate_arm:
            elapsed_time = time.time() - gesture_start_time
            countdown = max(0, 0.5 - elapsed_time)
            cv2.putText(image, f"Timp ramas: {countdown:.1f}s", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(image, f"Detectat: {candidate_arm}", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

# Bucla principală
frame_count = 0
show_visual = True  # Setează pe False pentru a dezactiva partea vizuală

while cap.isOpened():
    success, image = cap.read()
    if not success:
        break
    
    frame_count += 1
    original_image = image.copy()
    
    # Procesăm doar la fiecare al 2-lea frame pentru performanță
    if frame_count % 2 == 0:
        continue
    
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image_height, image_width, _ = image.shape
    
    # Detectăm arbitrul folosind metoda îmbunătățită
    referee = find_referee_advanced(image)
    
    if referee is None:
        if show_visual:
            draw_visual_feedback(image, None, [], candidate_arm, gesture_start_time, winner)
            cv2.imshow('Arm Tracking', image)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        continue
    
    # Detectăm brațele ridicate bazându-ne pe pose landmarks
    raised_arms = detect_raised_arms(referee)
    
    # Logica pentru determinarea câștigătorului (modificată pentru brațe)
    if winner is None:
        if len(raised_arms) == 1:
            current_arm = raised_arms[0]
            if candidate_arm == current_arm:
                if time.time() - gesture_start_time >= 0.2:  # 0.5 secunde
                    winner = "Red Corner" if current_arm == "Right" else "Blue Corner"
            else:
                candidate_arm = current_arm
                gesture_start_time = time.time()
        else:
            candidate_arm = None
            gesture_start_time = None
    
    # Partea vizuală
    if show_visual:
        draw_visual_feedback(image, referee, raised_arms, candidate_arm, gesture_start_time, winner)
        cv2.imshow('Arm Tracking', image)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
if show_visual:
    cv2.destroyAllWindows()

if winner:
    print(f"Winner: {winner}")
else:
    print("Nu s-a putut detecta un castigator.")