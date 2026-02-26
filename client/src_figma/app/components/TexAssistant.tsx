import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send, Zap, Video, FileText, Languages, Clock, Layers, Wand2, Brain, Rocket, Heart, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';

interface Message {
  id: string;
  text: string;
  sender: 'tex' | 'user';
  timestamp: Date;
  emoji?: string;
}

// Tex's personality traits and responses
const texPersonality = {
  greetings: [
    "Hey there! I'm Tex, your video wizard! ✨ What magic shall we create today?",
    "Yo! Tex here 🎬 Ready to turn your videos into pure text gold?",
    "Hi friend! 👋 I'm Tex, and I LOVE making videos talk!",
  ],
  contextual: {
    '/tools/video-to-transcript': {
      greeting: "Transcription time! 📝 I'll extract every word from your video like magic!",
      tips: [
        "💡 Pro tip: Add speaker labels to see who said what!",
        "🎯 Use the glossary for names and technical terms - I'll nail them!",
        "⚡ Fun fact: I can transcribe a 1-hour video in under 2 minutes!",
      ]
    },
    '/tools/video-to-subtitles': {
      greeting: "Subtitle central! 🎬 Let's make your video accessible to everyone!",
      tips: [
        "🌍 Did you know? Subtitles increase engagement by 80%!",
        "⚡ I can generate SRT and VTT formats instantly!",
        "🎨 Want multiple languages? I got you covered!",
      ]
    },
    '/tools/translate-subtitles': {
      greeting: "Translation station! 🌍 Breaking language barriers one subtitle at a time!",
      tips: [
        "🗣️ I speak 50+ languages fluently!",
        "✨ My AI keeps context and meaning intact during translation!",
        "🚀 From Arabic to Mandarin, I got your back!",
      ]
    },
    '/tools/fix-subtitles': {
      greeting: "Repair mode activated! 🔧 I'll fix those wonky subtitles ASAP!",
      tips: [
        "⚡ I can auto-detect and fix 90% of timing issues!",
        "🎯 Broken lines? Duplicates? Consider them gone!",
        "✨ Your subtitles will look professional when I'm done!",
      ]
    },
    '/tools/burn-subtitles': {
      greeting: "Burn baby burn! 🔥 Let's hardcode those captions into your video!",
      tips: [
        "🎨 You can customize fonts, positions, and styles!",
        "⚡ Once burned in, subtitles work on any device!",
        "📱 Perfect for social media and universal playback!",
      ]
    },
    '/tools/compress-video': {
      greeting: "Compression master! 📦 I'll shrink your video while keeping it gorgeous!",
      tips: [
        "⚡ I can reduce file size by 70% without visible quality loss!",
        "🎯 Choose from Web, Mobile, or Archive presets!",
        "💾 Smaller files = faster uploads = happy users!",
      ]
    },
    '/tools/batch-processing': {
      greeting: "Batch mode engage! 🚀 Process multiple files like a productivity ninja!",
      tips: [
        "⚡ Upload up to 50 videos at once!",
        "🎯 Same settings applied to all - mega time saver!",
        "🚀 Sit back and let me handle the heavy lifting!",
      ]
    }
  },
  encouragement: [
    "You're doing great! 🌟",
    "This is going to be awesome! 🚀",
    "I'm on it like sonic! ⚡",
    "Watch me work my magic! ✨",
    "Processing at lightspeed! 💫",
  ],
  compliments: [
    "Nice choice! Smart move! 🎯",
    "Ooh, excellent selection! 👏",
    "You know your stuff! 🧠",
    "Love it! Let's do this! 💪",
  ]
};

