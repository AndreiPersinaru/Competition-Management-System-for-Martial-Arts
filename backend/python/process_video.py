import cv2
import mediapipe as mp

# Inițializarea modulelor MediaPipe
mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Configurare modele
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.7)
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

cap = cv2.VideoCapture(0)

while cap.isOpened():
    success, image = cap.read()
    if not success:
        continue

    # Procesare imagine
    image = cv2.cvtColor(cv2.flip(image, 1), cv2.COLOR_BGR2RGB)
    image_height, image_width, _ = image.shape
    results_hands = hands.process(image)
    results_pose = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    # Detectare cap și umeri
    head_y = None
    if results_pose.pose_landmarks:
        # Landmark-uri pentru cap (nas) și umeri
        nose = results_pose.pose_landmarks.landmark[mp_pose.PoseLandmark.NOSE]
        left_shoulder = results_pose.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = results_pose.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]

        # Folosește cel mai înalt punct dintre nas și umeri
        head_y = min(
            nose.y * image_height,
            left_shoulder.y * image_height,
            right_shoulder.y * image_height
        )

        # Desenează landmark-urile corpului (opțional)
        mp_drawing.draw_landmarks(
            image,
            results_pose.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())

    # Detectare mâini ridicate
    raised_hands = []
    if results_hands.multi_hand_landmarks and head_y is not None:
        for hand_landmarks, handedness in zip(results_hands.multi_hand_landmarks, results_hands.multi_handedness):
            # Coordonata Y a încheieturii
            wrist_y = hand_landmarks.landmark[0].y * image_height

            # Verificare dacă mâna este deasupra capului
            if wrist_y < head_y + 50:  # Offset de 50px pentru toleranță
                hand_label = handedness.classification[0].label
                raised_hands.append(hand_label)

                # Highlight pentru mâna ridicată
                mp_drawing.draw_landmarks(
                    image,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())

    # Afișare text
    status_text = "Mâini ridicate: " + ", ".join(raised_hands) if raised_hands else "Nu sunt mâini ridicate"
    cv2.putText(image, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    cv2.imshow('Hand Tracking', image)
    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()