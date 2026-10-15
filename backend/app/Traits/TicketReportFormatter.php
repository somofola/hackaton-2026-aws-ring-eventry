<?php

namespace App\Traits;

use App\Models\Category;
trait TicketReportFormatter
{
    public function formatTicketsForReport($tickets)
    {
        return $tickets->map(function ($ticket) {
            $slaStatus = $this->calculateSLAStatus($ticket);
            $firstResponse = $ticket->responses->last();
            $lastResponse = $ticket->responses->first();

            // Handle sub_categories
            $subCategoryRaw = $ticket->sub_categories;
            $subCategoryIds = [];

            if (is_array($subCategoryRaw)) {
                $subCategoryIds = $subCategoryRaw;
            } elseif (is_string($subCategoryRaw)) {
                $decoded = json_decode($subCategoryRaw, true);
                if (is_array($decoded)) {
                    $subCategoryIds = collect($decoded)
                        ->flatMap(fn($item) => explode(',', $item))
                        ->filter()
                        ->map(fn($id) => (int) trim($id))
                        ->all();
                }
            }

            // Handle categories
            $categoryId[] = $ticket->category_id;

            // Merge and fetch category names
            $allCategoryIds = array_merge($categoryId, $subCategoryIds);
            $categories = Category::whereIn('id', $allCategoryIds)->pluck('category_name')->toArray();

            return [
                'ticket_id' => $ticket->id,
                'ticket_title' => $ticket->title,
                'requester_name' => $ticket->user->name ?? 'N/A',
                'department' => $ticket->department->name ?? 'N/A',
                'categories' => $categories,
                'status' => $ticket->status->name ?? 'N/A',
                'support_staff' => $ticket->assignedAdmin->name ?? 'Unassigned',
                'date_created' => $ticket->created_at->toDateTimeString(),
                'date_closed' => $ticket->status_id == 3 && $ticket->updated_at ? $ticket->updated_at->toDateTimeString() : 'N/A',
                'last_response_date' => $lastResponse ? $lastResponse->created_at->toDateTimeString() : 'No response',
                'response_time' => $firstResponse && $ticket->created_at
                    ? $ticket->created_at->diff($firstResponse->created_at)->format('%h hours %i minutes')
                    : 'N/A',
                'priority' => $ticket->priority->name ?? 'N/A',
                'sla_status' => $slaStatus,
            ];
        });
    }
}