<?php
namespace rcg\mailchimp\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;
use rcg\mailchimp\MailchimpModule;

/**
 * API Controller
 * 
 * @author RCG
 * @package RCG\Mailchimp
 * @since 1.0.0
 */
class ApiController extends Controller
{
    /**
     * @var bool Allow anonymous access
     */
    protected array|bool|int $allowAnonymous = true;

    /**
     * @var bool Enable CSRF validation
     */
    public $enableCsrfValidation = true;

    /**
     * Handle API request
     * 
     * Accepts method, endpoint, and params to proxy to Mailchimp API
     */
    public function actionRequest(): Response
    {
        $this->requirePostRequest();
        $this->requireAcceptsJson();

        $request = Craft::$app->getRequest();
        $session = Craft::$app->getSession();

        // Rate limiting (30 requests per minute)
        $rateLimitKey = 'mailchimp_rate_' . $request->getUserIP();
        $requests = $session->get($rateLimitKey, []);
        $now = time();
        
        // Clean old requests
        $requests = array_filter($requests, fn($time) => $time > ($now - 60));
        
        if (count($requests) >= 30) {
            return $this->asJson([
                'success' => false,
                'error' => 'Rate limit exceeded. Maximum 30 requests per minute.',
                'code' => 429
            ]);
        }
        
        $requests[] = $now;
        $session->set($rateLimitKey, $requests);

        // Get request parameters
        $method = $request->getParam('method', 'GET');
        $endpoint = $request->getParam('endpoint');
        $params = $request->getParam('params', []);

        if (!$endpoint) {
            return $this->asJson([
                'success' => false,
                'error' => 'Endpoint is required',
                'code' => 400
            ]);
        }

        // Validate HTTP method
        $allowedMethods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
        if (!in_array(strtoupper($method), $allowedMethods)) {
            return $this->asJson([
                'success' => false,
                'error' => 'Invalid HTTP method',
                'code' => 400
            ]);
        }

        // Get the module and make API request
        $module = MailchimpModule::getInstance();
        $response = $module->api->request($method, $endpoint, $params);

        return $this->asJson($response);
    }
}