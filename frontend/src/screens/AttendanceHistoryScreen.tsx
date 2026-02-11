// src/screens/AttendanceHistoryScreen.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
    AttendanceHistory: undefined;
    Dashboard: undefined;
};

type AttendanceHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AttendanceHistory'>;

interface Props {
    navigation: AttendanceHistoryScreenNavigationProp;
}

// Add this if not in a separate file
const API_BASE_URL = 'http://192.168.29.157:8000';

const AttendanceHistoryScreen: React.FC<Props> = ({ navigation }) => {
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [employee, setEmployee] = useState<any>(null);
    const [stats, setStats] = useState({
        total: 0,
        verified: 0,
        successRate: '0',
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('AttendanceHistoryScreen mounted');
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('Loading initial data...');

            // First load employee data
            const employeeData = await AsyncStorage.getItem('employee_data');
            console.log('Employee data from storage:', employeeData ? 'Found' : 'Not found');

            if (employeeData) {
                const parsedEmployee = JSON.parse(employeeData);
                console.log('Parsed employee:', parsedEmployee.employee_id);
                setEmployee(parsedEmployee);

                // Then load attendance data
                await loadAttendanceData(parsedEmployee);
            } else {
                setError('No employee data found. Please login again.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            setError('Failed to load data');
            setLoading(false);
        }
    };

    const loadAttendanceData = async (employeeObj: any) => {
        if (!employeeObj || !employeeObj.employee_id) {
            console.error('No employee ID available');
            setError('No employee ID found');
            setLoading(false);
            return;
        }

        console.log('Loading attendance history for:', employeeObj.employee_id);

        try {
            const response = await fetch(`${API_BASE_URL}/api/attendance-history/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: employeeObj.employee_id,
                }),
            });

            console.log('Response status:', response.status);

            const text = await response.text();
            console.log('Response text length:', text.length);

            let data;
            try {
                data = JSON.parse(text);
                console.log('Parsed data keys:', Object.keys(data));
            } catch (e) {
                console.error('JSON parse error:', e);
                console.log('Raw response (first 500 chars):', text.substring(0, 500));
                data = { error: 'Invalid JSON response' };
            }

            if (response.ok && data.success) {
                const history = data.attendance_history || [];
                console.log('Attendance records found:', history.length);

                if (history.length === 0) {
                    console.log('No attendance records found for employee');
                }

                // Group attendance by date
                const groupedByDate = groupAttendanceByDate(history);
                setAttendanceData(groupedByDate);

                // Calculate stats
                const total = history.length;
                const verified = history.filter((record: any) => record.is_verified).length;
                const successRate = total > 0 ? ((verified / total) * 100).toFixed(1) : '0';

                setStats({
                    total,
                    verified,
                    successRate,
                });

                setError(null);

            } else {
                const errorMsg = data.error || 'Failed to load attendance history';
                console.error('Server error:', errorMsg);
                setError(errorMsg);
                setAttendanceData([]);
            }
        } catch (error: any) {
            console.error('Network error:', error);
            setError('Network error. Check server connection.');
            setAttendanceData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const groupAttendanceByDate = (records: any[]) => {
        const groups: any = {};

        records.forEach(record => {
            if (!record.timestamp) {
                console.log('Record missing timestamp:', record);
                return;
            }

            try {
                const date = moment(record.timestamp).format('YYYY-MM-DD');
                const displayDate = getDisplayDate(record.timestamp);

                if (!groups[date]) {
                    groups[date] = {
                        id: date,
                        date: displayDate,
                        records: [],
                    };
                }

                groups[date].records.push({
                    ...record,
                    id: record.id || Math.random().toString(),
                    time: moment(record.timestamp).format('h:mm A'),
                    confidence: typeof record.confidence_score === 'number'
                        ? record.confidence_score
                        : 0.85,
                });
            } catch (e) {
                console.error('Error processing record:', record, e);
            }
        });

        // Sort by date (newest first)
        return Object.values(groups)
            .sort((a: any, b: any) => moment(b.id).valueOf() - moment(a.id).valueOf());
    };

    const getDisplayDate = (timestamp: string) => {
        try {
            const date = moment(timestamp);
            const today = moment().startOf('day');

            if (date.isSame(today, 'day')) {
                return 'Today';
            } else if (date.isSame(today.clone().subtract(1, 'day'), 'day')) {
                return 'Yesterday';
            } else {
                return date.format('MMM D, YYYY');
            }
        } catch (e) {
            console.error('Error formatting date:', timestamp, e);
            return 'Invalid Date';
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setError(null);

        try {
            const employeeData = await AsyncStorage.getItem('employee_data');
            if (employeeData) {
                const parsedEmployee = JSON.parse(employeeData);
                setEmployee(parsedEmployee);
                await loadAttendanceData(parsedEmployee);
            } else {
                setError('No employee data found');
                setRefreshing(false);
            }
        } catch (error) {
            console.error('Error refreshing:', error);
            setError('Refresh failed');
            setRefreshing(false);
        }
    };

    const getFilteredData = () => {
        if (selectedFilter === 'all') return attendanceData;
        if (selectedFilter === 'verified') {
            return attendanceData.map(day => ({
                ...day,
                records: day.records.filter((record: any) => record.is_verified),
            })).filter(day => day.records.length > 0);
        }
        if (selectedFilter === 'failed') {
            return attendanceData.map(day => ({
                ...day,
                records: day.records.filter((record: any) => !record.is_verified),
            })).filter(day => day.records.length > 0);
        }
        return attendanceData;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'CHECK_IN': return 'enter-outline';
            case 'CHECK_OUT': return 'exit-outline';
            case 'BREAK_START': return 'pause-outline';
            case 'BREAK_END': return 'play-outline';
            default: return 'time-outline';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'CHECK_IN': return '#34C759';
            case 'CHECK_OUT': return '#FF9500';
            case 'BREAK_START': return '#007AFF';
            case 'BREAK_END': return '#5856D6';
            default: return '#8E8E93';
        }
    };

    const renderAttendanceItem = (item: any) => (
        <View key={item.id} style={styles.attendanceItem}>
            <View style={styles.typeIndicator}>
                <View style={[styles.typeIconContainer, { backgroundColor: getTypeColor(item.attendance_type) + '20' }]}>
                    <Ionicons
                        name={getTypeIcon(item.attendance_type)}
                        size={20}
                        color={getTypeColor(item.attendance_type)}
                    />
                </View>
            </View>

            <View style={styles.attendanceDetails}>
                <View style={styles.attendanceHeader}>
                    <Text style={styles.attendanceType}>
                        {item.attendance_type?.replace('_', ' ') || 'Attendance'}
                    </Text>
                    <View style={[
                        styles.statusBadge,
                        item.is_verified ? styles.verifiedBadge : styles.failedBadge
                    ]}>
                        <Text style={styles.statusText}>
                            {item.is_verified ? 'Verified' : 'Failed'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.attendanceTime}>{item.time}</Text>
                {typeof item.confidence === 'number' && (
                    <Text style={styles.confidenceText}>
                        Confidence: {(item.confidence * 100).toFixed(1)}%
                    </Text>
                )}
            </View>

            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{item.time}</Text>
            </View>
        </View>
    );

    const renderDaySection = (day: any) => (
        <View key={day.id} style={styles.daySection}>
            <View style={styles.dayHeader}>
                <Text style={styles.dayDate}>{day.date}</Text>
                <Text style={styles.dayCount}>{day.records.length} records</Text>
            </View>
            <View style={styles.dayContent}>
                {day.records.map(renderAttendanceItem)}
            </View>
        </View>
    );

    const filters = [
        { id: 'all', label: 'All', icon: '📊' },
        { id: 'verified', label: 'Verified', icon: '✅' },
        { id: 'failed', label: 'Failed', icon: '❌' },
    ];

    const filteredData = getFilteredData();

    // Show loading screen
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#007AFF', '#5856D6']}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Attendance History</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </LinearGradient>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading attendance history...</Text>
                    {employee && (
                        <Text style={styles.loadingSubtext}>
                            Loading data for: {employee.employee_id}
                        </Text>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    // Show error screen
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#007AFF', '#5856D6']}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Attendance History</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </LinearGradient>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
                    <Text style={styles.errorTitle}>Error Loading Data</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.secondaryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
                    <Text style={styles.title}>Attendance History</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Overview */}
                <View style={styles.statsCard}>
                    <View style={styles.statRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="time" size={24} color="#007AFF" />
                            <Text style={styles.statValue}>{stats.total}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                            <Text style={styles.statValue}>{stats.verified}</Text>
                            <Text style={styles.statLabel}>Verified</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="trending-up" size={24} color="#5856D6" />
                            <Text style={[styles.statValue, styles.successRate]}>
                                {stats.successRate}%
                            </Text>
                            <Text style={styles.statLabel}>Success Rate</Text>
                        </View>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {filters.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                style={[
                                    styles.filterButton,
                                    selectedFilter === filter.id && styles.filterButtonActive,
                                ]}
                                onPress={() => setSelectedFilter(filter.id)}
                            >
                                <Text style={[
                                    styles.filterIcon,
                                    selectedFilter === filter.id && styles.filterIconActive,
                                ]}>
                                    {filter.icon}
                                </Text>
                                <Text style={[
                                    styles.filterText,
                                    selectedFilter === filter.id && styles.filterTextActive,
                                ]}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Attendance List */}
                <View style={styles.historyContainer}>
                    {filteredData.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="time-outline" size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No attendance records</Text>
                            <Text style={styles.emptySubtext}>
                                {selectedFilter === 'verified'
                                    ? 'No verified records found'
                                    : selectedFilter === 'failed'
                                        ? 'No failed records found'
                                        : 'No attendance records available yet'}
                            </Text>
                            <Text style={styles.employeeInfo}>
                                Employee ID: {employee?.employee_id || 'Unknown'}
                            </Text>
                        </View>
                    ) : (
                        filteredData.map(renderDaySection)
                    )}
                </View>

                {/* Export/Share Options */}
                <View style={styles.actionsCard}>
                    <Text style={styles.actionsTitle}>Export Options</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="document-text" size={24} color="#007AFF" />
                            <Text style={styles.actionText}>PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="stats-chart" size={24} color="#34C759" />
                            <Text style={styles.actionText}>Excel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="mail" size={24} color="#FF9500" />
                            <Text style={styles.actionText}>Email</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="print" size={24} color="#5856D6" />
                            <Text style={styles.actionText}>Print</Text>
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
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#C7C7CC',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        padding: 20,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF3B30',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    secondaryButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    headerGradient: {
        paddingTop: 10,
        paddingBottom: 20,
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
    content: {
        flex: 1,
        padding: 20,
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
    },
    successRate: {
        color: '#34C759',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#eee',
    },
    filterContainer: {
        marginBottom: 20,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterButtonActive: {
        backgroundColor: '#007AFF',
    },
    filterIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    filterIconActive: {
        color: '#fff',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    filterTextActive: {
        color: '#fff',
    },
    historyContainer: {
        marginBottom: 20,
    },
    daySection: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 15,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dayDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    dayCount: {
        fontSize: 14,
        color: '#666',
    },
    dayContent: {
        padding: 15,
    },
    attendanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    typeIndicator: {
        marginRight: 15,
    },
    typeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attendanceDetails: {
        flex: 1,
    },
    attendanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    attendanceType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginRight: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
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
        color: '#333',
    },
    attendanceTime: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    confidenceText: {
        fontSize: 12,
        color: '#999',
    },
    timeContainer: {
        marginLeft: 10,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#fff',
        borderRadius: 15,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    employeeInfo: {
        fontSize: 12,
        color: '#C7C7CC',
        marginTop: 8,
    },
    actionsCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        alignItems: 'center',
        padding: 10,
        flex: 1,
    },
    actionText: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
    },
});

export default AttendanceHistoryScreen;