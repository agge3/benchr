import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import type { Language, LanguageOption } from '~/types/benchmark.types';

interface LanguageSelectorProps {
  languages: LanguageOption[];
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSelector({ languages, currentLanguage, 
  onLanguageChange }: LanguageSelectorProps) {
  return (
    <ToggleGroup 
      type="single" 
      value={currentLanguage} 
      onValueChange={(value) => value && onLanguageChange(value as Language)}
    >
      {languages.map(({ id, label }) => (
        <ToggleGroupItem
          key={id}
          value={id}
          aria-label={`Select ${label}`}
          className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3"
        >
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
