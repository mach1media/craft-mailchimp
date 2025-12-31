# Webhook Documentation

The Craft Mailchimp module includes webhook support for receiving real-time notifications from Mailchimp about list activity.

## Overview

Webhooks allow Mailchimp to notify your application when certain events occur, such as:
- New subscriber joins your list
- Subscriber unsubscribes
- Email address is changed
- Profile information is updated
- Email is cleaned/bounced

## Configuration

### 1. Enable Webhooks

Create a `config/mailchimp.php` file:

```php
return [
    'enableWebhooks' => true,
    'webhookSecret' => 'your-secret-key', // Optional, for signature verification
];
```

### 2. Get Your Webhook URL

Access the webhook info endpoint to get your URL:

```javascript
// Via JavaScript
const response = await fetch('/actions/mailchimp/webhook/info', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
        [csrfTokenName]: csrfTokenValue
    })
});

const info = await response.json();
console.log('Webhook URL:', info.webhook_url);
```

Your webhook URL will be:
```
https://yoursite.com/actions/mailchimp/webhook/handle
```

### 3. Configure in Mailchimp

1. Log in to your Mailchimp account
2. Navigate to your list/audience
3. Go to Settings > Webhooks
4. Add your webhook URL
5. Select the events you want to receive:
   - Subscribes
   - Unsubscribes
   - Profile Updates
   - Email Address Changes
   - Cleaned Addresses
   - Campaign Sending Status

## Webhook Events

### Event Types

The module handles these webhook types:

- `subscribe` - New subscriber added to list
- `unsubscribe` - Subscriber removed themselves from list
- `profile` - Subscriber updated their profile information
- `upemail` - Subscriber changed their email address
- `cleaned` - Email was cleaned (hard bounce, abuse complaint)
- `campaign` - Campaign-related events

### Event Data Structure

Mailchimp sends webhook data in this format:

```json
{
    "type": "subscribe",
    "fired_at": "2024-01-15 12:00:00",
    "data": {
        "id": "8d4f7c5b",
        "email": "user@example.com",
        "email_type": "html",
        "ip_signup": "192.168.1.1",
        "timestamp_signup": "2024-01-15 12:00:00",
        "merge_fields": {
            "FNAME": "John",
            "LNAME": "Doe"
        },
        "list_id": "1588e4937f"
    }
}
```

## Handling Webhook Events

### Method 1: Event Listeners

Listen for webhook events in your module or plugin:

```php
use rcg\mailchimp\controllers\WebhookController;
use rcg\mailchimp\events\WebhookEvent;
use yii\base\Event;

Event::on(
    WebhookController::class,
    WebhookController::EVENT_WEBHOOK_RECEIVED,
    function (WebhookEvent $event) {
        // Handle the webhook
        switch ($event->type) {
            case 'subscribe':
                $this->handleNewSubscriber($event->data);
                break;
            case 'unsubscribe':
                $this->handleUnsubscribe($event->data);
                break;
            // ... handle other types
        }
    }
);
```

### Method 2: Custom Module

Create a custom module that listens for webhook events:

```php
namespace modules\mymodule;

use Craft;
use yii\base\Module;
use rcg\mailchimp\controllers\WebhookController;
use rcg\mailchimp\events\WebhookEvent;
use yii\base\Event;

class MyModule extends Module
{
    public function init()
    {
        parent::init();
        
        // Listen for Mailchimp webhooks
        Event::on(
            WebhookController::class,
            WebhookController::EVENT_WEBHOOK_RECEIVED,
            [$this, 'handleWebhook']
        );
    }
    
    public function handleWebhook(WebhookEvent $event)
    {
        // Log the webhook
        Craft::info(
            'Mailchimp webhook received: ' . $event->type,
            __METHOD__
        );
        
        // Process based on type
        switch ($event->type) {
            case 'subscribe':
                // Create user account, send welcome email, etc.
                $email = $event->data['data']['email'] ?? null;
                if ($email) {
                    $this->createUserAccount($email, $event->data['data']);
                }
                break;
                
            case 'unsubscribe':
                // Update user preferences, disable account, etc.
                $email = $event->data['data']['email'] ?? null;
                if ($email) {
                    $this->disableNewsletters($email);
                }
                break;
        }
    }
}
```

