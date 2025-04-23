import cv2
import mediapipe as mp
import time

mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5, model_complexity=1)
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5, model_complexity=2)

url = "http://192.168.68.113:4747/video"
cap = cv2.VideoCapture(url)
# cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

candidate_hand = None
gesture_start_time = None
winner = None

while cap.isOpened():
    # cap.grab()
    success, image = cap.read()
    if not success:
        continue

    image = cv2.flip(image, 1)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image_height, image_width, _ = image.shape

    results_hands = hands.process(image_rgb)
    results_pose = pose.process(image_rgb)

    head_y = None
    if results_pose.pose_landmarks:
        nose = results_pose.pose_landmarks.landmark[mp_pose.PoseLandmark.NOSE]
        left_shoulder = results_pose.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = results_pose.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]

        head_y = min(
            nose.y * image_height,
            left_shoulder.y * image_height,
            right_shoulder.y * image_height
        )

    raised_hands = []
    if results_hands.multi_hand_landmarks and head_y is not None:
        for hand_landmarks, handedness in zip(results_hands.multi_hand_landmarks, results_hands.multi_handedness):
            wrist_y = hand_landmarks.landmark[0].y * image_height

            if wrist_y < head_y + 50:
                hand_label = handedness.classification[0].label
                raised_hands.append(hand_label)

                mp_drawing.draw_landmarks(
                    image,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())

    if winner is None:
        if len(raised_hands) == 1:
            current_hand = raised_hands[0]

            if candidate_hand == current_hand:
                if time.time() - gesture_start_time >= 1.0:
                    winner = "Red Corner" if current_hand == "Left" else "Blue Corner"
            else:
                candidate_hand = current_hand
                gesture_start_time = time.time()
        else:
            candidate_hand = None
            gesture_start_time = None

    if winner:
        status_text = f"Winner: {winner}!"
        cv2.putText(image, status_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
    else:
        status_text = "Ridica o mana 1 secunda pentru a decide castigatorul"
        cv2.putText(image, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        if candidate_hand:
            elapsed_time = time.time() - gesture_start_time
            countdown = 1 - int(elapsed_time)
            cv2.putText(image, f"Timp ramas: {countdown}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    cv2.imshow('Hand Tracking', image)
    if cv2.waitKey(5) & 0xFF == ord('w'):
        break

cap.release()
cv2.destroyAllWindows()
