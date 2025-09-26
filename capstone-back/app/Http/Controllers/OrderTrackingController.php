<?php

namespace App\Http\Controllers;

use App\Models\OrderTracking;
use App\Models\Order;
use App\Models\Product;
use App\Models\Production;
use Illuminate\Http\Request;
use Carbon\Carbon;

class OrderTrackingController extends Controller
{
    /**
     * Get tracking information for an order
     */
    public function getTracking($orderId)
    {
        $tracking = OrderTracking::where('order_id', $orderId)
            ->with(['order', 'product'])
            ->get();

        return response()->json($tracking);
    }

    /**
     * Create tracking for a new order
     */
    public function createTracking(Request $request)
    {
        $data = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'product_id' => 'required|exists:products,id',
        ]);

        $order = Order::findOrFail($data['order_id']);
        $product = Product::findOrFail($data['product_id']);

        // Determine tracking type based on product
        $trackingType = $this->determineTrackingType($product);
        
        // Calculate estimated dates
        $estimatedDates = $this->calculateEstimatedDates($product, $trackingType);

        $tracking = OrderTracking::create([
            'order_id' => $data['order_id'],
            'product_id' => $data['product_id'],
            'tracking_type' => $trackingType,
            'current_stage' => $trackingType === 'alkansya' ? 'Design' : 'Planning',
            'status' => 'pending',
            'estimated_start_date' => $estimatedDates['start'],
            'estimated_completion_date' => $estimatedDates['completion'],
            'process_timeline' => $this->generateProcessTimeline($product, $trackingType),
        ]);

        return response()->json($tracking->load(['order', 'product']));
    }

    /**
     * Update tracking status
     */
    public function updateTracking(Request $request, $trackingId)
    {
        $data = $request->validate([
            'current_stage' => 'required|string',
            'status' => 'required|in:pending,in_production,completed,shipped,delivered',
            'customer_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'production_updates' => 'nullable|array',
        ]);

        $tracking = OrderTracking::findOrFail($trackingId);
        $tracking->update($data);

        // Update actual dates when status changes
        if ($data['status'] === 'in_production' && !$tracking->actual_start_date) {
            $tracking->update(['actual_start_date' => Carbon::now()]);
        } elseif ($data['status'] === 'completed' && !$tracking->actual_completion_date) {
            $tracking->update(['actual_completion_date' => Carbon::now()]);
        }

        return response()->json($tracking->load(['order', 'product']));
    }

    /**
     * Get customer-facing tracking information
     */
    public function getCustomerTracking($orderId)
    {
        $tracking = OrderTracking::where('order_id', $orderId)
            ->with(['order', 'product'])
            ->get()
            ->map(function($track) {
                return [
                    'order_id' => $track->order_id,
                    'product_name' => $track->product->name,
                    'current_stage' => $track->current_stage,
                    'status' => $track->status,
                    'progress_percentage' => $track->progress_percentage,
                    'estimated_completion_date' => $track->estimated_completion_date,
                    'actual_completion_date' => $track->actual_completion_date,
                    'customer_notes' => $track->customer_notes,
                    'process_timeline' => $this->formatTimelineForCustomer($track),
                ];
            });

        return response()->json($tracking);
    }

    /**
     * Determine tracking type based on product
     */
    private function determineTrackingType($product)
    {
        $productName = strtolower($product->name);
        
        if (str_contains($productName, 'alkansya')) {
            return 'alkansya';
        } elseif (str_contains($productName, 'table') || str_contains($productName, 'chair')) {
            return 'custom';
        }
        
        return 'standard';
    }

    /**
     * Calculate estimated dates based on product type
     */
    private function calculateEstimatedDates($product, $trackingType)
    {
        $startDate = Carbon::now();
        
        if ($trackingType === 'alkansya') {
            // Alkansya: 1-2 days production
            $completionDate = $startDate->copy()->addDays(2);
        } elseif ($trackingType === 'custom') {
            // Tables/Chairs: 1-2 weeks
            $completionDate = $startDate->copy()->addWeeks(2);
        } else {
            // Standard: 1 week
            $completionDate = $startDate->copy()->addWeek();
        }

        return [
            'start' => $startDate,
            'completion' => $completionDate,
        ];
    }

    /**
     * Generate process timeline based on product type
     */
    private function generateProcessTimeline($product, $trackingType)
    {
        if ($trackingType === 'alkansya') {
            return [
                [
                    'stage' => 'Design',
                    'description' => 'Creating design specifications',
                    'estimated_duration' => '30 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Preparation',
                    'description' => 'Preparing materials and tools',
                    'estimated_duration' => '45 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Cutting',
                    'description' => 'Cutting wood to specifications',
                    'estimated_duration' => '60 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Assembly',
                    'description' => 'Assembling components',
                    'estimated_duration' => '90 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Finishing',
                    'description' => 'Applying finish and polish',
                    'estimated_duration' => '45 minutes',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Quality Control',
                    'description' => 'Final inspection and testing',
                    'estimated_duration' => '30 minutes',
                    'status' => 'pending'
                ]
            ];
        } elseif ($trackingType === 'custom') {
            return [
                [
                    'stage' => 'Planning',
                    'description' => 'Detailed planning and design',
                    'estimated_duration' => '2-3 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Material Selection',
                    'description' => 'Selecting high-quality materials',
                    'estimated_duration' => '1 day',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Cutting and Shaping',
                    'description' => 'Precise cutting and shaping',
                    'estimated_duration' => '3-4 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Assembly',
                    'description' => 'Careful assembly process',
                    'estimated_duration' => '4-5 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Finishing',
                    'description' => 'Professional finishing',
                    'estimated_duration' => '2-3 days',
                    'status' => 'pending'
                ],
                [
                    'stage' => 'Quality Assurance',
                    'description' => 'Comprehensive quality check',
                    'estimated_duration' => '1 day',
                    'status' => 'pending'
                ]
            ];
        }

        return [];
    }

    /**
     * Format timeline for customer display
     */
    private function formatTimelineForCustomer($tracking)
    {
        if (!$tracking->process_timeline) {
            return [];
        }

        return collect($tracking->process_timeline)->map(function($process) use ($tracking) {
            $isCompleted = $tracking->current_stage === $process['stage'] && $tracking->status === 'completed';
            $isCurrent = $tracking->current_stage === $process['stage'] && $tracking->status === 'in_production';
            
            return [
                'stage' => $process['stage'],
                'description' => $process['description'],
                'estimated_duration' => $process['estimated_duration'],
                'status' => $isCompleted ? 'completed' : ($isCurrent ? 'in_progress' : 'pending'),
                'completed_at' => $isCompleted ? Carbon::now()->format('Y-m-d H:i:s') : null,
            ];
        })->toArray();
    }

    /**
     * Get tracking statistics for admin dashboard
     */
    public function getTrackingStats()
    {
        $stats = [
            'total_orders' => OrderTracking::count(),
            'in_production' => OrderTracking::where('status', 'in_production')->count(),
            'completed' => OrderTracking::where('status', 'completed')->count(),
            'delivered' => OrderTracking::where('status', 'delivered')->count(),
            'alkansya_orders' => OrderTracking::where('tracking_type', 'alkansya')->count(),
            'custom_orders' => OrderTracking::where('tracking_type', 'custom')->count(),
        ];

        // Get recent tracking updates
        $recentUpdates = OrderTracking::with(['order', 'product'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'stats' => $stats,
            'recent_updates' => $recentUpdates
        ]);
    }
}
