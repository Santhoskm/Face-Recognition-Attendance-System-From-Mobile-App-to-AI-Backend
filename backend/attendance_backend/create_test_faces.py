# create_test_faces.py - FIXED VERSION
import os
import sys
import django

# Setup Django FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Initialize Django
django.setup()

# NOW import Django modules
import cv2
import numpy as np
from attendance.face_service import face_service
from attendance.models import Employee

def create_synthetic_faces():
    """Create synthetic face images for testing"""
    print("=== CREATING SYNTHETIC TRAINING FACES ===")
    
    # Create output directory
    os.makedirs("synthetic_faces", exist_ok=True)
    
    employees = Employee.objects.all()
    
    for employee in employees:
        print(f"\nCreating faces for {employee.employee_id}...")
        
        # Remove existing faces for this employee
        if employee.employee_id in face_service.label_map:
            label = face_service.label_map[employee.employee_id]
            # Create new lists without this label's faces
            new_faces = []
            new_labels = []
            for f, l in zip(face_service.faces, face_service.labels):
                if l != label:
                    new_faces.append(f)
                    new_labels.append(l)
            face_service.faces = new_faces
            face_service.labels = new_labels
        
        # Create 5 synthetic faces
        for i in range(5):
            # Base face (different for each employee)
            if employee.employee_id == "EMP001":
                base_brightness = 160
                eye_position = 85
                mouth_position = 145
            elif employee.employee_id == "EMP002":
                base_brightness = 140
                eye_position = 80
                mouth_position = 140
            else:
                base_brightness = 150
                eye_position = 83
                mouth_position = 143
            
            # Create face
            face = np.full((200, 200), base_brightness, dtype=np.uint8)
            
            # Eyes
            face[eye_position:eye_position+10, 70:90] = 30
            face[eye_position:eye_position+10, 110:130] = 30
            
            # Mouth
            face[mouth_position:mouth_position+5, 80:120] = 30
            
            # Variations
            if i == 1:
                face = cv2.flip(face, 1)  # Flipped
            elif i == 2:
                face = np.clip(face + 30, 0, 255)  # Brighter
            elif i == 3:
                face = np.clip(face - 20, 0, 255)  # Darker
            elif i == 4:
                # Add glasses effect
                face[eye_position-5:eye_position+15, 65:95] = 20
                face[eye_position-5:eye_position+15, 105:135] = 20
            
            # Add noise
            noise = np.random.normal(0, 8, (200, 200)).astype(np.uint8)
            face = np.clip(face + noise, 0, 255)
            
            # Preprocess
            face = cv2.equalizeHist(face)
            face = cv2.GaussianBlur(face, (5, 5), 0)
            
            # Save for reference
            cv2.imwrite(f"synthetic_faces/{employee.employee_id}_{i+1}.png", face)
            
            # Add to training data
            if employee.employee_id not in face_service.label_map:
                # Assign new label
                new_label = max(face_service.label_map.values(), default=0) + 1
                face_service.label_map[employee.employee_id] = new_label
                face_service.reverse_label_map[new_label] = employee.employee_id
            
            label = face_service.label_map[employee.employee_id]
            face_service.faces.append(face)
            face_service.labels.append(label)
            
            print(f"  Created face {i+1}")
        
        # Update employee
        employee.is_face_registered = True
        employee.face_label = face_service.label_map[employee.employee_id]
        employee.save()
    
    # Train model
    print("\nTraining model...")
    if len(face_service.faces) > 0:
        faces_array = np.array(face_service.faces, dtype=np.uint8)
        labels_array = np.array(face_service.labels, dtype=np.int32)
        
        face_service.face_recognizer = cv2.face.LBPHFaceRecognizer_create()
        face_service.face_recognizer.train(faces_array, labels_array)
        
        print(f"✓ Trained with {len(faces_array)} faces")
    
    # Save model
    face_service.save_model()
    print("✓ Model saved")
    
    # Print summary
    print(f"\n=== SUMMARY ===")
    print(f"Employees trained: {len(face_service.label_map)}")
    for emp_id, label in face_service.label_map.items():
        count = sum(1 for l in face_service.labels if l == label)
        print(f"  {emp_id}: {count} faces")
    
    print(f"\nSynthetic faces saved to 'synthetic_faces/' folder")
    print("These are NOT real faces but will work for testing recognition")

if __name__ == "__main__":
    create_synthetic_faces()