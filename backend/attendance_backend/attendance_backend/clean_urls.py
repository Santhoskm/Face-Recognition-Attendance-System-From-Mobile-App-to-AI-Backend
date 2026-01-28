# attendance_backend/clean_urls.py
from django.contrib import admin
from django.urls import path
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK - Server is working")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check),
]