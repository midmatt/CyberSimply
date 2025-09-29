// TypeScript declarations for React Native and Expo modules
// This file provides type definitions for modules that don't have built-in TypeScript support

// Global augmentations must be wrapped in a module declaration
declare module 'global' {
  // Add any global type augmentations here if needed
}

// Module declarations for various packages
declare module '@expo/vector-icons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export class MaterialIcons extends Component<IconProps> {}
  export class MaterialCommunityIcons extends Component<IconProps> {}
  export class Ionicons extends Component<IconProps> {
    static glyphMap: { [key: string]: number };
  }
  export class FontAwesome extends Component<IconProps> {}
  export class FontAwesome5 extends Component<IconProps> {}
  export class AntDesign extends Component<IconProps> {}
  export class Entypo extends Component<IconProps> {}
  export class EvilIcons extends Component<IconProps> {}
  export class Feather extends Component<IconProps> {}
  export class Foundation extends Component<IconProps> {}
  export class Octicons extends Component<IconProps> {}
  export class SimpleLineIcons extends Component<IconProps> {}
  export class Zocial extends Component<IconProps> {}
}

declare module 'react-native-safe-area-context' {
  import { Component, ReactNode } from 'react';
  import { ViewStyle } from 'react-native';

  export interface SafeAreaProviderProps {
    children: ReactNode;
    style?: ViewStyle;
  }

  export interface SafeAreaViewProps {
    children: ReactNode;
    style?: ViewStyle;
    edges?: string[];
  }

  export const SafeAreaProvider: React.FC<SafeAreaProviderProps>;
  export const SafeAreaView: React.FC<SafeAreaViewProps>;
  
  export function useSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

declare module '@react-navigation/native' {
  import { Component, ReactNode } from 'react';
  import { ViewStyle } from 'react-native';

  export interface NavigationContainerProps {
    children: ReactNode;
    theme?: any;
    onReady?: () => void;
    onStateChange?: (state: any) => void;
  }

  export const NavigationContainer: React.ComponentType<NavigationContainerProps>;
  
  export function useNavigation(): any;
  export function useRoute(): any;
  export function useFocusEffect(effect: () => void): void;
  
  export type RouteProp<T, K extends keyof T> = any;
}

declare module '@react-navigation/stack' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface StackScreenProps {
    navigation: any;
    route: any;
  }

  export interface StackNavigationOptions {
    title?: string;
    headerStyle?: ViewStyle;
    headerTitleStyle?: ViewStyle;
    headerTintColor?: string;
  }

  export function createStackNavigator(): any;
  export type StackNavigationProp<T, K extends keyof T> = any;
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator(): any;
}

declare module 'react-native-bootsplash' {
  export function hide(): Promise<void>;
  export function show(): Promise<void>;
}

declare module 'react-native-vector-icons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export class MaterialIcons extends Component<IconProps> {}
  export class MaterialCommunityIcons extends Component<IconProps> {}
  export class Ionicons extends Component<IconProps> {}
  export class FontAwesome extends Component<IconProps> {}
  export class FontAwesome5 extends Component<IconProps> {}
  export class AntDesign extends Component<IconProps> {}
  export class Entypo extends Component<IconProps> {}
  export class EvilIcons extends Component<IconProps> {}
  export class Feather extends Component<IconProps> {}
  export class Foundation extends Component<IconProps> {}
  export class Octicons extends Component<IconProps> {}
  export class SimpleLineIcons extends Component<IconProps> {}
  export class Zocial extends Component<IconProps> {}
}

declare module 'react-native-iap' {
  export interface Product {
    productId: string;
    price: string;
    currency: string;
    title: string;
    description: string;
  }

  export function getProducts(productIds: string[]): Promise<Product[]>;
  export function requestPurchase(productId: string): Promise<any>;
  export function finishTransaction(transaction: any): Promise<void>;
  export function getAvailablePurchases(): Promise<any[]>;
}

declare module 'expo-in-app-purchases' {
  export function getProductsAsync(productIds: string[]): Promise<any>;
  export function purchaseItemAsync(productId: string): Promise<any>;
  export function finishTransactionAsync(transaction: any): Promise<void>;
}

declare module 'expo-notifications' {
  export interface Notification {
    data: any;
    title?: string;
    body?: string;
  }

  export interface NotificationRequest {
    identifier: string;
    content: any;
    trigger: any;
  }

  export interface DailyTriggerInput {
    hour: number;
    minute: number;
  }

  export const AndroidImportance: {
    MIN: number;
    LOW: number;
    DEFAULT: number;
    HIGH: number;
    MAX: number;
  };

  export const SchedulableTriggerInputTypes: {
    DATE: string;
    TIME_INTERVAL: string;
    DAILY: string;
    WEEKLY: string;
  };

