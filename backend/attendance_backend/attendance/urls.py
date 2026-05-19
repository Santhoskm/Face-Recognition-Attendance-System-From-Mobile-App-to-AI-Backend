# attendance/urls.py - UPDATED
from django.urls import path
from . import views

urlpatterns = [
    # ========== TEST ENDPOINTS ==========
    path('test/', views.test_endpoint, name='test'),
    path('debug/', views.debug_request, name='debug'),
    path('test-face-service/', views.TestFaceServiceView.as_view(), name='test-face-service'),
    
    # ========== AUTHENTICATION ==========
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('simple-login/', views.SimpleLoginView.as_view(), name='simple-login'),
    
    # ========== FACE OPERATIONS ==========
    path('register-face/', views.FaceRegistrationView.as_view(), name='register-face'),
    path('check-face-status/', views.CheckFaceStatusView.as_view(), name='check-face-status'),
    
    # ========== ATTENDANCE ==========
    path('mark-attendance/', views.MarkAttendanceView.as_view(), name='mark-attendance'),
    path('attendance-history/', views.AttendanceHistoryView.as_view(), name='attendance-history'),
    
    # ========== PROFILE ==========
    path('profile/', views.EmployeeProfileView.as_view(), name='profile'),
    path('profile/<str:employee_id>/', views.EmployeeProfileView.as_view(), name='profile-detail'),
    
    # ========== HEALTH CHECK ==========
    path('health/', views.health_check, name='health-check'),
]