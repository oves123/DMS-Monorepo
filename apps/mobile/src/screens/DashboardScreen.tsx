import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import api from '../lib/api';
import { SkeletonBox } from '../components/SkeletonLoader';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';
import { Order } from '../types';

async function fetchDashboardData() {
  const userStr = await SecureStore.getItemAsync('dms_user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);

  const [walletRes, ordersRes] = await Promise.all([
    api.get(`/api/distributors/${user.user_id}/wallet`),
    api.get(`/api/orders/distributor/${user.user_id}`),
  ]);

  return {
    firmName: user.firm_name,
    walletBalance: walletRes.data?.wallet_balance || 0,
    orders: (ordersRes.data || []) as Order[],
  };
}

interface MetricCardProps {
  label: string;
  value: string | number;
  iconName: any;
  iconBg: string;
  iconColor: string;
}

const MetricCard = ({ label, value, iconName, iconBg, iconColor }: MetricCardProps) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

export default function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const orders = data?.orders || [];
  const pendingOrders = orders.filter(o => o.status?.toUpperCase() === 'PENDING').length;
  const executedOrders = orders.filter(o => o.status?.toUpperCase() === 'EXECUTED').length;
  const walletBalance = parseFloat(String(data?.walletBalance || 0)).toFixed(2);
  const recentOrders = orders.slice(0, 3);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonBox width="50%" height={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width="70%" height={32} style={{ marginBottom: 24 }} />
          <View style={styles.grid}>
            <SkeletonBox height={90} borderRadius={radii.lg} style={{ flex: 1, marginRight: 8 }} />
            <SkeletonBox height={90} borderRadius={radii.lg} style={{ flex: 1, marginLeft: 8 }} />
          </View>
          <View style={styles.grid}>
            <SkeletonBox height={90} borderRadius={radii.lg} style={{ flex: 1, marginRight: 8 }} />
            <SkeletonBox height={90} borderRadius={radii.lg} style={{ flex: 1, marginLeft: 8 }} />
          </View>
          <SkeletonBox height={120} borderRadius={radii.lg} style={{ marginTop: 16 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingLabel}>Welcome back,</Text>
          <Text style={styles.greetingFirm} numberOfLines={1}>{data?.firmName}! 👋</Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.grid}>
          <MetricCard label="Total Orders" value={orders.length} iconName="cube" iconBg="#e0e7ff" iconColor="#4f46e5" />
          <MetricCard label="Pending" value={pendingOrders} iconName="time" iconBg={colors.warningLight} iconColor={colors.warning} />
        </View>
        <View style={styles.grid}>
          <MetricCard label="Executed" value={executedOrders} iconName="checkmark-circle" iconBg={colors.successLight} iconColor={colors.success} />
          <MetricCard label="Wallet" value={`₹${walletBalance}`} iconName="wallet" iconBg="#ecfdf5" iconColor={colors.success} />
        </View>

        {/* CTA Banner */}
        <View style={styles.ctaBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Ready to restock?</Text>
            <Text style={styles.ctaSubtitle}>Browse and place a new order in minutes.</Text>
          </View>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('Create Order')}
            activeOpacity={0.85}
          >
            <Ionicons name="cart" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>Order Now</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map(order => (
              <View key={order.order_id} style={styles.recentItem}>
                <View>
                  <Text style={styles.recentOrderId}>
                    {order.invoice_number || `Order #${order.order_id}`}
                  </Text>
                  <Text style={styles.recentDate}>{new Date(order.created_at).toLocaleDateString('en-IN')}</Text>
                </View>
                <View style={[
                  styles.statusPill,
                  {
                    backgroundColor: order.status?.toUpperCase() === 'EXECUTED' ? colors.successLight
                      : order.status?.toUpperCase() === 'PENDING' ? colors.warningLight
                      : colors.dangerLight,
                  }
                ]}>
                  <Text style={[
                    styles.statusText,
                    {
                      color: order.status?.toUpperCase() === 'EXECUTED' ? colors.success
                        : order.status?.toUpperCase() === 'PENDING' ? colors.warning
                        : colors.danger,
                    }
                  ]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },
  greeting: { marginBottom: spacing.xl },
  greetingLabel: { fontSize: typography.base, color: colors.textMuted },
  greetingFirm: { fontSize: typography.xxl, fontWeight: 'bold', color: colors.textPrimary, marginTop: 2 },
  grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  metricLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, flex: 1 },
  iconContainer: { padding: 7, borderRadius: radii.md },
  metricValue: { fontSize: 26, fontWeight: 'bold', color: colors.textPrimary },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    gap: spacing.md,
    ...shadows.strong,
  },
  ctaTitle: { fontSize: typography.md, fontWeight: 'bold', color: colors.white },
  ctaSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ctaBtnText: { color: colors.white, fontWeight: 'bold', fontSize: typography.sm },
  recentSection: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.md, fontWeight: 'bold', color: colors.textPrimary },
  seeAll: { fontSize: typography.sm, color: colors.primary, fontWeight: '600' },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recentOrderId: { fontSize: typography.base, fontWeight: '600', color: colors.textPrimary },
  recentDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full },
  statusText: { fontSize: 11, fontWeight: '700' },
});
