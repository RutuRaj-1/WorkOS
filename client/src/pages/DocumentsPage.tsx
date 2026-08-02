import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { WorkDocument } from '@/types';
import { FileText, Upload, Folder, Download, Trash2, Edit2, RefreshCw, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const { userProfile } = useAuth();
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Edit State
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Replace State
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const q = query(collection(db, COLLECTIONS.DOCUMENTS), where('orgId', '==', userProfile.orgId));
    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkDocument)));
    });

    return unsub;
  }, [userProfile?.orgId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, replaceDocId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.orgId) return;

    setUploading(true);
    if (replaceDocId) setReplacingDocId(replaceDocId);

    const storageRef = ref(storage, `documents/${userProfile.orgId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      snap => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        setProgress(Math.round(pct));
      },
      err => {
        toast.error('File upload failed');
        setUploading(false);
        setReplacingDocId(null);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        if (replaceDocId) {
          // Update existing doc
          await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, replaceDocId), {
            name: file.name,
            url: downloadURL,
            size: file.size,
            type: file.name.split('.').pop() || 'file',
            updatedAt: serverTimestamp(),
          });
          toast.success('Document updated successfully');
        } else {
          // Create new doc
          await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
            orgId: userProfile.orgId,
            workspaceId: '',
            name: file.name,
            url: downloadURL,
            size: file.size,
            type: file.name.split('.').pop() || 'file',
            uploadedBy: userProfile.id,
            uploadedByName: userProfile.displayName,
            createdAt: serverTimestamp(),
          });
          toast.success('Document uploaded successfully');
        }

        setUploading(false);
        setProgress(0);
        setReplacingDocId(null);
      }
    );
  };

  const handleDelete = async (docId: string, url: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      // Attempt to delete from storage first (might fail if URL is complex or CORS, but try)
      const fileRef = ref(storage, url);
      try {
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.warn('Storage deletion failed, might already be deleted or permission denied', storageErr);
      }
      
      // Delete from Firestore
      await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, docId));
      toast.success('Document deleted');
    } catch (err) {
      toast.error('Failed to delete document');
      console.error(err);
    }
  };

  const startEdit = (d: WorkDocument) => {
    setEditingDocId(d.id);
    setEditName(d.name);
  };

  const saveEdit = async () => {
    if (!editingDocId || !editName.trim()) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, editingDocId), {
        name: editName.trim(),
        updatedAt: serverTimestamp()
      });
      toast.success('Document renamed');
    } catch (err) {
      toast.error('Failed to rename document');
    }
    setEditingDocId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-sm text-muted-foreground">Store, preview, update, and manage your files securely.</p>
        </div>

        <label className="cursor-pointer flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all">
          <Upload className="w-4 h-4" /> Upload Document
          <input type="file" onChange={(e) => handleFileUpload(e)} className="hidden" />
        </label>
      </div>

      {uploading && !replacingDocId && (
        <div className="glass-card p-4 space-y-2 border-primary">
          <div className="flex justify-between text-xs font-semibold">
            <span>Uploading file...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="glass-card p-16 text-center flex flex-col items-center justify-center gap-3">
          <Folder className="w-12 h-12 text-muted-foreground" />
          <h3 className="font-semibold text-base">No documents uploaded yet</h3>
          <p className="text-sm text-muted-foreground">Upload PDFs, Pitch Decks, and files directly to Firebase Storage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map(d => (
            <div key={d.id} className="glass-card p-4 flex flex-col justify-between hover:border-primary/40 group relative overflow-hidden transition-all">
              
              {/* Replace Overlay Progress */}
              {uploading && replacingDocId === d.id && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin mb-2" />
                  <span className="text-xs font-semibold">Updating... {progress}%</span>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Action Buttons (Hover) */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => startEdit(d)} className="p-1.5 rounded-lg bg-background/80 backdrop-blur shadow-sm text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <label className="cursor-pointer p-1.5 rounded-lg bg-background/80 backdrop-blur shadow-sm text-muted-foreground hover:text-primary">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <input type="file" onChange={(e) => handleFileUpload(e, d.id)} className="hidden" />
                </label>
                <button onClick={() => handleDelete(d.id, d.url)} className="p-1.5 rounded-lg bg-red-500/10 backdrop-blur shadow-sm text-red-400 hover:bg-red-500/20">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                
                {editingDocId === d.id ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      className="text-sm font-semibold bg-input border border-primary rounded px-2 py-1 outline-none w-full"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="text-emerald-400 p-1 hover:bg-emerald-500/10 rounded"><Check className="w-4 h-4"/></button>
                    <button onClick={() => setEditingDocId(null)} className="text-muted-foreground p-1 hover:bg-muted rounded"><X className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <h4 className="font-semibold text-sm truncate pr-20" title={d.name}>{d.name}</h4>
                )}
                
                <span className="text-xs text-muted-foreground uppercase">{d.type} • {(d.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-4">
                <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={d.uploadedByName || 'User'}>
                  {d.uploadedByName || 'User'}
                </span>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1 font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
