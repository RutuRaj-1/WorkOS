import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { WorkDocument } from '@/types';
import { FileText, Upload, Folder, Search, Download, Trash2, FileCode, Film, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const { userProfile } = useAuth();
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const q = query(collection(db, COLLECTIONS.DOCUMENTS), where('orgId', '==', userProfile.orgId));
    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkDocument)));
    });

    return unsub;
  }, [userProfile?.orgId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.orgId) return;

    setUploading(true);
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
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
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

        setUploading(false);
        setProgress(0);
        toast.success('Document uploaded');
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-sm text-muted-foreground">Store, preview, and manage PDFs, PPTs, DOCX, ZIPs, and video files with Firebase Storage</p>
        </div>

        <label className="cursor-pointer flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md">
          <Upload className="w-4 h-4" /> Upload Document
          <input type="file" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {uploading && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="glass-card p-4 flex flex-col justify-between hover:border-primary/40 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm truncate">{doc.name}</h4>
                <span className="text-xs text-muted-foreground uppercase">{doc.type} • {(doc.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-4">
                <span className="text-xs text-muted-foreground">{doc.uploadedByName || 'User'}</span>
                <a
                  href={doc.url}
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
