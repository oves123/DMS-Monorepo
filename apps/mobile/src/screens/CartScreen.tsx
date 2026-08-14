import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from '../lib/storage';
import api from '../lib/api';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';
import { Product, Variant } from '../types';

// Fetch function matching ProductsScreen exactly so React Query returns cached data instantly
async function fetchCatalogAndWallet() {
  const userStr = await SecureStore.getItemAsync('dms_user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);

  const [prodRes, walletRes] = await Promise.all([
    api.get('/api/products'),
    api.get(`/api/distributors/${user.user_id}/wallet`),
  ]);

  const validProducts = prodRes.data
    .filter((p: any) => p.variants && p.variants.length > 0)
    .map((p: any) => ({
      ...p,
      variants: [...p.variants].sort(
        (a: any, b: any) => (parseInt(a.pack_size) || 0) - (parseInt(b.pack_size) || 0)
      ),
    }));

  return {
    catalog: validProducts as Product[],
    walletBalance: walletRes.data?.wallet_balance || 0,
    userId: user.user_id,
  };
}

export default function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();
  
  const [orderData, setOrderData] = useState<Record<number, number>>({});
  const [applyWallet, setApplyWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the exact same queryKey so we get the cached catalog instantly
  const { data, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalogAndWallet,
  });

  const catalog = data?.catalog || [];
  const walletBalance = data?.walletBalance || 0;

  // 1. Load Draft
  useEffect(() => {
    AsyncStorage.getItem('@dms_draft_order').then((draft) => {
      if (draft) {
        try {
          setOrderData(JSON.parse(draft));
        } catch (e) {
          console.error("Failed to parse draft order", e);
        }
      }
    });
  }, []);

  // 2. Save Draft whenever it changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      AsyncStorage.setItem('@dms_draft_order', JSON.stringify(orderData));
    }, 300);
    return () => clearTimeout(timer);
  }, [orderData]);

  // Flatten catalog into just the selected items
  const cartItems = useMemo(() => {
    const items: Array<{ product: Product, variant: Variant, qty: number }> = [];
    catalog.forEach(product => {
      product.variants.forEach(variant => {
        const qty = orderData[variant.variant_id];
        if (qty && qty > 0) {
          items.push({ product, variant, qty });
        }
      });
    });
    return items;
  }, [catalog, orderData]);

  const { grandTotalQty, grandTotalValue } = useMemo(() => {
    let q = 0;
    let v = 0;
    cartItems.forEach(item => {
      q += item.qty;
      v += item.qty * (item.variant.distributor_rate || item.variant.price || 0);
    });
    return { grandTotalQty: q, grandTotalValue: Math.round(v) };
  }, [cartItems]);

  const handleQtyChange = (variantId: number, delta: number) => {
    setOrderData(prev => {
      const currentQty = prev[variantId] || 0;
      const newQty = currentQty + delta;
      const next = { ...prev };
      
      if (newQty <= 0) {
        delete next[variantId];
      } else {
        next[variantId] = newQty;
      }
      return next;
    });
  };

  const handleDelete = (variantId: number) => {
    setOrderData(prev => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  const handleSubmitOrder = async () => {
    if (grandTotalQty === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    const finalAmount = applyWallet
      ? Math.max(0, grandTotalValue - walletBalance)
      : grandTotalValue;

    Alert.alert(
      'Confirm Order',
      `Place order for ${grandTotalQty} boxes totaling ₹${finalAmount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place Order',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const userStr = await SecureStore.getItemAsync('dms_user');
              const user = JSON.parse(userStr!);

              const items = cartItems.map(item => ({
                variant_id: item.variant.variant_id,
                requested_qty: item.qty,
                price_at_order: item.variant.distributor_rate || item.variant.price || 0,
              }));

              await api.post('/api/orders', {
                distributor_id: user.user_id,
                items,
                apply_wallet: applyWallet ? 1 : 0,
              });

              Alert.alert('Success! 🎉', 'Your order has been placed successfully!');
              
              // Clean up completely
              setOrderData({});
              await AsyncStorage.removeItem('@dms_draft_order'); 
              
              // Refresh orders tab
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              
              // Pop back to root so MainTabs is active, then tab to Orders
              navigation.navigate('MainTabs'); 
              // Note: You can't directly switch tabs from stack navigation without passing params,
              // but navigating to MainTabs will at least return them to the dashboard/catalog safely.
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to place order. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyStateTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptyStateSubtitle}>Go back to add some products.</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={item => item.variant.variant_id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.cartItemCard}>
              <View style={styles.cartItemHeader}>
                <Text style={styles.productName}>{item.product.product_name || (item.product as any).name}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.variant.variant_id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.cartItemBody}>
                <View style={styles.variantDetails}>
                  <Text style={styles.variantPackSize}>{item.variant.pack_size}</Text>
                  <Text style={styles.variantPrice}>
                    ₹{(item.variant.distributor_rate || item.variant.price || 0).toFixed(2)} / box
                  </Text>
                </View>

                <View style={styles.stepperContainer}>
                  <TouchableOpacity 
                    style={styles.stepperButton} 
                    onPress={() => handleQtyChange(item.variant.variant_id, -1)}
                  >
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                  <TouchableOpacity 
                    style={styles.stepperButton} 
                    onPress={() => handleQtyChange(item.variant.variant_id, 1)}
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.itemTotalLine}>
                <Text style={styles.itemTotalLabel}>Item Total:</Text>
                <Text style={styles.itemTotalValue}>
                  ₹{(item.qty * (item.variant.distributor_rate || item.variant.price || 0)).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Sticky Bottom Bar */}
      {cartItems.length > 0 && (
        <View style={styles.bottomBar}>
          {walletBalance > 0 && (
            <TouchableOpacity
              style={[styles.walletToggle, applyWallet && styles.walletToggleActive]}
              onPress={() => setApplyWallet(!applyWallet)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="wallet" size={20} color={applyWallet ? colors.success : colors.textMuted} />
                <Text style={[styles.walletToggleText, applyWallet && styles.walletToggleTextActive]}>
                  Use Wallet (₹{walletBalance.toFixed(2)})
                </Text>
              </View>
              <Ionicons
                name={applyWallet ? 'checkbox' : 'square-outline'}
                size={22}
                color={applyWallet ? colors.success : colors.textLight}
              />
            </TouchableOpacity>
          )}

          <View style={styles.summaryContainer}>
            <View>
              <Text style={styles.summaryLabel}>Total Boxes</Text>
              <Text style={styles.summaryValue}>{grandTotalQty}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
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
            style={[styles.checkoutBtn, isSubmitting && styles.checkoutBtnDisabled]}
            onPress={handleSubmitOrder}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.checkoutBtnText}>Confirm & Place Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyStateTitle: { fontSize: typography.lg, fontWeight: 'bold', color: colors.textPrimary, marginTop: spacing.md },
  emptyStateSubtitle: { fontSize: typography.base, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
  goBackBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.md },
  goBackBtnText: { color: colors.white, fontWeight: 'bold', fontSize: typography.md },
  
  listContent: { padding: spacing.lg, paddingBottom: 24 },
  
  cartItemCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.card,
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  productName: { fontSize: typography.md, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  deleteBtn: { padding: 4 },
  
  cartItemBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  variantDetails: { flex: 1 },
  variantPackSize: { fontSize: typography.base, fontWeight: 'bold', color: colors.textPrimary },
  variantPrice: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperButton: { paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' },
  qtyText: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  
  itemTotalLine: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  itemTotalLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginRight: 8 },
  itemTotalValue: { fontSize: typography.md, fontWeight: 'bold', color: colors.textPrimary },

  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  walletToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  walletToggleActive: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  walletToggleText: { fontSize: typography.base, fontWeight: '600', color: colors.textPrimary, marginLeft: 8 },
  walletToggleTextActive: { color: colors.success },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  totalPrice: { fontSize: 20, fontWeight: 'bold', color: colors.success },
  strikethroughPrice: { fontSize: 13, color: colors.textLight, textDecorationLine: 'line-through', marginRight: 8 },
  checkoutBtn: { backgroundColor: colors.success, borderRadius: radii.md, paddingVertical: 12, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  checkoutBtnDisabled: { backgroundColor: colors.textLight },
  checkoutBtnText: { color: colors.white, fontSize: typography.base, fontWeight: 'bold' },
});
