import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import RNBootSplash from 'react-native-bootsplash';
import App from './App';

// Prevent splash screen from auto-hiding
RNBootSplash.preventAutoHide().catch(() => {});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
