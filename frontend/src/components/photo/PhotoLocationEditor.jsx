import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import PropTypes from 'prop-types'
import { updatePhotoLocation } from '../../services/photoService'

/**
 * MapClickHandler Component
 * Xử lý sự kiện click trên map để cập nhật marker
 */
const MapClickHandler = ({ onLocationChange }) => {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

MapClickHandler.propTypes = {
  onLocationChange: PropTypes.func.isRequired
}

/**
 * PhotoLocationEditor Component
 * Modal cho phép chỉnh sửa vị trí GPS của ảnh:
 * - Hiển thị map với marker hiện tại
 * - Cho phép kéo thả marker
 * - Cho phép click trên map để chọn vị trí mới
 * - Tìm kiếm địa điểm
 * - Hiển thị địa chỉ reverse geocoding
 */
const PhotoLocationEditor = ({ photo, onClose, onLocationUpdated }) => {
  const [latitude, setLatitude] = useState(photo.latitude)
  const [longitude, setLongitude] = useState(photo.longitude)
  const [address, setAddress] = useState('')
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Fetch address when coordinates change
  useEffect(() => {
    fetchAddress(latitude, longitude)
  }, [latitude, longitude])

  const fetchAddress = async (lat, lon) => {
    try {
      setLoadingAddress(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=vi`,
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setSearching(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=vi`,
        {
          headers: {
            'User-Agent': 'GeoPhotoApp/1.0'
          }
        }
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Error searching location:', error)
      alert('Lỗi khi tìm kiếm địa điểm')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSearchResult = (result) => {
    setLatitude(parseFloat(result.lat))
    setLongitude(parseFloat(result.lon))
    setSearchResults([])
    setSearchQuery('')
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Ensure latitude and longitude are valid numbers
      const lat = parseFloat(latitude)
      const lon = parseFloat(longitude)

      if (isNaN(lat) || isNaN(lon)) {
        alert('❌ Tọa độ không hợp lệ. Vui lòng kiểm tra lại.')
        setSaving(false)
        return
      }

      console.log(`Updating photo ${photo.id} location to: ${lat}, ${lon}`)

      // Use photoService which includes JWT token
      const updatedPhoto = await updatePhotoLocation(photo.id, lat, lon)

      console.log('Location updated successfully:', updatedPhoto)
      onLocationUpdated(updatedPhoto)
      alert('✅ Đã cập nhật vị trí thành công!')
    } catch (error) {
      console.error('Error updating location:', error)
      alert('❌ Lỗi khi cập nhật vị trí. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleLocationChange = (lat, lng) => {
    setLatitude(lat)
    setLongitude(lng)
  }


  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ Geolocation')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLatitude(latitude)
        setLongitude(longitude)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập vị trí.')
      },
      { enableHighAccuracy: true }
    )
  }

  // Create draggable marker icon
  const createMarkerIcon = () => {
    return L.divIcon({
      className: 'custom-draggable-marker',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background-color: #ef4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        ">
          📍
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    })
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[3500] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto modal-mobile">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Chỉnh Sửa Vị Trí</h2>
            <p className="text-sm text-gray-500 mt-1">{photo.fileName}</p>
          </div>
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
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column - Photo Preview */}
            <div className="md:col-span-1">
              <img
                src={`http://${window.location.hostname}:8080${photo.url}`}
                alt={photo.fileName}
                className="w-full rounded-lg shadow-lg object-cover"
                style={{ maxHeight: '300px' }}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x300?text=Image'
                }}
              />

              {/* Current Address */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Địa Chỉ Hiện Tại</label>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  {loadingAddress ? (
                    <span className="text-gray-500">Đang tải...</span>
                  ) : (
                    <span className="text-gray-800">{address}</span>
                  )}
                </div>
              </div>

              {/* Coordinates */}
              <div className="mt-4 space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Vĩ độ (Latitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) setLatitude(val)
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Kinh độ (Longitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) setLongitude(val)
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>


              {/* Get Current Location Button */}
              <button
                onClick={handleGetCurrentLocation}
                className="w-full mt-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Lấy vị trí hiện tại
              </button>

              {/* Instructions */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
                <p className="font-semibold mb-1">💡 Hướng dẫn:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Kéo marker đỏ trên bản đồ</li>
                  <li>Hoặc click vào vị trí mới</li>
                  <li>Hoặc nhập tọa độ thủ công</li>
                  <li>Hoặc tìm kiếm địa điểm</li>
                </ul>
              </div>
            </div>

            {/* Right Column - Map */}
            <div className="md:col-span-2">
              {/* Search Bar */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Tìm Kiếm Địa Điểm</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Nhập tên địa điểm, địa chỉ..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50"
                  >
                    {searching ? 'Đang tìm...' : 'Tìm'}
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                      >
                        <div className="font-medium text-gray-800">{result.display_name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          📍 {parseFloat(result.lat).toFixed(6)}, {parseFloat(result.lon).toFixed(6)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map */}
              <div className="rounded-lg overflow-hidden shadow-lg border" style={{ height: '300px', minHeight: '250px' }}>
                <MapContainer
                  center={[latitude, longitude]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  key={`${latitude}-${longitude}`}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onLocationChange={handleLocationChange} />
                  <Marker
                    position={[latitude, longitude]}
                    icon={createMarkerIcon()}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng()
                        handleLocationChange(lat, lng)
                      }
                    }}
                  />
                </MapContainer>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Lưu Vị Trí Mới
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

PhotoLocationEditor.propTypes = {
  photo: PropTypes.shape({
    id: PropTypes.number.isRequired,
    fileName: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    latitude: PropTypes.number.isRequired,
    longitude: PropTypes.number.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onLocationUpdated: PropTypes.func.isRequired
}

export default PhotoLocationEditor

