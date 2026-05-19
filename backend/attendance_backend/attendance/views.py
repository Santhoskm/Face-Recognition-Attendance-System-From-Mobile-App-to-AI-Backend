# attendance/views.py - COMPLETE FIXED VERSION
from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth import authenticate, login
import json
import traceback
import logging
import os

from .models import Employee, AttendanceRecord
from .serializers import (
    EmployeeSerializer, AttendanceSerializer,
    RegisterSerializer, LoginSerializer,
    FaceRegistrationSerializer, MarkAttendanceSerializer,
    AttendanceHistorySerializer
)
from .face_service import face_service
from rest_framework_simplejwt.tokens import RefreshToken

# Add this at the top of the views.py file (after imports)
logger = logging.getLogger(__name__)

# ==================== TEST ENDPOINTS ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def test_endpoint(request):
    """Test endpoint to verify server is running"""
    return Response({
        'status': 'online',
        'service': 'Face Attendance API',
        'version': '2.0',
        'timestamp': timezone.now().isoformat(),
        'face_service': 'OpenCV LBPH (Active)',
        'endpoints': {
            'test': '/api/test/',
            'health': '/api/health/',
            'test_face_service': '/api/test-face-service/',
            'simple_login': '/api/simple-login/',
            'login': '/api/login/',
            'register': '/api/register/',
            'register_face': '/api/register-face/',
            'mark_attendance': '/api/mark-attendance/',
        },
        'demo_credentials': {
            'username': 'demo',
            'password': 'demo123'
        }
    })

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def debug_request(request):
    """Debug endpoint to see request details"""
    return Response({
        'method': request.method,
        'headers': dict(request.headers),
        'GET_params': dict(request.GET),
        'POST_data': request.data,
        'body': request.body.decode('utf-8') if request.body else None,
        'user': str(request.user) if request.user else 'Anonymous',
        'meta': {
            'REMOTE_ADDR': request.META.get('REMOTE_ADDR'),
            'HTTP_USER_AGENT': request.META.get('HTTP_USER_AGENT'),
        }
    })

# ==================== FACE SERVICE TEST ====================

class TestFaceServiceView(APIView):
    """Test the face service"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get face service status"""
        return Response({
            'success': True,
            'service': 'OpenCVFaceService',
            'status': 'active',
            'timestamp': timezone.now().isoformat(),
            'model_info': {
                'employees_registered': len(face_service.label_map),
                'total_faces': len(face_service.faces),
                'label_map': face_service.label_map,
                'reverse_map': face_service.reverse_label_map
            },
            'cascade_loaded': face_service.face_cascade is not None,
            'recognizer_ready': face_service.face_recognizer is not None,
            'paths': {
                'media_root': settings.MEDIA_ROOT if hasattr(settings, 'MEDIA_ROOT') else 'Not set',
                'model_path': os.path.join(settings.MEDIA_ROOT, 'models', 'lbph_model.yml') if hasattr(settings, 'MEDIA_ROOT') else 'Not set'
            }
        })

