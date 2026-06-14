"""
main.py — Entrypoint cho Google Cloud Run
Chạy Flask/FastAPI web server hoặc bot.
"""

import os
import sys

# ── Thêm project root vào PATH ──
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Kiểm tra requirements.txt có tồn tại không ──
if not os.path.exists('requirements.txt'):
    print("⚠️  requirements.txt not found, creating minimal one...")
    with open('requirements.txt', 'w') as f:
        f.write("flask>=3.0.0\ngunicorn>=21.2.0\n")

# ── Tạo minimal Flask app cho health check ──
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'service': 'my-ai-brain',
        'version': '6.0.0',
        'message': 'AI Brain API is running'
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🚀 Starting AI Brain on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
