import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
// Keep your working FileSystem import
import * as FileSystem from 'expo-file-system/legacy';

import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from "react-native-gifted-charts";

// --- (Constants and interfaces) ---
const ACCOUNT_TYPES = [
    'BDO Unibank', 'Bank of the Philippine Islands (BPI)', 'Metrobank',
    'GCash', 'Maya', 'CASH', 'CIMB', 'Maribank', 'UNO', 'GoTyme', 'Land Bank of the Philippines',
    'Security Bank', 'Rizal Commercial Banking Corporation (RCBC)',
    'Philippine National Bank (PNB)', 'China Bank', 'UnionBank of the Philippines',
    'EastWest Bank', 'CREDIT CARD', 'Other',
];
// Original colors
const CARD_COLORS = [
    '#007AFF', '#5856D6', '#34C759', '#FF9500',
    '#FF3B30', '#00C7BE', '#3A3A3C',
    // Added more colors to cycle through for potentially more accounts
    '#E91E63', '#9C27B0', '#4CAF50', '#FFEB3B', '#FF5722',
];
interface Account {
    id: string;
    name: string;
    balance: number;
}

// ** 1. Define the Type for Pie Slice Data **
interface PieSliceData {
    value: number;
    color: string;
    name: string; // Added for the label
    percentage: string | number; // Added for the label
    originalBalance?: number; // Optional, added previously
    focused?: boolean; // Optional, added previously
    labelText?: string; // Add labelText based on gifted-charts data structure
}

const dataFilePath = FileSystem.documentDirectory + 'savingsData.json';

const getIconForAccount = (name: string, size: number, color: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bank') || lowerName.includes('bdo') || lowerName.includes('bpi')) {
        return <FontAwesome name="bank" size={size} color={color} />;
    }
    if (lowerName.includes('cash')) {
        return <FontAwesome name="money" size={size} color={color} />;
    }
    if (lowerName.includes('card')) {
        return <FontAwesome name="credit-card" size={size} color={color} />;
    }
    if (lowerName.includes('gcash') || lowerName.includes('maya')) {
        return <Ionicons name="phone-portrait" size={size} color={color} />;
    }
    return <MaterialCommunityIcons name="wallet" size={size} color={color} />;
};
// --- (End Constants/Interfaces) ---

