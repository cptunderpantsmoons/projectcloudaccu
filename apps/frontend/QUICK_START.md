# ACCU Platform Frontend - Quick Start Guide

## 🚀 Quick Start

### 1. Prerequisites Check
```bash
node --version  # Should be 18.0+
npm --version   # Should be 8.0+
```

### 2. Install Dependencies
```bash
cd apps/frontend
npm install
```

### 3. Environment Setup
The environment variables are already configured in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=ACCU Platform
NEXT_PUBLIC_ENVIRONMENT=development
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Application
Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure Overview

```
apps/frontend/src/
├── app/                 # Next.js 14 App Router
│   ├── login/          # Authentication
│   ├── dashboard/      # Main dashboard
│   ├── users/          # User management
│   ├── projects/       # Project management
│   ├── documents/      # Document management
│   ├── accu-applications/ # ACCU management
│   ├── calendar/       # Calendar & deadlines
│   └── settings/       # Settings & preferences
├── components/         # Reusable components
│   ├── ui/            # UI primitives
│   ├── layout/        # Layout components
│   ├── auth/          # Authentication
│   └── error/         # Error handling
├── lib/               # Utilities
├── store/             # State management
└── types/             # TypeScript types
```

## 🎯 Key Features Implemented

### ✅ Authentication System
- [x] Login/Register with validation
- [x] JWT token management
- [x] Protected routes
- [x] Role-based access control
- [x] Password reset flow

### ✅ Dashboard & Navigation
- [x] Responsive dashboard with metrics
- [x] Collapsible sidebar navigation
- [x] Quick action buttons
- [x] Recent activity feed
- [x] User profile menu

### ✅ User Management
- [x] User listing with pagination
- [x] Role assignment interface
- [x] User status management
- [x] Search and filtering
- [x] Bulk operations

### ✅ Project Management
- [x] Project creation and editing
- [x] Status tracking
- [x] Project categorization
- [x] Timeline management
- [x] Search and filtering

### ✅ Document Management
- [x] File upload with progress
- [x] Document categorization
- [x] Status tracking
- [x] Grid/List view modes
- [x] Search and filtering

### ✅ ACCU Applications
- [x] Application workflow
- [x] Status tracking
- [x] Unit quantity tracking
- [x] Application history
- [x] Summary metrics

### ✅ Calendar & Deadlines
- [x] Event management
- [x] Deadline tracking
- [x] Priority levels
- [x] Event categorization
- [x] Upcoming/Overdue alerts

### ✅ Settings & Preferences
- [x] Profile management
- [x] Security settings
- [x] Notification preferences
- [x] Theme selection
- [x] Data export

### ✅ UI/UX Features
- [x] Responsive design (mobile-first)
- [x] Dark/Light theme
- [x] Loading states
- [x] Error boundaries
- [x] Accessibility features
- [x] Form validation

### ✅ Technical Features
- [x] TypeScript throughout
- [x] API integration with interceptors
- [x] State management (Zustand)
- [x] Error handling
- [x] Performance optimizations

## 🎨 Design System

The application uses a comprehensive design system built on:
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible component primitives
- **Custom design tokens** for consistent theming
- **Responsive breakpoints** for mobile, tablet, and desktop

### Color Scheme
- **Primary**: Blue tones for main actions
- **Secondary**: Gray tones for neutral elements
- **Success**: Green for positive states
- **Warning**: Yellow for caution states
- **Error**: Red for error states

### Typography
- **Font**: Inter (modern, readable)
- **Scale**: Consistent sizing from xs to 4xl
- **Weight**: Regular, medium, semibold, bold

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Testing
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

## 🧪 Testing the Application

### 1. Authentication Flow
1. Navigate to `/login`
2. Try invalid credentials (should show error)
3. Register a new account at `/register`
4. Login with valid credentials
5. Verify redirected to `/dashboard`

### 2. Dashboard Features
1. Check metrics display
2. Test navigation menu
3. Verify responsive design on different screen sizes

### 3. CRUD Operations
1. **Users**: Navigate to `/users` (if you have permissions)
2. **Projects**: Go to `/projects` and test project management
3. **Documents**: Visit `/documents` for file management
4. **ACCU Applications**: Check `/accu-applications`
5. **Calendar**: Explore `/calendar` for event management

### 4. Settings
1. Go to `/settings`
2. Test different settings tabs
3. Try changing theme, notifications, etc.

## 🔐 Default Test Credentials

If the backend is configured with default users:
```
Email: admin@accu-platform.com
Password: Admin123!

Email: user@accu-platform.com  
Password: User123!
```

## 🌐 API Integration

The frontend expects the backend API to be running at `http://localhost:3001`. Key endpoints:

- `POST /auth/login` - User authentication
- `GET /auth/me` - Get current user
- `GET /users` - List users
- `GET /projects` - List projects
- `GET /documents` - List documents
- `GET /accu-applications` - List ACCU applications
- `GET /calendar/events` - List calendar events

## 🚨 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   # Or use different port
   npm run dev -- -p 3001
   ```

2. **TypeScript errors**
   ```bash
   npm run type-check
   ```

3. **Build errors**
   ```bash
   npm run build
   ```

4. **API connection issues**
   - Verify backend is running on `http://localhost:3001`
   - Check network connectivity
   - Review API client configuration

### Getting Help

1. Check browser console for errors
2. Review network tab for API failures
3. Verify environment variables
4. Check backend logs
5. Review TypeScript errors

## 📚 Next Steps

After the basic setup is working:

1. **Customize branding** - Update logos, colors, and app name
2. **Configure permissions** - Set up role-based access
3. **Add more features** - Extend with additional functionality
4. **Deploy** - Set up production deployment
5. **Add tests** - Implement comprehensive test coverage
6. **Monitor** - Set up error tracking and analytics

## 🎉 Success Criteria

You'll know everything is working when you can:

- [ ] Login and access the dashboard
- [ ] Navigate between all sections
- [ ] Perform CRUD operations
- [ ] Upload documents
- [ ] Create and manage projects
- [ ] Access settings and preferences
- [ ] Use the application on mobile devices

Welcome to the ACCU Platform Frontend! 🚀