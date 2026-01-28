// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FaceRegistrationScreen from '../screens/FaceRegistrationScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FaceCamera from '../components/FaceCamera';
import FaceCameraScreen from '../screens/FaceCameraScreen';

// Define navigation types
export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    FaceRegistration: undefined;
    FaceCamera: {
        title?: string;
        instruction?: string;
        onCapture: (base64Image: string) => void;
        mode?: 'camera' | 'gallery';
    };
    MainTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Tab Navigator
const MainTabs = () => (
    <Tab.Navigator
        screenOptions={{
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarStyle: {
                backgroundColor: '#fff',
                borderTopColor: '#E5E5EA',
                paddingBottom: 5,
                paddingTop: 5,
                height: 60,
            },
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500',
            },
            headerShown: false,
        }}
    >
        <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
                tabBarIcon: ({ color, size }) => (
                    <Text style={{ fontSize: size, color }}>🏠</Text>
                ),
            }}
        />
        <Tab.Screen
            name="History"
            component={AttendanceHistoryScreen}
            options={{
                tabBarIcon: ({ color, size }) => (
                    <Text style={{ fontSize: size, color }}>📊</Text>
                ),
            }}
        />
        <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
                tabBarIcon: ({ color, size }) => (
                    <Text style={{ fontSize: size, color }}>👤</Text>
                ),
            }}
        />
    </Tab.Navigator>
);

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#007AFF',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerShadowVisible: false,
                }}
            >
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{
                        title: 'Create Account',
                        headerShown: true
                    }}
                />
                <Stack.Screen
                    name="FaceRegistration"
                    component={FaceRegistrationScreen}
                    options={{
                        title: 'Face Registration',
                        headerShown: true
                    }}
                />
                <Stack.Screen
                    name="FaceCamera"
                    component={FaceCameraScreen}
                    options={({ route }) => ({
                        title: route.params?.title || 'Face Camera',
                        headerShown: true
                    })}
                />
                <Stack.Screen
                    name="MainTabs"
                    component={MainTabs}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;