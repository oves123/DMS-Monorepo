import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { BarChart } from 'react-native-chart-kit';
import { SkeletonBox } from '../components/SkeletonLoader';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';
import { PurchaseDataPoint, ProductDataPoint } from '../types';

const screenWidth = Dimensions.get('window').width;

interface ReportsData {
  purchaseData: PurchaseDataPoint[];
  productData: ProductDataPoint[];
}

async function fetchReports(): Promise<ReportsData> {
  const userStr = await SecureStore.getItemAsync('dms_user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);

  const [purchasesRes, productsRes] = await Promise.all([
    api.get(`/api/reports/distributor/${user.user_id}/purchases`),
    api.get(`/api/reports/distributor/${user.user_id}/products`),
  ]);

  return {
    purchaseData: purchasesRes.data,
    productData: productsRes.data,
  };
}

const chartConfig = {
  backgroundGradientFrom: colors.white,
  backgroundGradientTo: colors.white,
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  barPercentage: 0.6,
  decimalPlaces: 0,
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: colors.border,
    strokeDasharray: '4, 4',
  },
};

const productChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
};

const EmptyChart = ({ message }: { message: string }) => (
  <View style={styles.emptyChart}>
    <Ionicons name="bar-chart-outline" size={40} color={colors.textLight} />
    <Text style={styles.emptyChartText}>{message}</Text>
  </View>
);

export default function ReportsScreen() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['reports'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const purchaseData = data?.purchaseData || [];
  const productData = data?.productData || [];

  const purchaseChartData = {
    labels: purchaseData.length > 0
      ? purchaseData.map(d => {
          const dateStr = String(d.date);
          return dateStr.length >= 7 ? dateStr.substring(5) : dateStr;
        })
      : ['No Data'],
    datasets: [{ data: purchaseData.length > 0 ? purchaseData.map(d => Number(d.amount_spent)) : [0] }],
  };

  const top5Products = productData.slice(0, 5);
  const productChartData = {
    labels: top5Products.length > 0
      ? top5Products.map(d => {
          const name = d.product_name;
          return name.length > 9 ? name.substring(0, 9) + '…' : name;
        })
      : ['No Data'],
    datasets: [{ data: top5Products.length > 0 ? top5Products.map(d => Number(d.total_bought)) : [0] }],
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonBox height={24} width="60%" style={{ marginBottom: spacing.xl }} />
          <SkeletonBox height={220} borderRadius={radii.lg} style={{ marginBottom: spacing.xl }} />
          <SkeletonBox height={220} borderRadius={radii.lg} />
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
        {/* Purchase History */}
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="trending-up" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Purchase History</Text>
              <Text style={styles.cardSubtitle}>Amount spent per period</Text>
            </View>
          </View>

          {purchaseData.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={purchaseChartData}
                width={Math.max(screenWidth - 64, purchaseData.length * 65)}
                height={210}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                fromZero
                showValuesOnTopOfBars
                style={styles.chart}
              />
            </ScrollView>
          ) : (
            <EmptyChart message="No purchase data yet. Place your first order!" />
          )}
        </View>

        {/* Top Products */}
        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: colors.successLight }]}>
              <Ionicons name="cube" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Top Ordered Products</Text>
              <Text style={styles.cardSubtitle}>Your most frequently bought items</Text>
            </View>
          </View>

          {top5Products.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={productChartData}
                width={Math.max(screenWidth - 64, top5Products.length * 70)}
                height={210}
                yAxisLabel=""
                yAxisSuffix=" qty"
                chartConfig={productChartConfig}
                verticalLabelRotation={30}
                fromZero
                showValuesOnTopOfBars
                style={styles.chart}
              />
            </ScrollView>
          ) : (
            <EmptyChart message="No product data yet." />
          )}
        </View>

        {/* Top Products Table */}
        {top5Products.length > 0 && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Product Breakdown</Text>
            {top5Products.map((p, idx) => (
              <View key={idx} style={styles.tableRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <Text style={styles.productName} numberOfLines={1}>{p.product_name}</Text>
                <Text style={styles.productQty}>{p.total_bought} qty</Text>
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
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
  },
  iconBg: { padding: 8, borderRadius: radii.md },
  cardTitle: { fontSize: typography.md, fontWeight: 'bold', color: colors.textPrimary },
  cardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  chart: { marginVertical: 4, borderRadius: radii.md },
  emptyChart: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyChartText: { color: colors.textMuted, fontSize: typography.sm, textAlign: 'center' },

  tableCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  tableTitle: {
    fontSize: typography.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  productName: { flex: 1, fontSize: typography.base, color: colors.textSecondary, fontWeight: '500' },
  productQty: { fontSize: typography.sm, fontWeight: 'bold', color: colors.textMuted },
});
