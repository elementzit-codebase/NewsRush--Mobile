import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation';
import { CustomAlertModal } from './src/components/CustomAlert';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
        <CustomAlertModal />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
