'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Copy, RefreshCw } from 'lucide-react'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Button } from '@/components/common/Button'
import { FormGroup } from '@/components/common/FormGroup'
import { Select } from '@/components/common/Select'
import { Modal } from '@/components/common/Modal'
import { Table } from '@/components/common/Table'
import { useToast } from '@/contexts/ToastContext'
import {
    fetchDepartmentDropdown,
    fetchRoleDropdown_Account as fetchRoleDropdown,
} from '@/lib/api/dropdownApi'
import {
    clonePermission,
    fetchPermission,
    updatePermission,
} from '@/lib/api/permissionApi'

const ACTION_COLUMNS = [
    { key: 'view', label: 'Xem' },
    { key: 'add', label: 'Thêm' },
    { key: 'edit', label: 'Sửa' },
    { key: 'delete', label: 'Xóa' },
    { key: 'verify', label: 'Duyệt' },
    { key: 'refuse', label: 'Không duyệt' },
    { key: 'download', label: 'Tải xuống' },
    { key: 'isPublic', label: 'Công khai' },
]

const EMPTY_CLONE_FORM = {
    oldRoleID: '',
    oldDepartmentID: '',
    newRoleID: '',
    newDepartmentID: '',
}

function isPrivilegedRole(role) {
    return Boolean(role?.isAdmin || role?.isDirector || role?.is_admin || role?.is_director)
}

function flattenPermissionRows(rows, expandedRowIds) {
    const byParent = new Map()
    rows.forEach((row) => {
        const parentKey = row.functionParrentID || ''
        const list = byParent.get(parentKey) || []
        list.push(row)
        byParent.set(parentKey, list)
    })

    const result = []
    const visited = new Set()

    const walk = (parentKey, depth, prefix = '') => {
        const children = byParent.get(parentKey) || []
        children.forEach((row, index) => {
            if (visited.has(row.functionID)) return
            const treeIndex = prefix ? `${prefix}.${index + 1}` : `${index + 1}`
            const hasChildren = byParent.has(row.functionID)
            const isExpanded = expandedRowIds.has(row.functionID)

            visited.add(row.functionID)
            result.push({ ...row, id: row.functionID, depth, treeIndex, hasChildren, isExpanded })

            if (hasChildren && isExpanded) {
                walk(row.functionID, depth + 1, treeIndex)
            }
        })
    }

    walk('', 0)
    rows.forEach((row) => {
        if (!visited.has(row.functionID)) {
            const rootCount = result.filter((item) => item.depth === 0).length
            result.push({ ...row, id: row.functionID, depth: 0, treeIndex: `${rootCount + 1}` })
        }
    })

    return result
}

