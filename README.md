# Craft Mailchimp Module

A thin wrapper module for the Mailchimp Marketing API v3 that provides transparent access to all Mailchimp endpoints for Craft CMS 4+.

## Features

- **Transparent API Access**: Direct pass-through to Mailchimp's API with no abstraction
- **Enhanced JavaScript API**: Comprehensive client-side wrapper with helper methods
- **Webhook Support**: Handle Mailchimp webhooks with event dispatching
- **Rate Limiting**: Built-in rate limiting (30 requests/minute)
- **CSRF Protection**: Automatic CSRF validation for API endpoints
- **Examples**: Complete templates demonstrating common use cases

## Requirements

- Craft CMS 4.0+
- PHP 8.0.2+
- Mailchimp account with API key

## Installation

### Quick Installation (Automated)

After adding the submodule, you can use the installation helper script:

```bash
# Add the submodule
git submodule add https://github.com/mach1media/craft-mailchimp.git modules/craft-mailchimp

# Run the installation helper
bash modules/craft-mailchimp/install.sh
```

The script will:
- Prompt you for your layout template path
- Copy and update template files automatically
- Set up JavaScript dependencies in the correct locations
- Provide environment variable configuration reminders

### Manual Installation

1. Add the module as a git submodule:
```bash
git submodule add https://github.com/mach1media/craft-mailchimp.git modules/craft-mailchimp
```

2. Update your `composer.json` autoload configuration:
```json
{
    "autoload": {
        "psr-4": {
            "rcg\\mailchimp\\": "modules/craft-mailchimp/src/"
        }
    }
}
```

3. Run composer dump-autoload:
```bash
composer dump-autoload
```

4. Add your Mailchimp credentials to `.env`:
```
MAILCHIMP_API_KEY="your-api-key-here"
MAILCHIMP_LIST_ID="your-list-id"
MAILCHIMP_SIGNUP_URL="https://mailchi.mp/yourdomain/signup"
MAILCHIMP_SERVER_PREFIX=""  # Optional: e.g., "us19" (auto-detected if not set)
```

5. Register the module in `config/app.php`:
```php
return [
    'modules' => [
        'mailchimp' => \rcg\mailchimp\MailchimpModule::class,
    ],
    'bootstrap' => ['mailchimp'],
];
```

6. **Copy and adapt the template files:**
```bash
# Create mailchimp templates directory
mkdir -p templates/mailchimp

# Copy example templates
cp -r modules/craft-mailchimp/templates/* templates/mailchimp/

# Update the templates to extend your project's layout
# Edit each template to replace the default layout with your project's layout:
# Change: {% extends "_layout" %}
# To: {% extends "_layout/default" %} (or your project's actual layout path)
```

7. **Copy JavaScript dependencies to your web root:**

For standard installations:
```bash
# Copy the mailchimp.js file to your public directory
cp modules/craft-mailchimp/resources/js/mailchimp.js public/js/
```

For DDEV installations:
```bash
# Copy to your source directory if using a build process
cp modules/craft-mailchimp/resources/js/mailchimp.js src/js/vendor/

# Or copy directly to the public directory
ddev exec cp modules/craft-mailchimp/resources/js/mailchimp.js public/js/
```

If using Laravel Mix or Webpack:
```javascript
// In your webpack.mix.js or webpack config
mix.copy('modules/craft-mailchimp/resources/js/mailchimp.js', 'public/js/vendor/');
```

## Configuration

### Environment Variables

Required environment variables in your `.env` file:

- `MAILCHIMP_API_KEY` - Your Mailchimp API key (required)
- `MAILCHIMP_LIST_ID` - Default list ID for operations (optional)
- `MAILCHIMP_SIGNUP_URL` - Fallback signup URL (optional)
- `MAILCHIMP_SERVER_PREFIX` - API server prefix, e.g., "us19" (auto-detected from API key if not set)

### Optional Config File

Create `config/mailchimp.php` for advanced settings:

```php
return [
    'enableWebhooks' => true,
    'webhookSecret' => 'your-webhook-secret',
    'rateLimit' => 30, // requests per minute
];
```

## Usage

