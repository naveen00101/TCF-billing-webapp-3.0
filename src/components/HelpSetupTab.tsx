import React, { useState } from"react";
import { HelpCircle, Database, CheckSquare, Layers, PlayCircle, Image, Info, AlertTriangle } from"lucide-react";

export default function HelpSetupTab() {
 const [openFaq, setOpenFaq] = useState<number | null>(null);

 const steps = [
 {
 step:"Step 1",
 title:"Create Google Spreadsheet",
 desc:"Go to Google Sheets (sheets.google.com) and create a brand new blank Spreadsheet. Name it something descriptive, for example: 'TCF ERP Database'."
 },
 {
 step:"Step 2",
 title:"Create Required Sheets",
 desc:"Inside your spreadsheet, create exactly five separate worksheets (tabs at the bottom) with these precise naming conventions (case-sensitive):",
 list: ["Products","Customers","Invoices","InvoiceItems","Settings"]
 },
 {
 step:"Step 3",
 title:"Deploy Google Apps Script",
 desc:"Click 'Extensions' > 'Apps Script' in your Spreadsheet menu. Clear any default code, paste the server synchronization Apps Script, and click 'Deploy' > 'New Deployment'. Choose 'Web App', configure 'Execute as: Me', and crucially select 'Who has access: Anyone'."
 },
 {
 step:"Step 4",
 title:"Copy Web App URL",
 desc:"After finishing the deployment, copy the generated Web App URL from the popup deployment screen. This endpoint links your local POS browser with the Google cloud servers."
 },
 {
 step:"Step 5",
 title:"Paste Spreadsheet ID & Web App Url",
 desc:"Copy your Spreadsheet ID from your browser's address bar (the long string between '/d/' and '/edit') and paste both the URL and the ID into our Settings Tab panel in this application."
 },
 {
 step:"Step 6",
 title:"Test Connection",
 desc:"Click the 'Run Connection Test' link. Our engine will execute a live ping. If successful, you will see a green 'Connected' badge and Sheets database structures will match."
 },
 {
 step:"Step 7",
 title:"Start Sync Billing",
 desc:"You are fully armed! Perform a POS checkout and watch transactions sync automatically to your Google Spreadsheet in absolute real-time."
 }
 ];

 const faqs = [
 {
 q:"Does this application work offline without a connected Spreadsheet?",
 a:"Yes, fully! TCF ERP is designed with full-stack offline resilience. All receipts, catalog products, and staff user settings are written immediately into your local sandboxed browser database. Everything will work out-of-the-box until you choose to connect Google Sheets."
 },
 {
 q:"What does Apps Script 'Anyone has access' mean? Is it secure?",
 a:"Yes. Setting 'Anyone has access' is a requirement for Google Apps Script Web Apps to accept incoming HTTPS POST requests from external domains. We safeguard your write actions with an internal API token that is verified on every transaction run."
 },
 {
 q:"Why does backup creation fail with a Google Drive permission error?",
 a:"This happens because Google Apps Script requires explicit permission from you to access your Google Drive (specifically to create the backup folder and copy files). To resolve this, open the Apps Script editor inside your spreadsheet ('Extensions' > 'Apps Script'), select the 'createSpreadsheetBackup' function from the top dropdown, and click the 'Run' button. Follow the 'Authorization Required' prompt to click 'Review Permissions', select your account, click 'Advanced' > 'Go to TCF POS Backend (unsafe)', and click 'Allow'. After authorizing, redeploy the web app ('Deploy' > 'Manage Deployments' > select active deployment > edit icon > version 'New version' > click 'Deploy') so the permissions take effect."
 },
 {
 q:"How can I restore default data to play around?",
 a:"Inside the Settings Panel under Database Settings, click 'Reset Demo Defaults'. It will instantly seed your workspace with test invoices, mock customers, and default usernames."
 }
 ];

 return (
 <div className="space-y-8 animate-in fade-in duration-300">
 
 {/* HEADER SECTION */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-default pb-4">
 <div>
 <h1 className="text-xl font-extrabold tracking-tight text-primary font-sans flex items-center gap-2">
 <Database className="h-5 w-5 text-red-600" />
 <span>Google Sheets Setup Guide</span>
 </h1>
 <p className="text-xs text-muted font-sans mt-0.5">
 Step-by-step master guide to hook your Google Spreadsheet database as a cloud backend storage solution.
 </p>
 </div>
 </div>

 <div className="grid gap-8 lg:grid-cols-3">
 
 {/* STEPS TIMELINE COLUMNS */}
 <div className="lg:col-span-2 space-y-6">
 <h3 className="font-bold text-primary text-sm flex items-center gap-1.5 border-b border-default pb-2">
 <CheckSquare className="h-4.5 w-4.5 text-red-500" />
 <span>Deployment Execution Routine</span>
 </h3>

 <div className="space-y-6">
 {steps.map((st, idx) => (
 <div key={idx} className="relative flex gap-4 items-start">
 {idx !== steps.length - 1 && (
 <span className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-800" />
 )}
 
 {/* Step badge */}
 <span className="w-8 h-8 rounded-full bg-red-600/15 text-red-400 border border-red-500/20 text-xs font-bold font-sans flex items-center justify-center shrink-0">
 {idx + 1}
 </span>

 <div className="space-y-1 bg-surface p-4 rounded-xl border border-default flex-1">
 <span className="text-[10px] uppercase font-bold text-red-500 dark:text-red-400 font-mono tracking-widest">{st.step}</span>
 <h4 className="font-bold text-primary dark:text-primary text-xs">{st.title}</h4>
 <p className="text-muted dark:text-muted text-[11px] leading-relaxed mt-1">{st.desc}</p>
 
 {st.list && (
 <div className="flex gap-2 flex-wrap pt-2">
 {st.list.map((item, i) => (
 <span key={i} className="px-2 py-0.5 text-[9px] bg-card-secondary dark:bg-gray-800 border border-default dark:border-default text-muted dark:text-muted font-mono rounded font-bold">
 {item}
 </span>
 ))}
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* SCREENSHOTS / VIDEO / FAQ ASSETS COL */}
 <div className="space-y-6">
 <h3 className="font-bold text-primary text-sm flex items-center gap-1.5 border-b border-default pb-2">
 <PlayCircle className="h-4.5 w-4.5 text-emerald-500" />
 <span>Interactive Media Guides</span>
 </h3>

 {/* Video Placeholder Area */}
 <div className="rounded-xl border-2 border-dashed border-default bg-surface p-4 text-center space-y-2 relative group overflow-hidden">
 <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
 <PlayCircle className="h-10 w-10 text-emerald-500 mx-auto animate-pulse" />
 <div>
 <p className="text-xs font-bold text-primary dark:text-primary">Watch Video Tutorial</p>
 <p className="text-[10px] text-muted dark:text-muted">Step-by-step Apps Script Deployment (05:15)</p>
 </div>
 <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-fit mx-auto uppercase">
 PREVIEW COMING SOON
 </div>
 </div>

 {/* Screenshot Placeholder Area */}
 <div className="rounded-xl border border-default bg-surface p-5 space-y-3">
 <div className="flex items-center gap-2 text-xs font-bold text-primary dark:text-primary">
 <Image className="h-4 w-4 text-muted dark:text-muted" />
 <span>Apps Script Deployment Screen</span>
 </div>
 <div className="h-28 rounded-lg bg-card-secondary dark:bg-gray-900 border border-default dark:border-neutral-800 flex items-center justify-center text-center p-4">
 <div className="space-y-1">
 <p className="text-[10px] text-muted dark:text-muted font-bold uppercase tracking-wider">[ Screenshot Reference Placeholder ]</p>
 <p className="text-[9px] text-[#71717a]">Deploy Web App configuring Execute as 'Me' and access code permissions</p>
 </div>
 </div>
 </div>

 {/* Troubleshooting Guidelines */}
 <div className="rounded-xl border border-amber-900/45 bg-amber-950/5 p-4 space-y-2">
 <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
 <AlertTriangle className="h-4 w-4 shrink-0" />
 <span>Troubleshooting Routine</span>
 </div>
 <ul className="text-[10px] text-muted space-y-1.5 list-disc pl-4 leading-relaxed">
 <li><strong>Cors Connection Errors:</strong> Ensure you deploy Apps Script as 'Web App' and authorize access to 'Anyone'. Do not use raw sheets preview links.</li>
 <li><strong>Missing Sheet Worksheets:</strong> Ensure you created exactly five worksheets named matching the precise list (case-sensitive).</li>
 <li><strong>Sync Blocks:</strong> Check that your Google Spreadsheet ID is completely correct (the middle string token).</li>
 </ul>
 </div>

 {/* Collapsible FAQs Accordion */}
 <div className="space-y-2 pt-2">
 <div className="flex items-center gap-2 text-xs font-bold text-primary dark:text-primary uppercase tracking-wider mb-2">
 <HelpCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
 <span>Setup & Sync FAQ</span>
 </div>

 {faqs.map((f, idx) => (
 <div key={idx} className="rounded-xl border border-default bg-surface overflow-hidden">
 <button
 onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
 className="w-full text-left p-3 text-xs font-bold text-primary dark:text-primary flex justify-between items-center bg-card-secondary/50  hover:bg-gray-200/50 dark:hover:bg-card-secondary dark:hover:bg-surface outline-none cursor-pointer"
 >
 <span className="pr-4">{f.q}</span>
 <span className="text-muted text-xs shrink-0 select-none">
 {openFaq === idx ?"−" :"+"}
 </span>
 </button>
 {openFaq === idx && (
 <div className="p-3 text-[11px] leading-relaxed text-muted dark:text-muted border-t border-default animate-in slide-in-from-top-2">
 {f.a}
 </div>
 )}
 </div>
 ))}
 </div>

 </div>

 </div>
 </div>
 );
}
