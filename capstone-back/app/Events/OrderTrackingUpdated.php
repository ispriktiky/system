<?php

namespace App\Events;

use App\Models\OrderTracking;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderTrackingUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $tracking;

    public function __construct(OrderTracking $tracking)
    {
        $this->tracking = $tracking->load(['order', 'product']);
    }

    public function broadcastOn()
    {
        return new Channel('order-tracking-channel');
    }

    public function broadcastAs()
    {
        return 'order-tracking-updated';
    }
}


