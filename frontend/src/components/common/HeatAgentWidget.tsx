import React, { useState } from 'react';
import { api, AskResponse, ToolCallTrace } from '../../services/api';
import {
  Sparkles,
  Bot,
  Terminal,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  TrendingUp,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const HeatAgentWidget: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);

  const sampleQuestions = [
    'Is it safe for outdoor work in Phoenix, AZ right now?',
    'What is the heat risk in downtown Houston this afternoon?',
    'Find the coolest route in Los Angeles for a noon walk.',
    'ML risk score for Miami Beach tomorrow 2–4pm?',
  ];


  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (qText?: string) => {
    const q = qText || question;
    if (!q.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await api.askAgent(q);
      setResponse(result);
    } catch (err: any) {
      setError(err?.message || 'Backend unavailable — start the FastAPI server with: uvicorn app.main:app --host 127.0.0.1 --port 8000');
    } finally {
      setLoading(false);
    }
  };


  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'Safe':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Decision: Safe
          </span>
        );
      case 'Caution':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold uppercase">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Decision: Caution
          </span>
        );
      case 'Unsafe':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-mono font-bold uppercase">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            Decision: Unsafe
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono font-bold uppercase">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Decision: Unknown
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              HeatIQ Autonomous Decision Agent
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
                FortyGuard API
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Natural-language thermal safety reasoning with autonomous tool dispatch &amp; ML risk classifier.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap gap-1.5">
        {sampleQuestions.map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuestion(q);
              handleAsk(q);
            }}
            className="text-[11px] font-mono px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/40 text-slate-300 rounded transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Ask Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask any heat-safety question (e.g., Is it hot right now in Phoenix?)"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-orange-950 transition-all cursor-pointer"
        >
          {loading ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Ask Agent</span>
        </button>
      </form>

      {/* Error state — shown when backend is unreachable */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl space-y-1 pt-2">
          <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Backend Unavailable</span>
          </div>
          <p className="text-xs text-red-300 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Response Box */}
      {response && (
        <div className="space-y-4 pt-2">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              {getDecisionBadge(response.decision)}
              <span className="text-[10px] font-mono text-slate-400">
                Agent reasoning verified
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {response.reasoning}
            </p>
          </div>

          {/* Tool-Call Trace */}
          {response.trace && response.trace.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold block">
                Agent Tool-Call Execution Trace ({response.trace.length} step{response.trace.length > 1 ? 's' : ''}):
              </span>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {response.trace.map((t: ToolCallTrace) => (
                  <div
                    key={t.step}
                    className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                          Step #{t.step}
                        </span>
                        <span className="font-bold text-orange-400 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5" />
                          {t.tool_name}
                        </span>
                      </div>
                      {t.error ? (
                        <span className="text-[10px] text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-800">
                          Error
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800">
                          Success
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      <span className="text-slate-500">Input:</span> {JSON.stringify(t.tool_input)}
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800/80 overflow-x-auto">
                      <span className="text-slate-500 block mb-0.5">Tool Output:</span>
                      <pre className="text-[10px] text-emerald-300">
                        {JSON.stringify(t.tool_output, null, 2)}
                      </pre>
                    </div>

                    {/* predict_risk explainability — rendered when tool returns top_factors/confidence */}
                    {t.tool_name === 'predict_risk' && t.tool_output && (
                      <div className="mt-1.5 space-y-1.5 border-t border-slate-800 pt-1.5">
                        {t.tool_output.confidence !== undefined && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-500">Confidence:</span>
                            <span className="text-amber-300 font-bold">
                              {(t.tool_output.confidence * 100).toFixed(1)}%
                            </span>
                            {t.tool_output.compares_to_threshold && (
                              <span className="text-slate-400">— {t.tool_output.compares_to_threshold}</span>
                            )}
                          </div>
                        )}
                        {t.tool_output.top_factors && t.tool_output.top_factors.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Top Risk Factors:</span>
                            {t.tool_output.top_factors.map((f: { feature: string; contribution: number }, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-red-500 h-full rounded-full"
                                    style={{ width: `${Math.min(100, f.contribution * 200)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-300 shrink-0 min-w-[120px]">{f.feature}</span>
                                <span className="text-[10px] text-red-400 font-mono">{(f.contribution * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
