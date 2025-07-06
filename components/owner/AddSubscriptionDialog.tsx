"use client"
import { useState } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useGym } from "@/app/dashboards/owner/layout"
import { Plus, Calendar, CreditCard, Clock, DollarSign } from "lucide-react"
import { addMonths, format } from "date-fns"

export default function AddSubscriptionDialog({ 
  member, 
  onAdded 
}: { 
  member: any
  onAdded: () => void 
}) {
  const { gymId } = useGym()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    months: 1,
    startDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "credit_card",
    note: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const calculateEndDate = (start: string, months: number) => {
    const startDate = new Date(start)
    const endDate = addMonths(startDate, months)
    endDate.setDate(endDate.getDate() - 1)
    return endDate.toISOString().split("T")[0]
  }

  const endDate = calculateEndDate(formData.startDate, formData.months)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!gymId) {
        throw new Error("Gym ID not found. Please refresh the page and try again.")
      }

      if (!formData.amount || Number(formData.amount) <= 0) {
        throw new Error("Please enter a valid payment amount.")
      }

      // Get current user to check RLS permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Create subscription payment record in the payments table
      const paymentData = {
        gym_id: gymId,
        amount: Number(formData.amount),
        currency: "USD",
        payment_type: "subscription",
        payment_method: formData.paymentMethod, // User-selected payment method
        payment_status: "completed",
        payment_date: new Date().toISOString(),
        description: `${formData.months} month subscription for ${member.name}`,
        metadata: {
          member_id: member.id,
          member_name: member.name,
          months_added: formData.months,
          start_date: formData.startDate,
          end_date: endDate,
          note: formData.note || ""
        }
      }

      console.log('Attempting to insert payment:', paymentData)
      
      const { data: paymentResult, error: paymentError } = await supabase
        .from("payments")
        .insert([paymentData])
        .select()

      if (paymentError) {
        console.error('Payment insert error:', paymentError)
        
        // If payments table has RLS issues, try using subscription_payments table as fallback
        console.log('Trying alternative approach with subscription_payments table...')
        
        // First create a subscription record
        const { data: subscription, error: subError } = await supabase
          .from("subscriptions")
          .insert([{
            gym_id: gymId,
            plan_name: `${formData.months} Month Plan`,
            plan_price: Number(formData.amount),
            billing_cycle: "monthly",
            start_date: formData.startDate,
            end_date: endDate,
            status: "active"
          }])
          .select()
          .single()

        if (subError) {
          throw new Error(`Failed to create subscription: ${subError.message}. Original payment error: ${paymentError.message}`)
        }

        // Then create subscription payment with member info in note
        const { error: subPaymentError } = await supabase
          .from("subscription_payments")
          .insert([{
            subscription_id: subscription.id,
            paid_on: new Date().toISOString().split('T')[0],
            amount: Number(formData.amount),
            months_added: formData.months,
            note: `Member: ${member.name} (ID: ${member.id}). ${formData.note || ''}`
          }])

        if (subPaymentError) {
          throw new Error(`Failed to create subscription payment: ${subPaymentError.message}`)
        }
        
        console.log('Successfully created subscription using alternative method')
      } else {
        console.log('Payment created successfully:', paymentResult)
      }

      // Reset form and close dialog
      setFormData({
        months: 1,
        startDate: new Date().toISOString().split("T")[0],
        amount: "",
        paymentMethod: "credit_card",
        note: ""
      })
      setOpen(false)
      onAdded()
    } catch (err: any) {
      setError(err.message || "Failed to add subscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Subscription
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Subscription for {member.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-blue-900">Subscription Preview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800">
                    {format(new Date(formData.startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {formData.months} month{formData.months !== 1 ? 's' : ''}
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
                className="w-full"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="months" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration (Months)
              </Label>
              <Input
                id="months"
                type="number"
                min={1}
                max={60}
                value={formData.months}
                onChange={e => setFormData(prev => ({ ...prev, months: Number(e.target.value) }))}
                required
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Amount ($)
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter payment amount"
                className="w-full"
                required
              />
              <p className="text-xs text-red-500">Payment amount is required</p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={value => setFormData(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="note">Notes (Optional)</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Add any additional notes about this subscription..."
              rows={3}
              className="w-full resize-none"
            />
          </div>

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
                  Adding...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Add Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}