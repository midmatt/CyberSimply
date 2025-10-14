import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NewsListScreen } from '../screens/NewsListScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { CategoryArticlesScreen } from '../screens/CategoryArticlesScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ArchiveScreen } from '../screens/ArchiveScreen';
import { DonationScreen } from '../screens/DonationScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdFreeScreen } from '../screens/AdFreeScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';
import { ArticleDetail } from '../components/ArticleDetail';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { RootStackParamList } from '../types';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Safe context hooks with fallbacks
function useSafeSupabase() {
  try {
    const context = useSupabase();
    if (!context) {
      console.error("🚨 Supabase context not initialized");
      return null;
    }
    return context;
  } catch (error) {
    console.error("🚨 Error accessing Supabase context:", error);
    return null;
  }
}

function useSafeTheme() {
  try {
    const context = useTheme();
    if (!context) {
      console.error("🚨 Theme context not initialized");
      return null;
    }
    return context;
  } catch (error) {
    console.error("🚨 Error accessing Theme context:", error);
    return null;
  }
}

// Safe auth state with defaults
function getSafeAuthState(authState: any) {
  if (!authState || typeof authState !== 'object') {
    console.warn("🚨 Invalid authState, using defaults");
    return {
      isLoading: false,
      isAuthenticated: false,
      isGuest: false,
      user: null
    };
  }
  
  return {
    isLoading: Boolean(authState.isLoading),
    isAuthenticated: Boolean(authState.isAuthenticated),
    isGuest: Boolean(authState.isGuest),
    user: authState.user || null
  };
}

function MainTabNavigator() {
  const themeContext = useSafeTheme();
  
  // Show loading screen while theme initializes
  if (!themeContext || !themeContext.colors || !themeContext.colors.background) {
    console.log("🎨 Theme not ready, showing loading screen");
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#333333' }}>Loading theme...</Text>
      </SafeAreaView>
    );
  }

  const { colors } = themeContext;
  console.log("🎨 Theme colors loaded:", { 
    hasBackground: !!colors.background,
    hasAccent: !!colors.accent,
    hasTextPrimary: !!colors.textPrimary
  });

  return (
    <Tab.Navigator
      initialRouteName="News"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'News') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Archive') {
            iconName = focused ? 'archive' : 'archive-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          paddingTop: 4, // Add padding to prevent icon protrusion
          paddingBottom: 12, // Increased bottom padding for home bar clearance
          height: 72, // Increased height to account for home bar
          paddingHorizontal: 8, // Add horizontal padding
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarIconStyle: {
          marginTop: 2, // Additional margin for better alignment
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="News" component={NewsListScreen} />
      <Tab.Screen name="Archive" component={ArchiveScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  console.log("🚀 AppNavigator: Starting initialization...");
  
  try {
    // Safely get Supabase context
    const supabaseContext = useSafeSupabase();
    if (!supabaseContext) {
      console.error("🚨 Supabase context not available, showing error screen");
      return (
        <NavigationContainer
          onReady={() => {
            console.log('Supabase Error NavigationContainer mounted ✅');
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Error">
              {() => (
                <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, color: '#333333', textAlign: 'center', marginBottom: 16 }}>
                    Supabase Not Ready
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666666', textAlign: 'center' }}>
                    Please restart the app
                  </Text>
                </SafeAreaView>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      );
    }

    const { authState: rawAuthState } = supabaseContext;
    const authState = getSafeAuthState(rawAuthState);
    
    console.log("🔐 AuthState:", authState);

    // Show loading screen while authentication state is being determined
    // Add a timeout to prevent infinite loading
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    
    useEffect(() => {
      if (authState.isLoading) {
        const timeout = setTimeout(() => {
          console.log("⏰ Auth loading timeout, forcing app to continue");
          setLoadingTimeout(true);
        }, 3000); // 3 second timeout for auth loading
        
        return () => clearTimeout(timeout);
      }
    }, [authState.isLoading]);
    
    if (authState.isLoading && !loadingTimeout) {
      console.log("⏳ Auth is loading, showing loading screen");
      return (
        <NavigationContainer
          onReady={() => {
            console.log('Loading NavigationContainer mounted ✅');
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Loading">
              {() => (
                <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={{ marginTop: 16, fontSize: 16, color: '#333333' }}>Loading...</Text>
                </SafeAreaView>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      );
    }

  // Validate screen components
  const screenComponents = {
    AuthScreen,
    MainTabNavigator,
    CategoryArticlesScreen,
    DonationScreen,
    AdFreeScreen,
    NotificationSettingsScreen,
    FeedbackScreen,
    ProfileScreen,
    ArticleDetail
  };

  // Check if any screen components are undefined
  const undefinedScreens = Object.entries(screenComponents)
    .filter(([name, component]) => !component)
    .map(([name]) => name);

  if (undefinedScreens.length > 0) {
    console.error("🚨 Undefined screen components:", undefinedScreens);
    return (
      <NavigationContainer
        onReady={() => {
          console.log('Screen Error NavigationContainer mounted ✅');
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Error">
            {() => (
              <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: '#333333', textAlign: 'center', marginBottom: 16 }}>
                  Screen Error
                </Text>
                <Text style={{ fontSize: 14, color: '#666666', textAlign: 'center' }}>
                  Missing screens: {undefinedScreens.join(', ')}
                </Text>
              </SafeAreaView>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  console.log("✅ All screen components validated");

  return (
    <ErrorBoundary>
      <NavigationContainer
        onReady={() => {
          console.log('NavigationContainer mounted ✅');
        }}
        onStateChange={(state) => {
          console.log('Navigation state changed:', state);
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
          initialRouteName="Main"
        >
          {/* Main app - always accessible (Apple IAP compliance: no forced auth) */}
          <Stack.Screen name="Main" component={MainTabNavigator} />
          
          {/* Auth screen - optional, accessible from Settings */}
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          
          {/* Other screens */}
          <Stack.Screen 
            name="CategoryArticles" 
            component={CategoryArticlesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Support" 
            component={DonationScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="AdFree" 
            component={AdFreeScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="NotificationSettings" 
            component={NotificationSettingsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Feedback" 
            component={FeedbackScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="ArticleDetail" 
            component={ArticleDetail}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
  } catch (error) {
    console.error('🚨 AppNavigator critical error:', error);
    console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Fallback UI in case of error
    return (
      <NavigationContainer
        onReady={() => {
          console.log('Critical Error NavigationContainer mounted ✅');
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Error">
            {() => (
              <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: '#333333', textAlign: 'center', marginBottom: 16 }}>
                  Navigation Error
                </Text>
                <Text style={{ fontSize: 14, color: '#666666', textAlign: 'center', marginBottom: 8 }}>
                  Please restart the app
                </Text>
                {__DEV__ && (
                  <Text style={{ fontSize: 12, color: '#999999', textAlign: 'center', marginTop: 16 }}>
                    Error: {error instanceof Error ? error.message : String(error)}
                  </Text>
                )}
              </SafeAreaView>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
}
