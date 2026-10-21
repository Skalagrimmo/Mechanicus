/**
 * 16-Bit Systemic Game Engine - Android & Hybrid Stack Guide Modal
 * Explains native Android smartphone build pipeline (Capacitor/TWA/PWA)
 */

import React, { useState } from 'react';
import { X, Smartphone, Download, Terminal, Check, Copy, Layers, Cpu, ShieldCheck } from 'lucide-react';

interface AndroidExportModalProps {
  onClose: () => void;
}

export const AndroidExportModal: React.FC<AndroidExportModalProps> = ({ onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard?.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Встановіть залежності Capacitor для Android',
      cmd: 'npm install @capacitor/core @capacitor/cli @capacitor/android'
    },
    {
      title: '2. Зберіть оптимізований веб-білд',
      cmd: 'npm run build'
    },
    {
      title: '3. Ініціалізуйте нативний Android проект (вже налаштовано в capacitor.config.json)',
      cmd: 'npx cap add android'
    },
    {
      title: '4. Синхронізуйте файли та відкрийте в Android Studio',
      cmd: 'npx cap sync && npx cap open android'
    }
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col max-w-2xl w-full rounded-2xl border-2 border-emerald-600 bg-[#0a1114] p-5 shadow-[0_0_40px_rgba(16,185,129,0.3)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-400" />
            <h2 className="pixel-font text-sm font-bold text-slate-100">
              ГІБРИДНИЙ СТЕК ТА АНДРОЇД НАБІР
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Overview Box */}
        <div className="mt-4 rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3.5 text-xs text-slate-300 leading-relaxed">
          <p className="font-semibold text-emerald-300 mb-1">
            ✓ Повна готовність до нативної генерації APK / AAB для Android смартфонів:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            <li>
              <strong className="text-slate-200">Capacitor Preset:</strong> конфігурація <code className="text-cyan-300">capacitor.config.json</code> вже лежить у корені проекту.
            </li>
            <li>
              <strong className="text-slate-200">PWA Офлайн & Маніфест:</strong> файл <code className="text-cyan-300">manifest.webmanifest</code> та Service Worker (<code className="text-cyan-300">sw.js</code>) активні для миттєвого встановлення з браузера на екран смартфона.
            </li>
            <li>
              <strong className="text-slate-200">Тактильний Консольний Шелл:</strong> віртуальний D-pad, кнопки та апаратна вібрація (<code className="text-cyan-300">navigator.vibrate</code>) підтримуються на всіх пристроях Android.
            </li>
            <li>
              <strong className="text-slate-200">Gamepad API:</strong> автоматичне виявлення Bluetooth геймпадів (Xbox, PlayStation, 8BitDo).
            </li>
          </ul>
        </div>

        {/* Step-by-Step Native APK Guide */}
        <div className="mt-5">
          <h3 className="mono-font text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            Покрокові команди для створення нативного Android APK:
          </h3>
          <div className="space-y-2.5">
            {steps.map((s, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="text-xs font-semibold text-slate-200 mb-1.5">{s.title}</div>
                <div className="flex items-center justify-between rounded bg-black/60 px-3 py-2 mono-font text-[11px] text-cyan-300">
                  <span className="truncate">{s.cmd}</span>
                  <button
                    onClick={() => copyCommand(s.cmd, idx)}
                    className="ml-2 flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Скопійовано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Копіювати</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800/80 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-500 transition-colors"
          >
            Зрозуміло [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