  export function scheduleNotificationAsync(notification: any): Promise<string>;
  export function cancelNotificationAsync(notificationId: string): Promise<void>;
  export function cancelScheduledNotificationAsync(notificationId: string): Promise<void>;
  export function getPermissionsAsync(): Promise<any>;
  export function requestPermissionsAsync(): Promise<any>;
  export function addNotificationReceivedListener(listener: (notification: Notification) => void): any;
  export function addNotificationResponseReceivedListener(listener: (response: any) => void): any;
  export function removeNotificationSubscription(subscription: any): void;
  export function setNotificationHandler(handler: any): void;
  export function setNotificationChannelAsync(channelId: string, channel: any): Promise<void>;
  export function getExpoPushTokenAsync(): Promise<string>;
  export function getAllScheduledNotificationsAsync(): Promise<NotificationRequest[]>;
}

declare module 'expo-sharing' {
  export function shareAsync(url: string, options?: any): Promise<void>;
}

declare module 'expo-image-picker' {
  export interface ImagePickerResult {
    uri: string;
    width: number;
    height: number;
    type: string;
    canceled?: boolean;
    assets?: Array<{
      uri: string;
      width: number;
      height: number;
      type: string;
    }>;
  }

  export function launchImageLibraryAsync(options?: any): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: any): Promise<ImagePickerResult>;
  export function requestMediaLibraryPermissionsAsync(): Promise<any>;
  
  export const MediaTypeOptions: {
    Images: string;
    Videos: string;
    All: string;
  };
}

declare module 'expo-file-system' {
  export function documentDirectory(): string;
  export function readAsStringAsync(fileUri: string): Promise<string>;
  export function writeAsStringAsync(fileUri: string, contents: string): Promise<void>;
  export function deleteAsync(fileUri: string): Promise<void>;
  export function makeDirectoryAsync(dirUri: string): Promise<void>;
}

declare module 'expo-constants' {
  export const expoConfig: any;
  export const manifest: any;
  export const platform: any;
}

declare module 'expo-device' {
  export const isDevice: boolean;
  export const brand: string;
  export const modelName: string;
  export const osName: string;
  export const osVersion: string;
}

declare module 'expo-font' {
  export function loadAsync(fontFamily: string, uri: string): Promise<void>;
}

declare module 'expo-image' {
  import { Component } from 'react';
  import { ImageProps } from 'react-native';

  export interface ExpoImageProps extends ImageProps {
    source: any;
  }

  export class Image extends Component<ExpoImageProps> {}
}

declare module 'expo-linear-gradient' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface LinearGradientProps {
    colors: string[];
    style?: ViewStyle;
    start?: [number, number];
    end?: [number, number];
  }

  export class LinearGradient extends Component<LinearGradientProps> {}
}

declare module 'expo-linking' {
  export function createURL(path?: string): string;
  export function openURL(url: string): Promise<void>;
  export function addEventListener(type: string, listener: (event: any) => void): any;
}

declare module 'expo-splash-screen' {
  export function hideAsync(): Promise<void>;
  export function preventAutoHideAsync(): Promise<void>;
}

declare module 'expo-status-bar' {
  import { Component } from 'react';

  export interface StatusBarProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
    backgroundColor?: string;
    translucent?: boolean;
  }

  export class StatusBar extends Component<StatusBarProps> {}
}

declare module 'expo-asset' {
  export function loadAsync(moduleId: number): Promise<any>;
  
  export class Asset {
    static loadAsync(moduleId: number): Promise<Asset>;
    static fromModule(moduleId: number): Asset;
    static fromURI(uri: string): Asset;
    static fromMetadata(metadata: any): Asset;
    
    name: string;
    type: string;
    uri: string;
    localUri?: string;
    width?: number;
    height?: number;
    
    downloadAsync(): Promise<void>;
    downloadAsync(uri: string): Promise<void>;
  }
}

declare module 'expo-modules-core' {
  export function requireNativeModule(name: string): any;
}

declare module 'react-native-gesture-handler' {
  import { Component, ReactNode } from 'react';
  import { ViewStyle } from 'react-native';

  export interface PanGestureHandlerProps {
    children: ReactNode;
    onGestureEvent?: (event: any) => void;
    onHandlerStateChange?: (event: any) => void;
  }

  export interface GestureHandlerRootViewProps {
    children: ReactNode;
    style?: ViewStyle;
  }

  export const PanGestureHandler: React.FC<PanGestureHandlerProps>;
  export const TapGestureHandler: React.FC<any>;
  export const LongPressGestureHandler: React.FC<any>;
  export const GestureHandlerRootView: React.FC<GestureHandlerRootViewProps>;
}

declare module 'react-native-screens' {
  export function enableScreens(shouldEnableScreens?: boolean): void;
}

declare module 'react-native-get-random-values' {
  // This module doesn't export anything, it just polyfills crypto.getRandomValues
}

declare module 'react-native-image-picker' {
  export interface ImagePickerResponse {
    uri: string;
    width: number;
    height: number;
    type: string;
  }

  export function launchImageLibrary(options: any, callback: (response: ImagePickerResponse) => void): void;
  export function launchCamera(options: any, callback: (response: ImagePickerResponse) => void): void;
}


// Global React type augmentation
declare global {
  namespace React {
    type FC<P = {}> = (props: P) => React.ReactElement | null;
  }
}