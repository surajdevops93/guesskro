/**
 * app/quiz/[quizId]/page.tsx
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuizPlayer from '@/components/QuizPlayer'; 
import { Trophy, Clock, Medal } from 'lucide-react';

interface QuizPageProps {
  params: Promise<{ quizId: string }>;
}

async function getQuizForDisplay(quizId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, slug, creator_name, reward_text, title, is_published, expires_at') // expires_at जोड़ दिया
    .eq('id', quizId) 
    .single();

  if (error || !data || !data.is_published) return null;
  return data;
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const { quizId } = await params;
  const quiz = await getQuizForDisplay(quizId);

  if (!quiz) {
    return {
      title: 'Quiz not found',
      description: 'This quiz link is invalid or has been removed.',
    };
  }

  const title = `${quiz.creator_name} challenged you!`;
  const description = `Score 5/5 and win ${quiz.reward_text} with ${quiz.creator_name}! 🏆 Play now.`;

  const ogImageUrl = new URL('/api/og', process.env.NEXT_PUBLIC_SITE_URL);
  ogImageUrl.searchParams.set('creator', quiz.creator_name);
  ogImageUrl.searchParams.set('reward', quiz.reward_text);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
    },
  };
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { quizId } = await params;
  const quiz = await getQuizForDisplay(quizId);

  if (!quiz) {
    notFound();
  }

  // ⏰ चेक करो कि क्या क्विज़ का टाइम खत्म हो गया है?
  const isExpired = quiz.expires_at ? new Date() > new Date(quiz.expires_at) : false;

  // अगर टाइम खत्म हो गया है, तो खेलने नहीं देना है! सीधा फेयर रिजल्ट (Public Leaderboard) दिखाओ
  if (isExpired) {
    const supabase = await createClient();
    const { data: players } = await supabase
      .from('players')
      .select('id, nickname, score, total_time_ms')
      .eq('quiz_id', quiz.id)
      .order('score', { ascending: false })
      .order('total_time_ms', { ascending: true })
      .limit(10); // टॉप 10 दिखाएंगे

    const winner = players && players.length > 0 ? players[0] : null;

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans flex flex-col items-center">
        <div className="max-w-2xl w-full bg-white p-8 rounded-3xl shadow-lg border border-slate-200 text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Final Results Are Out! 🎉</h1>
          <p className="text-slate-500 mb-8">The challenge by {quiz.creator_name} has officially ended.</p>

          {winner && winner.score === 5 ? (
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 p-6 rounded-2xl mb-8 shadow-sm">
              <h2 className="text-xl font-bold text-amber-800 mb-1 flex items-center justify-center gap-2">
                <Medal size={24} /> Official Winner
              </h2>
              <p className="text-3xl font-extrabold text-amber-600 mb-1">{winner.nickname}</p>
              <p className="text-amber-700/80 font-medium">Won the {quiz.reward_text}!</p>
            </div>
          ) : (
            <div className="bg-slate-100 p-6 rounded-2xl mb-8 text-slate-600 font-medium">
              No one scored a perfect 5/5. Better luck next time!
            </div>
          )}

          <div className="text-left bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {players?.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <span className="font-bold text-slate-700 flex items-center gap-3">
                  <span className="text-slate-400">#{i + 1}</span> {p.nickname}
                </span>
                <span className="text-slate-500 font-medium">
                  {p.score}/5 <span className="text-slate-300 mx-1">|</span> {(p.total_time_ms / 1000).toFixed(1)}s
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100">
             <a href="/" className="inline-block w-full bg-indigo-600 text-white font-bold px-4 py-4 rounded-xl text-lg hover:bg-indigo-700 transition-colors shadow-md">
               Create your own quiz for FREE 🚀
             </a>
          </div>
        </div>
      </div>
    );
  }

  // अगर टाइम बचा है, तो क्विज़ खेलने दो!
  return <QuizPlayer quizSlug={quiz.slug} quizId={quiz.id} creatorName={quiz.creator_name} rewardText={quiz.reward_text} />;
}