import AsyncStorage from '@react-native-async-storage/async-storage';

import { PRIVACY_POLICY_VERSION } from './privacyPolicy';

const STORAGE_KEY = '@servicons/privacy_accepted_version';

export async function getAcceptedPrivacyVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function hasAcceptedPrivacyPolicy(): Promise<boolean> {
  const accepted = await getAcceptedPrivacyVersion();
  return accepted === PRIVACY_POLICY_VERSION;
}

export async function acceptPrivacyPolicy(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, PRIVACY_POLICY_VERSION);
}

export async function clearPrivacyAcceptance(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
