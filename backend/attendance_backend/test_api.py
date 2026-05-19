# test_api.py
import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def test_employee(employee_id):
    print(f"\n=== Testing {employee_id} ===")
    
    data = {
        "employee_id": employee_id,
        "attendance_type": "CHECK_IN",
        "face_image": "test"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/mark-attendance/",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if result.get('success'):
            print(f"✅ {employee_id}: Success!")
            if result.get('attendance', {}).get('is_verified'):
                print(f"   Verified: YES")
            else:
                print(f"   Verified: NO (confidence: {result.get('attendance', {}).get('confidence_score')})")
        else:
            print(f"❌ {employee_id}: Failed - {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Testing Face Attendance API")
    
    test_employee("EMP001")
    time.sleep(6)  # Wait to avoid duplicate warning
    test_employee("EMP002")