/**
 * Mailchimp API JavaScript wrapper for Craft CMS
 * Provides abstracted functionality for making AJAX requests to the Mailchimp module
 * 
 * @author RCG
 * @version 2.0.0
 */
class MailchimpAPI {
    constructor(options = {}) {
        this.endpoint = options.endpoint || '/actions/mailchimp/api/request';
        this.csrfTokenName = options.csrfTokenName || 'CRAFT_CSRF_TOKEN';
        this.csrfTokenValue = options.csrfTokenValue || '';
        this.listId = options.listId || '';
        this.debug = options.debug || false;
        this.onError = options.onError || this.defaultErrorHandler;
        this.onSuccess = options.onSuccess || null;
        this.requestTimeout = options.requestTimeout || 30000; // 30 seconds
    }

    /**
     * Make a request to the Mailchimp API
     */
    async request(method, endpoint, params = {}) {
        const requestData = {
            method: method,
            endpoint: endpoint,
            params: params,
            [this.csrfTokenName]: this.csrfTokenValue
        };

        if (this.debug) {
            console.log('Mailchimp API Request:', requestData);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (this.debug) {
                console.log('Mailchimp API Response:', result);
            }

            if (result.success && this.onSuccess) {
                this.onSuccess(result);
            } else if (!result.success && this.onError) {
                this.onError(result);
            }

            return result;

        } catch (error) {
            const errorResult = {
                success: false,
                error: error.name === 'AbortError' ? 'Request timeout' : error.message,
                code: 500
            };

            if (this.debug) {
                console.error('Mailchimp API Error:', error);
            }

            if (this.onError) {
                this.onError(errorResult);
            }

            return errorResult;
        }
    }

    /**
     * MD5 hash function for email addresses
     */
    md5(string) {
        if (typeof CryptoJS !== 'undefined' && CryptoJS.MD5) {
            return CryptoJS.MD5(string.toLowerCase()).toString();
        }
        
        // Fallback warning if CryptoJS is not available
        console.warn('CryptoJS not available. Email hashing may not work correctly.');
        return string.toLowerCase();
    }

