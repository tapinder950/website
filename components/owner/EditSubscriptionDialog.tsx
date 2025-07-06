"use client"
import { useState } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, Calendar, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGym } from "@/app/dashboards/owner/layout"
import { format, differenceInDays } from "date-fns"

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', icon: CheckCircle, color: 'text-green-600' },
  { value: 'expired', label: 'Expired', icon: XCircle, color: 'text-red-600' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-gray-600' }
]

export default function EditSubscriptionDialog({ 
  subscription, 
  onUpdated 
}: { 
  subscription: any
  onUpdated: () => void 
}) {
  const { gymId } = useGym()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    startDate: subscription.start_date,
    endDate: subscription.end_date,
    status: subscription.status
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const daysLeft = differenceInDays(new Date(formData.endDate), new Date())
  const isExpiringSoon = daysLeft <= 7 && daysLeft >= 0
  const isExpired = daysLeft < 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!gymId) {
        throw new Error("Gym ID not found. Please refresh the page and try again.")
      }

      // Security: Verify the subscription belongs to the current gym before updating
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          start_date: formData.startDate,
          end_date: formData.endDate,
          status: formData.status
        })
        .eq("id", subscription.id)
        .eq("gym_id", gymId) // Security: Only update if subscription belongs to this gym

      if (updateError) throw updateError

      setOpen(false)
      onUpdated()
    } catch (err: any) {
      setError(err.message || "Failed to update subscription")
    } finally {
      setLoading(false)
    }
  }

  const StatusIcon = STATUS_OPTIONS.find(opt => opt.value === formData.status)?.icon || CheckCircle

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <Pencil className="w-4 h-4" />
          Edit
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Subscription
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Status Preview */}
          <Card className={`border-2 ${
            isExpired ? 'bg-red-50 border-red-200' :
            isExpiringSoon ? 'bg-amber-50 border-amber-200' :
            'bg-green-50 border-green-200'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${
                    isExpired ? 'text-red-600' :
                    isExpiringSoon ? 'text-amber-600' :
                    'text-green-600'
                  }`} />
                  Subscription Status
                </h3>
                <Badge variant={
                  isExpired ? 'destructive' :
                  isExpiringSoon ? 'secondary' :
                  'default'
                }>
                  {isExpired ? `Expired ${Math.abs(daysLeft)} days ago` :
                   daysLeft === 0 ? 'Expires today' :
                   `${daysLeft} days remaining`}
                </Badge>
              </div>
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">
                    {format(new Date(formData.startDate), 'MMM dd, yyyy')} - {format(new Date(formData.endDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="outline" className="capitalize">
                    {formData.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <StatusIcon className="w-4 h-4" />
              Subscription Status
            </Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Update the subscription status based on current situation
            </p>
          </div>

          {/* Warning for dangerous actions */}
          {(formData.status === 'cancelled' || formData.status === 'expired') && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">Warning</p>
                <p className="text-amber-700">
                  Setting the status to "{formData.status}" will make this subscription inactive. 
                  The member will lose access to services associated with this subscription.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}