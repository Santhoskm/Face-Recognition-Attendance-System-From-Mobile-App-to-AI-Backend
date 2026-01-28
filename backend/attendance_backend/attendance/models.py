# attendance/models.py
from django.db import models
from django.contrib.auth.models import User
import json
import numpy as np

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    employee_id = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    # Store face encodings as JSON
    face_encodings = models.TextField(blank=True, null=True)
    is_face_registered = models.BooleanField(default=False)
    
    # For LBPH training
    face_label = models.IntegerField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def set_face_encodings(self, encodings_list):
        """Store multiple face encodings as JSON"""
        self.face_encodings = json.dumps(encodings_list)
    
    def get_face_encodings(self):
        """Retrieve face encodings from JSON string"""
        if self.face_encodings:
            return json.loads(self.face_encodings)
        return []
    
    def add_face_encoding(self, encoding):
        """Add a new face encoding"""
        encodings = self.get_face_encodings()
        encodings.append(encoding)
        self.set_face_encodings(encodings)
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"

class AttendanceRecord(models.Model):
    ATTENDANCE_CHOICES = [
        ('CHECK_IN', 'Check In'),
        ('CHECK_OUT', 'Check Out'),
        ('BREAK_START', 'Break Start'),
        ('BREAK_END', 'Break End'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    attendance_type = models.CharField(max_length=20, choices=ATTENDANCE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Location data
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # Face verification results
    is_verified = models.BooleanField(default=False)
    confidence_score = models.FloatField(null=True, blank=True)
    
    # Store captured face image (base64 or file path)
    face_image = models.TextField(blank=True, null=True)  # Store as base64
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['employee', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.employee.employee_id} - {self.attendance_type} at {self.timestamp}"

# class FaceRecognitionModel(models.Model):
#     """Store trained LBPH model"""
#     model_name = models.CharField(max_length=100, default='LBPH')
#     model_data = models.BinaryField()  # Store trained model
#     labels = models.TextField()  # Store label mapping as JSON
#     trained_at = models.DateTimeField(auto_now_add=True)
#     accuracy = models.FloatField(null=True, blank=True)
    
#     def set_labels(self, labels_dict):
#         """Store label mapping as JSON"""
#         self.labels = json.dumps(labels_dict)
    
#     def get_labels(self):
#         """Retrieve label mapping from JSON"""
#         if self.labels:
#             return json.loads(self.labels)
#         return {}
    
#     def __str__(self):
#         return f"{self.model_name} trained at {self.trained_at}"

# Create your models here.
