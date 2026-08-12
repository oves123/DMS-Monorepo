import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export default function ProductsScreen() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
  const [orderData, setOrderData] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [applyWallet, setApplyWallet] = useState(false);
  
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('dms_user');
      const token = await AsyncStorage.getItem('dms_token');
      
      if (!userStr || !token) return;
      const user = JSON.parse(userStr);
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Catalog
      const prodRes = await fetch('http://localhost:5001/api/products', { headers });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const validProducts = prodData.filter((p: any) => p.variants && p.variants.length > 0);
        
        validProducts.forEach((p: any) => {
          p.variants.sort((a: any, b: any) => (parseInt(a.pack_size) || 0) - (parseInt(b.pack_size) || 0));
        });
        
        setCatalog(validProducts);
        const initialExpand: Record<number, boolean> = {};
        validProducts.forEach((p: any) => initialExpand[p.product_id] = true);
        setExpandedProducts(initialExpand);
      }

      // Fetch Wallet
      const walletRes = await fetch(`http://localhost:5001/api/distributors/${user.user_id}/wallet`, { headers });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWalletBalance(walletData.wallet_balance || 0);
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (productId: number) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleQtyChange = (variantId: number, value: string) => {
    const qty = parseInt(value, 10);
    setOrderData(prev => {
      const newData = { ...prev };
      if (isNaN(qty) || qty <= 0) {
        delete newData[variantId];
      } else {
        newData[variantId] = qty;
      }
      return newData;
    });
  };

  const { grandTotalQty, grandTotalValue } = useMemo(() => {
    let q = 0;
    let v = 0;
    catalog.forEach(product => {
      product.variants.forEach((variant: any) => {
        const qty = orderData[variant.variant_id];
        if (qty) {
          q += qty;
          v += (qty * variant.distributor_rate);
        }
      });
    });
    return { grandTotalQty: q, grandTotalValue: Math.round(v) };
  }, [orderData, catalog]);

  const handleSubmitOrder = async () => {
    if (grandTotalQty === 0) {
      Alert.alert('Error', 'Please enter at least one quantity to place an order.');
      return;
    }

    Alert.alert(
      "Confirm Order",
      `Are you sure you want to place an order for ${grandTotalQty} boxes totaling ₹${applyWallet ? Math.max(0, grandTotalValue - walletBalance).toFixed(2) : grandTotalValue.toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Place Order", 
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const userStr = await AsyncStorage.getItem('dms_user');
              const token = await AsyncStorage.getItem('dms_token');
              const user = JSON.parse(userStr!);
              
              const items: any[] = [];
              catalog.forEach(product => {
                product.variants.forEach((variant: any) => {
                  const qty = orderData[variant.variant_id];
                  if (qty) {
                    items.push({
                      variant_id: variant.variant_id,
                      requested_qty: qty,
                      price_at_order: variant.distributor_rate
                    });
                  }
                });
              });

              const response = await fetch('http://localhost:5001/api/orders', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  distributor_id: user.user_id,
                  items,
                  apply_wallet: applyWallet ? 1 : 0
                })
              });

              if (response.ok) {
                Alert.alert('Success', 'Order placed successfully!');
                setOrderData({});
                setApplyWallet(false);
                navigation.navigate('Orders');
              } else {
                Alert.alert('Error', 'Failed to place order.');
              }
            } catch (err) {
              Alert.alert('Error', 'Network error.');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {walletBalance > 0 && (
          <TouchableOpacity 
            style={[styles.walletCard, applyWallet && styles.walletCardActive]}
            onPress={() => setApplyWallet(!applyWallet)}
          >
            <View style={styles.walletHeader}>
              <Ionicons name="wallet" size={24} color={applyWallet ? "#10b981" : "#64748b"} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.walletTitle}>Use Wallet Balance</Text>
                <Text style={styles.walletAmount}>Available: ₹{parseFloat(walletBalance.toString()).toFixed(2)}</Text>
              </View>
              <Ionicons 
                name={applyWallet ? "checkbox" : "square-outline"} 
                size={24} 
                color={applyWallet ? "#10b981" : "#cbd5e1"} 
              />
            </View>
          </TouchableOpacity>
        )}

        {catalog.map(product => (
          <View key={product.product_id} style={styles.productCard}>
            <TouchableOpacity 
              style={styles.productHeader} 
              onPress={() => toggleExpand(product.product_id)}
            >
              <View style={styles.productHeaderLeft}>
                <Ionicons name={expandedProducts[product.product_id] ? "chevron-down" : "chevron-forward"} size={20} color="#64748b" />
                <View style={styles.productIconWrapper}>
                  <Ionicons name="cube-outline" size={16} color="#64748b" />
                </View>
                <Text style={styles.productName}>{product.name}</Text>
              </View>
              <View style={styles.variantCountBadge}>
                <Text style={styles.variantCountText}>{product.variants.length} Variants</Text>
              </View>
            </TouchableOpacity>

            {expandedProducts[product.product_id] && (
              <View style={styles.variantsContainer}>
                {product.variants.map((variant: any) => (
                  <View key={variant.variant_id} style={styles.variantRow}>
                    <View style={styles.variantInfo}>
                      <Text style={styles.variantPackSize}>{variant.pack_size}</Text>
                      <Text style={styles.variantPrice}>₹{variant.distributor_rate.toFixed(2)} / box</Text>
                    </View>
                    
                    <View style={styles.qtyContainer}>
                      <Text style={styles.qtyLabel}>QTY</Text>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#cbd5e1"
                        value={orderData[variant.variant_id]?.toString() || ''}
                        onChangeText={(val) => handleQtyChange(variant.variant_id, val)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Sticky Bottom Summary Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.summaryContainer}>
          <View>
            <Text style={styles.summaryLabel}>Total Boxes</Text>
            <Text style={styles.summaryValue}>{grandTotalQty}</Text>
          </View>
          <View>
            <Text style={[styles.summaryLabel, { textAlign: 'right' }]}>Grand Total</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {applyWallet && walletBalance > 0 && grandTotalValue > 0 && (
                <Text style={styles.strikethroughPrice}>₹{grandTotalValue.toFixed(2)}</Text>
              )}
              <Text style={styles.totalPrice}>
                ₹{(applyWallet ? Math.max(0, grandTotalValue - walletBalance) : grandTotalValue).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.checkoutBtn, (isSubmitting || grandTotalQty === 0) && styles.checkoutBtnDisabled]}
          onPress={handleSubmitOrder}
          disabled={isSubmitting || grandTotalQty === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutBtnText}>Confirm Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  walletCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  walletCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  walletAmount: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  productHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productIconWrapper: {
    backgroundColor: '#e2e8f0',
    padding: 6,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  variantCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  variantCountText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  variantsContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  variantInfo: {
    flex: 1,
  },
  variantPackSize: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  variantPrice: {
    fontSize: 14,
    color: '#166534',
    marginTop: 4,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 8,
  },
  qtyInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  strikethroughPrice: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  checkoutBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
