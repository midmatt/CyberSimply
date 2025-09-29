// Configuration Service for Production Environment
// This service handles environment-specific configuration

import { Platform } from 'react-native';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  newsApiKey: string;
  appEnv: 'development' | 'production' | 'test';
  debugMode: boolean;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  admobAppId: string;
  batchSize: number;
  queryTimeout: number;
  maxRetries: number;
}

class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): AppConfig {
    const isProduction = !__DEV__;
    const isIOS = Platform.OS === 'ios';
    
    console.log('🔧 [Config] Loading configuration:', {
      isProduction,
      isIOS,
      platform: Platform.OS
    });

    return {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uaykrxfhzfkhjwnmvukb.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40',
      newsApiKey: process.env.EXPO_PUBLIC_NEWS_API_KEY || 'your_newsapi_key_here',
      appEnv: isProduction ? 'production' : 'development',
      debugMode: !isProduction,
      analyticsEnabled: isProduction,
      crashReportingEnabled: isProduction,
      admobAppId: isIOS 
        ? (process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || 'ca-app-pub-1846982089045102~4493578427')
        : (process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || 'ca-app-pub-1846982089045102~4493578427'),
      batchSize: isProduction ? 50 : 20,
      queryTimeout: isProduction ? 15000 : 10000,
      maxRetries: isProduction ? 3 : 1
    };
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getSupabaseConfig(): { url: string; anonKey: string } {
    return {
      url: this.config.supabaseUrl,
      anonKey: this.config.supabaseAnonKey
    };
  }

  public isProduction(): boolean {
    return this.config.appEnv === 'production';
  }

  public isDebugMode(): boolean {
    return this.config.debugMode;
  }

  public getBatchSize(): number {
    return this.config.batchSize;
  }

  public getQueryTimeout(): number {
    return this.config.queryTimeout;
  }

  public getMaxRetries(): number {
    return this.config.maxRetries;
  }

  public logConfig(): void {
    console.log('🔧 [Config] Current configuration:', {
      appEnv: this.config.appEnv,
      debugMode: this.config.debugMode,
      supabaseUrl: this.config.supabaseUrl,
      hasSupabaseKey: !!this.config.supabaseAnonKey,
      hasNewsApiKey: !!this.config.newsApiKey,
      admobAppId: this.config.admobAppId,
      batchSize: this.config.batchSize,
      queryTimeout: this.config.queryTimeout,
      maxRetries: this.config.maxRetries
    });
  }
}

export const configService = ConfigService.getInstance();
