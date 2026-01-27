import { useState, useEffect, useRef, useCallback } from 'react';
import { certificatesAPI } from '../api';

export default function CertificateEditor({
    templateId,
    templateName,
    certificateData,
    onDataChange,
    onFinalize,
    onBack
}) {
    const [previewHtml, setPreviewHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [finalizing, setFinalizing] = useState(false);
    const [selectedElement, setSelectedElement] = useState(null);
    const [elementPositions, setElementPositions] = useState({});
    const [elementStyles, setElementStyles] = useState({});
    const [nextCustomId, setNextCustomId] = useState(1);
    const [scale, setScale] = useState(1);
    const containerRef = useRef(null);

    const iframeRef = useRef(null);

    const fetchPreview = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await certificatesAPI.preview(
                templateId,
                certificateData,
                Object.entries(elementPositions).map(([id, pos]) => ({ element_id: id, x: pos.x, y: pos.y })),
                Object.entries(elementStyles).map(([id, style]) => ({ element_id: id, ...style }))
            );
            setPreviewHtml(data.html);
        } catch (err) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [templateId, certificateData, elementPositions, elementStyles]);

    useEffect(() => { fetchPreview(); }, []);

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            const container = containerRef.current;
            const padding = 32;
            const availableWidth = container.clientWidth - padding;
            const availableHeight = container.clientHeight - padding;
            const certWidth = 1123;
            const certHeight = 794;
            const newScale = Math.min(availableWidth / certWidth, availableHeight / certHeight);
            setScale(Math.max(0.1, Math.min(newScale, 1)));
        };
        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        handleResize();
        return () => resizeObserver.disconnect();
    }, []);

    const setupEditorEvents = (doc) => {
        // Force hide scrollbars in the iframe to prevent layout shifts
        const style = doc.createElement('style');
        style.textContent = 'body { overflow: hidden !important; -ms-overflow-style: none; scrollbar-width: none; } body::-webkit-scrollbar { display: none; }';
        doc.head.appendChild(style);

        const textElements = doc.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, td, th, label');
        let counter = 1;
        textElements.forEach((el) => {
            if (el.hasAttribute('data-editable') || el.children.length > 3) return;
            const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
            if (hasDirectText || (el.children.length === 0 && el.textContent.trim().length > 0)) {
                el.setAttribute('data-editable', 'element-' + counter++);
            }
        });

        doc.querySelectorAll('[data-editable]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                doc.querySelectorAll('.selected').forEach(s => s.classList.remove('selected', 'outline', 'outline-primary-500'));
                el.classList.add('selected', 'outline', 'outline-primary-500');
                setSelectedElement({ id: el.getAttribute('data-editable'), field: el.getAttribute('data-field'), element: el });
            });

            el.addEventListener('dblclick', (e) => {
                e.preventDefault(); e.stopPropagation();
                const field = el.getAttribute('data-field');
                const input = doc.createElement('input');
                input.className = 'bg-white border-2 border-primary-500 px-2 py-1 rounded outline-none shadow-lg';
                input.value = el.textContent;
                const originalContent = el.innerHTML;
                el.innerHTML = ''; el.appendChild(input);
                input.focus();
                input.onblur = () => {
                    const val = input.value; el.innerHTML = val;
                    if (field && onDataChange) onDataChange({ ...certificateData, [field]: val });
                };
            });

            el.addEventListener('mousedown', (e) => {
                const rect = el.getBoundingClientRect();
                const offset = {
                    x: (e.clientX - rect.left) / scale,
                    y: (e.clientY - rect.top) / scale
                };
                const move = (me) => {
                    const iRect = iframeRef.current.getBoundingClientRect();
                    const x = (me.clientX - iRect.left) / scale - offset.x;
                    const y = (me.clientY - iRect.top) / scale - offset.y;
                    el.style.position = 'absolute'; el.style.left = x + 'px'; el.style.top = y + 'px';
                    setElementPositions(p => ({ ...p, [el.getAttribute('data-editable')]: { x, y } }));
                };
                const up = () => { doc.removeEventListener('mousemove', move); doc.removeEventListener('mouseup', up); };
                doc.addEventListener('mousemove', move); doc.addEventListener('mouseup', up);
            });
        });
    };

    useEffect(() => {
        if (!previewHtml || !iframeRef.current) return;
        const doc = iframeRef.current.contentDocument;
        doc.open(); doc.write(previewHtml); doc.close();
        setTimeout(() => setupEditorEvents(doc), 100);
    }, [previewHtml]);

    const updateStyle = (prop, val) => {
        if (!selectedElement) return;
        setElementStyles(p => ({ ...p, [selectedElement.id]: { ...p[selectedElement.id], [prop]: val } }));
        if (selectedElement.element) selectedElement.element.style[prop] = val;
    };

    const handleFinalize = async () => {
        setFinalizing(true);
        setError('');
        try {
            await onFinalize(
                certificateData,
                Object.entries(elementPositions).map(([id, p]) => ({ element_id: id, ...p })),
                Object.entries(elementStyles).map(([id, s]) => ({ element_id: id, ...s }))
            );
        } catch (err) {
            setError(err.message || 'Failed to finalize certificate');
            setFinalizing(false);
        }
    };

    return (
        <div className="fixed inset-0 top-16 z-40 bg-[#f8faff] dark:bg-gray-950 p-6 flex flex-col animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="btn-secondary !py-2 !px-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                    <div>
                        <h2 className="text-xl font-bold dark:text-white leading-tight">{templateName}</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Interactive Editor</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchPreview} disabled={finalizing} className="btn-secondary !py-2 !px-4">Refresh</button>
                    <button
                        onClick={handleFinalize}
                        disabled={finalizing}
                        className="btn-primary !py-2 !px-6 shadow-lg shadow-primary-500/20 flex items-center gap-2"
                    >
                        {finalizing ? <div className="spinner !w-4 !h-4 border-white/30 border-t-white" /> : null}
                        {finalizing ? 'Processing...' : 'Finalize Certificate'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center justify-between gap-3 text-red-600 dark:text-red-400">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            <div className="flex-1 flex gap-6 overflow-hidden items-stretch">
                <div ref={containerRef} className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-700 relative flex items-center justify-center">
                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl"><div className="spinner"></div></div>}
                    <div
                        className="bg-white shadow-2xl origin-center transition-transform duration-200"
                        style={{
                            width: '1123px',
                            height: '794px',
                            transform: `scale(${scale})`,
                            flexShrink: 0
                        }}
                    >
                        <iframe
                            ref={iframeRef}
                            className="w-full h-full border-none pointer-events-auto"
                            title="Preview"
                            sandbox="allow-same-origin allow-scripts"
                        />
                    </div>
                </div>

                <div className="w-80 space-y-6 overflow-y-auto pr-2">
                    <div className="card-premium p-6 space-y-6">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Simulator Mode
                            </div>
                            <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">Server lacks PDF libraries. Success will be simulated with placeholder files.</p>
                        </div>

                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Properties
                        </h3>

                        {selectedElement ? (
                            <div className="space-y-4 animate-fade-in-up">
                                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
                                    <div className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">Editing Element</div>
                                    <div className="text-sm font-bold truncate dark:text-white capitalize">{selectedElement.id.replace('-', ' ')}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Font Size</label>
                                    <select className="input-premium py-1.5" onChange={(e) => updateStyle('fontSize', e.target.value)}>
                                        <option value="">Auto</option>
                                        {['12pt', '16pt', '20pt', '24pt', '32pt', '48pt'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Text Color</label>
                                    <div className="flex gap-2">
                                        <input type="color" className="w-10 h-10 rounded-lg p-1 bg-white border border-gray-200 cursor-pointer" onChange={(e) => updateStyle('color', e.target.value)} />
                                        <input type="text" className="input-premium py-1 flex-1 text-xs" placeholder="#000000" onChange={(e) => updateStyle('color', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Font Weight</label>
                                    <select className="input-premium py-1.5" onChange={(e) => updateStyle('fontWeight', e.target.value)}>
                                        <option value="normal">Normal</option>
                                        <option value="600">Semi Bold</option>
                                        <option value="bold">Bold</option>
                                    </select>
                                </div>
                                <button onClick={() => { selectedElement.element.style.display = 'none'; setSelectedElement(null); }} className="w-full btn-secondary !text-red-500 hover:!bg-red-50 !py-2 border-red-100">Delete Element</button>
                            </div>
                        ) : (
                            <div className="py-12 text-center space-y-3">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
                                </div>
                                <p className="text-xs text-gray-400 px-4">Click any element on the certificate to edit its properties</p>
                            </div>
                        )}
                    </div>

                    <div className="card-premium p-6 space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">Quick Data</h3>
                        <div className="space-y-3">
                            <input type="text" className="input-premium text-xs" placeholder="Student Name" value={certificateData.student_name} onChange={(e) => onDataChange({ ...certificateData, student_name: e.target.value })} />
                            <input type="text" className="input-premium text-xs" placeholder="Course Name" value={certificateData.course_name} onChange={(e) => onDataChange({ ...certificateData, course_name: e.target.value })} />
                            <button onClick={fetchPreview} className="w-full btn-secondary !text-primary-600 !py-2 text-xs">Apply Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
