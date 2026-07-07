'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Copy, RefreshCw, SquareCheckBig, SquareMinus } from 'lucide-react'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Button } from '@/components/common/Button'
import { FormGroup } from '@/components/common/FormGroup'
import { Select } from '@/components/common/Select'
import { Modal } from '@/components/common/Modal'
import { Table } from '@/components/common/Table'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/contexts/ToastContext'
import {
    fetchDepartmentDropdown,
    fetchRoleDropdown_Account as fetchRoleDropdown,
} from '@/lib/api/dropdownApi'
import {
    clonePermission,
    fetchPermission,
    setAllPermissions,
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
    return Boolean(
        role?.isAdmin || role?.isDirector
        || role?.is_admin || role?.is_director
    )
}

function flattenPermissionRows(rows, expandedRowIds) {
    const byParent = new Map()
    const rowIds = new Set(rows.map((row) => row.functionID).filter(Boolean))

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
        if (visited.has(row.functionID)) return

        const parentKey = row.functionParrentID || ''
        if (parentKey && rowIds.has(parentKey)) return

        const rootCount = result.filter((item) => item.depth === 0).length
        const treeIndex = `${rootCount + 1}`
        const hasChildren = byParent.has(row.functionID)
        const isExpanded = expandedRowIds.has(row.functionID)

        visited.add(row.functionID)
        result.push({ ...row, id: row.functionID, depth: 0, treeIndex, hasChildren, isExpanded })

        if (hasChildren && isExpanded) {
            walk(row.functionID, 1, treeIndex)
        }
    })

    return result
}

