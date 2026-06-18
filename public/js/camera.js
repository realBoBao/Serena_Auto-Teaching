/**
 * camera.js — Webcam Emotion Detection for AI Brain
 * Uses face-api.js for face detection + emotion recognition
 * Falls back to canvas-based analysis if face-api fails
 */

// ── State ────────────────────────────────────────────────────────────────────
let _stream = null;
let _faceapi = null;
let _isDetecting = false;
let _lastEmotion = null;

// ── Emotion Labels (Vietnamese) ──────────────────────────────────────────────
const EMOTION_LABELS = {
  happy: 'Vui vẻ 😊',
  sad: 'Buồn 😢',
  angry: 'Tức giận 😠',
  fearful: 'Lo lắng 😰',
  surprised: 'Ngạc nhiên 😲',
  disgusted: 'Ghê tởm 🤢',
  neutral: 'Bình thường 😐',
};

const EMOTION_ADVICE = {
  happy: 'Bạn đang vui! Tuyệt vời, hãy tận hưởng cảm giác này. Có gì muốn chia sẻ không?',
  sad: 'Mình thấy bạn đang buồn. Muốn kể mình nghe không? Đôi khi chỉ cần nói ra cũng nhẹ đầu rất nhiều.',
  angry: 'Bạn đang tức giận. Hãy hít thở sâu 3 lần nhé. Muốn kể mình nghe về điều đang làm bạn bực?',
  fearful: 'Bạn đang lo lắng. Mình ở đây mà. Kể mình nghe về điều đang khiến bạn lo?',
  surprised: 'Ngạc nhiên à? Có gì bất ngờ không? Kể mình nghe đi!',
  disgusted: 'Có gì đó khiến bạn khó chịu sao? Mình lắng nghe đây.',
  neutral: 'Bạn đang bình thường. Hôm nay thế nào? Có gì muốn trò chuyện không?',
};

// ── Load face-api.js ────────────────────────────────────────────────────────
async function _loadFaceApi() {
  if (_faceapi) return _faceapi;

  try {
    // Load from CDN
    await import('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.esm.js');

    // Load emotion model from CDN
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

    _faceapi = faceapi;
    return true;
  } catch (err) {
    console.warn('[Camera] face-api.js failed to load, using fallback:', err.message);
    return false;
  }
}

// ── Start Camera ────────────────────────────────────────────────────────────
export async function startCamera() {
  const video = document.getElementById('cameraVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const startBtn = document.getElementById('cameraStartBtn');
  const captureBtn = document.getElementById('cameraCaptureBtn');
  const stopBtn = document.getElementById('cameraStopBtn');

  try {
    _stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 480, height: 360 },
      audio: false,
    });
    video.srcObject = _stream;
    placeholder.classList.add('hidden');
    startBtn.classList.add('hidden');
    captureBtn.classList.remove('hidden');
    stopBtn.classList.remove('hidden');

    // Try to load face-api
    const loaded = await _loadFaceApi();
    if (loaded) {
      _startDetection();
    } else {
      document.getElementById('emotionStatus').textContent = 'Chế độ cơ bản';
    }

    return true;
  } catch (err) {
    console.error('[Camera] Failed to start:', err);
    placeholder.innerHTML = `
      <span class="camera-icon">❌</span>
      <p>Không thể truy cập camera</p>
      <p class="camera-hint">${err.message}</p>
    `;
    return false;
  }
}

