<?php

namespace App\Events;

use App\Models\Production;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductionUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $production;

    public function __construct(Production $production) {
        $this->production = $production;
    }

    public function broadcastOn() {
        return new Channel('production-channel');
    }

    public function broadcastAs() {
        return 'production-updated';
    }
}
