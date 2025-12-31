<?php
namespace rcg\mailchimp\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;
use craft\helpers\Json;
use rcg\mailchimp\MailchimpModule;
use rcg\mailchimp\events\WebhookEvent;

/**
 * Webhook Controller
 * 
 * Handles incoming webhooks from Mailchimp
 * 
 * @author RCG
 * @package RCG\Mailchimp
 * @since 1.0.0
 */
class WebhookController extends Controller
{
    /**
     * @var bool Allow anonymous access for webhooks
     */
    protected array|bool|int $allowAnonymous = true;

    /**
     * @var bool Disable CSRF validation for webhooks
     */
    public $enableCsrfValidation = false;

    /**
     * @event WebhookEvent The event that is triggered when a webhook is received
     */
    const EVENT_WEBHOOK_RECEIVED = 'webhookReceived';

    /**
     * Handle incoming webhook
     * 
     * URL: /actions/mailchimp/webhook/handle
     */
    public function actionHandle(): Response
    {
        $request = Craft::$app->getRequest();
        
        // Get raw body for signature verification
        $rawBody = $request->getRawBody();
        
        // Parse the webhook data
        if ($request->getIsPost()) {
            $data = $request->getBodyParams();
        } else {
            // Mailchimp sends webhook data as GET params for some events
            $data = $request->getQueryParams();
        }

        // Verify webhook signature if secret is configured
        $secret = Craft::$app->config->getConfigFromFile('mailchimp')['webhookSecret'] ?? null;
        if ($secret && !$this->_verifyWebhookSignature($rawBody, $secret)) {
            Craft::warning('Invalid webhook signature', __METHOD__);
            return $this->asJson(['error' => 'Invalid signature']);
        }

        // Log webhook receipt
        Craft::info('Webhook received: ' . Json::encode($data), __METHOD__);

        // Determine webhook type
        $type = $data['type'] ?? 'unknown';
        
        // Process webhook based on type
        try {
            $result = $this->_processWebhook($type, $data);
            
            // Trigger event for developers to hook into
            if ($this->hasEventHandlers(self::EVENT_WEBHOOK_RECEIVED)) {
                $event = new WebhookEvent([
                    'type' => $type,
                    'data' => $data,
                    'result' => $result
                ]);
                $this->trigger(self::EVENT_WEBHOOK_RECEIVED, $event);
            }

            return $this->asJson(['success' => true]);
            
        } catch (\Exception $e) {
            Craft::error('Webhook processing error: ' . $e->getMessage(), __METHOD__);
            return $this->asJson(['error' => $e->getMessage()]);
        }
    }

    /**
     * Webhook configuration endpoint
     * Returns the webhook URL and available events
     */
    public function actionInfo(): Response
    {
        $this->requireAcceptsJson();
        
        $webhookUrl = Craft::$app->sites->getCurrentSite()->getBaseUrl() . 'actions/mailchimp/webhook/handle';
        
        return $this->asJson([
            'webhook_url' => $webhookUrl,
            'available_events' => [
                'subscribe' => 'Triggered when a subscriber joins the list',
                'unsubscribe' => 'Triggered when a subscriber unsubscribes',
                'profile' => 'Triggered when a subscriber updates their profile',
                'upemail' => 'Triggered when a subscriber changes their email address',
                'cleaned' => 'Triggered when an email is cleaned from the list',
                'campaign' => 'Triggered for campaign events'
            ],
            'configuration_help' => 'Add this URL to your Mailchimp list webhook settings'
        ]);
    }

    /**
     * Process webhook based on type
     */
    private function _processWebhook(string $type, array $data): array
    {
        $result = [
            'type' => $type,
            'processed' => false,
            'message' => ''
        ];

        switch ($type) {
            case 'subscribe':
                $result['message'] = 'New subscriber: ' . ($data['data']['email'] ?? 'unknown');
                $result['processed'] = true;
                break;
                
            case 'unsubscribe':
                $result['message'] = 'Unsubscribed: ' . ($data['data']['email'] ?? 'unknown');
                $result['processed'] = true;
                break;
                
            case 'profile':
                $result['message'] = 'Profile updated: ' . ($data['data']['email'] ?? 'unknown');
                $result['processed'] = true;
                break;
                
            case 'upemail':
                $oldEmail = $data['data']['old_email'] ?? 'unknown';
                $newEmail = $data['data']['new_email'] ?? 'unknown';
                $result['message'] = "Email changed from {$oldEmail} to {$newEmail}";
                $result['processed'] = true;
                break;
                
            case 'cleaned':
                $result['message'] = 'Email cleaned: ' . ($data['data']['email'] ?? 'unknown');
                $result['processed'] = true;
                break;
                
            case 'campaign':
                $result['message'] = 'Campaign event received';
                $result['processed'] = true;
                break;
                
            default:
                $result['message'] = 'Unknown webhook type: ' . $type;
        }

        return $result;
    }

    /**
     * Verify webhook signature
     * 
     * Mailchimp doesn't provide webhook signatures by default,
     * but you can implement your own verification method
     */
    private function _verifyWebhookSignature(string $rawBody, string $secret): bool
    {
        // This is a placeholder for signature verification
        // Implement based on your security requirements
        
        // For now, we'll use a simple HMAC verification
        // if Mailchimp starts providing signatures
        $signature = Craft::$app->getRequest()->getHeaders()->get('X-Mailchimp-Signature');
        if (!$signature) {
            // No signature provided, accept for now
            return true;
        }

        $expectedSignature = hash_hmac('sha256', $rawBody, $secret);
        return hash_equals($expectedSignature, $signature);
    }
}