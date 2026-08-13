import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { ListSkeleton } from '../components/SkeletonLoader';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';
import { Order } from '../types';

async function fetchOrders(): Promise<Order[]> {
  const userStr = await SecureStore.getItemAsync('dms_user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  const response = await api.get(`/api/orders/distributor/${user.user_id}`);
  return response.data.sort(
    (a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

const getStatusStyle = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING': return { bg: '#fef3c7', text: '#d97706', icon: 'time' as const };
    case 'EXECUTED': return { bg: '#dcfce7', text: '#16a34a', icon: 'checkmark-circle' as const };
    case 'CANCELLED': return { bg: '#fee2e2', text: '#ef4444', icon: 'close-circle' as const };
    default: return { bg: '#f1f5f9', text: '#64748b', icon: 'information-circle' as const };
  }
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o =>
      o.order_id.toString().includes(q) ||
      o.invoice_number?.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    setIsRefreshing(false);
  }, [queryClient]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.listContent}>
            <View style={styles.searchContainer} />
            <ListSkeleton count={4} />
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.order_id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListHeaderComponent={
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by order ID or status..."
                  placeholderTextColor={colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyStateText}>
                  {searchQuery ? `No orders match "${searchQuery}"` : 'No orders found.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const statusStyle = getStatusStyle(item.status);
              const totalAmount = parseFloat((item as any).total_amount) || item.grand_total || 0;
              const walletApplied = parseFloat((item as any).applied_wallet) || 0;
              return (
                <View style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>
                        {item.invoice_number || `Order #${item.order_id}`}
                      </Text>
                      <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Ionicons name={statusStyle.icon} size={13} color={statusStyle.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={styles.orderFooter}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Total Amount</Text>
                      <Text style={styles.metricValue}>₹{totalAmount.toFixed(2)}</Text>
                    </View>
                    {walletApplied > 0 && (
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Wallet Used</Text>
                        <Text style={[styles.metricValue, { color: colors.success }]}>-₹{walletApplied.toFixed(2)}</Text>
                      </View>
                    )}
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Final Payable</Text>
                      <Text style={[styles.metricValue, { color: colors.primary }]}>
                        ₹{Math.max(0, totalAmount - walletApplied).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  listContent: { padding: spacing.lg },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  searchInput: { flex: 1, fontSize: typography.base, color: colors.textPrimary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyStateText: { color: colors.textMuted, fontSize: typography.base, marginTop: 12, textAlign: 'center' },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  orderId: { fontSize: typography.md, fontWeight: 'bold', color: colors.textPrimary },
  orderDate: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricItem: { flex: 1, minWidth: '30%' },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: { fontSize: typography.md, fontWeight: 'bold', color: colors.textPrimary },
});
