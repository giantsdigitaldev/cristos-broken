import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { AuthDebug } from '../utils/authDebug';
import { supabase } from '../utils/supabase';

const AuthTest = () => {
  const { dark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Run auth setup test on component mount
    AuthDebug.testAuthSetup();
    // Also test network connectivity
    testNetworkConnectivity();
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testNetworkConnectivity = async () => {
    addLog('Testing network connectivity...');
    const result = await AuthDebug.testNetworkConnectivity();
    if (result.success) {
      addLog('✅ Network connectivity test passed');
    } else {
      addLog(`❌ Network connectivity failed: ${result.error}`);
    }
  };

  const testLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    addLog(`Attempting login with: ${email}`);

    try {
      const result = await AuthDebug.testLogin(email, password);
      
      if (result.success) {
        addLog('✅ Login successful!');
        Alert.alert('Success', 'Login successful!');
      } else {
        addLog(`❌ Login failed: ${result.error}`);
        Alert.alert('Login Failed', result.error || 'Unknown error');
      }
    } catch (error: any) {
      addLog(`❌ Exception: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    addLog(`Attempting signup with: ${email}`);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        addLog(`❌ Signup failed: ${error.message}`);
        Alert.alert('Signup Failed', error.message);
      } else {
        addLog('✅ Signup successful!');
        Alert.alert('Success', 'Signup successful! Check your email for confirmation.');
      }
    } catch (error: any) {
      addLog(`❌ Signup exception: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await AuthDebug.clearAuthData();
    addLog('🧹 Auth data cleared');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          Auth Test Screen
        </Text>
        
        <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
          Use this screen to test and debug authentication issues
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
                color: dark ? COLORS.white : COLORS.greyscale900,
                borderColor: dark ? COLORS.dark3 : COLORS.grayscale200,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
                color: dark ? COLORS.white : COLORS.greyscale900,
                borderColor: dark ? COLORS.dark3 : COLORS.grayscale200,
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
            secureTextEntry
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.primary }]}
            onPress={testLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.secondary }]}
            onPress={testSignUp}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Signup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.warning }]}
            onPress={clearAuth}
          >
            <Text style={styles.buttonText}>Clear Auth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.grayscale400 }]}
            onPress={clearLogs}
          >
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.info }]}
            onPress={testNetworkConnectivity}
          >
            <Text style={styles.buttonText}>Test Network</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.success }]}
            onPress={() => AuthDebug.testAuthSetup()}
          >
            <Text style={styles.buttonText}>Test Setup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logsContainer}>
          <Text style={[styles.logsTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Debug Logs:
          </Text>
          
          <View style={[
            styles.logsContent,
            { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100 }
          ]}>
            {logs.length === 0 ? (
              <Text style={[styles.logText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                No logs yet. Try testing login/signup above.
              </Text>
            ) : (
              logs.map((log, index) => (
                <Text
                  key={index}
                  style={[styles.logText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
                >
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  logsContainer: {
    marginTop: 20,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  logsContent: {
    borderRadius: 8,
    padding: 16,
    minHeight: 100,
    maxHeight: 300,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default AuthTest; 