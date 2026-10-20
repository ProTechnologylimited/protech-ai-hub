"use client";

import { useState } from "react";
import { TONE_LABELS, TONE_VALUES, optionsFrom, type ToneValue } from "@/lib/constants";
import { useGenerate } from "@/lib/client/useGenerate";
import { formatIssues, replyAssistantInput } from "@/lib/validation";
import { ResultEditor } from "./ResultEditor";
import { Button, Card, ErrorNote, InfoNote, SelectField, TextField } from "./ui";

export function ReplyAssistant() {
  const { run, loading, error, setError, fieldErrors, setFieldErrors, blockedReason } = useGenerate("reply_assistant");
  const [original, setOriginal] = useState("");
  const [response, setResponse] = useState("");
  const [tone, setTone] = useState<ToneValue>("friendly");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const [saved, setSaved] = useState(true);
  const [hasResult, setHasResult] = useState(false);

  async function submit() {
    const parsed = replyAssistantInput.safeParse({ original, response, tone, context });
    if (!parsed.success) {
      setFieldErrors(formatIssues(parsed.error));
      return;
    }
    const res = await run(parsed.data);
    if (res) {
      setOutput(res.output);
      setSaved(res.saved);
      setHasResult(true);
    }
  }

  function clearAll() {
    setOutput("");
    setHasResult(false);
    setOriginal("");
    setResponse("");
    setContext("");
    setError(null);
    setFieldErrors({});
  }

  return (
    <Card>
      <h2 className="text-xl font-extrabold tracking-tight">Reply Assistant</h2>
      <p className="mt-1 text-sm text-muted">
        Paste a public post, say what you want to respond with, and get a draft reply. Nothing is posted for you.
      </p>

      <div className="mt-5 space-y-4">
        <TextField
          label="Original post or discussion"
          value={original}
          onChange={setOriginal}
          rows={5}
          maxLength={1500}
          placeholder="Paste the public post here"
          hint="Only paste public posts. This tool cannot read private messages."
          error={fieldErrors.original}
        />
        <TextField
          label="How do you want to respond?"
          value={response}
          onChange={setResponse}
          rows={3}
          maxLength={500}
          placeholder="Agree, add a data point, ask a follow-up question"
          error={fieldErrors.response}
        />
        <SelectField
          label="Tone"
          value={tone}
          onChange={setTone}
          options={optionsFrom(TONE_VALUES, TONE_LABELS)}
          error={fieldErrors.tone}
        />
        <TextField
          label="Extra context (optional)"
          value={context}
          onChange={setContext}
          rows={2}
          maxLength={500}
          placeholder="Anything the reply should take into account"
          error={fieldErrors.context}
        />
      </div>

      <div className="mt-5 space-y-3">
        {blockedReason ? <InfoNote>{blockedReason}</InfoNote> : null}
        <ErrorNote message={error} />
        <Button variant="primary" className="w-full" onClick={submit} loading={loading} disabled={Boolean(blockedReason)}>
          {loading ? "Drafting your reply" : "Generate reply"}
        </Button>
      </div>

      {hasResult ? (
        <ResultEditor
          label="Your reply draft"
          value={output}
          onChange={setOutput}
          onRegenerate={submit}
          onClear={clearAll}
          busy={loading}
          canRegenerate={!blockedReason}
          saved={saved}
        />
      ) : null}
    </Card>
  );
}
