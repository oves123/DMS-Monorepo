import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import { SkeletonBox } from '../components/SkeletonLoader';
import { colors, spacing, radii, typography, shadows } from '../theme/theme';
import { DistributorProfile } from '../types';

async function fetchProfile(): Promise<DistributorProfile> {
  const userStr = await SecureStore.getItemAsync('dms_user');
  if (!userStr) throw new Error('Not authenticated');
  const user = JSON.parse(userStr);
  const response = await api.get(`/api/distributors/${user.user_id}`);
  return response.data;
}

interface InfoRowProps {
  label: string;
  value: string;
  icon: any;
}

const InfoRow = ({ label, value, icon }: InfoRowProps) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.detailIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  </View>
);

interface DocRowProps {
  label: string;
  uploaded: boolean;
}

const DocRow = ({ label, uploaded }: DocRowProps) => (
  <View style={styles.docRow}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons
        name={uploaded ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={uploaded ? colors.success : colors.textLight}
      />
      <Text style={styles.docLabel}>{label}</Text>
    </View>
    <Text style={[styles.docStatus, { color: uploaded ? colors.success : colors.textLight }]}>
      {uploaded ? 'Uploaded' : 'Pending'}
    </Text>
  </View>
);

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters.');
      return;
    }
    setIsResetting(true);
    try {
      const userStr = await SecureStore.getItemAsync('dms_user');
      const user = JSON.parse(userStr!);
      await api.put('/api/auth/reset-password', {
        user_id: user.user_id,
        new_password: newPassword,
      });
      Alert.alert('Success ✓', 'Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('dms_token');
          await SecureStore.deleteItemAsync('dms_user');
          queryClient.clear();
          navigation.replace('Login');
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonBox height={100} borderRadius={radii.lg} style={{ marginBottom: spacing.lg }} />
          <SkeletonBox height={200} borderRadius={radii.lg} style={{ marginBottom: spacing.lg }} />
          <SkeletonBox height={120} borderRadius={radii.lg} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Avatar / Firm Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {profile?.firm_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.firmName}>{profile?.firm_name}</Text>
              <Text style={styles.ownerName}>{profile?.owner_name}</Text>
            </View>
          </View>

          {/* Personal Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Personal Details</Text>
            </View>
            <InfoRow label="Firm Name" value={profile?.firm_name || ''} icon="business-outline" />
            <InfoRow label="Owner Name" value={profile?.owner_name || ''} icon="person-outline" />
            <InfoRow label="Phone Number" value={profile?.phone_number || ''} icon="call-outline" />
            <InfoRow label="Address" value={profile?.address || ''} icon="location-outline" />
            <InfoRow label="GST Number" value={profile?.gst_number || '-'} icon="document-text-outline" />
            <InfoRow label="FSSAI Number" value={profile?.fssai_number || '-'} icon="shield-checkmark-outline" />
          </View>

          {/* Documents */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="folder-open" size={20} color={colors.success} />
              <Text style={styles.cardTitle}>Documents</Text>
            </View>
            <DocRow label="PAN Card" uploaded={!!profile?.has_pan} />
            <DocRow label="Aadhar Card" uploaded={!!profile?.has_aadhar} />
            <DocRow label="Photo" uploaded={!!profile?.has_photo} />
          </View>

          {/* Quick Links */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="apps" size={20} color={colors.info} />
              <Text style={styles.cardTitle}>Tools & Options</Text>
            </View>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate('Reports')}
              activeOpacity={0.7}
            >
              <Ionicons name="bar-chart" size={18} color={colors.textSecondary} />
              <Text style={styles.linkText}>Reports & Analytics</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate('Claims')}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text" size={18} color={colors.textSecondary} />
              <Text style={styles.linkText}>Claims & Credits</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          {/* Security */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="lock-closed" size={20} color={colors.danger} />
              <Text style={styles.cardTitle}>Security</Text>
            </View>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Enter new password"
              placeholderTextColor={colors.textLight}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor={colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={[styles.btnPrimary, isResetting && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              disabled={isResetting}
              activeOpacity={0.85}
            >
              {isResetting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnPrimaryText}>Update Password</Text>}
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.btnLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: 'bold' },
  firmName: { fontSize: typography.lg, fontWeight: 'bold', color: colors.textPrimary },
  ownerName: { fontSize: typography.sm, color: colors.textMuted, marginTop: 2 },

  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
  },
  cardTitle: { fontSize: typography.lg, fontWeight: 'bold', color: colors.textPrimary },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailIcon: { marginTop: 3 },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  value: { fontSize: typography.base, fontWeight: '500', color: colors.textPrimary },

  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  docLabel: { fontSize: typography.base, color: colors.textSecondary, fontWeight: '500' },
  docStatus: { fontSize: 13, fontWeight: 'bold' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  linkText: { fontSize: typography.base, color: colors.textSecondary, fontWeight: '500' },

  inputLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    fontSize: typography.base,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  btnPrimary: {
    backgroundColor: colors.danger,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPrimaryText: { color: colors.white, fontWeight: 'bold', fontSize: typography.base },

  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dangerLight,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  btnLogoutText: { color: colors.danger, fontWeight: 'bold', fontSize: typography.md },
});
