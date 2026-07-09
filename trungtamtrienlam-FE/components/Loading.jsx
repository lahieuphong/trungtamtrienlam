import React, { useContext } from "react"
import LoadingContext from "../contexts/LoadingContext"

const LoadingComponent = () => {
    const loadingContext = useContext(LoadingContext)
    if (!loadingContext.loading) return null
    return (
        <div className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center z-[9999] bg-[rgba(0,0,0,0.0)]">
            <div className="">
                <img className="w-20 h-20" src="/icons/loading_2.gif" />
            </div>
        </div>
    )
}

export default LoadingComponent