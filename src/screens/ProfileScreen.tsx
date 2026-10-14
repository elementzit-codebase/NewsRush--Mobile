import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '../components/CustomAlert';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Pencil,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { changePassword, uploadProfilePicture, removeProfilePicture } from '../api/users';
import Avatar from '../components/Avatar';

const formatDate = (value?: string) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.name || user?.email || '';

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const hasPhoto = Boolean(user?.profile_pic || user?.profilePhoto);

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess('');
    if (!currentPwd || !newPwd) {
      setPwdError('Please enter your current and new password.');
      return;
    }
    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('The two new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await changePassword({ current_password: currentPwd, new_password: newPwd });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdSuccess(res?.message || 'Password updated successfully.');
    } catch (e: any) {
      setPwdError(e.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      await uploadProfilePicture(asset.uri);
      await refreshUser();
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove Photo', 'Remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            await removeProfilePicture();
            await refreshUser();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not remove photo');
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
    ]);
  };

  const handlePhotoOptions = () => {
    const options: any[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change Photo', onPress: handlePickPhoto },
    ];
    if (hasPhoto) {
      options.push({ text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto });
    }
    Alert.alert('Profile Photo', 'Update or remove your profile picture', options);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Account Settings</Text>
          <TouchableOpacity style={styles.signOutTopBtn} onPress={handleLogout}>
            <LogOut size={14} color={Colors.error} strokeWidth={2} />
            <Text style={styles.signOutTopText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Identity Hero Card */}
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <TouchableOpacity
                onPress={handlePhotoOptions}
                disabled={uploadingPhoto}
                activeOpacity={0.8}
                style={styles.avatarContainer}
              >
                <Avatar user={user} size={64} fontSize={22} borderColor="#ffffff" borderWidth={2} />
                <View style={styles.pencilBadge}>
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Pencil size={11} color="#ffffff" strokeWidth={2.2} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.identityInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>

                <Text style={styles.userEmail} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            {/* Personal Details Aligned One Below Another */}
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Mail size={14} color={Colors.muted} strokeWidth={2} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{user?.email || '—'}</Text>
                </View>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Phone size={14} color={Colors.muted} strokeWidth={2} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{user?.phone_number || 'Not provided'}</Text>
                </View>
              </View>

              {user?.created_at && (
                <>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Calendar size={14} color={Colors.muted} strokeWidth={2} />
                    </View>
                    <View style={styles.detailTextCol}>
                      <Text style={styles.detailLabel}>Joined Date</Text>
                      <Text style={styles.detailValue}>{formatDate(user.created_at)}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Security & Password Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.lockIconBox}>
                <Lock size={16} color={Colors.brand600} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Security & Password</Text>
                <Text style={styles.sectionSub}>Update your account password regularly.</Text>
              </View>
            </View>

            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputBox}>
              <Lock size={15} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                value={currentPwd}
                onChangeText={t => {
                  setCurrentPwd(t);
                  if (pwdError) setPwdError('');
                }}
                secureTextEntry={!showCurrent}
                placeholder="Enter current password"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowCurrent(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
                accessibilityLabel={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? (
                  <EyeOff size={17} color={Colors.muted} strokeWidth={1.8} />
                ) : (
                  <Eye size={17} color={Colors.muted} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={[styles.inputBox, { marginBottom: 4 }]}>
              <Lock size={15} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                value={newPwd}
                onChangeText={t => {
                  setNewPwd(t);
                  if (pwdError) setPwdError('');
                }}
                secureTextEntry={!showNew}
                placeholder="At least 8 characters"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNew(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
                accessibilityLabel={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? (
                  <EyeOff size={17} color={Colors.muted} strokeWidth={1.8} />
                ) : (
                  <Eye size={17} color={Colors.muted} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>Must contain at least 8 characters.</Text>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputBox}>
              <Lock size={15} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                value={confirmPwd}
                onChangeText={t => {
                  setConfirmPwd(t);
                  if (pwdError) setPwdError('');
                }}
                secureTextEntry={!showConfirm}
                placeholder="Re-enter your new password"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
                accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
                  <EyeOff size={17} color={Colors.muted} strokeWidth={1.8} />
                ) : (
                  <Eye size={17} color={Colors.muted} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>

            {pwdError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={Colors.error} strokeWidth={2} />
                <Text style={styles.errorText}>{pwdError}</Text>
              </View>
            ) : null}

            {pwdSuccess ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={15} color={Colors.success} strokeWidth={2} />
                <Text style={styles.successText}>{pwdSuccess}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy900,
  },
  signOutTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  signOutTopText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 220,
    gap: 12,
  },
  identityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  pencilBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.brand500,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy900,
  },
  userEmail: {
    fontSize: 12.5,
    color: Colors.muted,
    marginTop: 2,
  },
  detailsList: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  detailIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.ink,
    marginTop: 0.5,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 38,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  lockIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.brand50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.navy900,
  },
  sectionSub: {
    fontSize: 11.5,
    color: Colors.muted,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: Colors.ink,
    paddingVertical: 0,
  },
  eyeBtn: { padding: 4 },
  hintText: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.brand500,
    borderRadius: 9,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
