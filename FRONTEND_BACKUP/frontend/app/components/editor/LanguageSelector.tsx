import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import type { Language, LanguageOption } from '~/types/benchmark';

interface LanguageSelectorProps {
  languages: LanguageOption[];
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSelector({ languages, currentLanguage, onLanguageChange }: LanguageSelectorProps) {
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
          className="data-[state=on]:bg-benchr-bg-elevated data-[state=on]:text-benchr-gold-accent data-[state=off]:text-benchr-text-muted hover:bg-benchr-bg-elevated/80 shadow-md !text-xs sm:!text-sm px-2 sm:px-3"
        >
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
