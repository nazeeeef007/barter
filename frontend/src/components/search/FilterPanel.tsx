// src/components/search/FilterPanel.tsx

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label'; // You might need to add label from shadcn/ui
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
interface FilterOptions {
  skillCategory: string[];
  location: string;
  radius: number;
  availability: string;
  urgency: string;
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: Partial<FilterOptions>) => void;
  skillCategories: string[]; // Example prop for dropdown options
  // Add props for other filter options (e.g., location suggestions, availability types)
}

export function FilterPanel({ filters, onFilterChange, skillCategories }: FilterPanelProps) {
  const handleCategoryChange = (category: string, checked: boolean) => {
    const updatedCategories = checked
      ? [...filters.skillCategory, category]
      : filters.skillCategory.filter(c => c !== category);
    onFilterChange({ skillCategory: updatedCategories });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Filters</h3>

      {/* Skill Category Filter (Multi-select Checkboxes) */}
      <div className="mb-4">
        <Label className="block text-sm font-medium mb-2">Skill Category</Label>
        {skillCategories.map(category => (
          <div key={category} className="flex items-center space-x-2 mb-1">
            <Checkbox
              id={`category-${category}`}
              checked={filters.skillCategory.includes(category)}
              onCheckedChange={(checked) => handleCategoryChange(category, !!checked)}
            />
            <Label htmlFor={`category-${category}`}>{category}</Label>
          </div>
        ))}
      </div>

      {/* Location Filter (Input - potentially with autocomplete) */}
      <div className="mb-4">
        <Label htmlFor="location" className="block text-sm font-medium mb-2">Location</Label>
        <Input
          id="location"
          placeholder="e.g., Singapore"
          value={filters.location}
          onChange={(e) => onFilterChange({ location: e.target.value })}
        />
      </div>

      {/* Radius Slider */}
      <div className="mb-4">
        <Label htmlFor="radius" className="block text-sm font-medium mb-2">Radius ({filters.radius} km)</Label>
        <Slider
          id="radius"
          min={0}
          max={100}
          step={5}
          value={[filters.radius]}
          onValueChange={(value) => onFilterChange({ radius: value[0] })}
          className="mt-2"
        />
      </div>

      {/* Availability Filter (Select Dropdown) */}
      <div className="mb-4">
        <Label htmlFor="availability" className="block text-sm font-medium mb-2">Availability</Label>
        <Select
          value={filters.availability}
          onValueChange={(value) => onFilterChange({ availability: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="now">Available Now</SelectItem>
            <SelectItem value="weekends">Weekends</SelectItem>
            <SelectItem value="flexible">Flexible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Urgency Filter (Select Dropdown) */}
      <div className="mb-4">
        <Label htmlFor="urgency" className="block text-sm font-medium mb-2">Urgency</Label>
        <Select
          value={filters.urgency}
          onValueChange={(value) => onFilterChange({ urgency: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Optionally, a "Clear Filters" button */}
      <Button variant="outline" className="w-full" onClick={() => onFilterChange({
        skillCategory: [],
        location: '',
        radius: 0,
        availability: '',
        urgency: '',
      })}>
        Clear Filters
      </Button>
    </div>
  );
}