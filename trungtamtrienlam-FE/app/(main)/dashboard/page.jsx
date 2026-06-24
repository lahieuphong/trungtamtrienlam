'use client'

import { ChevronLeft } from 'lucide-react'

const meetings = [
    { id: 1, title: 'Bảo dưỡng phòng khách', type: 'Cuộc họp', time: '13:00', color: 'bg-green-500' },
    { id: 2, title: 'Họp giao ban tháng 12', type: 'Công tác', time: '13:00', color: 'bg-blue-500' },
    { id: 3, title: 'Công tác thành phố Huế', type: 'Khác', time: '13:00', color: 'bg-gray-500' },
    { id: 4, title: 'Sản xuất phim triển lãm', type: 'Khác', time: '13:00', color: 'bg-gray-500' },
]

const financialData = [
    { title: 'Doanh thu', value: '13.000.000.000đ', change: '+88%', changeText: 'so với tháng trước', color: 'text-green-500' },
    { title: 'Lợi nhuận', value: '8.888.000.000đ', change: '+29%', changeText: 'so với tháng trước', color: 'text-blue-500' },
    { title: 'Chi phí', value: '4.112.000.000đ', change: '+4%', changeText: 'so với tháng trước', color: 'text-orange-500' },
]

const chartData = {
    months: ['Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
    series: [
        { name: 'Doanh thu', color: 'bg-blue-500' },
        { name: 'Lợi nhuận', color: 'bg-green-500' },
        { name: 'Chi phí', color: 'bg-orange-500' },
    ],
    data: [
        [120, 160, 120, 80, 70, 160],
        [80, 120, 150, 200, 80, 180],
        [190, 90, 140, 150, 110, 200],
    ],
}

export default function DashboardPage() {
    const date = '20, Thg12 2024'

    return (
        <div className="bg-gray-50">
            <div className="flex items-center mb-6">
                <button className="mr-2 hover:bg-gray-100 rounded p-1">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-semibold">Thống kê</h1>
            </div>

            {/* Row 1: Calendar + Medal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium">
                            Lịch <span className="text-blue-500">{date}</span>
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="py-2 text-left text-sm font-medium text-gray-500">Tên cuộc họp</th>
                                    <th className="py-2 text-left text-sm font-medium text-gray-500">Loại</th>
                                    <th className="py-2 text-left text-sm font-medium text-gray-500">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {meetings.map((meeting) => (
                                    <tr key={meeting.id} className="border-t border-gray-100">
                                        <td className="py-3">
                                            <div className="flex items-center">
                                                <div className={`w-2 h-2 rounded-full ${meeting.color} mr-3 flex-shrink-0`} />
                                                <span className="text-sm">{meeting.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                meeting.type === 'Cuộc họp'
                                                    ? 'bg-green-100 text-green-800'
                                                    : meeting.type === 'Công tác'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {meeting.type}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm text-gray-600">{meeting.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center justify-center">
                    <h2 className="text-lg font-medium mb-4">Danh hiệu hiện tại</h2>
                    <div className="w-32 h-32 mb-4 flex items-center justify-center">
                        <span className="text-7xl">🏅</span>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-600">Chiến Sĩ Thi Đua</h3>
                    <p className="text-sm text-gray-400 mt-1 cursor-pointer hover:text-blue-500">Xem chi tiết</p>
                </div>
            </div>

            {/* Row 2: Financial cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {financialData.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-medium mb-2">{item.title}</h2>
                        <p className="text-2xl font-bold mb-1">{item.value}</p>
                        <p className={`text-sm ${item.color}`}>
                            {item.change} <span className="text-gray-500">{item.changeText}</span>
                        </p>
                    </div>
                ))}
            </div>

            {/* Row 3: Bar chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
                <h2 className="text-lg font-medium mb-6">Biểu đồ thống kê hợp đồng năm 2024</h2>
                <div className="flex items-center justify-end mb-4 space-x-6">
                    {chartData.series.map((series, i) => (
                        <div key={i} className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${series.color} mr-2`} />
                            <span className="text-sm text-gray-600">{series.name}</span>
                        </div>
                    ))}
                </div>
                <div className="relative h-64">
                    <div className="flex h-full items-end pb-6">
                        {chartData.months.map((month, mIdx) => (
                            <div key={mIdx} className="flex-1 flex justify-center items-end">
                                <div className="flex items-end gap-0.5">
                                    {chartData.series.map((series, sIdx) => {
                                        const val = chartData.data[sIdx][mIdx]
                                        return (
                                            <div
                                                key={sIdx}
                                                className={`w-5 ${series.color} rounded-t`}
                                                style={{ height: `${val / 2}px` }}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between border-t border-gray-200 pt-1">
                        {chartData.months.map((month, i) => (
                            <div key={i} className="text-xs text-gray-400 text-center flex-1">{month}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
