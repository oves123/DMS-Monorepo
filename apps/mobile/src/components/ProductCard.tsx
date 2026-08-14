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

const VariantRow = memo(({ variant, qty, onQtyChange }: VariantRowProps) => {
  const handleIncrement = () => {
    onQtyChange(variant.variant_id, String((qty || 0) + 1));
  };

  const handleDecrement = () => {
    if (qty > 0) {
      onQtyChange(variant.variant_id, String(qty - 1));
    }
  };

  return (
    <View style={styles.variantRow}>
      <View style={styles.variantInfo}>
        <Text style={styles.variantPackSize}>{variant.pack_size}</Text>
        <Text style={styles.variantPrice}>₹{variant.distributor_rate?.toFixed(2)} / box</Text>
      </View>
      <View style={styles.qtyContainer}>
        <TouchableOpacity 
          style={[styles.stepperButton, (qty === 0 || !qty) && styles.stepperDisabled]} 
          onPress={handleDecrement}
          disabled={!qty || qty === 0}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={20} color={(qty === 0 || !qty) ? colors.textLight : colors.primary} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.qtyInput}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textLight}
          value={qty?.toString() || ''}
          onChangeText={(val) => onQtyChange(variant.variant_id, val)}
          selectTextOnFocus
        />

        <TouchableOpacity 
          style={styles.stepperButton} 
          onPress={handleIncrement}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

interface ProductCardProps {
  product: Product;
  isExpanded: boolean;
  orderData: Record<number, number>;
  onToggle: (productId: number) => void;
  onQtyChange: (variantId: number, value: string) => void;
}

const ProductCard = memo(({ product, isExpanded, orderData, onToggle, onQtyChange }: ProductCardProps) => {
  const hasOrders = product.variants.some(v => orderData[v.variant_id] > 0);

  let productTotal = 0;
  product.variants.forEach(v => {
    if (orderData[v.variant_id]) {
      productTotal += orderData[v.variant_id] * (v.distributor_rate || v.price || 0);
    }
  });

  return (
    <View style={[styles.productCard, hasOrders && styles.productCardActive]}>
      <TouchableOpacity
        style={[styles.productHeader, hasOrders && styles.productHeaderActive]}
        onPress={() => onToggle(product.product_id)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeaderLeft}>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={hasOrders ? colors.success : colors.textMuted}
          />
          <View style={[styles.productIconWrapper, hasOrders && styles.productIconWrapperActive]}>
            <Ionicons 
              name={hasOrders ? "cube" : "cube-outline"} 
              size={16} 
              color={hasOrders ? colors.success : colors.textMuted} 
            />
          </View>
          <Text style={[styles.productName, hasOrders && styles.productNameActive]} numberOfLines={1}>
            {product.product_name || (product as any).name}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {hasOrders && (
            <Text style={styles.productTotalText}>₹{productTotal.toFixed(0)}</Text>
          )}
          <View style={[styles.variantCountBadge, hasOrders && styles.variantCountBadgeActive]}>
            <Text style={[styles.variantCountText, hasOrders && styles.variantCountTextActive]}>
              {product.variants.length} Var
            </Text>
          </View>
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
    borderColor: colors.success,
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
  productHeaderActive: {
    backgroundColor: '#f0fdf4',
    borderBottomColor: '#dcfce7',
  },
  productHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  productIconWrapper: {
    backgroundColor: colors.border,
    padding: 6,
    borderRadius: radii.sm,
    marginHorizontal: spacing.sm,
  },
  productIconWrapperActive: {
    backgroundColor: '#dcfce7',
  },
  productName: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  productNameActive: {
    color: '#166534',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productTotalText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.success,
  },
  variantCountBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  variantCountBadgeActive: {
    backgroundColor: '#166534',
  },
  variantCountText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  variantCountTextActive: {
    color: colors.white,
  },
  variantsContainer: {
    padding: spacing.md,
    paddingTop: 8,
    backgroundColor: colors.white,
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  variantInfo: {
    flex: 1,
    paddingRight: 10,
  },
  variantPackSize: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  variantPrice: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperDisabled: {
    opacity: 0.4,
  },
  qtyInput: {
    width: 44,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
  },
});