function PermissionCheckbox({ checked, disabled, loading, onCheckedChange }) {
    return (
        <div className="flex h-8 w-full items-center justify-center">
            <Checkbox
                checked={Boolean(checked)}
                disabled={disabled || loading}
                onCheckedChange={(value) => onCheckedChange(Boolean(value))}
                className="h-5 w-5 rounded-[5px] border-[#CBD5E1] bg-white shadow-sm transition-colors data-[state=checked]:border-[#597EF7] data-[state=checked]:bg-[#597EF7] data-[state=checked]:text-white focus-visible:ring-[#597EF7]/30 focus-visible:ring-offset-0 disabled:opacity-50"
            />
        </div>
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
    const [bulkSaving, setBulkSaving] = useState(false)

    const selectedRole = useMemo(
        () => roleOptions.find((role) => role.value === roleID),
        [roleOptions, roleID]
    )
    const selectedOldCloneRole = useMemo(
        () => roleOptions.find((role) => role.value === cloneForm.oldRoleID),
        [cloneForm.oldRoleID, roleOptions]
    )
    const selectedNewCloneRole = useMemo(
        () => roleOptions.find((role) => role.value === cloneForm.newRoleID),
        [cloneForm.newRoleID, roleOptions]
    )
    const needsDepartment = Boolean(roleID && !isPrivilegedRole(selectedRole))
    const oldCloneNeedsDepartment = Boolean(cloneForm.oldRoleID && !isPrivilegedRole(selectedOldCloneRole))
    const newCloneNeedsDepartment = Boolean(cloneForm.newRoleID && !isPrivilegedRole(selectedNewCloneRole))
    const tableData = useMemo(() => flattenPermissionRows(permissions, expandedRowIds), [expandedRowIds, permissions])
    const permissionCellStats = useMemo(() => {
        let total = 0
        let checked = 0

        permissions.forEach((permission) => {
            ACTION_COLUMNS.forEach((action) => {
                if (permission[action.key] == null) return
                total += 1
                if (permission[action.key]) checked += 1
            })
        })

        return { total, checked }
    }, [permissions])
    const hasPermissionCells = permissionCellStats.total > 0
    const allPermissionsGranted = hasPermissionCells && permissionCellStats.checked === permissionCellStats.total
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

    const loadPermissions = useCallback(async ({ silent = false, preserveExpandedRows = false } = {}) => {
        if (!roleID || (needsDepartment && !departmentID)) {
            setPermissions([])
            setExpandedRowIds(new Set())
            if (!silent) setLoading(false)
            return
        }

        if (!silent) setLoading(true)
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
                if (!preserveExpandedRows) {
                    setExpandedRowIds(parentIds)
                }
            } else {
                setError(response?.message || 'Không tải được danh sách phân quyền')
            }
        } catch (err) {
            console.error('Error loading permissions:', err)
            setError('Không tải được danh sách phân quyền')
        } finally {
            if (!silent) setLoading(false)
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

    const broadcastPermissionChange = useCallback(() => {
        if (typeof window === 'undefined') return
        const payload = Date.now().toString()
        localStorage.setItem('permissionUpdateTrigger', payload)
        window.dispatchEvent(new CustomEvent('permissionUpdated', { detail: { timestamp: payload } }))
        setTimeout(() => localStorage.removeItem('permissionUpdateTrigger'), 1000)
    }, [])

    const handleToggleAllPermissions = useCallback(async () => {
        if (!roleID || (needsDepartment && !departmentID) || !hasPermissionCells || bulkSaving) return

        const nextEnabled = !allPermissionsGranted
        const previousPermissions = permissions
        setBulkSaving(true)
        setSavingKey('__bulk__')
        setPermissions((current) => current.map((permission) => {
            const nextPermission = { ...permission }
            ACTION_COLUMNS.forEach((action) => {
                if (nextPermission[action.key] != null) {
                    nextPermission[action.key] = nextEnabled
                }
            })
            return nextPermission
        }))

        try {
            const response = await setAllPermissions({
                roleID,
                departmentID: needsDepartment ? departmentID : '',
                enabled: nextEnabled,
            })

            if (response?.status === 200) {
                toast.success(response.message || (nextEnabled ? 'Đã cấp tất cả quyền' : 'Đã thu hồi tất cả quyền'))
                broadcastPermissionChange()
                await loadPermissions({ silent: true, preserveExpandedRows: true })
            } else {
                setPermissions(previousPermissions)
                toast.error(response?.message || 'Cập nhật quyền thất bại!')
            }
        } catch (err) {
            setPermissions(previousPermissions)
            console.error('Error bulk updating permissions:', err)
            toast.error('Có lỗi xảy ra khi cập nhật quyền!')
        } finally {
            setBulkSaving(false)
            setSavingKey('')
        }
    }, [
        allPermissionsGranted,
        broadcastPermissionChange,
        bulkSaving,
        departmentID,
        hasPermissionCells,
        loadPermissions,
        needsDepartment,
        permissions,
        roleID,
        toast,
    ])
    const handleTogglePermission = useCallback(async (row, action, nextChecked) => {
        if (row[action] == null) return
        const key = `${row.functionID}-${action}`
        const previousChecked = Boolean(row[action])
        setSavingKey(key)
        setPermissions((current) => current.map((permission) => (
            permission.functionID === row.functionID
                ? { ...permission, [action]: nextChecked }
                : permission
        )))

        try {
            const response = await updatePermission({
                roleID,
                departmentID: needsDepartment ? departmentID : '',
                functionID: row.functionID,
                action,
            })

            if (response?.status === 200) {
                toast.success(response.message || 'Cập nhật quyền thành công!')
                broadcastPermissionChange()
                await loadPermissions({ silent: true, preserveExpandedRows: true })
            } else {
                setPermissions((current) => current.map((permission) => (
                    permission.functionID === row.functionID
                        ? { ...permission, [action]: previousChecked }
                        : permission
                )))
                toast.error(response?.message || 'Cập nhật quyền thất bại!')
            }
        } catch (err) {
            setPermissions((current) => current.map((permission) => (
                permission.functionID === row.functionID
                    ? { ...permission, [action]: previousChecked }
                    : permission
            )))
            console.error('Error updating permission:', err)
            toast.error('Có lỗi xảy ra khi cập nhật quyền!')
        } finally {
            setSavingKey('')
        }
    }, [broadcastPermissionChange, departmentID, loadPermissions, needsDepartment, roleID, toast])

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
            className: 'w-20',
            render: (value) => <span className="text-gray-600">{value}</span>,
        },
        {
            key: 'functionName',
            title: 'Tên chức năng',
            sortable: false,
            className: 'min-w-[320px]',
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
            headerClassName: 'w-28 min-w-[112px] text-center whitespace-nowrap',
            headerContentClassName: 'justify-center text-center whitespace-nowrap',
            cellClassName: 'w-28 min-w-[112px] align-middle text-center',
            render: (value, row) => {
                if (value == null) {
                    return <span className="mx-auto block h-5 w-5" aria-hidden="true" />
                }
                const key = `${row.functionID}-${action.key}`
                return (
                    <PermissionCheckbox
                        checked={value}
                        disabled={!roleID || (needsDepartment && !departmentID) || bulkSaving}
                        loading={savingKey === key || bulkSaving}
                        onCheckedChange={(checked) => handleTogglePermission(row, action.key, checked)}
                    />
                )
            },
        })),
    ], [bulkSaving, departmentID, handleTogglePermission, needsDepartment, roleID, savingKey, toggleExpandedRow])

    const updateCloneField = (field, value) => {
        setCloneForm((current) => ({ ...current, [field]: value }))
    }

    const handleCloneSubmit = async () => {
        if (!cloneForm.oldRoleID || !cloneForm.newRoleID) {
            toast.warning('Vui lòng chọn chức vụ nguồn và chức vụ đích')
            return
        }
        if (oldCloneNeedsDepartment && !cloneForm.oldDepartmentID) {
            toast.warning('Vui lòng chọn phòng ban nguồn')
            return
        }
        if (newCloneNeedsDepartment && !cloneForm.newDepartmentID) {
            toast.warning('Vui lòng chọn phòng ban đích')
            return
        }

        setCloneLoading(true)
        try {
            const response = await clonePermission(cloneForm)
            if (response?.status === 200) {
                toast.success(response.message || 'Sao chép quyền thành công!')
                setCloneOpen(false)
                setCloneForm(EMPTY_CLONE_FORM)
                await loadPermissions()
                broadcastPermissionChange()
            } else {
                toast.error(response?.message || 'Sao chép quyền thất bại!')
            }
        } catch (err) {
            console.error('Error cloning permissions:', err)
            toast.error('Đã xảy ra lỗi khi sao chép quyền.')
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
                            showPlaceholderOption={false}
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
                                showPlaceholderOption={false}
                                disabled={loading && !departmentOptions.length}
                            />
                        </FormGroup>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={handleToggleAllPermissions}
                        disabled={!roleID || (needsDepartment && !departmentID) || loading || bulkSaving || !hasPermissionCells}
                    >
                        {allPermissionsGranted ? <SquareMinus className="h-4 w-4" /> : <SquareCheckBig className="h-4 w-4" />}
                        {allPermissionsGranted ? 'Thu hồi tất cả' : 'Chọn tất cả'}
                    </Button>
                    <Button variant="outline" onClick={loadPermissions} disabled={!roleID || loading || bulkSaving}>
                        <RefreshCw className="h-4 w-4" />
                        Tải lại
                    </Button>
                    <Button onClick={() => setCloneOpen(true)} disabled={!roleOptions.length || bulkSaving}>
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
                            showPlaceholderOption={false}
                            portal
                        />
                    </FormGroup>
                    <FormGroup label="Phòng ban nguồn" required={oldCloneNeedsDepartment} htmlFor="oldDepartmentID">
                        <Select
                            id="oldDepartmentID"
                            value={cloneForm.oldDepartmentID}
                            options={departmentOptions}
                            onChange={(event) => updateCloneField('oldDepartmentID', event.target.value)}
                            placeholder="-- Không áp dụng --"
                            portal
                        />
                    </FormGroup>
                    <FormGroup label="Chức vụ đích" required htmlFor="newRoleID">
                        <Select
                            id="newRoleID"
                            value={cloneForm.newRoleID}
                            options={roleOptions}
                            onChange={(event) => updateCloneField('newRoleID', event.target.value)}
                            placeholder="-- Chọn chức vụ đích --"
                            showPlaceholderOption={false}
                            portal
                        />
                    </FormGroup>
                    <FormGroup label="Phòng ban đích" required={newCloneNeedsDepartment} htmlFor="newDepartmentID">
                        <Select
                            id="newDepartmentID"
                            value={cloneForm.newDepartmentID}
                            options={departmentOptions}
                            onChange={(event) => updateCloneField('newDepartmentID', event.target.value)}
                            placeholder="-- Không áp dụng --"
                            portal
                        />
                    </FormGroup>
                </div>
            </Modal>
        </div>
    )
}







