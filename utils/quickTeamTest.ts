// Quick Team Management Test Script
// Add this to any component to test the system

import { runTeamServiceTests, teamServiceHealthCheck } from '@/utils/teamServiceTest';
import { EmailService } from '@/utils/emailService';

export const quickTeamTest = async (projectId: string) => {
  console.log('🧪 Starting Team Management Quick Test...');
  
  try {
    // 1. Test database connectivity
    console.log('1️⃣ Testing database connectivity...');
    const isHealthy = await teamServiceHealthCheck(projectId);
    console.log(`Database health: ${isHealthy ? '✅ Healthy' : '❌ Issues'}`);
    
    // 2. Test email service
    console.log('2️⃣ Testing email service...');
    const emailTest = await EmailService.testConfiguration();
    console.log(`Email service: ${emailTest ? '✅ Working' : '❌ Issues'}`);
    
    // 3. Run full test suite
    console.log('3️⃣ Running full test suite...');
    await runTeamServiceTests(projectId, 'test@example.com');
    
    console.log('🎉 Quick test completed! Check console for detailed results.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Usage:
// quickTeamTest('your-project-id-here');
