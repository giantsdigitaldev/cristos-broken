#!/bin/bash

# Deploy Apple App Site Association File to VPS
# This script uploads the apple-app-site-association file to the VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Configuration
VPS_HOST="69.62.68.172"
VPS_USER="root"
DOMAIN="cristos.ai"
ASSOCIATION_FILE="apple-app-site-association"
WELL_KNOWN_DIR="/var/www/cristos.ai/.well-known"

log "Starting Apple App Site Association deployment..."

# Check if the association file exists
if [ ! -f "$ASSOCIATION_FILE" ]; then
    error "Apple app site association file not found: $ASSOCIATION_FILE"
fi

# Check if SSH key is available
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
    warn "No SSH key found. You may need to enter your password."
fi

log "Uploading apple-app-site-association file to VPS..."

# Create .well-known directory on VPS
ssh $VPS_USER@$VPS_HOST "sudo mkdir -p $WELL_KNOWN_DIR"

# Upload the association file
scp $ASSOCIATION_FILE $VPS_USER@$VPS_HOST:/tmp/apple-app-site-association

# Move file to correct location and set permissions
ssh $VPS_USER@$VPS_HOST << 'EOF'
sudo mv /tmp/apple-app-site-association /var/www/cristos.ai/.well-known/apple-app-site-association
sudo chown www-data:www-data /var/www/cristos.ai/.well-known/apple-app-site-association
sudo chmod 644 /var/www/cristos.ai/.well-known/apple-app-site-association
sudo chown www-data:www-data /var/www/cristos.ai/.well-known/
sudo chmod 755 /var/www/cristos.ai/.well-known/
EOF

log "File uploaded successfully!"

# Test the file accessibility
log "Testing file accessibility..."
curl -I https://$DOMAIN/.well-known/apple-app-site-association

log "✅ Apple App Site Association file deployed successfully!"
log "📱 File is now accessible at: https://$DOMAIN/.well-known/apple-app-site-association"

# Verify JSON syntax
log "Verifying JSON syntax..."
curl -s https://$DOMAIN/.well-known/apple-app-site-association | python3 -m json.tool > /dev/null
if [ $? -eq 0 ]; then
    log "✅ JSON syntax is valid"
else
    error "❌ JSON syntax is invalid"
fi

log "🎉 Deployment completed successfully!"
log ""
log "Next steps:"
log "1. Update the Team ID in the association file"
log "2. Test universal links with your app"
log "3. Verify the setup with Apple's validation tools" 