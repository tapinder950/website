"use client"
import { createContext, useContext } from "react"

type GymContextType = {
  gymId: string | null
  ownerName: string
}

export const GymContext = createContext<GymContextType>({
  gymId: null,
  ownerName: "",
})

export const useGym = () => useContext(GymContext)
