# Integration Tests

This directory contains example integration tests for the Craft Mailchimp module.

## Overview

These tests demonstrate how to verify your Mailchimp integration is working correctly. They're designed to be run against your actual Mailchimp account using your API credentials.

## Setup

1. Ensure your `.env` file contains valid Mailchimp credentials:
   ```
   MAILCHIMP_API_KEY="your-api-key"
   MAILCHIMP_LIST_ID="your-list-id"
   ```

2. Install testing dependencies (if using a testing framework):
   ```bash
   npm install --save-dev jest
   # or
   composer require --dev phpunit/phpunit
   ```

## Test Files

### example-tests.js

JavaScript-based integration tests using the MailchimpAPI wrapper. These tests verify:

- API connectivity
- List information retrieval
- Member operations (add, check, update, remove)
- Batch operations
- Tag management
- Webhook URL configuration

### Running JavaScript Tests

```bash
node tests/integration/example-tests.js
```

Or with a test runner like Jest:

```bash
npm test
```

## Important Notes

### Test Data

- Use test email addresses that you control
- Tests may create/modify actual data in your Mailchimp account
- Clean up test data after running tests

### Rate Limits

- Mailchimp has API rate limits (10 simultaneous connections, 500 requests/minute for paid accounts)
- Tests include delays to respect rate limits
- Run tests sequentially, not in parallel

### Best Practices

1. **Use Test Lists**: Create separate lists for testing to avoid affecting production data
2. **Mock External Calls**: For unit tests, mock the Mailchimp API calls
3. **Environment Isolation**: Use separate API keys for testing vs production
4. **Data Cleanup**: Always clean up test data after tests complete
5. **Error Handling**: Test both success and error scenarios

## Example Test Patterns

### Basic API Test

```javascript
async function testApiConnectivity() {
    const response = await mailchimp.getLists();
    assert(response.success, 'API should be accessible');
    assert(Array.isArray(response.data.lists), 'Should return lists array');
}
```

### Member Lifecycle Test

```javascript
async function testMemberLifecycle() {
    const testEmail = 'test@example.com';
    
    try {
        // Subscribe
        await mailchimp.subscribeMember(testEmail, {
            FNAME: 'Test',
            LNAME: 'User'
        });
        
        // Check status
        const status = await mailchimp.getSubscriptionStatus(testEmail);
        assert(status.subscribed, 'Should be subscribed');
        
        // Add tags
        await mailchimp.addTags(testEmail, ['test-tag']);
        
        // Verify tags
        const tagsResponse = await mailchimp.getTags(testEmail);
        assert(tagsResponse.success, 'Should get tags');
        
    } finally {
        // Cleanup
        await mailchimp.permanentlyDeleteMember(testEmail);
    }
}
```

### Error Handling Test

```javascript
async function testErrorHandling() {
    try {
        await mailchimp.checkSubscription('invalid-email');
        assert(false, 'Should have thrown error for invalid email');
    } catch (error) {
        assert(error.message.includes('email'), 'Error should mention email');
    }
}
```

## Webhook Testing

### Manual Webhook Test

Use tools like ngrok for local webhook testing:

```bash
# Terminal 1: Start ngrok
ngrok http 80

# Terminal 2: Test webhook
curl -X POST https://your-ngrok-url.ngrok.io/actions/mailchimp/webhook/handle \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscribe",
    "fired_at": "2024-01-15 12:00:00",
    "data": {
      "email": "test@example.com",
      "merge_fields": {"FNAME": "Test"}
    }
  }'
```

### Automated Webhook Test

```javascript
async function testWebhookEndpoint() {
    const testData = {
        type: 'subscribe',
        fired_at: new Date().toISOString(),
        data: {
            email: 'test@example.com',
            merge_fields: { FNAME: 'Test' }
        }
    };
    
    const response = await fetch('/actions/mailchimp/webhook/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    assert(result.success, 'Webhook should process successfully');
}
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Run Integration Tests
        env:
          MAILCHIMP_API_KEY: ${{ secrets.MAILCHIMP_TEST_API_KEY }}
          MAILCHIMP_LIST_ID: ${{ secrets.MAILCHIMP_TEST_LIST_ID }}
        run: |
          cd tests/integration
          node example-tests.js
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify API key is correct and active
2. **List Not Found**: Ensure list ID exists and is accessible
3. **Rate Limit**: Add delays between requests
4. **Timeout**: Increase timeout settings for slow connections

### Debug Mode

Enable debug mode to see detailed API requests:

```javascript
const mailchimp = new MailchimpAPI({
    debug: true,
    // ... other options
});
```

### Logging

Check Craft logs for webhook and API errors:

```bash
tail -f storage/logs/web.log
tail -f storage/logs/console.log
```