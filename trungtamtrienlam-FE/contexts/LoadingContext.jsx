"use client"
import React, { createContext, useState, useMemo } from "react"
import LoadingComponent from "../components/Loading"

const LoadingContext = createContext(null)

export default LoadingContext

export const LoadingProvider = ({ children }) => {
    const [loading, setLoading] = useState(false)

    const show = () => setLoading(true)

    const hide = () => setLoading(false)

    const value = useMemo(() => ({
        loading,
        setLoading,
        show,
        hide
    }), [loading, setLoading, show, hide])

    return (
        <LoadingContext.Provider value={value}>
            {children}
            <LoadingComponent />
        </LoadingContext.Provider>
    )
}