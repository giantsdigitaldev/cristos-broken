import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

const AddNewTaskForm = () => {
  const { dark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (params.projectId) {
      // Load project data if needed
    }
  }, [params.projectId]);

  const loadData = useCallback(async () => {
    // Load any necessary data
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      // Here you would typically save the task to your backend
      Alert.alert('Success', 'Task created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create task');
    }
  }, [title, router]);

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark1 : COLORS.white }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={dark ? COLORS.white : COLORS.black} />
        </TouchableOpacity>
        <Text style={[FONTS.h2, { color: dark ? COLORS.white : COLORS.black }]}>
          Add New Task
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Task Title */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
            Task Title *
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
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task title"
            placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
          />
        </View>

        {/* Task Description */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
            Description
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
              borderRadius: 8,
              padding: 12,
              color: dark ? COLORS.white : COLORS.black,
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              height: 100,
              textAlignVertical: 'top',
            }}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter task description"
            placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Due Date Display */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>
            Due Date
          </Text>
          <View style={{
            borderWidth: 1,
            borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
            borderRadius: 8,
            padding: 12,
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons name="calendar-outline" size={20} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
            <Text style={[FONTS.body3, { color: dark ? COLORS.white : COLORS.black, marginLeft: 8 }]}>
              Due: {new Date().toLocaleDateString()}
            </Text>
            <TouchableOpacity
              style={{ marginLeft: 'auto' }}
            >
              <Ionicons name="chevron-down" size={20} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
            </TouchableOpacity>
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
            Create Task
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default AddNewTaskForm;