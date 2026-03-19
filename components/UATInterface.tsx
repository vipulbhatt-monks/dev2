import React, { useState } from 'react';
import { Download, Check, X, AlertCircle, FileCheck, CheckCircle2, XCircle } from 'lucide-react';

export interface TestCase {
    id: string;
    description: string;
    expectedResult: string;
    actualResult: string;
    status: 'Pending' | 'Pass' | 'Fail';
}

interface UATInterfaceProps {
    testCases: TestCase[];
}

export const UATInterface: React.FC<UATInterfaceProps> = ({ testCases: initialTestCases }) => {
    const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases || []);

    const handleStatusChange = (id: string, status: 'Pass' | 'Fail') => {
        setTestCases(prev => prev.map(tc =>
            tc.id === id ? { ...tc, status } : tc
        ));
    };

    const handleActualResultChange = (id: string, value: string) => {
        setTestCases(prev => prev.map(tc =>
            tc.id === id ? { ...tc, actualResult: value } : tc
        ));
    };

    const downloadCSV = () => {
        const headers = ['ID', 'Description', 'Expected Result', 'Actual Result', 'Status'];
        const rows = testCases.map(tc => [
            tc.id,
            `"${tc.description.replace(/"/g, '""')}"`,
            `"${tc.expectedResult.replace(/"/g, '""')}"`,
            `"${tc.actualResult.replace(/"/g, '""')}"`,
            tc.status
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'uat_test_cases.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full flex flex-col bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">

            {/* Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-zinc-900">User Acceptance Testing</h2>
                        <p className="text-xs text-zinc-500">Validate system behavior against requirements.</p>
                    </div>
                </div>
                <button
                    onClick={downloadCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white hover:bg-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-black/5"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export Report
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                {testCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4">
                        <div className="w-16 h-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                            <FileCheck className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm">No test cases generated yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {testCases.map((tc) => (
                            <div key={tc.id} className="group bg-white border border-zinc-100 rounded-xl p-4 hover:border-zinc-200 transition-all shadow-sm">
                                <div className="flex items-start gap-4">

                                    {/* Status Icon */}
                                    <div className="pt-1">
                                        {tc.status === 'Pass' ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : tc.status === 'Fail' ? (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-dashed" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200">{tc.id}</span>
                                                <h3 className="text-sm font-bold text-zinc-900">{tc.description}</h3>
                                            </div>
                                            <div className="text-xs text-zinc-600 bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/50">
                                                <span className="text-emerald-700 uppercase tracking-wider text-[9px] font-bold block mb-1">Expected Result</span>
                                                {tc.expectedResult}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="relative">
                                                <textarea
                                                    value={tc.actualResult}
                                                    onChange={(e) => handleActualResultChange(tc.id, e.target.value)}
                                                    placeholder="Record actual result..."
                                                    className="w-full bg-white border border-zinc-200 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-100 min-h-[80px] resize-none placeholder:text-zinc-400 transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleStatusChange(tc.id, 'Pass')}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tc.status === 'Pass'
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-600/20'
                                                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                                                        }`}
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Pass
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(tc.id, 'Fail')}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tc.status === 'Fail'
                                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                                                        }`}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    Fail
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
