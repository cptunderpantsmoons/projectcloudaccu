#!/bin/bash

# Deployment Automation Script with Rollback Support
set -e

# Configuration
DEPLOY_ENV=${1:-production}
NAMESPACE="accu-platform"
BACKUP_ENABLED=${BACKUP_ENABLED:-true}
ROLLBACK_ENABLED=${ROLLBACK_ENABLED:-true}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-300}
MAX_ROLLBACK_ATTEMPTS=${MAX_ROLLBACK_ATTEMPTS:-3}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "docker is not installed"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    print_status "✅ All prerequisites satisfied"
}

# Function to create backup
create_backup() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        print_header "Creating Backup"
        
        BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_NAME="accu-platform-backup-${DEPLOY_ENV}-${BACKUP_TIMESTAMP}"
        
        # Database backup
        print_status "Creating database backup..."
        kubectl exec -n $NAMESPACE deployment/backend -- pg_dump -h postgres-service -U accu_user -d accu_platform > "backups/${BACKUP_NAME}_database.sql"
        
        # Configuration backup
        print_status "Backing up current configuration..."
        kubectl get all,configmaps,secrets -n $NAMESPACE -o yaml > "backups/${BACKUP_NAME}_config.yaml"
        
        # Application state backup
        print_status "Backing up application state..."
        kubectl exec -n $NAMESPACE deployment/backend -- redis-cli BGSAVE
        
        print_status "✅ Backup created: $BACKUP_NAME"
        echo "$BACKUP_NAME" > "backups/latest_backup.txt"
    fi
}

# Function to deploy application
deploy_application() {
    print_header "Deploying Application"
    
    # Build and push Docker images
    print_status "Building Docker images..."
    BACKEND_IMAGE="ghcr.io/accu-platform/backend:${GITHUB_SHA:-latest}"
    FRONTEND_IMAGE="ghcr.io/accu-platform/frontend:${GITHUB_SHA:-latest}"
    
    docker build -t $BACKEND_IMAGE ./apps/backend
    docker build -t $FRONTEND_IMAGE ./apps/frontend
    
    # Push images (if registry is accessible)
    if [ "${PUSH_IMAGES:-false}" = "true" ]; then
        print_status "Pushing images to registry..."
        docker push $BACKEND_IMAGE
        docker push $FRONTEND_IMAGE
    fi
    
    # Apply Kubernetes manifests
    print_status "Applying Kubernetes manifests..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmaps.yaml
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/backend-deployment.yaml
    kubectl apply -f k8s/frontend-deployment.yaml
    
    # Wait for rollout
    print_status "Waiting for backend rollout..."
    kubectl rollout status deployment/backend -n $NAMESPACE --timeout=${HEALTH_CHECK_TIMEOUT}s
    
    print_status "Waiting for frontend rollout..."
    kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=${HEALTH_CHECK_TIMEOUT}s
    
    print_status "✅ Application deployed successfully"
}

# Function to run health checks
health_checks() {
    print_header "Running Health Checks"
    
    BACKEND_URL="https://api.accu-platform.com"
    FRONTEND_URL="https://accu-platform.com"
    
    # Backend health check
    print_status "Checking backend health..."
    BACKEND_HEALTHY=false
    for i in {1..30}; do
        if curl -f $BACKEND_URL/health &> /dev/null; then
            BACKEND_HEALTHY=true
            break
        fi
        print_status "Attempt $i/30: Backend not ready yet..."
        sleep 10
    done
    
    if [ "$BACKEND_HEALTHY" = "false" ]; then
        print_error "Backend health check failed"
        return 1
    fi
    
    print_status "✅ Backend health check passed"
    
    # Frontend health check
    print_status "Checking frontend health..."
    FRONTEND_HEALTHY=false
    for i in {1..30}; do
        if curl -f $FRONTEND_URL &> /dev/null; then
            FRONTEND_HEALTHY=true
            break
        fi
        print_status "Attempt $i/30: Frontend not ready yet..."
        sleep 10
    done
    
    if [ "$FRONTEND_HEALTHY" = "false" ]; then
        print_error "Frontend health check failed"
        return 1
    fi
    
    print_status "✅ Frontend health check passed"
    
    # Run smoke tests
    print_status "Running smoke tests..."
    if ! ./scripts/smoke-tests.sh; then
        print_error "Smoke tests failed"
        return 1
    fi
    
    print_status "✅ Smoke tests passed"
}

