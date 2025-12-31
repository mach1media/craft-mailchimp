/**
 * Integration Tests for Craft Mailchimp Module
 * 
 * These tests verify the module works correctly with your actual Mailchimp account.
 * Run with: node tests/integration/example-tests.js
 * 
 * IMPORTANT: These tests will create/modify real data in your Mailchimp account.
 * Use a test list and test email addresses.
 */

// Configuration - Update these values
const CONFIG = {
    baseUrl: 'https://your-site.local',  // Your local development URL
    testEmail: 'test@your-domain.com',   // Email address you control
    testListId: 'your-test-list-id',     // Test list ID (not production)
    csrfToken: 'your-csrf-token',        // Get from page source
    csrfTokenName: 'CRAFT_CSRF_TOKEN'
};

/**
 * Simple test runner
 */
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    test(name, fn) {
        this.tests.push({ name, fn });
    }
    
    async run() {
        console.log('🚀 Running Mailchimp Integration Tests\n');
        
        for (const test of this.tests) {
            try {
                console.log(`⏳ ${test.name}`);
                await test.fn();
                console.log(`✅ ${test.name} - PASSED\n`);
                this.passed++;
            } catch (error) {
                console.log(`❌ ${test.name} - FAILED`);
                console.log(`   Error: ${error.message}\n`);
                this.failed++;
            }
        }
        
        console.log('📊 Test Results:');
        console.log(`   Passed: ${this.passed}`);
        console.log(`   Failed: ${this.failed}`);
        console.log(`   Total:  ${this.tests.length}`);
        
        if (this.failed > 0) {
            process.exit(1);
        }
    }
}

/**
 * Simple assertion helper
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

/**
 * API helper for making requests
 */
async function apiRequest(endpoint, data = {}) {
    const response = await fetch(`${CONFIG.baseUrl}/actions/mailchimp/api/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            ...data,
            [CONFIG.csrfTokenName]: CONFIG.csrfToken
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

/**
 * Webhook helper
 */
async function webhookRequest(data) {
    const response = await fetch(`${CONFIG.baseUrl}/actions/mailchimp/webhook/handle`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    return await response.json();
}

/**
 * MD5 hash function for email addresses
 */
function md5(string) {
    // Simple MD5 implementation for testing
    // In real usage, use CryptoJS or similar
    const crypto = require('crypto');
    return crypto.createHash('md5').update(string.toLowerCase()).digest('hex');
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize test runner
const runner = new TestRunner();

// Test 1: API Connectivity
runner.test('API Connectivity Test', async () => {
    const response = await apiRequest('get-lists', {
        method: 'GET',
        endpoint: '/lists'
    });
    
    assert(response.success, 'API should be accessible');
    assert(response.data && Array.isArray(response.data.lists), 'Should return lists array');
    assert(response.data.lists.length > 0, 'Should have at least one list');
    
    console.log(`   Found ${response.data.lists.length} lists`);
});

// Test 2: Get Specific List
runner.test('Get List Information', async () => {
    const response = await apiRequest('get-list', {
        method: 'GET',
        endpoint: `/lists/${CONFIG.testListId}`
    });
    
    assert(response.success, 'Should get list information');
    assert(response.data.id === CONFIG.testListId, 'Should return correct list');
    assert(response.data.name, 'List should have a name');
    assert(response.data.stats, 'List should have stats');
    
    console.log(`   List: ${response.data.name} (${response.data.stats.member_count} members)`);
});

// Test 3: Check Non-existent Member
runner.test('Check Non-existent Member', async () => {
    const testEmail = `nonexistent-${Date.now()}@example.com`;
    const subscriberHash = md5(testEmail);
    
    const response = await apiRequest('check-member', {
        method: 'GET',
        endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}`
    });
    
    assert(!response.success, 'Non-existent member should return error');
    assert(response.code === 404, 'Should return 404 for non-existent member');
    
    console.log(`   Correctly returned 404 for ${testEmail}`);
});

