let preferredVoice = null

export function getBestVoice() {
  if (preferredVoice) return preferredVoice
  const voices = window.speechSynthesis.getVoices()
  const preferred = ['Microsoft Zira', 'Microsoft David', 'Google US English', 'Samantha', 'Daniel', 'Karen']
  for (const name of preferred) {
    const found = voices.find(v => v.name.includes(name))
    if (found) { preferredVoice = found; return found }
  }
  const enVoices = voices.filter(v => v.lang.startsWith('en'))
  preferredVoice = enVoices[0] || null
  return preferredVoice
}

export function speakWord(word) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'
  u.rate = 0.9
  u.pitch = 1
  const voice = getBestVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

export function speakSentence(sentence) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(sentence)
  u.lang = 'en-US'
  u.rate = 0.85
  u.pitch = 1
  const voice = getBestVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}
