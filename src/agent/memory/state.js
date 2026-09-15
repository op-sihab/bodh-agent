// Academic State Snapshot Structure
import { SUBJECT_DISPLAY_NAMES } from "../../config/subject-map.js";

export function createInitialState(overrides = {}) {
  return {
    subject_id: overrides.subject_id || null,
    subject_name: overrides.subject_name || (overrides.subject_id ? SUBJECT_DISPLAY_NAMES[overrides.subject_id] : null),
    chapter_num: overrides.chapter_num || null,
    chapter_name: overrides.chapter_name || null,
    active_topic: overrides.active_topic || null,
    active_mode: overrides.active_mode || "GENERAL",
    active_question: overrides.active_question || null,
    last_served_question: overrides.last_served_question || null,
    quiz_metrics: {
      attempted: overrides.quiz_metrics?.attempted || 0,
      correct: overrides.quiz_metrics?.correct || 0,
      streak: overrides.quiz_metrics?.streak || 0,
      current_difficulty: overrides.quiz_metrics?.current_difficulty || "medium"
    },
    episodic_events: overrides.episodic_events || [],
    student_profile: {
      mastered_topics: overrides.student_profile?.mastered_topics || [],
      stumbling_blocks: overrides.student_profile?.stumbling_blocks || []
    },
    last_updated: Date.now()
  };
}