## Security

### Webhook Verification

While Mailchimp doesn't provide webhook signatures by default, you can implement your own verification:

1. **IP Whitelisting**: Restrict webhook endpoint to Mailchimp's IP addresses
2. **Secret Token**: Add a secret token to your webhook URL
3. **HTTPS Only**: Always use HTTPS for webhook URLs

### Example with Secret Token

```php
// In config/mailchimp.php
return [
    'enableWebhooks' => true,
    'webhookSecret' => getenv('MAILCHIMP_WEBHOOK_SECRET'),
];

// Webhook URL with secret
https://yoursite.com/actions/mailchimp/webhook/handle?secret=your-secret-token
```

## Testing Webhooks

### Local Development

Use [ngrok](https://ngrok.com/) to test webhooks locally:

```bash
ngrok http 80
```

Then use the ngrok URL as your webhook endpoint in Mailchimp.

### Test Webhook Handler

```javascript
// Simulate a webhook for testing
async function testWebhook() {
    const testData = {
        type: 'subscribe',
        fired_at: new Date().toISOString(),
        data: {
            email: 'test@example.com',
            merge_fields: {
                FNAME: 'Test',
                LNAME: 'User'
            }
        }
    };
    
    const response = await fetch('/actions/mailchimp/webhook/handle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
    });
    
    console.log('Test webhook response:', await response.json());
}
```

## Common Use Cases

### 1. Sync Subscribers to Craft Users

```php
public function handleNewSubscriber($data)
{
    $email = $data['email'] ?? null;
    if (!$email) return;
    
    // Check if user exists
    $user = Craft::$app->users->getUserByUsernameOrEmail($email);
    
    if (!$user) {
        // Create new user
        $user = new User();
        $user->username = $email;
        $user->email = $email;
        $user->firstName = $data['merge_fields']['FNAME'] ?? '';
        $user->lastName = $data['merge_fields']['LNAME'] ?? '';
        
        Craft::$app->elements->saveElement($user);
    }
    
    // Update user field to mark as subscribed
    $user->setFieldValue('newsletterSubscribed', true);
    Craft::$app->elements->saveElement($user);
}
```

### 2. Track Unsubscribes

```php
public function handleUnsubscribe($data)
{
    $email = $data['email'] ?? null;
    if (!$email) return;
    
    // Log unsubscribe
    Craft::info(
        "User unsubscribed: {$email}",
        'mailchimp-webhooks'
    );
    
    // Update user preferences
    $user = Craft::$app->users->getUserByUsernameOrEmail($email);
    if ($user) {
        $user->setFieldValue('newsletterSubscribed', false);
        $user->setFieldValue('unsubscribeDate', new \DateTime());
        Craft::$app->elements->saveElement($user);
    }
}
```

### 3. Email Change Tracking

```php
public function handleEmailChange($data)
{
    $oldEmail = $data['old_email'] ?? null;
    $newEmail = $data['new_email'] ?? null;
    
    if ($oldEmail && $newEmail) {
        // Update user email
        $user = Craft::$app->users->getUserByUsernameOrEmail($oldEmail);
        if ($user) {
            $user->email = $newEmail;
            $user->username = $newEmail; // If using email as username
            Craft::$app->elements->saveElement($user);
        }
    }
}
```

## Troubleshooting

### Webhook Not Receiving

1. Verify webhook URL is accessible publicly
2. Check Craft's web.log for incoming requests
3. Ensure CSRF validation is disabled for webhook endpoint
4. Test with curl:

```bash
curl -X POST https://yoursite.com/actions/mailchimp/webhook/handle \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{"email":"test@example.com"}}'
```

### Common Issues

- **404 Error**: Module not properly bootstrapped in config/app.php
- **403 Error**: CSRF validation failing (should be disabled for webhooks)
- **500 Error**: Check Craft logs for PHP errors

## Best Practices

1. **Log Everything**: Log all webhook events for debugging
2. **Idempotent Handling**: Ensure webhook handlers can be run multiple times safely
3. **Async Processing**: For heavy processing, queue jobs instead of processing inline
4. **Error Handling**: Always wrap webhook handlers in try-catch blocks
5. **Monitoring**: Set up alerts for webhook failures