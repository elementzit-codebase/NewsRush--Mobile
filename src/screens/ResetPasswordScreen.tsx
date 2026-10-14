import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { resetPassword } from '../api/auth';
import { AuthStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type Route = RouteProp<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const token = route.params?.token?.trim() || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!token) {
      setError('Password reset token is missing or invalid. Please request a new link.');
      return;
    }
    if (password.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmation) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, new_password: password });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formCard}>
            <View style={styles.doneBanner}>
              <CheckCircle2 size={20} color={Colors.success} strokeWidth={2} />
              <Text style={styles.doneBannerText}>Your password has been reset</Text>
            </View>
            <Text style={styles.doneSubtitle}>
              You can now sign in with your new password.
            </Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Go to login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backLink}>
            <ChevronLeft size={16} color={Colors.brand500} strokeWidth={2.2} />
            <Text style={styles.backText}>Back to login</Text>
          </TouchableOpacity>

          <View style={styles.formCard}>
            <View style={styles.missingIconCircle}>
              <KeyRound size={26} color={Colors.brand500} strokeWidth={2} />
            </View>
            <Text style={styles.missingTitle}>Reset link required</Text>
            <Text style={styles.missingSubtitle}>
              To set a new password, please use the reset link sent to your email address.
            </Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Request a reset link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginLinkWrap}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <ChevronLeft size={16} color={Colors.brand500} strokeWidth={2.2} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Choose a new password</Text>
            <Text style={styles.heroBody}>
              Enter at least 8 characters for your new password.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>New password</Text>
            <View style={styles.inputBox}>
              <Lock size={15} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={t => {
                  setPassword(t);
                  if (error) setError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} color={Colors.muted} strokeWidth={1.8} />
                ) : (
                  <Eye size={18} color={Colors.muted} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm new password</Text>
            <View style={styles.inputBox}>
              <Lock size={15} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="Repeat the new password"
                placeholderTextColor={Colors.textMuted}
                value={confirmation}
                onChangeText={t => {
                  setConfirmation(t);
                  if (error) setError('');
                }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeBtn}
                accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
                  <EyeOff size={18} color={Colors.muted} strokeWidth={1.8} />
                ) : (
                  <Eye size={18} color={Colors.muted} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={Colors.error} strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Reset password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLinkWrap}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 13, fontWeight: '600', color: Colors.brand500 },
  heroSection: { marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: Colors.navy900, marginBottom: 4 },
  heroBody: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 12.5, fontWeight: '600', color: Colors.ink, marginBottom: 5 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    height: 42,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: Colors.ink,
    paddingVertical: 0,
  },
  missingIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  missingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy900,
    textAlign: 'center',
    marginBottom: 6,
  },
  missingSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: Colors.error,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: Colors.navy900,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  loginLinkWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brand500,
  },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  doneBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
  },
  doneSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 16,
  },
});

