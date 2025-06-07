#!/bin/bash
# Production deployment script for O4O Platform Microservices
# Usage: ./deploy-production.sh

set -e  # Exit on any error

echo "🚀 O4O Platform Production Deployment"
echo "====================================="

# Configuration
DEPLOY_USER="deploy"
DEPLOY_DIR="/home/deploy/microservices"
LOG_DIR="/var/log/pm2"
DB_NAME="o4o_platform"
DB_USER="o4o_user"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if running as deploy user
check_user() {
    if [[ $(whoami) != "$DEPLOY_USER" ]]; then
        error "This script must be run as the $DEPLOY_USER user"
    fi
    log "✅ Running as correct user: $DEPLOY_USER"
}

# Check system requirements
check_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js first."
    fi
    log "✅ Node.js version: $(node --version)"
    
    # Check Python
    if ! command -v python3.11 &> /dev/null; then
        error "Python 3.11 is not installed. Please install Python 3.11 first."
    fi
    log "✅ Python version: $(python3.11 --version)"
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log "📦 Installing PM2..."
        npm install -g pm2
    fi
    log "✅ PM2 version: $(pm2 --version)"
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        warning "PostgreSQL client not found. Some database operations may not work."
    else
        log "✅ PostgreSQL client available"
    fi
}

# Setup directory structure
setup_directories() {
    log "📁 Setting up directory structure..."
    
    mkdir -p $DEPLOY_DIR
    mkdir -p $LOG_DIR
    sudo chown -R $DEPLOY_USER:$DEPLOY_USER $LOG_DIR
    
    log "✅ Directories created"
}

# Clone or update repository
setup_repository() {
    log "📥 Setting up repository..."
    
    if [[ -d "$DEPLOY_DIR/.git" ]]; then
        log "🔄 Updating existing repository..."
        cd $DEPLOY_DIR
        git fetch origin
        git reset --hard origin/master
    else
        log "📦 Cloning repository..."
        git clone https://github.com/renagang21/renagang21.git $DEPLOY_DIR
        cd $DEPLOY_DIR
    fi
    
    log "✅ Repository ready"
}

# Build Common Core
build_common_core() {
    log "🔧 Building Common Core..."
    
    cd $DEPLOY_DIR/common-core
    
    # Install dependencies
    npm install
    
    # Build
    npm run build
    
    # Create global link
    sudo npm link
    
    log "✅ Common Core built and linked"
}

# Build O4O Platform
build_o4o_platform() {
    log "🏢 Building O4O Platform..."
    
    cd $DEPLOY_DIR/o4o-platform
    
    # Update package.json to use local common-core
    npm pkg set dependencies.@renagang21/common-core="file:../common-core"
    
    # Install dependencies
    npm install
    
    # Link common core
    sudo npm link @renagang21/common-core
    
    # Build
    npm run build
    
    # Create environment file
    cat > .env << EOF
NODE_ENV=production
PORT=3004
DATABASE_URL=postgresql://$DB_USER:CHANGE_PASSWORD@localhost:5432/o4o_platform
JWT_SECRET=CHANGE_JWT_SECRET_IN_PRODUCTION
COOKIE_SECRET=CHANGE_COOKIE_SECRET_IN_PRODUCTION
LOG_LEVEL=info
EOF
    
    chmod 600 .env
    
    log "✅ O4O Platform built"
}

# Build RPA Services
build_rpa_services() {
    log "🤖 Building RPA Services..."
    
    cd $DEPLOY_DIR/rpa-services
    
    # Update package.json to use local common-core
    npm pkg set dependencies.@renagang21/common-core="file:../common-core"
    
    # Install dependencies
    npm install
    
    # Link common core
    sudo npm link @renagang21/common-core
    
    # Build
    npm run build
    
    # Create environment file
    cat > .env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://$DB_USER:CHANGE_PASSWORD@localhost:5432/rpa_services
LOG_LEVEL=info
O4O_PLATFORM_URL=http://localhost:3004
AI_SERVICES_URL=http://localhost:3000
EOF
    
    chmod 600 .env
    
    log "✅ RPA Services built"
}

# Setup AI Services
setup_ai_services() {
    log "🧠 Setting up AI Services..."
    
    cd $DEPLOY_DIR/ai-services
    
    # Create virtual environment
    python3.11 -m venv venv
    source venv/bin/activate
    
    # Install dependencies
    pip install fastapi uvicorn python-multipart
    
    # Create main.py if it doesn't exist
    if [[ ! -f "src/main.py" ]]; then
        mkdir -p src
        cp $DEPLOY_DIR/deployment-package/ai-services-main.py src/main.py
    fi
    
    # Create environment file
    cat > .env << EOF
PYTHON_ENV=production
PORT=3000
DATABASE_URL=postgresql://$DB_USER:CHANGE_PASSWORD@localhost:5432/ai_services
EOF
    
    chmod 600 .env
    
    log "✅ AI Services configured"
}

# Setup PM2 ecosystem
setup_pm2() {
    log "⚙️ Setting up PM2 ecosystem..."
    
    cd $DEPLOY_DIR
    
    # Copy ecosystem config
    if [[ -f "deployment-package/ecosystem.config.js" ]]; then
        cp deployment-package/ecosystem.config.js .
    else
        error "ecosystem.config.js not found in deployment package"
    fi
    
    # Delete existing PM2 processes
    pm2 delete all 2>/dev/null || true
    
    # Start services
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup startup script
    pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER
    
    log "✅ PM2 ecosystem configured"
}

# Test services
test_services() {
    log "🧪 Testing services..."
    
    sleep 10  # Wait for services to start
    
    # Test O4O Platform
    if curl -f http://localhost:3004/health &>/dev/null; then
        log "✅ O4O Platform is responding"
    else
        warning "❌ O4O Platform health check failed"
    fi
    
    # Test AI Services
    if curl -f http://localhost:3000/health &>/dev/null; then
        log "✅ AI Services is responding"
    else
        warning "❌ AI Services health check failed"
    fi
    
    # Test RPA Services
    if curl -f http://localhost:3001/health &>/dev/null; then
        log "✅ RPA Services is responding"
    else
        warning "❌ RPA Services health check failed"
    fi
}

# Display status
show_status() {
    log "📊 Final Status:"
    pm2 status
    
    echo ""
    log "🌐 Service URLs (internal):"
    echo "  O4O Platform: http://localhost:3004"
    echo "  AI Services:  http://localhost:3000"
    echo "  RPA Services: http://localhost:3001"
    
    echo ""
    log "📝 Next Steps:"
    echo "  1. Update database passwords in .env files"
    echo "  2. Update JWT and cookie secrets"
    echo "  3. Configure Nginx on WebServer"
    echo "  4. Setup SSL certificates"
    echo "  5. Configure domain DNS"
    
    echo ""
    log "🔧 Management Commands:"
    echo "  pm2 status          - Check service status"
    echo "  pm2 logs            - View all logs"
    echo "  pm2 restart all     - Restart all services"
    echo "  pm2 monit           - Real-time monitoring"
}

# Main execution
main() {
    log "Starting production deployment..."
    
    check_user
    check_requirements
    setup_directories
    setup_repository
    build_common_core
    build_o4o_platform
    build_rpa_services
    setup_ai_services
    setup_pm2
    test_services
    show_status
    
    log "🎉 Deployment completed successfully!"
}

# Run main function
main "$@"
