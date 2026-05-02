import React from 'react';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  // If dsn is empty string, Sentry no-ops gracefully.
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  enableAutoPerformanceTracing: false,
  enableNativeFramesTracking: false,
});

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Hello</Text>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
  },
});
