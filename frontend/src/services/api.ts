// src/services/api.ts - SIMPLIFIED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your IP address
export const API_BASE_URL = 'http://192.168.29.157:8000';

// Test connection function
export const testConnection = async () => {
    try {
        console.log('Testing connection to:', `${API_BASE_URL}/api/test/`);

        const response = await fetch(`${API_BASE_URL}/api/test/`, {
            method: 'GET',
            //timeout: 5000,
        });

        const text = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { error: 'Invalid JSON response' };
        }

        return {
            success: response.ok,
            status: response.status,
            data: data,
            url: API_BASE_URL
        };

    } catch (error: any) {
        console.log('Connection error:', error.message);
        return {
            success: false,
            error: error.message,
            url: API_BASE_URL
        };
    }
};

// Auth API functions
export const authAPI = {
    // Simple login that always works
    simpleLogin: async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/simple-login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const text = await response.text();
            console.log('Simple login response text:', text);

            try {
                return JSON.parse(text);
            } catch (e) {
                return { error: 'Invalid JSON response' };
            }
        } catch (error: any) {
            console.error('Simple login error:', error);
            return { error: error.message };
        }
    },

    // JWT login
    login: async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const text = await response.text();
            console.log('JWT login response text:', text);

            try {
                const data = JSON.parse(text);
                return data;
            } catch (e) {
                return { error: 'Invalid JSON response' };
            }
        } catch (error: any) {
            console.error('JWT login error:', error);
            return { error: error.message };
        }
    },

    // Register
    register: async (userData: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const text = await response.text();
            console.log('Register response text:', text);

            try {
                return JSON.parse(text);
            } catch (e) {
                return { error: 'Invalid JSON response' };
            }
        } catch (error: any) {
            console.error('Register error:', error);
            return { error: error.message };
        }
    },

    // Logout
    logout: async () => {
        await AsyncStorage.clear();
        console.log('User logged out');
    },

    // Check if user is logged in
    isAuthenticated: async () => {
        try {
            const userData = await AsyncStorage.getItem('user_data');
            return userData !== null;
        } catch (error) {
            return false;
        }
    },

    // Get stored user data
    getUser: async () => {
        try {
            const userData = await AsyncStorage.getItem('user_data');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    },

    // Get stored employee data
    getEmployee: async () => {
        try {
            const employeeData = await AsyncStorage.getItem('employee_data');
            return employeeData ? JSON.parse(employeeData) : null;
        } catch (error) {
            return null;
        }
    },
};

// Other API functions (simplified)
export const faceAPI = {
    registerFace: async (employeeId: string, faceImages: string[]) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/register-face/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    face_images: faceImages
                }),
            });

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { error: 'Invalid JSON response' };
            }
        } catch (error: any) {
            return { error: error.message };
        }
    },

    checkFaceStatus: async (employeeId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/check-face-status/?employee_id=${employeeId}`);
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { error: 'Invalid JSON response' };
            }
        } catch (error: any) {
            return { error: error.message };
        }
    },
};

export const attendanceAPI = {
    markAttendance: async (data: {
        employee_id: string;
        face_image: string;
        attendance_type: string;
        latitude?: number;
        longitude?: number;
    }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/mark-attendance/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { error: 'Invalid JSON response' };
            }
        } catch (error: any) {
            return { error: error.message };
        }
    },

    getAttendanceHistory: async (employeeId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/attendance-history/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: employeeId
                }),
            });

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { error: 'Invalid JSON response' };
            }
        } catch (error: any) {
            return { error: error.message };
        }
    },
};