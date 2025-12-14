from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
from pathlib import Path

app = Flask(__name__)
app.config['GPX_UPLOAD_FOLDER'] = Path('data/gpx')
app.config['GPX_UPLOAD_FOLDER'].mkdir(parents=True, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tracks', methods=['GET'])
def get_tracks():
    tracks = []
    for gpx_file in app.config['GPX_UPLOAD_FOLDER'].glob('*.gpx'):
        tracks.append({
            'id': gpx_file.stem,
            'filename': gpx_file.name,
            'size': gpx_file.stat().st_size
        })
    return jsonify(tracks)

@app.route('/api/tracks/<track_id>', methods=['GET'])
def get_track(track_id):
    gpx_path = app.config['GPX_UPLOAD_FOLDER'] / f"{track_id}.gpx"
    if gpx_path.exists():
        return send_from_directory(app.config['GPX_UPLOAD_FOLDER'], f"{track_id}.gpx")
    return jsonify({'error': 'Track not found'}), 404

@app.route('/api/upload', methods=['POST'])
def upload_track():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and file.filename.endswith('.gpx'):
        filename = Path(file.filename).name
        file.save(app.config['GPX_UPLOAD_FOLDER'] / filename)
        return jsonify({'success': True, 'filename': filename})

    return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8005, debug=True)
