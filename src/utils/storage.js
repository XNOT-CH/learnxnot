/* ============================================
   localStorage Utility
   จัดการข้อมูลคำศัพท์และสถิติผ่าน localStorage
   ============================================ */

const VOCAB_KEY = 'learnxnot_vocabulary';
const STATS_KEY = 'learnxnot_stats';
const CATEGORY_KEY = 'learnxnot_categories';

// ID ของหมวดหมู่เริ่มต้น (ใช้เก็บคำศัพท์เก่าที่ยังไม่มีหมวดหมู่)
export const DEFAULT_CATEGORY_ID = 'default';

/**
 * โหลดรายการคำศัพท์ทั้งหมดจาก localStorage
 * @returns {Array} รายการคำศัพท์
 */
export function loadVocabulary() {
  try {
    const data = localStorage.getItem(VOCAB_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * บันทึกรายการคำศัพท์ลง localStorage
 * @param {Array} vocab - รายการคำศัพท์
 */
export function saveVocabulary(vocab) {
  localStorage.setItem(VOCAB_KEY, JSON.stringify(vocab));
}

/**
 * โหลดสถิติการทดสอบจาก localStorage
 * @returns {Object} สถิติแต่ละคำ { [id]: { correct, wrong } }
 */
export function loadStats() {
  try {
    const data = localStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * บันทึกสถิติลง localStorage
 * @param {Object} stats - สถิติทั้งหมด
 */
export function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/**
 * อัพเดทสถิติของคำศัพท์หนึ่งคำ
 * @param {string} id - ID ของคำศัพท์
 * @param {boolean} isCorrect - ตอบถูกหรือไม่
 */
export function updateWordStat(id, isCorrect) {
  const stats = loadStats();
  if (!stats[id]) {
    stats[id] = { correct: 0, wrong: 0 };
  }
  if (isCorrect) {
    stats[id].correct += 1;
  } else {
    stats[id].wrong += 1;
  }
  saveStats(stats);
  return stats;
}

/* ============================================
   Categories - หมวดหมู่คำศัพท์
   ============================================ */

/**
 * โหลดรายการหมวดหมู่ทั้งหมดจาก localStorage
 * @returns {Array} รายการหมวดหมู่ [{ id, name, createdAt }]
 */
export function loadCategories() {
  try {
    const data = localStorage.getItem(CATEGORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * บันทึกรายการหมวดหมู่ลง localStorage
 * @param {Array} categories - รายการหมวดหมู่
 */
export function saveCategories(categories) {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

/**
 * ตรวจสอบและย้ายข้อมูลเก่าให้เข้ากับระบบหมวดหมู่
 * - คำศัพท์ที่ยังไม่มี categoryId จะถูกใส่ไว้ในหมวด "ทั่วไป"
 * - สร้างหมวด "ทั่วไป" ให้อัตโนมัติถ้ายังไม่มีและมีคำศัพท์ที่ต้องย้าย
 * @returns {{ vocabulary: Array, categories: Array }} ข้อมูลหลังย้ายเสร็จ
 */
export function migrateData() {
  const vocabulary = loadVocabulary();
  let categories = loadCategories();

  // หาคำศัพท์ที่ยังไม่ถูกจัดหมวดหมู่
  const orphans = vocabulary.filter((w) => !w.categoryId);
  if (orphans.length === 0) {
    return { vocabulary, categories };
  }

  // มั่นใจว่ามีหมวดหมู่เริ่มต้น "ทั่วไป"
  if (!categories.some((c) => c.id === DEFAULT_CATEGORY_ID)) {
    categories = [
      { id: DEFAULT_CATEGORY_ID, name: 'ทั่วไป', createdAt: Date.now() },
      ...categories,
    ];
    saveCategories(categories);
  }

  // ใส่ categoryId ให้คำศัพท์ที่ยังไม่มี
  const migrated = vocabulary.map((w) =>
    w.categoryId ? w : { ...w, categoryId: DEFAULT_CATEGORY_ID }
  );
  saveVocabulary(migrated);

  return { vocabulary: migrated, categories };
}

/* ============================================
   Backup - สำรอง / นำเข้าข้อมูล
   ============================================ */

/**
 * รวบรวมข้อมูลทั้งหมดเพื่อสำรอง (export เป็นไฟล์ JSON)
 * @returns {Object} ข้อมูลสำรองทั้งหมด
 */
export function exportData() {
  return {
    app: 'learnxnot',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: loadCategories(),
    vocabulary: loadVocabulary(),
    stats: loadStats(),
  };
}

/**
 * นำเข้าข้อมูลจากไฟล์สำรอง (แทนที่ข้อมูลเดิมทั้งหมด)
 * @param {Object} data - ข้อมูลที่ parse จากไฟล์ JSON
 * @returns {{ categories: Array, vocabulary: Array, stats: Object }} ข้อมูลหลังนำเข้า
 * @throws {Error} ถ้าไฟล์ไม่ถูกต้อง
 */
export function importData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('ไฟล์ข้อมูลไม่ถูกต้อง');
  }
  if (!Array.isArray(data.vocabulary) || !Array.isArray(data.categories)) {
    throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (ต้องมี categories และ vocabulary)');
  }

  const categories = data.categories;
  const vocabulary = data.vocabulary;
  const stats =
    data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)
      ? data.stats
      : {};

  saveCategories(categories);
  saveVocabulary(vocabulary);
  saveStats(stats);

  return { categories, vocabulary, stats };
}
