"use client"
import { useState } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Pencil, User, Phone, Mail, MapPin, Briefcase, Calendar, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGym } from "@/app/dashboards/owner/layout"
import { format } from "date-fns"

interface StaffData {
  id: string
  name: string
  email: string
  phone_number: string
  address: string
  role?: string
  department?: string
  salary?: number
  hire_date?: string
  status?: 'active' | 'inactive' | 'on_leave'
  notes?: string
  created_at: string
}

export default function EditStaffDialog({ 
  staff, 
  onUpdated 
}: { 
  staff: StaffData
  onUpdated: () => void 
}) {
  const { gymId } = useGym()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: staff.name || "",
    email: staff.email || "",
    phone_number: staff.phone_number || "",
    address: staff.address || "",
    role: staff.role || "staff",
    department: staff.department || "",
    salary: staff.salary?.toString() || "",
    hire_date: staff.hire_date || new Date().toISOString().split('T')[0],
    status: staff.status || "active",
    notes: staff.notes || "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!gymId) {
        throw new Error("Gym ID not found. Please refresh the page and try again.")
      }

      const updateData = {
        name: form.name,
        email: form.email,
        phone_number: form.phone_number,
        address: form.address,
        role: form.role,
        department: form.department || null,
        salary: form.salary ? parseFloat(form.salary) : null,
        hire_date: form.hire_date,
        status: form.status,
        notes: form.notes || null,
        updated_at: new Date().toISOString()
      }

      // Security: Verify the staff member belongs to the current gym before updating
      const { error: updateError } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", staff.id)
        .eq("gym_id", gymId) // Security: Only update if staff belongs to this gym

      if (updateError) throw updateError

      setOpen(false)
      onUpdated()
    } catch (err: any) {
      setError(err.message || "Failed to update staff member")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'on_leave': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-blue-50">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Pencil className="w-5 h-5" />
            Edit Staff Member
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getStatusColor(form.status)}>
              {form.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-sm text-gray-500">
              Member since {format(new Date(staff.created_at), 'MMM dd, yyyy')}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-blue-900">
                <User className="w-4 h-4" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-900">
                <Phone className="w-4 h-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="text-sm font-medium">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-phone"
                    name="phone_number"
                    placeholder="Enter phone number"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address" className="text-sm font-medium">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-address"
                    name="address"
                    placeholder="Enter address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    className="bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-900">
                <Briefcase className="w-4 h-4" />
                Professional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Role/Position</Label>
                  <Select value={form.role} onValueChange={(value) => handleSelectChange('role', value)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department" className="text-sm font-medium">Department</Label>
                  <Input
                    id="edit-department"
                    name="department"
                    placeholder="Enter department"
                    value={form.department}
                    onChange={handleChange}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={form.status} onValueChange={(value) => handleSelectChange('status', value)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-salary" className="text-sm font-medium">
                    Salary (₹)
                  </Label>
                  <Input
                    id="edit-salary"
                    name="salary"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter salary amount"
                    value={form.salary}
                    onChange={handleChange}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hire-date" className="text-sm font-medium">
                    Hire Date
                  </Label>
                  <Input
                    id="edit-hire-date"
                    name="hire_date"
                    type="date"
                    value={form.hire_date}
                    onChange={handleChange}
                    className="bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Additional Information
              </h3>
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  placeholder="Add any additional notes about this staff member..."
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  className="bg-white resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-4 border-t">
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
              className="flex items-center gap-2 min-w-32"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
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