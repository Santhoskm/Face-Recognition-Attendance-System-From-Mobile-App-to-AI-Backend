# Face Recognition Attendance System 👨‍💼📱

A modern, secure attendance management system using facial recognition technology built with React Native and Django.

## 🎯 Features

### Frontend (React Native Mobile App)
- ✅ Face registration with camera
- ✅ Face-based attendance marking
- ✅ Real-time verification
- ✅ Attendance history tracking
- ✅ Employee profile management
- ✅ Dashboard with analytics
- ✅ Location tracking (optional)

### Backend (Django REST API)
- ✅ Face recognition using OpenCV
- ✅ JWT authentication
- ✅ RESTful API endpoints
- ✅ PostgreSQL database
- ✅ Admin dashboard
- ✅ Real-time face matching

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ & npm
- Python 3.8+
- PostgreSQL
- Expo CLI

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/face-attendance-system.git
cd face-attendance-system

cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver


cd frontend
npm install
npm start