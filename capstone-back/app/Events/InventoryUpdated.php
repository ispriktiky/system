<?php

namespace App\Events;

use App\Models\InventoryItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InventoryUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $item;

    public function __construct(InventoryItem $item)
    {
        $this->item = $item;
    }

    public function broadcastOn()
    {
        return new Channel('inventory-channel');
    }

    public function broadcastAs()
    {
        return 'inventory-updated';
    }
}


