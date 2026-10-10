import React from 'react';

export default function PaymentStatusPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payment Status</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Payments & Transactions / Payment Status</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">Payment Status management page (placeholder)</p>
      </div>
    </div>
  );
}
