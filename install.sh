#!/bin/bash

# Craft Mailchimp Module Installation Helper
# This script helps automate the installation process for the craft-mailchimp module

echo "🚀 Craft Mailchimp Module Installation Helper"
echo "============================================"

# Check if we're in the project root (look for craft or composer.json)
if [ ! -f "composer.json" ] && [ ! -f "craft" ]; then
    echo "❌ Error: This script should be run from your Craft project root directory"
    exit 1
fi

# Get the layout template path from user
echo ""
echo "📋 Template Configuration"
echo "What is the path to your base layout template?"
echo "Common examples:"
echo "  - _layout"
echo "  - _layout/default"
echo "  - _layouts/main"
echo "  - layouts/base"
read -p "Layout template path [_layout]: " LAYOUT_PATH
LAYOUT_PATH=${LAYOUT_PATH:-_layout}

# Check if using DDEV
if command -v ddev &> /dev/null && [ -d ".ddev" ]; then
    IS_DDEV=true
    echo "✅ DDEV environment detected"
else
    IS_DDEV=false
    echo "📦 Standard installation detected"
fi

# Create templates directory
echo ""
echo "📁 Creating templates directory..."
mkdir -p templates/mailchimp

# Copy templates
echo "📋 Copying template files..."
if [ -d "modules/craft-mailchimp/templates" ]; then
    cp -r modules/craft-mailchimp/templates/* templates/mailchimp/
    echo "✅ Templates copied to templates/mailchimp/"
else
    echo "❌ Error: Could not find modules/craft-mailchimp/templates directory"
    exit 1
fi

# Update template layouts
echo "🔧 Updating template layouts..."
if command -v sed &> /dev/null; then
    # Update all twig files to use the specified layout
    find templates/mailchimp -name "*.twig" -type f -exec sed -i.bak "s|{% extends [\"']_layout[\"'] %}|{% extends \"$LAYOUT_PATH\" %}|g" {} \;
    # Remove backup files
    find templates/mailchimp -name "*.bak" -type f -delete
    echo "✅ Updated templates to use layout: $LAYOUT_PATH"
else
    echo "⚠️  Warning: Could not automatically update layouts. Please manually update {% extends %} tags in templates."
fi

# Copy JavaScript files
echo ""
echo "📦 Setting up JavaScript dependencies..."

# Check if src directory exists (Laravel Mix/Webpack setup)
if [ -d "src/js" ]; then
    mkdir -p src/js/vendor
    cp modules/craft-mailchimp/resources/js/mailchimp.js src/js/vendor/
    echo "✅ Copied mailchimp.js to src/js/vendor/"
    
    # Check if webpack.mix.js exists
    if [ -f "src/webpack.mix.js" ]; then
        echo ""
        echo "📝 Add this to your webpack.mix.js:"
        echo "   mix.copy('vendor/mailchimp.js', '../public/dist/js/vendor/mailchimp.js');"
    fi
fi

# For DDEV, also copy to public directory
if [ "$IS_DDEV" = true ]; then
    echo "🐳 Setting up for DDEV..."
    ddev exec mkdir -p public/js/vendor
    ddev exec cp modules/craft-mailchimp/resources/js/mailchimp.js public/js/vendor/
    echo "✅ Copied mailchimp.js to public/js/vendor/ in DDEV container"
else
    # Standard installation
    mkdir -p public/js/vendor
    cp modules/craft-mailchimp/resources/js/mailchimp.js public/js/vendor/
    echo "✅ Copied mailchimp.js to public/js/vendor/"
fi

# Environment variables reminder
echo ""
echo "🔐 Environment Variables"
echo "Don't forget to add these to your .env file:"
echo ""
echo "MAILCHIMP_API_KEY=\"your-api-key-here\""
echo "MAILCHIMP_LIST_ID=\"your-list-id\""
echo "MAILCHIMP_SIGNUP_URL=\"https://mailchi.mp/yourdomain/signup\""
echo "MAILCHIMP_SERVER_PREFIX=\"\"  # Optional (e.g., us19)"

# Test URL
echo ""
echo "🧪 Testing"
echo "After adding your API credentials, test the integration at:"
if [ "$IS_DDEV" = true ]; then
    SITE_URL=$(ddev describe -j | grep -o '"primary_url":"[^"]*' | grep -o 'https://[^"]*' | head -1)
    echo "$SITE_URL/mailchimp/test"
else
    echo "https://your-site.test/mailchimp/test"
fi

echo ""
echo "✅ Installation helper completed!"
echo ""
echo "Next steps:"
echo "1. Add the environment variables to your .env file"
echo "2. If using a build process, compile your assets"
echo "3. Test the integration using the test interface"