# Function to rollback deployment
rollback_deployment() {
    if [ "$ROLLBACK_ENABLED" = "true" ]; then
        print_header "Rolling Back Deployment"
        
        BACKUP_NAME=$(cat backups/latest_backup.txt 2>/dev/null || echo "")
        
        if [ -z "$BACKUP_NAME" ]; then
            print_error "No backup found for rollback"
            return 1
        fi
        
        print_status "Rolling back to backup: $BACKUP_NAME"
        
        # Restore database
        if [ -f "backups/${BACKUP_NAME}_database.sql" ]; then
            print_status "Restoring database..."
            kubectl exec -i -n $NAMESPACE deployment/backend -- psql -h postgres-service -U accu_user -d accu_platform < "backups/${BACKUP_NAME}_database.sql"
        fi
        
        # Restore configuration
        if [ -f "backups/${BACKUP_NAME}_config.yaml" ]; then
            print_status "Restoring configuration..."
            kubectl apply -f "backups/${BACKUP_NAME}_config.yaml"
        fi
        
        # Rollback Kubernetes deployments
        print_status "Rolling back Kubernetes deployments..."
        kubectl rollout undo deployment/backend -n $NAMESPACE
        kubectl rollout undo deployment/frontend -n $NAMESPACE
        
        # Wait for rollback completion
        kubectl rollout status deployment/backend -n $NAMESPACE --timeout=${HEALTH_CHECK_TIMEOUT}s
        kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=${HEALTH_CHECK_TIMEOUT}s
        
        print_status "✅ Rollback completed"
    fi
}

# Function to send notifications
send_notifications() {
    print_header "Sending Notifications"
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        if [ "$DEPLOYMENT_STATUS" = "success" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"✅ ACCU Platform deployment to $DEPLOY_ENV completed successfully!\"}" \
                $SLACK_WEBHOOK_URL
        else
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"❌ ACCU Platform deployment to $DEPLOY_ENV failed! Rolling back...\"}" \
                $SLACK_WEBHOOK_URL
        fi
    fi
    
    # Email notification
    if [ -n "$EMAIL_NOTIFICATIONS" ] && [ "$EMAIL_NOTIFICATIONS" = "true" ]; then
        # Add email sending logic here
        print_status "Email notifications would be sent in production"
    fi
}

# Main deployment function
main() {
    print_header "ACCU Platform Deployment - Environment: $DEPLOY_ENV"
    
    # Create necessary directories
    mkdir -p backups logs
    
    # Set trap for cleanup
    trap 'print_error "Deployment failed!"; DEPLOYMENT_STATUS="failure"; rollback_deployment; send_notifications; exit 1' ERR
    
    # Deployment steps
    check_prerequisites
    
    if [ "$DEPLOY_ENV" != "development" ]; then
        create_backup
    fi
    
    deploy_application
    
    if health_checks; then
        DEPLOYMENT_STATUS="success"
        print_status "🎉 Deployment completed successfully!"
    else
        DEPLOYMENT_STATUS="failure"
        rollback_deployment
        exit 1
    fi
    
    send_notifications
    
    print_status "Deployment process completed!"
}

# Help function
show_help() {
    echo "Usage: $0 [environment]"
    echo "Environments: development, staging, production"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_ENABLED=true/false - Enable/disable backups"
    echo "  ROLLBACK_ENABLED=true/false - Enable/disable rollback"
    echo "  HEALTH_CHECK_TIMEOUT=300 - Health check timeout in seconds"
    echo "  PUSH_IMAGES=true/false - Whether to push images to registry"
    echo "  SLACK_WEBHOOK_URL=<url> - Slack webhook for notifications"
}

# Parse arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    development|staging|production)
        DEPLOY_ENV=$1
        ;;
    *)
        echo "Error: Invalid environment. Use development, staging, or production."
        show_help
        exit 1
        ;;
esac

# Run main function
main