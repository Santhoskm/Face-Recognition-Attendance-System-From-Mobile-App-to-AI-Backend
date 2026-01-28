# attendance/admin.py - UPDATED
from django.contrib import admin
from .models import Employee, AttendanceRecord

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'user', 'department', 'is_face_registered', 'face_label', 'created_at']
    list_filter = ['is_face_registered', 'department']
    search_fields = ['employee_id', 'user__username', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'employee_id', 'department', 'phone_number')
        }),
        ('Face Recognition', {
            'fields': ('is_face_registered', 'face_label', 'face_encodings')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['employee', 'attendance_type', 'timestamp', 'is_verified', 'confidence_score']
    list_filter = ['attendance_type', 'is_verified', 'timestamp']
    search_fields = ['employee__employee_id', 'employee__user__username']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('employee', 'employee__user')
        return queryset
