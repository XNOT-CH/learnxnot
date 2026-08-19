/* ============================================
   ErrorBoundary
   ดักข้อผิดพลาดที่หลุดออกมาจาก React tree
   เพื่อไม่ให้ผู้ใช้เจอหน้าจอว่างเปล่าโดยไม่รู้สาเหตุ
   ============================================ */

import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('เกิดข้อผิดพลาดที่ไม่ได้ดักไว้:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="glass-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-error-light text-error">
            <AlertTriangle size={28} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-text-primary">
            เกิดข้อผิดพลาดบางอย่าง
          </h1>
          <p className="mb-6 text-sm text-text-secondary">
            ข้อมูลคำศัพท์ของคุณยังถูกเก็บไว้ในเครื่องตามปกติ
            ลองโหลดหน้าใหม่อีกครั้ง
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-600"
          >
            <RotateCcw size={18} />
            โหลดหน้าใหม่
          </button>

          {/* รายละเอียดสำหรับผู้ใช้ที่อยากรู้สาเหตุ */}
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-xs text-text-muted">
              รายละเอียดข้อผิดพลาด
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface-alt p-3 text-xs whitespace-pre-wrap text-text-secondary">
              {String(error?.stack || error?.message || error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