export default function SavingsScreen() {
    // --- (State variables - unchanged) ---
    const [isLoading, setIsLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
    const [accountName, setAccountName] = useState(ACCOUNT_TYPES[0]);
    const [customName, setCustomName] = useState('');
    const [balanceInput, setBalanceInput] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    // --- (End State) ---

    // --- (Data persistence and helper functions - unchanged) ---
    useEffect(() => {
        const loadData = async () => {
            try {
                const fileInfo = await FileSystem.getInfoAsync(dataFilePath);
                if (fileInfo.exists) {
                    const fileContents = await FileSystem.readAsStringAsync(dataFilePath);
                    setAccounts(JSON.parse(fileContents));
                }
            } catch (e) { console.error("Failed to load data", e); }
            finally { setIsLoading(false); }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const saveData = async () => {
            try {
                const fileContents = JSON.stringify(accounts);
                await FileSystem.writeAsStringAsync(dataFilePath, fileContents);
            } catch (e) { console.error("Failed to save data", e); }
        };
        saveData();
    }, [accounts, isLoading]);

    const totalBalance = accounts.reduce((sum, account) => sum + Math.abs(account.balance), 0); // Use absolute for total display

    const formatCurrency = (amount: number, showSymbol = true, useDecimals = true) => {
        return amount.toLocaleString('en-PH', {
            style: showSymbol ? 'currency' : 'decimal',
            currency: 'PHP',
            minimumFractionDigits: useDecimals ? 2 : 0,
            maximumFractionDigits: useDecimals ? 2 : 0,
        });
    };

    const openAddModal = () => {
        setIsEditMode(false); setCurrentAccount(null);
        setAccountName(ACCOUNT_TYPES[0]); setCustomName('');
        setBalanceInput(''); setModalVisible(true);
    };
    const openEditModal = (account: Account) => {
        setIsEditMode(true); setCurrentAccount(account);
        if (ACCOUNT_TYPES.includes(account.name)) {
            setAccountName(account.name); setCustomName('');
        } else {
            setAccountName('Other'); setCustomName(account.name);
        }
        setBalanceInput(account.balance.toString()); setModalVisible(true);
    };
    const handleSubmit = () => {
        const isCreditCardType = accountName.toLowerCase().includes('credit card') || (accountName === 'Other' && customName.toLowerCase().includes('credit card'));
        const balance = parseFloat(balanceInput);
        const name = accountName === 'Other' ? customName.trim() : accountName;

        if (!name) { Alert.alert('Invalid Input', 'Please enter an account name.'); return; }
        if (isNaN(balance)) { Alert.alert('Invalid Input', 'Please enter a valid balance amount.'); return; }
        if (!isCreditCardType && balance < 0) { Alert.alert('Invalid Input', 'Balance must be zero or positive for non-credit card accounts.'); return; }

        if (isEditMode && currentAccount) {
            setAccounts(prevAccounts =>
                prevAccounts.map(acc =>
                    acc.id === currentAccount.id ? { ...acc, name: name, balance: balance } : acc
                )
            );
        } else {
            const newAccount: Account = { id: Date.now().toString(), name: name, balance: balance };
            setAccounts([...accounts, newAccount]);
        }
        setModalVisible(false);
    };
    const handleDeleteAccount = () => {
        if (!currentAccount) return;
        Alert.alert("Delete Account", `Are you sure you want to delete the "${currentAccount.name}" account?`,
            [{ text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: () => {
                    setAccounts(prevAccounts =>
                        prevAccounts.filter(acc => acc.id !== currentAccount.id)
                    );
                    setModalVisible(false);
                },
            },
            ]
        );
    };
    // --- (End Functions) ---

    // Prepare data for gifted-charts, remove 'text' prop
    const accountsForChart = accounts.filter(acc => acc.balance !== 0);
    const pieChartData: PieSliceData[] = accountsForChart.map((acc, index) => { // Added PieSliceData[] type here
        const chartValue = Math.abs(acc.balance);
        const percentage = totalBalance > 0 ? ((chartValue / totalBalance) * 100).toFixed(0) : 0;
        return {
            value: chartValue,
            originalBalance: acc.balance,
            color: CARD_COLORS[index % CARD_COLORS.length],
            name: acc.name,
            percentage: percentage,
            // labelText is used only when focused
            labelText: `${formatCurrency(acc.balance, false, false)}\n(${percentage}%)`,
            focused: index === focusedIndex,
        };
    });

    // ** 2. Use the Type in the Component Signature **
// Custom component to display details of the focused slice
    const FocusedSliceDetails = ({ slice, position }: { slice: PieSliceData | null, position: string }) => {
        if (!slice) return null;

        const containerStyle: any = {
            position: 'absolute',
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 10,
            zIndex: 100,
            borderWidth: 1,
            borderColor: '#E0E0E0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
        };

        const pointerStyle: any = {
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: 8,
            borderRightWidth: 8,
            borderBottomWidth: 12,
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: 'white',
            zIndex: 101,
        };

        // Simplified positioning logic - ADJUST AS NEEDED for better placement
        if (position === 'top-right') {
            containerStyle.top = 10;
            containerStyle.right = -20;
            pointerStyle.bottom = -12;
            pointerStyle.left = 10;
            pointerStyle.transform = [{ rotate: '180deg'}];
        } else if (position === 'bottom-right') {
            containerStyle.bottom = 10;
            containerStyle.right = -20;
            pointerStyle.top = -12;
            pointerStyle.left = 10;
        } else if (position === 'bottom-left') {
            containerStyle.bottom = 10;
            containerStyle.left = -20;
            pointerStyle.top = -12;
            pointerStyle.right = 10;
        } else { // Default to top-left
            containerStyle.top = 10;
            containerStyle.left = -20;
            pointerStyle.bottom = -12;
            pointerStyle.right = 10;
             pointerStyle.transform = [{ rotate: '180deg'}];
        }


        return (
            <View style={containerStyle}>
                <View style={pointerStyle} />
                <Text style={styles.focusedLabelName}>{slice.name}</Text>
                {/* Display original balance (could be negative for CC) */}
                <Text style={[
                    styles.focusedLabelAmount,
                    // ** THIS IS THE FIX **
                    slice.originalBalance && slice.originalBalance < 0 ? styles.negativeBalanceText : null
                ]}>
                    {/* Ensure originalBalance exists before formatting */}
                    {formatCurrency(slice.originalBalance ?? slice.value, true, true)}
                 </Text>
                <Text style={styles.focusedLabelPercentage}>({slice.percentage}%)</Text>
            </View>
        );
    };

    const getFocusedLabelPosition = (index: number) => {
        if (accountsForChart.length === 0 || totalBalance === 0 || index < 0 || index >= accountsForChart.length) return 'top-left'; // Added index bounds check
        const sliceValue = Math.abs(accountsForChart[index].balance);
        const sliceAngle = (sliceValue / totalBalance) * 360;
        let cumulativeAngle = 0;
        for (let i = 0; i < index; i++) {
            cumulativeAngle += (Math.abs(accountsForChart[i].balance) / totalBalance) * 360;
        }
        const middleAngle = (cumulativeAngle + (sliceAngle / 2)) % 360;

        if (middleAngle >= 0 && middleAngle < 90) return 'top-right';
        if (middleAngle >= 90 && middleAngle < 180) return 'bottom-right';
        if (middleAngle >= 180 && middleAngle < 270) return 'bottom-left';
        return 'top-left';
    };


    // --- RENDER ---
    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading Savings...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <LinearGradient
                colors={['#ffffff', '#f0f2f5']}
                style={styles.headerBackgroundGradient}
            >
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <MaterialCommunityIcons name="wallet-outline" size={18} color="#8A9BBE" style={{ marginRight: 6 }} />
                        <Text style={styles.headerTitle}>Overview</Text>
                    </View>
                    <Text style={styles.totalAmount}>{formatCurrency(totalBalance, true)}</Text>

                    {accountsForChart.length > 0 ? (
                        <View style={styles.chartContainer}>
                            <PieChart
                                data={pieChartData}
                                radius={90}
                                sectionAutoFocus
                                focusOnPress
                                onPress={(item: any, index: number) => {
                                    setFocusedIndex(index === focusedIndex ? -1 : index);
                                }}
                                // focusedLegendText prop might not exist, using custom component instead
                                // focusedLegendViewStyle={styles.focusedLabelContainer}
                                // focusedLegendTextStyle={styles.focusedLabelText}
                            />
                            {/* Render the custom label outside the chart */}
                            {focusedIndex !== -1 && pieChartData[focusedIndex] && (
                                <FocusedSliceDetails
                                    slice={pieChartData[focusedIndex]}
                                    position={getFocusedLabelPosition(focusedIndex)}
                                />
                            )}
                            {/* Legend */}
                            <View style={styles.legendContainer}>
                                {pieChartData.map((slice, index) => (
                                    <View key={accountsForChart[index].id} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                                        <Text style={styles.legendText}>{accountsForChart[index].name}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.emptyChartText}>
                            Add an account with a balance to see a chart
                        </Text>
                    )}
                </View>
            </LinearGradient>

            {/* List of Accounts (Grid View) - unchanged */}
            <FlatList
                data={accounts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.gridContainer}
                renderItem={({ item, index }) => {
                    const cardColor = CARD_COLORS[index % CARD_COLORS.length];
                    return (
                        <Pressable
                            style={[styles.card, { backgroundColor: cardColor }]}
                            onPress={() => openEditModal(item)}
                        >
                            <View style={styles.cardIcon}>
                                {getIconForAccount(item.name, 22, 'white')}
                            </View>
                            <View>
                                <Text style={styles.cardName}>{item.name.toUpperCase()}</Text>
                                <Text style={styles.cardBalance}>{formatCurrency(item.balance, true, true)}</Text>
                            </View>
                        </Pressable>
                    );
                }}
                ListHeaderComponent={<Text style={styles.gridHeader}>My Accounts</Text>}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No accounts added yet.</Text>
                        <Text style={styles.emptyText}>Press the "+" button to start.</Text>
                    </View>
                }
            />

            {/* Add Button - unchanged */}
            <Pressable style={styles.fab} onPress={openAddModal}>
                <Ionicons name="add" size={30} color="white" />
            </Pressable>

            {/* Add/Edit Modal - unchanged */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>
                            {isEditMode ? 'Update Account' : 'Add New Account'}
                        </Text>
                        <Text style={styles.inputLabel}>Account Name</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={accountName}
                                onValueChange={(itemValue) => setAccountName(itemValue)}
                                style={styles.picker} itemStyle={styles.pickerItem}
                            >
                                {ACCOUNT_TYPES.map((type) => (
                                    <Picker.Item key={type} label={type} value={type} />
                                ))}
                            </Picker>
                        </View>
                        {accountName === 'Other' && (
                            <TextInput
                                style={styles.input}
                                placeholder="Enter custom name (e.g., 'PayPal')"
                                placeholderTextColor="#999"
                                value={customName}
                                onChangeText={setCustomName}
                            />
                        )}
                        <Text style={styles.inputLabel}>Current Balance</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 5000 or -2000 for Credit Card"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={balanceInput}
                            onChangeText={setBalanceInput}
                        />
                        <View style={styles.buttonRow}>
                            {isEditMode && (
                                <Pressable style={[styles.button, styles.buttonDelete]} onPress={handleDeleteAccount} >
                                    <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 8 }} />
                                    <Text style={[styles.buttonText, styles.buttonAddText]}>Delete</Text>
                                </Pressable>
                            )}
                            <Pressable style={[styles.button, styles.buttonSubmit]} onPress={handleSubmit} >
                                <Ionicons name="checkmark" size={18} color="white" style={{ marginRight: 8 }} />
                                <Text style={[styles.buttonText, styles.buttonAddText]}>{isEditMode ? 'Update' : 'Add'}</Text>
                            </Pressable>
                        </View>
                        <Pressable style={[styles.button, styles.buttonClose]} onPress={() => setModalVisible(false)} >
                            <Ionicons name="close" size={18} color="#1F2937" style={{ marginRight: 8 }} />
                            <Text style={[styles.buttonText, styles.buttonCloseText]}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FC',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    headerBackgroundGradient: {
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 8,
    },
    header: {
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 24,
        paddingBottom: 12,
        paddingHorizontal: 24,
        backgroundColor: 'transparent',
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        color: '#8A9BBE',
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 42,
        color: '#1E2A3C',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 8,
    },
    // --- Chart Styles ---
    chartContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
        position: 'relative',
        height: 250,
        width: '100%',
        justifyContent: 'center',
    },
    // Styles for the focused label (amount + percentage) outside the chart
    focusedLabelName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E2A3C',
        marginBottom: 2,
    },
    focusedLabelAmount: {
        fontSize: 13,
        color: '#333',
    },
    focusedLabelPercentage: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
    },
    negativeBalanceText: {
        color: '#FF3B30',
    },
    legendContainer: {
        width: '100%',
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        marginBottom: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    legendText: {
        fontSize: 13,
        color: '#666',
    },
    emptyChartText: {
        textAlign: 'center',
        color: '#8A9BBE',
        marginTop: 10,
        fontSize: 16,
        marginBottom: 10,
    },
    noChartHeaderContent: {
        alignItems: 'center',
    },

    // Account Grid
    gridContainer: {
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    gridHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E2A3C',
        marginHorizontal: 12,
        marginBottom: 8,
    },
    card: {
        flex: 1,
        margin: 6,
        padding: 16,
        borderRadius: 12,
        minHeight: 120,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    cardIcon: {
        alignSelf: 'flex-end',
        opacity: 0.8,
    },
    cardName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardBalance: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        marginTop: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        flex: 1,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#8A9BBE',
        textAlign: 'center',
    },
    // FAB
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    // Modal
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalView: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
        marginTop: 10,
    },
    pickerContainer: {
        backgroundColor: '#F0F2F5',
        borderRadius: 8,
    },
    picker: {},
    pickerItem: {
        color: 'black',
    },
    input: {
        backgroundColor: '#F0F2F5',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
        color: 'black',
    },
    buttonRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    button: {
        borderRadius: 8,
        padding: 16,
        flex: 1,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonClose: {
        backgroundColor: '#E5E7EB',
        marginTop: 10,
    },
    buttonCloseText: {
        color: '#1F2937',
    },
    buttonSubmit: {
        backgroundColor: '#007AFF',
        flex: 2,
        marginLeft: 10,
    },
    buttonDelete: {
        backgroundColor: '#FF3B30',
        flex: 1.5,
        marginRight: 10,
    },
    buttonAddText: {
        color: 'white',
    },
    buttonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
});
