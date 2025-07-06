"use client"
import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { 
  QrCode, 
  Download, 
  RefreshCw,
  Printer,
  Copy,
  CheckCircle,
  Eye,
  EyeOff,
  Smartphone
} from "lucide-react"
import { saveAs } from "file-saver"
import { useGym } from "../layout"

export default function OwnerQrPage() {
  const { gymId } = useGym()
  const [qrValue, setQrValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [gymName, setGymName] = useState("")

  useEffect(() => {
    if (gymId) {
      fetchData()
    }
  }, [gymId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get gym info
      const { data: gym } = await supabase
        .from("gyms")
        .select("name")
        .eq("id", gymId)
        .single()
      
      if (gym) {
        setGymName(gym.name)
      }

      // Check for existing QR code
      const { data: qrData } = await supabase
        .from("universal_qr")
        .select("qr_value")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (qrData?.qr_value) {
        setQrValue(qrData.qr_value)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateQrCode = async () => {
    if (!gymId) return
    
    setGenerating(true)
    try {
      // Generate unique token
      const token = `GYM_${gymId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Delete existing QR codes for this gym
      await supabase
        .from("universal_qr")
        .delete()
        .eq("gym_id", gymId)

      // Insert new QR code
      const { error } = await supabase
        .from("universal_qr")
        .insert([{ 
          gym_id: gymId,
          qr_value: token 
        }])

      if (error) {
        console.error("Error creating QR code:", error)
        alert("Failed to generate QR code")
        return
      }

      setQrValue(token)
    } catch (error) {
      console.error("Error generating QR code:", error)
      alert("Failed to generate QR code")
    } finally {
      setGenerating(false)
    }
  }

  const downloadQrCode = () => {
    if (!qrValue) return

    const svg = document.querySelector('#gym-qr-code')
    if (!svg) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    
    img.onload = () => {
      canvas.width = 512
      canvas.height = 512
      ctx?.drawImage(img, 0, 0, 512, 512)
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${gymName || 'gym'}-qr-code.png`)
        }
      }, "image/png")
    }

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)))
  }

  const copyToClipboard = async () => {
    if (!qrValue) return
    
    try {
      await navigator.clipboard.writeText(qrValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const printQrCode = () => {
    if (!qrValue) return
    
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const svg = document.querySelector('#gym-qr-code')
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${gymName} QR Code</title>
          <style>
            body { 
              margin: 0; 
              padding: 40px; 
              font-family: Arial, sans-serif; 
              text-align: center; 
            }
            .qr-container { 
              display: inline-block; 
              padding: 20px; 
              border: 2px solid #ccc; 
              border-radius: 10px; 
            }
            .title { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 20px; 
              color: #333; 
            }
            .gym-name {
              font-size: 18px;
              color: #666;
              margin-bottom: 20px;
            }
            .instructions { 
              margin-top: 20px; 
              font-size: 14px; 
              color: #666; 
            }
          </style>
        </head>
        <body>
          <div class="title">Gym Check-In QR Code</div>
          <div class="gym-name">${gymName}</div>
          <div class="qr-container">
            ${svgString}
          </div>
          <div class="instructions">
            <p>Scan this QR code with your mobile device to check in/out</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.print()
    printWindow.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <QrCode className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {gymName} QR Code
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Your gym's unique QR code for member check-in/check-out
            </p>
          </CardHeader>
        </Card>

        {qrValue ? (
          <>
            {/* QR Code Display */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* QR Code */}
                  <div className="inline-block p-6 bg-white rounded-2xl shadow-lg border-4 border-gray-100">
                    <QRCodeSVG
                      id="gym-qr-code"
                      value={qrValue}
                      size={256}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>

                  {/* QR Code Info */}
                  <div className="space-y-3">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-2">
                      Active & Ready for Scanning
                    </Badge>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">QR Token:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowToken(!showToken)}
                          className="p-1"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className={`flex-1 text-xs bg-white rounded px-3 py-2 border font-mono ${
                          showToken ? "text-gray-900" : "text-transparent bg-gray-200"
                        }`}>
                          {showToken ? qrValue : "•".repeat(qrValue.length)}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyToClipboard}
                          className="flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={downloadQrCode}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    
                    <Button
                      onClick={printQrCode}
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>

                  {/* Regenerate Button */}
                  <Button
                    onClick={generateQrCode}
                    disabled={generating}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    {generating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Regenerate QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Usage Instructions */}
            <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  How to Use
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                    <div>
                      <p className="font-medium text-gray-900">Display or Print</p>
                      <p>Place this QR code at your gym entrance where members can easily scan it.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                    <div>
                      <p className="font-medium text-gray-900">Member Scanning</p>
                      <p>Members use their mobile app to scan this code for quick check-in and check-out.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                    <div>
                      <p className="font-medium text-gray-900">Automatic Tracking</p>
                      <p>All check-ins and check-outs are automatically recorded in your system.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No QR Code Generated</h3>
              <p className="text-gray-600 mb-6">Generate your gym's unique QR code to get started.</p>
              <Button
                onClick={generateQrCode}
                disabled={generating}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4 mr-2" />
                )}
                Generate QR Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}