// store/paperStore.ts
import { create } from 'zustand';

export interface McqOption {
  label: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  number: number;
  type: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'FILL_IN_BLANK' | 'TRUE_FALSE' | 'MATCH_FOLLOWING' | 'DIAGRAM' | 'NUMERICAL';
  text: string;
  marks: number;
  options?: McqOption[];
  imageUrl?: string;
  bloomLevel?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  topic?: string;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  questionType?: string;
  marksPerQuestion?: number;      // marks allocated per question for whole section
  sectionTotalMarks?: number;     // total marks allocated for section (overrides sum)
  totalMarks: number;             // calculated total
  questions: Question[];
}

export interface ExamDetails {
  institutionName: string;
  institutionAddress?: string;
  logoUrl?: string;
  subject: string;
  subjectCode?: string;
  examType: string;
  class: string;
  branch?: string;
  academicYear: string;
  date: string;
  duration: string;
  totalMarks: number;
  internalMarks?: number;
  externalMarks?: number;
  facultyName?: string;
  department?: string;
  instructions: string[];
  watermarkText?: string;
}

interface PaperState {
  paperId: string | null;
  title: string;
  examDetails: ExamDetails;
  sections: Section[];
  templateId: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;

  setPaperId: (id: string) => void;
  setTitle: (title: string) => void;
  setExamDetails: (details: Partial<ExamDetails>) => void;
  setTemplateId: (id: string) => void;

  addSection: (title?: string) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  reorderSections: (fromIdx: number, toIdx: number) => void;

  // Marks allocation for section
  setSectionMarksPerQuestion: (sectionId: string, marks: number | undefined) => void;
  setSectionTotalMarks: (sectionId: string, total: number | undefined) => void;
  applyMarksToAllQuestions: (sectionId: string, marks: number) => void;

  addQuestion: (sectionId: string, question?: Partial<Question>) => void;
  updateQuestion: (sectionId: string, questionId: string, updates: Partial<Question>) => void;
  deleteQuestion: (sectionId: string, questionId: string) => void;
  reorderQuestions: (sectionId: string, fromIdx: number, toIdx: number) => void;

  loadFromOcr: (sections: Section[], examDetails?: Partial<ExamDetails>) => void;
  loadPaper: (paper: {
    title: string;
    examDetails: ExamDetails;
    sections: Section[];
    id?: string;
    templateId?: string;
  }) => void;
  resetPaper: () => void;

  setIsSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;

  getTotalMarks: () => number;
  getQuestionCount: () => number;
  getNextQuestionNumber: (sectionId: string) => number;
  getSectionEffectiveMarks: (sectionId: string) => number;
}

const defaultExamDetails: ExamDetails = {
  institutionName: '',
  subject: '',
  examType: 'Final Examination',
  class: '',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  date: new Date().toISOString().split('T')[0],
  duration: '3 Hours',
  totalMarks: 100,
  instructions: [
    'All questions are compulsory.',
    'Read each question carefully before answering.',
    'Write legibly and clearly.',
  ],
};

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

// Recalculate section totalMarks based on marksPerQuestion or individual marks
function recalcSectionMarks(section: Section): number {
  if (section.sectionTotalMarks !== undefined && section.sectionTotalMarks > 0) {
    return section.sectionTotalMarks;
  }
  if (section.marksPerQuestion !== undefined && section.marksPerQuestion > 0) {
    return section.marksPerQuestion * section.questions.length;
  }
  return section.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
}

