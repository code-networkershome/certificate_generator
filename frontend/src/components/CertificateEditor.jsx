import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../api';

/**
 * CertificateEditor - Interactive preview editor with drag-drop and click-to-edit
 * 
 * Props:
 * - templateId: string - Selected template ID
 * - templateName: string - Template name for display
 * - certificateData: object - Current certificate data
 * - onDataChange: (data) => void - Callback when data changes
 * - onFinalize: (data, positions, styles) => void - Callback to generate final certificate
 * - onBack: () => void - Go back to form
 */
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

    // Editor state
    const [selectedElement, setSelectedElement] = useState(null);
    const [elementPositions, setElementPositions] = useState({});
    const [elementStyles, setElementStyles] = useState({});
    const [editingText, setEditingText] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [deletedElements, setDeletedElements] = useState([]);
    const [customElements, setCustomElements] = useState([]);
    const [nextCustomId, setNextCustomId] = useState(1);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const iframeRef = useRef(null);
    const containerRef = useRef(null);

    // Fetch preview HTML from backend
    const fetchPreview = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/certificate/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    template_id: templateId,
                    certificate_data: certificateData,
                    element_positions: Object.entries(elementPositions).map(([id, pos]) => ({
                        element_id: id,
                        x: pos.x,
                        y: pos.y
                    })),
                    element_styles: Object.entries(elementStyles).map(([id, style]) => ({
                        element_id: id,
                        ...style
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Failed to load preview');
            }

            const data = await response.json();
            setPreviewHtml(data.html);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [templateId, certificateData, elementPositions, elementStyles]);

    // Initial load
    useEffect(() => {
        fetchPreview();
    }, []);

    // Inject editor scripts into iframe
    useEffect(() => {
        if (!previewHtml || !iframeRef.current) return;

        const iframe = iframeRef.current;
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        // Inject the preview HTML with editor enhancements
        const enhancedHtml = injectEditorCapabilities(previewHtml);
        doc.open();
        doc.write(enhancedHtml);
        doc.close();

        // Add event listeners to iframe content
        setTimeout(() => {
            setupEditorEvents(doc);
        }, 100);
    }, [previewHtml]);

    // Inject CSS and data attributes for editing
    const injectEditorCapabilities = (html) => {
        const editorStyles = `
            <style id="editor-styles">
                * { cursor: pointer !important; }
                [data-editable]:hover {
                    outline: 2px dashed #6366f1 !important;
                    outline-offset: 2px;
                }
                [data-editable].selected {
                    outline: 2px solid #6366f1 !important;
                    outline-offset: 2px;
                }
                [data-editable].dragging {
                    opacity: 0.8;
                    cursor: grabbing !important;
                }
                .edit-input {
                    background: white !important;
                    border: 2px solid #6366f1 !important;
                    padding: 4px 8px !important;
                    font: inherit !important;
                    color: inherit !important;
                    min-width: 100px;
                    outline: none !important;
                }
            </style>
        `;

        // Add data-editable attributes to text elements
        let enhanced = html;

        // Add editor ID to common certificate elements (known fields)
        const editableSelectors = [
            { pattern: /class="recipient"/g, attr: 'data-editable="recipient" data-field="student_name"' },
            { pattern: /class="student-name"/g, attr: 'data-editable="student-name" data-field="student_name"' },
            { pattern: /class="course-name"/g, attr: 'data-editable="course-name" data-field="course_name"' },
            { pattern: /class="title"/g, attr: 'data-editable="title" data-field="certificate_title"' },
            { pattern: /class="subtitle"/g, attr: 'data-editable="subtitle" data-field="certificate_subtitle"' },
            { pattern: /class="description"/g, attr: 'data-editable="description" data-field="description_text"' },
            { pattern: /class="date"/g, attr: 'data-editable="date" data-field="issue_date"' },
            { pattern: /class="value"/g, attr: 'data-editable="value"' },
            { pattern: /class="certify-text"/g, attr: 'data-editable="certify-text"' },
            { pattern: /class="intro"/g, attr: 'data-editable="intro"' },
            { pattern: /class="body-text"/g, attr: 'data-editable="body-text"' },
            { pattern: /class="footer"/g, attr: 'data-editable="footer"' },
            { pattern: /class="signature"/g, attr: 'data-editable="signature"' },
            { pattern: /class="authority"/g, attr: 'data-editable="authority"' },
        ];

        editableSelectors.forEach(({ pattern, attr }) => {
            enhanced = enhanced.replace(pattern, `class="${pattern.source.replace(/class="|\"/g, '')}" ${attr}`);
        });

        // Inject a script to make all text elements editable after DOM loads
        const editorScript = `
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    // Mark all text-containing elements as editable
                    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, td, th, label');
                    let counter = 1;
                    textElements.forEach(function(el) {
                        // Skip if already has data-editable or is a container with many children
                        if (el.hasAttribute('data-editable')) return;
                        if (el.children.length > 3) return;
                        
                        // Only mark elements that have direct text content
                        const hasDirectText = Array.from(el.childNodes).some(
                            node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
                        );
                        
                        if (hasDirectText || (el.children.length === 0 && el.textContent.trim().length > 0)) {
                            el.setAttribute('data-editable', 'element-' + counter++);
                        }
                    });
                });
            </script>
        `;

        // Inject styles and script
        if (enhanced.includes('</head>')) {
            enhanced = enhanced.replace('</head>', `${editorStyles}${editorScript}</head>`);
        } else if (enhanced.includes('</body>')) {
            enhanced = enhanced.replace('</body>', `${editorScript}</body>`);
            enhanced = editorStyles + enhanced;
        } else {
            enhanced = editorStyles + enhanced + editorScript;
        }

        return enhanced;
    };

    // Setup event handlers in iframe
    const setupEditorEvents = (doc) => {
        // First, mark all text-containing elements as editable
        const textElements = doc.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, td, th, label');
        let counter = 1;
        textElements.forEach((el) => {
            // Skip if already has data-editable
            if (el.hasAttribute('data-editable')) return;
            // Skip containers with many children (likely layout elements)
            if (el.children.length > 3) return;
            // Skip if element is too large (likely a container)
            if (el.offsetWidth > 500 && el.offsetHeight > 200) return;

            // Check if element has direct text content
            const hasDirectText = Array.from(el.childNodes).some(
                node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
            );

            // Mark as editable if it has text content
            if (hasDirectText || (el.children.length === 0 && el.textContent.trim().length > 0)) {
                el.setAttribute('data-editable', 'element-' + counter++);
            }
        });

        // Now setup events for all editable elements
        const editables = doc.querySelectorAll('[data-editable]');

        editables.forEach(el => {
            // Click to select
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Remove previous selection
                doc.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
                el.classList.add('selected');

                setSelectedElement({
                    id: el.getAttribute('data-editable'),
                    field: el.getAttribute('data-field'),
                    element: el
                });
            });

            // Double-click to edit text
            el.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const field = el.getAttribute('data-field');
                setEditingText({
                    id: el.getAttribute('data-editable'),
                    field: field,
                    element: el
                });
                setEditingValue(el.textContent);

                // Replace with input
                const input = doc.createElement('input');
                input.type = 'text';
                input.value = el.textContent;
                input.className = 'edit-input';
                input.style.width = Math.max(el.offsetWidth, 100) + 'px';

                const originalContent = el.innerHTML;
                el.innerHTML = '';
                el.appendChild(input);
                input.focus();
                input.select();

                const finishEdit = () => {
                    const newValue = input.value;
                    el.innerHTML = newValue;

                    // Update certificate data if this is a known field
                    if (field && onDataChange) {
                        onDataChange({
                            ...certificateData,
                            [field]: newValue
                        });
                    }
                    setEditingText(null);
                };

                input.addEventListener('blur', finishEdit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') {
                        finishEdit();
                    } else if (ke.key === 'Escape') {
                        el.innerHTML = originalContent;
                        setEditingText(null);
                    }
                });
            });

            // Drag start
            el.addEventListener('mousedown', (e) => {
                if (editingText) return;

                const rect = el.getBoundingClientRect();
                setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
                setIsDragging(true);
                el.classList.add('dragging');

                const handleMouseMove = (moveEvent) => {
                    const iframeRect = iframeRef.current.getBoundingClientRect();
                    const containerRect = doc.body.getBoundingClientRect();

                    const x = moveEvent.clientX - iframeRect.left - dragOffset.x;
                    const y = moveEvent.clientY - iframeRect.top - dragOffset.y;

                    el.style.position = 'absolute';
                    el.style.left = x + 'px';
                    el.style.top = y + 'px';

                    // Store position
                    setElementPositions(prev => ({
                        ...prev,
                        [el.getAttribute('data-editable')]: { x, y }
                    }));
                };

                const handleMouseUp = () => {
                    setIsDragging(false);
                    el.classList.remove('dragging');
                    doc.removeEventListener('mousemove', handleMouseMove);
                    doc.removeEventListener('mouseup', handleMouseUp);
                };

                doc.addEventListener('mousemove', handleMouseMove);
                doc.addEventListener('mouseup', handleMouseUp);
            });
        });
    };

    // Update element style
    const updateStyle = (property, value) => {
        if (!selectedElement) return;

        setElementStyles(prev => ({
            ...prev,
            [selectedElement.id]: {
                ...prev[selectedElement.id],
                [property]: value
            }
        }));

        // Apply immediately to preview
        if (selectedElement.element) {
            selectedElement.element.style[property] = value;
        }
    };

    // Handle finalize
    const handleFinalize = async () => {
        setLoading(true);
        try {
            await onFinalize(
                certificateData,
                Object.entries(elementPositions).map(([id, pos]) => ({
                    element_id: id,
                    x: pos.x,
                    y: pos.y
                })),
                Object.entries(elementStyles).map(([id, style]) => ({
                    element_id: id,
                    ...style
                }))
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Refresh preview with current changes
    const refreshPreview = () => {
        fetchPreview();
    };

    // Delete selected element
    const deleteElement = () => {
        if (!selectedElement) return;

        // Add to deleted list
        setDeletedElements(prev => [...prev, selectedElement.id]);

        // Hide element in preview
        if (selectedElement.element) {
            selectedElement.element.style.display = 'none';
        }

        setSelectedElement(null);
    };

    // Add new text element
    const addTextElement = () => {
        const id = `custom-text-${nextCustomId}`;
        setNextCustomId(prev => prev + 1);

        const newElement = {
            id,
            type: 'text',
            content: 'Double-click to edit',
            x: 100,
            y: 100,
            fontSize: '16pt',
            color: '#000000',
            fontWeight: 'normal'
        };

        setCustomElements(prev => [...prev, newElement]);

        // Add to iframe
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            const div = doc.createElement('div');
            div.setAttribute('data-editable', id);
            div.setAttribute('data-custom', 'true');
            div.style.cssText = `
                position: absolute;
                left: ${newElement.x}px;
                top: ${newElement.y}px;
                font-size: ${newElement.fontSize};
                color: ${newElement.color};
                padding: 4px 8px;
                background: rgba(255,255,255,0.9);
                border: 1px dashed #6366f1;
                cursor: move;
                min-width: 100px;
            `;
            div.textContent = newElement.content;
            doc.body.appendChild(div);

            // Setup events for new element
            setupSingleElementEvents(doc, div);
        }
    };

    // Setup events for a single element
    const setupSingleElementEvents = (doc, el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            doc.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
            el.classList.add('selected');
            setSelectedElement({
                id: el.getAttribute('data-editable'),
                field: el.getAttribute('data-field'),
                element: el,
                isCustom: el.getAttribute('data-custom') === 'true'
            });
        });

        el.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentText = el.textContent;
            const input = doc.createElement('input');
            input.type = 'text';
            input.value = currentText;
            input.className = 'edit-input';
            input.style.width = Math.max(el.offsetWidth, 100) + 'px';
            el.innerHTML = '';
            el.appendChild(input);
            input.focus();
            input.select();

            const finishEdit = () => {
                el.textContent = input.value;
                // Update custom elements state
                setCustomElements(prev => prev.map(ce =>
                    ce.id === el.getAttribute('data-editable')
                        ? { ...ce, content: input.value }
                        : ce
                ));
            };
            input.addEventListener('blur', finishEdit);
            input.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') finishEdit();
            });
        });

        el.addEventListener('mousedown', (e) => {
            const rect = el.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const handleMove = (me) => {
                const iframeRect = iframeRef.current.getBoundingClientRect();
                const x = me.clientX - iframeRect.left - offsetX;
                const y = me.clientY - iframeRect.top - offsetY;
                el.style.left = x + 'px';
                el.style.top = y + 'px';
                setElementPositions(prev => ({
                    ...prev,
                    [el.getAttribute('data-editable')]: { x, y }
                }));
            };

            const handleUp = () => {
                doc.removeEventListener('mousemove', handleMove);
                doc.removeEventListener('mouseup', handleUp);
            };

            doc.addEventListener('mousemove', handleMove);
            doc.addEventListener('mouseup', handleUp);
        });
    };

    return (
        <div className="certificate-editor" ref={containerRef}>
            <div className="editor-header">
                <button className="btn btn-secondary" onClick={onBack}>
                    ← Back to Form
                </button>
                <h2>Edit Certificate: {templateName}</h2>
                <div className="editor-actions">
                    <button className="btn btn-secondary" onClick={refreshPreview}>
                        🔄 Refresh Preview
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleFinalize}
                        disabled={loading}
                    >
                        {loading ? 'Generating...' : '✓ Finalize & Download'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="editor-content">
                {/* Preview Panel */}
                <div className="preview-panel">
                    <div className="preview-instructions">
                        <p>💡 <strong>Click</strong> to select • <strong>Double-click</strong> to edit text • <strong>Drag</strong> to reposition</p>
                    </div>

                    <div className="preview-frame-container">
                        {loading && !previewHtml ? (
                            <div className="preview-loading">
                                <span className="spinner"></span>
                                <p>Loading preview...</p>
                            </div>
                        ) : (
                            <iframe
                                ref={iframeRef}
                                className="preview-frame"
                                title="Certificate Preview"
                                sandbox="allow-same-origin"
                            />
                        )}
                    </div>
                </div>

                {/* Properties Panel */}
                <div className="properties-panel">
                    <h3>Properties</h3>

                    {selectedElement ? (
                        <div className="property-controls">
                            <p className="selected-label">
                                Selected: <strong>{selectedElement.id}</strong>
                            </p>

                            <div className="property-group">
                                <label>Font Size</label>
                                <select
                                    onChange={(e) => updateStyle('fontSize', e.target.value)}
                                    value={elementStyles[selectedElement.id]?.fontSize || ''}
                                >
                                    <option value="">Default</option>
                                    <option value="12pt">12pt</option>
                                    <option value="14pt">14pt</option>
                                    <option value="16pt">16pt</option>
                                    <option value="18pt">18pt</option>
                                    <option value="20pt">20pt</option>
                                    <option value="24pt">24pt</option>
                                    <option value="30pt">30pt</option>
                                    <option value="36pt">36pt</option>
                                    <option value="48pt">48pt</option>
                                </select>
                            </div>

                            <div className="property-group">
                                <label>Color</label>
                                <input
                                    type="color"
                                    onChange={(e) => updateStyle('color', e.target.value)}
                                    value={elementStyles[selectedElement.id]?.color || '#000000'}
                                />
                            </div>

                            <div className="property-group">
                                <label>Font Weight</label>
                                <select
                                    onChange={(e) => updateStyle('fontWeight', e.target.value)}
                                    value={elementStyles[selectedElement.id]?.fontWeight || ''}
                                >
                                    <option value="">Default</option>
                                    <option value="normal">Normal</option>
                                    <option value="bold">Bold</option>
                                    <option value="600">Semi-Bold</option>
                                    <option value="800">Extra Bold</option>
                                </select>
                            </div>

                            <div className="property-group">
                                <label>Text Align</label>
                                <select
                                    onChange={(e) => updateStyle('textAlign', e.target.value)}
                                    value={elementStyles[selectedElement.id]?.textAlign || ''}
                                >
                                    <option value="">Default</option>
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>

                            {elementPositions[selectedElement.id] && (
                                <div className="position-info">
                                    <p>Position: X: {Math.round(elementPositions[selectedElement.id].x)}px, Y: {Math.round(elementPositions[selectedElement.id].y)}px</p>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => {
                                            setElementPositions(prev => {
                                                const updated = { ...prev };
                                                delete updated[selectedElement.id];
                                                return updated;
                                            });
                                            refreshPreview();
                                        }}
                                    >
                                        Reset Position
                                    </button>
                                </div>
                            )}

                            <hr />
                            <button
                                className="btn btn-danger btn-block"
                                onClick={deleteElement}
                            >
                                🗑️ Delete Element
                            </button>
                        </div>
                    ) : (
                        <p className="no-selection">Click an element in the preview to select it</p>
                    )}

                    <hr />

                    <div className="add-elements">
                        <h4>Add Elements</h4>
                        <button
                            className="btn btn-secondary btn-block"
                            onClick={addTextElement}
                        >
                            ➕ Add Text Box
                        </button>
                    </div>

                    <hr />

                    <div className="quick-edit">
                        <h4>Quick Edit Data</h4>
                        <div className="property-group">
                            <label>Student Name</label>
                            <input
                                type="text"
                                value={certificateData.student_name || ''}
                                onChange={(e) => onDataChange({ ...certificateData, student_name: e.target.value })}
                            />
                        </div>
                        <div className="property-group">
                            <label>Course Name</label>
                            <input
                                type="text"
                                value={certificateData.course_name || ''}
                                onChange={(e) => onDataChange({ ...certificateData, course_name: e.target.value })}
                            />
                        </div>
                        <button className="btn btn-sm btn-secondary" onClick={refreshPreview}>
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
