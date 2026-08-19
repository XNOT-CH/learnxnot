/* ============================================
   StatsPage - สถิติและทบทวนคำศัพท์
   Dashboard แสดงผลการเรียนรู้ทั้งหมด
   ============================================ */

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Target,
  Trophy,
  AlertTriangle,
  Volume2,
  RotateCcw,
  BookOpen,
  TrendingUp,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { loadVocabulary, loadStats, saveStats } from '../utils/storage.js';
import { speakEnglish } from '../utils/speech.js';

/* ============================================
   เกณฑ์การจัดกลุ่มคำศัพท์ (ใช้ร่วมกันทั้งหน้า เพื่อให้ตัวเลขทุกจุดตรงกัน)
   ============================================ */
const MASTERY_MIN_ACCURACY = 80; // ความแม่นยำขั้นต่ำที่ถือว่าเชี่ยวชาญ
const MASTERY_MIN_TESTS = 3;     // ต้องทดสอบอย่างน้อยกี่ครั้งจึงนับว่าเชี่ยวชาญ
const REVIEW_MAX_ACCURACY = 50;  // ต่ำกว่านี้ถือว่าควรทบทวน

/** คำที่ทดสอบแล้วและแม่นพอจะถือว่าเชี่ยวชาญ */
const isMastered = (w) =>
  w.tested && w.accuracy >= MASTERY_MIN_ACCURACY && w.total >= MASTERY_MIN_TESTS;

/** คำที่เคยทดสอบแล้วแต่ยังไม่แม่น (คำที่ยังไม่เคยทดสอบไม่นับ — มีกลุ่มของตัวเอง) */
const needsReview = (w) => w.tested && w.accuracy < REVIEW_MAX_ACCURACY;

/** คำที่ยังไม่เคยถูกทดสอบเลย */
const isUntested = (w) => !w.tested;

/* ---- Circular Progress Ring (SVG) ---- */
function CircularProgress({ percentage, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Pick ring color based on accuracy
  const ringColor =
    percentage >= 80
      ? 'var(--color-success)'
      : percentage >= 50
        ? 'var(--color-warning)'
        : 'var(--color-error)';

  return (
    <svg width={size} height={size} className="animate-scale-in">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
      />
      {/* Foreground arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-text-primary font-bold"
        style={{ fontSize: size * 0.22 }}
      >
        {percentage}%
      </text>
    </svg>
  );
}

/* ---- Small Stat Card ---- */
function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  return (
    <div
      className="glass-card p-4 flex flex-col items-center gap-2 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon size={20} />
      </div>
      <span className="text-2xl font-bold text-text-primary">{value}</span>
      <span className="text-xs text-text-muted text-center">{label}</span>
    </div>
  );
}

/* ---- Accuracy Badge ---- */
function AccuracyBadge({ accuracy, tested }) {
  if (!tested) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-text-muted">
        ยังไม่ทดสอบ
      </span>
    );
  }

  const color =
    accuracy >= 80
      ? 'bg-success-light text-success'
      : accuracy >= 50
        ? 'bg-warning-light text-warning'
        : 'bg-error-light text-error';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}
    >
      {accuracy}%
    </span>
  );
}

