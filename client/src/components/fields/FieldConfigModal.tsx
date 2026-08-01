import React, { useState } from 'react';
import { Module, CustomField, CustomFieldType, DropdownOption } from '@/types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/collections';
import { X, Plus, Trash2, Settings2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface FieldConfigModalProps {
  module: Module;
  onClose: () => void;
}

const FIELD_TYPES: { type: CustomFieldType; label: string; description: string }[] = [
  { type: 'text', label: 'Single Text', description: 'Short plain text line' },
  { type: 'longtext', label: 'Long Text', description: 'Multi-line notes and descriptions' },
  { type: 'number', label: 'Number', description: 'Numeric values' },
  { type: 'currency', label: 'Currency', description: 'Monetary amounts (₹)' },
  { type: 'date', label: 'Date', description: 'Calendar date selection' },
  { type: 'checkbox', label: 'Checkbox', description: 'Yes/No boolean toggle' },
  { type: 'dropdown', label: 'Dropdown', description: 'Single option selection' },
  { type: 'multi_select', label: 'Multi-Select', description: 'Multiple tags or categories' },
  { type: 'status', label: 'Status Badge', description: 'Colored workflow status' },
  { type: 'url', label: 'Website URL', description: 'Clickable web hyperlink' },
  { type: 'email', label: 'Email', description: 'Email address mailto' },
  { type: 'phone', label: 'Phone', description: 'Telephone contact' },
  { type: 'progress', label: 'Progress Bar', description: 'Completion percentage (0-100%)' },
];

export default function FieldConfigModal({ module, onClose }: FieldConfigModalProps) {
  const [fields, setFields] = useState<CustomField[]>(module.fields || []);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');

  const handleAddField = () => {
    if (!newFieldName.trim()) return;

    const newField: CustomField = {
      id: 'field_' + Date.now(),
      name: newFieldName.trim(),
      type: newFieldType,
      order: fields.length,
      options:
        newFieldType === 'dropdown' || newFieldType === 'status' || newFieldType === 'multi_select'
          ? [
              { id: 'opt_1', label: 'Option 1', color: '#6366f1' },
              { id: 'opt_2', label: 'Option 2', color: '#10b981' },
            ]
          : undefined,
    };

    setFields([...fields, newField]);
    setNewFieldName('');
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSaveSchema = async () => {
    try {
      await updateDoc(doc(db, COLLECTIONS.MAIN_TABS, module.id), {
        fields,
        updatedAt: new Date(),
      });
      toast.success('Module schema updated');
      onClose();
    } catch {
      toast.error('Failed to update schema');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Configure Custom Fields ({module.name})</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Fields List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <label className="text-xs font-bold uppercase text-muted-foreground">Current Fields</label>
          {fields.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No fields configured yet.</p>
          ) : (
            fields.map(field => (
              <div
                key={field.id}
                className="p-3 bg-muted/40 rounded-xl flex items-center justify-between border border-border/40"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                  <div>
                    <span className="text-sm font-semibold">{field.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 capitalize font-mono">
                      ({field.type})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveField(field.id)}
                  className="text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add New Field Selector */}
        <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
          <label className="text-xs font-bold uppercase text-primary">Add Custom Field</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={newFieldName}
              onChange={e => setNewFieldName(e.target.value)}
              placeholder="Field Name (e.g. Prize Pool, Lead Owner)"
              className="px-3 py-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary"
            />
            <select
              value={newFieldType}
              onChange={e => setNewFieldType(e.target.value as CustomFieldType)}
              className="px-3 py-2 bg-input border border-border rounded-xl text-xs outline-none capitalize"
            >
              {FIELD_TYPES.map(ft => (
                <option key={ft.type} value={ft.type}>
                  {ft.label} ({ft.type})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddField}
            disabled={!newFieldName.trim()}
            className="w-full py-2 bg-secondary text-secondary-foreground text-xs font-semibold rounded-lg hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Field to Schema
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-muted-foreground">
            Cancel
          </button>
          <button
            onClick={handleSaveSchema}
            className="px-4 py-2 text-xs bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 shadow-md"
          >
            Save Module Schema
          </button>
        </div>
      </div>
    </div>
  );
}
