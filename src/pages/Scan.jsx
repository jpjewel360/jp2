import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Scan() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [itemData, setItemData] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    return () => { stopScannerSilently() }
  }, [])

  async function stopScannerSilently() {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop() } catch {}
      try { html5QrRef.current.clear() } catch {}
      html5QrRef.current = null
    }
  }

  async function startScan() {
    setResult(null); setItemData(null); setNotFound(false)
    isProcessingRef.current = false

    // Clean up any existing scanner instance first
    await stopScannerSilently()

    setScanning(true)

    try {
      html5QrRef.current = new Html5Qrcode('qr-reader')
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          // Guard: ignore duplicate callbacks during stop sequence
          if (isProcessingRef.current) return
          isProcessingRef.current = true

          await stopScannerSilently()
          setScanning(false)
          setResult(decodedText)
          lookupSerial(decodedText)
        },
        () => {}
      )
    } catch {
      toast.error('Camera access denied or not available')
      setScanning(false)
    }
  }

  async function stopScan() {
    await stopScannerSilently()
    setScanning(false)
  }

  function resetScan() {
    setResult(null)
    setItemData(null)
    setNotFound(false)
    isProcessingRef.current = false
  }

  async function lookupSerial(serial) {
    const { data } = await supabase
      .from('inventory_items')
      .select('*, product_types(name)')
      .eq('serial_number', serial)
      .single()
    if (data) setItemData(data)
    else setNotFound(true)
  }

  async function handleManualLookup(e) {
    e.preventDefault()
    if (!result) return
    setItemData(null); setNotFound(false)
    lookupSerial(result.trim().toUpperCase())
  }

  return (
    <div className="p-8 fade-up max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-[#f5ead8]">Scan QR Code</h1>
        <p className="text-[#4a3c2a] text-sm mt-1">Scan a jewellery item's QR code to look it up</p>
      </div>

      {/* Scanner */}
      <div className="card p-6 mb-6">
        <div id="qr-reader" className={`rounded-lg overflow-hidden mb-4 ${!scanning ? 'hidden' : ''}`} ref={scannerRef} />

        {!scanning ? (
          <div className="flex gap-3">
            <button onClick={startScan} className="btn-gold flex-1 flex items-center justify-center gap-2 py-3">
              <QrCode size={16} /> Start Camera Scan
            </button>
            {(itemData || notFound) && (
              <button onClick={resetScan} className="btn-ghost flex items-center justify-center gap-2 px-4 py-3">
                <RotateCcw size={16} /> Scan Again
              </button>
            )}
          </div>
        ) : (
          <button onClick={stopScan} className="btn-ghost w-full flex items-center justify-center gap-2 py-3">
            Stop Scanning
          </button>
        )}
      </div>

      {/* Manual Serial Input */}
      <div className="card p-6 mb-6">
        <h3 className="text-xs text-[#6b5a42] uppercase tracking-wider mb-3">Or enter serial manually</h3>
        <form onSubmit={handleManualLookup} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. RNG-0001"
            value={result ?? ''}
            onChange={e => { setResult(e.target.value); setItemData(null); setNotFound(false) }}
          />
          <button type="submit" className="btn-gold px-4">Look Up</button>
        </form>
      </div>

      {/* Result */}
      {itemData && (
        <div className="card p-6 fade-up">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-green-400 text-sm font-medium">Item Found</span>
          </div>
          <div className="space-y-3">
            <Row label="Serial" value={<span className="font-mono text-gold-400">{itemData.serial_number}</span>} />
            <Row label="Category" value={itemData.product_types?.name} />
            <Row label="Weight" value={`${itemData.weight_grams}g`} />
            <Row label="Purchase Price" value={`₹${Number(itemData.purchase_price).toLocaleString('en-IN')}`} />
            <Row label="Status" value={
              <span className={
                itemData.status === 'available' ? 'badge-available' :
                itemData.status === 'sold' ? 'badge-sold' : 'badge-audit'
              }>{itemData.status}</span>
            } />
            {itemData.notes && <Row label="Notes" value={itemData.notes} />}
          </div>
        </div>
      )}

      {notFound && (
        <div className="card p-6 fade-up">
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">Serial number not found in inventory</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1a1208] last:border-0">
      <span className="text-xs text-[#4a3c2a] uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[#f5ead8]">{value}</span>
    </div>
  )
}
