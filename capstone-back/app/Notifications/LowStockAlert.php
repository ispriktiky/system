<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LowStockAlert extends Notification implements ShouldQueue
{
    use Queueable;

    protected $item;

    public function __construct($item)
    {
        $this->item = $item;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $name = $this->item->name ?? 'Item';
        $sku = $this->item->sku ?? '';
        $onHand = $this->item->quantity_on_hand ?? 0;
        $rop = $this->item->reorder_point ?? 0;

        return (new MailMessage)
            ->subject('Low Stock Alert: ' . $name)
            ->line("SKU: {$sku}")
            ->line("On Hand: {$onHand}")
            ->line("Reorder Point: {$rop}")
            ->action('Open Inventory', url('/'))
            ->line('Please create a replenishment order to avoid stockout.');
    }
}

