import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Header from '../components/Header';
import PageContainer from '../components/PageContainer';
import { theme } from '../constants';
import { getFileProcessingStatus, uploadFileForProcessing } from '../utils/fileProcessingService';

// Custom hook for polling
const useSmartPolling = (fileId: string | null) => {
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!fileId) {
            setStatus(null);
            return;
        }

        let isMounted = true;
        let attempt = 0;
        const maxAttempts = 15;

        const poll = async () => {
            if (attempt >= maxAttempts) {
                setError("Processing timed out.");
                setIsLoading(false);
                return;
            }

            try {
                const result = await getFileProcessingStatus(fileId);
                if (!isMounted) return;

                setStatus(result);

                if (result?.jobStatus === 'completed' || result?.jobStatus === 'failed') {
                    setIsLoading(false);
                } else {
                    // Smart polling with exponential backoff
                    attempt++;
                    const delay = Math.min(1000 * Math.pow(1.5, attempt), 15000);
                    setTimeout(poll, delay);
                }
            } catch (err: any) {
                if (!isMounted) return;
                setError(err.message || "An error occurred while polling.");
                setIsLoading(false);
            }
        };

        setIsLoading(true);
        setError(null);
        poll();

        return () => {
            isMounted = false;
        };
    }, [fileId]);

    return { status, isLoading, error };
};


export default function VPSTestingScreen() {
    const { projectId } = useLocalSearchParams();
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [fileId, setFileId] = useState<string | null>(null);

    const { status, isLoading, error } = useSmartPolling(fileId);

    const handleSelectFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setSelectedFile(result);
                setFileId(null); // Reset status when new file is selected
            }
        } catch (err) {
            console.error('Error picking document:', err);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !projectId) {
            alert('Please select a file and ensure you are in a project context.');
            return;
        }

        try {
            const newFileId = await uploadFileForProcessing(projectId as string, selectedFile);
            setFileId(newFileId);
        } catch (err: any) {
            alert(`Upload failed: ${err.message}`);
        }
    };
    
    return (
        <PageContainer>
            <Header title="VPS Upload Test" />
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Test Document Processing</Text>
                <Text style={styles.subtitle}>Project ID: {projectId || 'N/A'}</Text>
                
                <Button 
                    title={selectedFile ? "Change File" : "Select File"}
                    onPress={handleSelectFile}
                />

                {selectedFile && (
                    <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                        <Text style={styles.fileSize}>{(selectedFile.size / 1024).toFixed(2)} KB</Text>
                    </View>
                )}

                <Button
                    title="Upload and Process"
                    onPress={handleUpload}
                    disabled={!selectedFile || isLoading}
                />

                {isLoading && (
                    <View style={styles.statusContainer}>
                        <ActivityIndicator size="large" color={theme.COLORS.primary} />
                        <Text style={styles.statusText}>Processing... Please wait.</Text>
                        <Text style={styles.statusSubText}>(This may take a minute for large or complex files)</Text>
                    </View>
                )}

                {error && (
                    <View style={[styles.statusContainer, styles.errorContainer]}>
                        <Text style={styles.errorText}>Error: {error}</Text>
                    </View>
                )}

                {status && (
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusTitle}>Processing Status</Text>
                        <Text style={styles.statusText}>Job Status: <Text style={styles.bold}>{status.jobStatus}</Text></Text>
                        
                        {status.processingResult && (
                            <View style={styles.resultContainer}>
                                <Text style={styles.resultTitle}>Results</Text>
                                <Text>Method: {status.processingResult.method}</Text>
                                <Text>Word Count: {status.processingResult.wordCount}</Text>
                                <Text>Languages: {status.processingResult.languages?.join(', ') || 'N/A'}</Text>
                                <Text>Processing Time: {status.processingResult.processingTime}ms</Text>
                                <Text style={styles.extractedText}>
                                    Extracted Text (first 200 chars):
                                </Text>
                                <Text style={styles.textSnippet}>
                                    {status.processingResult.extractedText?.substring(0, 200) || 'N/A'}...
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </PageContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: theme.COLORS.black,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
        color: theme.COLORS.gray,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        width: '100%',
        marginVertical: 10,
    },
    fileName: {
        flex: 1,
        color: theme.COLORS.black,
    },
    fileSize: {
        color: theme.COLORS.gray,
    },
    statusContainer: {
        marginTop: 30,
        padding: 15,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    statusText: {
        fontSize: 16,
        marginTop: 10,
    },
    statusSubText: {
        fontSize: 12,
        color: theme.COLORS.gray,
        marginTop: 5,
    },
    bold: {
        fontWeight: 'bold',
    },
    errorContainer: {
        backgroundColor: '#ffdddd',
    },
    errorText: {
        color: 'red',
        fontWeight: 'bold',
    },
    resultContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        width: '100%',
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    extractedText: {
        marginTop: 10,
        fontWeight: 'bold',
    },
    textSnippet: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        backgroundColor: '#e8e8e8',
        padding: 8,
        borderRadius: 4,
        marginTop: 5,
    }
}); 