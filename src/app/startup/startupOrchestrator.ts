// src/app/startup/startupOrchestrator.ts
import { withTimeout } from './withTimeout';
import { SafeSplashScreen } from './splashDetector';

export interface StartupStep {
  name: string;
  critical: boolean;
  timeout: number;
  execute: () => Promise<any>;
}

export interface StartupResult {
  success: boolean;
  steps: { [key: string]: { success: boolean; error?: string; duration: number } };
  totalDuration: number;
}

export class StartupOrchestrator {
  private steps: StartupStep[] = [];
  private splashScreen: SafeSplashScreen;
  
  constructor() {
    this.splashScreen = new SafeSplashScreen();
  }
  
  addStep(step: StartupStep): void {
    this.steps.push(step);
  }
  
  async execute(): Promise<StartupResult> {
    const startTime = Date.now();
    const results: { [key: string]: { success: boolean; error?: string; duration: number } } = {};
    
    console.log(`[startup] Starting ${this.steps.length} initialization steps...`);
    
    // Execute all steps in parallel with individual timeouts
    const stepPromises = this.steps.map(async (step) => {
      const stepStartTime = Date.now();
      
      try {
        console.log(`[startup] Executing step: ${step.name}`);
        
        const result = await withTimeout(
          step.execute(),
          step.timeout,
          step.name
        );
        
        const duration = Date.now() - stepStartTime;
        results[step.name] = { success: true, duration };
        
        console.log(`[startup] ✅ ${step.name} completed in ${duration}ms`);
        return { success: true, step: step.name };
        
      } catch (error) {
        const duration = Date.now() - stepStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results[step.name] = { success: false, error: errorMessage, duration };
        
        if (step.critical) {
          console.error(`[startup] ❌ Critical step failed: ${step.name}`, error);
        } else {
          console.warn(`[startup] ⚠️ Non-critical step failed: ${step.name}`, error);
        }
        
        return { success: false, step: step.name, error: errorMessage };
      }
    });
    
    // Wait for all steps to complete (or timeout)
    await Promise.allSettled(stepPromises);
    
    const totalDuration = Date.now() - startTime;
    const criticalSteps = this.steps.filter(step => step.critical);
    const criticalFailures = criticalSteps.filter(step => !results[step.name]?.success);
    
    const success = criticalFailures.length === 0;
    
    console.log(`[startup] Initialization completed in ${totalDuration}ms`);
    console.log(`[startup] Success: ${success}, Critical failures: ${criticalFailures.length}`);
    
    return {
      success,
      steps: results,
      totalDuration
    };
  }
  
  async hideSplashScreen(): Promise<void> {
    await this.splashScreen.hide();
  }
  
  async preventAutoHide(): Promise<void> {
    await this.splashScreen.preventAutoHide();
  }
}

// Predefined startup steps
export const createBasicStartupSteps = (): StartupStep[] => [
  {
    name: 'basic-setup',
    critical: false,
    timeout: 1000,
    execute: async () => {
      // Basic setup - just a small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return { initialized: true };
    }
  }
];

export const createServiceStartupSteps = (): StartupStep[] => [
  {
    name: 'theme-context',
    critical: false,
    timeout: 2000,
    execute: async () => {
      // Theme context initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      return { initialized: true };
    }
  },
  {
    name: 'app-context',
    critical: false,
    timeout: 2000,
    execute: async () => {
      // App context initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      return { initialized: true };
    }
  },
  {
    name: 'supabase-context',
    critical: false,
    timeout: 5000,
    execute: async () => {
      // Supabase context initialization (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 100));
      return { initialized: true };
    }
  },
  {
    name: 'ad-free-context',
    critical: false,
    timeout: 3000,
    execute: async () => {
      // Ad-free context initialization (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 100));
      return { initialized: true };
    }
  }
];

export const createHeavyStartupSteps = (): StartupStep[] => [
  {
    name: 'iap-service',
    critical: false,
    timeout: 5000,
    execute: async () => {
      // IAP service initialization (non-blocking)
      const { storeKitIAPService } = await import('../../services/storeKitIAPService');
      const result = await storeKitIAPService.initialize();
      if (!result.success) {
        console.warn('⚠️ [Startup] IAP service initialization failed:', result.error);
      }
      return { initialized: result.success, error: result.error };
    }
  },
  {
    name: 'ad-service',
    critical: false,
    timeout: 3000,
    execute: async () => {
      // Ad service initialization (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 200));
      return { initialized: true };
    }
  },
  {
    name: 'notification-service',
    critical: false,
    timeout: 3000,
    execute: async () => {
      // Notification service initialization (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 200));
      return { initialized: true };
    }
  },
  {
    name: 'news-service',
    critical: false,
    timeout: 5000,
    execute: async () => {
      // News service initialization (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 300));
      return { initialized: true };
    }
  }
];
