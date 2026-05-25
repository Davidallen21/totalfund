import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  // Ambil data lama kalau ada, kalau kosong pakai data awal (initialValue)
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  // Tiap kali ada perubahan (misal lu nambah aset), otomatis simpan ke memori browser
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Gagal nyimpen data ke memori:", error);
    }
  }, [key, value]);

  return [value, setValue];
}