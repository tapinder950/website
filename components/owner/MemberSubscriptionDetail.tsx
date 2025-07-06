"use client"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import AddSubscriptionDialog from "./AddSubscriptionDialog"
import EditSubscriptionDialog from "./EditSubscriptionDialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { differenceInDays, isAfter } from "date-fns"
import { supabase } from "@/lib/supabase"

export default function MemberSubscriptionDetail({ member }: { member: any }) {
  const [subs, setSubs] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    fetchData()
  }, [member, refresh])

  const fetchData = async () => {
    const { data: subList } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("member_id", member.id)
      .order("start_date", { ascending: false })
    setSubs(subList || [])
    if (subList && subList.length > 0) {
      const subIds = subList.map((s: any) => s.id)
      const { data: paymentList } = await supabase
        .from("subscription_payments")
        .select("*")
        .in("subscription_id", subIds)
        .order("paid_on", { ascending: false })
      setPayments(paymentList || [])
    } else {
      setPayments([])
    }
  }

  // Find the latest subscription (active or most recent)
  const latestSub = subs.find((s: any) => s.status === "active") || subs[0]
  let daysLeft = null
  if (latestSub) {
    const today = new Date()
    const end = new Date(latestSub.end_date)
    daysLeft = differenceInDays(end, today)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <div className="text-lg font-bold">{member.name}</div>
            <div className="text-xs text-gray-500">{member.email}</div>
            {latestSub ? (
              <div className="mt-2 text-base">
                <b>Status:</b>{" "}
                <span
                  className={
                    latestSub.status === "active"
                      ? "text-green-600 font-bold"
                      : "text-red-600 font-bold"
                  }
                >
                  {latestSub.status === "active"
                    ? "Active"
                    : "Expired"}
                </span>
                <br />
                <b>Period:</b> {latestSub.start_date} to {latestSub.end_date}
                <br />
                <b>
                  {daysLeft !== null
                    ? daysLeft >= 0
                      ? `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                      : `Expired ${-daysLeft} day${daysLeft !== -1 ? "s" : ""} ago`
                    : ""}
                </b>
              </div>
            ) : (
              <div className="mt-2 text-base text-red-500">No active subscription</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <AddSubscriptionDialog member={member} onAdded={() => setRefresh(r => r + 1)} />
            {latestSub && (
              <EditSubscriptionDialog
                subscription={latestSub}
                onUpdated={() => setRefresh(r => r + 1)}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-bold mb-2">Subscription/Payment History</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paid On</TableHead>
                <TableHead>Months Added</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.paid_on}</TableCell>
                  <TableCell>{p.months_added}</TableCell>
                  <TableCell>{p.amount ? `₹${p.amount}` : "--"}</TableCell>
                  <TableCell>{p.note || "--"}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">
                    No payments yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
