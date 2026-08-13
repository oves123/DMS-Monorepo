import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import api from '../lib/api';
import ProductCard from '../components/ProductCard';
import { ListSkeleton } from '../components/SkeletonLoader';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';

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
    catalog: validProducts,
    walletBalance: walletRes.data?.wallet_balance || 0,
    userId: user.user_id,
  };
}

export default function ProductsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const queryClient = useQueryClient();

  const [orderData, setOrderData] = useState<Record<number, number>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
  const [applyWallet, setApplyWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalogAndWallet,
  });

  // When catalog loads, auto-expand all products
  React.useEffect(() => {
    if (data?.catalog) {
      const initial: Record<number, boolean> = {};
      data.catalog.forEach((p: any) => { initial[p.product_id] = true; });
      setExpandedProducts(initial);
    }
  }, [data?.catalog]);

  const catalog = data?.catalog || [];
  const walletBalance = data?.walletBalance || 0;
  const userId = data?.userId;

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const q = searchQuery.toLowerCase();
    return catalog.filter((p: any) =>
      (p.product_name || p.name || '').toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [catalog, searchQuery]);

  const { grandTotalQty, grandTotalValue } = useMemo(() => {
    let q = 0;
    let v = 0;
    catalog.forEach((product: any) => {
      product.variants.forEach((variant: any) => {
        const qty = orderData[variant.variant_id];
        if (qty) {
          q += qty;
          v += qty * variant.distributor_rate;
        }
      });
    });
    return { grandTotalQty: q, grandTotalValue: Math.round(v) };
  }, [orderData, catalog]);

  const handleToggle = useCallback((productId: number) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  }, []);

  const handleQtyChange = useCallback((variantId: number, value: string) => {
    const qty = parseInt(value, 10);
    setOrderData(prev => {
      const next = { ...prev };
      if (isNaN(qty) || qty <= 0) delete next[variantId];
      else next[variantId] = qty;
      return next;
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['catalog'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const handleSubmitOrder = async () => {
    if (grandTotalQty === 0) {
      Alert.alert('Empty Order', 'Please enter at least one quantity to place an order.');
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

              const items: any[] = [];
              catalog.forEach((product: any) => {
                product.variants.forEach((variant: any) => {
                  const qty = orderData[variant.variant_id];
                  if (qty) items.push({
                    variant_id: variant.variant_id,
                    requested_qty: qty,
                    price_at_order: variant.distributor_rate,
                  });
                });
              });

              await api.post('/api/orders', {
                distributor_id: user.user_id,
                items,
                apply_wallet: applyWallet ? 1 : 0,
              });

              Alert.alert('Success! 🎉', 'Your order has been placed successfully!');
              setOrderData({});
              setApplyWallet(false);
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              navigation.navigate('Orders');
            } catch {
              Alert.alert('Error', 'Failed to place order. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const ListHeader = (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or category..."
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

      {/* Wallet Banner */}
      {walletBalance > 0 && (
        <TouchableOpacity
          style={[styles.walletCard, applyWallet && styles.walletCardActive]}
          onPress={() => setApplyWallet(!applyWallet)}
          activeOpacity={0.8}
        >
          <View style={styles.walletHeader}>
            <View style={[styles.walletIconBg, { backgroundColor: applyWallet ? '#ecfdf5' : '#f1f5f9' }]}>
              <Ionicons name="wallet" size={22} color={applyWallet ? colors.success : colors.textMuted} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.walletTitle}>Use Wallet Balance</Text>
              <Text style={styles.walletAmount}>Available: ₹{parseFloat(walletBalance.toString()).toFixed(2)}</Text>
            </View>
            <Ionicons
              name={applyWallet ? 'checkbox' : 'square-outline'}
              size={24}
              color={applyWallet ? colors.success : colors.textLight}
            />
          </View>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.searchContainer} />
            <ListSkeleton count={5} />
          </View>
        ) : (
          <FlatList
            data={filteredCatalog}
            keyExtractor={(item) => item.product_id.toString()}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={ListHeader}
            keyboardShouldPersistTaps="handled"
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
                <Ionicons name="search-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyStateText}>No products found for "{searchQuery}"</Text>
              </View>
            }
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                isExpanded={!!expandedProducts[item.product_id]}
                orderData={orderData}
                onToggle={handleToggle}
                onQtyChange={handleQtyChange}
              />
            )}
          />
        )}

        {/* Sticky Bottom Bar */}
        <View style={styles.bottomBar}>
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
            style={[styles.checkoutBtn, (isSubmitting || grandTotalQty === 0) && styles.checkoutBtnDisabled]}
            onPress={handleSubmitOrder}
            disabled={isSubmitting || grandTotalQty === 0}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.checkoutBtnText}>Confirm Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 24 },
  skeletonContainer: { padding: spacing.lg },
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
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  walletCard: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  walletCardActive: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center' },
  walletIconBg: { padding: 8, borderRadius: radii.md },
  walletTitle: { fontSize: typography.md, fontWeight: 'bold', color: colors.textPrimary },
  walletAmount: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyStateText: { color: colors.textMuted, fontSize: typography.base, marginTop: 12, textAlign: 'center' },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: colors.success },
  strikethroughPrice: {
    fontSize: 15,
    color: colors.textLight,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: { backgroundColor: colors.textLight },
  checkoutBtnText: { color: colors.white, fontSize: typography.md, fontWeight: 'bold' },
});
