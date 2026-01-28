import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { testConnection } from '../services/api';

export default function ConnectionTestScreen() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleTest = async () => {
        setLoading(true);
        const connectionResult = await testConnection();
        setResult(connectionResult);
        setLoading(false);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Connection Test</Text>
            <Text style={styles.subtitle}>Test backend server connection</Text>

            <Button
                title={loading ? "Testing..." : "Test Connection"}
                onPress={handleTest}
                disabled={loading}
            />

            {result && (
                <View style={[
                    styles.resultContainer,
                    result.success ? styles.success : styles.error
                ]}>
                    <Text style={styles.resultTitle}>
                        {result.success ? '✅ SUCCESS' : '❌ FAILED'}
                    </Text>
                    <Text style={styles.resultText}>
                        {result.success ? 'Backend server is reachable!' : result.error}
                    </Text>

                    {result.data && (
                        <View style={styles.dataContainer}>
                            <Text style={styles.dataTitle}>Response Data:</Text>
                            <Text style={styles.dataText}>
                                {JSON.stringify(result.data, null, 2)}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.tips}>
                <Text style={styles.tipsTitle}>Troubleshooting Tips:</Text>
                <Text>1. Make sure Django server is running:</Text>
                <Text style={styles.code}>python manage.py runserver 0.0.0.0:8000</Text>

                <Text>2. Check if server is accessible from browser:</Text>
                <Text style={styles.code}>http://192.168.29.157:8000/api/health/</Text>

                <Text>3. Check firewall settings</Text>
                <Text>4. Make sure phone and computer are on same WiFi</Text>

                <Text>5. Try different IP addresses:</Text>
                <Text style={styles.code}>- localhost:8000 (simulator)</Text>
                <Text style={styles.code}>- 10.0.2.2:8000 (Android emulator)</Text>
                <Text style={styles.code}>- YOUR_COMPUTER_IP:8000 (physical device)</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
    resultContainer: { marginTop: 20, padding: 15, borderRadius: 10 },
    success: { backgroundColor: '#d4edda', borderColor: '#c3e6cb' },
    error: { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
    resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    resultText: { fontSize: 14 },
    dataContainer: { marginTop: 10, padding: 10, backgroundColor: 'white', borderRadius: 5 },
    dataTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
    dataText: { fontSize: 12, fontFamily: 'monospace' },
    tips: { marginTop: 30, padding: 15, backgroundColor: '#e7f3ff', borderRadius: 10 },
    tipsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    code: { fontFamily: 'monospace', backgroundColor: '#f1f1f1', padding: 5, marginVertical: 2 },
});