import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

const AddNewAddress = () => {
  const { dark } = useTheme();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');

  const handleSave = () => {
    if (!address || !city || !state || !zipCode || !country) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Here you would typically save the address to your backend
    Alert.alert('Success', 'Address saved successfully', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: dark ? COLORS.dark1 : COLORS.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color={dark ? COLORS.white : COLORS.black} />
          </TouchableOpacity>
          <Text style={[FONTS.h2, { color: dark ? COLORS.white : COLORS.black }]}>
            Add New Address
          </Text>
        </View>

        {/* Form Fields */}
        <View style={{ gap: 16 }}>
          <View>
            <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
              Street Address
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                borderRadius: 8,
                padding: 12,
                color: dark ? COLORS.white : COLORS.black,
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              }}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter street address"
              placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
                City
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  borderRadius: 8,
                  padding: 12,
                  color: dark ? COLORS.white : COLORS.black,
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                }}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
                State
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  borderRadius: 8,
                  padding: 12,
                  color: dark ? COLORS.white : COLORS.black,
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                }}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
                ZIP Code
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  borderRadius: 8,
                  padding: 12,
                  color: dark ? COLORS.white : COLORS.black,
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                }}
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="ZIP Code"
                placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
                Country
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  borderRadius: 8,
                  padding: 12,
                  color: dark ? COLORS.white : COLORS.black,
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                }}
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: COLORS.primary,
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          <Text style={[FONTS.h4, { color: COLORS.white }]}>
            Save Address
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddNewAddress;