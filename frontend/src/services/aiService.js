// src/services/aiService.js
// Shared AI Service - dipakai oleh AI Consultant Sidebar DAN NetWorth Detail Page

const API_BASE = process.env.REACT_APP_API_URL ?? '';

// Timeout helper
const fetchWithTimeout = (url, options, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

/**
 * @param {string} message   - Prompt utama ke AI
 * @param {string} context   - Data konteks portofolio (string)
 * @param {Array}  history   - Chat history (default [])
 * @returns {Promise<{ response: string }>}
 */
export const callAiService = async (message, context, history = []) => {
  console.log('🚀 [AI SERVICE] Endpoint:', `${API_BASE}/api/ai-chat`);
  console.log('📦 [AI SERVICE] Context:', context?.slice(0, 120), '...');

  const response = await fetchWithTimeout(
    `${API_BASE}/api/ai-chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, history }),
    },
    20000 // 20 detik timeout
  );

  if (!response.ok) {
    // Coba baca error body dari server kalau ada
    let serverMsg = '';
    try { serverMsg = (await response.json()).detail || ''; } catch (_) {}
    throw new Error(serverMsg || `AI Service Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Guard: pastikan response punya field yang diharapkan
  if (!data || typeof data.response !== 'string') {
    throw new Error('Format respons AI tidak valid (field "response" tidak ditemukan).');
  }

  return data; // { response: string, ... }
};

/**
 * Helper: Parse raw AI response jadi array poin bersih.
 * Dipakai di NetWorthDetailPage biar logika parsing tidak duplikat.
 * @param {string} rawText
 * @returns {string[]}
 */
export const parseAiPoints = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').replace(/\*\*/g, '').trim())
    .filter((line) => line.length > 5);

  return lines.length > 0 ? lines : [rawText.replace(/\*\*/g, '').trim()];
};