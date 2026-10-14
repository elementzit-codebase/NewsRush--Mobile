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
              <View style={styles.expiryRow}>
                <CheckCircle2 size={16} color={Colors.success} strokeWidth={2} />
                <Text style={styles.resultText}>
                  The link expires in {result.expires_in_minutes || 30} minutes.
                </Text>
              </View>

              {result.reset_url ? (
                <View style={styles.urlBox}>
                  <Text style={styles.urlLabel}>Reset link</Text>
                  <Text style={styles.urlHint}>
                    Shown here because the server returned it directly — tap below to reset your password now.
                  </Text>
                  <Text style={styles.urlText} selectable numberOfLines={2}>
                    {result.reset_url}
                  </Text>
                  <TouchableOpacity
                    style={styles.resetNowBtn}
                    onPress={() =>
                      navigation.navigate('ResetPassword', { token: extractedToken })
                    }
                    activeOpacity={0.85}
                  >
                    <KeyRound size={15} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.resetNowBtnText}>Reset password now</Text>
                    <ArrowRight size={15} color="#ffffff" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.resetNowBtn, { marginBottom: 12 }]}
                  onPress={() => navigation.navigate('ResetPassword', { token: '' })}
                  activeOpacity={0.85}
                >
                  <KeyRound size={15} color="#ffffff" strokeWidth={2} />
                  <Text style={styles.resetNowBtnText}>Enter reset token</Text>
                  <ArrowRight size={15} color="#ffffff" strokeWidth={2} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.secondaryBtnText}>Back to login</Text>
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
                style={styles.haveTokenLink}
                onPress={() => navigation.navigate('ResetPassword', { token: '' })}
              >
                <Text style={styles.haveTokenText}>Already have a reset token? Enter it here</Text>
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
  haveTokenLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  haveTokenText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.brand500,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  resultText: { fontSize: 13, color: Colors.ink, fontWeight: '500', flex: 1 },
  urlBox: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  urlLabel: { fontSize: 12.5, fontWeight: '700', color: '#78350f', marginBottom: 2 },
  urlHint: { fontSize: 11.5, color: '#92400e', lineHeight: 16, marginBottom: 8 },
  urlText: {
    fontSize: 11.5,
    color: Colors.brand600,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resetNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.brand500,
    borderRadius: 9,
    height: 40,
  },
  resetNowBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.ink,
    fontSize: 13.5,
    fontWeight: '600',
  },
});
