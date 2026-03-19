'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  SlidersHorizontal,
  X,
  Check,
  ChevronDown,
  Loader2,
  Tag,
  Building2,
  Users,
  FolderKanban,
  FileType,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sharePointApi } from '@/lib/api/sharepoint';
import { useSearchFilterStore } from '@/hooks/useSearchFilterStore';
import type { FilterOptions } from '@/types/api';

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md transition-colors',
          active
            ? 'bg-[var(--brand-link)]/15 text-[var(--brand-link)]'
            : 'bg-muted/60 text-muted-foreground/50',
        )}
      >
        <Icon className="h-3 w-3" />
      </div>
      <span
        className={cn(
          'text-[11px] font-semibold tracking-wide transition-colors',
          active
            ? 'text-[var(--brand-source-text)]'
            : 'text-muted-foreground/60',
        )}
      >
        {label}
      </span>
    </div>
  );
}

// ── ValueChip ─────────────────────────────────────────────────────────────────

function ValueChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-link)]/25 bg-[var(--brand-link)]/8 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-link)]">
      {label}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="rounded-full opacity-50 transition-opacity hover:opacity-100"
        aria-label={`Remove ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ── SkeletonPill ──────────────────────────────────────────────────────────────

function SkeletonPill({ width }: { width: number }) {
  return (
    <div
      className="h-6 animate-pulse rounded-full bg-muted/40"
      style={{ width }}
    />
  );
}

// ── InlineCombobox ─────────────────────────────────────────────────────────────
// Single-select, expands inline — no nested Popover.
// `openUpward` flips the dropdown above the trigger (for bottom sections).

function InlineCombobox({
  value,
  onChange,
  options,
  loading,
  placeholder,
  openUpward = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  loading: boolean;
  placeholder: string;
  openUpward?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs transition-all duration-150',
          value
            ? 'border-[var(--brand-link)]/35 bg-[var(--brand-link)]/6 text-[var(--brand-source-text)] shadow-[0_0_0_3px_rgba(107,90,224,0.06)]'
            : 'border-[var(--brand-source-border)] bg-transparent text-muted-foreground/50 hover:border-[var(--brand-link)]/25 hover:bg-[var(--brand-link)]/3',
          open &&
            'border-[var(--brand-link)]/50 shadow-[0_0_0_3px_rgba(107,90,224,0.1)]',
        )}
      >
        <span className={cn('truncate', !value && 'italic font-normal')}>
          {value || placeholder}
        </span>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="rounded-full text-muted-foreground/30 transition-colors hover:text-muted-foreground/70"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground/30 transition-transform duration-200',
              open && 'rotate-180 text-[var(--brand-link)]/60',
            )}
          />
        </div>
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 right-0 z-20 overflow-hidden rounded-xl border border-[var(--brand-source-border)] bg-popover shadow-[0_8px_32px_-8px_rgba(107,90,224,0.22),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
            openUpward ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]',
          )}
        >
          <Command>
            <div className="border-b border-[var(--brand-source-border)] px-1 pt-1">
              <CommandInput
                placeholder={`Search ${placeholder.toLowerCase()}…`}
                className="h-8 text-xs"
              />
            </div>
            <CommandList className="max-h-[180px]">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-4 text-center text-xs text-muted-foreground/40">
                    No options found
                  </CommandEmpty>
                  <CommandGroup className="p-1">
                    {options.map((opt) => (
                      <CommandItem
                        key={opt}
                        value={opt}
                        onSelect={(v) => {
                          onChange(value === v ? '' : v);
                          setOpen(false);
                        }}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                            value === opt
                              ? 'border-[var(--brand-link)] bg-[var(--brand-link)]'
                              : 'border-muted-foreground/25',
                          )}
                        >
                          {value === opt && (
                            <Check className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                        <span className="truncate">{opt}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

// ── InlineMultiCombobox ───────────────────────────────────────────────────────
// Multi-select combobox for tags. Always opens upward since it sits at the bottom.

function InlineMultiCombobox({
  values,
  onAdd,
  onRemove,
  options,
  loading,
  placeholder,
}: {
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  options: string[];
  loading: boolean;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(values), [values]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full flex-wrap items-start gap-1.5 rounded-xl border px-3 py-2 text-left text-xs transition-all duration-150',
          'min-h-[38px]',
          values.length > 0
            ? 'border-[var(--brand-link)]/35 bg-[var(--brand-link)]/6 shadow-[0_0_0_3px_rgba(107,90,224,0.06)]'
            : 'border-[var(--brand-source-border)] bg-transparent hover:border-[var(--brand-link)]/25 hover:bg-[var(--brand-link)]/3',
          open &&
            'border-[var(--brand-link)]/50 shadow-[0_0_0_3px_rgba(107,90,224,0.1)]',
        )}
      >
        {values.length === 0 ? (
          <span className="italic text-muted-foreground/50">{placeholder}</span>
        ) : (
          values.map((v) => (
            <ValueChip key={v} label={v} onRemove={() => onRemove(v)} />
          ))
        )}
        <ChevronDown
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 self-center text-muted-foreground/30 transition-transform duration-200',
            open && 'rotate-180 text-[var(--brand-link)]/60',
          )}
        />
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 z-20 overflow-hidden rounded-xl border border-[var(--brand-source-border)] bg-popover shadow-[0_8px_32px_-8px_rgba(107,90,224,0.22),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <Command>
            <div className="border-b border-[var(--brand-source-border)] px-1 pt-1">
              <CommandInput
                placeholder="Search tags…"
                className="h-8 text-xs"
              />
            </div>
            <CommandList className="max-h-[180px]">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-4 text-center text-xs text-muted-foreground/40">
                    No tags found
                  </CommandEmpty>
                  <CommandGroup className="p-1">
                    {options.map((opt) => {
                      const selected = selectedSet.has(opt);
                      return (
                        <CommandItem
                          key={opt}
                          value={opt}
                          onSelect={(v) => {
                            if (selectedSet.has(v)) onRemove(v);
                            else onAdd(v);
                          }}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <div
                            className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-150',
                              selected
                                ? 'bg-[var(--brand-link)] text-white'
                                : 'border border-muted-foreground/25',
                            )}
                          >
                            {selected && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <Tag className="h-3 w-3 shrink-0 text-muted-foreground/35" />
                          <span className="truncate">{opt}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

// ── SearchFilterPicker ────────────────────────────────────────────────────────

interface SearchFilterPickerProps {
  disabled?: boolean;
}

export function SearchFilterPicker({
  disabled = false,
}: SearchFilterPickerProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const {
    department,
    team,
    project,
    tags,
    file_type,
    setField,
    addTag,
    removeTag,
    clearAll,
    activeCount,
  } = useSearchFilterStore();

  const count = activeCount();

  useEffect(() => {
    if (!open || options !== null || optionsLoading) return;
    setOptionsLoading(true);
    sharePointApi
      .getFilterOptions()
      .then((data) => setOptions(data))
      .catch(() =>
        setOptions({
          department: [],
          team: [],
          project: [],
          tags: [],
          file_type: [],
        }),
      )
      .finally(() => setOptionsLoading(false));
  }, [open, options, optionsLoading]);

  const fileTypeOptions = options?.file_type ?? [];
  const departmentOptions = options?.department ?? [];
  const teamOptions = options?.team ?? [];
  const projectOptions = options?.project ?? [];
  const tagOptions = options?.tags ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                disabled={disabled}
                className={cn(
                  'h-9 gap-1.5 rounded-full px-2.5 text-xs font-medium text-brand-link hover:bg-brand-new-chat-bg',
                  count > 0 &&
                    'bg-[var(--brand-link)]/10 text-[var(--brand-link)] hover:bg-[var(--brand-link)]/15',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                <span>Filters</span>
                {count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-link)] px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Filter search by file type, department, team, project, or tags
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-[300px] overflow-visible rounded-2xl border-[var(--brand-source-border)] bg-popover p-0 shadow-[0_24px_72px_-16px_rgba(107,90,224,0.25),0_8px_24px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] [&>div]:overflow-visible"
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[var(--brand-source-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand-link)]/12">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--brand-link)]" />
            </div>
            <span className="text-xs font-semibold text-[var(--brand-source-text)]">
              Search Filters
            </span>
            {count > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-link)]/15 px-1.5 text-[9px] font-bold text-[var(--brand-link)]">
                {count}
              </span>
            )}
          </div>
          {count > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground/50 transition-all hover:bg-muted/50 hover:text-muted-foreground/80"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <div>
          <div className="divide-y divide-[var(--brand-source-border)]">
            {/* ── File type ──────────────────────────────────────────── */}
            <div className="px-4 py-3.5">
              <SectionHeader
                icon={FileType}
                label="File type"
                active={!!file_type}
              />
              {optionsLoading && fileTypeOptions.length === 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {[52, 64, 56, 70, 48].map((w, i) => (
                    <SkeletonPill key={i} width={w} />
                  ))}
                </div>
              ) : fileTypeOptions.length === 0 ? (
                <p className="pl-0.5 text-[10px] italic text-muted-foreground/35">
                  No file types indexed
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {fileTypeOptions.map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() =>
                        setField('file_type', file_type === ft ? '' : ft)
                      }
                      className={cn(
                        'relative rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150',
                        file_type === ft
                          ? 'border-[var(--brand-link)]/40 bg-[var(--brand-link)]/12 text-[var(--brand-link)] shadow-[0_0_0_3px_rgba(107,90,224,0.08)]'
                          : 'border-[var(--brand-source-border)] text-muted-foreground/55 hover:border-[var(--brand-link)]/30 hover:bg-[var(--brand-link)]/5 hover:text-[var(--brand-link)]/75',
                      )}
                    >
                      {ft}
                      {file_type === ft && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--brand-link)]">
                          <Check className="h-2 w-2 text-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Department ─────────────────────────────────────────── */}
            <div className="px-4 py-3.5">
              <SectionHeader
                icon={Building2}
                label="Department"
                active={!!department}
              />
              <InlineCombobox
                value={department}
                onChange={(v) => setField('department', v)}
                options={departmentOptions}
                loading={optionsLoading}
                placeholder="Any department"
              />
            </div>

            {/* ── Team ───────────────────────────────────────────────── */}
            <div className="px-4 py-3.5">
              <SectionHeader icon={Users} label="Team" active={!!team} />
              <InlineCombobox
                value={team}
                onChange={(v) => setField('team', v)}
                options={teamOptions}
                loading={optionsLoading}
                placeholder="Any team"
              />
            </div>

            {/* ── Project ────────────────────────────────────────────── */}
            <div className="px-4 py-3.5">
              <SectionHeader
                icon={FolderKanban}
                label="Project"
                active={!!project}
              />
              <InlineCombobox
                value={project}
                onChange={(v) => setField('project', v)}
                options={projectOptions}
                loading={optionsLoading}
                placeholder="Any project"
                openUpward
              />
            </div>

            {/* ── Tags ───────────────────────────────────────────────── */}
            <div className="px-4 py-3.5">
              <SectionHeader icon={Tag} label="Tags" active={tags.length > 0} />
              <InlineMultiCombobox
                values={tags}
                onAdd={addTag}
                onRemove={removeTag}
                options={tagOptions}
                loading={optionsLoading}
                placeholder="Any tags"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
