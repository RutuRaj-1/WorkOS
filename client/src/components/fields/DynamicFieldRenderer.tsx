import React from 'react';
import { CustomField, DropdownOption } from '@/types';
import { cn } from '@/lib/utils';
import { Check, Star, ExternalLink, Mail, Phone, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

interface DynamicFieldRendererProps {
  field: CustomField;
  value: unknown;
  onChange?: (val: unknown) => void;
  readOnly?: boolean;
  isInline?: boolean;
}

export default function DynamicFieldRenderer({
  field,
  value,
  onChange,
  readOnly = false,
  isInline = false,
}: DynamicFieldRendererProps) {
  // Render Read-Only View
  if (readOnly) {
    if (value === undefined || value === null || value === '') {
      return <span className="text-muted-foreground/40 text-xs italic">—</span>;
    }

    switch (field.type) {
      case 'text':
      case 'longtext':
        return <span className="text-sm">{String(value)}</span>;

      case 'number':
        return <span className="text-sm font-mono">{Number(value).toLocaleString()}</span>;

      case 'currency':
        return (
          <span className="text-sm font-mono font-medium text-emerald-400">
            {field.currencySymbol || '₹'}{Number(value).toLocaleString()}
          </span>
        );

      case 'date': {
        const d = new Date(value as string);
        return (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            {!isNaN(d.getTime()) ? format(d, 'MMM d, yyyy') : String(value)}
          </span>
        );
      }

      case 'checkbox':
        return value ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Check className="w-3 h-3" /> Yes
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">No</span>
        );

      case 'status':
      case 'dropdown': {
        const opt = field.options?.find(o => o.id === value || o.label === value);
        return (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full border inline-block"
            style={{
              background: (opt?.color || '#6366f1') + '20',
              borderColor: (opt?.color || '#6366f1') + '40',
              color: opt?.color || '#818cf8',
            }}
          >
            {opt?.label || String(value)}
          </span>
        );
      }

      case 'multi_select': {
        const selectedArr = Array.isArray(value) ? value : [value];
        return (
          <div className="flex flex-wrap gap-1">
            {selectedArr.map((val, idx) => {
              const opt = field.options?.find(o => o.id === val || o.label === val);
              return (
                <span
                  key={idx}
                  className="text-xs font-medium px-2 py-0.5 rounded-md border"
                  style={{
                    background: (opt?.color || '#3b82f6') + '15',
                    borderColor: (opt?.color || '#3b82f6') + '30',
                    color: opt?.color || '#60a5fa',
                  }}
                >
                  {opt?.label || String(val)}
                </span>
              );
            })}
          </div>
        );
      }

      case 'progress': {
        const pct = Math.min(100, Math.max(0, Number(value) || 0));
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground">{pct}%</span>
          </div>
        );
      }

      case 'url':
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium truncate max-w-[180px]"
          >
            {String(value).replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        );

      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Mail className="w-3 h-3" /> {String(value)}
          </a>
        );

      default:
        return <span className="text-sm">{String(value)}</span>;
    }
  }

  // Editable Form Control Renderer
  switch (field.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return (
        <input
          type={field.type === 'email' ? 'email' : 'text'}
          value={String(value || '')}
          onChange={e => onChange?.(e.target.value)}
          placeholder={`Enter ${field.name.toLowerCase()}...`}
          className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary"
        />
      );

    case 'longtext':
      return (
        <textarea
          value={String(value || '')}
          onChange={e => onChange?.(e.target.value)}
          rows={3}
          placeholder={`Enter ${field.name.toLowerCase()}...`}
          className="w-full px-3 py-2 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary resize-none"
        />
      );

    case 'number':
    case 'currency':
    case 'progress':
      return (
        <input
          type="number"
          value={value !== undefined ? String(value) : ''}
          onChange={e => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary font-mono"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={String(value || '')}
          onChange={e => onChange?.(e.target.value)}
          className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary"
        />
      );

    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange?.(e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
        />
      );

    case 'dropdown':
    case 'status':
      return (
        <select
          value={String(value || '')}
          onChange={e => onChange?.(e.target.value)}
          className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary capitalize"
        >
          <option value="">Select {field.name}...</option>
          {field.options?.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          value={String(value || '')}
          onChange={e => onChange?.(e.target.value)}
          className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary"
        />
      );
  }
}
