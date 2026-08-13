import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { SkeletonBox } from '../components/SkeletonLoader';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';
import { LedgerData } from '../types';

async function fetchLedger(): Promise<LedgerData> {
  const userStr = await SecureStore.getItemAsync('dms_user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  const response = await api.get(`/api/ledger/payment/distributor/${user.user_id}`);
  return response.data;
}

const SummaryCard = ({ label, value, bg, textColor, valueColor }: any) => (
  <View style={[styles.summaryCard, { backgroundColor: bg }]}>
    <Text style={[styles.summaryLabel, { color: textColor }]}>{label}</Text>
    <Text style={[styles.summaryValue, { color: valueColor }]}>{value}</Text>
  </View>
);

export default function LedgerScreen() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['ledger'],
    queryFn: fetchLedger,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['ledger'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const handleDownloadInvoice = async (invoiceId: number, invoiceNumber: string) => {
    setDownloadingId(invoiceId);
    try {
      const storedToken = await SecureStore.getItemAsync('dms_token');
      const fileUri = FileSystem.documentDirectory + `${invoiceNumber}.pdf`;
      const url = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001'}/api/ledger/invoice/${invoiceId}/download`;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        }
      } else {
        Alert.alert('Error', 'Failed to download invoice');
      }
    } catch {
      Alert.alert('Error', 'Network error while downloading');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={{ padding: spacing.lg }}>
          <View style={styles.summaryContainer}>
            <SkeletonBox height={80} borderRadius={radii.lg} style={{ flex: 1, marginRight: 8 }} />
            <SkeletonBox height={80} borderRadius={radii.lg} style={{ flex: 1, marginHorizontal: 4 }} />
            <SkeletonBox height={80} borderRadius={radii.lg} style={{ flex: 1, marginLeft: 8 }} />
          </View>
          <SkeletonBox height={200} borderRadius={radii.lg} style={{ marginBottom: spacing.lg }} />
          <SkeletonBox height={300} borderRadius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }

  const summary = (ledger?.summary || {}) as { total_billed?: number; total_paid?: number };
  const totalBilled = Number(summary.total_billed) || 0;
  const totalPaid = Number(summary.total_paid) || 0;
  const pending = totalBilled - totalPaid;

  // Build sections as any[] to avoid complex SectionList generic conflicts
  const sections: any[] = [];
  if ((ledger?.unpaid_invoices?.length || 0) > 0) {
    sections.push({
      title: 'Unpaid Invoices',
      icon: 'alert-circle',
      iconColor: colors.danger,
      data: ledger!.unpaid_invoices,
      type: 'invoice',
    });
  }
  sections.push({
    title: 'Payment History',
    icon: 'receipt',
    iconColor: colors.success,
    data: ledger?.recent_payments?.length ? ledger.recent_payments : [{ empty: true }],
    type: 'payment',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <SectionList
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
          <View style={styles.summaryContainer}>
            <SummaryCard
              label="Total Billed"
              value={`₹${totalBilled.toFixed(2)}`}
              bg="#f8fafc"
              textColor={colors.textMuted}
              valueColor={colors.textPrimary}
            />
            <SummaryCard
              label="Total Paid"
              value={`₹${totalPaid.toFixed(2)}`}
              bg={colors.successLight}
              textColor="#166534"
              valueColor="#15803d"
            />
            <SummaryCard
              label="Pending"
              value={`₹${pending.toFixed(2)}`}
              bg={colors.dangerLight}
              textColor="#991b1b"
              valueColor="#b91c1c"
            />
          </View>
        }
        sections={sections}
        keyExtractor={(item: any, index) =>
          item.invoice_id?.toString() || item.payment_id?.toString() || `empty-${index}`
        }
        renderSectionHeader={({ section }: any) => (
          <View style={styles.sectionHeader}>
            <Ionicons name={section.icon} size={18} color={section.iconColor} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, section }: any) => {
          if (item.empty) {
            return (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No payments recorded yet.</Text>
              </View>
            );
          }

          if ((section as any).type === 'invoice') {
            return (
              <View style={styles.listItem}>
                <View style={styles.listItemHeader}>
                  <View>
                    <Text style={styles.listItemTitle}>{item.invoice_number}</Text>
                    <Text style={styles.listItemDate}>{new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.listItemTitle, { color: colors.danger }]}>
                      ₹{(item.grand_total - (item.paid_amount || 0)).toFixed(2)}
                    </Text>
                    <Text style={styles.listItemDate}>Pending</Text>
                  </View>
                </View>
                <View style={styles.listItemMeta}>
                  <Text style={styles.metaText}>Total: ₹{item.grand_total}</Text>
                  <Text style={[styles.metaText, { color: colors.success }]}>Paid: ₹{item.paid_amount || 0}</Text>
                  <TouchableOpacity
                    style={[styles.downloadBtn, downloadingId === item.invoice_id && { opacity: 0.6 }]}
                    onPress={() => handleDownloadInvoice(item.invoice_id, item.invoice_number)}
                    disabled={downloadingId === item.invoice_id}
                  >
                    <Ionicons name="download-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.downloadBtnText}>
                      {downloadingId === item.invoice_id ? '...' : 'PDF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          // Payment row
          return (
            <View style={styles.listItem}>
              <View style={styles.listItemHeader}>
                <View>
                  <Text style={styles.listItemTitle}>{item.invoice_number}</Text>
                  <Text style={styles.listItemDate}>{item.payment_mode}{item.reference_no ? ` · ${item.reference_no}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.listItemTitle, { color: colors.success }]}>₹{item.amount.toFixed(2)}</Text>
                  <Text style={styles.listItemDate}>{new Date(item.payment_date).toLocaleDateString('en-IN')}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg },
  summaryContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  summaryValue: { fontSize: typography.lg, fontWeight: 'bold' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: typography.lg, fontWeight: 'bold', color: colors.textPrimary },
  listItem: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listItemTitle: { fontSize: typography.base, fontWeight: 'bold', color: colors.textPrimary },
  listItemDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  metaText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  emptySection: { paddingVertical: 20, alignItems: 'center' },
  emptySectionText: { color: colors.textMuted, fontSize: typography.sm },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginLeft: 'auto',
  },
  downloadBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
});