# ==================== AUTHENTICATION ====================

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Handle both form data and JSON
        if not isinstance(request.data, dict):
            try:
                data = json.loads(request.body)
            except:
                data = {}
        else:
            data = request.data
        
        print(f"Registration data: {data}")
        
        # Validate required fields
        required_fields = ['username', 'password', 'employee_id']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return Response({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username already exists
        if User.objects.filter(username=data['username']).exists():
            return Response({
                'success': False,
                'error': 'Username already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if employee_id already exists
        if Employee.objects.filter(employee_id=data['employee_id']).exists():
            return Response({
                'success': False,
                'error': 'Employee ID already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create user
            user = User.objects.create_user(
                username=data['username'],
                password=data['password'],
                email=data.get('email', ''),
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', '')
            )
            
            # Create employee
            employee = Employee.objects.create(
                user=user,
                employee_id=data['employee_id'],
                department=data.get('department', 'General'),
                phone_number=data.get('phone_number', '')
            )
            
            print(f"✅ Created user: {user.username}")
            print(f"✅ Created employee: {employee.employee_id}")
            
            return Response({
                'success': True,
                'message': 'Registration successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                },
                'employee': {
                    'id': employee.id,
                    'employee_id': employee.employee_id,
                    'department': employee.department,
                    'phone_number': employee.phone_number,
                    'is_face_registered': employee.is_face_registered,
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"❌ Registration error: {str(e)}")
            # Clean up if any error
            if 'user' in locals():
                user.delete()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class SimpleLoginView(APIView):
    """Simplified login that always works"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("=== SIMPLE LOGIN VIEW ===")
        
        try:
            # Get data
            if hasattr(request, 'data') and request.data:
                data = request.data
            else:
                try:
                    data = json.loads(request.body)
                except:
                    data = {}
            
            username = data.get('username', '').strip()
            password = data.get('password', '').strip()
            
            print(f"Login attempt - Username: '{username}', Password: '{password}'")
            
            # DEMO MODE - Always accept demo user
            if username == 'demo' and password == 'demo123':
                print("✅ Demo user login")
                return Response({
                    'success': True,
                    'message': 'Login successful (demo mode)',
                    'user': {
                        'username': 'demo',
                        'first_name': 'Demo',
                        'last_name': 'User',
                        'email': 'demo@example.com'
                    },
                    'employee': {
                        'employee_id': 'EMP001',
                        'department': 'Engineering',
                        'is_face_registered': False
                    }
                })
            
            # Try real authentication
            if username and password:
                user = authenticate(username=username, password=password)
                
                if user is not None:
                    # Get or create employee
                    try:
                        employee = Employee.objects.get(user=user)
                    except Employee.DoesNotExist:
                        # Create employee record
                        employee = Employee.objects.create(
                            user=user,
                            employee_id=f"EMP{user.id:03d}",
                            department="General"
                        )
                    
                    print(f"✅ User authenticated: {user.username}")
                    
                    return Response({
                        'success': True,
                        'message': 'Login successful',
                        'user': {
                            'username': user.username,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'email': user.email
                        },
                        'employee': {
                            'employee_id': employee.employee_id,
                            'department': employee.department,
                            'is_face_registered': employee.is_face_registered,
                        }
                    })
                else:
                    print(f"❌ Authentication failed for: {username}")
                    return Response({
                        'success': False,
                        'error': 'Invalid username or password'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response({
                    'success': False,
                    'error': 'Username and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginView(APIView):
    """Compatible login view with JWT tokens"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("=== JWT LOGIN VIEW ===")
        
        try:
            # Parse data
            if hasattr(request, 'data') and request.data:
                data = request.data
            else:
                data = json.loads(request.body)
            
            username = data.get('username', '').strip()
            password = data.get('password', '').strip()
            
            print(f"JWT Login - Username: '{username}'")
            
            # DEMO USER
            if username == 'demo' and password == 'demo123':
                # Get or create demo user
                user, created = User.objects.get_or_create(
                    username='demo',
                    defaults={
                        'email': 'demo@example.com',
                        'first_name': 'Demo',
                        'last_name': 'User'
                    }
                )
                
                if created:
                    user.set_password('demo123')
                    user.save()
                    # Create employee
                    employee = Employee.objects.create(
                        user=user,
                        employee_id='EMP001',
                        department='Engineering'
                    )
                else:
                    employee = Employee.objects.get(user=user)
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                    },
                    'employee': {
                        'id': employee.id,
                        'employee_id': employee.employee_id,
                        'department': employee.department,
                        'phone_number': employee.phone_number,
                        'is_face_registered': employee.is_face_registered,
                    },
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                })
            
            # REAL USER AUTHENTICATION
            if username and password:
                user = authenticate(username=username, password=password)
                
                if user is not None:
                    # Get or create employee
                    try:
                        employee = Employee.objects.get(user=user)
                    except Employee.DoesNotExist:
                        employee = Employee.objects.create(
                            user=user,
                            employee_id=f"EMP{user.id:03d}",
                            department="General"
                        )
                    
                    # Generate JWT tokens
                    refresh = RefreshToken.for_user(user)
                    
                    return Response({
                        'success': True,
                        'message': 'Login successful',
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'email': user.email,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                        },
                        'employee': {
                            'id': employee.id,
                            'employee_id': employee.employee_id,
                            'department': employee.department,
                            'phone_number': employee.phone_number,
                            'is_face_registered': employee.is_face_registered,
                        },
                        'tokens': {
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                        }
                    })
                else:
                    return Response({
                        'success': False,
                        'error': 'Invalid username or password'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response({
                    'success': False,
                    'error': 'Username and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"❌ JWT Login error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== FACE REGISTRATION (FIXED) ====================

class FaceRegistrationView(APIView):
    """Fixed face registration view with OpenCV LBPH"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("=== FACE REGISTRATION REQUEST (FIXED) ===")
        
        try:
            # Get data
            data = request.data
            
            employee_id = data.get('employee_id')
            face_images = data.get('face_images', [])
            
            print(f"Employee ID: {employee_id}")
            print(f"Number of images: {len(face_images)}")
            
            if not employee_id:
                return Response({
                    'success': False,
                    'error': 'employee_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not face_images or len(face_images) < 3:
                return Response({
                    'success': False,
                    'error': 'At least 3 face images are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get employee
            try:
                employee = Employee.objects.get(employee_id=employee_id)
                print(f"Found employee: {employee.user.get_full_name()}")
            except Employee.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Employee not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Validate each image
            valid_images = []
            invalid_images = []
            
            print("Validating face images...")
            for i, img_data in enumerate(face_images):
                if face_service.is_valid_face_image(img_data):
                    valid_images.append(img_data)
                else:
                    invalid_images.append(i + 1)  # Track which images failed
            
            print(f"Valid images: {len(valid_images)}, Invalid images: {len(invalid_images)}")
            
            if len(valid_images) < 3:
                return Response({
                    'success': False,
                    'error': f'Need at least 3 valid face images. Only {len(valid_images)} passed validation.',
                    'invalid_images': invalid_images,
                    'valid_images_count': len(valid_images),
                    'advice': 'Please provide clear frontal face images with good lighting'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Register faces using OpenCV LBPH
            print(f"Registering {len(valid_images)} valid face images...")
            registration_results = face_service.register_face(employee_id, valid_images)
            
            successful_registrations = sum(registration_results)
            
            if successful_registrations >= 3:
                # Update employee status
                employee.is_face_registered = True
                
                # Assign face label from the service
                if employee_id in face_service.label_map:
                    employee.face_label = face_service.label_map[employee_id]
                
                # Store sample encodings in employee model
                sample_encodings = []
                if valid_images and len(valid_images) > 0:
                    # Store first valid image as reference
                    sample_encodings.append({
                        'image_index': 0,
                        'registration_time': timezone.now().isoformat()
                    })
                    employee.set_face_encodings(sample_encodings)
                
                employee.save()
                
                print(f"✅ Face registration SUCCESSFUL for {employee_id}")
                print(f"  Label: {employee.face_label}")
                print(f"  Successful images: {successful_registrations}")
                
                return Response({
                    'success': True,
                    'message': 'Face registration successful!',
                    'employee_id': employee_id,
                    'employee_name': employee.user.get_full_name(),
                    'is_face_registered': True,
                    'face_label': employee.face_label,
                    'registration_stats': {
                        'images_received': len(face_images),
                        'images_valid': len(valid_images),
                        'registration_successful': successful_registrations,
                        'invalid_image_indices': invalid_images
                    },
                    'model_info': {
                        'algorithm': 'OpenCV LBPH',
                        'employees_in_model': len(face_service.label_map),
                        'total_faces': len(face_service.faces)
                    },
                    'next_steps': 'You can now mark attendance using face recognition'
                })
            else:
                print(f"❌ Face registration FAILED for {employee_id}")
                
                return Response({
                    'success': False,
                    'error': f'Face registration failed. Only {successful_registrations} faces could be registered.',
                    'registration_results': registration_results,
                    'valid_images_count': len(valid_images),
                    'advice': 'Please provide clear frontal face images with good lighting'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"❌ Face registration error: {str(e)}")
            traceback.print_exc()
            return Response({
                'success': False,
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== FACE STATUS ====================

class CheckFaceStatusView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        employee_id = request.query_params.get('employee_id')
        
        if not employee_id:
            return Response({
                'success': False,
                'error': 'employee_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            
            # Check if employee is in face service model
            is_in_model = employee_id in face_service.label_map
            model_label = face_service.label_map.get(employee_id)
            
            return Response({
                'success': True,
                'employee_id': employee_id,
                'employee_name': employee.user.get_full_name(),
                'is_face_registered': employee.is_face_registered,
                'face_label': employee.face_label,
                'in_model': is_in_model,
                'model_label': model_label,
                'registration_date': employee.created_at.isoformat() if employee.is_face_registered else None,
                'face_service_stats': {
                    'total_employees': len(face_service.label_map),
                    'total_faces': len(face_service.faces)
                }
            })
        except Employee.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Employee not found'
            }, status=status.HTTP_404_NOT_FOUND)

# ==================== ATTENDANCE MARKING (FIXED) ====================

# class MarkAttendanceView(APIView):
#     """Fixed attendance marking with actual face verification"""
#     permission_classes = [AllowAny]
    
#     def post(self, request):
#         print("=== MARK ATTENDANCE (FIXED) ===")
        
#         try:
#             # Get data
#             if hasattr(request, 'data') and request.data:
#                 data = request.data
#             else:
#                 data = json.loads(request.body)
            
#             employee_id = data.get('employee_id')
#             face_image = data.get('face_image')
#             attendance_type = data.get('attendance_type', 'CHECK_IN')
#             latitude = data.get('latitude')
#             longitude = data.get('longitude')
            
#             print(f"Employee ID: {employee_id}")
#             print(f"Attendance Type: {attendance_type}")
            
#             # Validate required fields
#             if not employee_id:
#                 return Response({
#                     'success': False,
#                     'error': 'employee_id is required'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             if not face_image:
#                 return Response({
#                     'success': False,
#                     'error': 'face_image is required'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Get employee
#             try:
#                 employee = Employee.objects.get(employee_id=employee_id)
#                 print(f"Found employee: {employee.user.get_full_name()}")
#             except Employee.DoesNotExist:
#                 return Response({
#                     'success': False,
#                     'error': 'Employee not found'
#                 }, status=status.HTTP_404_NOT_FOUND)
            
#             # Check if face is registered
#             if not employee.is_face_registered:
#                 return Response({
#                     'success': False,
#                     'error': 'Face not registered. Please register your face first.',
#                     'employee_id': employee_id,
#                     'is_face_registered': False
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Check if employee is in face service model
#             if employee_id not in face_service.label_map:
#                 return Response({
#                     'success': False,
#                     'error': 'Employee not found in face recognition model. Please re-register face.',
#                     'in_model': False
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Validate face image
#             print("Validating face image...")
#             if not face_service.is_valid_face_image(face_image):
#                 return Response({
#                     'success': False,
#                     'error': 'Invalid face image. Please provide a clear frontal face image.',
#                     'validation': 'failed'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Verify face using OpenCV LBPH
#             print("Verifying face with LBPH...")
#             is_verified, confidence_score = face_service.verify_face(employee_id, face_image)
            
#             print(f"Verification result: {is_verified}")
#             print(f"Confidence score: {confidence_score}")
            
#             # Check if we have recent attendance of same type (within 5 minutes)
#             five_minutes_ago = timezone.now() - timedelta(minutes=5)
#             recent_attendance = AttendanceRecord.objects.filter(
#                 employee=employee,
#                 attendance_type=attendance_type,
#                 timestamp__gte=five_minutes_ago
#             ).exists()
            
#             if recent_attendance:
#                 return Response({
#                     'success': False,
#                     'error': f'{attendance_type.replace("_", " ")} already recorded recently. Please wait 5 minutes.',
#                     'attendance_type': attendance_type,
#                     'time_limit': '5 minutes'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Create attendance record
#             attendance = AttendanceRecord.objects.create(
#                 employee=employee,
#                 attendance_type=attendance_type,
#                 latitude=latitude,
#                 longitude=longitude,
#                 is_verified=is_verified,
#                 confidence_score=confidence_score,
#                 face_image=face_image[:500] + "..." if len(face_image) > 500 else face_image
#             )
            
#             # Prepare response
#             response_data = {
#                 'success': True,
#                 'message': f'Attendance {attendance_type.replace("_", " ")} recorded successfully!',
#                 'attendance': {
#                     'id': attendance.id,
#                     'employee_id': employee_id,
#                     'employee_name': employee.user.get_full_name(),
#                     'attendance_type': attendance_type,
#                     'timestamp': attendance.timestamp.isoformat(),
#                     'is_verified': is_verified,
#                     'confidence_score': confidence_score,
#                     'verification_status': 'VERIFIED' if is_verified else 'FAILED',
#                     'latitude': latitude,
#                     'longitude': longitude
#                 },
#                 'verification_details': {
#                     'algorithm': 'OpenCV LBPH',
#                     'match_found': is_verified,
#                     'confidence': confidence_score,
#                     'threshold': 0.6,
#                     'verification_passed': is_verified,
#                     'employee_in_model': True,
#                     'face_label': face_service.label_map.get(employee_id)
#                 }
#             }
            
#             if not is_verified:
#                 response_data['warning'] = 'Attendance recorded but face verification failed'
#                 response_data['advice'] = 'Please ensure you are looking directly at the camera in good lighting'
            
#             print(f"✅ Attendance recorded for {employee_id}")
            
#             return Response(response_data)
            
#         except json.JSONDecodeError:
#             return Response({
#                 'success': False,
#                 'error': 'Invalid JSON data'
#             }, status=status.HTTP_400_BAD_REQUEST)
#         except Exception as e:
#             print(f"❌ Attendance error: {str(e)}")
#             import traceback
#             traceback.print_exc()
#             return Response({
#                 'success': False,
#                 'error': f'Server error: {str(e)}'
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class MarkAttendanceView(APIView):
    """Fixed attendance marking with actual face verification"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("=" * 60)
        print("=== MARK ATTENDANCE - DEBUGGING VERIFICATION ===")
        
        try:
            # Get data
            if hasattr(request, 'data') and request.data:
                data = request.data
            else:
                data = json.loads(request.body)
            
            employee_id = data.get('employee_id')
            face_image = data.get('face_image')
            attendance_type = data.get('attendance_type', 'CHECK_IN')
            
            print(f"Employee ID: {employee_id}")
            print(f"Attendance Type: {attendance_type}")
            
            # Get employee
            employee = Employee.objects.get(employee_id=employee_id)
            print(f"Employee: {employee.user.get_full_name()}")
            print(f"Face registered: {employee.is_face_registered}")
            print(f"Face label in DB: {employee.face_label}")
            
            # Check face service status
            print(f"\n=== FACE SERVICE STATUS ===")
            print(f"Employee in label_map: {employee_id in face_service.label_map}")
            if employee_id in face_service.label_map:
                label = face_service.label_map[employee_id]
                print(f"  Label: {label}")
                print(f"  Reverse lookup: {face_service.reverse_label_map.get(label, 'Not found')}")
            else:
                print(f"  ❌ Employee NOT in face service model!")
                print(f"  Label map contents: {face_service.label_map}")
            
            print(f"Total employees in model: {len(face_service.label_map)}")
            print(f"Total faces trained: {len(face_service.faces)}")
            
            # Check if we should skip verification (for testing)
            if face_image in ['test', 'skip', 'dummy']:
                print("\n⚠ Using test mode - skipping face verification")
                is_verified = True
                confidence_score = 0.95
                verification_reason = "Test mode"
            else:
                print("\n=== ATTEMPTING FACE VERIFICATION ===")
                
                # First, validate the image
                print("1. Validating face image...")
                is_valid = face_service.is_valid_face_image(face_image)
                print(f"   Image valid: {is_valid}")
                
                if not is_valid:
                    print("   ❌ Image validation failed")
                    is_verified = False
                    confidence_score = 0.0
                    verification_reason = "Invalid face image"
                else:
                    print("2. Verifying face...")
                    is_verified, confidence_score = face_service.verify_face(employee_id, face_image)
                    print(f"   Verified: {is_verified}")
                    print(f"   Confidence: {confidence_score}")
                    
                    if not is_verified:
                        verification_reason = f"Face mismatch (confidence: {confidence_score:.2f})"
                    else:
                        verification_reason = f"Verified (confidence: {confidence_score:.2f})"
            
            # Check for recent attendance
            from django.utils import timezone
            from datetime import timedelta
            
            five_minutes_ago = timezone.now() - timedelta(minutes=5)
            recent_attendance = AttendanceRecord.objects.filter(
                employee=employee,
                attendance_type=attendance_type,
                timestamp__gte=five_minutes_ago
            ).exists()
            
            if recent_attendance:
                print(f"\n⚠ {attendance_type} already recorded in last 5 minutes")
                # Still create record but note the duplicate
            
            # Create attendance record
            attendance = AttendanceRecord.objects.create(
                employee=employee,
                attendance_type=attendance_type,
                latitude=data.get('latitude'),
                longitude=data.get('longitude'),
                is_verified=is_verified,
                confidence_score=confidence_score,
                face_image=face_image[:500] + "..." if face_image and len(face_image) > 500 else face_image
            )
            
            # Prepare response
            response_data = {
                'success': True,
                'message': f'Attendance {attendance_type.replace("_", " ")} recorded!',
                'attendance': {
                    'id': attendance.id,
                    'employee_id': employee_id,
                    'employee_name': employee.user.get_full_name(),
                    'attendance_type': attendance_type,
                    'timestamp': attendance.timestamp.isoformat(),
                    'is_verified': is_verified,
                    'confidence_score': confidence_score,
                    'verification_status': 'VERIFIED' if is_verified else 'FAILED'
                },
                'verification_details': {
                    'passed': is_verified,
                    'confidence': confidence_score,
                    'reason': verification_reason,
                    'in_model': employee_id in face_service.label_map,
                    'face_label': face_service.label_map.get(employee_id),
                    'model_stats': {
                        'total_employees': len(face_service.label_map),
                        'total_faces': len(face_service.faces)
                    }
                }
            }
            
            if not is_verified:
                response_data['warning'] = 'Face verification failed'
                response_data['advice'] = 'Try re-registering your face or ensure good lighting'
            
            if recent_attendance:
                response_data['note'] = f'{attendance_type} was already recorded recently'
            
            print(f"\n✅ Response prepared")
            print(f"   Verified: {is_verified}")
            print(f"   Confidence: {confidence_score}")
            print("=" * 60)
            
            return Response(response_data)
            
        except Employee.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Employee {employee_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== ATTENDANCE HISTORY ====================

class AttendanceHistoryView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            data = request.data if hasattr(request, 'data') else json.loads(request.body)
            
            employee_id = data.get('employee_id')
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            
            if not employee_id:
                return Response({
                    'success': False,
                    'error': 'employee_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get employee
            try:
                employee = Employee.objects.get(employee_id=employee_id)
            except Employee.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Employee not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get attendance records
            records = AttendanceRecord.objects.filter(employee=employee)
            
            # Apply date filters if provided
            if start_date:
                try:
                    start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                    records = records.filter(timestamp__date__gte=start_datetime)
                except ValueError:
                    return Response({
                        'success': False,
                        'error': 'Invalid start_date format. Use YYYY-MM-DD'
                    })
            
            if end_date:
                try:
                    end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
                    records = records.filter(timestamp__date__lte=end_datetime)
                except ValueError:
                    return Response({
                        'success': False,
                        'error': 'Invalid end_date format. Use YYYY-MM-DD'
                    })
            
            records = records.order_by('-timestamp')
            
            serializer = AttendanceSerializer(records, many=True)
            
            # Calculate statistics
            total_records = records.count()
            verified_records = records.filter(is_verified=True).count()
            verification_rate = (verified_records / total_records * 100) if total_records > 0 else 0
            
            return Response({
                'success': True,
                'employee_id': employee_id,
                'employee_name': employee.user.get_full_name(),
                'total_records': total_records,
                'verified_records': verified_records,
                'verification_rate': round(verification_rate, 1),
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date
                },
                'attendance_history': serializer.data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

# ==================== EMPLOYEE PROFILE ====================

class EmployeeProfileView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, employee_id=None):
        if employee_id:
            try:
                employee = Employee.objects.get(employee_id=employee_id)
                serializer = EmployeeSerializer(employee)
                return Response({
                    'success': True,
                    **serializer.data
                })
            except Employee.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Employee not found'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # Try to get from query params
            employee_id = request.query_params.get('employee_id')
            if employee_id:
                try:
                    employee = Employee.objects.get(employee_id=employee_id)
                    serializer = EmployeeSerializer(employee)
                    return Response({
                        'success': True,
                        **serializer.data
                    })
                except Employee.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': 'Employee not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'success': False,
                'error': 'employee_id parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)

# ==================== ADMIN FUNCTIONS ====================

class ResetFaceDataView(APIView):
    """Reset face data for testing"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            employee_id = request.data.get('employee_id')
            
            if employee_id:
                # Reset specific employee
                employee = Employee.objects.get(employee_id=employee_id)
                employee.is_face_registered = False
                employee.face_label = None
                employee.face_encodings = None
                employee.save()
                
                # Remove from face service
                if employee_id in face_service.label_map:
                    label = face_service.label_map[employee_id]
                    del face_service.label_map[employee_id]
                    if label in face_service.reverse_label_map:
                        del face_service.reverse_label_map[label]
                
                # Save updated model
                face_service.save_model()
                
                return Response({
                    'success': True,
                    'message': f'Face data cleared for employee {employee_id}',
                    'employee_id': employee_id
                })
            else:
                # Reset all employees
                Employee.objects.all().update(
                    is_face_registered=False,
                    face_label=None,
                    face_encodings=None
                )
                
                # Clear face service
                face_service.label_map = {}
                face_service.reverse_label_map = {}
                face_service.faces = []
                face_service.labels = []
                face_service.face_recognizer = cv2.face.LBPHFaceRecognizer_create()
                face_service.save_model()
                
                return Response({
                    'success': True,
                    'message': 'All face data cleared'
                })
                
        except Employee.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Employee not found'
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            })

# ==================== HEALTH CHECK ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    try:
        # Check database
        db_status = 'connected'
        try:
            Employee.objects.exists()
        except:
            db_status = 'error'
        
        # Check face service
        face_service_status = 'active' if face_service.face_cascade is not None else 'inactive'
        
        # Count records
        user_count = User.objects.count()
        employee_count = Employee.objects.count()
        attendance_count = AttendanceRecord.objects.count()
        
        return Response({
            'success': True,
            'status': 'healthy',
            'service': 'Face Attendance System v2.0',
            'timestamp': timezone.now().isoformat(),
            'database': db_status,
            'face_service': face_service_status,
            'statistics': {
                'users': user_count,
                'employees': employee_count,
                'attendance_records': attendance_count,
                'face_registered': Employee.objects.filter(is_face_registered=True).count(),
                'model_employees': len(face_service.label_map)
            },
            'environment': {
                'debug': settings.DEBUG if hasattr(settings, 'DEBUG') else 'Unknown',
                'timezone': settings.TIME_ZONE if hasattr(settings, 'TIME_ZONE') else 'UTC'
            }
        })
    except Exception as e:
        return Response({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Import cv2 for ResetFaceDataView
try:
    import cv2
except ImportError:
    print("Warning: OpenCV not installed. Some features may not work.")

# Import settings
from django.conf import settings