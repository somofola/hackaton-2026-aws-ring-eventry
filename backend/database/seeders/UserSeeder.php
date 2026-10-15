<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@cardconnect.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'company' => 'CardConnect',
            'phone' => '+1 (555) 123-4567',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => Hash::make('password'),
            'role' => 'user',
            'company' => 'Tech Corp',
            'phone' => '+1 (555) 234-5678',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Sarah Johnson',
            'email' => 'sarah@company.com',
            'password' => Hash::make('password'),
            'role' => 'corporate',
            'company' => 'Enterprise Inc',
            'phone' => '+1 (555) 345-6789',
            'address' => '123 Business Ave, Corporate City, ST 12345',
            'website' => 'https://enterprise-inc.com',
            'description' => 'Leading enterprise solutions provider with over 10 years of experience in digital transformation.',
            'employee_count' => 150,
            'industry' => 'Technology',
            'founded_date' => '2014-01-15',
            'contact_info' => [
                'primary_contact' => 'Sarah Johnson',
                'secondary_contact' => 'Mike Wilson',
                'support_email' => 'support@enterprise-inc.com',
                'sales_email' => 'sales@enterprise-inc.com'
            ],
            'billing_info' => [
                'billing_address' => '123 Business Ave, Corporate City, ST 12345',
                'tax_id' => 'TAX123456789',
                'billing_contact' => 'accounting@enterprise-inc.com'
            ],
            'company_status' => 'active',
            'subscription_amount' => 49.99,
            'subscription_status' => 'active',
            'subscription_start_date' => '2024-01-01',
            'subscription_end_date' => '2024-12-31',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Mike Davis',
            'email' => 'mike@startup.com',
            'password' => Hash::make('password'),
            'role' => 'user',
            'company' => 'Startup LLC',
            'phone' => '+1 (555) 456-7890',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'TechCorp Solutions',
            'email' => 'contact@techcorp.com',
            'password' => Hash::make('password'),
            'role' => 'corporate',
            'company' => 'TechCorp Solutions',
            'phone' => '+1 (555) 567-8901',
            'address' => '456 Innovation Blvd, Tech Valley, CA 94000',
            'website' => 'https://techcorp-solutions.com',
            'description' => 'Innovative technology solutions for modern businesses.',
            'employee_count' => 75,
            'industry' => 'Software Development',
            'founded_date' => '2018-03-20',
            'contact_info' => [
                'primary_contact' => 'Alex Chen',
                'secondary_contact' => 'Lisa Rodriguez',
                'support_email' => 'help@techcorp.com',
                'sales_email' => 'sales@techcorp.com'
            ],
            'billing_info' => [
                'billing_address' => '456 Innovation Blvd, Tech Valley, CA 94000',
                'tax_id' => 'TAX987654321',
                'billing_contact' => 'billing@techcorp.com'
            ],
            'company_status' => 'active',
            'subscription_amount' => 99.99,
            'subscription_status' => 'active',
            'subscription_start_date' => '2024-01-01',
            'subscription_end_date' => '2024-12-31',
            'is_active' => true,
        ]);
    }
}
