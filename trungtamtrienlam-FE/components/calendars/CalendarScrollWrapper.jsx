const CalendarScrollWrapper = ({ children }) => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[900px] w-full">{children}</div>
    </div>
  )
}

export default CalendarScrollWrapper
