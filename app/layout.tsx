import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Threadlab — Parallel processing, made visible', description: 'A real multithreaded sensor-data processing lab. Measure, compare and understand parallel execution.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
