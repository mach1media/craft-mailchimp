<?php
namespace rcg\mailchimp\events;

use yii\base\Event;

/**
 * Webhook Event
 * 
 * @author RCG
 * @package RCG\Mailchimp
 * @since 1.0.0
 */
class WebhookEvent extends Event
{
    /**
     * @var string The webhook type
     */
    public string $type;

    /**
     * @var array The webhook data
     */
    public array $data;

    /**
     * @var array The processing result
     */
    public array $result;
}