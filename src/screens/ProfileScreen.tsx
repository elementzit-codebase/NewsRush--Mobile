import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, uploadProfilePhoto } from '../api/users';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(user?.profilePhoto || null);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleSaveProfile = async () => {
    if (newPwd && newPwd !== confirmPwd) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { name, email };
      if (newPwd) { payload.currentPassword = currentPwd; payload.newPassword = newPwd; }
      await updateProfile(payload);
      await refreshUser();
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to set profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
      allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', { uri: asset.uri, type: 'image/jpeg', name: 'profile.jpg' } as any);
      await uploadProfilePhoto(formData);
      await refreshUser();
      Alert.alert('Success', 'Profile photo updated');
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerBg}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            {uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.editBadgeText}>📷</Text>}
          </View>
        </TouchableOpacity>
        <Text style={styles.headerName}>{user?.name}</Text>
        <Text style={styles.headerEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Details</Text>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textMuted} />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <Text style={styles.label}>Current Password</Text>
        <TextInput style={styles.input} value={currentPwd} onChangeText={setCurrentPwd} secureTextEntry placeholder="Current password" placeholderTextColor={Colors.textMuted} />
        <Text style={styles.label}>New Password</Text>
        <TextInput style={styles.input} value={newPwd} onChangeText={setNewPwd} secureTextEntry placeholder="New password" placeholderTextColor={Colors.textMuted} />
        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput style={styles.input} value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry placeholder="Confirm password" placeholderTextColor={Colors.textMuted} />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBg: {
    backgroundColor: Colors.primary, alignItems: 'center',
    paddingTop: 40, paddingBottom: 28,
  },
  avatarWrap: { marginBottom: 12 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primaryDark, borderRadius: 16, width: 30, height: 30,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  editBadgeText: { fontSize: 14 },
  headerName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 2 },
  headerEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  section: { backgroundColor: Colors.surface, borderRadius: 14, margin: 16, marginBottom: 0, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14,
  },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10, borderWidth: 1.5, borderColor: Colors.error },
  logoutBtnText: { color: Colors.error, fontSize: 16, fontWeight: '700' },
});
