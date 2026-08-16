import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      
      {/* Background Glow Effects (Premium Look ke liye) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-3xl w-full text-center space-y-8 flex flex-col items-center">
        
        {/* Animated Trophy Icon */}
        <div className="text-8xl mb-2 animate-bounce">🏆</div>
        
        {/* App Title (Gradient Text) */}
        <h1 className="text-6xl sm:text-8xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-lg">
          GuessKro
        </h1>
        
        {/* Subtitle / Tagline */}
        <p className="text-lg sm:text-2xl text-gray-300 max-w-2xl font-medium leading-relaxed">
          The ultimate test of friendship. Create a custom quiz, challenge your squad, and see who knows you the best!
        </p>
        
        {/* Call to Action Button */}
        <div className="pt-10 w-full sm:w-auto">
          <Link 
            href="/create" 
            className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white transition-all duration-300 bg-indigo-600 rounded-full hover:bg-indigo-500 hover:scale-105 shadow-[0_0_40px_rgba(79,70,229,0.5)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-indigo-600"
          >
            Create Your Quiz Now ✨
          </Link>
        </div>
        
      </div>
    </main>
  );
}