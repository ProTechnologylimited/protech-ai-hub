"use client";

import { useState } from "react";
import {
  CAMPAIGN_LABELS,
  CAMPAIGN_VALUES,
  TONE_LABELS,
  TONE_VALUES,
  optionsFrom,
  type CampaignValue,
  type ToneValue,
} from "@/lib/constants";
import { useGenerate } from "@/lib/client/useGenerate";
import { formatIssues, projectPromoterInput, type PromoterOutput } from "@/lib/validation";
import { PromoterDraft } from "./PromoterDraft";
import { Button, Card, ErrorNote, InfoNote, SelectField, TextField } from "./ui";

export function ProjectPromoter() {
  const { run, loading, error, setError, fieldErrors, setFieldErrors, blockedReason } = useGenerate("project_promoter");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [offering, setOffering] = useState("");
  const [campaign, setCampaign] = useState<CampaignValue>("awareness");
  const [tone, setTone] = useState<ToneValue>("professional");
  const [draft, setDraft] = useState<PromoterOutput | null>(null);
  const [saved, setSaved] = useState(true);

  async function submit() {
    const parsed = projectPromoterInput.safeParse({ projectName, description, audience, offering, campaign, tone });
    if (!parsed.success) {
      setFieldErrors(formatIssues(parsed.error));
      return;
    }
    const res = await run(parsed.data);
    if (res?.outputData) {
      setDraft(res.outputData);
      setSaved(res.saved);
    }
  }

  function clearAll() {
    setDraft(null);
    setProjectName("");
    setDescription("");
    setAudience("");
    setOffering("");
    setError(null);
    setFieldErrors({});
  }

  return (
    <Card>
      <h2 className="text-xl font-extrabold tracking-tight">Project Promoter</h2>
      <p className="mt-1 text-sm text-muted">
        Draft promotional copy from the facts you provide. Only include claims you can back up.
      </p>

      <div className="mt-5 space-y-4">
        <TextField
          label="Project name"
          value={projectName}
          onChange={setProjectName}
          maxLength={80}
          error={fieldErrors.projectName}
        />
        <TextField
          label="Project description"
          value={description}
          onChange={setDescription}
          rows={4}
          maxLength={800}
          placeholder="What it is and what it does"
          error={fieldErrors.description}
        />
        <TextField
          label="Target audience"
          value={audience}
          onChange={setAudience}
          maxLength={300}
          placeholder="Who is this for?"
          error={fieldErrors.audience}
        />
        <TextField
          label="Main product or service"
          value={offering}
          onChange={setOffering}
          maxLength={300}
          error={fieldErrors.offering}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Campaign objective"
            value={campaign}
            onChange={setCampaign}
            options={optionsFrom(CAMPAIGN_VALUES, CAMPAIGN_LABELS)}
            error={fieldErrors.campaign}
          />
          <SelectField
            label="Tone"
            value={tone}
            onChange={setTone}
            options={optionsFrom(TONE_VALUES, TONE_LABELS)}
            error={fieldErrors.tone}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {blockedReason ? <InfoNote>{blockedReason}</InfoNote> : null}
        <ErrorNote message={error} />
        <Button variant="primary" className="w-full" onClick={submit} loading={loading} disabled={Boolean(blockedReason)}>
          {loading ? "Drafting your campaign" : draft ? "Regenerate draft" : "Generate promotion"}
        </Button>
      </div>

      {draft ? (
        <div className="mt-6 border-t border-line pt-5">
          <PromoterDraft value={draft} onChange={setDraft} />
          <p className="mt-3 text-xs text-muted">
            {saved ? "Saved to your history." : "This result could not be saved to your history."}
          </p>
          <Button variant="ghost" className="mt-2" onClick={clearAll} disabled={loading}>
            Clear
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