export const usePaperStore = create<PaperState>((set, get) => ({
  paperId: null,
  title: '',
  examDetails: defaultExamDetails,
  sections: [],
  templateId: 'tpl_school',
  isDirty: false,
  isSaving: false,
  lastSaved: null,

  setPaperId: (id) => set({ paperId: id }),
  setTitle: (title) => set({ title, isDirty: true }),
  setExamDetails: (details) =>
    set((s) => ({ examDetails: { ...s.examDetails, ...details }, isDirty: true })),
  setTemplateId: (id) => set({ templateId: id, isDirty: true }),

  // ── SECTIONS ──────────────────────────────

  addSection: (title = 'New Section') =>
    set((s) => ({
      sections: [
        ...s.sections,
        {
          id: generateId(),
          title,
          totalMarks: 0,
          questions: [],
          marksPerQuestion: undefined,
          sectionTotalMarks: undefined,
        },
      ],
      isDirty: true,
    })),

  updateSection: (sectionId, updates) =>
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updated = { ...sec, ...updates };
        updated.totalMarks = recalcSectionMarks(updated);
        return updated;
      }),
      isDirty: true,
    })),

  deleteSection: (sectionId) =>
    set((s) => ({
      sections: s.sections.filter((sec) => sec.id !== sectionId),
      isDirty: true,
    })),

  reorderSections: (fromIdx, toIdx) =>
    set((s) => {
      const sections = [...s.sections];
      const [moved] = sections.splice(fromIdx, 1);
      sections.splice(toIdx, 0, moved);
      return { sections, isDirty: true };
    }),

  // ── MARKS ALLOCATION ──────────────────────

  setSectionMarksPerQuestion: (sectionId, marks) =>
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updated = { ...sec, marksPerQuestion: marks };
        // Apply to all questions if marks set
        if (marks !== undefined && marks > 0) {
          updated.questions = sec.questions.map((q) => ({ ...q, marks }));
        }
        updated.totalMarks = recalcSectionMarks(updated);
        return updated;
      }),
      isDirty: true,
    })),

  setSectionTotalMarks: (sectionId, total) =>
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updated = { ...sec, sectionTotalMarks: total };
        updated.totalMarks = recalcSectionMarks(updated);
        return updated;
      }),
      isDirty: true,
    })),

  applyMarksToAllQuestions: (sectionId, marks) =>
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updated = {
          ...sec,
          marksPerQuestion: marks,
          questions: sec.questions.map((q) => ({ ...q, marks })),
        };
        updated.totalMarks = recalcSectionMarks(updated);
        return updated;
      }),
      isDirty: true,
    })),

  // ── QUESTIONS ─────────────────────────────

  addQuestion: (sectionId, question = {}) =>
    set((s) => {
      const section = s.sections.find((sec) => sec.id === sectionId);
      if (!section) return s;
      const nextNum = section.questions.length + 1;
      // Use section marksPerQuestion as default if set
      const defaultMarks = section.marksPerQuestion || 1;
      const newQ: Question = {
        id: generateId(),
        number: nextNum,
        type: 'SHORT_ANSWER',
        text: '',
        marks: defaultMarks,
        ...question,
      };
      const updated = {
        ...section,
        questions: [...section.questions, newQ],
      };
      updated.totalMarks = recalcSectionMarks(updated);
      return {
        sections: s.sections.map((sec) => (sec.id === sectionId ? updated : sec)),
        isDirty: true,
      };
    }),

  updateQuestion: (sectionId, questionId, updates) =>
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updated = {
          ...sec,
          questions: sec.questions.map((q) =>
            q.id === questionId ? { ...q, ...updates } : q
          ),
        };
        // Only recalc if no fixed marksPerQuestion
        if (!sec.marksPerQuestion) {
          updated.totalMarks = recalcSectionMarks(updated);
        }
        return updated;
      }),
      isDirty: true,
    })),

  deleteQuestion: (sectionId, questionId) =>
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const updated = {
          ...sec,
          questions: sec.questions
            .filter((q) => q.id !== questionId)
            .map((q, i) => ({ ...q, number: i + 1 })),
        };
        updated.totalMarks = recalcSectionMarks(updated);
        return updated;
      }),
      isDirty: true,
    })),

  reorderQuestions: (sectionId, fromIdx, toIdx) =>
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const questions = [...sec.questions];
        const [moved] = questions.splice(fromIdx, 1);
        questions.splice(toIdx, 0, moved);
        return {
          ...sec,
          questions: questions.map((q, i) => ({ ...q, number: i + 1 })),
        };
      }),
      isDirty: true,
    })),

  // ── LOAD ──────────────────────────────────

  loadFromOcr: (sections, examDetails = {}) =>
    set((s) => ({
      sections,
      examDetails: { ...s.examDetails, ...examDetails },
      isDirty: true,
    })),

  loadPaper: (paper) =>
    set({
      paperId: paper.id || null,
      title: paper.title,
      examDetails: paper.examDetails,
      sections: paper.sections,
      templateId: paper.templateId || 'tpl_school',
      isDirty: false,
    }),

  resetPaper: () =>
    set({
      paperId: null,
      title: 'Untitled Question Paper',
      examDetails: defaultExamDetails,
      sections: [],
      templateId: 'tpl_school',
      isDirty: false,
    }),

  setIsSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (lastSaved) => set({ lastSaved, isDirty: false }),

  // ── COMPUTED ──────────────────────────────

  getTotalMarks: () =>
    get().sections.reduce((sum, sec) => sum + recalcSectionMarks(sec), 0),

  getQuestionCount: () =>
    get().sections.reduce((sum, sec) => sum + sec.questions.length, 0),

  getNextQuestionNumber: (sectionId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    return (section?.questions.length ?? 0) + 1;
  },

  getSectionEffectiveMarks: (sectionId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return 0;
    return recalcSectionMarks(section);
  },
}));