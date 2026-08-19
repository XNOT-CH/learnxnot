/* ============================================
   Speech Utility
   ใช้ Web Speech API อ่านคำศัพท์ภาษาอังกฤษ
   ============================================ */

/**
 * ตรวจสอบว่าเบราว์เซอร์รองรับ Speech Synthesis หรือไม่
 */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// แคช voice ภาษาอังกฤษที่เลือกไว้ เพื่อไม่ต้องค้นหาใหม่ทุกครั้ง
let cachedVoice = null;

/**
 * เลือก voice ภาษาอังกฤษที่ดีที่สุดจากรายการที่มี
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {SpeechSynthesisVoice | null}
 */
function pickEnglishVoice(voices) {
  const enVoices = voices.filter((v) => v.lang.replace('_', '-').startsWith('en'));
  if (enVoices.length === 0) return null;

  return (
    enVoices.find((v) => /google/i.test(v.name)) ||
    enVoices.find((v) => /samantha|natural|premium|enhanced/i.test(v.name)) ||
    enVoices.find((v) => v.lang.replace('_', '-').startsWith('en-US')) ||
    enVoices[0]
  );
}

/**
 * คืน voice ภาษาอังกฤษที่แคชไว้ (ถ้ายังไม่มีจะลองค้นหาใหม่)
 *
 * หมายเหตุ: Chrome โหลดรายการ voice แบบ asynchronous — การเรียก getVoices()
 * ครั้งแรกมักได้ array ว่าง จึงต้องอาศัย event 'voiceschanged' ช่วยเติมให้
 * @returns {SpeechSynthesisVoice | null}
 */
function getEnglishVoice() {
  if (cachedVoice) return cachedVoice;
  if (!isSpeechSupported()) return null;

  cachedVoice = pickEnglishVoice(window.speechSynthesis.getVoices());
  return cachedVoice;
}

// อุ่นเครื่องแคชไว้ล่วงหน้า และอัพเดทเมื่อเบราว์เซอร์โหลด voice เสร็จ
if (isSpeechSupported()) {
  getEnglishVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = pickEnglishVoice(window.speechSynthesis.getVoices());
  });
}

/**
 * อ่านออกเสียงคำภาษาอังกฤษ
 * @param {string} text - คำที่ต้องการให้อ่าน
 * @param {number} rate - ความเร็วในการอ่าน (default: 0.9)
 * @returns {boolean} true ถ้าเริ่มอ่านได้
 */
export function speakEnglish(text, rate = 0.9) {
  if (!isSpeechSupported() || !text?.trim()) return false;

  // ยกเลิกการอ่านก่อนหน้า (ถ้ามี)
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1;

  const voice = getEnglishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}