    /**
     * Check if an email address is subscribed to the list
     */
    async checkSubscription(email) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}`;
        
        return await this.request('GET', endpoint);
    }

    /**
     * Get all members of the list
     */
    async getMembers(params = {}) {
        const endpoint = `/lists/${this.listId}/members`;
        return await this.request('GET', endpoint, params);
    }

    /**
     * Get specific list information
     */
    async getList(listId = null) {
        const id = listId || this.listId;
        const endpoint = `/lists/${id}`;
        return await this.request('GET', endpoint);
    }

    /**
     * Get all lists
     */
    async getLists() {
        return await this.request('GET', '/lists');
    }

    /**
     * Get list signup URL
     */
    async getListSignupUrl(listId = null) {
        const id = listId || this.listId;
        const response = await this.getList(id);
        
        if (response.success && response.data?.subscribe_url_long) {
            return response.data.subscribe_url_long;
        }
        
        return null;
    }

    /**
     * Add or update a member
     */
    async addOrUpdateMember(email, data = {}) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}`;
        
        const memberData = {
            email_address: email,
            status: 'subscribed',
            ...data
        };

        return await this.request('PUT', endpoint, memberData);
    }

    /**
     * Unsubscribe a member
     */
    async unsubscribeMember(email) {
        return await this.addOrUpdateMember(email, { status: 'unsubscribed' });
    }

    /**
     * Subscribe a member
     */
    async subscribeMember(email, mergeFields = {}) {
        const data = { status: 'subscribed' };
        
        if (Object.keys(mergeFields).length > 0) {
            data.merge_fields = mergeFields;
        }

        return await this.addOrUpdateMember(email, data);
    }

    /**
     * Get subscription status in a user-friendly format
     */
    async getSubscriptionStatus(email) {
        try {
            const response = await this.checkSubscription(email);
            
            if (response.success) {
                return {
                    found: true,
                    status: response.data.status,
                    email: response.data.email_address,
                    subscribed: response.data.status === 'subscribed',
                    unsubscribed: response.data.status === 'unsubscribed',
                    pending: response.data.status === 'pending',
                    cleaned: response.data.status === 'cleaned',
                    data: response.data
                };
            } else if (response.code === 404) {
                return {
                    found: false,
                    status: 'not_found',
                    email: email,
                    subscribed: false,
                    unsubscribed: false,
                    pending: false,
                    cleaned: false,
                    data: null
                };
            } else {
                throw new Error(response.error?.detail || 'Unknown error');
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Batch subscribe multiple email addresses
     */
    async batchSubscribe(emails, options = {}) {
        if (!Array.isArray(emails) || emails.length === 0) {
            throw new Error('Emails must be a non-empty array');
        }

        const operations = emails.map((email, index) => ({
            method: 'PUT',
            path: `/lists/${this.listId}/members/${this.md5(email)}`,
            body: JSON.stringify({
                email_address: email,
                status: 'subscribed',
                ...options
            })
        }));

        return await this.request('POST', '/batches', {
            operations: operations
        });
    }

    /**
     * Batch unsubscribe multiple email addresses
     */
    async batchUnsubscribe(emails) {
        if (!Array.isArray(emails) || emails.length === 0) {
            throw new Error('Emails must be a non-empty array');
        }

        const operations = emails.map(email => ({
            method: 'PATCH',
            path: `/lists/${this.listId}/members/${this.md5(email)}`,
            body: JSON.stringify({
                status: 'unsubscribed'
            })
        }));

        return await this.request('POST', '/batches', {
            operations: operations
        });
    }

    /**
     * Add tags to a member
     */
    async addTags(email, tags) {
        if (!email) {
            throw new Error('Email address is required');
        }
        
        if (!Array.isArray(tags) || tags.length === 0) {
            throw new Error('Tags must be a non-empty array');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}/tags`;
        
        return await this.request('POST', endpoint, {
            tags: tags.map(tag => ({ name: tag, status: 'active' }))
        });
    }

    /**
     * Remove tags from a member
     */
    async removeTags(email, tags) {
        if (!email) {
            throw new Error('Email address is required');
        }
        
        if (!Array.isArray(tags) || tags.length === 0) {
            throw new Error('Tags must be a non-empty array');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}/tags`;
        
        return await this.request('POST', endpoint, {
            tags: tags.map(tag => ({ name: tag, status: 'inactive' }))
        });
    }

    /**
     * Get tags for a member
     */
    async getTags(email) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}/tags`;
        
        return await this.request('GET', endpoint);
    }

    /**
     * Add member to a segment
     */
    async addToSegment(email, segmentId) {
        if (!email || !segmentId) {
            throw new Error('Email and segment ID are required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/segments/${segmentId}/members`;
        
        return await this.request('POST', endpoint, {
            email_address: email
        });
    }

    /**
     * Get all segments for the list
     */
    async getSegments(params = {}) {
        const endpoint = `/lists/${this.listId}/segments`;
        return await this.request('GET', endpoint, params);
    }

    /**
     * Get all campaigns
     */
    async getCampaigns(params = {}) {
        return await this.request('GET', '/campaigns', params);
    }

    /**
     * Get campaign content
     */
    async getCampaignContent(campaignId) {
        if (!campaignId) {
            throw new Error('Campaign ID is required');
        }

        const endpoint = `/campaigns/${campaignId}/content`;
        return await this.request('GET', endpoint);
    }

    /**
     * Trigger an automation workflow for a subscriber
     */
    async triggerAutomation(workflowId, email) {
        if (!workflowId || !email) {
            throw new Error('Workflow ID and email are required');
        }

        const endpoint = `/automations/${workflowId}/emails/queue`;
        
        return await this.request('POST', endpoint, {
            email_address: email
        });
    }

    /**
     * Pause automation for a subscriber
     */
    async pauseAutomation(workflowId, email) {
        if (!workflowId || !email) {
            throw new Error('Workflow ID and email are required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/automations/${workflowId}/removed-subscribers`;
        
        return await this.request('POST', endpoint, {
            email_address: email
        });
    }

    /**
     * Search members across all lists
     */
    async searchMembers(query, options = {}) {
        if (!query) {
            throw new Error('Search query is required');
        }

        const params = {
            query: query,
            ...options
        };

        return await this.request('GET', '/search-members', params);
    }

    /**
     * Get member activity
     */
    async getMemberActivity(email) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}/activity`;
        
        return await this.request('GET', endpoint);
    }

    /**
     * Get member events (more detailed than activity)
     */
    async getMemberEvents(email, params = {}) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}/events`;
        
        return await this.request('GET', endpoint, params);
    }

    /**
     * Update member interests/groups
     */
    async updateMemberInterests(email, interests) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}`;
        
        return await this.request('PATCH', endpoint, {
            interests: interests
        });
    }

    /**
     * Get interest categories (groups) for the list
     */
    async getInterestCategories() {
        const endpoint = `/lists/${this.listId}/interest-categories`;
        return await this.request('GET', endpoint);
    }

    /**
     * Archive a member (different from unsubscribe)
     */
    async archiveMember(email) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}`;
        
        return await this.request('DELETE', endpoint);
    }

    /**
     * Permanently delete a member
     */
    async permanentlyDeleteMember(email) {
        if (!email) {
            throw new Error('Email address is required');
        }

        const subscriberHash = this.md5(email);
        const endpoint = `/lists/${this.listId}/members/${subscriberHash}/actions/delete-permanent`;
        
        return await this.request('POST', endpoint);
    }

    /**
     * Default error handler
     */
    defaultErrorHandler(error) {
        console.error('Mailchimp API Error:', error);
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Check if email domain is blocked (international TLDs)
     */
    isDomainBlocked(email) {
        const blockedTlds = ['.cn', '.ru', '.tk', '.ml', '.ga', '.cf'];
        const domain = email.toLowerCase();
        return blockedTlds.some(tld => domain.endsWith(tld));
    }

    /**
     * Validate email for subscription
     */
    validateEmail(email) {
        if (!email) {
            return { valid: false, error: 'Email address is required' };
        }

        if (!this.isValidEmail(email)) {
            return { valid: false, error: 'Please enter a valid email address' };
        }

        if (this.isDomainBlocked(email)) {
            return { valid: false, error: 'Sorry, this domain is not part of our target audience.' };
        }

        return { valid: true };
    }

    /**
     * Format merge fields for easier use
     */
    formatMergeFields(data) {
        const formatted = {};
        
        for (const [key, value] of Object.entries(data)) {
            // Convert to uppercase if not already
            const fieldKey = key.toUpperCase();
            formatted[fieldKey] = value;
        }
        
        return formatted;
    }

    /**
     * Helper to build query string from params
     */
    buildQueryString(params) {
        const queryParts = [];
        
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        
        return queryParts.length > 0 ? '?' + queryParts.join('&') : '';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MailchimpAPI;
}