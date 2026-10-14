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
import {
  ChevronLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Phone,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { register } from '../api/auth';
import { AuthStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(digitsOnly);
    if (error) setError('');
  };

  const handleRegister = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !phoneNumber.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^\d{10}$/.test(phoneNumber)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        password,
      });
      setRegisteredEmail(email.trim());
    } catch (err: any) {
      setError(err.message || 'Could not complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (registeredEmail) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 size={28} color={Colors.success} strokeWidth={2} />
            </View>
            <Text style={styles.successTitle}>Registration received</Text>
            <Text style={styles.successSub}>Account created for {registeredEmail}</Text>
            <Text style={styles.successDesc}>
              A system user has to approve your account before you can sign in. Ask an administrator to approve you on the Users page.
            </Text>
            <TouchableOpacity
              style={[styles.submitBtn, { width: '100%' }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.submitBtnText}>Back to login</Text>
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
          {/* Back Link */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <ChevronLeft size={16} color={Colors.brand500} strokeWidth={2.2} />
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Create your account</Text>
            <Text style={styles.heroBody}>
              A system user will approve your registration before you can sign in.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First name</Text>
                <View style={styles.inputBox}>
                  <UserIcon size={15} color={Colors.muted} strokeWidth={1.8} />
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    placeholderTextColor={Colors.textMuted}
                    value={firstName}
                    onChangeText={t => {
                      setFirstName(t);
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last name</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last name"
                    placeholderTextColor={Colors.textMuted}
                    value={lastName}
                    onChangeText={t => {
                      setLastName(t);
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputBox}>
              <Mail size={15} color={Colors.muted} strokeWidth={1.8} />
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

            <Text style={styles.label}>Phone number</Text>
            <View style={styles.inputBox}>
              <Phone size={15} color={Colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.textMuted}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputBox, { marginBottom: 4 }]}>
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
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} color={Colors.muted} strokeWidth={1.8} />
                ) : (
                  <Eye size={18} color={Colors.muted} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>Must contain at least 8 characters.</Text>

            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={Colors.error} strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign in</Text>
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
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brand500,
  },
  heroSection: {
    marginBottom: 14,
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
    lineHeight: 18,
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
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    height: 42,
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
  eyeBtn: {
    padding: 4,
  },
  hintText: {
    fontSize: 11.5,
    color: Colors.muted,
    marginBottom: 12,
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
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand500,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy900,
    marginBottom: 4,
  },
  successSub: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
});
