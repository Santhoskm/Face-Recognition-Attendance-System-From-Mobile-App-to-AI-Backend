// src/screens/AttendanceHistoryScreen.tsx - UPDATED WITH REAL DATA
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../services/api';

type RootStackParamList = {
    AttendanceHistory: undefined;
    Dashboard: undefined;
};

type AttendanceHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AttendanceHistory'>;

interface Props {
    navigation: AttendanceHistoryScreenNavigationProp;
}

const { width } = Dimensions.get('window');

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

    useEffect(() => {
        loadAttendanceData();
        loadEmployeeData();
    }, []);

    const loadEmployeeData = async () => {
        try {
            const employeeData = await AsyncStorage.getItem('employee_data');
            if (employeeData) {
                setEmployee(JSON.parse(employeeData));
            }
        } catch (error) {
            console.error('Error loading employee data:', error);
        }
    };

    const loadAttendanceData = async () => {
        if (!employee) return;

        setLoading(true);
        try {
            console.log('Loading attendance history for:', employee.employee_id);

            const response = await fetch(`${API_BASE_URL}/api/attendance-history/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: employee.employee_id,
                }),
            });

            const text = await response.text();
            console.log('Attendance history response text:', text.substring(0, 200) + '...');

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { error: 'Invalid JSON response' };
            }

            if (response.ok && data.success) {
                const history = data.attendance_history || [];

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

            } else {
                Alert.alert('Error', data.error || 'Failed to load attendance history');
                setAttendanceData([]);
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
            Alert.alert('Error', 'Failed to load attendance data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const groupAttendanceByDate = (records: any[]) => {
        const groups: any = {};

        records.forEach(record => {
            if (!record.timestamp) return;

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
                confidence: record.confidence_score || 0.85,
            });
        });

        // Sort by date (newest first)
        return Object.values(groups)
            .sort((a: any, b: any) => moment(b.id).valueOf() - moment(a.id).valueOf());
    };

    const getDisplayDate = (timestamp: string) => {
        const date = moment(timestamp);
        const today = moment().startOf('day');

        if (date.isSame(today, 'day')) {
            return 'Today';
        } else if (date.isSame(today.subtract(1, 'day'), 'day')) {
            return 'Yesterday';
        } else {
            return date.format('MMM D, YYYY');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAttendanceData();
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
                {item.confidence_score && (
                    <Text style={styles.confidenceText}>
                        Confidence: {(item.confidence_score * 100).toFixed(1)}%
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
                                        : 'No records available'}
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
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
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