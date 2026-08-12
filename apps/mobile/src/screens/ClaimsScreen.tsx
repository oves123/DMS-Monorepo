import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function ClaimsScreen() {
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetchCreditNotes();
  }, []);

  const fetchCreditNotes = async () => {
    setIsLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('dms_user');
      const storedToken = await AsyncStorage.getItem('dms_token');
      
      if (!userStr || !storedToken) return;
      setToken(storedToken);
      const user = JSON.parse(userStr);

      const response = await fetch(`http://localhost:5001/api/ledger/credit-note/distributor/${user.user_id}`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreditNotes(data);
      }
    } catch (err) {
      console.error('Failed to fetch credit notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (cnId: number, cnNumber: string) => {
    // In React Native, the easiest way to handle PDF download securely without extra native libs 
    // is to open it in the default browser if the API allows GET auth, 
    // or handle it with expo-file-system. For now, we'll alert the user.
    Linking.openURL(`http://localhost:5001/api/ledger/credit-note/${cnId}/download`);
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
        data={creditNotes}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.credit_note_id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No claims or credit notes found.</Text>
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
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: item.is_paid_out ? '#e0e7ff' : '#dcfce7' }]}>
                <Text style={[styles.statusText, { color: item.is_paid_out ? '#4f46e5' : '#166534' }]}>
                  {item.is_paid_out ? `Refunded via ${item.payment_mode}` : 'Added to Wallet'}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <TouchableOpacity 
                style={styles.downloadBtn}
                onPress={() => handleDownload(item.credit_note_id, item.credit_note_number)}
              >
                <Ionicons name="download-outline" size={16} color="#475569" />
                <Text style={styles.downloadBtnText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cnNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  invoiceNumber: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});