/* ---- Filter Tab Button ---- */
function FilterTab({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
        active
          ? 'bg-primary-500 text-white shadow-md'
          : 'bg-white/50 text-text-secondary hover:bg-white/80'
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
            active ? 'bg-white/25' : 'bg-primary-100 text-primary-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ============================================
   Main StatsPage Component
   ============================================ */
export default function StatsPage() {
  // Load data from localStorage
  const [vocabulary] = useState(() => loadVocabulary());
  const [stats, setStats] = useState(() => loadStats());

  // UI state
  const [filter, setFilter] = useState('all'); // all | mastered | review | untested
  const [sortField, setSortField] = useState('accuracy'); // accuracy | english | correct | wrong
  const [sortAsc, setSortAsc] = useState(true);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  /* ---- Derived statistics ---- */
  const computedStats = useMemo(() => {
    let totalCorrect = 0;
    let totalWrong = 0;

    const wordDetails = vocabulary.map((word) => {
      const s = stats[word.id] || { correct: 0, wrong: 0 };
      const total = s.correct + s.wrong;
      const accuracy = total > 0 ? Math.round((s.correct / total) * 100) : -1; // -1 = untested

      totalCorrect += s.correct;
      totalWrong += s.wrong;

      return {
        ...word,
        correct: s.correct,
        wrong: s.wrong,
        total,
        accuracy,
        tested: total > 0,
      };
    });

    const totalTests = totalCorrect + totalWrong;
    const overallAccuracy =
      totalTests > 0 ? Math.round((totalCorrect / totalTests) * 100) : 0;

    return {
      totalWords: vocabulary.length,
      totalTests,
      overallAccuracy,
      mastered: wordDetails.filter(isMastered).length,
      toReview: wordDetails.filter(needsReview).length,
      untested: wordDetails.filter(isUntested).length,
      wordDetails,
    };
  }, [vocabulary, stats]);

  /* ---- Words that need review (sorted by accuracy ascending) ---- */
  const wordsToReview = useMemo(() => {
    return computedStats.wordDetails
      .filter(needsReview)
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [computedStats]);

  /* ---- Filtered & sorted word list ---- */
  const filteredWords = useMemo(() => {
    let list = [...computedStats.wordDetails];

    // Apply filter
    switch (filter) {
      case 'mastered':
        list = list.filter(isMastered);
        break;
      case 'review':
        list = list.filter(needsReview);
        break;
      case 'untested':
        list = list.filter(isUntested);
        break;
      default:
        break;
    }

    // Apply sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'english':
          cmp = a.english.localeCompare(b.english);
          break;
        case 'correct':
          cmp = a.correct - b.correct;
          break;
        case 'wrong':
          cmp = a.wrong - b.wrong;
          break;
        case 'accuracy':
        default:
          // Untested (-1) always last regardless of sort direction
          if (a.accuracy === -1 && b.accuracy !== -1) return 1;
          if (b.accuracy === -1 && a.accuracy !== -1) return -1;
          cmp = a.accuracy - b.accuracy;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [computedStats, filter, sortField, sortAsc]);

  /* ---- Filter counts ---- */
  const filterCounts = useMemo(
    () => ({
      all: computedStats.wordDetails.length,
      mastered: computedStats.mastered,
      review: computedStats.toReview,
      untested: computedStats.untested,
    }),
    [computedStats]
  );

  /* ---- Sort handler ---- */
  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortAsc((prev) => !prev);
      } else {
        setSortField(field);
        setSortAsc(true);
      }
    },
    [sortField]
  );

  /* ---- Reset stats ---- */
  const handleResetStats = useCallback(() => {
    saveStats({});
    setStats({});
    setShowConfirmReset(false);
  }, []);

  /* ---- Sort indicator ---- */
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>;
  };

  // ========================== RENDER ==========================
  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* ====== Page Header ====== */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-text-primary flex items-center justify-center gap-2">
            <BarChart3 size={28} className="text-primary-500" />
            สถิติภาพรวม
          </h1>
          <p className="text-sm text-text-muted">ติดตามความก้าวหน้าของคุณ</p>
        </div>

        {/* ====== Overall Stats ====== */}
        <div className="glass-card p-6 animate-slide-up">
          {/* Circular progress + overall accuracy */}
          <div className="flex flex-col items-center mb-6">
            <CircularProgress percentage={computedStats.overallAccuracy} />
            <p className="mt-2 text-sm font-medium text-text-secondary">
              ความแม่นยำโดยรวม
            </p>
          </div>

          {/* Stat cards grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={BookOpen}
              label="คำศัพท์ทั้งหมด"
              value={computedStats.totalWords}
              color="var(--color-primary-500)"
              delay={0}
            />
            <StatCard
              icon={Target}
              label="ทดสอบทั้งหมด"
              value={computedStats.totalTests}
              color="var(--color-primary-600)"
              delay={50}
            />
            <StatCard
              icon={Trophy}
              label="เชี่ยวชาญแล้ว"
              value={computedStats.mastered}
              color="var(--color-success)"
              delay={100}
            />
            <StatCard
              icon={AlertTriangle}
              label="ควรทบทวน"
              value={computedStats.toReview}
              color="var(--color-warning)"
              delay={150}
            />
          </div>
        </div>

        {/* ====== Words to Review ====== */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-bold text-text-primary">
            คำที่ควรทบทวน 📝
          </h2>

          {wordsToReview.length === 0 ? (
            /* Empty state */
            <div className="glass-card p-8 text-center space-y-2">
              <Trophy size={40} className="mx-auto text-success" />
              <p className="font-semibold text-text-primary">ยอดเยี่ยม!</p>
              <p className="text-sm text-text-muted">
                {computedStats.untested > 0
                  ? `ไม่มีคำที่ต้องทบทวน แต่ยังมีอีก ${computedStats.untested} คำที่ยังไม่เคยทดสอบ`
                  : 'ไม่มีคำที่ต้องทบทวนในตอนนี้'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {wordsToReview.slice(0, 10).map((word) => (
                <div
                  key={word.id}
                  className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  {/* Speaker button */}
                  <button
                    onClick={() => speakEnglish(word.english)}
                    className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 hover:bg-primary-200 transition-colors cursor-pointer"
                    aria-label={`อ่านออกเสียง ${word.english}`}
                  >
                    <Volume2 size={16} />
                  </button>

                  {/* Word info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">
                      {word.english}
                    </p>
                    <p className="text-sm text-text-muted truncate">
                      {word.thai}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle size={14} className="text-success" />
                      <span className="text-text-secondary">{word.correct}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <XCircle size={14} className="text-error" />
                      <span className="text-text-secondary">{word.wrong}</span>
                    </div>
                    <AccuracyBadge accuracy={word.accuracy} tested={word.tested} />
                  </div>
                </div>
              ))}

              {wordsToReview.length > 10 && (
                <p className="text-center text-sm text-text-muted pt-1">
                  และอีก {wordsToReview.length - 10} คำ...
                </p>
              )}

              {computedStats.untested > 0 && (
                <p className="text-center text-sm text-text-muted pt-1">
                  ยังมีอีก {computedStats.untested} คำที่ยังไม่เคยทดสอบ
                </p>
              )}
            </div>
          )}
        </div>

        {/* ====== All Words Stats Table ====== */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-500" />
            สถิติรายคำ
          </h2>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter size={16} className="text-text-muted" />
            <FilterTab
              active={filter === 'all'}
              label="ทั้งหมด"
              count={filterCounts.all}
              onClick={() => setFilter('all')}
            />
            <FilterTab
              active={filter === 'mastered'}
              label="เชี่ยวชาญ"
              count={filterCounts.mastered}
              onClick={() => setFilter('mastered')}
            />
            <FilterTab
              active={filter === 'review'}
              label="ควรทบทวน"
              count={filterCounts.review}
              onClick={() => setFilter('review')}
            />
            <FilterTab
              active={filter === 'untested'}
              label="ยังไม่ทดสอบ"
              count={filterCounts.untested}
              onClick={() => setFilter('untested')}
            />
          </div>

          {/* Table */}
          {filteredWords.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-2">
              <BookOpen size={36} className="mx-auto text-text-muted" />
              <p className="text-sm text-text-muted">ไม่มีคำศัพท์ในหมวดนี้</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-primary-50/60 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <button
                  className="col-span-4 text-left cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSort('english')}
                >
                  คำศัพท์ <SortIndicator field="english" />
                </button>
                <span className="col-span-3 hidden sm:block text-left">ความหมาย</span>
                <button
                  className="col-span-2 sm:col-span-1 text-center cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSort('correct')}
                >
                  ถูก <SortIndicator field="correct" />
                </button>
                <button
                  className="col-span-2 sm:col-span-1 text-center cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSort('wrong')}
                >
                  ผิด <SortIndicator field="wrong" />
                </button>
                <button
                  className="col-span-4 sm:col-span-3 text-right cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSort('accuracy')}
                >
                  ความแม่นยำ <SortIndicator field="accuracy" />
                </button>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {filteredWords.map((word) => (
                  <div
                    key={word.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-surface-hover transition-colors text-sm"
                  >
                    {/* English */}
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => speakEnglish(word.english)}
                        className="text-primary-400 hover:text-primary-600 transition-colors flex-shrink-0 cursor-pointer"
                        aria-label={`อ่านออกเสียง ${word.english}`}
                      >
                        <Volume2 size={14} />
                      </button>
                      <span className="font-medium text-text-primary truncate">
                        {word.english}
                      </span>
                    </div>

                    {/* Thai */}
                    <span className="col-span-3 hidden sm:block text-text-secondary truncate">
                      {word.thai}
                    </span>

                    {/* Correct */}
                    <span className="col-span-2 sm:col-span-1 text-center text-success font-medium">
                      {word.correct}
                    </span>

                    {/* Wrong */}
                    <span className="col-span-2 sm:col-span-1 text-center text-error font-medium">
                      {word.wrong}
                    </span>

                    {/* Accuracy */}
                    <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-2">
                      {/* Mini progress bar */}
                      {word.tested && (
                        <div className="hidden sm:block w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${word.accuracy}%`,
                              backgroundColor:
                                word.accuracy >= 80
                                  ? 'var(--color-success)'
                                  : word.accuracy >= 50
                                    ? 'var(--color-warning)'
                                    : 'var(--color-error)',
                            }}
                          />
                        </div>
                      )}
                      <AccuracyBadge accuracy={word.accuracy} tested={word.tested} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ====== Reset Stats ====== */}
        <div className="flex justify-center pt-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-error bg-error-light hover:bg-error/10 transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
              รีเซ็ตสถิติทั้งหมด
            </button>
          ) : (
            <div className="glass-card p-5 text-center space-y-3 animate-scale-in max-w-sm w-full">
              <AlertTriangle size={32} className="mx-auto text-error" />
              <p className="font-semibold text-text-primary">
                ยืนยันการรีเซ็ตสถิติ?
              </p>
              <p className="text-sm text-text-muted">
                สถิติทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-text-secondary hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleResetStats}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-error text-white hover:bg-error/90 transition-colors cursor-pointer"
                >
                  รีเซ็ตเลย
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
