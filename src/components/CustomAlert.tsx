import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert as RNAlert,
} from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  LogOut,
  Trash2,
  Camera,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
}

type AlertListener = (state: AlertState) => void;
let alertListener: AlertListener | null = null;

export const CustomAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => {
    if (alertListener) {
      alertListener({
        visible: true,
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
        options,
      });
    } else {
      // Fallback to native alert if component is not mounted
      RNAlert.alert(title, message, buttons as any, options);
    }
  },
};

// Aliased export for seamless drop-in replacement: import { Alert } from '../components/CustomAlert'
export const Alert = CustomAlert;

export function CustomAlertModal() {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
  });

  useEffect(() => {
    alertListener = (state: AlertState) => {
      setAlert(state);
    };
    return () => {
      alertListener = null;
    };
  }, []);

  if (!alert.visible) return null;

  const handleDismiss = () => {
    if (alert.options?.cancelable === false) return;
    setAlert(prev => ({ ...prev, visible: false }));
    alert.options?.onDismiss?.();
  };

  const handleButtonPress = (btn: AlertButton) => {
    setAlert(prev => ({ ...prev, visible: false }));
    btn.onPress?.();
  };

  // Determine icon and color scheme based on title and buttons
  const titleLower = alert.title.toLowerCase();
  const isSignOut = titleLower.includes('sign out') || titleLower.includes('logout');
  const isDelete =
    titleLower.includes('delete') ||
    titleLower.includes('remove') ||
    titleLower.includes('discard') ||
    titleLower.includes('reject');
  const isError = titleLower.includes('error') || titleLower.includes('failed');
  const isSuccess =
    titleLower.includes('success') ||
    titleLower.includes('updated') ||
    titleLower.includes('completed');
  const isPhoto = titleLower.includes('photo') || titleLower.includes('camera');
  const isDestructive =
    isSignOut ||
    isDelete ||
    alert.buttons?.some(b => b.style === 'destructive');

  let IconComponent = Info;
  let iconColor = Colors.brand500;
  let iconBg = '#eff6ff';
  let iconBorder = '#bfdbfe';

  if (isSignOut) {
    IconComponent = LogOut;
    iconColor = '#dc2626';
    iconBg = '#fef2f2';
    iconBorder = '#fecaca';
  } else if (isDelete) {
    IconComponent = Trash2;
    iconColor = '#dc2626';
    iconBg = '#fef2f2';
    iconBorder = '#fecaca';
  } else if (isError) {
    IconComponent = AlertCircle;
    iconColor = '#dc2626';
    iconBg = '#fef2f2';
    iconBorder = '#fecaca';
  } else if (isSuccess) {
    IconComponent = CheckCircle2;
    iconColor = '#059669';
    iconBg = '#ecfdf5';
    iconBorder = '#a7f3d0';
  } else if (isPhoto) {
    IconComponent = Camera;
    iconColor = Colors.brand500;
    iconBg = '#eff6ff';
    iconBorder = '#bfdbfe';
  } else if (isDestructive) {
    IconComponent = AlertTriangle;
    iconColor = '#dc2626';
    iconBg = '#fef2f2';
    iconBorder = '#fecaca';
  }

  const buttons = alert.buttons || [{ text: 'OK' }];
  const isTwoButtons = buttons.length === 2;
  const isMultiButtons = buttons.length > 2;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={alert.visible}
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          {/* Header Icon Pill */}
          <View style={[styles.iconCircle, { backgroundColor: iconBg, borderColor: iconBorder }]}>
            <IconComponent size={22} color={iconColor} strokeWidth={2.3} />
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{alert.title}</Text>
          {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}

          {/* Action Buttons */}
          {isTwoButtons ? (
            <View style={styles.twoButtonRow}>
              {buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel';
                const isBtnDestructive = btn.style === 'destructive' || (!isCancel && isDestructive);

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.btnBase,
                      isCancel
                        ? styles.cancelBtn
                        : isBtnDestructive
                        ? styles.destructiveBtn
                        : styles.primaryBtn,
                    ]}
                    onPress={() => handleButtonPress(btn)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isCancel
                          ? styles.cancelBtnText
                          : styles.primaryBtnText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : isMultiButtons ? (
            <View style={styles.multiButtonCol}>
              {buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel';
                const isBtnDestructive = btn.style === 'destructive';

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.multiBtnBase,
                      isCancel
                        ? styles.cancelBtn
                        : isBtnDestructive
                        ? styles.destructiveBtn
                        : styles.optionBtn,
                    ]}
                    onPress={() => handleButtonPress(btn)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isCancel
                          ? styles.cancelBtnText
                          : isBtnDestructive
                          ? styles.primaryBtnText
                          : styles.optionBtnText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.singleBtn,
                isDestructive ? styles.destructiveBtn : styles.primaryBtn,
              ]}
              onPress={() => handleButtonPress(buttons[0])}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>{buttons[0].text || 'OK'}</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 23, 48, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  twoButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 2,
  },
  btnBase: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  singleBtn: {
    width: '100%',
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: Colors.navy900,
  },
  destructiveBtn: {
    backgroundColor: '#dc2626',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionBtn: {
    backgroundColor: Colors.brand50,
    borderWidth: 1,
    borderColor: Colors.brand100,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  cancelBtnText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '600',
  },
  optionBtnText: {
    color: Colors.brand600,
    fontSize: 13.5,
    fontWeight: '600',
  },
  btnText: {
    textAlign: 'center',
  },
  multiButtonCol: {
    width: '100%',
    gap: 8,
    marginTop: 2,
  },
  multiBtnBase: {
    width: '100%',
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});

