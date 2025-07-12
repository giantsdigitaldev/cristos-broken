import { RealtimeSTTService } from './realtimeSTTService';

/**
 * Test the real-time STT service functionality
 */
export const testRealtimeSTT = async () => {
  console.log('🧪 Testing Real-time STT Service...');
  
  try {
    // Test 1: Check if STT is supported
    const isSupported = RealtimeSTTService.isSupported();
    console.log('✅ STT Supported:', isSupported);
    
    if (!isSupported) {
      console.log('❌ Speech recognition not supported on this platform');
      return;
    }
    
    // Test 2: Get available languages
    const languages = RealtimeSTTService.getAvailableLanguages();
    console.log('🌍 Available languages:', languages.length);
    
    // Test 3: Test basic text correction
    const testText = "um hello uh this is a test er message";
    const correctedText = await RealtimeSTTService.enhanceTranscriptionWithCorrection(testText);
    console.log('📝 Text correction test:');
    console.log('  Original:', testText);
    console.log('  Corrected:', correctedText);
    
    // Test 4: Test real-time STT start/stop (simulation)
    console.log('🎤 Testing real-time STT start/stop...');
    
    let interimCount = 0;
    let finalCount = 0;
    
    try {
      await RealtimeSTTService.startRealtimeSTT({
        language: 'en-US',
        interimResults: true,
        continuous: true,
        autoCorrect: true,
        onInterimResult: (text) => {
          interimCount++;
          console.log(`🎯 Interim result ${interimCount}:`, text);
        },
        onFinalResult: (text) => {
          finalCount++;
          console.log(`✅ Final result ${finalCount}:`, text);
        },
        onError: (error) => {
          console.error('❌ STT Error:', error);
        }
      });
      
      // Stop after 5 seconds (simulation)
      setTimeout(() => {
        RealtimeSTTService.stopRealtimeSTT();
        console.log('🛑 STT stopped');
        console.log(`📊 Results: ${interimCount} interim, ${finalCount} final`);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Real-time STT test failed:', error);
    }
    
    console.log('✅ Real-time STT test completed');
    
  } catch (error) {
    console.error('❌ STT test failed:', error);
  }
};

// Export for use in development
export default testRealtimeSTT; 