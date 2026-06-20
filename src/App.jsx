import React, { useState, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Plus,
  Trash2,
  FileText,
  Send,
  Wrench,
  IndianRupee,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── helpers ──────────────────────────────────────────────────────────────────

const speak = (text) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
};

const newRow = () => ({ id: Date.now(), description: "", cost: "" });

const formatINR = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── VoiceButton ───────────────────────────────────────────────────────────────

function VoiceButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      alert("Use Chrome and allow microphone permission");
      return;
    }

    const rec = new SR();
    recRef.current = rec;

    rec.lang = "en-IN";

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      console.log("Voice:", text);

      if (text) {
        setTimeout(() => {
          onResult(text);
        }, 0);
      }
    };

    rec.onerror = (e) => {
      console.log("Mic error:", e.error);
      setListening(false);
    };

    rec.onend = () => setListening(false);

    rec.start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Stop listening" : "Tap and speak"}
      className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 flex-shrink-0
        ${
          listening
            ? "bg-red-500 text-white mic-pulse shadow-lg shadow-red-500/40"
            : "bg-zinc-700 text-zinc-300 hover:bg-orange-500 hover:text-white"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {listening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}

// ── SpeakButton ───────────────────────────────────────────────────────────────

function SpeakButton({ text }) {
  const [active, setActive] = useState(false);

  const handleSpeak = () => {
    if (!text) return;
    setActive(true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 0.85;
    u.onend = () => setActive(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      disabled={!text}
      title="Listen to this"
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 flex-shrink-0
        ${active ? "bg-green-500 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-green-500 hover:text-white"}
        ${!text ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <Volume2 size={18} />
    </button>
  );
}

// ── BillRow ───────────────────────────────────────────────────────────────────

function BillRow({ row, index, onChange, onDelete }) {
  const handleVoiceResult = (text) => {
    onChange(row.id, "description", text);
    speak(text); // auto-read back
  };

  return (
    <div className="fade-in flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50 group">
      {/* Row number */}
      <span className="text-zinc-500 text-sm font-mono w-6 shrink-0 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Description input */}
      <input
        type="text"
        value={row.description}
        onChange={(e) => onChange(row.id, "description", e.target.value)}
        className="flex-1 min-w-0 bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm border border-zinc-700"
      />
      {/* Mic */}
      <VoiceButton onResult={handleVoiceResult} />

      {/* Speaker */}
      <SpeakButton text={row.description} />

      {/* Cost input */}
      <div className="relative w-full sm:w-28">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
          ₹
        </span>
        <input
          type="number"
          placeholder="0"
          value={row.cost}
          onChange={(e) => onChange(row.id, "cost", e.target.value)}
          className="w-28 bg-zinc-900 text-white placeholder-zinc-600 rounded-lg pl-7 pr-3 py-2 text-sm border border-zinc-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition"
        />
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(row.id)}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ── PDF Preview Modal ─────────────────────────────────────────────────────────

function PDFPreview({ pdfUrl, onClose, onSend }) {
  // const [phone, setPhone] = useState(customerPhone || "");

  const handleSend = async () => {
    const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());

    const file = new File([pdfBlob], "KGN-Bill.pdf", {
      type: "application/pdf",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "KGN AutoWorks Bill",
        text: "Thank you for choosing KGN AutoWorks.",
      });
    } else {
      alert("Sharing is not supported on this device.");
    }

    onSend();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FileText size={18} className="text-orange-400" />
            Bill Preview
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* PDF iframe */}
        <div className="flex-1 overflow-hidden p-4">
          <iframe
            src={pdfUrl}
            title="Bill Preview"
            className="w-full h-full rounded-xl border border-zinc-700"
            style={{ minHeight: "400px" }}
          />
        </div>

        {/* WhatsApp section */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <p className="text-zinc-400 text-sm text-center">
            Bill is ready. Tap below to share it.
          </p>
          <div className="flex gap-2">
            {/* <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                +91
              </span>
              <input
                type="tel"
                placeholder="Customer mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={15}
                className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-xl pl-10 pr-3 py-3 border border-zinc-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition"
              />
            </div> */}
            <button
              onClick={handleSend}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-green-900/30"
            >
              <Send size={18} />
              Share Bill
            </button>
          </div>
          <p className="text-zinc-600 text-xs text-center">
            Choose WhatsApp from the Share menu.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [customerName, setCustomerName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // ── row operations
  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const deleteRow = (id) => {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== id),
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, newRow()]);
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  // ── total
  const total = rows.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);

  // ── generate PDF
  const generatePDF = () => {
    const validRows = rows.filter((r) => r.description || r.cost);
    if (!validRows.length) {
      speak("Please add at least one item to the bill");
      alert("Please add at least one item!");
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();

    // Header bg
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, W, 130, "F");

    // Orange accent bar
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 6, 130, "F");

    // Shop name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text("KGN AutoWorks", 30, 52);

    // Tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(180, 180, 180);
    doc.text("Two Wheeler Service & Repairs", 30, 70);

    // Date & Bill no
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const billNo = `KGN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text(`Bill No: ${billNo}`, W - 30, 42, { align: "right" });
    doc.text(`Date: ${dateStr}`, W - 30, 56, { align: "right" });

    // Customer info
    if (customerName || vehicleNo) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(30, 145, W - 60, 50, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      if (customerName) {
        doc.text("Customer:", 45, 165);

        doc.setFont("helvetica", "bold");
        doc.text(customerName.toUpperCase(), 110, 165);
      }
      if (vehicleNo) {
        doc.setFont("helvetica", "bold");
        doc.text("Vehicle No:", 45, 182);
        doc.setFont("helvetica", "normal");
        doc.text(vehicleNo.toUpperCase(), 115, 182);
      }
    }

    const tableStartY = customerName || vehicleNo ? 215 : 155;

    // Table
    autoTable(doc, {
      startY: tableStartY,
      head: [["#", "Description", "Amount (₹)"]],
      body: validRows.map((r, i) => [
        i + 1,
        r.description || "-",
        formatINR(r.cost || 0),
      ]),
      foot: [["", "TOTAL", formatINR(total)]],
      margin: { left: 30, right: 30 },
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
        halign: "left",
      },
      bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
      footStyles: {
        fillColor: [20, 20, 20],
        textColor: [249, 115, 22],
        fontStyle: "bold",
        fontSize: 12,
      },
      columnStyles: {
        0: {
          cellWidth: 30,
          halign: "center",
        },
        2: {
          cellWidth: 100,
          halign: "right",
        },
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { cellPadding: 8 },
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for trusting KGN AutoWorks!", W / 2, finalY, {
      align: "center",
    });

    // Orange bottom line
    doc.setFillColor(249, 115, 22);
    doc.rect(0, doc.internal.pageSize.getHeight() - 6, W, 6, "F");

    const pdfBlob = doc.output("blob");

    const pdfUrl = URL.createObjectURL(pdfBlob);

    setPdfUrl(pdfUrl);
    setShowPreview(true);
    speak("Bill is ready. Please check and send.");
  };

  // ── voice for customer name
  const handleCustomerVoice = (text) => {
    setCustomerName(text);
    speak(text);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Top Header ── */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10 shadow-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wrench size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">
              KGN AutoWorks
            </h1>
            <p className="text-zinc-500 text-xs">
              Two Wheeler Service & Repairs
            </p>
          </div>
          <div className="ml-auto">
            <span className="bg-orange-500/10 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full border border-orange-500/20">
              New Bill
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ── Customer Info ── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
            Customer Details
          </h2>

          {/* Customer name */}
          <div className="space-y-1">
            <label className="text-zinc-500 text-xs">Customer Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 bg-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 border border-zinc-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition"
              />
              <VoiceButton onResult={handleCustomerVoice} />
              <SpeakButton text={customerName} />
            </div>
          </div>

          {/* Vehicle number */}
          {/* <div className="space-y-1">
            <label className="text-zinc-500 text-xs">
              Vehicle Number (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TN 01 AB 1234"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 border border-zinc-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition uppercase"
            />
          </div> */}
        </section>

        {/* ── Bill Items ── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
              Work Done
            </h2>
            <span className="text-zinc-600 text-xs">
              {rows.length} item{rows.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-zinc-600 text-xs px-1">
            <span className="w-5"></span>
            <span className="flex-1">Description</span>
            <span className="w-10 text-center">🎤</span>
            <span className="w-10 text-center">🔊</span>
            <span className="w-28 text-center">Cost</span>
            <span className="w-8"></span>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row, i) => (
              <BillRow
                key={row.id}
                row={row}
                index={i}
                onChange={updateRow}
                onDelete={deleteRow}
              />
            ))}
          </div>

          {/* Add row */}
          <button
            onClick={addRow}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-500 hover:border-orange-500 hover:text-orange-400 transition font-medium text-sm"
          >
            <Plus size={16} />
            Add Another Item
          </button>
        </section>

        {/* ── Total ── */}
        <section className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-5 flex items-center justify-between shadow-xl shadow-orange-900/30">
          <div>
            <p className="text-orange-100 text-sm font-medium">Total Amount</p>
            <p className="text-white text-xs mt-0.5 opacity-70">
              {rows.filter((r) => r.cost).length} item
              {rows.filter((r) => r.cost).length !== 1 ? "s" : ""} charged
            </p>
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-3xl leading-tight">
              ₹ {formatINR(total)}
            </p>
          </div>
        </section>

        {/* ── Generate Bill Button ── */}
        <button
          onClick={generatePDF}
          className="w-full flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-orange-500 text-white py-4 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg group"
        >
          <FileText
            size={20}
            className="text-orange-400 group-hover:scale-110 transition-transform"
          />
          Generate Bill & Preview PDF
        </button>

        {/* ── Help tips ── */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-4 space-y-2">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            How to use
          </p>
          <div className="space-y-1.5 text-xs text-zinc-600">
            <p>
              🎤{" "}
              <span className="text-zinc-500">
                Tap mic, speak the work name → auto fills
              </span>
            </p>
            <p>
              🔊{" "}
              <span className="text-zinc-500">
                Tap speaker to hear the name read aloud
              </span>
            </p>
            <p>
              ₹{" "}
              <span className="text-zinc-500">
                Type the price in the cost box
              </span>
            </p>
            <p>
              📄{" "}
              <span className="text-zinc-500">
                Press "Generate Bill" → preview → send via WhatsApp
              </span>
            </p>
          </div>
        </div>

        <div className="h-8" />
      </main>

      {/* ── PDF Preview Modal ── */}
      {showPreview && pdfUrl && (
        <PDFPreview
          pdfUrl={pdfUrl}
          onClose={() => setShowPreview(false)}
          onSend={() => setShowPreview(false)}
          // customerPhone=""
        />
      )}
    </div>
  );
}
