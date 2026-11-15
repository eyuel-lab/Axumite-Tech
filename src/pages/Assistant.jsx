import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Loader2, Send, Sparkles, AlertCircle, History } from 'lucide-react';
import { formatDateTime } from '@/lib/nasa';

const SUGGESTIONS = [
    'Which sequence best protects my soil carbon, and why?',
    'How does the rainfall record for this field affect my next season?',
    'What should I measure next to make these comparisons more reliable?',
];

export default function Assistant() {
    const [fields, setFields] = useState([]);
    const [fieldId, setFieldId] = useState('all');
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([]);
    const [history, setHistory] = useState([]);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        base44.entities.Field.list({ sort: 'name', limit: 100 }).then((res) => setFields(res.items || []));
        base44.entities.AssistantExchange.list({ sort: '-created_date', limit: 5 }).then((res) => setHistory(res.items || []));
    }, []);

    const ask = async (text) => {
        const prompt = (text ?? question).trim();
        if (!prompt || asking) return;
        setQuestion('');
        setError('');
        const prior = messages;
        setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
        setAsking(true);
        try {
            const res = await base44.functions.invoke('aiAgronomist', {
                question: prompt,
                field_id: fieldId === 'all' ? null : fieldId,
                history: prior.map((m) => ({ role: m.role, content: m.content })),
            });
            const data = res.data || {};
            if (data.error) throw new Error(data.error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.answer, data_used: data.data_used, caveats: data.caveats },
            ]);
            const saved = await base44.entities.AssistantExchange.create({
                field_id: fieldId === 'all' ? null : fieldId,
                question: prompt,
                answer: data.answer,
                data_used: data.data_used || [],
                caveats: data.caveats || [],
            });
            setHistory((prev) => [saved, ...prev].slice(0, 5));
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'The assistant could not answer.');
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setAsking(false);
        }
    };

    return (
        <div>
            <PageHeader
                eyebrow="AI Agronomist"
                title="Ask about your own field records"
                description="Answers are grounded in the fields, soil values, NASA periods, documents and rotation plans stored in this account. If a value is missing, the assistant is instructed to say so rather than invent it."
            />

            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
                <section className="flex flex-col rounded-md border border-border/80 bg-card px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                        <span className="label-eyebrow text-muted-foreground">Scope</span>
                        <Select value={fieldId} onValueChange={setFieldId}>
                            <SelectTrigger className="h-8 w-[220px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All my fields (summary)</SelectItem>
                                {fields.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 space-y-3 py-4">
                        {messages.length === 0 && (
                            <div className="rounded border border-dashed border-border px-4 py-6 text-center">
                                <Bot className="mx-auto h-6 w-6 text-muted-foreground" />
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Ask about rotation choices, soil constraints, water risk or what to measure next.
                                </p>
                                <div className="mt-3 flex flex-col items-center gap-1.5">
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => ask(s)}
                                            className="rounded-full border border-border px-3 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={
                                    message.role === 'user'
                                        ? 'ml-auto max-w-[85%] rounded-md bg-primary px-3 py-2 text-[11px] leading-relaxed text-primary-foreground'
                                        : 'max-w-[92%] rounded-md border border-border/70 bg-muted/40 px-3 py-2'
                                }
                            >
                                {message.role === 'user' ? (
                                    message.content
                                ) : (
                                    <>
                                        <p className="whitespace-pre-line text-[11px] leading-relaxed text-foreground">{message.content}</p>
                                        {(message.data_used || []).length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {message.data_used.map((item) => (
                                                    <span key={item} className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[9px] text-primary">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {(message.caveats || []).length > 0 && (
                                            <ul className="mt-2 space-y-1 border-t border-border/60 pt-1.5">
                                                {message.caveats.map((caveat) => (
                                                    <li key={caveat} className="text-[10px] leading-relaxed text-clay">• {caveat}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                        {asking && (
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading your stored records…
                            </p>
                        )}
                        {error && (
                            <p className="flex items-start gap-1.5 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                            </p>
                        )}
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            ask();
                        }}
                        className="border-t border-border/60 pt-3"
                    >
                        <Textarea
                            rows={2}
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            placeholder="e.g. My pH is 5.9 and I grow teff — will faba bean help next season?"
                            className="text-[11px]"
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[9px] text-muted-foreground">Answers cite the stored data they use and never fill gaps with guesses.</p>
                            <Button type="submit" size="sm" disabled={asking || !question.trim()}>
                                {asking ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />} Ask
                            </Button>
                        </div>
                    </form>
                </section>

                <div className="space-y-4">
                    <section className="rounded-md border border-border/80 bg-card px-4 py-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <h2 className="text-sm text-foreground">Recent questions</h2>
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        {history.length === 0 ? (
                            <p className="py-4 text-[11px] text-muted-foreground">Nothing asked yet.</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-border/60">
                                {history.map((item) => (
                                    <li key={item.id} className="py-2">
                                        <button
                                            type="button"
                                            onClick={() => setMessages([{ role: 'assistant', content: item.answer, data_used: item.data_used, caveats: item.caveats }])}
                                            className="w-full text-left"
                                        >
                                            <p className="text-[11px] text-foreground">{item.question}</p>
                                            <p className="mt-0.5 text-[9px] text-muted-foreground">{formatDateTime(item.created_date)}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="rounded-md border border-dashed border-border bg-card/60 px-4 py-3">
                        <p className="label-eyebrow flex items-center gap-1.5 text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-gold" /> Limits
                        </p>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                            The assistant reads stored records only. It does not fetch new satellite data, cannot see inside uploaded
                            documents, and does not give pesticide dosages. Treat its advice as a starting point for a conversation with your
                            local extension service.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}