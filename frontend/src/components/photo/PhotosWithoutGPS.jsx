import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
<<<<<<< HEAD:frontend/src/components/photo/PhotosWithoutGPS.jsx
import { fetchAllPhotos, updatePhotoLocation } from '../../services/photoService'
import LocationSearch from '../map/LocationSearch'
=======
import { fetchAllPhotos, updatePhotoLocation, deletePhoto } from '../services/photoService'
import LocationSearch from './LocationSearch'
>>>>>>> upstream/main:frontend/src/components/PhotosWithoutGPS.jsx

/**
 * PhotosWithoutGPS Component
 * Hiển thị danh sách ảnh không có GPS và cho phép user thêm location
 */
const PhotosWithoutGPS = forwardRef(({ onLocationAdded }, ref) => {
  const [photosWithoutGps, setPhotosWithoutGps] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [tempMarkerPosition, setTempMarkerPosition] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false) // New state for deleting
  const [message, setMessage] = useState(null)
  const [showPanel, setShowPanel] = useState(false)

  const map = useMap()
  const markerRef = useRef(null)
  const panelRef = useRef(null)

  /**
   * Disable map interactions when mouse is over panel
   * Using Leaflet's DomEvent API for proper event isolation
   */
  useEffect(() => {
    const panelElement = panelRef.current
    if (panelElement) {
      // Disable all Leaflet event propagation
      L.DomEvent.disableClickPropagation(panelElement)
      L.DomEvent.disableScrollPropagation(panelElement)
      
      // Also stop mouse move from affecting map drag
      const stopPropagation = (e) => {
        L.DomEvent.stopPropagation(e)
      }
      
      panelElement.addEventListener('mousemove', stopPropagation)
      panelElement.addEventListener('mousedown', stopPropagation)
      panelElement.addEventListener('mouseup', stopPropagation)
      panelElement.addEventListener('touchstart', stopPropagation)
      panelElement.addEventListener('touchmove', stopPropagation)
      panelElement.addEventListener('touchend', stopPropagation)
      
      return () => {
        panelElement.removeEventListener('mousemove', stopPropagation)
        panelElement.removeEventListener('mousedown', stopPropagation)
        panelElement.removeEventListener('mouseup', stopPropagation)
        panelElement.removeEventListener('touchstart', stopPropagation)
        panelElement.removeEventListener('touchmove', stopPropagation)
        panelElement.removeEventListener('touchend', stopPropagation)
      }
    }
  }, [showPanel])

  /**
   * Load photos without GPS
   */
  useEffect(() => {
    loadPhotosWithoutGps()
  }, [])

  const loadPhotosWithoutGps = async () => {
    try {
      const allPhotos = await fetchAllPhotos()
      const withoutGps = allPhotos.filter(p => !p.latitude || !p.longitude)
      setPhotosWithoutGps(withoutGps)
    } catch (error) {
      console.error('Error loading photos without GPS:', error)
    }
  }

  /**
   * Handle photo selection
   */
  const handleSelectPhoto = (photo) => {
    setSelectedPhoto(photo)
    setTempMarkerPosition(null)
    setShowSearch(true)
    setMessage(null)
  }

  /**
   * Handle location selected from search
   */
  const handleLocationSelected = (lat, lon, displayName) => {
    setTempMarkerPosition([lat, lon])
    setMessage({ type: 'success', text: `Đã chọn: ${displayName}` })
  }

  /**
   * Handle map click to place marker
   */
  useEffect(() => {
    if (!selectedPhoto || saving) return

    const handleMapClick = (e) => {
      // Only handle direct map clicks, not clicks on markers or UI elements
      if (e.originalEvent && e.originalEvent.target.classList.contains('leaflet-container')) {
        setTempMarkerPosition([e.latlng.lat, e.latlng.lng])
        setMessage({ type: 'info', text: 'Đã đặt marker. Kéo marker để điều chỉnh vị trí.' })
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [selectedPhoto, saving, map])

  /**
   * Handle marker drag
   */
  const handleMarkerDrag = () => {
    if (markerRef.current) {
      const position = markerRef.current.getLatLng()
      setTempMarkerPosition([position.lat, position.lng])
    }
  }

  /**
   * Confirm and save location
   */
  const handleConfirmLocation = async (event) => {
    // Prevent event propagation to map
    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }

    if (!selectedPhoto || !tempMarkerPosition) {
      setMessage({ type: 'error', text: 'Vui lòng chọn vị trí trên bản đồ' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      await updatePhotoLocation(
        selectedPhoto.id,
        tempMarkerPosition[0],
        tempMarkerPosition[1]
      )

      setMessage({ type: 'success', text: '✅ Đã lưu vị trí thành công!' })

      // Reload photos
      await loadPhotosWithoutGps()

      // Notify parent
      if (onLocationAdded) {
        onLocationAdded()
      }

      // Reset after 2 seconds
      setTimeout(() => {
        setSelectedPhoto(null)
        setTempMarkerPosition(null)
        setShowSearch(false)
        setMessage(null)
      }, 2000)

    } catch (error) {
      console.error('Error saving location:', error)
      setMessage({ type: 'error', text: '❌ Lỗi khi lưu vị trí' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle get current location
   */
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Trình duyệt không hỗ trợ Geolocation' })
      return
    }

    setMessage({ type: 'info', text: 'Đang lấy vị trí hiện tại...' })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setTempMarkerPosition([latitude, longitude])
        setMessage({ type: 'success', text: 'Đã lấy được vị trí hiện tại!' })

        // Fly to location
        map.flyTo([latitude, longitude], 16, {
          animate: true,
          duration: 1.5
        })
      },
      (error) => {
        console.error('Error getting location:', error)
        let errorText = 'Không thể lấy vị trí.'
        if (error.code === 1) errorText = 'Bạn đã từ chối quyền truy cập vị trí.'
        else if (error.code === 2) errorText = 'Vị trí không khả dụng.'
        else if (error.code === 3) errorText = 'Hết thời gian chờ lấy vị trí.'

        setMessage({ type: 'error', text: errorText })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  /**
   * Handle delete photo
   */
  const handleDeletePhoto = async () => {
    if (!selectedPhoto) return

    if (window.confirm('Bạn có chắc chắn muốn xóa ảnh này không? Hành động này không thể hoàn tác.')) {
      setDeleting(true)
      setMessage({ type: 'info', text: 'Đang xóa ảnh...' })

      try {
        await deletePhoto(selectedPhoto.id)
        setMessage({ type: 'success', text: '✅ Đã xóa ảnh thành công!' })

        // Reload photos
        await loadPhotosWithoutGps()

        // Notify parent if needed
        if (onLocationAdded) {
          onLocationAdded() // Re-fetch counts
        }

        // Reset UI
        setTimeout(() => {
          setSelectedPhoto(null)
          setTempMarkerPosition(null)
          setShowSearch(false)
          setMessage(null)
        }, 1500)

      } catch (error) {
        console.error('Error deleting photo:', error)
        setMessage({ type: 'error', text: '❌ Lỗi khi xóa ảnh' })
      } finally {
        setDeleting(false)
      }
    }
  }

  /**
   * Cancel selection
   */
  const handleCancel = (event) => {
    // Prevent event propagation to map
    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }

    setSelectedPhoto(null)
    setTempMarkerPosition(null)
    setShowSearch(false)
    setMessage(null)
  }

  // Expose openPanel method to parent
  useImperativeHandle(ref, () => ({
    openPanel: () => {
      setShowPanel(true)
    }
  }))

  // Don't show if no photos without GPS
  if (photosWithoutGps.length === 0) return null

  return (
    <>
      {/* Toggle Button */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="fixed top-20 left-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-[1050] flex items-center gap-2 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {photosWithoutGps.length} ảnh chưa có GPS
        </button>
      )}

      {/* Main Panel */}
      {showPanel && (
<<<<<<< HEAD:frontend/src/components/photo/PhotosWithoutGPS.jsx
        <div 
          ref={panelRef}
=======
        <div
>>>>>>> upstream/main:frontend/src/components/PhotosWithoutGPS.jsx
          className="fixed top-20 left-4 w-80 max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl z-[1200] flex flex-col side-panel-mobile border border-gray-100"
        >
          {/* Header */}
          <div className="bg-orange-500 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">⚠️ Ảnh Chưa Có GPS</h3>
              <p className="text-orange-100 text-sm">{photosWithoutGps.length} ảnh cần thêm vị trí</p>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Photos List */}
            {!selectedPhoto && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  Click vào ảnh để thêm vị trí GPS:
                </p>
                {photosWithoutGps.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo)}
                    className="w-full bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-3 transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <img
<<<<<<< HEAD:frontend/src/components/photo/PhotosWithoutGPS.jsx
                        src={`http://${window.location.hostname}:8080${photo.url}`}
=======
                        src={photo.url}
>>>>>>> upstream/main:frontend/src/components/PhotosWithoutGPS.jsx
                        alt={photo.fileName}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600">
                          {photo.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Upload: {new Date(photo.uploadedAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Photo Workflow */}
            {selectedPhoto && (
              <div className="space-y-4">
                {/* Selected Photo Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-blue-800">Đang xử lý:</p>
                    <button
                      onClick={handleCancel}
                      className="text-blue-400 hover:text-red-500 transition-colors p-1 -mr-2 -mt-2 rounded-full hover:bg-blue-100"
                      title="Hủy chọn ảnh"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
<<<<<<< HEAD:frontend/src/components/photo/PhotosWithoutGPS.jsx
                      src={`http://${window.location.hostname}:8080${selectedPhoto.url}`}
=======
                      src={selectedPhoto.url}
>>>>>>> upstream/main:frontend/src/components/PhotosWithoutGPS.jsx
                      alt={selectedPhoto.fileName}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {selectedPhoto.fileName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Search */}
                {showSearch && (
                  <LocationSearch
                    map={map}
                    onLocationSelected={handleLocationSelected}
                    onClose={() => setShowSearch(false)}
                  />
                )}

                {/* Get Current Location Button */}
                <button
                  onClick={handleGetCurrentLocation}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium group"
                >
                  <div className="p-1 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Lấy vị trí hiện tại
                </button>

                {/* Instructions */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-700 space-y-1">
                    <strong>Cách thêm vị trí:</strong>
                    <br />1. Tìm kiếm địa chỉ ở trên, HOẶC
                    <br />2. Click trực tiếp trên bản đồ
                    <br />3. Kéo marker để điều chỉnh
                    <br />4. Click &quot;Xác Nhận Vị Trí&quot;
                  </p>
                </div>

                {/* Message */}
                {message && (
                  <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                    message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                      'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                    {message.text}
                  </div>
                )}

                {/* Action Buttons */}
<<<<<<< HEAD:frontend/src/components/photo/PhotosWithoutGPS.jsx
                <div className="flex gap-2">
=======
                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
>>>>>>> upstream/main:frontend/src/components/PhotosWithoutGPS.jsx
                  <button
                    onClick={handleDeletePhoto}
                    disabled={saving || deleting}
                    className="flex-none px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition flex items-center justify-center"
                    title="Xóa ảnh này"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    disabled={saving || deleting}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmLocation}
                    disabled={!tempMarkerPosition || saving || deleting}
                    className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${!tempMarkerPosition || saving || deleting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                  >
                    {saving ? 'Đang lưu...' : (deleting ? 'Đang xóa...' : '✓ Xác Nhận Vị Trí')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Temporary Draggable Marker */}
      {tempMarkerPosition && (
        <Marker
          position={tempMarkerPosition}
          draggable={true}
          eventHandlers={{
            dragend: handleMarkerDrag,
          }}
          ref={markerRef}
          icon={L.divIcon({
            className: 'temp-marker',
            html: `
              <div style="
                width: 40px;
                height: 40px;
                background: #ef4444;
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          })}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold text-sm mb-1">Vị trí tạm thời</p>
              <p className="text-xs text-gray-600">
                Kéo marker để điều chỉnh
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {tempMarkerPosition[0].toFixed(6)}, {tempMarkerPosition[1].toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  )
})

PhotosWithoutGPS.displayName = 'PhotosWithoutGPS'

export default PhotosWithoutGPS

