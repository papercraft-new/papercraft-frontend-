'use client';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { usePaperStore } from '@/store/paperStore';
import { aiApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Wand2, Loader2, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Question } from '@/store/paperStore';

const QUESTION_TYPES = [
  { value: 'MCQ', label: 'Multiple Choice (MCQ)' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'LONG_ANSWER', label: 'Long Answer' },
  { value: 'FILL_IN_BLANK', label: 'Fill in the Blank' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'NUMERICAL', label: 'Numerical' },
  { value: 'DIAGRAM', label: 'Diagram / Draw' },
];

interface AddQuestionModalProps {
  sectionId: string;
  onClose: () => void;
}

export function AddQuestionModal({ sectionId, onClose }: AddQuestionModalProps) {
  const [tab, setTab] = useState<'manual' | 'ai'>('manual');
  const [questionType, setQuestionType] = useState<Question['type']>('SHORT_ANSWER');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(3);
  const [difficulty, setDifficulty] = useState<Question['difficulty']>('MEDIUM');
  const [topic, setTopic] = useState('');
  const [options, setOptions] = useState([
    { label: 'a', text: '' },
    { label: 'b', text: '' },
    { label: 'c', text: '' },
    { label: 'd', text: '' },
  ]);

  // AI Generation state
  const [aiSubject, setAiSubject] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiType, setAiType] = useState('MCQ');
  const [aiDifficulty, setAiDifficulty] = useState('MIXED');
  const [aiMarks, setAiMarks] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set());

  const { addQuestion, examDetails, getNextQuestionNumber } = usePaperStore();

  const handleManualAdd = () => {
    if (!questionText.trim()) {
      toast.error('Please enter question text.');
      return;
    }
    const q: Partial<Question> = {
      id: uuidv4(),
      number: getNextQuestionNumber(sectionId),
      type: questionType,
      text: questionText.trim(),
      marks,
      difficulty,
      topic: topic || undefined,
      ...(questionType === 'MCQ' && {
        options: options.filter((o) => o.text.trim()),
      }),
    };
    addQuestion(sectionId, q);
    toast.success('Question added!');
    onClose();
  };

  const handleAiGenerate = async () => {
    if (!aiSubject || !aiTopic) {
      toast.error('Please enter subject and topic.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await aiApi.generateQuestions({
        subject: aiSubject || examDetails.subject,
        topic: aiTopic,
        count: aiCount,
        type: aiType,
        difficulty: aiDifficulty,
        class: examDetails.class,
        marks: aiMarks,
      });
      const questions = res.data.data.questions;
      setGeneratedQuestions(questions);
      setSelectedQIds(new Set(questions.map((q: Question) => q.id)));
      toast.success(`Generated ${questions.length} questions!`);
    } catch {
      toast.error('AI generation failed. Check your connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSelected = () => {
    const toAdd = generatedQuestions.filter((q) => selectedQIds.has(q.id));
    toAdd.forEach((q, i) => {
      addQuestion(sectionId, {
        ...q,
        id: uuidv4(),
        number: getNextQuestionNumber(sectionId) + i,
      });
    });
    toast.success(`Added ${toAdd.length} question${toAdd.length > 1 ? 's' : ''}!`);
    onClose();
  };

  const toggleSelect = (id: string) => {
    setSelectedQIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold">Add Question</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-4 bg-muted rounded-xl p-1 flex-shrink-0">
          {(['manual', 'ai'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'ai' && <Sparkles className="w-3.5 h-3.5" />}
              {t === 'manual' ? 'Manual Entry' : 'AI Generate'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* MANUAL TAB */}
          {tab === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Question Type
                  </Label>
                  <Select value={questionType} onValueChange={(v) => setQuestionType(v as Question['type'])}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] border border-slate-700 bg-slate-950 text-slate-100 shadow-xl">
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Marks
                  </Label>
                  <Input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                    min={1}
                    max={20}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question Text *
                </Label>
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the question..."
                  className="mt-1 min-h-[100px] resize-y"
                  autoFocus
                />
              </div>

              {/* MCQ Options */}
              {questionType === 'MCQ' && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Options
                  </Label>
                  <div className="mt-1 space-y-2">
                    {options.map((opt, i) => (
                      <div key={opt.label} className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground w-6">({opt.label})</span>
                        <Input
                          value={opt.text}
                          onChange={(e) => {
                            const next = [...options];
                            next[i] = { ...opt, text: e.target.value };
                            setOptions(next);
                          }}
                          placeholder={`Option ${opt.label.toUpperCase()}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Difficulty
                  </Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Question['difficulty'])}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['EASY', 'MEDIUM', 'HARD'].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Topic
                  </Label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI TAB */}
          {tab === 'ai' && (
            <div className="space-y-4">
              {generatedQuestions.length === 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Subject
                      </Label>
                      <Input
                        value={aiSubject || examDetails.subject}
                        onChange={(e) => setAiSubject(e.target.value)}
                        placeholder={examDetails.subject || 'e.g. Physics'}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Topic *
                      </Label>
                      <Input
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Newton's Laws"
                        className="mt-1"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Type
                      </Label>
                      <Select value={aiType} onValueChange={setAiType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label.split(' ')[0]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Difficulty
                      </Label>
                      <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['MIXED', 'EASY', 'MEDIUM', 'HARD'].map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Count
                      </Label>
                      <Input
                        type="number"
                        value={aiCount}
                        onChange={(e) => setAiCount(Math.min(20, parseInt(e.target.value) || 5))}
                        min={1}
                        max={20}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Marks per Question
                    </Label>
                    <Input
                      type="number"
                      value={aiMarks}
                      onChange={(e) => setAiMarks(parseInt(e.target.value) || 1)}
                      min={1}
                      max={20}
                      className="mt-1 w-24"
                    />
                  </div>

                  <Button
                    onClick={handleAiGenerate}
                    disabled={isGenerating || !aiTopic}
                    className="w-full btn-gradient gap-2"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Generate {aiCount} Questions</>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">
                      {selectedQIds.size} of {generatedQuestions.length} selected
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => setGeneratedQuestions([])}
                    >
                      ← Regenerate
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {generatedQuestions.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => toggleSelect(q.id)}
                        className={cn(
                          'p-3 rounded-xl border cursor-pointer transition-all',
                          selectedQIds.has(q.id)
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border bg-muted/30 opacity-60'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors',
                            selectedQIds.has(q.id) ? 'border-primary bg-primary' : 'border-border'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-foreground">{q.text}</p>
                            {q.options && (
                              <div className="grid grid-cols-2 gap-x-2 mt-1">
                                {q.options.map((opt) => (
                                  <p key={opt.label} className="text-[11px] text-muted-foreground">
                                    ({opt.label}) {opt.text}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {q.marks} mark{q.marks > 1 ? 's' : ''}
                              </span>
                              {q.difficulty && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  {q.difficulty}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {tab === 'manual' ? (
            <Button onClick={handleManualAdd} className="btn-gradient gap-2">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          ) : (
            generatedQuestions.length > 0 && (
              <Button onClick={handleAddSelected} className="btn-gradient gap-2" disabled={selectedQIds.size === 0}>
                <Plus className="w-4 h-4" /> Add {selectedQIds.size} Selected
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
