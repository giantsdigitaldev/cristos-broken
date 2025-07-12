import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../constants';

interface MapViewProps {
  style?: any;
  customMapStyle?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  children?: React.ReactNode;
}

interface MarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  image?: any;
  title?: string;
  description?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}

interface CalloutProps {
  tooltip?: boolean;
  children?: React.ReactNode;
}

// Web-compatible MapView component
export default function MapView({ style, children, initialRegion }: MapViewProps) {
  return (
    <View style={[styles.mapContainer, style]}>
      <Text style={styles.mapPlaceholderText}>
        Map View (Web Preview)
      </Text>
      {initialRegion && (
        <Text style={styles.coordinateText}>
          {initialRegion.latitude.toFixed(4)}, {initialRegion.longitude.toFixed(4)}
        </Text>
      )}
      {children}
    </View>
  );
}

// Web-compatible Marker component
export function Marker({ coordinate, title, children, onPress }: MarkerProps) {
  return (
    <View style={styles.markerContainer}>
      <Text style={styles.markerText}>
        📍 {title || 'Marker'}
      </Text>
      <Text style={styles.markerCoordinate}>
        {coordinate.latitude.toFixed(4)}, {coordinate.longitude.toFixed(4)}
      </Text>
      {children}
    </View>
  );
}

// Web-compatible Callout component
export function Callout({ children }: CalloutProps) {
  return (
    <View style={styles.calloutContainer}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPlaceholderText: {
    ...FONTS.h3,
    color: COLORS.gray,
    textAlign: 'center',
  },
  coordinateText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginTop: 8,
  },
  markerContainer: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray,
    top: 20,
    left: 20,
  },
  markerText: {
    ...FONTS.body4,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  markerCoordinate: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  calloutContainer: {
    backgroundColor: COLORS.white,
    padding: 4,
    borderRadius: 4,
  },
}); 