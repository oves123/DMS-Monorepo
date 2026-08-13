import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';

interface VariantRowProps {
  variant: any;
  qty: number;
  onQtyChange: (variantId: number, value: string) => void;
}

const VariantRow = memo(({ variant, qty, onQtyChange }: VariantRowProps) => (
  <View style={styles.variantRow}>
    <View style={styles.variantInfo}>
      <Text style={styles.variantPackSize}>{variant.pack_size}</Text>
      <Text style={styles.variantPrice}>₹{variant.distributor_rate?.toFixed(2)} / box</Text>
    </View>
    <View style={styles.qtyContainer}>
      <Text style={styles.qtyLabel}>QTY</Text>
      <TextInput
        style={styles.qtyInput}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.textLight}
        value={qty?.toString() || ''}
        onChangeText={(val) => onQtyChange(variant.variant_id, val)}
      />
    </View>
  </View>
));

interface ProductCardProps {
  product: Product;
  isExpanded: boolean;
  orderData: Record<number, number>;
  onToggle: (productId: number) => void;
  onQtyChange: (variantId: number, value: string) => void;
}

const ProductCard = memo(({ product, isExpanded, orderData, onToggle, onQtyChange }: ProductCardProps) => {
  const hasOrders = product.variants.some(v => orderData[v.variant_id] > 0);

  return (
    <View style={[styles.productCard, hasOrders && styles.productCardActive]}>
      <TouchableOpacity
        style={styles.productHeader}
        onPress={() => onToggle(product.product_id)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeaderLeft}>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={colors.textMuted}
          />
          <View style={styles.productIconWrapper}>
            <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
          </View>
          <Text style={styles.productName} numberOfLines={1}>{product.product_name || (product as any).name}</Text>
        </View>
        <View style={styles.variantCountBadge}>
          {hasOrders && <View style={styles.activeDot} />}
          <Text style={styles.variantCountText}>{product.variants.length} Var</Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.variantsContainer}>
          {product.variants.map((variant) => (
            <VariantRow
              key={variant.variant_id}
              variant={variant}
              qty={orderData[variant.variant_id]}
              onQtyChange={onQtyChange}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default ProductCard;

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  productCardActive: {
    borderColor: colors.primaryLight,
    borderWidth: 1.5,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productIconWrapper: {
    backgroundColor: colors.border,
    padding: 6,
    borderRadius: radii.sm,
    marginHorizontal: spacing.sm,
  },
  productName: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  variantCountBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  variantCountText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  variantsContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  variantInfo: {
    flex: 1,
  },
  variantPackSize: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  variantPrice: {
    fontSize: 13,
    color: colors.success,
    marginTop: 4,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    marginRight: spacing.sm,
    letterSpacing: 0.5,
  },
  qtyInput: {
    width: 60,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: typography.md,
    fontWeight: 'bold',
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
});
