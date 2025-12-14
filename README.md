# ACCU Platform

Australian Carbon Credit Units (ACCU) platform for comprehensive project management, compliance tracking, and carbon credit operations.

## Project Structure

```
accu-platform/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # Next.js React app
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── ui/              # Shared UI components
│   └── config/          # Shared configuration
├── infrastructure/
│   ├── docker/          # Docker configurations
│   └── terraform/       # Infrastructure as code
├── docs/                # Documentation
└── tools/               # Development tools
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development environment: `npm run dev`
4. Access frontend: http://localhost:3000
5. Access backend API: http://localhost:4000

## Architecture

- **Frontend**: Next.js 14 with React 18, TypeScript, Tailwind CSS
- **Backend**: NestJS with TypeScript, PostgreSQL, Redis
- **Authentication**: JWT with refresh tokens
- **Workflow Engine**: Temporal (planned for MVP)
- **File Storage**: S3-compatible (MinIO for development)
- **Deployment**: Railway (primary) with Vercel for frontend

## Development Workflow

### Code Quality
- ESLint + Prettier for code formatting
- Husky for pre-commit hooks
- TypeScript for type safety
- Jest for testing

### Testing Strategy
- Unit tests for all components
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing for scalability

## Environment Setup

Create `.env` files in both `apps/backend` and `apps/frontend`:

```bash
# Backend Environment
DATABASE_URL=postgresql://user:password@localhost:5432/accu_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
CER_API_URL=https://api.cleanenergyregulator.gov.au
```

```bash
# Frontend Environment
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Available Scripts

```bash
# Development
npm run dev              # Start all services
npm run build           # Build all applications
npm run test            # Run all tests
npm run lint            # Lint all code
npm run type-check      # Type check all code

# Database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with initial data
npm run db:reset        # Reset database

# Docker
npm run docker:up       # Start Docker Compose
npm run docker:down     # Stop Docker Compose
npm run docker:build    # Build Docker images
```

## MVP Features (Phase 1)

### Platform Foundations
- [x] Project setup and repository structure
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Docker development environment
- [ ] Code quality tools and TypeScript setup

### Core Backend Services
- [ ] API Gateway with authentication
- [ ] PostgreSQL database with audit trails
- [ ] JWT authentication with refresh tokens
- [ ] Role-based access control (RBAC)
- [ ] File storage service (S3/MinIO)
- [ ] Email service for notifications
- [ ] Basic notification system

### Frontend Foundation
- [ ] Next.js application with app router
- [ ] UI component library with Tailwind
- [ ] State management (Zustand/Redux Toolkit)
- [ ] Protected routing with role-based access
- [ ] Form handling with validation
- [ ] API integration with React Query

### Core Modules (MVP)
- [ ] Document management (upload, versioning)
- [ ] Calendar and deadline tracking
- [ ] Basic audit coordination
- [ ] Email ingestion and categorization
- [ ] ACCU application workflow
- [ ] Basic ACCU inventory tracking
- [ ] Sensor data collection
- [ ] Notification system with 90-day rule
- [ ] User management and RBAC
- [ ] Project templates and methodology setup
- [ ] Basic workflow engine

## Contributing

1. Create feature branches from `main`
2. Follow conventional commit messages
3. Ensure all tests pass before merging
4. Update documentation for new features
5. Add appropriate tests for new functionality

## License

This project is proprietary software for ACCU platform operations.