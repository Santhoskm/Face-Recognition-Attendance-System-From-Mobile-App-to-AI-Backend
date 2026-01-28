// src/screens/FaceCameraScreen.tsx
import React, { useEffect } from 'react';
import { RouteProp } from '@react-navigation/native';
import FaceCamera from '../components/FaceCamera';
import { RootStackParamList } from '../navigation/AppNavigator';

type FaceCameraScreenRouteProp = RouteProp<RootStackParamList, 'FaceCamera'>;

interface Props {
    route: FaceCameraScreenRouteProp;
    navigation: any;
}

const FaceCameraScreen: React.FC<Props> = ({ route, navigation }) => {
    const {
        onCapture,
        title,
        instruction,
        mode = 'camera'
    } = route.params || {};

    // Debug log
    useEffect(() => {
        console.log('FaceCameraScreen - Route params:', route.params);
        console.log('onCapture type:', typeof onCapture);
    }, []);

    // Create a safe callback function
    const safeOnCapture = onCapture || ((base64Image: string) => {
        console.log('Default onCapture called - no callback provided');
        navigation.goBack();
    });

    return (
        <FaceCamera
            onCapture={safeOnCapture}
            title={title || 'Face Camera'}
            instruction={instruction || 'Position your face inside the frame'}
            mode={mode}
        />
    );
};

export default FaceCameraScreen;