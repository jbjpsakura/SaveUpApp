import { Slot } from 'expo-router';
import React from 'react';

export default function AppLayout() {
  // This just renders the matched child route (like index.tsx)
  // without any surrounding navigation like tabs.
  return <Slot />;
}