"use client"
import { createContext, useContext } from "react"

interface GymContextType {
  gymId: string | null
}

const GymContext = createContext<GymContextType>({
  gymId: null
})

export const useGym = () => useContext(GymContext)

export { GymContext }
