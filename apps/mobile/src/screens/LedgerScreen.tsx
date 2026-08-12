import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function LedgerScreen() {
  const [ledger, setLedger] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('dms_user');
      const token = await AsyncStorage.getItem('dms_token');
      
      if (!userStr || !token) return;
      const user = JSON.parse(userStr);

      const response = await fetch(`http://localhost:5001/api/ledger/payment/distributor/${user.user_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLedger(data);
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
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

  const summary = ledger?.summary || {};
  const totalBilled = summary.total_billed || 0;
  const totalPaid = summary.total_paid || 0;
  const pending = totalBilled - totalPaid;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
          <Text style={styles.summaryLabel}>Total Billed</Text>
          <Text style={[styles.summaryValue, { color: '#0f172a' }]}>₹{totalBilled.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
          <Text style={[styles.summaryLabel, { color: '#166534' }]}>Total Paid</Text>
          <Text style={[styles.summaryValue, { color: '#15803d' }]}>₹{totalPaid.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
          <Text style={[styles.summaryLabel, { color: '#991b1b' }]}>Total Pending</Text>
          <Text style={[styles.summaryValue, { color: '#b91c1c' }]}>₹{pending.toFixed(2)}</Text>
        </View>
      </View>

      {/* Unpaid Invoices */}
      {ledger?.unpaid_invoices?.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Unpaid Invoices</Text>
          {ledger.unpaid_invoices.map((inv: any) => (
            <View key={inv.invoice_id} style={styles.listItem}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{inv.invoice_number}</Text>
                <Text style={styles.listDate}>{new Date(inv.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listMetric}>Total: ₹{inv.grand_total}</Text>
                <Text style={[styles.listMetric, { color: '#166534' }]}>Paid: ₹{inv.paid_amount || 0}</Text>
                <Text style={[styles.listMetric, { color: '#b91c1c' }]}>
                  Pending: ₹{(inv.grand_total - (inv.paid_amount || 0)).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Payment History */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {ledger?.recent_payments?.length === 0 ? (
          <Text style={styles.emptyText}>No payments recorded yet.</Text>
        ) : (
          ledger?.recent_payments?.map((p: any) => (
            <View key={p.payment_id} style={styles.listItem}>
              <View style={styles.listHeader}>
                <View>
                  <Text style={styles.listTitle}>{p.invoice_number}</Text>
                  <Text style={styles.listSubtitle}>{p.payment_mode} {p.reference_no ? `(${p.reference_no})` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.listTitle, { color: '#166534' }]}>₹{p.amount.toFixed(2)}</Text>
                  <Text style={styles.listDate}>{new Date(p.payment_date).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

    </ScrollView>
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
  summaryContainer: {
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  listSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  listDate: {
    fontSize: 13,
    color: '#64748b',
  },
  listBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listMetric: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  }
});
