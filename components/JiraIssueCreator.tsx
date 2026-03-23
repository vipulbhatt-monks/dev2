'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { generateJiraDraftFromSrs, JiraDraftStory, publishJiraStories } from '../services/service';
import { ExternalLink, Loader2 } from 'lucide-react';
import * as pdfjsDist from 'pdfjs-dist';

const { getDocument, GlobalWorkerOptions } = pdfjsDist as any;

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type JiraIssueCreatorProps = {
  initialSrsText?: string;
  onNextStep?: () => void;
};

const JiraIssueCreator: React.FC<JiraIssueCreatorProps> = ({ initialSrsText, onNextStep }) => {
  const [srsText, setSrsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<JiraDraftStory[]>([]);
  const [publishOk, setPublishOk] = useState<boolean>(false);

  const canGenerate = useMemo(
    () => srsText.trim().length > 0 && !isGenerating && !isPublishing,
    [srsText, isGenerating, isPublishing],
  );

  const canPublish = useMemo(
    () => draft.length > 0 && !isGenerating && !isPublishing,
    [draft, isGenerating, isPublishing],
  );

  useEffect(() => {
    if (typeof initialSrsText !== 'string') return;
    if (!initialSrsText.trim()) return;
    if (srsText.trim()) return;
    setSrsText(initialSrsText);
  }, [initialSrsText, srsText]);

  const handleGenerateDraft = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError(null);
    setPublishOk(false);

    try {
      const data = await generateJiraDraftFromSrs(srsText);
      setDraft((data.stories || []).slice(0, 10));
    } catch (e: any) {
      setError(e?.message || 'Failed to generate draft issues');
      setDraft([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!canPublish) return;
    setIsPublishing(true);
    setError(null);
    setPublishOk(false);

    try {
      await publishJiraStories(
        draft
          .slice(0, 10)
          .map((s) => ({ summary: s.summary, description: s.description, issue_type: s.issue_type, labels: s.labels }))
      );
      setPublishOk(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to publish Jira issues');
      setPublishOk(false);
    } finally {
      setIsPublishing(false);
    }
  };

  const extractTextFromPdf = async (file: File) => {
    setIsExtracting(true);
    setError(null);
    setPublishOk(false);

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      const pageTexts: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        const pageText = items.map((it) => (typeof it.str === 'string' ? it.str : '')).join(' ');
        pageTexts.push(pageText);
      }

      const fullText = pageTexts.join('\n\n');
      setSrsText(fullText);
    } catch (e: any) {
      setError(e?.message || 'Failed to extract text from PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddDraft = () => {
    setPublishOk(false);
    setDraft((prev) => {
      if (prev.length >= 10) return prev;
      return [
        ...prev,
        {
          id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          summary: '',
          description: '',
        },
      ];
    });
  };

  const handleDeleteDraft = (id: string) => {
    setPublishOk(false);
    setDraft((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateDraft = (id: string, patch: Partial<Pick<JiraDraftStory, 'summary' | 'description'>>) => {
    setPublishOk(false);
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <div className="flex-1 bg-[#fafafa] p-6 overflow-y-auto relative">
      <div className="w-full flex flex-col items-center p-8 bg-[#fbfbfd]/50 backdrop-blur-sm">
        <div className="max-w-3xl w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Create Jira Issues from SRS</h2>
            <p className="text-sm font-medium text-zinc-500 leading-relaxed mt-1">
              Paste or upload your SRS. First generate a draft (Gemini), edit it, then publish to Jira.
            </p>
          </div>

          <textarea
            value={srsText}
            onChange={(e) => setSrsText(e.target.value)}
            rows={10}
            placeholder="Paste SRS here..."
            className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all resize-none"
          />

          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-zinc-700">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) extractTextFromPdf(file);
                }}
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 cursor-pointer transition-colors">
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting PDF...
                  </>
                ) : (
                  'Upload SRS PDF'
                )}
              </span>
            </label>
            <div className="text-xs text-zinc-400 font-medium">
              PDF text will be extracted locally in your browser.
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-400 font-medium">
              {srsText.trim().length === 0 ? 'Provide SRS text to generate a draft.' : `${srsText.trim().length} characters`}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateDraft}
                disabled={!canGenerate || isExtracting}
                className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-semibold hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Draft'
                )}
              </button>

              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-zinc-200 text-zinc-900 rounded-2xl text-sm font-semibold hover:bg-zinc-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Create in Jira'
                )}
              </button>
            </div>
          </div>

          {error && (
           <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
              {error}
            </div>
          )}

          {draft.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-900">Draft Issues (max 10)</div>
                  <button
                    onClick={handleAddDraft}
                    disabled={draft.length >= 10}
                    className="px-4 py-2 rounded-2xl bg-white border border-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add Issue
                  </button>
                </div>

                <div className="mt-3 space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {draft.map((story, idx) => (
                    <div key={story.id} className="p-3 rounded-2xl bg-white border border-zinc-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-zinc-500 font-medium">Issue #{idx + 1}</div>
                        <button
                          onClick={() => handleDeleteDraft(story.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>

                      <input
                        value={story.summary}
                        onChange={(e) => handleUpdateDraft(story.id, { summary: e.target.value })}
                        placeholder="Summary"
                        className="mt-2 w-full bg-white border border-zinc-200 rounded-2xl px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all"
                      />

                      <textarea
                        value={story.description}
                        onChange={(e) => handleUpdateDraft(story.id, { description: e.target.value })}
                        placeholder="Description"
                        rows={4}
                        className="mt-2 w-full bg-white border border-zinc-200 rounded-2xl px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {publishOk && (
                <div className="p-4 rounded-2xl bg-green-50 border border-green-100 text-green-800 text-sm flex items-center justify-between gap-3">
                  <div>Issues created successfully in Jira.</div>
                  {typeof onNextStep === 'function' && (
                    <button
                      onClick={onNextStep}
                      className="px-4 py-2 rounded-2xl bg-white border border-green-200 text-green-900 text-sm font-semibold hover:bg-green-50 transition-all shadow-sm"
                    >
                      Proceed to Design
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Jira issue creation happens on the backend using configured Jira credentials.
          </div>
        </div>
      </div>
    </div>
  );
};

export default JiraIssueCreator;
