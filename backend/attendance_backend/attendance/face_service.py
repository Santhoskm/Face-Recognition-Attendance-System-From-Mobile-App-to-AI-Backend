# attendance/face_service.py - FIXED VERSION
import cv2
import numpy as np
import base64
import json
import io
import os
from PIL import Image
from django.conf import settings

class OpenCVFaceService:
    """Face recognition service using OpenCV LBPH - FIXED VERSION"""
    
    def __init__(self):
        print("=== INITIALIZING FACE SERVICE ===")
        
        # Initialize face cascade
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            if self.face_cascade.empty():
                print("Warning: Could not load face cascade")
                # Try alternative path
                alt_path = os.path.join(os.path.dirname(cv2.__file__), 'data', 'haarcascade_frontalface_default.xml')
                self.face_cascade = cv2.CascadeClassifier(alt_path)
                
            print(f"✓ Face cascade loaded: {not self.face_cascade.empty()}")
        except Exception as e:
            print(f"✗ Error loading face cascade: {e}")
            self.face_cascade = None
        
        # Initialize LBPH face recognizer
        self.face_recognizer = cv2.face.LBPHFaceRecognizer_create()
        
        # Store training data
        self.faces = []
        self.labels = []
        self.label_map = {}  # employee_id -> label
        self.reverse_label_map = {}  # label -> employee_id
        
        # Load existing model if available
        self.load_or_create_model()
        print("✓ Face service initialized")
    
    def load_or_create_model(self):
        """Load existing model or create new one"""
        model_path = os.path.join(settings.MEDIA_ROOT, 'models', 'lbph_model.yml')
        
        try:
            # Create models directory if not exists
            models_dir = os.path.join(settings.MEDIA_ROOT, 'models')
            os.makedirs(models_dir, exist_ok=True)
            
            if os.path.exists(model_path):
                print(f"Loading model from {model_path}")
                self.face_recognizer.read(model_path)
                
                # Load label mapping
                map_path = os.path.join(models_dir, 'label_map.json')
                if os.path.exists(map_path):
                    with open(map_path, 'r') as f:
                        data = json.load(f)
                        self.label_map = data.get('label_map', {})
                        self.reverse_label_map = data.get('reverse_map', {})
                        
                    print(f"✓ Loaded model with {len(self.label_map)} employees")
                else:
                    print("ℹ No label map found, starting fresh")
            else:
                print("ℹ No existing model found, will create new one")
                
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            # Create fresh model
            self.face_recognizer = cv2.face.LBPHFaceRecognizer_create()
    
    def save_model(self):
        """Save trained model to disk"""
        try:
            # Create models directory if not exists
            models_dir = os.path.join(settings.MEDIA_ROOT, 'models')
            os.makedirs(models_dir, exist_ok=True)
            
            # Save LBPH model
            model_path = os.path.join(models_dir, 'lbph_model.yml')
            self.face_recognizer.save(model_path)
            
            # Save label mapping
            map_path = os.path.join(models_dir, 'label_map.json')
            with open(map_path, 'w') as f:
                json.dump({
                    'label_map': self.label_map,
                    'reverse_map': self.reverse_label_map
                }, f, indent=2)
            
            print(f"✓ Model saved to {model_path}")
            print(f"  Employees in model: {len(self.label_map)}")
            return True
        except Exception as e:
            print(f"✗ Error saving model: {e}")
            return False
    
    def base64_to_image(self, base64_string):
        """Convert base64 string to OpenCV image"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array (OpenCV format)
            image_array = np.array(image)
            
            # Convert RGB to BGR (OpenCV uses BGR)
            image_bgr = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
            
            return image_bgr
        except Exception as e:
            print(f"✗ Error converting base64 to image: {e}")
            return None
    
    def detect_faces(self, image):
        """Detect faces in an image"""
        if self.face_cascade is None:
            print("✗ Face cascade not loaded")
            return [], None
            
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        return faces, gray
    
    def preprocess_face(self, face_image):
        """Preprocess face for recognition"""
        # Resize to standard size
        resized = cv2.resize(face_image, (200, 200))
        
        # Convert to grayscale
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization
        equalized = cv2.equalizeHist(gray)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(equalized, (5, 5), 0)
        
        return blurred
    
    def extract_face_features(self, image_base64):
        """Extract face from image and return processed face"""
        print("Extracting face features...")
        
        image = self.base64_to_image(image_base64)
        if image is None:
            print("✗ Could not convert image")
            return None
        
        faces, gray = self.detect_faces(image)
        
        print(f"Detected {len(faces)} faces")
        
        if len(faces) == 0:
            print("✗ No faces detected")
            return None
        
        # Take the first face
        x, y, w, h = faces[0]
        face_roi = image[y:y+h, x:x+w]
        
        # Preprocess the face
        processed_face = self.preprocess_face(face_roi)
        
        print("✓ Face features extracted")
        return processed_face
    
    def register_face(self, employee_id, face_images_base64):
        """Register multiple faces for an employee"""
        print(f"=== REGISTERING FACE FOR {employee_id} ===")
        print(f"Images received: {len(face_images_base64)}")
        
        try:
            # Check if employee already has a label
            if employee_id not in self.label_map:
                # Assign new label (start from 1)
                new_label = len(self.label_map) + 1
                self.label_map[employee_id] = new_label
                self.reverse_label_map[new_label] = employee_id
                print(f"Assigned new label {new_label} to {employee_id}")
            else:
                print(f"Employee {employee_id} already has label {self.label_map[employee_id]}")
            
            label = self.label_map[employee_id]
            registered_faces = []
            successful_extractions = 0
            
            for i, img_base64 in enumerate(face_images_base64):
                print(f"Processing image {i+1}/{len(face_images_base64)}...")
                processed_face = self.extract_face_features(img_base64)
                if processed_face is not None:
                    self.faces.append(processed_face)
                    self.labels.append(label)
                    registered_faces.append(True)
                    successful_extractions += 1
                    print(f"✓ Image {i+1}: Face extracted")
                else:
                    registered_faces.append(False)
                    print(f"✗ Image {i+1}: No face found")
            
            print(f"Successful extractions: {successful_extractions}/{len(face_images_base64)}")
            
            # Train or update the model if we have faces
            if successful_extractions > 0:
                faces_array = np.array(self.faces, dtype=np.uint8)
                labels_array = np.array(self.labels, dtype=np.int32)
                
                print(f"Training with {len(faces_array)} faces, {len(np.unique(labels_array))} labels...")
                
                # Check if model has been trained before
                try:
                    # Try to get current labels
                    current_labels = self.face_recognizer.getLabels()
                    if current_labels is None or len(current_labels) == 0:
                        # Initial training
                        self.face_recognizer.train(faces_array, labels_array)
                        print("✓ Initial model training complete")
                    else:
                        # Update existing model
                        self.face_recognizer.update(faces_array, labels_array)
                        print("✓ Model update complete")
                except:
                    # Initial training
                    self.face_recognizer.train(faces_array, labels_array)
                    print("✓ Initial model training complete")
                
                # Save the updated model
                self.save_model()
                
                print(f"✓ Face registration complete for {employee_id}")
                print(f"  Label: {label}")
                print(f"  Successful images: {successful_extractions}")
            else:
                print("✗ No faces could be extracted")
            
            return registered_faces
            
        except Exception as e:
            print(f"✗ Error registering face: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def verify_face(self, employee_id, face_image_base64):
        """Verify if face matches the employee - FIXED VERSION"""
        print(f"=== VERIFYING FACE FOR {employee_id} ===")
        
        try:
            # Check if employee is in our model
            if employee_id not in self.label_map:
                print(f"✗ Employee {employee_id} not in model")
                return False, 0.0
            
            # Extract face features
            test_face = self.extract_face_features(face_image_base64)
            if test_face is None:
                print("✗ Could not extract face from image")
                return False, 0.0
            
            # Get employee's label
            label = self.label_map[employee_id]
            
            # Predict using LBPH
            predicted_label, confidence = self.face_recognizer.predict(test_face)
            
            # LBPH returns distance (lower is better)
            # Convert to confidence score (0-100)
            confidence_score = max(0, 100 - confidence) / 100.0
            
            print(f"Predicted label: {predicted_label} (expected: {label})")
            print(f"LBPH distance: {confidence}")
            print(f"Confidence score: {confidence_score:.2f}")
            
            # Get predicted employee
            predicted_employee = self.reverse_label_map.get(predicted_label, None)
            
            print(f"Predicted employee: {predicted_employee}")
            print(f"Expected employee: {employee_id}")
            
            # Check if prediction matches
            match = (predicted_employee == employee_id) and (confidence_score >= 0.6)
            
            if match:
                print(f"✓ Face verification PASSED for {employee_id}")
            else:
                print(f"✗ Face verification FAILED for {employee_id}")
                if predicted_employee != employee_id:
                    print(f"  Reason: Predicted different employee ({predicted_employee})")
                if confidence_score < 0.6:
                    print(f"  Reason: Confidence too low ({confidence_score:.2f})")
            
            return match, confidence_score
            
        except Exception as e:
            print(f"✗ Error verifying face: {e}")
            import traceback
            traceback.print_exc()
            return False, 0.0
    
    def is_valid_face_image(self, image_base64):
        """Check if image contains exactly one clear face"""
        print("Validating face image...")
        
        try:
            image = self.base64_to_image(image_base64)
            if image is None:
                print("✗ Invalid image")
                return False
            
            faces, gray = self.detect_faces(image)
            
            print(f"Faces detected: {len(faces)}")
            
            if len(faces) != 1:
                print(f"✗ Expected 1 face, found {len(faces)}")
                return False
            
            # Check face quality (size, brightness)
            x, y, w, h = faces[0]
            face_region = gray[y:y+h, x:x+w]
            
            print(f"Face size: {w}x{h}")
            
            # Check face size (should be reasonable)
            if w < 100 or h < 100:
                print(f"✗ Face too small: {w}x{h}")
                return False
            
            # Check brightness (avoid too dark or too bright)
            brightness = np.mean(face_region)
            print(f"Brightness: {brightness:.1f}")
            
            if brightness < 30:
                print("✗ Face too dark")
                return False
            if brightness > 220:
                print("✗ Face too bright")
                return False
            
            print("✓ Valid face image")
            return True
            
        except Exception as e:
            print(f"✗ Error validating face image: {e}")
            return False

# Create global instance
face_service = OpenCVFaceService()