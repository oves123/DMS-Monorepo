import React, { useState, useCallback, useEffect } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
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

const EditInfoRow = ({ label, value, icon, onChange, isEditing }: any) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.detailIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={styles.editInput}
          value={value}
          onChangeText={onChange}
          placeholder={`Enter ${label}`}
          placeholderTextColor={colors.textLight}
        />
      ) : (
        <Text style={styles.value}>{value || '-'}</Text>
      )}
    </View>
  </View>
);

const EditDocRow = ({ label, type, isEditing, profileUploaded, newDoc, onPick, onDelete }: any) => {
  const isCurrentlyUploaded = profileUploaded && !newDoc?.deleted;
  const hasNewDoc = !!newDoc?.file;

  return (
    <View style={styles.docRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons
          name={isCurrentlyUploaded || hasNewDoc ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color={isCurrentlyUploaded || hasNewDoc ? colors.success : colors.textLight}
        />
        <Text style={styles.docLabel}>{label}</Text>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {hasNewDoc ? (
          <Text style={[styles.docStatus, { color: colors.info }]}>Selected</Text>
        ) : (
          <Text style={[styles.docStatus, { color: isCurrentlyUploaded ? colors.success : colors.textLight }]}>
            {isCurrentlyUploaded ? 'Uploaded' : 'Pending'}
          </Text>
        )}

        {isEditing && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => onPick(type)} style={styles.iconBtn}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            {(isCurrentlyUploaded || hasNewDoc) && (
              <TouchableOpacity onPress={() => onDelete(type)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [newDocs, setNewDocs] = useState<Record<string, { file?: any; deleted?: boolean }>>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  // Initialize form data when profile loads or edit mode is toggled off
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        firm_name: profile.firm_name || '',
        owner_name: profile.owner_name || '',
        phone_number: profile.phone_number || '',
        address: profile.address || '',
        gst_number: profile.gst_number || '',
        fssai_number: profile.fssai_number || '',
      });
      setNewDocs({});
    }
  }, [profile, isEditing]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    setIsRefreshing(false);
  }, [queryClient]);

  const handlePickDocument = async (type: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: type === 'photo' ? 'image/*' : '*/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewDocs(prev => ({
          ...prev,
          [type]: { file: result.assets[0], deleted: false }
        }));
      }
    } catch (err) {
      console.error('Error picking document', err);
    }
  };

  const handleDeleteDocument = (type: string) => {
    setNewDocs(prev => ({
      ...prev,
      [type]: { deleted: true }
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const userStr = await SecureStore.getItemAsync('dms_user');
      const user = JSON.parse(userStr!);
      
      const payload = new FormData();
      payload.append('firm_name', formData.firm_name);
      payload.append('owner_name', formData.owner_name);
      payload.append('phone_number', formData.phone_number);
      payload.append('address', formData.address);
      payload.append('gst_number', formData.gst_number);
      payload.append('fssai_number', formData.fssai_number);

      // Handle Files
      if (newDocs.pan?.file) {
        payload.append('panFile', {
          uri: newDocs.pan.file.uri,
          name: newDocs.pan.file.name,
          type: newDocs.pan.file.mimeType || 'application/octet-stream',
        } as any);
      } else if (newDocs.pan?.deleted) {
        payload.append('deletePan', 'true');
      }

      if (newDocs.aadhar?.file) {
        payload.append('aadharFile', {
          uri: newDocs.aadhar.file.uri,
          name: newDocs.aadhar.file.name,
          type: newDocs.aadhar.file.mimeType || 'application/octet-stream',
        } as any);
      } else if (newDocs.aadhar?.deleted) {
        payload.append('deleteAadhar', 'true');
      }

      if (newDocs.photo?.file) {
        payload.append('photoFile', {
          uri: newDocs.photo.file.uri,
          name: newDocs.photo.file.name,
          type: newDocs.photo.file.mimeType || 'image/jpeg',
        } as any);
      } else if (newDocs.photo?.deleted) {
        payload.append('deletePhoto', 'true');
      }

      await api.put(`/api/distributors/${user.user_id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

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
            <TouchableOpacity 
              onPress={() => setIsEditing(!isEditing)}
              style={[styles.editModeBtn, isEditing && styles.editModeBtnActive]}
            >
              <Ionicons name={isEditing ? 'close' : 'pencil'} size={18} color={isEditing ? colors.danger : colors.primary} />
              <Text style={[styles.editModeBtnText, isEditing && { color: colors.danger }]}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Personal Details */}
          <View style={[styles.card, isEditing && styles.cardEditing]}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Personal Details</Text>
            </View>
            <EditInfoRow 
              label="Firm Name" 
              icon="business-outline" 
              isEditing={isEditing}
              value={isEditing ? formData.firm_name : profile?.firm_name} 
              onChange={(t: string) => setFormData({...formData, firm_name: t})}
            />
            <EditInfoRow 
              label="Owner Name" 
              icon="person-outline" 
              isEditing={isEditing}
              value={isEditing ? formData.owner_name : profile?.owner_name} 
              onChange={(t: string) => setFormData({...formData, owner_name: t})}
            />
            <EditInfoRow 
              label="Phone Number" 
              icon="call-outline" 
              isEditing={isEditing}
              value={isEditing ? formData.phone_number : profile?.phone_number} 
              onChange={(t: string) => setFormData({...formData, phone_number: t})}
            />
            <EditInfoRow 
              label="Address" 
              icon="location-outline" 
              isEditing={isEditing}
              value={isEditing ? formData.address : profile?.address} 
              onChange={(t: string) => setFormData({...formData, address: t})}
            />
            <EditInfoRow 
              label="GST Number" 
              icon="document-text-outline" 
              isEditing={isEditing}
              value={isEditing ? formData.gst_number : profile?.gst_number} 
              onChange={(t: string) => setFormData({...formData, gst_number: t})}
            />
            <EditInfoRow 
              label="FSSAI Number" 
              icon="shield-checkmark-outline" 
              isEditing={isEditing}
              value={isEditing ? formData.fssai_number : profile?.fssai_number} 
              onChange={(t: string) => setFormData({...formData, fssai_number: t})}
            />
          </View>

          {/* Documents */}
          <View style={[styles.card, isEditing && styles.cardEditing]}>
            <View style={styles.cardHeader}>
              <Ionicons name="folder-open" size={20} color={colors.success} />
              <Text style={styles.cardTitle}>Documents</Text>
            </View>
            <EditDocRow 
              label="PAN Card" 
              type="pan"
              isEditing={isEditing}
              profileUploaded={!!profile?.has_pan}
              newDoc={newDocs.pan}
              onPick={handlePickDocument}
              onDelete={handleDeleteDocument}
            />
            <EditDocRow 
              label="Aadhar Card" 
              type="aadhar"
              isEditing={isEditing}
              profileUploaded={!!profile?.has_aadhar}
              newDoc={newDocs.aadhar}
              onPick={handlePickDocument}
              onDelete={handleDeleteDocument}
            />
            <EditDocRow 
              label="Photo" 
              type="photo"
              isEditing={isEditing}
              profileUploaded={!!profile?.has_photo}
              newDoc={newDocs.photo}
              onPick={handlePickDocument}
              onDelete={handleDeleteDocument}
            />
          </View>

          {isEditing && (
            <TouchableOpacity 
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} 
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Quick Links */}
          {!isEditing && (
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
          )}

          {/* Security */}
          {!isEditing && (
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
          )}

          {/* Logout */}
          {!isEditing && (
            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.btnLogoutText}>Log Out</Text>
            </TouchableOpacity>
          )}
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
  
  editModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  editModeBtnActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  editModeBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardEditing: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
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
  
  editInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
    fontSize: typography.base,
    color: colors.textPrimary,
    fontWeight: '500',
  },

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
  
  iconBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: radii.full,
  },

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
  
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: 8,
    marginBottom: 24,
    ...shadows.card,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: typography.md,
  },
});
