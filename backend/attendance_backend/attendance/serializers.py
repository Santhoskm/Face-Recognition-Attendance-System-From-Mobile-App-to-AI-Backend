# attendance/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Employee, AttendanceRecord
from django.contrib.auth import authenticate

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Employee
        fields = ['id', 'user', 'employee_id', 'department', 
                 'phone_number', 'is_face_registered', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    employee_id = serializers.CharField(required=True)
    department = serializers.CharField(required=False)
    phone_number = serializers.CharField(required=False)
    
    def create(self, validated_data):
        user_data = {
            'username': validated_data['username'],
            'password': validated_data['password'],
            'email': validated_data.get('email', ''),
            'first_name': validated_data['first_name'],
            'last_name': validated_data['last_name']
        }
        
        user = User.objects.create_user(**user_data)
        
        employee = Employee.objects.create(
            user=user,
            employee_id=validated_data['employee_id'],
            department=validated_data.get('department', ''),
            phone_number=validated_data.get('phone_number', '')
        )
        
        return employee

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid credentials")

class FaceRegistrationSerializer(serializers.Serializer):
    employee_id = serializers.CharField(required=True)
    face_images = serializers.ListField(
        child=serializers.CharField(),
        min_length=3,
        max_length=10,
        required=True
    )

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'employee', 'employee_name', 'employee_id',
                 'attendance_type', 'timestamp', 'latitude', 'longitude',
                 'is_verified', 'confidence_score', 'face_image']
        read_only_fields = ['id', 'timestamp', 'is_verified', 'confidence_score']

class MarkAttendanceSerializer(serializers.Serializer):
    employee_id = serializers.CharField(required=True)
    face_image = serializers.CharField(required=True)
    attendance_type = serializers.ChoiceField(
        choices=['CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END'],
        required=True
    )
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)

class AttendanceHistorySerializer(serializers.Serializer):
    employee_id = serializers.CharField(required=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)