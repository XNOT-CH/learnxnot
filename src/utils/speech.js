/* ============================================
   Speech Utility
   ใช้ Web Speech API อ่านคำศัพท์ภาษาอังกฤษ
   ============================================ */

/**
 * อ่านออกเสียงคำภาษาอังกฤษ
 * @param {string} text - คำที่ต้องการให้อ่าน
 * @param {number} rate - ความเร็วในการอ่าน (default: 0.9)
 */
export function speakEnglish(text, rate = 0.9) {
  // ยกเลิกการอ่านก่อนหน้า (ถ้ามี)
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1;

  // พยายามเลือก voice ภาษาอังกฤษ
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(
    (v) => v.lang.startsWith('en') && v.name.includes('Google')
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (enVoice) {
    utterance.voice = enVoice;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * ตรวจสอบว่าเบราว์เซอร์รองรับ Speech Synthesis หรือไม่
 */
export function isSpeechSupported() {
  return 'speechSynthesis' in window;
}
