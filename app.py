from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import cv2
import numpy as np
import face_recognition
import base64
import io
from PIL import Image
import logging
import sys
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Enhanced logging configuration
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('face_attendance.log')
    ]
)
logger = logging.getLogger('face_attendance')

def allowed_file(filename):
    """Validate file extension"""
    try:
        if not filename:
            return False
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}
    except Exception as e:
        logger.error(f"Error checking file type: {str(e)}")
        return False

def base64_to_image(base64_string):
    """Convert base64 string to numpy array with enhanced error handling"""
    try:
        if not base64_string:
            raise ValueError("Empty base64 string")
            
        # Remove header if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Validate base64 string
        if not isinstance(base64_string, str):
            raise ValueError("Invalid base64 string type")
            
        try:
            img_data = base64.b64decode(base64_string)
        except Exception as e:
            raise ValueError(f"Base64 decoding failed: {str(e)}")
            
        try:
            img = Image.open(io.BytesIO(img_data)).convert('RGB')
        except Exception as e:
            raise ValueError(f"Failed to open image: {str(e)}")
        
        # Validate image dimensions
        if img.width == 0 or img.height == 0:
            raise ValueError("Invalid image dimensions")
        
        # Resize if necessary
        if img.width > 1280 or img.height > 1280:
            img.thumbnail((1280, 1280), Image.LANCZOS)
            
        # Convert to numpy array
        np_image = np.array(img)
        
        # Validate numpy array
        if np_image.size == 0:
            raise ValueError("Empty image array")
            
        return np_image
    except Exception as e:
        logger.error(f"Base64 conversion error: {str(e)}")
        return None

@app.route('/detect-face', methods=['POST'])
@cross_origin()
def detect_face():
    """Endpoint to detect faces in an image"""
    try:
        logger.info("Face detection request received")
        
        # Validate request
        if not request.is_json:
            return jsonify({'face_detected': False, 'error': 'Request must be JSON'}), 400
            
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'face_detected': False, 'error': 'No image provided'}), 400

        # Convert image
        image = base64_to_image(data['image'])
        if image is None:
            return jsonify({'face_detected': False, 'error': 'Invalid image format'}), 400

        # Face detection
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            if face_cascade.empty():
                raise ValueError("Failed to load face cascade classifier")
                
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
            
            logger.info(f"Detected {len(faces)} faces")
            return jsonify({
                'face_detected': len(faces) > 0,
                'face_count': len(faces)
            })

        except Exception as e:
            logger.error(f"Face detection processing error: {str(e)}")
            return jsonify({'face_detected': False, 'error': 'Face detection failed'}), 400

    except Exception as e:
        logger.error(f"Detect face error: {str(e)}")
        return jsonify({'face_detected': False, 'error': 'Internal server error'}), 500

@app.route('/compare-faces', methods=['POST'])
@cross_origin()
def compare_faces():
    """Endpoint to compare two face images"""
    try:
        logger.info("Face comparison request received")
        
        if 'profile_image' not in request.files or 'current_image' not in request.files:
            return jsonify({'error': 'Missing required image files'}), 400

        profile_file = request.files['profile_image']
        current_file = request.files['current_image']

        if profile_file.filename == '' or current_file.filename == '':
            return jsonify({'error': 'No selected files'}), 400

        if not allowed_file(profile_file.filename) or not allowed_file(current_file.filename):
            return jsonify({'error': 'Allowed file types: png, jpg, jpeg'}), 400

        try:
            profile_bytes = profile_file.read()
            current_bytes = current_file.read()

            if len(profile_bytes) == 0 or len(current_bytes) == 0:
                return jsonify({'error': 'Empty file content'}), 400

            profile_b64 = base64.b64encode(profile_bytes).decode('utf-8')
            current_b64 = base64.b64encode(current_bytes).decode('utf-8')

            profile_image = base64_to_image(profile_b64)
            current_image = base64_to_image(current_b64)

            if profile_image is None or current_image is None:
                return jsonify({'error': 'Invalid image format'}), 400

        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return jsonify({'error': 'Failed to process images'}), 400

        try:
            profile_locations = face_recognition.face_locations(profile_image, model='hog')
            if not profile_locations:
                return jsonify({'error': 'No face found in profile image'}), 400
                
            current_locations = face_recognition.face_locations(current_image, model='hog')
            if not current_locations:
                return jsonify({'error': 'No face found in current image'}), 400

            if len(profile_locations) > 1:
                return jsonify({'error': 'Multiple faces found in profile image'}), 400
            if len(current_locations) > 1:
                return jsonify({'error': 'Multiple faces found in current image'}), 400

            profile_encodings = face_recognition.face_encodings(profile_image, profile_locations)
            current_encodings = face_recognition.face_encodings(current_image, current_locations)

            if not profile_encodings or not current_encodings:
                return jsonify({'error': 'Failed to encode faces'}), 400

        except Exception as e:
            logger.error(f"Face encoding error: {str(e)}")
            return jsonify({'error': 'Face processing failed'}), 400

        try:
            logger.debug(f"Profile encoding: {profile_encodings[0].tolist()}")
            logger.debug(f"Current encoding: {current_encodings[0].tolist()}")
            
            face_distance = face_recognition.face_distance([profile_encodings[0]], current_encodings[0])[0]
            match_percentage = (1 - face_distance) * 100

            response = {
                'match_percentage': float(round(match_percentage, 2)),
                'message': 'Comparison successful'
            }
            
            logger.info(f"Successful comparison with match percentage: {match_percentage}")
            return jsonify(response)

        except Exception as e:
            logger.error(f"Face comparison error: {str(e)}")
            return jsonify({'error': f'Face comparison failed: {str(e)}'}), 400

    except Exception as e:
        logger.critical(f"Critical error in compare_faces: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=False)