// ── Stop Camera ─────────────────────────────────────────────────────────────
export function stopCamera() {
  if (_stream) {
    _stream.getTracks().forEach(track => track.stop());
    _stream = null;
  }
  _isDetecting = false;

  const video = document.getElementById('cameraVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const startBtn = document.getElementById('cameraStartBtn');
  const captureBtn = document.getElementById('cameraCaptureBtn');
  const stopBtn = document.getElementById('cameraStopBtn');
  const overlay = document.getElementById('emotionOverlay');
  const result = document.getElementById('emotionResult');

  video.srcObject = null;
  placeholder.classList.remove('hidden');
  startBtn.classList.remove('hidden');
  captureBtn.classList.add('hidden');
  stopBtn.classList.add('hidden');
  overlay.classList.add('hidden');
  result.classList.add('hidden');
  document.getElementById('emotionStatus').textContent = 'Sẵn sàng';
}

// ── Real-time Emotion Detection Loop ────────────────────────────────────────
function _startDetection() {
  _isDetecting = true;
  const video = document.getElementById('cameraVideo');
  const overlay = document.getElementById('emotionOverlay');
  const icon = document.getElementById('emotionIcon');
  const label = document.getElementById('emotionLabel');
  const conf = document.getElementById('emotionConfidence');
  const status = document.getElementById('emotionStatus');

  overlay.classList.remove('hidden');
  status.textContent = 'Đang phân tích...';

  async function detect() {
    if (!_isDetecting || !video.videoWidth) {
      if (_isDetecting) requestAnimationFrame(detect);
      return;
    }

    try {
      const detection = await _faceapi
        .detectAllFaces(video, new _faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detection.length > 0) {
        const expr = detection[0].expressions;
        const dominant = Object.entries(expr).sort((a, b) => b[1] - a[1])[0];
        const emotion = dominant[0];
        const confidence = dominant[1];

        _lastEmotion = { emotion, confidence, timestamp: Date.now() };

        // Update overlay
        const emoji = EMOTION_LABELS[emotion]?.split(' ').pop() || '😐';
        icon.textContent = emoji;
        label.textContent = EMOTION_LABELS[emotion] || emotion;
        conf.textContent = `${(confidence * 100).toFixed(0)}%`;
      }
    } catch {
      // Skip frame on error
    }

    if (_isDetecting) requestAnimationFrame(detect);
  }

  requestAnimationFrame(detect);
}

// ── Capture & Analyze ───────────────────────────────────────────────────────
export async function captureAndAnalyze() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const result = document.getElementById('emotionResult');
  const details = document.getElementById('emotionDetails');
  const advice = document.getElementById('emotionAdvice');

  result.classList.remove('hidden');

  // Draw current frame to canvas
  canvas.width = video.videoWidth || 480;
  canvas.height = video.videoHeight || 360;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // If we have real-time detection results, use them
  if (_lastEmotion) {
    const { emotion, confidence } = _lastEmotion;
    const label = EMOTION_LABELS[emotion] || emotion;
    const adviceText = EMOTION_ADVICE[emotion] || EMOTION_ADVICE.neutral;

    details.innerHTML = `
      <div class="emotion-bar">
        <span class="emotion-bar-label">${label}</span>
        <div class="emotion-bar-track">
          <div class="emotion-bar-fill" style="width:${(confidence * 100).toFixed(0)}%;background:var(--primary)"></div>
        </div>
      </div>
    `;
    advice.textContent = adviceText;
  } else {
    // Fallback: analyze canvas pixel data for basic mood detection
    const fallback = _analyzeFrameFallback(ctx, canvas.width, canvas.height);
    details.innerHTML = `
      <div class="emotion-bar">
        <span class="emotion-bar-label">${fallback.label}</span>
        <div class="emotion-bar-track">
          <div class="emotion-bar-fill" style="width:${(fallback.confidence * 100).toFixed(0)}%;background:var(--warning)"></div>
        </div>
      </div>
    `;
    advice.textContent = fallback.advice;
  }

  return _lastEmotion;
}

// ── Fallback Frame Analysis (no face-api) ───────────────────────────────────
function _analyzeFrameFallback(ctx, width, height) {
  // Sample pixel data for brightness/warmth analysis
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let totalR = 0, totalG = 0, totalB = 0;
  let brightness = 0;
  const sampleStep = 100; // Sample every 100th pixel for performance
  let samples = 0;

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
    brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    samples++;
  }

  const avgR = totalR / samples;
  const avgG = totalG / samples;
  const avgB = totalB / samples;
  const avgBrightness = brightness / samples;

  // Heuristic: warm colors + bright = happy, cool + dark = sad
  const warmth = avgR - avgB;
  const brightnessNorm = avgBrightness / 255;

  let emotion = 'neutral';
  let confidence = 0.5;

  if (brightnessNorm > 0.6 && warmth > 10) {
    emotion = 'happy';
    confidence = 0.6 + (brightnessNorm - 0.6) * 0.5;
  } else if (brightnessNorm < 0.4) {
    emotion = 'sad';
    confidence = 0.5 + (0.4 - brightnessNorm) * 0.5;
  } else if (warmth < -10) {
    emotion = 'neutral';
    confidence = 0.55;
  }

  return {
    emotion,
    confidence: Math.min(confidence, 0.9),
    label: EMOTION_LABELS[emotion],
    advice: EMOTION_ADVICE[emotion],
  };
}

// ── Get Last Detected Emotion ───────────────────────────────────────────────
export function getLastEmotion() {
  return _lastEmotion;
}
