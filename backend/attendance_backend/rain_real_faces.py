# train_real_faces.py
import os
import sys
import django
import cv2
import numpy as np
import base64
from PIL import Image
import io

# Setup Django FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from attendance.face_service import face_service
from attendance.models import Employee

def prepare_folder_structure():
    """Create training folder structure"""
    base_dir = "training_data"
    
    print("=== PREPARING TRAINING FOLDER ===")
    print(f"Training data will be read from: {base_dir}/")
    print("\nExpected structure:")
    print(f"{base_dir}/")
    print("├── EMP001/")
    print("│   ├── face1.jpg")
    print("│   ├── face2.jpg")
    print("│   └── ...")
    print("└── EMP002/")
    print("    ├── face1.jpg")
    print("    ├── face2.jpg")
    print("    └── ...")
    
    if not os.path.exists(base_dir):
        print(f"\n❌ Folder '{base_dir}' not found!")
        print(f"Create it and add employee folders with face images.")
        return False
    
    return True

def validate_image(image_path):
    """Check if image is valid for training"""
    try:
        # Try to open image
        img = cv2.imread(image_path)
        if img is None:
            return False, "Could not read image"
        
        # Check dimensions
        height, width = img.shape[:2]
        if height < 100 or width < 100:
            return False, f"Too small: {width}x{height}"
        
        # Check if it's a color image
        if len(img.shape) != 3:
            return False, "Not a color image"
        
        return True, f"OK ({width}x{height})"
        
    except Exception as e:
        return False, str(e)

def convert_to_base64(image_path):
    """Convert image to base64 string"""
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Check image type
        if image_path.lower().endswith('.jpg') or image_path.lower().endswith('.jpeg'):
            mime_type = 'jpeg'
        elif image_path.lower().endswith('.png'):
            mime_type = 'png'
        else:
            mime_type = 'jpg'
        
        base64_str = base64.b64encode(image_data).decode('utf-8')
        return f"data:image/{mime_type};base64,{base64_str}"
        
    except Exception as e:
        print(f"    Error converting {os.path.basename(image_path)}: {e}")
        return None

def train_employee(employee_id, image_paths):
    """Train a single employee with their images"""
    print(f"\n--- Training {employee_id} ---")
    
    # Check if employee exists
    try:
        employee = Employee.objects.get(employee_id=employee_id)
        print(f"  Found: {employee.user.get_full_name()}")
    except Employee.DoesNotExist:
        print(f"  ❌ Employee {employee_id} not found in database!")
        return False
    
    # Validate images
    valid_images = []
    for img_path in image_paths:
        is_valid, message = validate_image(img_path)
        if is_valid:
            valid_images.append(img_path)
            print(f"    ✓ {os.path.basename(img_path)} - {message}")
        else:
            print(f"    ✗ {os.path.basename(img_path)} - {message}")
    
    if len(valid_images) < 3:
        print(f"  ❌ Need at least 3 valid images, got {len(valid_images)}")
        return False
    
    # Convert to base64
    base64_images = []
    for img_path in valid_images[:10]:  # Limit to 10 images
        base64_img = convert_to_base64(img_path)
        if base64_img:
            base64_images.append(base64_img)
    
    if len(base64_images) < 3:
        print(f"  ❌ Could not convert enough images")
        return False
    
    # Remove existing faces for this employee
    if employee_id in face_service.label_map:
        label = face_service.label_map[employee_id]
        # Filter out old faces
        face_service.faces = [f for f, l in zip(face_service.faces, face_service.labels) if l != label]
        face_service.labels = [l for l in face_service.labels if l != label]
        print(f"  Removed old training data")
    
    # Register new faces
    print(f"  Registering {len(base64_images)} images...")
    results = face_service.register_face(employee_id, base64_images)
    successful = sum(results)
    
    if successful >= 3:
        # Update employee
        employee.is_face_registered = True
        if employee_id in face_service.label_map:
            employee.face_label = face_service.label_map[employee_id]
        employee.save()
        print(f"  ✅ Successfully trained with {successful} images")
        return True
    else:
        print(f"  ❌ Failed: only {successful} images registered")
        return False

