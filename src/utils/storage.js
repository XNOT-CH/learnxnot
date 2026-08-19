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
 * เขียนข้อมูลลง localStorage อย่างปลอดภัย
 * (พื้นที่เต็มหรือโหมดส่วนตัวอาจทำให้ setItem โยน error ได้ — ไม่ควรทำให้ทั้งแอปพัง)
 * @param {string} key - คีย์ที่ต้องการเขียน
 * @param {unknown} value - ข้อมูลที่จะเก็บ (จะถูกแปลงเป็น JSON)
 * @returns {boolean} true ถ้าบันทึกสำเร็จ
 */
function writeKey(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`บันทึกข้อมูลลง localStorage ไม่สำเร็จ (${key})`, err);
    return false;
  }
}

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
  return writeKey(VOCAB_KEY, vocab);
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
  return writeKey(STATS_KEY, stats);
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
  return writeKey(CATEGORY_KEY, categories);
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
 * ตรวจสอบและทำความสะอาดข้อมูลสำรองก่อนนำเข้า
 * ทิ้งรายการที่โครงสร้างไม่ถูกต้อง แทนที่จะปล่อยให้ไปพังตอน render
 * @param {Object} data - ข้อมูลที่ parse จากไฟล์ JSON
 * @returns {{ categories: Array, vocabulary: Array, stats: Object, skipped: { categories: number, words: number } }}
 * @throws {Error} ถ้าไฟล์ไม่ถูกต้องจนใช้งานไม่ได้
 */
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('ไฟล์ข้อมูลไม่ถูกต้อง');
  }
  if (!Array.isArray(data.vocabulary) || !Array.isArray(data.categories)) {
    throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (ต้องมี categories และ vocabulary)');
  }

  const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

  // --- หมวดหมู่: ต้องมี id และ name ที่เป็นข้อความ, id ห้ามซ้ำ ---
  const seenCategoryIds = new Set();
  const categories = [];
  for (const cat of data.categories) {
    if (!cat || typeof cat !== 'object') continue;
    if (!isNonEmptyString(cat.id) || !isNonEmptyString(cat.name)) continue;
    if (seenCategoryIds.has(cat.id)) continue;
    seenCategoryIds.add(cat.id);
    categories.push({
      id: cat.id,
      name: cat.name.trim(),
      createdAt: Number.isFinite(cat.createdAt) ? cat.createdAt : Date.now(),
    });
  }

  // --- คำศัพท์: ต้องมี id, english, thai ที่เป็นข้อความ ---
  const seenWordIds = new Set();
  const vocabulary = [];
  for (const word of data.vocabulary) {
    if (!word || typeof word !== 'object') continue;
    if (
      !isNonEmptyString(word.id) ||
      !isNonEmptyString(word.english) ||
      !isNonEmptyString(word.thai)
    ) {
      continue;
    }
    if (seenWordIds.has(word.id)) continue;
    seenWordIds.add(word.id);

    // คำที่อ้างถึงหมวดหมู่ที่ไม่มีอยู่จริง ให้ย้ายไปหมวดเริ่มต้น
    const categoryId = seenCategoryIds.has(word.categoryId)
      ? word.categoryId
      : DEFAULT_CATEGORY_ID;

    vocabulary.push({
      id: word.id,
      english: word.english.trim(),
      thai: word.thai.trim(),
      categoryId,
    });
  }

  // นับจำนวนหมวดที่ถูกข้ามไว้ก่อน (ก่อนจะเติมหมวดเริ่มต้นให้อัตโนมัติ)
  const skippedCategories = data.categories.length - categories.length;

  // ถ้ามีคำที่ต้องย้ายไปหมวดเริ่มต้น แต่ยังไม่มีหมวดนั้น ให้สร้างให้
  const needsDefault = vocabulary.some((w) => w.categoryId === DEFAULT_CATEGORY_ID);
  if (needsDefault && !seenCategoryIds.has(DEFAULT_CATEGORY_ID)) {
    categories.unshift({
      id: DEFAULT_CATEGORY_ID,
      name: 'ทั่วไป',
      createdAt: Date.now(),
    });
    seenCategoryIds.add(DEFAULT_CATEGORY_ID);
  }

  // --- สถิติ: เก็บเฉพาะของคำที่ยังมีอยู่ และเป็นตัวเลขที่ถูกต้อง ---
  const stats = {};
  const rawStats =
    data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)
      ? data.stats
      : {};
  for (const [id, stat] of Object.entries(rawStats)) {
    if (!seenWordIds.has(id) || !stat || typeof stat !== 'object') continue;
    const correct = Number.isFinite(stat.correct) ? Math.max(0, stat.correct) : 0;
    const wrong = Number.isFinite(stat.wrong) ? Math.max(0, stat.wrong) : 0;
    stats[id] = { correct, wrong };
  }

  if (vocabulary.length === 0 && categories.length === 0) {
    throw new Error('ไฟล์นี้ไม่มีข้อมูลที่ใช้งานได้');
  }

  return {
    categories,
    vocabulary,
    stats,
    skipped: {
      categories: skippedCategories,
      words: data.vocabulary.length - vocabulary.length,
    },
  };
}

/**
 * นำเข้าข้อมูลจากไฟล์สำรอง (แทนที่ข้อมูลเดิมทั้งหมด)
 * @param {Object} data - ข้อมูลที่ parse จากไฟล์ JSON
 * @returns {{ categories: Array, vocabulary: Array, stats: Object }} ข้อมูลหลังนำเข้า
 * @throws {Error} ถ้าไฟล์ไม่ถูกต้อง
 */
export function importData(data) {
  const { categories, vocabulary, stats } = validateBackup(data);

  saveCategories(categories);
  saveVocabulary(vocabulary);
  saveStats(stats);

  return { categories, vocabulary, stats };
}
