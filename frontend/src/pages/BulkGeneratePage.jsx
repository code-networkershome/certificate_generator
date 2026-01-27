import React, { useState, useEffect } from 'react';
import { templatesAPI, certificatesAPI, uploadsAPI, API_URL } from '../api';

const BulkGeneratePage = ({ user }) => {
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [inputMode, setInputMode] = useState('json'); // 'json' or 'csv'
    const [jsonInput, setJsonInput] = useState(`[
  { "student_name": "John Doe" },
  { "student_name": "Jane Smith" },
  { "student_name": "Bob Johnson" }
]`);
    const [csvFile, setCsvFile] = useState(null);
    const [commonFields, setCommonFields] = useState({
        course_name: 'AWS Cloud Practitioner',
        issue_date: new Date().toISOString().split('T')[0],
        issuing_authority: 'NetworkersHome',
        signature_name: 'Director',
        signature_image_url: '',
        logo_url: '',
        certificate_title: 'Certificate of Completion',
        certificate_subtitle: 'Professional Development',
        description_text: 'has successfully completed all requirements for'
    });
    const [outputFormats, setOutputFormats] = useState(['pdf']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [uploading, setUploading] = useState({ logo: false, signature: false });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await templatesAPI.list();
            setTemplates(response.templates);
        } catch (err) {
            setTemplates([]);
        }
    };

    const handleCommonFieldChange = (e) => {
        const { name, value } = e.target;
        setCommonFields(prev => ({ ...prev, [name]: value }));
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
            setCommonFields(prev => ({ ...prev, [fieldName]: fullUrl }));
        } catch (err) {
            setError(`Failed to upload ${uploadType}: ${err.message}`);
        } finally {
            setUploading(prev => ({ ...prev, [uploadType]: false }));
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (inputMode === 'csv' && csvFile) {
                const response = await certificatesAPI.bulkGenerateCSV(selectedTemplate, csvFile, outputFormats);
                setResult(response);
                setStep(3);
                return;
            }

            let candidates = [];
            try {
                candidates = JSON.parse(jsonInput);
                if (!Array.isArray(candidates)) throw new Error('JSON must be an array of candidates');
            } catch (err) {
                throw new Error('Invalid JSON: ' + err.message);
            }

            const certificates = candidates.map(candidate => ({
                ...commonFields,
                ...candidate,
                student_name: candidate.student_name,
                course_name: candidate.course_name || commonFields.course_name,
                issue_date: candidate.issue_date || commonFields.issue_date,
                issuing_authority: candidate.issuing_authority || commonFields.issuing_authority,
            }));

            const response = await certificatesAPI.bulkGenerate(selectedTemplate, certificates, outputFormats);
            setResult(response);
            setStep(3);
        } catch (err) {
            setError(err.message || 'Bulk generation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up">
            <div className="flex items-center justify-center mb-12">
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= s ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                                {step > s ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : s}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${step >= s ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
                                {s === 1 ? 'Template' : s === 2 ? 'Candidates' : 'Results'}
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
                        <h2 className="text-3xl font-bold dark:text-white">Choose Bulk Template</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Select the template to use for all candidates</p>
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
                    <div className="flex justify-center mt-12">
                        <button onClick={() => setStep(2)} disabled={!selectedTemplate} className="btn-primary !px-12 !py-4 text-lg">Next: Add Candidates</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8">
                    <div className="card-premium p-8">
                        <h3 className="text-lg font-bold mb-6 dark:text-white">Common Settings (Applied to All)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Course Name</label>
                                <input type="text" name="course_name" className="input-premium" value={commonFields.course_name} onChange={handleCommonFieldChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Issue Date</label>
                                <input type="date" name="issue_date" className="input-premium" value={commonFields.issue_date} onChange={handleCommonFieldChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Authority</label>
                                <input type="text" name="issuing_authority" className="input-premium" value={commonFields.issuing_authority} onChange={handleCommonFieldChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Institution Logo</label>
                                <div className="flex gap-2">
                                    <input type="url" name="logo_url" className="input-premium" placeholder="https://... or upload" value={commonFields.logo_url} onChange={handleCommonFieldChange} />
                                    <label className="btn-secondary !p-3 cursor-pointer shrink-0">
                                        {uploading.logo ? <div className="spinner !w-5 !h-5" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'logo_url', 'logo')} />
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Official Signature (Image)</label>
                                <div className="flex gap-2">
                                    <input type="url" name="signature_image_url" className="input-premium" placeholder="https://... or upload" value={commonFields.signature_image_url} onChange={handleCommonFieldChange} />
                                    <label className="btn-secondary !p-3 cursor-pointer shrink-0">
                                        {uploading.signature ? <div className="spinner !w-5 !h-5" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'signature_image_url', 'signature')} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-6 w-fit h-fit">
                            <button onClick={() => setInputMode('json')} className={`py-2 px-6 rounded-lg text-sm font-medium transition-all ${inputMode === 'json' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>JSON Array</button>
                            <button onClick={() => setInputMode('csv')} className={`py-2 px-6 rounded-lg text-sm font-medium transition-all ${inputMode === 'csv' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>CSV Upload</button>
                        </div>

                        {inputMode === 'json' ? (
                            <textarea className="input-premium font-mono text-sm h-48 mb-6" value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
                        ) : (
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center mb-6">
                                <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={e => setCsvFile(e.target.files[0])} />
                                <label htmlFor="csv-upload" className="cursor-pointer">
                                    <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto text-primary-600 mb-4">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    </div>
                                    <p className="font-semibold dark:text-white">{csvFile ? csvFile.name : 'Click to upload CSV'}</p>
                                    {!csvFile && <p className="text-sm text-gray-500 mt-1">Headers: student_name, course_name, issue_date (optional)</p>}
                                </label>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-100 dark:border-gray-800 items-center">
                            <span className="text-sm font-semibold dark:text-gray-300 pr-4">Formats:</span>
                            {['pdf', 'png', 'jpg'].map(f => (
                                <label key={f} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${outputFormats.includes(f) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {outputFormats.includes(f) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={outputFormats.includes(f)} onChange={() => handleFormatToggle(f)} />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">{f}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex justify-between items-center pt-8">
                            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                            <button onClick={handleGenerate} disabled={loading || (inputMode === 'csv' && !csvFile)} className="btn-primary !px-12">
                                {loading ? <div className="spinner !w-5 !h-5" /> : 'Generate All Certificates'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && result && (
                <div className="max-w-4xl mx-auto space-y-12 animate-fade-in-up">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 mb-6">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-4xl font-extrabold dark:text-white">Batch Generation Complete!</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Successfully processed <span className="font-bold text-gray-900 dark:text-white">{result.successful}</span> of {result.total} certificates.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pb-20">
                        {/* Certificate Preview (First successful one) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 pl-1">Sample Preview</h3>
                            <div className="card-premium p-4 bg-gray-50 dark:bg-gray-900/50">
                                {result.results.find(r => r.success && r.download_urls?.png) ? (
                                    <div className="aspect-[1.414/1] rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-white">
                                        <img
                                            src={result.results.find(r => r.success).download_urls.png}
                                            alt="Certificate Preview"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="aspect-[1.414/1] flex flex-col items-center justify-center text-gray-400 italic bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                                        <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        No visual preview available
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Download & Actions */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 pl-1">Get Your Files</h3>
                            <div className="space-y-4">
                                {result.zip_download_url && (
                                    <a
                                        href={result.zip_download_url.startsWith('http') ? result.zip_download_url : `${API_URL}${result.zip_download_url}`}
                                        download
                                        className="btn-primary w-full !py-5 text-xl flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02]"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Download ZIP Package
                                    </a>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => { setStep(1); setResult(null); }} className="btn-secondary w-full py-4">New Batch</button>
                                    <button onClick={() => window.location.href = '/generate'} className="btn-secondary w-full py-4">Single Mode</button>
                                </div>
                            </div>

                            {result.failed > 0 && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                        Note: {result.failed} certificates failed to generate. Check your input data for errors.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkGeneratePage;
