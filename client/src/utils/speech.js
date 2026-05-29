let preferredVoice = null
let voicesLoaded = false

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => { voicesLoaded = true }
}

function waitForVoices() {
  if (voicesLoaded) return Promise.resolve()
  return new Promise(resolve => {
    const check = () => { if (voicesLoaded) resolve() }
    window.speechSynthesis.addEventListener('voiceschanged', check, { once: true })
    setTimeout(resolve, 1000)
  })
}

export async function getBestVoice() {
  await waitForVoices()
  if (preferredVoice) return preferredVoice
  const voices = window.speechSynthesis.getVoices()
  const preferred = ['Microsoft Zira', 'Microsoft David', 'Google US English', 'Samantha', 'Daniel', 'Karen', 'Alex', 'Fred']
  for (const name of preferred) {
    const found = voices.find(v => v.name.includes(name))
    if (found) { preferredVoice = found; return found }
  }
  const enVoices = voices.filter(v => v.lang.startsWith('en'))
  preferredVoice = enVoices[0] || null
  return preferredVoice
}

export async function speakWord(word) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'
  u.rate = 0.9
  u.pitch = 1
  const voice = await getBestVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

export async function speakSentence(sentence) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(sentence)
  u.lang = 'en-US'
  u.rate = 0.85
  u.pitch = 1
  const voice = await getBestVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  setInterval(() => {
    window.speechSynthesis.pause()
    window.speechSynthesis.resume()
  }, 10000)
}
