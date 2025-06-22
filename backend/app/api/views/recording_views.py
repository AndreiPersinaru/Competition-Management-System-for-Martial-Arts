import subprocess
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import sys

class StartRecordingView(APIView):
    permission_classes = []
    process = None

    def post(self, request):
        output_path = "recorded.mp4"
        source_url = "http://192.168.1.245:8080/video"

        if os.path.exists(output_path):
            os.remove(output_path)

        cmd = [
            "ffmpeg",
            "-i", source_url,
            "-t", "00:10:00",
            "-vcodec", "libx264",
            "-preset", "veryfast",
            "-movflags", "+faststart",
            "recorded.mp4"
        ]

        try:
            self.__class__.process = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            return Response({"message": "Recording started."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StopRecordingView(APIView):
    permission_classes = []
    
    def post(self, request):
        if StartRecordingView.process:
            # Trimite 'q' pentru oprire gracioasă
            try:
                StartRecordingView.process.stdin.write(b'q\n')
                StartRecordingView.process.stdin.flush()
                StartRecordingView.process.wait(timeout=10)
            except:
                # Dacă nu merge, folosește terminate
                StartRecordingView.process.terminate()
                StartRecordingView.process.wait()
            
            StartRecordingView.process = None

            script_path = os.path.join(settings.BASE_DIR, "app", "script", "process_video.py")
            video_path = os.path.join(settings.BASE_DIR, "recorded.mp4")

            try:
                result = subprocess.run(
                    [sys.executable, script_path, video_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=60  # seconds
                )
                return Response({
                    "message": "Recording stopped and processed.",
                    "stdout": result.stdout,
                    "stderr": result.stderr
                })
            except Exception as e:
                return Response({"error": f"Recording stopped, but script failed: {str(e)}"}, status=500)

        return Response({"error": "No active recording."}, status=400)

class StartLivestreamView(APIView):
    permission_classes = []
    process = None

    def post(self, request):
        stream_url = "rtmp://a.rtmp.youtube.com/live2/9hj1-ab4d-s7xz-w51v-85xs"  # înlocuiește cu cheia ta
        source_url = "http://192.168.1.245:8080/video"  # IP Webcam

        cmd = [
            "ffmpeg",
            "-re",
            "-i", source_url,
            "-re",
            "-i", "http://192.168.1.245:8080/audio.wav",
            "-vcodec", "libx264",
            "-preset", "veryfast",
            "-c:a", "aac",
            "-b:a", "128k",
            "-async", "1",
            "-vsync", "cfr",
            "-r", "25",
            "-f", "flv",
            stream_url
        ]

        try:
            self.__class__.process = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            return Response({"message": "Livestream started."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StopLivestreamView(APIView):
    permission_classes = []

    def post(self, request):
        if StartLivestreamView.process:
            # Trimite 'q' pentru oprire gracioasă
            try:
                StartLivestreamView.process.stdin.write(b'q\n')
                StartLivestreamView.process.stdin.flush()
                StartLivestreamView.process.wait(timeout=10)
            except:
                # Dacă nu merge, folosește terminate
                StartLivestreamView.process.terminate()
                StartLivestreamView.process.wait()
            
            StartLivestreamView.process = None
            return Response({"message": "Livestream stopped."})
        return Response({"error": "No active livestream."}, status=400)