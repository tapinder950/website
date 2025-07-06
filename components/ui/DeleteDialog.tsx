"use client"
import { useState } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export default function DeleteDialog({
  onConfirm,
  label = "Item",
  children,
}: {
  onConfirm: () => Promise<void> | void
  label?: string
  children?: React.ReactNode // optional, for custom trigger if needed
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    setError("")
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err: any) {
      setError(err?.message || "Delete failed")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            title={`Delete ${label}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          Are you sure you want to delete this {label.toLowerCase()}? This action cannot be undone.
        </div>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
