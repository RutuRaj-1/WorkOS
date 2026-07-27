import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { COLLECTIONS } from '@/lib/collections';
import { Module, Entity, ViewType } from '@/types';
import SpreadsheetView from '@/components/views/SpreadsheetView';
import FieldConfigModal from '@/components/fields/FieldConfigModal';
import {
  Table as TableIcon, LayoutGrid, Kanban, List, Calendar as CalendarIcon,
  Plus, Settings2, Sparkles, X, Globe, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';

export default function ModulePage() {
  const { workspaceId, moduleId } = useParams<{ workspaceId: string; moduleId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [module, setModule] = useState<Module | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('spreadsheet');

  // Modals
  const [isFieldConfigOpen, setIsFieldConfigOpen] = useState(false);
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [recordName, setRecordName] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  // Fetch Module Definition
  useEffect(() => {
    if (!moduleId) return;
    const unsub = onSnapshot(doc(db, COLLECTIONS.MAIN_TABS, moduleId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setModule({
          id: snap.id,
          workspaceId: data.workspaceId,
          orgId: data.orgId,
          name: data.name,
          icon: data.icon,
          emoji: data.emoji,
          description: data.description,
          fields: data.fields || [],
          views: data.views || [],
          order: data.order || 0,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
        } as Module);
      }
    });
    return unsub;
  }, [moduleId]);

  // Fetch Entities in Module
  useEffect(() => {
    if (!moduleId) return;
    const q = query(
      collection(db, COLLECTIONS.ENTITIES),
      where('moduleId', '==', moduleId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setEntities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entity)));
    });
    return unsub;
  }, [moduleId]);

  const handleCreateEntity = async () => {
    if (!recordName || !moduleId || !workspaceId || !userProfile?.orgId) return;

    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.ENTITIES), {
        moduleId,
        workspaceId,
        orgId: userProfile.orgId,
        name: recordName,
        fieldValues: {},
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
      });

      setRecordName('');
      setIsNewRecordModalOpen(false);
      toast.success('Record created');
      navigate(`/workspace/${workspaceId}/module/${moduleId}/entity/${docRef.id}`);
    } catch {
      toast.error('Failed to create record');
    }
  };

  const handleScrapeAndCreate = async () => {
    if (!scrapeUrl || !moduleId || !workspaceId || !userProfile?.orgId) return;
    setIsScraping(true);

    try {
      const res = await axios.post('/api/scrape', { url: scrapeUrl });
      const scraped = res.data.success ? res.data.data : {};

      const docRef = await addDoc(collection(db, COLLECTIONS.ENTITIES), {
        moduleId,
        workspaceId,
        orgId: userProfile.orgId,
        name: scraped.name || 'Scraped Competition Record',
        fieldValues: {
          prize: scraped.prize || '',
          organizer: scraped.organizer || '',
          website: scraped.website || scrapeUrl,
        },
        isScraped: true,
        scrapedUrl: scrapeUrl,
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
      });

      setScrapeUrl('');
      setIsScraping(false);
      setIsNewRecordModalOpen(false);
      toast.success('Competition scraped & record created!');
      navigate(`/workspace/${workspaceId}/module/${moduleId}/entity/${docRef.id}`);
    } catch {
      toast.error('Scraping failed, created fallback record');
      setIsScraping(false);
    }
  };

  if (!module) return <div className="p-8 text-center text-muted-foreground">Loading Module...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6 border-l-4 border-indigo-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>{module.emoji || '📂'}</span> {module.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {module.description || `Configurable Module with ${module.fields.length} Custom Fields`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFieldConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold border border-border/50"
          >
            <Settings2 className="w-4 h-4 text-primary" /> Schema & Fields
          </button>
          <button
            onClick={() => setIsNewRecordModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      </div>

      {/* Multi-View Switcher Bar */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase text-muted-foreground mr-2">Views:</span>
          {[
            { id: 'spreadsheet', label: 'Spreadsheet (Airtable)', icon: TableIcon },
            { id: 'kanban', label: 'Board (Kanban)', icon: Kanban },
            { id: 'gallery', label: 'Gallery Grid', icon: LayoutGrid },
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as ViewType)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                activeView === view.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <view.icon className="w-3.5 h-3.5" />
              {view.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground font-mono">{entities.length} Records</span>
      </div>

      {/* Active View Renderer */}
      {activeView === 'spreadsheet' && (
        <SpreadsheetView
          module={module}
          entities={entities}
          onSelectEntity={entity => navigate(`/workspace/${workspaceId}/module/${moduleId}/entity/${entity.id}`)}
          onAddEntity={() => setIsNewRecordModalOpen(true)}
        />
      )}

      {/* Gallery View */}
      {activeView === 'gallery' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entities.map(entity => (
            <div
              key={entity.id}
              onClick={() => navigate(`/workspace/${workspaceId}/module/${moduleId}/entity/${entity.id}`)}
              className="glass-card p-5 hover:border-primary/40 cursor-pointer transition-all space-y-2 group"
            >
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{entity.name}</h3>
              <p className="text-xs text-muted-foreground">ID: {entity.id}</p>
            </div>
          ))}
        </div>
      )}

      {/* Field Config Modal */}
      {isFieldConfigOpen && (
        <FieldConfigModal module={module} onClose={() => setIsFieldConfigOpen(false)} />
      )}

      {/* New Record / Scrape Modal */}
      {isNewRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">New Record ({module.name})</h3>
              <button onClick={() => setIsNewRecordModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrape Section */}
            <div className="p-3 bg-muted/40 rounded-xl border border-primary/20 space-y-2">
              <label className="text-xs font-semibold text-primary flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Auto-Scrape Competition URL
              </label>
              <div className="flex gap-2">
                <input
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  placeholder="https://devpost.com/hackathon-name"
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary"
                />
                <button
                  onClick={handleScrapeAndCreate}
                  disabled={!scrapeUrl || isScraping}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {isScraping ? 'Scraping...' : 'Scrape'}
                </button>
              </div>
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or create manually</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <input
              value={recordName}
              onChange={e => setRecordName(e.target.value)}
              placeholder="Record Name (e.g. Samsung Solve, SEO Campaign)"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsNewRecordModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleCreateEntity} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">
                Create Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
