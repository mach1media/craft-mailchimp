# JavaScript API Reference

The `MailchimpAPI` class provides a comprehensive client-side wrapper for interacting with the Mailchimp API through your Craft module.

## Initialization

```javascript
const mailchimp = new MailchimpAPI({
    endpoint: '/actions/mailchimp/api/request',     // Optional: API endpoint
    csrfTokenName: 'CRAFT_CSRF_TOKEN',             // CSRF token name
    csrfTokenValue: 'your-csrf-token',             // CSRF token value
    listId: 'your-list-id',                        // Default list ID
    debug: false,                                   // Enable debug logging
    requestTimeout: 30000,                          // Request timeout in ms
    onSuccess: function(result) { },                // Global success handler
    onError: function(error) { }                    // Global error handler
});
```

## Core Methods

### request(method, endpoint, params)

Make a raw API request to any Mailchimp endpoint.

```javascript
const response = await mailchimp.request('GET', '/lists', {
    count: 10,
    offset: 0
});
```

**Parameters:**
- `method` (string) - HTTP method: GET, POST, PATCH, PUT, DELETE
- `endpoint` (string) - Mailchimp API endpoint
- `params` (object) - Request parameters

**Returns:** Promise resolving to response object

## Subscriber Methods

### checkSubscription(email)

Check if an email address is subscribed to the list.

```javascript
const response = await mailchimp.checkSubscription('user@example.com');
if (response.success) {
    console.log('Status:', response.data.status);
}
```

### getSubscriptionStatus(email)

Get user-friendly subscription status information.

```javascript
const status = await mailchimp.getSubscriptionStatus('user@example.com');
if (status.found) {
    if (status.subscribed) {
        console.log('Email is subscribed');
    } else if (status.unsubscribed) {
        console.log('Email was unsubscribed');
    }
} else {
    console.log('Email not found in list');
}
```

**Returns:**
```javascript
{
    found: true,              // Whether email exists in list
    status: 'subscribed',     // Status: subscribed, unsubscribed, pending, cleaned
    email: 'user@example.com',
    subscribed: true,
    unsubscribed: false,
    pending: false,
    cleaned: false,
    data: { /* raw member data */ }
}
```

### subscribeMember(email, mergeFields)

Subscribe a new member to the list.

```javascript
await mailchimp.subscribeMember('user@example.com', {
    FNAME: 'John',
    LNAME: 'Doe',
    BIRTHDAY: '01/15'
});
```

### unsubscribeMember(email)

Unsubscribe a member from the list.

```javascript
await mailchimp.unsubscribeMember('user@example.com');
```

### addOrUpdateMember(email, data)

Add a new member or update existing member.

```javascript
await mailchimp.addOrUpdateMember('user@example.com', {
    status: 'subscribed',
    merge_fields: {
        FNAME: 'Jane',
        LNAME: 'Smith'
    },
    interests: {
        'f241a29c12': true  // Interest ID
    }
});
```

### archiveMember(email)

Archive (soft delete) a member.

```javascript
await mailchimp.archiveMember('user@example.com');
```

### permanentlyDeleteMember(email)

Permanently delete a member (cannot be undone).

```javascript
await mailchimp.permanentlyDeleteMember('user@example.com');
```

## Batch Operations

### batchSubscribe(emails, options)

Subscribe multiple email addresses at once.

```javascript
const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
const response = await mailchimp.batchSubscribe(emails, {
    merge_fields: {
        SOURCE: 'Import'
    }
});
```

### batchUnsubscribe(emails)

Unsubscribe multiple email addresses.

```javascript
const emails = ['user1@example.com', 'user2@example.com'];
await mailchimp.batchUnsubscribe(emails);
```

## List Methods

### getLists()

Get all lists in the account.

```javascript
const response = await mailchimp.getLists();
if (response.success) {
    response.data.lists.forEach(list => {
        console.log(list.name, list.id);
    });
}
```

### getList(listId)

Get information about a specific list.

```javascript
const response = await mailchimp.getList('abc123def');
if (response.success) {
    console.log('List name:', response.data.name);
    console.log('Member count:', response.data.stats.member_count);
}
```

### getListSignupUrl(listId)

Get the hosted signup form URL for a list.

```javascript
const signupUrl = await mailchimp.getListSignupUrl('abc123def');
console.log('Signup URL:', signupUrl);
```

### getMembers(params)

Get members of the list.

```javascript
const response = await mailchimp.getMembers({
    count: 50,
    offset: 0,
    status: 'subscribed',
    sort_field: 'timestamp_signup',
    sort_dir: 'DESC'
});
```

## Tag Methods

### addTags(email, tags)

Add tags to a member.

```javascript
await mailchimp.addTags('user@example.com', ['customer', 'vip', 'newsletter']);
```

### removeTags(email, tags)

Remove tags from a member.

```javascript
await mailchimp.removeTags('user@example.com', ['prospect']);
```

### getTags(email)

Get all tags for a member.

```javascript
const response = await mailchimp.getTags('user@example.com');
if (response.success) {
    response.data.tags.forEach(tag => {
        console.log(tag.name);
    });
}
```

## Segment Methods

### getSegments(params)

Get all segments for the list.

```javascript
const response = await mailchimp.getSegments({
    count: 10,
    offset: 0
});
```

### addToSegment(email, segmentId)

Add a member to a static segment.

```javascript
await mailchimp.addToSegment('user@example.com', 'seg123');
```

## Campaign Methods

### getCampaigns(params)

Get all campaigns.

