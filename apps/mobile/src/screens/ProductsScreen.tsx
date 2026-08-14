import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();

  const [orderData, setOrderData] = useState<Record<number, number>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
  const [applyWallet, setApplyWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Draft Loading (syncs whenever screen comes into focus)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('@dms_draft_order').then((draft) => {
        if (draft) {
          try {
            setOrderData(JSON.parse(draft));
          } catch (e) {
            console.error("Failed to parse draft order", e);
          }
        } else {
          setOrderData({}); // Clear if draft was removed (e.g. after successful order)
        }
      });
    }, [])
  );

  // Draft Saving (throttle/debounce slightly or just use effect)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      AsyncStorage.setItem('@dms_draft_order', JSON.stringify(orderData));
    }, 500); // 500ms debounce for saving
    return () => clearTimeout(timer);
  }, [orderData]);

  // Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalogAndWallet,
  });

  const catalog = data?.catalog || [];
  const walletBalance = data?.walletBalance || 0;

  // When catalog loads for the first time, auto-expand all products
  useEffect(() => {
    if (data?.catalog && Object.keys(expandedProducts).length === 0) {
      const initial: Record<number, boolean> = {};
      data.catalog.forEach((p: any) => { initial[p.product_id] = true; });
      setExpandedProducts(initial);
    }
  }, [data?.catalog]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    catalog.forEach((p: any) => {
      if (p.category_name) cats.add(p.category_name);
    });
    return ['All', ...Array.from(cats)].sort();
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    let result = catalog;
    if (selectedCategory !== 'All') {
      result = result.filter((p: any) => p.category_name === selectedCategory);
    }
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter((p: any) =>
        (p.product_name || p.name || '').toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [catalog, debouncedSearchQuery, selectedCategory]);

  const { grandTotalQty, grandTotalValue } = useMemo(() => {
    let q = 0;
    let v = 0;
    catalog.forEach((product: any) => {
      product.variants.forEach((variant: any) => {
        const qty = orderData[variant.variant_id];
        if (qty) {
          q += qty;
          v += qty * (variant.distributor_rate || variant.price || 0);
        }
      });
    });
    return { grandTotalQty: q, grandTotalValue: Math.round(v) };
  }, [orderData, catalog]);

  const handleToggle = useCallback((productId: number) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  }, []);

  const handleToggleAll = useCallback(() => {
    const anyCollapsed = catalog.some((p: any) => !expandedProducts[p.product_id]);
    const newState: Record<number, boolean> = {};
    catalog.forEach((p: any) => {
      newState[p.product_id] = anyCollapsed;
    });
    setExpandedProducts(newState);
  }, [catalog, expandedProducts]);

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

  const handleReviewCart = () => {
    if (grandTotalQty === 0) {
      Alert.alert('Empty Cart', 'Please add at least one item before reviewing your cart.');
      return;
    }
    navigation.navigate('Cart');
  };

  const isAllExpanded = catalog.every((p: any) => expandedProducts[p.product_id]);

  const ListHeader = (
    <>
      <View style={styles.headerActions}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search catalog..."
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

        {/* Toggle All Button */}
        <TouchableOpacity style={styles.toggleAllBtn} onPress={handleToggleAll} activeOpacity={0.7}>
          <Ionicons name={isAllExpanded ? "contract" : "expand"} size={16} color={colors.primary} />
          <Text style={styles.toggleAllText}>{isAllExpanded ? "Collapse All" : "Expand All"}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <View style={styles.categoriesWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
            initialNumToRender={10}
            windowSize={5}
            removeClippedSubviews={true}
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
                <Text style={styles.emptyStateText}>
                  {searchQuery ? `No products found for "${searchQuery}"` : `No products in "${selectedCategory}"`}
                </Text>
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
            style={[styles.checkoutBtn, (grandTotalQty === 0) && styles.checkoutBtnDisabled]}
            onPress={handleReviewCart}
            disabled={grandTotalQty === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.checkoutBtnText}>Review Cart (₹{grandTotalValue.toFixed(0)})</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 24, paddingTop: spacing.sm },
  skeletonContainer: { padding: spacing.lg },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...shadows.card,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  toggleAllBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  toggleAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoriesWrapper: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    elevation: 1,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryPillTextActive: {
    color: colors.white,
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
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  totalPrice: { fontSize: 20, fontWeight: 'bold', color: colors.success },
  strikethroughPrice: {
    fontSize: 13,
    color: colors.textLight,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: { backgroundColor: colors.textLight },
  checkoutBtnText: { color: colors.white, fontSize: typography.base, fontWeight: 'bold' },
});
