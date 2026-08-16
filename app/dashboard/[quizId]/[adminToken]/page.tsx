import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ quizId: string; adminToken: string }>;
}) {
  const { quizId, adminToken } = await params;
  const supabase = await createClient();

  // 1. चेक करो कि क्या पासवर्ड (adminToken) सही है
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .eq('admin_token', adminToken)
    .single();

  if (quizError || !quiz) {
    notFound(); // अगर पासवर्ड गलत है, तो 404 दिखा दो!
  }

  // 2. सारे प्लेयर्स का रिज़ल्ट मंगवाओ
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('total_time_ms', { ascending: true });

  const expiryDate = new Date(quiz.expires_at);
  const isExpired = new Date() > expiryDate;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Creator Dashboard 🕵️‍♂️</h1>
        <p className="text-slate-500 mb-6">
          Quiz Status: {isExpired ? <span className="text-red-500 font-bold">Ended</span> : <span className="text-emerald-500 font-bold">Live (Collecting Answers)</span>}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="p-4 rounded-tl-xl font-bold">Rank</th>
                <th className="p-4 font-bold">Player Name</th>
                <th className="p-4 font-bold">Score</th>
                <th className="p-4 rounded-tr-xl font-bold">Time Taken</th>
              </tr>
            </thead>
            <tbody>
              {players && players.length > 0 ? (
                players.map((p, index) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-700">#{index + 1}</td>
                    <td className="p-4 font-medium text-slate-900">{p.nickname}</td>
                    <td className="p-4 font-bold text-indigo-600">{p.score}/5</td>
                    <td className="p-4 text-slate-500">{(p.total_time_ms / 1000).toFixed(1)}s</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No one has played yet. Share your link!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}