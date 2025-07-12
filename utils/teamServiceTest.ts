import { Alert } from 'react-native';
import { TeamService } from './teamService';

export class TeamServiceTest {
  private static testProjectId: string = '';
  private static testResults: { [key: string]: boolean } = {};

  // Initialize test with a project ID
  static async initialize(projectId: string): Promise<void> {
    this.testProjectId = projectId;
    this.testResults = {};
    console.log('🧪 TeamService Test Suite Initialized');
    console.log(`📋 Testing with Project ID: ${projectId}`);
  }

  // Test 1: Get Project Team Members
  static async testGetProjectTeamMembers(): Promise<boolean> {
    console.log('\n🔍 Test 1: Get Project Team Members');
    try {
      const members = await TeamService.getProjectTeamMembers(this.testProjectId);
      console.log(`✅ Retrieved ${members.length} team members`);
      console.log('📊 Members:', members.map(m => ({
        id: m.id,
        role: m.role,
        status: m.status,
        name: m.user_name || m.invited_email
      })));
      
      this.testResults['getProjectTeamMembers'] = true;
      return true;
    } catch (error) {
      console.error('❌ Test 1 Failed:', error);
      this.testResults['getProjectTeamMembers'] = false;
      return false;
    }
  }

  // Test 2: Search Users
  static async testSearchUsers(query: string = 'test'): Promise<boolean> {
    console.log(`\n🔍 Test 2: Search Users (query: "${query}")`);
    try {
      const users = await TeamService.searchUsers(query);
      console.log(`✅ Found ${users.length} users matching "${query}"`);
      console.log('👥 Users:', users.map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.full_name
      })));
      
      this.testResults['searchUsers'] = true;
      return true;
    } catch (error) {
      console.error('❌ Test 2 Failed:', error);
      this.testResults['searchUsers'] = false;
      return false;
    }
  }

  // Test 3: Invite Team Member (Email)
  static async testInviteTeamMemberEmail(email: string = 'test@example.com'): Promise<boolean> {
    console.log(`\n🔍 Test 3: Invite Team Member by Email (${email})`);
    try {
      const result = await TeamService.inviteTeamMember({
        projectId: this.testProjectId,
        email: email,
        role: 'member',
        message: 'Test invitation from TeamService test suite'
      });
      
      if (result.success) {
        console.log('✅ Invitation sent successfully');
        console.log('📧 Invitation Details:', {
          invitationId: result.invitationId,
          invitationCode: result.invitationCode
        });
      } else {
        console.log('⚠️ Invitation failed:', result.error);
      }
      
      this.testResults['inviteTeamMemberEmail'] = result.success;
      return result.success;
    } catch (error) {
      console.error('❌ Test 3 Failed:', error);
      this.testResults['inviteTeamMemberEmail'] = false;
      return false;
    }
  }

  // Test 4: Get User Invitations
  static async testGetUserInvitations(): Promise<boolean> {
    console.log('\n🔍 Test 4: Get User Invitations');
    try {
      const invitations = await TeamService.getUserInvitations();
      console.log(`✅ Retrieved ${invitations.length} pending invitations`);
      console.log('📨 Invitations:', invitations.map(i => ({
        id: i.id,
        project_id: i.project_id,
        role: i.role,
        status: i.status
      })));
      
      this.testResults['getUserInvitations'] = true;
      return true;
    } catch (error) {
      console.error('❌ Test 4 Failed:', error);
      this.testResults['getUserInvitations'] = false;
      return false;
    }
  }

  // Test 5: Database Connection
  static async testDatabaseConnection(): Promise<boolean> {
    console.log('\n🔍 Test 5: Database Connection & Schema');
    try {
      // Test if we can query the team members table
      const members = await TeamService.getProjectTeamMembers(this.testProjectId);
      console.log('✅ Database connection successful');
      console.log('✅ project_team_members table accessible');
      
      this.testResults['databaseConnection'] = true;
      return true;
    } catch (error) {
      console.error('❌ Test 5 Failed - Database connection or schema issue:', error);
      this.testResults['databaseConnection'] = false;
      return false;
    }
  }

  // Run All Tests
  static async runAllTests(projectId: string, testEmail?: string): Promise<void> {
    console.log('🚀 Starting TeamService Test Suite...\n');
    
    await this.initialize(projectId);
    
    const tests = [
      () => this.testDatabaseConnection(),
      () => this.testGetProjectTeamMembers(),
      () => this.testSearchUsers('test'),
      () => this.testGetUserInvitations(),
    ];

    // Only test email invitation if email provided
    if (testEmail) {
      tests.push(() => this.testInviteTeamMemberEmail(testEmail));
    }

    let passedTests = 0;
    const totalTests = tests.length;

    for (const test of tests) {
      const result = await test();
      if (result) passedTests++;
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print Results
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    Object.entries(this.testResults).forEach(([testName, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${testName}`);
    });
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! TeamService is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the errors above.');
    }
  }

  // Quick Health Check
  static async quickHealthCheck(projectId: string): Promise<boolean> {
    try {
      console.log('🏥 Running TeamService Health Check...');
      
      // Test basic functionality
      const members = await TeamService.getProjectTeamMembers(projectId);
      const users = await TeamService.searchUsers('test');
      
      console.log(`✅ Health Check Passed`);
      console.log(`   - Team members query: ${members.length} results`);
      console.log(`   - User search query: ${users.length} results`);
      
      return true;
    } catch (error) {
      console.error('❌ Health Check Failed:', error);
      return false;
    }
  }

  // Test with Alert (for React Native)
  static async runTestsWithAlert(projectId: string, testEmail?: string): Promise<void> {
    try {
      await this.runAllTests(projectId, testEmail);
      
      const passedCount = Object.values(this.testResults).filter(Boolean).length;
      const totalCount = Object.keys(this.testResults).length;
      
      Alert.alert(
        'TeamService Test Results',
        `${passedCount}/${totalCount} tests passed\n\nCheck console for detailed results`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', `Failed to run tests: ${error}`, [{ text: 'OK' }]);
    }
  }
}

// Export for easy testing in development
export const runTeamServiceTests = async (projectId: string, testEmail?: string) => {
  await TeamServiceTest.runAllTests(projectId, testEmail);
};

export const teamServiceHealthCheck = async (projectId: string) => {
  return await TeamServiceTest.quickHealthCheck(projectId);
}; 