function PermissionCheckbox({ checked, disabled, loading, onChange }) {
    return (
        <label className="inline-flex h-5 w-5 items-center justify-center">
            <input
                type="checkbox"
                checked={Boolean(checked)}
                disabled={disabled || loading}
                onChange={onChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
        </label>
    )
}

export default function PermissionsPage() {
    const toast = useToast()
    const [roleID, setRoleID] = useState('')
    const [departmentID, setDepartmentID] = useState('')
    const [roleOptions, setRoleOptions] = useState([])
    const [departmentOptions, setDepartmentOptions] = useState([])
    const [permissions, setPermissions] = useState([])
    const [expandedRowIds, setExpandedRowIds] = useState(() => new Set())
    const [loading, setLoading] = useState(true)
    const [savingKey, setSavingKey] = useState('')
    const [error, setError] = useState('')
    const [cloneOpen, setCloneOpen] = useState(false)
    const [cloneForm, setCloneForm] = useState(EMPTY_CLONE_FORM)
    const [cloneLoading, setCloneLoading] = useState(false)

    const selectedRole = useMemo(
        () => roleOptions.find((role) => role.value === roleID),
        [roleOptions, roleID]
    )
    const needsDepartment = Boolean(roleID && !isPrivilegedRole(selectedRole))
    const tableData = useMemo(() => flattenPermissionRows(permissions, expandedRowIds), [expandedRowIds, permissions])

    const loadDropdowns = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [rolesRes, departmentsRes] = await Promise.all([
                fetchRoleDropdown(),
                fetchDepartmentDropdown(),
            ])

            const roles = (rolesRes?.data?.roles || []).map((role) => ({
                ...role,
                value: role.id,
                label: role.name,
            }))
            const departments = (departmentsRes?.data?.departments || []).map((department) => ({
                ...department,
                value: department.id,
                label: department.name,
            }))

            setRoleOptions(roles)
            setDepartmentOptions(departments)
        } catch (err) {
            console.error('Error loading permission dropdowns:', err)
            setError('Không tải được danh sách chức vụ/phòng ban')
            toast.error('Không tải được danh sách chức vụ/phòng ban')
        } finally {
            setLoading(false)
        }
    }, [toast])

    const loadPermissions = useCallback(async () => {
        if (!roleID || (needsDepartment && !departmentID)) {
            setPermissions([])
            setExpandedRowIds(new Set())
            return
        }

        setLoading(true)
        setError('')
        try {
            const response = await fetchPermission({
                roleID,
                departmentID: needsDepartment ? departmentID : '',
            })

            if (response?.status === 200) {
                const nextPermissions = response.data?.permissions || []
                const parentIds = new Set(
                    nextPermissions
                        .map((permission) => permission.functionParrentID)
                        .filter(Boolean)
                )
                setPermissions(nextPermissions)
                setExpandedRowIds(parentIds)
            } else {
                setError(response?.message || 'Không tải được danh sách phân quyền')
            }
        } catch (err) {
            console.error('Error loading permissions:', err)
            setError('Không tải được danh sách phân quyền')
        } finally {
            setLoading(false)
        }
    }, [departmentID, needsDepartment, roleID])

    useEffect(() => {
        loadDropdowns()
    }, [loadDropdowns])

    useEffect(() => {
        loadPermissions()
    }, [loadPermissions])

    const handleRoleChange = (event) => {
        const nextRoleID = event.target.value
        const nextRole = roleOptions.find((role) => role.value === nextRoleID)
        setRoleID(nextRoleID)
        if (isPrivilegedRole(nextRole)) {
            setDepartmentID('')
        } else if (!departmentID && departmentOptions[0]?.value) {
            setDepartmentID(departmentOptions[0].value)
        }
    }

    const broadcastPermissionChange = () => {
        if (typeof window === 'undefined') return
        const payload = Date.now().toString()
        localStorage.setItem('permissionUpdateTrigger', payload)
        window.dispatchEvent(new CustomEvent('permissionUpdated', { detail: { timestamp: payload } }))
        setTimeout(() => localStorage.removeItem('permissionUpdateTrigger'), 1000)
    }

    const handleTogglePermission = useCallback(async (row, action) => {
        const key = `${row.functionID}-${action}`
        setSavingKey(key)
        try {
            const response = await updatePermission({
                roleID,
                departmentID: needsDepartment ? departmentID : '',
                functionID: row.functionID,
                action,
            })

            if (response?.status === 200) {
                toast.success(response.message || 'Cập nhật quyền thành công')
                broadcastPermissionChange()
                await loadPermissions()
            } else {
                toast.error(response?.message || 'Cập nhật quyền thất bại')
            }
        } catch (err) {
            console.error('Error updating permission:', err)
            toast.error('Cập nhật quyền thất bại')
        } finally {
            setSavingKey('')
        }
    }, [departmentID, loadPermissions, needsDepartment, roleID, toast])

    const toggleExpandedRow = useCallback((functionID) => {
        setExpandedRowIds((current) => {
            const next = new Set(current)
            if (next.has(functionID)) {
                next.delete(functionID)
            } else {
                next.add(functionID)
            }
            return next
        })
    }, [])
    const columns = useMemo(() => [
        {
            key: 'treeIndex',
            title: 'STT',
            sortable: false,
            width: 76,
            render: (value) => <span className="text-gray-600">{value}</span>,
        },
        {
            key: 'functionName',
            title: 'Tên chức năng',
            sortable: false,
            render: (_, row) => {
                const textClass = row.depth === 0 ? 'font-medium text-gray-900' : 'text-gray-700'
                const content = (
                    <>
                        {row.hasChildren ? (
                            row.isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        ) : (
                            <span className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span>{row.functionName}</span>
                    </>
                )

                if (row.hasChildren) {
                    return (
                        <button
                            type="button"
                            onClick={() => toggleExpandedRow(row.functionID)}
                            className={`flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-gray-100 ${textClass}`}
                            style={{ paddingLeft: `${8 + row.depth * 18}px` }}
                            aria-label={row.isExpanded ? 'Thu gọn chức năng con' : 'Mở rộng chức năng con'}
                        >
                            {content}
                        </button>
                    )
                }

                return (
                    <div
                        className={`flex min-h-8 items-center gap-2 px-2 ${textClass}`}
                        style={{ paddingLeft: `${8 + row.depth * 18}px` }}
                    >
                        {content}
                    </div>
                )
            },
        },
        ...ACTION_COLUMNS.map((action) => ({
            key: action.key,
            title: action.label,
            sortable: false,
            render: (value, row) => {
                const key = `${row.functionID}-${action.key}`
                return (
                    <PermissionCheckbox
                        checked={value}
                        disabled={!roleID || (needsDepartment && !departmentID)}
                        loading={savingKey === key}
                        onChange={() => handleTogglePermission(row, action.key)}
                    />
                )
            },
        })),
    ], [departmentID, handleTogglePermission, needsDepartment, roleID, savingKey, toggleExpandedRow])

    const updateCloneField = (field, value) => {
        setCloneForm((current) => ({ ...current, [field]: value }))
    }

    const handleCloneSubmit = async () => {
        if (!cloneForm.oldRoleID || !cloneForm.newRoleID) {
            toast.warning('Vui lòng chọn chức vụ nguồn và chức vụ đích')
            return
        }

        setCloneLoading(true)
        try {
            const response = await clonePermission(cloneForm)
            if (response?.status === 200) {
                toast.success(response.message || 'Sao chép quyền thành công')
                setCloneOpen(false)
                setCloneForm(EMPTY_CLONE_FORM)
                await loadPermissions()
                broadcastPermissionChange()
            } else {
                toast.error(response?.message || 'Sao chép quyền thất bại')
            }
        } catch (err) {
            console.error('Error cloning permissions:', err)
            toast.error('Sao chép quyền thất bại')
        } finally {
            setCloneLoading(false)
        }
    }

    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: 'Phân quyền chức năng', isHome: true }]} />

            <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:max-w-3xl">
                    <FormGroup label="Chọn chức vụ" required htmlFor="roleID">
                        <Select
                            id="roleID"
                            name="roleID"
                            value={roleID}
                            options={roleOptions}
                            onChange={handleRoleChange}
                            placeholder="-- Chọn chức vụ --"
                            disabled={loading && !roleOptions.length}
                        />
                    </FormGroup>

                    {needsDepartment && (
                        <FormGroup label="Chọn phòng ban" required htmlFor="departmentID">
                            <Select
                                id="departmentID"
                                name="departmentID"
                                value={departmentID}
                                options={departmentOptions}
                                onChange={(event) => setDepartmentID(event.target.value)}
                                placeholder="-- Chọn phòng ban --"
                                disabled={loading && !departmentOptions.length}
                            />
                        </FormGroup>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={loadPermissions} disabled={!roleID || loading}>
                        <RefreshCw className="h-4 w-4" />
                        Tải lại
                    </Button>
                    <Button onClick={() => setCloneOpen(true)} disabled={!roleOptions.length}>
                        <Copy className="h-4 w-4" />
                        Sao chép quyền
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 text-sm">
                    {error}
                </div>
            )}

            <Table
                columns={columns}
                data={tableData}
                loading={loading}
                emptyText="Không có dữ liệu phân quyền"
            />

            <Modal
                open={cloneOpen}
                onClose={() => setCloneOpen(false)}
                title="Sao chép quyền"
                size="lg"
                footer={(
                    <>
                        <Button variant="outline" onClick={() => setCloneOpen(false)} disabled={cloneLoading}>
                            Đóng
                        </Button>
                        <Button onClick={handleCloneSubmit} loading={cloneLoading}>
                            Sao chép
                        </Button>
                    </>
                )}
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormGroup label="Chức vụ nguồn" required htmlFor="oldRoleID">
                        <Select
                            id="oldRoleID"
                            value={cloneForm.oldRoleID}
                            options={roleOptions}
                            onChange={(event) => updateCloneField('oldRoleID', event.target.value)}
                            placeholder="-- Chọn chức vụ nguồn --"
                        />
                    </FormGroup>
                    <FormGroup label="Phòng ban nguồn" htmlFor="oldDepartmentID">
                        <Select
                            id="oldDepartmentID"
                            value={cloneForm.oldDepartmentID}
                            options={departmentOptions}
                            onChange={(event) => updateCloneField('oldDepartmentID', event.target.value)}
                            placeholder="-- Không áp dụng --"
                        />
                    </FormGroup>
                    <FormGroup label="Chức vụ đích" required htmlFor="newRoleID">
                        <Select
                            id="newRoleID"
                            value={cloneForm.newRoleID}
                            options={roleOptions}
                            onChange={(event) => updateCloneField('newRoleID', event.target.value)}
                            placeholder="-- Chọn chức vụ đích --"
                        />
                    </FormGroup>
                    <FormGroup label="Phòng ban đích" htmlFor="newDepartmentID">
                        <Select
                            id="newDepartmentID"
                            value={cloneForm.newDepartmentID}
                            options={departmentOptions}
                            onChange={(event) => updateCloneField('newDepartmentID', event.target.value)}
                            placeholder="-- Không áp dụng --"
                        />
                    </FormGroup>
                </div>
            </Modal>
        </div>
    )
}







