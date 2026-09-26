// Dynamic HSC Academic Concept & Topic Detector
// Powered entirely by live Database Chapters without hardcoded bloating
import { normalizeSubject, SUBJECT_DISPLAY_NAMES } from './subject-map.js';
import { getChaptersSync } from '../agent/tools/helpers.js';

export function detectSubjectAndChapterFromQuery(queryText, currentSubjectId = null) {
  if (!queryText || typeof queryText !== 'string') return null;
  const clean = queryText.trim();
  const cleanLower = clean.toLowerCase();

  // 1. Direct explicit subject check
  const directSubj = normalizeSubject(clean);
  const chapters = getChaptersSync();

  if (directSubj) {
    // Check if user explicitly mentioned a chapter within this subject
    const subjectChapters = chapters.filter(c => c.subject_id === directSubj);
    for (const ch of subjectChapters) {
      if (ch.name && clean.includes(ch.name)) {
        return {
          subject_id: directSubj,
          subject_name: SUBJECT_DISPLAY_NAMES[directSubj] || directSubj,
          chapter_num: String(ch.relative_num || ch.order_num),
          chapter_name: ch.name
        };
      }
    }

    // Explicit subject mentioned but NO chapter/topic was mentioned -> strictly null chapter!
    return {
      subject_id: directSubj,
      subject_name: SUBJECT_DISPLAY_NAMES[directSubj] || directSubj,
      chapter_num: null,
      chapter_name: null
    };
  }

  // 2. Dynamic Cross-subject chapter name detection from Database Chapters
  for (const ch of chapters) {
    if (ch.name && ch.name.length >= 3 && clean.includes(ch.name)) {
      return {
        subject_id: ch.subject_id,
        subject_name: SUBJECT_DISPLAY_NAMES[ch.subject_id] || ch.subject_id,
        chapter_num: String(ch.relative_num || ch.order_num),
        chapter_name: ch.name
      };
    }
  }

  return null;
}

/**
 * Post-Response Safety Net: Checks if generated AI content predominantly features formulas/topics
 * of a different subject than currently active.
 */
export function detectSubjectFromAcademicContent(content, currentSubjectId = null) {
  if (!content || typeof content !== 'string') return null;
  const clean = content.toLowerCase();

  // Physics formulas & terminology
  const hasPhysics = /(?:v\s*=\s*s\/t|v\s*=\s*u\s*\+\s*at|f\s*=\s*ma|w\s*=\s*fs|p\s*=\s*vi|ভেক্টর|তাপগতিবিদ্যা|স্থির\s*তড়িৎ|চল\s*তড়িৎ|অর্ধায়ু|নিউটনের|আলোর\s*প্রতিসরণ)/i.test(clean);
  if (hasPhysics && currentSubjectId !== 'hsc_physics') {
    return {
      subject_id: 'hsc_physics',
      subject_name: SUBJECT_DISPLAY_NAMES['hsc_physics'],
      chapter_num: null,
      chapter_name: null
    };
  }

  // Chemistry concepts
  const hasChem = /(?:জৈব\s*যৌগ|পরিবেশ\s*রসায়ন|মৌলের\s*পর্যায়বৃত্ত|অরবিটাল|ইলেকট্রন\s*বিন্যাস|মোল\s*\(?n\)?|অ্যাসিড-ক্ষারক|জারণ-বিজারণ)/i.test(clean);
  if (hasChem && currentSubjectId !== 'hsc_chemistry') {
    return {
      subject_id: 'hsc_chemistry',
      subject_name: SUBJECT_DISPLAY_NAMES['hsc_chemistry'],
      chapter_num: null,
      chapter_name: null
    };
  }

  // Higher Math concepts
  const hasMath = /(?:ম্যাট্রিক্স|নির্ণায়ক|অন্তরীকরণ|যোগজীকরণ|সরলরেখা|কণিক|দ্বিপদী\s*বিস্তৃতি|ত্রিকোণমিতিক\s*অনুপাত)/i.test(clean);
  if (hasMath && currentSubjectId !== 'hsc_math') {
    return {
      subject_id: 'hsc_math',
      subject_name: SUBJECT_DISPLAY_NAMES['hsc_math'],
      chapter_num: null,
      chapter_name: null
    };
  }

  // Biology concepts
  const hasBio = /(?:মাইটোকন্ড্রিয়া|মাইটোসিস|মিয়োসিস|কোষ\s*বিভাজন|জিনতত্ত্ব|ডিএনএ|রক্ত\s*সঞ্চালন|উদ্ভিদ\s*শরীরতত্ত্ব)/i.test(clean);
  if (hasBio && currentSubjectId !== 'hsc_biology') {
    return {
      subject_id: 'hsc_biology',
      subject_name: SUBJECT_DISPLAY_NAMES['hsc_biology'],
      chapter_num: null,
      chapter_name: null
    };
  }

  // ICT concepts
  const hasIct = /(?:লজিক\s*গেট|বাইনারি|হেক্সাডেসিমেল|এইচটিএমএল|html|সি\s*প্রোগ্রামিং|ডেটাবেজ)/i.test(clean);
  if (hasIct && currentSubjectId !== 'hsc_ict') {
    return {
      subject_id: 'hsc_ict',
      subject_name: SUBJECT_DISPLAY_NAMES['hsc_ict'],
      chapter_num: null,
      chapter_name: null
    };
  }

  return null;
}
