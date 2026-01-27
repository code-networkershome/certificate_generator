import React, { useState, useEffect } from 'react';
import { templatesAPI, certificatesAPI, uploadsAPI, API_URL } from '../api';
import CertificateEditor from '../components/CertificateEditor';

const GeneratePage = ({ user }) => {
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [inputMode, setInputMode] = useState('form'); // 'form' or 'json'
    const [jsonInput, setJsonInput] = useState(`{
  "student_name": "John Doe",
  "course_name": "AWS Cloud Practitioner",
  "issue_date": "${new Date().toISOString().split('T')[0]}",
  "certificate_id": "",
  "issuing_authority": "NetworkersHome"
}`);
    const [jsonError, setJsonError] = useState('');
    const [formData, setFormData] = useState({
        student_name: '',
        course_name: '',
        issue_date: new Date().toISOString().split('T')[0],
        issuing_authority: 'NetworkersHome',
        signature_name: 'Director',
        signature_image_url: '',
        logo_url: '',
        certificate_title: 'Certificate of Completion',
        certificate_subtitle: 'Professional Development',
        description_text: 'has successfully completed all requirements for',
        custom_body: ''
    });
    const [outputFormats, setOutputFormats] = useState(['pdf']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [uploading, setUploading] = useState({ logo: false, signature: false });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await templatesAPI.list();
            setTemplates(response.templates);
        } catch (err) {
            setTemplates([
                { id: 'default', name: 'Professional Blue', description: 'Classic professional certificate' },
            ]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormatToggle = (format) => {
        setOutputFormats(prev => prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]);
    };

    const handleFileUpload = async (e, fieldName, uploadType) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(prev => ({ ...prev, [uploadType]: true }));
        setError('');
        try {
            const result = await uploadsAPI.uploadImage(file);
            const fullUrl = result.url.startsWith('http') ? result.url : `${API_URL}${result.url}`;
            setFormData(prev => ({ ...prev, [fieldName]: fullUrl }));
        } catch (err) {
            setError(`Failed to upload ${uploadType}: ${err.message}`);
        } finally {
            setUploading(prev => ({ ...prev, [uploadType]: false }));
        }
    };

    const handlePreviewEdit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setJsonError('');
        let dataToSubmit = formData;
        if (inputMode === 'json') {
            try {
                const parsed = JSON.parse(jsonInput);
                const required = ['student_name', 'course_name', 'issue_date', 'issuing_authority'];
                const missing = required.filter(f => !parsed[f]);
                if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`);
                dataToSubmit = parsed;
                setFormData(parsed);
            } catch (err) {
                setJsonError(err.message);
                return;
            }
        }
        const template = templates.find(t => t.id === selectedTemplate);
        setSelectedTemplateName(template?.name || 'Certificate');
        setShowEditor(true);
    };

    const handleEditorFinalize = async (data, positions, styles) => {
        setLoading(true);
        setError('');
        try {
            const response = await certificatesAPI.finalize(selectedTemplate, data, positions, styles, outputFormats);
            setResult(response);
            setShowEditor(false);
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        let dataToSubmit = formData;
        if (inputMode === 'json') {
            try {
                dataToSubmit = JSON.parse(jsonInput);
            } catch (err) {
                setJsonError(err.message);
                setLoading(false);
                return;
            }
        }
        try {
            const response = await certificatesAPI.generate(selectedTemplate, dataToSubmit, outputFormats);
            setResult(response);
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateCertificateId = () => {
        const prefix = 'Cert';
        const random = Math.floor(100000 + Math.random() * 900000);
        setFormData(prev => ({ ...prev, certificate_id: `${prefix}-${random}` }));
    };

    if (showEditor) {
        return (
            <CertificateEditor
                templateId={selectedTemplate}
                templateName={selectedTemplateName}
                certificateData={formData}
                onDataChange={setFormData}
                onFinalize={handleEditorFinalize}
                onBack={() => setShowEditor(false)}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up">
            {/* Stepper */}
            <div className="flex items-center justify-center mb-12">
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= s ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                                {step > s ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : s}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${step >= s ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
                                {s === 1 ? 'Template' : s === 2 ? 'Details' : 'Download'}
                            </span>
                        </div>
                        {s < 3 && <div className={`w-20 h-0.5 mx-4 transition-colors duration-300 ${step > s ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-800'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-3 text-red-600 dark:text-red-400">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}

            {step === 1 && (
                <div className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold dark:text-white">Select a Template</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Choose the perfect design for your certificate</p>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {templates.map(tmp => (
                                <div
                                    key={tmp.id}
                                    onClick={() => setSelectedTemplate(tmp.id)}
                                    className={`group cursor-pointer card-premium overflow-hidden border-2 transition-all ${selectedTemplate === tmp.id ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
                                >
                                    <div className="aspect-[1.414/1] bg-gray-100 dark:bg-gray-900 relative">
                                        {tmp.thumbnail_url ? (
                                            <img src={tmp.thumbnail_url.startsWith('http') ? tmp.thumbnail_url : `${API_URL}${tmp.thumbnail_url}`} alt={tmp.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400 italic text-[10px]">No Preview</div>
                                        )}
                                        <div className={`absolute inset-0 bg-primary-600/10 transition-opacity ${selectedTemplate === tmp.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                                    </div>
                                    <div className="p-3 text-center">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-[11px] truncate">{tmp.name}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center mt-12 pb-12">
                        <button
                            onClick={() => setStep(2)}
                            disabled={!selectedTemplate}
                            className="btn-primary !px-12 !py-4 text-lg"
                        >
                            Continue to Details
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 max-w-4xl mx-auto">
                    <div className="card-premium p-8">
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-8 w-fit mx-auto">
                            <button onClick={() => setInputMode('form')} className={`py-2 px-6 rounded-lg text-sm font-medium transition-all ${inputMode === 'form' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>Form Mode</button>
                            <button onClick={() => setInputMode('json')} className={`py-2 px-6 rounded-lg text-sm font-medium transition-all ${inputMode === 'json' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>JSON Mode</button>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-6">
                            {inputMode === 'form' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold dark:text-gray-300 pl-1">Student Name</label>
                                        <input type="text" name="student_name" className="input-premium" value={formData.student_name} onChange={handleInputChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold dark:text-gray-300 pl-1">Course Title</label>
                                        <input type="text" name="course_name" className="input-premium" value={formData.course_name} onChange={handleInputChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold dark:text-gray-300 pl-1">Issue Date</label>
                                        <input type="date" name="issue_date" className="input-premium" value={formData.issue_date} onChange={handleInputChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold dark:text-gray-300 pl-1 flex justify-between">
                                            <span>Certificate ID</span>
                                            <button type="button" onClick={generateCertificateId} className="text-primary-500 text-xs hover:underline">Auto Generate</button>
                                        </label>
                                        <input type="text" name="certificate_id" className="input-premium" value={formData.certificate_id} onChange={handleInputChange} required />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-semibold dark:text-gray-300 pl-1">Issuing Authority</label>
                                        <input type="text" name="issuing_authority" className="input-premium" value={formData.issuing_authority} onChange={handleInputChange} required />
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold dark:text-gray-300 pl-1">Logo URL</label>
                                            <div className="flex gap-2">
                                                <input type="url" name="logo_url" className="input-premium" value={formData.logo_url} onChange={handleInputChange} />
                                                <label className="btn-secondary !p-3 cursor-pointer">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'logo_url', 'logo')} />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold dark:text-gray-300 pl-1">Signature URL</label>
                                            <div className="flex gap-2">
                                                <input type="url" name="signature_image_url" className="input-premium" value={formData.signature_image_url} onChange={handleInputChange} />
                                                <label className="btn-secondary !p-3 cursor-pointer">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'signature_image_url', 'signature')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <textarea className="input-premium font-mono text-sm h-64" value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
                                    {jsonError && <p className="text-xs text-red-500 pl-1">Error: {jsonError}</p>}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-sm font-semibold dark:text-gray-300 flex items-center pr-4">Formats:</span>
                                {['pdf', 'png', 'jpg'].map(f => (
                                    <label key={f} className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${outputFormats.includes(f) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600 group-hover:border-primary-400'}`}>
                                            {outputFormats.includes(f) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={outputFormats.includes(f)} onChange={() => handleFormatToggle(f)} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.toUpperCase()}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-8">
                                <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
                                <div className="flex gap-4">
                                    <button type="button" onClick={handlePreviewEdit} className="btn-secondary border-primary-500 text-primary-600 dark:text-primary-400">
                                        Interactive Editor
                                    </button>
                                    <button type="submit" disabled={loading} className="btn-primary !px-8">
                                        {loading ? <div className="spinner !w-5 !h-5" /> : 'Generate Now'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {step === 3 && result && (
                <div className="max-w-xl mx-auto text-center space-y-8 animate-fade-in-up">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 shadow-lg shadow-green-500/20">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold dark:text-white">Certificate Ready!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">ID: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-primary-600 dark:text-primary-400">{result.certificate_id}</span></p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(result.download_urls).map(([format, url]) => (
                            <a
                                key={format}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary !py-4 flex flex-col gap-1"
                                download={`${result.certificate_id}.${format}`}
                            >
                                <span className="text-xs opacity-80 uppercase">Download</span>
                                <span className="text-lg">{format.toUpperCase()}</span>
                            </a>
                        ))}
                    </div>
                    <button onClick={() => { setStep(1); setResult(null); }} className="btn-secondary w-full">Generate Another</button>
                </div>
            )}
        </div>
    );
};

export default GeneratePage;
