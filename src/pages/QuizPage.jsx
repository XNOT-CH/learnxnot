/* ============================================
   QuizPage - หน้าทดสอบคำศัพท์
   รองรับ 2 โหมด: อังกฤษ→ไทย / ไทย→อังกฤษ
   ============================================ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Languages,
  ArrowRight,
  Volume2,
  Check,
  X,
  RotateCcw,
  Home,
  Trophy,
  ChevronRight,
  Sparkles,
  Folder,
} from 'lucide-react';
import {
  loadVocabulary,
  loadStats,
  loadCategories,
  updateWordStat,
} from '../utils/storage.js';
import { speakEnglish } from '../utils/speech.js';
import { shuffleWithWeight, checkAnswer } from '../utils/quiz.js';

// ============================================
// Circular Progress Indicator Component
// ============================================
function CircularProgress({ percentage, size = 160, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (percentage >= 90) return '#10b981'; // success green
    if (percentage >= 70) return '#3b82f6'; // primary blue
    if (percentage >= 50) return '#f59e0b'; // warning yellow
    return '#ef4444'; // error red
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-text-primary">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

// ============================================
// Question count pill options
// ============================================
const QUESTION_OPTIONS = [
  { label: 'ทั้งหมด', value: 'all' },
  { label: '10 ข้อ', value: 10 },
  { label: '20 ข้อ', value: 20 },
  { label: '30 ข้อ', value: 30 },
];

// ============================================
// Main QuizPage Component
// ============================================
export default function QuizPage() {
  const navigate = useNavigate();

  // --- State ---
  const [vocabulary, setVocabulary] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all'); // 'all' | category id
  const [quizMode, setQuizMode] = useState(null); // 'en-to-th' | 'th-to-en'
  const [questionCount, setQuestionCount] = useState('all');
  const [quizState, setQuizState] = useState('select'); // 'select' | 'active' | 'results'

  // Active quiz state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  // --- Load vocabulary, categories & stats on mount ---
  useEffect(() => {
    setVocabulary(loadVocabulary());
    setCategories(loadCategories());
  }, []);

  // --- Words within the currently selected category scope ---
  const wordsInScope =
    selectedCategoryId === 'all'
      ? vocabulary
      : vocabulary.filter((w) => w.categoryId === selectedCategoryId);

  // --- Cleanup timeout on unmount ---
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // --- Focus input when question changes ---
  useEffect(() => {
    if (quizState !== 'active' || feedback !== null) return;
    // Small delay so the DOM updates first
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [currentIndex, quizState, feedback]);

  // ============================================
  // Start the quiz
  // ============================================
  const startQuiz = useCallback(
    (mode) => {
      const currentStats = loadStats();
      const shuffled = shuffleWithWeight(wordsInScope, currentStats);

      // Determine number of questions
      const count =
        questionCount === 'all'
          ? shuffled.length
          : Math.min(questionCount, shuffled.length);

      const selected = shuffled.slice(0, count);

      setQuizMode(mode);
      setQuestions(selected);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswer('');
      setFeedback(null);
      setWrongAnswers([]);
      setIsSubmitting(false);
      setQuizState('active');
    },
    [wordsInScope, questionCount]
  );

  // ============================================
  // Submit answer for current question
  // ============================================
  const handleSubmit = useCallback(() => {
    if (isSubmitting || !userAnswer.trim()) return;
    setIsSubmitting(true);

    const currentWord = questions[currentIndex];
    // Determine correct answer based on mode
    const correctAnswer =
      quizMode === 'en-to-th' ? currentWord.thai : currentWord.english;

    const isCorrect = checkAnswer(userAnswer, correctAnswer);

    // Update stats in localStorage
    updateWordStat(currentWord.id, isCorrect);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
      setWrongAnswers((prev) => [
        ...prev,
        {
          prompt:
            quizMode === 'en-to-th' ? currentWord.english : currentWord.thai,
          correctAnswer,
          userAnswer: userAnswer.trim(),
        },
      ]);
    }

    // Auto-advance after 1.5 seconds
    feedbackTimeoutRef.current = setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setUserAnswer('');
        setFeedback(null);
        setIsSubmitting(false);
      } else {
        // Quiz finished
        setQuizState('results');
      }
    }, 1500);
  }, [isSubmitting, userAnswer, questions, currentIndex, quizMode]);

  // ============================================
  // Handle Enter key
  // ============================================
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // ============================================
  // Restart quiz
  // ============================================
  const restartQuiz = useCallback(() => {
    // ยกเลิก timer ที่อาจยังค้างอยู่ ก่อนกลับไปหน้าเลือกโหมด
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setQuizState('select');
    setQuizMode(null);
    setFeedback(null);
    setIsSubmitting(false);
    setUserAnswer('');
    // Reload fresh data
    setVocabulary(loadVocabulary());
    setCategories(loadCategories());
  }, []);

  // ============================================
  // Get performance message based on score
  // ============================================
  const getPerformanceMessage = (correct, total) => {
    const pct = (correct / total) * 100;
    if (pct >= 90) return 'ยอดเยี่ยม! 🏆';
    if (pct >= 70) return 'ดีมาก! 👏';
    if (pct >= 50) return 'พอใช้ได้ 💪';
    return 'ต้องทบทวนเพิ่ม 📚';
  };

  // ============================================
  // RENDER: Mode Selection Screen
  // ============================================
  if (quizState === 'select') {
    return (
      <div className="min-h-screen px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-4">
              <Brain size={32} />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              เลือกโหมดทดสอบ
            </h1>
            <p className="text-text-secondary">
              เลือกโหมดที่ต้องการฝึกทดสอบคำศัพท์
            </p>
          </div>

          {/* No words available */}
          {vocabulary.length === 0 ? (
            <div className="glass-card p-8 text-center animate-slide-up">
              <Languages size={48} className="mx-auto text-text-muted mb-4" />
              <p className="text-text-secondary text-lg mb-4">
                ยังไม่มีคำศัพท์ในระบบ
              </p>
              <p className="text-text-muted mb-6">
                เพิ่มคำศัพท์ก่อนเริ่มทดสอบ
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors cursor-pointer"
              >
                <Home size={18} />
                ไปเพิ่มคำศัพท์
              </button>
            </div>
          ) : (
            <>
              {/* Category selector */}
              {categories.length > 0 && (
                <div className="mb-6">
                  <p className="text-center text-text-secondary text-sm mb-3">
                    เลือกหมวดหมู่ที่ต้องการทดสอบ
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedCategoryId('all')}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer
                        ${
                          selectedCategoryId === 'all'
                            ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                            : 'bg-white/60 text-text-secondary hover:bg-white hover:text-primary-600 border border-border'
                        }`}
                    >
                      <Sparkles size={15} />
                      ทั้งหมด
                    </button>
                    {categories.map((cat) => {
                      const count = vocabulary.filter(
                        (w) => w.categoryId === cat.id
                      ).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer
                            ${
                              selectedCategoryId === cat.id
                                ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                                : 'bg-white/60 text-text-secondary hover:bg-white hover:text-primary-600 border border-border'
                            }`}
                        >
                          <Folder size={15} />
                          {cat.name}
                          <span
                            className={`ml-0.5 rounded-full px-1.5 text-xs ${
                              selectedCategoryId === cat.id
                                ? 'bg-white/25'
                                : 'bg-primary-100 text-primary-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Word count info */}
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                  <Sparkles size={16} />
                  คำศัพท์ที่จะทดสอบ {wordsInScope.length} คำ
                </span>
              </div>

              {/* No words in the selected category */}
              {wordsInScope.length === 0 ? (
                <div className="glass-card p-6 text-center text-text-secondary animate-fade-in">
                  หมวดหมู่นี้ยังไม่มีคำศัพท์ — เลือกหมวดอื่น หรือไปเพิ่มคำศัพท์ก่อน
                </div>
              ) : (
                <>
              {/* Question count selector */}
              <div className="mb-8">
                <p className="text-center text-text-secondary text-sm mb-3">
                  จำนวนข้อที่ต้องการทดสอบ
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {QUESTION_OPTIONS.map((opt) => {
                    // Disable options that exceed available words
                    const disabled =
                      opt.value !== 'all' && opt.value > wordsInScope.length;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => !disabled && setQuestionCount(opt.value)}
                        disabled={disabled}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer
                          ${
                            questionCount === opt.value
                              ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                              : disabled
                                ? 'bg-surface-alt text-text-muted cursor-not-allowed opacity-50'
                                : 'bg-white/60 text-text-secondary hover:bg-white hover:text-primary-600 border border-border'
                          }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
                {/* Mode A: English → Thai */}
                <button
                  onClick={() => startQuiz('en-to-th')}
                  className="glass-card p-6 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                      <Languages size={24} />
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-text-muted group-hover:text-primary-500 transition-colors"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">
                    อังกฤษ → ไทย
                  </h3>
                  <p className="text-sm text-text-secondary">
                    เห็นคำภาษาอังกฤษ แล้วพิมพ์ความหมายภาษาไทย
                  </p>
                </button>

                {/* Mode B: Thai → English */}
                <button
                  onClick={() => startQuiz('th-to-en')}
                  className="glass-card p-6 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                      <ArrowRight size={24} />
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-text-muted group-hover:text-primary-500 transition-colors"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">
                    ไทย → อังกฤษ
                  </h3>
                  <p className="text-sm text-text-secondary">
                    เห็นคำภาษาไทย แล้วพิมพ์คำภาษาอังกฤษ
                  </p>
                </button>
              </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Active Quiz Screen
  // ============================================
  if (quizState === 'active' && questions.length > 0) {
    const currentWord = questions[currentIndex];
    const promptWord =
      quizMode === 'en-to-th' ? currentWord.english : currentWord.thai;
    const correctAnswer =
      quizMode === 'en-to-th' ? currentWord.thai : currentWord.english;
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Progress bar & info */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-secondary">
                ข้อที่ {currentIndex + 1} / {questions.length}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600">
                <Trophy size={16} />
                คะแนน: {score}
              </span>
            </div>
            {/* Progress bar track */}
            <div className="w-full h-2.5 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quiz card */}
          <div
            className={`glass-card p-8 mb-6 transition-all duration-300
              ${feedback === 'correct' ? 'animate-pulse-success' : ''}
              ${feedback === 'wrong' ? 'animate-pulse-error animate-shake' : ''}
            `}
          >
            {/* Prompt word */}
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-widest text-text-muted mb-3">
                {quizMode === 'en-to-th'
                  ? 'คำภาษาอังกฤษ'
                  : 'คำภาษาไทย'}
              </p>
              <h2 className="text-4xl font-extrabold text-text-primary mb-4">
                {promptWord}
              </h2>
              {/* Speaker button for English mode */}
              {quizMode === 'en-to-th' && (
                <button
                  onClick={() => speakEnglish(currentWord.english)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors text-sm font-medium cursor-pointer"
                >
                  <Volume2 size={18} />
                  ฟังเสียง
                </button>
              )}
            </div>

            {/* Answer input */}
            <div className="space-y-4">
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={feedback !== null}
                placeholder={
                  quizMode === 'en-to-th'
                    ? 'พิมพ์คำแปลภาษาไทย...'
                    : 'Type the English word...'
                }
                className="w-full px-5 py-4 rounded-xl border-2 border-border bg-white/80 text-lg text-text-primary placeholder:text-text-muted
                  focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-200
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all"
              />

              {/* Submit button (hidden during feedback) */}
              {feedback === null && (
                <button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                  className="w-full py-4 rounded-xl bg-primary-500 text-white font-semibold text-lg
                    hover:bg-primary-600 active:scale-[0.98] transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ตรวจคำตอบ
                </button>
              )}
            </div>

            {/* Feedback display */}
            {feedback === 'correct' && (
              <div className="mt-6 text-center animate-bounce-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success-light text-success mb-3">
                  <Check size={28} strokeWidth={3} />
                </div>
                <p className="text-xl font-bold text-success">ถูกต้อง! 🎉</p>
              </div>
            )}

            {feedback === 'wrong' && (
              <div className="mt-6 text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-error-light text-error mb-3">
                  <X size={28} strokeWidth={3} />
                </div>
                <p className="text-lg font-bold text-error mb-1">ไม่ถูกต้อง</p>
                <p className="text-text-secondary">
                  คำตอบที่ถูก:{' '}
                  <span className="font-semibold text-text-primary">
                    {correctAnswer}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Results Screen
  // ============================================
  if (quizState === 'results') {
    const total = questions.length;
    const percentage = total > 0 ? (score / total) * 100 : 0;

    return (
      <div className="min-h-screen px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Score summary card */}
          <div className="glass-card p-8 text-center mb-6 animate-scale-in">
            {/* Circular progress */}
            <div className="mb-6">
              <CircularProgress percentage={percentage} />
            </div>

            {/* Score text */}
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              {score} / {total} ข้อ
            </h2>

            {/* Performance message */}
            <p className="text-xl font-semibold text-primary-600 mb-6">
              {getPerformanceMessage(score, total)}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={restartQuiz}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors cursor-pointer"
              >
                <RotateCcw size={18} />
                ทดสอบอีกครั้ง
              </button>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/70 text-text-secondary rounded-xl font-medium hover:bg-white hover:text-text-primary border border-border transition-colors cursor-pointer"
              >
                <Home size={18} />
                กลับหน้าหลัก
              </button>
            </div>
          </div>

          {/* Wrong answers list */}
          {wrongAnswers.length > 0 && (
            <div className="glass-card p-6 animate-slide-up">
              <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <X size={20} className="text-error" />
                ข้อที่ตอบผิด ({wrongAnswers.length} ข้อ)
              </h3>
              <div className="space-y-3">
                {wrongAnswers.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-error-light/40 border border-error/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                      {/* Prompt */}
                      <span className="font-semibold text-text-primary">
                        {item.prompt}
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-text-muted hidden sm:block"
                      />
                      {/* Correct answer */}
                      <span className="text-success font-medium">
                        ✓ {item.correctAnswer}
                      </span>
                      {/* User's answer */}
                      <span className="text-error font-medium">
                        ✗ {item.userAnswer}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
