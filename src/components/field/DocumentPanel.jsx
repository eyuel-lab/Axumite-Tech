import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDelete from '@/components/common/ConfirmDelete';
import { Upload, Loader2, Download, Trash2, FileText, Lock } from 'lucide-react';
import { formatDate } from '@/lib/nasa';

const TYPES = [
    { value: 'soil_test', label: 'Soil test report' },
    { value: 'lab_analysis', label: 'Laboratory analysis' },
    { value: 'land_record', label: 'Land record' },
    { value: 'yield_record', label: 'Yield record' },
    { value: 'photo', label: 'Photo' },
    { value: 'other', label: 'Other' },
];

export default function DocumentPanel({ fieldId, onChanged }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ title: '', doc_type: 'soil_test', document_date: '', notes: '' });
    const [file, setFile] = useState(null);

    const load = useCallback(async () => {
        const res = await base44.entities.FieldDocument.filter({ field_id: fieldId }, { sort: '-created_date', limit: 100 });
        setDocuments(res.items || []);
        setLoading(false);
    }, [fieldId]);

    useEffect(() => {
        load();
    }, [load]);

    const upload = async (event) => {
        event.preventDefault();
        if (!file) {
            setError('Choose a file first.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            await base44.entities.FieldDocument.create({
                field_id: fieldId,
                title: form.title.trim() || file.name,
                doc_type: form.doc_type,
                file_uri,
                file_name: file.name,
                file_size_kb: Math.round(file.size / 1024),
                document_date: form.document_date || null,
                notes: form.notes.trim(),
            });
            setForm({ title: '', doc_type: 'soil_test', document_date: '', notes: '' });
            setFile(null);
            event.target.reset();
            await load();
            onChanged?.();
        } catch (err) {
            setError(err?.message || 'The upload failed.');
        } finally {
            setBusy(false);
        }
    };

    const open = async (document) => {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: document.file_uri });
        window.open(signed_url, '_blank', 'noopener');
    };

    const remove = async (document) => {
        await base44.entities.FieldDocument.delete(document.id);
        await load();
        onChanged?.();
    };

    return (
        <section className="rounded-md border border-border/80 bg-card px-5 py-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-base text-foreground">Documents</h2>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" /> Private
                </span>
            </div>

            {loading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            ) : documents.length === 0 ? (
                <p className="py-4 text-[11px] text-muted-foreground">
                    Nothing uploaded yet. Attach soil test reports, land records or yield records so a decision can be traced back to them.
                </p>
            ) : (
                <ul className="mt-2 divide-y divide-border/60">
                    {documents.map((document) => (
                        <li key={document.id} className="flex items-start justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{document.title}</span>
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    {String(document.doc_type || 'other').replace('_', ' ')}
                                    {document.document_date ? ` · ${formatDate(document.document_date)}` : ''}
                                    {document.file_size_kb ? ` · ${document.file_size_kb} KB` : ''}
                                </p>
                                {document.notes && <p className="mt-0.5 text-[10px] text-muted-foreground">{document.notes}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => open(document)} title="Open">
                                    <Download className="h-3 w-3" />
                                </Button>
                                <ConfirmDelete
                                    title={`Delete ${document.title}?`}
                                    description="The file and its record are removed from this field."
                                    onConfirm={() => remove(document)}
                                    trigger={
                                        <Button size="icon" variant="ghost" className="h-6 w-6">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    }
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <form onSubmit={upload} className="mt-4 space-y-2 border-t border-border/60 pt-3">
                <p className="label-eyebrow text-muted-foreground">Upload a document</p>
                <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx,.txt"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                    className="text-[11px]"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                        <Label className="text-[10px]">Title</Label>
                        <Input
                            className="mt-1 h-8 text-[11px]"
                            value={form.title}
                            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="Holeta lab report"
                        />
                    </div>
                    <div>
                        <Label className="text-[10px]">Type</Label>
                        <Select value={form.doc_type} onValueChange={(value) => setForm((prev) => ({ ...prev, doc_type: value }))}>
                            <SelectTrigger className="mt-1 h-8 text-[11px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-[10px]">Document date</Label>
                        <Input
                            type="date"
                            className="mt-1 h-8 text-[11px]"
                            value={form.document_date}
                            onChange={(event) => setForm((prev) => ({ ...prev, document_date: event.target.value }))}
                        />
                    </div>
                    <div>
                        <Label className="text-[10px]">Note</Label>
                        <Input
                            className="mt-1 h-8 text-[11px]"
                            value={form.notes}
                            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                            placeholder="What it shows"
                        />
                    </div>
                </div>
                {error && <p className="text-[11px] text-destructive">{error}</p>}
                <Button type="submit" size="sm" disabled={busy || !file}>
                    {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                    Upload (stored privately)
                </Button>
            </form>
        </section>
    );
}