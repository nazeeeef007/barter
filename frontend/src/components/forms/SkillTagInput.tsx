// src/components/forms/SkillTagInput.tsx
import React, { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react'; // For the remove icon
import { cn } from '@/lib/utils'; // Assuming you have shadcn's utility for class merging

interface SkillTagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

export const SkillTagInput: React.FC<SkillTagInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Add a tag...",
  className,
  maxTags,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault(); // Prevent form submission
      const newTag = inputValue.trim();
      if (!value.includes(newTag) && (maxTags === undefined || value.length < maxTags)) {
        onChange([...value, newTag]);
        setInputValue('');
      }
    }
    // Allow backspace to remove last tag if input is empty
    if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, value.length - 1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2 min-h-[40px]">
        {value.map((tag, index) => (
          <Badge key={index} variant="secondary" className="pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-[100px] border-none focus-visible:ring-0 shadow-none px-2 py-0 h-auto"
        />
      </div>
      {maxTags && value.length >= maxTags && (
        <p className="text-sm text-muted-foreground mt-1">
          You've reached the maximum of {maxTags} tags.
        </p>
      )}
    </div>
  );
};