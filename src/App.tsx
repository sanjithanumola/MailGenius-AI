import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import {
  Mail,
  Send,
  Sparkles,
  Inbox,
  Clock,
  LogOut,
  Copy,
  Check,
  Download,
  RotateCw,
  MessageSquare,
  AlertCircle,
  Languages,
  ArrowRight,
  ChevronRight,
  User,
  Scissors,
  Maximize2,
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  Star,
  Trash2,
  LogIn,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface Draft {
  id: string;
  userId: string;
  recipient: string;
  recipientEmail: string;
  subject: string;
  body: string;
  tone: string;
  language: string;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function App() {
  // Local mode default user
  const [user, setUser] = useState<any>({
    uid: "local-user",
    email: "user@mailgenius.ai",
    displayName: "MailGenius Local User"
  });
  const [needsAuth] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  // Tab state: "write" or "inbox" or "drafts"
  const [activeTab, setActiveTab] = useState<"write" | "inbox" | "drafts">("write");

  // Local Storage Saved Drafts State
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Inbox state (Simulated)
  interface GmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    snippet: string;
    body: string;
  }
  const [inbox, setInbox] = useState<GmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [isFetchingInbox, setIsFetchingInbox] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);

  // Email generation form state
  const [recipient, setRecipient] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("Professional");
  const [language, setLanguage] = useState("English");
  const [isGenerating, setIsGenerating] = useState(false);

  // Reply generator state
  const [replyContext, setReplyContext] = useState("");
  const [replyTone, setReplyTone] = useState("Professional");
  const [replyLanguage, setReplyLanguage] = useState("English");

  // Editor state
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [improvementInstruction, setImprovementInstruction] = useState("");

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Feedback notifications
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Pre-loaded simulated inbox emails
  const MOCK_INBOX_EMAILS: GmailMessage[] = [
    {
      id: "mock-1",
      threadId: "thread-1",
      subject: "Partnership Proposal: MailGenius AI integration",
      from: "Rahul Kumar <rahul@innovatetech.io>",
      to: "me@example.com",
      date: new Date().toISOString(),
      snippet: "Hi Team, I saw MailGenius AI and loved the concept. We want to discuss integrating your generation services into our enterprise workflow. Are you free for a call?",
      body: `Hi Team,<br/><br/>I saw MailGenius AI and loved the concept! We are a high-growth SaaS platform helping teams streamline operations.<br/><br/>We are highly interested in discussing an enterprise integration to incorporate your email drafting capabilities directly into our customer engagement module.<br/><br/>Are you free for a brief 15-minute introductory call next Monday or Tuesday afternoon?<br/><br/>Best regards,<br/>Rahul Kumar<br/>Director of Partnerships | InnovateTech`
    },
    {
      id: "mock-2",
      threadId: "thread-2",
      subject: "Feedback regarding recent product shipment",
      from: "Sarah Jenkins <sarah.j@gmail.com>",
      to: "me@example.com",
      date: new Date(Date.now() - 3600000).toISOString(),
      snippet: "Hello, I recently ordered your premium workspace organizer but received a slightly different size. I would love to know how to exchange it...",
      body: `Hello,<br/><br/>I recently placed an order for your premium workspace organizer. It arrived today, but it appears to be a slightly different size than what was specified on your website.<br/><br/>Could you please let me know how I can initiate an exchange for the correct size? I really love the build quality and hope to resolve this soon.<br/><br/>Thank you,<br/>Sarah Jenkins`
    },
    {
      id: "mock-3",
      threadId: "thread-3",
      subject: "Urgent: Rescheduling Design Review meeting",
      from: "David Miller <david.m@designstudio.com>",
      to: "me@example.com",
      date: new Date(Date.now() - 7200000 * 2).toISOString(),
      snippet: "Hi, due to an unexpected conflict, I need to reschedule our project review tomorrow morning. Can we move it to the afternoon or Wednesday?",
      body: `Hi,<br/><br/>Apologies for the last-minute request, but due to an unexpected client emergency, I won't be able to make our scheduled Design Review meeting tomorrow morning at 10 AM.<br/><br/>Would it be possible to reschedule to tomorrow afternoon at 3 PM, or alternatively anytime on Wednesday morning?<br/><br/>Let me know what works best for you.<br/><br/>Thanks,<br/>David Miller`
    }
  ];

  // Initialize and load simulated inbox and drafts
  useEffect(() => {
    setIsIframe(window.self !== window.top);
    setInbox(MOCK_INBOX_EMAILS);
    fetchAndSetDrafts();
  }, []);

  // Fetch saved drafts from localStorage
  const fetchAndSetDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const stored = localStorage.getItem("mailgenius_drafts");
      const allDrafts = stored ? JSON.parse(stored) : [];
      setDrafts(allDrafts);
    } catch (err: any) {
      console.error("Error loading drafts:", err);
      showToast("Error loading drafts: " + err.message, "error");
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  // Draft operations handlers
  const handleSaveCurrentDraft = async () => {
    if (!emailBody) {
      showToast("Email body is empty, nothing to save.", "error");
      return;
    }
    setIsSavingDraft(true);
    try {
      const stored = localStorage.getItem("mailgenius_drafts");
      const currentDrafts: Draft[] = stored ? JSON.parse(stored) : [];
      
      let savedId = currentDraftId;
      if (savedId) {
        // Update existing
        const index = currentDrafts.findIndex(d => d.id === savedId);
        if (index !== -1) {
          currentDrafts[index] = {
            ...currentDrafts[index],
            recipient: recipient || emailTo.split("@")[0] || "No recipient name",
            recipientEmail: emailTo || recipientEmail || "",
            subject: emailSubject || "(No Subject)",
            body: emailBody,
            tone: tone,
            language: language,
            updatedAt: new Date().toISOString(),
          };
        } else {
          savedId = null; // Reset if not found in list
        }
      }
      
      if (!savedId) {
        // Create new
        savedId = "draft_" + Math.random().toString(36).substring(2, 9);
        const newDraft: Draft = {
          id: savedId,
          userId: "local-user",
          recipient: recipient || emailTo.split("@")[0] || "No recipient name",
          recipientEmail: emailTo || recipientEmail || "",
          subject: emailSubject || "(No Subject)",
          body: emailBody,
          tone: tone,
          language: language,
          isStarred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        currentDrafts.unshift(newDraft);
      }

      localStorage.setItem("mailgenius_drafts", JSON.stringify(currentDrafts));
      setCurrentDraftId(savedId);
      showToast(currentDraftId ? "Draft updated locally!" : "Draft saved locally!", "success");
      setDrafts(currentDrafts);
    } catch (err: any) {
      console.error("Failed to save draft:", err);
      showToast("Failed to save draft: " + err.message, "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleToggleStar = async (draftItem: Draft) => {
    try {
      const stored = localStorage.getItem("mailgenius_drafts");
      const currentDrafts: Draft[] = stored ? JSON.parse(stored) : [];
      const index = currentDrafts.findIndex(d => d.id === draftItem.id);
      if (index !== -1) {
        currentDrafts[index].isStarred = !currentDrafts[index].isStarred;
        currentDrafts[index].updatedAt = new Date().toISOString();
        localStorage.setItem("mailgenius_drafts", JSON.stringify(currentDrafts));
        setDrafts(currentDrafts);
        showToast(currentDrafts[index].isStarred ? "Draft starred!" : "Removed star from draft", "success");
      }
    } catch (err: any) {
      console.error("Failed to toggle star:", err);
      showToast("Error updating star: " + err.message, "error");
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    try {
      const stored = localStorage.getItem("mailgenius_drafts");
      const currentDrafts: Draft[] = stored ? JSON.parse(stored) : [];
      const filtered = currentDrafts.filter(d => d.id !== draftId);
      localStorage.setItem("mailgenius_drafts", JSON.stringify(filtered));
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
      setDrafts(filtered);
      showToast("Draft deleted successfully.", "success");
    } catch (err: any) {
      console.error("Failed to delete draft:", err);
      showToast("Error deleting draft: " + err.message, "error");
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    setCurrentDraftId(draft.id);
    setEmailTo(draft.recipientEmail);
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
    setRecipient(draft.recipient);
    setRecipientEmail(draft.recipientEmail);
    setTone(draft.tone);
    setLanguage(draft.language);
    showToast("Loaded draft into Editor!", "info");
  };

  const handleClearEditor = () => {
    setCurrentDraftId(null);
    setEmailTo("");
    setEmailSubject("");
    setEmailBody("");
    setSelectedMessage(null);
  };

  // Show a toast message
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sign out Handler
  const handleLogout = () => {
    showToast("Logout disabled in offline local mode.", "info");
  };

  // Fetch / Sync Simulated Inbox
  const loadInbox = async () => {
    setIsFetchingInbox(true);
    setInboxError(null);
    try {
      // Simulate real latency of 600ms
      await new Promise((resolve) => setTimeout(resolve, 600));
      setInbox(MOCK_INBOX_EMAILS);
    } catch (err: any) {
      console.error("Error reading simulated inbox:", err);
      setInboxError("Could not sync inbox.");
    } finally {
      setIsFetchingInbox(false);
    }
  };

  const handleRefreshInbox = async () => {
    showToast("Syncing simulated inbox...", "info");
    await loadInbox();
  };

  // Pre-fill prompt generator templates
  const applyTemplate = (type: string) => {
    switch (type) {
      case "job":
        setRecipient("Hiring Manager");
        setPurpose("Apply for the Senior Full Stack React Developer role at Acme Corp.");
        setContext("Highlight my 4 years of React, Node, and Tailwind experience, as well as my recent projects.");
        setTone("Professional");
        break;
      case "proposal":
        setRecipient("Sarah Davis (Product VP)");
        setPurpose("Submit a business partnership proposal regarding the new cloud dashboard integration.");
        setContext("Explain how our analytics framework saves 15 hours per week on telemetry metrics.");
        setTone("Persuasive");
        break;
      case "meeting":
        setRecipient("Rahul John");
        setPurpose("Request a website project discussion next Monday.");
        setContext("We need to review the newly finalized wireframes and timeline milestones.");
        setTone("Professional");
        break;
      case "leave":
        setRecipient("Team Lead");
        setPurpose("Request a 3-day medical leave starting from next Wednesday.");
        setContext("Family medical emergency that requires me to travel out of town.");
        setTone("Formal");
        break;
      default:
        break;
    }
    showToast("Template loaded!", "info");
  };

  // POST request helper to local API routes
  const callAIEndpoint = async (endpoint: string, body: object) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `Request to ${endpoint} failed.`);
    }

    return await res.json();
  };

  // AI Write Handler
  const handleWriteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose) {
      showToast("Please enter the email purpose or details.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const data = await callAIEndpoint("/api/generate-email", {
        recipient,
        context,
        purpose,
        tone,
        language,
      });

      setEmailTo(recipientEmail || "");
      setEmailSubject(data.subject);
      setEmailBody(data.body);
      showToast("Email generated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to generate email.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Reply Handler
  const handleGenerateReply = async () => {
    if (!selectedMessage) return;

    setIsGenerating(true);
    try {
      const data = await callAIEndpoint("/api/generate-reply", {
        incomingSubject: selectedMessage.subject,
        incomingBody: selectedMessage.body || selectedMessage.snippet,
        replyContext: replyContext,
        tone: replyTone,
        language: replyLanguage,
      });

      // Extract sender's email from the "From" header (format usually: "Name <email@domain.com>")
      let senderEmail = selectedMessage.from;
      const emailMatch = selectedMessage.from.match(/<([^>]+)>/);
      if (emailMatch) {
        senderEmail = emailMatch[1];
      }

      setEmailTo(senderEmail);
      setEmailSubject(data.subject);
      setEmailBody(data.body);
      showToast("Reply suggestion drafted!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to generate reply suggestion.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Improvement Handler
  const handleImproveEmail = async (actionType: string) => {
    if (!emailBody) {
      showToast("No email content to improve.", "error");
      return;
    }

    let instruction = "";
    switch (actionType) {
      case "grammar":
        instruction = "Correct any spelling, punctuation, and grammar mistakes while maintaining the exact structure.";
        break;
      case "shorten":
        instruction = "Make the email highly concise, brief, and straight to the point while preserving vital call-to-actions.";
        break;
      case "expand":
        instruction = "Expand this email to sound more thorough and descriptive, adding polite professional context where appropriate.";
        break;
      case "clarity":
        instruction = "Rewrite this email to maximize clarity, removing any repetitive wordings or awkward phrasing.";
        break;
      case "custom":
        if (!improvementInstruction) {
          showToast("Please enter custom refinement instructions.", "error");
          return;
        }
        instruction = improvementInstruction;
        break;
      default:
        instruction = "Refine and make more polished.";
    }

    setIsImproving(true);
    try {
      const data = await callAIEndpoint("/api/improve-email", {
        currentBody: emailBody,
        currentSubject: emailSubject,
        instruction,
        tone,
        language,
      });

      setEmailSubject(data.subject);
      setEmailBody(data.body);
      setImprovementInstruction("");
      showToast("Email refined successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to refine email.", "error");
    } finally {
      setIsImproving(false);
    }
  };

  // Copy Email to Clipboard
  const handleCopyToClipboard = () => {
    if (!emailBody) return;
    const fullText = `Subject: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    showToast("Email copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Email as PDF using jsPDF
  const handleDownloadPDF = () => {
    if (!emailBody) return;
    try {
      const doc = new jsPDF();
      
      // Document metadata & style setup
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("MailGenius AI Draft", 15, 25);
      
      // Horizontal separator line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 30, 195, 30);
      
      // Header details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139); // slate-500
      if (emailTo) {
        doc.text(`To: ${emailTo}`, 15, 40);
      }
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 46);
      
      // Subject field with bold label
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Subject:", 15, 55);
      doc.setFont("helvetica", "normal");
      doc.text(emailSubject || "(No Subject)", 35, 55);
      
      // Horizontal border line
      doc.line(15, 60, 195, 60);
      
      // Body content wrapper
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85); // slate-700
      
      // Split text to fit within page margins
      const splitText = doc.splitTextToSize(emailBody, 175);
      
      // Draw lines page-by-page if needed
      let yOffset = 70;
      const pageHeight = 280;
      
      for (let i = 0; i < splitText.length; i++) {
        if (yOffset > pageHeight) {
          doc.addPage();
          yOffset = 25; // Reset top offset for the new page
        }
        doc.text(splitText[i], 15, yOffset);
        yOffset += 6; // line spacing
      }
      
      // Save PDF file
      const filename = `${emailSubject ? emailSubject.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "email_draft"}.pdf`;
      doc.save(filename);
      showToast("PDF downloaded successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to compile PDF.", "error");
    }
  };

  // Send Email (Simulated dispatch)
  const handleSendGmail = async () => {
    if (!emailTo) {
      showToast("Recipient email is required to send.", "error");
      return;
    }
    if (!emailSubject) {
      showToast("Subject line is required.", "error");
      return;
    }

    setIsSending(true);
    setShowConfirmSend(false);
    try {
      // Simulate real transmission latency of 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast("Email dispatched successfully! (Simulated send)", "success");
      
      // Clear composer states on successful send
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
      setSelectedMessage(null);
      setCurrentDraftId(null);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to send email.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Iframe Preview Warning & Redirect */}
      {isIframe && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white px-4 py-2 text-center text-xs font-semibold flex flex-wrap items-center justify-center gap-x-3 gap-y-1 relative z-50 shadow-sm border-b border-amber-600/20">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-100" />
            <span>Currently in preview iframe. Browsers block authentication popups inside cross-origin frames.</span>
          </span>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:decoration-solid bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-lg transition-all inline-flex items-center gap-1 font-bold text-amber-50"
          >
            <span>Open in New Tab for Sign-In</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-md ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
            {toast.type === "info" && <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Sending Emails */}
      <AnimatePresence>
        {showConfirmSend && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 p-6 overflow-hidden"
            >
              <div className="flex gap-4 items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Send email via Gmail?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    You are about to send an email on behalf of your connected account (<strong className="text-slate-700">{user?.email}</strong>). Please verify the recipient and content before proceeding.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-600 space-y-2 mb-6">
                <div>
                  <strong className="text-slate-800">To:</strong> {emailTo}
                </div>
                <div>
                  <strong className="text-slate-800">Subject:</strong> {emailSubject}
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {emailBody}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmSend(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendGmail}
                  className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-xl text-sm font-medium flex items-center gap-2"
                >
                  Confirm & Send
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-xl shadow-md shadow-blue-500/10">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">MailGenius AI</h1>
              <p className="text-xs text-slate-500">Your Intelligent Workspace Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-3 rounded-full border border-slate-100">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                L
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-none">
                  Local Workspace
                </p>
                <p className="text-[10px] text-slate-500 leading-none mt-0.5">offline@mailgenius.ai</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Writing Options or Inbox Sync (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
              {/* Tab Selector */}
              <div className="bg-slate-200/60 p-1 rounded-xl flex">
                <button
                  onClick={() => setActiveTab("write")}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "write"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Draft Email</span>
                </button>
                <button
                  onClick={() => setActiveTab("inbox")}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "inbox"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Inbox className="w-4 h-4 text-indigo-500" />
                  <span>Live Inbox</span>
                </button>
                <button
                  onClick={() => setActiveTab("drafts")}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "drafts"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Saved Drafts</span>
                </button>
              </div>

              {/* TAB 1: WRITE EMAIL */}
              {activeTab === "write" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      Generate Email
                    </h3>
                    <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                      GEMINI POWERED
                    </div>
                  </div>

                  {/* Quick-Try Templates */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Quick Try Templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => applyTemplate("job")}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        💼 Job Application
                      </button>
                      <button
                        onClick={() => applyTemplate("meeting")}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        📅 Meeting Request
                      </button>
                      <button
                        onClick={() => applyTemplate("proposal")}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        🚀 Proposal
                      </button>
                      <button
                        onClick={() => applyTemplate("leave")}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        🏥 Leave Request
                      </button>
                    </div>
                  </div>

                  {/* Generation Form */}
                  <form onSubmit={handleWriteEmail} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Recipient Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rahul John"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Recipient Email
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. rahul@domain.com"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Purpose of Email *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. Requesting a website project discussion next Monday..."
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Additional Context (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Review finalized wireframes, meeting duration 30 mins..."
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Tone
                        </label>
                        <select
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-2 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        >
                          <option>Professional</option>
                          <option>Friendly</option>
                          <option>Formal</option>
                          <option>Persuasive</option>
                          <option>Casual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-2 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        >
                          <option>English</option>
                          <option>Hindi</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>German</option>
                          <option>Japanese</option>
                          <option>Portuguese</option>
                          <option>Chinese</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 transition-all flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Generating Draft...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>AI Write Email</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: LIVE GMAIL INBOX */}
              {activeTab === "inbox" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                        Gmail Inbox
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Most recent emails</p>
                    </div>
                    <button
                      onClick={handleRefreshInbox}
                      disabled={isFetchingInbox}
                      title="Sync Inbox"
                      className="p-2 border border-slate-200 hover:bg-slate-50 transition-colors rounded-xl text-slate-600 hover:text-slate-900 disabled:opacity-50"
                    >
                      <RotateCw className={`w-4 h-4 ${isFetchingInbox ? "animate-spin text-blue-500" : ""}`} />
                    </button>
                  </div>

                  {/* List of Incoming Emails */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {isFetchingInbox && inbox.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                        <RotateCw className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm font-medium">Reading incoming mail...</span>
                      </div>
                    ) : inboxError ? (
                      <div className="py-6 px-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                        <div className="text-xs leading-relaxed">
                          <p className="font-semibold">{inboxError}</p>
                          <p className="mt-1">Make sure you have approved the Gmail scopes in the pop-up consent dialog.</p>
                        </div>
                      </div>
                    ) : inbox.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Inbox className="w-8 h-8" />
                        <p className="text-sm">Your primary inbox is clean and empty!</p>
                      </div>
                    ) : (
                      inbox.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className={`p-3.5 border rounded-xl text-left cursor-pointer transition-all ${
                            selectedMessage?.id === msg.id
                              ? "bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-100"
                              : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[70%]">
                              {msg.from.split("<")[0].trim() || "Unknown"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                              {msg.date ? new Date(msg.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "N/A"}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate mb-1">
                            {msg.subject || "(No Subject)"}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-normal">
                            {msg.snippet}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* ACTIVE SELECTED EMAIL & REPLY GENERATION DRAWER */}
                  {selectedMessage && (
                    <motion.div
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="border-t border-slate-200 pt-4 flex flex-col gap-3 bg-white"
                    >
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-800">Reading Message:</span>
                          <button
                            onClick={() => setSelectedMessage(null)}
                            className="text-[10px] text-blue-600 hover:underline font-semibold"
                          >
                            Close
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {selectedMessage.subject}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {selectedMessage.body || selectedMessage.snippet}
                        </p>
                      </div>

                      {/* Generate Reply panel */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Reply Concept / Intent
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Decline politely, or suggest next Monday 2 PM..."
                            value={replyContext}
                            onChange={(e) => setReplyContext(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select
                              value={replyTone}
                              onChange={(e) => setReplyTone(e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:outline-none transition-all"
                            >
                              <option>Professional</option>
                              <option>Friendly</option>
                              <option>Formal</option>
                              <option>Persuasive</option>
                              <option>Casual</option>
                            </select>
                          </div>
                          <div>
                            <select
                              value={replyLanguage}
                              onChange={(e) => setReplyLanguage(e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:outline-none transition-all"
                            >
                              <option>English</option>
                              <option>Hindi</option>
                              <option>Spanish</option>
                              <option>French</option>
                              <option>German</option>
                              <option>Japanese</option>
                              <option>Portuguese</option>
                              <option>Chinese</option>
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={handleGenerateReply}
                          disabled={isGenerating}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          {isGenerating ? (
                            <>
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating suggestion...</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Generate Smart Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* TAB 3: SAVED DRAFTS */}
              {activeTab === "drafts" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                        Saved Drafts
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Cloud stored templates and custom drafts</p>
                    </div>
                    <button
                      onClick={fetchAndSetDrafts}
                      disabled={isLoadingDrafts}
                      title="Reload Drafts"
                      className="p-2 border border-slate-200 hover:bg-slate-50 transition-colors rounded-xl text-slate-600 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCw className={`w-4 h-4 ${isLoadingDrafts ? "animate-spin text-amber-500" : ""}`} />
                    </button>
                  </div>

                  {/* List of Saved Drafts */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {isLoadingDrafts && drafts.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                        <RotateCw className="w-8 h-8 animate-spin text-amber-500" />
                        <span className="text-sm font-medium">Loading saved drafts...</span>
                      </div>
                    ) : drafts.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Star className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-medium">No saved drafts yet!</p>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Save your generated emails from the Workstation editor to keep them securely in your Firestore cloud database.
                        </p>
                      </div>
                    ) : (
                    drafts.map((draftItem) => (
                        <div
                          key={draftItem.id}
                          className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl text-left hover:bg-white hover:border-slate-200 transition-all flex flex-col gap-2 relative group"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[65%]">
                              {draftItem.recipientEmail ? `${draftItem.recipient} (${draftItem.recipientEmail})` : (draftItem.recipient || "No recipient")}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStar(draftItem);
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-amber-500 transition-colors cursor-pointer"
                                title={draftItem.isStarred ? "Remove Star" : "Star Draft"}
                              >
                                <Star className={`w-3.5 h-3.5 ${draftItem.isStarred ? "fill-amber-400" : ""}`} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDraft(draftItem.id);
                                }}
                                className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {draftItem.subject || "(No Subject)"}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                            {draftItem.body}
                          </p>
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-1">
                            <span className="text-[9px] text-slate-400 font-medium">
                              {draftItem.tone} • {draftItem.language}
                            </span>
                            <button
                              onClick={() => {
                                handleLoadDraft(draftItem);
                              }}
                              className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
                            >
                              Load in Editor
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
              </div>
            )}
            </section>

            {/* RIGHT COLUMN: The Workstation Editor & Actions Toolbar (7 Cols) */}
            <section className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5 flex-1">
                {/* Header of Editor */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Email Workstation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentDraftId && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                        CLOUD ACTIVE
                      </span>
                    )}
                    {emailBody && (
                      <>
                        <button
                          onClick={handleClearEditor}
                          className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium"
                        >
                          Clear Editor
                        </button>
                        <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Draft Ready
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Email Metadata Fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 w-16 text-right">Recipient:</span>
                    <input
                      type="text"
                      placeholder="e.g. rahul@domain.com"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="flex-1 text-sm border-b border-slate-100 focus:border-blue-500 pb-1 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 w-16 text-right">Subject:</span>
                    <input
                      type="text"
                      placeholder="Email subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="flex-1 text-sm border-b border-slate-100 focus:border-blue-500 pb-1 focus:outline-none transition-colors font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Main Textarea Body Editor */}
                <div className="flex-1 flex flex-col relative min-h-[320px]">
                  <textarea
                    placeholder="Your generated draft email or raw input will appear here. You can edit directly..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full flex-1 text-sm border border-slate-200/60 rounded-xl p-4 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none leading-relaxed font-mono"
                  />
                  {isImproving && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="text-xs font-semibold text-slate-600">Polishing Draft...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Polish & Improvement Toolbar */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" /> AI Refinery
                    </span>
                    <span className="text-[10px] text-slate-400">Apply to editor draft</span>
                  </div>

                  {/* 1-Click Polish Options */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleImproveEmail("grammar")}
                      disabled={isImproving || !emailBody}
                      className="text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      ✨ Fix Grammar
                    </button>
                    <button
                      onClick={() => handleImproveEmail("shorten")}
                      disabled={isImproving || !emailBody}
                      className="text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Scissors className="w-3.5 h-3.5" /> Shorten
                    </button>
                    <button
                      onClick={() => handleImproveEmail("expand")}
                      disabled={isImproving || !emailBody}
                      className="text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Expand
                    </button>
                    <button
                      onClick={() => handleImproveEmail("clarity")}
                      disabled={isImproving || !emailBody}
                      className="text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      ⚡ Improve Clarity
                    </button>
                  </div>

                  {/* Custom instruction bar */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={isImproving || !emailBody}
                      placeholder="e.g. Add a concluding call-to-action asking for their calendar link..."
                      value={improvementInstruction}
                      onChange={(e) => setImprovementInstruction(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all"
                    />
                    <button
                      onClick={() => handleImproveEmail("custom")}
                      disabled={isImproving || !emailBody || !improvementInstruction}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Primary Action Panel */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex gap-2 sm:mr-auto">
                    <button
                      onClick={handleCopyToClipboard}
                      disabled={!emailBody}
                      title="Copy to Clipboard"
                      className="p-3 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={handleDownloadPDF}
                      disabled={!emailBody}
                      title="Download as PDF"
                      className="p-3 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      onClick={handleSaveCurrentDraft}
                      disabled={!emailBody || isSavingDraft}
                      title="Save Draft"
                      className="p-3 border border-slate-200 hover:bg-slate-50 text-amber-600 hover:text-amber-700 hover:border-amber-200 rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    >
                      {isSavingDraft ? (
                        <RotateCw className="w-4 h-4 animate-spin text-amber-500" />
                      ) : (
                        <Star className={`w-4 h-4 text-amber-500 ${currentDraftId ? "fill-amber-400" : ""}`} />
                      )}
                      <span>
                        {isSavingDraft
                          ? "Saving..."
                          : currentDraftId
                          ? "Update Draft"
                          : "Save Draft"}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => setShowConfirmSend(true)}
                    disabled={!emailBody || !emailTo || isSending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 hover:shadow-lg disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
      </main>

      {/* Footer credits with clean spacing */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 MailGenius AI. Powered by Google Gemini & Local Browser Storage.</p>
        </div>
      </footer>
    </div>
  );
}
