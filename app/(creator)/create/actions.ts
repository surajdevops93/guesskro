'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function publishQuizAction(payload: {
  questions: any[];
  reward: string;
  creatorName: string;
  expiry: string; // <-- नया: टाइमर के लिए
}) {
  try {
    // 1. प्लेयर सेव करें
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([{ name: payload.creatorName, nickname: payload.creatorName }])
      .select('id')
      .single();

    if (playerError) {
      console.log("Player Save Error:", playerError);
      return { success: false, error: 'Player save failed' };
    }

    // टाइमर का हिसाब (Expiry Date Calculation)
    let expiresMs = 24 * 60 * 60 * 1000; // Default: 24 Hours
    if (payload.expiry === '5d') expiresMs = 5 * 24 * 60 * 60 * 1000;
    if (payload.expiry === '10d') expiresMs = 10 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiresMs).toISOString();

    // 2. क्विज़ सेव करें
    const quizData = {
        creator_id: player.id,
        creator_name: payload.creatorName,
        reward_text: payload.reward,
        build_mode: 'custom',
        title: payload.creatorName + "'s Quiz",
        slug: 'quiz-' + Date.now(),
        is_published: true,
        expires_at: expiresAt // <-- नया: डेटाबेस में टाइम सेव कर रहे हैं
    };

    // यहाँ हम 'id' के साथ-साथ 'admin_token' भी वापस मंगा रहे हैं
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([quizData])
      .select('id, admin_token') 
      .single();

    if (quizError) {
      console.log("Quiz Save Error:", quizError); 
      return { success: false, error: 'Quiz save failed' };
    }

    // 3. सवाल सेव करें
    const formattedQuestions = payload.questions.map((q, index) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      options: q.options,
      correct_option_index: q.correct_option_index,
      question_order: index + 1, 
      source: q.source || 'custom'
    }));

    const { error: qError } = await supabase
      .from('questions')
      .insert(formattedQuestions);

    if (qError) {
      console.log("Questions Save Error:", qError);
      return { success: false, error: 'Questions save failed' };
    }

    // SUCCESS! 🎉 (यहाँ हम फ्रंटएंड को adminToken भेज रहे हैं)
    return { success: true, quizId: quiz.id, adminToken: quiz.admin_token };

  } catch (error) {
    console.error("Critical Server Error:", error);
    return { success: false, error: 'Server error' };
  }
}