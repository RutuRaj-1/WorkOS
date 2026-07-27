import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { COLLECTIONS } from '@/lib/collections';
import { MainTab, SubTab, Project } from '@/types';
import {
  Plus, FolderKanban, Globe, Trophy, Calendar, Sparkles,
  Link as LinkIcon, Trash2, Search, ArrowRight, X, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { userProfile } = useAuth();
  const { workspaces } = useWorkspace();
  const navigate = useNavigate();

  const currentWorkspace = workspaces.find(w => w.id === workspaceId);

  const [mainTabs, setMainTabs] = useState<MainTab[]>([]);
  const [activeMainTabId, setActiveMainTabId] = useState<string | null>(null);

  const [subTabs, setSubTabs] = useState<SubTab[]>([]);
  const [activeSubTabId, setActiveSubTabId] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isMainTabModalOpen, setIsMainTabModalOpen] = useState(false);
  const [newMainTabName, setNewMainTabName] = useState('');

  const [isSubTabModalOpen, setIsSubTabModalOpen] = useState(false);
  const [newSubTabName, setNewSubTabName] = useState('');

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  // Fetch Main Tabs for current workspace
  useEffect(() => {
    if (!workspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.MAIN_TABS),
      where('workspaceId', '==', workspaceId),
      orderBy('order', 'asc')
    );

    const unsub = onSnapshot(q, snap => {
      const tabs = snap.docs.map(d => ({ id: d.id, ...d.data() } as MainTab));
      setMainTabs(tabs);
      if (tabs.length > 0 && !activeMainTabId) {
        setActiveMainTabId(tabs[0].id);
      }
      setLoading(false);
    });

    return unsub;
  }, [workspaceId]);

  // Fetch Sub Tabs for active Main Tab
  useEffect(() => {
    if (!activeMainTabId) {
      setSubTabs([]);
      setActiveSubTabId(null);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.SUB_TABS),
      where('mainTabId', '==', activeMainTabId),
      orderBy('order', 'asc')
    );

    const unsub = onSnapshot(q, snap => {
      const tabs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SubTab));
      setSubTabs(tabs);
      if (tabs.length > 0 && !activeSubTabId) {
        setActiveSubTabId(tabs[0].id);
      } else if (tabs.length === 0) {
        setActiveSubTabId(null);
      }
    });

    return unsub;
  }, [activeMainTabId]);

  // Fetch Projects for active Sub Tab or Main Tab
  useEffect(() => {
    if (!workspaceId || (!activeSubTabId && !activeMainTabId)) {
      setProjects([]);
      return;
    }

    let q;
    if (activeSubTabId) {
      q = query(
        collection(db, COLLECTIONS.PROJECTS),
        where('subTabId', '==', activeSubTabId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.PROJECTS),
        where('mainTabId', '==', activeMainTabId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    });

    return unsub;
  }, [activeSubTabId, activeMainTabId, workspaceId]);

  // Handlers
  const handleCreateMainTab = async () => {
    if (!newMainTabName || !workspaceId || !userProfile?.orgId) return;
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.MAIN_TABS), {
        workspaceId,
        orgId: userProfile.orgId,
        name: newMainTabName,
        order: mainTabs.length,
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
      });
      setNewMainTabName('');
      setIsMainTabModalOpen(false);
      setActiveMainTabId(docRef.id);
      toast.success('Main Tab created');
    } catch {
      toast.error('Failed to create Main Tab');
    }
  };

  const handleCreateSubTab = async () => {
    if (!newSubTabName || !activeMainTabId || !workspaceId || !userProfile?.orgId) return;
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.SUB_TABS), {
        mainTabId: activeMainTabId,
        workspaceId,
        orgId: userProfile.orgId,
        name: newSubTabName,
        order: subTabs.length,
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
      });
      setNewSubTabName('');
      setIsSubTabModalOpen(false);
      setActiveSubTabId(docRef.id);
      toast.success('Sub Tab created');
    } catch {
      toast.error('Failed to create Sub Tab');
    }
  };

  const handleScrapeAndCreate = async () => {
    if (!scrapeUrl) return;
    setIsScraping(true);
    try {
      const token = await userProfile?.id; // In practice pass JWT auth header
      const res = await axios.post('/api/scrape', { url: scrapeUrl });

      if (res.data.success) {
        const scraped = res.data.data;
        await createProjectRecord({
          name: scraped.name || 'Scraped Competition',
          description: scraped.description || '',
          organizer: scraped.organizer || '',
          website: scraped.website || scrapeUrl,
          prize: scraped.prize || '',
          rounds: scraped.rounds?.map((r: string) => ({ name: r, status: 'upcoming' })) || [],
          eligibility: scraped.eligibility || '',
          timeline: scraped.timeline || '',
          isScraped: true,
          scrapedUrl: scrapeUrl,
        });
        toast.success('Competition scraped & project created!');
      }
    } catch {
      toast.error('Web scraping failed or URL unreachable. Creating basic project instead.');
      await createProjectRecord({ name: 'Competition Project', website: scrapeUrl });
    } finally {
      setIsScraping(false);
      setIsProjectModalOpen(false);
    }
  };

  const createProjectRecord = async (extraData: Partial<Project>) => {
    if (!activeMainTabId || !workspaceId || !userProfile?.orgId) return;
    try {
      await addDoc(collection(db, COLLECTIONS.PROJECTS), {
        mainTabId: activeMainTabId,
        subTabId: activeSubTabId || '',
        workspaceId,
        orgId: userProfile.orgId,
        name: extraData.name || projectName || 'New Project',
        description: extraData.description || projectDesc || '',
        status: 'active',
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
        ...extraData,
      });

      setProjectName('');
      setProjectDesc('');
      setScrapeUrl('');
      setIsProjectModalOpen(false);
      toast.success('Project created');
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Workspace Header */}
      <div className="glass-card p-6 border-l-4" style={{ borderLeftColor: currentWorkspace?.color || '#6366f1' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentWorkspace?.emoji || '💼'}</span>
            <div>
              <h1 className="text-2xl font-bold">{currentWorkspace?.name || 'Workspace'}</h1>
              <p className="text-sm text-muted-foreground">{currentWorkspace?.description || 'All-in-one project tab hierarchy'}</p>
            </div>
          </div>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            id="create-project-btn"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-border/50 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {mainTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveMainTabId(tab.id); setActiveSubTabId(null); }}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap flex items-center gap-2',
              activeMainTabId === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>{tab.name}</span>
          </button>
        ))}

        <button
          onClick={() => setIsMainTabModalOpen(true)}
          className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-xl flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Main Tab
        </button>
      </div>

      {/* Sub Tabs Navigation */}
      {activeMainTabId && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Sub Tabs:</span>
          {subTabs.map(sub => (
            <button
              key={sub.id}
              onClick={() => setActiveSubTabId(sub.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5',
                activeSubTabId === sub.id
                  ? 'bg-secondary text-secondary-foreground border border-primary/30 font-semibold'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span>{sub.name}</span>
            </button>
          ))}
          <button
            onClick={() => setIsSubTabModalOpen(true)}
            className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Sub Tab
          </button>
        </div>
      )}

      {/* Projects Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Projects</h2>
          <span className="text-xs text-muted-foreground">{projects.length} Projects</span>
        </div>

        {projects.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base">No projects in this tab</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create a manual project or paste a competition URL to auto-scrape details into a full workspace.
            </p>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="mt-2 text-sm text-primary font-medium hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(`/workspace/${workspaceId}/project/${project.id}`)}
                className="glass-card p-5 hover:border-primary/40 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize font-medium shrink-0', `status-${project.status}`)}>
                      {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  {project.organizer && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate">{project.organizer}</span>
                    </div>
                  )}
                  {project.prize && (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span>Prize: {project.prize}</span>
                    </div>
                  )}
                  {project.isScraped && (
                    <div className="flex items-center gap-1 text-indigo-400 font-medium text-[11px] pt-1">
                      <Sparkles className="w-3 h-3" /> Auto-Scraped
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Main Tab */}
      {isMainTabModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">New Main Tab</h3>
            <input
              value={newMainTabName}
              onChange={e => setNewMainTabName(e.target.value)}
              placeholder="e.g. Business Competitions, Marketing, MVP"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsMainTabModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleCreateMainTab} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Sub Tab */}
      {isSubTabModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">New Sub Tab</h3>
            <input
              value={newSubTabName}
              onChange={e => setNewSubTabName(e.target.value)}
              placeholder="e.g. Samsung Solve, Instagram, SEO"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsSubTabModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleCreateSubTab} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Project / Web Scrape */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Create New Project</h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrape Section */}
            <div className="p-4 bg-muted/40 rounded-xl border border-primary/20 space-y-2">
              <label className="text-xs font-semibold text-primary flex items-center gap-1.5 uppercase tracking-wider">
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
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isScraping ? 'Scraping...' : 'Scrape & Build'}
                </button>
              </div>
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or create manually</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-3">
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Project Name"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
              />
              <textarea
                value={projectDesc}
                onChange={e => setProjectDesc(e.target.value)}
                placeholder="Project Description"
                rows={3}
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={() => createProjectRecord({})} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
