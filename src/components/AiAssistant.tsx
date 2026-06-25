import React, { useState, useRef, useEffect } from"react";
import { Sparkles, MessageSquare, X, Send, Lightbulb, TrendingUp, Users, Package } from"lucide-react";
import Markdown from"react-markdown";
import { SheetsSyncEngine } from"../utils/sheetsSync";

interface ChatMessage {
 sender:"user" |"ai";
 text: string;
 isFallback?: boolean;
}

interface AiAssistantProps {
 isOpen?: boolean;
 setIsOpen?: (open: boolean) => void;
}

export default function AiAssistant({ isOpen: parentIsOpen, setIsOpen: parentSetIsOpen }: AiAssistantProps = {}) {
 const [localIsOpen, setLocalIsOpen] = useState(false);
 const isOpen = parentIsOpen !== undefined ? parentIsOpen : localIsOpen;
 const setIsOpen = parentSetIsOpen !== undefined ? parentSetIsOpen : setLocalIsOpen;

 const [input, setInput] = useState("");
 const [messages, setMessages] = useState<ChatMessage[]>([
 {
 sender:"ai",
 text:"Hi! I am your **Smart Billing AI Assistant**. I have complete visibility into your current inventory, customer directories, and historical invoice logs. \n\nHow can I help boost your business today?",
 },
 ]);
 const [isLoading, setIsLoading] = useState(false);
 const [isSending, setIsSending] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
 };

 useEffect(() => {
 if (isOpen) {
 scrollToBottom();
 }
 }, [messages, isOpen]);

 // Predefined prompts for business analysis
 const quickSuggestions = [
 { label:"Sales Review", prompt:"Summarize today's sales and identify the highest revenue invoice.", icon: TrendingUp },
 { label:"Top Customer", prompt:"Analyze my customer list. Who is my most valuable customer and why?", icon: Users },
 { label:"Restock Alert", prompt:"Which product category is performing best, and what should I stock up on?", icon: Package },
 ];

 const handleSend = async (textToSend?: string) => {
 if (isSending || isLoading) {
 console.log("[AI Assistant] Blocked duplicate request: A request is already in progress.");
 return;
 }
 
 const promptText = (textToSend || input).trim();
 if (!promptText) return;

 if (!textToSend) {
 setInput("");
 }

 console.log(`[AI Assistant] Request Triggered | User Initiated = true | Prompt:"${promptText.substring(0, 30)}..."`);
 
 // Append User Message
 const updatedMessages = [...messages, { sender:"user", text: promptText } as ChatMessage];
 setMessages(updatedMessages);
 setIsLoading(true);
 setIsSending(true);

 try {
 // Gather current business state securely to inject as backend context
 const products = SheetsSyncEngine.getProducts().filter(p => !p.isSoftDeleted);
 const customers = SheetsSyncEngine.getCustomers().filter(c => !c.isSoftDeleted);
 const invoices = SheetsSyncEngine.getInvoices().filter(i => !i.isSoftDeleted);
 const invoiceItems = SheetsSyncEngine.getInvoiceItems();
 const company = SheetsSyncEngine.getCompanySettings();

 const businessData = {
 companyName: company.companyName,
 productsCount: products.length,
 customersCount: customers.length,
 invoicesCount: invoices.length,
 totalSalesVolume: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
 productsList: products.map(p => ({ name: p.name, category: p.category, price: p.price })),
 customersList: customers.map(c => ({ name: c.name, mobile: c.mobile })),
 recentTransactions: invoices.map(i => ({ no: i.invoiceNo, date: i.date, customer: i.customerName, total: i.grandTotal })),
 lineItemsSummary: invoiceItems.map(item => ({ invoice: item.invoiceNo, product: item.productName, qty: item.quantity, rate: item.unitPrice, amt: item.amount }))
 };

 const response = await fetch("/api/chat", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 prompt: promptText,
 businessData,
 }),
 });

 if (!response.ok) {
 throw new Error("AI Endpoint returned an error response");
 }

 const result = await response.json();
 setMessages([
 ...updatedMessages,
 {
 sender:"ai",
 text: result.text ||"I apologize, but I received empty analysis. Please try reformulating your business query.",
 isFallback: result.fallbackUsed,
 },
 ]);
 } catch (err: any) {
 console.error("AI Assistant Error:", err);
 setMessages([
 ...updatedMessages,
 {
 sender:"ai",
 text:"⚠️ **System Communication Failed**: I loaded a connection error while reaching the model. Please ensure your `GEMINI_API_KEY` is saved correctly inside **Settings > Secrets**.",
 },
 ]);
 } finally {
 setIsLoading(false);
 setIsSending(false);
 }
 };

 return (
 <>
 {/* Floating Action Trigger Button - MOBILE ONLY */}
 {!isOpen && (
 <button
 id="btn-ai-trigger-mobile"
 onClick={() => setIsOpen(true)}
 className="lg:hidden fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-blue-700 active:scale-95 cursor-pointer ring-4 ring-white dark:ring-zinc-900"
 title="Ask AI Assistant"
 >
 <Sparkles className="h-5 w-5 animate-pulse" />
 </button>
 )}

 {/* AI Assistant Overlay/Drawer Panel */}
 {isOpen && (
 <div
 id="panel-ai-assistant"
 className="fixed top-0 right-0 bottom-0 z-50 flex h-screen w-full max-w-[420px] flex-col border-l border-default dark:border-default bg-card  shadow-2xl animate-in slide-in-from-right duration-300"
 >
 {/* Header Panel */}
 <div className="flex items-center justify-between bg-blue-600 dark:bg-blue-700 px-4 py-3.5 text-primary">
 <div className="flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-yellow-300 fill-yellow-300" />
 <div>
 <h3 className="font-bold text-sm leading-none">Smart Assistant</h3>
 <span className="text-[10px] text-blue-105 font-mono">Gemini-3.1-Pro-Preview</span>
 </div>
 </div>
 <button
 onClick={() => setIsOpen(false)}
 className="rounded-lg p-1 text-blue-100 hover:bg-card/10 hover:text-primary cursor-pointer"
 >
 <X className="h-4.5 w-4.5" />
 </button>
 </div>

 {/* Chat Messages Log */}
 <div className="flex-1 overflow-y-auto bg-surface  p-4 space-y-4">
 {messages.map((msg, idx) => (
 <div
 key={idx}
 className={`flex flex-col ${msg.sender ==="user" ?"items-end" :"items-start"}`}
 >
 <div
 className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
 msg.sender ==="user"
 ?"bg-blue-600 text-white rounded-tr-none"
 :"bg-card  text-secondary dark:text-gray-200 border border-default shadow-sm rounded-tl-none"
 }`}
 >
 <div className="markdown-body">
 <Markdown>{msg.text}</Markdown>
 </div>
 {msg.isFallback && (
 <span className="mt-1 block text-[9px] text-blue-500 dark:text-blue-400 font-medium">
 * Powered by Gemini 3.5 Flash
 </span>
 )}
 </div>
 </div>
 ))}

 {isLoading && (
 <div className="flex items-start gap-2">
 <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-default bg-card  px-3.5 py-2.5 shadow-sm">
 <div className="flex items-center gap-2">
 <div className="flex space-x-1">
 <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-600" style={{ animationDelay:"0ms" }} />
 <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-600" style={{ animationDelay:"150ms" }} />
 <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-600" style={{ animationDelay:"300ms" }} />
 </div>
 <span className="text-xs text-muted dark:text-muted font-medium">Gemini is thinking...</span>
 </div>
 </div>
 </div>
 )}
 <div ref={scrollToBottom} />
 </div>

 {/* Quick Guidance Selector (Show when no active queries or at top) */}
 <div className="border-t border-default bg-surface  p-2">
 <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
 {quickSuggestions.map((item, idx) => {
 const Icon = item.icon;
 return (
 <button
 key={idx}
 onClick={() => handleSend(item.prompt)}
 disabled={isLoading || isSending}
 className="flex shrink-0 items-center gap-1 rounded-full border border-default bg-card  px-2.5 py-1 text-xs text-secondary dark:text-muted hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 active:bg-blue-50 dark:active:bg-[#252525] disabled:opacity-50 cursor-pointer"
 >
 <Icon className="h-3 w-3" />
 <span>{item.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Chat Form Footer */}
 <div className="border-t border-default bg-card  p-3">
 <form
 onSubmit={(e) => {
 e.preventDefault();
 handleSend();
 }}
 className="flex gap-2"
 >
 <input
 type="text"
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder="Ask AI about sales, customers, category stats..."
 disabled={isLoading || isSending}
 className="flex-1 rounded-xl border border-default bg-surface  text-primary dark:text-primary px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:bg-card focus:ring-1 focus:ring-blue-500 disabled:opacity-75"
 />
 <button
 type="submit"
 disabled={isLoading || isSending || !input.trim()}
 className="flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 p-2.5 text-primary transition-colors disabled:bg-gray-200 dark:disabled:bg-zinc-800 disabled:text-muted dark:disabled:text-muted cursor-pointer"
 >
 <Send className="h-4 w-4" />
 </button>
 </form>
 </div>
 </div>
 )}
 </>
 );
}
