import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { forgotPassword } from '../api/auth';
import { AuthStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      setResult(res);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send reset link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backText}>‹ Back to Sign In</Text>
        </TouchableOpacity>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Forgot your password?</Text>
          <Text style={styles.heroBody}>
            Enter the email on your account and we will send a reset link.
          </Text>
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Check your email</Text>
            <Text style={styles.resultText}>
              We generated a reset link for {result.to_email || email}. The link expires in {result.expires_in_minutes || 60} minutes.
            </Text>
            {result.reset_url && (
              <View style={styles.urlBox}>
                <Text style={styles.urlLabel}>Generated Reset URL:</Text>
                <Text style={styles.urlText} selectable>{result.reset_url}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.submitBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingTop: 50, paddingBottom: 40 },
  backLink: { marginBottom: 20 },
  backText: { fontSize: 15, fontWeight: '600', color: Colors.brand500 },
  heroSection: { marginBottom: 24 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: Colors.navy900, marginBottom: 6 },
  heroBody: { fontSize: 15, color: Colors.muted, lineHeight: 22 },
  formCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.shadow,
    shadowOpacity: 1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  label: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.ink, backgroundColor: '#ffffff', marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: Colors.navy900, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  resultTitle: { fontSize: 20, fontWeight: '800', color: Colors.navy900, marginBottom: 8 },
  resultText: { fontSize: 14, color: Colors.muted, lineHeight: 20, marginBottom: 16 },
  urlBox: {
    backgroundColor: Colors.warningLight, borderWidth: 1, borderColor: Colors.warningBorder,
    borderRadius: 10, padding: 12, marginBottom: 20,
  },
  urlLabel: { fontSize: 12, fontWeight: '700', color: Colors.warning, marginBottom: 4 },
  urlText: { fontSize: 12, color: Colors.ink },
});
