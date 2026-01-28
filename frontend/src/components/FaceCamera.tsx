// src/components/FaceCamera.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

interface FaceCameraProps {
    onCapture: (base64Image: string) => void;
    mode?: 'camera' | 'gallery';
    title?: string;
    instruction?: string;
}

const FaceCamera: React.FC<FaceCameraProps> = ({
    onCapture,
    mode = 'camera',
    title = 'Face Recognition',
    instruction = 'Position your face inside the frame',
}) => {
    const [facing, setFacing] = useState<CameraType>('front');
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<any>(null);
    const [flash, setFlash] = useState<'off' | 'on'>('off');

    useEffect(() => {
        if (mode === 'camera') {
            requestPermission();
        }
    }, []);

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                setLoading(true);
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.8,
                    skipProcessing: false,
                });

                const base64Image = `data:image/jpg;base64,${photo.base64}`;
                setCapturedImage(base64Image);
                onCapture(base64Image);

                Alert.alert('Success', 'Face captured successfully!');
            } catch (error) {
                Alert.alert('Error', 'Failed to capture image');
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
    };

    const pickImage = async () => {
        try {
            setLoading(true);

            // Request permissions
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
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                const base64Image = `data:image/jpg;base64,${result.assets[0].base64}`;
                setCapturedImage(base64Image);
                onCapture(base64Image);
                Alert.alert('Success', 'Image selected successfully!');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to select image');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'front' ? 'back' : 'front'));
    };

    const toggleFlash = () => {
        setFlash(current => (current === 'off' ? 'on' : 'off'));
    };

    const retakePicture = () => {
        setCapturedImage(null);
    };

    if (mode === 'camera' && !permission) {
        return (
            <View style={styles.container}>
                <Text>Requesting camera permission...</Text>
            </View>
        );
    }

    if (mode === 'camera' && !permission?.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Camera permission is required</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.instruction}>{instruction}</Text>

            {mode === 'camera' && !capturedImage ? (
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing={facing}
                        ref={cameraRef}
                        flash={flash}
                    >
                        <View style={styles.cameraOverlay}>
                            <View style={styles.faceFrame}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>
                        </View>
                    </CameraView>

                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
                            <Text style={styles.controlButtonText}>
                                {flash === 'on' ? '🔦' : '⚡'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={takePicture}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <View style={styles.captureButtonInner} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                            <Text style={styles.controlButtonText}>🔄</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : mode === 'gallery' && !capturedImage ? (
                <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={pickImage}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.galleryButtonText}>📁 Select from Gallery</Text>
                    )}
                </TouchableOpacity>
            ) : null}

            {capturedImage && (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                    <View style={styles.previewButtons}>
                        <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
                            <Text style={styles.retakeButtonText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.useButton}
                            onPress={() => onCapture(capturedImage)}
                        >
                            <Text style={styles.useButtonText}>Use This Image</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.tips}>
                <Text style={styles.tipsTitle}>Tips for best results:</Text>
                <Text style={styles.tip}>• Ensure good lighting</Text>
                <Text style={styles.tip}>• Face the camera directly</Text>
                <Text style={styles.tip}>• Remove sunglasses</Text>
                <Text style={styles.tip}>• Maintain neutral expression</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
    },
    instruction: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    message: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 10,
        alignSelf: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cameraContainer: {
        width: '100%',
        height: height * 0.6,
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 20,
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceFrame: {
        width: 250,
        height: 300,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 10,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#00FF00',
    },
    topLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 10,
    },
    topRight: {
        top: -2,
        right: -2,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 10,
    },
    bottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 10,
    },
    bottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 10,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    controlButton: {
        padding: 15,
    },
    controlButtonText: {
        fontSize: 24,
        color: '#fff',
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#007AFF',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#007AFF',
    },
    galleryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 20,
        borderRadius: 10,
        marginBottom: 20,
        alignItems: 'center',
    },
    galleryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    previewImage: {
        width: 200,
        height: 250,
        borderRadius: 10,
        marginBottom: 15,
    },
    previewButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
    },
    retakeButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retakeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    useButton: {
        backgroundColor: '#34C759',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    useButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    tips: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    tip: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
});

export default FaceCamera;