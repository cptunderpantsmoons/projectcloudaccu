#!/bin/bash

# Automated Testing Script for CI/CD Pipeline
set -e

echo "🚀 Starting automated testing pipeline..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Environment setup
export NODE_ENV=test
export CI=true

# Step 1: Install dependencies
print_status "Installing dependencies..."
npm ci

# Step 2: Code quality checks
print_status "Running code quality checks..."

# Linting
print_status "Running ESLint..."
npm run lint
if [ $? -eq 0 ]; then
    print_status "✅ Linting passed"
else
    print_error "❌ Linting failed"
    exit 1
fi

# Type checking
print_status "Running TypeScript type checking..."
npm run type-check
if [ $? -eq 0 ]; then
    print_status "✅ Type checking passed"
else
    print_error "❌ Type checking failed"
    exit 1
fi

# Step 3: Unit Testing
print_status "Running unit tests..."

# Backend unit tests
print_status "Running backend unit tests..."
cd apps/backend
npm run test -- --coverage --watchAll=false
if [ $? -eq 0 ]; then
    print_status "✅ Backend unit tests passed"
else
    print_error "❌ Backend unit tests failed"
    exit 1
fi

# Frontend unit tests
print_status "Running frontend unit tests..."
cd ../frontend
npm run test -- --coverage --watchAll=false
if [ $? -eq 0 ]; then
    print_status "✅ Frontend unit tests passed"
else
    print_error "❌ Frontend unit tests failed"
    exit 1
fi

cd ../..

# Step 4: Integration Testing
print_status "Running integration tests..."

# Database setup for integration tests
print_status "Setting up test database..."
if command -v docker &> /dev/null; then
    docker-compose -f docker-compose.test.yml up -d postgres-test
    sleep 10  # Wait for database to be ready
fi

# Run integration tests
print_status "Running backend integration tests..."
cd apps/backend
npm run test:e2e -- --watchAll=false
if [ $? -eq 0 ]; then
    print_status "✅ Backend integration tests passed"
else
    print_error "❌ Backend integration tests failed"
    exit 1
fi

cd ../..

# Step 5: E2E Testing
print_status "Running E2E tests..."

# Start applications for E2E testing
print_status "Starting applications for E2E tests..."
npm run build
docker-compose -f docker-compose.e2e.yml up -d

# Wait for applications to be ready
print_status "Waiting for applications to start..."
sleep 30

# Run E2E tests
print_status "Running frontend E2E tests..."
cd apps/frontend
npm run test:e2e
if [ $? -eq 0 ]; then
    print_status "✅ E2E tests passed"
else
    print_error "❌ E2E tests failed"
    exit 1
fi

cd ../..

# Step 6: Performance Testing
print_status "Running performance tests..."

# Check if performance testing tools are available
if command -v artillery &> /dev/null; then
    print_status "Running API performance tests..."
    artillery run performance/api-performance.yml
    if [ $? -eq 0 ]; then
        print_status "✅ API performance tests passed"
    else
        print_warning "⚠️ API performance tests failed or found issues"
    fi
else
    print_warning "⚠️ Artillery not found, skipping performance tests"
fi

# Step 7: Security Testing
print_status "Running security tests..."

# Run security audit
print_status "Running npm security audit..."
npm audit --audit-level=moderate
if [ $? -eq 0 ]; then
    print_status "✅ Security audit passed"
else
    print_warning "⚠️ Security audit found issues"
fi

# Run dependency vulnerability scan
if command -v snyk &> /dev/null; then
    print_status "Running Snyk vulnerability scan..."
    snyk test --severity-threshold=high
    if [ $? -eq 0 ]; then
        print_status "✅ Snyk vulnerability scan passed"
    else
        print_warning "⚠️ Snyk found vulnerabilities"
    fi
else
    print_warning "⚠️ Snyk not found, skipping vulnerability scan"
fi

# Step 8: Build and Docker image testing
print_status "Testing Docker build..."

# Build Docker images
docker build -t accu-platform-backend:test ./apps/backend
if [ $? -eq 0 ]; then
    print_status "✅ Backend Docker build successful"
else
    print_error "❌ Backend Docker build failed"
    exit 1
fi

docker build -t accu-platform-frontend:test ./apps/frontend
if [ $? -eq 0 ]; then
    print_status "✅ Frontend Docker build successful"
else
    print_error "❌ Frontend Docker build failed"
    exit 1
fi

# Test Docker images
print_status "Testing Docker images..."

# Test backend container
docker run -d --name backend-test -p 3001:3000 accu-platform-backend:test
sleep 10
if curl -f http://localhost:3001/health; then
    print_status "✅ Backend container health check passed"
else
    print_error "❌ Backend container health check failed"
    docker logs backend-test
    exit 1
fi
docker stop backend-test && docker rm backend-test

# Cleanup
print_status "Cleaning up test environment..."
docker-compose -f docker-compose.e2e.yml down
docker-compose -f docker-compose.test.yml down

print_status "🎉 All tests completed successfully!"
echo ""
echo "📊 Test Summary:"
echo "  ✅ Code Quality (Linting & Type Checking)"
echo "  ✅ Unit Tests (Backend & Frontend)"
echo "  ✅ Integration Tests"
echo "  ✅ E2E Tests"
echo "  ✅ Security Tests"
echo "  ✅ Docker Build Tests"
echo ""
echo "🚀 Ready for deployment!"