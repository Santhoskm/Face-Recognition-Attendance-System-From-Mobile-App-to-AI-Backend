// src/screens/ProfileScreen.tsx - UPDATED WITH REAL DATA
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    Switch,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';

type RootStackParamList = {
    Profile: undefined;
    Dashboard: undefined;
    Login: undefined;
    FaceRegistration: undefined;
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
    navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
    const [user, setUser] = useState<any>(null);
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState({
        attendanceReminders: true,
        faceVerificationAlerts: true,
        monthlyReports: false,
        systemUpdates: true,
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        email: '',
        phone: '',
        department: '',
    });

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            setLoading(true);
            const userData = await AsyncStorage.getItem('user_data');
            const employeeData = await AsyncStorage.getItem('employee_data');

            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                setEditData({
                    name: `${parsedUser.first_name || ''} ${parsedUser.last_name || ''}`.trim(),
                    email: parsedUser.email || '',
                    phone: parsedUser.phone_number || '',
                    department: '',
                });
            }

            if (employeeData) {
                const parsedEmployee = JSON.parse(employeeData);
                setEmployee(parsedEmployee);
                setEditData(prev => ({
                    ...prev,
                    department: parsedEmployee.department || '',
                }));
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
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

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant camera roll permissions');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                // Here you would typically upload the image to your server
                // For now, we'll just update local state
                Alert.alert('Success', 'Profile picture updated locally');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to select image');
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // Here you would typically make an API call to update user data
            // For now, we'll just update local storage
            if (user) {
                const [firstName, ...lastNameParts] = editData.name.split(' ');
                const updatedUser = {
                    ...user,
                    first_name: firstName || '',
                    last_name: lastNameParts.join(' ') || '',
                    email: editData.email,
                    phone_number: editData.phone,
                };

                await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }

            if (employee) {
                const updatedEmployee = {
                    ...employee,
                    department: editData.department,
                };
                await AsyncStorage.setItem('employee_data', JSON.stringify(updatedEmployee));
                setEmployee(updatedEmployee);
            }

            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (user && employee) {
            setEditData({
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                email: user.email || '',
                phone: user.phone_number || '',
                department: employee.department || '',
            });
        }
        setIsEditing(false);
    };

    const renderInfoItem = (label: string, value: string, icon: string, editable = false) => (
        <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
                <Text style={styles.infoIconText}>{icon}</Text>
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                {isEditing && editable ? (
                    <TextInput
                        style={styles.editInput}
                        value={editData[label.toLowerCase() as keyof typeof editData]}
                        onChangeText={(text) => setEditData(prev => ({ ...prev, [label.toLowerCase()]: text }))}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        placeholderTextColor="#999"
                    />
                ) : (
                    <Text style={styles.infoValue}>{value || 'Not set'}</Text>
                )}
            </View>
        </View>
    );

    const renderToggleItem = (label: string, value: boolean, icon: string, onToggle: (value: boolean) => void) => (
        <View style={styles.toggleItem}>
            <View style={styles.toggleIcon}>
                <Text style={styles.toggleIconText}>{icon}</Text>
            </View>
            <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#E0E0E0', true: '#34C759' }}
                thumbColor="#fff"
            />
        </View>
    );

    if (loading && !user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (!user || !employee) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>No user data found</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const joinDate = employee.created_at ? moment(employee.created_at).format('MMM D, YYYY') : 'N/A';

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#007AFF', '#5856D6']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>My Profile</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setIsEditing(!isEditing)}
                    >
                        <Text style={styles.editButtonText}>
                            {isEditing ? 'Cancel' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.profileHeader}>
                    <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
                        <View style={styles.profileImagePlaceholder}>
                            <Text style={styles.profileImageText}>
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </Text>
                        </View>
                        <View style={styles.cameraBadge}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.profileName}>{fullName || 'User'}</Text>
                    <Text style={styles.profileRole}>{employee.department || 'Employee'}</Text>

                    <View style={styles.profileStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{employee.employee_id || 'N/A'}</Text>
                            <Text style={styles.statLabel}>ID</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{joinDate}</Text>
                            <Text style={styles.statLabel}>Joined</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, styles.verified]}>
                                {employee.is_face_registered ? '✅' : '❌'}
                            </Text>
                            <Text style={styles.statLabel}>Face</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.sectionCard}>
                        {renderInfoItem('Name', fullName, '👤', true)}
                        {renderInfoItem('Email', user.email || '', '📧', true)}
                        {renderInfoItem('Phone', user.phone_number || '', '📱', true)}
                        {renderInfoItem('Employee ID', employee.employee_id || '', '🆔')}
                        {renderInfoItem('Department', employee.department || '', '🏢', true)}
                        {renderInfoItem('Join Date', joinDate, '📅')}
                    </View>
                </View>

                {/* Face Registration Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Face Recognition</Text>
                    <View style={styles.sectionCard}>
                        <View style={styles.faceStatus}>
                            <View style={styles.faceStatusIcon}>
                                <Ionicons
                                    name={employee.is_face_registered ? "checkmark-circle" : "alert-circle"}
                                    size={28}
                                    color={employee.is_face_registered ? "#34C759" : "#FF9500"}
                                />
                            </View>
                            <View style={styles.faceStatusContent}>
                                <Text style={styles.faceStatusTitle}>
                                    {employee.is_face_registered ? 'Face Registered' : 'Face Not Registered'}
                                </Text>
                                <Text style={styles.faceStatusSubtitle}>
                                    {employee.is_face_registered
                                        ? 'Your face is successfully registered for attendance'
                                        : 'Register your face to use facial recognition'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.faceActionButton}
                            onPress={() => navigation.navigate('FaceRegistration')}
                        >
                            <Ionicons
                                name={employee.is_face_registered ? "refresh" : "person-add"}
                                size={20}
                                color="#fff"
                            />
                            <Text style={styles.faceActionButtonText}>
                                {employee.is_face_registered ? 'Re-register Face' : 'Register Face'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.sectionCard}>
                        {renderToggleItem(
                            'Attendance Reminders',
                            notifications.attendanceReminders,
                            '⏰',
                            (value) => setNotifications(prev => ({ ...prev, attendanceReminders: value }))
                        )}
                        {renderToggleItem(
                            'Face Verification Alerts',
                            notifications.faceVerificationAlerts,
                            '👁️',
                            (value) => setNotifications(prev => ({ ...prev, faceVerificationAlerts: value }))
                        )}
                        {renderToggleItem(
                            'Monthly Reports',
                            notifications.monthlyReports,
                            '📊',
                            (value) => setNotifications(prev => ({ ...prev, monthlyReports: value }))
                        )}
                        {renderToggleItem(
                            'System Updates',
                            notifications.systemUpdates,
                            '🔄',
                            (value) => setNotifications(prev => ({ ...prev, systemUpdates: value }))
                        )}
                    </View>
                </View>

                {/* Account Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.sectionCard}>
                        <TouchableOpacity style={styles.accountButton}>
                            <Ionicons name="lock-closed" size={20} color="#007AFF" />
                            <Text style={styles.accountButtonText}>Change Password</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.accountButton}>
                            <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
                            <Text style={styles.accountButtonText}>Privacy Policy</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.accountButton}>
                            <Ionicons name="document-text" size={20} color="#007AFF" />
                            <Text style={styles.accountButtonText}>Terms of Service</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.accountButton}>
                            <Ionicons name="help-circle" size={20} color="#007AFF" />
                            <Text style={styles.accountButtonText}>Help & Support</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Save/Cancel Buttons when editing */}
                {isEditing && (
                    <View style={styles.editActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
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
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    headerGradient: {
        paddingTop: 10,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    editButton: {
        padding: 10,
    },
    editButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    profileHeader: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    profileImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    profileImageText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#007AFF',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    profileRole: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 20,
    },
    profileStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 15,
        padding: 15,
        width: '100%',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 5,
    },
    verified: {
        fontSize: 18,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    content: {
        flex: 1,
        padding: 20,
        marginTop: -20,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        backgroundColor: '#fff',
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 15,
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoIconText: {
        fontSize: 20,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    editInput: {
        fontSize: 16,
        color: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#007AFF',
        paddingVertical: 4,
    },
    faceStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    faceStatusIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f0f9ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    faceStatusContent: {
        flex: 1,
    },
    faceStatusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    faceStatusSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    faceActionButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    faceActionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    toggleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    toggleIconText: {
        fontSize: 20,
    },
    toggleContent: {
        flex: 1,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    accountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    accountButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 15,
    },
    editActions: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#34C759',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    versionText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginBottom: 20,
    },
});

export default ProfileScreen;