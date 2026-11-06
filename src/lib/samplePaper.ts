import type { ExamDetails, Section, Question } from '@/store/paperStore';

/**
 * A small ready-made paper for first-time users. It is only loaded into the builder (nothing is
 * saved until the teacher presses Save), so it never adds a paper to their account by itself.
 */
function mcq(n: number, text: string, opts: [string, string, string, string], correct: number): Question {
  return {
    id: `sample_q${n}`,
    number: n,
    type: 'MCQ',
    text,
    marks: 1,
    difficulty: 'EASY',
    options: opts.map((t, i) => ({ label: 'abcd'[i], text: t, isCorrect: i === correct })),
  };
}

export function buildSamplePaper(): { title: string; examDetails: ExamDetails; sections: Section[] } {
  const year = new Date().getFullYear();
  const questions: Question[] = [
    mcq(1, 'Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Saturn'], 1),
    mcq(2, 'The chemical symbol for water is', ['H2O', 'CO2', 'O2', 'NaCl'], 0),
    mcq(3, 'Who wrote the national anthem of India?', ['Bankim Chandra Chatterjee', 'Rabindranath Tagore', 'Sarojini Naidu', 'Subramania Bharati'], 1),
    mcq(4, 'What is the value of 12 × 8?', ['86', '96', '106', '98'], 1),
    mcq(5, 'Which gas do plants absorb from the air for photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2),
  ];
  return {
    title: 'Sample Paper - General Knowledge',
    examDetails: {
      institutionName: 'Your School Name',
      subject: 'General Knowledge',
      examType: 'Unit Test',
      class: 'Class 8',
      academicYear: `${year}-${year + 1}`,
      date: new Date().toISOString().split('T')[0],
      duration: '30 Minutes',
      totalMarks: 5,
      instructions: [],
      answerLines: 'none',
    },
    sections: [
      {
        id: 'sample_sec1',
        title: 'Choose the Correct Answer',
        marksPerQuestion: 1,
        totalMarks: 5,
        questions,
      },
    ],
  };
}