import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export default function DashboardScreen() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [firmName, setFirmName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('dms_user');
      const token = await AsyncStorage.getItem('dms_token');
      
      if (!userStr || !token) {
        // Not logged in properly?
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(userStr);
      setFirmName(user.firm_name);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Fetch Wallet
      const walletRes = await fetch(`http://localhost:5001/api/distributors/${user.user_id}/wallet`, { headers });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWalletBalance(walletData.wallet_balance || 0);
      }

      // Fetch Orders
      const ordersRes = await fetch(`http://localhost:5001/api/orders/distributor/${user.user_id}`, { headers });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const executedOrders = orders.filter(o => o.status === 'EXECUTED').length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.firmName}>{firmName}!</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Dashboard</Text>
        <Text style={styles.cardSubtitle}>Track your orders and manage restocking.</Text>

        <View style={styles.grid}>
          {/* Total Orders */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Total Orders</Text>
              <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="cube" size={20} color="#4f46e5" />
              </View>
            </View>
            <Text style={styles.metricValue}>{orders.length}</Text>
          </View>

          {/* Pending Orders */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Pending</Text>
              <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="time" size={20} color="#d97706" />
              </View>
            </View>
            <Text style={styles.metricValue}>{pendingOrders}</Text>
          </View>

          {/* Executed Orders */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Executed</Text>
              <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              </View>
            </View>
            <Text style={styles.metricValue}>{executedOrders}</Text>
          </View>

          {/* Wallet */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Wallet</Text>
              <View style={[styles.iconContainer, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="wallet" size={20} color="#10b981" />
              </View>
            </View>
            <Text style={styles.metricValue}>₹{parseFloat(walletBalance.toString()).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionArea}>
          <View>
            <Text style={styles.actionTitle}>Ready to restock?</Text>
            <Text style={styles.actionSubtitle}>Browse the storefront and place a new order now.</Text>
          </View>
          <TouchableOpacity 
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Create Order')}
          >
            <Text style={styles.primaryBtnText}>Storefront</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6b7280',
  },
  firmName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  actionArea: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
