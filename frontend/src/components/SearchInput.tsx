import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search people" }: SearchInputProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl2 bg-surface px-4 py-3 text-[15px]">
      <Search size={18} className="text-muted shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-ink placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