export function TexAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [mood, setMood] = useState<'happy' | 'excited' | 'thinking' | 'celebrating'>('happy');
  const location = useLocation();

  // Contextual greeting based on current page
  useEffect(() => {
    const timer = setTimeout(() => {
      const path = location.pathname;
      const contextualInfo = texPersonality.contextual[path as keyof typeof texPersonality.contextual];
      
      const greeting = contextualInfo?.greeting || 
        texPersonality.greetings[Math.floor(Math.random() * texPersonality.greetings.length)];
      
      setMessages([
        {
          id: '1',
          text: greeting,
          sender: 'tex',
          timestamp: new Date(),
          emoji: '👋'
        }
      ]);
      
      // Send a random tip after 3 seconds
      if (contextualInfo?.tips) {
        setTimeout(() => {
          const randomTip = contextualInfo.tips[Math.floor(Math.random() * contextualInfo.tips.length)];
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: randomTip,
            sender: 'tex',
            timestamp: new Date()
          }]);
        }, 3000);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Hide pulse after first interaction
  useEffect(() => {
    if (isOpen) {
      setShowPulse(false);
    }
  }, [isOpen]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setMood('thinking');

    // Smart contextual responses
    setTimeout(() => {
      let responseText = '';
      const input = inputValue.toLowerCase();

      if (input.includes('help') || input.includes('how')) {
        responseText = "I'm here to help! 🎯 Upload your video, choose your options, and I'll process it in seconds. Need something specific?";
      } else if (input.includes('fast') || input.includes('quick')) {
        responseText = "Lightning fast! ⚡ Most videos process in under a minute. I'm basically The Flash of video processing! 🏃‍♂️💨";
      } else if (input.includes('language')) {
        responseText = "I speak 50+ languages! 🌍 Arabic, Chinese, Spanish, Hindi... you name it! Translation and transcription in any language!";
      } else if (input.includes('quality')) {
        responseText = "Quality is my middle name! ✨ (Actually it's just 'Tex' but you get the point) I use state-of-the-art AI for accuracy!";
      } else if (input.includes('price') || input.includes('cost')) {
        responseText = "Great question! 💰 Check out our pricing plans - we have options for everyone from solo creators to enterprises!";
      } else if (input.includes('thank')) {
        responseText = "Aww, you're welcome! 🥰 Making your life easier is what I do best!";
        setMood('celebrating');
      } else {
        const responses = [
          "Interesting question! 🤔 Let me help you with that...",
          "Great point! 🎯 Here's what I'd recommend...",
          "Ooh, I love questions! 🧠 So here's the deal...",
          "Smart thinking! 💡 Let me explain...",
        ];
        responseText = responses[Math.floor(Math.random() * responses.length)];
      }

      const texResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'tex',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, texResponse]);
      setIsTyping(false);
      setMood('happy');
    }, 1000 + Math.random() * 1000);
  };

  const quickActions = [
    { icon: Video, label: 'Start transcribing', color: 'from-purple-500 to-blue-500' },
    { icon: FileText, label: 'Generate subtitles', color: 'from-blue-500 to-cyan-500' },
    { icon: Languages, label: 'Translate content', color: 'from-pink-500 to-purple-500' },
    { icon: Rocket, label: 'Show me around', color: 'from-orange-500 to-red-500' }
  ];

  // Tex's animated expressions
  const getMoodAnimation = () => {
    switch (mood) {
      case 'excited':
        return { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] };
      case 'thinking':
        return { rotate: [-5, 5, -5] };
      case 'celebrating':
        return { scale: [1, 1.3, 1], rotate: [0, 360] };
      default:
        return { scale: [1, 1.05, 1] };
    }
  };

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-3rem)] z-50"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-purple-200 dark:border-purple-900 overflow-hidden backdrop-blur-xl">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 p-5">
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Tex's Unique Avatar */}
                    <motion.div
                      animate={getMoodAnimation()}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-2xl flex items-center justify-center border-2 border-white/60 shadow-xl overflow-hidden">
                        {/* Tex's face */}
                        <div className="relative">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-300 opacity-50 blur-md"
                          />
                          <Sparkles className="w-7 h-7 text-white relative z-10 drop-shadow-lg" />
                        </div>
                      </div>
                      
                      {/* Active pulse */}
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full border-2 border-white shadow-lg"
                      />
                      
                      {/* Sparkle particles */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          animate={{
                            x: [0, (Math.random() - 0.5) * 30],
                            y: [0, (Math.random() - 0.5) * 30],
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.4,
                          }}
                        >
                          <Star className="w-2 h-2 text-yellow-300 fill-yellow-300" />
                        </motion.div>
                      ))}
                    </motion.div>
                    
                    <div>
                      <motion.h3 
                        className="text-white font-black text-xl tracking-tight"
                        animate={{ opacity: [0.9, 1, 0.9] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        Tex
                      </motion.h3>
                      <div className="flex items-center gap-1.5">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Brain className="w-3 h-3 text-white/90" />
                        </motion.div>
                        <p className="text-white/90 text-xs font-medium">
                          AI Video Wizard • Always learning
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[450px] overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-purple-50/50 to-blue-50/50 dark:from-gray-950 dark:to-purple-950/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <motion.div
                      animate={{ 
                        y: [0, -15, 0],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="relative mb-6"
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-20 blur-2xl"
                      />
                      <Wand2 className="w-20 h-20 text-purple-600 dark:text-purple-400 relative z-10" />
                    </motion.div>
                    
                    <motion.h4 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-black text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                    >
                      Hey! I'm Tex ✨
                    </motion.h4>
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-sm text-gray-600 dark:text-gray-400 mb-8 max-w-xs"
                    >
                      Your friendly AI companion for all things video! I make transcription, subtitles, and translation feel like magic 🪄
                    </motion.p>
                    
                    {/* Quick actions */}
                    <div className="space-y-2 w-full">
                      {quickActions.map((action, index) => (
                        <motion.button
                          key={action.label}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.1, type: 'spring', stiffness: 200 }}
                          whileHover={{ scale: 1.03, x: 8 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setMood('excited');
                            const msg: Message = {
                              id: Date.now().toString(),
                              text: action.label,
                              sender: 'user',
                              timestamp: new Date()
                            };
                            setMessages([msg]);
                            setTimeout(() => setMood('happy'), 1000);
                          }}
                          className="w-full group relative overflow-hidden"
                        >
                          <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                          <div className="relative flex items-center gap-3 p-4 bg-white dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-750 rounded-2xl border-2 border-gray-200 dark:border-gray-700 group-hover:border-purple-300 dark:group-hover:border-purple-600 transition-all shadow-sm hover:shadow-md">
                            <motion.div 
                              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                              className={`p-2.5 bg-gradient-to-br ${action.color} rounded-xl shadow-lg`}
                            >
                              <action.icon className="w-5 h-5 text-white" />
                            </motion.div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {action.label}
                            </span>
                            <motion.div
                              className="ml-auto"
                              animate={{ x: [0, 4, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <Sparkles className="w-4 h-4 text-purple-500" />
                            </motion.div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    
                    {isTyping && <TypingIndicator />}
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-white dark:bg-gray-900 border-t-2 border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask me anything... I'm all ears! 👂"
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border-2 border-transparent focus:border-purple-300 transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white hover:shadow-xl transition-all relative overflow-hidden group"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                    />
                    <Send className="w-5 h-5 relative z-10" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button - Tex's unique presence */}
      <motion.button
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: 'spring',
          stiffness: 200,
          damping: 12,
          delay: 0.5
        }}
        onClick={() => {
          setIsOpen(!isOpen);
          setMood('excited');
          setTimeout(() => setMood('happy'), 1000);
        }}
        className="fixed bottom-6 right-6 z-50 group"
      >
        {/* Magical pulse rings */}
        {showPulse && (
          <>
            <motion.div
              animate={{ 
                scale: [1, 1.8, 1],
                opacity: [0.6, 0, 0.6]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-sm"
            />
            <motion.div
              animate={{ 
                scale: [1, 2.2, 1],
                opacity: [0.4, 0, 0.4]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.7
              }}
              className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-md"
            />
          </>
        )}

        {/* Main button with personality */}
        <motion.div
          whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
          whileTap={{ scale: 0.85 }}
          animate={getMoodAnimation()}
          className="relative w-20 h-20 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden"
        >
          {/* Animated shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ 
              x: ['-200%', '200%'],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 2
            }}
          />

          {/* Rotating gradient overlay */}
          <motion.div
            className="absolute inset-0"
            animate={{ 
              rotate: [0, 360],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)'
            }}
          />

          {/* Icon */}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <X className="w-8 h-8 text-white relative z-10 drop-shadow-lg" />
              </motion.div>
            ) : (
              <motion.div
                key="tex"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative z-10"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.15, 1]
                  }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className="w-9 h-9 text-white drop-shadow-2xl" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification badge */}
          {messages.length > 0 && !isOpen && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute -top-2 -right-2 min-w-7 h-7 px-1.5 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-black border-3 border-white dark:border-gray-900 shadow-lg"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                {messages.length}
              </motion.span>
            </motion.div>
          )}

          {/* Heart pulse for personality */}
          <motion.div
            className="absolute top-2 right-2"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Heart className="w-3 h-3 text-pink-300 fill-pink-300" />
          </motion.div>
        </motion.div>

        {/* Magical sparkle effects */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
            }}
            animate={{
              x: [0, Math.cos((i * 72) * Math.PI / 180) * 50],
              y: [0, Math.sin((i * 72) * Math.PI / 180) * 50],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeOut"
            }}
          >
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </motion.div>
        ))}

        {/* Tooltip with personality */}
        <motion.div
          initial={{ opacity: 0, x: 10, scale: 0.9 }}
          whileHover={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute right-24 top-1/2 -translate-y-1/2 px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm font-bold rounded-2xl whitespace-nowrap pointer-events-none shadow-xl border border-gray-700"
        >
          <motion.span
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Chat with Tex! ✨
          </motion.span>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45 w-3 h-3 bg-gradient-to-br from-gray-900 to-gray-800 border-r border-b border-gray-700" />
        </motion.div>
      </motion.button>
    </>
  );
}

// Enhanced Chat message component
function ChatMessage({ message }: { message: Message }) {
  const isTeX = message.sender === 'tex';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`flex ${isTeX ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex gap-2.5 max-w-[85%] ${isTeX ? 'flex-row' : 'flex-row-reverse'}`}>
        {isTeX && (
          <motion.div 
            className="flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-lg relative overflow-hidden"
            whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
            <Sparkles className="w-5 h-5 text-white relative z-10" />
          </motion.div>
        )}
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`px-4 py-3 rounded-2xl shadow-md ${
            isTeX
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-purple-100 dark:border-purple-900/30'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
          }`}
        >
          <p className="text-sm leading-relaxed font-medium">{message.text}</p>
          {message.emoji && isTeX && (
            <motion.span
              className="inline-block ml-1"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              {message.emoji}
            </motion.span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// Enhanced Typing indicator
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2.5"
    >
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div className="bg-white dark:bg-gray-800 px-5 py-3 rounded-2xl border-2 border-purple-100 dark:border-purple-900/30 shadow-md">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              animate={{ 
                y: [-3, 3, -3],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
