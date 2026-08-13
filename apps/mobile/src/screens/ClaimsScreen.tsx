import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { ListSkeleton } from '../components/SkeletonLoader';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';
import { CreditNote } from '../types';

async function fetchCreditNotes(): Promise<CreditNote[]> {
  const userStr = await SecureStore.getItemAsync('dms_user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  const response = await api.get(`/api/ledger/credit-note/distributor/${user.user_id}`);
  return response.data;
}

export default function ClaimsScreen() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: creditNotes = [], isLoading } = useQuery({
    queryKey: ['creditNotes'],
    queryFn: fetchCreditNotes,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const handleDownload = async (cnId: number, cnNumber: string) => {
    setDownloadingId(cnId);
    try {
      const storedToken = await SecureStore.getItemAsync('dms_token');
      const fileUri = FileSystem.documentDirectory + `${cnNumber}.pdf`;
      const url = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001'}/api/ledger/credit-note/${cnId}/download`;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        }
      } else {
        Alert.alert('Download Failed', 'Could not download the credit note PDF.');
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while downloading.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={{ padding: spacing.lg }}>
            <ListSkeleton count={4} />
          </View>
        ) : (
          <FlatList
            data={creditNotes}
            keyExtractor={(item) => item.credit_note_id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyStateTitle}>No Claims Yet</Text>
                <Text style={styles.emptyStateText}>
                  Credit notes issued against your orders will appear here.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cnNumber}>{item.credit_note_number}</Text>
                    <Text style={styles.invoiceNumber}>Against: {item.invoice_number}</Text>
                  </View>
                  <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.is_paid_out ? colors.infoLight : colors.successLight }]}>
                    <Text style={[styles.statusText, { color: item.is_paid_out ? '#4f46e5' : colors.success }]}>
                      {item.is_paid_out ? `Refunded via ${item.payment_mode}` : 'Added to Wallet'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.downloadBtn, downloadingId === item.credit_note_id && styles.downloadBtnLoading]}
                  onPress={() => handleDownload(item.credit_note_id, item.credit_note_number)}
                  disabled={downloadingId === item.credit_note_id}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={downloadingId === item.credit_note_id ? 'hourglass-outline' : 'download-outline'}
                    size={15}
                    color={downloadingId === item.credit_note_id ? colors.textLight : colors.textSecondary}
                  />
                  <Text style={[styles.downloadBtnText, downloadingId === item.credit_note_id && { color: colors.textLight }]}>
                    {downloadingId === item.credit_note_id ? 'Downloading...' : 'Download PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyStateTitle: { fontSize: typography.lg, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16 },
  emptyStateText: { color: colors.textMuted, fontSize: typography.sm, marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cnNumber: { fontSize: typography.md, fontWeight: 'bold', color: colors.textPrimary },
  invoiceNumber: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  amount: { fontSize: 20, fontWeight: 'bold', color: colors.success },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.md },
  statusText: { fontSize: 12, fontWeight: '600' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  downloadBtnLoading: { borderColor: colors.border, backgroundColor: colors.borderLight },
  downloadBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
});
