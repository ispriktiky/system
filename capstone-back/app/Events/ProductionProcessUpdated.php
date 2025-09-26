<?php

namespace App\Events;

use App\Models\ProductionProcess;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductionProcessUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $process;

    public function __construct(ProductionProcess $process)
    {
        $this->process = $process->load('production');
    }

    public function broadcastOn()
    {
        return new Channel('production-channel');
    }

    public function broadcastAs()
    {
        return 'production-process-updated';
    }
}


