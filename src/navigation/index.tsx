import React, { useEffect } from 'react';
import { View, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Newspaper, Users, User } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { EditionStatus } from '../types';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import WorkspaceScreen from '../screens/WorkspaceScreen';
import EditorScreen from '../screens/EditorScreen';
import SectionEditorScreen from '../screens/SectionEditorScreen';
import PrintEditionScreen from '../screens/PrintEditionScreen';
import UsersScreen from '../screens/UsersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type RootStackParamList = {
  MainTabs: undefined;
  Editor: { editionId: string | number };
  SectionEditor: {
    editionId: string | number;
    pageId?: number;
    sectionId?: number | string;
    sectionIndex?: number;
    sectionKey?: string;
    sectionName?: string;
    canonicalName?: string;
    charLimit?: number;
    initialTitle?: string;
    initialContent?: string;
    initialStatus?: string;
    editionStatus: EditionStatus;
    language?: string;
  };
  PrintEdition: { editionId: string | number };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
};

export type TabParamList = {
  Workspace: undefined;
  Users: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isSystemUser = user?.is_system_user || user?.role === 'admin';
  // On Android 15+ edge-to-edge screens, 3-button navigation overlays the bottom.
  // Ensure a floor of 28dp padding so labels/icons are never obscured by the back/home buttons.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 10);
  const tabHeight = 52 + bottomInset;

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const iconSize = size ? Math.min(size, 20) : 20;
          if (route.name === 'Workspace') {
            return <Newspaper size={iconSize} color={color} strokeWidth={2} />;
          }
          if (route.name === 'Users') {
            return <Users size={iconSize} color={color} strokeWidth={2} />;
          }
          return <User size={iconSize} color={color} strokeWidth={2} />;
        },
        tabBarActiveTintColor: Colors.brand500,
        tabBarInactiveTintColor: Colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset - 4,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Workspace" component={WorkspaceScreen} />
      {isSystemUser && <Tab.Screen name="Users" component={UsersScreen} />}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Editor" component={EditorScreen} />
      <Stack.Screen name="SectionEditor" component={SectionEditorScreen} />
      <Stack.Screen name="PrintEdition" component={PrintEditionScreen} />
    </Stack.Navigator>
  );
}

const linking = {
  prefixes: ['newsrush://', 'https://www.newsrush.elementzit.com'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      Login: 'login',
      ForgotPassword: 'forgot-password',
    },
  },
};

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const onBackPress = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigationRef]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.brand500} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {isAuthenticated ? <AppStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
