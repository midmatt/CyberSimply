// Type declarations for packages that don't have @types packages available

declare module '@expo/vector-icons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export class Ionicons extends Component<IconProps> {}
  export class MaterialIcons extends Component<IconProps> {}
  export class FontAwesome extends Component<IconProps> {}
  export class FontAwesome5 extends Component<IconProps> {}
  export class AntDesign extends Component<IconProps> {}
  export class Entypo extends Component<IconProps> {}
  export class EvilIcons extends Component<IconProps> {}
  export class Feather extends Component<IconProps> {}
  export class Foundation extends Component<IconProps> {}
  export class MaterialCommunityIcons extends Component<IconProps> {}
  export class Octicons extends Component<IconProps> {}
  export class SimpleLineIcons extends Component<IconProps> {}
  export class Zocial extends Component<IconProps> {}
}

declare module 'react-native-safe-area-context' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface SafeAreaProviderProps extends ViewProps {
    children: React.ReactNode;
  }

  export interface SafeAreaViewProps extends ViewProps {
    children: React.ReactNode;
    edges?: ('top' | 'right' | 'bottom' | 'left')[];
  }

  export class SafeAreaProvider extends Component<SafeAreaProviderProps> {}
  export class SafeAreaView extends Component<SafeAreaViewProps> {}

  export function useSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  export function useSafeAreaFrame(): {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

declare module '@react-navigation/native' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface NavigationContainerProps extends ViewProps {
    children: React.ReactNode;
    onReady?: () => void;
    onStateChange?: (state: any) => void;
  }

  export class NavigationContainer extends Component<NavigationContainerProps> {}

  export function useNavigation<T = any>(): T;
  export function useRoute<T = any>(): T;
  export function useFocusEffect(effect: () => void | (() => void)): void;

  export interface RouteProp<T, K extends keyof T> {
    key: string;
    name: K;
    params: T[K];
  }
}

declare module '@react-navigation/stack' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface StackNavigatorProps {
    children: React.ReactNode;
  }

  export function createStackNavigator(): any;
  export function StackScreenProps(): any;

  export interface StackNavigationProp<T, K extends keyof T = keyof T> {
    navigate(screen: K, params?: T[K]): void;
    goBack(): void;
    reset(state: any): void;
    setParams(params: Partial<T[K]>): void;
    dispatch(action: any): void;
    canGoBack(): boolean;
    isFocused(): boolean;
    addListener(type: string, callback: (e: any) => void): () => void;
    removeListener(type: string, callback: (e: any) => void): void;
  }
}

declare module '@react-navigation/bottom-tabs' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface BottomTabNavigatorProps {
    children: React.ReactNode;
  }

  export function createBottomTabNavigator(): any;
  export function BottomTabScreenProps(): any;
}

declare module 'react-native-bootsplash' {
  export function hide(): Promise<void>;
  export function show(): Promise<void>;
  export function isVisible(): Promise<boolean>;
}

declare module 'react-native-vector-icons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export class Ionicons extends Component<IconProps> {}
  export class MaterialIcons extends Component<IconProps> {}
  export class FontAwesome extends Component<IconProps> {}
  export class FontAwesome5 extends Component<IconProps> {}
  export class AntDesign extends Component<IconProps> {}
  export class Entypo extends Component<IconProps> {}
  export class EvilIcons extends Component<IconProps> {}
  export class Feather extends Component<IconProps> {}
  export class Foundation extends Component<IconProps> {}
  export class MaterialCommunityIcons extends Component<IconProps> {}
  export class Octicons extends Component<IconProps> {}
  export class SimpleLineIcons extends Component<IconProps> {}
  export class Zocial extends Component<IconProps> {}
}

