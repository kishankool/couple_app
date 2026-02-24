import React, { useRef, useState } from 'react'

export default function ImageUpload({ onFile, preview, label = 'Tap to upload a photo' }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <>
      <div
        onClick={() => inputRef.current.click()}
        style={{
          border: '2px dashed rgba(200,120,140,0.35)',
          borderRadius: 14,
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'var(--petal)',
          marginBottom: 10,
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{ fontSize: '2rem' }}>📷</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 6 }}>{label}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {preview && (
        <img
          src={preview}
          alt="preview"
          style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 10 }}
        />
      )}
    </>
  )
}
