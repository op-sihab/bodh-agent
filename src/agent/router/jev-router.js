// TypeSafe Jev-1.13 System 1 Pre-Flight Decision Router
import { ENV } from '../../config/env.js';
import { trackGatewayCost } from '../loop/gateway-metrics.js';

const DECISIONS_URL = 'https://api-gateway.merge.dev/v1/decisions';

export async function routeStudentIntentWithJev(userMessage, contextState = {}) {
  const apiKey = process.env.MERGE_API_KEY || ENV.MERGE_API_KEY;
  if (!apiKey) {
    return { fallback: true, reason: 'missing_api_key' };
  }

  const payload = {
    model: 'typesafe/jev-1.13',
    state: `Student message: "${userMessage}". Context subject: ${contextState.subject_name || contextState.subject_id || 'none'}.`,
    questions: {
      action: {
        type: 'choice',
        instructions: 'Determine the primary action requested by the student.',
        criteria: {
          fetch_quiz: 'Student explicitly wants an exam question, MCQ, CQ, math problem, or test exercise to solve.',
          similar_question: 'Student wants an analogous/similar problem to an existing question.',
          explain_concept: 'Student is asking for an academic explanation, formula derivation, or concept theory without asking for a quiz problem.',
          general_chitchat: 'Greetings, casual chat, study motivation, exam tips, or non-academic conversation.'
        }
      },
      subject: {
        type: 'choice',
        instructions: 'Determine the primary HSC academic subject indicated by the concept or context.',
        criteria: {
          physics: 'Physics concepts: motion, force, thermodynamics, electricity, optics, nuclear, waves, gravitation.',
          chemistry: 'Chemistry concepts: organic, inorganic, qualitative, periodic table, reactions, stoichiometry, electrochemistry.',
          math: 'Higher Math concepts: calculus, matrices, vectors, coordinate geometry, trigonometry, functions.',
          biology: 'Biology concepts: cell biology, cytology, genetics, plants/botany, zoology, physiology, human body.',
          ict: 'ICT concepts: logic gates, numbering systems, C programming, HTML, networking.',
          bangla: 'Bangla literature, poems, prose, grammar (shahitto, kobita, goddo, shobdo, byakoron).',
          english: 'English literature, grammar, comprehension, vocabulary, passage analysis.',
          none_general: 'Not specific to an academic subject, or conversational chatter.'
        }
      }
    }
  };

  const t0 = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for System 1

  try {
    const res = await fetch(DECISIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Jev Router] HTTP ${res.status}: ${errText.slice(0, 100)}`);
      return { fallback: true, reason: `http_${res.status}` };
    }

    const data = await res.json();
    const durationMs = Math.round(performance.now() - t0);

    const action = data.answers?.action?.choice || 'general_chitchat';
    const actionConfidence = data.answers?.action?.confidence ?? 0.5;
    const subject = data.answers?.subject?.choice || 'none_general';
    const subjectConfidence = data.answers?.subject?.confidence ?? 0.5;

    // Track telemetry & cost
    if (data.usage?.cost) {
      trackGatewayCost(data.usage.cost, data.usage.input_tokens || 0, data.usage.output_tokens || 0);
    }

    return {
      success: true,
      action,
      actionConfidence,
      subject,
      subjectConfidence,
      durationMs,
      costUsd: data.usage?.cost || 0.00002,
      probabilities: {
        action: data.answers?.action?.probabilities,
        subject: data.answers?.subject?.probabilities
      }
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Jev Router] Fallback triggered (${err.message})`);
    return { fallback: true, reason: err.message };
  }
}
