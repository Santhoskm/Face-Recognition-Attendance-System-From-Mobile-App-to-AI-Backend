// src/screens/FaceRegistrationScreen.tsx - REDESIGNED
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const FaceRegistrationScreen = ({ navigation, route }: any) => {
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [employee, setEmployee] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(1);

    const API_BASE_URL = 'http://192.168.29.157:8000';

    useEffect(() => {
        const initialize = async () => {
            const employeeData = await AsyncStorage.getItem('employee_data');
            if (employeeData) {
                setEmployee(JSON.parse(employeeData));
            }
        };
        initialize();
    }, []);

    const openCamera = () => {
        navigation.navigate('FaceCamera', {
            title: 'Face Registration',
            instruction: 'Take clear photos of your face from different angles',
            onCapture: handleImageCapture,
            mode: 'camera'
        });
    };

    const handleImageCapture = (base64Image: string) => {
        setCapturedImages(prev => {
            const newImages = [...prev, base64Image];
            if (newImages.length >= 5) {
                Alert.alert('Maximum reached', 'You have captured 5 images. Ready to register!');
                setCurrentStep(3);
            } else if (newImages.length >= 3) {
                setCurrentStep(2);
            }
            return newImages;
        });
    };

    const removeImage = (index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
        if (capturedImages.length <= 3) setCurrentStep(1);
    };

    const registerFaces = async () => {
        if (capturedImages.length < 3) {
            Alert.alert('Error', 'Please capture at least 3 face images');
            return;
        }

        setLoading(true);
        try {
            const currentEmployeeId = employee?.employee_id;
            if (!currentEmployeeId) {
                Alert.alert('Error', 'No employee ID found');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/register-face/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: currentEmployeeId,
                    face_images: capturedImages,
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
                if (employee) {
                    const updatedEmployee = {
                        ...employee,
                        is_face_registered: true,
                    };
                    await AsyncStorage.setItem('employee_data', JSON.stringify(updatedEmployee));
                    setEmployee(updatedEmployee);
                }

                Alert.alert(
                    'Success! 🎉',
                    'Face registration successful!',
                    [
                        {
                            text: 'Continue',
                            onPress: () => navigation.navigate('Dashboard')
                        }
                    ]
                );
            } else {
                Alert.alert('Registration Failed', data.error || 'Face registration failed');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { number: 1, title: 'Capture Images', active: currentStep >= 1 },
        { number: 2, title: 'Review Photos', active: currentStep >= 2 },
        { number: 3, title: 'Register', active: currentStep >= 3 },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Face Registration</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress Steps */}
                <View style={styles.stepsContainer}>
                    {steps.map((step, index) => (
                        <View key={step.number} style={styles.stepContainer}>
                            <View style={[
                                styles.stepCircle,
                                step.active ? styles.stepCircleActive : styles.stepCircleInactive
                            ]}>
                                {step.active ? (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                ) : (
                                    <Text style={styles.stepNumber}>{step.number}</Text>
                                )}
                            </View>
                            <Text style={[
                                styles.stepTitle,
                                step.active ? styles.stepTitleActive : styles.stepTitleInactive
                            ]}>
                                {step.title}
                            </Text>
                            {index < steps.length - 1 && (
                                <View style={[
                                    styles.stepLine,
                                    steps[index + 1].active ? styles.stepLineActive : styles.stepLineInactive
                                ]} />
                            )}
                        </View>
                    ))}
                </View>

                {/* Instructions Card */}
                <View style={styles.instructionsCard}>
                    <View style={styles.instructionsHeader}>
                        <MaterialIcons name="info" size={24} color="#007AFF" />
                        <Text style={styles.instructionsTitle}>Instructions</Text>
                    </View>
                    <View style={styles.instructionsList}>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionIcon}>
                                <Ionicons name="camera" size={16} color="#34C759" />
                            </View>
                            <Text style={styles.instructionText}>Capture 3-5 clear face photos</Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionIcon}>
                                <Ionicons name="sunny" size={16} color="#34C759" />
                            </View>
                            <Text style={styles.instructionText}>Ensure good lighting conditions</Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionIcon}>
                                <Ionicons name="eye" size={16} color="#34C759" />
                            </View>
                            <Text style={styles.instructionText}>Face camera directly, no glasses</Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionIcon}>
                                <Ionicons name="happy" size={16} color="#34C759" />
                            </View>
                            <Text style={styles.instructionText}>Maintain neutral expression</Text>
                        </View>
                    </View>
                </View>

                {/* Capture Button */}
                <TouchableOpacity style={styles.captureCard} onPress={openCamera}>
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.captureGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="camera" size={40} color="#fff" />
                        <Text style={styles.captureTitle}>Capture Face Images</Text>
                        <Text style={styles.captureSubtitle}>
                            {capturedImages.length}/5 images captured
                        </Text>
                        <View style={styles.captureProgress}>
                            <View style={[
                                styles.captureProgressBar,
                                { width: `${(capturedImages.length / 5) * 100}%` }
                            ]} />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Image Preview */}
                <View style={styles.previewSection}>
                    <View style={styles.previewHeader}>
                        <Text style={styles.previewTitle}>Captured Images</Text>
                        {capturedImages.length > 0 && (
                            <TouchableOpacity onPress={() => setCapturedImages([])}>
                                <Text style={styles.clearText}>Clear All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {capturedImages.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.previewScroll}
                        >
                            {capturedImages.map((image, index) => (
                                <View key={index} style={styles.imageContainer}>
                                    <Image source={{ uri: image }} style={styles.previewImage} />
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                    </TouchableOpacity>
                                    <View style={styles.imageNumberBadge}>
                                        <Text style={styles.imageNumber}>{index + 1}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyPreview}>
                            <Ionicons name="images-outline" size={60} color="#E5E5EA" />
                            <Text style={styles.emptyPreviewText}>No images captured yet</Text>
                            <Text style={styles.emptyPreviewSubtext}>Tap above to start capturing</Text>
                        </View>
                    )}
                </View>

                {/* Register Button */}
                <TouchableOpacity
                    style={[
                        styles.registerButton,
                        (capturedImages.length < 3 || loading) && styles.registerButtonDisabled
                    ]}
                    onPress={registerFaces}
                    disabled={capturedImages.length < 3 || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                            <Text style={styles.registerButtonText}>
                                Register {capturedImages.length} Face{capturedImages.length !== 1 ? 's' : ''}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* User Info */}
                {employee && (
                    <View style={styles.userInfoCard}>
                        <View style={styles.userInfoHeader}>
                            <Ionicons name="person-circle" size={24} color="#007AFF" />
                            <Text style={styles.userInfoTitle}>Registration Info</Text>
                        </View>
                        <View style={styles.userInfoRow}>
                            <Text style={styles.userInfoLabel}>Employee ID:</Text>
                            <Text style={styles.userInfoValue}>{employee.employee_id}</Text>
                        </View>
                        <View style={styles.userInfoRow}>
                            <Text style={styles.userInfoLabel}>Status:</Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: employee.is_face_registered ? '#34C75920' : '#FF950020' }
                            ]}>
                                <Ionicons
                                    name={employee.is_face_registered ? "checkmark-circle" : "alert-circle"}
                                    size={12}
                                    color={employee.is_face_registered ? "#34C759" : "#FF9500"}
                                />
                                <Text style={[
                                    styles.statusText,
                                    { color: employee.is_face_registered ? "#34C759" : "#FF9500" }
                                ]}>
                                    {employee.is_face_registered ? 'Registered' : 'Not Registered'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    stepsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    stepContainer: {
        alignItems: 'center',
        position: 'relative',
        flex: 1,
    },
    stepCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepCircleActive: {
        backgroundColor: '#007AFF',
    },
    stepCircleInactive: {
        backgroundColor: '#E5E5EA',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E8E93',
    },
    stepTitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    stepTitleActive: {
        color: '#007AFF',
    },
    stepTitleInactive: {
        color: '#C7C7CC',
    },
    stepLine: {
        position: 'absolute',
        top: 18,
        left: '50%',
        width: '100%',
        height: 2,
        zIndex: -1,
    },
    stepLineActive: {
        backgroundColor: '#007AFF',
    },
    stepLineInactive: {
        backgroundColor: '#E5E5EA',
    },
    instructionsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    instructionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    instructionsTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
        marginLeft: 8,
    },
    instructionsList: {
        gap: 12,
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    instructionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#34C75920',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    instructionText: {
        fontSize: 15,
        color: '#48484A',
        flex: 1,
    },
    captureCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    captureGradient: {
        padding: 30,
        alignItems: 'center',
    },
    captureTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginTop: 16,
        marginBottom: 8,
    },
    captureSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 16,
    },
    captureProgress: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    captureProgressBar: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    previewSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    clearText: {
        fontSize: 15,
        color: '#FF3B30',
        fontWeight: '500',
    },
    previewScroll: {
        marginHorizontal: -4,
    },
    imageContainer: {
        position: 'relative',
        marginHorizontal: 4,
    },
    previewImage: {
        width: 100,
        height: 120,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E5EA',
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    imageNumberBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    imageNumber: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    emptyPreview: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyPreviewText: {
        fontSize: 16,
        color: '#8E8E93',
        marginTop: 16,
        marginBottom: 4,
    },
    emptyPreviewSubtext: {
        fontSize: 14,
        color: '#C7C7CC',
    },
    registerButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 18,
        marginBottom: 20,
        gap: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonDisabled: {
        backgroundColor: '#C7C7CC',
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    userInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 40,
    },
    userInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    userInfoTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
        marginLeft: 8,
    },
    userInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    userInfoLabel: {
        fontSize: 15,
        color: '#8E8E93',
    },
    userInfoValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1C1C1E',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default FaceRegistrationScreen;