```javascript
const response = await mailchimp.getCampaigns({
    count: 20,
    offset: 0,
    status: 'sent',
    sort_field: 'send_time',
    sort_dir: 'DESC'
});
```

### getCampaignContent(campaignId)

Get the content of a specific campaign.

```javascript
const response = await mailchimp.getCampaignContent('camp123');
if (response.success) {
    console.log('HTML content:', response.data.html);
}
```

## Activity Methods

### getMemberActivity(email)

Get activity history for a member.

```javascript
const response = await mailchimp.getMemberActivity('user@example.com');
if (response.success) {
    response.data.activity.forEach(activity => {
        console.log(activity.action, activity.timestamp);
    });
}
```

### getMemberEvents(email, params)

Get detailed events for a member.

```javascript
const response = await mailchimp.getMemberEvents('user@example.com', {
    count: 10,
    offset: 0
});
```

## Interest/Group Methods

### getInterestCategories()

Get interest categories (groups) for the list.

```javascript
const response = await mailchimp.getInterestCategories();
if (response.success) {
    response.data.categories.forEach(category => {
        console.log(category.title, category.id);
    });
}
```

### updateMemberInterests(email, interests)

Update member's interest group selections.

```javascript
await mailchimp.updateMemberInterests('user@example.com', {
    'f241a29c12': true,   // Interest ID: subscribed
    'a1e9f4b7c2': false   // Interest ID: not subscribed
});
```

## Automation Methods

### triggerAutomation(workflowId, email)

Trigger an automation workflow for a subscriber.

```javascript
await mailchimp.triggerAutomation('auto123', 'user@example.com');
```

### pauseAutomation(workflowId, email)

Remove a subscriber from an automation workflow.

```javascript
await mailchimp.pauseAutomation('auto123', 'user@example.com');
```

## Search Methods

### searchMembers(query, options)

Search for members across all lists.

```javascript
const response = await mailchimp.searchMembers('john', {
    list_id: 'abc123'  // Optional: limit to specific list
});
```

## Utility Methods

### validateEmail(email)

Validate an email address with custom rules.

```javascript
const validation = mailchimp.validateEmail('user@example.com');
if (!validation.valid) {
    console.error(validation.error);
}
```

**Returns:**
```javascript
{
    valid: true,
    error: null  // or error message if invalid
}
```

### isValidEmail(email)

Basic email format validation.

```javascript
if (mailchimp.isValidEmail('user@example.com')) {
    console.log('Valid email format');
}
```

### isDomainBlocked(email)

Check if email domain is in the blocklist.

```javascript
if (mailchimp.isDomainBlocked('user@example.cn')) {
    console.log('Domain is blocked');
}
```

### md5(string)

Generate MD5 hash (used for subscriber_hash).

```javascript
const hash = mailchimp.md5('user@example.com');
console.log('Subscriber hash:', hash);
```

### formatMergeFields(data)

Format merge fields to uppercase keys.

```javascript
const formatted = mailchimp.formatMergeFields({
    fname: 'John',
    lname: 'Doe'
});
// Returns: { FNAME: 'John', LNAME: 'Doe' }
```

## Error Handling

### Global Error Handler

```javascript
const mailchimp = new MailchimpAPI({
    // ... other options
    onError: function(error) {
        console.error('API Error:', error);
        // Show user notification
        showNotification('Error: ' + error.error);
    }
});
```

### Per-Request Error Handling

```javascript
try {
    const response = await mailchimp.subscribeMember('invalid-email');
} catch (error) {
    console.error('Subscribe failed:', error.message);
}
```

### Response Format

All methods return responses in this format:

```javascript
// Success response
{
    success: true,
    data: { /* Mailchimp API response */ },
    status: 200
}

// Error response
{
    success: false,
    error: {
        type: 'invalid_resource',
        title: 'Invalid Resource',
        detail: 'The resource submitted could not be validated.'
    },
    code: 400
}
```

## Examples

### Complete Subscription Flow

```javascript
async function handleSubscription(email, firstName, lastName) {
    // Validate email
    const validation = mailchimp.validateEmail(email);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    try {
        // Check current status
        const status = await mailchimp.getSubscriptionStatus(email);
        
        if (status.found && status.subscribed) {
            alert('You are already subscribed!');
            return;
        }
        
        // Subscribe with merge fields
        await mailchimp.subscribeMember(email, {
            FNAME: firstName,
            LNAME: lastName
        });
        
        // Add tags
        await mailchimp.addTags(email, ['website-signup', 'pending-welcome']);
        
        alert('Successfully subscribed! Please check your email.');
        
    } catch (error) {
        alert('Subscription failed: ' + error.message);
    }
}
```

### Batch Import with Error Handling

```javascript
async function importSubscribers(csvData) {
    const emails = csvData.split('\n').map(line => line.trim());
    const validEmails = [];
    const invalidEmails = [];
    
    // Validate emails
    emails.forEach(email => {
        const validation = mailchimp.validateEmail(email);
        if (validation.valid) {
            validEmails.push(email);
        } else {
            invalidEmails.push({ email, error: validation.error });
        }
    });
    
    console.log(`Valid: ${validEmails.length}, Invalid: ${invalidEmails.length}`);
    
    if (validEmails.length > 0) {
        try {
            const response = await mailchimp.batchSubscribe(validEmails, {
                merge_fields: {
                    SOURCE: 'CSV Import'
                }
            });
            
            console.log('Batch operation ID:', response.data.id);
            
        } catch (error) {
            console.error('Batch import failed:', error);
        }
    }
}
```