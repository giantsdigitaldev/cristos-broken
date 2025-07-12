import { AuthService } from './auth';

export class AuthTest {
  static async testSignUp(email: string, password: string, fullName?: string) {
    console.log('🧪 Testing SignUp:', { email, password, fullName });
    
    try {
      const result = await AuthService.signUp({ email, password, fullName });
      
      if (result.success) {
        console.log('✅ SignUp Test PASSED:', result);
        return { success: true, result };
      } else {
        console.log('❌ SignUp Test FAILED:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('🚨 SignUp Test EXCEPTION:', error);
      return { success: false, error: error.message };
    }
  }

  static async testConnection() {
    console.log('🔗 Testing Supabase Connection...');
    
    try {
      const session = await AuthService.getSession();
      console.log('✅ Connection Test PASSED:', session ? 'Session exists' : 'No session');
      return { success: true, session };
    } catch (error: any) {
      console.error('❌ Connection Test FAILED:', error);
      return { success: false, error: error.message };
    }
  }
} 