def train_from_folder(folder_path="training_data"):
    """Main training function"""
    if not os.path.exists(folder_path):
        print(f"❌ Folder '{folder_path}' not found!")
        print("Create it with structure: training_data/EMP001/face1.jpg, etc.")
        return False
    
    print(f"\n=== SCANNING {folder_path} ===")
    
    # Find all employee folders
    employee_folders = []
    for item in os.listdir(folder_path):
        item_path = os.path.join(folder_path, item)
        if os.path.isdir(item_path):
            employee_folders.append(item)
    
    if not employee_folders:
        print("No employee folders found!")
        return False
    
    print(f"Found {len(employee_folders)} employee folders: {', '.join(employee_folders)}")
    
    # Train each employee
    trained_count = 0
    for emp_folder in employee_folders:
        emp_path = os.path.join(folder_path, emp_folder)
        
        # Get all image files
        image_files = []
        for ext in ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']:
            for file in os.listdir(emp_path):
                if file.lower().endswith(ext):
                    image_files.append(os.path.join(emp_path, file))
        
        if not image_files:
            print(f"\n❌ No images found in {emp_folder}/")
            continue
        
        # Sort images
        image_files.sort()
        
        # Train this employee
        if train_employee(emp_folder, image_files):
            trained_count += 1
    
    # Save the model
    if trained_count > 0:
        face_service.save_model()
        print(f"\n✅ Model saved with {trained_count} employees trained")
        
        # Show summary
        print(f"\n=== TRAINING SUMMARY ===")
        print(f"Employees in model: {len(face_service.label_map)}")
        print(f"Total faces trained: {len(face_service.faces)}")
        
        for emp_id, label in face_service.label_map.items():
            count = sum(1 for l in face_service.labels if l == label)
            print(f"  {emp_id}: {count} faces")
        
        return True
    else:
        print("\n❌ No employees were trained successfully")
        return False

def capture_images_from_webcam(employee_id):
    """Capture real-time images from webcam for training"""
    print(f"\n=== CAPTURING IMAGES FOR {employee_id} ===")
    print("Press SPACEBAR to capture image")
    print("Press 'q' to quit")
    
    # Create folder for this employee
    emp_folder = os.path.join("training_data", employee_id)
    os.makedirs(emp_folder, exist_ok=True)
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Could not open webcam!")
        return
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    image_count = 0
    max_images = 10
    
    print(f"\nCapturing to: {emp_folder}/")
    
    while image_count < max_images:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to grab frame")
            break
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Draw rectangle around face
        display_frame = frame.copy()
        for (x, y, w, h) in faces:
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            # Display count
            cv2.putText(display_frame, f'Image {image_count}/{max_images}', 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Show the frame
        cv2.imshow(f'Capture for {employee_id} - Press SPACE to capture, q to quit', display_frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord(' '):  # SPACEBAR to capture
            if len(faces) == 1:
                # Save the image
                x, y, w, h = faces[0]
                face_roi = frame[y:y+h, x:x+w]
                
                # Resize for consistency
                face_resized = cv2.resize(face_roi, (500, 500))
                
                # Save image
                image_count += 1
                filename = os.path.join(emp_folder, f"face_{image_count}.jpg")
                cv2.imwrite(filename, face_resized)
                print(f"  ✓ Captured image {image_count}")
                
                # Show preview
                cv2.imshow(f'Captured {image_count}', face_resized)
                cv2.waitKey(500)  # Show for 500ms
                cv2.destroyWindow(f'Captured {image_count}')
            else:
                print("  ⚠ Face not detected or multiple faces")
        
        elif key == ord('q'):  # 'q' to quit
            break
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    
    print(f"\n✅ Captured {image_count} images for {employee_id}")
    print(f"Saved to: {emp_folder}/")

if __name__ == "__main__":
    print("=== REAL FACE TRAINING SYSTEM ===")
    print("\nOptions:")
    print("1. Train from existing images in training_data/ folder")
    print("2. Capture new images using webcam")
    print("3. Exit")
    
    choice = input("\nSelect option (1/2/3): ").strip()
    
    if choice == "1":
        if prepare_folder_structure():
            folder = input("Enter folder path (default: training_data): ") or "training_data"
            train_from_folder(folder)
    elif choice == "2":
        emp_id = input("Enter employee ID (e.g., EMP001): ").strip()
        if emp_id:
            capture_images_from_webcam(emp_id)
            # Ask if want to train now
            train_now = input(f"\nTrain {emp_id} with captured images? (yes/no): ").lower()
            if train_now == 'yes':
                train_from_folder("training_data")
    else:
        print("Exiting...")



    //// to run this train_real_faces.py file use the command below

            # Option 1: Train from existing images
python train_real_faces.py
# Select option 1

# Option 2: Capture new images with webcam
python train_real_faces.py
# Select option 2, then enter employee ID