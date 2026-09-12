import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getNFCTags } from "@/services/nfcService";
import type { NFCTag } from "@/types";

export default function NFCTagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<NFCTag[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await getNFCTags();
      setTags(data);
    };

    void load();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('nfcTags.title')}</h1>
        <button className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white">{t('nfcTags.addTag')}</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('nfcTags.code')}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('nfcTags.location')}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('nfcTags.status')}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('nfcTags.lastScanned')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {tags.map((tag) => (
              <tr key={tag.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{tag.code}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{tag.location}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`rounded-full px-2 py-1 text-xs ${tag.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {tag.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{tag.lastScannedAt ? new Date(tag.lastScannedAt).toLocaleString() : t('nfcTags.never')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
