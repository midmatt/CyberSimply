import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favorites';

/**
 * Persistence for the favorited article ids.
 *
 * Writes are chained rather than fired independently: two toggles in quick
 * succession each write the whole array, and without ordering the older array
 * could land last and silently drop the newer favorite.
 */
let writeQueue: Promise<void> = Promise.resolve();

export async function loadFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((id): id is string => typeof id === 'string');
  } catch (error) {
    console.warn('[favorites] Failed to load favorites:', error);
    return [];
  }
}

export function saveFavorites(favorites: string[]): Promise<void> {
  writeQueue = writeQueue
    .catch(() => {})
    .then(() => AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)))
    .catch((error) => {
      console.warn('[favorites] Failed to save favorites:', error);
    });

  return writeQueue;
}
