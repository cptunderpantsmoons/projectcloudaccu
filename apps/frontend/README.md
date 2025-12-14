# ACCU Platform Frontend

A modern, responsive Next.js frontend application for the ACCU Platform - a comprehensive system for managing Australian Carbon Credit Units (ACCUs) and related compliance activities.

## Features

- **🔐 Authentication System**: Secure login, registration, and password management
- **📊 Dashboard**: Real-time metrics and quick actions
- **👥 User Management**: Role-based access control and user administration
- **📁 Project Management**: Create and track sustainability projects
- **📄 Document Management**: Upload, organize, and manage project documents
- **✅ ACCU Applications**: Manage Australian Carbon Credit Unit applications
- **📅 Calendar & Deadlines**: Track important dates and events
- **⚙️ Settings**: Comprehensive user preferences and account management
- **📱 Responsive Design**: Mobile-first approach with tablet and desktop layouts
- **♿ Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **🌙 Dark/Light Theme**: System preference detection with manual override

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with custom styling
- **Forms**: React Hook Form with Zod validation
- **State Management**: Zustand for global state
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **Testing**: Jest and React Testing Library
- **Code Quality**: ESLint and Prettier

## Project Structure

```
apps/frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── login/              # Authentication pages
│   │   ├── register/
│   │   ├── dashboard/          # Main application pages
│   │   ├── users/              # User management
│   │   ├── projects/           # Project management
│   │   ├── documents/          # Document management
│   │   ├── accu-applications/  # ACCU management
│   │   ├── calendar/           # Calendar and deadlines
│   │   ├── settings/           # Settings and preferences
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css         # Global styles
│   │   ├── middleware.ts       # Route protection
│   │   ├── error.tsx           # Error boundary
│   │   └── loading.tsx         # Loading states
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── label.tsx
│   │   │   └── loading.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── main-layout.tsx
│   │   ├── auth/               # Authentication components
│   │   │   └── protected-route.tsx
│   │   └── error/              # Error handling
│   │       └── error-boundary.tsx
│   ├── lib/
│   │   ├── api-client.ts       # HTTP client with interceptors
│   │   └── utils.ts            # Utility functions
│   ├── store/
│   │   └── auth-store.ts       # Authentication state management
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   └── hooks/                  # Custom React hooks
├── public/                     # Static assets
├── .env.local                  # Environment variables
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm, yarn, or pnpm
- ACCU Platform Backend API running

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accu-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp apps/frontend/.env.local.example apps/frontend/.env.local
   ```

   Update the environment variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_APP_NAME=ACCU Platform
   NEXT_PUBLIC_ENVIRONMENT=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run Jest in watch mode

## Configuration

### API Configuration

The frontend communicates with the ACCU Platform backend API. Configure the API URL in your environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Authentication

The application uses JWT tokens for authentication:
- Access tokens are stored in localStorage
- Refresh tokens are handled automatically
- Protected routes use middleware for authentication checks
- Role-based access control (RBAC) is implemented

### Theming

The application supports light/dark themes:
- System preference detection
- Manual theme switching
- Consistent design tokens across all components

## Key Features

### Authentication System
- Login/Register with form validation
- Password strength requirements
- Forgot password functionality
- JWT token management with refresh
- Protected route middleware
- Role-based access control

### Dashboard
- Real-time metrics display
- Quick action buttons
- Recent activity feed
- Upcoming deadlines overview
- Customizable widgets

### User Management
- User listing with pagination
- Role assignment interface
- User status management
- Bulk actions support
- Export functionality

### Project Management
- Project creation and editing
- Status tracking (draft, active, on_hold, completed, cancelled)
- Project type categorization
- Timeline management
- Team collaboration features

### Document Management
- File upload with drag-and-drop
- Document categorization
- Version control
- Status tracking (draft, review, approved, rejected, archived)
- Preview functionality
- Bulk operations

### ACCU Applications
- Application workflow management
- Status tracking (draft, submitted, under_review, approved, rejected, issued)
- Unit quantity tracking
- SER reference management
- Application history

### Calendar & Deadlines
- Event creation and management
- Deadline tracking with alerts
- Event categorization
- Priority levels
- Recurring events support
- Team calendar sharing

### Settings & Preferences
- Profile management
- Security settings (password change, 2FA)
- Notification preferences
- Theme and appearance
- Privacy controls
- Data export functionality

## State Management

The application uses Zustand for state management:

- **Authentication Store**: Manages user authentication state, permissions, and tokens
- **UI State**: Theme, sidebar state, notifications
- **Form State**: Managed with React Hook Form
- **Server State**: Managed with React Query (TanStack Query)

## API Integration

The application includes a comprehensive API client:

- Automatic token refresh
- Request/response interceptors
- Error handling and retry logic
- File upload with progress tracking
- Batch request support
- Type-safe API calls

## Security Features

- **CSRF Protection**: Token-based CSRF protection
- **XSS Prevention**: Input sanitization and CSP headers
- **Secure Headers**: Security headers configured in Next.js
- **Environment Variables**: Sensitive data in environment variables
- **Route Protection**: Middleware-based authentication
- **Input Validation**: Client and server-side validation

## Testing

The application includes comprehensive testing:

- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: API integration testing
- **E2E Tests**: Playwright for end-to-end testing
- **Accessibility Tests**: axe-core integration

## Deployment

### Build for Production

```bash
npm run build
```

### Environment Variables for Production

```env
NEXT_PUBLIC_API_URL=https://api.accu-platform.com
NEXT_PUBLIC_APP_NAME=ACCU Platform
NEXT_PUBLIC_ENVIRONMENT=production
```

### Deployment Platforms

The application can be deployed to:
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Docker containers
- Traditional hosting providers

## Development Guidelines

### Code Style
- Use TypeScript for all files
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Component Guidelines
- Create reusable UI components in `/components/ui/`
- Use composition over inheritance
- Implement proper error boundaries
- Follow accessibility guidelines

### State Management
- Use Zustand for global state
- Keep component state minimal
- Use React Query for server state
- Implement proper loading states

### Performance
- Use Next.js Image optimization
- Implement proper loading states
- Optimize bundle size with dynamic imports
- Use proper caching strategies

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information
- Contact the development team

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## Acknowledgments

- Next.js team for the amazing framework
- Radix UI for accessible component primitives
- Tailwind CSS for the utility-first CSS framework
- All contributors who have helped improve this project