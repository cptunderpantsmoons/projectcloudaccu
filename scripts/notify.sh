#!/bin/bash

# Comprehensive Notification System for ACCU Platform
set -e

# Configuration
WEBHOOK_URLS_FILE=${WEBHOOK_URLS_FILE:-"./config/webhooks.json"}
LOG_FILE=${LOG_FILE:-"./logs/notifications.log"}
MAX_RETRIES=${MAX_RETRIES:-3}
TIMEOUT=${TIMEOUT:-10}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to log messages
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Function to load webhook configurations
load_webhooks() {
    if [ -f "$WEBHOOK_URLS_FILE" ]; then
        SLACK_WEBHOOK=$(jq -r '.slack.webhook_url' "$WEBHOOK_URLS_FILE" 2>/dev/null || echo "")
        DISCORD_WEBHOOK=$(jq -r '.discord.webhook_url' "$WEBHOOK_URLS_FILE" 2>/dev/null || echo "")
        TEAMS_WEBHOOK=$(jq -r '.teams.webhook_url' "$WEBHOOK_URLS_FILE" 2>/dev/null || echo "")
        EMAIL_SMTP=$(jq -r '.email.smtp_server' "$WEBHOOK_URLS_FILE" 2>/dev/null || echo "")
        EMAIL_USER=$(jq -r '.email.username' "$WEBHOOK_URLS_FILE" 2>/dev/null || echo "")
        EMAIL_PASSWORD=$(jq -r '.email.password' "$WEBHOOK_URLS_FILE" 2>/dev/null || echo "")
        PAGERDUTY_KEY=$(jq -r '.pagerduty.integration_key' "$WEBHOOK_URLS_FILE" 2>/dev/null || echo "")
    fi
}

# Function to send Slack notification
send_slack_notification() {
    local message=$1
    local severity=${2:-"info"}
    local title=${3:-"ACCU Platform Alert"}
    local color="good"
    
    case $severity in
        "critical") color="danger" ;;
        "warning") color="warning" ;;
        "info") color="good" ;;
    esac
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local payload=$(cat << EOF
{
    "channel": "#alerts",
    "username": "ACCU Platform Bot",
    "icon_emoji": ":robot_face:",
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "text": "$message",
            "ts": $(date +%s),
            "footer": "ACCU Platform Monitoring",
            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png"
        }
    ]
}
EOF
)
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-type: application/json" \
            -d "$payload" \
            "$SLACK_WEBHOOK" 2>/dev/null || echo "000")
        
        if [[ "$response" == "200" ]]; then
            print_status "✅ Slack notification sent successfully"
            log_message "INFO" "Slack notification sent: $title"
            return 0
        else
            print_error "❌ Failed to send Slack notification (HTTP: $response)"
            log_message "ERROR" "Slack notification failed: HTTP $response"
            return 1
        fi
    else
        print_warning "⚠️ Slack webhook URL not configured"
        return 1
    fi
}

# Function to send Discord notification
send_discord_notification() {
    local message=$1
    local severity=${2:-"info"}
    local title=${3:-"ACCU Platform Alert"}
    
    if [ -n "$DISCORD_WEBHOOK" ]; then
        local color="3447003"  # Default blue
        
        case $severity in
            "critical") color="15158332" ;;  # Red
            "warning") color="15844367" ;;   # Orange
            "info") color="3447003" ;;       # Blue
        esac
        
        local payload=$(cat << EOF
{
    "embeds": [
        {
            "title": "$title",
            "description": "$message",
            "color": $color,
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
            "footer": {
                "text": "ACCU Platform Monitoring"
            },
            "fields": [
                {
                    "name": "Environment",
                    "value": "${ENVIRONMENT:-production}",
                    "inline": true
                },
                {
                    "name": "Severity",
                    "value": "$severity",
                    "inline": true
                }
            ]
        }
    ]
}
EOF
)
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-type: application/json" \
            -d "$payload" \
            "$DISCORD_WEBHOOK" 2>/dev/null || echo "000")
        
        if [[ "$response" == "200" ]]; then
            print_status "✅ Discord notification sent successfully"
            log_message "INFO" "Discord notification sent: $title"
            return 0
        else
            print_error "❌ Failed to send Discord notification (HTTP: $response)"
            log_message "ERROR" "Discord notification failed: HTTP $response"
            return 1
        fi
    else
        print_warning "⚠️ Discord webhook URL not configured"
        return 1
    fi
}

