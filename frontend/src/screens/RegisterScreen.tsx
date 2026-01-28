// src/screens/RegisterScreen.tsx - COMPLETE WORKING VERSION
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    FaceRegistration: undefined;
    MainTabs: undefined;
};

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
    navigation: RegisterScreenNavigationProp;
}

const API_BASE_URL = 'http://192.168.29.157:8000'; // Your IP

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
    const [formData, setFormData] = useState({
        username: 'testuser',
        password: 'test123',
        confirmPassword: 'test123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        employee_id: 'EMP002',
        department: 'Engineering',
        phone_number: '+1234567890',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleRegister = async () => {
        console.log('=== STARTING REGISTRATION ===');

        // Validation
        if (!formData.username || !formData.password || !formData.employee_id) {
            Alert.alert('Error', 'Please fill in all required fields (*)');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);

            console.log(`POST to: ${API_BASE_URL}/api/register/`);
            console.log('Data:', formData);

            const response = await fetch(`${API_BASE_URL}/api/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    email: formData.email,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    employee_id: formData.employee_id,
                    department: formData.department,
                    phone_number: formData.phone_number,
                }),
            });

            console.log('Response status:', response.status);

            let data;
            try {
                data = await response.json();
                console.log('Response data:', data);
            } catch (e) {
                console.error('JSON parse error:', e);
                const text = await response.text();
                console.log('Raw response:', text);
                data = { error: 'Invalid server response' };
            }

            if (response.ok) {
                if (data.success || data.message) {
                    Alert.alert(
                        'Success! 🎉',
                        'Registration successful!\n\nPlease login with your new account.',
                        [
                            {
                                text: 'Go to Login',
                                onPress: () => navigation.navigate('Login'),
                            },
                            {
                                text: 'Register Face',
                                onPress: () => navigation.navigate('FaceRegistration'),
                            },
                        ]
                    );
                } else {
                    Alert.alert('Registration Failed', data.error || 'Unknown error');
                }
            } else {
                Alert.alert('Registration Failed', data.error || `Server error: ${response.status}`);
            }
        } catch (error: any) {
            console.error('Network error:', error);
            Alert.alert(
                'Connection Error',
                `Cannot connect to server.\n\nURL: ${API_BASE_URL}\n\nError: ${error.message}`
            );
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={['#007AFF', '#5856D6']}
                style={styles.headerGradient}
            >
                <View style={styles.header}>
                    <Text style={styles.backButton} onPress={() => navigation.goBack()}>
                        ←
                    </Text>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.serverInfo}>Server: {API_BASE_URL}</Text>
                </View>
            </LinearGradient>

            <View style={styles.form}>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <Text style={styles.label}>First Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="John"
                    value={formData.first_name}
                    onChangeText={(value) => updateFormData('first_name', value)}
                />

                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Doe"
                    value={formData.last_name}
                    onChangeText={(value) => updateFormData('last_name', value)}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="john@example.com"
                    value={formData.email}
                    onChangeText={(value) => updateFormData('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="+1234567890"
                    value={formData.phone_number}
                    onChangeText={(value) => updateFormData('phone_number', value)}
                    keyboardType="phone-pad"
                />

                <Text style={styles.sectionTitle}>Account Information</Text>

                <Text style={styles.label}>Username *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="johndoe"
                    value={formData.username}
                    onChangeText={(value) => updateFormData('username', value)}
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="********"
                        value={formData.password}
                        onChangeText={(value) => updateFormData('password', value)}
                        secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Text style={styles.eyeButtonText}>
                            {showPassword ? '👁️' : '👁️‍🗨️'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm Password *</Text>
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="********"
                        value={formData.confirmPassword}
                        onChangeText={(value) => updateFormData('confirmPassword', value)}
                        secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                        <Text style={styles.eyeButtonText}>
                            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Employment Information</Text>

                <Text style={styles.label}>Employee ID *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="EMP001"
                    value={formData.employee_id}
                    onChangeText={(value) => updateFormData('employee_id', value)}
                />

                <Text style={styles.label}>Department</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Engineering"
                    value={formData.department}
                    onChangeText={(value) => updateFormData('department', value)}
                />

                <TouchableOpacity
                    style={styles.registerButton}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.registerButtonText}>Create Account</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.loginButtonText}>
                        Already have an account? Sign In
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backButton: {
        fontSize: 24,
        color: '#fff',
        padding: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
    },
    serverInfo: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.6)',
        position: 'absolute',
        bottom: 5,
        right: 10,
    },
    form: {
        padding: 25,
        marginTop: -20,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        backgroundColor: '#fff',
        minHeight: '100%',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 15,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        padding: 5,
    },
    eyeButtonText: {
        fontSize: 20,
    },
    registerButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 30,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 15,
    },
    loginButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default RegisterScreen;