'use client';

/**
 * components/QuizPlayer.tsx
 * ----------------------------------------------------------------------------
 * The entire player-facing experience for a single quiz attempt:
 *
 *   entry -> loading -> playing (Q1..Q5) -> submitting -> results
 *
 * Silent analytics capture happens once, invisibly, right when the player
 * hits "Start" (device/OS/browser/referrer via lib/analytics.ts). Per-question
 * timing is captured with performance.now() for sub-millisecond accuracy and
 * sent to the server on final submit — the server (not this component) is
 * the source of truth for score, per the security-definer RPC.
 * ----------------------------------------------------------------------------
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 🎯 UPDATE: Added Copy and CheckCircle2 for the Link Copier
import { Loader2, Trophy, Zap, PartyPopper, Copy, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { captureDeviceAnalytics } from '@/lib/analytics';
import { rankPlayers, type RankedPlayer } from '@/lib/rank';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
// 🎯 UPDATE: Added 'already_played' stage
type Stage = 'entry' | 'loading' | 'playing' | 'submitting' | 'results' | 'already_played';

interface PlayableQuestion {
  id: string;
  question_order: number;
  question_text: string;
  image_url: string | null;
  options: string[]; // no correct_option_index — withheld until submit
}

interface SubmitResult {
  score: number;
  total_time_ms: number;
  rank: number;
  isWinner: boolean;
}

interface QuizPlayerProps {
  quizId: string; // uuid
  quizSlug: string;
  creatorName: string;
  rewardText: string;
}

export default function QuizPlayer({ quizId, quizSlug, creatorName, rewardText }: QuizPlayerProps) {
  const [stage, setStage] = useState<Stage>('entry');
  const [nickname, setNickname] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PlayableQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<
    { question_id: string; selected_option_index: number; time_taken_ms: number }[]
  >([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<RankedPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // performance.now() timestamps — monotonic, immune to system clock changes,
  // which matters because this timer is the tie-breaker on the leaderboard.
  const questionStartRef = useRef<number>(0);

  // 🎯 UPDATE: CHEATING PREVENTION - Check if already played on this device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasPlayed = localStorage.getItem(`guesskro_played_${quizId}`);
      if (hasPlayed) {
        setStage('already_played');
      }
    }
  }, [quizId]);

  // -----------------------------------------------------------------------
  // Stage 1: Entry -> Start quiz
  // -----------------------------------------------------------------------
  const handleStart = useCallback(async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    setStage('loading');
    setError(null);

    try {
      // Silent capture — no permission dialogs, no visible UI. Fires once,
      // right as the player commits to starting.
      const device = captureDeviceAnalytics();

      const res = await fetch(`/api/quiz/${quizId}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed, ...device }),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to start quiz');

      const { playerId: newPlayerId, questions: qs } = await res.json();
      setPlayerId(newPlayerId);
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswers([]);
      questionStartRef.current = performance.now(); // start Q1's clock
      setStage('playing');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStage('entry');
    }
  }, [nickname, quizId]);

  // -----------------------------------------------------------------------
  // BACK BUTTON LOGIC (Added here so player can go back)
  // -----------------------------------------------------------------------
  const handleBack = useCallback(() => {
    if (currentIndex > 0 && selectedOption === null) {
      setCurrentIndex((i) => i - 1);
      setAnswers((prev) => prev.slice(0, -1)); // Remove the last answer
      questionStartRef.current = performance.now(); // Reset timer for this question
    }
  }, [currentIndex, selectedOption]);

  // -----------------------------------------------------------------------
  // Stage 2: Answer a question -> advance (or submit if it was Q5)
  // -----------------------------------------------------------------------
  const handleAnswer = useCallback(
    async (optionIndex: number) => {
      if (selectedOption !== null) return; // prevent double-tap during transition
      setSelectedOption(optionIndex);

      const timeTakenMs = Math.round(performance.now() - questionStartRef.current);
      const question = questions[currentIndex];

      const newAnswers = [
        ...answers,
        {
          question_id: question.id,
          selected_option_index: optionIndex,
          time_taken_ms: timeTakenMs,
        },
      ];
      setAnswers(newAnswers);

      // Brief pause so the player sees their selection highlighted before
      // the slide transition — pure UX polish, not part of the timed window.
      await new Promise((r) => setTimeout(r, 400));

      const isLastQuestion = currentIndex === questions.length - 1;

      if (isLastQuestion) {
        await handleSubmit(newAnswers);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        questionStartRef.current = performance.now(); // start next question's clock
      }
    },
    [selectedOption, questions, currentIndex, answers]
  );

  // -----------------------------------------------------------------------
  // Stage 3: Submit all answers -> server grades authoritatively
  // -----------------------------------------------------------------------
  const handleSubmit = async (finalAnswers: typeof answers) => {
    setStage('submitting');
    try {
      const res = await fetch(`/api/quiz/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, answers: finalAnswers }),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to submit');

      const data: SubmitResult = await res.json();
      setResult(data);
      
      // 🎯 UPDATE: Save in browser that this person has played
      if (typeof window !== 'undefined') {
        localStorage.setItem(`guesskro_played_${quizId}`, 'true');
      }

      // await fetchLeaderboard(); // Commented out because we don't need to fetch leaderboard anymore for players
      setStage('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit quiz');
      setStage('playing'); // let them retry the last answer rather than losing everything
    }
  };

  const progressPct = ((currentIndex + 1) / Math.max(questions.length, 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        
        {/* 🎯 UPDATE: ALREADY PLAYED SCREEN */}
        {stage === 'already_played' && (
           <motion.div key="played" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
             <div className="text-5xl mb-4">🛑</div>
             <h2 className="text-2xl font-extrabold text-slate-800 mb-3">Already Played!</h2>
             <p className="text-slate-600 font-medium mb-6">You can only play this quiz once per device to keep things fair. Come back when the timer ends to see the results!</p>
             <ResultsLinkCopier />
           </motion.div>
        )}

        {/* ---------------- ENTRY ---------------- */}
        {stage === 'entry' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm text-center"
          >
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="text-2xl font-extrabold text-slate-800 mb-2">
              {creatorName} challenged you!
            </h1>
            <p className="text-slate-500 mb-6">
              Score 5/5, be the fastest, and win <span className="font-semibold text-indigo-600">{rewardText}</span> with {creatorName}.
            </p>

            {/* GHOST TEXT FIX: Added text-slate-950 and font-bold */}
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Enter your nickname"
              maxLength={30}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-lg font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              disabled={!nickname.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
            >
              Start Quiz →
            </motion.button>
          </motion.div>
        )}

        {/* ---------------- LOADING ---------------- */}
        {stage === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Loader2 className="animate-spin mx-auto mb-3 text-indigo-500" size={32} />
            <p className="text-slate-500">Getting things ready...</p>
          </motion.div>
        )}

        {/* ---------------- PLAYING ---------------- */}
        {stage === 'playing' && questions[currentIndex] && (
          <motion.div
            key={`q-${currentIndex}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md"
          >
            {/* Progress bar */}
            <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {/* BACK BUTTON UI Added here */}
            <div className="flex justify-between items-center mb-6">
              {currentIndex > 0 ? (
                <button
                  onClick={handleBack}
                  disabled={selectedOption !== null}
                  className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors disabled:opacity-30"
                >
                  ← Back
                </button>
              ) : (
                <div /> 
              )}
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>

            {questions[currentIndex].image_url && (
              <div className="w-full h-44 rounded-xl overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={questions[currentIndex].image_url!}
                  alt="Question visual"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h2 className="text-xl font-bold text-slate-800 mb-5">
              {questions[currentIndex].question_text}
            </h2>

            <div className="space-y-3">
              {questions[currentIndex].options.map((opt, i) => {
                const isSelected = selectedOption === i;
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedOption !== null}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ---------------- SUBMITTING ---------------- */}
        {stage === 'submitting' && (
          <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <Loader2 className="animate-spin mx-auto mb-3 text-indigo-500" size={32} />
            <p className="text-slate-500">Calculating your score...</p>
          </motion.div>
        )}

        {/* ---------------- RESULTS ---------------- */}
        {stage === 'results' && result && (
          <ResultsScreen
            result={result}
            leaderboard={leaderboard}
            playerId={playerId!}
            quizId={quizId}
            nickname={nickname}
            creatorName={creatorName}
            rewardText={rewardText}
            quizSlug={quizSlug}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Results screen — UPDATED FOR PRIVACY AND SUSPENSE (No Cheating)
// Shows a locked message instead of the score or leaderboard.
// ============================================================================
function ResultsScreen({
  result,
  nickname,
  creatorName,
}: {
  result: SubmitResult;
  leaderboard: RankedPlayer[];
  playerId: string;
  quizId: string;
  nickname: string;
  creatorName: string;
  rewardText: string;
  quizSlug: string;
}) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md text-center relative bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
    >
      <div className="text-6xl mb-4">🔒</div>
      
      <h2 className="text-2xl font-extrabold text-slate-800 mb-3">
        Answers Locked, {nickname}!
      </h2>
      
      <p className="text-slate-600 mb-6 text-lg font-medium">
        Your response has been securely saved. Come back to this exact link after the timer ends to see the fair results!
      </p>

      {/* Show only their time, no score */}
      <div className="inline-block bg-slate-50 px-5 py-3 rounded-xl text-slate-700 font-bold mb-6 border border-slate-200">
        Time Taken: {(result.total_time_ms / 1000).toFixed(1)}s
      </div>
      
      {/* 🎯 UPDATE: Button to let users save the link easily */}
      <ResultsLinkCopier />

      {/* 🎯 UPDATE: BRAND PROMOTION ADDED HERE */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-sm text-slate-500 mb-3 font-medium">
          No cheating allowed! Keep an eye on {creatorName}'s status for the winner announcement. 🏆
        </p>
        <a 
          href="/" 
          className="inline-block w-full bg-indigo-50 text-indigo-700 font-bold px-4 py-4 rounded-xl text-sm hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
        >
          Challenge your friends too!<br/> Create your own quiz for FREE on GuessKro 🚀
        </a>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 🎯 UPDATE: Helper Component to Copy Link
// ============================================================================
function ResultsLinkCopier() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button 
      onClick={handleCopy} 
      className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition shadow-md mb-2"
    >
      {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
      {copied ? 'Link Copied!' : 'Copy Link to Check Results Later'}
    </button>
  );
}

// ============================================================================
// Claim Reward modal — Kept intact for future use / Dashboard
// ============================================================================
function ClaimRewardModal({
  playerId,
  quizId,
  onClose,
}: {
  playerId: string;
  quizId: string;
  onClose: () => void;
}) {
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!contact.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, quizId, contact: contact.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to claim');
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl p-6"
      >
        {submitted ? (
          <div className="text-center py-4">
            <PartyPopper className="mx-auto mb-2 text-emerald-500" size={32} />
            <p className="font-semibold text-slate-800 mb-1">Sent!</p>
            <p className="text-sm text-slate-500 mb-4">
              The creator will reach out to you directly.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-slate-100 font-medium text-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Claim your reward 🏆</h3>
            <p className="text-sm text-slate-500 mb-4">
              Share your WhatsApp number so the creator can reach you.
            </p>
            <input
              type="tel"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={!contact.trim() || submitting}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-40"
            >
              {submitting ? 'Sending...' : 'Submit'}
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Confetti — Kept intact for future use / Dashboard
// ============================================================================
function ConfettiBurst() {
  const pieces = Array.from({ length: 60 });
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {pieces.map((_, i) => {
        const startX = Math.random() * 100; // vw
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 6;
        const duration = 2 + Math.random() * 1.5;
        const delay = Math.random() * 0.3;
        const rotate = Math.random() * 720 - 360;

        return (
          <motion.div
            key={i}
            initial={{ top: '-5%', left: `${startX}vw`, opacity: 1, rotate: 0 }}
            animate={{ top: '105%', rotate }}
            transition={{ duration, delay, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              width: size,
              height: size * 0.4,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}