# Function to send Microsoft Teams notification
send_teams_notification() {
    local message=$1
    local severity=${2:-"info"}
    local title=${3:-"ACCU Platform Alert"}
    
    if [ -n "$TEAMS_WEBHOOK" ]; then
        local color="0076D7"
        
        case $severity in
            "critical") color="FF0000" ;;
            "warning") color="FFA500" ;;
            "info") color="0076D7" ;;
        esac
        
        local payload=$(cat << EOF
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "$color",
    "summary": "$title",
    "sections": [
        {
            "activityTitle": "$title",
            "text": "$message",
            "facts": [
                {
                    "name": "Environment",
                    "value": "${ENVIRONMENT:-production}"
                },
                {
                    "name": "Severity",
                    "value": "$severity"
                },
                {
                    "name": "Timestamp",
                    "value": "$(date)"
                }
            ]
        }
    ]
}
EOF
)
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-type: application/json" \
            -d "$payload" \
            "$TEAMS_WEBHOOK" 2>/dev/null || echo "000")
        
        if [[ "$response" == "200" ]]; then
            print_status "✅ Teams notification sent successfully"
            log_message "INFO" "Teams notification sent: $title"
            return 0
        else
            print_error "❌ Failed to send Teams notification (HTTP: $response)"
            log_message "ERROR" "Teams notification failed: HTTP $response"
            return 1
        fi
    else
        print_warning "⚠️ Teams webhook URL not configured"
        return 1
    fi
}

# Function to send email notification
send_email_notification() {
    local subject=$1
    local message=$2
    local recipients=${3:-"alerts@accu-platform.com"}
    
    if [ -n "$EMAIL_SMTP" ] && [ -n "$EMAIL_USER" ]; then
        # Use sendmail if available
        if command -v sendmail &> /dev/null; then
            {
                echo "Subject: $subject"
                echo "From: ACCU Platform <alerts@accu-platform.com>"
                echo "To: $recipients"
                echo ""
                echo "$message"
            } | sendmail -t "$recipients"
            
            print_status "✅ Email notification sent successfully"
            log_message "INFO" "Email notification sent: $subject"
            return 0
        else
            # Use curl with Gmail SMTP or other service
            local auth=$(echo -n "$EMAIL_USER:$EMAIL_PASSWORD" | base64)
            
            local payload=$(cat << EOF
{
  "to": "$recipients",
  "from": "alerts@accu-platform.com",
  "subject": "$subject",
  "text": "$message"
}
EOF
)
            
            local response=$(curl -s -w "%{http_code}" -X POST \
                -H "Authorization: Basic $auth" \
                -H "Content-type: application/json" \
                -d "$payload" \
                "$EMAIL_SMTP" 2>/dev/null || echo "000")
            
            if [[ "$response" == "200" ]]; then
                print_status "✅ Email notification sent successfully"
                log_message "INFO" "Email notification sent: $subject"
                return 0
            else
                print_error "❌ Failed to send email notification (HTTP: $response)"
                log_message "ERROR" "Email notification failed: HTTP $response"
                return 1
            fi
        fi
    else
        print_warning "⚠️ Email configuration not complete"
        return 1
    fi
}

# Function to send PagerDuty alert
send_pagerduty_alert() {
    local summary=$1
    local severity=${2:-"error"}
    local source=${3:-"accu-platform"}
    local custom_details=${4:-"{}"}
    
    if [ -n "$PAGERDUTY_KEY" ]; then
        local payload=$(cat << EOF
{
  "routing_key": "$PAGERDUTY_KEY",
  "event_action": "trigger",
  "dedup_key": "accu-platform-$(date +%s)",
  "payload": {
    "summary": "$summary",
    "source": "$source",
    "severity": "$severity",
    "component": "accu-platform",
    "group": "infrastructure",
    "class": "availability",
    "custom_details": $custom_details
  }
}
EOF
)
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-type: application/json" \
            -d "$payload" \
            "https://events.pagerduty.com/v2/enqueue" 2>/dev/null || echo "000")
        
        if [[ "$response" == "202" ]]; then
            print_status "✅ PagerDuty alert sent successfully"
            log_message "INFO" "PagerDuty alert sent: $summary"
            return 0
        else
            print_error "❌ Failed to send PagerDuty alert (HTTP: $response)"
            log_message "ERROR" "PagerDuty alert failed: HTTP $response"
            return 1
        fi
    else
        print_warning "⚠️ PagerDuty integration key not configured"
        return 1
    fi
}

# Function to send multi-channel notification
send_notification() {
    local message=$1
    local severity=${2:-"info"}
    local title=${3:-"ACCU Platform Alert"}
    local channels=${4:-"slack,discord,email"}
    
    print_header "Sending Notifications"
    print_status "Message: $message"
    print_status "Severity: $severity"
    print_status "Channels: $channels"
    
    local success_count=0
    local total_count=0
    
    # Send to Slack
    if [[ "$channels" == *"slack"* ]]; then
        total_count=$((total_count + 1))
        if send_slack_notification "$message" "$severity" "$title"; then
            success_count=$((success_count + 1))
        fi
    fi
    
    # Send to Discord
    if [[ "$channels" == *"discord"* ]]; then
        total_count=$((total_count + 1))
        if send_discord_notification "$message" "$severity" "$title"; then
            success_count=$((success_count + 1))
        fi
    fi
    
    # Send to Teams
    if [[ "$channels" == *"teams"* ]]; then
        total_count=$((total_count + 1))
        if send_teams_notification "$message" "$severity" "$title"; then
            success_count=$((success_count + 1))
        fi
    fi
    
    # Send Email
    if [[ "$channels" == *"email"* ]]; then
        total_count=$((total_count + 1))
        if send_email_notification "$title" "$message"; then
            success_count=$((success_count + 1))
        fi
    fi
    
    # Send PagerDuty for critical alerts
    if [[ "$severity" == "critical" ]] && [[ "$channels" == *"pagerduty"* ]]; then
        total_count=$((total_count + 1))
        if send_pagerduty_alert "$title" "critical" "accu-platform" "{\"message\":\"$message\"}"; then
            success_count=$((success_count + 1))
        fi
    fi
    
    print_status "Notification summary: $success_count/$total_count successful"
    
    if [ $success_count -eq $total_count ] && [ $total_count -gt 0 ]; then
        log_message "INFO" "All notifications sent successfully"
        return 0
    else
        log_message "WARNING" "Some notifications failed: $success_count/$total_count successful"
        return 1
    fi
}

