import React, { useState } from 'react';
import { Entity, Module, CustomField } from '@/types';
import DynamicFieldRenderer from '../fields/DynamicFieldRenderer';
import { Plus, Trash2, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/collections';
import { toast } from 'sonner';

interface SpreadsheetViewProps {
  module: Module;
  entities: Entity[];
  onSelectEntity: (entity: Entity) => void;
  onAddEntity: () => void;
}

export default function SpreadsheetView({
  module,
  entities,
  onSelectEntity,
  onAddEntity,
}: SpreadsheetViewProps) {
  const [editingCell, setEditingCell] = useState<{ entityId: string; fieldId: string } | null>(null);

  const handleCellChange = async (entityId: string, fieldId: string, newValue: unknown) => {
    try {
      const entity = entities.find(e => e.id === entityId);
      if (!entity) return;

      const updatedFieldValues = {
        ...entity.fieldValues,
        [fieldId]: newValue,
      };

      await updateDoc(doc(db, COLLECTIONS.ENTITIES, entityId), {
        fieldValues: updatedFieldValues,
        updatedAt: new Date(),
      });
    } catch {
      toast.error('Failed to update cell value');
    }
  };

  const handleDeleteRecord = async (entityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, COLLECTIONS.ENTITIES, entityId));
      toast.success('Record deleted');
    } catch {
      toast.error('Failed to delete record');
    }
  };

  return (
    <div className="glass-card overflow-hidden border border-border/60">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-muted/60 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
              <th className="p-3 w-10 text-center border-r border-border/40">#</th>
              <th className="p-3 min-w-[200px] border-r border-border/40">Entity Name</th>
              {module.fields.map(field => (
                <th key={field.id} className="p-3 min-w-[160px] border-r border-border/40">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{field.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 lowercase font-normal">
                      ({field.type})
                    </span>
                  </div>
                </th>
              ))}
              <th className="p-3 w-12 text-center"></th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border/40">
            {entities.length === 0 ? (
              <tr>
                <td
                  colSpan={module.fields.length + 3}
                  className="p-12 text-center text-muted-foreground"
                >
                  <p className="font-semibold text-sm">No records in this module</p>
                  <button
                    onClick={onAddEntity}
                    className="mt-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add First Record
                  </button>
                </td>
              </tr>
            ) : (
              entities.map((entity, index) => (
                <tr
                  key={entity.id}
                  onClick={() => onSelectEntity(entity)}
                  className="hover:bg-muted/30 transition-colors group cursor-pointer"
                >
                  {/* Row Number */}
                  <td className="p-3 text-center border-r border-border/40 text-muted-foreground/60 font-mono text-[11px]">
                    {index + 1}
                  </td>

                  {/* Entity Name */}
                  <td className="p-3 border-r border-border/40 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{entity.name}</span>
                      {entity.isScraped && (
                        <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                      )}
                    </div>
                  </td>

                  {/* Custom Fields Cells */}
                  {module.fields.map(field => {
                    const isEditing =
                      editingCell?.entityId === entity.id && editingCell?.fieldId === field.id;
                    const cellVal = entity.fieldValues?.[field.id];

                    return (
                      <td
                        key={field.id}
                        onClick={e => {
                          e.stopPropagation();
                          setEditingCell({ entityId: entity.id, fieldId: field.id });
                        }}
                        className={cn(
                          'p-3 border-r border-border/40 transition-colors relative',
                          isEditing ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted/50'
                        )}
                      >
                        {isEditing ? (
                          <DynamicFieldRenderer
                            field={field}
                            value={cellVal}
                            onChange={val => {
                              handleCellChange(entity.id, field.id, val);
                              setEditingCell(null);
                            }}
                          />
                        ) : (
                          <DynamicFieldRenderer field={field} value={cellVal} readOnly />
                        )}
                      </td>
                    );
                  })}

                  {/* Actions */}
                  <td className="p-3 text-center">
                    <button
                      onClick={e => handleDeleteRecord(entity.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Button Footer */}
      <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
        <button
          onClick={onAddEntity}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-4 h-4" /> Add New Record
        </button>
        <span className="text-xs text-muted-foreground">{entities.length} Total Records</span>
      </div>
    </div>
  );
}
