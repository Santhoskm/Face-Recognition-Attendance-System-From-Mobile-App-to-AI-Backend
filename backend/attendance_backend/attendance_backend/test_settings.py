# test_settings.py
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
    print("✓ Django setup successful")
    
    # Test imports
    from django.urls import get_resolver
    resolver = get_resolver()
    print("✓ URL resolver created")
    
    # Try to get URL patterns
    try:
        patterns = resolver.url_patterns
        print(f"✓ URL patterns loaded: {len(patterns)} patterns")
    except Exception as e:
        print(f"✗ Error loading URL patterns: {e}")
        
except Exception as e:
    print(f"✗ Setup failed: {e}")
    import traceback
    traceback.print_exc()