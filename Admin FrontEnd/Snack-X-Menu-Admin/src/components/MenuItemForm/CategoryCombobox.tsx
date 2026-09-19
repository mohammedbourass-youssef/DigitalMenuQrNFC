import { useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { CategoryOption } from '@/types/menuItem';

interface CategoryComboboxProps {
  value: CategoryOption | null;
  onChange: (option: CategoryOption) => void;
  search: string;
  onSearchChange: (value: string) => void;
  data: CategoryOption[];
  isLoading: boolean;
  isFetching: boolean;
}

export function CategoryCombobox({
  value,
  onChange,
  search,
  onSearchChange,
  data,
  isLoading,
  isFetching,
}: CategoryComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleSelect = (option: CategoryOption) => {
    onChange(option);
    onSearchChange(option.name);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent font-normal"
          disabled={isLoading}
        >
          {value ? (
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: value.color }}
              />
              <span className="truncate">{value.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('menuItemForm.category.placeholder')}
            </span>
          )}
          {isFetching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('menuItemForm.category.searchPlaceholder')}
            value={search}
            onValueChange={onSearchChange}
            autoFocus
          />
          <CommandList>
            {(isLoading || (isFetching && data.length === 0)) && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('menuItemForm.category.searching')}
              </div>
            )}

            {!isLoading && !isFetching && data.length === 0 && (
              <CommandEmpty>{t('menuItemForm.category.none')}</CommandEmpty>
            )}

            {data.length > 0 && (
              <CommandGroup heading={t('menuItemForm.category.group')}>
                {data.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.id}-${option.name}`}
                    onSelect={() => handleSelect(option)}
                    title={option.desc || undefined}
                    className="cursor-pointer"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="flex-1 truncate">{option.name}</span>
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0 text-primary',
                        value?.id === option.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}