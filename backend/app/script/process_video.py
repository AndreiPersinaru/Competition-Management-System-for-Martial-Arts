import cv2
import mediapipe as mp
import numpy as np
import time
from collections import deque

mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

hands = mp_hands.Hands(max_num_hands=8, min_detection_confidence=0.2, min_tracking_confidence=0.2, model_complexity=1)
pose = mp_pose.Pose(min_detection_confidence=0.3, min_tracking_confidence=0.3, model_complexity=2)

cap = cv2.VideoCapture("vid5.mp4")

candidate_hand = None
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

def detect_raised_hands_improved(image, referee, results_hands, head_y):
    """Detectare moderată a mâinilor - nu prea permisivă dar nici prea strictă"""
    if not results_hands.multi_hand_landmarks:
        return []
    
    raised_hands = []
    h, w, _ = image.shape
    
    # Zone moderate pentru detectare
    referee_center = referee["center_x"]
    detection_radius = max(120, min(w * 0.3, 300))  # Rază moderată
    
    # Calculăm zona arbitrului
    ref_bbox = referee["bbox"]
    ref_width = ref_bbox[2] - ref_bbox[0]
    ref_height = ref_bbox[3] - ref_bbox[1]
    
    for hand_landmarks, handedness in zip(results_hands.multi_hand_landmarks, results_hands.multi_handedness):
        wrist = hand_landmarks.landmark[0]
        wrist_x = wrist.x * w
        wrist_y = wrist.y * h
        
        # Verificări moderate
        conditions = [
            # În apropierea arbitrului - rază moderată
            abs(wrist_x - referee_center) < detection_radius,
            
            # În partea de sus a imaginii - moderat
            wrist.y < 0.7,  # Nu în partea de jos
            
            # Deasupra mijlocului corpului arbitrului
            wrist_y < ref_bbox[1] + ref_height * 0.6,  # 60% din înălțimea arbitrului
            
            # Mâna în zona vizibilă și relevantă
            wrist.x > 0.05 and wrist.x < 0.95,  # Nu pe marginile extreme
            
            # Dacă head_y există, să fie deasupra acestuia cu o marjă
            head_y is None or wrist_y < head_y + 100,
        ]
        
        # Condiții suplimentare moderate
        extra_conditions = [
            # Mâna să fie vizibilă decent
            wrist.visibility > 0.4 if hasattr(wrist, 'visibility') else True,
            
            # Nu în partea foarte de jos a frame-ului
            wrist.y < 0.8,
        ]
        
        # Acceptăm dacă cel puțin 3 condiții din prima listă sunt îndeplinite
        basic_conditions_met = sum(conditions) >= 3
        
        # SAU dacă cel puțin 2 condiții de bază + toate extra condițiile
        relaxed_conditions_met = sum(conditions) >= 2 and all(extra_conditions)
        
        if basic_conditions_met or relaxed_conditions_met:
            hand_label = handedness.classification[0].label
            confidence = handedness.classification[0].score
            
            if confidence > 0.5:  # Confidență moderată
                raised_hands.append(hand_label)
    
    return raised_hands

def draw_visual_feedback(image, referee, raised_hands, candidate_hand, gesture_start_time, winner, results_hands, head_y):
    """Funcție pentru tot feedback-ul vizual"""
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
    
    # Desenăm mâinile detectate
    if results_hands.multi_hand_landmarks:
        for hand_landmarks, handedness in zip(results_hands.multi_hand_landmarks, results_hands.multi_handedness):
            hand_label = handedness.classification[0].label
            wrist = hand_landmarks.landmark[0]
            wrist_x = wrist.x * image.shape[1]
            wrist_y = wrist.y * image.shape[0]
            
            mp_drawing.draw_landmarks(
                image,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style())
            
            # Marcăm mâinile ridicate
            if hand_label in raised_hands:
                cv2.putText(image, f"{hand_label} RIDICATA", 
                           (int(wrist_x), int(wrist_y-20)), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                cv2.circle(image, (int(wrist_x), int(wrist_y)), 15, (0, 255, 255), 3)
    
    # Afișăm statusul
    if winner:
        status_text = f"Winner: {winner}!"
        cv2.putText(image, status_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
    else:
        status_text = "Ridica o mana pentru a decide castigatorul"
        cv2.putText(image, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Debug info pentru mâinile detectate
        if raised_hands:
            hands_text = f"Maini detectate: {', '.join(raised_hands)}"
            cv2.putText(image, hands_text, (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
        
        if candidate_hand:
            elapsed_time = time.time() - gesture_start_time
            countdown = max(0, 0.5 - elapsed_time)
            cv2.putText(image, f"Timp ramas: {countdown:.1f}s", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(image, f"Detectat: {candidate_hand}", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

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

    results_hands = hands.process(image_rgb)
    
    # Detectăm arbitrul folosind metoda îmbunătățită
    referee = find_referee_advanced(image)
    
    if referee is None:
        if show_visual:
            draw_visual_feedback(image, None, [], candidate_hand, gesture_start_time, winner, results_hands, None)
            cv2.imshow('Hand Tracking', image)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        continue
    
    # Calculăm head_y pentru arbitru
    head_y = None
    if referee["pose_landmarks"]:
        landmarks = referee["pose_landmarks"].landmark
        nose = landmarks[mp_pose.PoseLandmark.NOSE]
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
        
        head_y = min(
            nose.y * image_height if nose.visibility > 0.5 else float('inf'),
            left_shoulder.y * image_height if left_shoulder.visibility > 0.5 else float('inf'),
            right_shoulder.y * image_height if right_shoulder.visibility > 0.5 else float('inf')
        )
        
        if head_y == float('inf'):
            head_y = referee["center_y"]
    
    # Detectăm mâinile ridicate
    raised_hands = detect_raised_hands_improved(image, referee, results_hands, head_y)
    
    # Logica pentru determinarea câștigătorului
    if winner is None:
        if len(raised_hands) == 1:
            current_hand = raised_hands[0]
            if candidate_hand == current_hand:
                if time.time() - gesture_start_time >= 0.5:  # 0.5 secunde
                    winner = "Red Corner" if current_hand == "Right" else "Blue Corner"
            else:
                candidate_hand = current_hand
                gesture_start_time = time.time()
        else:
            candidate_hand = None
            gesture_start_time = None
    
    # Partea vizuală (poate fi comentată)
    if show_visual:
        draw_visual_feedback(image, referee, raised_hands, candidate_hand, gesture_start_time, winner, results_hands, head_y)
        cv2.imshow('Hand Tracking', image)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
if show_visual:
    cv2.destroyAllWindows()

if winner:
    print(f"Winner: {winner}")
else:
    print("Nu s-a putut detecta un castigator.")