import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { deletePhoto } from '../../services/photoService'

/**
 * PhotoDetails Component
 * Modal hiển thị chi tiết ảnh với đầy đủ thông tin:
 * - Xem ảnh full size
 * - Hiển thị địa chỉ (reverse geocoding)
 * - Hiển thị tọa độ GPS
 * - Cho phép chỉnh sửa vị trí
 * - Cho phép xóa ảnh
 */
const PhotoDetails = ({ photo, onClose, onPhotoUpdated, onPhotoDeleted, onEditLocation }) => {
  const [address, setAddress] = useState('Đang tải địa chỉ...')
  const [loadingAddress, setLoadingAddress] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // Fetch address from coordinates using Nominatim reverse geocoding
    fetchAddress()
  }, [photo.latitude, photo.longitude])

  const fetchAddress = async () => {
    try {
      setLoadingAddress(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${photo.latitude}&lon=${photo.longitude}&accept-language=vi`,
        {
          headers: {
            'User-Agent': 'GeoPhotoApp/1.0'
          }
        }
      )
      const data = await response.json()
      setAddress(data.display_name || 'Không tìm thấy địa chỉ')
    } catch (error) {
      console.error('Error fetching address:', error)
      setAddress('Không thể tải địa chỉ')
    } finally {
      setLoadingAddress(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Không rõ'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return dateString
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)

      // Use photoService which includes JWT token
      await deletePhoto(photo.id)

      onPhotoDeleted(photo.id)
      onClose()
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Lỗi khi xóa ảnh. Vui lòng thử lại.')
    } finally {
      setDeleting(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Đã sao chép vào clipboard!')
  }

  // Close modal when clicking on backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[3000] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-mobile">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Chi Tiết Ảnh</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            title="Đóng"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Left Column - Image */}
            <div>
              <img
<<<<<<< HEAD:frontend/src/components/photo/PhotoDetails.jsx
                src={`http://${window.location.hostname}:8080${photo.url}`}
=======
                src={photo.url}
>>>>>>> upstream/main:frontend/src/components/PhotoDetails.jsx
                alt={photo.fileName}
                className="w-full rounded-lg shadow-lg object-cover"
                style={{ maxHeight: '500px' }}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found'
                }}
              />

              {/* Image Actions */}
              <div className="mt-4 flex gap-2">
                <a
<<<<<<< HEAD:frontend/src/components/photo/PhotoDetails.jsx
                  href={`http://${window.location.hostname}:8080${photo.url}`}
=======
                  href={photo.url}
>>>>>>> upstream/main:frontend/src/components/PhotoDetails.jsx
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-center text-sm font-medium"
                >
                  🔍 Xem Full Size
                </a>
                <a
<<<<<<< HEAD:frontend/src/components/photo/PhotoDetails.jsx
                  href={`http://${window.location.hostname}:8080${photo.url}`}
=======
                  href={photo.url}
>>>>>>> upstream/main:frontend/src/components/PhotoDetails.jsx
                  download={photo.fileName}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-center text-sm font-medium"
                >
                  💾 Tải Xuống
                </a>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4">
              {/* File Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên File</label>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-gray-800 bg-gray-50 px-3 py-2 rounded break-all">{photo.fileName}</p>
                  <button
                    onClick={() => copyToClipboard(photo.fileName)}
                    className="p-2 text-gray-500 hover:text-blue-600 transition"
                    title="Sao chép"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* Description */}
              {photo.description && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mô Tả</label>
                  <p className="text-gray-800 bg-gray-50 px-3 py-2 rounded italic">&ldquo;{photo.description}&rdquo;</p>
                </div>
              )}

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">📍 Địa Chỉ</label>
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-gray-800 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
                    {loadingAddress ? (
                      <span className="text-gray-500">Đang tải...</span>
                    ) : (
                      address
                    )}
                  </p>
                  {!loadingAddress && (
                    <button
                      onClick={() => copyToClipboard(address)}
                      className="p-2 text-gray-500 hover:text-blue-600 transition"
                      title="Sao chép địa chỉ"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">🌐 Tọa Độ GPS</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-24">Vĩ độ:</span>
                    <code className="flex-1 bg-gray-50 px-3 py-2 rounded text-sm">{photo.latitude.toFixed(6)}</code>
                    <button
                      onClick={() => copyToClipboard(photo.latitude.toString())}
                      className="p-2 text-gray-500 hover:text-blue-600 transition"
                      title="Sao chép"
                    >
                      📋
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-24">Kinh độ:</span>
                    <code className="flex-1 bg-gray-50 px-3 py-2 rounded text-sm">{photo.longitude.toFixed(6)}</code>
                    <button
                      onClick={() => copyToClipboard(photo.longitude.toString())}
                      className="p-2 text-gray-500 hover:text-blue-600 transition"
                      title="Sao chép"
                    >
                      📋
                    </button>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${photo.latitude},${photo.longitude}`)}
                    className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition"
                  >
                    📋 Sao chép cả hai (lat,lon)
                  </button>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                {photo.takenAt && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">📷 Chụp Lúc</label>
                    <p className="text-gray-800 bg-gray-50 px-3 py-2 rounded text-sm">{formatDate(photo.takenAt)}</p>
                  </div>
                )}
                {photo.uploadedAt && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">📤 Upload Lúc</label>
                    <p className="text-gray-800 bg-gray-50 px-3 py-2 rounded text-sm">{formatDate(photo.uploadedAt)}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-3 border-t">
                <button
                  onClick={() => onEditLocation(photo)}
                  className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Chỉnh Sửa Vị Trí
                </button>

                <a
                  href={`https://www.google.com/maps?q=${photo.latitude},${photo.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-center"
                >
                  🗺️ Mở Trong Google Maps
                </a>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa Ảnh
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-red-600 font-semibold">⚠️ Bạn có chắc muốn xóa?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                      >
                        {deleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

PhotoDetails.propTypes = {
  photo: PropTypes.shape({
    id: PropTypes.number.isRequired,
    fileName: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    thumbnailUrl: PropTypes.string,
    latitude: PropTypes.number.isRequired,
    longitude: PropTypes.number.isRequired,
    takenAt: PropTypes.string,
    description: PropTypes.string,
    uploadedAt: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onPhotoUpdated: PropTypes.func.isRequired,
  onPhotoDeleted: PropTypes.func.isRequired,
  onEditLocation: PropTypes.func.isRequired
}

export default PhotoDetails

