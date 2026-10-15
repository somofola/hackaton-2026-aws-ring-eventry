<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Category;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */

     protected $model = Category::class;
     
    public function definition()
    {
        return [
            //
            'department_id' => rand(1, 4), // Random department ID from 1 to 4
            'parent_category_id' => rand(0, 10) > 7 ? rand(1, 10) : 0, // 30% chance of having a parent category
            'category_name' => $this->faker->word(),
            'category_description' => $this->faker->sentence(),
            'created_by' => 1, // Default, will be overridden in the seeder

        ];
    }
}
