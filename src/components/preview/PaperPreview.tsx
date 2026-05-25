'use client';
import { usePaperStore } from '@/store/paperStore';
import type { Section, Question } from '@/store/paperStore';

function splitOptions(text: string) {
  const options: Array<{ label: string; text: string; isCorrect: boolean }> = [];
  const p1 = /\(([abcdABCD])\)\s*(.*?)(?=\s*\([abcdABCD]\)\s|\s*$)/gi;
  const matches = [...text.matchAll(p1)];
  if (matches.length >= 2) {
    matches.forEach(m => {
      const label = m[1].toLowerCase();
      const optText = m[2].trim().replace(/\s*\([abcdABCD]\)\s*$/, '').trim();
      if (!options.find(o => o.label === label)) {
        options.push({ label, text: optText, isCorrect: false });
      }
    });
    const idx = text.search(/\s*\([abcdABCD]\)/i);
    const questionText = idx > 0 ? text.substring(0, idx).trim() : text;
    return { questionText, options };
  }
  return { questionText: text, options: [] };
}

function normalizeOptions(
  rawOptions: Array<{ label: string; text: string; isCorrect?: boolean }> | undefined,
  questionText: string
) {
  let fixedOptions = rawOptions ? rawOptions.map(o => ({ ...o, isCorrect: o.isCorrect ?? false })) : [];
  let cleanedQuestionText = questionText;

  if (fixedOptions.length === 1 && fixedOptions[0].text.length > 20) {
    const split = splitOptions(fixedOptions[0].text);
    if (split.options.length >= 2) fixedOptions = split.options;
  }

  if (fixedOptions.length === 0 && cleanedQuestionText) {
    const split = splitOptions(cleanedQuestionText);
    if (split.options.length >= 2) {
      cleanedQuestionText = split.questionText;
      fixedOptions = split.options;
    }
  }

  fixedOptions = fixedOptions
    .map(opt => ({
      ...opt,
      text: opt.text
        .replace(/\s*\([abcdABCD]\)\s*.*$/i, '')
        .replace(/\s+[abcdABCD]\)\s*.*$/i, '')
        .trim(),
    }))
    .filter(opt => opt.text.length > 0);

  fixedOptions.sort((a, b) => a.label.localeCompare(b.label));
  return { cleanedQuestionText, fixedOptions };
}

