# CristOS - Task Management & Team Collaboration App

A comprehensive React Native/Expo application for project management, team collaboration, and task organization with real-time features, AI assistance, and secure authentication.

## 🚀 Features

- **Project Management**: Create, organize, and track projects with detailed boards and tasks
- **Team Collaboration**: Invite team members, assign roles, and manage permissions
- **Real-time Chat**: Integrated chat system for team communication
- **AI Assistant**: Built-in AI-powered assistance for project management
- **File Management**: Upload, organize, and share project files
- **Authentication**: Secure login with email/password, PIN, and biometric options
- **Cross-platform**: Works on iOS, Android, and Web
- **Dark/Light Theme**: Adaptive theming system
- **Offline Support**: Cached data and offline functionality

## 🚨 Quick Fix for "Invalid Refresh Token" Error

If you encounter the error `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`, follow these steps:

### Option 1: Automatic Fix (Recommended)
1. Stop the development server (Ctrl+C)
2. Run the cleanup script:
   ```bash
   node scripts/clearAuthTokens.js
   ```
3. Restart the development server:
   ```bash
   npx expo start --clear
   ```

### Option 2: Manual Browser Fix (Web Only)
If using the web version, also clear your browser's localStorage:
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage for your domain
4. Refresh the page

### Option 3: Nuclear Option (Complete Reset)
If the above doesn't work, run the comprehensive cleanup:
```bash
node scripts/clearAllStorage.js
```

### What This Fix Does
- Clears all stale authentication tokens
- Removes invalid refresh tokens from storage
- Resets the authentication state
- Forces a fresh login

### Prevention
The app now includes automatic error handling that will:
- Detect invalid refresh tokens
- Automatically clear them
- Redirect to login screen
- Prevent the error from recurring

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **Git**
- **iOS Simulator** (for iOS development) - Xcode on macOS
- **Android Studio** (for Android development)
- **Supabase Account** (for backend services)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/giantsdigitaldev/cristos-ios-06-27-25.git
cd cristos-ios-06-27-25
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Additional Configuration
EXPO_PUBLIC_APP_ENV=development
```

**Note**: You'll need to set up a Supabase project and get your project URL and anon key from the Supabase dashboard.

### 4. Database Setup

The app requires several database tables to be set up in Supabase. Run the following scripts in your Supabase SQL editor:

1. **Basic Tables**: Execute the SQL scripts in the `scripts/` directory
2. **RLS Policies**: Apply the Row Level Security policies for data protection
3. **Storage Buckets**: Set up file storage buckets for document uploads

### 5. Start the Development Server

```bash
# Start Expo development server
npx expo start

# Or start with clean cache (recommended for first run)
npx expo start --clear
```

### 6. Run on Different Platforms

#### iOS Simulator
```bash
npx expo run:ios
```

#### Android Emulator
```bash
npx expo run:android
```

#### Web Browser
```bash
npx expo start --web
```

## 📱 Platform-Specific Setup

### iOS Development
- Install Xcode from the Mac App Store
- Install iOS Simulator
- Run `npx expo run:ios` to build and run on iOS

### Android Development
- Install Android Studio
- Set up Android Virtual Device (AVD)
- Run `npx expo run:android` to build and run on Android

### Web Development
- The app automatically works in web browsers
- Use `npx expo start --web` for web development

## 🗂️ Project Structure

```
cristos-ios-06-27-25/
├── app/                    # Main application screens (Expo Router)
├── components/             # Reusable UI components
├── constants/              # App constants, icons, themes
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── scripts/                # Database setup and utility scripts
├── styles/                 # Global styles and themes
├── supabase/               # Supabase configuration and functions
├── theme/                  # Theme configuration
├── utils/                  # Utility functions and services
├── assets/                 # Images, fonts, and static assets
└── ios/                    # iOS-specific configuration
```

## 🔧 Available Scripts

```bash
# Development
npm start                   # Start Expo development server
npm run start:clean         # Start with clean cache
npm run android             # Run on Android
npm run ios                 # Run on iOS
npm run web                 # Run on web

# Build and Export
npm run build:web           # Build for web
npm run build:web-optimized # Build optimized web version

# Utilities
npm run lint                # Run ESLint
npm run clear-cache         # Clear Expo cache
npm run fix-metro           # Fix Metro bundler issues
npm run reset-project       # Reset project to clean state
```

## 🗄️ Database Schema

The app uses Supabase with the following main tables:

- **users**: User profiles and authentication
- **projects**: Project information and metadata
- **tasks**: Individual tasks within projects
- **project_team_members**: Team member assignments
- **team_invitations**: Pending team invitations
- **project_comments**: Comments on projects and tasks
- **project_files**: File attachments and documents
- **notifications**: User notifications
- **feedback**: User feedback and ratings

## 🔐 Authentication

The app supports multiple authentication methods:

- **Email/Password**: Traditional login
- **PIN Code**: Quick access with PIN
- **Biometric**: Touch ID / Face ID (iOS) / Fingerprint (Android)
- **Social Login**: Integration with social platforms

## 🎨 Theming

The app includes a comprehensive theming system:

- **Dark/Light Mode**: Automatic theme switching
- **Custom Colors**: Brand-specific color schemes
- **Typography**: Consistent font families and sizes
- **Spacing**: Standardized spacing system

## 📊 Performance Optimization

- **Image Optimization**: Automatic image compression and caching
- **Predictive Caching**: Smart data preloading
- **Lazy Loading**: On-demand component loading
- **Memory Management**: Efficient memory usage patterns

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
```

## 🚀 Deployment

### Expo Application Services (EAS)

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for production
eas build --platform ios
eas build --platform android
```

### Web Deployment

```bash
# Build for web
npm run build:web-optimized

# Deploy to your preferred hosting service
# (Netlify, Vercel, AWS S3, etc.)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Metro Bundler Issues**
   ```bash
   npm run fix-metro
   ```

2. **Cache Problems**
   ```bash
   npm run clear-cache
   ```

3. **Dependency Issues**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **iOS Build Issues**
   ```bash
   cd ios && pod install && cd ..
   npx expo run:ios
   ```

### Getting Help

- Check the [Expo documentation](https://docs.expo.dev/)
- Review the [React Native documentation](https://reactnative.dev/)
- Search existing issues in the repository
- Create a new issue with detailed information

## 📞 Support

For support and questions:

- **Email**: support@cristos.com
- **Documentation**: [CristOS Docs](https://docs.cristos.com)
- **Community**: [Discord Server](https://discord.gg/cristos)

## 🔄 Version History

- **v1.0.0** - Initial release with core project management features
- **v1.1.0** - Added team collaboration and real-time chat
- **v1.2.0** - Integrated AI assistant and enhanced file management
- **v1.3.0** - Improved performance and added offline support

---

**Built with ❤️ using React Native, Expo, and Supabase**
