// src/screens/LoginScreen.tsx - REDESIGNED
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    Dashboard: undefined;
    FaceRegistration: undefined;
    MainTabs: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
    navigation: LoginScreenNavigationProp;
}

const API_BASE_URL = 'http://192.168.29.157:8000';

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const [username, setUsername] = useState('demo');
    const [password, setPassword] = useState('demo123');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

    useEffect(() => {
        checkServerStatus();
    }, []);

    const checkServerStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/test/`);
            if (response.ok) {
                setServerStatus('online');
            } else {
                setServerStatus('offline');
            }
        } catch (error) {
            setServerStatus('offline');
        }
    };

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both username and password');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    username: username.trim(),
                    password: password.trim(),
                }),
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { error: 'Invalid server response' };
            }

            if (response.ok && data.success) {
                if (data.user) {
                    await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
                }
                if (data.employee) {
                    await AsyncStorage.setItem('employee_data', JSON.stringify(data.employee));
                }

                Alert.alert(
                    'Success! 🎉',
                    `Welcome ${data.user?.first_name || data.user?.username || 'User'}!`,
                    [
                        {
                            text: 'Continue',
                            onPress: () => navigation.navigate('MainTabs')
                        }
                    ]
                );

            } else {
                await handleSimpleLogin();
            }

        } catch (error: any) {
            await handleSimpleLogin();
        } finally {
            setLoading(false);
        }
    };

    const handleSimpleLogin = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/simple-login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password: password.trim() }),
            });

            const data = await response.json();

            if (data.success) {
                if (data.user) await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
                if (data.employee) await AsyncStorage.setItem('employee_data', JSON.stringify(data.employee));

                Alert.alert(
                    'Success! 🎉',
                    `Welcome ${data.user?.first_name || data.user?.username || 'User'}!`,
                    [{ text: 'Continue', onPress: () => navigation.navigate('MainTabs') }]
                );
            } else {
                Alert.alert('Login Failed', data.error || 'Invalid credentials');
            }
        } catch (error: any) {
            Alert.alert('Connection Error', 'Cannot connect to server');
        }
    };

    const testConnection = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/test/`);
            const data = await response.json();
            Alert.alert('Connection Test', '✅ Server is online!');
        } catch (error: any) {
            Alert.alert('Connection Failed', '❌ Cannot connect to server');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

            <LinearGradient
                colors={['#007AFF', '#0056CC']}
                style={styles.gradientBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="person-circle" size={80} color="#fff" />
                            </View>
                            <Text style={styles.title}>Face Attendance</Text>
                            <Text style={styles.subtitle}>Secure • Fast • Reliable</Text>
                        </View>

                        <View style={styles.statusContainer}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: serverStatus === 'online' ? '#34C759' : '#FF3B30' }
                            ]} />
                            <Text style={styles.statusText}>
                                Server {serverStatus === 'online' ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.formHeader}>
                            <Text style={styles.formTitle}>Welcome Back</Text>
                            <Text style={styles.formSubtitle}>Sign in to your account</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelContainer}>
                                <Ionicons name="person-outline" size={20} color="#8E8E93" />
                                <Text style={styles.inputLabel}>Username</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor="#C7C7CC"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" />
                                <Text style={styles.inputLabel}>Password</Text>
                            </View>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#C7C7CC"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#8E8E93"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.demoButton}
                            onPress={() => {
                                setUsername('demo');
                                setPassword('demo123');
                            }}
                        >
                            <Ionicons name="sparkles-outline" size={16} color="#007AFF" />
                            <Text style={styles.demoButtonText}>Use Demo Credentials</Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Ionicons name="person-add-outline" size={20} color="#007AFF" />
                            <Text style={styles.registerButtonText}>Create New Account</Text>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                Server: {API_BASE_URL}
                            </Text>
                            <Text style={styles.footerText}>
                                Default: demo / demo123
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#007AFF',
    },
    gradientBackground: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 32,
        paddingHorizontal: 24,
        paddingVertical: 40,
        marginHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 10,
    },
    formHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    formTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 8,
    },
    formSubtitle: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1C1C1E',
        marginLeft: 8,
    },
    input: {
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        color: '#1C1C1E',
    },
    passwordInputContainer: {
        position: 'relative',
    },
    passwordInput: {
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        color: '#1C1C1E',
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    loginButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 18,
        marginTop: 8,
        marginBottom: 16,
        gap: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        backgroundColor: '#8bb9ff',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginBottom: 24,
        gap: 8,
    },
    demoButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E5EA',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#8E8E93',
        fontSize: 14,
        fontWeight: '500',
    },
    registerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 12,
    },
    registerButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        marginTop: 32,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        alignItems: 'center',
    },
    footerText: {
        color: '#8E8E93',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 4,
    },
});

export default LoginScreen;