export function PaperPreview() {
  const { examDetails, sections } = usePaperStore();
  const totalMarks = sections.reduce((s, sec) => s + sec.totalMarks, 0);

  const dateStr = examDetails.date
    ? new Date(examDetails.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const s = (obj: React.CSSProperties) => obj;

  return (
    <div style={s({ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', lineHeight: '1.6', color: '#111', background: '#fff' })}>
      <div style={s({ border: '3px  #1a2e5a', padding: '10px', margin: '4px' })}>
        <div style={s({ border: '1px  #1a2e5a', padding: '14px 18px' })}>

          {/* HEADER */}
          <div style={s({ textAlign: 'center', marginBottom: '8px' })}>
            <div style={s({ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#1a2e5a', marginBottom: '2px' })}>
              {examDetails.institutionName || 'Institution Name'}
            </div>
            {examDetails.institutionAddress && (
              <div style={s({ fontSize: '10px', color: '#555' })}>{examDetails.institutionAddress}</div>
            )}
          </div>

          {/* THICK DIVIDER */}
          <div style={s({ borderTop: '2px solid #1a2e5a', margin: '6px 0' })} />

          {/* META — using divs instead of table to avoid hydration issues */}
          <div style={s({ fontSize: '10.5px', marginBottom: '4px' })}>
            <div style={s({ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' })}>
              <span><strong>Subject:</strong> {examDetails.subject || '—'}{examDetails.subjectCode ? ` (${examDetails.subjectCode})` : ''}</span>
              <span><strong>Date:</strong> {dateStr}</span>
            </div>
            <div style={s({ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' })}>
              <span><strong>Class:</strong> {examDetails.class || '—'}{examDetails.branch ? ` | ${examDetails.branch}` : ''}</span>
              <span><strong>Duration:</strong> {examDetails.duration || '3 Hours'}</span>
            </div>
            <div style={s({ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' })}>
             
              <span><strong>Max. Marks:</strong> {totalMarks || examDetails.totalMarks || '—'}</span>
            </div>
            {examDetails.academicYear && (
              <div style={s({ display: 'flex', justifyContent: 'space-between' })}>
                <span><strong></strong></span>
                <span>
                  
                </span>
              </div>
            )}
          </div>

          {/* THIN DIVIDER */}
          <div style={s({ borderTop: '1px solid #1a2e5a', margin: '6px 0' })} />

          {/* TITLE */}
          <div style={s({ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: '#1a2e5a', margin: '6px 0' })}>
            {examDetails.examType || 'Question Paper'}
          </div>

          <div style={s({ borderTop: '1px solid #1a2e5a', margin: '6px 0' })} />

          {/* INSTRUCTIONS */}
          {examDetails.instructions && examDetails.instructions.length > 0 && (
            <div style={s({ marginBottom: '8px', fontSize: '10px' })}>
              <div style={s({ fontWeight: 'bold', marginBottom: '3px', textDecoration: 'underline' })}>General Instructions:</div>
              <ol style={s({ margin: '0', paddingLeft: '18px', lineHeight: '1.7' })}>
                {examDetails.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
              <div style={s({ borderTop: '1px solid #aaa', margin: '6px 0' })} />
            </div>
          )}

          {/* SECTIONS */}
          {sections.length === 0 ? (
            <div style={s({ textAlign: 'center', padding: '30px', color: '#999', fontSize: '11px' })}>
              No questions yet. Add questions in the editor.
            </div>
          ) : (
            sections.map((section) => (
              <SectionPreview key={section.id} section={section} />
            ))
          )}

          {/* SIGNATURE */}
          <div style={s({ borderTop: '1px solid #1a2e5a', marginTop: '20px', paddingTop: '6px' })}>
            
          </div>

        </div>
      </div>
    </div>
  );
}

function SectionPreview({ section }: { section: Section }) {
  const marksInfo = section.marksPerQuestion
    ? `(${section.marksPerQuestion} Mark${section.marksPerQuestion > 1 ? 's' : ''} Each)`
    : section.totalMarks ? `[Total: ${section.totalMarks} Marks]` : '';

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{
        textAlign: 'center', border: '1px solid #1a2e5a', padding: '4px 8px',
        fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px',
        color: '#1a2e5a', background: '#f0f4ff', margin: '10px 0 8px',
      }}>
        {section.title}{marksInfo && <span style={{ fontWeight: 'normal', fontSize: '10px', marginLeft: '8px', color: '#444' }}>{marksInfo}</span>}
      </div>
      {section.description && (
        <div style={{ fontSize: '10px', color: '#555', fontStyle: 'italic', marginBottom: '6px', textAlign: 'center' }}>
          {section.description}
        </div>
      )}
      {section.questions.map((q) => (
        <QuestionPreview key={q.id} question={q} />
      ))}
    </div>
  );
}

function QuestionPreview({ question }: { question: Question }) {
  const { cleanedQuestionText, fixedOptions } = normalizeOptions(question.options, question.text);
  const displayText = cleanedQuestionText || question.text;

  const hasOptions = fixedOptions.length > 0;
  const displayOptions = hasOptions
    ? fixedOptions
    : question.type === 'MCQ'
    ? [{ label: 'a', text: '___', isCorrect: false }, { label: 'b', text: '___', isCorrect: false }, { label: 'c', text: '___', isCorrect: false }, { label: 'd', text: '___', isCorrect: false }]
    : [];

  return (
    <div style={{ marginBottom: '10px', pageBreakInside: 'avoid' }}>
      {/* Question row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        <div style={{ minWidth: '24px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0, paddingTop: '1px' }}>
          {question.number}.
        </div>
        <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.6' }}>
          {displayText}
        </div>
        <div style={{ minWidth: '32px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', color: '#1a2e5a', flexShrink: 0, paddingTop: '1px', whiteSpace: 'nowrap' }}>
          [{question.marks}]
        </div>
      </div>

      {/* MCQ OPTIONS */}
      {(question.type === 'MCQ' || displayOptions.length >= 2) && (
        <div style={{
          marginTop: '5px',
          marginLeft: '30px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 20px',
        }}>
          {displayOptions.map((opt) => (
            <div key={opt.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '10.5px', lineHeight: '1.5' }}>
              <span style={{ fontWeight: 'bold', minWidth: '22px', flexShrink: 0, color: '#222' }}>
                ({opt.label})
              </span>
              <span style={{ flex: 1 }}>{opt.text || '_______________'}</span>
            </div>
          ))}
        </div>
      )}

      {/* TRUE/FALSE */}
      {question.type === 'TRUE_FALSE' && (
        <div style={{ display: 'flex', gap: '24px', marginTop: '4px', marginLeft: '30px', fontSize: '10.5px' }}>
          <span><strong>(a)</strong> True</span>
          <span><strong>(b)</strong> False</span>
        </div>
      )}

      {/* FILL IN BLANK */}
      {question.type === 'FILL_IN_BLANK' && (
        <div style={{ borderBottom: '1px solid #bbb', height: '18px', width: '60%', marginLeft: '30px', marginTop: '4px' }} />
      )}

      {/* ANSWER LINES */}
      {question.type !== 'MCQ' && question.type !== 'TRUE_FALSE' && question.type !== 'FILL_IN_BLANK' && displayOptions.length === 0 && (
        <div style={{ marginLeft: '30px', marginTop: '4px' }}>
          {Array.from({ length: question.type === 'LONG_ANSWER' ? 6 : question.type === 'DIAGRAM' ? 8 : 2 }).map((_, i) => (
            <div key={i} style={{ borderBottom: '1px solid #ddd', height: '18px', marginBottom: '3px' }} />
          ))}
        </div>
      )}
    </div>
  );
}