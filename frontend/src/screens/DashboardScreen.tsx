// src/screens/DashboardScreen.tsx - REDESIGNED
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import moment from 'moment';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_BASE_URL } from '../services/api';

const DashboardScreen = ({ navigation }: any) => {
    const [user, setUser] = useState<any>(null);
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [attendanceType, setAttendanceType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const [todayStats, setTodayStats] = useState({
        checkIns: 0,
        checkOuts: 0,
        verified: 0,
        total: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            loadDashboardData();
        }
    }, [isFocused]);

    const loadDashboardData = async () => {
        try {
            setRefreshing(true);
            console.log('Loading dashboard data...');

            const userData = await AsyncStorage.getItem('user_data');
            const employeeData = await AsyncStorage.getItem('employee_data');

            if (userData) setUser(JSON.parse(userData));
            if (employeeData) {
                const parsedEmployee = JSON.parse(employeeData);
                setEmployee(parsedEmployee);
            }

            await requestLocationPermission();
            await loadRecentAttendance();

        } catch (error) {
            console.error('Dashboard init error:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            }
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const loadRecentAttendance = async () => {
        if (!employee) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/attendance-history/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: employee.employee_id }),
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { error: 'Invalid JSON response' };
            }

            if (response.ok && data.success) {
                const history = data.attendance_history || [];
                setRecentAttendance(history.slice(0, 5));

                const today = moment().format('YYYY-MM-DD');
                const todayRecords = history.filter((record: any) => {
                    if (!record.timestamp) return false;
                    try {
                        return moment(record.timestamp).format('YYYY-MM-DD') === today;
                    } catch (e) {
                        return false;
                    }
                });

                setTodayStats({
                    checkIns: todayRecords.filter((r: any) => r.attendance_type === 'CHECK_IN').length,
                    checkOuts: todayRecords.filter((r: any) => r.attendance_type === 'CHECK_OUT').length,
                    verified: todayRecords.filter((r: any) => r.is_verified).length,
                    total: todayRecords.length,
                });
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
        }
    };

    const handleFaceCapture = async (base64Image: string) => {
        if (!employee) {
            Alert.alert('Error', 'Employee data not found');
            return;
        }

        if (!employee.is_face_registered) {
            Alert.alert(
                'Face Not Registered',
                'Please register your face first before marking attendance.',
                [
                    { text: 'Register Now', onPress: () => navigation.navigate('FaceRegistration') },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        setVerifying(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/mark-attendance/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: employee.employee_id,
                    face_image: base64Image,
                    attendance_type: attendanceType,
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                }),
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { error: 'Invalid JSON response' };
            }

            if (response.ok && data.success) {
                Alert.alert(
                    'Success! ✅',
                    data.message || `Attendance ${attendanceType.toLowerCase().replace('_', ' ')} recorded!`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setAttendanceType(attendanceType === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN');
                                loadRecentAttendance();
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Verification Failed', data.error || 'Face verification failed');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Network error');
        } finally {
            setVerifying(false);
        }
    };

    const handleSimpleAttendance = async () => {
        if (!employee) {
            Alert.alert('Error', 'Employee data not found');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/mark-attendance/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: employee.employee_id,
                    attendance_type: attendanceType,
                    face_image: 'data:image/jpg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
                }),
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { error: 'Invalid JSON response' };
            }

            if (response.ok && data.success) {
                Alert.alert(
                    'Success! ✅',
                    `Attendance ${attendanceType.toLowerCase().replace('_', ' ')} recorded!`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setAttendanceType(attendanceType === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN');
                                loadRecentAttendance();
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Error', data.error || 'Failed to record attendance');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        navigation.replace('Login');
                    },
                },
            ]
        );
    };

    if (!user || !employee) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    const StatCard = ({ title, value, color, icon }: any) => (
        <View style={[styles.statCard, { backgroundColor: color + '10', borderLeftColor: color }]}>
            <Text style={[styles.statIcon, { color }]}>{icon}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{title}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#007AFF', '#0056CC']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.welcomeText}>Welcome back</Text>
                            <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
                            <Text style={styles.employeeId}>{employee.employee_id}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.faceStatusCard}>
                    <View style={styles.faceStatusContent}>
                        <Ionicons
                            name={employee.is_face_registered ? "checkmark-circle" : "alert-circle"}
                            size={28}
                            color={employee.is_face_registered ? "#34C759" : "#FF9500"}
                        />
                        <View style={styles.faceStatusText}>
                            <Text style={styles.faceStatusTitle}>
                                {employee.is_face_registered ? 'Face Registered' : 'Face Not Registered'}
                            </Text>
                            <Text style={styles.faceStatusSubtitle}>
                                {employee.is_face_registered
                                    ? 'You can use face recognition for attendance'
                                    : 'Register your face to enable facial recognition'}
                            </Text>
                        </View>
                    </View>
                    {!employee.is_face_registered && (
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => navigation.navigate('FaceRegistration')}
                        >
                            <Text style={styles.registerButtonText}>Register Now</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadDashboardData}
                        colors={['#007AFF']}
                    />
                }
            >
                {/* Attendance Action */}
                <View style={styles.attendanceCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Record Attendance</Text>
                        <Text style={styles.currentTime}>{moment().format('h:mm A')}</Text>
                    </View>

                    <View style={styles.typeSelector}>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                attendanceType === 'CHECK_IN' && styles.typeButtonActive,
                            ]}
                            onPress={() => setAttendanceType('CHECK_IN')}
                        >
                            <Ionicons
                                name="enter-outline"
                                size={24}
                                color={attendanceType === 'CHECK_IN' ? '#fff' : '#8E8E93'}
                            />
                            <Text style={[
                                styles.typeButtonText,
                                attendanceType === 'CHECK_IN' && styles.typeButtonTextActive,
                            ]}>
                                Check In
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                attendanceType === 'CHECK_OUT' && styles.typeButtonActive,
                            ]}
                            onPress={() => setAttendanceType('CHECK_OUT')}
                        >
                            <Ionicons
                                name="exit-outline"
                                size={24}
                                color={attendanceType === 'CHECK_OUT' ? '#fff' : '#8E8E93'}
                            />
                            <Text style={[
                                styles.typeButtonText,
                                attendanceType === 'CHECK_OUT' && styles.typeButtonButtonTextActive,
                            ]}>
                                Check Out
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.recordButton, !employee.is_face_registered && styles.recordButtonDisabled]}
                        onPress={() => navigation.navigate('FaceCamera', {
                            onCapture: handleFaceCapture,
                            title: `Face ${attendanceType.replace('_', ' ')}`,
                            instruction: 'Position your face in the frame',
                        })}
                        disabled={verifying || !employee.is_face_registered}
                    >
                        {verifying ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="camera" size={24} color="#fff" />
                                <Text style={styles.recordButtonText}>
                                    {attendanceType.replace('_', ' ')} with Face Recognition
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {location && (
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={16} color="#8E8E93" />
                            <Text style={styles.locationText}>
                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Today's Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Today's Overview</Text>
                    <View style={styles.statsGrid}>
                        <StatCard title="Check-ins" value={todayStats.checkIns} color="#34C759" icon="📥" />
                        <StatCard title="Check-outs" value={todayStats.checkOuts} color="#FF9500" icon="📤" />
                        <StatCard title="Verified" value={todayStats.verified} color="#007AFF" icon="✅" />
                        <StatCard title="Total" value={todayStats.total} color="#5856D6" icon="📊" />
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.recentCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('History')}>
                            <Text style={styles.viewAllText}>View All →</Text>
                        </TouchableOpacity>
                    </View>

                    {recentAttendance.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="time-outline" size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No attendance records yet</Text>
                            <Text style={styles.emptySubtext}>Record your first attendance above</Text>
                        </View>
                    ) : (
                        recentAttendance.map((record, index) => (
                            <View key={index} style={styles.attendanceItem}>
                                <View style={styles.attendanceIcon}>
                                    <Ionicons
                                        name={record.attendance_type === 'CHECK_IN' ? "enter-outline" : "exit-outline"}
                                        size={20}
                                        color={record.is_verified ? "#34C759" : "#FF3B30"}
                                    />
                                </View>
                                <View style={styles.attendanceDetails}>
                                    <Text style={styles.attendanceType}>
                                        {record.attendance_type?.replace('_', ' ') || 'Attendance'}
                                    </Text>
                                    <Text style={styles.attendanceTime}>
                                        {moment(record.timestamp).format('h:mm A')}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    record.is_verified ? styles.verifiedBadge : styles.failedBadge
                                ]}>
                                    <Text style={styles.statusText}>
                                        {record.is_verified ? 'Verified' : 'Failed'}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsCard}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#007AFF20' }]}>
                                <Ionicons name="person-outline" size={24} color="#007AFF" />
                            </View>
                            <Text style={styles.actionText}>Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('History')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#34C75920' }]}>
                                <Ionicons name="list-outline" size={24} color="#34C759" />
                            </View>
                            <Text style={styles.actionText}>History</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('FaceRegistration')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#5856D620' }]}>
                                <Ionicons name="camera-outline" size={24} color="#5856D6" />
                            </View>
                            <Text style={styles.actionText}>Face</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={loadDashboardData}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#FF950020' }]}>
                                <Ionicons name="refresh-outline" size={24} color="#FF9500" />
                            </View>
                            <Text style={styles.actionText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
    },
    headerGradient: {
        paddingTop: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    userDetails: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    userName: {
        fontSize: 22,
        fontWeight: '600',
        color: '#fff',
        marginTop: 2,
    },
    employeeId: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 2,
    },
    logoutButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceStatusCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    faceStatusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    faceStatusText: {
        marginLeft: 12,
        flex: 1,
    },
    faceStatusTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
    },
    faceStatusSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    registerButton: {
        backgroundColor: '#FF9500',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    attendanceCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    currentTime: {
        fontSize: 16,
        fontWeight: '500',
        color: '#8E8E93',
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderWidth: 2,
        borderColor: '#E5E5EA',
        borderRadius: 12,
        gap: 8,
    },
    typeButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    typeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8E8E93',
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    typeButtonButtonTextActive: {
        color: '#fff',
    },
    recordButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 12,
        gap: 12,
        marginBottom: 16,
    },
    recordButtonDisabled: {
        backgroundColor: '#C7C7CC',
    },
    recordButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    locationText: {
        fontSize: 14,
        color: '#8E8E93',
    },
    statsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#8E8E93',
    },
    recentCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 12,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#C7C7CC',
        textAlign: 'center',
    },
    attendanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    attendanceIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    attendanceDetails: {
        flex: 1,
    },
    attendanceType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 2,
    },
    attendanceTime: {
        fontSize: 14,
        color: '#8E8E93',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    verifiedBadge: {
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
    },
    failedBadge: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    actionsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        alignItems: 'center',
        flex: 1,
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 14,
        color: '#8E8E93',
    },
});

export default DashboardScreen;