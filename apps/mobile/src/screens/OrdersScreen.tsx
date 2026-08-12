import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('dms_user');
      const token = await AsyncStorage.getItem('dms_token');
      
      if (!userStr || !token) return;
      const user = JSON.parse(userStr);

      const response = await fetch(`http://localhost:5001/api/orders/distributor/${user.user_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Sort newest first
        const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#fef3c7', text: '#d97706', icon: 'time' };
      case 'EXECUTED': return { bg: '#dcfce7', text: '#16a34a', icon: 'checkmark-circle' };
      case 'CANCELLED': return { bg: '#fee2e2', text: '#ef4444', icon: 'close-circle' };
      default: return { bg: '#f1f5f9', text: '#64748b', icon: 'information-circle' };
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.order_id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No orders found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusColor(item.status);
          return (
            <TouchableOpacity style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>Order #{item.order_id}</Text>
                  <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Ionicons name={statusStyle.icon as any} size={14} color={statusStyle.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Total Amount</Text>
                  <Text style={styles.metricValue}>₹{parseFloat(item.total_amount).toFixed(2)}</Text>
                </View>
                {item.applied_wallet > 0 && (
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Wallet Applied</Text>
                    <Text style={[styles.metricValue, { color: '#10b981' }]}>-₹{parseFloat(item.applied_wallet).toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Final Payable</Text>
                  <Text style={[styles.metricValue, { color: '#2563eb' }]}>
                    ₹{Math.max(0, item.total_amount - item.applied_wallet).toFixed(2)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: '30%',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
});
