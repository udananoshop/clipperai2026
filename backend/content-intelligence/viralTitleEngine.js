/**
 * Viral Title Engine
 * Generate CTR-optimized titles
 */

const CURIOSITY_TEMPLATES = [
  '{topic} Yang Tidak Pernah Kamu Ketahui',
  'Rahasia {topic} Yang Jarang Orang Tahu',
  'Kenapa {topic} Ini Viral?',
  'Hal Mengejutkan Tentang {topic}',
  '{topic} Yang Bikin Kaget'
];

const MISTAKE_TEMPLATES = [
  'Kesalahan Fatal Saat {topic}',
  'Salah Kaprah Tentang {topic}',
  'Ini Kesalahan Terbesar Saat {topic}',
  'Jangan Lakukan Ini Saat {topic}',
  'Kesalahan Umum {topic} Yang Harus Dihindari'
];

const SECRET_TEMPLATES = [
  'Rahasia {topic} Terbongkar',
  'Rahasia Sukses {topic} Yang Jarang Orang Tahu',
  'Ini Rahasia {topic} Dari Ahlinya',
  '5 Rahasia {topic} Yang Tidak Dipertiunkukan',
  'Rahasia Dibalik {topic}'
];

const SHOCK_TEMPLATES = [
  '{topic} Bikin Geger Semua Orang!',
  'Waspada! {topic} Yang Membuat Kaget',
  'Gila! {topic} Ini Bikin Heboh',
  'Tak Terduga! {topic} Yang Ini Bikin Salfok',
  'Shock! {topic} Yang Viral'
];

const BENEFIT_TEMPLATES = [
  '{topic} Agar Cepat Sukses',
  'Cara {topic} Dengan Hasil Maksimal',
  'Tips {topic} Yang Terbukti Manjur',
  'Trik {topic} Yang Ampuh',
  'Strategi {topic} Agar Berhasil'
];

function capitalize(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function selectRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCuriosityTitle(topic = '') {
  if (!topic) return '';
  const template = selectRandom(CURIOSITY_TEMPLATES);
  return template.replace('{topic}', capitalize(topic));
}

function generateMistakeTitle(topic = '') {
  if (!topic) return '';
  const template = selectRandom(MISTAKE_TEMPLATES);
  return template.replace('{topic}', capitalize(topic));
}

function generateSecretTitle(topic = '') {
  if (!topic) return '';
  const template = selectRandom(SECRET_TEMPLATES);
  return template.replace('{topic}', capitalize(topic));
}

function generateShockTitle(topic = '') {
  if (!topic) return '';
  const template = selectRandom(SHOCK_TEMPLATES);
  return template.replace('{topic}', capitalize(topic));
}

function generateDirectBenefitTitle(topic = '') {
  if (!topic) return '';
  const template = selectRandom(BENEFIT_TEMPLATES);
  return template.replace('{topic}', capitalize(topic));
}

function generateTitlePack(topic = '') {
  return {
    curiosity: generateCuriosityTitle(topic),
    mistake: generateMistakeTitle(topic),
    secret: generateSecretTitle(topic),
    shock: generateShockTitle(topic),
    benefit: generateDirectBenefitTitle(topic)
  };
}

module.exports = {
  generateCuriosityTitle,
  generateMistakeTitle,
  generateSecretTitle,
  generateShockTitle,
  generateDirectBenefitTitle,
  generateTitlePack,
  CURIOSITY_TEMPLATES,
  MISTAKE_TEMPLATES,
  SECRET_TEMPLATES,
  SHOCK_TEMPLATES,
  BENEFIT_TEMPLATES
};
