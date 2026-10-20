"use client";

import { useState } from "react";
import {
  LENGTH_LABELS,
  LENGTH_VALUES,
  OBJECTIVE_LABELS,
  OBJECTIVE_VALUES,
  TONE_LABELS,
  TONE_VALUES,
  optionsFrom,
  type LengthValue,
  type ObjectiveValue,
  type ToneValue,
} from "@/lib/constants";
import { useGenerate } from "@/lib/client/useGenerate";
import { castWriterInput, formatIssues } from "@/lib/validation";
import { ResultEditor } from "./ResultEditor";
import { Button, Card, ErrorNote, InfoNote, SelectField, TextField } from "./ui";

export function CastWriter() {
  const { run, loading, error, setError, fieldErrors, setFieldErrors, blockedReason } = useGenerate("cast_writer");
  const [topic, setTopic] = useState("");
  const [objective, setObjective] = useState<ObjectiveValue>("share_update");
  const [tone, setTone] = useState<ToneValue>("conversational");
  const [length, setLength] = useState<LengthValue>("medium");
  const [keywords, setKeywords] = useState("");
  const [output, setOutput] = useState("");
  const [saved, setSaved] = useState(true);
  const [hasResult, setHasResult] = useState(false);

  async function submit() {
    const parsed = castWriterInput.safeParse({ topic, objective, tone, length, keywords });
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
    setTopic("");
    setKeywords("");
    setError(null);
    setFieldErrors({});
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-extrabold tracking-tight">Cast Writer</h2>
        <p className="mt-1 text-sm text-muted">Turn an idea into a Farcaster cast draft.</p>

        <div className="mt-5 space-y-4">
          <TextField
            label="Topic or idea"
            value={topic}
            onChange={setTopic}
            rows={4}
            maxLength={500}
            placeholder="What do you want to say?"
            error={fieldErrors.topic}
          />
          <SelectField
            label="Objective"
            value={objective}
            onChange={setObjective}
            options={optionsFrom(OBJECTIVE_VALUES, OBJECTIVE_LABELS)}
            error={fieldErrors.objective}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Tone"
              value={tone}
              onChange={setTone}
              options={optionsFrom(TONE_VALUES, TONE_LABELS)}
              error={fieldErrors.tone}
            />
            <SelectField
              label="Length"
              value={length}
              onChange={setLength}
              options={optionsFrom(LENGTH_VALUES, LENGTH_LABELS)}
              error={fieldErrors.length}
            />
          </div>
          <TextField
            label="Keywords (optional)"
            value={keywords}
            onChange={setKeywords}
            maxLength={200}
            placeholder="onchain, builders, launch"
            error={fieldErrors.keywords}
          />
        </div>

        <div className="mt-5 space-y-3">
          {blockedReason ? <InfoNote>{blockedReason}</InfoNote> : null}
          <ErrorNote message={error} />
          <Button variant="primary" className="w-full" onClick={submit} loading={loading} disabled={Boolean(blockedReason)}>
            {loading ? "Writing your cast" : "Generate cast"}
          </Button>
        </div>

        {hasResult ? (
          <ResultEditor
            label="Your cast draft"
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
    </div>
  );
}
