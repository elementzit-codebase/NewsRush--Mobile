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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Mail, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { forgotPassword } from '../api/auth';
import { AuthStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

function extractTokenFromUrl(url?: string): string {
  if (!url) return '';
  const match = url.match(/[?&]token=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Could not send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  const extractedToken = extractTokenFromUrl(result?.reset_url);

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
            <Text style={styles.backText}>Back to login</Text>
          </TouchableOpacity>

          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              {result ? 'Check your email' : 'Forgot your password?'}
            </Text>
            <Text style={styles.heroBody}>
              {result
                ? `We generated a reset link for ${result.to_email || email}.`
                : 'Enter the email on your account and we will send a reset link.'}
            </Text>
          </View>

          {result ? (
            <View style={styles.resultCard}>
              <View style={styles.emailIconCircle}>
                <Mail size={28} color={Colors.brand500} strokeWidth={2} />
              </View>

              <Text style={styles.resultHeader}>Check your inbox</Text>
              <Text style={styles.resultBody}>
                We've sent a password reset link to:
              </Text>
              <View style={styles.emailPill}>
                <Text style={styles.emailPillText}>{result.to_email || email}</Text>
              </View>

              <View style={styles.instructionBox}>
                <View style={styles.instructionRow}>
                  <CheckCircle2 size={15} color={Colors.brand500} strokeWidth={2} style={{ marginTop: 2 }} />
                  <Text style={styles.instructionText}>
                    Tap the link in your email to choose a new password.
                  </Text>
                </View>
                <View style={styles.instructionRow}>
                  <AlertCircle size={15} color={Colors.muted} strokeWidth={2} style={{ marginTop: 2 }} />
                  <Text style={styles.instructionText}>
                    If you don't see it within a few minutes, check your spam or junk folder.
                  </Text>
                </View>
              </View>

              {result.reset_url ? (
                <View style={styles.devCard}>
                  <Text style={styles.devCardLabel}>Development Mode</Text>
                  <Text style={styles.devCardBody}>
                    Email delivery is not configured on this server. Tap below to continue directly:
                  </Text>
                  <TouchableOpacity
                    style={styles.devResetBtn}
                    onPress={() => navigation.navigate('ResetPassword', { token: extractedToken })}
                    activeOpacity={0.85}
                  >
                    <KeyRound size={15} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.devResetBtnText}>Continue to password reset</Text>
                    <ArrowRight size={15} color="#ffffff" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.backToLoginBtnText}>Back to login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputBox}>
                <Mail size={16} color={Colors.muted} strokeWidth={1.8} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={t => {
                    setEmail(t);
                    if (error) setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
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
                  <Text style={styles.submitBtnText}>Send reset link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.cancelLinkText}>Return to login</Text>
              </TouchableOpacity>
            </View>
          )}
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
  heroBody: { fontSize: 13, color: Colors.muted, lineHeight: 19 },
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
  label: { fontSize: 12.5, fontWeight: '600', color: Colors.ink, marginBottom: 6 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#ffffff',
    marginBottom: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.ink,
    paddingVertical: 0,
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
  cancelLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.muted,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  emailIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultHeader: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.navy900,
    marginBottom: 6,
    textAlign: 'center',
  },
  resultBody: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  emailPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  instructionBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: Colors.ink,
    lineHeight: 17,
  },
  devCard: {
    width: '100%',
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  devCardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78350f',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  devCardBody: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
    marginBottom: 10,
  },
  devResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.brand500,
    borderRadius: 8,
    height: 38,
  },
  devResetBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  backToLoginBtn: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  backToLoginBtnText: {
    color: Colors.ink,
    fontSize: 13.5,
    fontWeight: '600',
  },
});
