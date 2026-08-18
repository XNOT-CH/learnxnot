/* ============================================
   Quiz Utility
   ฟังก์ชันสำหรับระบบทดสอบคำศัพท์
   ============================================ */

/**
 * สุ่มลำดับ array (Fisher-Yates shuffle)
 * คำที่ตอบผิดบ่อยจะมีโอกาสถูกเลือกมากขึ้น (weighted random)
 * @param {Array} words - รายการคำศัพท์
 * @param {Object} stats - สถิติแต่ละคำ
 * @returns {Array} รายการที่สุ่มแล้ว
 */
export function shuffleWithWeight(words, stats = {}) {
  // สร้าง weighted list: คำที่ผิดบ่อยจะถูกเพิ่มเข้าไปหลายรอบ
  const weighted = [];
  words.forEach((word) => {
    const stat = stats[word.id];
    // คำที่ไม่เคยตอบหรือตอบผิดบ่อย จะมี weight สูง
    const wrongCount = stat ? stat.wrong : 0;
    const correctCount = stat ? stat.correct : 0;
    // คำนวณ weight: ยิ่งผิดมาก weight ยิ่งสูง, ยิ่งถูกมาก weight ยิ่งต่ำ
    const weight = Math.max(1, 1 + wrongCount * 2 - correctCount);
    for (let i = 0; i < weight; i++) {
      weighted.push(word);
    }
  });

  // สุ่มเลือกจาก weighted list โดยไม่ซ้ำ
  const selected = [];
  const usedIds = new Set();

  // Shuffle weighted array
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }

  // เลือกคำที่ไม่ซ้ำ
  for (const word of weighted) {
    if (!usedIds.has(word.id)) {
      usedIds.add(word.id);
      selected.push(word);
    }
  }

  return selected;
}

/**
 * ตรวจสอบคำตอบ - รองรับหลายคำตอบ (คั่นด้วย ,)
 * ไม่สนตัวพิมพ์เล็ก-ใหญ่ และตัดช่องว่างส่วนเกิน
 * @param {string} userAnswer - คำตอบของผู้ใช้
 * @param {string} correctAnswer - คำตอบที่ถูกต้อง (อาจมีหลายคำคั่นด้วย ,)
 * @returns {boolean} ถูกหรือผิด
 */
export function checkAnswer(userAnswer, correctAnswer) {
  const normalizedUser = userAnswer.trim().toLowerCase();
  if (!normalizedUser) return false;

  // แยกคำตอบที่ถูกต้องเป็น array
  const acceptedAnswers = correctAnswer
    .split(',')
    .map((ans) => ans.trim().toLowerCase())
    .filter(Boolean);

  return acceptedAnswers.some((accepted) => accepted === normalizedUser);
}

/**
 * สร้าง unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
