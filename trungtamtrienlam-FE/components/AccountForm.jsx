'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, X, Check } from 'lucide-react'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { Switch } from '@/components/common/Switch'
import { FormGroup } from '@/components/common/FormGroup'
import { FileUploader } from '@/components/common/FileUploader'
import { Button } from '@/components/common/Button'
import { ConfirmModal } from '@/components/common/Modal'
import {
    fetchUserById, createUser, updateUser, deleteUser,
} from '@/lib/api/usersApi'
import {
    fetchRoleDropdown_Account, fetchDepartmentDropdown,
    fetchOrganizationDropdown, fetchProvinceDropdown, fetchWardDropdown,
} from '@/lib/api/dropdownApi'
import { ConfigConstants } from '@/constants/configConstants'
import { UserFileConstants } from '@/constants/userConstants'

const VN_PHONE_RE = /^(\+84|84|0)(3[2-9]|5[25689]|7[06-9]|8[1-689]|9[0-9])[0-9]{7}$/

export default function AccountForm({ mode = 'create', id = null }) {
    const router = useRouter()
    const isCreate = mode === 'create'

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const [formData, setFormData] = useState({
        id: '', userName: '', firstName: '', lastName: '',
        email: '', phoneNumber: '', password: '',
        provinceID: '', wardID: '', address: '',
        status: true, avatar: null, sign: null, stamp: null,
    })
    const [additionalRoles, setAdditionalRoles] = useState([])
    const [errors, setErrors] = useState({})

    const [positionOptions, setPositionOptions] = useState([])
    const [departmentOptions, setDepartmentOptions] = useState([])
    const [organizationOptions, setOrganizationOptions] = useState([])
    const [provinceOptions, setProvinceOptions] = useState([])
    const [wardOptions, setWardOptions] = useState([])

    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    // Load dropdowns
    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const [rolesRes, deptsRes, orgsRes, provsRes] = await Promise.all([
                    fetchRoleDropdown_Account(),
                    fetchDepartmentDropdown(),
                    fetchOrganizationDropdown(),
                    fetchProvinceDropdown(),
                ])
                if (rolesRes?.status === 200) {
                    setPositionOptions((rolesRes.data?.roles || []).map(r => ({ ...r, value: r.id, label: r.name })))
                }
                if (deptsRes?.status === 200) {
                    setDepartmentOptions((deptsRes.data?.departments || []).map(d => ({ ...d, value: d.id, label: d.name })))
                }
                if (orgsRes?.status === 200) {
                    setOrganizationOptions((orgsRes.data?.organizations || []).map(o => ({ ...o, value: o.id, label: o.name })))
                }
                if (provsRes?.status === 200) {
                    const provs = (provsRes.data?.provinces || []).map(p => ({ ...p, value: p.id, label: p.name }))
                    setProvinceOptions(provs)
                    if (isCreate && provs.length > 0) {
                        setFormData(prev => ({ ...prev, provinceID: provs[0].value }))
                    }
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [isCreate])

    // Load wards when province changes
    useEffect(() => {
        if (!formData.provinceID) {
            setWardOptions([])
            setFormData(prev => ({ ...prev, wardID: '' }))
            return
        }
        const load = async () => {
            try {
                const res = await fetchWardDropdown({ provinceId: formData.provinceID })
                if (res?.status === 200) {
                    const wards = (res.data?.wards || []).map(w => ({ ...w, value: w.id, label: w.name }))
                    setWardOptions(wards)
                    if (wards.length > 0 && (!formData.wardID || !wards.some(w => w.value === formData.wardID))) {
                        setFormData(prev => ({ ...prev, wardID: wards[0].value }))
                    }
                    if (wards.length === 0) {
                        setFormData(prev => ({ ...prev, wardID: '' }))
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
        load()
    }, [formData.provinceID])

    // Set default role row when options are ready (create mode)
    useEffect(() => {
        if (isCreate && positionOptions.length > 0 && organizationOptions.length > 0 && departmentOptions.length > 0 && additionalRoles.length === 0) {
            setAdditionalRoles([{
                id: Date.now(),
                organizationID: organizationOptions[0]?.value || '',
                departmentID: departmentOptions[0]?.value || '',
                roleID: positionOptions[0]?.value || '',
                isDefault: true,
            }])
        }
    }, [isCreate, positionOptions, departmentOptions, organizationOptions])

    // Load user data in edit mode
    useEffect(() => {
        if (isCreate || !id) return
        const load = async () => {
            try {
                setLoading(true)
                const res = await fetchUserById({ id, isInfo: false })
                if (res?.status === 200) {
                    const d = res.data?.staff || {}
                    const ucs = res.data?.userConcurrentlies || []
                    const files = JSON.parse(d.staffFiles || '[]')

                    setFormData({
                        id: d.id || '',
                        userName: d.userName || '',
                        firstName: d.firstName || '',
                        lastName: d.lastName || '',
                        email: d.email || '',
                        phoneNumber: d.phoneNumber || '',
                        password: '',
                        provinceID: d.provinceID || '',
                        wardID: d.wardID || '',
                        address: d.address || '',
                        status: d.status !== false,
                        avatar: files.find(f => f.TypeFile === UserFileConstants.typeFile.Avatar) || null,
                        sign: files.find(f => f.TypeFile === UserFileConstants.typeFile.Sign) || null,
                        stamp: files.find(f => f.TypeFile === UserFileConstants.typeFile.Stamp) || null,
                    })

                    if (ucs.length > 0) {
                        setAdditionalRoles(ucs.map((uc, i) => ({
                            id: Date.now() + i,
                            organizationID: uc.organizationID || '',
                            departmentID: uc.departmentID || '',
                            roleID: uc.roleID || '',
                            isDefault: i === 0,
                        })))
                    }
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [isCreate, id])

    const isDireactor = useMemo(() => {
        return positionOptions.some(p =>
            additionalRoles.some(r => r.roleID === p.value && p.isDirector)
        )
    }, [positionOptions, additionalRoles])

    const isAdmin = useMemo(() => {
        return positionOptions.some(p =>
            additionalRoles.some(r => r.roleID === p.value && p.isAdmin)
        )
    }, [positionOptions, additionalRoles])

    const handleChange = useCallback((e) => {
        const { name, value } = e.target
        if (name === 'status') {
            setFormData(prev => ({ ...prev, status: !prev.status }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
        setErrors(prev => ({ ...prev, [name]: '' }))
    }, [])

    const handleFile = (field, val) => {
        setFormData(prev => ({ ...prev, [field]: val }))
        setErrors(prev => ({ ...prev, [field]: '' }))
    }

    const handleRoleChange = (roleId, field, value) => {
        setAdditionalRoles(prev => prev.map(r => r.id === roleId ? { ...r, [field]: value } : r))
    }

    const handleAddRole = () => {
        setAdditionalRoles(prev => [...prev, {
            id: Date.now(),
            organizationID: organizationOptions[0]?.value || '',
            departmentID: departmentOptions[0]?.value || '',
            roleID: positionOptions[0]?.value || '',
            isDefault: false,
        }])
    }

    const handleRemoveRole = (roleId) => {
        setAdditionalRoles(prev => {
            if (prev.length <= 1) return prev
            const next = prev.filter(r => r.id !== roleId)
            return next.map((r, i) => ({ ...r, isDefault: i === 0 }))
        })
    }

    const validate = () => {
        const errs = {}
        if (!formData.userName) errs.userName = 'Vui lòng nhập tài khoản'
        else if (formData.userName.length < 6) errs.userName = 'Tài khoản phải có ít nhất 6 ký tự'
        if (!formData.firstName) errs.firstName = 'Vui lòng nhập họ'
        if (!formData.lastName) errs.lastName = 'Vui lòng nhập tên'
        if (!formData.email) errs.email = 'Vui lòng nhập email'
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Email không hợp lệ'
        if (!formData.phoneNumber) errs.phoneNumber = 'Vui lòng nhập số điện thoại'
        else if (!VN_PHONE_RE.test(formData.phoneNumber)) errs.phoneNumber = 'Số điện thoại không hợp lệ'
        if (isCreate && !formData.password) errs.password = 'Vui lòng nhập mật khẩu'
        if (!formData.address) errs.address = 'Vui lòng nhập địa chỉ'
        if (!formData.provinceID) errs.provinceID = 'Vui lòng chọn Tỉnh/Thành phố trực thuộc TW'
        if (!formData.wardID) errs.wardID = 'Vui lòng chọn Phường/Xã/Đặc khu'
        if (!formData.avatar) errs.avatar = 'Vui lòng chọn hình đại diện'
        if (isDireactor && !formData.sign) errs.sign = 'Vui lòng chọn chữ ký'
        if (isDireactor && !formData.stamp) errs.stamp = 'Vui lòng chọn chữ ký có con dấu'
        additionalRoles.forEach((r, i) => {
            if (!r.roleID) errs[`role_${i}`] = 'Vui lòng chọn chức vụ'
        })
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const buildFormData = async () => {
        const fd = new FormData()
        fd.append('UserName', formData.userName)
        fd.append('FirstName', formData.firstName)
        fd.append('LastName', formData.lastName)
        fd.append('Email', formData.email)
        fd.append('PhoneNumber', formData.phoneNumber)
        if (isCreate || formData.password) fd.append('Password', formData.password)
        fd.append('ProvinceID', formData.provinceID)
        fd.append('WardID', formData.wardID)
        fd.append('Address', formData.address)
        fd.append('Status', formData.status ? '1' : '0')
        fd.append('Positions', JSON.stringify(additionalRoles))

        // Avatar
        if (formData.avatar?.file instanceof File) {
            fd.append('avatar', formData.avatar.file)
        }
        // Sign
        if (formData.sign?.file instanceof File) {
            fd.append('sign', formData.sign.file)
        }
        // Stamp
        if (formData.stamp?.file instanceof File) {
            fd.append('stamp', formData.stamp.file)
        }

        return fd
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (submitting) return
        if (!validate()) return
        setSubmitting(true)
        try {
            const fd = await buildFormData()
            const res = isCreate ? await createUser(fd) : await updateUser(formData.id, fd)
            if (res?.status === 200) {
                showToast(isCreate ? 'Tạo tài khoản thành công!' : 'Cập nhật tài khoản thành công!')
                setTimeout(() => router.push('/accounts'), 1000)
            } else {
                showToast(res?.message || 'Có lỗi xảy ra', 'error')
            }
        } catch (err) {
            showToast(err?.response?.data?.message || 'Có lỗi xảy ra', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        try {
            setLoading(true)
            const res = await deleteUser(id)
            if (res?.status === 200) {
                const userInfo = JSON.parse(localStorage.getItem(ConfigConstants.localstorageUserInfoKey) || '{}')
                if (id === userInfo?.id) {
                    localStorage.clear()
                    router.push('/login')
                } else {
                    router.push('/accounts')
                }
            } else {
                showToast('Xóa tài khoản thất bại', 'error')
            }
        } catch {
            showToast('Xóa tài khoản thất bại', 'error')
        } finally {
            setLoading(false)
            setShowDeleteModal(false)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <Breadcrumb items={[
                    { label: 'Quản lý tài khoản', href: '/accounts', isHome: true },
                    { label: isCreate ? 'Tạo tài khoản mới' : 'Chỉnh sửa thông tin tài khoản' },
                ]} />

                {/* Toast */}
                {toast && (
                    <div className={`mb-4 px-4 py-3 rounded-md text-sm ${toast.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {toast.msg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Avatar */}
                        <div className="col-span-1">
                            <FileUploader
                                name="avatar" id="avatar"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={v => handleFile('avatar', v)}
                                errorMessage={errors.avatar}
                                values={formData.avatar}
                                title="Hình đại diện *"
                            />
                        </div>

                        <div className="col-span-3">
                            {/* Thông tin cá nhân */}
                            <div className="mb-8">
                                <h2 className="text-sm font-medium mb-6 text-blue-500 border-l-4 border-blue-500 pl-2">
                                    Thông tin cá nhân
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                    <FormGroup label="Mã số tài khoản" required htmlFor="userName">
                                        <Input id="userName" name="userName" value={formData.userName}
                                            onChange={handleChange} disabled={!isCreate}
                                            placeholder="Nhập mã số tài khoản"
                                            error={!!errors.userName} errorMessage={errors.userName} />
                                    </FormGroup>

                                    <FormGroup label="Họ" required htmlFor="firstName">
                                        <Input id="firstName" name="firstName" value={formData.firstName}
                                            onChange={handleChange} placeholder="Nhập họ"
                                            error={!!errors.firstName} errorMessage={errors.firstName} />
                                    </FormGroup>

                                    <FormGroup label="Tên" required htmlFor="lastName">
                                        <Input id="lastName" name="lastName" value={formData.lastName}
                                            onChange={handleChange} placeholder="Nhập tên"
                                            error={!!errors.lastName} errorMessage={errors.lastName} />
                                    </FormGroup>

                                    <FormGroup label="Email" required htmlFor="email">
                                        <Input id="email" name="email" type="email" value={formData.email}
                                            onChange={handleChange} placeholder="Nhập email"
                                            error={!!errors.email} errorMessage={errors.email} />
                                    </FormGroup>

                                    <FormGroup label="Số điện thoại" required htmlFor="phoneNumber">
                                        <Input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber}
                                            onChange={handleChange} placeholder="Nhập số điện thoại"
                                            error={!!errors.phoneNumber} errorMessage={errors.phoneNumber} />
                                    </FormGroup>

                                    {isCreate ? (
                                        <FormGroup label="Mật khẩu" required htmlFor="password">
                                            <Input id="password" name="password" type="password" value={formData.password}
                                                onChange={handleChange} placeholder="Nhập mật khẩu"
                                                error={!!errors.password} errorMessage={errors.password} />
                                        </FormGroup>
                                    ) : <FormGroup />}

                                    <FormGroup label='Tỉnh/Thành phố trực thuộc TW' required htmlFor="provinceID">
                                        <Select id="provinceID" name="provinceID"
                                            options={provinceOptions} value={formData.provinceID}
                                            onChange={handleChange} placeholder='-- Chọn tỉnh/thành phố trực thuộc TW --'
                                            error={!!errors.provinceID} errorMessage={errors.provinceID} />
                                    </FormGroup>

                                    <FormGroup label='Phường/Xã/Đặc khu' required htmlFor="wardID">
                                        <Select id="wardID" name="wardID"
                                            options={wardOptions} value={formData.wardID}
                                            onChange={handleChange} disabled={!formData.provinceID}
                                            placeholder='-- Chọn phường/xã/đặc khu --'
                                            error={!!errors.wardID} errorMessage={errors.wardID} />
                                    </FormGroup>

                                    <FormGroup />

                                    <FormGroup label="Địa chỉ" required htmlFor="address" className="md:col-span-3">
                                        <Input id="address" name="address" value={formData.address}
                                            onChange={handleChange} placeholder="Nhập địa chỉ"
                                            error={!!errors.address} errorMessage={errors.address} />
                                    </FormGroup>

                                    <FormGroup label="Trạng thái hoạt động" className="md:col-span-3">
                                        <Switch id="status" name="status" checked={formData.status}
                                            onChange={handleChange}
                                            onText="Đang hoạt động" offText="Không hoạt động" />
                                    </FormGroup>
                                </div>
                            </div>

                            {/* Thông tin làm việc */}
                            <div className="mb-8">
                                <h2 className="text-sm font-medium mb-6 text-blue-500 border-l-4 border-blue-500 pl-2">
                                    Thông tin làm việc
                                </h2>
                                {additionalRoles.map((role, index) => (
                                    <div key={role.id} className="mt-4 border border-gray-200 rounded-md p-4 bg-gray-50">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-medium">
                                                {role.isDefault ? 'Chức vụ chính' : 'Chức vụ kiêm nhiệm'}
                                            </h3>
                                            {!role.isDefault && additionalRoles.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveRole(role.id)}
                                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4" />
                                                    Xoá chức vụ kiêm nhiệm
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <FormGroup label="Chức vụ" required>
                                                <Select
                                                    options={positionOptions}
                                                    value={role.roleID}
                                                    onChange={e => handleRoleChange(role.id, 'roleID', e.target.value)}
                                                    placeholder="-- Chọn chức vụ --"
                                                />
                                            </FormGroup>
                                            {!isDireactor && !isAdmin && (
                                                <FormGroup label="Bộ phận" required>
                                                    <Select
                                                        options={departmentOptions}
                                                        value={role.departmentID}
                                                        onChange={e => handleRoleChange(role.id, 'departmentID', e.target.value)}
                                                        placeholder="-- Chọn bộ phận --"
                                                    />
                                                </FormGroup>
                                            )}
                                        </div>
                                        {errors[`role_${index}`] && (
                                            <p className="mt-2 text-xs text-red-500">{errors[`role_${index}`]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Chữ ký (chỉ hiện khi là giám đốc) */}
                            {isDireactor && (
                                <div className="flex gap-4 mt-6">
                                    <div className="flex-1">
                                        <FileUploader
                                            name="sign" id="sign" accept="image/*"
                                            onChange={v => handleFile('sign', v)}
                                            errorMessage={errors.sign}
                                            values={formData.sign}
                                            title="Chữ ký *" isDashedBorder
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <FileUploader
                                            name="stamp" id="stamp" accept="image/*"
                                            onChange={v => handleFile('stamp', v)}
                                            errorMessage={errors.stamp}
                                            values={formData.stamp}
                                            title="Chữ ký có con dấu *" isDashedBorder
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="flex justify-between mt-10">
                        {!isCreate ? (
                            <button type="button" onClick={() => setShowDeleteModal(true)}
                                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                                Xóa tài khoản
                            </button>
                        ) : <div />}

                        <div className="flex gap-3">
                            <Button variant="outline" type="button" onClick={() => router.push('/accounts')}>
                                <X className="w-4 h-4" />
                                Đóng
                            </Button>
                            <Button type="submit" variant="primary" loading={submitting} disabled={loading}>
                                <Check className="w-4 h-4" />
                                {isCreate ? 'Lưu tài khoản' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            <ConfirmModal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Xoá tài khoản"
                message="Hành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xoá vĩnh viễn."
                loading={loading}
            />
        </div>
    )
}
