import React, { useState, useRef, useEffect } from 'react'
import { X, Camera, AlertCircle, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClanActions } from '../../hooks/useClans'
import { LoadingSpinner } from './LoadingSpinner'

interface ClanEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  clan: {
    id: string
    name: string
    tag: string
    description: string | null
    logo_url: string | null
  }
}

export function ClanEditModal({ isOpen, onClose, onSuccess, clan }: ClanEditModalProps) {
  const { updateClan } = useClanActions()
  const [name, setName] = useState(clan.name)
  const [tag, setTag] = useState(clan.tag)
  const [description, setDescription] = useState(clan.description || '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Reset form when clan changes
  useEffect(() => {
    setName(clan.name)
    setTag(clan.tag)
    setDescription(clan.description || '')
    setLogoPreview(null)
    setLogoFile(null)
  }, [clan])

  if (!isOpen) return null

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setLogoFile(file)
    setError('')

    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null

    try {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${clan.id}/logo.${fileExt}`

      console.log('Uploading logo:', {
        fileName,
        fileType: logoFile.type,
        fileSize: logoFile.size,
        clanId: clan.id
      })

      // Delete old logo if exists
      if (clan.logo_url && clan.logo_url.includes('clan-logos')) {
        try {
          const oldPath = clan.logo_url.split('/clan-logos/')[1]
          if (oldPath) {
            console.log('Deleting old logo:', oldPath)
            const { error: deleteError } = await supabase.storage.from('clan-logos').remove([oldPath])
            if (deleteError) {
              console.warn('Could not delete old logo:', deleteError)
            }
          }
        } catch (e) {
          console.warn('Error deleting old logo:', e)
        }
      }

      // Upload new logo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clan-logos')
        .upload(fileName, logoFile, {
          upsert: true,
          contentType: logoFile.type
        })

      if (uploadError) {
        console.error('Logo upload error:', uploadError)
        throw new Error(`Failed to upload logo: ${uploadError.message}`)
      }

      console.log('Upload successful:', uploadData)

      // Get public URL with cache-busting timestamp
      const { data: urlData } = supabase.storage.from('clan-logos').getPublicUrl(fileName)
      const urlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`
      console.log('Public URL with cache bust:', urlWithCacheBust)

      return urlWithCacheBust
    } catch (error) {
      console.error('Error in uploadLogo:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate name
    if (name.length < 3 || name.length > 30) {
      setError('Clan name must be between 3 and 30 characters')
      return
    }

    // Validate tag
    if (tag.length < 2 || tag.length > 5) {
      setError('Clan tag must be between 2 and 5 characters')
      return
    }

    if (!/^[A-Za-z0-9]+$/.test(tag)) {
      setError('Clan tag can only contain letters and numbers')
      return
    }

    const hasChanges = name !== clan.name ||
                       tag !== clan.tag ||
                       description !== (clan.description || '') ||
                       logoFile !== null

    if (!hasChanges) {
      setError('No changes to save')
      return
    }

    setLoading(true)

    try {
      const updates: { name?: string; tag?: string; description?: string; logo_url?: string } = {}

      if (name !== clan.name) {
        updates.name = name
      }

      if (tag !== clan.tag) {
        updates.tag = tag.toUpperCase()
      }

      if (description !== (clan.description || '')) {
        updates.description = description || null
      }

      // Upload logo first if there's a new file
      if (logoFile) {
        try {
          console.log('Starting logo upload...')
          const logoUrl = await uploadLogo()
          if (logoUrl) {
            console.log('Logo uploaded successfully, URL:', logoUrl)
            updates.logo_url = logoUrl
          } else {
            throw new Error('Logo upload returned null URL')
          }
        } catch (uploadError) {
          console.error('Logo upload failed:', uploadError)
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Failed to upload logo'
          setError(`Logo upload failed: ${errorMsg}`)
          setLoading(false)
          return
        }
      }

      // Update clan in database
      if (Object.keys(updates).length > 0) {
        console.log('Updating clan with:', updates)
        const { error: updateError } = await updateClan(clan.id, updates)
        if (updateError) {
          console.error('Clan update failed:', updateError)
          setError(`Update failed: ${updateError.message}`)
          setLoading(false)
          return
        }
      }

      setSuccess('Clan updated successfully!')

      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Unexpected error in handleSubmit:', err)
      setError(err instanceof Error ? err.message : 'Failed to update clan')
    } finally {
      setLoading(false)
    }
  }

  const currentLogo = logoPreview || clan.logo_url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <h2 className="text-xl font-display font-bold">Edit Clan</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Logo Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-2xl shadow-accent-primary/25 overflow-hidden">
                {currentLogo ? (
                  <img src={currentLogo} alt={clan.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-display font-bold">{clan.tag}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleLogoSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="mt-3 text-sm text-accent-primary hover:underline"
            >
              Change Logo
            </button>
            <p className="text-xs text-gray-500 mt-1">Max 5MB (JPEG, PNG, GIF, WebP)</p>
          </div>

          {/* Clan Name */}
          <div>
            <label htmlFor="clanName" className="block text-sm font-medium text-gray-300 mb-2">
              Clan Name
            </label>
            <input
              id="clanName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Clan name"
              minLength={3}
              maxLength={30}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="clanDesc" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="clanDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Tell others about your clan..."
              maxLength={200}
            />
          </div>

          {/* Tag */}
          <div>
            <label htmlFor="clanTag" className="block text-sm font-medium text-gray-300 mb-2">
              Clan Tag <span className="text-gray-500">(2-5 characters)</span>
            </label>
            <input
              id="clanTag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase())}
              className="input-field uppercase"
              placeholder="TAG"
              minLength={2}
              maxLength={5}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3 text-green-400">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-dark-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