declare module 'react-native-iap' {
  export function initConnection(): Promise<boolean>;
  export function endConnection(): Promise<boolean>;
  export function getProducts(productIds: string[]): Promise<any[]>;
  export function getSubscriptions(subscriptionIds: string[]): Promise<any[]>;
  export function requestPurchase(productId: string): Promise<any>;
  export function requestSubscription(productId: string): Promise<any>;
  export function finishTransaction(transaction: any): Promise<void>;
  export function getAvailablePurchases(): Promise<any[]>;
  export function getPurchaseHistory(): Promise<any[]>;
  export function clearTransactionIOS(): Promise<void>;
  export function clearProductsIOS(): Promise<void>;
  export function validateReceiptIos(receiptBody: any, isTest?: boolean): Promise<any>;
  export function validateReceiptAndroid(packageName: string, productId: string, productToken: string, accessToken: string, isSubscription?: boolean): Promise<any>;
}

declare module 'expo-in-app-purchases' {
  export function connectAsync(): Promise<void>;
  export function disconnectAsync(): Promise<void>;
  export function getProductsAsync(productIds: string[]): Promise<any[]>;
  export function getPurchaseHistoryAsync(): Promise<any[]>;
  export function purchaseItemAsync(productId: string): Promise<any>;
  export function finishTransactionAsync(purchase: any): Promise<void>;
}

declare module 'expo-notifications' {
  export function getPermissionsAsync(): Promise<any>;
  export function requestPermissionsAsync(): Promise<any>;
  export function scheduleNotificationAsync(notification: any): Promise<string>;
  export function cancelScheduledNotificationAsync(notificationId: string): Promise<void>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
  export function getPresentedNotificationsAsync(): Promise<any[]>;
  export function dismissNotificationAsync(notificationId: string): Promise<void>;
  export function dismissAllNotificationsAsync(): Promise<void>;
  export function setNotificationHandler(handler: any): void;
  export function addNotificationReceivedListener(listener: any): any;
  export function addNotificationResponseReceivedListener(listener: any): any;
  export function removeNotificationSubscription(subscription: any): void;
  export function setNotificationChannelAsync(channelId: string, channel: any): Promise<void>;
  export function getExpoPushTokenAsync(): Promise<string>;
  export function getAllScheduledNotificationsAsync(): Promise<any[]>;
  
  export const AndroidImportance: {
    MIN: number;
    LOW: number;
    DEFAULT: number;
    HIGH: number;
    MAX: number;
  };
  
  export const SchedulableTriggerInputTypes: {
    DAILY: string;
    WEEKLY: string;
    MONTHLY: string;
    YEARLY: string;
  };
  
  export interface DailyTriggerInput {
    hour: number;
    minute: number;
  }
  
  export interface NotificationRequest {
    identifier: string;
    content: any;
    trigger: any;
  }
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: any): Promise<any>;
}

declare module 'expo-image-picker' {
  export function getMediaLibraryPermissionsAsync(): Promise<any>;
  export function requestMediaLibraryPermissionsAsync(): Promise<any>;
  export function getCameraPermissionsAsync(): Promise<any>;
  export function requestCameraPermissionsAsync(): Promise<any>;
  export function launchImageLibraryAsync(options?: any): Promise<any>;
  export function launchCameraAsync(options?: any): Promise<any>;
  
  export const MediaTypeOptions: {
    All: string;
    Images: string;
    Videos: string;
  };
}

declare module 'expo-file-system' {
  export const documentDirectory: string;
  export const cacheDirectory: string;
  export function readAsStringAsync(fileUri: string): Promise<string>;
  export function writeAsStringAsync(fileUri: string, contents: string): Promise<void>;
  export function deleteAsync(fileUri: string): Promise<void>;
  export function makeDirectoryAsync(fileUri: string): Promise<void>;
  export function getInfoAsync(fileUri: string): Promise<any>;
  export function copyAsync(options: { from: string; to: string }): Promise<void>;
  export function moveAsync(options: { from: string; to: string }): Promise<void>;
}

declare module 'expo-constants' {
  export const expoConfig: any;
  export const manifest: any;
  export const platform: any;
  export const systemVersion: string;
  export const deviceName: string;
  export const deviceYearClass: number;
  export const isDevice: boolean;
  export const statusBarHeight: number;
  export const linkingUrl: string;
  export const sessionId: string;
  export const installationId: string;
  export const executionId: string;
  export const appOwnership: 'expo' | 'standalone' | 'store';
}

