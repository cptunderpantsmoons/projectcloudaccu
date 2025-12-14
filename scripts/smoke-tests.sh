#!/bin/bash

# Smoke Tests for Deployment Verification
set -e

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:3000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3001"}
API_TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo "=== $1 ==="
}

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $test_name... "
    
    if eval "$test_command"; then
        echo "✅ PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAIL"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Backend API Tests
test_backend_api() {
    print_header "Backend API Tests"
    
    # Health check
    run_test "Backend health endpoint" "curl -f -s $BACKEND_URL/health > /dev/null"
    
    # API documentation
    run_test "API documentation" "curl -f -s $BACKEND_URL/api > /dev/null"
    
    # Authentication endpoint
    run_test "Auth endpoint" "curl -f -s $BACKEND_URL/api/auth > /dev/null"
    
    # Users endpoint (should return 401 without auth)
    run_test "Users endpoint (unauthorized)" "! curl -f -s $BACKEND_URL/api/users > /dev/null"
    
    # Projects endpoint (should return 401 without auth)
    run_test "Projects endpoint (unauthorized)" "! curl -f -s $BACKEND_URL/api/projects > /dev/null"
    
    # Documents endpoint (should return 401 without auth)
    run_test "Documents endpoint (unauthorized)" "! curl -f -s $BACKEND_URL/api/documents > /dev/null"
    
    # ACCU applications endpoint (should return 401 without auth)
    run_test "ACCU applications endpoint (unauthorized)" "! curl -f -s $BACKEND_URL/api/accu-applications > /dev/null"
    
    # Calendar endpoint (should return 401 without auth)
    run_test "Calendar endpoint (unauthorized)" "! curl -f -s $BACKEND_URL/api/calendar > /dev/null"
}

# Frontend Tests
test_frontend() {
    print_header "Frontend Tests"
    
    # Frontend accessibility
    run_test "Frontend homepage" "curl -f -s $FRONTEND_URL > /dev/null"
    
    # Static assets
    run_test "Static CSS" "curl -f -s $FRONTEND_URL/_next/static/css/ > /dev/null"
    run_test "Static JS" "curl -f -s $FRONTEND_URL/_next/static/chunks/ > /dev/null"
    
    # API routes
    run_test "Frontend API health" "curl -f -s $FRONTEND_URL/api/health > /dev/null"
}

# Database Connectivity Test
test_database() {
    print_header "Database Tests"
    
    # Test database connection through API
    run_test "Database connectivity" "curl -f -s $BACKEND_URL/health | grep -q 'database.*up'"
}

# External Integrations Test
test_external_integrations() {
    print_header "External Integrations Tests"
    
    # Email service health
    run_test "Email service" "curl -f -s $BACKEND_URL/api/health | grep -q 'email.*ready'"
    
    # File storage service
    run_test "File storage service" "curl -f -s $BACKEND_URL/api/health | grep -q 'storage.*ready'"
    
    # CER API connectivity
    run_test "CER API connectivity" "curl -f -s $BACKEND_URL/api/health | grep -q 'cer.*available'"
}

# Performance Tests
test_performance() {
    print_header "Performance Tests"
    
    # Backend response time
    RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s $BACKEND_URL/health)
    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        run_test "Backend response time (< 1s)" "true"
    else
        run_test "Backend response time (< 1s)" "false"
        print_warning "Backend response time: ${RESPONSE_TIME}s"
    fi
    
    # Frontend response time
    FRONTEND_RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s $FRONTEND_URL)
    if (( $(echo "$FRONTEND_RESPONSE_TIME < 2.0" | bc -l) )); then
        run_test "Frontend response time (< 2s)" "true"
    else
        run_test "Frontend response time (< 2s)" "false"
        print_warning "Frontend response time: ${FRONTEND_RESPONSE_TIME}s"
    fi
}

# Security Tests
test_security() {
    print_header "Security Tests"
    
    # Check for security headers
    HEADERS=$(curl -I -s $BACKEND_URL/health)
    
    if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
        run_test "Security header: X-Content-Type-Options" "true"
    else
        run_test "Security header: X-Content-Type-Options" "false"
    fi
    
    if echo "$HEADERS" | grep -q "X-Frame-Options"; then
        run_test "Security header: X-Frame-Options" "true"
    else
        run_test "Security header: X-Frame-Options" "false"
    fi
    
    if echo "$HEADERS" | grep -q "X-XSS-Protection"; then
        run_test "Security header: X-XSS-Protection" "true"
    else
        run_test "Security header: X-XSS-Protection" "false"
    fi
    
    # Check HTTPS redirect (if in production)
    if [[ "$BACKEND_URL" == *"https"* ]]; then
        run_test "HTTPS enforcement" "true"
    else
        print_warning "HTTPS test skipped (not production URL)"
    fi
}

# Monitoring Tests
test_monitoring() {
    print_header "Monitoring Tests"
    
    # Check if metrics endpoint is available
    run_test "Metrics endpoint" "curl -f -s $BACKEND_URL/metrics > /dev/null"
    
    # Check Prometheus targets
    if command -v kubectl &> /dev/null; then
        run_test "Prometheus metrics scraping" "kubectl get endpoints prometheus -n monitoring &> /dev/null || true"
    fi
}

# Print test summary
print_summary() {
    print_header "Test Summary"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_status "🎉 All smoke tests passed!"
        return 0
    else
        print_error "❌ Some smoke tests failed!"
        return 1
    fi
}

# Main function
main() {
    print_header "ACCU Platform Smoke Tests"
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Run all test suites
    test_backend_api
    test_frontend
    test_database
    test_external_integrations
    test_performance
    test_security
    test_monitoring
    
    # Print summary and exit with appropriate code
    if print_summary; then
        exit 0
    else
        exit 1
    fi
}

# Help function
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help         Show this help message"
    echo "  -b, --backend      Backend URL (default: http://localhost:3000)"
    echo "  -f, --frontend     Frontend URL (default: http://localhost:3001)"
    echo "  -t, --timeout      API timeout in seconds (default: 30)"
    echo ""
    echo "Environment Variables:"
    echo "  BACKEND_URL        Backend API URL"
    echo "  FRONTEND_URL       Frontend URL"
    echo "  API_TIMEOUT        API timeout in seconds"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -b|--backend)
            BACKEND_URL="$2"
            shift 2
            ;;
        -f|--frontend)
            FRONTEND_URL="$2"
            shift 2
            ;;
        -t|--timeout)
            API_TIMEOUT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main