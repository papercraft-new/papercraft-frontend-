import { create } from 'zustand';

// The teacher's ORIGINAL uploads (photos / scans / PDFs), kept in memory only so the crop
// tool can cut pictures out of them at full resolution. Nothing here is saved to the server
// or the database: a page refresh clears it, and the crop tool then asks for the file again.

export interface SourceFile {
  id: string;
  name: string;
  kind: 'image' | 'pdf';
  file: File;
}

interface SourcePagesState {
  sources: SourceFile[];
  /** Where the crop tool was last looking, so cropping several pictures from one page is quick. */
  lastView: { sourceId: string; page: number } | null;
  setSources: (files: File[]) => void;
  addSource: (file: File) => SourceFile | null;
  setLastView: (v: { sourceId: string; page: number } | null) => void;
  clear: () => void;
}

export function sourceKind(file: File): 'image' | 'pdf' | null {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  return null;
}

let counter = 0;
const toSource = (file: File): SourceFile | null => {
  const kind = sourceKind(file);
  return kind ? { id: `src-${Date.now()}-${++counter}`, name: file.name, kind, file } : null;
};

export const useSourcePagesStore = create<SourcePagesState>((set, get) => ({
  sources: [],
  lastView: null,
  setSources: files =>
    set({ sources: files.map(toSource).filter((s): s is SourceFile => s !== null), lastView: null }),
  addSource: file => {
    const s = toSource(file);
    if (s) set({ sources: [...get().sources, s] });
    return s;
  },
  setLastView: lastView => set({ lastView }),
  clear: () => set({ sources: [], lastView: null }),
}));