declare module 'expo-device' {
  export const deviceName: string;
  export const deviceYearClass: number;
  export const isDevice: boolean;
  export const osName: string;
  export const osVersion: string;
  export const platformApiLevel: number;
  export const brand: string;
  export const modelName: string;
  export const totalMemory: number;
  export const supportedCpuArchitectures: string[];
}

declare module 'expo-font' {
  export function loadAsync(fontFamily: string, uri: string): Promise<void>;
  export function isLoaded(fontFamily: string): boolean;
  export function loadAsync(fontMap: { [fontFamily: string]: string }): Promise<void>;
}

declare module 'expo-image' {
  import { Component } from 'react';
  import { ImageProps } from 'react-native';

  export interface ExpoImageProps extends ImageProps {
    source: any;
  }

  export class Image extends Component<ExpoImageProps> {}
  export class ExpoImage extends Component<ExpoImageProps> {}
}

declare module 'expo-linear-gradient' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: [number, number];
    end?: [number, number];
    locations?: number[];
  }

  export class LinearGradient extends Component<LinearGradientProps> {}
}

declare module 'expo-linking' {
  export function openURL(url: string): Promise<void>;
  export function canOpenURL(url: string): Promise<boolean>;
  export function getInitialURL(): Promise<string | null>;
  export function addEventListener(type: string, listener: (event: any) => void): any;
  export function removeEventListener(type: string, listener: (event: any) => void): void;
}

declare module 'expo-splash-screen' {
  export function hideAsync(): Promise<void>;
  export function showAsync(): Promise<void>;
  export function preventAutoHideAsync(): Promise<void>;
}

declare module 'expo-status-bar' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface StatusBarProps extends ViewProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
    backgroundColor?: string;
    translucent?: boolean;
  }

  export class StatusBar extends Component<StatusBarProps> {}
}

declare module 'expo-asset' {
  import { Component } from 'react';
  import { ImageProps } from 'react-native';

  export interface AssetProps extends ImageProps {
    uri: string;
  }

  export class Asset extends Component<AssetProps> {}
  export function loadAsync(moduleId: number | string): Promise<any>;
  export function downloadAsync(uri: string): Promise<any>;
}

declare module 'expo-modules-core' {
  export function requireNativeModule(name: string): any;
}

declare module 'react-native-gesture-handler' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface GestureHandlerRootViewProps extends ViewProps {
    children: React.ReactNode;
  }

  export class GestureHandlerRootView extends Component<GestureHandlerRootViewProps> {}
  export function gestureHandlerRootHOC(component: any): any;
  export function enableScreens(enable?: boolean): void;
  export function enableFreeze(enable?: boolean): void;
}

declare module 'react-native-screens' {
  export function enableScreens(enable?: boolean): void;
  export function enableFreeze(enable?: boolean): void;
}

declare module 'react-native-get-random-values' {
  // This module doesn't export anything, it just polyfills
}

declare module 'react-native-image-picker' {
  export function launchImageLibrary(options: any, callback: (response: any) => void): void;
  export function launchCamera(options: any, callback: (response: any) => void): void;
  export function showImagePicker(options: any, callback: (response: any) => void): void;
}

declare module 'react-native-vector-icons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export class Ionicons extends Component<IconProps> {}
  export class MaterialIcons extends Component<IconProps> {}
  export class FontAwesome extends Component<IconProps> {}
  export class FontAwesome5 extends Component<IconProps> {}
  export class AntDesign extends Component<IconProps> {}
  export class Entypo extends Component<IconProps> {}
  export class EvilIcons extends Component<IconProps> {}
  export class Feather extends Component<IconProps> {}
  export class Foundation extends Component<IconProps> {}
  export class MaterialCommunityIcons extends Component<IconProps> {}
  export class Octicons extends Component<IconProps> {}
  export class SimpleLineIcons extends Component<IconProps> {}
  export class Zocial extends Component<IconProps> {}
}

