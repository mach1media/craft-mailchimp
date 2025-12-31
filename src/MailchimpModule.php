<?php
namespace rcg\mailchimp;

use Craft;
use yii\base\Module;

/**
 * Mailchimp module for Craft CMS
 * 
 * @author RCG
 * @package RCG\Mailchimp
 * @since 1.0.0
 */
class MailchimpModule extends Module
{
    /**
     * @var string
     */
    public string $schemaVersion = '1.0.0';

    /**
     * @inheritdoc
     */
    public function init()
    {
        parent::init();

        // Register services
        $this->setComponents([
            'api' => [
                'class' => services\ApiService::class,
            ],
        ]);

        // Register controllers
        if (Craft::$app->getRequest()->getIsConsoleRequest()) {
            $this->controllerNamespace = 'rcg\\mailchimp\\console\\controllers';
        } else {
            $this->controllerNamespace = 'rcg\\mailchimp\\controllers';
        }

        // Register event handlers for webhooks if enabled
        if ($this->getSettings()->enableWebhooks ?? false) {
            $this->_registerWebhookEvents();
        }

        Craft::info(
            'Mailchimp module loaded',
            __METHOD__
        );
    }

    /**
     * Get module settings from config file
     * 
     * @return array
     */
    public function getSettings(): array
    {
        return Craft::$app->config->getConfigFromFile('mailchimp') ?? [];
    }

    /**
     * Register webhook event handlers
     */
    private function _registerWebhookEvents(): void
    {
        // This will be implemented to dispatch events when webhooks are received
        // Developers can listen for these events to handle webhook data
    }
}