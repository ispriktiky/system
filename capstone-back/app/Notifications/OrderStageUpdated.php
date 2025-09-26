<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderStageUpdated extends Notification implements ShouldQueue
{
    use Queueable;

    protected $orderId;
    protected $productName;
    protected $stage;
    protected $status;

    public function __construct($orderId, $productName, $stage, $status)
    {
        $this->orderId = $orderId;
        $this->productName = $productName;
        $this->stage = $stage;
        $this->status = $status;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('Your order #' . $this->orderId . ' update')
            ->greeting('Hello ' . ($notifiable->name ?? 'Customer'))
            ->line('Product: ' . $this->productName)
            ->line('Stage: ' . $this->stage)
            ->line('Status: ' . $this->status)
            ->line('We will notify you again as your order progresses.')
            ->salutation('— Unick Enterprises Inc.');
    }
}