// Global type declarations
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      EXPO_PUBLIC_SUPABASE_URL?: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
      EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?: string;
      EXPO_PUBLIC_NEWS_API_KEY?: string;
      EXPO_PUBLIC_OPENAI_API_KEY?: string;
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
      EXPO_PUBLIC_GOOGLE_ANALYTICS_ID?: string;
      EXPO_PUBLIC_SENTRY_DSN?: string;
      EXPO_PUBLIC_APP_ENV?: string;
      EXPO_PUBLIC_APP_VERSION?: string;
      EXPO_PUBLIC_APP_BUILD?: string;
      EXPO_PUBLIC_APP_PLATFORM?: string;
      EXPO_PUBLIC_APP_DEBUG?: string;
      EXPO_PUBLIC_APP_LOGGING?: string;
      EXPO_PUBLIC_APP_ANALYTICS?: string;
      EXPO_PUBLIC_APP_CRASH_REPORTING?: string;
      EXPO_PUBLIC_APP_PERFORMANCE?: string;
      EXPO_PUBLIC_APP_MONITORING?: string;
      EXPO_PUBLIC_APP_LOGGING_LEVEL?: string;
      EXPO_PUBLIC_APP_LOGGING_FORMAT?: string;
      EXPO_PUBLIC_APP_LOGGING_OUTPUT?: string;
      EXPO_PUBLIC_APP_LOGGING_FILTER?: string;
      EXPO_PUBLIC_APP_LOGGING_SANITIZE?: string;
      EXPO_PUBLIC_APP_LOGGING_REDACT?: string;
      EXPO_PUBLIC_APP_LOGGING_MASK?: string;
      EXPO_PUBLIC_APP_LOGGING_ANONYMIZE?: string;
      EXPO_PUBLIC_APP_LOGGING_PRIVACY?: string;
      EXPO_PUBLIC_APP_LOGGING_SECURITY?: string;
      EXPO_PUBLIC_APP_LOGGING_COMPLIANCE?: string;
      EXPO_PUBLIC_APP_LOGGING_AUDIT?: string;
      EXPO_PUBLIC_APP_LOGGING_TRACE?: string;
      EXPO_PUBLIC_APP_LOGGING_DEBUG?: string;
      EXPO_PUBLIC_APP_LOGGING_INFO?: string;
      EXPO_PUBLIC_APP_LOGGING_WARN?: string;
      EXPO_PUBLIC_APP_LOGGING_ERROR?: string;
      EXPO_PUBLIC_APP_LOGGING_FATAL?: string;
      EXPO_PUBLIC_APP_LOGGING_CRITICAL?: string;
      EXPO_PUBLIC_APP_LOGGING_EMERGENCY?: string;
      EXPO_PUBLIC_APP_LOGGING_ALERT?: string;
      EXPO_PUBLIC_APP_LOGGING_NOTICE?: string;
      EXPO_PUBLIC_APP_LOGGING_VERBOSE?: string;
      EXPO_PUBLIC_APP_LOGGING_SILLY?: string;
      EXPO_PUBLIC_APP_LOGGING_TRACE?: string;
      EXPO_PUBLIC_APP_LOGGING_DEBUG?: string;
      EXPO_PUBLIC_APP_LOGGING_INFO?: string;
      EXPO_PUBLIC_APP_LOGGING_WARN?: string;
      EXPO_PUBLIC_APP_LOGGING_ERROR?: string;
      EXPO_PUBLIC_APP_LOGGING_FATAL?: string;
      EXPO_PUBLIC_APP_LOGGING_CRITICAL?: string;
      EXPO_PUBLIC_APP_LOGGING_EMERGENCY?: string;
      EXPO_PUBLIC_APP_LOGGING_ALERT?: string;
      EXPO_PUBLIC_APP_LOGGING_NOTICE?: string;
      EXPO_PUBLIC_APP_LOGGING_VERBOSE?: string;
      EXPO_PUBLIC_APP_LOGGING_SILLY?: string;
    }
  }
}
