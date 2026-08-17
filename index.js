import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { SafeSplashScreen } from './src/app/startup/splashDetector';
import App from './App';

// Prevent splash screen from auto-hiding using safe wrapper
const splashScreen = new SafeSplashScreen();
splashScreen.preventAutoHide().catch(() => {
  console.warn('[index] Failed to prevent splash screen auto-hide');
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
