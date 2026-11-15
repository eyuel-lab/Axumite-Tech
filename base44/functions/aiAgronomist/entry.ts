import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_QUESTION = 1200;
const MAX_HISTORY = 6;
const MAX_FIELDS = 5;

const trim = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const question = trim(body?.question, MAX_QUESTION);
        if (!question) return Response.json({ error: 'A question is required.' }, { status: 400 });

        const fieldId = typeof body?.field_id === 'string' && body.field_id ? body.field_id : null;
        const planId = typeof body?.plan_id === 'string' && body.plan_id ? body.plan_id : null;

        const history = Array.isArray(body?.history)
            ? body.history
                .slice(-MAX_HISTORY)
                .map((m) => ({
                    role: m?.role === 'assistant' ? 'assistant' : 'user',
                    content: trim(m?.content, 800),
                }))
                .filter((m) => m.content)
            : [];

        let field = null;
        if (fieldId) {
            field = await base44.entities.Field.get(fieldId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
            if (!field) return Response.json({ error: 'Field not found' }, { status: 404 });
            if (field.created_by_id !== user.id && user.role !== 'admin') {
                return Response.json({ error: 'Not authorised for this field' }, { status: 403 });
            }
        }

        const used = [];
        const context = [];

        if (field) {
            context.push(
                `FIELD: ${field.name}; area ${field.area_hectares ?? 'not recorded'} ha (${field.area_source || 'source not recorded'}); centre ${field.latitude ?? '?'}, ${field.longitude ?? '?'}; location ${[field.admin_area, field.country].filter(Boolean).join(', ') || 'not recorded'}; irrigation ${field.irrigation || 'not recorded'}; current crop ${field.current_crop || 'not recorded'}; practices ${(field.practices || []).join(', ') || 'not recorded'}.`
            );
            used.push(`Field record: ${field.name}`);

            const soilRes = await base44.entities.SoilMeasurement.filter({ field_id: field.id }, { sort: '-created_date', limit: 40 });
            const soil = soilRes.items || [];
            if (soil.length) {
                context.push(
                    `SOIL MEASUREMENTS (${soil.length} stored, each with how it was obtained):\n` +
                    soil
                        .map(
                            (m) =>
                                `- ${m.parameter}: ${m.text_value || `${m.value} ${m.unit || ''}`.trim()} [${m.provenance}; ${m.method_source || 'method not recorded'}; ${m.sample_date || 'date not recorded'}]`
                        )
                        .join('\n')
                );
                used.push(`${soil.length} soil values`);
            } else {
                context.push('SOIL MEASUREMENTS: none stored for this field.');
            }

            const logRes = await base44.entities.NasaFetchLog.filter(
                { field_id: field.id, dataset_key: 'nasa_power' },
                { sort: '-retrieved_at', limit: 1 }
            );
            const log = (logRes.items || [])[0];
            if (log?.summary) {
                context.push(
                    `NASA POWER SUMMARY (retrieved ${log.retrieved_at}, period ${log.summary.period_start} to ${log.summary.period_end}; satellite/reanalysis at grid scale, historical not forecast): ${JSON.stringify(log.summary)}`
                );
                used.push(`NASA POWER ${log.summary.period_start} → ${log.summary.period_end}`);
            } else {
                context.push('NASA OBSERVATIONS: none retrieved for this field.');
            }

            const docsRes = await base44.entities.FieldDocument.filter({ field_id: field.id }, { sort: '-created_date', limit: 20 });
            const docs = docsRes.items || [];
            if (docs.length) {
                context.push(
                    `DOCUMENTS ON FILE (titles only; contents are not readable here): ${docs.map((d) => `${d.title} (${d.doc_type || 'other'}, ${d.document_date || 'date not recorded'})`).join('; ')}`
                );
                used.push(`${docs.length} document titles`);
            }

            const plansRes = await base44.entities.RotationPlan.filter({ field_id: field.id }, { sort: '-created_date', limit: 3 });
            const plans = plansRes.items || [];
            for (const plan of plans) {
                if (planId && plan.id !== planId) continue;
                const seqRes = await base44.entities.RotationSequence.filter({ plan_id: plan.id }, { sort: 'sort_order', limit: 10 });
                const sequences = seqRes.items || [];
                context.push(
                    `ROTATION PLAN "${plan.name}" (status ${plan.status || 'draft'}):\n` +
                    sequences
                        .map(
                            (s) =>
                                `- ${s.name}: ${(s.entries || [])
                                    .map((e) => `${e.season_label || 'season'} ${e.season_year || ''} ${e.crop_name || 'unassigned'}`.trim())
                                    .join(' → ') || 'no seasons yet'}`
                        )
                        .join('\n') +
                    (plan.result ? `\nStored evaluation (engine ${plan.engine_version}, evaluated ${plan.evaluated_at}): ${JSON.stringify(plan.result).slice(0, 3000)}` : '\nNo stored evaluation.')
                );
                used.push(`Rotation plan: ${plan.name}`);
            }
        } else {
            const fieldsRes = await base44.entities.Field.list({ sort: 'name', limit: MAX_FIELDS });
            const fields = fieldsRes.items || [];
            if (fields.length) {
                context.push(
                    `FIELDS IN THIS ACCOUNT (summary only):\n` +
                    fields
                        .map(
                            (f) =>
                                `- ${f.name}: ${f.area_hectares ?? 'area not recorded'} ha; irrigation ${f.irrigation || 'not recorded'}; current crop ${f.current_crop || 'not recorded'}`
                        )
                        .join('\n')
                );
                used.push(`${fields.length} field summaries`);
            }
        }

        const systemPrompt = `You are the agronomy assistant inside Axumite Tech, a field decision-support tool. You answer using ONLY the stored records supplied below.

Rules:
- Never invent measurements, coordinates, soil values, climate figures or scores. If a value is absent, say it is not recorded.
- Respect provenance: laboratory values, farmer-reported values, satellite/regional values and model-derived indices are different things and must be described as such.
- Cite which stored data you used in plain words (for example "your pH 5.9 laboratory value" or "the NASA POWER period 11 Nov 2025–11 Nov 2026").
- Rotation indices are relative comparisons, not predictions of yield or soil carbon. Say so when you mention them.
- Do not give pesticide product names, dosages or chemical application rates; recommend a local extension service or agronomist for those.
- Answer in at most 220 words, in short paragraphs or bullets. Be practical about crop rotation, soil health, water and climate risk.
- If the stored data cannot answer the question, say what is missing and what the farmer should record next.

STORED RECORDS FOR THIS QUESTION:
${context.length ? context.join('\n\n') : 'No records available for this account yet.'}`;

        const historyBlock = history.length
            ? `\n\nRECENT CONVERSATION (context only — the stored records above are authoritative):\n${history
                .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
                .join('\n')}`
            : '';

        const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}${historyBlock}\n\nFARMER QUESTION: ${question}`,
            response_json_schema: {
                type: 'object',
                properties: {
                    answer: { type: 'string' },
                    data_used: { type: 'array', items: { type: 'string' } },
                    caveats: { type: 'array', items: { type: 'string' } },
                },
                required: ['answer', 'data_used', 'caveats'],
            },
        });

        const parsed = typeof llm === 'string' ? { answer: llm, data_used: [], caveats: [] } : llm || {};

        return Response.json({
            answer: typeof parsed.answer === 'string' ? parsed.answer : 'No answer was returned.',
            data_used: Array.isArray(parsed.data_used) ? parsed.data_used.slice(0, 8) : [],
            caveats: Array.isArray(parsed.caveats) ? parsed.caveats.slice(0, 6) : [],
            records_available: used,
            engine_context: { history_used: history.length },
        });
    } catch (error) {
        return Response.json({ error: error?.message || 'The assistant could not answer.' }, { status: 500 });
    }
}