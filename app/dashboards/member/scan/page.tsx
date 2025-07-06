"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Camera, 
  CameraOff, 
  RotateCcw,
  AlertTriangle,
  Clock,
  Smartphone,
  QrCode,
  User
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface ScanState {
  scanning: boolean
  error: string | null
  scanResult: string | null
  status: string | null
  statusType: "success" | "error" | "processing" | null
  checkInType: "check_in" | "check_out" | null
}

interface MemberData {
  id: string
  gym_id: string
  name: string
  email?: string
  gym_name?: string
}

interface SessionData {
  id: string
  check_in: string
  check_out?: string
}

export default function MemberQRScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<any>(null)
  const [scanState, setScanState] = useState<ScanState>({
    scanning: false,
    error: null,
    scanResult: null,
    status: null,
    statusType: null,
    checkInType: null
  })
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt")
  const [deviceCount, setDeviceCount] = useState(0)
  const [currentDevice, setCurrentDevice] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  const [member, setMember] = useState<MemberData | null>(null)
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch member data
  useEffect(() => {
    fetchMemberData()
  }, [])

  // Debug effect to track member state changes
  useEffect(() => {
    console.log("Member state changed:", { 
      member: !!member, 
      memberId: member?.id, 
      gymId: member?.gym_id,
      memberName: member?.name,
      loading,
      hasError: !!scanState.error 
    })
    if (member === null && !loading) {
      console.log("⚠️ Member became null while not loading!")
      console.trace("Member null stack trace:")
    }
  }, [member, loading, scanState.error])

  // Function to refresh session data
  const refreshSessionData = useCallback(async (memberId?: string) => {
    const memberIdToUse = memberId || member?.id
    if (!memberIdToUse) return
    const { data: session } = await supabase
      .from("checkins")
      .select("id, check_in, check_out")
      .eq("member_id", memberIdToUse)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1)
      .maybeSingle()
    setCurrentSession(session)
  }, [member?.id])

  const fetchMemberData = async () => {
    setLoading(true)
    try {
      setScanState(prev => ({ ...prev, error: null }))
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setScanState(prev => ({ 
          ...prev, 
          error: "Please log in to use QR scanning" 
        }))
        setMember(null)
        setCurrentSession(null)
        return
      }

      // Fetch member row for user
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, gym_id, name, email")
        .eq("user_id", user.id)
        .single()
      if (memberError) {
        setScanState(prev => ({ 
          ...prev, 
          error: `Failed to load member profile: ${memberError.message}` 
        }))
        setMember(null)
        setCurrentSession(null)
        return
      }
      if (!memberData) {
        setScanState(prev => ({ 
          ...prev, 
          error: "Member profile not found. Please contact support." 
        }))
        setMember(null)
        setCurrentSession(null)
        return
      }

      // Get gym name if gym_id exists
      let gymName = ""
      if (memberData.gym_id) {
        try {
          const { data: gymData } = await supabase
            .from("gyms")
            .select("name")
            .eq("id", memberData.gym_id)
            .single()
          gymName = gymData?.name || ""
        } catch {}
      }
      const memberWithGym = { ...memberData, gym_name: gymName }
      setMember(memberWithGym)

      // Fetch current session
      if (memberData.id) {
        const { data: session } = await supabase
          .from("checkins")
          .select("id, check_in, check_out")
          .eq("member_id", memberData.id)
          .is("check_out", null)
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle()
        setCurrentSession(session)
      }
    } catch (error: any) {
      setScanState(prev => ({ 
        ...prev, 
        error: `Unexpected error: ${error.message}` 
      }))
    } finally {
      setLoading(false)
    }
  }

  const retryMemberData = () => fetchMemberData()

  const requestCameraPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraPermission("granted")
      return true
    } catch (error) {
      setCameraPermission("denied")
      setScanState(prev => ({ 
        ...prev, 
        error: "Camera access denied. Please enable camera permissions in your browser settings." 
      }))
      return false
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (!member || !member.id || !member.gym_id) {
      setScanState(prev => ({ 
        ...prev, 
        error: "Member data not loaded. Please refresh the page and try again." 
      }))
      return
    }
    setScanState(prev => ({ 
      ...prev, 
      error: null, 
      status: null, 
      statusType: null, 
      scanning: true 
    }))
    setScanProgress(0)

    try {
      const hasPermission = await requestCameraPermission()
      if (!hasPermission) return

      const codeReader = new BrowserMultiFormatReader()
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      setDeviceCount(devices.length)
      if (devices.length === 0) {
        setScanState(prev => ({ 
          ...prev, 
          error: "No cameras found on this device.", 
          scanning: false 
        }))
        return
      }
      const deviceId = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rear")
      )?.deviceId || devices[currentDevice]?.deviceId

      // Progress bar simulation
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + 2
        })
      }, 100)

      controlsRef.current = await codeReader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result, err) => {
          if (result) {
            clearInterval(progressInterval)
            setScanProgress(100)
            setScanState(prev => ({ 
              ...prev, 
              scanResult: result.getText(), 
              scanning: false 
            }))
            controlsRef.current?.stop()
            handleCheckInOut(result.getText())
          }
          if (err && err.name !== "NotFoundException") {
            console.warn("Scan warning:", err.message)
          }
        }
      )
    } catch (error: any) {
      setScanState(prev => ({ 
        ...prev, 
        error: error.message || "Camera initialization failed.", 
        scanning: false 
      }))
    }
  }, [currentDevice, requestCameraPermission, member])

