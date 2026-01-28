// src/services/connection.ts (NEW FILE - RECOMMENDED)
import { Platform } from 'react-native';
import axios from 'axios';

export const testBackendConnection = async () => {
    const baseURL = 'http://192.168.29.157:8000/api';

    console.log('🔍 Testing backend connection...');
    console.log('Platform:', Platform.OS);
    console.log('Base URL:', baseURL);

    try {
        // Test 1: Simple health endpoint
        const healthResponse = await axios.get(`${baseURL}/health/`, { timeout: 5000 });

        // Test 2: Try a HEAD request to check server
        const serverResponse = await axios.head(`http://192.168.29.157:8000/`, { timeout: 5000 });

        return {
            success: true,
            message: '✅ Connection successful',
            details: {
                health: healthResponse.data,
                server: 'Django server is running',
                ip: '192.168.29.157:8000',
                platform: Platform.OS
            }
        };
    } catch (error: any) {
        console.error('Connection test failed:', error);

        // Determine specific error
        let errorMessage = 'Unknown error';

        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused. Is Django server running?';
        } else if (error.code === 'ENETUNREACH') {
            errorMessage = 'Network unreachable. Check WiFi/network.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout. Server not responding.';
        } else if (error.response) {
            errorMessage = `Server error: ${error.response.status}`;
        } else if (error.request) {
            errorMessage = 'No response from server';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            message: '❌ Connection failed',
            error: errorMessage,
            details: {
                platform: Platform.OS,
                url: baseURL,
                code: error.code
            }
        };
    }
};

// Utility to get network info
export const getNetworkInfo = () => {
    return {
        platform: Platform.OS,
        baseURL: 'http://192.168.29.157:8000/api',
        timestamp: new Date().toISOString(),
        // You can add more info like device IP, network type, etc.
    };
};