### From JavaScript/AJAX

Include the JavaScript wrapper and CryptoJS for MD5 hashing:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
<script src="/js/mailchimp.js"></script> <!-- Or /js/vendor/mailchimp.js depending on your setup -->
```

Initialize and use the API:

```javascript
// Initialize the API
const mailchimp = new MailchimpAPI({
    csrfTokenName: '{{ craft.app.config.general.csrfTokenName }}',
    csrfTokenValue: '{{ craft.app.request.csrfToken }}',
    listId: '{{ getenv("MAILCHIMP_LIST_ID") }}'
});

// Check subscription status
const status = await mailchimp.getSubscriptionStatus('user@example.com');

// Subscribe a new member
await mailchimp.subscribeMember('user@example.com', {
    FNAME: 'John',
    LNAME: 'Doe'
});

// Batch operations
await mailchimp.batchSubscribe(['email1@example.com', 'email2@example.com']);

// Tags
await mailchimp.addTags('user@example.com', ['customer', 'newsletter']);

// Search members
const results = await mailchimp.searchMembers('john');
```

### From PHP/Twig

```php
// In PHP
$module = \rcg\mailchimp\MailchimpModule::getInstance();
$response = $module->api->get('/lists');

// Subscribe a member
$response = $module->api->put("/lists/{$listId}/members/" . md5($email), [
    'email_address' => $email,
    'status' => 'subscribed'
]);
```

```twig
{# In Twig #}
{% set module = craft.app.modules.mailchimp %}
{% set response = module.api.get('/lists/' ~ listId) %}
{% if response.success %}
    <p>List name: {{ response.data.name }}</p>
{% endif %}
```

## API Reference

The module provides a single endpoint that accepts any Mailchimp API request:

**Endpoint:** `/actions/mailchimp/api/request`

**Parameters:**
- `method` - HTTP method (GET, POST, PATCH, PUT, DELETE)
- `endpoint` - Mailchimp API endpoint (e.g., `/lists`, `/lists/{list_id}/members`)
- `params` - Request parameters (query params for GET, body for others)

## JavaScript API Methods

See [docs/javascript-api.md](docs/javascript-api.md) for complete documentation of all available methods.

## Webhooks

See [docs/webhooks.md](docs/webhooks.md) for webhook configuration and handling.

## Examples

The module includes example templates in the `templates/examples/` directory:

- `check-subscription.twig` - Check if an email is subscribed
- `get-subscriber.twig` - Get full subscriber details
- `list-info.twig` - Display list information and stats
- `signup-url.twig` - Get the hosted signup form URL

Access the test interface at `/mailchimp/test` after installation.

## Template Customization

### Adapting Templates to Your Project

The example templates use a generic layout structure. When integrating into your project:

1. **Update the layout inheritance:**
   ```twig
   {# Change from: #}
   {% extends "_layout" %}
   
   {# To your project's layout: #}
   {% extends "_layout/default" %}
   ```

2. **Adjust block names to match your layout:**
   ```twig
   {# If your layout uses different block names: #}
   {% block main %}  {# instead of 'content' #}
       <!-- Your content here -->
   {% endblock %}
   ```

3. **Update asset paths:**
   ```twig
   {# Update JavaScript path based on your setup: #}
   <script src="{{ siteUrl }}js/vendor/mailchimp.js"></script>
   {# or #}
   <script src="{{ alias('@web/dist/js/mailchimp.js') }}"></script>
   ```

### For Build Process Users (Laravel Mix, Webpack, etc.)

If using a build process, update your configuration to include the Mailchimp JavaScript:

```javascript
// webpack.mix.js example
mix.js('src/js/app.js', 'public/dist/js')
   .copy('modules/craft-mailchimp/resources/js/mailchimp.js', 'public/dist/js/vendor/')
   .sass('src/css/app.scss', 'public/dist/css');
```

## Testing

Integration test examples are provided in `tests/integration/`. These demonstrate how to test your Mailchimp integration.

## License

This module is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/mach1media/craft-mailchimp/issues).

## Credits

Developed by [RCG](https://github.com/mach1media) for use in Craft CMS projects.