const handleCheckInOut = async (qrText: string) => {
  try {
    setScanState(prev => ({ 
      ...prev, 
      status: "Verifying QR code...", 
      statusType: "processing" 
    }))
    if (!member) throw new Error("Member data not loaded. Please refresh and try again.")
    if (!member.gym_id) throw new Error("Member is not assigned to a gym. Please contact support.")

    // Verify QR code belongs to the member's gym
    const { data: universalQR, error: qrError } = await supabase
      .from("universal_qr")
      .select("qr_value, gym_id")
      .eq("gym_id", member.gym_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (qrError || !universalQR) throw new Error("No valid QR code found for your gym. Please contact gym staff.")
    if (universalQR.qr_value !== qrText) throw new Error("Invalid QR code. Please scan your gym's official QR code.")

    const now = new Date().toISOString()

    // Always fetch the latest session
    const { data: openSession } = await supabase
      .from("checkins")
      .select("id, check_in, check_out")
      .eq("member_id", member.id)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!openSession) {
      // CHECK IN
      setScanState(prev => ({ 
        ...prev, 
        status: "Creating check-in record...", 
        statusType: "processing" 
      }))
      const { data: newCheckin, error: insertError } = await supabase
        .from("checkins")
        .insert([{
          member_id: member.id,
          check_in: now,
          check_out: null
        }])
        .select("id, check_in, check_out")
        .single()
      if (insertError) throw new Error("Failed to record check-in. Please try again.")
      setScanState(prev => ({ 
        ...prev, 
        status: `Welcome ${member.name}! You're checked in and ready to workout! 💪`, 
        statusType: "success",
        checkInType: "check_in"
      }))
      setCurrentSession(newCheckin)
      return
    }

    // If here, openSession exists, so CHECK OUT:
    setScanState(prev => ({ 
      ...prev, 
      status: "Recording check-out...", 
      statusType: "processing" 
    }))
    const { data: updatedCheckin, error: updateError } = await supabase
      .from("checkins")
      .update({ check_out: now })
      .eq("id", openSession.id)
      .eq("member_id", member.id)
      .select("id, check_in, check_out")
      .single()
    if (updateError) throw new Error("Failed to record check-out. Please try again.")

    // Immediately check if there is still an open session in DB
    const { data: sessionAfterUpdate } = await supabase
      .from("checkins")
      .select("id, check_in, check_out")
      .eq("member_id", member.id)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1)
      .maybeSingle()

    // If sessionAfterUpdate is null, check-out worked. If not, something is wrong.
    if (!sessionAfterUpdate) {
      // Session closed
      const sessionDuration = Math.round(
        (new Date(now).getTime() - new Date(openSession.check_in).getTime()) / (1000 * 60)
      )
      setScanState(prev => ({ 
        ...prev, 
        status: `Great workout ${member.name}! You trained for ${sessionDuration} minutes. See you next time! 👋`, 
        statusType: "success",
        checkInType: "check_out"
      }))
      setCurrentSession(null)
    } else {
      // Session still open: show error!
      setScanState(prev => ({ 
        ...prev, 
        status: "Check-out failed! Please contact support.", 
        statusType: "error"
      }))
      setCurrentSession(sessionAfterUpdate)
    }
  } catch (error: any) {
    setScanState(prev => ({ 
      ...prev, 
      status: error.message || "An error occurred during check-in/out.", 
      statusType: "error" 
    }))
  }
}

  const resetScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop()
    }
    setScanState({
      scanning: false,
      error: null,
      scanResult: null,
      status: null,
      statusType: null,
      checkInType: null
    })
    setScanProgress(0)
  }

  const switchCamera = () => {
    if (deviceCount > 1) {
      resetScanner()
      setCurrentDevice(prev => (prev + 1) % deviceCount)
    }
  }

  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop()
      }
    }
  }, [])

  const getStatusIcon = () => {
    switch (scanState.statusType) {
      case "success":
        return <CheckCircle className="w-8 h-8 text-green-600" />
      case "error":
        return <XCircle className="w-8 h-8 text-red-500" />
      case "processing":
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading member data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">

        {/* Header Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <QrCode className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Gym Check-In
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              {currentSession 
                ? "Scan your gym's QR code to check out" 
                : "Scan your gym's QR code to start your workout"}
            </p>
          </CardHeader>
        </Card>

        {/* Member Status Card */}
        {member && member.id ? (
          <Card className={cn(
            "shadow-lg border-0 backdrop-blur-sm",
            member.gym_id ? "bg-white/80" : "bg-yellow-50 border-yellow-200"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    member.gym_id 
                      ? "bg-gradient-to-br from-green-400 to-blue-500" 
                      : "bg-yellow-400"
                  )}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">
                      {member.gym_id ? (member.gym_name || "Gym Member") : "No gym assigned"}
                    </p>
                    {member.gym_id ? (
                      <p className="text-xs text-gray-600">
                        {currentSession 
                          ? `Checked in at ${format(new Date(currentSession.check_in), 'h:mm a')}`
                          : "Ready to check in"
                        }
                      </p>
                    ) : (
                      <p className="text-xs text-yellow-700">Contact support to assign gym</p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant="outline"
                  className={cn(
                    "font-medium",
                    member.gym_id 
                      ? (currentSession 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-gray-50 text-gray-700 border-gray-200")
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  )}
                >
                  {member.gym_id 
                    ? (currentSession ? "Active" : "Inactive")
                    : "No Gym"
                  }
                </Badge>
              </div>
              
              {currentSession && member.gym_id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      Session time: {Math.round(
                        (Date.now() - new Date(currentSession.check_in).getTime()) / (1000 * 60)
                      )} minutes
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-0 bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium">Member data not available</p>
              <p className="text-red-600 text-sm">Please check debug page or contact support</p>
            </CardContent>
          </Card>
        )}

        {/* Scanner Card */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6">

            {/* Error Display */}
            {scanState.error && !scanState.status && (
              <div className="text-center py-8">
                <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-orange-700 mb-2">Error</h3>
                <p className="text-sm text-orange-600 mb-6 bg-orange-50 p-3 rounded-lg">
                  {scanState.error}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={retryMemberData}
                    variant="outline"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Loading
                  </Button>
                  <Button 
                    onClick={resetScanner}
                    variant="outline"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    Reset Scanner
                  </Button>
                </div>
              </div>
            )}

            {/* Camera Permission Denied */}
            {cameraPermission === "denied" && !scanState.error && (
              <div className="text-center py-8">
                <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Camera Access Required</h3>
                <p className="text-sm text-red-600 mb-4">
                  Please enable camera permissions in your browser settings to use QR scanning.
                </p>
                <Button 
                  onClick={() => {
                    setCameraPermission("prompt")
                    setScanState(prev => ({ ...prev, error: null }))
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Member missing gym_id message */}
            {member && member.id && !member.gym_id && !scanState.error && (
              <div className="text-center py-8">
                <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-700 mb-2">Gym Assignment Required</h3>
                <p className="text-sm text-yellow-600 mb-4 bg-yellow-50 p-3 rounded-lg">
                  Your member account is not assigned to a gym. Please contact support to assign you to a gym before using QR scanning.
                </p>
              </div>
            )}

            {/* Scanner Interface */}
            {(!loading && member && member.id && member.gym_id && cameraPermission !== "denied" && !scanState.error && !scanState.status) ? (
              <div className="space-y-4">
                {!scanState.scanning ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Scan</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Position your gym's QR code within the camera frame
                    </p>
                    <Button 
                      onClick={startScanner}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Start Scanning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Video Preview */}
                    <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 object-cover"
                      />
                      {/* Scanning Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-white rounded-2xl relative">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <Progress value={scanProgress} className="h-2 bg-black/50" />
                      </div>
                    </div>
                    {/* Scanning Status */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
                        <Loader2 className="animate-spin w-5 h-5" />
                        <span className="font-medium">Scanning for QR code...</span>
                      </div>
                      <div className="flex gap-2 justify-center">
                        {deviceCount > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={switchCamera}
                            className="flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Switch Camera
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetScanner}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Result Display */}
            {scanState.status && (
              <div className="text-center py-8">
                <div className="mb-4">
                  {getStatusIcon()}
                </div>
                <div className={cn(
                  "rounded-xl py-6 px-4 mb-6 border-2",
                  scanState.statusType === "success" 
                    ? "bg-green-50 border-green-200" 
                    : scanState.statusType === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
                )}>
                  <h3 className={cn(
                    "font-bold text-lg mb-2",
                    scanState.statusType === "success" ? "text-green-800" :
                    scanState.statusType === "error" ? "text-red-800" : "text-blue-800"
                  )}>
                    {scanState.checkInType === "check_in" ? "Check-In Successful!" :
                     scanState.checkInType === "check_out" ? "Check-Out Complete!" :
                     scanState.statusType === "error" ? "Something went wrong" : "Processing..."}
                  </h3>
                  <p className={cn(
                    "text-sm leading-relaxed",
                    scanState.statusType === "success" ? "text-green-700" :
                    scanState.statusType === "error" ? "text-red-700" : "text-blue-700"
                  )}>
                    {scanState.status}
                  </p>
                </div>
                {scanState.statusType !== "processing" && (
                  <Button
                    onClick={resetScanner}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg"
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    Scan Again
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Card */}
        {!scanState.error && (
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Scanning Tips</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Ensure good lighting for better scanning</li>
                    <li>• Keep your device steady while scanning</li>
                    <li>• Position the QR code within the frame</li>
                    <li>• Works best on mobile devices with rear camera</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
