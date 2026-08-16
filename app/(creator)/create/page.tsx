'use client';

import { useState } from 'react';
import QuestionBuilder, { BuilderQuestion } from '@/components/QuestionBuilder';
import { Trophy, ArrowRight, CheckCircle2, Gift, User, Copy, Share2, Clock, Lock } from 'lucide-react';
import { publishQuizAction } from './actions';

export default function CreateQuizPage() {
  const [step, setStep] = useState(1);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [reward, setReward] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [expiry, setExpiry] = useState('24h'); // <-- नया: टाइमर स्टेट
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [quizLink, setQuizLink] = useState('');
  const [secretLink, setSecretLink] = useState(''); // <-- नया: सीक्रेट लिंक स्टेट
  
  const [copied, setCopied] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const isValid = questions.length > 0;

  const handlePublish = async () => {
    setIsPublishing(true);
    // यहाँ हम expiry भी भेज रहे हैं
    const result = await publishQuizAction({ questions, reward, creatorName, expiry });
    if (result.success) {
      // 1. पब्लिक लिंक (दोस्तों के लिए)
      setQuizLink(`${window.location.origin}/quiz/${result.quizId}`);
      // 2. सीक्रेट लिंक (सिर्फ क्रिएटर के लिए)
      setSecretLink(`${window.location.origin}/dashboard/${result.quizId}/${result.adminToken}`);
      setStep(3); 
    } else {
      alert("Oops! Something went wrong while saving. Check Supabase connection.");
    }
    setIsPublishing(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(quizLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(secretLink);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {step < 3 && (
          <div className="text-center animate-in fade-in duration-500">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 flex items-center justify-center gap-3">
              <Trophy className="text-indigo-600" size={36} />
              Create Your Quiz
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              {step === 1 ? 'Select or craft questions for your squad.' : 'Tell them who you are & set a prize!'}
            </p>
          </div>
        )}

        {/* STEP 1: Question Builder */}
        {step === 1 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 transition-all duration-500">
            <QuestionBuilder onQuestionsChange={setQuestions} />
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!isValid}
                className="group flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-full font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                Next Step <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Set Creator Details & Reward */}
        {step === 2 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-8">
              <Gift className="text-pink-500 w-16 h-16 mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-slate-800">Final Touches! 🎁</h2>
            </div>
            
            <div className="max-w-xl mx-auto space-y-6">
              
              <div>
                <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
                  <User size={18} className="text-indigo-500" /> Your Name
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="e.g., Aman, Priya..."
                  className="w-full text-lg px-5 py-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all text-slate-950 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
                  <Trophy size={18} className="text-indigo-500" /> What's the prize for scoring full marks?
                </label>
                <input
                  type="text"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="e.g., A free Starbucks coffee, A pizza party..."
                  className="w-full text-lg px-5 py-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all text-slate-950 font-bold"
                />
              </div>

              {/* नया: टाइमर ड्रापडाउन */}
              <div>
                <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
                  <Clock size={18} className="text-indigo-500" /> Quiz Duration (Results revealed after)
                </label>
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full text-lg px-5 py-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all text-slate-950 font-bold bg-white"
                >
                  <option value="24h">24 Hours (Best for WhatsApp Status)</option>
                  <option value="5d">5 Days (Best for Instagram)</option>
                  <option value="10d">10 Days (Best for YouTube)</option>
                </select>
                <p className="text-sm text-slate-500 mt-2">
                  Nobody can see the answers until this time is over!
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-100">
                <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 font-semibold px-6 py-3">
                  ← Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !reward.trim() || !creatorName.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-full font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                >
                  {isPublishing ? 'Creating Links...' : 'Publish Quiz'} <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Success & Share Screen */}
        {step === 3 && (
          <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-emerald-100 text-center space-y-8 animate-in zoom-in duration-500">
             
             {/* --- PUBLIC SHARE LINK --- */}
             <div className="border-b border-slate-100 pb-8">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle2 size={40} />
               </div>
               <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Quiz is Live! 🎉</h2>
               <p className="text-slate-500 text-lg mt-3 font-medium">Share this public link with your friends.</p>

               <div className="flex items-center gap-3 bg-slate-50 p-3 sm:p-4 rounded-2xl border-2 border-slate-200 focus-within:border-indigo-400 transition-all mt-6">
                 <input 
                   readOnly 
                   value={quizLink} 
                   className="bg-transparent flex-1 outline-none text-slate-600 font-medium px-2 truncate w-full" 
                 />
                 <button 
                   onClick={copyToClipboard} 
                   className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shrink-0 shadow-md"
                 >
                   {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                   <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                 </button>
               </div>

               <a 
                 href={`https://wa.me/?text=I challenge you to my GuessKro quiz! Score 5/5 to win ${reward}. Play here: ${quizLink}`} 
                 target="_blank" 
                 className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-4 sm:py-5 rounded-2xl font-bold text-xl hover:bg-[#20bd5a] hover:scale-[1.02] transition-all shadow-lg mt-4"
               >
                 <Share2 size={24} /> Share on WhatsApp
               </a>
             </div>

             {/* --- SECRET ADMIN DASHBOARD LINK --- */}
             <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                <div className="flex items-center gap-2 text-red-600 font-bold text-lg mb-2">
                  <Lock size={20} /> Secret Dashboard Link
                </div>
                <p className="text-red-800/80 font-medium mb-4 text-sm">
                  ⚠️ <strong>Do NOT share this link!</strong> Keep it safe. Use this link after the time limit ends to see who won and what they answered.
                </p>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-red-200">
                 <input 
                   readOnly 
                   value={secretLink} 
                   className="bg-transparent flex-1 outline-none text-slate-600 font-medium px-2 truncate w-full text-sm" 
                 />
                 <button 
                   onClick={copySecretToClipboard} 
                   className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-slate-900 transition shrink-0"
                 >
                   {copiedSecret ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                   <span className="hidden sm:inline">{copiedSecret ? 'Copied' : 'Copy Secret'}</span>
                 </button>
               </div>
             </div>

          </div>
        )}

      </div>
    </div>
  );
}