// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
    // Auth tokens
    setTokens: async (access: string, refresh: string) => {
        await AsyncStorage.setItem('access_token', access);
        await AsyncStorage.setItem('refresh_token', refresh);
    },

    getTokens: async () => {
        const access = await AsyncStorage.getItem('access_token');
        const refresh = await AsyncStorage.getItem('refresh_token');
        return { access, refresh };
    },

    clearTokens: async () => {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
    },

    // User data
    setUserData: async (user: any) => {
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
    },

    getUserData: async () => {
        const data = await AsyncStorage.getItem('user_data');
        return data ? JSON.parse(data) : null;
    },

    // Employee data
    setEmployeeData: async (employee: any) => {
        await AsyncStorage.setItem('employee_data', JSON.stringify(employee));
    },

    getEmployeeData: async () => {
        const data = await AsyncStorage.getItem('employee_data');
        return data ? JSON.parse(data) : null;
    },

    // Clear all data
    clearAll: async () => {
        await AsyncStorage.clear();
    },

    // Check if user is logged in
    isLoggedIn: async () => {
        const token = await AsyncStorage.getItem('access_token');
        return !!token;
    },
};