// Test 4: Subscribe New Member
runner.test('Subscribe New Member', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const subscriberHash = md5(testEmail);
    
    // Subscribe the member
    const subscribeResponse = await apiRequest('subscribe-member', {
        method: 'PUT',
        endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}`,
        params: {
            email_address: testEmail,
            status: 'subscribed',
            merge_fields: {
                FNAME: 'Test',
                LNAME: 'User'
            }
        }
    });
    
    assert(subscribeResponse.success, 'Should successfully subscribe member');
    assert(subscribeResponse.data.email_address === testEmail, 'Should return correct email');
    assert(subscribeResponse.data.status === 'subscribed', 'Should be subscribed');
    
    // Wait a moment for propagation
    await sleep(1000);
    
    // Verify the member exists
    const checkResponse = await apiRequest('check-member', {
        method: 'GET',
        endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}`
    });
    
    assert(checkResponse.success, 'Should find the subscribed member');
    assert(checkResponse.data.status === 'subscribed', 'Member should be subscribed');
    
    console.log(`   Successfully subscribed ${testEmail}`);
    
    // Cleanup - remove the test member
    await apiRequest('delete-member', {
        method: 'DELETE',
        endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}`
    });
});

// Test 5: Batch Operations
runner.test('Batch Subscribe Operation', async () => {
    const timestamp = Date.now();
    const testEmails = [
        `batch-test-1-${timestamp}@example.com`,
        `batch-test-2-${timestamp}@example.com`,
        `batch-test-3-${timestamp}@example.com`
    ];
    
    const operations = testEmails.map((email, index) => ({
        method: 'PUT',
        path: `/lists/${CONFIG.testListId}/members/${md5(email)}`,
        body: JSON.stringify({
            email_address: email,
            status: 'subscribed',
            merge_fields: {
                FNAME: `Test${index + 1}`,
                LNAME: 'BatchUser'
            }
        })
    }));
    
    const response = await apiRequest('batch-operation', {
        method: 'POST',
        endpoint: '/batches',
        params: {
            operations: operations
        }
    });
    
    assert(response.success, 'Batch operation should succeed');
    assert(response.data.id, 'Should return batch operation ID');
    
    console.log(`   Batch operation created: ${response.data.id}`);
    console.log(`   Submitted ${testEmails.length} email addresses`);
    
    // Cleanup - remove test members
    for (const email of testEmails) {
        try {
            await apiRequest('delete-member', {
                method: 'DELETE',
                endpoint: `/lists/${CONFIG.testListId}/members/${md5(email)}`
            });
        } catch (error) {
            // Ignore cleanup errors
        }
    }
});

// Test 6: Tag Management
runner.test('Tag Management', async () => {
    const testEmail = `tag-test-${Date.now()}@example.com`;
    const subscriberHash = md5(testEmail);
    const testTags = ['test-tag', 'automation', 'integration-test'];
    
    try {
        // First subscribe the member
        await apiRequest('subscribe-member', {
            method: 'PUT',
            endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}`,
            params: {
                email_address: testEmail,
                status: 'subscribed'
            }
        });
        
        await sleep(1000); // Wait for member to be created
        
        // Add tags
        const addTagsResponse = await apiRequest('add-tags', {
            method: 'POST',
            endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}/tags`,
            params: {
                tags: testTags.map(tag => ({ name: tag, status: 'active' }))
            }
        });
        
        assert(addTagsResponse.success, 'Should successfully add tags');
        
        await sleep(1000); // Wait for tags to be added
        
        // Get tags
        const getTagsResponse = await apiRequest('get-tags', {
            method: 'GET',
            endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}/tags`
        });
        
        assert(getTagsResponse.success, 'Should get tags');
        
        const tagNames = getTagsResponse.data.tags.map(tag => tag.name);
        testTags.forEach(testTag => {
            assert(tagNames.includes(testTag), `Should include tag: ${testTag}`);
        });
        
        console.log(`   Successfully managed tags for ${testEmail}`);
        console.log(`   Tags: ${tagNames.join(', ')}`);
        
    } finally {
        // Cleanup
        try {
            await apiRequest('delete-member', {
                method: 'DELETE',
                endpoint: `/lists/${CONFIG.testListId}/members/${subscriberHash}`
            });
        } catch (error) {
            // Ignore cleanup errors
        }
    }
});

// Test 7: Search Functionality
runner.test('Member Search', async () => {
    const response = await apiRequest('search-members', {
        method: 'GET',
        endpoint: '/search-members',
        params: {
            query: 'example.com',
            list_id: CONFIG.testListId
        }
    });
    
    // Search might return no results, which is OK
    assert(response.success || response.code === 404, 'Search should succeed or return 404');
    
    if (response.success && response.data.exact_matches) {
        console.log(`   Found ${response.data.exact_matches.total_items} exact matches`);
    } else {
        console.log('   Search completed (no matches found)');
    }
});

// Test 8: Webhook Endpoint
runner.test('Webhook Endpoint', async () => {
    const testWebhookData = {
        type: 'subscribe',
        fired_at: new Date().toISOString(),
        data: {
            id: 'test123',
            email: 'webhook-test@example.com',
            merge_fields: {
                FNAME: 'Webhook',
                LNAME: 'Test'
            },
            list_id: CONFIG.testListId
        }
    };
    
    const response = await webhookRequest(testWebhookData);
    
    assert(response.success, 'Webhook should process successfully');
    
    console.log('   Webhook endpoint is functional');
});

// Test 9: Webhook Info Endpoint
runner.test('Webhook Configuration Info', async () => {
    const response = await fetch(`${CONFIG.baseUrl}/actions/mailchimp/webhook/info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            [CONFIG.csrfTokenName]: CONFIG.csrfToken
        })
    });
    
    const result = await response.json();
    
    assert(result.webhook_url, 'Should return webhook URL');
    assert(result.available_events, 'Should list available events');
    assert(typeof result.available_events === 'object', 'Events should be an object');
    
    console.log(`   Webhook URL: ${result.webhook_url}`);
    console.log(`   Available events: ${Object.keys(result.available_events).length}`);
});

// Test 10: Rate Limiting
runner.test('Rate Limiting', async () => {
    console.log('   Testing rate limiting (this may take a moment)...');
    
    const requests = [];
    for (let i = 0; i < 5; i++) {
        requests.push(
            apiRequest('get-lists', {
                method: 'GET',
                endpoint: '/lists'
            })
        );
    }
    
    const results = await Promise.allSettled(requests);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    assert(successCount > 0, 'At least some requests should succeed');
    
    console.log(`   ${successCount}/5 requests succeeded (rate limiting may have blocked some)`);
});

// Run all tests
if (require.main === module) {
    // Check if we're running this file directly
    if (!CONFIG.baseUrl.includes('your-site')) {
        console.log('❌ Please update CONFIG values at the top of this file before running tests\n');
        process.exit(1);
    }
    
    runner.run().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
} else {
    // Export for use in other test frameworks
    module.exports = { TestRunner, assert, apiRequest, webhookRequest };
}