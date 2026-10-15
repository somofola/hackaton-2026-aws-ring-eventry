<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use Illuminate\Http\Request;

class TeamMemberController extends Controller
{
    /**
     * Display a listing of the team members for a company.
     */
    public function index(Request $request)
    {
        $companyId = $request->user()->corporate_id ?? $request->query('corporate_id');
        $members = TeamMember::where('corporate_id', $companyId)->get();
        return response()->json($members);
    }

    /**
     * Store a newly created team member.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:team_members,email',
            'department' => 'nullable|string|max:255',
            'role' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
        ]);
        $data['corporate_id'] = $request->user()->corporate_id;

        $member = TeamMember::create($data);
        return response()->json($member, 201);
    }

    /**
     * Display the specified team member.
     */
    public function show($id)
    {
        $member = TeamMember::findOrFail($id);
        return response()->json($member);
    }

    /**
     * Update the specified team member.
     */
    public function update(Request $request, $id)
    {
        $member = TeamMember::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => "sometimes|required|email|unique:team_members,email,{$id}",
            'department' => 'nullable|string|max:255',
            'role' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'has_card' => 'boolean',
            'card_views' => 'integer|min:0',
        ]);

        $member->update($data);
        return response()->json($member);
    }

    /**
     * Remove the specified team member.
     */
    public function destroy($id)
    {
        $member = TeamMember::findOrFail($id);
        $member->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