# Function to send deployment notification
send_deployment_notification() {
    local environment=$1
    local status=$2
    local version=$3
    local duration=$4
    
    local title="Deployment $status"
    local severity="info"
    local message="Environment: $environment\nVersion: $version\nDuration: $duration\nStatus: $status"
    
    case $status in
        "success") severity="info" ;;
        "failure") severity="critical" ;;
        "rollback") severity="warning" ;;
    esac
    
    local channels="slack,discord,email"
    
    if [[ "$severity" == "critical" ]]; then
        channels="$channels,pagerduty"
    fi
    
    send_notification "$message" "$severity" "$title" "$channels"
}

# Function to send incident notification
send_incident_notification() {
    local incident_type=$1
    local severity=$2
    local description=$3
    local affected_services=${4:-"backend,frontend"}
    
    local title="Incident: $incident_type"
    local message="Type: $incident_type\nSeverity: $severity\nDescription: $description\nAffected Services: $affected_services\nTimestamp: $(date)"
    
    local channels="slack,discord,email,pagerduty"
    
    send_notification "$message" "$severity" "$title" "$channels"
}

# Function to send system health notification
send_health_notification() {
    local component=$1
    local status=$2
    local details=$3
    
    local title="System Health Alert"
    local severity="info"
    local message="Component: $component\nStatus: $status\nDetails: $details\nTimestamp: $(date)"
    
    case $status in
        "healthy") severity="info" ;;
        "degraded") severity="warning" ;;
        "unhealthy") severity="critical" ;;
    esac
    
    send_notification "$message" "$severity" "$title" "slack,discord"
}

# Function to send security alert
send_security_alert() {
    local alert_type=$1
    local severity=$2
    local description=$3
    local source=${4:-"security-scanner"}
    
    local title="Security Alert: $alert_type"
    local message="Alert Type: $alert_type\nSeverity: $severity\nDescription: $description\nSource: $source\nTimestamp: $(date)"
    
    local channels="slack,email,pagerduty"
    
    send_notification "$message" "$severity" "$title" "$channels"
}

# Main function with argument parsing
main() {
    print_header "ACCU Platform Notification System"
    
    # Create necessary directories and files
    mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$WEBHOOK_URLS_FILE")"
    
    # Load webhook configurations
    load_webhooks
    
    # Show help if no arguments
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    local command=$1
    shift
    
    case $command in
        "notify")
            local message="${1:-No message provided}"
            local severity="${2:-info}"
            local title="${3:-ACCU Platform Alert}"
            local channels="${4:-slack,discord,email}"
            send_notification "$message" "$severity" "$title" "$channels"
            ;;
        "deployment")
            local environment="${1:-production}"
            local status="${2:-unknown}"
            local version="${3:-unknown}"
            local duration="${4:-unknown}"
            send_deployment_notification "$environment" "$status" "$version" "$duration"
            ;;
        "incident")
            local incident_type="${1:-system-error}"
            local severity="${2:-warning}"
            local description="${3:-No description provided}"
            local affected_services="${4:-backend,frontend}"
            send_incident_notification "$incident_type" "$severity" "$description" "$affected_services"
            ;;
        "health")
            local component="${1:-system}"
            local status="${2:-unknown}"
            local details="${3:-No details provided}"
            send_health_notification "$component" "$status" "$details"
            ;;
        "security")
            local alert_type="${1:-security-event}"
            local severity="${2:-warning}"
            local description="${3:-No description provided}"
            local source="${4:-security-scanner}"
            send_security_alert "$alert_type" "$severity" "$description" "$source"
            ;;
        "test")
            send_notification "Test notification from ACCU Platform monitoring system" "info" "Test Alert" "slack,discord,email"
            ;;
        *)
            echo "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Help function
show_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  notify <message> [severity] [title] [channels]     Send custom notification"
    echo "  deployment <env> <status> <version> <duration>    Send deployment notification"
    echo "  incident <type> <severity> <description> [services] Send incident notification"
    echo "  health <component> <status> [details]             Send health notification"
    echo "  security <type> <severity> <description> [source] Send security alert"
    echo "  test                                              Send test notification"
    echo ""
    echo "Severity levels: info, warning, critical"
    echo "Channels: slack, discord, teams, email, pagerduty"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT               Environment name (default: production)"
    echo "  WEBHOOK_URLS_FILE         Webhook configuration file path"
    echo "  LOG_FILE                  Log file path"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac