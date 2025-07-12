import WidgetShowcase from '@/components/WidgetShowcase';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function WidgetShowcaseScreen() {
  return (
    <View style={styles.container}>
      <WidgetShowcase />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
}); 