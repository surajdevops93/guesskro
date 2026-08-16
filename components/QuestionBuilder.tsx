'use client';

/**
 * components/QuestionBuilder.tsx
 * ----------------------------------------------------------------------------
 * Core Creator component. SUPER SIMPLE UI.
 * No confusing modes (Quick/Custom/Mix). Just one list of questions.
 * Each question has its own "Shuffle" or "Write Yourself" toggle.
 * Features: Multi-language (EN/HI toggle), Add/Delete Questions.
 * ----------------------------------------------------------------------------
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Upload, X, Type, Database, Plus, Trash2, Languages } from 'lucide-react';
import questionBank from '@/lib/question-bank.json'; 

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
type LanguageMode = 'en' | 'hi';

interface BankQuestion {
  id: string;
  en: {
    question_text: string;
    options: string[];
  };
  hi: {
    question_text: string;
    options: string[];
  };
  correct_option_index: number;
  category: string;
}

export interface BuilderQuestion {
  localId: string; 
  question_order: number;
  question_text: string;
  options: string[]; 
  correct_option_index: number;
  source: 'bank' | 'custom';
  bank_question_id?: string;
  imageFile?: File | null; 
  imagePreviewUrl?: string | null;
}

interface QuestionBuilderProps {
  onQuestionsChange: (questions: BuilderQuestion[]) => void;
}

const EMPTY_CUSTOM_QUESTION = (order: number): BuilderQuestion => ({
  localId: crypto.randomUUID(),
  question_order: order,
  question_text: '',
  options: ['', '', '', ''],
  correct_option_index: 0,
  source: 'custom',
  imageFile: null,
  imagePreviewUrl: null,
});

function pickRandomBankQuestions(count: number, exclude: string[] = []): BankQuestion[] {
  const pool = (questionBank as BankQuestion[]).filter((q) => !exclude.includes(q.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function bankToBuilder(bq: BankQuestion, order: number, lang: LanguageMode): BuilderQuestion {
  return {
    localId: crypto.randomUUID(),
    question_order: order,
    question_text: bq[lang].question_text, 
    options: bq[lang].options,             
    correct_option_index: bq.correct_option_index,
    source: 'bank',
    bank_question_id: bq.id,
    imageFile: null,
    imagePreviewUrl: null,
  };
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------
export default function QuestionBuilder({
  onQuestionsChange,
}: QuestionBuilderProps) {
  const [language, setLanguage] = useState<LanguageMode>('en'); 
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);

  // 1. Initial Load: 5 Random Questions
  useEffect(() => {
    const initialBankQuestions = pickRandomBankQuestions(5);
    const initialBuilderQuestions = initialBankQuestions.map((bq, i) => bankToBuilder(bq, i + 1, 'en'));
    setQuestions(initialBuilderQuestions);
    onQuestionsChange(initialBuilderQuestions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- UI Texts Dictionary for Language Toggle ---
  const uiTexts = {
    en: {
      question: 'Question', 
      writeSelf: 'Write Yourself',
      fromBank: 'From Bank',
      shuffle: 'Shuffle', 
      delete: 'Delete',
      typeHere: 'Type your question...', 
      option: 'Option',
      correct: 'correct', 
      addPhoto: 'Add photo (optional)',
      addBtn: 'Add Question', 
      bankEmpty: 'No more questions in the bank! Switched to Custom.',
      warn: '⚠️ Fill in all questions and their options to continue.'
    },
    hi: {
      question: 'सवाल', 
      writeSelf: 'खुद लिखें',
      fromBank: 'बैंक से लें',
      shuffle: 'बदलें', 
      delete: 'हटाएं',
      typeHere: 'अपना सवाल यहाँ लिखें...', 
      option: 'विकल्प',
      correct: 'सही', 
      addPhoto: 'फोटो जोड़ें (वैकल्पिक)',
      addBtn: 'नया सवाल जोड़ें', 
      bankEmpty: 'बैंक में और सवाल नहीं हैं! खुद लिखने वाला डब्बा खोल दिया है।',
      warn: '⚠️ आगे बढ़ने के लिए कम से कम 1 सवाल और उसके सभी विकल्प भरें।'
    }
  };
  const t = uiTexts[language];

  const updateQuestions = useCallback(
    (next: BuilderQuestion[]) => {
      setQuestions(next);
      onQuestionsChange(next);
    },
    [onQuestionsChange]
  );

  // 2. Language Switcher
  const handleLanguageSwitch = () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    setLanguage(newLang);

    const updatedQuestions = questions.map((q) => {
      if (q.source === 'bank' && q.bank_question_id) {
        const bankData = (questionBank as BankQuestion[]).find(b => b.id === q.bank_question_id);
        if (bankData) {
          const updated = bankToBuilder(bankData, q.question_order, newLang);
          updated.localId = q.localId; 
          return updated;
        }
      }
      return q; 
    });

    updateQuestions(updatedQuestions);
  };

  // 3. Shuffle a specific question
  const shuffleQuestion = (index: number) => {
    const usedBankIds = questions.filter((q) => q.source === 'bank').map((q) => q.bank_question_id!);
    const [replacement] = pickRandomBankQuestions(1, usedBankIds);
    if (!replacement) return; 
    const next = [...questions];
    next[index] = bankToBuilder(replacement, index + 1, language);
    updateQuestions(next);
  };

  // 4. Toggle between "Write Yourself" and "From Bank" for a specific question
  const toggleQuestionSource = (index: number) => {
    const current = questions[index];
    const next = [...questions];
    if (current.source === 'bank') {
      next[index] = EMPTY_CUSTOM_QUESTION(index + 1);
    } else {
      const usedBankIds = questions.filter((q) => q.source === 'bank').map((q) => q.bank_question_id!);
      const [bq] = pickRandomBankQuestions(1, usedBankIds);
      if (bq) {
        next[index] = bankToBuilder(bq, index + 1, language);
      } else {
        alert(t.bankEmpty);
        return; // Do nothing if bank is empty
      }
    }
    updateQuestions(next);
  };

  const updateQuestionText = (index: number, text: string) => {
    const next = [...questions];
    next[index] = { ...next[index], question_text: text };
    updateQuestions(next);
  };

  const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
    const next = [...questions];
    const options = [...next[qIndex].options];
    options[oIndex] = text;
    next[qIndex] = { ...next[qIndex], options };
    updateQuestions(next);
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const next = [...questions];
    next[qIndex] = { ...next[qIndex], correct_option_index: oIndex };
    updateQuestions(next);
  };

  const handleImageSelect = (index: number, file: File | null) => {
    const next = [...questions];
    if (next[index].imagePreviewUrl) {
      URL.revokeObjectURL(next[index].imagePreviewUrl!);
    }
    next[index] = {
      ...next[index],
      imageFile: file,
      imagePreviewUrl: file ? URL.createObjectURL(file) : null,
    };
    updateQuestions(next);
  };

  // 5. Add Question (Tries to add from Bank first, if empty, adds Custom)
  const addQuestion = () => {
    const next = [...questions];
    const nextOrder = next.length + 1;
    
    const usedBankIds = next.filter((q) => q.source === 'bank').map((q) => q.bank_question_id!);
    const [bq] = pickRandomBankQuestions(1, usedBankIds);
    
    if (bq) {
      next.push(bankToBuilder(bq, nextOrder, language));
    } else {
      // If bank is exhausted, add a blank custom question
      next.push(EMPTY_CUSTOM_QUESTION(nextOrder));
    }
    updateQuestions(next);
  };

  const removeQuestion = (indexToRemove: number) => {
    const next = questions.filter((_, i) => i !== indexToRemove);
    const reordered = next.map((q, i) => ({ ...q, question_order: i + 1 }));
    updateQuestions(reordered);
  };

  const isValid = useMemo(
    () =>
      questions.length > 0 &&
      questions.every(
        (q) =>
          q.question_text.trim().length > 0 &&
          q.options.every((o) => o.trim().length > 0)
      ),
    [questions]
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* ---- Language Toggle Button ---- */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleLanguageSwitch}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100"
        >
          <Languages size={18} />
          {language === 'en' ? 'Switch to Hindi (हिंदी)' : 'Switch to English'}
        </button>
      </div>

      {/* ---- NO MORE GLOBAL MODE BUTTONS (Quick/Custom/Mix). Direct List! ---- */}

      {/* ---- Question cards ---- */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {questions.map((q, index) => (
            <motion.div
              key={q.localId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-5 border border-slate-300 rounded-2xl bg-white shadow-sm"
            >
              
              {/* Card Header (Controls for this specific question) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-3">
                <span className="text-sm font-black text-slate-500 uppercase tracking-wider">
                  {t.question} {index + 1}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Toggle: Bank vs Custom */}
                  {q.source === 'bank' ? (
                    <button
                      onClick={() => toggleQuestionSource(index)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Type size={14} /> {t.writeSelf}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleQuestionSource(index)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Database size={14} /> {t.fromBank}
                    </button>
                  )}

                  {/* Shuffle Button (Only visible if source is Bank) */}
                  {q.source === 'bank' && (
                    <button
                      onClick={() => shuffleQuestion(index)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Shuffle size={14} /> {t.shuffle}
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => removeQuestion(index)}
                    className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors ml-auto sm:ml-0"
                  >
                    <Trash2 size={14} /> {t.delete}
                  </button>
                </div>
              </div>

              {/* Question Text Input / Display */}
              {q.source === 'custom' ? (
                <input
                  type="text"
                  value={q.question_text}
                  onChange={(e) => updateQuestionText(index, e.target.value)}
                  placeholder={t.typeHere}
                  className="w-full mb-4 px-4 py-3 border-2 border-slate-200 rounded-xl text-base text-slate-950 font-bold placeholder-slate-400 bg-white focus:outline-none focus:border-indigo-500"
                />
              ) : (
                <p className="mb-5 text-lg font-bold text-slate-900 leading-snug">{q.question_text}</p>
              )}

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt, oIndex) => {
                  const isEditable = q.source === 'custom';
                  const isCorrect = q.correct_option_index === oIndex;
                  return (
                    <button
                      key={oIndex}
                      onClick={() => setCorrectOption(index, oIndex)}
                      className={`relative text-left px-4 py-3 rounded-xl border-2 text-sm transition-colors ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-900 font-semibold'
                      }`}
                    >
                      {isEditable ? (
                        <input
                          value={opt}
                          onChange={(e) => updateOptionText(index, oIndex, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={`${t.option} ${oIndex + 1}`}
                          className="w-full bg-transparent text-slate-950 font-bold placeholder-slate-400 focus:outline-none"
                        />
                      ) : (
                        <span className="block w-full">{opt}</span>
                      )}
                      
                      {/* Correct Answer Badge */}
                      {isCorrect && (
                        <span className="absolute top-1 right-2 text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-sm">
                          ✓ {t.correct}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Image upload (Only in custom mode) */}
              {q.source === 'custom' && (
                <div className="mt-4">
                  {q.imagePreviewUrl ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.imagePreviewUrl}
                        alt="Question visual"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleImageSelect(index, null)}
                        className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm font-semibold text-slate-500 cursor-pointer hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                      <Upload size={16} />
                      {t.addPhoto}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageSelect(index, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Question Button */}
      <button 
        onClick={addQuestion} 
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 font-bold hover:bg-indigo-50 transition-all shadow-sm"
      >
        <Plus size={20} /> {t.addBtn}
      </button>

      {!isValid && (
        <p className="text-sm font-bold text-amber-600 text-center bg-amber-50 py-2 rounded-lg">
          {t.warn}
        </p>
      )}
    </div>
  );
}