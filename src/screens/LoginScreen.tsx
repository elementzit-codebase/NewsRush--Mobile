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
import { Newspaper, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

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
          {/* Brand Header */}
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Newspaper size={20} color={Colors.brand500} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.brandTitle}>NewsRush</Text>
              <Text style={styles.brandSubtitle}>AI-Powered News Creation</Text>
            </View>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Sign in to your account</Text>
            <Text style={styles.heroBody}>
              Enter your newsroom credentials to continue.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputBox}>
              <Mail size={16} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
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

            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputBox, { marginBottom: 14 }]}>
              <Lock size={16} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
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

            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={Colors.error} strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy900,
  },
  brandSubtitle: {
    fontSize: 11,
    color: Colors.muted,
  },
  heroSection: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy900,
    marginBottom: 4,
  },
  heroBody: {
    fontSize: 13,
    color: Colors.muted,
  },
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
    marginBottom: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.ink,
    paddingVertical: 0,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    color: Colors.brand500,
    fontWeight: '600',
    marginBottom: 6,
  },
  eyeBtn: {
    padding: 4,
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
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.muted,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand500,
  },
});
