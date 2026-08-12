import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('dms_user');
      const token = await AsyncStorage.getItem('dms_token');
      
      if (!userStr || !token) return;
      const user = JSON.parse(userStr);

      const response = await fetch(`http://localhost:5001/api/distributors/${user.user_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsResetting(true);
    try {
      const userStr = await AsyncStorage.getItem('dms_user');
      const user = JSON.parse(userStr!);
      
      const response = await fetch('http://localhost:5001/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, new_password: newPassword })
      });

      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', 'Failed to update password');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('dms_token');
            await AsyncStorage.removeItem('dms_user');
            // Navigate back to Login Stack
            navigation.replace('Login');
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
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color="#2563eb" />
            <Text style={styles.cardTitle}>Personal Details</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Firm Name</Text>
            <Text style={styles.value}>{profile?.firm_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Owner Name</Text>
            <Text style={styles.value}>{profile?.owner_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.value}>{profile?.phone_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{profile?.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>GST Number</Text>
            <Text style={styles.value}>{profile?.gst_number || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>FSSAI Number</Text>
            <Text style={styles.value}>{profile?.fssai_number || '-'}</Text>
          </View>
        </View>

        {/* Documents Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Documents</Text>
          </View>

          <View style={styles.docRow}>
            <Text style={styles.docLabel}>PAN Card</Text>
            <Text style={[styles.docStatus, { color: profile?.has_pan ? '#10b981' : '#94a3b8' }]}>
              {profile?.has_pan ? 'Uploaded' : 'Pending'}
            </Text>
          </View>
          <View style={styles.docRow}>
            <Text style={styles.docLabel}>Aadhar Card</Text>
            <Text style={[styles.docStatus, { color: profile?.has_aadhar ? '#10b981' : '#94a3b8' }]}>
              {profile?.has_aadhar ? 'Uploaded' : 'Pending'}
            </Text>
          </View>
          <View style={styles.docRow}>
            <Text style={styles.docLabel}>Photo</Text>
            <Text style={[styles.docStatus, { color: profile?.has_photo ? '#10b981' : '#94a3b8' }]}>
              {profile?.has_photo ? 'Uploaded' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Security / Password */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="lock-closed" size={20} color="#ef4444" />
            <Text style={styles.cardTitle}>Security</Text>
          </View>

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={handleResetPassword}
            disabled={isResetting}
          >
            {isResetting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Update Password</Text>}
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.btnLogoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  detailRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  docLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  docStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  btnPrimary: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  btnLogoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
